import {formOccasionFor} from './occasions.mjs';
import { createTranslator } from '../i18n/ui.mjs';
/**
 * Show configurator prototype v9 (Marc, 7 October 2026). Two choices:
 *   Anlass picks a sequence of three motifs that plays as a little show (a real SPARK show also runs ten minutes
 *   through many pictures); Aufwand picks the package (one button per package, the only price driver).
 * Every motif has one version per package, so switching the package shows the SAME motif growing:
 *   SPARK = 2D pictures with gentle motion, HORIZON = 3D objects that move on their own, ODYSSEY = every motif told as
 *   a short story in acts with complex 3D animation. `build` names the picture builder in src/scripts/show-scenes.js.
 * Package texts are quoted from the client's reference; prices come from show-packages.ts only.
 */

import {PACKAGE_NAMES,packageLabel} from './package-identity.mjs';
import { DRONE_RANGES, DRONE_STEP, SHOW_ARTS, ART_TIER } from './show-packages.ts';
import catalog from './catalog-motifs.json' with { type: 'json' };
import { stufeKatalog, STUFE_EIGEN, STUFE_FORMATION } from '../scripts/scenes/catalog-3d/stufen.js';

export const PACKAGE_ORDER = PACKAGE_NAMES;
// The browser receives only its page dictionary; eager exports must use that same locale.
const defaultLocale=typeof document==='undefined'?'de':document.documentElement.lang;

const stepIncludes={
 SPARK:'showConfigurator.predefinedFormationsSuchAsHeartsOrRingsAndUpTo',
 HORIZON:'showConfigurator.everythingFromSparkPlusIndividual2dAnimationsAndSimple3d',
 ODYSSEY:'showConfigurator.everythingFromHorizonPlusComplex3dAnimationsVolumetricEffectsAnd',
};
function stepsFor(locale) { const t=createTranslator(locale);
 return PACKAGE_ORDER.map(pkg=>({pkg,label:packageLabel(pkg,t),includes:t(stepIncludes[pkg])}));
}
export const STEPS = stepsFor(defaultLocale);

/**
 * Sechzehnte Fassung (Marc, 31.10.2026: „Sehe ich das richtig, dass bei den meisten Anlässen keine neuen Motive
 * freigeschaltet werden, wenn wir mehr Drohnen auswählen? … mit mehr Drohnen neue, komplexere Motive freischalten“):
 * eine Freischalt-Leiter in jedem Paket. Der Einstieg folgt dem Drohnenbereich; die zweite Sprosse ist eine
 * feste inhaltliche Freischaltschwelle, unabhängig vom Vorschau-Maximum. Die Sprossen bleiben
 * SPARK 100/150, HORIZON 200/250, ODYSSEY 300/450.
 * Jedes Motiv nennt mit `from` die Sprosse, ab der es spielt ([Paket, 0 | 1]). Daraus bekommt jede Fassung ihr
 * `minDrones`: im ersten Paket die Zahl der Sprosse, in jedem größeren Paket dessen Einstieg. So gilt über den ganzen
 * Regler: Mehr Drohnen nehmen nie ein Motiv weg, und ein größeres Paket zeigt nie weniger Motive als ein kleineres.
 * Regeln (Wächter scripts/show-unlock.test.mjs): am Einstieg jedes Pakets mindestens drei Motive, in jedem Paket
 * mindestens eine Freischaltung innerhalb des Bereichs, die komplexeren Motive (mehr Teile, 3D, Geschichte) später.
 * PLATZHALTER: Die Zuordnung ist nicht mit FlyingStars abgestimmt (docs/show-motive-inventar.md, „Freischalt-Leiter“).
 */
// Runde 10: die zweite Sprosse von 3D+ liegt auf einer Preisstufe (300, 400, 500 …); 450 erschien seit Runde 9 erst bei 500
const SECOND_UNLOCK = { SPARK: 150, HORIZON: 250, ODYSSEY: 400 };
export const LADDER = Object.fromEntries(Object.entries(DRONE_RANGES).map(([pkg, { min }]) => [pkg, [min, SECOND_UNLOCK[pkg]]]));
/** Sprossen als Kurzform für die Motivliste. */
/** @type {[string, number]} */ const S0 = ['SPARK', 0];
/** @type {[string, number]} */ const S1 = ['SPARK', 1];
/** @type {[string, number]} */ const H1 = ['HORIZON', 1];
/** @type {[string, number]} */ const O0 = ['ODYSSEY', 0];
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

/**
 * Runde 10 (Marc 20.11.2026: „mindestens 2 freigeschaltete Motive“ bei 3D 250 und 2D 150, „Einige von den 110er/120er
 * Motiven könnten wir auf die 100-Drohnen-Kategorie runterbringen, damit es am Anfang nicht so leer wirkt“): Freischaltungen
 * gibt es nur auf diesen Stufen je Art, keine einzelnen bei 110, 130 oder 170. Jede Stufe, die etwas freischaltet, schaltet
 * mindestens zwei Motive frei (Wächter: scripts/show-unlock.test.mjs, über alle Anlässe und Arten).
 */
// Runde 11 (Marc 20.11.2026: „für ALLE Anlässe für jede 100er Steigerungsstufe mindestens 2 Motive … sonst checkt man den
// Mehrwert von mehr Drohnen nicht“): über den alten Stufen jede volle Hundert bis 1000. 2D endet bei 300, ab 400 wird
// 2D automatisch 3D (TWO_D_LIMIT in show-packages.ts). Große Motive liegen in scenes/gross/ und laden je Motiv nach.
const HUNDREDS = (from) => Array.from({ length: (1000 - from) / 100 + 1 }, (_, i) => from + i * 100);
export const STAGES = { SPARK: [100, 150, 200, 300], HORIZON: [200, 250, ...HUNDREDS(300)], ODYSSEY: [300, ...HUNDREDS(400)] };
/** Kleinste Stufe ab n (über der letzten: n selbst, der Wächter meldet das). */
const stage = (pkg, n) => STAGES[pkg].find((s) => s >= n) ?? n;
/**
 * Flache Katalogmotive, die mit weniger Drohnen gut aussehen, als ihre kleinste Katalogvariante Punkte hat (100: 101–153,
 * 150: Feuerwehr 164, Strandliege 153):
 * die Linien werden mit weniger Drohnen gezeichnet (scenes/catalog.js flatVariant). Am Kontaktbogen bei 100 geprüft
 * (Runde 10). Nicht dabei: Motive, deren Drohnen an jedem Katalogpunkt verankert sind (Elefant, Palme, Anker, Kind,
 * Drehzahlmesser, Blüten …; bei 100 fehlen dort Teile), die Fahnen (Raster aus 117 Punkten) und die Lotusblume (zu dünn).
 * Wächter: jedes Motiv spielt bei seiner Schwelle ohne abgeschnittene Teile (scripts/show-unlock.test.mjs).
 */
export const SPARK_AB = new Map([...['roboter', 'zahnraeder', 'sportwagen', 'lkw', 'sparschwein', 'smiley', 'handschlag', 'foerderturm', 'autoscooter', 'bierkrug', 'blume', 'unendlich', 'torte', 'fledermaeuse'].map((k) => [k, 100]), ['feuerwehr', 150], ['strandliege', 150]]);
/** Schwelle einer Katalogfassung: die gezählte Punktzahl (min), auf die Stufe der Art gebündelt. */
function catalogAb(key, pkg, min, first) {
  if (pkg === 'SPARK') return SPARK_AB.get(key) ?? stage(pkg, Math.max(min, 100));
  return stage(pkg, first ? Math.max(min, DRONE_RANGES[pkg].min) : DRONE_RANGES[pkg].min);
}
/**
 * Runde 10, Nachrunde (Marc: die aufwendigeren 3D-Körper „eher nein“ erst ab 250, sie bleiben bei 200): Kein Katalogmotiv mit
 * 3D-Fassung braucht mehr als 200 Drohnen (das größte, der Wasserball, hat 186 Punkte). 3D 250 schaltet darum in jedem Anlass
 * zwei Zugaben frei: thematisch passende 3D-Motive aus anderen Anlässen, die dort neu sind (in 2D ab 150, in 3D+ ab 300).
 */
