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

// spark may be null: some motifs need more than 100–150 drones to read (Marc, 10 October 2026: "Manche Motive sind mit
// 100–150 Drohnen einfach nicht umsetzbar"); SPARK then plays the occasion without them. horizon may be null too: a
// motif that only exists as a story (vierzehnte Fassung, see minDrones).
// minDrones steht am Motiv und an seiner ODYSSEY-Fassung (dieselbe Zahl; der Konfigurator liest sie an der Fassung,
// show-tempo.js minDronesOf, buildSequence und playable() am Motiv)
const motif = (id, label, spark, horizon, odyssey, minDrones) => ({ id, label, tiers: { ...(spark ? { SPARK: spark } : {}), ...(horizon ? { HORIZON: horizon } : {}), ODYSSEY: minDrones ? { ...odyssey, minDrones } : odyssey }, ...(minDrones ? { minDrones } : {}) });
const v = (build, caption) => ({ build, caption });

/**
 * Vierzehnte Fassung (Marc, 30.10.2026 abends): Freischalten nach Drohnenzahl, `minDrones` am Motiv. Zwei Schwellen:
 * - UNLOCK[0] = 300, der Einstieg in ODYSSEY: Motive, die nur als erzählte Geschichte bestehen (eigene Teile, echte
 *   3D-Handlung, Akte mit eigenem Bildausschnitt). Beim Wechsel HORIZON → ODYSSEY kommen sie dazu; ODYSSEY zeigt nie
 *   weniger Motive als HORIZON, jedes Motiv von HORIZON läuft in ODYSSEY als Geschichte weiter.
 * - UNLOCK[1] = 450: die wirklich komplexen Geschichten (viele Teile, drei Bildausschnitte, große Formation).
 * Die Einordnung steht mit Begründung in docs/show-motive-inventar.md und geht zur Prüfung an FlyingStars. PLATZHALTER:
 * Schwellen und Zuordnung sind nicht mit FlyingStars abgestimmt.
 */
export const UNLOCK = [300, 450];
/** Spielt dieses Motiv im Paket bei dieser Drohnenzahl? */
export const playable = (m, pkg, drones) => Boolean(m.tiers[pkg]) && (m.minDrones ?? 0) <= drones;

/** Motifs in the order they play; after the last one the sequence starts again. Eleventh version (10 October 2026):
 * five motifs per occasion and a sixth occasion, anchored on FlyingStars' shows and Marc's reference picks
 * (freelance/clients/flyingstars/06-show-animationen-2026-10/anker-runde-2). Motifs are own designs, not copies. */
