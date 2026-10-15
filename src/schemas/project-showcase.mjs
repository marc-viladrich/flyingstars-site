import {editable} from './afe-meta.mjs';
import { z } from 'astro/zod';
import {isColorToken} from '../lib/color-tokens.mjs';
import {inlineText} from './inline-text.mjs';

// Project-specific presentation stays in the content collection, shared by
// the gallery, canonical case route and existing /projekte/ routes.
const photograph = z.object({
  src: z.string().regex(/^(https:\/\/|\/assets\/[a-zA-Z0-9._/-]+$)/).describe("Src").meta(editable({"visibility":"advanced"})),
  assetId: z.string().optional().describe("Asset Id").meta(editable({"visibility":"advanced","reference":{"collection":"media","encoding":"id"}})),
  altOverride: z.string().nullable().optional().describe("Alt Override").meta(editable({"translatable":true})),
  decorative: z.boolean().default(false).describe("Dekoratives Bild"),
  alt: z.string().describe("Alt").meta(editable({"translatable":true})),
  caption: z.string().min(1).describe("Bildunterschrift").meta(editable({"translatable":true})),
}).meta({format: 'image', ...editable({media:{policy:'editor-images',shape:{kind:'object',source:['src'],alt:['alt'],decorative:['decorative']}},widget:'flyingstars/media-usage'})});

export const projectShowcaseSchema = z.object({
  route: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).describe("Route").meta(editable({"visibility":"advanced"})),
  order: z.number().int().positive().describe("Order").meta(editable({"visibility":"advanced"})),
  name: z.string().min(1).describe("Name"),
  // Search/social title and description of the case page, without the site name.
  meta: z.object({ title: z.string().min(1).max(70).describe("Titel").meta(editable({"translatable":true})), description: z.string().min(50).max(160).describe("Beschreibung").meta(editable({"format":"multiline","translatable":true})) }).describe("Eckdaten"),
  cardTitle: inlineText('Projekt-Kartentitel').min(1).meta(editable({"translatable":true})),
  category: z.string().min(1).describe("Kategorie").meta(editable({"translatable":true})),
  kicker: z.string().min(1).describe("Dachzeile").meta(editable({"translatable":true})),
  titleLines: z.array(inlineText('Hero-Titelzeile').min(1).meta(editable({translatable:true}))).min(1).max(2).describe("Title Lines").meta(editable({"visibility":"advanced","array":{"role":"list","reorderable":true,"insertable":true,"removable":true}})),
  titleChars: z.number().int().positive().describe("Title Chars").meta(editable({"visibility":"advanced"})),
  tagline: z.string().min(1).describe("Claim").meta(editable({"translatable":true})),
  accent: z.string().refine(isColorToken, 'Unbekannte Farbe').describe('Akzentfarbe').meta({format: 'color', palette: ['Marke', 'Projekte', 'Pakete']}),
  drones: z.number().int().positive().describe("Drohnen"),
  heroVideo: z.url().describe("Video im Auftakt"),
  credits: z.array(z.object({ label: z.string().min(1).describe("Beschriftung").meta(editable({"translatable":true})), value: z.string().min(1).describe("Wert").meta(editable({"translatable":true})) }).describe("Mitwirkende")).min(1).describe("Mitwirkende").meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true,"itemLabel":["label"]},"widget":"flyingstars/compact-table"})),
  numbers: z.array(z.object({ value: z.number().int().nonnegative().describe("Wert"), label: z.string().min(1).describe("Beschriftung").meta(editable({"translatable":true})) }).describe("Zahlen")).min(1).describe("Zahlen").meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true,"itemLabel":["label"]},"widget":"flyingstars/compact-table"})),
  story: z.array(z.object({
    kicker: z.string().min(1).describe("Dachzeile").meta(editable({"translatable":true})),
    title: z.string().min(1).describe("Titel").meta(editable({"translatable":true})),
    text: z.string().min(1).describe("Text").meta(editable({"format":"multiline","translatable":true})),
    image: photograph.describe("Bild"),
  }).describe("Geschichte")).min(1).describe("Geschichte").meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true,"itemLabel":["title"]}})),
  formation: z.object({
    src: z.string().regex(/^\/media\/projekte\/[a-z]+\/formation\.json$/).describe('Formationsdatei (JSON)').meta({readOnly: true, advanced: true}).meta(editable({"visibility":"advanced","readOnly":true})),
    title: z.string().min(1).describe("Titel").meta(editable({"translatable":true})),
    text: z.string().min(1).describe("Text").meta(editable({"format":"multiline","translatable":true})),
  }).describe('Interaktive Drohnenformation').meta({
    help: 'Animation aus vorbereiteten Drohnenpositionen.',
    hint: 'Verwendet eine vorbereitete JSON-Datei mit Position und Farbe jeder Drohne; ein Bild-Upload erzeugt keine Formation. Änderungen an der Formationsdatei übernimmt die technische Betreuung.',
  }),
  gallery: z.array(photograph.describe("Galerie")).min(1).describe("Galerie").meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true,"itemLabel":["caption"]}})),
  portrait: z.boolean().default(false).describe("Hochformat"),
  setlist: z.array(z.object({ title: z.string().min(1).describe("Titel").meta(editable({"translatable":true})), items: z.array(z.string().min(1).describe("Einträge").meta(editable({translatable:true}))).min(1).describe("Einträge").meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true}})) }).describe("Ablauf der Show")).min(1).describe("Ablauf der Show").meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true,"itemLabel":["title"]}})),
  press: z.array(z.object({ publication: z.string().min(1).describe("Medium").meta(editable({"translatable":true})), date: z.string().min(1).describe("Datum"), title: z.string().min(1).describe("Titel").meta(editable({"translatable":true})), text: z.string().min(1).describe("Text").meta(editable({"format":"multiline","translatable":true})) }).describe("Presse")).default([]).describe("Presse").meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true,"itemLabel":["title"]}})),
  nextRoute: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).describe("Next Route").meta(editable({"visibility":"advanced"})),
  cta: z.object({ title: z.string().min(1).describe("Titel").meta(editable({"translatable":true})), text: z.string().min(1).describe("Text").meta(editable({"format":"multiline","translatable":true})) }).describe("Button"),
});
