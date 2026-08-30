# State

Last updated: 2026-08-30

## Current Position

Phase 1 (Functional Duplicate) — **in progress**. Pilot shipped 2026-08-17.

**Scope revision 2026-08-30:** redirect, DNS, and cutover work (REQ-08, REQ-22,
REQ-23, REQ-24) moved out of Phase 1 to backlog. Phase 1 ends when the new site
is fully functional on a preview URL using real content from the Squarespace
export. See `.planning/PHASE-1-DUPLICATE.md` for the revised plan.

The project is **not at the start**. The Astro 7.2 + Tailwind 4 + Zod shell is
live, three pilot articles are migrated with PDFs, dark/light/auto theming
works, and Cloudflare Pages is deploying from `main`. What's missing is the
bulk content migration from the Squarespace export, conference/literature
collections, per-author pages, sitemap/RSS/OG/JSON-LD, and Lighthouse/WCAG
audits.

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

## What's In Progress

- Building Phase 1 TODO list — see `.planning/PHASE-1-DUPLICATE.md`

## What's Next

**Immediate (Phase 1 — Functional Duplicate):**
- Add `conferences`, `literature`, `authors` Zod-typed content collections
- Write a one-shot parser that ingests the Squarespace export → 575 JSON seeds, mapping each post to the right collection based on category taxonomy
- Build conference detail pages, lecture/book/pamphlet/translation literature routes, blog archive + post routes, author pages
- Generate sitemap.xml (REQ-13), RSS feeds (REQ-14), OG metadata (REQ-15), JSON-LD for articles (REQ-16)
- Run Lighthouse + WCAG audits on landing + article pages (REQ-18, REQ-20)
- README documenting structure, local dev, deploy (REQ-25)

**Backlog (formerly Phase 1):**
- Reconcile old BRF URL inventory (REQ-08)
- Decide `_redirects` file vs. Cloudflare Bulk Redirects (REQ-23)
- DNS audit: confirm whether britishreformed.org currently has live email (REQ-24)
- Domain cutover (REQ-22)

## Blocked / Waiting

- **Vellum-VPS OCR pipeline** — unresolved external dependency. Blocks journal article bulk migration (Phase 3 REQ-01). Already designed around: schema and conference work proceed without it.

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
