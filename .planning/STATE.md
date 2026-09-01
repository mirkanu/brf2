# State

Last updated: 2026-09-01

## Current Position

Phase 1 (Functional Duplicate) — **complete** (2026-08-30). Production at https://brf2.pages.dev.

**Deploy re-enabled 2026-09-01:** the Cloudflare GitHub App was installed at the user level but lacked per-repo access to `mirkanu/brf2`, so push events weren't reaching the Pages build queue. After granting the app access to all repos, an empty commit triggered a fresh build within ~90s and the new `/journal/category/issue-04/` route went live. Auto-deploys are now working again.

**Scope revision 2026-08-30:** redirect, DNS, and cutover work (REQ-08, REQ-22,
REQ-23, REQ-24) stayed in backlog. Phase 1 ended when the new site was fully
functional on its production URL using real content from the Squarespace export.
See `.planning/PHASE-1-DUPLICATE.md` for the revised plan and completion notes.

The site has 9 content-driven routes backed by 5 Zod-typed collections
(articles, conferences, journal, literature, podcasts) + 2 typed-but-empty
collections (lectures, pages) populated from the 575-post Squarespace export.
Author, tag, and issue index pages are live; per-author pages are live; the
home page renders real recent items; sitemap/RSS/OG/JSON-LD are emitted.
Cloudflare Pages auto-deploys from `main`.

## What's Done

**Phase 2 (partial):**
- Astro 7.2.2 + Tailwind 4.1.16 via `@tailwindcss/vite` (working config; build succeeds)
- `Site` layout with Header (mobile drawer + Donate link) + Footer + ThemeToggle (dark/light/auto, persisted)
- 8 routes live: `/`, `/about`, `/beliefs`, `/conferences`, `/contact`, `/donate`, `/journal`, `/journal/[slug]`
- `articles` content collection: Zod schema (`title`, `author`, `issue`, `published`, `summary`, `pdf`, `tags`) with glob loader over `**/*.json`
- 3 pilot articles: `gods-saving-will-in-the-new-testament`, `image-of-god-and-responsibility-of-man`, `more-loving-than-god` — each with `.md` body, `.json` metadata, original PDF in `public/articles/`
- Cloudflare Pages project `brf2` operational, deploying from `main`, serving https://brf2.pages.dev

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

- (Phase 1 complete — nothing in progress for this phase)

## What's Next

**Phase 1 polish (small):**
- Lighthouse + WCAG audits on landing + article pages (REQ-18, REQ-20)
- README documenting structure, local dev, deploy (REQ-25)

**Backlog (formerly Phase 1):**
- Reconcile old BRF URL inventory (REQ-08)
- Decide `_redirects` file vs. Cloudflare Bulk Redirects (REQ-23)
- DNS audit: confirm whether britishreformed.org currently has live email (REQ-24)
- Domain cutover (REQ-22)
- Re-host the 36 attachments under our own CDN before cutover
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
| Author source for /authors/* pages? | Derive from Squarespace export (canonical) | 2026-08-30 |
| Attachments (PDFs, images)? | Reference by URL from export; replace with local files before cutover | 2026-08-30 |

## Open Questions / Concerns

- The pilot set is small (3 articles). The export gives us 575 — bulk migration is now unblocked.
- Cloudflare Pages was the original choice. Is there reason to revisit? (None surfaced — keep unless told otherwise.)
- **Attachments still referenced by legacy Squarespace CDN URLs** — fine until cutover, must re-host before switching DNS.
- **BRJ Articles (the big blog) not yet ingested** — only Blog + Conferences exports were processed. The two exports are byte-identical on the items they share (confirmed), so the Articles export should add ~3-5x more journal content. Blocked on user providing the zip.
