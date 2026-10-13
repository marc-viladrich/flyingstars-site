import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { projectShowcaseSchema } from './schemas/project-showcase';

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
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(50).max(160),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    cover: image.optional(),
    draft: z.boolean().default(false),
    // Herkunft für Nachvollziehbarkeit: Issue-Nummer des Intake, falls vorhanden.
    sourceIssue: z.number().int().positive().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string().min(1),
    client: z.string().optional(),
    showcase: projectShowcaseSchema.optional(),
    date: z.coerce.date(),
    location: z.string().optional(),
    summary: z.string().min(30).max(200),
    cover: image.optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    sourceIssue: z.number().int().positive().optional(),
  }),
});

const faq = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/faq' }),
  schema: z.object({
    question: z.string().min(5),
    tags: z.array(z.string()).default([]),
    order: z.number().int().default(100),
    draft: z.boolean().default(false),
    sourceIssue: z.number().int().positive().optional(),
  }),
});

export const collections = { pages, posts, projects, faq };
