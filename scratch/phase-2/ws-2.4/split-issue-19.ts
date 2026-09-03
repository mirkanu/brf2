#!/usr/bin/env bun
/**
 * split-issue-19.ts — Cuts Issue 19 into per-article PDFs based on page boundaries
 * identified by inspecting the OCR'd text layer.
 *
 * Issue 19 ("BRJ-19-July-Sept 1997.pdf") page boundaries:
 *   p4-5   Editorial - Say: Shibboleth
 *   p6-11  The Great Awakening - Was it?
 *   p12-24 The Great Revival of Religion 1740-1745
 *   p25-31 Book Review: Revival and Revivalism  (NOT in journal collection)
 *   p32-48 The Last of the Calvinistic Methodists
 *   p49    Recommended Reading on Revivals
 *   p50    Correspondence: Hebrew Vowel Points
 *
 * p1-3 = cover/copyright, p51-52 = back matter (not article content)
 */

import { mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ISSUE_PDF = "/home/workspace/1 Projects/brf2/scratch/phase-2/ws-2.4/downloads/Copy of BRJ-19-July-Sept 1997.pdf";
const OUT_DIR = "/home/workspace/1 Projects/brf2/scratch/phase-2/ws-2.4/downloads";

// [outputFilename, startPage, endPage]
const CUTS: Array<[string, number, number]> = [
  ["BRJ-19-July-Sept-1997-say-shibboleth.pdf", 4, 5],
  ["BRJ-19-July-Sept-1997-the-great-awakening-was-it.pdf", 6, 11],
  ["BRJ-19-July-Sept-1997-the-great-revival-of-religion.pdf", 12, 24],
  // ["BRJ-19-July-Sept-1997-book-review-revival-and-revivalism.pdf", 25, 31], // not in journal collection under issue 19
  ["BRJ-19-July-Sept-1997-the-last-of-the-calvinistic-methodists.pdf", 32, 48],
  ["BRJ-19-July-Sept-1997-recommended-reading-on-revivals.pdf", 49, 49],
  ["BRJ-19-July-Sept-1997-correspondence-hebrew-vowel-points.pdf", 50, 50],
];

async function main() {
  if (!existsSync(ISSUE_PDF)) {
    console.error(`Issue PDF not found: ${ISSUE_PDF}`);
    process.exit(1);
  }
  const info = await stat(ISSUE_PDF);
  console.log(`Issue 19: ${(info.size / 1024).toFixed(1)} KB`);

  for (const [filename, start, end] of CUTS) {
    const outPath = join(OUT_DIR, filename);
    console.log(`  ${filename}: p${start}-p${end} -> ${(outPath.length > 60 ? "…" + outPath.slice(-57) : outPath)}`);
    execFileSync("qpdf", [
      ISSUE_PDF,
      "--pages", ISSUE_PDF, `${start}-${end}`, "--",
      outPath,
    ], { stdio: ["ignore", "inherit", "inherit"] });
    const out = await stat(outPath);
    console.log(`    -> ${(out.size / 1024).toFixed(1)} KB`);
  }

  console.log(`\nDone. ${CUTS.length} cuts written to ${OUT_DIR}`);
}

await main();
