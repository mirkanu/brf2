#!/usr/bin/env bun
/**
 * wire-pdfLink.ts — Adds pdfLink + legacyPdfUrl fields to article JSONs.
 *
 * Reads download-manifest.csv (built by download-articles.ts) and writes
 * `pdfLink` (R2 URL) and `legacyPdfUrl` (original Squarespace URL) into
 * the corresponding JSON files under src/content/journal/.
 *
 * Idempotent: skips articles that already have a pdfLink unless --force.
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = "/home/workspace/1 Projects/brf2";
const JOURNAL_DIR = `${ROOT}/src/content/journal`;
const MANIFEST = `${ROOT}/scratch/phase-2/ws-2.4/download-manifest.csv`;
const R2_PUBLIC = "https://pub-011dc1a7faab4dbbafd9b3954e64f5f8.r2.dev";
const FORCE = process.argv.includes("--force");

type Row = {
  url: string;
  filename: string;
  articleIds: string[];
};

function parseManifest(text: string): Row[] {
  const lines = text.trim().split("\n");
  const header = lines[0].split(",");
  const idx = (k: string) => header.indexOf(k);
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    return {
      url: cells[idx("url")],
      filename: cells[idx("filename")],
      articleIds: cells[idx("article_ids")].split("|").filter(Boolean),
    };
  });
}

function formatJson(obj: unknown): string {
  return JSON.stringify(obj, null, 2) + "\n";
}

async function main() {
  const csv = await readFile(MANIFEST, "utf8");
  const rows = parseManifest(csv);

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let notFound = 0;
  const errors: string[] = [];

  for (const row of rows) {
    // Skip rows that didn't download successfully (status column was 404 etc.)
    // We encoded status implicitly by checking article_ids — but that's also missing.
    // Re-derive status from URL: cprf.co.uk external URLs are dead.
    if (row.url.includes("cprf.co.uk")) {
      notFound++;
      continue;
    }
    for (const articleId of row.articleIds) {
      const jsonPath = join(JOURNAL_DIR, `${articleId}.json`);
      let json: any;
      try {
        json = JSON.parse(await readFile(jsonPath, "utf8"));
      } catch (e: any) {
        failed++;
        errors.push(`${articleId}: ${e.message}`);
        continue;
      }
      if (json.section !== "journal-article") {
        skipped++;
        continue;
      }
      if (json.pdfLink && !FORCE) {
        skipped++;
        continue;
      }
      const r2Url = `${R2_PUBLIC}/pdfs/articles/${row.filename}`;
      json.pdfLink = r2Url;
      json.legacyPdfUrl = row.url;
      await writeFile(jsonPath, formatJson(json));
      updated++;
    }
  }

  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Not found (cprf.co.uk): ${notFound}`);
  if (errors.length) {
    console.log("\nErrors:");
    for (const e of errors.slice(0, 20)) console.log(`  ${e}`);
  }
}

await main();
