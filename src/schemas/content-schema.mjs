import {keyedSchema,keyedText} from '../i18n/list-keys.mjs';
import {responsibilitySchema,siteDiagramSchema,siteItemsSchema,siteDownloadSchema} from './shared-blocks.mjs';
import {fieldPolicy} from '../i18n/field-policy.mjs';
import {REFERENCE_OCCASION_IDS} from '../content/occasions.mjs';
import {projectFactRefSchema} from './project-facts.mjs';
import {PERSON_IDS} from '../content/people.mjs';
import {businessValueSchema} from './business-facts.mjs';
import {PACKAGE_NAMES} from '../content/package-identity.mjs';
import {factText} from '../content/show-extras.mjs';
import { z } from 'zod';
import {imageSource,imageMetadata} from './media.mjs';
import { projectShowcaseSchema } from './project-showcase.mjs';

// ---------------------------------------------------------------------------
// Sections: die einzige Stelle, an der neue Section-Typen registriert werden.
// Jede Section hat genau einen Typ, typisierte Props und eine Komponente in
// src/components/sections/. Der Agent darf Seiten nur aus diesen Typen bauen.
// ---------------------------------------------------------------------------
const link = z.object({ label: fieldPolicy(z.string().min(1), 'translatable'), href: fieldPolicy(z.string().min(1), 'shared') });
// Abschluss-Kasten (CtaBox.astro): immer Überschrift, Text und genau ein Knopf, dazu die Gesichter (Marc, 02.11.2026:
// „solche empty-looking CTAs darf es niemals geben. Immer ein Heading und ein Text dazu“)
const closingBox = z.object({ headline: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().min(1), 'translatable'), button: link }).strict();
// Section-Köpfe (docs/DESIGN.md): Kicker in Orange über der Headline, einspaltig; `text` ist der optionale Satz darunter.
// Headlines dürfen einzelne Begriffe mit *Sternchen* markieren, sie erscheinen dann im Logoverlauf.
// Kicker sind seit 31.10.2026 wieder sichtbar (Marc: „die Eyebrow-Headings brauchen Farbe“, wie im Vercel-Prototyp).
const legacy = fieldPolicy(z.string().optional().describe('Veraltet, wird nicht mehr angezeigt'), 'translatable');
// Redaktioneller Hinweis je Section (Marc, 02.11.2026: „bei den Seiten, bei denen inhaltlich noch was fehlt, das markieren“).
// Erscheint nur im lokalen Dev-Server (SectionRenderer.astro); kein Build, auch keine Preview, enthält ihn.
const todo = { todo: fieldPolicy(z.string().optional().describe('Was hier inhaltlich fehlt oder von FlyingStars kommen muss; nur im lokalen Dev-Server sichtbar, nie in Build oder Preview'), 'shared') };
const sectionHeading = { id: fieldPolicy(z.string().optional(), 'shared'), kicker: fieldPolicy(z.string().optional().describe('Kicker über der Headline, z. B. "Anlässe"'), 'translatable'), ...todo };
const brandPath = fieldPolicy(z.string().regex(/^\/brand\/[a-z0-9/._-]+\.(svg|png|webp)$/).describe('Lokale Datei unter public/brand/'), 'shared');

const personId=fieldPolicy(z.enum(PERSON_IDS).describe('Person').meta({'x-afe':{reference:{collection:'people',encoding:'id'}}}), 'shared');
const image = z.object({
  src: imageSource,
  alt: fieldPolicy(z.string().min(1).describe('Pflicht. Leerer Alt-Text nur für Dekoration, dann alt: ""'), 'translatable'),
  width: fieldPolicy(z.number().int().positive(), 'shared'),
  height: fieldPolicy(z.number().int().positive(), 'shared'),
}).meta(imageMetadata);

