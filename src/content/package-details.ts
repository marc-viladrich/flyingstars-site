/** Texts of the pricing page (30.10.2026, from the Elevate branch): package cards, the comparison and extras.
 * The price questions live in the FAQ collection (tag `preise`), so the FAQ page and the pricing page share them.
 * Prices and drone counts come only from show-packages.ts. Facts follow the FlyingStars questionnaire of 21.10.2026:
 * no duration per package, 40 % deposit, cancellation scale from the AGB, extras as confirmed there. */
import { SHOW_PACKAGES, type ShowPackage } from './show-packages';

const money = (v: number) => v.toLocaleString('de-DE');

/** One line above all packages; the questionnaire: "Es gibt keine Dauer je Paket." */
export const SHOW_DURATION = 'Eine Show dauert in der Regel ca. 13 Minuten, bis 25 Minuten sind möglich. Das gilt für jedes Paket.';

export interface PackageDetail {
  /** Short name of the step, the same as in the live preview. */
  label: string;
  /** "Am Himmel": what the audience sees. */
  sky: string;
  /** "Betreuung": what working with FlyingStars looks like. */
  care: string;
  /** "Typisch für": typical occasions. */
  typical: string;
  /** Quiet line on the card, only where FlyingStars confirmed it ("Am häufigsten verkaufen wir Horizon"). */
  often?: string;
}

export const PACKAGE_DETAILS: Record<ShowPackage, PackageDetail> = {
  SPARK: {
    label: 'Klassisch in 2D',
    sky: 'Formationen in 2D aus unserem Katalog, bis zu vier eigene Elemente',
    care: 'Eure eigenen Elemente vorab zur Freigabe, GEMA-freie Musik',
    typical: 'Hochzeit, Jubiläum, kleinere Firmenfeier',
  },
  HORIZON: {
    label: '3D in Bewegung',
    sky: 'Alles aus SPARK, dazu eigene 2D-Animationen, einfache 3D-Objekte und euer Logo präzise',
    care: 'Kreativ-Workshop mit Storyboard, Videovorschau mit Feedback, synchron zu eurer Wunschmusik',
    typical: 'Produktpräsentation, Firmenevent, Stadtfest',
    often: 'Bestseller',
  },
  ODYSSEY: {
    label: 'Erzählte 3D-Show',
    sky: 'Alles aus HORIZON, dazu 3D-Animation mit Storyline und volumetrische Effekte',
    care: 'Mehrere Feedbackrunden, eigene Projektleitung, Rohmaterial-Video, Timecode möglich',
    typical: 'Kampagne, Festival, Großveranstaltung',
  },
};

/** Drohnenzahl je Paket in einer Zeile, für Paketkarten und Vergleich (Marc, 01.11.2026: „ab 200 Drohnen“ statt
 * „200 Drohnen, mehr möglich“). SPARK hat eine Obergrenze, HORIZON und ODYSSEY nicht. */
export function dronesLine(name: ShowPackage): string {
  const p = SHOW_PACKAGES[name];
  return Number.isFinite(p.max) ? `${p.base} bis ${p.max} Drohnen` : `ab ${p.base} Drohnen`;
}

/** Kernpunkte der Paket-Kurzfassung (Startseite und Anlass-Seiten zeigen dieselbe Vorschau, Marc 01.11.2026). Die
 * Drohnenzahl steht als eigene Zeile davor (dronesLine). Eine Seite kann im YAML eigene `points` setzen. */
export const PACKAGE_POINTS: Record<ShowPackage, string[]> = {
  SPARK: ['Formationen aus unserem Katalog', 'Bis zu vier eigene Elemente, z. B. Initialen oder Logo', 'GEMA-freie Musik'],
  HORIZON: ['Eigene 2D-Animationen und einfaches 3D', 'Euer Logo präzise am Himmel', 'Synchron zu eurer Wunschmusik'],
  ODYSSEY: ['Storyline mit dramaturgischer Kurve', 'Komplexe 3D-Animationen', 'Eigene Projektleitung'],
};

/** Paketkarten der Preisseite im Aufbau des Vercel-Prototyps (Marc, 31.10.2026: „besser strukturiert mit diesen Bullet
 * Points, die auch farbig sind“): Kurzbeschreibung, dann Gruppen Design & Inhalt / Musik / Service & Extras. Inhalte aus
 * der Vergleichstabelle unten (Fragebogen 21.10.), ab HORIZON nur was dazukommt („Alles aus SPARK, plus:“). */
