import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    author: z.string(),
    issue: z.string(),
    published: z.coerce.date(),
    summary: z.string(),
    pdf: z.string(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { articles };