const rawSectionSchema = z.discriminatedUnion('type', [
  z.object({
    type: fieldPolicy(z.literal('showreelHero'), 'shared'), ...todo,
    headline: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().min(1), 'translatable'), eyebrow: fieldPolicy(z.string().optional().describe('Kicker über der Headline'), 'translatable'),
    words: z.array(keyedText(fieldPolicy(z.string().min(1), 'translatable'))).optional().describe('Wechselndes Wort im Verlauf hinter der Headline'),
    cta: link, secondary: link.optional(),
    poster: image, video: fieldPolicy(z.url(), 'shared'), stats: z.array(z.object({ label: fieldPolicy(z.string(), 'translatable'), value: businessValueSchema })).optional(),
  }),
  z.object({
    type: fieldPolicy(z.literal('occasions'), 'shared'), ...sectionHeading,
    headline: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().optional(), 'translatable'),
    cards: z.array(z.object({ category: fieldPolicy(z.string().optional(), 'translatable'), title: fieldPolicy(z.string(), 'translatable'), text: fieldPolicy(z.string(), 'translatable'), image,
      facts: z.array(keyedText(fieldPolicy(z.string(), 'translatable'))).optional(), cta: link, download: link.optional(),
      season: z.array(fieldPolicy(z.number().int().min(1).max(12), 'shared')).optional().describe('Monate, in denen die Karte nach vorn rückt (z. B. [11, 12] für Silvester)') })).min(1),
  }),
  z.object({
    type: fieldPolicy(z.literal('metrics'), 'shared'), ...sectionHeading,
    headline: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().optional(), 'translatable'),
    items: z.array(z.object({ label: fieldPolicy(z.string(), 'translatable'), value: businessValueSchema.optional(), text: fieldPolicy(z.string(), 'translatable') })).min(1),
    cta: link.optional(),
  }),
  z.object({
    type: fieldPolicy(z.literal('sustainability'), 'shared'), ...sectionHeading,
    // Nachhaltigkeit in 2D (keine Scrollstory): Kopf, optional bis zu vier Kennzahlen, optional Sätze, optional Beleg.
    headline: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().optional(), 'translatable'),
    facts: z.array(z.object({ label: fieldPolicy(z.string(), 'translatable'), value: businessValueSchema, unit: fieldPolicy(z.string().optional(), 'translatable'),
      text: fieldPolicy(z.string(), 'translatable'), tone: legacy.describe('Veraltet (Kontur/Verlauf), wird ignoriert') })).max(4).optional(),
    points: z.array(keyedText(fieldPolicy(z.string().min(1), 'translatable'))).optional().describe('Kurze, belegbare Sätze, je einer pro Punkt'),
    pillarsRef: fieldPolicy(z.literal('sustainability-pillars').optional().describe('Gemeinsame Nachhaltigkeitspunkte'), 'shared'),
    proofImage: image.optional(), proofText: fieldPolicy(z.string().optional(), 'translatable'), campaign: fieldPolicy(z.string().optional(), 'translatable'),
    lines: z.array(keyedText(fieldPolicy(z.string(), 'translatable'))).optional().describe('Veraltet (dreizeiliger Titel der Scrollstory), wird nicht mehr angezeigt'),
  }).strict(),
  z.object({
    type: fieldPolicy(z.literal('hero'), 'shared'), ...todo, kicker: fieldPolicy(z.string().optional(), 'translatable'),
    headline: fieldPolicy(z.string().min(1), 'translatable'),
    text: fieldPolicy(z.string().optional(), 'translatable'),
    image: image.optional(),
    cta: link.optional(),
    secondary: link.optional(),
  }),
  z.object({
    type: fieldPolicy(z.literal('textMedia'), 'shared'), ...todo, id: fieldPolicy(z.string().optional().describe('Sprungmarke, z. B. "geschichte"'), 'shared'), kicker: fieldPolicy(z.string().optional(), 'translatable'),
    headline: fieldPolicy(z.string().min(1), 'translatable'),
    body: fieldPolicy(z.string().min(1).describe('Markdown erlaubt').meta({'x-afe': {format: 'markdown'}}), 'translatable'),
    image: image.optional(),
    mediaSide: fieldPolicy(z.enum(['left', 'right']).default('right'), 'shared'),
  }),
  z.object({
    type: fieldPolicy(z.literal('faq'), 'shared'), ...sectionHeading,
    text: fieldPolicy(z.string().optional(), 'translatable'), cta: link.optional(), openFirst: fieldPolicy(z.boolean().default(false), 'shared'),
    headline: fieldPolicy(z.string().optional(), 'translatable'),
    tags: z.array(fieldPolicy(z.string(), 'shared')).optional().describe('Nur FAQ-Einträge mit einem dieser Tags (ohne groups)'),
    limit: fieldPolicy(z.number().int().positive().optional(), 'shared'),
    groups: z.array(z.object({
      id: fieldPolicy(z.string().regex(/^[a-z0-9-]+$/).optional().describe('Sprungmarke, z. B. "planung"'), 'shared'),
      headline: fieldPolicy(z.string().min(1), 'translatable'),
      tags: z.array(fieldPolicy(z.string(), 'shared')).min(1).describe('FAQ-Einträge mit einem dieser Tags'),
    })).optional().describe('Fragen in Gruppen; ersetzt tags/limit'),
    closing: z.object({
      headline: fieldPolicy(z.string().min(1), 'translatable'),
      text: fieldPolicy(z.string().min(1), 'translatable'),
      image: image.optional().describe('Foto der drei Geschäftsführer:innen; ohne Bild erscheinen ihre drei Porträts'),
    }).optional().describe('Abschluss mit Anrufen/Schreiben'),
  }),
  z.object({
    // Abschluss-CTA: genau ein Knopf, keine Zeile über der Überschrift (Marc, 01.11.2026: „keine multiplen CTAs“)
    type: fieldPolicy(z.literal('cta'), 'shared'), ...todo,
    headline: fieldPolicy(z.string().min(1), 'translatable'),
    text: fieldPolicy(z.string().min(1), 'translatable'),
    button: link,
  }),
  z.object({
    type: fieldPolicy(z.literal('postList'), 'shared'), ...todo,
    headline: fieldPolicy(z.string().optional(), 'translatable'),
    limit: fieldPolicy(z.number().int().positive().default(3), 'shared'),
  }),
  z.object({
    type: fieldPolicy(z.literal('projectGrid'), 'shared'), ...sectionHeading,
    text: fieldPolicy(z.string().optional(), 'translatable'), cta: link.optional(),
    headline: fieldPolicy(z.string().optional(), 'translatable'),
    limit: fieldPolicy(z.number().int().positive().default(6), 'shared'),
  }),
  z.object({
    type: fieldPolicy(z.literal('pricing'), 'shared'), ...sectionHeading,
    cta: link.optional(),
    headline: fieldPolicy(z.string().min(1), 'translatable'),
    text: fieldPolicy(z.string().optional(), 'translatable'),
    tiers: z.array(z.object({
      name: fieldPolicy(z.string().min(1), 'translatable'),
      badge: fieldPolicy(z.string().optional(), 'translatable'),
      orb: z.object({ shape: fieldPolicy(z.enum(['ring','sphere','torus']), 'shared'), color: fieldPolicy(z.string().regex(/^\d{1,3},\d{1,3},\d{1,3}$/), 'translatable'), count: fieldPolicy(z.number().int().positive(), 'shared') }).optional(),
      price: fieldPolicy(z.string().min(1).describe('Freitext inkl. Währung, z. B. "ab 1.000 €"'), 'translatable'),
      unit: fieldPolicy(z.string().optional().describe('Bezugsgröße zum Preis, z. B. "pro Show" oder "netto"'), 'translatable'),
      description: fieldPolicy(z.string().optional(), 'translatable'),
      features: z.array(keyedText(fieldPolicy(z.string().min(1), 'translatable'))).default([]),
      highlight: fieldPolicy(z.boolean().default(false).describe('Hebt die Karte als Empfehlung hervor'), 'shared'),
      cta: link.optional(),
    })).min(1),
    note: fieldPolicy(z.string().optional().describe('Kleingedrucktes unter den Karten'), 'translatable'),
  }),
  z.object({
    type: fieldPolicy(z.literal('steps'), 'shared'), ...sectionHeading,
    headline: fieldPolicy(z.string().min(1), 'translatable'),
    text: fieldPolicy(z.string().optional(), 'translatable'),
    steps: z.array(z.object({
      title: fieldPolicy(z.string().min(1), 'translatable'),
      text: fieldPolicy(z.string().min(1), 'translatable'),
      duration: fieldPolicy(z.string().optional().describe('Kurzer Zeitrahmen, z. B. "zwei Tage"'), 'translatable'),
    })).min(2),
  }),
  z.object({
    type: fieldPolicy(z.literal('comparison'), 'shared'), ...sectionHeading,
    headline: fieldPolicy(z.string().min(1), 'translatable'),
    text: fieldPolicy(z.string().optional(), 'translatable'),
    rowHeader: fieldPolicy(z.string().optional().describe('Beschriftung der ersten Spalte'), 'translatable'),
    columns: z.array(keyedText(fieldPolicy(z.string().min(1), 'translatable'))).min(2),
    rows: z.array(z.object({
      label: fieldPolicy(z.string().min(1), 'translatable'),
      cells: z.array(z.object({ label: fieldPolicy(z.string(), 'translatable'), text: fieldPolicy(z.string().optional(), 'translatable'), tone: fieldPolicy(z.enum(['y','n','p']), 'shared') })).optional(),
      values: z.array(keyedText(fieldPolicy(z.string(), 'translatable'))).describe('Genau ein Wert je Spalte, in derselben Reihenfolge'),
    })).min(1),
    note: fieldPolicy(z.string().optional(), 'translatable'),
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
    type: fieldPolicy(z.literal('team'), 'shared'), ...sectionHeading,
    note: fieldPolicy(z.string().optional(), 'translatable'), cta: link.optional(),
    headline: fieldPolicy(z.string().min(1), 'translatable'),
    text: fieldPolicy(z.string().optional(), 'translatable'),
    members: z.array(z.object({
      personId,
    }).strict()).min(1),
  }),
  z.object({
    // Kund:innen als Laufband, darunter optional Presse und „Qualität und Sicherheit“ (docs/DESIGN.md, Studie 6).
    type: fieldPolicy(z.literal('logoBar'), 'shared'), ...sectionHeading,
    headline: fieldPolicy(z.string().optional().describe('Name des Laufbands für Screenreader, z. B. "Kund:innen von FlyingStars"'), 'translatable'),
    press: legacy.describe('Veraltet (Textzeile „Bekannt aus“), ersetzt durch pressItems'),
    logos: z.array(z.object({
      name: fieldPolicy(z.string().min(1), 'translatable'),
      file: brandPath.optional().describe('Bevorzugt: weißes SVG unter /brand/logos/'),
      image: image.optional().describe('Sonst Live-PNG vom Medienspeicher'),
      detail: fieldPolicy(z.boolean().default(false).describe('PNG mit dunklen Innendetails (Bentley): nicht weiß einfärben'), 'shared'),
      href: fieldPolicy(z.string().min(1).optional(), 'shared'),
      tall: fieldPolicy(z.boolean().default(false).describe('Veraltet: die optische Größe wird berechnet'), 'shared'),
    })).default([]),
    pressHeadline: fieldPolicy(z.string().optional(), 'translatable'),
    pressItems: z.array(z.object({
      name: fieldPolicy(z.string().min(1), 'translatable'),
      logo: brandPath.optional(),
      cleared: fieldPolicy(z.boolean().default(false).describe('Schriftliche Freigabe für das Logo liegt vor; sonst erscheint der Name als Text'), 'shared'),
      knock: fieldPolicy(z.boolean().default(false).describe('Logo mit ausgesparter Schrift (ZDF, ntv)'), 'shared'),
      href: fieldPolicy(z.url().optional().describe('Beitrag, falls öffentlich'), 'shared'),
      note: fieldPolicy(z.string().optional().describe('Kurzinfo als Tooltip, z. B. Sendung'), 'translatable'),
    })).default([]),
    qualityHeadline: fieldPolicy(z.string().optional(), 'translatable'),
    quality: z.array(z.object({
      title: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().optional(), 'translatable'),
      icon: fieldPolicy(z.enum(['permit', 'sound', 'shield', 'leaf']).describe('Verlaufs-Icon, wenn kein freigegebenes Logo'), 'shared'),
      logo: brandPath.optional(),
      cleared: fieldPolicy(z.boolean().default(false).describe('Logo darf gezeigt werden (LBA-Signet gemeinfrei; naturstrom nur nach Freigabe)'), 'shared'),
      secondary: fieldPolicy(z.boolean().default(false).describe('Nachrangig: klein als Textzeile unter den Logos (Marc 31.10.: TÜV-Gutachten, Haftpflicht)'), 'shared'),
    })).default([]),
  }),
  z.object({
    // Alle Referenzen (Projekte-Sammlung) mit Filter nach Anlass, Jahr und Drohnenzahl. Ohne JS: Abschnitte je Anlass
    // mit Sprunglinks; mit JS: eine Liste mit Filter-Radiogruppen und Statusansage. Fallstudien verlinken auf ihre Seite.
    type: fieldPolicy(z.literal('references'), 'shared'), ...sectionHeading,
    headline: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().optional(), 'translatable'),
    filters: z.array(fieldPolicy(z.enum(['occasion', 'year', 'drones']), 'shared')).default(['occasion', 'year', 'drones']),
  }),
  z.object({
    // Meilensteine als ruhige Liste (kein Schwarm). Wiederholte Jahreszahlen werden nur einmal gezeigt.
    type: fieldPolicy(z.literal('timeline'), 'shared'), ...sectionHeading,
    headline: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().optional(), 'translatable'),
    items: z.array(z.object({ when: z.union([fieldPolicy(z.string().min(1), 'translatable'),projectFactRefSchema]), title: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().optional(), 'translatable') })).min(2),
  }),
  z.object({
    // Die drei Pakete. Preis und Drohnenzahl kommen nur aus src/content/show-packages.ts, Texte aus dem YAML.
    type: fieldPolicy(z.literal('packages'), 'shared'), ...sectionHeading,
    headline: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().optional(), 'translatable'),
    note: fieldPolicy(z.string().optional().describe('Kleingedrucktes unter den Karten'), 'translatable'),
    cta: link.optional(),
    compact: fieldPolicy(z.boolean().default(false).describe('Kurzfassung (Startseite): Name, Preis, Drohnen, eine Zeile'), 'shared'),
    items: z.array(z.object({
      name: fieldPolicy(z.enum(PACKAGE_NAMES), 'shared'),
      label: fieldPolicy(z.string().optional().describe('z. B. "Klassisch in 2D"'), 'translatable'),
      badge: fieldPolicy(z.string().optional().describe('z. B. "Am häufigsten gebucht"'), 'translatable'),
      highlight: fieldPolicy(z.boolean().default(false), 'shared'),
      sky: fieldPolicy(z.string().optional().describe('Am Himmel'), 'translatable'),
      care: fieldPolicy(z.string().optional().describe('Betreuung'), 'translatable'),
      typical: fieldPolicy(z.string().optional().describe('Typisch für'), 'translatable'),
      points: z.array(keyedText(fieldPolicy(z.string(), 'translatable'))).max(4).optional().describe('Kernpunkte auf der Kurzfassung (Startseite), die Drohnenzahl steht automatisch davor'),
    })).default(PACKAGE_NAMES.map(name=>({name,highlight:false}))),
  }),
  z.object({
    // Konfigurator-Teaser (Startseite): Anlass-Chips und Drohnen-Regler, Übergabe an den Konfigurator auf der Preisseite.
    type: fieldPolicy(z.literal('configuratorTeaser'), 'shared'), ...sectionHeading,
    headline: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().optional(), 'translatable'),
    occasion: fieldPolicy(z.string().optional().describe('Anlass beim Laden, ID aus content/show-configurator.js'), 'shared'),
    drones: fieldPolicy(z.number().int().positive().optional(), 'shared'),
  }),
  z.object({
    // Ablauf in Zahlen (Marc, 31.10.2026): statt nummerierter Schritte ein Zeitstrahl von der Anfrage bis zum Showabend,
    // der zeigt, wie schnell es gehen kann; darunter Kennzahlen aus „In Zahlen statt in Adjektiven“.
    type: fieldPolicy(z.literal('tempo'), 'shared'), ...sectionHeading,
    headline: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().optional(), 'translatable'),
    marks: z.array(z.object({ value: businessValueSchema, label: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().optional(), 'translatable') })).min(2).max(5),
    shortcut: z.object({ value: businessValueSchema, label: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().optional(), 'translatable'),
      href: fieldPolicy(z.string().optional(), 'shared') }).strict().optional()
      .describe('Abzweigung im Netzplan (MetroLine.astro), z. B. Express: von der ersten zur letzten Station; mit href wird das Schild selbst zum Knopf'),
    facts: z.array(z.object({ value: businessValueSchema, label: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().optional(), 'translatable') })).default([]),
    note: fieldPolicy(z.string().optional(), 'translatable'),
  }),
  // --- Anlass-Landingpages (Marc, 31.10.2026: „deutlich mehr in dieses Interaktive … mehr Variation in den Layouts“).
  // Komponenten unter src/components/landing/. Kennzahlen überall als { value, label, text? }.
  z.object({
    // Seitenkopf mit kleinem Showreel im Bildrahmen: stumm, Loop, startet erst im Bild (ab 701 px automatisch, auf dem
    // Handy per Knopf), pausiert bei globaler Pause und reduzierter Bewegung. Nur registrierte Videos (src/lib/videos.ts).
    type: fieldPolicy(z.literal('landingHero'), 'shared'), ...todo, kicker: fieldPolicy(z.string().optional(), 'translatable'),
    headline: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().min(1), 'translatable'), cta: link, secondary: link.optional(),
    video: fieldPolicy(z.enum(['showreel', 'bokkenrijders', 'nfl', 'ford', 'puma', 'siemensIndoor']).describe('Schlüssel aus src/lib/videos.ts'), 'shared'),
    videoLabel: fieldPolicy(z.string().optional().describe('Kleine Beschriftung im Rahmen, z. B. "Ford Explorer · Köln"'), 'translatable'),
    poster: image.describe('Standbild bis zum ersten Videobild und bei reduzierter Bewegung'),
    facts: z.array(z.object({ value: businessValueSchema, label: fieldPolicy(z.string().min(1), 'translatable') })).max(4).default([]),
  }),
  z.object({
    // Referenzen als versetzte Geschichten: großes Bild mit Lichtpunkt-Hover, Ort und Datum, Kennzahlen, kurzer Text.
    type: fieldPolicy(z.literal('landingStories'), 'shared'), ...sectionHeading,
    headline: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().optional(), 'translatable'), cta: link.optional(),
    items: z.array(z.object({ kicker: fieldPolicy(z.string().min(1), 'translatable'), title: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().min(1), 'translatable'), image,
      facts: z.array(z.object({ value: businessValueSchema, label: fieldPolicy(z.string().min(1), 'translatable') })).max(3).default([]) })).min(1).max(3),
  }),
  z.object({
    // Ausgewählte Referenzen (Projekte-Sammlung) nach ID, als Karten mit Showvideo wie auf der Startseite.
    type: fieldPolicy(z.literal('landingRefs'), 'shared'), ...sectionHeading,
    headline: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().optional(), 'translatable'), cta: link.optional(),
    projects: z.array(fieldPolicy(z.string().min(1).meta({'x-afe':{reference:{collection:'projects',encoding:'id'}}}), 'shared')).min(1).max(6).describe('Dateinamen aus src/content/projects ohne .md'),
  }),
  z.object({
    // Konfigurator-Teaser mit Kopf, Ziel und Knopfbeschriftung je Anlass.
    type: fieldPolicy(z.literal('landingTeaser'), 'shared'), ...sectionHeading,
    headline: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().optional(), 'translatable'), href: fieldPolicy(z.string().min(1).optional(), 'shared'), cta: fieldPolicy(z.string().optional(), 'translatable'),
    loop: fieldPolicy(z.enum(['marke', 'hochzeit', 'start']).optional().describe('Anlassspezifischer Ablauf des Teasers (Runde 9)'), 'shared'),
  }),
  z.object({
    // Preiskarte: ein Preis groß (aus show-packages.ts, wenn `package` gesetzt; sonst `price`), daneben Gruppen wie ein
    // Kassenzettel, optional ein Bonus (Frühbucher) im Verlauf, darunter Gesichter und Anfrage.
    type: fieldPolicy(z.literal('landingPrice'), 'shared'), ...sectionHeading,
    headline: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().optional(), 'translatable'),
    package: fieldPolicy(z.enum(PACKAGE_NAMES).optional(), 'shared'),
    offer: fieldPolicy(z.literal('indoor').optional().describe('Sonderangebot'), 'shared'),
    customPrice: z.object({prefix:fieldPolicy(z.string().optional(), 'translatable'),amount:fieldPolicy(z.string().min(1), 'translatable')}).strict().optional().describe('Eigener Preis in ausdrücklich getrennten Teilen'),
    unit: fieldPolicy(z.string().optional().describe('Zeile unter dem Preis, z. B. "netto für 20 Drohnen"'), 'translatable'),
    groups: z.array(z.object({ title: fieldPolicy(z.string().min(1), 'translatable'),
      items: z.array(z.object({ label: fieldPolicy(z.string().min(1), 'translatable'), value: businessValueSchema.optional() })).min(1) })).min(1).max(3),
    bonus: z.object({ value: businessValueSchema, text: fieldPolicy(z.string().min(1), 'translatable') }).optional(),
    closing: closingBox.describe('Abschluss unter der Preiskarte'),
  }),
  z.object({
    // Quellen und Konflikte: docs/sicherheitskonzept-quellen.md. Alle Maße kommen aus dem Inhalt.
    // Fünf eindeutige Zonen je Variante halten Zeichnung und nummerierte Erläuterung zusammen.
    type: fieldPolicy(z.literal('landingSite'), 'shared'), ...sectionHeading,
    headline: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().optional(), 'translatable'),
    variant: fieldPolicy(z.enum(['outdoor', 'indoor']), 'shared'),
    safetyRef: fieldPolicy(z.literal('safety-concept').optional().describe('Gemeinsames Outdoor-Sicherheitskonzept'), 'shared'),
    additionalResponsibilities: z.array(responsibilitySchema).max(2).optional().describe('Zusätzliche Aufgaben dieser Seite'),
    diagram: siteDiagramSchema.optional(),
    items: siteItemsSchema.optional(),
    responsibilities: z.array(responsibilitySchema).min(3).max(12).optional(),
    safeguards: z.array(z.object({
      icon: fieldPolicy(z.string().min(1), 'shared'), title: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().min(1), 'translatable'),
    }).strict()).min(1).max(4).optional(),
    download: siteDownloadSchema.optional(),
  }).strict().superRefine((section, ctx) => {
    if(section.variant==='outdoor'){
      if(section.safetyRef!=='safety-concept'||['diagram','items','responsibilities','download'].some(k=>section[k]!==undefined))ctx.addIssue({code:'custom',message:'Outdoor verwendet ausschließlich das gemeinsame Sicherheitskonzept.'});
    }else{
      if(section.safetyRef||section.additionalResponsibilities||!section.diagram||!section.items||!section.responsibilities)ctx.addIssue({code:'custom',message:'Indoor benötigt sein eigenes vollständiges Sicherheitskonzept.'});
      const expected=['ceiling','drones','floor','kit','guests'];
      if(section.items&&(new Set(section.items.map(item=>item.zone)).size!==5||expected.some(zone=>!section.items.some(item=>item.zone===zone))))ctx.addIssue({code:'custom',path:['items'],message:'Jede Indoor-Zone genau einmal'});
    }
  }),
  z.object({
    // Ablauf mit Freigabe-Schranke: Kopf bleibt links stehen, rechts die Schritte am Verlaufsstrahl; der Schritt mit
    // `gate` ist als Freigabe hervorgehoben.
    type: fieldPolicy(z.literal('landingFlow'), 'shared'), ...sectionHeading,
    headline: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().optional(), 'translatable'),
    steps: z.array(z.object({ title: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().min(1), 'translatable'), duration: fieldPolicy(z.string().optional(), 'translatable'),
      gate: fieldPolicy(z.boolean().default(false), 'shared') })).min(2).max(7),
  }),
  z.object({
    // Kacheln mit einer großen Hauptkachel (Bild oder Aussage) und bis zu vier kleineren mit Kennzahl.
    type: fieldPolicy(z.literal('landingBento'), 'shared'), ...sectionHeading,
    headline: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().optional(), 'translatable'),
    // Icon-Kacheln ohne Zeile neben dem Icon (Marc, 01.11.2026: „überall keine Eyebrow, größere Icons“): großes Icon,
    // Überschrift, Text. strict(), damit label/value nicht unbemerkt zurückkommen. Die Zeile über dem Titel gibt es nur
    // noch auf der Bildkachel (z. B. Kund:innen auf dem Foto), nicht neben einem Icon.
    lead: z.object({ label: fieldPolicy(z.string().optional().describe('Nur mit image'), 'translatable'), title: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().optional(), 'translatable'), image: image.optional(),
      icon: fieldPolicy(z.string().optional().describe('Lucide-Name, nur für die Aussage ohne Bild'), 'shared') }).strict()
      .refine((l) => !l.label || l.image, { message: 'label nur auf der Bildkachel, nicht neben einem Icon' }),
    items: z.array(z.object({ icon: fieldPolicy(z.string().min(1).describe('Lucide-Name in kebab-case, z. B. "wind"'), 'shared'), title: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().min(1), 'translatable') }).strict()).min(1).max(4),
    cta: link.optional().describe('Weiterführender Textlink unter dem Raster'),
    closing: closingBox.optional().describe('Abschluss-Kasten mit Gesichtern statt Textlink'),
  }).refine((b) => !(b.cta && b.closing), { message: 'entweder cta (Textlink) oder closing (Abschluss-Kasten)' }),
  z.object({
    // Breites Bild mit Orten oder Einsatzarten als Markierungen, darunter Einträge und Kennzahlen.
    type: fieldPolicy(z.literal('landingSpotlight'), 'shared'), ...sectionHeading,
    headline: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().optional(), 'translatable'), image,
    tags: z.array(keyedText(fieldPolicy(z.string().min(1), 'translatable'))).default([]),
    entries: z.array(z.object({ kicker: fieldPolicy(z.string().min(1), 'translatable'), title: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().optional(), 'translatable') })).default([]),
    facts: z.array(z.object({ value: businessValueSchema, label: fieldPolicy(z.string().min(1), 'translatable') })).max(4).default([]),
  }),
  z.object({
    // Abschluss mit Handlung und den Gesichtern der drei Geschäftsführer:innen.
    // Wie `cta`: ein Knopf, keine Zeile über der Überschrift (Marc, 01.11.2026)
    type: fieldPolicy(z.literal('landingCta'), 'shared'), ...todo,
    headline: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().min(1), 'translatable'), button: link,
  }),
  z.object({
    // Alle Kontaktwege, Besuchs- und Postanschrift mit Icons, daneben das Team (Runde 20, Marc 04.11.2026). Nummern,
    // Adressen und Links kommen aus CONTACT (src/components/people.ts), nicht aus dem Text, damit sie nur an einer Stelle
    // stehen. Ohne Teamfoto erscheinen die Porträts der drei Geschäftsführer:innen.
    type: fieldPolicy(z.literal('contactDetails'), 'shared'), ...sectionHeading,
    headline: fieldPolicy(z.string().min(1), 'translatable'), text: fieldPolicy(z.string().optional(), 'translatable'),
    visitNote: fieldPolicy(z.string().optional().describe('Satz unter der Besuchsadresse, z. B. "Meldet euch vorher kurz an."'), 'translatable'),
    image: image.optional().describe('Teamfoto; ohne Bild die Porträts der Geschäftsführer:innen'),
  }),
  z.object({
    // Anfrage in zwei Schritten (docs/DESIGN.md). Gesichter: ohne Angabe die drei Geschäftsführer:innen.
    type: fieldPolicy(z.literal('contactForm'), 'shared'), ...todo,
    kicker: fieldPolicy(z.string().optional(), 'translatable'),
    headline: fieldPolicy(z.string().min(1), 'translatable'),
    text: fieldPolicy(z.string().optional(), 'translatable'),
    people: z.array(personId).max(4).optional(),
  }),
]);


// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------
export const sectionSchema = keyedSchema(rawSectionSchema, true);
const technical=schema=>fieldPolicy(schema.meta({'x-afe':{visibility:'hidden'}}),'shared');
const proofField=z.object({address:technical(z.string()),sourceFingerprint:technical(z.string().regex(/^[a-f0-9]{64}$/)),targetFingerprint:technical(z.string().regex(/^[a-f0-9]{64}$/))});
const evidenceField=proofField.extend({status:technical(z.enum(['adopted-existing','reviewed','unreviewed']))});
const translationMeta = {
 translationContractVersion:technical(z.literal(2).optional()),
 translationSourceHash:technical(z.string().regex(/^[a-f0-9]{64}$/).optional().describe('Fingerprint des übersetzbaren Quellstands, Vertrag Version 2')),
 translationEvidence:z.object({version:technical(z.literal(2)),addressing:technical(z.literal('stable-keys')),locale:technical(z.enum(['en','nl'])),sourceFingerprint:technical(z.string()),legacy:z.object({provenanceFile:technical(z.string()),migration:technical(z.string())}).optional(),fields:z.array(evidenceField).meta({'x-afe':{array:{insertable:true,removable:true,reorderable:true}}})}).optional().meta({'x-afe':{visibility:'hidden'}}),
 translationReview:z.array(proofField).optional().meta({'x-afe':{visibility:'hidden',array:{insertable:true,removable:true,reorderable:true}}}),
};
export const pageSchema = keyedSchema(z.object({
    ...translationMeta,
    title: fieldPolicy(z.string().min(1), 'translatable'),
    description: fieldPolicy(z.string().refine(text=>{const n=factText(text).length;return n>=50&&n<=160;},'Beschreibung braucht nach Faktenprojektion 50–160 Zeichen'), 'translatable'),
    noindex: fieldPolicy(z.boolean().default(false), 'shared'),
    // Optional preview image for social shares; must come from an approved media host.
    image: fieldPolicy(z.url().optional(), 'shared'),
    navLabel: fieldPolicy(z.string().optional().describe('Kurzer Name in Footer-Listen, z. B. "Hochzeit" (Anlass-Seiten drohnenshow-*)'), 'translatable'),
    sections: z.array(sectionSchema).min(1),
  }));