const zugabe = (m) => ab(m, { SPARK: 150, HORIZON: 250 });
/** Runde 10: Schwelle einzelner Fassungen in einem Anlass anheben, z. B. ab(m, { SPARK: 150 }) (nie senken). */
function ab(m, at) {
  const tiers = { ...m.tiers };
  for (const [pkg, n] of Object.entries(at)) if (tiers[pkg]) tiers[pkg] = { ...tiers[pkg], minDrones: Math.max(tiers[pkg].minDrones ?? 0, n) };
  return { ...m, tiers, minDrones: Math.min(...Object.values(tiers).map((x) => x.minDrones ?? 0)) };
}

/**
 * Runde 24 (Marc, 05.11.2026: „die meisten Shows … in der 100- bis 150-Drohnen-Range … sehr viel Variation auch schon in
 * der Spark-Range“): Motive aus dem FlyingStars-Katalog (catalog-motifs.json, scripts/import-catalog.mjs). Die Mindestzahl
 * kommt aus den gezählten Punkten der kleinsten Variante (auf Zehner aufgerundet), nicht aus der Katalogbeschriftung und
 * nicht aus der Freischalt-Leiter: Ein Motiv mit 72 Punkten spielt ab 100, eins mit 113 ab 120, eins mit 153 ab 160.
 * Jedes Paket ab dem ersten passenden hat eine eigene Fassung (scenes/catalog.js): SPARK die Formation, HORIZON als
 * Körper, ODYSSEY Licht zeichnet die Form, dann wird sie zum Körper.
 */
const catalogMin = (key) => { const m = catalog.motifs[key]; if (!m) throw new Error(`Katalogmotiv ${key} fehlt`); return Math.ceil(m.variants[0].points / DRONE_STEP) * DRONE_STEP; };
const catalogName = (key, locale) => catalog.motifs[key].name[locale] ?? catalog.motifs[key].name.de;
/** Eine Fassung aus dem Katalog; der Bauname trägt Anlass und Paket, weil jede Fassung ihren eigenen Namen braucht. */
const catalogText = (key, locale, name) => (catalog.texts[key][locale] ?? catalog.texts[key].de).replace('{name}', name);
/** Bildunterschrift: flache Formationen bleiben in HORIZON eine Formation (kein „Körper in 3D“), ODYSSEY zeichnet sie mit Licht. */
const captionKey = (key, pkg, flat) => (pkg === 'ODYSSEY' ? 'story' : pkg === 'HORIZON' && !flat ? 'body' : catalog.motifs[key].source === 'show' ? 'captionShow' : 'caption');
const cv = (key, pkg, occasion, t, locale, flat = false) => v(`catalog:${key}:${pkg}:${occasion}`, catalogText(captionKey(key, pkg, flat), locale, catalogName(key, locale)));
/** Ein Motiv nur aus dem Katalog, in jedem Paket ab der Drohnenzahl seiner kleinsten Variante. */
function catalogMotif(key, occasion, t, locale, id = key) {
  // Runde 25b (Marc, 08.11.2026: HORIZON „mit einigen aus SPARK auffüllen, solange klar bleibt, dass viele Motive bei
  // HORIZON komplexer und 3D sind“): flache Formationen spielen wieder in jedem Paket, aber ohne zweite Ebene und in
  // HORIZON/ODYSSEY hinter den 3D-Motiven (buildSequence in show-scenes.js)
  const min = catalogMin(key), flat = catalog.motifs[key].dimension !== '3D';
  const first = PACKAGE_ORDER.findIndex((p) => min <= DRONE_RANGES[p].max);
  if (first < 0) throw new Error(`Katalogmotiv ${key} passt in kein Paket (${min} Drohnen)`);
  /** @type {Partial<Record<'SPARK' | 'HORIZON' | 'ODYSSEY', Version>>} */
  const tiers = {};
  PACKAGE_ORDER.forEach((pkg, i) => { if (i >= first) tiers[pkg] = { ...cv(key, pkg, occasion, t, locale, flat), minDrones: catalogAb(key, pkg, min, i === first) }; });
  return { id, label: catalogName(key, locale), tiers, minDrones: tiers[PACKAGE_ORDER[first]].minDrones, catalog: key, flat };
}
/** Motiv ohne die Fassung eines Pakets (z. B. weil eine Story desselben Anlasses das Bild dort schon zeigt). */
function withoutTier(m, pkg, coveredBy) {
  const { [pkg]: _drop, ...tiers } = m.tiers;
  return { ...m, tiers, coveredBy };
}
/** Ein eigenes Motiv bekommt die Katalogformation als SPARK-Fassung; es spielt ab deren Mindestzahl. */
function withCatalogSpark(m, key, occasion, t, locale) {
  const min = catalogAb(key, 'SPARK', catalogMin(key), true);
  return { ...m, tiers: { ...m.tiers, SPARK: { ...cv(key, 'SPARK', occasion, t, locale), minDrones: min } }, minDrones: min, catalog: key };
}

/** Sprossen der Leiter in Reihenfolge (alle Pakete), z. B. [100, 150, 200, 250, 300, 450]. */
export const UNLOCK = Object.values(LADDER).flat().sort((a, b) => a - b);
/** Spielt dieses Motiv im Paket bei dieser Drohnenzahl? (Mindestzahl an der Fassung des Pakets) */
export const playable = (m, pkg, drones) => Boolean(m.tiers[pkg]) && (m.tiers[pkg].minDrones ?? 0) <= drones;
/** Paket, dessen Bereich die Drohnenzahl enthält (wie packageForDrones in show-packages.ts, hier ohne TS-Import im Skript). */
const pkgOf = (drones) => PACKAGE_ORDER.find((p) => drones <= DRONE_RANGES[p].max) ?? PACKAGE_ORDER[PACKAGE_ORDER.length - 1];
/** Ab welcher Drohnenzahl über `drones` hinaus das Motiv spielt (auf dem ganzen Regler); null, wenn es schon spielt. */
// Runde 5 (Show-Art): mit `tier` gilt die Fassung der gewählten Art der Show (2D = SPARK, 3D = HORIZON, Storytelling =
// ODYSSEY) über den ganzen Regler, unabhängig vom früheren Drohnenbereich des Pakets.
export function unlockAt(m, drones, tier) {
  if (tier) { const at = m.tiers[tier]?.minDrones; return at !== undefined && at > drones ? at : null; }
  if (playable(m, pkgOf(drones), drones)) return null;
  const at = PACKAGE_ORDER.filter((p) => m.tiers[p]).map((p) => Math.max(m.tiers[p].minDrones ?? 0, DRONE_RANGES[p].min)).filter((c) => c > drones && pkgOf(c) && c <= DRONE_RANGES[pkgOf(c)].max);
  return at.length ? Math.min(...at) : null;
}

/** Motifs in the order they play; after the last one the sequence starts again. Eleventh version (10 October 2026):
 * five motifs per occasion and a sixth occasion, anchored on FlyingStars' shows and Marc's reference picks
 * (freelance/clients/flyingstars/06-show-animationen-2026-10/anker-runde-2). Motifs are own designs, not copies. */
