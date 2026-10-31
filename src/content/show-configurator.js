/**
 * Show configurator prototype v9 (Marc, 7 October 2026). Two choices:
 *   Anlass picks a sequence of three motifs that plays as a little show (a real SPARK show also runs ten minutes
 *   through many pictures); Aufwand picks the package (one button per package, the only price driver).
 * Every motif has one version per package, so switching the package shows the SAME motif growing:
 *   SPARK = 2D pictures with gentle motion, HORIZON = 3D objects that move on their own, ODYSSEY = every motif told as
 *   a short story in acts with complex 3D animation. `build` names the picture builder in src/scripts/show-scenes.js.
 * Package texts are quoted from the client's reference; prices come from show-packages.ts only.
 */

import { DRONE_RANGES, DRONE_STEP } from './show-packages.ts';

export const PACKAGE_ORDER = ['SPARK', 'HORIZON', 'ODYSSEY'];

export const STEPS = [
  { pkg: 'SPARK', label: 'Klassisch in 2D', includes: 'vordefinierte Formationen wie Herzen oder Ringe und bis zu vier eigene Elemente' },
  { pkg: 'HORIZON', label: '3D in Bewegung', includes: 'alles aus SPARK plus individuelle 2D-Animationen und einfache 3D-Elemente' },
  { pkg: 'ODYSSEY', label: 'Erzählte 3D-Show', includes: 'alles aus HORIZON plus komplexe 3D-Animationen, volumetrische Effekte und Storytelling mit dramaturgischer Kurve' },
];

/**
 * Sechzehnte Fassung (Marc, 31.10.2026: „Sehe ich das richtig, dass bei den meisten Anlässen keine neuen Motive
 * freigeschaltet werden, wenn wir mehr Drohnen auswählen? … mit mehr Drohnen neue, komplexere Motive freischalten“):
 * eine Freischalt-Leiter in jedem Paket. Jedes Paket hat zwei Sprossen, abgeleitet aus seinem Drohnenbereich
 * (DRONE_RANGES in show-packages.ts): der Einstieg und die Mitte des Bereichs, auf 50 gerundet. Mit den heutigen Bereichen
 * SPARK 100/150, HORIZON 200/250, ODYSSEY 300/450.
 * Jedes Motiv nennt mit `from` die Sprosse, ab der es spielt ([Paket, 0 | 1]). Daraus bekommt jede Fassung ihr
 * `minDrones`: im ersten Paket die Zahl der Sprosse, in jedem größeren Paket dessen Einstieg. So gilt über den ganzen
 * Regler: Mehr Drohnen nehmen nie ein Motiv weg, und ein größeres Paket zeigt nie weniger Motive als ein kleineres.
 * Regeln (Wächter scripts/show-unlock.test.mjs): am Einstieg jedes Pakets mindestens drei Motive, in jedem Paket
 * mindestens eine Freischaltung innerhalb des Bereichs, die komplexeren Motive (mehr Teile, 3D, Geschichte) später.
 * PLATZHALTER: Die Zuordnung ist nicht mit FlyingStars abgestimmt (docs/show-motive-inventar.md, „Freischalt-Leiter“).
 */
const roundTo = (v, step) => Math.round(v / step) * step;
export const LADDER = Object.fromEntries(Object.entries(DRONE_RANGES).map(([pkg, { min, max }]) => [pkg, [min, Math.max(min + DRONE_STEP, min + roundTo((max - min) / 2, 50))]]));
/** Sprossen als Kurzform für die Motivliste. */
/** @type {[string, number]} */ const S0 = ['SPARK', 0];
/** @type {[string, number]} */ const S1 = ['SPARK', 1];
/** @type {[string, number]} */ const H1 = ['HORIZON', 1];
/** @type {[string, number]} */ const O1 = ['ODYSSEY', 1];
// spark/horizon may be null: some motifs need more than SPARK's drones to read (Marc, 10 October 2026: „Manche Motive
// sind mit 100–150 Drohnen einfach nicht umsetzbar“) or exist only as a story. A version before the motif's first
// package is not played even if it is given (its builder stays in scenes/).
/** @typedef {{ build: string, caption: string, minDrones: number }} Version */
/** @param {string} id @param {string} label @param {{ build: string, caption: string } | null} spark @param {{ build: string, caption: string } | null} horizon @param {{ build: string, caption: string }} odyssey @param {[string, number]} [from] */
const motif = (id, label, spark, horizon, odyssey, from = S0) => {
  /** @type {Partial<Record<'SPARK' | 'HORIZON' | 'ODYSSEY', Version>>} */
  const tiers = {};
  const first = PACKAGE_ORDER.indexOf(from[0]);
  [spark, horizon, odyssey].forEach((version, i) => {
    if (!version || i < first) return;
    const pkg = PACKAGE_ORDER[i];
    tiers[pkg] = { ...version, minDrones: LADDER[pkg][i === first ? from[1] : 0] };
  });
  return { id, label, tiers, minDrones: LADDER[from[0]][from[1]] };
};
const v = (build, caption) => ({ build, caption });

