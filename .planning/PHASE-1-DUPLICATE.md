# Phase 1 — Functional Duplicate (revised 2026-08-30)

## Scope

Build a fully functional duplicate of britishreformed.org on Astro 7 + Cloudflare
Pages. Redirect / DNS / cutover work is **moved to backlog** — Phase 1 ends when the
new site works end-to-end on a preview URL using real content from the legacy site.

## Source of truth

`0 Inbox/brf-squarespace-exports/` — Squarespace WordPress XML exports.

- The "blog" and "conferences" exports are byte-identical (same MD5). One file
  contains the full site: 575 posts, 16 pages, 36 attachments, 96 authors.
- Both legacy URLs (`/blog` and `/conferences` exports) routed through Squarespace
  return the same underlying content, so no further exports are needed.
- Live Squarespace author IDs (e.g. `53358e30e4b0a3159186d2bc`) are opaque blobs
  and will not be carried into the new site — author URLs use a name-derived slug.

## Content collections to build

Three collections, replacing/augmenting the existing `articles` pilot collection.

### 1. `articles` (BRJ Articles) — ~540 posts
- Frontmatter: `title`, `author` (display name), `issue` (issue label),
  `issueNumber` (int), `category`, `pdf` (attachment URL or empty), `tags`,
  `published` (date), `summary`, `pages`, `slug`, `originalUrl`.
- Body: HTML from `<content:encoded>` (Astro can render HTML in MD bodies).
- Routing: `/journal/articles/[slug]` (single article),
  `/journal/issues` (index), `/journal/issues/[slug]` (per-issue page),
  `/authors/[slug]` (per-author page listing their articles).

### 2. `conferences` — ~18 entries (1 upcoming + 17 past)
- Frontmatter: `year`, `theme`, `venue`, `dates`, `speakers[]`, `sphere?`
  (`family` | `rescheduled`), `recap?` (link to recap post slug).
- Body: HTML from `<content:encoded>` for full session listings.
- Routing: `/conferences` (already exists with hardcoded data — replace with
  collection-driven loop), `/conferences/[year]` (per-conference page with
  sessions/speakers).

### 3. `authors` — derived from `articles`
- Generated as a virtual list (not a content collection) — derived at build
  time from article frontmatter. Each author gets a slug, display name, and
  count of articles.
- Routing: `/authors` (alphabetical index), `/authors/[slug]`
  (bio placeholder + article list).

## Top-level pages to add or update

Existing pilot has stubs for: `about`, `beliefs`, `conferences`, `contact`,
`donate`, `index`, `journal/`. Need to:

- Wire `index.astro` to pull upcoming conference + recent articles.
- Build `/journal/articles/index.astro`, `/journal/issues/index.astro`,
  `/journal/issues/[slug].astro`, `/journal/issues-authors-topics.astro`,
  `/journal/about.astro`, `/journal/subscribe.astro` (form placeholder).
- Build `/authors/index.astro` and `/authors/[slug].astro`.
- Build `/literature/index.astro` and `/literature/[slug].astro` from
  categories `book`, `pamphlet`, `lectures`, `translations`.
- Build `/conferences/[year].astro` from the collection.
- Update `/conferences.astro` to loop over collection.
- Add `/beliefs`, `/about-us`, `/donate`, `/contact` content from the 16
  pages in the export.

## Attachments

PDFs and images referenced from posts via `<wp:attachment_url>` and inline
links. Strategy:

- For Phase 1, **reference the legacy Squarespace CDN URLs as-is**. They
  remain live until Phase 5 cutover. Breakage is acceptable for a duplicate.
- Track every attachment URL referenced so cutover (Phase 5) can decide which
  ones to mirror to `/public/`.

## Build & verify

- Local: `astro dev --background` per `1 Projects/brf2/AGENTS.md`.
- Deploy: push to `chore/planning-init` (or new feature branch) for preview;
  merge to `main` triggers Cloudflare Pages production deploy.
- Smoke test on preview URL before declaring Phase 1 complete.

## Out of scope for Phase 1 (backlog)

- DNS / cutover from britishreformed.org to brf2.pages.dev.
- 301 redirect map from old URLs.
- Custom domain wiring.
- Mirroring attachments off Squarespace CDN.
- Search, RSS, sitemap (Phase 2 templates).

## TODO — execution order

- [ ] Add `conferences` content collection (schema + folder)
- [ ] Add `literature` content collection (schema + folder, with category subdirs)
- [ ] Add `authors` collection or virtual view + `/authors/[slug]` route
- [ ] Build Squarespace-export → seeds parser (one-shot script)
- [ ] Run parser; produce 575 JSON seeds mapped to right collection
- [ ] Author conference detail pages (`/conferences/[year]`)
- [ ] Author literature routes (lectures/books/pamphlets/translations)
- [ ] Author blog archive + post routes
- [ ] Author list pages (per-issue, per-category, per-tag, per-author)
- [ ] Sitemap, RSS, OG metadata, JSON-LD
- [ ] Lighthouse + WCAG audits on landing + article pages
- [ ] README update for content collections
