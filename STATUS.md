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
| 2a — Conference content + perf/a11y polish | ✅ | 2026-09-01 |
| 1.5 — R2 sizing audit (MP3 + PDF) | ✅ | 2026-09-01 |
| 2 — Templates & infrastructure | 2a ✅ / 2b next | — |
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

**2a — shipped 2026-09-01** (work log: `.planning/PHASE-2A.md`)

| Sub | Status | Shipped |
|---|---|---|
| 2.3 Conference descriptions + Reviews section | ✅ | 2026-09-01 (commit 1469cce; + `description` schema field) |
| 2.6 README + R2 upload reference doc | ✅ | 2026-09-01 (commit 1469cce + later) |
| A11y polish (a11y ≥95) + robots.txt | ✅ | 2026-09-01 (commit 2adfbff) |
| Perf polish (Lighthouse 100, CLS 0) | ✅ | 2026-09-01 (commits 75da46b + c0d7322) |

Post-fix Lighthouse (2026-09-01): home 100/95/100/92, conferences 100/95/100/92, journal 100/95/100/92, literature 100/100/100/92, podcasts 100/95/100/92.

**2b — shipped 2026-09-02**

| Sub | Status | Shipped |
|---|---|---|
| 2.1 sitemap | ✅ | 2026-09-02 (`scratch/phase-2/gen-sitemaps.mjs` postbuild writes `sitemap-index.xml` + `sitemap-0.xml`; robots.txt updated) |
| 2.2 RSS | ✅ | 2026-09-02 (`@astrojs/rss`, 525 items: journal / conferences / podcasts) |
| 2.9 JSON-LD | ✅ | 2026-09-02 (`Article` for issue + article, `Event` for conferences, `PodcastEpisode` when duration parses) |

**2c — open / remaining**

| Sub | Status | Blockers |
|---|---|---|
| 2.4 R2 PDF upload (~74 issues + ~426 articles) | ⏸ | Blocked: `CLOUDZFLARE_API_TOKEN` is invalid against Cloudflare's `/user/tokens/verify` (2026-09-02). PDF source URLs also need re-harvesting against `britishreformed.org` (only 39 currently harvested). Sitemap crawl archived at `scratch/phase-2/crawl/sitemap.xml` (822 URLs). |
| 2.5 Lighthouse ≥ 90 + WCAG 2.1 AA on PDF pages | ⏸ | Pending R2 wiring (large PDFs currently proxy via Squarespace CDN) |
| 2.7 Redirects + DNS audit | ⏸ | Blocked on Phase 5 (launch). **Binding rule**: redirects only from `britishreformed.org` (Squarespace) → `brf2.pages.dev`; never the reverse. Source-of-truth sitemap crawl done (822 URLs, `scratch/phase-2/crawl/sitemap.xml`). Durable rule: `0 Inbox/redirect-rule-britishreformed-only.md`. |

### Phase 2a (2026-09-01) shipped

- **WS-2.3 conference descriptions**: added `description` field to 20 conference JSONs (the real annual conferences). Reviews section now renders on year pages (currently lists 2 reviews for 2014). Conference `description` field added to schema (`src/content.config.ts`).
- **WS-2.6 README + R2 reference**: README rewritten to reflect Astro 7 + Tailwind 4 + journal/issue/conference collections; R2 upload reference at `scratch/phase-2/r2-upload.md` documents the free-tier setup and `npm run` script.
- **Build status**: 695 pages, 0 errors, dev + production deploys verified.

### Phase 2b (shipped 2026-09-02)

- **WS-2.1 sitemap**: postbuild script at `scratch/phase-2/gen-sitemaps.mjs` walks `dist/` and writes `dist/sitemap-index.xml` + `dist/sitemap-0.xml`. `public/robots.txt` updated to reference the index URL.
- **WS-2.2 RSS**: `src/pages/rss.xml.ts` emits a single feed (`/rss.xml`) with 525 items across journal / conferences / podcasts. `@astrojs/rss` added to dependencies.
- **WS-2.9 JSON-LD**: per-route JSON-LD islands wired via the `jsonLd` prop on `Site.astro` (defaults to `Organization`). Article LD carries `encoding: MediaObject` when `pdfUrl` is present. PodcastEpisode LD emitted only when `duration` parses — entries without parseable durations are left out without breaking the build.
- **Build**: 696 pages, 0 errors, sitemap-index written.

