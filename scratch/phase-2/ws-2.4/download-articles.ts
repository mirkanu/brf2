#!/usr/bin/env bun
// Downloads every article PDF listed in ws-2.4/article-pdf-inventory.csv
// from britishreformed.org to scratch/phase-2/ws-2.4/downloads/{filename}.pdf.
//
// Dedupes by source_url (many articles share the same PDF).
// Re-runnable: skips files that already exist with size > 0.
// Concurrency is intentionally low (2) because Squarespace /s/ files rate-limit
// hard on parallel fetches (429).

import { mkdir, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const INVENTORY = "/home/workspace/1 Projects/brf2/scratch/phase-2/ws-2.4/article-pdf-inventory.csv";
const DOWNLOADS_DIR = "/home/workspace/1 Projects/brf2/scratch/phase-2/ws-2.4/downloads";
const MANIFEST = "/home/workspace/1 Projects/brf2/scratch/phase-2/ws-2.4/download-manifest.csv";
const CONCURRENCY = 2;

await mkdir(DOWNLOADS_DIR, { recursive: true });

type Row = { article_id: string; pdf_filename: string; source_url: string };

function parseInventory(text: string): Row[] {
  const lines = text.split("\n").filter((l) => l.trim());
  const [, ...data] = lines;
  return data.map((line) => {
    const firstComma = line.indexOf(",");
    const lastComma = line.lastIndexOf(",");
    return {
      article_id: line.slice(0, firstComma),
      pdf_filename: line.slice(firstComma + 1, lastComma),
      source_url: line.slice(lastComma + 1),
    };
  });
}

const raw = await Bun.file(INVENTORY).text();
const rows = parseInventory(raw);

const uniqueByUrl = new Map<string, { url: string; filename: string; articleIds: string[] }>();
for (const r of rows) {
  const entry = uniqueByUrl.get(r.source_url) ?? { url: r.source_url, filename: r.pdf_filename, articleIds: [] };
  entry.articleIds.push(r.article_id);
  uniqueByUrl.set(r.source_url, entry);
}

const unique = [...uniqueByUrl.values()];
console.log(`Total article rows: ${rows.length}`);
console.log(`Unique source PDFs: ${unique.length}`);

type Result = {
  url: string;
  filename: string;
  local: string;
  bytes: number;
  status: number;
  ms: number;
  articleIds: string[];
};

const results: Result[] = [];
let cursor = 0;

async function downloadWithRetry(url: string, maxAttempts = 4): Promise<{ status: number; buf?: Buffer }> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (res.status === 429) {
        const wait = 2000 * attempt + 500 * attempt * attempt;
        process.stderr.write(`[429] attempt ${attempt} wait ${wait}ms ${url}\n`);
        await Bun.sleep(wait);
        continue;
      }
      if (!res.ok) return { status: res.status };
      const buf = Buffer.from(await res.arrayBuffer());
      return { status: 200, buf };
    } catch (err) {
      if (attempt === maxAttempts) return { status: -1 };
      await Bun.sleep(1500 * attempt);
    }
  }
  return { status: -2 };
}

async function worker(workerId: number): Promise<void> {
  while (cursor < unique.length) {
    const idx = cursor++;
    const { url, filename, articleIds } = unique[idx];
    const safeName = filename.replace(/[\\/:*?"<>|]+/g, "_");
    const local = join(DOWNLOADS_DIR, safeName);

    if (existsSync(local)) {
      const s = await stat(local);
      if (s.size > 0) {
        results.push({ url, filename, local, bytes: s.size, status: 200, ms: 0, articleIds });
        if ((idx + 1) % 25 === 0 || idx === unique.length - 1) {
          process.stderr.write(`[skip ${workerId}] ${idx + 1}/${unique.length} ${filename}\n`);
        }
        continue;
      }
    }

    const t0 = Date.now();
    const { status, buf } = await downloadWithRetry(url);
    if (status === 200 && buf) {
      await writeFile(local, buf);
      results.push({ url, filename, local, bytes: buf.length, status: 200, ms: Date.now() - t0, articleIds });
      process.stderr.write(`[done ${workerId}] ${idx + 1}/${unique.length} ${filename} ${buf.length}B\n`);
    } else {
      results.push({ url, filename, local, bytes: 0, status, ms: Date.now() - t0, articleIds });
      process.stderr.write(`[FAIL ${workerId}] ${status} ${url}\n`);
    }
    // Politeness delay between fetches even on success
    await Bun.sleep(150);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)));

const ok = results.filter((r) => r.status === 200).length;
const fail = results.length - ok;
const totalBytes = results.reduce((acc, r) => acc + r.bytes, 0);
console.log(`\nDownloads complete: ${ok} OK, ${fail} failed, ${(totalBytes / 1024 / 1024).toFixed(1)} MB total`);

const header = "url,filename,local,bytes,status,ms,article_count,article_ids\n";
const body = results.map((r) =>
  [r.url, r.filename, r.local, r.bytes, r.status, r.ms, r.articleIds.length, r.articleIds.join(" ")].join(",")
).join("\n");
await writeFile(MANIFEST, header + body + "\n");
console.log(`Manifest written to ${MANIFEST}`);

if (fail > 0) {
  console.log(`\nFailed URLs:`);
  for (const r of results.filter((r) => r.status !== 200)) {
    console.log(`  ${r.status} ${r.url}`);
  }
  process.exit(1);
}
