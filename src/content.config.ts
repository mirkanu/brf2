import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Shared frontmatter shape for all migrated entries.
const baseSchema = z.object({
  title: z.string(),
  legacyPath: z.string(),
  datePublished: z.string().optional(),
  author: z.string().optional().default(''),
  tags: z.array(z.string()).default([]),
  rawCategories: z.array(z.string()).default([]),
  primaryCategory: z.string().nullable().optional(),
});

// Conference-specific extras: derived year (from title prefix) and venue.
const conferences = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/conferences' }),
  schema: baseSchema.extend({
    year: z.number().int().nullable().optional(),
    venue: z.string().nullable().optional(),
  }),
});

// Podcast extras.
const podcasts = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/podcasts' }),
  schema: baseSchema.extend({
    duration: z.string().nullable().optional(),
  }),
});

// Journal extras.
const journal = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/journal' }),
  schema: baseSchema.extend({
    issueNumber: z.number().int().nullable().optional(),
    issueYear: z.number().int().nullable().optional(),
    pdfLink: z.string().nullable().optional(),
  }),
});

// Static pages.
const pages = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/pages' }),
  schema: baseSchema,
});

export const collections = { journal, conferences, podcasts, pages };
