import {keyedText} from '../i18n/list-keys.mjs';
import {fieldPolicy} from '../i18n/field-policy.mjs';
import {factText} from '../content/show-extras.mjs';
import {projectFactRefSchema} from './project-facts.mjs';
import { z } from 'zod';
import {imageSource,imageMetadata} from './media.mjs';
/** @template {import('zod').ZodType} T @param {string} group @param {T} schema @returns {T} */
const grouped=(group,schema)=>schema.meta({...schema.meta(),'x-afe':{...schema.meta()?.['x-afe'],group}});

// Project-specific presentation stays in the content collection, shared by
// the gallery, canonical case route and existing /projekte/ routes.
const photograph = z.object({
  src: imageSource,
  alt: fieldPolicy(z.string().min(1), 'translatable'),
  caption: fieldPolicy(z.string().min(1), 'translatable'),
}).meta(imageMetadata);

export const projectShowcaseSchema = z.object({
  route: grouped('Adresse', fieldPolicy(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), 'shared')),
  order: grouped('Adresse', fieldPolicy(z.number().int().positive(), 'shared')),
  name: grouped('Titel & Darstellung', fieldPolicy(z.string().min(1), 'translatable')),
  // Search/social title and description of the case page, without the site name.
  meta: z.object({ title: fieldPolicy(z.string().refine(v=>factText(v).length>0&&factText(v).length<=70), 'translatable'), description: fieldPolicy(z.string().refine(v=>factText(v).length>=50&&factText(v).length<=160), 'translatable') }),
  cardTitle: grouped('Titel & Darstellung', fieldPolicy(z.string().min(1), 'translatable')),
  category: grouped('Titel & Darstellung', fieldPolicy(z.string().min(1), 'translatable')),
  // Meta-Zeile über dem Titel (Anlass · Ort · Datum); optional
  kicker: grouped('Titel & Darstellung', fieldPolicy(z.string().min(1).optional(), 'translatable')),
  titleLines: grouped('Titel & Darstellung', z.array(keyedText(fieldPolicy(z.string().min(1), 'translatable'))).min(1).max(2)),
  titleChars: grouped('Titel & Darstellung', fieldPolicy(z.number().int().positive(), 'shared')),
  tagline: grouped('Titel & Darstellung', fieldPolicy(z.string().min(1), 'translatable')),
  accent: grouped('Titel & Darstellung', fieldPolicy(z.string().regex(/^#[a-fA-F0-9]{6}$/), 'shared')),
  drones: grouped('Showdaten', z.union([fieldPolicy(z.number().int().positive(), 'shared'),projectFactRefSchema])),
  heroVideo: grouped('Showdaten', fieldPolicy(z.url().optional(), 'shared')),
  // A published film can be linked without inventing a self-hosted hero loop.
  videoLink: z.object({ href: fieldPolicy(z.url(), 'shared'), label: fieldPolicy(z.string().min(1), 'translatable') }).optional(),
  credits: z.array(z.object({ label: fieldPolicy(z.string().min(1), 'translatable'), value: z.union([fieldPolicy(z.string().min(1), 'translatable'),projectFactRefSchema]) })).min(1),
  numbers: z.array(z.object({ value: z.union([fieldPolicy(z.number().int().nonnegative(), 'shared'),projectFactRefSchema]), label: fieldPolicy(z.string().min(1), 'translatable') })).min(1),
  story: z.array(z.object({
    kicker: fieldPolicy(z.string().min(1).optional(), 'translatable'),
    title: fieldPolicy(z.string().min(1), 'translatable'),
    text: fieldPolicy(z.string().min(1), 'translatable'),
    image: photograph,
  })).min(1),
  formation: z.object({
    src: fieldPolicy(z.string().regex(/^\/media\/projekte\/[a-z]+\/formation\.json$/), 'shared'),
    title: fieldPolicy(z.string().min(1), 'translatable'),
    text: fieldPolicy(z.string().min(1), 'translatable'),
  }).optional(),
  gallery: z.array(photograph).default([]),
  portrait: grouped('Showdaten', fieldPolicy(z.boolean().default(false), 'shared')),
  setlist: z.array(z.object({ title: fieldPolicy(z.string().min(1), 'translatable'), items: z.array(keyedText(fieldPolicy(z.string().min(1), 'translatable'))).min(1) })).min(1),
  press: z.array(z.object({ publication: fieldPolicy(z.string().min(1), 'translatable'), date: fieldPolicy(z.string().min(1), 'translatable'), title: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().min(1), 'translatable') })).default([]),
  nextRoute: grouped('Adresse', fieldPolicy(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), 'shared')),
  cta: z.object({ title: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().min(1), 'translatable') }),
});

