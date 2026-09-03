#!/usr/bin/env bun
/**
 * split-issues-11-18.ts — Cuts Issues 11-18 into per-article PDFs from the
 * OCR'd full-issue PDFs in downloads/. Page boundaries derived from
 * pdftotext page-by-page analysis of each issue.
 *
 * Output: BRJ-NN-{date}-{slug}.pdf files in downloads/, replacing the
 * scan-only article PDFs previously extracted from the user's upload.
 */

import { mkdir, stat } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const DOWNLOADS = "/home/workspace/1 Projects/brf2/scratch/phase-2/ws-2.4/downloads";

type Cut = {
  issueNumber: number;
  issueLabel: string; // e.g. "July-Sept-1995"
  filename: string;
  startPage: number;
  endPage: number;
};

const CUTS: Cut[] = [
  // ISSUE 11 — July-Sept 1995 — 5 articles in journal collection
  // p4-16: Presbyterianism and Independency (15 pages)
  // p17: Table (no separate article)
  // p19-21: Critique of Savoy Declaration on Synods (no JSON separately)
  // p23-25: Forum: Owen and Goodwin (no JSON)
  // p27-36: Profile of John Kennedy (10 pages)
  // p39-43: Free Will? (5 pages)
  // p45-47: Book Reviews (3 pages)
  // p49-50: Correspondence
  { issueNumber: 11, issueLabel: "July-Sept-1995", filename: "BRJ-11-July-Sept-1995-presbyterianism-and-independency.pdf", startPage: 4, endPage: 16 },
  { issueNumber: 11, issueLabel: "July-Sept-1995", filename: "BRJ-11-July-Sept-1995-john-kennedy-of-dingwall.pdf", startPage: 27, endPage: 36 },
  { issueNumber: 11, issueLabel: "July-Sept-1995", filename: "BRJ-11-July-Sept-1995-free-will.pdf", startPage: 37, endPage: 43 },
  { issueNumber: 11, issueLabel: "July-Sept-1995", filename: "BRJ-11-July-Sept-1995-book-reviews.pdf", startPage: 45, endPage: 47 },
  { issueNumber: 11, issueLabel: "July-Sept-1995", filename: "BRJ-11-July-Sept-1995-correspondence.pdf", startPage: 49, endPage: 50 },

  // ISSUE 12 — Oct-Dec 1995 — 7 articles
  // Note: Issue 12 TOC says "Correspondence" but only 6 articles are in journal collection matching headers
  // p5-8: Calvin and the Free Offer (article but not in journal collection under issue 12)
  // p9-13: The Well-Meant Offer and Reprobation (5 pages)
  // p15-22: Circumcision and Baptism (8 pages)
  // p23-33: Churches of a Locality (11 pages)
  // p35-41: Forum Response: John Owen Re-Presbyterianised (7 pages)
  // p43-45: Review: John Kennedy on "Hyper-Evangelism" (3 pages)
  // p47-49: Book Reviews (3 pages) — combined
  // p50-end: Correspondence (small, brief)
  { issueNumber: 12, issueLabel: "Oct-Dec-1995", filename: "BRJ-12-Oct-Dec-1995-the-well-meant-offer-and-reprobation.pdf", startPage: 9, endPage: 13 },
  { issueNumber: 12, issueLabel: "Oct-Dec-1995", filename: "BRJ-12-Oct-Dec-1995-circumcision-and-baptism.pdf", startPage: 15, endPage: 22 },
  { issueNumber: 12, issueLabel: "Oct-Dec-1995", filename: "BRJ-12-Oct-Dec-1995-churches-of-a-locality.pdf", startPage: 23, endPage: 33 },
  { issueNumber: 12, issueLabel: "Oct-Dec-1995", filename: "BRJ-12-Oct-Dec-1995-forum-response-john-owen-re-presbyterianised.pdf", startPage: 35, endPage: 41 },
  { issueNumber: 12, issueLabel: "Oct-Dec-1995", filename: "BRJ-12-Oct-Dec-1995-review-hyper-evangelism.pdf", startPage: 43, endPage: 45 },
  { issueNumber: 12, issueLabel: "Oct-Dec-1995", filename: "BRJ-12-Oct-Dec-1995-book-reviews.pdf", startPage: 47, endPage: 49 },
  { issueNumber: 12, issueLabel: "Oct-Dec-1995", filename: "BRJ-12-Oct-Dec-1995-correspondence.pdf", startPage: 50, endPage: 50 },

  // ISSUE 13 — Jan-Mar 1996 — 6 articles
  // p5-13: Debate on Redemption at the Westminster Assembly (9 pages)
  // p15-23: Place of the Confession in the Local Church (9 pages)
  // p25-31: Logic and Scripture (7 pages)
  // p33-43: Forum Response / John Owen Re-Presbyterianised (11 pages)
  // p45-47: Book Review: Saved by Grace (3 pages)
  // p49-50: Correspondence
  { issueNumber: 13, issueLabel: "Jan-Mar-1996", filename: "BRJ-13-Jan-Mar-1996-debate-on-redemption-westminster-assembly.pdf", startPage: 5, endPage: 13 },
  { issueNumber: 13, issueLabel: "Jan-Mar-1996", filename: "BRJ-13-Jan-Mar-1996-place-of-the-confession-in-the-local-church.pdf", startPage: 15, endPage: 23 },
  { issueNumber: 13, issueLabel: "Jan-Mar-1996", filename: "BRJ-13-Jan-Mar-1996-logic-and-scripture.pdf", startPage: 25, endPage: 31 },
  { issueNumber: 13, issueLabel: "Jan-Mar-1996", filename: "BRJ-13-Jan-Mar-1996-john-owen-re-presbyterianized.pdf", startPage: 33, endPage: 43 },
  { issueNumber: 13, issueLabel: "Jan-Mar-1996", filename: "BRJ-13-Jan-Mar-1996-book-review-saved-by-grace.pdf", startPage: 45, endPage: 47 },
  { issueNumber: 13, issueLabel: "Jan-Mar-1996", filename: "BRJ-13-Jan-Mar-1996-correspondence.pdf", startPage: 49, endPage: 50 },

  // ISSUE 14 — Apr-June 1996 — 6 articles
  // p5-11: Jesus the Messiah (7 pages)
  // p13-21: Covenant with Creation (9 pages)
  // p23-29: Keeping the Covenant (7 pages)
  // p31-35: Subjects of Baptism (5 pages)
  // p37-41: Forum Response John Owen Re-Presbyterianized (5 pages)
  // p43-49: Not So Sure with Mr Spurgeon (7 pages)
  { issueNumber: 14, issueLabel: "Apr-June-1996", filename: "BRJ-14-Apr-June-1996-jesus-the-messiah-as-prophesied-by-moses.pdf", startPage: 5, endPage: 11 },
  { issueNumber: 14, issueLabel: "Apr-June-1996", filename: "BRJ-14-Apr-June-1996-the-covenant-with-creation.pdf", startPage: 13, endPage: 21 },
  { issueNumber: 14, issueLabel: "Apr-June-1996", filename: "BRJ-14-Apr-June-1996-keeping-the-covenant.pdf", startPage: 23, endPage: 29 },
  { issueNumber: 14, issueLabel: "Apr-June-1996", filename: "BRJ-14-Apr-June-1996-the-subjects-of-baptism.pdf", startPage: 31, endPage: 35 },
  { issueNumber: 14, issueLabel: "Apr-June-1996", filename: "BRJ-14-Apr-June-1996-forum-response-john-owen-re-presbyterianized.pdf", startPage: 37, endPage: 41 },
  { issueNumber: 14, issueLabel: "Apr-June-1996", filename: "BRJ-14-Apr-June-1996-not-so-sure-with-mr-spurgeon.pdf", startPage: 43, endPage: 49 },

  // ISSUE 15 — July-Sept 1996 — 6 articles
  // p5-23: Does God Love Everyone? (1) (19 pages)
  // p25-29: BRF Family Holiday Conference (5 pages)
  // p31-33: Northern Ireland's New Reformed Church (3 pages)
  // p35-36: Reformed Church in the Philippines (2 pages)
  // p37-39: Objections to Paedo-baptism (3 pages)
  // p41: Book Review Calvin's Necessity of Reforming (1 page)
  // p43-49: Correspondence: A Matter of Controversy
  { issueNumber: 15, issueLabel: "July-Sept-1996", filename: "BRJ-15-July-Sept-1996-does-god-love-everyone-1.pdf", startPage: 5, endPage: 23 },
  { issueNumber: 15, issueLabel: "July-Sept-1996", filename: "BRJ-15-July-Sept-1996-brf-family-holiday-conference.pdf", startPage: 25, endPage: 29 },
  { issueNumber: 15, issueLabel: "July-Sept-1996", filename: "BRJ-15-July-Sept-1996-northern-irelands-new-reformed-church.pdf", startPage: 31, endPage: 33 },
  { issueNumber: 15, issueLabel: "July-Sept-1996", filename: "BRJ-15-July-Sept-1996-reformed-church-in-the-philippines.pdf", startPage: 35, endPage: 36 },
  { issueNumber: 15, issueLabel: "July-Sept-1996", filename: "BRJ-15-July-Sept-1996-reformed-view-of-baptism.pdf", startPage: 37, endPage: 39 },
  { issueNumber: 15, issueLabel: "July-Sept-1996", filename: "BRJ-15-July-Sept-1996-correspondence-a-matter-of-controversy.pdf", startPage: 41, endPage: 49 },

  // ISSUE 16 — Oct-Dec 1996 — 5 articles
  // p5-15: John Owen: Progressive Presbyterian (1) (11 pages)
  // p17-23: John Owen: Bulwark Against Arminianism (1) (7 pages)
  // p25-33: Biblical Theology (9 pages)
  // p37-47: Does God Love Everyone? (2) (11 pages)
  // p49-50: Correspondence
  { issueNumber: 16, issueLabel: "Oct-Dec-1996", filename: "BRJ-16-Oct-Dec-1996-john-owen-progressive-presbyterian-part-1.pdf", startPage: 5, endPage: 15 },
  { issueNumber: 16, issueLabel: "Oct-Dec-1996", filename: "BRJ-16-Oct-Dec-1996-john-owen-bulwark-against-arminianism-part-1.pdf", startPage: 17, endPage: 23 },
  { issueNumber: 16, issueLabel: "Oct-Dec-1996", filename: "BRJ-16-Oct-Dec-1996-biblical-theology-review-and-application.pdf", startPage: 25, endPage: 34 },
  { issueNumber: 16, issueLabel: "Oct-Dec-1996", filename: "BRJ-16-Oct-Dec-1996-does-god-love-everyone-part-2.pdf", startPage: 35, endPage: 47 },
  { issueNumber: 16, issueLabel: "Oct-Dec-1996", filename: "BRJ-16-Oct-Dec-1996-correspondence.pdf", startPage: 49, endPage: 50 },

  // ISSUE 17 — Jan-Mar 1997 — 5 articles
  // p5-23: The Forgotten Pink (19 pages)
  // p25: same article continued (overlap correction)
  // p29-37: John Owen Progressive Presbyterian 2 (9 pages)
  // p39-45: John Owen Bulwark Against Arminianism 2 (7 pages)
  // p47: From Dr George M Ella (preface/cover-letter for next article)
  // p49-50: Correspondence
  { issueNumber: 17, issueLabel: "Jan-Mar-1997", filename: "BRJ-17-Jan-Mar-1997-the-forgotten-pink.pdf", startPage: 5, endPage: 26 },
  { issueNumber: 17, issueLabel: "Jan-Mar-1997", filename: "BRJ-17-Jan-Mar-1997-john-owen-progressive-presbyterian-part-2.pdf", startPage: 27, endPage: 36 },
  { issueNumber: 17, issueLabel: "Jan-Mar-1997", filename: "BRJ-17-Jan-Mar-1997-john-owen-bulwark-against-arminianism-part-2.pdf", startPage: 37, endPage: 46 },
  { issueNumber: 17, issueLabel: "Jan-Mar-1997", filename: "BRJ-17-Jan-Mar-1997-edited-half-away-pinks-sovereignty-of-god.pdf", startPage: 47, endPage: 47 },
  { issueNumber: 17, issueLabel: "Jan-Mar-1997", filename: "BRJ-17-Jan-Mar-1997-correspondence.pdf", startPage: 49, endPage: 50 },

  // ISSUE 18 — Apr-June 1997 — 5 articles
  // p5-25: Hung All Round with Massive Calvinistic Armour (21 pages)
  // p27-31: Westminster and Works (5 pages)
  // p33-35: Doctrine of Scripture (3 pages)
  // p37-41: In Defence of Controversy (5 pages)
  // p43-49: Forum (7 pages)
  { issueNumber: 18, issueLabel: "Apr-June-1997", filename: "BRJ-18-Apr-June-1997-hung-all-around-with-massive-calvinistic-armour.pdf", startPage: 5, endPage: 25 },
  { issueNumber: 18, issueLabel: "Apr-June-1997", filename: "BRJ-18-Apr-June-1997-westminster-and-works.pdf", startPage: 27, endPage: 31 },
  { issueNumber: 18, issueLabel: "Apr-June-1997", filename: "BRJ-18-Apr-June-1997-the-doctrine-of-scripture.pdf", startPage: 33, endPage: 35 },
  { issueNumber: 18, issueLabel: "Apr-June-1997", filename: "BRJ-18-Apr-June-1997-in-defence-of-controversy.pdf", startPage: 37, endPage: 41 },
  { issueNumber: 18, issueLabel: "Apr-June-1997", filename: "BRJ-18-Apr-June-1997-forum-controversial-discussion.pdf", startPage: 43, endPage: 49 },
];

