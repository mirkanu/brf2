---
name: brf-website
description: Operate, extend, and ship the British Reformed Fellowship website (Astro 7 + Tailwind 4 + Cloudflare Pages, with R2 PDFs/MP3s). Use whenever the request touches brf2 — adding journal articles/issues, conference entries, podcasts, literature or pages; extracting text from BRJ PDFs; uploading assets to Cloudflare R2; running migrations from the Squarespace export; building, deploying, or auditing the site. Activate on requests mentioning BRF, britishreformed.org, brf2.pages.dev, the British Reformed Journal, or Cloudflare Pages project `brf2`.
compatibility: Created for Zo Computer. Targets the brf2 repo at /home/workspace/1 Projects/brf2 (canonical working repo); the same patterns apply if the repo is checked out elsewhere.
metadata:
  author: mirkanu.zo.computer
---

# brf-website

## What this skill covers

British Reformed Fellowship website — a static Astro 7 site backed by
typed content collections, served from Cloudflare Pages at
`https://brf2.pages.dev` (will eventually move to
`https://britishreformed.org` via a Phase 4 cutover). PDFs and MP3s live
on Cloudflare R2 under the bucket documented in
`references/r2-and-assets.md`.

Activate this skill whenever the user asks about BRF, the British
Reformed Journal (BRJ), conference archive, podcasts, or any change to
the `brf2` repo. The skill is meant to **replace rediscovery**: assume
what's below is the current shape of the project and only inspect the
repo when you genuinely suspect drift.

## Repo facts (canonical, as of 2026-09-04)

| Fact | Value |
| --- | --- |
| Canonical working repo | `/home/workspace/1 Projects/brf2/` |
| Stack | Astro 7.2 + Tailwind 4.1 via `@tailwindcss/vite` |
| Package manager | npm (lockfile present); `bun` used for one-off scripts |
| Deploy | Cloudflare Pages, project `brf2`, branch `main`, auto-deploys |
| Live URL | `https://brf2.pages.dev` |
| Production domain (Phase 4) | `https://britishreformed.org` |
| Asset host | Cloudflare R2, bucket name + URL pattern in `references/r2-and-assets.md` |
| Dev server | `astro dev --background` (foreground is forbidden — see AGENTS.md) |
| Source content | File-based, JSON metadata + Markdown body per item |

Full routing/collection table: `1 Projects/brf2/AGENTS.md` in the repo.
Quickstart + content schema summary: `1 Projects/brf2/README.md`. Live
feature status: `1 Projects/brf2/STATUS.md`. Project state + collections
table: `1 Projects/brf2/AGENTS.md`.

## Hard rules

1. **Dev server is background-only.** Start with
   `astro dev --background`; manage with `astro dev stop|status|logs`.
   Never run `astro dev` in the foreground.
2. **Dev server runs on port 4321 by default** and is accessible from
   the host's localhost. The Cloudflare preview at brf2.pages.dev is
   the canonical truth for what's actually live.
3. **Content lives in `src/content/{collection}/*.json` + sibling
   `.md` body for journal articles only.** Don't generate routes by
   hand-editing `src/pages/`; add content and let the collection
   loader pick it up.
4. **All content goes through the Zod schemas in
   `src/content.config.ts`.** Required fields per collection are
   listed in `references/collections-and-schemas.md`. New fields
   require a schema edit + build verification.
5. **PDFs and MP3s are hosted on R2, not in the repo.** Only the very
   first pilot set of PDFs (under `public/articles/`) is local. New
   assets go through the R2 upload script — see
   `references/r2-and-assets.md`.
6. **Cloudflare Pages auto-deploys on push to `main`.** Don't deploy
   manually unless the user asks.
7. **Redirects are only `britishreformed.org` → `brf2.pages.dev`**
   (binding rule in `0 Inbox/redirect-rule-britishreformed-only.md`).
   No redirects generated from `legacyPath` fields.

## Core workflows

### Add a journal issue (e.g. issue-78)

1. Create `src/content/journal-issues/issue-NN.json` with the schema
   from `references/collections-and-schemas.md`. Minimum: `issueNumber`,
   `coverImage`. If the issue PDF exists, also `issueDate` (YYYY-MM)
   and `pdfUrl` (R2 URL).
2. Add `src/assets/issue-covers/issue-NN.svg` placeholder if no
   real cover. Real covers replace this when they arrive.
3. Upload the issue PDF to R2 (`references/r2-and-assets.md`), then
   set `pdfUrl`.
4. Add each article under `src/content/journal/category-*.json` +
   `category-*.md` body — see "Add a journal article" below.

### Add a journal article

Files:

- `src/content/journal/{slug}.json` — metadata (see schema)
- `src/content/journal/{slug}.md` — body, Markdown

Slug convention: lowercase-hyphenated. The existing corpus uses
`category-{kebab-title}-{N}`; new articles should follow that pattern
unless the user asks otherwise.

Body extraction pipeline (when starting from a PDF):

