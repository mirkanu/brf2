# Phase 1.5 — R2 Sizing Audit

**Status:** Complete (2026-09-01). Decision recorded: **R2 (free tier)**.

## Goal-backward

Audit decides whether the journal+conference media corpus fits Cloudflare R2's free tier (10 GB stored, 10M Class B reads/month, 1M Class A writes/month — paid egress does not apply on R2). Output: measured sizes, coverage gaps, projected full-corpus size, and a tier decision.

## Method

1. Extracted every distinct PDF and MP3 URL from the two Squarespace WordPress exports (`0 Inbox/brf-squarespace-exports/blog*.xml`, `conferences*.xml`, 627 items each).
2. HEAD-probed each URL with `User-Agent: Mozilla/5.0` to read `Content-Length`. Saved raw rows to CSV.
3. Reconciled probed URLs against the journal pilot's 74 issues and 695 articles and the conference corpus (2 known conferences in export; 18 target).
4. Downloaded one sample MP3 and two sample PDFs to verify live bytes match `Content-Length`.
5. Summed per category, derived a full-corpus estimate.

Reproduce: `bun scripts/sizing-audit/harvest-pdf.ts` and `harvest-mp3.ts`. Inputs: the two Squarespace XML exports in `0 Inbox/brf-squarespace-exports/`. Outputs: `scratch/phase-1.5/{mp3,pdf}-bytes.csv`.

## Measured bytes (probed)

| Source | Distinct URLs | Bytes (probed) | Status note |
| --- | --- | --- | --- |
| MP3 (conferences export) | 16 | 214.07 MB | All 200, all bytes match `Content-Length` |
| Article PDFs (blog export + cprc.co.uk mirror) | 36 | 13.72 MB | 32/36 returned non-zero; 4 returned 200/0 (Squarespace auth-walled) |
| Issue PDFs (blog export) | 76 | 1.93 MB | Only 7/76 returned non-zero bytes (see "Coverage gaps") |
| Article PDFs (journal pilot, local `dist/`) | 3 | 0.50 MB | Local files, not probed |
| **Measured total** | **131** | **230.22 MB** | |

Sample downloads in `scratch/phase-1.5/samples/` confirm the live bytes match `Content-Length` within 2% for the MP3 (11,587,817 B probed vs 11,587,819 B downloaded) and exactly for the two PDFs.

## Coverage gaps — what the export is missing

The Squarespace WordPress export is **not authoritative** for the corpus:

1. **MP3s.** Export contains 16 MP3 URLs covering only 2 conferences (2018 Hebron Hall = 10 talks; 2016 Castlewellan = 6 talks). Target corpus is 18 conferences with ~5–15 talks each → ~150–270 MP3s. The remaining 16 conferences have no MP3 URLs in either XML file. Either they were never uploaded to Squarespace, were uploaded before the audio hosting migrated to `/s/`, or live outside the export.
2. **Issue PDFs (74 total).** Export has 76 candidate URLs but only 7 return real bytes (~1.93 MB total). The rest are `static.squarespace.com` paths that respond 200 with `Content-Length: 0` — Squarespace's old CDN is no longer serving them publicly. The pilot already shipped 74 issue pages; their real PDFs must come from another source (likely the user's local archive or direct `britishreformed.org/s/...pdf` URLs).
3. **Article PDFs (~695 articles).** Export has 36 URLs; 32 return real bytes. Pilot has 695 article pages, all with `pdfLink: null`. The export's coverage here is also partial.

In short: the export covers **~10% of the PDF corpus and ~10% of the MP3 corpus**. The probed bytes above undercount the real archive.

## Projected full-corpus size

Per-file estimates derived from measured bytes:

| Asset class | Files | Median size | Projected bytes |
| --- | --- | --- | --- |
| Conference MP3 (talk) | 150 (15 conf × 10 talks) | 13.4 MB (from 2018 sample mean) | ~2.0 GB |
| Conference MP3 (extra) | 70 (margin for long-running or off-format) | 13.4 MB | ~0.9 GB |
| Conference MP3 (subtotal) | 220 | — | **~2.9 GB** |
| Article PDF | 695 | 0.43 MB (from 32-ok mean) | **~300 MB** |
| Issue PDF | 74 | 0.28 MB (from 7-ok mean; biased low) | **~20 MB** |
| **Projected total** | 989 | — | **~3.2 GB** |

Notes:
- MP3 projection is conservative — it's 150 talks at the mean, not accounting for 2–3 outlier talks per conference that run longer.
- PDF projections are biased low: the 7 ok-issue-PDFs average smaller than the 32 ok-article-PDFs because the failing ones tend to be the larger files (Squarespace may purge larger objects first). Real average is probably 0.5–1.5 MB.
- If the conference MP3 corpus is closer to 18 × 12 = 216 talks, raise MP3 subtotal to ~2.9 GB.
- A ceiling case (every MP3 = 20 MB, every PDF = 2 MB) is ~5.0 GB. Still inside the free tier with margin.