async function main() {
  const issuesDone = new Set<number>();
  for (const cut of CUTS) {
    const issuePdf = readdirSync(DOWNLOADS).find((f) =>
      f.startsWith(`Copy of BRJ-${cut.issueNumber.toString().padStart(2, "0")}-`)
    );
    if (!issuePdf) {
      console.error(`No issue PDF found for issue ${cut.issueNumber}`);
      process.exit(1);
    }
    const src = join(DOWNLOADS, issuePdf);
    if (!issuesDone.has(cut.issueNumber)) {
      const info = await stat(src);
      console.log(`\nIssue ${cut.issueNumber} (${issuePdf}): ${(info.size / 1024).toFixed(1)} KB`);
      issuesDone.add(cut.issueNumber);
    }
    const outPath = join(DOWNLOADS, cut.filename);
    console.log(`  ${cut.filename}: p${cut.startPage}-p${cut.endPage}`);
    execFileSync("qpdf", [
      src,
      "--pages", src, `${cut.startPage}-${cut.endPage}`, "--",
      outPath,
    ], { stdio: ["ignore", "inherit", "inherit"] });
    const out = await stat(outPath);
    console.log(`    -> ${(out.size / 1024).toFixed(1)} KB`);
  }

  console.log(`\nDone. ${CUTS.length} cuts.`);
}

await main();
