import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { projectShowcaseSchema } from './schemas/project-showcase';

// ---------------------------------------------------------------------------
// Sections: die einzige Stelle, an der neue Section-Typen registriert werden.
// Jede Section hat genau einen Typ, typisierte Props und eine Komponente in
// src/components/sections/. Der Agent darf Seiten nur aus diesen Typen bauen.
// ---------------------------------------------------------------------------
const link = z.object({ label: z.string().min(1), href: z.string().min(1) });
const sectionHeading = { id: z.string().optional(), kicker: z.string().optional() };

const image = z.object({
  src: z.url().describe('Absolute URL im zentralen Medienspeicher'),
  alt: z.string().min(1).describe('Pflicht. Leerer Alt-Text nur für Dekoration, dann alt: ""'),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const sectionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('showreelHero'),
    headline: z.string().min(1), text: z.string().min(1), eyebrow: z.string().min(1),
    words: z.array(z.string().min(1)).min(1), cta: link, secondary: link,
    poster: image, video: z.url(), stats: z.array(z.object({ label: z.string(), value: z.string() })).min(1),
  }),
  z.object({
    type: z.literal('occasions'), ...sectionHeading,
    headline: z.string().min(1), text: z.string().min(1),
    cards: z.array(z.object({ category: z.string(), title: z.string(), text: z.string(), image,
      facts: z.array(z.string()).min(1), cta: link, download: link.optional() })).min(1),
  }),
  z.object({
    type: z.literal('metrics'), ...sectionHeading,
    headline: z.string().min(1), text: z.string().min(1),
    items: z.array(z.object({ label: z.string(), value: z.string(), text: z.string() })).min(1),
  }),
  z.object({
    type: z.literal('sustainability'), ...sectionHeading,
    headline: z.string().min(1), lines: z.array(z.string()).length(3), text: z.string().min(1),
    facts: z.array(z.object({ label: z.string(), value: z.string(), unit: z.string().optional(),
      text: z.string(), tone: z.enum(['o','g']).optional() })).length(4),
    proofImage: image, proofText: z.string(), campaign: z.string(),
  }),
  z.object({
    type: z.literal('hero'),
    headline: z.string().min(1),
    text: z.string().optional(),
    image: image.optional(),
    cta: link.optional(),
    secondary: link.optional(),
  }),
  z.object({
    type: z.literal('textMedia'),
    headline: z.string().min(1),
    body: z.string().min(1).describe('Markdown erlaubt'),
    image: image.optional(),
    mediaSide: z.enum(['left', 'right']).default('right'),
  }),
  z.object({
    type: z.literal('faq'), ...sectionHeading,
    text: z.string().optional(), cta: link.optional(), openFirst: z.boolean().default(false),
    headline: z.string().optional(),
    tags: z.array(z.string()).optional().describe('Nur FAQ-Einträge mit einem dieser Tags'),
    limit: z.number().int().positive().optional(),
  }),
  z.object({
    type: z.literal('cta'),
    headline: z.string().min(1),
    text: z.string().optional(),
    button: link,
  }),
  z.object({
    type: z.literal('postList'),
    headline: z.string().optional(),
    limit: z.number().int().positive().default(3),
  }),
  z.object({
    type: z.literal('projectGrid'), ...sectionHeading,
    text: z.string().optional(), cta: link.optional(),
    headline: z.string().optional(),
    limit: z.number().int().positive().default(6),
  }),
  z.object({
    type: z.literal('pricing'), ...sectionHeading,
    cta: link.optional(),
    headline: z.string().min(1),
    text: z.string().optional(),
    tiers: z.array(z.object({
      name: z.string().min(1),
      badge: z.string().optional(),
      orb: z.object({ shape: z.enum(['ring','sphere','torus']), color: z.string().regex(/^\d{1,3},\d{1,3},\d{1,3}$/), count: z.number().int().positive() }).optional(),
      price: z.string().min(1).describe('Freitext inkl. Währung, z. B. "ab 7.900 €"'),
      unit: z.string().optional().describe('Bezugsgröße zum Preis, z. B. "pro Show" oder "netto"'),
      description: z.string().optional(),
      features: z.array(z.string().min(1)).default([]),
      highlight: z.boolean().default(false).describe('Hebt die Karte als Empfehlung hervor'),
      cta: link.optional(),
    })).min(1),
    note: z.string().optional().describe('Kleingedrucktes unter den Karten'),
  }),
  z.object({
    type: z.literal('steps'), ...sectionHeading,
    headline: z.string().min(1),
    text: z.string().optional(),
    steps: z.array(z.object({
      title: z.string().min(1),
      text: z.string().min(1),
      duration: z.string().optional().describe('Kurzer Zeitrahmen, z. B. "48 h Antwortzeit"'),
    })).min(2),
  }),
  z.object({
    type: z.literal('comparison'), ...sectionHeading,
    headline: z.string().min(1),
    text: z.string().optional(),
    rowHeader: z.string().default('Kriterium').describe('Beschriftung der ersten Spalte'),
    columns: z.array(z.string().min(1)).min(2),
    rows: z.array(z.object({
      label: z.string().min(1),
      cells: z.array(z.object({ label: z.string(), text: z.string().optional(), tone: z.enum(['y','n','p']) })).optional(),
      values: z.array(z.string()).describe('Genau ein Wert je Spalte, in derselben Reihenfolge'),
    })).min(1),
    note: z.string().optional(),
  }).superRefine((s, ctx) => {
    s.rows.forEach((row, i) => {
      if (row.values.length !== s.columns.length || (row.cells && row.cells.length !== s.columns.length)) {
        ctx.addIssue({
          code: 'custom',
          path: ['rows', i, 'values'],
          message: `Zeile "${row.label}" hat ${row.values.length} Werte, erwartet sind ${s.columns.length} (eine je Spalte).`,
        });
      }
    });
  }),
  z.object({
    type: z.literal('team'), ...sectionHeading,
    note: z.string().optional(), cta: link.optional(),
    headline: z.string().min(1),
    text: z.string().optional(),
    members: z.array(z.object({
      name: z.string().min(1),
      role: z.string().min(1),
      image: image.optional().describe('Ohne Bild erscheint ein Platzhalter mit Initialen'),
      bio: z.string().optional(),
    })).min(1),
  }),
  z.object({
    type: z.literal('logoBar'), ...sectionHeading,
    press: z.string().optional(),
    headline: z.string().optional(),
    logos: z.array(z.object({
      name: z.string().min(1),
      image: image.optional().describe('Ohne Bild wird der Name als Text gesetzt'),
      href: z.string().min(1).optional(),
      tall: z.boolean().default(false),
    })).min(1),
  }),
  z.object({
    type: z.literal('contactForm'),
    headline: z.string().min(1),
    text: z.string().optional(),
  }),
]);

export type Section = z.infer<typeof sectionSchema>;

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------
const pages = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/pages' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(50).max(160),
    noindex: z.boolean().default(false),
    sections: z.array(sectionSchema).min(1),
  }),
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
