import {editable,inGroup} from './afe-meta.mjs';
import {z} from 'astro/zod';
import {validateSectionList} from './section-policy.mjs';
import {image,sectionSchema} from './page-schema.mjs';
import {projectShowcaseSchema} from './project-showcase.mjs';
export const postSchema = z.object({
    title: z.string().min(1).describe("Titel").meta(editable({"translatable":true})),
    sections:z.array(sectionSchema.describe("Abschnitte")).superRefine(validateSectionList).default([]).describe('Zusätzliche Bausteine').meta(editable({"array":{"role":"blocks","reorderable":true,"insertable":true,"removable":true,"discriminator":"type"}})),
    description: z.string().min(50).max(160).describe("Beschreibung").meta(editable({"format":"multiline","translatable":true})),
    date: z.coerce.date().describe("Datum").meta(editable({"format":"date","valueEncoding":"date-only"})),
    updated: z.coerce.date().optional().describe("Aktualisiert am").meta(editable({"format":"date","valueEncoding":"date-only"})),
    tags: z.array(z.string().describe("Schlagwörter")).default([]).describe("Schlagwörter").meta(editable({"array":{"role":"list","reorderable":false,"insertable":true,"removable":true}})),
    cover: image.optional().describe("Titelbild"),
    draft: z.boolean().default(false).describe("Entwurf (nicht veröffentlicht)"),
    // Herkunft für Nachvollziehbarkeit: Issue-Nummer des Intake, falls vorhanden.
    sourceIssue: z.number().int().positive().optional().describe("Source Issue").meta(editable({"visibility":"advanced"})),
  }).meta(editable({"collection":{"label":"Blogartikel","title":["title"],"icon":"newspaper","group":"Blog","operations":["update","create","delete"],"placement":"frontend","i18n":{"mode":"overlay"},"policies":["flyingstars/media-ownership","flyingstars/comparison"],"body":{"label":"Artikeltext","translatable":true}}}));
export const projectSchema = z.object({
    title: z.string().min(1).describe("Titel").meta(editable({"translatable":true})),
    sections:z.array(sectionSchema.describe("Abschnitte")).superRefine(validateSectionList).default([]).describe('Zusätzliche Bausteine').meta(editable({"array":{"role":"blocks","reorderable":true,"insertable":true,"removable":true,"discriminator":"type"}})),
    client: z.string().min(1).optional().describe("Kunde").meta(editable({reference:{collection:"clients",encoding:"id"}})),
    package: z.string().min(1).optional().describe("Zugeordnetes Paket (intern)").meta(editable({visibility:"advanced",reference:{collection:"packages",encoding:"id"}})),
    showcase: projectShowcaseSchema.optional().describe("Projektseite"),
    date: z.coerce.date().describe("Datum").meta(editable({"format":"date","valueEncoding":"date-only"})),
    location: z.string().optional().describe("Ort").meta(editable({"translatable":true})),
    summary: z.string().min(30).max(200).describe("Kurzfassung").meta(editable({"format":"multiline","translatable":true})),
    cover: inGroup('Projektkarte', image.optional().describe("Titelbild")),
    featured: z.boolean().default(false).describe("Hervorheben"),
    draft: z.boolean().default(false).describe("Entwurf (nicht veröffentlicht)"),
    sourceIssue: z.number().int().positive().optional().describe("Source Issue").meta(editable({"visibility":"advanced"})),
  }).meta(editable({"collection":{"label":"Projekt","title":["title"],"icon":"folder-open","group":"Projekte","operations":["update","create","delete"],"placement":"frontend","i18n":{"mode":"overlay"},"policies":["flyingstars/media-ownership","flyingstars/comparison"],"body":{"label":"Projekttext","translatable":true}}}));
export const faqSchema = z.object({
    question: z.string().min(5).describe("Frage").meta(editable({"translatable":true})),
    tags: z.array(z.string().describe("Schlagwörter")).default([]).describe("Schlagwörter").meta(editable({"array":{"role":"list","reorderable":false,"insertable":true,"removable":true}})),
    order: z.number().int().default(100).describe('Globale FAQ-Reihenfolge').meta(editable({"visibility":"advanced"})),
    draft: z.boolean().default(false).describe("Entwurf (nicht veröffentlicht)"),
    sourceIssue: z.number().int().positive().optional().describe("Source Issue").meta(editable({"visibility":"advanced"})),
  }).meta(editable({"collection":{"label":"FAQ","title":["question"],"icon":"circle-help","group":"FAQ","operations":["update","create","delete"],"placement":"frontend","i18n":{"mode":"overlay"},"policies":["flyingstars/media-ownership"],"body":{"label":"Antwort","translatable":true}}}));

export const markdownBodySchema=z.string().describe('Artikeltext (Markdown)').meta(editable({format:'markdown',translatable:true}));
