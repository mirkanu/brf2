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

### Launch state — pre-cutover (private beta)

`brf2.pages.dev` is **not** the live site and is not publicly indexed or shared. It is in private beta until phase 5 cutover. While in this state:

- **No redirects in or out of `brf2.pages.dev`.** Until launch, only `britishreformed.org → brf2.pages.dev` redirects matter (binding rule above).
- **Slug changes do not require 301s.** Renaming URLs (e.g. replacing `-amp-` with `-` in article slugs) is safe as a hard cut. Internal links pointing at old slugs must be updated directly in the source rather than relying on redirects.
- **Cosmetic-only changes can land without migration concerns.** Titles, slug spelling, layout, fonts — anything that does not affect R2/PDF/audio URLs — may change freely without preserving a back-compat path.

This rule is binding until phase 5. After cutover, slugs become load-bearing and redirects in both directions must be maintained.

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

### Cloudflare Pages preview URL pattern

Preview deploys are **not** keyed off the branch name. Each commit triggers a build that gets its own URL of the form:

`https://<first-8-chars-of-deployment-id>.brf2.pages.dev`

The deployment ID is unrelated to the commit SHA. Use the Cloudflare Pages API to find the latest preview URL for a given branch:

```sh
CF="https://api.cloudflare.com/client/v4"
ACC="$CLOUDFLARE_ACCOUNT_ID"
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "$CF/accounts/$ACC/pages/projects/brf2/deployments?per_page=5" \
  | jq -r '.result[]
      | select(.environment=="preview" and (.latest_stage.status=="success"))
      | "\(.id[:8])  \(.created_on)  \(.url)"'
```

The first listed preview is the most recent. Never tell the user the preview URL is `<branch>.brf2.pages.dev` — that does not resolve.

### Deploy budget — stay on preview

Free Cloudflare Pages allows **500 production deploys/month but unlimited preview deploys**. Production deploys happen whenever `main` is updated. Therefore: **commit and push iteration-by-iteration to preview branches; only push to `main` when a milestone (issue/PR scope) is fully done and reviewed.** Each push to a preview branch only consumes a free preview build.
