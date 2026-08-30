import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join, basename } from "node:path";

const CONTENT_DIR = "src/content";

type RawMeta = {
  title: string;
  legacyPath: string;
  datePublished?: string;
  author?: string;
  authors?: string[];
  tags?: string[];
  rawCategories?: string[];
  primaryCategory?: string | null;
  [k: string]: unknown;
};

type ConferenceMeta = RawMeta & {
  year: number;
  subtitle?: string;
  theme?: string;
  venue?: string;
  dates?: string;
};

type JournalMeta = RawMeta & {
  issueNumber?: number | null;
  issueYear?: number | null;
  section?: string;
};

// Best-effort regex extractors from the legacy title or legacyPath.
function extractYear(legacyPath: string, title: string): number | null {
  // conferences: legacyPath like "/conference/2024" or "/conference/category/2014-..."
  // or title begins with "2024: ..."
  const m1 = legacyPath.match(/\/conference\/(?:category\/)?(\d{4})/);
  if (m1) return parseInt(m1[1], 10);
  const m2 = title.match(/^(\d{4})[:\s]/);
  if (m2) return parseInt(m2[1], 10);
  const m3 = legacyPath.match(/-(\d{4})-/);
  if (m3) return parseInt(m3[1], 10);
  return null;
}

// Try to split a typical "2024: Topic (Venue, dates)" title.
function parseConferenceTitle(rawTitle: string): { cleanTitle: string; subtitle?: string; venue?: string; dates?: string; theme?: string } {
  let title = rawTitle.trim();
  // Drop the leading year prefix we add later.
  title = title.replace(/^\d{4}[:\s]+/, "");
  // Try to match "Topic (Venue; dates)" or "Topic (Venue, dates)"
  const paren = title.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (!paren) return { cleanTitle: title };
  const topic = paren[1].trim();
  const inside = paren[2];
  // inside can be "Venue; dates" or "Venue, dates" or just "Venue"
  const semiSplit = inside.split(/\s*;\s*/);
  const venue = semiSplit[0].trim();
  const dates = semiSplit[1]?.trim();
  return { cleanTitle: topic, subtitle: topic, theme: topic, venue, dates };
}

function deriveJournalSection(rawCategories: string[]): string {
  if (rawCategories.length === 0) return "journal-article";
  const first = rawCategories[0];
  if (first === "past" || first === "upcoming") return "conference-session";
  if (first === "podcast") return "podcast";
  return "journal-article";
}

function parseIssueFromSlug(slug: string, rawCategories: string[]): { issueNumber: number | null; issueYear: number | null } {
  // Try category-based: "issue-01-january-march-1993" or "issue-1-1993"
  const issueMatch = slug.match(/^issue-(\d{1,3})(?:-.*?(\d{4}))?/);
  if (issueMatch) {
    return { issueNumber: parseInt(issueMatch[1], 10), issueYear: issueMatch[2] ? parseInt(issueMatch[2], 10) : null };
  }
  // Try year as issueYear fallback
  const yearFromCat = rawCategories.find((c) => /^\d{4}$/.test(c));
  if (yearFromCat) return { issueNumber: null, issueYear: parseInt(yearFromCat, 10) };
  return { issueNumber: null, issueYear: null };
}

async function enrichFile(jsonPath: string): Promise<RawMeta> {
  const txt = await readFile(jsonPath, "utf8");
  const meta = JSON.parse(txt) as RawMeta;
  return meta;
}

async function writeJson(path: string, obj: unknown) {
  await writeFile(path, JSON.stringify(obj, null, 2) + "\n");
}

async function processDir(dir: string, transform: (meta: RawMeta, id: string) => RawMeta) {
  const entries = await readdir(dir).catch(() => []);
  let count = 0;
  for (const name of entries) {
    if (!name.endsWith(".json")) continue;
    const id = basename(name, ".json");
    const path = join(dir, name);
    const meta = await enrichFile(path);
    const enriched = transform(meta, id);
    await writeJson(path, enriched);
    count++;
  }
  return count;
}

async function main() {
  console.log("[enrich] starting");

  const confCount = await processDir(join(CONTENT_DIR, "conferences"), (meta, id) => {
    const year = extractYear(meta.legacyPath, meta.title);
    const parsed = parseConferenceTitle(meta.title);
    const out: ConferenceMeta = {
      ...meta,
      title: parsed.cleanTitle || meta.title,
      year: year ?? 0,
    };
    if (parsed.subtitle) out.subtitle = parsed.subtitle;
    if (parsed.theme) out.theme = parsed.theme;
    if (parsed.venue) out.venue = parsed.venue;
    if (parsed.dates) out.dates = parsed.dates;
    return out;
  });
  console.log(`[enrich] conferences: ${confCount}`);

  const jCount = await processDir(join(CONTENT_DIR, "journal"), (meta, id) => {
    const section = deriveJournalSection(meta.rawCategories ?? []);
    const issue = parseIssueFromSlug(id, meta.rawCategories ?? []);
    const out: JournalMeta = { ...meta, section };
    if (issue.issueNumber != null) out.issueNumber = issue.issueNumber;
    if (issue.issueYear != null) out.issueYear = issue.issueYear;
    return out;
  });
  console.log(`[enrich] journal: ${jCount}`);

  const pCount = await processDir(join(CONTENT_DIR, "podcasts"), (meta, id) => {
    const out: JournalMeta = { ...meta, section: "podcast" };
    return out;
  });
  console.log(`[enrich] podcasts: ${pCount}`);
}

main().catch((e) => { console.error(e); process.exit(1); });