export interface PackageFeatures { tag: string; badge: string; plus?: string; groups: { title: string; items: string[] }[] }
export const PACKAGE_FEATURES: Record<ShowPackage, PackageFeatures> = {
  SPARK: {
    tag: 'Der funkelnde Einstieg für Hochzeiten, Jubiläen und kleinere Firmen- und Kulturfeiern.',
    badge: 'Einstieg',
    groups: [
      { title: 'Design & Inhalt', items: ['Formationen aus unserem Katalog, z. B. Herzen oder Ringe', 'Bis zu vier eigene Elemente: Initialen, Logo, Stadtwappen'] },
      { title: 'Musik', items: ['GEMA-freie Musik', 'GEMA-Musik bei Anmeldung der Veranstaltung möglich'] },
      { title: 'Service & Extras', items: ['Eigene Elemente vorab zur Freigabe', 'Standard-Genehmigungsverfahren', 'Team vor Ort, Sicherheitskonzept und Haftpflicht'] },
    ],
  },
  HORIZON: {
    tag: 'Die eigene Inszenierung für Produktpräsentationen, große Firmenevents und Stadtfeste.',
    badge: 'Bestseller',
    plus: 'Alles aus SPARK, plus:',
    groups: [
      { title: 'Design & Inhalt', items: ['Vollständig individuelle 2D-Animationen und einfache 3D-Elemente', 'Präzise Logos und komplexe Schriftzüge'] },
      { title: 'Musik', items: ['Synchron zu eurer Wunschmusik'] },
      { title: 'Service & Extras', items: ['Kreativ-Workshop mit Storyboard', 'Auch komplexere Genehmigungen, z. B. in Flughafennähe', 'Videovorschau mit Feedbackschleife', 'Hilfe bei der Zustimmung der Grundstückseigentümer:innen'] },
    ],
  },
  ODYSSEY: {
    tag: 'Die erzählte Show für große Kampagnen, Festivals und Events mit viel Publikum.',
    badge: 'ab 300 Drohnen',
    plus: 'Alles aus HORIZON, plus:',
    groups: [
      { title: 'Design & Inhalt', items: ['Komplexe 3D-Animationen und volumetrische Effekte', 'Erzählte Show mit dramaturgischer Kurve'] },
      { title: 'Musik', items: ['Timecode-Synchronisation vor Ort möglich'] },
      { title: 'Service & Extras', items: ['Mehrere Feedbackschleifen', 'Eigene Projektleitung', 'Video der Show (Rohaufnahmen)', 'Auf Wunsch Vor-Ort-Termin vorab'] },
    ],
  },
};

/** "+900 € je 10 Drohnen, bis 150 Drohnen", built from the price table so it can never drift. */
export function addOnLine(name: ShowPackage): string {
  const p = SHOW_PACKAGES[name];
  return `+${money(p.add)} € je ${p.step} Drohnen${Number.isFinite(p.max) ? `, bis ${p.max} Drohnen` : ''}`;
}

/** Comparison "Alle Leistungen". A cell of `null` means: not part of this package, `true`: included (checkmark, wie auf
 * SaaS-Preisseiten; Marc 31.10.2026: was überall drin ist, gehört als Häkchen in die Tabelle, nicht in eine Fußnote).
 * `all` spans the three packages. */