// Runde 11 (Marc, 1.11.2026): Die Anlässe stehen in derselben Ordnung wie die Anlass-Karten der Startseite
// (src/content/pages/index.yaml, Section `occasions`): Unternehmen → Launch, gleich danach Jubiläum (auch Unternehmen),
// Städte & Gemeinden → Stadtfest, Hochzeit & Privat → Hochzeit, Festivals & Konzerte → Kultur, Silvester → Winter &
// Silvester. Agenturen und Indoor haben keinen eigenen Anlass. `season` wie an den Karten: In diesen Monaten rückt der
// Anlass nach vorn (bySeason unten). Vorausgewählt ist der erste Anlass dieser Ordnung, ein ?anlass=… gewinnt.
function occasionsFor(locale) { const t = createTranslator(locale);
return  [
  // Reihenfolge der Motive = Ablauf der Show. Die letzte Angabe ist die Sprosse der Freischalt-Leiter (ohne Angabe: SPARK-Einstieg).
  // Runde 24: Katalogmotive (catalogMotif) spielen ab ihrer gezählten Punktzahl; withCatalogSpark ersetzt nur die SPARK-Fassung.
  // Moritz' Preistext (17.11.2026): Winter & Silvester zuerst, „Launch“ heißt „Marketing“ (die ID bleibt für bestehende Links)
  { id: 'silvester', label: t('showConfigurator.winterAndNewYear'), season: [11, 12], motifs: [
    // Runde 9 (Marc 20.11.: „unspektakulär, wenn die erste Form die Uhr ist“): der Lichterbaum eröffnet, die Uhr folgt später
    motif('schnee', t('showConfigurator.lightTree'), v('snow2d', t('showConfigurator.aSnowflakeTurns')), v('snowTree3d', t('showConfigurator.aLightTreeAsASpiralLightAscends')), v('snowTreeStarStory', t('showConfigurator.aSnowflakeBecomesATreeOfLightsItsStarGrowsBig'))), // Runde 9: die Flocke faltet sich räumlich auf und wird zum Lichterbaum; Runde 10: in 3D+ wächst sein Stern ohne Wolke zum großen 3D-Stern (scenes/schnee.js)
    // Runde 11 (große Motive, Kandidat FSK-001): Adventskranz mit vier Kerzen nach dem Lichterbaum (Advent vor Silvester); in 3D+
    // hebt sich ein goldenes Band Stück für Stück zu den Flammen (scenes/gross/adventskranz.js). Runde 11b (Marc: „könnte auch mit
    // deutlich weniger Drohnen auskommen“): 2D ab 200, 3D ab 250, 3D+ ab 300 (vorher alle 300)
    ab(motif('adventskranz', t('showConfigurator.adventskranz.label'), v('adventskranz2d', t('showConfigurator.adventskranz.caption2d')), v('adventskranz3d', t('showConfigurator.adventskranz.caption3d')), v('adventskranzStory', t('showConfigurator.adventskranz.captionStory'))), { SPARK: 150, HORIZON: 200, ODYSSEY: 300 }), // Runde 11c: 2D 150, 3D 200 (Kontaktbogen: vergleichbar)
    // Runde 11b (große Motive, Kandidat FSK-006): Schlitten über einer Hügelkette, ab 500 in 3D und 3D+, nach dem Adventskranz
    // (Winter vor Silvester); in 3D+ hebt er ab, wendet und zieht die Spuren als Lichtbahnen hoch (scenes/gross/schlitten.js)
    ab(motif('schlitten', t('showConfigurator.schlitten.label'), null, v('sleigh3d', t('showConfigurator.schlitten.caption3d')), v('sleighStory', t('showConfigurator.schlitten.captionStory')), ['HORIZON', 0]), { HORIZON: 400, ODYSSEY: 400 }), // Runde 11c: ab 400 statt 500
    // Runde 11b (große Motive, Kandidat FSK-013): Polarlicht über einem Fjord, ab 800 in 3D und 3D+ (vier gestaffelte Lichtvorhänge,
    // Spiegelung im Wasser; in 3D+ entfalten sie sich, wandern über den Fjord, Lichtsturm), scenes/gross/polarlicht.js
    ab(motif('polarlicht', t('showConfigurator.polarlicht.label'), null, v('aurora3d', t('showConfigurator.polarlicht.caption3d')), v('auroraStory', t('showConfigurator.polarlicht.captionStory')), ['HORIZON', 0]), { HORIZON: 600, ODYSSEY: 600 }), // Runde 11c: ab 600 statt 800
    // Runde 11b (große Motive, FSK-012): Eisläuferpaar auf der Winterbahn, ab 400 in 3D und 3D+ (Runde 11c: Schwelle gesenkt, liest bei 400 wie bei 700) (scenes/gross/eislaeufer.js)
    ab(motif('eislaeufer', t('showConfigurator.eislaeufer.label'), null, v('skaters3d', t('showConfigurator.eislaeufer.caption3d')), v('skatersStory', t('showConfigurator.eislaeufer.captionStory')), ['HORIZON', 0]), { HORIZON: 400, ODYSSEY: 400 }),
    motif('uhr', t('showConfigurator.clock'), v('clock', t('showConfigurator.theHandsRunToTwelve')), v('clock3d', t('showConfigurator.3dWatchTheHandsAreRunning')), v('clockStory', t('showConfigurator.midnightSparksSwirlOutAndWriteTheNewYear'))),
    // Runde 11 (große Motive, Marc: Countdown ausdrücklich gewünscht): Steigerung der Uhr, direkt dahinter; aus dem Zifferblatt
    // wird ein Sekundenring, aus den Zeigern die „10“. In 3D+ drehen sich die letzten Ziffern durch die Tiefe und die Null
    // zerspringt zum Feuerwerk (scenes/gross/countdown.js). Runde 11b (Marc: „mit viiiiiel viel weniger Drohnen … geringere
    // Liniendichte“): 3D und 3D+ ab 400 statt 900
    ab(motif('countdown', t('showConfigurator.countdown.label'), null, v('countdown3d', t('showConfigurator.countdown.caption3d')), v('countdownStory', t('showConfigurator.countdown.captionStory')), ['HORIZON', 0]), { HORIZON: 300, ODYSSEY: 300 }), // Runde 11c: 3 → 0, ab 300
    catalogMotif('sektflasche', 'silvester', t, locale),
    // Runde 11b (große Motive, FSK-010): Silvesterfeier auf dem Marktplatz nach dem Countdown, geteilt mit dem Stadtfest, ab 500 (Runde 11c)
    // in 3D und 3D+; Laternen vom Rand zur Mitte, ein Lichtkreis steigt und öffnet sich zum Stern (scenes/gross/marktplatz.js)
    ab(motif('marktplatz', t('showConfigurator.marktplatz.label'), null, v('marketSquare3d', t('showConfigurator.marktplatz.caption3d')), v('marketSquareStory', t('showConfigurator.marktplatz.captionStory')), ['HORIZON', 0]), { HORIZON: 500, ODYSSEY: 500 }),
    // Runde 10: in 3D+ wächst der Baumstern schon zum großen 3D-Stern (snowTreeStarStory), der Katalogstern käme doppelt
    withoutTier(catalogMotif('stern', 'silvester', t, locale), 'ODYSSEY', 'schnee'),
    catalogMotif('diskokugel', 'silvester', t, locale),
    catalogMotif('marienkaefer', 'silvester', t, locale),
    catalogMotif('galaxie', 'silvester', t, locale),
    catalogMotif('kugel', 'silvester', t, locale),
    catalogMotif('atom', 'silvester', t, locale),
    catalogMotif('glocke', 'silvester', t, locale),
    catalogMotif('schneemann', 'silvester', t, locale),
    catalogMotif('lebkuchen', 'silvester', t, locale),
    catalogMotif('zuckerstange', 'silvester', t, locale),
    catalogMotif('anstossen', 'silvester', t, locale),
    zugabe(catalogMotif('cocktail', 'silvester', t, locale)), // Runde 10: Zugabe ab 3D 250 (Silvesterparty)
    motif('feuerwerk', t('showConfigurator.fireworks'), v('fireworkSpark', t('showConfigurator.fireworkStarsLightUpOneAfterTheOther')), v('fireworkHorizon', t('showConfigurator.fireworksOfLightStarsBloomAndBurn')), v('fireworkStory', t('showConfigurator.aTrailOfLightRisesStarsBloomInWaves'))), // Runde 10: 2D ab 100 (Kontaktbogen)
    ab(catalogMotif('konfetti', 'silvester', t, locale), { ODYSSEY: 400 }), // Runde 10: mit dem Finale die zweite Stufe von 3D+
    motif('sekt', t('showConfigurator.champagneCork'), null, v('champagne3d', t('showConfigurator.aChampagneBottleIn3dBubblesRiseInTheLight')), v('champagneStory', t('showConfigurator.aChampagneBottleTheCorkPopsAndFliesInAn')), H1),
    motif('finale', t('showConfigurator.finale'), null, null, v('fireworkFinale', t('showConfigurator.finaleAllStarsAtOnceThenGoldenRainFalls')), O1),
    motif('klee', t('showConfigurator.clover'), v('clover2d', t('showConfigurator.aLuckyCloverTurns')), v('clover3d', t('showConfigurator.theLuckyCloverIn3d')), v('cloverStory', t('showConfigurator.threeLeavesBecomeFourHappinessForTheNewYear'))),
  ] },
  { id: 'launch', label: t('showConfigurator.marketing'), motifs: [
    // Runde 10 (Marc 20.11.: „zuerst die Chat- und QR-Code-Sequenz als Einstieg, dann das Logo und dann erst die Rakete“);
    // der QR-Code spielt jetzt auch in 2D (qr2d, ab 100 Drohnen) und 3D
    ab(motif('qr', 'QR-Code', v('qr2d', t('showConfigurator.qrCodeWithScanMe')), v('qrHorizon', t('showConfigurator.aLightBeamScansTheQrCodeBuildsUp')), v('qrStory', t('showConfigurator.aMessageArrivesItBecomesAScannableQrCode'))), { SPARK: 150 }), // Marc 20.11.: „erst ab 150 Drohnen … wirklich brauchbar“; bei 100 eröffnet das Logo
    motif('logo', 'Logo', v('logo', t('showConfigurator.exampleLogoWithLightSkating')), v('logo3d', t('showConfigurator.exampleLogoIn3dWithLightGlimmer')), v('logoStory', t('showConfigurator.yourLogoBecomesA3dRingOfLight'))),
    motif('rakete', t('showConfigurator.rocket'), v('rocket', t('showConfigurator.rocketWithFlame')), v('rocket3d', t('showConfigurator.theRocketAsABodyFloatsAndRotates')), v('rocketLaunch', t('showConfigurator.launchFromThePadTheRocketEntersOrbitAroundA'))),
    motif('mond', t('showConfigurator.moonLanding'), null, null, v('moonStory', t('showConfigurator.theRocketLeavesOrbitAndLandsOnTheMoonA')), O1),
    // Runde 11 (große Motive): der Satellit als Steigerung von Rakete und Mondlandung, ab 700 in 3D und 3D+; seine Teile
    // heißen wie in der Mondlandung, die Drohnen bleiben beim Wechsel in ihrem Teil (scenes/gross/satellit.js)
    ab(motif('satellit', t('showConfigurator.satellite'), null, v('satellite3d', t('showConfigurator.satellite3dCaption')), v('satelliteStory', t('showConfigurator.satelliteStoryCaption')), ['HORIZON', 0]), { HORIZON: 400, ODYSSEY: 400 }), // Runde 11c: liest ab 400
    catalogMotif('galaxie', 'launch', t, locale),
    catalogMotif('batterie', 'launch', t, locale),
    catalogMotif('atom', 'launch', t, locale),
    // Runde 11c (Marc 21.11.: „der Robotergreifer … könnte in 3D+ ja auch Teil von der aktuellen Story mit dem süßen Roboter
    // … werden“): in 3D+ erzählt der kleine Roboter weiter; ab 400 wird er zum Greifarm, der ein Modul einsetzt
    // (robotGripperStory in scenes/gross/robotergreifer.js, die Akte des Roboters bleiben unverändert davor)
    ((m) => ({ ...m, tiers: { ...m.tiers, ODYSSEY: { ...m.tiers.ODYSSEY, build: 'robotGripperStory' } } }))(catalogMotif('roboter', 'launch', t, locale)),
    // Robotergreifer hinter dem Kleinen Roboter, ab 400 in 3D; in 3D+ steckt er in der Roboter-Geschichte (coveredBy)
    withoutTier(ab(motif('robotergreifer', t('showConfigurator.robotArm'), null, v('robotArm3d', t('showConfigurator.robotArm3dCaption')), v('robotArmStory', t('showConfigurator.robotArmStoryCaption')), ['HORIZON', 0]), { HORIZON: 400 }), 'ODYSSEY', 'roboter'),
    catalogMotif('zahnraeder', 'launch', t, locale),
    // Runde 11b (große Motive): Förderband hinter den Zahnrädern (die Mechanik läuft weiter), ab 500 in 3D und 3D+ (scenes/gross/foerderband.js)
    ab(motif('foerderband', t('showConfigurator.conveyor'), null, v('conveyor3d', t('showConfigurator.conveyor3dCaption')), v('conveyorStory', t('showConfigurator.conveyorStoryCaption')), ['HORIZON', 0]), { HORIZON: 400, ODYSSEY: 400 }), // Runde 11c: liest ab 400
    motif('idee', t('showConfigurator.lightBulb'), v('bulb2d', t('showConfigurator.aLightBulbTheIdea')), v('bulb3d', t('showConfigurator.theLightBulbIn3dTheLightFadeNIs')), v('bulbStory', t('showConfigurator.aLightBulbFormsAroundAFilamentAndShines'))),
    catalogMotif('drehzahl', 'launch', t, locale),
    catalogMotif('sportwagen', 'launch', t, locale),
    catalogMotif('hubschrauber', 'launch', t, locale),
    ab(catalogMotif('flugzeug', 'launch', t, locale), { ODYSSEY: 400 }), // Runde 10: mit der Mondlandung die zweite Stufe von 3D+
    catalogMotif('kugel', 'launch', t, locale),
    catalogMotif('moebius', 'launch', t, locale),
    ab(catalogMotif('pyramide', 'launch', t, locale), { SPARK: 200 }), // Runde 10: in 2D mit der Batterie ab 200 (je Stufe mindestens zwei)
    withCatalogSpark(motif('spirale', t('showConfigurator.spiral'), v('spiral2d', t('showConfigurator.aSpiralLightRunningInwards')), v('spiral3d', t('showConfigurator.aSpiralIn3dLightRisesTheWindings')), v('spiralStory', t('showConfigurator.theSpiralBecomesTheTorusThatRotatesByItself')), S1), 'spirale', 'launch', t, locale),
    zugabe(catalogMotif('mikrofon', 'launch', t, locale)), // Runde 10: Zugaben ab 3D 250 (Präsentation, Star-Produkt)
    zugabe(catalogMotif('stern', 'launch', t, locale)),
  ] },
  { id: 'jubilaeum', label: t('showConfigurator.jubilee'), motifs: [
    motif('wappen', t('showConfigurator.arms'), v('shield', t('showConfigurator.coatOfArmsWithStarAndFlyingFlag')), v('shield3d', t('showConfigurator.3dCoatOfArmsWithYourNumberAndWavingFlag')), v('shieldStory', t('showConfigurator.fromTheStarInTheCoatOfArmsBecomesYour'))),
    catalogMotif('ballons', 'jubilaeum', t, locale),
    catalogMotif('fahnen', 'jubilaeum', t, locale),
    motif('fussball', t('showConfigurator.football'), v('kick2d', t('showConfigurator.aPlayerTheBallRotatesOverHisFoot')), v('kickHorizon', t('showConfigurator.thePlayerShootsTheBallSpinsThroughTheAir')), v('kickStory', t('showConfigurator.aPlayerScoresTheBallBecomesYourNumber')), S1),
    // Runde 11b (große Motive, FSK-038): Radfahrer im Zielbogen, geteilt mit dem Stadtfest (dort Stadtrennen, hier Ziel erreicht),
    // ab 400 in 3D und 3D+ (Runde 11c; 3D+ zeigt nie weniger als 3D, und bei 300 zerfasert der Fahrer in der Zieleinfahrt) nach dem Fußballer (scenes/gross/radfahrer.js)
    ab(motif('radfahrer', t('showConfigurator.radfahrer.label'), null, v('cyclist3d', t('showConfigurator.radfahrer.caption3d')), v('cyclistStory', t('showConfigurator.radfahrer.captionStory')), ['HORIZON', 0]), { HORIZON: 400, ODYSSEY: 400 }),
    catalogMotif('jubilaeum30', 'jubilaeum', t, locale),
    catalogMotif('geburtstag', 'jubilaeum', t, locale),
    catalogMotif('golfer', 'jubilaeum', t, locale),
    catalogMotif('golfplatz', 'jubilaeum', t, locale),
    catalogMotif('golfcaddy', 'jubilaeum', t, locale),
    catalogMotif('planierraupe', 'jubilaeum', t, locale),
    catalogMotif('bagger', 'jubilaeum', t, locale),
    catalogMotif('lkw', 'jubilaeum', t, locale),
    // Runde 11b (große Motive): Firmensitz hinter Bagger und LKW (Baustelle), ab 700 in 3D und 3D+ (scenes/gross/firmensitz.js)
    ab(motif('firmensitz', t('showConfigurator.headquarters'), null, v('headquarters3d', t('showConfigurator.headquarters3dCaption')), v('headquartersStory', t('showConfigurator.headquartersStoryCaption')), ['HORIZON', 0]), { HORIZON: 400, ODYSSEY: 400 }), // Runde 11c: ab 400 mit 6 Etagen
    catalogMotif('feuerwehr', 'jubilaeum', t, locale),
    catalogMotif('schluessel', 'jubilaeum', t, locale),
    catalogMotif('sparschwein', 'jubilaeum', t, locale),
    catalogMotif('basketball', 'jubilaeum', t, locale),
    catalogMotif('smiley', 'jubilaeum', t, locale),
    // Runde 10b (Marc: „Eine Mischung aus beidem“): derselbe Fernsehturm wie im Stadtfest (scenes/wahrzeichen.js); die alten Szenen
    // tower/tower3d/towerStory bleiben nur für die Show-Folge der Startseite (himmel/folge.js)
    motif('wahrzeichen', t('showConfigurator.landmarks'), v('fernsehturm2d', t('showConfigurator.exampleBerlinTvTowerWithWarningLight')), v('fernsehturm3d', t('showConfigurator.wahrzeichen.fernsehturm3d')), v('fernsehturmPlus', t('showConfigurator.wahrzeichen.fernsehturmPlus'))),
    // Runde 11b (große Motive, FSK-049): Werkhalle wird Zukunftscampus, nach den Wahrzeichen, 3D und 3D+ ab 700 (Runde 11c, vorher 1000; in 3D+ wird der Rauch ein Lichtstrom, der den Campus baut)
    ab(motif('werkhalle', t('showConfigurator.factoryCampus'), null, v('factoryCampus3d', t('showConfigurator.factoryCampus3dCaption')), v('factoryCampusStory', t('showConfigurator.factoryCampusStoryCaption')), ['HORIZON', 0]), { HORIZON: 700, ODYSSEY: 700 }), // scenes/gross/werkhalle.js
    catalogMotif('handschlag', 'jubilaeum', t, locale),
    catalogMotif('stern', 'jubilaeum', t, locale),
    catalogMotif('atom', 'jubilaeum', t, locale),
    catalogMotif('pyramide', 'jubilaeum', t, locale),
    motif('pokal', t('showConfigurator.cup'), v('trophy2d', t('showConfigurator.aCupAboveItSparklingStars')), v('trophy3d', t('showConfigurator.theCupIn3dLightGlidesOverIt')), v('trophyStory', t('showConfigurator.theCupGrowsYourNumberRisesOut'))),
    zugabe(catalogMotif('sektflasche', 'jubilaeum', t, locale)), // Runde 10: Zugaben ab 3D 250 (anstoßen aufs Jubiläum)
    zugabe(catalogMotif('anstossen', 'jubilaeum', t, locale)),
    catalogMotif('konfetti', 'jubilaeum', t, locale),
    ab(motif('sprung', t('showConfigurator.head'), null, v('diveHorizon', t('showConfigurator.theJumperDipsInTheWaterMovesInRings')), v('diveStory', t('showConfigurator.divingBoardTakeOffSplashRipplesSpread')), H1), { ODYSSEY: 400 }), // Runde 10: mit der Medaille
    motif('medaille', t('showConfigurator.medal'), null, null, v('medalStory', t('showConfigurator.theRipplesBecomeYourNumberOnAMedalRibbon')), O1),
  ] },
  { id: 'festival', label: t('showConfigurator.cityFestival'), motifs: [
    // Runde 10 (Marc 20.11.: das Stadtfest wirkt bei 100 Drohnen „zu random“): vorn steht, was zu einem Stadtfest gehört
    // (Wahrzeichen und Jahreszahl trägt Agent W hier ein, Ballons, Riesenrad, Autoscooter, Getränke, Stern, Förderturm, die
    // Reise durch die Stadt); Tiere und Strand folgen am Ende und erst ab 150 Drohnen
    // Runde 10, Agent W: Wahrzeichen und Jahreszahl (scenes/wahrzeichen.js, docs/katalog-wahrzeichen.md), in 2D ab 100 Drohnen
    motif('fernsehturm', t('showConfigurator.wahrzeichen.fernsehturm'), v('fernsehturm2d', t('showConfigurator.wahrzeichen.fernsehturm2d')), v('fernsehturm3d', t('showConfigurator.wahrzeichen.fernsehturm3d')), v('fernsehturmPlus', t('showConfigurator.wahrzeichen.fernsehturmPlus'))),
    motif('brandenburgertor', t('showConfigurator.wahrzeichen.tor'), v('tor2d', t('showConfigurator.wahrzeichen.tor2d')), v('tor3d', t('showConfigurator.wahrzeichen.tor3d')), v('torPlus', t('showConfigurator.wahrzeichen.torPlus'))),
    motif('koelnerdom', t('showConfigurator.wahrzeichen.dom'), v('dom2d', t('showConfigurator.wahrzeichen.dom2d')), v('dom3d', t('showConfigurator.wahrzeichen.dom3d')), v('domPlus', t('showConfigurator.wahrzeichen.domPlus'))),
    motif('elbphilharmonie', t('showConfigurator.wahrzeichen.elphi'), v('elphi2d', t('showConfigurator.wahrzeichen.elphi2d')), v('elphi3d', t('showConfigurator.wahrzeichen.elphi3d')), v('elphiPlus', t('showConfigurator.wahrzeichen.elphiPlus'))),
    motif('rheinturm', t('showConfigurator.wahrzeichen.rheinturm'), v('rheinturm2d', t('showConfigurator.wahrzeichen.rheinturm2d')), v('rheinturm3d', t('showConfigurator.wahrzeichen.rheinturm3d')), v('rheinturmPlus', t('showConfigurator.wahrzeichen.rheinturmPlus'))),
    motif('schwebebahn', t('showConfigurator.wahrzeichen.schwebebahn'), v('schwebebahn2d', t('showConfigurator.wahrzeichen.schwebebahn2d')), v('schwebebahn3d', t('showConfigurator.wahrzeichen.schwebebahn3d')), v('schwebebahnPlus', t('showConfigurator.wahrzeichen.schwebebahnPlus'))),
    motif('jahreszahl', t('showConfigurator.wahrzeichen.jahre'), v('jahre2d', t('showConfigurator.wahrzeichen.jahre2d')), v('jahre3d', t('showConfigurator.wahrzeichen.jahre3d')), v('jahrePlus', t('showConfigurator.wahrzeichen.jahrePlus'))),
    // Runde 10 (Marc: „Ja“ zu Skyline und Siegessäule, Bremer Schlüssel nach dem Wappenbild): Schlüssel ab 100, Skyline und
    // Siegessäule erst ab 150 (bei 100 zerfasert die Skyline, die Viktoria wird zum Klumpen; Kontaktbogen, docs/katalog-wahrzeichen.md)
    motif('bremerschluessel', t('showConfigurator.wahrzeichen.schluessel'), v('schluessel2d', t('showConfigurator.wahrzeichen.schluessel2d')), v('schluessel3d', t('showConfigurator.wahrzeichen.schluessel3d')), v('schluesselPlus', t('showConfigurator.wahrzeichen.schluesselPlus'))),
    ab(motif('frankfurtskyline', t('showConfigurator.wahrzeichen.skyline'), v('skyline2d', t('showConfigurator.wahrzeichen.skyline2d')), v('skyline3d', t('showConfigurator.wahrzeichen.skyline3d')), v('skylinePlus', t('showConfigurator.wahrzeichen.skylinePlus'))), { SPARK: 150 }),
    ab(motif('siegessaeule', t('showConfigurator.wahrzeichen.siegessaeule'), v('siegessaeule2d', t('showConfigurator.wahrzeichen.siegessaeule2d')), v('siegessaeule3d', t('showConfigurator.wahrzeichen.siegessaeule3d')), v('siegessaeulePlus', t('showConfigurator.wahrzeichen.siegessaeulePlus'))), { SPARK: 150 }),
    catalogMotif('ballons', 'festival', t, locale),
    // Runde 11b (große Motive, FSK-010): Fest auf dem Marktplatz nach den Wahrzeichen, geteilt mit Winter & Silvester, ab 500 (Runde 11c)
    ab(motif('marktplatz', t('showConfigurator.marktplatz.label'), null, v('marketSquare3d', t('showConfigurator.marktplatz.caption3d')), v('marketSquareStory', t('showConfigurator.marktplatz.captionStory')), ['HORIZON', 0]), { HORIZON: 500, ODYSSEY: 500 }),
    // Runde 10: das Riesenrad (2D am Kontaktbogen bei 100 geprüft) gehört an den Anfang
    motif('riesenrad', t('showConfigurator.ferrisWheel'), v('wheel2d', t('showConfigurator.aFerrisWheelTurnsItsGondolasHangStill')), v('wheel3d', t('showConfigurator.theFerrisWheelIn3dTheGondolasLightUp')), v('wheelStory', t('showConfigurator.aFerrisWheelTakesShapeAndTurnsAStarBlooms'))),
    // Runde 11b (FSK-029): Schallfeld zwischen zwei Lautsprechern (Konzert) ab 600 (Runde 11c, vorher 900), dieselbe Fassung wie in Kultur
    ab(motif('schallfeld', t('showConfigurator.soundField'), null, v('soundField3d', t('showConfigurator.soundField3dCaption')), v('soundFieldStory', t('showConfigurator.soundFieldStoryCaption')), ['HORIZON', 0]), { HORIZON: 600, ODYSSEY: 600 }), // scenes/gross/schallfeld.js
    catalogMotif('autoscooter', 'festival', t, locale),
    catalogMotif('bierkrug', 'festival', t, locale),
    catalogMotif('cocktail', 'festival', t, locale),
    catalogMotif('stern', 'festival', t, locale),
    catalogMotif('foerderturm', 'festival', t, locale),
    // der Papierflieger setzt die Reise fort (dieselbe Karte): direkt dahinter, ab 3D+ 400 ist es wieder eine Geschichte
    motif('reise', t('showConfigurator.travel'), v('compass2d', t('showConfigurator.aCompassTheNeedleSeeksTheNorth')), v('compass3d', t('showConfigurator.theCompassIn3dTheNeedleSwingsIn')), v('travelStory', t('showConfigurator.theCityBecomesAMapPinsLightUpAndA'))),
    motif('flieger', t('showConfigurator.paperPlane'), null, null, v('planeStory', t('showConfigurator.aPaperPlaneFollowsTheRouteAndCirclesTheCompass')), O1),
    // Runde 11b (große Motive, FSK-038): Stadtrennen, der Radfahrer sprintet durch den Zielbogen, geteilt mit dem Jubiläum,
    // ab 400 in 3D und 3D+ (Runde 11c; 3D+ zeigt nie weniger als 3D, und bei 300 zerfasert der Fahrer in der Zieleinfahrt) (scenes/gross/radfahrer.js)
    ab(motif('radfahrer', t('showConfigurator.radfahrer.label'), null, v('cyclist3d', t('showConfigurator.radfahrer.caption3d')), v('cyclistStory', t('showConfigurator.radfahrer.captionStory')), ['HORIZON', 0]), { HORIZON: 400, ODYSSEY: 400 }),
    catalogMotif('kind', 'festival', t, locale),
    catalogMotif('anker', 'festival', t, locale),
    catalogMotif('leuchtturm', 'festival', t, locale),
    catalogMotif('traktor', 'festival', t, locale),
    catalogMotif('berge', 'festival', t, locale),
    catalogMotif('wasserball', 'festival', t, locale),
    zugabe(catalogMotif('mikrofon', 'festival', t, locale)), // Runde 10: Zugaben ab 3D 250 (Bühne, Sommerfest)
    zugabe(catalogMotif('sonne', 'festival', t, locale)),
    ab(motif('kolibri', t('showConfigurator.kolibrium'), v('hummingbird2d', t('showConfigurator.aHummingbirdTheWingsSwirlInTheLight')), v('hummingbird3d', t('showConfigurator.aHummingbirdIn3dThatBeatsWings')), v('hummingbirdStory', t('showConfigurator.aHummingbirdFliesToFlowerDrinksAndAscends'))), { SPARK: 150 }),
    ab(catalogMotif('biene', 'festival', t, locale), { SPARK: 150 }),
    ab(catalogMotif('hund', 'festival', t, locale), { SPARK: 150 }),
    // Runde 9: Drache vor Delfin. Beide Geschichten beginnen mit einer Wolke; mit den 3D+-Szenen davor lägen sonst sechs Bilder
    // zwischen ihnen, und der Wolkenplan bräuchte zwei Wolken direkt hintereinander (scripts/show-clouds.test.mjs)
    // Runde 10b (Marc 20.11.: der Drache sah „mega krass 2D“ aus): 3D ab 200 ein aufsteigender Drache als Körper, 3D+ der
    // aztekische Drachenkopf als Relief, der sich zu euch dreht und Feuer speit (scenes/catalog-3d/drache.js), ab 300: 3D+ zeigt
    // nie weniger als 3D (scripts/show-unlock.test.mjs). dragon3d/dragonStory (scenes/festival.js) bleiben ungespielt im Code.
    motif('drache', t('showConfigurator.dragon'), null, v('dragonRise', t('showConfigurator.dragonRiseCaption')), v('dragonHead', t('showConfigurator.dragonHeadCaption')), ['HORIZON', 0]),
    // Runde 11b: die Delfin-Geschichte schaltet mit dem Papierflieger 3D+ 400 frei (ohne den Drachenflug, Marc: „sieht mega weird aus“,
    // stünde dort nur noch der Flieger; je Stufe mindestens zwei, scripts/show-unlock.test.mjs). In 3D spielt der Delfin nicht.
    ab(motif('delfin', t('showConfigurator.dolphin'), v('dolphin2d', t('showConfigurator.aDolphinOverAWave')), v('dolphin3d', t('showConfigurator.aDolphinJumpsOutOfTheWaterIn3d')), v('dolphinStory', t('showConfigurator.wavesOneDolphinJumpsDivesInTwoDolphinsJumpIn'))), { SPARK: 150, ODYSSEY: 400 }),
    // Runde 11 (große Motive): Tintenfisch hinter dem Delfin (Meer; Runde 11b ohne Korallen), ab 400 in 3D und 3D+ (scenes/gross/tintenfisch.js)
    ab(motif('tintenfisch', t('showConfigurator.octopus'), null, v('octopus3d', t('showConfigurator.octopus3dCaption')), v('octopusStory', t('showConfigurator.octopusStoryCaption')), ['HORIZON', 0]), { HORIZON: 400, ODYSSEY: 400 }), // Runde 11c: liest ab 300, bleibt aber bei 400 (bei 300 meldet der Finten-Wächter das Entrollen)
    // Marc 20.11.: nicht streichen, ans Ende (nur 2D, ab 150; Kuh mit UFO ab 200)
    catalogMotif('elefant', 'festival', t, locale),
    catalogMotif('hasen', 'festival', t, locale),
    catalogMotif('robbe', 'festival', t, locale),
    catalogMotif('strandliege', 'festival', t, locale),
    catalogMotif('palme', 'festival', t, locale),
    catalogMotif('kuhufo', 'festival', t, locale),
  ] },
  { id: 'hochzeit', label: t('site.wedding'), motifs: [
    motif('ring', t('showConfigurator.rings'), v('weddingRings2d', t('showConfigurator.twoWeddingRingsTheStoneSparkles')), v('rings3d', t('showConfigurator.aSolitaireIn3dRingAndBrilliantSpin')), v('ringsLink', t('showConfigurator.twoWeddingRingsIntertwineIn3dAndBecomeASolitaire'))),
    // Runde 10 (Marc 20.11.: „warum ist dieses schöne Ring-auf-Hand-Motiv jetzt weg? … Bring it back please.“): seit Runde 9
    // springt der 3D+-Regler in Hunderten, die Schwelle 450 erschien erst bei 500. Jetzt ab dem Einstieg in 3D+ (300), direkt
    // nach den Ringen; nur in 3D+, weil es eine Geschichte in drei Akten ist (Ring, Schachtel, Hand)
    motif('antrag', t('showConfigurator.proposal'), null, null, v('ringStory', t('showConfigurator.aRingBoxOpensTheRingFindsTheRingFinger')), O0),
    // Runde 11 (große Motive): Erster Tanz auf dem Parkettkreis, ab 300 in 3D und 3D+ (Runde 11c), direkt nach dem Antrag (in 3D nach den
    // Ringen); zwei gegliederte Figuren nach der Bauweise des 3D-Fußballers, das Kleid schwingt mit Nachlauf (scenes/gross/erster-tanz.js)
    ab(motif('erstertanz', t('showConfigurator.firstDance'), null, v('firstDance3d', t('showConfigurator.firstDance3dCaption')), v('firstDanceStory', t('showConfigurator.firstDanceStoryCaption')), ['HORIZON', 0]), { HORIZON: 300, ODYSSEY: 300 }),
    catalogMotif('doppelherz', 'hochzeit', t, locale),
    catalogMotif('tor', 'hochzeit', t, locale),
    // Runde 11b (große Motive): Blütenspalier mit Lichterweg hinter dem Tor (vom Tor auf den Weg), ab 500 in 3D und 3D+
    // (Runde 11c: unter 600 mit drei Bögen statt vier, vorher ab 700);
    // ein Tunnel aus Rosenbögen fasst den Weg, die Blüten öffnen sich paarweise zur Mitte (scenes/gross/spalier.js)
    ab(motif('spalier', t('showConfigurator.spalier'), null, v('spalier3d', t('showConfigurator.spalier3dCaption')), v('spalierStory', t('showConfigurator.spalierStoryCaption')), ['HORIZON', 0]), { HORIZON: 500, ODYSSEY: 500 }),
    catalogMotif('eheringe', 'hochzeit', t, locale),
    catalogMotif('torte', 'hochzeit', t, locale),
    // Runde 11b (große Motive): die geöffnete Pralinenschachtel hinter der Torte, ab 400 in 3D und 3D+ (Runde 11c: unter
    // 600 zwölf Pralinen statt 18, vorher ab 600); Herzschachtel mit
    // Fächern und vier Pralinenformen, in 3D+ steigen die Pralinen ins Deckelherz (scenes/gross/pralinen.js)
    ab(motif('pralinen', t('showConfigurator.pralinen'), null, v('pralinen3d', t('showConfigurator.pralinen3dCaption')), v('pralinenStory', t('showConfigurator.pralinenStoryCaption')), ['HORIZON', 0]), { HORIZON: 400, ODYSSEY: 400 }),
    motif('herz', t('showConfigurator.heart'), v('heart2d', t('showConfigurator.aHeartLightTravelsAlongItsOutline')), v('heartTunnel', t('showConfigurator.aTunnelOfHeartsLightFlowingThrough')), v('heartsStory', t('showConfigurator.cupidSArrowStrikesA3dHeartTwoHeartsOrbit'))),
    // Runde 10b (Marc: „die Initialen sind nicht richtig im Herz drin … das nehmen, was wir sonst dynamisch über ‚Euer Text
    // oder Logo' definieren“): Herz und Initialen über denselben Weg wie der eigene Text (scenes/text.js, Stil initials), nur 2D
    { ...motif('initialen', catalogName('initialen', locale), { build: 'textSPARK', caption: t('showConfigurator.aHeartWithYourInitials'), value: 'A & T', style: 'initials', occasion: 'hochzeit' }, null, null), flat: true },
    catalogMotif('amor', 'hochzeit', t, locale),
    catalogMotif('taube', 'hochzeit', t, locale),
    withCatalogSpark(motif('glaeser', t('showConfigurator.sparklingGlasses'), v('flutes2d', t('showConfigurator.twoChampagneGlassesClinkLightGlidesAcrossTheGlass')), v('flutes3d', t('showConfigurator.sparklingGlassesIn3dThePearlsRise')), v('flutesStory', t('showConfigurator.theGlassesStrikeThePearlsRiseAsHeart'))), 'anstossen', 'hochzeit', t, locale),
    catalogMotif('schleife', 'hochzeit', t, locale),
    catalogMotif('blueten', 'hochzeit', t, locale),
    catalogMotif('blume', 'hochzeit', t, locale),
    catalogMotif('blume2', 'hochzeit', t, locale),
    catalogMotif('lotusblume', 'hochzeit', t, locale),
    catalogMotif('unendlich', 'hochzeit', t, locale),
    catalogMotif('moebius', 'hochzeit', t, locale),
    zugabe(catalogMotif('glocke', 'hochzeit', t, locale)), // Runde 10: Zugaben ab 3D 250 (Hochzeitsglocken, Sekt)
    zugabe(catalogMotif('sektflasche', 'hochzeit', t, locale)),
    ab(withCatalogSpark(motif('falter', t('showConfigurator.butterfly'), v('butterfly2d', t('showConfigurator.aButterflyTheWingsShimmering')), v('butterfly3d', t('showConfigurator.aButterflyIn3dStrikesWithItsWings')), v('butterflyStory', t('showConfigurator.a3dButterflyLandsOnAFlowerTheFlowerBecomes')), S1), 'schmetterling', 'hochzeit', t, locale), { ODYSSEY: 400 }), // Runde 10: Falter und Lotus schalten 3D+ 400 frei
    ab(motif('lotus', t('showConfigurator.lotusFlowers'), null, v('lotus3d', t('showConfigurator.twoLotusFlowersIn3dRotateIntoEachOther')), v('lotusStory', t('showConfigurator.twoBudsBloomRotateIntoEachOtherAndBecomeA')), H1), { ODYSSEY: 400 }),
  ] },
  { id: 'kultur', label: t('showConfigurator.culture'), motifs: [
    // Runde 9: die Harfe (Licht zupft die Saiten) eröffnet Kultur, das Buch folgt
    motif('noten', t('packageDetails.music'), v('notes2d', t('showConfigurator.twoNotesWeighInTime')), v('harpHorizon', t('showConfigurator.aHarpLightPlucksTheStringsNotesRise')), v('harpStory', t('showConfigurator.theStringsSoundNTheNotesFlyNOfThem'))),
    // Runde 11b (große Motive, FSK-090): Orgel als Steigerung der Harfe, direkt dahinter, 3D und 3D+ ab 500 (Runde 11c, vorher 600); in 3D+ werden
    // die Notenlinien zu Pfeifen, der Notenschlüssel zum Gehäuse und die fünf Noten zu den Kränzen der Türme (gleiche Teile)
    ab(motif('orgel', t('showConfigurator.organ'), null, v('organ3d', t('showConfigurator.organ3dCaption')), v('organStory', t('showConfigurator.organStoryCaption')), ['HORIZON', 0]), { HORIZON: 500, ODYSSEY: 500 }), // scenes/gross/orgel.js
    // Runde 11b (FSK-029): Schallfeld zwischen zwei Lautsprechern ab 600 (Runde 11c, vorher 900), nach der Orgel; dieselbe Fassung auch im Stadtfest
    ab(motif('schallfeld', t('showConfigurator.soundField'), null, v('soundField3d', t('showConfigurator.soundField3dCaption')), v('soundFieldStory', t('showConfigurator.soundFieldStoryCaption')), ['HORIZON', 0]), { HORIZON: 600, ODYSSEY: 600 }), // scenes/gross/schallfeld.js
    motif('buch', t('showConfigurator.book'), v('book2d', t('showConfigurator.anOpenBookLightFlipsThePages')), v('book3d', t('showConfigurator.theBookOpensIn3dOnePageTurns')), v('bookStory', t('showConfigurator.theBookOpensAPenWritesTheLinesRise'))),
    motif('vorhang', t('showConfigurator.curtain'), v('curtain', t('showConfigurator.theCurtainMovesInTheAirDraft')), v('curtainStar', t('showConfigurator.curtainOnA3dStarIsReleased')), v('curtainStory', t('showConfigurator.curtainOnGoldRainFallsAStarRises'))),
    // Runde 11b (große Motive, FSK-089): Töpferscheibe, 3D und 3D+ ab 300 (Runde 11c: vorher 500; scenes/gross/toepferscheibe.js)
    ab(motif('toepferscheibe', t('showConfigurator.potteryWheel'), null, v('potteryWheel3d', t('showConfigurator.potteryWheel3dCaption')), v('potteryWheelStory', t('showConfigurator.potteryWheelStoryCaption')), ['HORIZON', 0]), { HORIZON: 300, ODYSSEY: 300 }),
    catalogMotif('taube', 'kultur', t, locale),
    catalogMotif('galaxie', 'kultur', t, locale),
    catalogMotif('mikrofon', 'kultur', t, locale),
    catalogMotif('diskokugel', 'kultur', t, locale),
    catalogMotif('heldin', 'kultur', t, locale),
    catalogMotif('sonne', 'kultur', t, locale),
    catalogMotif('peace', 'kultur', t, locale),
    // Halloween (sechs Halloween-Events in FlyingStars' Showliste) hat keinen eigenen Anlass; vorerst bei Kultur
    catalogMotif('fledermaeuse', 'kultur', t, locale),
    catalogMotif('hexenkessel', 'kultur', t, locale),
    motif('maske', t('showConfigurator.masks'), v('masks', t('showConfigurator.theatreMasksComedyAndTragedyWeighThemselves')), v('masks3d', t('showConfigurator.theMasksIn3d')), v('maskStory', t('showConfigurator.comedyAndTragedyJoinToFormTheTheatreSymbol'))), // Runde 10: 2D ab 100 (Kontaktbogen)
    ab(catalogMotif('welle', 'kultur', t, locale), { SPARK: 200 }), // Runde 10: in 2D mit dem Hexenkessel ab 200 (je Stufe mindestens zwei)
    catalogMotif('kugel', 'kultur', t, locale),
    catalogMotif('pyramide', 'kultur', t, locale),
    zugabe(catalogMotif('stern', 'kultur', t, locale)), // Runde 10: Zugaben ab 3D 250 (Star der Bühne, Premiere)
    zugabe(catalogMotif('anstossen', 'kultur', t, locale)),
    // die Tänzerin dreht sich erst als Körper (HORIZON 250); dancer2d bleibt ungespielt
    ab(motif('tanz', t('showConfigurator.dance'), v('dancer2d', t('showConfigurator.aDancerHerRockSwings')), v('dancer3d', t('showConfigurator.theDancerTurnsIn3dTheRockFlies')), v('dancerStory', t('showConfigurator.theDancerTurnsTheSkirtBecomesTheFlowerTheFlower')), H1), { ODYSSEY: 400 }), // Runde 10: mit den Bokkenrijders
    motif('teufel', 'Bokkenrijders', null, null, v('devilStory', t('showConfigurator.theDevilFromOurBokkenrijdersShowAnActual3dFormation')), O1),
  ] },
].map(occasion=>({...occasion,motifs:occasion.motifs.flatMap((m) => byStufe(m, t)),anlass:formOccasionFor(occasion.id)}));
}

