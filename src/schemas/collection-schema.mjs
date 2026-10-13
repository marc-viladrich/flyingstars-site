import {z} from 'astro/zod';
import {validateSectionList} from './section-policy.mjs';
import {image,sectionSchema} from './page-schema.mjs';
import {projectShowcaseSchema} from './project-showcase.mjs';
export const postSchema = z.object({
    title: z.string().min(1),
    sections:z.array(sectionSchema).superRefine(validateSectionList).default([]).describe('Zusätzliche Bausteine'),
    description: z.string().min(50).max(160),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    cover: image.optional(),
    draft: z.boolean().default(false),
    // Herkunft für Nachvollziehbarkeit: Issue-Nummer des Intake, falls vorhanden.
    sourceIssue: z.number().int().positive().optional(),
  });
export const projectSchema = z.object({
    title: z.string().min(1),
    sections:z.array(sectionSchema).superRefine(validateSectionList).default([]).describe('Zusätzliche Bausteine'),
    client: z.string().optional(),
    showcase: projectShowcaseSchema.optional(),
    date: z.coerce.date(),
    location: z.string().optional(),
    summary: z.string().min(30).max(200),
    cover: image.optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    sourceIssue: z.number().int().positive().optional(),
  });
export const faqSchema = z.object({
    question: z.string().min(5),
    tags: z.array(z.string()).default([]),
    order: z.number().int().default(100),
    draft: z.boolean().default(false),
    sourceIssue: z.number().int().positive().optional(),
  });

export const markdownBodySchema=z.string().describe('Artikeltext (Markdown)');
