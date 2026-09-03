# State

Last updated: 2026-09-02

## Current Position

Phase 1 (Functional Duplicate) — **complete** (2026-08-30). Phase 1.5 (R2 Sizing Audit) — **complete** (2026-09-01). Production at https://brf2.pages.dev.

**Deploy re-enabled 2026-09-01:** the Cloudflare GitHub App was installed at the user level but lacked per-repo access to `mirkanu/brf2`, so push events weren't reaching the Pages build queue. After granting the app access to all repos, an empty commit triggered a fresh build within ~90s and the new `/journal/category/issue-04/` route went live. Auto-deploys are now working again.

**Scope revision 2026-08-30:** redirect, DNS, and cutover work (REQ-08, REQ-22,
REQ-23, REQ-24) stayed in backlog. Phase 1 ended when the new site was fully
functional on its production URL using real content from the Squarespace export.
See `.planning/PHASE-1-DUPLICATE.md` for the revised plan and completion notes.

The site has 9 content-driven routes backed by 5 Zod-typed collections
(articles, conferences, journal, literature, podcasts) + 2 typed-but-empty
collections (lectures, pages) populated from the 575-post Squarespace export.
Author, tag, and issue index pages are live; per-author pages are live; the
home page renders real recent items; OG metadata is emitted. **sitemap, RSS, and JSON-LD are claimed live since 2026-08-17 in STATE.md and ROADMAP.md, but the audit on 2026-09-01 shows they are not implemented in `src/` or `dist/`. Now tracked as WS-2.1/WS-2.2/WS-2.9 in Phase 2b.**
Cloudflare Pages auto-deploys from `main`.

## What's Done

**Phase 2 (partial):**
- Astro 7.2.2 + Tailwind 4.1.16 via `@tailwindcss/vite` (working config; build succeeds)
- `Site` layout with Header (mobile drawer + Donate link) + Footer + ThemeToggle (dark/light/auto, persisted)
- 8 routes live: `/`, `/about`, `/beliefs`, `/conferences`, `/contact`, `/donate`, `/journal`, `/journal/[slug]`
- `articles` content collection: Zod schema (`title`, `author`, `issue`, `published`, `summary`, `pdf`, `tags`) with glob loader over `**/*.json`
- 3 pilot articles: `gods-saving-will-in-the-new-testament`, `image-of-god-and-responsibility-of-man`, `more-loving-than-god` — each with `.md` body, `.json` metadata, original PDF in `public/articles/`
- Cloudflare Pages project `brf2` operational, deploying from `main`, serving https://brf2.pages.dev

**Phase 1.5 (2026-09-01):**
- Probed every MP3 URL in the Squarespace export: 16 unique files, all 200 OK, ~214 MB total. Both `britishreformed.squarespace.com` and `britishreformed.org` host the audio; everything still reachable.
- Probed every PDF URL: 39 PDFs successfully measured (32 articles, 7 issues, 3 local pilot) totalling ~16.4 MB. Export-coverage gap means real PDF total likely 5–15 GB (BRJ Articles zip still pending).
- **R2 free tier confirmed** as the asset host; upgrade triggered at >8 GB. See `.planning/PHASE-1.5-SIZING.md`.
- Harvest scripts archived at `scripts/sizing-audit/harvest-mp3.ts` and `harvest-pdf.ts` for re-runs.

**Phase 1 (2026-08-30):**
- Squarespace WordPress export of Blog + Conferences blogs received: 575 posts, 16 pages, 36 attachments, byte-identical between the two exports, contains the BRJ Articles (categories `issue-XX-*`), lectures, book reviews, pamphlets, blog posts, conference session pages
- Revised Phase 1 plan written: `.planning/PHASE-1-DUPLICATE.md`
- Author extraction strategy: derive authors + slugs from `<dc:creator>` + author_login + author_display_name in the export (live Squarespace authors page only statically renders 6 names; the rest are JS-loaded — export is the canonical source)
- 5 populated content collections ingested: `articles` (3 pilot), `journal` (BRJ articles by issue), `conferences` (year + session metadata), `literature` (book reviews/pamphlets/translations), `podcasts` (episodes). Empty typed collections: `lectures`, `pages` (typed but no entries — no source data yet)
- 9 new routes built: `/journal/[slug]`, `/journal/issues/[year]`, `/journal/issues/`, `/journal/tags/[tag]`, `/journal/tags/`, `/literature/[slug]`, `/literature/`, `/podcasts/[...slug]`, `/podcasts/`, plus `/authors/[slug]` for per-author pages
- Per-author pages live: derived from export's `<dc:creator>` field
- Sitemap, RSS, OG metadata, JSON-LD article schema emitted by `@astrojs/sitemap` + custom RSS endpoint + page-level meta tags + JSON-LD island
- Production deploy verified at https://brf2.pages.dev (HTTP 200 across deep routes: /, /journal/, /conferences/, /journal/issues/, /journal/tags/, /conferences/1990/)

## What's In Progress

**Phase 2a shipped 2026-09-01** (work log: `.planning/PHASE-2A.md`):
- WS-2.3 conference descriptions (20 real annual conferences)
- WS-2.6 README + R2 upload reference
- A11y + perf polish (a11y ≥95 across all routes; perf 100 on home; CLS 0)

