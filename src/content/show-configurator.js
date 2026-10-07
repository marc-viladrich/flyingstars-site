/**
 * Show configurator prototype v8 (Marc, 7 October 2026). Two choices:
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
    motif('herz', 'Herz', v('heart2d', 'Herz als Umriss'), v('heart3d', 'Volles 3D-Herz, das sanft aufleuchtet'), v('heartsStory', 'Amors Pfeil trifft, das Herz wird voll, kleine Herzen kreisen')),
    motif('ringe', 'Ringe', v('rings2d', 'Zwei Ringe mit Lichtlauf'), v('rings3d', 'Verschlungene 3D-Ringe mit Lichtlauf'), v('ringsStory', 'Ein Ring findet den zweiten, sie verschlingen sich in 3D')),
  ] },
  { id: 'jubilaeum', label: 'Jubiläum', anlass: 'sonstiges', motifs: [
    motif('wappen', 'Wappen', v('shield', 'Wappen mit Stern und wehender Fahne'), v('shield3d', '3D-Wappen mit eurer Zahl und wehender Fahne'), v('shieldStory', 'Aus dem Stern im Wappen wird eure Zahl, dazu Krone und Sternenkranz')),
    motif('wahrzeichen', 'Wahrzeichen', v('tower', 'Beispiel: Berliner Fernsehturm mit Warnlicht'), v('tower3d', 'Der Fernsehturm in 3D, Licht läuft um die Kugel'), v('towerStory', 'Der Fernsehturm sendet und wird zum Brandenburger Tor')),
  ] },
  { id: 'launch', label: 'Launch', anlass: 'firma', motifs: [
    motif('rakete', 'Rakete', v('rocket', 'Rakete mit Flamme'), v('rocket3d', '3D-Rakete mit Flamme schwebt und dreht sich'), v('rocketStory', 'Die Rakete hebt ab, landet auf dem Mond und fliegt durchs Sonnensystem')),
    motif('logo', 'Logo', v('logo', 'Beispiel-Logo mit Lichtlauf'), v('logo3d', 'Beispiel-Logo in 3D mit Lichtschimmer'), v('logoStory', 'Ein Funkenwirbel wird zum Logo, wieder zum Wirbel und zum Ring in 3D')),
  ] },
  { id: 'kultur', label: 'Kultur', anlass: 'sonstiges', motifs: [
    motif('maske', 'Maske', v('masks', 'Theatermasken: Komödie und Tragödie wiegen sich'), v('masks3d', 'Die Masken in 3D'), v('maskStory', 'Komödie wird Tragödie, dann der Teufel aus der Show Bokkenrijders')),
    motif('vorhang', 'Vorhang', v('curtain', 'Der Vorhang bewegt sich im Luftzug'), v('curtainStar', 'Vorhang auf, ein 3D-Stern löst sich heraus'), v('curtainStory', 'Vorhang auf, Goldregen fällt, ein Stern steigt auf')),
  ] },
  { id: 'silvester', label: 'Silvester', anlass: 'stadt', motifs: [
    motif('feuerwerk', 'Feuerwerk', v('burst2d', 'Feuerwerksstern, der sich dreht'), v('burst3d', 'Drei 3D-Feuerwerkskugeln öffnen sich nacheinander'), v('ballStory', 'Feuerwerk sammelt sich zur Silvesterkugel, sie sinkt, wird Ring und Knoten')),
    motif('uhr', 'Uhr', v('clock', 'Fünf vor zwölf'), v('clock3d', '3D-Uhr, die Zeiger laufen'), v('clockStory', 'Mitternacht: Funken schreiben das neue Jahr, dann knallt der Korken')),
  ] },
];
