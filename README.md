# British Reformed Fellowship — website

Static website for the British Reformed Fellowship, hosting the British
Reformed Journal (issues + articles), conference archive, and literature
collection. Built on Astro 7 with Tailwind 4, deployed to Cloudflare
Pages, with PDFs hosted on Cloudflare R2.

## Quick start

- `npm install`
- `npm run dev` (runs `astro dev --background` per `AGENTS.md`; manage with `astro dev stop|status|logs`)
- Visit http://localhost:4321

## Build & deploy

- `npm run build` produces a fully static output in `dist/`.
- Cloudflare Pages project `brf2` builds from the `main` branch on every push.
- Live URL: see [STATUS.md](./STATUS.md) (private until launch; redirect cutover is Phase 4).

## Content authoring

Schemas live in [src/content.config.ts](./src/content.config.ts). Base
fields: `title`, `legacyPath`, `datePublished`, `authors`, `tags`,
`rawCategories`, `primaryCategory`, `section`. Collection-specific
fields extend the base.

- **Journal article** — add a JSON file to `src/content/journal/`. Required:
  `title`, `datePublished`, `authors`, `legacyPath`, `section: "journal"`,
  `issueNumber` (integer matching an entry in `journal-issues`). Optional:
  `pdfLink` (R2 URL — see R2 section), `issueYear`, tags.
- **Journal issue** — add `src/content/journal-issues/issue-NN.json`
  with `issueNumber`, `issueDate?`, `pdfUrl?` (R2 URL), `legacyPath?`,
  `coverImage`.
- **Conference entry** — add a JSON file to `src/content/conferences/`.
  Fields: base + `year`, `venue?`, `subtitle?`, `theme?`, `dates?`.
  `section` is `"conference"`. Conferences are routed at `/conferences/`
  by year.
- **Literature entry** — JSON in `src/content/journal/` (or any
  collection) with `section: "literature"`. Routed under `/literature/`.

## R2 asset upload

PDFs (issues + articles) are hosted on Cloudflare R2, bucket `brf`,
under `pdfs/issues/issue-NN.pdf` and `pdfs/articles/{article-id}.pdf`.
Public URLs follow the pattern
`https://pub-…r2.dev/pdfs/…` (or `britishreformed.org/files/…` after
the CNAME goes live). Free-tier only — upgrade triggers when total
storage exceeds 8 GB.

Full process, key conventions, and the upload script reference:
[scratch/phase-2/r2-upload.md](./scratch/phase-2/r2-upload.md).

## Phase progress

- [`.planning/ROADMAP.md`](./.planning/ROADMAP.md) — phase plan and exit criteria.
- [`.planning/STATE.md`](./.planning/STATE.md) — current position, locked decisions, parked questions.
- [`.planning/STATUS.md`](./.planning/STATUS.md) — live snapshot of feature status (mirror of root STATUS.md).
- [`.planning/PLAN-2.md`](./.planning/PLAN-2.md) — Phase 2 workstream breakdown (WS-2.1–WS-2.9).

## Conventions

- Astro 7 + Tailwind 4, content collections with Zod schemas.
- Dark / light / auto theme toggle (CSS variables in `src/styles/global.css`; respects `prefers-color-scheme` until the user picks).
- Author slugs are lowercase-hyphenated display names (`samuel-watterson`).
- Site is private until Phase 4 launch; legacy Squarespace routes 404 (no redirects yet — Phase 4 work).
- Background dev server only: never run `astro dev` in the foreground.