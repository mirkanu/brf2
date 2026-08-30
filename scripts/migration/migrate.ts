// Migrates the Squarespace → WordPress XML export at
//   /home/workspace/0 Inbox/brf-squarespace-exports/blog Squarespace-Wordpress-Export-08-30-2026.xml
// into Astro content collections under src/content/{journal,podcasts,conferences,pages}/
//
// Run from project root:   cd "1 Projects/brf2" && bun run scripts/migration/migrate.ts
//
// Re-running is safe: existing files are overwritten in place.
//
// Output:
//   src/content/journal/{slug}.json + {slug}.md     (413 items)
//   src/content/podcasts/{slug}.json + {slug}.md    (88 items)
//   src/content/conferences/{slug}.json + {slug}.md (43 items)
//   src/content/pages/{slug}.json + {slug}.md       (16 items: /home, /blog, /brj-articles, /conferences, …)
//
//   manifest.json  (counts, warnings, sample mapping)

import { XMLParser } from "fast-xml-parser";
import TurndownService from "turndown";
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const EXPORT = "/home/workspace/0 Inbox/brf-squarespace-exports/blog Squarespace-Wordpress-Export-08-30-2026.xml";
const CONTENT_BASE = resolve(ROOT, "src/content");

// ---------------------------------------------------------------------------
// 1. Parse the export
// ---------------------------------------------------------------------------

const raw = readFileSync(EXPORT, "utf-8");
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  trimValues: false,
  parseAttributeValue: false,
  isArray: (name) => name === "item" || name === "category",
});
const parsed = parser.parse(raw);
const items: any[] = parsed.rss.channel.item;

console.error(`[migrate] parsed ${items.length} items from export`);

// ---------------------------------------------------------------------------
// 2. Helpers
// ---------------------------------------------------------------------------

const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
turndown.addRule("figureWithImageOnly", {
  filter: (node) =>
    node.nodeName === "FIGURE" && node.childNodes.length === 1 && node.firstChild?.nodeName === "IMG",
  replacement: (_, node) => (node as HTMLElement).outerHTML,
});
turndown.addRule("scriptStrip", { filter: "script", replacement: () => "" });

function asText(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && "#text" in v) return String(v["#text"]);
  return String(v);
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function htmlToMarkdown(html: string): string {
  if (!html) return "";
  return turndown.turndown(decodeEntities(html)).trim();
}

function cleanSlug(s: string): string {
  return decodeEntities(s)
    .toLowerCase()
    .replace(/^-+|-+$/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-");
}

function frontmatterEscape(v: any): string {
  const s = String(v ?? "");
  if (s.includes('"') || s.includes("\n")) {
    return JSON.stringify(s);
  }
  return `"${s}"`;
}

function buildFrontmatter(fields: Record<string, any>): string {
  const lines = ["---"];
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      lines.push(`${k}:`, ...v.map((x) => `  - ${frontmatterEscape(x)}`));
    } else {
      lines.push(`${k}: ${frontmatterEscape(v)}`);
    }
  }
  lines.push("---", "");
  return lines.join("\n");
}

interface PostMeta {
  sourceLink: string;     // e.g. /journal/articles/british-reformed-journal/issue-X/foo
  collection: "journal" | "podcasts" | "conferences" | "pages" | "drop";
  slug: string;           // filename stem (without .json/.md)
  title: string;
  authors: string[];      // display names (1+); empty array if unknown
  authorLogins?: string[];// raw author_login/emails (audit)
  rawCategories: string[]; // nicenames
  rawTags: string[];       // tag display names
  publishedAt: string;     // ISO
  rawHtml: string;
}

function bucketItem(link: string): PostMeta["collection"] {
  if (link.startsWith("/journal/")) return "journal";
  if (link.startsWith("/podcast/")) return "podcasts";
  if (link.startsWith("/conference/")) return "conferences";
  if (link.startsWith("/literature/")) return "journal"; // literature pages treated as journal items for now
  if (link.startsWith("/about/") || link.startsWith("/devotionals/") || link.startsWith("/catechisms/") || link.startsWith("/blog-")) return "journal";
  return "pages";
}

// Parse "issue-01-january-march-1993" + "01" -> { number: 1, year: 1993 } etc.
function parseIssueNumber(nicename: string, fallback: number | null): { number: number | null; year: number | null } {
  if (!nicename) return { number: fallback, year: null };
  const m1 = nicename.match(/^issue-(\d+)(?:[-]|$)/);
  if (m1) {
    const num = parseInt(m1[1], 10);
    const yMatch = nicename.match(/(\d{4})/);
    return { number: num, year: yMatch ? parseInt(yMatch[1], 10) : null };
  }
  const yOnly = nicename.match(/(\d{4})/);
  return { number: fallback, year: yOnly ? parseInt(yOnly[1], 10) : null };
}

