#!/usr/bin/env bun
/**
 * split-issue-articles.ts — Cuts the OCR'd whole-issue PDFs (BRJ-NN-*)
 * into per-article PDFs by page range, using qpdf.
 *
 * Page mappings come from PAGE_MAP (below). Each entry:
 *   issueNumber → array of { slug, startPage, endPage } (1-indexed, inclusive).
 *
 * Output goes to ws-2.4/article-cuts/ with names matching the existing
 * R2 naming convention: BRJ-NN-<period-or-issue>-<slug>.pdf
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = "/home/workspace/1 Projects/brf2";
const DOWNLOADS_DIR = `${ROOT}/scratch/phase-2/ws-2.4/downloads`;
const OUT_DIR = `${ROOT}/scratch/phase-2/ws-2.4/article-cuts`;
const MANIFEST_OUT = `${ROOT}/scratch/phase-2/ws-2.4/cut-manifest.csv`;
const ISSUE_FILTER = process.env.ISSUE; // e.g. "19"; undefined → all

type Cut = {
  issue: string;
  filename: string; // BRJ-19-July-Sept-1997-say-shibboleth-say-revival.pdf
  startPage: number;
  endPage: number;
  articleId: string;
};

// Period label for filename slug, matches existing convention
const PERIOD_LABEL: Record<string, string> = {
  "11": "July-Sept-1995",
  "12": "Oct-Dec-1995",
  "13": "Jan-Mar-1996",
  "14": "Apr-June-1996",
  "15": "July-Sept-1996",
  "16": "Oct-Dec-1996",
  "17": "Jan-Mar-1997",
  "18": "Apr-June-1997",
  "19": "July-Sept-1997",
};

// Source filename (the whole-issue PDF on disk)
const SOURCE_FILE: Record<string, string> = {
  "11": "Copy of BRJ-11-July-Sept 1995.pdf",
  "12": "Copy of BRJ-12-Oct-Dec 1995.pdf",
  "13": "Copy of BRJ-13-Jan-Mar 1996.pdf",
  "14": "Copy of BRJ-14-Apr-June 1996.pdf",
  "15": "Copy of BRJ-15-July-Sept 1996.pdf",
  "16": "Copy of BRJ-16-Oct-Dec 1996.pdf",
  "17": "Copy of BRJ-17-Jan-Mar 1997.pdf",
  "18": "Copy of BRJ-18-Apr-June 1997.pdf",
  "19": "Copy of BRJ-19-July-Sept 1997.pdf",
};

// Page ranges (1-indexed, inclusive) — derived from pdftotext analysis.
// NOTE: page 1 of every issue is the front cover, page 2 the masthead,
// page 3 the contents/colophon. Article text starts on page 4 onward.
// Page boundaries were detected by inspecting the first non-blank line(s)
// of each page.
type Range = { slug: string; articleId: string; start: number; end: number };
const PAGE_MAP: Record<string, Range[]> = {
  // ── Issue 19 (July–Sept 1997), 52 pages ────────────────────────────
  "19": [
    { slug: "say-shibboleth-say-revival", articleId: "british-reformed-journal-issue-19-july-september-1997-say-shibboleth-say-revival", start: 4, end: 5 },
    { slug: "the-qgreat-awakeningq-was-it", articleId: "british-reformed-journal-issue-19-july-september-1997-the-qgreat-awakeningq-was-it", start: 6, end: 11 },
    { slug: "the-great-revival-of-religion-1740-1745-1", articleId: "british-reformed-journal-issue-19-july-september-1997-the-great-revival-of-religion-1740-1745-1", start: 12, end: 24 },
    { slug: "book-review-revival-and-revivalism", articleId: "books-revival-and-revivalism-by-iain-h-murray", start: 25, end: 31 },
    { slug: "the-last-of-the-calvinistic-methodists-d-m-lloyd-jones-and-his-problematic-qrevivalq-theology", articleId: "british-reformed-journal-issue-19-july-september-1997-the-last-of-the-calvinistic-methodists-d-m-lloyd-jones-and-his-problematic-qrevivalq-theology", start: 32, end: 48 },
    { slug: "recommended-reading-on-revivals", articleId: "british-reformed-journal-issue-19-july-september-1997-recommended-reading-on-revivals", start: 49, end: 49 },
    { slug: "correspondence", articleId: "british-reformed-journal-issue-19-july-september-1997-correspondence", start: 50, end: 50 },
  ],
  // ── Issues 11–18 ── page boundaries not yet derived ────────────────
  // (will be filled in after Issue 19 sign-off)
};

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const issues = ISSUE_FILTER ? [ISSUE_FILTER] : Object.keys(PAGE_MAP);
  const cuts: Cut[] = [];

  for (const issue of issues) {
    const sourcePath = join(DOWNLOADS_DIR, SOURCE_FILE[issue]);
    if (!existsSync(sourcePath)) {
      console.error(`✗ Missing source PDF for issue ${issue}: ${sourcePath}`);
      continue;
    }
    const ranges = PAGE_MAP[issue];
    if (!ranges) {
      console.log(`⊘ Issue ${issue}: no page map yet, skipping`);
      continue;
    }
    const period = PERIOD_LABEL[issue];
    for (const r of ranges) {
      const outName = `BRJ-${issue}-${period}-${r.slug}.pdf`;
      const outPath = join(OUT_DIR, outName);
      // qpdf <input> --pages <input> <start>-<end> -- <output>
      execFileSync("qpdf", [
        sourcePath,
        "--pages", sourcePath, `${r.start}-${r.end}`,
        "--", outPath,
      ], { stdio: ["ignore", "inherit", "inherit"] });
      const cut: Cut = {
        issue,
        filename: outName,
        startPage: r.start,
        endPage: r.end,
        articleId: r.articleId,
      };
      cuts.push(cut);
      console.log(`✓ ${outName}  (pages ${r.start}-${r.end})`);
    }
  }

  // Manifest for downstream upload + wire-up
  const header = "filename,key,issue,article_id,start_page,end_page";
  const rows = cuts.map(c =>
    `${c.filename},pdfs/articles/${c.filename},${c.issue},${c.articleId},${c.startPage},${c.endPage}`
  );
  await writeFile(MANIFEST_OUT, [header, ...rows].join("\n") + "\n");
  console.log(`\nWrote ${cuts.length} cuts → ${MANIFEST_OUT}`);
}

await main();