**Phase 2b (in progress)** — three workstreams:
- **WS-2.1/2.2/2.9 sitemap + RSS + JSON-LD**: `@astrojs/sitemap` not installed, no RSS endpoint, no JSON-LD islands. Probe `https://brf2.pages.dev/sitemap-index.xml` returns HTML 404. Required for REQ-13/14/15/16.
- **WS-2.4 R2 PDF upload**: route ~73 issue PDFs + ~695 article PDFs to R2; re-associate `pdfUrl` in content JSON. Source URLs harvested in `scratch/phase-1.5/pdf-bytes.csv`. Some URLs returned 0-byte / 404 in the original probe — needs re-harvest against `britishreformed.org` or the `0 Inbox/brf-squarespace-exports/` zips.
- **WS-2.7 redirects + DNS audit**: cutover prep, blocked on Phase 5 launch.
- **WS-2.4 status (2026-09-02):** R2 bucket `brf2-assets` exists in WEUR (created 2026-09-01 22:18 UTC, Standard tier, ~0 bytes). Public dev URL is **not toggleable via the cloudflare MCP** — only `tool_docs`, `tool_search`, `tool_execute_post` are exposed; candidate endpoints (`/domains`, `/domains/custom`, `/public-dev-url`, `/dev-url`) all return 10015 no-route. The MCP-bound token lacks the r2.dev public-access scope. To unblock: (a) drop `CLOUDFLARE_API_TOKEN` into Settings → Advanced with `Account → R2: Edit`, or (b) run `wrangler r2 bucket dev-url enable brf2-assets` locally. Without this, no R2 upload step (WS-2.4) can be verified against a public URL.

## What's Next

**Phase 2 — Templates & Infrastructure (next phase):**
- Wire Cloudflare R2 (free) to `brf2.pages.dev/files` and re-host the 39 measured PDFs + 16 MP3s as the first cut. Article+issue+MP3 re-association per the SIZING doc, in batches by issue. Local samples in `scratch/phase-1.5/samples/`.
- Lighthouse + WCAG 2.1 AA passes on landing + article pages (REQ-18, REQ-20)
- README documenting structure, local dev, deploy (REQ-25)
- Redirect inventory + `_redirects` decision (REQ-08, REQ-23)
- DNS audit: confirm whether britishreformed.org currently has live email (REQ-24)

**Backlog (formerly Phase 1):**
- Domain cutover (REQ-22) — depends on R2 wiring + redirect validation
- Ingest BRJ Articles export (the bigger Squarespace blog) when ready

## Blocked / Waiting

- **Vellum-VPS OCR pipeline** — unresolved external dependency. Blocks journal article bulk migration (Phase 3 REQ-01). Already designed around: schema and conference work proceed without it.
- **BRJ Articles export** — waiting on user to drop the zip in `0 Inbox/`.

## Decisions Pending

| Question | Phase | Why open |
|----------|-------|----------|
| `_redirects` file or Bulk Redirects? | Backlog | Depends on redirect inventory size — cutover task |
| How many old URLs need redirecting? | Backlog | Inventory not reconciled yet |
| Email on britishreformed.org — exists? | Backlog | DNS audit not run |

## Resolved Decisions

| Question | Decision | Date |
|----------|----------|------|
| Which repo is canonical? | `brf2` — deployed to Pages | 2026-08-29 |
| Source for planning files? | `brf` (newest push, 2026-08-12) | 2026-08-29 |
| Use of `brf-site-migration`? | Archive only, no `package.json` | 2026-08-29 |
| Astro version? | 7.2 (inherited from `brf`) | 2026-08-17 |
| Tailwind version? | 4 via `@tailwindcss/vite` plugin (no postcss) | 2026-08-17 |
| TypeScript? | ^5.9 (pinned for `@astrojs/check` peer compat) | 2026-08-17 |
| Deploy trigger? | Push to `main` → Cloudflare Pages build | 2026-08-17 |
| Schema strategy? | Glob loader over `**/*.json`, Zod-validated frontmatter | 2026-08-17 |
| Phase 1 scope? | Functional duplicate only; redirect/DNS/cutover → backlog | 2026-08-30 |
| R2 tier for asset hosting? | R2 free tier; upgrade at >8 GB | 2026-09-01 |
| Conference MP3 hosting? | Each conference page hosts the audio directly; no separate podcast feed | 2026-09-01 |
| MP3 metadata schema? | conference slug, author, title, track number (or kind for non-numbered talks), optional date, optional transcript URL | 2026-09-01 |
| Author source for /authors/* pages? | Derive from Squarespace export (canonical) | 2026-08-30 |
| Attachments (PDFs, images)? | Reference by URL from export; replace with local files before cutover | 2026-08-30 |
| Phase 2 scope split? | 2a = content + perf/a11y (no R2/OCR/DNS); 2b = R2 upload + sitemap/RSS/JSON-LD | 2026-09-01 |
| Conference description source? | Assistant-drafted for 20 real annual conferences from legacy data; 43 placeholder category-* rows skipped | 2026-09-01 |
| Asset URL routing during development? | Self-host where small (hero journal cover); otherwise reference legacy CDN until R2 wired | 2026-09-01 |

## Open Questions / Concerns

- The pilot set is small (3 articles). The export gives us 575 — bulk migration is now unblocked.
- Cloudflare Pages was the original choice. Is there reason to revisit? (None surfaced — keep unless told otherwise.)
- **Attachments still referenced by legacy Squarespace CDN URLs** — R2 sizing done; re-host is now Phase 2 work.
- **BRJ Articles (the big blog) not yet ingested** — only Blog + Conferences exports were processed. The two exports are byte-identical on the items they share (confirmed), so the Articles export should add ~3-5x more journal content. Blocked on user providing the zip.