export const postSchema = keyedSchema(z.object({
    authorId:personId,
    ...translationMeta,
    title: fieldPolicy(z.string().min(1), 'translatable'),
    description: fieldPolicy(z.string().refine(text=>{const n=factText(text).length;return n>=50&&n<=160;},'Beschreibung braucht nach Faktenprojektion 50–160 Zeichen'), 'translatable'),
    date: fieldPolicy(z.coerce.date(), 'shared'),
    updated: fieldPolicy(z.coerce.date().optional(), 'shared'),
    tags: z.array(fieldPolicy(z.string(), 'shared')).default([]),
    cover: image.optional(),
    draft: fieldPolicy(z.boolean().default(false), 'shared'),
    // Herkunft für Nachvollziehbarkeit: Issue-Nummer des Intake, falls vorhanden.
    sourceIssue: fieldPolicy(z.number().int().positive().optional().meta({'x-afe':{group:'Herkunft'}}), 'shared'),
  }));

export const projectSchema = keyedSchema(z.object({
    ...translationMeta,
    title: fieldPolicy(z.string().min(1), 'translatable'),
    client: z.union([fieldPolicy(z.string(), 'translatable'),projectFactRefSchema]).optional().meta({'x-afe':{group:'Showdaten'}}),
    showcase: projectShowcaseSchema.optional().meta({'x-afe':{group:'Fallstudie'}}),
    date: z.union([projectFactRefSchema,fieldPolicy(z.coerce.date(), 'shared')]),
    location: z.union([fieldPolicy(z.string(), 'translatable'),projectFactRefSchema]).optional().meta({'x-afe':{group:'Showdaten'}}),
    // Für den Referenzen-Filter; an jeder Referenz, nicht nur an Fallstudien. Unbekannt: weglassen.
    occasion: fieldPolicy(z.enum(REFERENCE_OCCASION_IDS).optional()
      .describe('firma = Marken & Unternehmen, stadt = Städte & Festivals, kultur = Kultur & Bühne, privat = Hochzeit & Privat'), 'shared'),
    drones: z.union([fieldPolicy(z.number().int().positive(), 'shared'),projectFactRefSchema]).optional().describe('Drohnen in der Show'),
    summary: fieldPolicy(z.string().min(30).max(200).meta({'x-afe':{group:'Projektkarte'}}), 'translatable'),
    cover: image.optional(),
    featured: fieldPolicy(z.boolean().default(false).meta({'x-afe':{group:'Veröffentlichung'}}), 'shared'),
    draft: fieldPolicy(z.boolean().default(false), 'shared'),
    sourceIssue: fieldPolicy(z.number().int().positive().optional().meta({'x-afe':{group:'Herkunft'}}), 'shared'),
  }));

