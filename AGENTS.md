## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Project routing index (Phase 1, 2026-09-01)

### Collections
- `src/content/articles/` — one `.md` per article, schema in `src/content.config.ts` (fields: `title`, `authors`, `issueNumber`, `pdfUrl?`, `authorSlugs?`).
- `src/content/issues/` — one `issue.json` per issue (fields: `issueNumber`, `issueDate`, `pdfUrl?`, `legacyPath`, `coverImage`). Display title = `[issueDate]` if set, else `Issue [issueNumber]`.

### Routes
- `/journal/` — issue index
- `/journal/issue-NN/` — single issue page
- `/journal/issue-NN/[slug]/` — single article
- `/author/[name]/` — author landing (slug = lowercase hyphenated display name)
- Legacy routes (`/journal/[slug]`, `/journal/issues/[year]`, `/journal/category/*`, `/journal/article/*`, `/journal/tags/*`, `/authors/*`) return 404 — no redirects yet (site private until launch).

### Assets
- `src/assets/issue-covers/issue-NN.svg` — placeholder covers. Replace when real covers arrive.

### Build & deploy
- Build: `npm run build` (Astro 7 static).
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
