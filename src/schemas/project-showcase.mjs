import { z } from 'astro/zod';
import {isColorToken} from '../lib/color-tokens.mjs';
import {inlineText} from './inline-text.mjs';

// Project-specific presentation stays in the content collection, shared by
// the gallery, canonical case route and existing /projekte/ routes.
const photograph = z.object({
  src: z.string().regex(/^(https:\/\/|\/assets\/[a-zA-Z0-9._/-]+$)/),
  assetId: z.string().optional(),
  altOverride: z.string().nullable().optional(),
  decorative: z.boolean().default(false),
  alt: z.string(),
  caption: z.string().min(1),
});

export const projectShowcaseSchema = z.object({
  route: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  order: z.number().int().positive(),
  name: z.string().min(1),
  // Search/social title and description of the case page, without the site name.
  meta: z.object({ title: z.string().min(1).max(70), description: z.string().min(50).max(160) }),
  cardTitle: inlineText('Projekt-Kartentitel').min(1),
  category: z.string().min(1),
  kicker: z.string().min(1),
  titleLines: z.array(inlineText('Hero-Titelzeile').min(1)).min(1).max(2),
  titleChars: z.number().int().positive(),
  tagline: z.string().min(1),
  accent: z.string().refine(isColorToken, 'Unbekannte Farbe').describe('Akzentfarbe').meta({format: 'color'}),
  drones: z.number().int().positive(),
  heroVideo: z.url(),
  credits: z.array(z.object({ label: z.string().min(1), value: z.string().min(1) })).min(1),
  numbers: z.array(z.object({ value: z.number().int().nonnegative(), label: z.string().min(1) })).min(1),
  story: z.array(z.object({
    kicker: z.string().min(1),
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
  portrait: z.boolean().default(false),
  setlist: z.array(z.object({ title: z.string().min(1), items: z.array(z.string().min(1)).min(1) })).min(1),
  press: z.array(z.object({ publication: z.string().min(1), date: z.string().min(1), title: z.string().min(1), text: z.string().min(1) })).default([]),
  nextRoute: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  cta: z.object({ title: z.string().min(1), text: z.string().min(1) }),
});
