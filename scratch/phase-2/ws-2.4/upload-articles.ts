#!/usr/bin/env bun
// Uploads every successfully downloaded article PDF from
// ws-2.4/downloads/ to Cloudflare R2 bucket brf2-assets under
// the key prefix pdfs/articles/.
//
// Idempotent: re-running overwrites with the same bytes.
// Concurrency is moderate (~8) — R2 S3 handles parallel multipart fine.
// Writes ws-2.4/upload-manifest.csv with each article_id → R2 URL mapping
// so downstream scripts can wire pdfLink into content JSONs.

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { join } from "node:path";

const DOWNLOADS_DIR = "/home/workspace/1 Projects/brf2/scratch/phase-2/ws-2.4/downloads";
const MANIFEST_IN = "/home/workspace/1 Projects/brf2/scratch/phase-2/ws-2.4/download-manifest.csv";
const INVENTORY = "/home/workspace/1 Projects/brf2/scratch/phase-2/ws-2.4/article-pdf-inventory.csv";
const MANIFEST_OUT = "/home/workspace/1 Projects/brf2/scratch/phase-2/ws-2.4/upload-manifest.csv";
const BUCKET = "brf2-assets";
const PREFIX = "pdfs/articles/";
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
  filename: string;
  key: string;
  publicUrl: string;
  bytes: number;
  ms: number;
  status: "ok" | "fail";
  error?: string;
};

// Build inventory: filename → list of article_ids that reference it
const invText = await Bun.file(INVENTORY).text();
const invLines = invText.split("\n").filter((l) => l.trim());
const [, ...invRows] = invLines;
const filenameToArticleIds = new Map<string, string[]>();
for (const line of invRows) {
  const firstComma = line.indexOf(",");
  const lastComma = line.lastIndexOf(",");
  const articleId = line.slice(0, firstComma);
  const filename = line.slice(firstComma + 1, lastComma);
  const arr = filenameToArticleIds.get(filename) ?? [];
  arr.push(articleId);
  filenameToArticleIds.set(filename, arr);
}

// Build manifest (only successful downloads)
const manifestText = await Bun.file(MANIFEST_IN).text();
const manifestLines = manifestText.split("\n").slice(1).filter((l) => l.trim());
type ManifestRow = { filename: string; bytes: number; status: number; local: string };
const downloads: ManifestRow[] = manifestLines.map((line) => {
  const parts = line.split(",");
  return {
    filename: parts[1],
    bytes: Number(parts[3]),
    status: Number(parts[4]),
    local: parts[2],
  };
}).filter((r) => r.status === 200 && r.bytes > 0);

console.log(`Uploading ${downloads.length} PDFs to ${BUCKET}/${PREFIX}`);

const results: UploadResult[] = [];
let cursor = 0;

async function uploadOne(row: ManifestRow): Promise<void> {
  const key = PREFIX + row.filename;
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
    results.push({ filename: row.filename, key, publicUrl, bytes: row.bytes, ms, status: "ok" });
    process.stderr.write(`[done] ${row.filename.padEnd(60)} ${row.bytes}B ${ms}ms\n`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({ filename: row.filename, key, publicUrl, bytes: row.bytes, ms: Date.now() - t0, status: "fail", error: message });
    process.stderr.write(`[FAIL] ${row.filename} :: ${message}\n`);
  }
}

async function worker(): Promise<void> {
  while (true) {
    const idx = cursor++;
    if (idx >= downloads.length) return;
    await uploadOne(downloads[idx]);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const ok = results.filter((r) => r.status === "ok").length;
const fail = results.length - ok;
const totalBytes = results.filter((r) => r.status === "ok").reduce((a, r) => a + r.bytes, 0);
console.log(`\nUploads complete: ${ok} OK, ${fail} failed, ${(totalBytes / 1024 / 1024).toFixed(1)} MB total`);

const header = "filename,key,public_url,bytes,ms,status,error,article_ids\n";
const body = results.map((r) => {
  const ids = filenameToArticleIds.get(r.filename) ?? [];
  return [r.filename, r.key, r.publicUrl, r.bytes, r.ms, r.status, r.error ?? "", ids.join(" ")].map((v) =>
    String(v).includes(",") || String(v).includes("\"") ? `"${String(v).replace(/"/g, '""')}"` : v,
  ).join(",");
}).join("\n");
await writeFile(MANIFEST_OUT, header + body + "\n");
console.log(`Manifest written to ${MANIFEST_OUT}`);

if (fail > 0) process.exit(1);
