import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import {postSchema,projectSchema,faqSchema} from './schemas/collection-schema.mjs';

// ---------------------------------------------------------------------------
// Sections: die einzige Stelle, an der neue Section-Typen registriert werden.
// Jede Section hat genau einen Typ, typisierte Props und eine Komponente in
// src/components/sections/. Der Agent darf Seiten nur aus diesen Typen bauen.
// ---------------------------------------------------------------------------
import {sectionSchema,pageSchema} from './schemas/page-schema.mjs';
export {sectionSchema};
export type Section = z.infer<typeof sectionSchema>;

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------
const pages = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/pages' }),
  schema: pageSchema,
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: postSchema,
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: projectSchema,
});

const faq = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/faq' }),
  schema: faqSchema,
});

export const collections = { pages, posts, projects, faq };
