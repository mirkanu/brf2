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

## Phases

| Phase | Status | Shipped |
|-------|--------|---------|
| 0 — Repo, stack, skeleton | ✅ | 2026-08 |
| 1 — Pilot: journal issues + articles on new schema | ✅ | 2026-09-01 |
| 2 — Templates & infrastructure | next | — |
| 3 — Bulk article migration | — | — |
| 4 — Decap CMS at `/admin` | — | — |
| 5 — Pagefind index on build | — | — |
| 6 — Cloudflare Pages deploy | — | — |

## Phase 1 — what shipped (2026-09-01)

- **Issue collection created**: 74 entries under `src/content/issues/issue-NN/issue.json` (new metadata schema: `issueNumber`, `issueDate`, `pdfUrl`, `legacyPath`, `coverImage`).
- **Article schema migrated**: dropped `issueYear`, `pdfLink`, `datePublished`; added `issueNumber` (FK to issue), `pdfUrl` (optional), `authorSlugs` (array of hyphenated lowercase slugs).
- **Routes**:
  - `/journal/` — issue index
  - `/journal/issue-NN/` — single issue page
  - `/journal/issue-NN/[slug]/` — single article (e.g. `/journal/issue-73/the-doctrine-of-repentance/`)
  - `/author/[name]/` — author landing (lists that author's articles; bio + cross-linking deferred)
- **Legacy routes removed**: `/journal/[slug]`, `/journal/issues/[year]`, `/journal/category/[...slug]`, `/journal/article/*`, `/journal/tags/*`, `/authors/*`. All return 404 (no 301 redirects configured — site private until launch).
- **PDF button**: rendered on article pages, disabled (no `href`) until actual PDFs are uploaded in a future phase.
- **Placeholder covers**: 74 neutral SVGs at `src/assets/issue-covers/issue-NN.svg` displaying issue number + date.
- **Author slugs**: lowercase hyphenated, derived from author display name at build time (e.g. `Samuel Watterson` → `samuel-watterson`).
- **Build verified**: `astro build` — 695 article pages, 74 issue pages, 74 author pages. No errors.

## Current backlog

| Phase | Item | Owner | State | Notes |
|-------|------|-------|-------|-------|
| 2 | Templates & infrastructure | Josie | next | full-bleed layouts, header/footer, typography pass |
| 3 | Bulk article migration | Josie | after templates | 695 articles now in collection; quality sweep |
| 4 | Decap CMS at `/admin` | Josie | after bulk | PR-based editorial flow |
| 5 | Pagefind index on build | Josie | with templates | incremental |
| 6 | Cloudflare Pages deploy | Manuel | final | project name + DNS |

## Risks

- Squarespace export OCR quality varies. Some scanned pre-2015 issues will need manual transcription — flag for Manuel review batch by batch.
- MP3 lecture files on Squarespace may be hosted externally and not in the export ZIP. Confirm via direct scrape.
- Cloudflare Pages does not allow image transformations without custom code. Use Apline.js + LQIP for image optimisation if needed.
- No 301 redirects configured for legacy URLs during Phase 1 (site private). Must be added before public launch to preserve SEO continuity from Squarespace.

## What's next

Phase 2: templates and infrastructure. Layout polish, header/footer, typography. Then bulk content sweep, then Decap CMS for editorial workflow.
