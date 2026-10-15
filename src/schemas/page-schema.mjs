import {editable} from './afe-meta.mjs';
import {z} from "astro/zod";
import {inlineText} from "./inline-text.mjs";
import {PACKAGE_KEYS} from '../content/package-ids.mjs';
import {validateSectionList} from "./section-policy.mjs";
export const editorialHref=/^(https?:\/\/|\/(?!\/)|#|mailto:|tel:|\.\.?\/)/i;
const link = z.object({ label: z.string().min(1).describe("Beschriftung").meta(editable({"translatable":true})), href: z.string().min(1).regex(editorialHref,'Nur Web-, E-Mail-, Telefon- oder interne Links sind erlaubt.').describe("Link").meta(editable({"format":"url"})) });
const sectionHeading = { id: z.string().optional().describe('Id').meta(editable({visibility:'advanced'})), kicker: z.string().optional().describe('Dachzeile').meta(editable({translatable:true})) };

export const image = z.object({
  src: z.string().regex(/^(https:\/\/|\/assets\/[a-zA-Z0-9._/-]+$)/).describe('Bildquelle').meta(editable({"visibility":"advanced"})),
  alt: z.string().describe('Alternativtext').meta(editable({"translatable":true})),
  assetId: z.string().optional().describe('Medium aus der Bibliothek').meta(editable({"visibility":"advanced","reference":{"collection":"media","encoding":"id"}})),
  altOverride: z.string().nullable().optional().describe('Alternativtext an dieser Stelle').meta(editable({"translatable":true})),
  decorative: z.boolean().default(false).describe('Dekoratives Bild'),
  width: z.number().int().positive().describe("Width").meta(editable({"visibility":"advanced"})),
  height: z.number().int().positive().describe("Height").meta(editable({"visibility":"advanced"})),
}).meta({format: 'image', ...editable({media:{policy:'editor-images',shape:{kind:'object',source:['src'],alt:['alt'],width:['width'],height:['height'],decorative:['decorative']}},widget:'flyingstars/media-usage'})});

export const sectionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('showreelHero').describe('Showreel-Auftakt'),
    headline: inlineText('Überschrift').min(1).meta(editable({"translatable":true})), text: z.string().min(1).describe("Text").meta(editable({"format":"multiline","translatable":true})), eyebrow: z.string().min(1).describe("Dachzeile").meta(editable({"translatable":true})),
    words: z.array(inlineText('Wechselndes Wort').min(1).meta(editable({translatable:true}))).min(1).describe("Wechselnde Wörter").meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true}})), cta: link.describe("Button"), secondary: link.describe("Zweiter Button"),
    poster: image.describe("Vorschaubild"), video: z.url().describe("Video"), stats: z.array(z.object({ label: z.string().describe("Beschriftung").meta(editable({"translatable":true})), value: z.string().describe("Wert").meta(editable({"translatable":true})) }).describe("Kennzahlen")).min(1).describe("Kennzahlen").meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true,"itemLabel":["label"]},"widget":"flyingstars/compact-table"})),
  }).meta(editable({"block":{"label":"Showreel-Auftakt","icon":"clapperboard","maxInstances":1}})).describe('Abschnitte'),
  z.object({
    type: z.literal('occasions').describe('Anlässe'), ...sectionHeading,
    headline: inlineText('Überschrift').min(1).meta(editable({"translatable":true})), text: z.string().min(1).describe("Text").meta(editable({"format":"multiline","translatable":true})),
    cards: z.array(z.object({ category: z.string().describe("Kategorie").meta(editable({"translatable":true})), title: inlineText('Kartentitel').meta(editable({"translatable":true})), text: z.string().describe("Text").meta(editable({"format":"multiline","translatable":true})), image: image.describe("Bild"),
      facts: z.array(z.string().describe("Fakten").meta(editable({translatable:true}))).min(1).describe("Fakten").meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true}})), cta: link.describe("Button"), download: link.optional().describe("Download") }).describe("Karten")).min(1).describe("Karten").meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true,"itemLabel":["title"]}})),
  }).meta(editable({"block":{"label":"Anlässe","icon":"party-popper"}})).describe('Abschnitte'),
  z.object({
    type: z.literal('metrics').describe('Kennzahlen'), ...sectionHeading,
    headline: inlineText('Überschrift').min(1).meta(editable({"translatable":true})), text: z.string().min(1).describe("Text").meta(editable({"format":"multiline","translatable":true})),
    items: z.array(z.object({ label: z.string().describe("Beschriftung").meta(editable({"translatable":true})), value: z.string().describe("Wert").meta(editable({"translatable":true})), text: z.string().describe("Text").meta(editable({"format":"multiline","translatable":true})) }).describe("Einträge")).min(1).describe("Einträge").meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true,"itemLabel":["label"]},"widget":"flyingstars/compact-table"})),
  }).meta(editable({"block":{"label":"Kennzahlen","icon":"chart-no-axes-column"}})).describe('Abschnitte'),
  z.object({
    type: z.literal('sustainability').describe('Nachhaltigkeit'), ...sectionHeading,
    headline: inlineText('Überschrift').min(1).meta(editable({"translatable":true})), lines: z.array(inlineText('Überschriftszeile').meta(editable({translatable:true}))).length(3).describe("Zeilen").meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true}})), text: z.string().min(1).describe("Text").meta(editable({"format":"multiline","translatable":true})),
    facts: z.array(z.object({ label: inlineText('Bezeichnung der Kennzahl').meta(editable({"translatable":true})), value: inlineText('Wert der Kennzahl').meta(editable({"translatable":true})), unit: z.string().optional().describe("Einheit").meta(editable({"translatable":true})),
      text: z.string().describe("Text").meta(editable({"format":"multiline","translatable":true})), tone: z.enum(['o','g']).optional().describe('Darstellung der Kennzahl').meta(editable({"choices":{"o":{"label":"Kontur"},"g":{"label":"Farbverlauf"}}})) }).describe("Fakten")).length(4).meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true,"itemLabel":["label"]}})).describe("Fakten"),
    proofImage: image.describe("Nachweis-Bild"), proofText: z.string().describe("Nachweis-Text").meta(editable({"format":"multiline","translatable":true})), campaign: z.string().describe("Kampagne").meta(editable({"translatable":true})),
  }).meta(editable({"block":{"label":"Nachhaltigkeit","icon":"leaf","maxInstances":1}})).describe('Abschnitte'),
  z.object({
    type: z.literal('hero').describe('Auftakt'),
    headline: inlineText('Überschrift').min(1).meta(editable({"translatable":true})),
    text: z.string().optional().describe("Text").meta(editable({"format":"multiline","translatable":true})),
    image: image.optional().describe("Bild"),
    cta: link.optional().describe("Button"),
    secondary: link.optional().describe("Zweiter Button"),
  }).meta(editable({"block":{"label":"Auftakt","icon":"panel-top"}})).describe('Abschnitte'),
  z.object({
    type: z.literal('textMedia').describe('Text und Bild'),
    headline: inlineText('Überschrift').min(1).meta(editable({"translatable":true})),
    body: z.string().min(1).describe('Markdown erlaubt').meta(editable({"format":"markdown","translatable":true})),
    image: image.optional().describe("Bild"),
    mediaSide: z.enum(['left', 'right']).default('right').describe('Bildposition').meta(editable({"choices":{"left":{"label":"Links"},"right":{"label":"Rechts"}}})),
    showImage: z.boolean().default(true).describe('Bild anzeigen'),
  }).meta(editable({"block":{"label":"Text und Bild","icon":"panels-left-bottom"}})).describe('Abschnitte'),
  z.object({
    type: z.literal('faq').describe('Fragen und Antworten'), ...sectionHeading,
    text: z.string().optional().describe("Text").meta(editable({"format":"multiline","translatable":true})), cta: link.optional().describe("Button"), openFirst: z.boolean().default(false).describe("Erste Frage geöffnet"),
    headline: inlineText('Überschrift').optional().meta(editable({"translatable":true})),
    tags: z.array(z.string().describe("Schlagwörter")).optional().describe('Nur FAQ-Einträge mit einem dieser Tags').meta(editable({"array":{"role":"list","reorderable":false,"insertable":true,"removable":true}})),
    limit: z.number().int().positive().optional().describe("Anzahl"),
  }).meta(editable({"block":{"label":"Fragen und Antworten","icon":"circle-help"}})).describe('Abschnitte'),
  z.object({
    type: z.literal('cta').describe('Kontaktaufruf'),
    headline: inlineText('Überschrift').min(1).meta(editable({"translatable":true})),
    text: z.string().optional().describe("Text").meta(editable({"format":"multiline","translatable":true})),
    button: link.describe("Button"),
  }).meta(editable({"block":{"label":"Kontaktaufruf","icon":"mouse-pointer-2"}})).describe('Abschnitte'),
  z.object({
    type: z.literal('postList').describe('Blogartikel'),
    headline: inlineText('Überschrift').optional().meta(editable({"translatable":true})),
    limit: z.number().int().positive().default(3).describe("Anzahl"),
  }).meta(editable({"block":{"label":"Blogartikel","icon":"newspaper"}})).describe('Abschnitte'),
  z.object({
    type: z.literal('projectGrid').describe('Projekte'), ...sectionHeading,
    text: z.string().optional().describe("Text").meta(editable({"format":"multiline","translatable":true})), cta: link.optional().describe("Button"),
    headline: inlineText('Überschrift').optional().meta(editable({"translatable":true})),
    limit: z.number().int().positive().default(6).describe("Anzahl"),
  }).meta(editable({"block":{"label":"Projekte","icon":"layout-grid"}})).describe('Abschnitte'),
  z.object({
    type: z.literal('pricing').describe('Show-Pakete'), ...sectionHeading,
    cta: link.optional().describe("Button"),
    headline: inlineText('Überschrift').min(1).meta(editable({"translatable":true})),
    text: z.string().optional().describe("Text").meta(editable({"format":"multiline","translatable":true})),
    tiers: z.array(z.object({
      packageId: z.enum(PACKAGE_KEYS.map(name=>name.toLowerCase())).describe('Paket').meta(editable({"reference":{"collection":"packages","encoding":"id"}})),
      featureIds: z.array(z.string().min(1).describe("Feature Ids")).default([]).describe('Ausgewählte Paketleistungen in Kartenreihenfolge').meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true},"widget":"flyingstars/package-features"})),
      showOrb: z.boolean().default(true).describe('Animation anzeigen'),
      cta: link.optional().describe("Button"),
    }).describe("Pakete")).min(1).meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true,"itemLabel":["packageId"]}})).describe("Pakete"),
    note: z.string().optional().describe('Kleingedrucktes unter den Karten').meta(editable({"translatable":true})),
    columns: z.enum(['three','two','one']).default('three').describe('Spalten').meta(editable({"choices":{"three":{"label":"3"},"two":{"label":"2"},"one":{"label":"1"}}})),
  }).meta(editable({"block":{"label":"Show-Pakete","icon":"package"}})).describe('Abschnitte'),
  z.object({
    type: z.literal('steps').describe('Ablauf'), ...sectionHeading,
    headline: inlineText('Überschrift').min(1).meta(editable({"translatable":true})),
    text: z.string().optional().describe("Text").meta(editable({"format":"multiline","translatable":true})),
    steps: z.array(z.object({
      title: inlineText('Schritttitel').min(1).meta(editable({"translatable":true})),
      text: z.string().min(1).describe("Text").meta(editable({"format":"multiline","translatable":true})),
      duration: z.string().optional().describe('Kurzer Zeitrahmen, z. B. "48 h Antwortzeit"').meta(editable({"translatable":true})),
    }).describe("Schritte")).min(2).meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true,"itemLabel":["title"]}})).describe("Schritte"),
  }).meta(editable({"block":{"label":"Ablauf","icon":"list-ordered"}})).describe('Abschnitte'),
  z.object({
    type: z.literal('comparison').describe('Vergleich'), ...sectionHeading,
    headline: inlineText('Überschrift').min(1).meta(editable({"translatable":true})),
    text: z.string().optional().describe("Text").meta(editable({"format":"multiline","translatable":true})),
    rowHeader: z.string().default('Kriterium').describe('Beschriftung der ersten Spalte').meta(editable({"translatable":true})),
    columns: z.array(z.string().min(1).describe("Spalten").meta(editable({translatable:true}))).min(2).describe("Spalten").meta(editable({"array":{"role":"list","reorderable":false,"insertable":false,"removable":false}})),
    rows: z.array(z.object({
      label: z.string().min(1).describe("Beschriftung").meta(editable({"translatable":true})),
      cells: z.array(z.object({ label: z.string().describe("Beschriftung").meta(editable({"translatable":true})), text: z.string().optional().describe("Text").meta(editable({"format":"multiline","translatable":true})), tone: z.enum(['y','n','p']).describe("Bewertung").meta(editable({"choices":{"y":{"label":"Ja"},"n":{"label":"Nein"},"p":{"label":"Teilweise"}}})) }).describe("Zellen")).optional().describe("Zellen").meta(editable({"array":{"role":"list","reorderable":false,"insertable":false,"removable":false}})),
      values: z.array(z.string().describe("Values").meta(editable({translatable:true}))).describe('Genau ein Wert je Spalte, in derselben Reihenfolge').meta(editable({"array":{"role":"list","reorderable":false,"insertable":false,"removable":false}})),
    }).describe("Zeilen")).min(1).meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true,"itemLabel":["label"]}})).describe("Zeilen"),
    note: z.string().optional().describe("Hinweis").meta(editable({"translatable":true})),
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
    note: z.string().optional().describe("Hinweis").meta(editable({"translatable":true})), cta: link.optional().describe("Button"),
    headline: inlineText('Überschrift').min(1).meta(editable({"translatable":true})),
    text: z.string().optional().describe("Text").meta(editable({"format":"multiline","translatable":true})),
    memberIds: z.array(z.string().min(1).meta(editable({"reference":{"collection":"team","encoding":"id"}})).describe("Member Ids")).min(1).describe('Teammitglieder').meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true}})),
    columns: z.enum(['five','three','two','one']).default('five').describe('Spalten').meta(editable({"choices":{"five":{"label":"5"},"three":{"label":"3"},"two":{"label":"2"},"one":{"label":"1"}}})),
    showImages: z.boolean().default(true).describe('Bilder anzeigen'),
  }).meta(editable({"block":{"label":"Team","icon":"users"}})).describe('Abschnitte'),
  z.object({
    type: z.literal('logoBar').describe('Kundenlogos'), ...sectionHeading,
    press: z.string().optional().describe("Presse").meta(editable({"translatable":true})),
    headline: inlineText('Überschrift').optional().meta(editable({"translatable":true})),
    clientIds: z.array(z.string().min(1).meta(editable({"reference":{"collection":"clients","encoding":"id"}})).describe("Client Ids")).min(1).describe('Kunden').meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true}})),
    showImages: z.boolean().default(true).describe('Logos anzeigen'),
  }).meta(editable({"block":{"label":"Kundenlogos","icon":"building-2"}})).describe('Abschnitte'),
  z.object({
    type: z.literal('testimonials').describe('Kundenstimmen'), ...sectionHeading,
    headline: inlineText('Überschrift').min(1).meta(editable({"translatable":true})),
    text: z.string().optional().describe('Einleitung').meta(editable({"format":"multiline","translatable":true})),
    clientIds: z.array(z.string().min(1).meta(editable({"reference":{"collection":"clients","encoding":"id"}})).describe("Client Ids")).min(1).describe('Kundenstimmen').meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true}})),
    columns: z.enum(['one','two']).default('two').describe('Spalten').meta(editable({"choices":{"one":{"label":"1"},"two":{"label":"2"}}})),
    background: z.boolean().default(true).describe('Kartenhintergrund'),
    showImages: z.boolean().default(true).describe('Kundenlogo anzeigen'),
  }).meta(editable({"block":{"label":"Kundenstimmen","icon":"quote"}})).describe('Abschnitte'),
  z.object({
    type: z.literal('contactForm').describe('Kontaktformular'),
    headline: inlineText('Überschrift').min(1).meta(editable({"translatable":true})),
    text: z.string().optional().describe("Text").meta(editable({"format":"multiline","translatable":true})),
  }).meta(editable({"block":{"label":"Kontaktformular","icon":"mail","maxInstances":1}})).describe('Abschnitte'),
]).describe('Abschnitte');


export const pageSchema=z.object({
    title: z.string().min(1).describe('Meta Title').meta(editable({"translatable":true})),
    description: z.string().min(50).max(160).describe('Meta Description').meta(editable({"format":"multiline","translatable":true})),
    noindex: z.boolean().default(false).describe("Nicht in Suchmaschinen anzeigen"),
    // Optional preview image for social shares; must come from an approved media host.
    image: z.url().optional().describe("Bild"),
    sections: z.array(sectionSchema.describe("Abschnitte")).min(1).superRefine(validateSectionList).describe("Abschnitte").meta(editable({"array":{"role":"blocks","reorderable":true,"insertable":true,"removable":true,"discriminator":"type"}})),
  }).meta(editable({"collection":{"label":"Seite","title":["title"],"icon":"file-text","group":"Seiten","operations":["update","create","delete"],"placement":"frontend","i18n":{"mode":"overlay"},"policies":["flyingstars/media-ownership","flyingstars/comparison"]}}));