// Extract author display names from dc:creator (email) by cross-ref wp:author_login.
function buildAuthorIndex(exportItems: any[]): Map<string, string> {
  const idx = new Map<string, string>();
  for (const it of exportItems) {
    if (it["wp:post_type"] !== null && it["wp:post_type"] !== undefined) continue; // We'll derive from posts below
    const login = asText(it["wp:author_login"]);
    const disp = asText(it["wp:author_display_name"]);
    if (login && disp) idx.set(login, disp);
  }
  return idx;
}

// Build author index strictly — find logins from posts (their dc:creator) and match with author entries
function deriveAuthorMap(exportItems: any[]) {
  const logins = new Set<string>();
  const byLogin = new Map<string, { display: string; first: string; last: string; email: string }>();
  for (const it of exportItems) {
    const creator = asText(it["dc:creator"]);
    if (creator) logins.add(creator);
    const login = asText(it["wp:author_login"]);
    if (login && !byLogin.has(login)) {
      byLogin.set(login, {
        display: asText(it["wp:author_display_name"]),
        first: asText(it["wp:author_first_name"]),
        last: asText(it["wp:author_last_name"]),
        email: asText(it["wp:author_email"]),
      });
    }
  }
  const map = new Map<string, string>();
  for (const login of logins) map.set(login, byLogin.get(login)?.display || login);
  return map;
}

const authorMap = deriveAuthorMap(items);

// ---------------------------------------------------------------------------
// 3. Walk items, classify, emit
// ---------------------------------------------------------------------------

const counts = { journal: 0, podcasts: 0, conferences: 0, pages: 0, dropped: 0 };
const warnings: string[] = [];
const usedSlugs = new Map<string, string>(); // slug -> collection (detects collisions across collections)

function uniqueSlug(base: string, collection: string): string {
  let s = base;
  let n = 2;
  while (usedSlugs.has(s) && usedSlugs.get(s) !== collection) {
    s = `${base}-${n++}`;
  }
  usedSlugs.set(s, collection);
  return s;
}

const typeMap = (it: any) => asText(it["wp:post_type"]);
const statusMap = (it: any) => asText(it["wp:status"]);

