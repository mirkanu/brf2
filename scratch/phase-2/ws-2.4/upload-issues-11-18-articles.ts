#!/usr/bin/env bun
// Uploads per-article PDFs (issues 11-18, OCR'd) from downloads/ to R2.
// Pattern: BRJ-NN-MMM-YYYY-slug.pdf -> pdfs/articles/BRJ-NN-MMM-YYYY-slug.pdf
// Concurrent 8.

import { readdirSync } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const DOWNLOADS = "/home/workspace/1 Projects/brf2/scratch/phase-2/ws-2.4/downloads";
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

const re = /^BRJ-(1[1-8])-.*\.pdf$/;
const files = readdirSync(DOWNLOADS).filter((f) => re.test(f));

type Res = { filename: string; key: string; publicUrl: string; bytes: number; ms: number; status: "ok" | "fail"; error?: string };
const results: Res[] = [];

async function uploadOne(filename: string): Promise<Res> {
  const local = join(DOWNLOADS, filename);
  const key = `${PREFIX}${filename}`;
  const publicUrl = `${PUBLIC_BASE}/${key}`;
  const info = await stat(local);
  const t0 = Date.now();
  try {
    const upload = new Upload({
      client: s3,
      params: { Bucket: BUCKET, Key: key, Body: (await import("node:fs")).readFileSync(local) },
    });
    await upload.done();
    return { filename, key, publicUrl, bytes: info.size, ms: Date.now() - t0, status: "ok" };
  } catch (e: any) {
    return { filename, key, publicUrl, bytes: info.size, ms: Date.now() - t0, status: "fail", error: e?.message ?? String(e) };
  }
}

async function pool<T>(n: number, items: T[], worker: (t: T) => Promise<Res>): Promise<Res[]> {
  const out: Res[] = [];
  let i = 0;
  async function runner() {
    while (i < items.length) {
      const my = i++;
      out.push(await worker(items[my] as any));
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, runner));
  return out;
}

console.log(`Uploading ${files.length} per-article PDFs (issues 11-18) to R2...`);
const out = await pool(CONCURRENCY, files, uploadOne);

for (const r of out) {
  if (r.status === "ok") console.log(`  [ok] ${r.filename} (${(r.bytes / 1024).toFixed(1)} KB, ${r.ms} ms) -> ${r.publicUrl}`);
  else console.log(`  [fail] ${r.filename}: ${r.error}`);
}

const ok = out.filter((r) => r.status === "ok").length;
const failed = out.filter((r) => r.status === "fail").length;
console.log(`\n${ok} ok, ${failed} fail`);
