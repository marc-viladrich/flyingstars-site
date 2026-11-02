import { z } from 'zod';
import {imageSource,imageMetadata} from './media.mjs';
import { projectShowcaseSchema } from './project-showcase.mjs';

// ---------------------------------------------------------------------------
// Sections: die einzige Stelle, an der neue Section-Typen registriert werden.
// Jede Section hat genau einen Typ, typisierte Props und eine Komponente in
// src/components/sections/. Der Agent darf Seiten nur aus diesen Typen bauen.
// ---------------------------------------------------------------------------
const link = z.object({ label: z.string().min(1), href: z.string().min(1) });
// Abschluss-Kasten (CtaBox.astro): immer Überschrift, Text und genau ein Knopf, dazu die Gesichter (Marc, 02.11.2026:
// „solche empty-looking CTAs darf es niemals geben. Immer ein Heading und ein Text dazu“)
const closingBox = z.object({ headline: z.string().min(1), text: z.string().min(1), button: link }).strict();
// Section-Köpfe (docs/DESIGN.md): Kicker in Orange über der Headline, einspaltig; `text` ist der optionale Satz darunter.
// Headlines dürfen einzelne Begriffe mit *Sternchen* markieren, sie erscheinen dann im Logoverlauf.
// Kicker sind seit 31.10.2026 wieder sichtbar (Marc: „die Eyebrow-Headings brauchen Farbe“, wie im Vercel-Prototyp).
const legacy = z.string().optional().describe('Veraltet, wird nicht mehr angezeigt');
const sectionHeading = { id: z.string().optional(), kicker: z.string().optional().describe('Kicker über der Headline, z. B. "Anlässe"') };
const brandPath = z.string().regex(/^\/brand\/[a-z0-9/._-]+\.(svg|png|webp)$/).describe('Lokale Datei unter public/brand/');

const image = z.object({
  src: imageSource,
  alt: z.string().min(1).describe('Pflicht. Leerer Alt-Text nur für Dekoration, dann alt: ""'),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
}).meta(imageMetadata);

