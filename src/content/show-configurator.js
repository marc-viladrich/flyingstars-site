/**
 * Show configurator prototype v4 (Marc, 7 October 2026). Two choices:
 *   Anlass picks two motifs; Aufwand picks the package (one step per package, the only price driver).
 * Every motif has one version per package, so the slider shows the SAME subject growing:
 *   SPARK = a 2D template from the catalogue, HORIZON = one full 3D object, ODYSSEY = several 3D objects or a 3D
 *   animation. `build` names the picture builder in src/scripts/show-scenes.js.
 * Package texts are quoted from the client's reference; prices come from show-packages.ts only.
 */

export const PACKAGE_ORDER = ['SPARK', 'HORIZON', 'ODYSSEY'];

export const STEPS = [
  { pkg: 'SPARK', label: 'Klassisch in 2D', includes: 'vordefinierte Formationen wie Herzen oder Ringe und bis zu vier eigene Elemente' },
  { pkg: 'HORIZON', label: 'Mit 3D', includes: 'alles aus SPARK plus individuelle 2D-Animationen und einfache 3D-Elemente' },
  { pkg: 'ODYSSEY', label: 'Komplexes 3D', includes: 'alles aus HORIZON plus komplexe 3D-Animationen und volumetrische Effekte' },
];

const motif = (id, label, spark, horizon, odyssey) => ({ id, label, tiers: { SPARK: spark, HORIZON: horizon, ODYSSEY: odyssey } });
const v = (build, caption) => ({ build, caption });

export const OCCASIONS = [
  { id: 'hochzeit', label: 'Hochzeit', anlass: 'privat', motifs: [
    motif('herz', 'Herz', v('heart2d', 'Herz als Umriss'), v('heart3d', 'Volles 3D-Herz'), v('hearts3d', '3D-Herz mit kleinen Herzen')),
    motif('ringe', 'Ringe', v('proposal', 'Antrag: aus dem Ring werden zwei'), v('rings3d', 'Ineinander verschlungene 3D-Ringe'), v('rings3dSparkle', '3D-Ringe im Funkenregen')),
  ] },
  { id: 'jubilaeum', label: 'Jubiläum', anlass: 'sonstiges', motifs: [
    motif('wappen', 'Wappen', v('shield', 'Wappenschild'), v('shield3d', '3D-Wappen mit eurer Zahl'), v('shieldCrown', '3D-Wappen mit Krone und Sternenkranz')),
    motif('wahrzeichen', 'Wahrzeichen', v('zollverein', 'Beispiel: Fördergerüst von Zeche Zollverein'), v('zollverein3d', 'Das Fördergerüst in 3D'), v('zollvereinSparks', '3D-Fördergerüst mit aufsteigenden Funken')),
  ] },
  { id: 'launch', label: 'Launch', anlass: 'firma', motifs: [
    motif('rakete', 'Rakete', v('rocket', 'Rakete als Umriss'), v('rocket3d', '3D-Rakete'), v('rocketLaunch', '3D-Rakete hebt mit Abgaswolke ab')),
    motif('logo', 'Logo', v('logo', 'Beispiel-Logo'), v('logo3d', 'Beispiel-Logo in 3D'), v('logoFromSparks', 'Beispiel-Logo entsteht aus einer Funkenkugel')),
  ] },
  { id: 'kultur', label: 'Kultur', anlass: 'sonstiges', motifs: [
    motif('maske', 'Maske', v('masks', 'Theatermasken'), v('mask3d', '3D-Maske'), v('devil', '3D-Maske aus unserer Musical-Show Bokkenrijders')),
    motif('vorhang', 'Vorhang', v('curtain', 'Vorhang zu'), v('curtainStar', 'Vorhang auf für einen 3D-Stern'), v('curtainShower', 'Vorhang auf für 3D-Sternenregen')),
  ] },
  { id: 'silvester', label: 'Silvester', anlass: 'stadt', motifs: [
    motif('feuerwerk', 'Feuerwerk', v('burst2d', 'Feuerwerksstern'), v('burst3d', '3D-Feuerwerkskugel'), v('bursts3d', 'Drei 3D-Feuerwerke')),
    motif('uhr', 'Uhr', v('clock', 'Die Uhr läuft auf zwölf'), v('clock3d', '3D-Uhr schlägt zwölf'), v('clockBurst', '3D-Uhr zerfällt in Feuerwerk')),
  ] },
];
