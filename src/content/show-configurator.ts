/**
 * Show configurator prototype (Marc, 7 October 2026): visitors choose a show by what they see and who watches, not by
 * drone count. The answers translate into FlyingStars' existing price model (package + drones + extras from
 * show-packages.ts); this file never invents a price.
 *
 * The mapping from answers to packages is an inference from the package texts of the supplied reference and the four
 * published cases. FlyingStars has not confirmed it yet; the page says so.
 */
import { SHOW_PACKAGES, priceFor, type ShowPackage } from './show-packages';

export type SceneKind = 'sterne' | 'funken' | 'ring' | 'herz' | 'herzschlag' | 'herz3d' | 'kugel' | 'figur3d' | 'logo' | 'text' | 'verwandlung';

export interface Scene {
  id: string;
  kind: SceneKind;
  label: string;
  /** Complexity stop 1–5, see COMPLEXITY. */
  tier: Tier;
  /** Own element of the customer (lettering, logo, number) as opposed to a catalogue motif. */
  own: boolean;
  /** Higher = kept first when fewer motifs are chosen. */
  priority: number;
  text?: string;
  /** Second text of a transformation. */
  to?: string;
  /** Replaced by the visitor's own text. */
  editable?: boolean;
}

export type Tier = 1 | 2 | 3 | 4 | 5;

/** Complexity stops, each worded after the package texts it maps to. */
export const COMPLEXITY: Record<Tier, { label: string; example: string; minimum: ShowPackage; source: string }> = {
  1: { label: 'Klassiker', example: 'Sterne, Funken, Ringe, Herzen', minimum: 'SPARK', source: 'SPARK: Auswahl aus vordefinierten Premium-Formationen wie Herzen oder Ringe' },
  2: { label: 'Eure Zeichen', example: 'Initialen, Schriftzug, Logo, Zahl', minimum: 'SPARK', source: 'SPARK: bis zu vier eigene Elemente – Initialen, Logo, Stadtwappen' },
  3: { label: 'Es bewegt sich', example: 'schlagendes Herz, ein Wort verwandelt sich', minimum: 'HORIZON', source: 'HORIZON: vollständig individuelle 2D-Animationen' },
  4: { label: 'Einfaches 3D', example: 'drehendes 3D-Herz, Weltkugel', minimum: 'HORIZON', source: 'HORIZON: einfache 3D-Elemente' },
  5: { label: 'Komplexes 3D', example: 'Figur aus einer echten Show-Datei', minimum: 'ODYSSEY', source: 'ODYSSEY: komplexe 3D-Animationen und volumetrische Effekte' },
};

export const MUSIC = {
  katalog: { label: 'Musik von uns', hint: 'GEMA-frei', minimum: 'SPARK' as ShowPackage, reason: '' },
  synchron: { label: 'Eure Musik, synchron', hint: 'Bild für Bild', minimum: 'HORIZON' as ShowPackage, reason: 'Synchron auf eure Wunschmusik' },
  live: { label: 'Live mit Bühne', hint: 'Timecode vor Ort', minimum: 'ODYSSEY' as ShowPackage, reason: 'Timecode-Synchronisation vor Ort' },
} as const;
export type Music = keyof typeof MUSIC;

/**
 * Audience → recommended drones. Assumption for the prototype, anchored on the cases: SPARK names weddings with
 * 100 drones; the PUMA guerrilla show flew 100, the NFL show 300 over the Olympiastadion, Bokkenrijders 600 in an
 * open-air musical. Not a minimum: PUMA shows 100 drones can work in a stadium.
 */
export const AUDIENCE = [
  { label: 'bis 200', hint: 'Hochzeit, Feier', drones: 100 },
  { label: 'bis 2.000', hint: 'Firmenevent, Gala', drones: 200 },
  { label: 'bis 20.000', hint: 'Stadtfest, Festival', drones: 300 },
  { label: 'über 20.000', hint: 'Stadion, Großstadt', drones: 600 },
] as const;

export const FILM_PRICE = 900;

const s = (id: string, kind: SceneKind, label: string, tier: Tier, priority: number, extra: Partial<Scene> = {}): Scene =>
  ({ id, kind, label, tier, priority, own: false, ...extra });
const figur = s('figur', 'figur3d', '3D-Figur (Beispiel: Bokkenrijders)', 5, 9);

export interface Adventure {
  id: string;
  label: string;
  /** Occasion in one word, shown on the chooser. */
  short: string;
  occasion: string;
  /** Inquiry form value for the occasion. */
  anlass: 'firma' | 'stadt' | 'agentur' | 'privat' | 'indoor' | 'sonstiges';
  textLabel: string;
  scenes: Scene[];
  preset: { tier: Tier; motifs: number; music: Music; audience: number; story: boolean; film: boolean };
}