export const faqSchema = keyedSchema(z.object({
    ...translationMeta,
    question: fieldPolicy(z.string().min(5), 'translatable'),
    tags: z.array(fieldPolicy(z.string(), 'shared')).default([]),
    order: fieldPolicy(z.number().int().default(100), 'shared'),
    draft: fieldPolicy(z.boolean().default(false), 'shared'),
    sourceIssue: fieldPolicy(z.number().int().positive().optional().meta({'x-afe':{group:'Herkunft'}}), 'shared'),
  }));

export const contentSchemas = { pages: pageSchema, posts: postSchema, projects: projectSchema, faq: faqSchema };

// Lists are edited through their existing Zod constraints. One traversal supplies the editor's
// capabilities for every present and future nested list, without a second section/field catalogue.
const editorialNodes=new Set();
function editorialLists(schema,key) {
 if(!schema?._def||editorialNodes.has(schema))return;
 editorialNodes.add(schema);
 if(!schema.description&&key&&schema._def.type!=='object'&&schema._def.type!=='union')z.globalRegistry.add(schema,{...schema.meta(),description:key.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,letter=>letter.toUpperCase())});
 if(schema._def.type==='array')z.globalRegistry.add(schema,{...schema.meta(),'x-afe':{...schema.meta()?.['x-afe'],array:{...(schema._def.element===sectionSchema?{role:'blocks',discriminator:'type'}:{}),insertable:true,removable:true,reorderable:true,...schema.meta()?.['x-afe']?.array}}});
 const def=schema._def;
 if(schema.shape)Object.entries(schema.shape).forEach(([name,child])=>editorialLists(child,name));
 if(schema.options)schema.options.forEach(child=>editorialLists(child,key));
 if(def.innerType)editorialLists(def.innerType,key);
 if(def.element)editorialLists(def.element,key);
 if(def.items)def.items.forEach(child=>editorialLists(child,key));
}
for(const [directory,schema]of Object.entries(contentSchemas)){z.globalRegistry.add(schema,{...schema.meta(),'x-afe':{...schema.meta()?.['x-afe'],collection:{label:directory,title:[directory==='faq'?'question':'title'],operations:['update']}}});editorialLists(schema);}