for (const it of items) {
  const type = typeMap(it);
  const status = statusMap(it);
  const link = asText(it.link).trim();
  const title = asText(it.title).trim() || "(untitled)";

  if (status !== "publish") continue;

  const isPost = type === "post";
  const isPage = type === "page";

  // Pages → "pages" collection
  if (isPage) {
    const slug = cleanSlug(link.replace(/^\//, "")) || "home";
    const slugUnique = uniqueSlug(slug, "pages");
    const publishedAt = asText(it["wp:post_date_gmt"]) || asText(it["pubDate"]) || "";
    const creator = asText(it["dc:creator"]);
    const categories = Array.isArray(it.category)
      ? it.category.filter((c: any) => c["@_domain"] === "category").map((c: any) => asText(c["@_nicename"]))
      : [];
    const tags = Array.isArray(it.category)
      ? it.category.filter((c: any) => c["@_domain"] === "post_tag").map((c: any) => asText(c["#text"]))
      : [];
    const content = asText(it["content:encoded"]);
    const body = htmlToMarkdown(content);
    writeItem({
      collection: "pages",
      slug: slugUnique,
      title,
      sourceLink: link,
      publishedAt,
      rawCategories: categories,
      rawTags: tags,
      rawHtml: body,
      pageAuthors: authorMap.get(creator) ? [authorMap.get(creator)!] : [creator],
    });
    counts.pages++;
    continue;
  }

  if (!isPost) continue;

  const collection = bucketItem(link);
  if (collection === "drop") {
    counts.dropped++;
    continue;
  }

  // Determine a usable slug.
  // Strategy:
  //   - journal: take the wp:post_name (already has issue-X/article-slug form, often)
  //   - podcasts/conferences: wp:post_name is fine
  //   - else fall back to cleaned title
  const wpName = asText(it["wp:post_name"]).trim();
  let baseSlug = wpName ? cleanSlug(wpName) : cleanSlug(title.toLowerCase());
  if (!baseSlug) baseSlug = "untitled";
  const slugUnique = uniqueSlug(baseSlug, collection);

  const publishedAt = asText(it["wp:post_date_gmt"]) || asText(it.pubDate) || "";
  const creator = asText(it["dc:creator"]);
  const categories = Array.isArray(it.category)
    ? it.category.filter((c: any) => c["@_domain"] === "category").map((c: any) => asText(c["@_nicename"]))
    : [];
  const tags = Array.isArray(it.category)
    ? it.category.filter((c: any) => c["@_domain"] === "post_tag").map((c: any) => asText(c["#text"]))
    : [];
  const content = asText(it["content:encoded"]);
  const body = htmlToMarkdown(content);
  writeItem({
    collection,
    slug: slugUnique,
    title,
    sourceLink: link,
    publishedAt,
    rawCategories: categories,
    rawTags: tags,
    rawHtml: body,
    pageAuthors: authorMap.get(creator) ? [authorMap.get(creator)!] : [creator],
  });
  counts[collection as keyof typeof counts]++;
}

function writeItem(args: {
  collection: PostMeta["collection"];
  slug: string;
  title: string;
  sourceLink: string;
  publishedAt: string;
  rawCategories: string[];
  rawTags: string[];
  rawHtml: string;
  pageAuthors?: string[];
  pageAuthor?: string;
  pageAuthorLogins?: string[];
}): void { // accept either pageAuthors or pageAuthor for backward compat
  const { collection, slug, title, sourceLink, publishedAt, rawCategories, rawTags, rawHtml, pageAuthors: pAuthors, pageAuthor: pAuthor, pageAuthorLogins } = args;
  const pageAuthors = pAuthors ?? (pAuthor != null && pAuthor !== "" ? [pAuthor] : []);
  if (collection === "drop") return;

  const dir = resolve(CONTENT_BASE, collection);
  mkdirSync(dir, { recursive: true });

  // ---- JSON metadata (drives content.config.ts validation) ----
  let issueNumber: number | null = null;
  let issueYear: number | null = null;
  let primaryCategory: string = "";
  for (const c of rawCategories) {
    if (!primaryCategory) primaryCategory = c;
    const { number, year } = parseIssueNumber(c, null);
    if (number != null && issueNumber == null) issueNumber = number;
    if (year != null && issueYear == null) issueYear = year;
  }

  // Authors: title-case tags look like author names. Heuristic: include all tags as topics,
  // but tag "by-author-<first-last>" would be impractical — instead, set author = pageAuthor only.
  // We'll surface tag array too.
  const meta: any = {
    title,
    legacyPath: sourceLink,
    datePublished: publishedAt,
    authors: pageAuthors,
    tags: rawTags,
    rawCategories,
    primaryCategory: primaryCategory || null,
  };
  if (collection === "journal") {
    meta.issueNumber = issueNumber;
    meta.issueYear = issueYear;
  }

  const jsonPath = resolve(dir, `${slug}.json`);
  writeFileSync(jsonPath, JSON.stringify(meta, null, 2) + "\n", "utf-8");

  // ---- Markdown body (frontmatter mirrors JSON for redundancy) ----
  const fmLines: string[] = ["---"];
  fmLines.push(`title: ${frontmatterEscape(title)}`);
  fmLines.push(`legacyPath: ${frontmatterEscape(sourceLink)}`);
  fmLines.push(`datePublished: ${frontmatterEscape(publishedAt)}`);
  if (pageAuthors.length) {
    fmLines.push("authors:", ...pageAuthors.map((n) => `  - ${frontmatterEscape(n)}`));
  } else {
    fmLines.push("authors: []");
  }
  if (pageAuthorLogins && pageAuthorLogins.length) {
    fmLines.push("authorLogins:", ...pageAuthorLogins.map((e) => `  - ${frontmatterEscape(e)}`));
  }
  if (collection === "journal") {
    fmLines.push(`issueNumber: ${issueNumber ?? "null"}`);
    fmLines.push(`issueYear: ${issueYear ?? "null"}`);
  }
  if (rawTags.length) {
    fmLines.push("tags:", ...rawTags.map((t) => `  - ${frontmatterEscape(t)}`));
  }
  fmLines.push("---", "", rawHtml, "");
  const mdPath = resolve(dir, `${slug}.md`);
  writeFileSync(mdPath, fmLines.join("\n"), "utf-8");
}

console.error("[migrate] wrote files:", counts);

const manifest = {
  exportFile: EXPORT,
  exportItems: items.length,
  counts,
  warnings,
  generatedAt: new Date().toISOString(),
};
writeFileSync(resolve(CONTENT_BASE, "migrate-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.error("[migrate] wrote manifest to src/content/migrate-manifest.json");
