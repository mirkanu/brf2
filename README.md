# British Reformed Fellowship website

Public website for the British Reformed Fellowship. Astro + Tailwind, content collections with Zod schemas, Algolia search, Pagefind for offline fallback, RSS feeds, podcast XML feeds, full-text search.

## Quick reference

| Path | What's there |
|------|--------------|
| `src/content.config.ts` | Content collections schemas (articles, pages, sermons, books, authors) |
| `src/pages/articles/[slug].astro` | Article reader |
| `src/pages/issues/[issue].astro` | Journal issue landing |
| `src/pages/articles/index.astro` | Article index with search |
| `src/pages/sermons/index.astro` | Sermons index |
| `src/styles/global.css` | Tailwind theme + design tokens |
| `astro.config.mjs` | Deploy adapter wiring |

## Local development

```
bun install
bun astro dev
```

Visit http://localhost:4321

## Deploy targets

- Primary: Cloudflare Pages (preview + production)
- Future: vercel (hybrid-rendered if image transformations needed)

## Status

Read [STATUS.md](./STATUS.md) for the current feature backlog, blockers, and pilot phase gate.