/**
 * Runde 9 (Marc 20.11.2026: „bei 3D … wirklich einfache Elemente, und dann die komplexen 3D-Elemente eher bei 3D Plus“):
 * Stufe jeder 3D-Fassung aus scenes/catalog-3d/stufen.js (Formklasse → '3D' | '3D+', Einstufung des 3D-Agenten).
 * - Stufe 3D+: keine HORIZON-Fassung, das Motiv spielt nur in 3D+ (ODYSSEY).
 * - Katalogmotiv ohne echte 3D-Fassung (weder im Register noch als räumliche Katalogformation): nur in 2D, keine flache
 *   Ersatzfassung in 3D oder 3D+.
 * - eigene Motive: Stufe aus STUFE_EIGEN; reine Geschichten (nur ODYSSEY, z. B. Mondlandung) bleiben, wie sie sind.
 * Wächter: src/scripts/show-art-motifs.test.mjs.
 */
export function stufeOf(m) {
  if ('flat' in m) return stufeKatalog(m.catalog) ?? STUFE_FORMATION[m.catalog];
  return STUFE_EIGEN[m.of ?? m.id]?.[0];
}
/**
 * Runde 9 (b): 3D+-Motive, deren einzelne 3D-Szene sonst nirgends mehr liefe, weil in 3D+ nur die Geschichte spielt. Sie
 * stehen in 3D+ als eigenes Motiv direkt vor der Geschichte (nicht in 3D), mit eigenem Namen (akomo-Entwürfe). Fußball und
 * Kopfsprung: neu gebaut in scenes/catalog-3d/sport.js. Jedes neue 3D+-Motiv mit eigener 3D-Szene gehört hier hinein
 * (Wächter: src/scripts/show-art-motifs.test.mjs).
 */
