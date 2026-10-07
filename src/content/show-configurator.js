/**
 * Show configurator prototype v4 (Marc, 7 October 2026). Two choices:
 *   Anlass picks two motifs; Aufwand picks the package (one step per package, the only price driver).
 * Every motif has one version per package, so the slider shows the SAME subject growing:
 *   SPARK = a still 2D picture from the catalogue, HORIZON = one 3D object that moves on its own, ODYSSEY = a short
 *   story in acts with complex 3D animation and flowing effects. `build` names the picture builder in src/scripts/show-scenes.js.
 * Package texts are quoted from the client's reference; prices come from show-packages.ts only.
 */

export const PACKAGE_ORDER = ['SPARK', 'HORIZON', 'ODYSSEY'];

export const STEPS = [
  { pkg: 'SPARK', label: 'Klassisch in 2D', includes: 'vordefinierte Formationen wie Herzen oder Ringe und bis zu vier eigene Elemente' },
  { pkg: 'HORIZON', label: '3D in Bewegung', includes: 'alles aus SPARK plus individuelle 2D-Animationen und einfache 3D-Elemente' },
  { pkg: 'ODYSSEY', label: 'Erzählte 3D-Show', includes: 'alles aus HORIZON plus komplexe 3D-Animationen, volumetrische Effekte und Storytelling mit dramaturgischer Kurve' },
];

const motif = (id, label, spark, horizon, odyssey) => ({ id, label, tiers: { SPARK: spark, HORIZON: horizon, ODYSSEY: odyssey } });
const v = (build, caption) => ({ build, caption });

export const OCCASIONS = [
  { id: 'hochzeit', label: 'Hochzeit', anlass: 'privat', motifs: [
    motif('herz', 'Herz', v('heart2d', 'Herz als Umriss'), v('heart3d', 'Volles 3D-Herz, das schlägt'), v('heartsStory', 'Amors Pfeil, ein schlagendes 3D-Herz und kreisende Herzen')),
    motif('ringe', 'Ringe', v('proposal', 'Antrag: aus dem Ring werden zwei'), v('rings3d', 'Verschlungene 3D-Ringe mit Lichtlauf'), v('ringsStory', 'Antrag, aufsteigender Ring, zwei Ringe im Funkenregen')),
  ] },
  { id: 'jubilaeum', label: 'Jubiläum', anlass: 'sonstiges', motifs: [
    motif('wappen', 'Wappen', v('shield', 'Wappenschild'), v('shield3d', '3D-Wappen mit eurer Zahl und Lichtschimmer'), v('shieldStory', 'Wappen, eure Zahl tritt hervor, Krone und kreisender Sternenkranz')),
    motif('wahrzeichen', 'Wahrzeichen', v('zollverein', 'Beispiel: Fördergerüst von Zeche Zollverein'), v('zollverein3d', 'Das Fördergerüst in 3D, die Seilscheiben drehen'), v('zollvereinStory', 'Fördergerüst, aufsteigende Funken, ein Stern über der Zeche')),
  ] },
  { id: 'launch', label: 'Launch', anlass: 'firma', motifs: [
    motif('rakete', 'Rakete', v('rocket', 'Rakete als Umriss'), v('rocket3d', '3D-Rakete schwebt und rollt'), v('rocketStory', 'Zündung, Start und Flug zu den Sternen')),
    motif('logo', 'Logo', v('logo', 'Beispiel-Logo'), v('logo3d', 'Beispiel-Logo in 3D mit Lichtschimmer'), v('logoStory', 'Ein Funkenwirbel verdichtet sich zum Beispiel-Logo')),
  ] },
  { id: 'kultur', label: 'Kultur', anlass: 'sonstiges', motifs: [
    motif('maske', 'Maske', v('masks', 'Theatermasken'), v('masks3d', 'Die Masken in 3D, an Bändern schwingend'), v('maskStory', 'Komödie wird Tragödie, dann der Teufel aus der Show Bokkenrijders')),
    motif('vorhang', 'Vorhang', v('curtain', 'Vorhang zu'), v('curtainStar', 'Vorhang auf für einen 3D-Stern'), v('curtainStory', 'Wehender Vorhang, Goldregen, ein Stern steigt auf')),
  ] },
  { id: 'silvester', label: 'Silvester', anlass: 'stadt', motifs: [
    motif('feuerwerk', 'Feuerwerk', v('burst2d', 'Feuerwerksstern'), v('burst3d', 'Eine 3D-Feuerwerkskugel explodiert aus der Mitte'), v('fireworkStory', 'Drei Raketen steigen auf und zünden nacheinander')),
    motif('uhr', 'Uhr', v('clock', 'Fünf vor zwölf'), v('clock3d', '3D-Uhr, die Zeiger laufen'), v('clockStory', 'Die Zeiger laufen auf zwölf, dann sprüht die Uhr Funken')),
  ] },
];
