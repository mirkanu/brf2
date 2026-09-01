import * as aio from "node:http";
// No: Bun doesn't ship aiohttp. We'll use Bun's native fetch + Promise.all.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { parseStringPromise } from "xml2js";
// xml2js probably isn't installed; fall back to manual lightweight regex parse.

const EXPORT = "/home/workspace/0 Inbox/brf-squarespace-exports/conferences Squarespace-Wordpress-Export-08-30-2026.xml";
const OUT    = "/home/workspace/1 Projects/brf2/scratch/phase-1.5/mp3-bytes.csv";

function slugify(title: string): string {
  let s = title.toLowerCase().trim();
  s = s.replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return s || "untitled";
}

// Lightweight WP-export parser: extract <item>...</item> blocks.
function splitItems(xml: string): { header: any[]; items: string[] } {
  const items: string[] = [];
  // naive but works for WP export which has <item>...</item>
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) items.push(m[1]);
  return { header: [], items };
}

function extractTag(block: string, tag: string): string {
  // First match of <tag>...</tag> or <tag/>. Handles namespaced <wp:attached_file> too.
  const safe = tag.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const re = new RegExp(`<(?:\\w+:)?${safe}>([\\s\\S]*?)</(?:\\w+:)?${safe}>`, "m");
  const m = re.exec(block);
  if (m) return m[1].trim();
  const re2 = new RegExp(`<(?:\\w+:)?${safe}\\s*/>`, "m");
  const m2 = re2.exec(block);
  return m2 ? "" : "";
}

function extractAttr(block: string, tag: string, attr: string): string {
  const safe = tag.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const re = new RegExp(`<(?:\\w+:)?${safe}[^>]*\\s${attr}="([^"]*)"`, "i");
  const m = re.exec(block);
  return m ? m[1] : "";
}

function extractAttachedFiles(block: string): string[] {
  const out: string[] = [];
  const re = /<wp:attached_file>([\s\S]*?)<\/wp:attached_file>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) {
    const u = m[1].trim();
    if (u) out.push(u);
  }
  return out;
}

function extractEnclosureUrl(block: string): string {
  return extractAttr(block, "enclosure", "url") || "";
}

function extractContentEncoded(block: string): string {
  // CDATA wrapper
  const m = /<!\[CDATA\[([\s\S]*?)\]\]>/.exec(block);
  if (m) return m[1];
  return block;
}

function findMp3Urls(text: string): string[] {
  const out: string[] = [];
  const re = /https?:\/\/[^\s"'<>]+\.mp3/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(m[0].replace(/[).,;]+$/, ""));
  return out;
}

async function head(url: string, timeoutMs = 15000): Promise<{ bytes: number; status: number | string }> {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, { method: "HEAD", redirect: "follow", signal: ac.signal });
    const cl = r.headers.get("content-length");
    return { bytes: cl && /^\d+$/.test(cl) ? parseInt(cl, 10) : -1, status: r.status };
  } catch (e: any) {
    return { bytes: -1, status: `ERR:${e?.name || "unknown"}` };
  } finally {
    clearTimeout(to);
  }
}

