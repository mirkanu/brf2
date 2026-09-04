# Collections & schemas

Source of truth: `src/content.config.ts` in the `brf2` repo. Update
this file whenever that schema changes.

## Loader pattern (all collections)

Every collection uses `glob({ pattern: '**/*.json', base: './src/content/<col>' })`.
The journal collection has a paired `journalBodies` collection that
loads `**/*.md` from the same directory — bodies are looked up by id
at render time so the JSON loader stays lightweight.

## Base schema (shared)

```ts
z.object({
  title: z.string(),
  legacyPath: z.string(),
  datePublished: z.string(),
  authors: z.array(z.string()),
  tags: z.array(z.string()).default([]),
  rawCategories: z.array(z.string()).default([]),
  primaryCategory: z.string().nullable().default(null),
  section: z.string(),
})
```

`section` discriminates between journal articles, conferences,
podcasts, literature, pages, etc. Routes typically filter on
`section === 'journal-article'` (or its equivalent — see notes).

## Per-collection extensions

| Collection | Loader base | Extra required | Extra optional |
| --- | --- | --- | --- |
| `journal` | `src/content/journal/` | `issueNumber: int` | `issueYear: int?`, `pdfLink: string?` |
| `journalBodies` | `src/content/journal/` (`.md`) | — | — |
| `journalIssues` | `src/content/journal-issues/` | `issueNumber: int`, `coverImage: string` | `issueDate: 'YYYY-MM'?`, `pdfUrl: string?`, `legacyPath: string?` |
| `conferences` | `src/content/conferences/` | `year: int` | `venue?`, `subtitle?`, `theme?`, `dates?`, `description?` |
| `podcasts` | `src/content/podcasts/` | — | `duration: string?` (ISO 8601 or HH:MM:SS) |
| `pages` | `src/content/pages/` | — | — |

> Note: `pdfLink` on the journal collection is the *legacy* Squarespace
> URL field (kept for SEO/redirect continuity). The active PDF link on
> an issue is `pdfUrl` on the `journalIssues` entry; per-article PDFs
> in the new model are referenced from R2 by URL embedded in the
> Markdown body (e.g. `[Read PDF](https://pub-…r2.dev/pdfs/…)`).

## Slug conventions

| Collection | Convention | Example |
| --- | --- | --- |
| `journal` | `category-{kebab-title}-{N}` for BRJ articles | `category-editorial-more-loving-than-god-3` |
| `journal` | `articles-{kebab-title}-{N}` for older BRJ articles (legacy) | `articles-articles-category-editorial-on-being-reformed` |
| `journal-issues` | `issue-NN` (zero-padded to 2 digits) | `issue-77` |
| `conferences` | `YYYY-{kebab-slug}` for sessions | `2018-hebron-hall-morning` |
| `podcasts` | `{kebab-slug}` | `ep-001-gods-saving-will` |
| `pages` | `{kebab-slug}` | `beliefs`, `about`, `donate` |

When in doubt, mirror the convention of nearby existing files.

## Body format

- **Journal articles**: Markdown with optional frontmatter mirroring
  the JSON. Headings use `##` for top-level (the article title is
  already the `<h1>`). Inline footnotes follow the rule in
  `references/footnotes.md`.
- **Other collections**: Markdown body optional. Used for long-form
  descriptions only.

## Adding a new collection

1. Edit `src/content.config.ts`: add a `defineCollection({...})` block
   with the schema.
2. Create `src/content/<new-collection>/` and add at least one entry.
3. If the collection needs a route, add a route under `src/pages/`
   that reads via `getCollection('<new-collection>')`.
4. Update the routing index in `1 Projects/brf2/AGENTS.md`.
5. Update this file.
6. Run `npm run build` to verify.
