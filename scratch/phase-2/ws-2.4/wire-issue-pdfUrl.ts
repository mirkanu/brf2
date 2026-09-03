#!/usr/bin/env bun
// Wires pdfUrl + legacyPdfUrl into src/content/journal-issues/issue-NN.json
// using ws-2.4/issue-upload-manifest.csv (R2 public URLs).
//
// - Sets pdfUrl to the R2 URL.
// - Stores the original Drive source URL (from issue-pdf-inventory.csv)
//   in legacyPdfUrl for rollback.
// - Preserves existing pdfUrl if already set and not null — skip unless --force.
// - Skips issues without a corresponding JSON file in journal-issues/
//   (26/31/32 are absent — known).

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = "/home/workspace/1 Projects/brf2";
const ISSUES_DIR = `${ROOT}/src/content/journal-issues`;
const UPLOAD_MANIFEST = `${ROOT}/scratch/phase-2/ws-2.4/issue-upload-manifest.csv`;
const INVENTORY = `${ROOT}/scratch/phase-2/ws-2.4/issue-pdf-inventory.csv`;
const FORCE = process.argv.includes("--force");

type UploadRow = {
  issueNumber: number;
  publicUrl: string;
  status: "ok" | "fail";
};

type InventoryRow = { issueNumber: number; sourceUrl: string };

function parseUploadManifest(text: string): UploadRow[] {
  const lines = text.trim().split("\n");
  const [, ...data] = lines;
  return data
    .map((line) => {
      const cells = line.split(",");
      return {
        issueNumber: Number(cells[0]),
        publicUrl: cells[3],
        status: cells[6] as "ok" | "fail",
      };
    })
    .filter((r) => r.status === "ok");
}

function parseInventory(text: string): Map<number, string> {
  const lines = text.trim().split("\n");
  const [, ...data] = lines;
  const out = new Map<number, string>();
  for (const line of data) {
    const firstComma = line.indexOf(",");
    const lastComma = line.lastIndexOf(",");
    const issueNumber = Number(line.slice(0, firstComma));
    const sourceUrl = line.slice(lastComma + 1);
    out.set(issueNumber, sourceUrl);
  }
  return out;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

async function main() {
  const uploadText = await readFile(UPLOAD_MANIFEST, "utf8");
  const uploads = parseUploadManifest(uploadText);

  const invText = await readFile(INVENTORY, "utf8");
  const sources = parseInventory(invText);

  let updated = 0;
  let skipped = 0;
  let missing = 0;

  for (const row of uploads) {
    const filename = `issue-${pad2(row.issueNumber)}.json`;
    const path = join(ISSUES_DIR, filename);

    let existing: Record<string, unknown> | null = null;
    try {
      const text = await readFile(path, "utf8");
      existing = JSON.parse(text);
    } catch {
      console.warn(`[skip] no JSON file: ${filename}`);
      missing++;
      continue;
    }

    const current = existing.pdfUrl as string | null | undefined;
    if (!FORCE && current && current !== null) {
      console.log(`[skip] ${filename} already wired (${current})`);
      skipped++;
      continue;
    }

    existing.pdfUrl = row.publicUrl;
    existing.legacyPdfUrl = sources.get(row.issueNumber) ?? null;

    const out = JSON.stringify(existing, null, 2) + "\n";
    await writeFile(path, out, "utf8");
    console.log(`[wired] ${filename} -> ${row.publicUrl}`);
    updated++;
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped (already wired), ${missing} missing JSON`);
}

await main();