/** Sprossen der Leiter in Reihenfolge (alle Pakete), z. B. [100, 150, 200, 250, 300, 450]. */
export const UNLOCK = Object.values(LADDER).flat().sort((a, b) => a - b);
/** Spielt dieses Motiv im Paket bei dieser Drohnenzahl? (Mindestzahl an der Fassung des Pakets) */
export const playable = (m, pkg, drones) => Boolean(m.tiers[pkg]) && (m.tiers[pkg].minDrones ?? 0) <= drones;
/** Paket, dessen Bereich die Drohnenzahl enthält (wie packageForDrones in show-packages.ts, hier ohne TS-Import im Skript). */
const pkgOf = (drones) => PACKAGE_ORDER.find((p) => drones <= DRONE_RANGES[p].max) ?? PACKAGE_ORDER[PACKAGE_ORDER.length - 1];
/** Ab welcher Drohnenzahl über `drones` hinaus das Motiv spielt (auf dem ganzen Regler); null, wenn es schon spielt. */
export function unlockAt(m, drones) {
  if (playable(m, pkgOf(drones), drones)) return null;
  const at = PACKAGE_ORDER.filter((p) => m.tiers[p]).map((p) => Math.max(m.tiers[p].minDrones ?? 0, DRONE_RANGES[p].min)).filter((c) => c > drones && pkgOf(c) && c <= DRONE_RANGES[pkgOf(c)].max);
  return at.length ? Math.min(...at) : null;
}

/** Motifs in the order they play; after the last one the sequence starts again. Eleventh version (10 October 2026):
 * five motifs per occasion and a sixth occasion, anchored on FlyingStars' shows and Marc's reference picks
 * (freelance/clients/flyingstars/06-show-animationen-2026-10/anker-runde-2). Motifs are own designs, not copies. */