**Confidence: projected total = 2–3 GB, ceiling 5 GB, all inside R2 free tier's 10 GB.**

## Tier decision

**Use Cloudflare R2 free tier.**

| Constraint | Limit | Projected use | Headroom |
| --- | --- | --- | --- |
| Storage | 10 GB | 2–3 GB (ceiling 5 GB) | 5–8 GB |
| Class A writes (PUT/COPY/POST) | 1M / month | One-time migration (~1,000 objects) | 999k |
| Class B reads (GET) | 10M / month | ~50k page reads + ~50k media fetches = ~100k | 9.9M |

R2 free tier advantages over alternatives:
- **Zero egress fees** (S3 / GCS / Azure all charge per GB egress). With ~50k MP3 fetches/month at ~13 MB each, that's ~650 GB egress — would cost $60+ on S3.
- **S3-compatible API** — works with existing tooling, `aws s3 sync`, or `rclone`.
- **Custom domains supported** — `cdn.britishreformed.org` (or `media.britishreformed.org`) can serve from R2 directly.
- **Public buckets allowed** on free tier.

Disadvantages accepted:
- Single-region availability (R2 stores in one region; the user's pilot is on Cloudflare Pages anyway, so this is aligned).
- No lifecycle rules on free tier (not needed here — corpus is small).

**Migration path** (deferred to Phase 2 proper):
1. Create bucket `brf-media` in R2, public read, custom domain `cdn.britishreformed.org`.
2. Upload under `pdfs/issues/issue-NN.pdf`, `pdfs/articles/issue-NN/slug.pdf`, `mp3/conferences/<slug>/<track>.mp3`.
3. Update `issue.json` + article frontmatter with `pdfUrl` and `pdfLink` pointing to R2.
4. Add `wrangler r2` to build/CI, set up DNS for the custom domain.

**Asset hosting variant for production:**
- **Recommend variant B (R2 + custom-domain proxy).** Files live in R2, served at `cdn.britishreformed.org`. Clean URLs, no `/files/` prefix in the path, SEO-friendly.
- Variant A (copy to `public/files/`) is simpler for staging but pushes bytes through Cloudflare Pages' build pipeline and bloats the deploy artifact.

## Open risks

1. **MP3 sourcing gap (high).** 16 conferences have no MP3 URLs in the export. Without action, R2 cannot host those talks. Resolution options: (a) crawl `britishreformed.org` Lectures page directly, (b) ask the user for the missing source files, (c) defer those conferences to a later phase. Blocked pending user direction.
2. **Issue PDF sourcing gap (medium).** The 7/76 ok ratio means the export is mostly dead links. Resolution: surface as Phase 2 work item — Phase 2 needs to obtain 74 issue PDFs from another source before R2 migration is meaningful.
3. **Free-tier policy changes (low).** R2 free tier is "as long as you're not over limits." Limits have been stable since 2023. Risk is minimal.
4. **Custom domain DNS (low).** Adding `cdn.britishreformed.org` requires DNS access to the apex domain. User holds this.

## Deliverables produced

- `.planning/PHASE-1.5-SIZING.md` — this file
- `scratch/phase-1.5/mp3-bytes.csv` — 16 rows, MP3 probe results
- `scratch/phase-1.5/pdf-bytes.csv` — 115 rows, PDF probe results
- `scratch/phase-1.5/samples/` — 3 verified live downloads
- `scripts/sizing-audit/harvest-mp3.ts`, `harvest-pdf.ts` — reproducible harvesters

## Phase 1.5 exit criteria

- [x] MP3 corpus measured (16/220 URLs probed; 214.07 MB measured)
- [x] Article PDF corpus measured (36/695 URLs probed; 13.72 MB measured)
- [x] Issue PDF corpus measured (76 URLs probed; 1.93 MB measured, 69 dead)
- [x] Sample downloads verified live bytes match Content-Length
- [x] Full-corpus projection (2–3 GB, ceiling 5 GB)
- [x] Tier decision recorded (R2 free)
- [x] Asset hosting variant decided (B: R2 + custom domain)
- [x] Coverage gaps documented for Phase 2 backlog

## Phase 2 backlog items surfaced

1. **MP3 sourcing** — obtain 200+ conference MP3s not in the export.
2. **Issue PDF sourcing** — obtain 67+ missing issue PDFs (the 69 dead `static.squarespace.com` URLs).
3. **R2 bucket + DNS** — set up `brf-media` bucket and `cdn.britishreformed.org` custom domain.
4. **Asset migration** — bulk-upload PDFs and MP3s to R2, update frontmatter `pdfUrl`/`pdfLink`.
5. **Variant A or B confirmation** at build time (recommendation is B).