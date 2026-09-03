#!/usr/bin/env bun
/**
 * download-issues.ts — Downloads every journal-issue PDF from Google Drive
 * to scratch/phase-2/ws-2.4/downloads/.
 *
 * Source: Drive folder 1gtXO5azesAEeAti2eKNOFpA_jtcCQGGs
 *   ("BRJ single PDFs"). Inventory CSV maps issue-NN -> Drive file ID.
 *
 * Re-runnable: skips files that exist locally with size > 0.
 */
import { mkdir, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";

const ROOT = "/home/workspace/1 Projects/brf2";
const INVENTORY = `${ROOT}/scratch/phase-2/ws-2.4/issue-pdf-inventory.csv`;
const DOWNLOADS_DIR = `${ROOT}/scratch/phase-2/ws-2.4/downloads`;
const MANIFEST = `${ROOT}/scratch/phase-2/ws-2.4/issue-download-manifest.csv`;

await mkdir(DOWNLOADS_DIR, { recursive: true });

type Row = { issueNumber: string; fileId: string; filename: string };

function parseInventory(text: string): Row[] {
  return text.split("\n").filter((l) => l.trim()).map((line) => {
    const [num, id, ...rest] = line.split(",");
    return { issueNumber: num, fileId: id, filename: rest.join(",") };
  });
}

const csv = await Bun.file(INVENTORY).text();
const rows = parseInventory(csv);
console.log(`Total issue PDFs on Drive: ${rows.length}`);

type Result = {
  issueNumber: string;
  filename: string;
  fileId: string;
  local: string;
  bytes: number;
  status: string;
  ms: number;
  error?: string;
};

const results: Result[] = [];
let cursor = 0;

async function downloadRow(row: Row): Promise<Result> {
  const local = join(DOWNLOADS_DIR, row.filename);
  const start = performance.now();

  // Skip if already downloaded
  try {
    const st = await stat(local);
    if (st.size > 0) {
      return {
        issueNumber: row.issueNumber,
        filename: row.filename,
        fileId: row.fileId,
        local,
        bytes: st.size,
        status: "exists",
        ms: 0,
      };
    }
  } catch {}

  // Use Pipedream proxy URL pattern — download via use_app_google_drive.
  // We can't call the app tool from inside a script, so the actual download
  // happens via a parallel run_command orchestrator (download-issues.sh).
  return {
    issueNumber: row.issueNumber,
    filename: row.filename,
    fileId: row.fileId,
    local,
    bytes: 0,
    status: "queued",
    ms: 0,
  };
}

const queued = await Promise.all(rows.map(downloadRow));
await writeFile(MANIFEST,
  "issue_number,filename,file_id,local,bytes,status,ms,error\n" +
  queued.map(r =>
    [r.issueNumber, r.filename, r.fileId, r.local, r.bytes, r.status, r.ms, r.error ?? ""].join(",")
  ).join("\n") + "\n"
);
console.log(`Wrote ${MANIFEST}`);
console.log(`Need to download: ${queued.filter(r => r.status === "queued").length}`);