export const OCCASIONS = [
  // Reihenfolge = Ablauf der Show. Die letzte Angabe ist die Sprosse der Freischalt-Leiter (ohne Angabe: SPARK-Einstieg).
  { id: 'hochzeit', label: 'Hochzeit', anlass: 'privat', motifs: [
    motif('ring', 'Ringe', v('weddingRings2d', 'Zwei Eheringe, der Stein funkelt'), v('rings3d', 'Ein Solitär in 3D: Ring und Brillant drehen sich'), v('ringsLink', 'Zwei Eheringe verschlingen sich in 3D und werden ein Solitär')),
    motif('herz', 'Herz', v('heart2d', 'Ein Herz, ein Schein wandert über die Linie'), v('heartTunnel', 'Ein Tunnel aus Herzen, Licht fließt hindurch'), v('heartsStory', 'Amors Pfeil trifft ein Herz in 3D, zwei Herzen umkreisen sich')),
    motif('lotus', 'Lotusblüten', null, v('lotus3d', 'Zwei Lotusblüten in 3D drehen sich ineinander'), v('lotusStory', 'Zwei Knospen blühen auf, drehen sich ineinander und werden eine Kugel aus Licht'), H1),
    motif('falter', 'Schmetterling', v('butterfly2d', 'Ein Schmetterling, die Flügel schimmern'), v('butterfly3d', 'Ein Schmetterling in 3D schlägt mit den Flügeln'), v('butterflyStory', 'Ein Schmetterling in 3D landet auf einer Blüte, aus der Blüte wird ein Herz'), S1),
    motif('glaeser', 'Sektgläser', v('flutes2d', 'Zwei Sektgläser stoßen an, ein Schein wandert über das Glas'), v('flutes3d', 'Sektgläser in 3D, die Perlen steigen'), v('flutesStory', 'Die Gläser stoßen an, die Perlen steigen als Herz auf')),
    motif('antrag', 'Antrag', null, null, v('ringStory', 'Ein Ringkästchen öffnet sich, der Ring findet den Ringfinger'), O1),
  ] },
  { id: 'jubilaeum', label: 'Jubiläum', anlass: 'sonstiges', motifs: [
    motif('wappen', 'Wappen', v('shield', 'Wappen mit Stern und wehender Fahne'), v('shield3d', '3D-Wappen mit eurer Zahl und wehender Fahne'), v('shieldStory', 'Aus dem Stern im Wappen wird eure Zahl, dazu Krone und Sternenkranz')),
    motif('fussball', 'Fußball', v('kick2d', 'Ein Spieler, der Ball dreht sich über dem Fuß'), v('kickHorizon', 'Der Spieler schießt, der Ball fliegt mit Drall'), v('kickStory', 'Ein Spieler schießt ins Tor, der Ball wird zu eurer Zahl'), S1),
    motif('wahrzeichen', 'Wahrzeichen', v('tower', 'Beispiel: Berliner Fernsehturm mit Warnlicht'), v('tower3d', 'Der Fernsehturm in 3D, Licht läuft um die Kugel'), v('towerStory', 'Der Fernsehturm sendet und wird zum Brandenburger Tor')),
    motif('pokal', 'Pokal', v('trophy2d', 'Ein Pokal, über ihm funkeln Sterne'), v('trophy3d', 'Der Pokal in 3D, Licht gleitet darüber'), v('trophyStory', 'Der Pokal wächst, eure Zahl steigt heraus')),
    motif('sprung', 'Kopfsprung', null, v('diveHorizon', 'Der Springer taucht ein, das Wasser bewegt sich in Ringen'), v('diveStory', 'Sprungbrett, Absprung, Eintauchen, Ringe breiten sich aus'), H1),
    motif('medaille', 'Medaille', null, null, v('medalStory', 'Die Ringe im Wasser werden zu eurer Zahl mit Medaillenband'), O1),
  ] },
  { id: 'launch', label: 'Launch', anlass: 'firma', motifs: [
    motif('rakete', 'Rakete', v('rocket', 'Rakete mit Flamme'), v('rocket3d', 'Die Rakete als Körper schwebt und dreht sich'), v('rocketLaunch', 'Start von der Rampe, die Rakete zieht in den Orbit um einen Planeten')),
    motif('mond', 'Mondlandung', null, null, v('moonStory', 'Aus dem Orbit landet die Rakete auf dem Mond, die Flagge weht'), O1),
    motif('logo', 'Logo', v('logo', 'Beispiel-Logo mit Lichtlauf'), v('logo3d', 'Beispiel-Logo in 3D mit Lichtschimmer'), v('logoStory', 'Euer Logo wird zum Ring aus Licht in 3D')),
    motif('idee', 'Glühbirne', v('bulb2d', 'Eine Glühbirne: die Idee'), v('bulb3d', 'Die Glühbirne in 3D, der Glühfaden leuchtet'), v('bulbStory', 'Um einen Glühfaden formt sich eine Glühbirne, die strahlt')),
    // der echte, scannbare Code braucht seine 198 Module plus Rahmen: erst ab HORIZON 250 (qr2d bleibt ungespielt)
    motif('qr', 'QR-Code', v('qr2d', 'QR-Code mit „Scan me“'), v('qrHorizon', 'Ein Lichtstrahl scannt, der QR-Code baut sich auf'), v('qrStory', 'Eine Nachricht kommt an, daraus wird ein scannbarer QR-Code'), H1),
    motif('spirale', 'Spirale', v('spiral2d', 'Eine Spirale, Licht läuft nach innen'), v('spiral3d', 'Eine Spirale in 3D, Licht steigt die Windungen hinauf'), v('spiralStory', 'Die Spirale wird zum Torus, der sich durch sich selbst dreht'), S1),
  ] },
  { id: 'kultur', label: 'Kultur', anlass: 'sonstiges', motifs: [
    motif('buch', 'Buch', v('book2d', 'Ein offenes Buch, Licht blättert die Seiten'), v('book3d', 'Das Buch öffnet sich in 3D, eine Seite wendet sich'), v('bookStory', 'Das Buch öffnet sich, eine Feder schreibt, die Zeilen steigen auf')),
    motif('vorhang', 'Vorhang', v('curtain', 'Der Vorhang bewegt sich im Luftzug'), v('curtainStar', 'Vorhang auf, ein 3D-Stern löst sich heraus'), v('curtainStory', 'Vorhang auf, Goldregen fällt, ein Stern steigt auf')),
    motif('maske', 'Masken', v('masks', 'Theatermasken: Komödie und Tragödie wiegen sich'), v('masks3d', 'Die Masken in 3D'), v('maskStory', 'Komödie und Tragödie verbinden sich zum Theaterzeichen'), S1),
    motif('noten', 'Musik', v('notes2d', 'Zwei Noten wiegen sich im Takt'), v('harpHorizon', 'Eine Harfe, Licht zupft die Saiten, Noten steigen auf'), v('harpStory', 'Die Saiten klingen, die Noten fliegen davon und werden eine Melodie')),
    // die Tänzerin dreht sich erst als Körper (HORIZON 250); dancer2d bleibt ungespielt
    motif('tanz', 'Tanz', v('dancer2d', 'Eine Tänzerin, ihr Rock schwingt'), v('dancer3d', 'Die Tänzerin dreht sich in 3D, der Rock fliegt'), v('dancerStory', 'Die Tänzerin dreht sich, der Rock wird zur Blüte, die Blüte zum Fächer'), H1),
    motif('teufel', 'Bokkenrijders', null, null, v('devilStory', 'Der Teufel aus unserer Show Bokkenrijders, eine echte Formation in 3D'), O1),
  ] },
  { id: 'silvester', label: 'Winter & Silvester', anlass: 'stadt', motifs: [
    motif('uhr', 'Uhr', v('clock', 'Die Zeiger laufen auf zwölf'), v('clock3d', '3D-Uhr, die Zeiger laufen'), v('clockStory', 'Mitternacht: Funken schwärmen aus und schreiben das neue Jahr')),
    motif('sekt', 'Sektkorken', null, v('champagne3d', 'Eine Sektflasche in 3D, die Perlen steigen im Licht'), v('champagneStory', 'Eine Sektflasche, der Korken knallt und fliegt im Bogen davon'), H1),
    motif('schnee', 'Lichterbaum', v('snow2d', 'Eine Schneeflocke dreht sich'), v('tree3d', 'Ein Lichterbaum als Spirale, Licht steigt hinauf'), v('treeStory', 'Aus einer Schneeflocke wird ein Lichterbaum, ein Stern geht auf')),
    motif('feuerwerk', 'Feuerwerk', v('fireworkSpark', 'Feuerwerkssterne leuchten nacheinander auf'), v('fireworkHorizon', 'Feuerwerk aus Licht: Sterne blühen und verglühen'), v('fireworkStory', 'Eine Leuchtspur steigt, Sterne blühen in Wellen'), S1),
    motif('finale', 'Finale', null, null, v('fireworkFinale', 'Finale: alle Sterne zugleich, dann fällt Goldregen'), O1),
    motif('klee', 'Kleeblatt', v('clover2d', 'Ein Glücksklee dreht sich'), v('clover3d', 'Der Glücksklee in 3D'), v('cloverStory', 'Aus drei Blättern werden vier: Glück fürs neue Jahr')),
  ] },
  { id: 'festival', label: 'Stadtfest', anlass: 'stadt', motifs: [
    motif('reise', 'Reise', v('compass2d', 'Ein Kompass, die Nadel sucht den Norden'), v('compass3d', 'Der Kompass in 3D, die Nadel schwingt ein'), v('travelStory', 'Die Stadt wird zur Karte, Pins leuchten auf, eine Route verbindet die Orte')),
    // der Papierflieger setzt die Reise fort (dieselbe Karte): direkt dahinter, ab ODYSSEY 450 ist es wieder eine Geschichte
    motif('flieger', 'Papierflieger', null, null, v('planeStory', 'Ein Papierflieger fliegt die Route ab und kreist um den Kompass'), O1),
    motif('kolibri', 'Kolibri', v('hummingbird2d', 'Ein Kolibri, die Flügel schwirren im Licht'), v('hummingbird3d', 'Ein Kolibri in 3D, die Flügel schlagen'), v('hummingbirdStory', 'Ein Kolibri fliegt zur Blüte, trinkt und steigt auf')),
    motif('riesenrad', 'Riesenrad', v('wheel2d', 'Ein Riesenrad dreht sich, die Gondeln hängen ruhig'), v('wheel3d', 'Das Riesenrad in 3D, die Gondeln leuchten'), v('wheelStory', 'Das Riesenrad zeichnet sich, dreht sich, über ihm blüht ein Stern'), S1),
    motif('delfin', 'Delfin', v('dolphin2d', 'Ein Delfin über einer Welle'), v('dolphin3d', 'Ein Delfin springt in 3D aus dem Wasser'), v('dolphinStory', 'Wellen, ein Delfin springt, taucht ein, zwei Delfine springen im Bogen')),
    motif('drache', 'Drache', null, v('dragon3d', 'Ein Drache in 3D, die Flügel schlagen'), v('dragonStory', 'Ein Drache steigt auf, kreist und speit ein Feuerwerk'), H1),
  ] },
];
