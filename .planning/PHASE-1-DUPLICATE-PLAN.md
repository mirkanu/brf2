# Phase 1 — Functional Duplicate — Implementation Plan

_Last updated: 2026-08-30_

## Source data

- Squarespace WordPress export at `0 Inbox/brf-squarespace-exports/blog Squarespace-Wordpress-Export-08-30-2026.xml` (953 KB, 15,442 lines, byte-identical to the conferences export).
- 575 posts + 16 pages + 36 attachments.
- Two blog/collection exports were produced — the "Blog" and the "Conferences" — Squarespace packaged them identically. No further exports needed.

## Post taxonomy (from the export)

| Bucket | Count | Live URL pattern | New route |
| --- | --- | --- | --- |
| BRJ articles | 413 | `/journal/articles/<path>` | `/journal/articles/<path>` |
| Past conferences | 18 | `/conference/category/<year>-<slug>` | `/conferences/<year>` |
| Lectures | 17 | `/conference/category/<slug>` | `/conferences/<year>/<slug>` (year inferred from tags) |
| Reviews | 7 | `/conference/category/<slug>` | `/conferences/<year>/<slug>` |
| Upcoming | 1 | `/conference/category/<slug>` | `/conferences/2026/<slug>` |
| Uncategorised (mostly lectures) | 26 | `/conference/category/<slug>` or `/journal/articles/<path>` | join lectures or articles |
| Podcasts | 88 | `/podcast/category/<year>-<n>-<slug>` | `/podcasts/<year>/<n>-<slug>` |
| Literature books | 8 | `/literature/books-a-pamphlets/books/<slug>` | `/literature/<slug>` |
| Literature pamphlet | 1 | `/literature/books-a-pamphlets/pamphlets/<slug>` | `/literature/<slug>` |
| Literature other | 1 | `/literature/category/<slug>` | `/literature/<slug>` |
| Recap | 1 | `/blog-/category/<slug>` | `/blog/<slug>` |
| Update | 2 | `/blog-/category/<slug>` | `/blog/<slug>` |
| Audio (1 only) | 1 | `/journal/articles/category/<slug>` | fold into articles or lectures |

## Static pages (16 from the export)

| post_name | Route |
| --- | --- |
| home | `/` |
| about-us | `/about` (already exists) |
| beliefs | `/beliefs` (already exists) |
| conferences | `/conferences` (already exists) |
| contact | `/contact` (already exists) |
| donate | `/donate` (already exists) |
| blog | `/blog` |
| books-pamphlets | `/literature` |
| brj-articles | `/journal/articles` |
| journal/about | `/journal/about` |
| journal/issues-authors-topics | `/journal/issues-authors-topics` |
| journal/subscribe | `/journal/subscribe` |
| doctrinal-basis | `/doctrinal-basis` |
| membership | `/membership` |
| membership-old | archive-only |
| speeches | `/speeches` |
| translations | `/translations` |
| search- | skip (search is its own feature) |

## Content collections

1. `articles` — BRJ articles. Schema: `title`, `author` (display name), `authorSlug` (derived), `authorLogin`, `issue` (label), `issueNumber` (number), `published`, `category` (article type e.g. editorial, review, sermon), `summary`, `pdf?`, `body` (markdown), `tags` (default []).
2. `conferences` — past-conference meta pages. Schema: `year`, `theme`, `venue`, `dates`, `summary?`, `body?`, `sphere?` ('held'|'rescheduled'|'cancelled').
3. `lectures` — individual conference sessions and reviews. Schema: `title`, `year?` (extracted from tags), `speaker?` (parsed from body), `conference?` (linked to conferences collection), `recorded?` (bool — determined by presence of audio), `body` (markdown).
4. `podcasts` — audio entries. Schema: `title`, `year`, `number`, `speaker?`, `body` (markdown), `audioUrl?` (extracted from body if present).
5. `literature` — books, pamphlets, other. Schema: `title`, `author`, `kind` ('book'|'pamphlet'|'other'), `coverUrl?`, `externalUrl?` (order link), `year?`, `translators?`, `body` (markdown).
6. `pages` — 16 captured bodies for use by static-page templates. Schema: `title`, `slug`, `body` (markdown).

## Author pages

Per-author pages are derived. The user confirmed this. `/authors/[slug]` lists:
- All articles with the same `authorSlug`
- All lectures with the same `authorSlug`
- All podcasts with the same `authorSlug`
- All literature with the matching `authorSlug`

Slug = lowercase, kebab-case from display name. Authors come from the 96 unique login→display pairs in `<wp:author>`. Builds are derived at request time (a small Astro helper in `src/lib/authors.ts`).

## Build steps

1. Migration script: `1 Projects/brf2/scripts/migrate-export.ts` — Bun/TypeScript, parses the XML with a single regex split, classifies posts, emits files. Run once now; reusable for future exports.
2. Content config: expand `src/content.config.ts` per the table above. Author helper at `src/lib/authors.ts`.
3. Templates (per collection): list page + detail page. Match the existing visual conventions (`Site` layout, oxblood accents, serif headings, sans body).
4. Static pages: render via `pages` collection entries where present; existing static pages (`/about`, `/beliefs`, `/contact`, `/donate`, `/conferences`) become thin wrappers that pull body content from the new collection.
5. Routes:
   - `/journal/articles` — index of all articles (newest first)
   - `/journal/articles/[...path]` — single article (catch-all match)
   - `/journal/issue/[n]` — single-issue view
   - `/journal/issues-authors-topics` — three-pane index (issues / authors / topics)
   - `/conferences/<year>` — conference detail (sessions list)
   - `/conferences/<year>/<session>` — session detail
   - `/literature/[...slug]` — single work
   - `/podcasts/<year>/<n>-<slug>` — single podcast
   - `/authors/<slug>` — author detail
6. Build & verify:
   - `astro build` clean
   - `astro dev --background` smoke test
   - Every new route returns 200
7. Commit & push: `chore/phase1-functional-duplicate` branch with PR.

## Backlog (deferred)

- `_redirects` file for old URLs (Phase 5 / cutover)
- DNS audit (Phase 5)
- `_redirects` vs. Bulk Redirects decision (Phase 5)
- DNS cutover (Phase 5)
- Real deployment with custom domain (Phase 5)
- Translation pages — empty content (skip for Phase 1)