export const OCCASIONS = [
  { id: 'hochzeit', label: 'Hochzeit', anlass: 'privat', motifs: [
    motif('ring', 'Ringe', v('weddingRings2d', 'Zwei Eheringe, der Stein funkelt'), v('rings3d', 'Ein Solitär in 3D: Ring und Brillant drehen sich'), v('ringsLink', 'Zwei Eheringe verschlingen sich in 3D und werden ein Solitär')),
    motif('herz', 'Herz', v('heart2d', 'Ein Herz, ein Schein wandert über die Linie'), v('heartTunnel', 'Ein Tunnel aus Herzen, Licht fließt hindurch'), v('heartsStory', 'Amors Pfeil trifft ein Herz in 3D, zwei Herzen umkreisen sich')),
    motif('lotus', 'Lotusblüten', null, null, v('lotusStory', 'Zwei Knospen blühen auf, drehen sich ineinander und werden eine Kugel aus Licht'), UNLOCK[0]),
    motif('falter', 'Schmetterling', v('butterfly2d', 'Ein Schmetterling, die Flügel schimmern'), v('butterfly3d', 'Ein Schmetterling in 3D schlägt mit den Flügeln'), v('butterflyStory', 'Ein Schmetterling in 3D landet auf einer Blüte, aus der Blüte wird ein Herz')),
    motif('glaeser', 'Sektgläser', v('flutes2d', 'Zwei Sektgläser stoßen an, ein Schein wandert über das Glas'), v('flutes3d', 'Sektgläser in 3D, die Perlen steigen'), v('flutesStory', 'Die Gläser stoßen an, die Perlen steigen als Herz auf')),
    motif('antrag', 'Antrag', null, null, v('ringStory', 'Ein Ringkästchen öffnet sich, der Ring findet den Ringfinger'), UNLOCK[1]),
  ] },
  { id: 'jubilaeum', label: 'Jubiläum', anlass: 'sonstiges', motifs: [
    motif('wappen', 'Wappen', v('shield', 'Wappen mit Stern und wehender Fahne'), v('shield3d', '3D-Wappen mit eurer Zahl und wehender Fahne'), v('shieldStory', 'Aus dem Stern im Wappen wird eure Zahl, dazu Krone und Sternenkranz')),
    motif('fussball', 'Fußball', v('kick2d', 'Ein Spieler, der Ball dreht sich über dem Fuß'), v('kickHorizon', 'Der Spieler schießt, der Ball fliegt mit Drall'), v('kickStory', 'Ein Spieler schießt ins Tor, der Ball wird zu eurer Zahl')),
    motif('wahrzeichen', 'Wahrzeichen', v('tower', 'Beispiel: Berliner Fernsehturm mit Warnlicht'), v('tower3d', 'Der Fernsehturm in 3D, Licht läuft um die Kugel'), v('towerStory', 'Der Fernsehturm sendet und wird zum Brandenburger Tor')),
    motif('pokal', 'Pokal', v('trophy2d', 'Ein Pokal, über ihm funkeln Sterne'), v('trophy3d', 'Der Pokal in 3D, Licht gleitet darüber'), v('trophyStory', 'Der Pokal wächst, eure Zahl steigt heraus')),
    motif('sprung', 'Kopfsprung', null, null, v('diveStory', 'Sprungbrett, Absprung, Eintauchen, die Ringe im Wasser werden zu eurer Zahl'), UNLOCK[0]),
  ] },
  { id: 'launch', label: 'Launch', anlass: 'firma', motifs: [
    motif('rakete', 'Rakete', v('rocket', 'Rakete mit Flamme'), v('rocket3d', 'Die Rakete als Körper schwebt und dreht sich'), v('rocketLaunch', 'Start von der Rampe, die Rakete zieht in den Orbit um einen Planeten')),
    motif('mond', 'Mondlandung', null, null, v('moonStory', 'Aus dem Orbit landet die Rakete auf dem Mond, die Flagge weht'), UNLOCK[0]),
    motif('logo', 'Logo', v('logo', 'Beispiel-Logo mit Lichtlauf'), v('logo3d', 'Beispiel-Logo in 3D mit Lichtschimmer'), v('logoStory', 'Euer Logo wird zum Ring aus Licht in 3D')),
    motif('idee', 'Glühbirne', v('bulb2d', 'Eine Glühbirne: die Idee'), v('bulb3d', 'Die Glühbirne in 3D, der Glühfaden leuchtet'), v('bulbStory', 'Um einen Glühfaden formt sich eine Glühbirne, die strahlt')),
    motif('qr', 'QR-Code', v('qr2d', 'QR-Code mit „Scan me“'), v('qrHorizon', 'Ein Lichtstrahl scannt, der QR-Code baut sich auf'), v('qrStory', 'Eine Nachricht kommt an, daraus wird ein scannbarer QR-Code')),
    motif('spirale', 'Spirale', v('spiral2d', 'Eine Spirale, Licht läuft nach innen'), v('spiral3d', 'Eine Spirale in 3D, Licht steigt die Windungen hinauf'), v('spiralStory', 'Die Spirale wird zum Torus, der sich durch sich selbst dreht')),
  ] },
  { id: 'kultur', label: 'Kultur', anlass: 'sonstiges', motifs: [
    motif('buch', 'Buch', v('book2d', 'Ein offenes Buch, Licht blättert die Seiten'), v('book3d', 'Das Buch öffnet sich in 3D, eine Seite wendet sich'), v('bookStory', 'Das Buch öffnet sich, eine Feder schreibt, die Zeilen steigen auf')),
    motif('vorhang', 'Vorhang', v('curtain', 'Der Vorhang bewegt sich im Luftzug'), v('curtainStar', 'Vorhang auf, ein 3D-Stern löst sich heraus'), v('curtainStory', 'Vorhang auf, Goldregen fällt, ein Stern steigt auf')),
    motif('maske', 'Masken', v('masks', 'Theatermasken: Komödie und Tragödie wiegen sich'), v('masks3d', 'Die Masken in 3D'), v('maskStory', 'Komödie und Tragödie verbinden sich zum Theaterzeichen')),
    motif('noten', 'Musik', v('notes2d', 'Zwei Noten wiegen sich im Takt'), v('harpHorizon', 'Eine Harfe, Licht zupft die Saiten, Noten steigen auf'), v('harpStory', 'Die Saiten klingen, die Noten fliegen davon und werden eine Melodie')),
    motif('tanz', 'Tanz', v('dancer2d', 'Eine Tänzerin, ihr Rock schwingt'), v('dancer3d', 'Die Tänzerin dreht sich in 3D, der Rock fliegt'), v('dancerStory', 'Die Tänzerin dreht sich, der Rock wird zur Blüte, die Blüte zum Fächer')),
    motif('teufel', 'Bokkenrijders', null, null, v('devilStory', 'Der Teufel aus unserer Show Bokkenrijders, eine echte Formation in 3D'), UNLOCK[0]),
  ] },
  { id: 'silvester', label: 'Winter & Silvester', anlass: 'stadt', motifs: [
    motif('uhr', 'Uhr', v('clock', 'Die Zeiger laufen auf zwölf'), v('clock3d', '3D-Uhr, die Zeiger laufen'), v('clockStory', 'Mitternacht: Funken schwärmen aus und schreiben das neue Jahr')),
    motif('sekt', 'Sektkorken', null, null, v('champagneStory', 'Eine Sektflasche, der Korken knallt und fliegt im Bogen davon'), UNLOCK[0]),
    motif('schnee', 'Lichterbaum', v('snow2d', 'Eine Schneeflocke dreht sich'), v('tree3d', 'Ein Lichterbaum als Spirale, Licht steigt hinauf'), v('treeStory', 'Aus einer Schneeflocke wird ein Lichterbaum, ein Stern geht auf')),
    motif('feuerwerk', 'Feuerwerk', v('fireworkSpark', 'Feuerwerkssterne leuchten nacheinander auf'), v('fireworkHorizon', 'Feuerwerk aus Licht: Sterne blühen und verglühen'), v('fireworkStory', 'Eine Leuchtspur steigt, Sterne blühen in Wellen, das Finale erleuchtet den Himmel')),
    motif('klee', 'Kleeblatt', v('clover2d', 'Ein Glücksklee dreht sich'), v('clover3d', 'Der Glücksklee in 3D'), v('cloverStory', 'Aus drei Blättern werden vier: Glück fürs neue Jahr')),
  ] },
  { id: 'festival', label: 'Stadtfest', anlass: 'stadt', motifs: [
    motif('reise', 'Reise', v('compass2d', 'Ein Kompass, die Nadel sucht den Norden'), v('compass3d', 'Der Kompass in 3D, die Nadel schwingt ein'), v('travelStory', 'Die Stadt wird zur Karte, Pins leuchten auf, ein Papierflieger fliegt die Route')),
    motif('kolibri', 'Kolibri', v('hummingbird2d', 'Ein Kolibri, die Flügel schwirren im Licht'), v('hummingbird3d', 'Ein Kolibri in 3D, die Flügel schlagen'), v('hummingbirdStory', 'Ein Kolibri fliegt zur Blüte, trinkt und steigt auf')),
    motif('delfin', 'Delfin', v('dolphin2d', 'Ein Delfin über einer Welle'), v('dolphin3d', 'Ein Delfin springt in 3D aus dem Wasser'), v('dolphinStory', 'Wellen, ein Delfin springt, taucht ein, zwei Delfine springen im Bogen')),
    motif('drache', 'Drache', null, null, v('dragonStory', 'Ein Drache steigt auf, kreist und speit ein Feuerwerk'), UNLOCK[0]),
  ] },
];
