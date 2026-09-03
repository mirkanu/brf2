#!/usr/bin/env bun
// One-off wiring for Issue 19 articles. Sets pdfLink on each of the 6
// journal JSONs based on the article-id mapping.

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = "/home/workspace/1 Projects/brf2";
const J = `${ROOT}/src/content/journal`;
const R2 = "https://pub-011dc1a7faab4dbbafd9b3954e64f5f8.r2.dev";

// title-substring → R2 filename
const MAPPING: Array<{ match: RegExp; file: string; label: string }> = [
  { match: /Shibboleth|Editorial/i,                file: "BRJ-19-July-Sept-1997-say-shibboleth.pdf",                                     label: "Say: Shibboleth" },
  { match: /Great Awakening/i,                     file: "BRJ-19-July-Sept-1997-the-great-awakening-was-it.pdf",                          label: "Great Awakening" },
  { match: /Great Revival of Religion 1740/i,     file: "BRJ-19-July-Sept-1997-the-great-revival-of-religion.pdf",                      label: "Great Revival" },
  { match: /Last of the Calvinistic Methodists/i, file: "BRJ-19-July-Sept-1997-the-last-of-the-calvinistic-methodists.pdf",             label: "Calvinistic Methodists" },
  { match: /Recommended Reading/i,                file: "BRJ-19-July-Sept-1997-recommended-reading-on-revivals.pdf",                    label: "Recommended Reading" },
  { match: /Hebrew Vowel Points/i,                file: "BRJ-19-July-Sept-1997-correspondence-hebrew-vowel-points.pdf",                  label: "Hebrew Vowel" },
];

async function listIssue19(): Promise<string[]> {
  const { readdirSync } = await import("node:fs");
  const files: string[] = [];
  for (const f of readdirSync(J)) {
    if (!f.endsWith(".json")) continue;
    const j = JSON.parse(await readFile(`${J}/${f}`, "utf8"));
    if (j.issueNumber === 19 && j.section === "journal-article") files.push(f.replace(/\.json$/, ""));
  }
  return files;
}

const articles = await listIssue19();
console.log(`Found ${articles.length} Issue 19 articles`);

let updated = 0, skipped = 0, failed = 0;
for (const a of articles) {
  const fp = `${J}/${a}.json`;
  const j = JSON.parse(await readFile(fp, "utf8"));
  const title: string = j.title ?? "";
  const hit = MAPPING.find((m) => m.match.test(title));
  if (!hit) {
    console.log(`[SKIP no match] ${title}`);
    skipped++;
    continue;
  }
  if (j.pdfLink === `${R2}/pdfs/articles/${hit.file}`) {
    console.log(`[already set] ${title}`);
    skipped++;
    continue;
  }
  j.pdfLink = `${R2}/pdfs/articles/${hit.file}`;
  await writeFile(fp, JSON.stringify(j, null, 2) + "\n");
  console.log(`[ok] ${title} → ${hit.file}`);
  updated++;
}

console.log(`\nUpdated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`);
