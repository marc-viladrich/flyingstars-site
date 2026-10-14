import {z} from "astro/zod";
import {inlineText} from "./inline-text.mjs";
import {PACKAGE_KEYS} from '../content/package-ids.mjs';
import {validateSectionList} from "./section-policy.mjs";
export const editorialHref=/^(https?:\/\/|\/(?!\/)|#|mailto:|tel:|\.\.?\/)/i;
const link = z.object({ label: z.string().min(1), href: z.string().min(1).regex(editorialHref,'Nur Web-, E-Mail-, Telefon- oder interne Links sind erlaubt.') });
const sectionHeading = { id: z.string().optional(), kicker: z.string().optional() };

export const image = z.object({
  src: z.string().regex(/^(https:\/\/|\/assets\/[a-zA-Z0-9._/-]+$)/).describe('Bildquelle'),
  alt: z.string().describe('Alternativtext'),
  assetId: z.string().optional().describe('Medium aus der Bibliothek'),
  altOverride: z.string().nullable().optional().describe('Alternativtext an dieser Stelle'),
  decorative: z.boolean().default(false).describe('Dekoratives Bild'),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const sectionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('showreelHero').describe('Showreel-Auftakt'),
    headline: inlineText('Überschrift').min(1), text: z.string().min(1), eyebrow: z.string().min(1),
    words: z.array(inlineText('Wechselndes Wort').min(1)).min(1), cta: link, secondary: link,
    poster: image, video: z.url(), stats: z.array(z.object({ label: z.string(), value: z.string() })).min(1),
  }),
  z.object({
    type: z.literal('occasions').describe('Anlässe'), ...sectionHeading,
    headline: inlineText('Überschrift').min(1), text: z.string().min(1),
    cards: z.array(z.object({ category: z.string(), title: inlineText('Kartentitel'), text: z.string(), image,
      facts: z.array(z.string()).min(1), cta: link, download: link.optional() })).min(1),
  }),
  z.object({
    type: z.literal('metrics').describe('Kennzahlen'), ...sectionHeading,
    headline: inlineText('Überschrift').min(1), text: z.string().min(1),
    items: z.array(z.object({ label: z.string(), value: z.string(), text: z.string() })).min(1),
  }),
  z.object({
    type: z.literal('sustainability').describe('Nachhaltigkeit'), ...sectionHeading,
    headline: inlineText('Überschrift').min(1), lines: z.array(inlineText('Überschriftszeile')).length(3), text: z.string().min(1),
    facts: z.array(z.object({ label: inlineText('Bezeichnung der Kennzahl'), value: inlineText('Wert der Kennzahl'), unit: z.string().optional(),
      text: z.string(), tone: z.enum(['o','g']).optional().describe('Darstellung der Kennzahl') })).length(4),
    proofImage: image, proofText: z.string(), campaign: z.string(),
  }),
  z.object({
    type: z.literal('hero').describe('Auftakt'),
    headline: inlineText('Überschrift').min(1),
    text: z.string().optional(),
    image: image.optional(),
    cta: link.optional(),
    secondary: link.optional(),
  }),
  z.object({
    type: z.literal('textMedia').describe('Text und Bild'),
    headline: inlineText('Überschrift').min(1),
    body: z.string().min(1).describe('Markdown erlaubt'),
    image: image.optional(),
    mediaSide: z.enum(['left', 'right']).default('right').describe('Bildposition'),
    showImage: z.boolean().default(true).describe('Bild anzeigen'),
  }),
  z.object({
    type: z.literal('faq').describe('Fragen und Antworten'), ...sectionHeading,
    text: z.string().optional(), cta: link.optional(), openFirst: z.boolean().default(false),
    headline: inlineText('Überschrift').optional(),
    tags: z.array(z.string()).optional().describe('Nur FAQ-Einträge mit einem dieser Tags'),
    limit: z.number().int().positive().optional(),
  }),
  z.object({
    type: z.literal('cta').describe('Kontaktaufruf'),
    headline: inlineText('Überschrift').min(1),
    text: z.string().optional(),
    button: link,
  }),
  z.object({
    type: z.literal('postList').describe('Blogartikel'),
    headline: inlineText('Überschrift').optional(),
    limit: z.number().int().positive().default(3),
  }),
  z.object({
    type: z.literal('projectGrid').describe('Projekte'), ...sectionHeading,
    text: z.string().optional(), cta: link.optional(),
    headline: inlineText('Überschrift').optional(),
    limit: z.number().int().positive().default(6),
  }),
  z.object({
    type: z.literal('pricing').describe('Show-Pakete'), ...sectionHeading,
    cta: link.optional(),
    headline: inlineText('Überschrift').min(1),
    text: z.string().optional(),
    tiers: z.array(z.object({
      packageId: z.enum(PACKAGE_KEYS.map(name=>name.toLowerCase())).describe('Paket'),
      featureIds: z.array(z.string().min(1)).default([]).describe('Ausgewählte Paketleistungen in Kartenreihenfolge'),
      showOrb: z.boolean().default(true).describe('Animation anzeigen'),
      cta: link.optional(),
    })).min(1),
    note: z.string().optional().describe('Kleingedrucktes unter den Karten'),
    columns: z.enum(['three','two','one']).default('three').describe('Spalten'),
  }),
  z.object({
    type: z.literal('steps').describe('Ablauf'), ...sectionHeading,
    headline: inlineText('Überschrift').min(1),
    text: z.string().optional(),
    steps: z.array(z.object({
      title: inlineText('Schritttitel').min(1),
      text: z.string().min(1),
      duration: z.string().optional().describe('Kurzer Zeitrahmen, z. B. "48 h Antwortzeit"'),
    })).min(2),
  }),
  z.object({
    type: z.literal('comparison').describe('Vergleich'), ...sectionHeading,
    headline: inlineText('Überschrift').min(1),
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
    type: z.literal('team').describe('Team'), ...sectionHeading,
    note: z.string().optional(), cta: link.optional(),
    headline: inlineText('Überschrift').min(1),
    text: z.string().optional(),
    memberIds: z.array(z.string().min(1)).min(1).describe('Teammitglieder'),
    columns: z.enum(['five','three','two','one']).default('five').describe('Spalten'),
    showImages: z.boolean().default(true).describe('Bilder anzeigen'),
  }),
  z.object({
    type: z.literal('logoBar').describe('Kundenlogos'), ...sectionHeading,
    press: z.string().optional(),
    headline: inlineText('Überschrift').optional(),
    clientIds: z.array(z.string().min(1)).min(1).describe('Kunden'),
    showImages: z.boolean().default(true).describe('Logos anzeigen'),
  }),
  z.object({
    type: z.literal('testimonials').describe('Kundenstimmen'), ...sectionHeading,
    headline: inlineText('Überschrift').min(1),
    text: z.string().optional().describe('Einleitung'),
    clientIds: z.array(z.string().min(1)).min(1).describe('Kundenstimmen'),
    columns: z.enum(['one','two']).default('two').describe('Spalten'),
    background: z.boolean().default(true).describe('Kartenhintergrund'),
    showImages: z.boolean().default(true).describe('Kundenlogo anzeigen'),
  }),
  z.object({
    type: z.literal('contactForm').describe('Kontaktformular'),
    headline: inlineText('Überschrift').min(1),
    text: z.string().optional(),
  }),
]);


export const pageSchema=z.object({
    title: z.string().min(1).describe('Meta Title'),
    description: z.string().min(50).max(160).describe('Meta Description'),
    noindex: z.boolean().default(false),
    // Optional preview image for social shares; must come from an approved media host.
    image: z.url().optional(),
    sections: z.array(sectionSchema).min(1).superRefine(validateSectionList),
  });