const EIGENE_3DPLUS_SZENE = {
  fussball: 'showConfigurator.motif.shot', sprung: 'showConfigurator.motif.jump',
  kolibri: 'showConfigurator.motif.kolibriScene', delfin: 'showConfigurator.motif.delfinScene',
  falter: 'showConfigurator.motif.falterScene', lotus: 'showConfigurator.motif.lotusScene', riesenrad: 'showConfigurator.motif.riesenradScene',
  tanz: 'showConfigurator.motif.tanzScene', herz: 'showConfigurator.motif.herzScene', vorhang: 'showConfigurator.motif.vorhangScene',
  feuerwerk: 'showConfigurator.motif.feuerwerkScene',
};
function byStufe(m, t) {
  const stufe = stufeOf(m), tiers = { ...m.tiers };
  if (stufe === '3D+') delete tiers.HORIZON;
  else if (!stufe && 'flat' in m) { delete tiers.HORIZON; delete tiers.ODYSSEY; }
  const left = PACKAGE_ORDER.filter((p) => tiers[p]);
  if (!left.length) return [];
  const scene = stufe === '3D+' && EIGENE_3DPLUS_SZENE[m.id] && m.tiers.HORIZON && tiers.ODYSSEY
    ? [{ id: `${m.id}-szene`, of: m.id, label: t(EIGENE_3DPLUS_SZENE[m.id]), stufe, tiers: { ODYSSEY: { ...m.tiers.HORIZON, minDrones: tiers.ODYSSEY.minDrones } }, minDrones: tiers.ODYSSEY.minDrones }]
    : [];
  // (flat ordnete flache Katalogformationen in 3D hinter die Körper, buildSequence; ohne 3D-Fassung spielen sie dort jetzt
  // gar nicht mehr, alle übrigen sind echte Körper und laufen in der Reihenfolge der Liste)
  const flat = 'flat' in m ? { flat: !stufe } : {};
  return [...scene, { ...m, ...flat, tiers, stufe: stufe ?? null, minDrones: Math.min(...left.map((p) => tiers[p].minDrones ?? 0)) }];
}