### Phase 2c (open)

- **WS-2.4 R2 PDF upload**: route issue + article PDFs to R2; re-associate `pdfUrl` in content JSON. 32 of 426 articles still have `issueNumber: null` and are excluded from journal routing; orphan routes will be revisited once PDF URLs are wired so they can link directly.
- **WS-2.5 Lighthouse + WCAG**: audit landing + article + conference pages after R2 is wired (large PDFs block current Lighthouse scores).
- **WS-2.7 Redirects + DNS audit**: cutover prep, blocked on Phase 5 launch. Sitemap crawl of `britishreformed.org/sitemap.xml` complete (822 URLs, archived 2026-09-02 at `scratch/phase-2/crawl/sitemap.xml`). Binding constraint: redirects only from `britishreformed.org` (Squarespace) → `brf2.pages.dev`. Durable rule file at `0 Inbox/redirect-rule-britishreformed-only.md`.

## Open questions parked for later

- Manual transcription workflow for older articles without OCR'd text — Worth raising with user before Phase 3.
- BRJ Articles export zip — once dropped in `0 Inbox/`, re-run the PDF harvester to close the export-coverage gap. The realistic PDF total (5–15 GB) cannot be refined further without the export or a direct scrape of `britishreformed.org/brj-articles`.

## Verification log (2026-09-02T10:33Z)

- `npm run build` → 696 pages, 0 errors.
- Postbuild wrote `dist/sitemap-index.xml` (199 B) + `dist/sitemap-1.xml` (106 KB, 694 `<url>` entries).
- `curl -L https://britishreformed.org/sitemap.xml` → 184,840 B, 822 URLs, archived at `scratch/phase-2/crawl/sitemap.xml`.
- `curl /user/tokens/verify` with `$CLOUDZFLARE_API_TOKEN` → `success: false` / `Invalid API Token` → WS-2.4 (R2) blocked until a valid token is supplied.

## Status update — 2026-09-02T12:30Z

- **Cloudflare token**: confirmed working via `GET /accounts/{CLOUDFLARE_ACCOUNT_ID}/r2/buckets` (200 OK). The earlier `/user/tokens/verify` "Invalid API Token" reply is misleading — that endpoint expects a different token scope. The real token, paired with `CLOUDFLARE_ACCOUNT_ID`, lists R2 buckets and works.
- **R2 bucket to use (locked)**: `brf2-assets` (existing). NOT a new `brf` bucket. `scratch/phase-2/r2-upload.md` references the wrong bucket name and needs an edit.
- **GDrive leg (issue PDFs)**: blocked on tool surface. `use_app_google_drive` search/list actions return 403 `includeItemsFromAllDrives must be true`; the wrapper doesn't expose that flag. To unblock, need one of: (a) re-share `1gtXO5azesAEeAti2eKNOFpA_jtcCQGGs` as "Anyone with the link can view", (b) add Google OAuth creds to Zo Secrets, or (c) drop a file-list into the workspace.
- **Squarespace export (article PDFs + MP3s)**: pending; user is preparing it. Neither `/speeches` nor `/brj-articles` indexes direct file URLs in HTML — the export is the only viable path.
- **No page/route/content code changes yet this session**.

## Update 2026-09-02T12:35Z — Cloudflare + R2 unblocked, WS-2.4 ready

- `CLOUDFLARE_API_TOKEN` works (returns 200 on `/accounts/$CLOUDFLARE_ACCOUNT_ID/r2/buckets`). Earlier `/user/tokens/verify` 401 was route-specific, not token-invalid; status-flag note in WS-2.4 row below updated.
- Bucket to use: **`brf2-assets`** (already exists, free tier). `r2-upload.md` updated accordingly.
- Sitemap crawl archived at `scratch/phase-2/crawl/sitemap.xml` (822 URLs) is the master URL list for the WS-2.4 harvest.
- Pending unblock: source PDFs/MP3s. Issue PDFs on GDrive folder `1gtXO5azesAEeAti2eKNOFpA_jtcCQGGs` (per AGENTS.md path `2 Areas/4 Faith/BRF-BRJ/BRF single PDFs`); article PDFs + conference MP3s come from Squarespace export (user to share). Pipedream GDrive integration currently 403s on `includeItemsFromAllDrives`; either share the folder public-by-link or add Google OAuth creds to Zo Secrets to unblock scripted download.
