#!/usr/bin/env bun
// Uploads every successfully downloaded issue PDF from
// ws-2.4/downloads/Copy of BRJ-NN-*.pdf to Cloudflare R2 bucket
// brf2-assets under the key pdfs/issues/issue-NN.pdf.
//
// Idempotent: re-running overwrites with the same bytes.
// Concurrency 8 — same as upload-articles.ts.
//
// Writes ws-2.4/issue-upload-manifest.csv with mapping so
// wire-issue-pdfUrl.ts can update content/journal-issues/*.json.
//
// Issues 26/31/32 have no source JSON files in journal-issues/ —
// they were dropped during the de-dup pass. Skipped here too.

import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const DOWNLOADS_DIR = "/home/workspace/1 Projects/brf2/scratch/phase-2/ws-2.4/downloads";
const MANIFEST_OUT = "/home/workspace/1 Projects/brf2/scratch/phase-2/ws-2.4/issue-upload-manifest.csv";
const ISSUES_DIR = "/home/workspace/1 Projects/brf2/src/content/journal-issues";
const BUCKET = "brf2-assets";
const PREFIX = "pdfs/issues/";
const PUBLIC_BASE = "https://pub-011dc1a7faab4dbbafd9b3954e64f5f8.r2.dev";
const CONCURRENCY = 8;

const endpoint = process.env.CLOUDFLARE_R2_S3_ENDPOINT;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

if (!endpoint || !accessKeyId || !secretAccessKey) {
  console.error("Missing R2 env vars (CLOUDFLARE_R2_S3_ENDPOINT / _ACCESS_KEY_ID / _SECRET_ACCESS_KEY)");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

type UploadResult = {
  issueNumber: number;
  filename: string;
  key: string;
  publicUrl: string;
  bytes: number;
  ms: number;
  status: "ok" | "fail";
  error?: string;
};

const filenameRe = /^Copy of BRJ-(\d{2,3})-[^/]+\.pdf$/i;
const files = readdirSync(DOWNLOADS_DIR);

type Planned = { issueNumber: number; filename: string; local: string; bytes: number };
const planned: Planned[] = [];
for (const f of files) {
  const m = f.match(filenameRe);
  if (!m) continue;
  const issueNumber = Number(m[1]);
  const local = join(DOWNLOADS_DIR, f);
  const st = await stat(local);
  if (st.size === 0) continue;
  planned.push({ issueNumber, filename: f, local, bytes: st.size });
}

planned.sort((a, b) => a.issueNumber - b.issueNumber);
console.log(`Uploading ${planned.length} issue PDFs to ${BUCKET}/${PREFIX}`);

const results: UploadResult[] = [];
let cursor = 0;

async function uploadOne(row: Planned): Promise<void> {
  const key = `${PREFIX}issue-${String(row.issueNumber).padStart(2, "0")}.pdf`;
  const publicUrl = `${PUBLIC_BASE}/${key}`;
  const t0 = Date.now();
  try {
    const body = await readFile(row.local);
    const uploader = new Upload({
      client: s3,
      params: {
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: "application/pdf",
        CacheControl: "public, max-age=31536000, immutable",
      },
    });
    await uploader.done();
    const ms = Date.now() - t0;
    results.push({ issueNumber: row.issueNumber, filename: row.filename, key, publicUrl, bytes: row.bytes, ms, status: "ok" });
    process.stderr.write(`[done] issue-${String(row.issueNumber).padStart(2, "0")} ${row.bytes}B ${ms}ms\n`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({ issueNumber: row.issueNumber, filename: row.filename, key, publicUrl, bytes: row.bytes, ms: Date.now() - t0, status: "fail", error: message });
    process.stderr.write(`[FAIL] ${row.filename} :: ${message}\n`);
  }
}

async function worker(): Promise<void> {
  while (true) {
    const idx = cursor++;
    if (idx >= planned.length) return;
    await uploadOne(planned[idx]);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const ok = results.filter((r) => r.status === "ok").length;
const fail = results.length - ok;
const totalBytes = results.filter((r) => r.status === "ok").reduce((a, r) => a + r.bytes, 0);
console.log(`\nUploads complete: ${ok} OK, ${fail} failed, ${(totalBytes / 1024 / 1024).toFixed(1)} MB total`);

const header = "issue_number,filename,key,public_url,bytes,ms,status,error\n";
const body = results
  .map((r) =>
    [
      r.issueNumber,
      r.filename,
      r.key,
      r.publicUrl,
      r.bytes,
      r.ms,
      r.status,
      r.error ?? "",
    ]
      .map((v) =>
        String(v).includes(",") || String(v).includes('"')
          ? `"${String(v).replace(/"/g, '""')}"`
          : v,
      )
      .join(","),
  )
  .join("\n");
await writeFile(MANIFEST_OUT, header + body + "\n");
console.log(`Manifest written to ${MANIFEST_OUT}`);

if (fail > 0) process.exit(1);
