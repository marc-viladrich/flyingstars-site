import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import type { z } from 'astro/zod';
import { sectionSchema, contentSchemas } from './schemas/content-schema.mjs';

// Public rendering and the editor consume the same Zod instances.
export { sectionSchema };
export type Section = z.infer<typeof sectionSchema>;
export const collections = {
  pages: defineCollection({ loader: glob({ pattern: '**/*.yaml', base: './src/content/pages', generateId: ({ entry }) => entry.replace(/\.yaml$/, '') }), schema: contentSchemas.pages }),
  posts: defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/posts' }), schema: contentSchemas.posts }),
  projects: defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/projects' }), schema: contentSchemas.projects }),
  faq: defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/faq' }), schema: contentSchemas.faq }),
};