/**
 * Runde 9 (c): Art der Show für einen Direktlink auf ein Motiv (?motiv=…&art=…). Spielt das Motiv in der verlinkten Art
 * nicht, gilt die nächste Art, in der es spielt, zuerst die größeren (3D → 3D+), dann die kleineren (3D → 2D); null, wenn
 * es in keiner spielt. Der Konfigurator sagt den Wechsel mit dem kurzen Hinweis unter dem Regler.
 */
export function artForMotif(m, art) {
  if (m.tiers[ART_TIER[art]]) return art;
  const i = SHOW_ARTS.indexOf(art), order = [...SHOW_ARTS.slice(i + 1), ...SHOW_ARTS.slice(0, i).reverse()];
  return order.find((a) => m.tiers[ART_TIER[a]]) ?? null;
}
/** Anlass eines Motivs für einen Direktlink ohne ?anlass: der erste Anlass, der es führt. */
export const occasionOfMotif = (occasions, id) => occasions.find((o) => o.motifs.some((m) => m.id === id)) ?? null;
export const OCCASIONS = occasionsFor(defaultLocale);
export const getConfiguratorContent = (locale = defaultLocale) => ({ STEPS: stepsFor(locale), OCCASIONS: occasionsFor(locale) });

/**
 * Saisonale Ordnung wie bei den Anlass-Karten der Startseite (Occasions.astro): Einträge, deren `season` den Monat
 * enthält, rücken in ihrer bisherigen Reihenfolge nach vorn, alle anderen folgen unverändert. Stabil und ohne Seiteneffekt.
 * @template {{ season?: readonly number[] }} T
 * @param {readonly T[]} list
 * @param {number} [month] 1–12, Standard: der aktuelle Monat
 * @returns {T[]}
 */
export function bySeason(list, month = new Date().getMonth() + 1) {
  const now = (x) => Boolean(x.season?.includes(month));
  return [...list.filter(now), ...list.filter((x) => !now(x))];
}
