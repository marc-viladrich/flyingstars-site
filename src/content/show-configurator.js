/**
 * Show configurator prototype v3 (Marc, 7 October 2026): two choices only.
 *   Anlass decides WHAT is in the sky (example motifs).
 *   Aufwand decides HOW much: one step per package, so the price changes exactly when the slider changes.
 * Each occasion lists its motifs with the package they first appear in. The preview of a package plays every motif up
 * to that package, so a higher step always shows everything of the lower ones plus something new (unit-tested).
 * Package texts are quoted from the client's reference; prices come from show-packages.ts only.
 */

/** @typedef {'SPARK'|'HORIZON'|'ODYSSEY'} Pkg */
export const PACKAGE_ORDER = ['SPARK', 'HORIZON', 'ODYSSEY'];

export const STEPS = [
  { pkg: 'SPARK', label: 'Klassische Bilder', includes: 'vordefinierte Formationen wie Herzen oder Ringe und bis zu vier eigene Elemente' },
  { pkg: 'HORIZON', label: 'Mit Bewegung', includes: 'alles aus SPARK plus individuelle 2D-Animationen und einfache 3D-Elemente' },
  { pkg: 'ODYSSEY', label: 'Mit 3D-Animation', includes: 'alles aus HORIZON plus komplexe 3D-Animationen und volumetrische Effekte' },
];

/**
 * @typedef {{ id: string, kind: string, label: string, from: Pkg, text?: string, texts?: string[] }} Scene
 * kind: heart | heartbeat | heart3d | rings | rings3d | stars | sparks | globe | star3d | burst3d | clock | text |
 *       morph (texts one after another) | logo | logo3d | text3d | figure
 */
const nextYear = () => String(new Date().getFullYear() + 1);

/** @returns {{ id: string, label: string, anlass: string, scenes: Scene[] }[]} */
export function occasions() {
  const year = nextYear();
  return [
    { id: 'hochzeit', label: 'Hochzeit', anlass: 'privat', scenes: [
      { id: 'herz', kind: 'heart', label: 'Herz', from: 'SPARK' },
      { id: 'initialen', kind: 'text', text: 'A & T', label: 'Beispiel: eure Initialen', from: 'SPARK' },
      { id: 'herzschlag', kind: 'heartbeat', label: 'Schlagendes Herz', from: 'HORIZON' },
      { id: 'ringe', kind: 'rings', label: 'Zwei Ringe', from: 'SPARK' },
      { id: 'herz3d', kind: 'heart3d', label: 'Drehendes 3D-Herz', from: 'HORIZON' },
      { id: 'ringe3d', kind: 'rings3d', label: 'Ineinander drehende 3D-Ringe', from: 'ODYSSEY' },
      { id: 'ja', kind: 'text', text: 'JA', label: 'Beispiel: „Ja“', from: 'SPARK' },
    ] },
    { id: 'jubilaeum', label: 'Jubiläum', anlass: 'sonstiges', scenes: [
      { id: 'sterne', kind: 'stars', label: 'Sternenhimmel', from: 'SPARK' },
      { id: 'zahl', kind: 'text', text: '125', label: 'Beispiel: eure Jubiläumszahl', from: 'SPARK' },
      { id: 'hochzaehlen', kind: 'morph', texts: ['100', '125'], label: 'Die Zahl zählt hoch', from: 'HORIZON' },
      { id: 'funken', kind: 'sparks', label: 'Funken', from: 'SPARK' },
      { id: 'stern3d', kind: 'star3d', label: 'Drehender 3D-Stern', from: 'HORIZON' },
      { id: 'zahl3d', kind: 'text3d', text: '125', label: 'Die Zahl dreht sich in 3D', from: 'ODYSSEY' },
      { id: 'danke', kind: 'text', text: 'DANKE', label: 'Beispiel: „Danke“', from: 'SPARK' },
    ] },
    { id: 'launch', label: 'Launch', anlass: 'firma', scenes: [
      { id: 'sterne', kind: 'stars', label: 'Sternenhimmel', from: 'SPARK' },
      { id: 'claim', kind: 'text', text: 'NEU', label: 'Beispiel: euer Claim', from: 'SPARK' },
      { id: 'bald', kind: 'morph', texts: ['BALD', 'JETZT'], label: 'Aus „bald“ wird „jetzt“', from: 'HORIZON' },
      { id: 'funken', kind: 'sparks', label: 'Funken', from: 'SPARK' },
      { id: 'kugel', kind: 'globe', label: 'Drehende Weltkugel', from: 'HORIZON' },
      { id: 'logo3d', kind: 'logo3d', label: 'Beispiel-Logo entsteht in 3D', from: 'ODYSSEY' },
      { id: 'logo', kind: 'logo', label: 'Beispiel-Logo', from: 'SPARK' },
    ] },
    { id: 'kultur', label: 'Kultur', anlass: 'sonstiges', scenes: [
      { id: 'sterne', kind: 'stars', label: 'Sternenhimmel', from: 'SPARK' },
      { id: 'premiere', kind: 'text', text: 'PREMIERE', label: 'Beispiel: euer Titel', from: 'SPARK' },
      { id: 'vorhang', kind: 'morph', texts: ['VORHANG', 'AUF'], label: 'Vorhang auf', from: 'HORIZON' },
      { id: 'funken', kind: 'sparks', label: 'Funken', from: 'SPARK' },
      { id: 'stern3d', kind: 'star3d', label: 'Drehender 3D-Stern', from: 'HORIZON' },
      { id: 'figur', kind: 'figure', label: 'Beispiel aus unserer Musical-Show Bokkenrijders', from: 'ODYSSEY' },
      { id: 'bravo', kind: 'text', text: 'BRAVO', label: 'Beispiel: „Bravo“', from: 'SPARK' },
    ] },
    { id: 'silvester', label: 'Silvester', anlass: 'stadt', scenes: [
      { id: 'uhr', kind: 'clock', label: 'Uhr auf zwölf', from: 'SPARK' },
      { id: 'countdown', kind: 'morph', texts: ['3', '2', '1'], label: 'Countdown', from: 'HORIZON' },
      { id: 'jahr', kind: 'text', text: year, label: 'Das neue Jahr', from: 'SPARK' },
      { id: 'funken', kind: 'sparks', label: 'Funken', from: 'SPARK' },
      { id: 'stern3d', kind: 'star3d', label: 'Drehender 3D-Stern', from: 'HORIZON' },
      { id: 'feuerwerk3d', kind: 'burst3d', label: '3D-Feuerwerk ohne Knall', from: 'ODYSSEY' },
      { id: 'prosit', kind: 'text', text: 'PROSIT', label: 'Beispiel: „Prosit“', from: 'SPARK' },
    ] },
  ];
}

/** Motifs of the preview for a package: every motif up to that package, in show order. */
export function showFor(occasion, pkg) {
  const rank = PACKAGE_ORDER.indexOf(pkg);
  return occasion.scenes.filter((scene) => PACKAGE_ORDER.indexOf(scene.from) <= rank);
}