export const ADVENTURES: Adventure[] = [
  {
    id: 'ja', label: 'Das Ja', short: 'Hochzeit', occasion: 'Hochzeit & Privat', anlass: 'privat', textLabel: 'Eure Initialen',
    scenes: [
      s('sterne', 'sterne', 'Sternenhimmel', 1, 3),
      s('initialen', 'text', 'Eure Initialen', 2, 6, { own: true, text: 'A & T', editable: true }),
      s('herz', 'herz', 'Herz', 1, 5),
      s('herzschlag', 'herzschlag', 'Schlagendes Herz', 3, 7),
      s('herz3d', 'herz3d', 'Drehendes 3D-Herz', 4, 8),
      s('ring', 'ring', 'Ring', 1, 1),
      s('ja', 'text', '„Ja“', 2, 4, { own: true, text: 'JA' }),
      s('funken', 'funken', 'Funken zum Schluss', 1, 2),
      figur,
    ],
    preset: { tier: 2, motifs: 4, music: 'katalog', audience: 0, story: false, film: false },
  },
  {
    id: 'jubilaeum', label: 'Unser Jubiläum', short: 'Jubiläum', occasion: 'Städte & Festivals', anlass: 'stadt', textLabel: 'Jubiläumszahl',
    scenes: [
      s('sterne', 'sterne', 'Sternenhimmel', 1, 2),
      s('zahl', 'text', 'Jubiläumszahl', 2, 7, { own: true, text: '125', editable: true }),
      s('jahre', 'text', 'Schriftzug', 2, 4, { own: true, text: 'JAHRE' }),
      s('wandel', 'verwandlung', 'Damals wird heute', 3, 5, { own: true, text: '1901', to: '2026' }),
      s('kugel', 'kugel', 'Weltkugel', 4, 6),
      s('ring', 'ring', 'Ring', 1, 1),
      s('funken', 'funken', 'Funken zum Schluss', 1, 3),
      figur,
    ],
    preset: { tier: 4, motifs: 5, music: 'synchron', audience: 2, story: false, film: false },
  },
  {
    id: 'launch', label: 'Der Launch', short: 'Launch', occasion: 'Firmen & Marken', anlass: 'firma', textLabel: 'Euer Claim',
    scenes: [
      s('sterne', 'sterne', 'Sternenhimmel', 1, 2),
      s('claim', 'text', 'Euer Claim', 2, 4, { own: true, text: 'NEU', editable: true }),
      s('wandel', 'verwandlung', 'Bald wird jetzt', 3, 6, { own: true, text: 'BALD', to: 'JETZT' }),
      s('logo', 'logo', 'Euer Logo (hier das FlyingStars-Zeichen)', 2, 8, { own: true }),
      s('kugel', 'kugel', 'Weltkugel', 4, 3),
      s('ring', 'ring', 'Ring', 1, 1),
      s('funken', 'funken', 'Funken zum Schluss', 1, 5),
      figur,
    ],
    preset: { tier: 3, motifs: 4, music: 'synchron', audience: 1, story: false, film: true },
  },
  {
    id: 'geschichte', label: 'Die Geschichte', short: 'Kultur', occasion: 'Kultur & Kampagnen', anlass: 'sonstiges', textLabel: 'Euer Titel',
    scenes: [
      s('sterne', 'sterne', 'Sternenhimmel', 1, 3),
      s('titel', 'text', 'Euer Titel', 2, 6, { own: true, text: 'DIE LEGENDE', editable: true }),
      s('unheil', 'funken', 'Wachsendes Unheil', 1, 4),
      s('figur', 'figur3d', '3D-Figur (Bokkenrijders-Teufel)', 5, 9),
      s('herzschlag', 'herzschlag', 'Schlagendes Herz', 3, 7),
      s('herz3d', 'herz3d', 'Drehendes 3D-Herz', 4, 2),
      s('ende', 'text', 'Schlussbild', 2, 5, { own: true, text: 'ENDE' }),
      s('funken', 'funken', 'Funken und Sternenhimmel', 1, 1),
    ],
    preset: { tier: 5, motifs: 6, music: 'live', audience: 3, story: true, film: true },
  },
  {
    id: 'silvester', label: '#Böllerciao', short: 'Silvester', occasion: 'Silvester ohne Knall', anlass: 'stadt', textLabel: 'Jahreszahl',
    scenes: [
      s('funken', 'funken', 'Funken', 1, 7),
      s('sterne', 'sterne', 'Sternenhimmel', 1, 4),
      s('wandel', 'verwandlung', 'Altes Jahr wird neues', 3, 3, { own: true, text: '2026', to: '2027' }),
      s('jahr', 'text', 'Jahreszahl', 2, 8, { own: true, text: '2027', editable: true }),
      s('herz', 'herz', 'Herz', 1, 5),
      s('kugel', 'kugel', 'Weltkugel', 4, 2),
      s('ring', 'ring', 'Ring', 1, 1),
      figur,
    ],
    preset: { tier: 2, motifs: 4, music: 'katalog', audience: 2, story: false, film: false },
  },
];

export const MOTIF_RANGE = { min: 2, max: 7 } as const;