export type Cell = string | null | true;
export interface Row { label: string; cells?: [Cell, Cell, Cell]; all?: string }
export const COMPARISON: Row[] = [
  { label: 'Drohnen', cells: [
    dronesLine('SPARK'),
    dronesLine('HORIZON'),
    dronesLine('ODYSSEY'),
  ] },
  { label: 'Mehr Drohnen', cells: [
    `+${money(SHOW_PACKAGES.SPARK.add)} € je ${SHOW_PACKAGES.SPARK.step}`,
    `+${money(SHOW_PACKAGES.HORIZON.add)} € je ${SHOW_PACKAGES.HORIZON.step}`,
    `+${money(SHOW_PACKAGES.ODYSSEY.add)} € je ${SHOW_PACKAGES.ODYSSEY.step}`,
  ] },
  { label: 'Dauer', all: 'In der Regel ca. 13 Minuten, bis 25 Minuten möglich' },
  { label: 'Design und Motive', cells: ['Formationen aus unserem Katalog, z. B. Herzen oder Ringe', 'Vollständig individuelle 2D-Animationen', 'Wie HORIZON, dazu komplexe 3D-Animationen'] },
  { label: 'Eigene Elemente', cells: ['Bis zu vier, z. B. Initialen, Logo, Stadtwappen', 'Präzise Logos und komplexe Schriftzüge', 'Wie HORIZON'] },
  { label: '3D', cells: [null, 'Einfache 3D-Elemente', 'Komplexe 3D-Animationen und volumetrische Effekte'] },
  { label: 'Storytelling', cells: [null, null, 'Erzählte Show mit dramaturgischer Kurve'] },
  { label: 'Musik', cells: ['GEMA-freie Musik, GEMA-Musik bei Anmeldung der Veranstaltung möglich', 'Synchron zu eurer Wunschmusik', 'Wie HORIZON, Timecode-Synchronisation vor Ort möglich'] },
  { label: 'Freigabe und Vorschau', cells: ['Eure eigenen Elemente vorab zur Freigabe', 'Videovorschau mit Feedbackschleife', 'Mehrere Feedbackschleifen'] },
  { label: 'Kreativ-Workshop', cells: [null, 'Mit Storyboard', 'Mit Storyboard'] },
  { label: 'Sicherheitskonzept', cells: [true, true, true] },
  { label: 'Haftpflicht bis 1,3 Mio. €', cells: [true, true, true] },
  { label: 'Team vor Ort', cells: [true, true, true] },
  { label: 'Genehmigung', cells: ['Standardverfahren', 'Auch komplexere Verfahren, z. B. in Flughafennähe', 'Wie HORIZON'] },
  { label: 'Hilfe bei der Zustimmung der Grundstückseigentümer:innen', cells: [null, true, true] },
  { label: 'Eigene Projektleitung', cells: [null, null, true] },
  { label: 'Video der Show (Rohaufnahmen)', cells: [`+900 €`, `+900 €`, true] },
  { label: 'Vor-Ort-Termin vorab', cells: [null, null, 'Auf Wunsch'] },
];
export const COMPARISON_NOTE = 'Die Beschallung vor Ort stellt ihr als Veranstalter:innen.';

/** "Wofür ihr bei jedem Paket bezahlt" */
export const INCLUDED = [
  { title: 'Design für euren Ort', text: 'Wir programmieren die Show für euren Showbereich, eure Musik und eure Motive.' },
  { title: 'Genehmigung und Sicherheitskonzept', text: 'Luftrechtliche Genehmigung, Sicherheitszonen und Haftpflicht bis 1,3 Mio. € sind immer enthalten.' },
  { title: 'Freigabe vorab', text: 'Eure eigenen Elemente seht ihr vor der Show und gebt sie frei, ab HORIZON als Videovorschau.' },
  { title: 'Team vor Ort', text: 'Pilot:innen und Techniker:innen bauen in ca. 3 Stunden auf und fliegen eure Show.' },
];

/** Extras on the pricing page. Selectable since 01.11.2026 (Marc): the chosen ones travel as `?extras=<id>,<id>` into the
 * inquiry form (field „Extras“, src/components/sections/ContactForm.astro). `id` is that URL/form value, `short` the chip
 * label in the form and in the summary bar. No eyebrow line in the card any more. */
export interface Extra { id: string; short: string; icon: string; title: string; text: string; price: string; link?: { label: string; href: string } }
export const EXTRAS: Extra[] = [
  { id: 'express', short: 'Express', icon: 'zap', title: 'Show in unter zwei Wochen', text: 'Alles unter 14 Tagen bis zur Show. Wir ziehen Design und Genehmigung vor.', price: 'Aufpreis nach Aufwand' },
  { id: 'film', short: 'Rohaufnahmen', icon: 'camera', title: 'Rohaufnahmen mit Kameradrohne', text: 'Material für Aftermovie und Social Media.', price: '900 €, bei ODYSSEY inklusive' },
  { id: 'behoerden', short: 'Behördensupport', icon: 'landmark', title: 'Erweiterter Behördensupport', text: 'Wir übernehmen die gesamte Kommunikation mit Ämtern und Behörden.', price: 'Preis auf Anfrage' },
  { id: 'kontrollzone', short: 'Flughafennähe', icon: 'plane', title: 'Kontrollzonen und Flughafennähe', text: 'Für Kontrollzonen und Flächen in Flughafennähe.', price: 'Preis auf Anfrage' },
  { id: 'schweiz', short: 'Schweiz', icon: 'swiss', title: 'Shows in der Schweiz', text: 'BAZL-Antrag und Zollabwicklung für unsere Flotte.', price: '+1.900 € netto' },
  { id: 'indoor', short: 'Indoor', icon: 'building-2', title: 'Indoor-Drohnenshows', text: '20 bis 50 Drohnen, 5 bis 8 Minuten, ab 3 m Deckenhöhe. Jede Indoor-Show kalkulieren wir einzeln.', price: 'ab ca. 15.000 € netto für 20 Drohnen', link: { label: 'Mehr zu Indoor-Shows', href: '/drohnenshow-indoor/' } },
];
