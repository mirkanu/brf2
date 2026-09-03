# Squarespace → brf2.pages.dev redirects plan

- **Workstream:** WS-2.7 (planning only — execution is Phase 4)
- **Author:** scratch/phase-2/squarespace-redirects-plan.md
- **Status:** Plan only. No redirects file is produced here.

## Why this document exists

The only redirects BRF2 needs are `britishreformed.org` → `brf2.pages.dev`
(locked rule, 2026-09-02). The redirects set is **not** derivable from
`src/content/**/*.json` `legacyPath` fields — those point at a brf2 pilot
URL shape that was never publicly linked from anywhere and is dead. Future
attempts to source redirects from inside the brf2 content tree must stop.

This file is the durable record of where the redirects **will** come from,
so the work does not need to be re-derived.

## Source of truth

The live Squarespace site at `https://www.britishreformed.org/`. Specifically:

1. `https://www.britishreformed.org/sitemap.xml` (if exposed — Squarespace
   publishes a sitemap by default; verify on the day of crawl).
2. The top-level index pages most likely to host deep links:
   - `/journal/`
   - `/conferences/`
   - `/literature/`
   - `/podcasts/`
   - `/about/`
   - `/beliefs/`
   - `/contact/`

Every internal `<a href>` on those pages is a candidate legacy URL.

## Workflow (Phase 4, NOT executed here)

1. **Fetch sitemap.** `curl -sSL https://www.britishreformed.org/sitemap.xml`
   → list of legacy URLs.
2. **Crawl index pages.** `curl -sSL <each index page>` → extract every
   `<a href>` on each page (use a small Bun/TS script with a streaming HTML
   parser; do not try to regex-parse HTML).
3. **Combine.** Union of sitemap URLs + crawled link sets; dedupe.
4. **Classify.** For each legacy URL, decide:
   - **Journal article** → `/journal/issue/<N>/<slug>/`
   - **Issue index** → `/journal/issue/<N>/`
   - **Conference (year-indexed)** → `/conferences/<year>/`
   - **Literature page** → `/literature/<slug>/`
   - **Podcast episode** → `/podcasts/<slug>/`
   - **Static page** (`/about/`, `/beliefs/`, `/contact/`, `/`,
     `/journal/`, `/conferences/`, `/literature/`, `/podcasts/`,
     `/donate/`, etc.) → map directly to the corresponding brf2 route, or
     leave as a passthrough.
   - **Unknown / unmappable** → log and decide (404 vs. closest-match).
5. **Dedupe against current brf2 routes.** Drop any legacy URL whose target
   is identical to the source path — nothing to redirect.
6. **Emit `_redirects`.** Cloudflare Pages format: one rule per line, e.g.
   `/journal/2023/some-article/  /journal/issue/3/some-article/  301`. One
   blank line between rules is tolerated but not required. Total file must
   stay under the 100 KB Cloudflare Pages limit.
7. **Verify.** Spot-check at least 20 redirects with `curl -sI` to confirm
   the `location:` header matches the expected target.

## Decisions deferred to Phase 4

- **Static-page mapping.** Whether `/about/` on Squarespace maps to a brf2
  static route, an external link, or stays on Squarespace (e.g. `/donate/`)
  depends on what brf2 actually builds for those surfaces. Defer until those
  routes are settled.
- **Conference URL shape.** Squarespace conferences are commonly
  year-indexed but some are slugs. The classification step must accommodate
  both.
- **Trailing-slash policy.** Squarespace URLs are typically
  trailing-slash; brf2 routes are trailing-slash too — match directly, do
  not normalise away the slash.
- **Old pilot brf2 routes.** `/journal/<slug>/` etc. are **not** in scope
  here. Do not emit redirects *to* or *from* them.

## What this plan does NOT do

- It does not generate `_redirects`.
- It does not crawl `britishreformed.org`.
- It does not modify `src/`, `public/_redirects`, or any package manifest.
- It does not push to git.

## Hand-off

When Phase 4 starts, open this file first, follow steps 1–7 above, and
delete or archive `gen-redirects.mjs` (which sources from content JSON and
must not be used).