export interface Choice { adventure: Adventure; tier: Tier; motifs: number; music: Music; audience: number; story: boolean; film: boolean; text: string }
/** `because` completes "<PACKAGE>, weil …" for the one-line explanation. */
export interface Reason { text: string; package: ShowPackage | null; because?: string; decisive?: boolean }
export interface Result { scenes: Scene[]; package: ShowPackage; drones: number; price: number; film: number; total: number; reasons: Reason[]; ownCount: number }

const rank = (p: ShowPackage) => ['SPARK', 'HORIZON', 'ODYSSEY'].indexOf(p);
const higher = (a: ShowPackage, b: ShowPackage) => (rank(b) > rank(a) ? b : a);

/** The motifs of the show: the most important ones up to the chosen complexity, in story order. */
export function pickScenes(adventure: Adventure, tier: Tier, motifs: number): Scene[] {
  const allowed = adventure.scenes.filter((scene) => scene.tier <= tier);
  // the most complex allowed motif always shows, so moving the slider always changes the picture
  const top = Math.max(...allowed.map((scene) => scene.tier));
  const signature = allowed.filter((scene) => scene.tier === top).sort((a, b) => b.priority - a.priority)[0];
  const rest = allowed.filter((scene) => scene !== signature).sort((a, b) => b.priority - a.priority).slice(0, Math.max(0, motifs - 1));
  const chosen = new Set([signature, ...rest]);
  return adventure.scenes.filter((scene) => chosen.has(scene));
}

/** Translates the answers into package, drones and price with FlyingStars' own price rules. */
export function configure(choice: Choice): Result {
  const scenes = pickScenes(choice.adventure, choice.tier, choice.motifs);
  const reasons: Reason[] = [];
  let pkg = 'SPARK' as ShowPackage; // widened on purpose: raise() changes it inside a closure
  const raise = (to: ShowPackage, text: string, because: string) => { reasons.push({ text, package: to, because }); pkg = higher(pkg, to); };

  const top = Math.max(...scenes.map((scene) => scene.tier)) as Tier;
  const motifBecause: Record<Tier, string> = { 1: 'die Motive aus dem Katalog kommen', 2: 'eure eigenen Zeichen enthalten sind', 3: 'sich ein Motiv bewegt', 4: 'ein Motiv in 3D steht', 5: 'ein Motiv komplexes 3D ist' };
  raise(COMPLEXITY[top].minimum, `Aufwendigstes Motiv: ${COMPLEXITY[top].label}`, motifBecause[top]);
  const ownCount = scenes.filter((scene) => scene.own).length;
  if (ownCount > 4) raise('HORIZON', `${ownCount} eigene Motive, SPARK enthält bis zu vier`, `ihr ${ownCount} eigene Motive habt`);
  if (choice.music !== 'katalog') raise(MUSIC[choice.music].minimum, MUSIC[choice.music].reason, choice.music === 'live' ? 'die Show live per Timecode läuft' : 'die Show synchron zu eurer Musik läuft');
  if (choice.story) raise('ODYSSEY', 'Erzählte Geschichte mit dramaturgischer Kurve', 'die Show eine Geschichte erzählt');

  const audience = AUDIENCE[choice.audience];
  // a text needs about 10 drones per character to stay readable (same rule as the price calculator)
  const textChars = Math.max(0, ...scenes.filter((scene) => scene.kind === 'text').map((scene) => Array.from((scene.editable && choice.text ? choice.text : scene.text ?? '').replace(/\s+/g, '')).length));
  const wanted = Math.max(audience.drones, textChars * 10);
  const forAudience = `${wanted.toLocaleString('de-DE')} Drohnen für ${audience.label} Zuschauer*innen`;
  // the drone count only counts as a reason when it is what lifts the show out of SPARK
  if (wanted > SHOW_PACKAGES.SPARK.max && pkg === 'SPARK') raise('HORIZON', `${forAudience}, SPARK fliegt bis ${SHOW_PACKAGES.SPARK.max}`, `${wanted.toLocaleString('de-DE')} Drohnen für ${audience.label} Zuschauer*innen empfohlen sind`);
  else reasons.push({ text: wanted >= SHOW_PACKAGES[pkg].base ? forAudience : `${SHOW_PACKAGES[pkg].base.toLocaleString('de-DE')} Drohnen sind in ${pkg} enthalten`, package: null });
  const drones = Math.max(SHOW_PACKAGES[pkg].base, wanted);

  const price = priceFor(pkg, drones)!;
  const film = choice.film && pkg !== 'ODYSSEY' ? FILM_PRICE : 0;
  if (choice.film) reasons.push({ text: pkg === 'ODYSSEY' ? 'Filmaufnahmen sind bei ODYSSEY inklusive' : `Filmaufnahmen +${FILM_PRICE} €`, package: null });

  // the reasons that set the package are marked, so the visitor sees what made the show bigger
  for (const reason of reasons) reason.decisive = reason.package === pkg && pkg !== 'SPARK';
  return { scenes, package: pkg, drones, price, film, total: price + film, reasons, ownCount };
}
