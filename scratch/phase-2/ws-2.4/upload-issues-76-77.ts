#!/usr/bin/env bun
// Uploads Issue 76 + Issue 77 whole-issue PDFs to Cloudflare R2.
// Source: /tmp/issues-76-77/ (extracted from chat-upload zip).
// Idempotent overwrites.

import { readFile } from "node:fs/promises";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const BUCKET = "brf2-assets";
const PREFIX = "pdfs/issues/";
const PUBLIC_BASE = "https://pub-011dc1a7faab4dbbafd9b3954e64f5f8.r2.dev";

const endpoint = process.env.CLOUDFLARE_R2_S3_ENDPOINT;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

if (!endpoint || !accessKeyId || !secretAccessKey) {
  console.error("Missing R2 env vars");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

const jobs = [
  { issueNumber: 76, local: "/tmp/issues-76-77/BRJ-76-October-2023.pdf" },
  { issueNumber: 77, local: "/tmp/issues-76-77/BRJ-77-March-2024.pdf" },
];

const pad2 = (n: number) => String(n).padStart(2, "0");

for (const j of jobs) {
  const key = `${PREFIX}issue-${pad2(j.issueNumber)}.pdf`;
  const t0 = Date.now();
  const body = await readFile(j.local);
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
  console.log(`[ok] issue-${pad2(j.issueNumber)} ${body.byteLength}B ${ms}ms -> ${PUBLIC_BASE}/${key}`);
}
