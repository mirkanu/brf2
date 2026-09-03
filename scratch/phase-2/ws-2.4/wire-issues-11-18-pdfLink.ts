#!/usr/bin/env bun
// Wire per-article PDF URLs onto all journal JSONs for issues 11–18.
// For each issue, walks src/content/journal/*.json, matches by title
// against a per-issue regex map, and writes pdfLink = R2 URL.
// Idempotent: skips when pdfLink already equals target URL.

import { readFile, writeFile } from "node:fs/promises";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "/home/workspace/1 Projects/brf2";
const J = `${ROOT}/src/content/journal`;
const R2 = "https://pub-011dc1a7faab4dbbafd9b3954e64f5f8.r2.dev";

// Per-issue title → R2 filename map (first regex that matches wins)
const MAPPING: Record<number, Array<{ match: RegExp; file: string; label: string }>> = {
  11: [
    { match: /Correspondence: Praise.*Disagreement/, file: "BRJ-11-July-Sept-1995-correspondence.pdf", label: "11 Correspondence" },
    { match: /Presbyterianism and Independency/, file: "BRJ-11-July-Sept-1995-presbyterianism-and-independency.pdf", label: "11 Presbyterianism" },
    { match: /Profile of a Presbyterian Minister.*John Kennedy/, file: "BRJ-11-July-Sept-1995-john-kennedy-of-dingwall.pdf", label: "11 Kennedy" },
    { match: /DIMENSIONS OF ETERNAL LOVE|REVIVAL AND REVIVALISM/, file: "BRJ-11-July-Sept-1995-book-reviews.pdf", label: "11 Book Reviews" },
    { match: /Free Will ?/, file: "BRJ-11-July-Sept-1995-free-will.pdf", label: "11 Free Will" },
  ],
  12: [
    { match: /Well-Meant Offer and Reprobation/, file: "BRJ-12-Oct-Dec-1995-the-well-meant-offer-and-reprobation.pdf", label: "12 Well-Meant Offer" },
    { match: /Churches of a Locality/, file: "BRJ-12-Oct-Dec-1995-churches-of-a-locality.pdf", label: "12 Churches of a Locality" },
    { match: /Forum Response: John Owen/, file: "BRJ-12-Oct-Dec-1995-forum-response-john-owen-re-presbyterianised.pdf", label: "12 Forum Response" },
    { match: /Circumcision and Baptism/, file: "BRJ-12-Oct-Dec-1995-circumcision-and-baptism.pdf", label: "12 Circumcision" },
    { match: /Hyper - Evangelism|Review: John Kennedy|HYPER-EVANGELISM/, file: "BRJ-12-Oct-Dec-1995-review-hyper-evangelism.pdf", label: "12 Hyper-Evangelism" },
    { match: /WALKING WITH JESUS/, file: "BRJ-12-Oct-Dec-1995-book-reviews.pdf", label: "12 Book Reviews" },
    { match: /Correspondence: A praise/, file: "BRJ-12-Oct-Dec-1995-correspondence.pdf", label: "12 Correspondence" },
  ],
  13: [
    { match: /Correspondence: Forgotten Spurgeon/, file: "BRJ-13-Jan-Mar-1996-correspondence.pdf", label: "13 Correspondence" },
    { match: /Fight for the Reformed Faith|Debate on Redemption/, file: "BRJ-13-Jan-Mar-1996-debate-on-redemption-westminster-assembly.pdf", label: "13 Debate on Redemption" },
    { match: /Logic and Scripture/, file: "BRJ-13-Jan-Mar-1996-logic-and-scripture.pdf", label: "13 Logic" },
    { match: /Saved by Grace/, file: "BRJ-13-Jan-Mar-1996-book-review-saved-by-grace.pdf", label: "13 Saved by Grace" },
    { match: /John Owen Re-Presbyterianised/, file: "BRJ-13-Jan-Mar-1996-john-owen-re-presbyterianized.pdf", label: "13 Owen Re-Press" },
    { match: /Place of the Confession/, file: "BRJ-13-Jan-Mar-1996-place-of-the-confession-in-the-local-church.pdf", label: "13 Place of Confession" },
  ],
  14: [
    { match: /Covenant with Creation/, file: "BRJ-14-Apr-June-1996-the-covenant-with-creation.pdf", label: "14 Covenant with Creation" },
    { match: /FORUM.*Response.*John Owen/, file: "BRJ-14-Apr-June-1996-forum-response-john-owen-re-presbyterianized.pdf", label: "14 Forum Owen" },
    { match: /JESUS THE MESSIAH AS PROPHESIED BY MOSES/, file: "BRJ-14-Apr-June-1996-jesus-the-messiah-as-prophesied-by-moses.pdf", label: "14 Jesus Messiah" },
    { match: /Keeping the Covenant/, file: "BRJ-14-Apr-June-1996-keeping-the-covenant.pdf", label: "14 Keeping Covenant" },
    { match: /Not So Sure with Mr Spurgeon/, file: "BRJ-14-Apr-June-1996-not-so-sure-with-mr-spurgeon.pdf", label: "14 Not So Sure Spurgeon" },
    { match: /SUBJECTS OF BABTISM|SUBJECTS OF BAPTISM/, file: "BRJ-14-Apr-June-1996-the-subjects-of-baptism.pdf", label: "14 Subjects of Baptism" },
  ],
  15: [
    { match: /BRF Family Holiday Conference/, file: "BRJ-15-July-Sept-1996-brf-family-holiday-conference.pdf", label: "15 BRF Holiday Conference" },
    { match: /Northern Ireland.*New Reformed Church/, file: "BRJ-15-July-Sept-1996-northern-irelands-new-reformed-church.pdf", label: "15 NI New Reformed" },
    { match: /Does God Love Everyone.*\(1\)/, file: "BRJ-15-July-Sept-1996-does-god-love-everyone-1.pdf", label: "15 DGLE 1" },
    { match: /Correspondence: Disagreement on the Well-Meant/, file: "BRJ-15-July-Sept-1996-correspondence-a-matter-of-controversy.pdf", label: "15 Correspondence" },
    { match: /Reformed View of Babtism|Reformed View of Baptism/, file: "BRJ-15-July-Sept-1996-reformed-view-of-baptism.pdf", label: "15 Reformed View Baptism" },
    { match: /Reformed Church in the Philippines/, file: "BRJ-15-July-Sept-1996-reformed-church-in-the-philippines.pdf", label: "15 Philippines" },
  ],
  16: [
    { match: /A Biblical Theology/, file: "BRJ-16-Oct-Dec-1996-biblical-theology-review-and-application.pdf", label: "16 Biblical Theology" },
    { match: /John Owen Progressive Presbyterian.*\(1\)/, file: "BRJ-16-Oct-Dec-1996-john-owen-progressive-presbyterian-part-1.pdf", label: "16 Owen Progressive 1" },
    { match: /Correspondence$/, file: "BRJ-16-Oct-Dec-1996-correspondence.pdf", label: "16 Correspondence" },
    { match: /Does God Love Everyone.*\(2\)/, file: "BRJ-16-Oct-Dec-1996-does-god-love-everyone-part-2.pdf", label: "16 DGLE 2" },
    { match: /Fight for the Reformed Faith/, file: "BRJ-16-Oct-Dec-1996-john-owen-bulwark-against-arminianism-part-1.pdf", label: "16 Fight for the Faith" },
  ],
  17: [
    { match: /Edited Half Away/, file: "BRJ-17-Jan-Mar-1997-edited-half-away-pinks-sovereignty-of-god.pdf", label: "17 Edited Half Away" },
    { match: /Bulwark against Arminianism.*PART TWO|Bulwark against Arminianism.*PART II/, file: "BRJ-17-Jan-Mar-1997-john-owen-bulwark-against-arminianism-part-2.pdf", label: "17 Owen Bulwark 2" },
    { match: /John Owen Progressive Presbyterian.*\(2\)/, file: "BRJ-17-Jan-Mar-1997-john-owen-progressive-presbyterian-part-2.pdf", label: "17 Owen Progressive 2" },
    { match: /The Forgotten Pink$/, file: "BRJ-17-Jan-Mar-1997-the-forgotten-pink.pdf", label: "17 Forgotten Pink" },
    { match: /Correspondence/, file: "BRJ-17-Jan-Mar-1997-correspondence.pdf", label: "17 Correspondence" },
  ],
  18: [
    { match: /Forum: BRF.*PRC/, file: "BRJ-18-Apr-June-1997-forum-controversial-discussion.pdf", label: "18 Forum Controversial" },
    { match: /Hung All Round with Massive Calvinistic Armour/, file: "BRJ-18-Apr-June-1997-hung-all-around-with-massive-calvinistic-armour.pdf", label: "18 Hung All Round" },
    { match: /Correspondence re The Forgotten Pink/, file: "BRJ-18-Apr-June-1997-correspondence.pdf", label: "18 Correspondence" },
    { match: /In Defence of Controversy/, file: "BRJ-18-Apr-June-1997-in-defence-of-controversy.pdf", label: "18 In Defence of Controversy" },
    { match: /Doctrine of Scripture/, file: "BRJ-18-Apr-June-1997-the-doctrine-of-scripture.pdf", label: "18 Doctrine Scripture" },
  ],
};