export const sectionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('showreelHero'),
    headline: z.string().min(1), text: z.string().min(1), eyebrow: z.string().optional().describe('Kicker über der Headline'),
    words: z.array(z.string().min(1)).optional().describe('Wechselndes Wort im Verlauf hinter der Headline'),
    cta: link, secondary: link.optional(),
    poster: image, video: z.url(), stats: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  }),
  z.object({
    type: z.literal('occasions'), ...sectionHeading,
    headline: z.string().min(1), text: z.string().optional(),
    cards: z.array(z.object({ category: z.string().optional(), title: z.string(), text: z.string(), image,
      facts: z.array(z.string()).optional(), cta: link, download: link.optional(),
      season: z.array(z.number().int().min(1).max(12)).optional().describe('Monate, in denen die Karte nach vorn rückt (z. B. [11, 12] für Silvester)') })).min(1),
  }),
  z.object({
    type: z.literal('metrics'), ...sectionHeading,
    headline: z.string().min(1), text: z.string().optional(),
    items: z.array(z.object({ label: z.string(), value: z.string().optional(), text: z.string() })).min(1),
    cta: link.optional(),
  }),
  z.object({
    type: z.literal('sustainability'), ...sectionHeading,
    // Nachhaltigkeit in 2D (keine Scrollstory): Kopf, optional bis zu vier Kennzahlen, optional Sätze, optional Beleg.
    headline: z.string().min(1), text: z.string().optional(),
    facts: z.array(z.object({ label: z.string(), value: z.string(), unit: z.string().optional(),
      text: z.string(), tone: legacy.describe('Veraltet (Kontur/Verlauf), wird ignoriert') })).max(4).optional(),
    points: z.array(z.string().min(1)).optional().describe('Kurze, belegbare Sätze, je einer pro Punkt'),
    pillars: z.array(z.object({ icon: z.enum(['eu', 'repair', 'ev', 'campaign', 'leaf']), title: z.string().min(1), text: z.string().min(1) })).max(4).optional()
      .describe('Vier belegbare Punkte unter der Scrollstory, je mit großem Icon (Marc 31.10.: Raster statt Kasten)'),
    proofImage: image.optional(), proofText: z.string().optional(), campaign: z.string().optional(),
    lines: z.array(z.string()).optional().describe('Veraltet (dreizeiliger Titel der Scrollstory), wird nicht mehr angezeigt'),
  }),
  z.object({
    type: z.literal('hero'), kicker: z.string().optional(),
    headline: z.string().min(1),
    text: z.string().optional(),
    image: image.optional(),
    cta: link.optional(),
    secondary: link.optional(),
  }),
  z.object({
    type: z.literal('textMedia'), id: z.string().optional().describe('Sprungmarke, z. B. "geschichte"'), kicker: z.string().optional(),
    headline: z.string().min(1),
    body: z.string().min(1).describe('Markdown erlaubt').meta({'x-afe': {format: 'markdown'}}),
    image: image.optional(),
    mediaSide: z.enum(['left', 'right']).default('right'),
  }),
  z.object({
    type: z.literal('faq'), ...sectionHeading,
    text: z.string().optional(), cta: link.optional(), openFirst: z.boolean().default(false),
    headline: z.string().optional(),
    tags: z.array(z.string()).optional().describe('Nur FAQ-Einträge mit einem dieser Tags (ohne groups)'),
    limit: z.number().int().positive().optional(),
    groups: z.array(z.object({
      id: z.string().regex(/^[a-z0-9-]+$/).optional().describe('Sprungmarke, z. B. "planung"'),
      headline: z.string().min(1),
      tags: z.array(z.string()).min(1).describe('FAQ-Einträge mit einem dieser Tags'),
    })).optional().describe('Fragen in Gruppen; ersetzt tags/limit'),
    closing: z.object({
      headline: z.string().min(1),
      text: z.string().min(1),
      image: image.optional().describe('Foto der drei Geschäftsführer:innen; ohne Bild erscheinen ihre drei Porträts'),
    }).optional().describe('Abschluss mit Anrufen/Schreiben'),
  }),
  z.object({
    // Abschluss-CTA: genau ein Knopf, keine Zeile über der Überschrift (Marc, 01.11.2026: „keine multiplen CTAs“)
    type: z.literal('cta'),
    headline: z.string().min(1),
    text: z.string().min(1),
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
    rowHeader: z.string().optional().describe('Beschriftung der ersten Spalte'),
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
    // Kund:innen als Laufband, darunter optional Presse und „Qualität und Sicherheit“ (docs/DESIGN.md, Studie 6).
    type: z.literal('logoBar'), ...sectionHeading,
    headline: z.string().optional().describe('Name des Laufbands für Screenreader, z. B. "Kund:innen von FlyingStars"'),
    press: legacy.describe('Veraltet (Textzeile „Bekannt aus“), ersetzt durch pressItems'),
    logos: z.array(z.object({
      name: z.string().min(1),
      file: brandPath.optional().describe('Bevorzugt: weißes SVG unter /brand/logos/'),
      image: image.optional().describe('Sonst Live-PNG vom Medienspeicher'),
      detail: z.boolean().default(false).describe('PNG mit dunklen Innendetails (Bentley): nicht weiß einfärben'),
      href: z.string().min(1).optional(),
      tall: z.boolean().default(false).describe('Veraltet: die optische Größe wird berechnet'),
    })).default([]),
    pressHeadline: z.string().optional(),
    pressItems: z.array(z.object({
      name: z.string().min(1),
      logo: brandPath.optional(),
      cleared: z.boolean().default(false).describe('Schriftliche Freigabe für das Logo liegt vor; sonst erscheint der Name als Text'),
      knock: z.boolean().default(false).describe('Logo mit ausgesparter Schrift (ZDF, ntv)'),
      href: z.url().optional().describe('Beitrag, falls öffentlich'),
      note: z.string().optional().describe('Kurzinfo als Tooltip, z. B. Sendung'),
    })).default([]),
    qualityHeadline: z.string().optional(),
    quality: z.array(z.object({
      title: z.string().min(1), text: z.string().optional(),
      icon: z.enum(['permit', 'sound', 'shield', 'leaf']).describe('Verlaufs-Icon, wenn kein freigegebenes Logo'),
      logo: brandPath.optional(),
      cleared: z.boolean().default(false).describe('Logo darf gezeigt werden (LBA-Signet gemeinfrei; naturstrom nur nach Freigabe)'),
      secondary: z.boolean().default(false).describe('Nachrangig: klein als Textzeile unter den Logos (Marc 31.10.: TÜV-Gutachten, Haftpflicht)'),
    })).default([]),
  }),
  z.object({
    // Alle Referenzen (Projekte-Sammlung) mit Filter nach Anlass, Jahr und Drohnenzahl. Ohne JS: Abschnitte je Anlass
    // mit Sprunglinks; mit JS: eine Liste mit Filter-Radiogruppen und Statusansage. Fallstudien verlinken auf ihre Seite.
    type: z.literal('references'), ...sectionHeading,
    headline: z.string().min(1), text: z.string().optional(),
    filters: z.array(z.enum(['occasion', 'year', 'drones'])).default(['occasion', 'year', 'drones']),
  }),
  z.object({
    // Meilensteine als ruhige Liste (kein Schwarm). Wiederholte Jahreszahlen werden nur einmal gezeigt.
    type: z.literal('timeline'), ...sectionHeading,
    headline: z.string().min(1), text: z.string().optional(),
    items: z.array(z.object({ when: z.string().min(1), title: z.string().min(1), text: z.string().optional() })).min(2),
  }),
  z.object({
    // Die drei Pakete. Preis und Drohnenzahl kommen nur aus src/content/show-packages.ts, Texte aus dem YAML.
    type: z.literal('packages'), ...sectionHeading,
    headline: z.string().min(1), text: z.string().optional(),
    note: z.string().optional().describe('Kleingedrucktes unter den Karten'),
    cta: link.optional(),
    compact: z.boolean().default(false).describe('Kurzfassung (Startseite): Name, Preis, Drohnen, eine Zeile'),
    items: z.array(z.object({
      name: z.enum(['SPARK', 'HORIZON', 'ODYSSEY']),
      label: z.string().optional().describe('z. B. "Klassisch in 2D"'),
      badge: z.string().optional().describe('z. B. "Am häufigsten gebucht"'),
      highlight: z.boolean().default(false),
      sky: z.string().optional().describe('Am Himmel'),
      care: z.string().optional().describe('Betreuung'),
      typical: z.string().optional().describe('Typisch für'),
      points: z.array(z.string()).max(4).optional().describe('Kernpunkte auf der Kurzfassung (Startseite), die Drohnenzahl steht automatisch davor'),
    })).default([{ name: 'SPARK', highlight: false }, { name: 'HORIZON', highlight: false }, { name: 'ODYSSEY', highlight: false }]),
  }),
  z.object({
    // Konfigurator-Teaser (Startseite): Anlass-Chips und Drohnen-Regler, Übergabe an den Konfigurator auf der Preisseite.
    type: z.literal('configuratorTeaser'), ...sectionHeading,
    headline: z.string().min(1), text: z.string().optional(),
    occasion: z.string().optional().describe('Anlass beim Laden, ID aus content/show-configurator.js'),
    drones: z.number().int().positive().optional(),
  }),
  z.object({
    // Ablauf in Zahlen (Marc, 31.10.2026): statt nummerierter Schritte ein Zeitstrahl von der Anfrage bis zum Showabend,
    // der zeigt, wie schnell es gehen kann; darunter Kennzahlen aus „In Zahlen statt in Adjektiven“.
    type: z.literal('tempo'), ...sectionHeading,
    headline: z.string().min(1), text: z.string().optional(),
    marks: z.array(z.object({ value: z.string().min(1), label: z.string().min(1), text: z.string().optional() })).min(2).max(5),
    shortcut: z.object({ value: z.string().min(1), label: z.string().min(1), text: z.string().optional() }).optional()
      .describe('Abkürzung über dem Zeitstrahl, z. B. Express: verbindet den ersten mit dem letzten Punkt, gestrichelt'),
    facts: z.array(z.object({ value: z.string().min(1), label: z.string().min(1), text: z.string().optional() })).default([]),
    note: z.string().optional(),
  }),
  // --- Anlass-Landingpages (Marc, 31.10.2026: „deutlich mehr in dieses Interaktive … mehr Variation in den Layouts“).
  // Komponenten unter src/components/landing/. Kennzahlen überall als { value, label, text? }.
  z.object({
    // Seitenkopf mit kleinem Showreel im Bildrahmen: stumm, Loop, startet erst im Bild (ab 701 px automatisch, auf dem
    // Handy per Knopf), pausiert bei globaler Pause und reduzierter Bewegung. Nur registrierte Videos (src/lib/videos.ts).
    type: z.literal('landingHero'), kicker: z.string().optional(),
    headline: z.string().min(1), text: z.string().min(1), cta: link, secondary: link.optional(),
    video: z.enum(['showreel', 'bokkenrijders', 'nfl', 'ford', 'puma', 'siemensIndoor']).describe('Schlüssel aus src/lib/videos.ts'),
    videoLabel: z.string().optional().describe('Kleine Beschriftung im Rahmen, z. B. "Ford Explorer · Köln"'),
    poster: image.describe('Standbild bis zum ersten Videobild und bei reduzierter Bewegung'),
    facts: z.array(z.object({ value: z.string().min(1), label: z.string().min(1) })).max(4).default([]),
  }),
  z.object({
    // Referenzen als versetzte Geschichten: großes Bild mit Lichtpunkt-Hover, Ort und Datum, Kennzahlen, kurzer Text.
    type: z.literal('landingStories'), ...sectionHeading,
    headline: z.string().min(1), text: z.string().optional(), cta: link.optional(),
    items: z.array(z.object({ kicker: z.string().min(1), title: z.string().min(1), text: z.string().min(1), image,
      facts: z.array(z.object({ value: z.string().min(1), label: z.string().min(1) })).max(3).default([]) })).min(1).max(3),
  }),
  z.object({
    // Ausgewählte Referenzen (Projekte-Sammlung) nach ID, als Karten mit Showvideo wie auf der Startseite.
    type: z.literal('landingRefs'), ...sectionHeading,
    headline: z.string().min(1), text: z.string().optional(), cta: link.optional(),
    projects: z.array(z.string().min(1).meta({'x-afe':{reference:{collection:'projects',encoding:'id'}}})).min(1).max(6).describe('Dateinamen aus src/content/projects ohne .md'),
  }),
  z.object({
    // Konfigurator-Teaser mit Kopf, Ziel und Knopfbeschriftung je Anlass.
    type: z.literal('landingTeaser'), ...sectionHeading,
    headline: z.string().min(1), text: z.string().optional(), href: z.string().min(1).optional(), cta: z.string().optional(),
    loop: z.enum(['marke', 'hochzeit', 'start']).optional().describe('Anlassspezifischer Ablauf des Teasers (Runde 9)'),
  }),
  z.object({
    // Preiskarte: ein Preis groß (aus show-packages.ts, wenn `package` gesetzt; sonst `price`), daneben Gruppen wie ein
    // Kassenzettel, optional ein Bonus (Frühbucher) im Verlauf, darunter Gesichter und Anfrage.
    type: z.literal('landingPrice'), ...sectionHeading,
    headline: z.string().min(1), text: z.string().optional(),
    package: z.enum(['SPARK', 'HORIZON', 'ODYSSEY']).optional(),
    price: z.string().optional().describe('Nur ohne package, z. B. "ab ca. 15.000 €"'),
    unit: z.string().optional().describe('Zeile unter dem Preis, z. B. "netto für 20 Drohnen"'),
    groups: z.array(z.object({ title: z.string().min(1),
      items: z.array(z.object({ label: z.string().min(1), value: z.string().optional() })).min(1) })).min(1).max(3),
    bonus: z.object({ value: z.string().min(1), text: z.string().min(1) }).optional(),
    closing: closingBox.describe('Abschluss unter der Preiskarte'),
  }),
  z.object({
    // Quellen und Konflikte: docs/sicherheitskonzept-quellen.md. Alle Maße kommen aus dem Inhalt.
    // Fünf eindeutige Zonen je Variante halten Zeichnung und nummerierte Erläuterung zusammen.
    type: z.literal('landingSite'), ...sectionHeading,
    headline: z.string().min(1), text: z.string().optional(),
    variant: z.enum(['outdoor', 'indoor']),
    diagram: z.object({
      description: z.string().min(1), caption: z.string().min(1),
      horizontalLabel: z.string().min(1), verticalLabel: z.string().min(1),
      detailLabel: z.string().min(1), flightLabel: z.string().min(1),
    }).strict(),
    items: z.array(z.object({
      title: z.string().min(1), text: z.string().min(1), value: z.string().optional(),
      zone: z.enum(['safety', 'operative', 'start', 'drones', 'guests', 'ceiling', 'floor', 'kit']),
    }).strict()).length(5),
    responsibilities: z.object({
      provider: z.array(z.string().min(1)).min(1),
      customer: z.array(z.string().min(1)).min(1),
    }).strict(),
    safeguards: z.array(z.object({
      icon: z.string().min(1), title: z.string().min(1), text: z.string().min(1),
    }).strict()).min(1).max(4).optional(),
    planning: z.object({ title: z.string().min(1), text: z.string().min(1) }).strict().optional(),
    note: z.object({ value: z.string().min(1), text: z.string().min(1) }).strict().optional(),
    download: link.strict().optional(),
  }).strict().superRefine((section, ctx) => {
    const expected = section.variant === 'outdoor'
      ? ['safety', 'operative', 'drones', 'start', 'guests']
      : ['ceiling', 'drones', 'floor', 'kit', 'guests'];
    if (new Set(section.items.map((item) => item.zone)).size !== expected.length ||
        expected.some((zone) => !section.items.some((item) => item.zone === zone))) {
      ctx.addIssue({ code: 'custom', path: ['items'], message: `Jede Zone genau einmal: ${expected.join(', ')}` });
    }
  }),
  z.object({
    // Ablauf mit Freigabe-Schranke: Kopf bleibt links stehen, rechts die Schritte am Verlaufsstrahl; der Schritt mit
    // `gate` ist als Freigabe hervorgehoben.
    type: z.literal('landingFlow'), ...sectionHeading,
    headline: z.string().min(1), text: z.string().optional(),
    steps: z.array(z.object({ title: z.string().min(1), text: z.string().min(1), duration: z.string().optional(),
      gate: z.boolean().default(false) })).min(2).max(7),
  }),
  z.object({
    // Kacheln mit einer großen Hauptkachel (Bild oder Aussage) und bis zu vier kleineren mit Kennzahl.
    type: z.literal('landingBento'), ...sectionHeading,
    headline: z.string().min(1), text: z.string().optional(),
    // Icon-Kacheln ohne Zeile neben dem Icon (Marc, 01.11.2026: „überall keine Eyebrow, größere Icons“): großes Icon,
    // Überschrift, Text. strict(), damit label/value nicht unbemerkt zurückkommen. Die Zeile über dem Titel gibt es nur
    // noch auf der Bildkachel (z. B. Kund:innen auf dem Foto), nicht neben einem Icon.
    lead: z.object({ label: z.string().optional().describe('Nur mit image'), title: z.string().min(1), text: z.string().optional(), image: image.optional(),
      icon: z.string().optional().describe('Lucide-Name, nur für die Aussage ohne Bild') }).strict()
      .refine((l) => !l.label || l.image, { message: 'label nur auf der Bildkachel, nicht neben einem Icon' }),
    items: z.array(z.object({ icon: z.string().min(1).describe('Lucide-Name in kebab-case, z. B. "wind"'), title: z.string().min(1), text: z.string().min(1) }).strict()).min(1).max(4),
    cta: link.optional().describe('Weiterführender Textlink unter dem Raster'),
    closing: closingBox.optional().describe('Abschluss-Kasten mit Gesichtern statt Textlink'),
  }).refine((b) => !(b.cta && b.closing), { message: 'entweder cta (Textlink) oder closing (Abschluss-Kasten)' }),
  z.object({
    // Breites Bild mit Orten oder Einsatzarten als Markierungen, darunter Einträge und Kennzahlen.
    type: z.literal('landingSpotlight'), ...sectionHeading,
    headline: z.string().min(1), text: z.string().optional(), image,
    tags: z.array(z.string().min(1)).default([]),
    entries: z.array(z.object({ kicker: z.string().min(1), title: z.string().min(1), text: z.string().optional() })).default([]),
    facts: z.array(z.object({ value: z.string().min(1), label: z.string().min(1) })).max(4).default([]),
  }),
  z.object({
    // Abschluss mit Handlung und den Gesichtern der drei Geschäftsführer:innen.
    // Wie `cta`: ein Knopf, keine Zeile über der Überschrift (Marc, 01.11.2026)
    type: z.literal('landingCta'),
    headline: z.string().min(1), text: z.string().min(1), button: link,
  }),
  z.object({
    // Anfrage in zwei Schritten (docs/DESIGN.md). Gesichter: ohne Angabe die drei Geschäftsführer:innen.
    type: z.literal('contactForm'),
    kicker: z.string().optional(),
    headline: z.string().min(1),
    text: z.string().optional(),
    people: z.array(z.object({ name: z.string().min(1), image })).max(4).optional(),
  }),
]);


// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------
const translationMeta = { translationSourceHash: z.string().regex(/^[a-f0-9]{64}$/).optional().describe('SHA-256 der deutschen Quelldatei zum Übersetzungszeitpunkt') };
export const pageSchema = z.object({
    ...translationMeta,
    title: z.string().min(1),
    description: z.string().min(50).max(160),
    noindex: z.boolean().default(false),
    // Optional preview image for social shares; must come from an approved media host.
    image: z.url().optional(),
    navLabel: z.string().optional().describe('Kurzer Name in Footer-Listen, z. B. "Hochzeit" (Anlass-Seiten drohnenshow-*)'),
    sections: z.array(sectionSchema).min(1),
  });

export const postSchema = z.object({
    ...translationMeta,
    title: z.string().min(1),
    description: z.string().min(50).max(160),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    cover: image.optional(),
    draft: z.boolean().default(false),
    // Herkunft für Nachvollziehbarkeit: Issue-Nummer des Intake, falls vorhanden.
    sourceIssue: z.number().int().positive().optional().meta({'x-afe':{group:'Herkunft'}}),
  });

export const projectSchema = z.object({
    ...translationMeta,
    title: z.string().min(1),
    client: z.string().optional().meta({'x-afe':{group:'Showdaten'}}),
    showcase: projectShowcaseSchema.optional().meta({'x-afe':{group:'Fallstudie'}}),
    date: z.coerce.date(),
    location: z.string().optional().meta({'x-afe':{group:'Showdaten'}}),
    // Für den Referenzen-Filter; an jeder Referenz, nicht nur an Fallstudien. Unbekannt: weglassen.
    occasion: z.enum(['firma', 'stadt', 'kultur', 'privat', 'indoor', 'sonstiges']).optional()
      .describe('firma = Marken & Unternehmen, stadt = Städte & Festivals, kultur = Kultur & Bühne, privat = Hochzeit & Privat'),
    drones: z.number().int().positive().optional().describe('Drohnen in der Show'),
    summary: z.string().min(30).max(200).meta({'x-afe':{group:'Projektkarte'}}),
    cover: image.optional(),
    featured: z.boolean().default(false).meta({'x-afe':{group:'Veröffentlichung'}}),
    draft: z.boolean().default(false),
    sourceIssue: z.number().int().positive().optional().meta({'x-afe':{group:'Herkunft'}}),
  });

export const faqSchema = z.object({
    ...translationMeta,
    question: z.string().min(5),
    tags: z.array(z.string()).default([]),
    order: z.number().int().default(100),
    draft: z.boolean().default(false),
    sourceIssue: z.number().int().positive().optional().meta({'x-afe':{group:'Herkunft'}}),
  });

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
