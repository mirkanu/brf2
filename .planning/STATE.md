# State

Last updated: 2026-08-29

## Current Position

Phase 2 (Templates & Infrastructure) — **in progress**. Pilot shipped 2026-08-17.

The project is **not at the start**. The Astro 7.2 + Tailwind 4 + Zod shell is live, three pilot articles are migrated with PDFs, dark/light/auto theming works, and Cloudflare Pages is deploying from `main`. What's missing is conference/literature collections, the 18+ conference pages, sitemap/RSS/OG/JSON-LD, and Lighthouse/WCAG audits — see "Next action" below.

## What's Done

**Phase 2 (partial):**
- Astro 7.2.2 + Tailwind 4.1.16 via `@tailwindcss/vite` (working config; build succeeds)
- `Site` layout with Header (mobile drawer + Donate link) + Footer + ThemeToggle (dark/light/auto, persisted)
- 8 routes live: `/`, `/about`, `/beliefs`, `/conferences`, `/contact`, `/donate`, `/journal`, `/journal/[slug]`
- `articles` content collection: Zod schema (`title`, `author`, `issue`, `published`, `summary`, `pdf`, `tags`) with glob loader over `**/*.json`
- 3 pilot articles: `gods-saving-will-in-the-new-testament`, `image-of-god-and-responsibility-of-man`, `more-loving-than-god` — each with `.md` body, `.json` metadata, original PDF in `public/articles/`
- Cloudflare Pages project `brf2` operational, deploying from `main`, serving https://brf2.pages.dev

## What's In Progress

- (None — paused awaiting next action from user.)

## What's Next

**Immediate (Phase 2 closure):**
- Add `conferences` and `literature` Zod-typed content collections (unblocks Phase 2 conference authoring)
- Author 18+ conference pages (the unblocked content, per original REQ-02)
- Generate sitemap.xml (REQ-13), RSS feed for journal (REQ-14), OG metadata (REQ-15), JSON-LD for articles (REQ-16)
- Run Lighthouse + WCAG audits on landing + article pages (REQ-18, REQ-20)
- README documenting structure, local dev, deploy (REQ-25)

**Phase 1 (still open in parallel with Phase 2 closure):**
- Reconcile old BRF URL inventory (REQ-08)
- DNS audit: confirm whether britishreformed.org currently has live email (REQ-24)
- Decide `_redirects` file vs. Cloudflare Bulk Redirects (REQ-23)

## Blocked / Waiting

- **Vellum-VPS OCR pipeline** — unresolved external dependency. Blocks journal article bulk migration (Phase 3 REQ-01). Already designed around: schema and conference work proceed without it.

## Decisions Pending

| Question | Phase | Why open |
|----------|-------|----------|
| `_redirects` file or Bulk Redirects? | 1 | Depends on redirect inventory size — Phase 1 task |
| How many old URLs need redirecting? | 1 | Inventory not reconciled yet |
| Email on britishreformed.org — exists? | 1 | DNS audit not run |

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

## Open Questions / Concerns

- The pilot set is small (3 articles). Is there a non-OCR path to bulk-migrate more journal articles that we should explore in parallel? Worth raising with user before Phase 3.
- Cloudflare Pages was the original choice. Is there reason to revisit? (None surfaced — keep unless told otherwise.)