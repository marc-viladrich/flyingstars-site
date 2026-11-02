import { z } from 'zod';
import {imageSource,imageMetadata} from './media.mjs';
/** @template {import('zod').ZodType} T @param {string} group @param {T} schema @returns {T} */
const grouped=(group,schema)=>schema.meta({...schema.meta(),'x-afe':{...schema.meta()?.['x-afe'],group}});

// Project-specific presentation stays in the content collection, shared by
// the gallery, canonical case route and existing /projekte/ routes.
const photograph = z.object({
  src: imageSource,
  alt: z.string().min(1),
  caption: z.string().min(1),
}).meta(imageMetadata);

export const projectShowcaseSchema = z.object({
  route: grouped('Adresse', z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)),
  order: grouped('Adresse', z.number().int().positive()),
  name: grouped('Titel & Darstellung', z.string().min(1)),
  // Search/social title and description of the case page, without the site name.
  meta: z.object({ title: z.string().min(1).max(70), description: z.string().min(50).max(160) }),
  cardTitle: grouped('Titel & Darstellung', z.string().min(1)),
  category: grouped('Titel & Darstellung', z.string().min(1)),
  // Meta-Zeile über dem Titel (Anlass · Ort · Datum); optional
  kicker: grouped('Titel & Darstellung', z.string().min(1).optional()),
  titleLines: grouped('Titel & Darstellung', z.array(z.string().min(1)).min(1).max(2)),
  titleChars: grouped('Titel & Darstellung', z.number().int().positive()),
  tagline: grouped('Titel & Darstellung', z.string().min(1)),
  accent: grouped('Titel & Darstellung', z.string().regex(/^#[a-fA-F0-9]{6}$/)),
  drones: grouped('Showdaten', z.number().int().positive()),
  heroVideo: grouped('Showdaten', z.url()),
  credits: z.array(z.object({ label: z.string().min(1), value: z.string().min(1) })).min(1),
  numbers: z.array(z.object({ value: z.number().int().nonnegative(), label: z.string().min(1) })).min(1),
  story: z.array(z.object({
    kicker: z.string().min(1).optional(),
    title: z.string().min(1),
    text: z.string().min(1),
    image: photograph,
  })).min(1),
  formation: z.object({
    src: z.string().regex(/^\/media\/projekte\/[a-z]+\/formation\.json$/),
    title: z.string().min(1),
    text: z.string().min(1),
  }),
  gallery: z.array(photograph).min(1),
  portrait: grouped('Showdaten', z.boolean().default(false)),
  setlist: z.array(z.object({ title: z.string().min(1), items: z.array(z.string().min(1)).min(1) })).min(1),
  press: z.array(z.object({ publication: z.string().min(1), date: z.string().min(1), title: z.string().min(1), text: z.string().min(1) })).default([]),
  nextRoute: grouped('Adresse', z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)),
  cta: z.object({ title: z.string().min(1), text: z.string().min(1) }),
});

