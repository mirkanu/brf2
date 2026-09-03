import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const baseSchema = z.object({
  title: z.string(),
  legacyPath: z.string(),
  datePublished: z.string(),
  authors: z.array(z.string()),
  tags: z.array(z.string()).default([]),
  rawCategories: z.array(z.string()).default([]),
  primaryCategory: z.string().nullable().default(null),
  section: z.string(),
});

const conferences = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/conferences' }),
  schema: baseSchema.extend({
    year: z.number().int(),
    venue: z.string().nullable().default(null),
    subtitle: z.string().nullable().default(null),
    theme: z.string().nullable().default(null),
    dates: z.string().nullable().default(null),
    description: z.string().nullable().default(null),
  }),
});

const podcasts = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/podcasts' }),
  schema: baseSchema.extend({
    duration: z.string().nullable().default(null),
  }),
});

const journal = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/journal' }),
  schema: baseSchema.extend({
    issueNumber: z.number().int().nullable().default(null),
    issueYear: z.number().int().nullable().default(null),
    pdfLink: z.string().nullable().default(null),
  }),
});

/**
 * Bodies for journal articles: one .md per article, filename matches the article
 * id (without .json). Loaded as a separate collection so the JSON loader above
 * can keep metadata + list queries lightweight. The article route looks up the
 * body by article id and renders it with `render()`.
 */
const journalBodies = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/journal' }),
  schema: z.object({}),
});

/**
 * Journal issues — one entry per issue of the British Reformed Journal.
 * Articles live in the `journal` collection and reference an issue by `issueNumber`.
 * Articles themselves carry no PDF/cover metadata; they inherit it from the parent issue.
 *
 * Fields are intentionally minimal. The display title is `[issueDate]` if provided,
 * otherwise `Issue {issueNumber}`. Cover image is a path under `/assets/issue-covers/`.
 */
const journalIssues = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/journal-issues' }),
  schema: z.object({
    issueNumber: z.number().int(),
    issueDate: z.string().nullable().default(null),
    pdfUrl: z.string().nullable().default(null),
    legacyPath: z.string().nullable().default(null),
    coverImage: z.string(),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/pages' }),
  schema: baseSchema,
});

export const collections = { journal, journalBodies, journalIssues, conferences, podcasts, pages };