1. Run `pdftotext -layout` (already on the system) against the source
   PDF in `0 Inbox/` or `scratch/phase-1.5/samples/`.
2. Hand-fix OCR artefacts (broken words split across lines, missing
   hyphens, ligatures). Known patterns to fix:
   - Word splits across line breaks: rejoin when the next line starts
     with a lowercase letter and the previous line ends mid-word.
   - Footnote markers in source: convert to inline numbered
     references — see `references/footnotes.md`.
3. Save as Markdown with front-matter matching the JSON file.
4. Add the JSON sibling with the schema fields.

### Add a conference entry

`src/content/conferences/{slug}.json`. Required: `title`,
`legacyPath`, `datePublished`, `authors[]`, `section: "conference"`,
`year`. Optional: `venue`, `subtitle`, `theme`, `dates`,
`description`.

Conferences appear at `/conferences/{year}/` and on `/conferences/`
index. Group entries (reviews, sets) use `[...slug]` routing — same
collection, no `year`.

### Add a podcast

`src/content/podcasts/{slug}.json` + optional `.md` body. Required:
`title`, `legacyPath`, `datePublished`, `authors[]`,
`section: "podcast"`. Optional: `duration` (ISO 8601 or `HH:MM:SS`).

Audio files live on R2 under `pdfs/articles/` (yes, even podcasts —
the bucket layout is by artefact-type, not by source collection).

### Add a literature entry

`src/content/journal/{slug}.json` with `section: "literature"` (the
`journal` collection carries literature entries by section filter —
see schema). The route renders under `/literature/{slug}/`.

### Upload PDFs / MP3s to R2

See `references/r2-and-assets.md` for the full pipeline. The short
version:

```bash
# 1. Set CLOUDFLARE_API_TOKEN in Settings → Advanced with R2:Edit scope.
# 2. Upload
bun scripts/migration/upload-to-r2.ts /path/to/issue-78.pdf pdfs/issues/issue-78.pdf
# 3. Confirm URL
curl -I https://pub-<account>.r2.dev/pdfs/issues/issue-78.pdf
```

If the upload script doesn't exist yet (it's tracked in WS-2.4),
follow the manual `wrangler r2 object put` recipe in
`references/r2-and-assets.md`.

### Extract text from a PDF (when adding a new article body)

```bash
pdftotext -layout /path/to/article.pdf /tmp/article.txt
# Hand-fix OCR, save as Markdown under src/content/journal/
```

For PDFs with footnotes or scholarly apparatus, see
`references/footnotes.md` for the canonical inline-HTML conversion
approach.

## Common commands

Run from the repo root (`/home/workspace/1 Projects/brf2`):

```bash
# Dev
astro dev --background    # foreground is forbidden
astro dev status           # check whether it's running
astro dev logs | tail -50  # recent logs
astro dev stop             # when done

# Build
npm run build              # ~700 pages, 0 errors expected
npm run sitemap            # regenerate sitemap after dist/ changes
npm run redirects          # regenerate _redirects (Phase 4 only)

# Inspect
npm run preview            # serve dist/ locally for sanity check
```

## Maintenance: keep this skill up to date

This skill must auto-update whenever one of these is true:

**(a) You figured out how to do something in brf2 that might need to be done again.**
After completing the task, append a short recipe to
`references/recipes.md` with: one-line summary, exact commands run,
gotchas hit, schema fields touched.

**(b) A new feature is added to brf2.**
After landing a feature in the repo, update the relevant reference
file (`references/collections-and-schemas.md` for schema changes,
`references/r2-and-assets.md` for asset-pipeline changes,
`references/footnotes.md` for body-format changes) AND bump the
"Repo facts" table above if a fact changed (stack version, deploy
target, route, etc.).

The skill should never silently drift out of sync with the repo.
When in doubt, re-read the repo's `AGENTS.md` and `STATUS.md` before
adding to the skill — they are the source of truth and the skill is
their distilled form.

## Reference index

- `references/collections-and-schemas.md` — full per-collection schema,
  required vs optional fields, slug conventions.
- `references/r2-and-assets.md` — R2 bucket name, public URL pattern,
  upload script + manual fallback, asset URL conventions.
- `references/footnotes.md` — how to convert PDF footnotes to inline
  HTML, and how the article body should render them.
- `references/recipes.md` — append-only log of one-off recipes; start
  empty, add as new patterns emerge.

## Quick checklist before shipping any change

- [ ] Schema fields all present (run `astro check` for Zod validation).
- [ ] Markdown body matches JSON metadata (title, slug, issueNumber).
- [ ] Asset URLs set or explicitly null (no broken links).
- [ ] `npm run build` passes with 0 errors and the expected page count.
- [ ] If the change touches the article body, footnotes render
      correctly (see `references/footnotes.md`).
- [ ] Live URL spot-checked via `curl -I` if the change is user-visible.
- [ ] Skill updated if the change introduced a new pattern.
