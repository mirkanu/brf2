import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

const CONFX = "/home/workspace/0 Inbox/brf-squarespace-exports/conferences Squarespace-Wordpress-Export-08-30-2026.xml";
const BLOGX = "/home/workspace/0 Inbox/brf-squarespace-exports/blog Squarespace-Wordpress-Export-08-30-2026.xml";
const OUT   = "/home/workspace/1 Projects/brf2/scratch/phase-1.5/pdf-bytes.csv";
const LOCAL_PILOT_DIR = "/home/workspace/1 Projects/brf2/public/articles";

function splitItems(xml: string): string[] {
  const items: string[] = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) items.push(m[1]);
  return items;
}
function extractTag(block: string, tag: string): string {
  const safe = tag.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const re = new RegExp(`<(?:\\w+:)?${safe}>([\\s\\S]*?)</(?:\\w+:)?${safe}>`, "m");
  const m = re.exec(block);
  if (m) return m[1].trim();
  return "";
}
function extractAttr(block: string, tag: string, attr: string): string {
  const safe = tag.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const re = new RegExp(`<(?:\\w+:)?${safe}[^>]*\\s${attr}="([^"]*)"`, "i");
  const m = re.exec(block);
  return m ? m[1] : "";
}
function extractContentEncoded(block: string): string {
  const m = /<!\[CDATA\[([\s\S]*?)\]\]>/.exec(block);
  return m ? m[1] : block;
}
function findPdfUrls(text: string): string[] {
  const out: string[] = [];
  const re = /https?:\/\/[^\s"'<>]+\.pdf/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(m[0].replace(/[).,;]+$/, ""));
  return out;
}
function getCategories(block: string): string[] {
  const out: string[] = [];
  const re = /<category[^>]*>([\s\S]*?)<\/category>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) out.push((m[1] || "").trim().toLowerCase());
  return out;
}
function extractAttached(block: string): string[] {
  const out: string[] = [];
  const re = /<wp:attached_file>([\s\S]*?)<\/wp:attached_file>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) out.push((m[1] || "").trim());
  return out;
}
function extractAttachmentUrl(block: string): string {
  const m = /<wp:attachment_url>([\s\S]*?)<\/wp:attachment_url>/.exec(block);
  return m ? m[1].trim() : "";
}
function classify(title: string, cats: string[]): "issue" | "article" {
  const tl = title.toLowerCase();
  if (cats.some(c => /issue/.test(c))) return "issue";
  if (cats.some(c => /article/.test(c))) return "article";
  if (/^brf-\d+\s*$/.test(tl)) return "issue";
  if (/^brf-\d+-/.test(tl)) return "article";
  return "article";
}

function harvest(path: string): { kind: "issue" | "article"; title: string; url: string; postType: string }[] {
  const out: { kind: "issue" | "article"; title: string; url: string; postType: string }[] = [];
  if (!fileExists(path)) return out;
  const xml = readFileSync(path, "utf8");
  const items = splitItems(xml);
  for (const block of items) {
    const title = extractTag(block, "title") || "(no title)";
    const cats = getCategories(block);
    const postType = extractTag(block, "post_type");
    const isAttachment = postType === "attachment";
    const kind = classify(title, cats);

    const seen = new Set<string>();
    for (const u of findPdfUrls(extractContentEncoded(block))) seen.add(u);
    for (const u of extractAttached(block).filter(x => /\.pdf(\?|$)/i.test(x))) seen.add(u);
    const au = extractAttachmentUrl(block);
    if (/\.pdf(\?|$)/i.test(au)) seen.add(au);
    const encUrl = extractAttr(block, "enclosure", "url");
    if (/\.pdf(\?|$)/i.test(encUrl)) seen.add(encUrl);

    for (const u of seen) {
      const rowKind: "issue" | "article" = isAttachment ? "issue" : kind;
      out.push({ kind: rowKind, title, url: u, postType });
    }
  }
  return out;
}

function fileExists(p: string): boolean {
  try { statSync(p); return true; } catch { return false; }
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
  const all: { kind: "issue" | "article"; title: string; url: string; postType: string }[] = [];
  all.push(...harvest(CONFX));
  all.push(...harvest(BLOGX));

  const seen = new Map<string, { kind: "issue" | "article"; title: string }>();
  for (const r of all) {
    if (!seen.has(r.url)) seen.set(r.url, { kind: r.kind, title: r.title });
  }
  const flat = [...seen.entries()].map(([url, v]) => ({ ...v, url }));
  console.log(`distinct pdf urls: ${flat.length}`);

  const local: { title: string; path: string; bytes: number }[] = [];
  if (fileExists(LOCAL_PILOT_DIR)) {
    for (const fn of readdirSync(LOCAL_PILOT_DIR)) {
      if (!/\.pdf$/i.test(fn)) continue;
      const p = join(LOCAL_PILOT_DIR, fn);
      local.push({ title: fn, path: p, bytes: statSync(p).size });
    }
  }
  console.log(`local pilot PDFs: ${local.length}`);

  const CONC = 12;
  const remoteRows: { kind: "issue" | "article"; ref: string; url: string; bytes: number; status: number | string }[] = [];
  for (let i = 0; i < flat.length; i += CONC) {
    const slice = flat.slice(i, i + CONC);
    const probed = await Promise.all(slice.map(async r => ({ ...(await head(r.url)), kind: r.kind, ref: r.title, url: r.url })));
    for (const p of probed) remoteRows.push({ kind: p.kind, ref: p.ref, url: p.url, bytes: p.bytes, status: p.status });
  }

  mkdirSync(dirname(OUT), { recursive: true });
  const lines = ["kind,ref,source,url,bytes,status"];
  for (const p of remoteRows) {
    const safe = p.ref.replace(/[\r\n,]+/g, " ").slice(0, 200);
    lines.push(`${p.kind},${csvQuote(safe)},remote,${p.url},${p.bytes},${p.status}`);
  }
  for (const l of local) {
    lines.push(`article-local,${csvQuote(l.title)},local,${l.path},${l.bytes},LOCAL`);
  }
  writeFileSync(OUT, lines.join("\n") + "\n");
  console.log(`WROTE ${OUT}`);

  const byKind: Record<string, { count: number; ok: number; miss: number; bytes: number }> = {};
  for (const p of remoteRows) {
    byKind[p.kind] ||= { count: 0, ok: 0, miss: 0, bytes: 0 };
    const a = byKind[p.kind];
    a.count++;
    if (typeof p.status === "number" && p.status >= 200 && p.status < 400 && p.bytes > 0) { a.ok++; a.bytes += p.bytes; }
    else a.miss++;
  }
  if (local.length) {
    byKind["article-local"] = { count: local.length, ok: local.length, miss: 0, bytes: local.reduce((s, l) => s + l.bytes, 0) };
  }
  console.log("SUMMARY:");
  for (const k of Object.keys(byKind)) {
    const a = byKind[k];
    console.log(`  ${k}: count=${a.count} ok=${a.ok} missing=${a.miss} bytes=${(a.bytes/1e6).toFixed(2)}MB`);
  }
}

function csvQuote(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

main().catch(e => { console.error(e); process.exit(1); });
