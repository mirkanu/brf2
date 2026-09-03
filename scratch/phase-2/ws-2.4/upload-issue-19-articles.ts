#!/usr/bin/env bun
// One-off uploader for Issue 19 per-article PDFs cut from the issue PDF.

import { readFile, writeFile } from "node:fs/promises";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const DOWNLOADS = "/home/workspace/1 Projects/brf2/scratch/phase-2/ws-2.4/downloads";
const OUT = "/home/workspace/1 Projects/brf2/scratch/phase-2/ws-2.4/issue-19-upload-manifest.csv";
const BUCKET = "brf2-assets";
const PREFIX = "pdfs/articles/";
const PUBLIC = "https://pub-011dc1a7faab4dbbafd9b3954e64f5f8.r2.dev";

const FILES = [
  "BRJ-19-July-Sept-1997-say-shibboleth.pdf",
  "BRJ-19-July-Sept-1997-the-great-awakening-was-it.pdf",
  "BRJ-19-July-Sept-1997-the-great-revival-of-religion.pdf",
  "BRJ-19-July-Sept-1997-the-last-of-the-calvinistic-methodists.pdf",
  "BRJ-19-July-Sept-1997-recommended-reading-on-revivals.pdf",
  "BRJ-19-July-Sept-1997-correspondence-hebrew-vowel-points.pdf",
];

const endpoint = process.env.CLOUDFLARE_R2_S3_ENDPOINT!;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!;

const s3 = new S3Client({
  region: "auto",
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

const rows: Array<{ filename: string; key: string; url: string; bytes: number; ms: number; status: string }> = [];

for (const fn of FILES) {
  const key = PREFIX + fn;
  const url = `${PUBLIC}/${key}`;
  const t0 = Date.now();
  try {
    const body = await readFile(`${DOWNLOADS}/${fn}`);
    await new Upload({
      client: s3,
      params: {
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: "application/pdf",
        CacheControl: "public, max-age=31536000, immutable",
      },
    }).done();
    const ms = Date.now() - t0;
    rows.push({ filename: fn, key, url, bytes: body.length, ms, status: "ok" });
    console.log(`[ok] ${fn} ${body.length}B ${ms}ms`);
  } catch (e: any) {
    console.log(`[FAIL] ${fn}: ${e.message}`);
    rows.push({ filename: fn, key, url, bytes: 0, ms: Date.now() - t0, status: "fail" });
  }
}

const ok = rows.filter((r) => r.status === "ok");
const totalBytes = ok.reduce((s, r) => s + r.bytes, 0);
const header = "filename,key,public_url,bytes,ms,status\n";
const body = rows.map((r) => [r.filename, r.key, r.url, r.bytes, r.ms, r.status].join(",")).join("\n");
await writeFile(OUT, header + body + "\n");

console.log(`\nDone: ${ok.length}/${rows.length} ok, ${(totalBytes / 1024).toFixed(0)} KB total`);
