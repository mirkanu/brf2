## Agent handbook

The canonical BRF skill lives at `docs/agent-handbook/`. Sub-skills live under `docs/agent-handbook/skills/<name>/` (each with its own `SKILL.md` and optional `references/`). There is no `Skills/` directory at the repo root — edit the handbook path directly.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Project routing index

Updated 2026-09-04. The project no longer keeps a `.planning/` directory; this file, `docs/agent-handbook/`, and `STATUS.md` are the canonical sources of project state.

### Collections (`src/content.config.ts`)

| Collection | Loader pattern | Required fields | Collection-specific fields |
| --- | --- | --- | --- |
| `journal` | `src/content/journal/*.json` | base + `issueNumber`, `issueYear?`, `pdfLink?` | (none) |
| `journalIssues` | `src/content/journal-issues/*.json` | `issueNumber`, `coverImage` | `issueDate?`, `pdfUrl?`, `legacyPath?` |
| `conferences` | `src/content/conferences/*.json` | base + `year` | `venue?`, `subtitle?`, `theme?`, `dates?`, `description?` |
| `podcasts` | `src/content/podcasts/*.json` | base | `duration?` |
| `pages` | `src/content/pages/*.json` | base | (none — rendered as a content collection) |

Base schema (`src/content.config.ts`): `title`, `legacyPath`, `datePublished`, `authors[]`, `tags[]`, `rawCategories[]`, `primaryCategory?`, `section`. Articles with `section !== 'journal-article'` are excluded from journal routes.

### Routes

| Path | Source | Notes |
| --- | --- | --- |
| `/` | `src/pages/index.astro` | Hero + upcoming conference + latest journal + podcasts + past conferences |
| `/about/`, `/beliefs/`, `/contact/`, `/donate/` | top-level pages | Static editorial |
| `/journal/` | `src/pages/journal/index.astro` | Issue grid (newest first) |
| `/journal/issue/issue-NN/` | `src/pages/journal/issue/[issue]/index.astro` | Articles in issue, sorted oldest first; JSON-LD `Article` w/ `hasPart` |
| `/journal/issue/issue-NN/[slug]/` | `src/pages/journal/issue/[issue]/[slug].astro` | Article body; JSON-LD `Article` w/ `encoding` if PDF present |
| `/author/[name]/` | `src/pages/author/[name].astro` | Author landing (slug = lowercase-hyphenated display name) |
| `/conferences/` | `src/pages/conferences/index.astro` | Upcoming + past by decade |
| `/conferences/[year]/` | `src/pages/conferences/[year].astro` | Year page, JSON-LD `Event` w/ parsed `startDate` |
| `/conferences/[...slug]/` | `src/pages/conferences/[...slug].astro` | Spread pages for non-year entries (reviews, group items) |
| `/podcasts/`, `/podcasts/[...slug]/` | `src/pages/podcasts/` | JSON-LD `PodcastEpisode` only when `duration` parses |
| `/literature/`, `/literature/[slug]/` | `src/pages/literature/` | Literature collection |
| `/rss.xml` | `src/pages/rss.xml.ts` | Single RSS, three categories (journal / conferences / podcasts) |
| `/sitemap-index.xml` + `/sitemap-N.xml` | `scratch/phase-2/gen-sitemaps.mjs` (postbuild) | Generated from `dist/` |
| `/404` | `src/pages/404.astro` | Friendly not-found |

Redirect rule (binding): redirects are only built **from `britishreformed.org` (Squarespace) → `brf2.pages.dev`**. No redirects are generated from `brf2.pages.dev` routes or `legacyPath` fields. Recorded in `0 Inbox/redirect-rule-britishreformed-only.md`.

### Assets

- `src/assets/issue-covers/issue-NN.svg` — placeholder covers. Replace when real covers arrive.
- PDFs and audio live on Cloudflare R2 under prefixes `pdfs/issues/` and `pdfs/articles/` (path documented in `scratch/phase-2/r2-upload.md`). Until R2 wiring lands, `pdfUrl` is `null` and the article/issue "Read PDF" button is rendered `disabled`.

### Build & deploy

- Build: `npm run build` (Astro 7 static). 696 pages, 0 errors. Postbuild script writes `dist/sitemap-index.xml`.
- Live status: `STATUS.md`.
- Hosted on Cloudflare Pages (project: `brf2`, branch: `main`).

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