async function main() {
  const xml = readFileSync(EXPORT, "utf8");
  const { items } = splitItems(xml);
  console.log(`items in file: ${items.length}`);

  // For each post item, gather mp3 urls. Attachment items (post_type=attachment) carry their own file URL.
  const byPost = new Map<string, { title: string; urls: Set<string> }>();
  for (const block of items) {
    const title = extractTag(block, "title") || "(no title)";
    const slug = slugify(title);
    const postType = extractTag(block, "post_type");
    const attachmentUrl = extractAttachedFileOrAttachmentUrl(block, postType);
    const mp3FromContent = findMp3Urls(extractContentEncoded(block));
    const mp3FromAttached = extractAttachedFiles(block).filter(u => /\.mp3(\?|$)/i.test(u));
    const encUrl = /\.mp3(\?|$)/i.test(extractEnclosureUrl(block)) ? extractEnclosureUrl(block) : "";
    const urls = new Set<string>([...mp3FromContent, ...mp3FromAttached, ...(encUrl ? [encUrl] : [])]);

    // For an attachment post whose URL is an MP3, attach under its parent title.
    if (postType === "attachment" && /\.mp3(\?|$)/i.test(attachmentUrl)) {
      const parentTitle = extractTag(block, "post_parent") || title;
      const parentSlug = slugify(parentTitle);
      if (!byPost.has(parentSlug)) byPost.set(parentSlug, { title: parentTitle, urls: new Set() });
      byPost.get(parentSlug)!.urls.add(attachmentUrl);
    } else if (urls.size) {
      if (!byPost.has(slug)) byPost.set(slug, { title, urls: new Set() });
      urls.forEach(u => byPost.get(slug)!.urls.add(u));
    }
  }

  // Flatten
  const flat: { conferenceSlug: string; conferenceTitle: string; url: string }[] = [];
  for (const [slug, v] of byPost) {
    if (slug === "untitled") continue;
    for (const u of [...v.urls]) flat.push({ conferenceSlug: slug, conferenceTitle: v.title, url: u });
  }
  console.log(`post buckets with mp3: ${byPost.size}; distinct mp3 urls: ${flat.length}`);

  // Probe (HEAD) in parallel, bounded
  const CONC = 12;
  const probed: { url: string; bytes: number; status: number | string }[] = [];
  for (let i = 0; i < flat.length; i += CONC) {
    const slice = flat.slice(i, i + CONC);
    const results = await Promise.all(slice.map(async r => ({ ...(await head(r.url)), url: r.url })));
    probed.push(...results);
  }
  const byUrl = new Map(probed.map(p => [p.url, p]));

  // CSV
  mkdirSync(dirname(OUT), { recursive: true });
  const rows: string[] = ["conference_slug,conference_title,mp3_url,bytes,status"];
  for (const r of flat) {
    const p = byUrl.get(r.url)!;
    const safeTitle = r.conferenceTitle.replace(/[\r\n,]+/g, " ").slice(0, 200);
    rows.push(`${r.conferenceSlug},${csvQuote(safeTitle)},${r.url},${p.bytes},${p.status}`);
  }
  writeFileSync(OUT, rows.join("\n") + "\n");
  console.log(`WROTE ${OUT} (${flat.length} rows)`);

  // Per-conference summary to stdout
  const agg = new Map<string, { count: number; ok: number; miss: number; bytes: number; title: string }>();
  for (const r of flat) {
    const p = byUrl.get(r.url)!;
    const a = agg.get(r.conferenceSlug) ?? { count: 0, ok: 0, miss: 0, bytes: 0, title: r.conferenceTitle };
    a.count++;
    if (typeof p.status === "number" && p.status >= 200 && p.status < 400 && p.bytes > 0) {
      a.ok++; a.bytes += p.bytes;
    } else {
      a.miss++;
    }
    agg.set(r.conferenceSlug, a);
  }
  const summary = [...agg.entries()].sort(([a],[b]) => a.localeCompare(b));
  console.log("PER CONFERENCE:");
  for (const [slug, a] of summary) {
    console.log(`  ${slug}\tcount=${a.count}\tok=${a.ok}\tmissing=${a.miss}\tMB=${(a.bytes/1e6).toFixed(2)}\t${a.title.slice(0,80)}`);
  }
}

function extractAttachedFileOrAttachmentUrl(block: string, postType: string): string {
  // For an <item> with post_type=attachment: use <wp:attachment_url>
  if (postType === "attachment") {
    const m = /<wp:attachment_url>([\s\S]*?)<\/wp:attachment_url>/.exec(block);
    if (m) return m[1].trim();
  }
  return "";
}

function csvQuote(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

main().catch(e => { console.error(e); process.exit(1); });
