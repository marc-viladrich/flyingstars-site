/**
 * Show configurator prototype v9 (Marc, 7 October 2026). Two choices:
 *   Anlass picks a sequence of three motifs that plays as a little show (a real SPARK show also runs ten minutes
 *   through many pictures); Aufwand picks the package (one button per package, the only price driver).
 * Every motif has one version per package, so switching the package shows the SAME motif growing:
 *   SPARK = 2D pictures with gentle motion, HORIZON = 3D objects that move on their own, ODYSSEY = every motif told as
 *   a short story in acts with complex 3D animation. `build` names the picture builder in src/scripts/show-scenes.js.
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

/** Motifs in the order they play; after the last one the sequence starts again. */
export const OCCASIONS = [
  { id: 'hochzeit', label: 'Hochzeit', anlass: 'privat', motifs: [
    motif('ring', 'Ring', v('rings2d', 'Zwei Ringe drehen sich'), v('rings3d', 'Ein Verlobungsring in 3D, der Stein funkelt'), v('ringsStory', 'Der Ring gleitet auf den Ringfinger')),
    motif('herz', 'Herz', v('heart2d', 'Ein Herz'), v('heart3d', 'Volles 3D-Herz, das sanft aufleuchtet'), v('heartsStory', 'Amors Pfeil fliegt durchs Herz, zwei Herzen umkreisen sich')),
    motif('glaeser', 'Sektgläser', v('flutes2d', 'Zwei Sektgläser stoßen an'), v('flutes3d', 'Sektgläser in 3D, die Perlen steigen'), v('flutesStory', 'Die Gläser stoßen an, die Perlen steigen als Herz auf')),
  ] },
  { id: 'jubilaeum', label: 'Jubiläum', anlass: 'sonstiges', motifs: [
    motif('wappen', 'Wappen', v('shield', 'Wappen mit Stern und wehender Fahne'), v('shield3d', '3D-Wappen mit eurer Zahl und wehender Fahne'), v('shieldStory', 'Aus dem Stern im Wappen wird eure Zahl, dazu Krone und Sternenkranz')),
    motif('wahrzeichen', 'Wahrzeichen', v('tower', 'Beispiel: Berliner Fernsehturm mit Warnlicht'), v('tower3d', 'Der Fernsehturm in 3D, Licht läuft um die Kugel'), v('towerStory', 'Der Fernsehturm sendet und wird zum Brandenburger Tor')),
    motif('pokal', 'Pokal', v('trophy2d', 'Ein Pokal, über ihm funkeln Sterne'), v('trophy3d', 'Der Pokal in 3D, Licht gleitet darüber'), v('trophyStory', 'Der Pokal wächst, eure Zahl steigt heraus')),
  ] },
  { id: 'launch', label: 'Launch', anlass: 'firma', motifs: [
    motif('idee', 'Glühbirne', v('bulb2d', 'Eine Glühbirne: die Idee'), v('bulb3d', 'Die Glühbirne in 3D, der Glühfaden leuchtet'), v('bulbStory', 'Aus einem Funken wird eine Glühbirne, die strahlt')),
    motif('rakete', 'Rakete', v('rocket', 'Rakete mit Flamme'), v('rocket3d', '3D-Rakete mit Flamme schwebt und dreht sich'), v('rocketStory', 'Die Rakete hebt ab, landet auf dem Mond und fliegt durchs Sonnensystem')),
    motif('logo', 'Logo', v('logo', 'Beispiel-Logo mit Lichtlauf'), v('logo3d', 'Beispiel-Logo in 3D mit Lichtschimmer'), v('logoStory', 'Ein Funkenwirbel wird zum Logo und zum Ring in 3D')),
  ] },
  { id: 'kultur', label: 'Kultur', anlass: 'sonstiges', motifs: [
    motif('vorhang', 'Vorhang', v('curtain', 'Der Vorhang bewegt sich im Luftzug'), v('curtainStar', 'Vorhang auf, ein 3D-Stern löst sich heraus'), v('curtainStory', 'Vorhang auf, Goldregen fällt, ein Stern steigt auf')),
    motif('maske', 'Masken', v('masks', 'Theatermasken: Komödie und Tragödie wiegen sich'), v('masks3d', 'Die Masken in 3D'), v('maskStory', 'Komödie und Tragödie verbinden sich, dann der Teufel aus Bokkenrijders')),
    motif('noten', 'Noten', v('notes2d', 'Zwei Noten wiegen sich im Takt'), v('notes3d', 'Die Noten in 3D'), v('notesStory', 'Aus einem Ton wird eine Melodie')),
  ] },
  { id: 'silvester', label: 'Silvester', anlass: 'stadt', motifs: [
    motif('uhr', 'Uhr', v('clock', 'Die Zeiger laufen auf zwölf'), v('clock3d', '3D-Uhr, die Zeiger laufen'), v('clockStory', 'Mitternacht: Funken schreiben das neue Jahr, dann knallt der Korken')),
    motif('feuerwerk', 'Feuerwerk', v('burst2d', 'Feuerwerksstern, der sich dreht'), v('burst3d', 'Drei 3D-Feuerwerkskugeln öffnen sich nacheinander'), v('ballStory', 'Feuerwerk sammelt sich zur Silvesterkugel, sie sinkt, wird Ring und Knoten')),
    motif('klee', 'Kleeblatt', v('clover2d', 'Ein Glücksklee dreht sich'), v('clover3d', 'Der Glücksklee in 3D'), v('cloverStory', 'Aus drei Blättern werden vier: Glück fürs neue Jahr')),
  ] },
];
