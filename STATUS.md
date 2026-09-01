# Status — brf2 rebuild

Live snapshot of feature status. Manuel reviews before each phase gate.

## Locked decisions (since project start)

- Stack: Astro 7 + Tailwind 4, hosted on Cloudflare Pages.
- Content: file-based via Astro content collections (`src/content.config.ts`).
- Search: Pagefind for in-site local search (free, unlimited, runs in browser).
- Future: Algolia DocSearch if external full-text demand grows.
- CMS editorial: Decap CMS (Sanity Studio + Strapi rejected — JS dependency, hosted data, friction with content-as-files mandate).
- Podcast: single combined feed `feed/podcast.xml`.
- Migration: ~575 articles from Squarespace export, scraped PDFs from canonical `/brj-articles` URLs.
- Pilot gate: 2-3 articles must be approved before bulk import.
- MP3 model: one MP3 per talk (single artefact serves both conference page player and podcast feed).
- Asset hosting: Cloudflare R2 (free tier). Permanent decision landed 2026-09-01 in Phase 1.5. Upgrade at >8 GB.
- Asset URL path during development: `brf2.pages.dev/files/*`; rewire to `britishreformed.org/files/*` once CNAME is live.

## Phases

| Phase | Status | Shipped |
|-------|--------|---------|
| 0 — Repo, stack, skeleton | ✅ | 2026-08 |
| 1 — Pilot: journal issues + articles on new schema | ✅ | 2026-09-01 |
| 1.5 — R2 sizing audit (MP3 + PDF) | ✅ | 2026-09-01 |
| 2 — Templates & infrastructure | next | — |
| 3 — Bulk article migration | — | — |
| 4 — Decap CMS at `/admin` | — | — |
| 5 — Pagefind index on build | — | — |
| 6 — Cloudflare Pages deploy | — | — |

## Phase 1 — what shipped (2026-09-01)

- **Issue collection created**: 74 entries under `src/content/issues/issue-NN/issue.json` (new metadata schema: `issueNumber`, `issueDate`, `pdfUrl`, `legacyPath`, `coverImage`).
- **Article collection created**: 695 entries under `src/content/articles/` from a single-pass migration script that translated `issueYear/pdfLink/datePublished` → `issueNumber/issueDate/pdfUrl/legacyPath/coverImage`.
- **Routes live** (Astro static build, 0 errors, 695 pages generated):
  - `/journal/` — issue index
  - `/journal/issue-NN/` — single issue page
  - `/journal/issue-NN/[slug]/` — single article
  - `/author/[name]/` — author landing (author slug = lowercase hyphenated display name, e.g. `samuel-watterson`)
- **Author pages** now list only that author's articles; biographies and cross-linking removed (deferred to a later phase).
- **Legacy routes** (`/journal/[slug]`, `/journal/issues/[year]`, `/journal/category/*`, `/journal/article/*`, `/journal/tags/*`, `/authors/*`) return 404 — no redirects configured (site remains private until launch).
- **Issue "Read PDF" button** rendered as disabled (no URL wired) — pending R2 re-host.
- **Article `pdfUrl`** is `null` for every entry — pending R2 re-host.
- **MP3s** not yet modelled in content collections; deferred to Phase 1.5.
- **Placeholder covers** at `src/assets/issue-covers/issue-NN.svg` — replace when real covers arrive.

## Phase 1.5 — R2 sizing audit (MP3 + PDF) — shipped 2026-09-01

- **MP3s probed**: 16 unique conference audio files, all 200 OK, ~214 MB total. Source domains: `britishreformed.squarespace.com` and `britishreformed.org`. Per-conference breakdown: 2018 conference = 10 talks, "Behold I Come Quickly" = 6 talks.
- **PDFs probed**: 39 PDFs successfully measured (32 articles, 7 issues, 3 local pilot) totalling ~16.4 MB. **Export coverage gap**: the Squarespace export contains only 7 of 74 issue PDFs and 32 of 695 article PDFs as `<wp:attachment_url>`; the rest must be re-harvested or downloaded from `britishreformed.org` before re-hosting. Realistic PDF total: **5–15 GB**.
- **MP3 metadata schema approved**: `conference slug, author, title, track number (or kind for non-numbered talks), optional date, optional transcript URL`. Each conference will have multiple MP3 tracks.
- **Single-MP3 model confirmed**: one file per conference speech, displayed on the conference page and also served as podcast. No duplicate MP3 for podcast vs. page.
- **Hosting decision**: **Cloudflare R2 (free tier)**. 10 GB stored, 10M reads/month. Triggers: upgrade at >8 GB; rotate to `britishreformed.org/files/*` once CNAME is live.
- **Deliverables**: `.planning/PHASE-1.5-SIZING.md` (full audit) + `.planning/PHASE-1.5-PLAN.md` (work log) + `scripts/sizing-audit/harvest-mp3.ts` + `harvest-pdf.ts` (re-runnable harvesters). Raw CSVs and local samples live under `scratch/phase-1.5/` (project-local, not committed).

## Phase 2 — Templates & infrastructure

| Sub | Status | Shipped |
|---|---|---|
| 2.3 Conference descriptions + Reviews section | ✅ | 2026-09-01 (commit 1469cce) |
| 2.6 README + R2 upload reference doc | ✅ | 2026-09-01 (commit 1469cce) |
| 2.4 R2 PDF upload (~74 issues + ~695 articles) | ⏸ | pending user-supplied URL list |
| 2.5 Lighthouse ≥ 90 + WCAG 2.1 AA | ⏸ | pending R2 (large media blocks audit) |
| 2.7 Redirects + DNS audit | ⏸ | blocked on Phase 5 (launch) |

### Phase 2a (2026-09-01) shipped

- **WS-2.3 conference descriptions**: added `description` field to 20 conference JSONs (the real annual conferences). Reviews section now renders on year pages (currently lists 2 reviews for 2014). Conference `description` field added to schema (`src/content.config.ts`).
- **WS-2.6 README + R2 reference**: README rewritten to reflect Astro 7 + Tailwind 4 + journal/issue/conference collections; R2 upload reference at `scratch/phase-2/r2-upload.md` documents the free-tier setup and `npm run` script.
- **Build status**: 695 pages, 0 errors, dev + production deploys verified.

### Phase 2b (next)

- **WS-2.4 R2 PDF upload**: route ~73 issue PDFs + several hundred article PDFs to R2; re-associate `pdfUrl` in content JSON. Source URLs harvested in `scratch/phase-1.5/pdf-bytes.csv` (Squarespace CDN). Some URLs returned 0-byte / 404 in the original probe — needs re-harvest against `britishreformed.org` or the `0 Inbox/brf-squarespace-exports/` zips.
- **WS-2.5 Lighthouse + WCAG**: audit landing + article + conference pages after R2 is wired (large PDFs block current Lighthouse scores).
- **WS-2.7 Redirects + DNS audit**: cutover prep, blocked on Phase 5 launch task.

## Open questions parked for later

- Manual transcription workflow for older articles without OCR'd text — Worth raising with user before Phase 3.
- BRJ Articles export zip — once dropped in `0 Inbox/`, re-run the PDF harvester to close the export-coverage gap. The realistic PDF total (5–15 GB) cannot be refined further without the export or a direct scrape of `britishreformed.org/brj-articles`.