async function loadArticles(): Promise<Array<{ filename: string; json: any }>> {
  const out: Array<{ filename: string; json: any }> = [];
  for (const f of readdirSync(J)) {
    if (!f.endsWith(".json")) continue;
    const json = JSON.parse(await readFile(`${J}/${f}`, "utf8"));
    if (json.section !== "journal-article") continue;
    if (!MAPPING[json.issueNumber]) continue;
    out.push({ filename: f, json });
  }
  return out;
}

const articles = await loadArticles();
console.log(`Found ${articles.length} articles in issues 11-18\n`);

let updated = 0, skipped = 0, failed = 0;
const unmatched: string[] = [];

for (const a of articles) {
  const map = MAPPING[a.json.issueNumber];
  const title: string = a.json.title ?? "";
  const hit = map.find((m) => m.match.test(title));
  if (!hit) {
    unmatched.push(`  - ${a.json.issueNumber}: ${title}`);
    failed++;
    continue;
  }
  const url = `${R2}/pdfs/articles/${hit.file}`;
  if (a.json.pdfLink === url) {
    skipped++;
    continue;
  }
  a.json.pdfLink = url;
  await writeFile(`${J}/${a.filename}`, JSON.stringify(a.json, null, 2) + "\n");
  console.log(`[ok] ${hit.label} | ${title}\n     → ${hit.file}`);
  updated++;
}

console.log(`\nUpdated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`);
if (unmatched.length) {
  console.log(`\nUnmatched titles:`);
  for (const u of unmatched) console.log(u);
}
