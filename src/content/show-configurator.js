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
import { DRONE_RANGES, DRONE_STEP } from './show-packages.ts';
import catalog from './catalog-motifs.json' with { type: 'json' };

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
const CATALOG_CAPTION = { SPARK: 'caption', HORIZON: 'body', ODYSSEY: 'story' };
/** Eine Fassung aus dem Katalog; der Bauname trägt Anlass und Paket, weil jede Fassung ihren eigenen Namen braucht. */
const catalogText = (key, locale, name) => (catalog.texts[key][locale] ?? catalog.texts[key].de).replace('{name}', name);
const cv = (key, pkg, occasion, t, locale) => v(`catalog:${key}:${pkg}:${occasion}`, catalogText(CATALOG_CAPTION[pkg], locale, catalogName(key, locale)));
/** Ein Motiv nur aus dem Katalog, in jedem Paket ab der Drohnenzahl seiner kleinsten Variante. */
function catalogMotif(key, occasion, t, locale, id = key) {
  const min = catalogMin(key), first = PACKAGE_ORDER.findIndex((p) => min <= DRONE_RANGES[p].max);
  /** @type {Partial<Record<'SPARK' | 'HORIZON' | 'ODYSSEY', Version>>} */
  const tiers = {};
  PACKAGE_ORDER.forEach((pkg, i) => { if (i >= first) tiers[pkg] = { ...cv(key, pkg, occasion, t, locale), minDrones: i === first ? Math.max(min, DRONE_RANGES[pkg].min) : DRONE_RANGES[pkg].min }; });
  return { id, label: catalogName(key, locale), tiers, minDrones: tiers[PACKAGE_ORDER[first]].minDrones, catalog: key };
}
/** Ein eigenes Motiv bekommt die Katalogformation als SPARK-Fassung; es spielt ab deren Mindestzahl. */
function withCatalogSpark(m, key, occasion, t, locale) {
  const min = Math.max(catalogMin(key), DRONE_RANGES.SPARK.min);
  return { ...m, tiers: { ...m.tiers, SPARK: { ...cv(key, 'SPARK', occasion, t, locale), minDrones: min } }, minDrones: min, catalog: key };
}

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
// Runde 11 (Marc, 1.11.2026): Die Anlässe stehen in derselben Ordnung wie die Anlass-Karten der Startseite
// (src/content/pages/index.yaml, Section `occasions`): Unternehmen → Launch, gleich danach Jubiläum (auch Unternehmen),
// Städte & Gemeinden → Stadtfest, Hochzeit & Privat → Hochzeit, Festivals & Konzerte → Kultur, Silvester → Winter &
// Silvester. Agenturen und Indoor haben keinen eigenen Anlass. `season` wie an den Karten: In diesen Monaten rückt der
// Anlass nach vorn (bySeason unten). Vorausgewählt ist der erste Anlass dieser Ordnung, ein ?anlass=… gewinnt.
function occasionsFor(locale) { const t = createTranslator(locale);
return  [
  // Reihenfolge der Motive = Ablauf der Show. Die letzte Angabe ist die Sprosse der Freischalt-Leiter (ohne Angabe: SPARK-Einstieg).
  // Runde 24: Katalogmotive (catalogMotif) spielen ab ihrer gezählten Punktzahl; withCatalogSpark ersetzt nur die SPARK-Fassung.
  { id: 'launch', label: 'Launch', motifs: [
    motif('rakete', t('showConfigurator.rocket'), v('rocket', t('showConfigurator.rocketWithFlame')), v('rocket3d', t('showConfigurator.theRocketAsABodyFloatsAndRotates')), v('rocketLaunch', t('showConfigurator.launchFromThePadTheRocketEntersOrbitAroundA'))),
    motif('mond', t('showConfigurator.moonLanding'), null, null, v('moonStory', t('showConfigurator.theRocketLeavesOrbitAndLandsOnTheMoonA')), O1),
    catalogMotif('galaxie', 'launch', t, locale),
    motif('logo', 'Logo', v('logo', t('showConfigurator.exampleLogoWithLightSkating')), v('logo3d', t('showConfigurator.exampleLogoIn3dWithLightGlimmer')), v('logoStory', t('showConfigurator.yourLogoBecomesA3dRingOfLight'))),
    catalogMotif('atom', 'launch', t, locale),
    motif('idee', t('showConfigurator.lightBulb'), v('bulb2d', t('showConfigurator.aLightBulbTheIdea')), v('bulb3d', t('showConfigurator.theLightBulbIn3dTheLightFadeNIs')), v('bulbStory', t('showConfigurator.aLightBulbFormsAroundAFilamentAndShines'))),
    catalogMotif('drehzahl', 'launch', t, locale),
    catalogMotif('sportwagen', 'launch', t, locale),
    catalogMotif('kugel', 'launch', t, locale),
    catalogMotif('moebius', 'launch', t, locale),
    catalogMotif('pyramide', 'launch', t, locale),
    motif('qr', 'QR-Code', v('qr2d', t('showConfigurator.qrCodeWithScanMe')), v('qrHorizon', t('showConfigurator.aLightBeamScansTheQrCodeBuildsUp')), v('qrStory', t('showConfigurator.aMessageArrivesItBecomesAScannableQrCode')), H1),
    withCatalogSpark(motif('spirale', t('showConfigurator.spiral'), v('spiral2d', t('showConfigurator.aSpiralLightRunningInwards')), v('spiral3d', t('showConfigurator.aSpiralIn3dLightRisesTheWindings')), v('spiralStory', t('showConfigurator.theSpiralBecomesTheTorusThatRotatesByItself')), S1), 'spirale', 'launch', t, locale),
  ] },
  { id: 'jubilaeum', label: t('showConfigurator.jubilee'), motifs: [
    motif('wappen', t('showConfigurator.arms'), v('shield', t('showConfigurator.coatOfArmsWithStarAndFlyingFlag')), v('shield3d', t('showConfigurator.3dCoatOfArmsWithYourNumberAndWavingFlag')), v('shieldStory', t('showConfigurator.fromTheStarInTheCoatOfArmsBecomesYour'))),
    catalogMotif('ballons', 'jubilaeum', t, locale),
    catalogMotif('fahnen', 'jubilaeum', t, locale),
    motif('fussball', t('showConfigurator.football'), v('kick2d', t('showConfigurator.aPlayerTheBallRotatesOverHisFoot')), v('kickHorizon', t('showConfigurator.thePlayerShootsTheBallSpinsThroughTheAir')), v('kickStory', t('showConfigurator.aPlayerScoresTheBallBecomesYourNumber')), S1),
    catalogMotif('golfer', 'jubilaeum', t, locale),
    motif('wahrzeichen', t('showConfigurator.landmarks'), v('tower', t('showConfigurator.exampleBerlinTvTowerWithWarningLight')), v('tower3d', t('showConfigurator.theTvTowerIn3dLightRunsAroundTheBall')), v('towerStory', t('showConfigurator.theTvTowerBroadcastsAndBecomesTheBrandenburgGate'))),
    catalogMotif('handschlag', 'jubilaeum', t, locale),
    catalogMotif('stern', 'jubilaeum', t, locale),
    motif('pokal', t('showConfigurator.cup'), v('trophy2d', t('showConfigurator.aCupAboveItSparklingStars')), v('trophy3d', t('showConfigurator.theCupIn3dLightGlidesOverIt')), v('trophyStory', t('showConfigurator.theCupGrowsYourNumberRisesOut'))),
    catalogMotif('konfetti', 'jubilaeum', t, locale),
    motif('sprung', t('showConfigurator.head'), null, v('diveHorizon', t('showConfigurator.theJumperDipsInTheWaterMovesInRings')), v('diveStory', t('showConfigurator.divingBoardTakeOffSplashRipplesSpread')), H1),
    motif('medaille', t('showConfigurator.medal'), null, null, v('medalStory', t('showConfigurator.theRipplesBecomeYourNumberOnAMedalRibbon')), O1),
  ] },
  { id: 'festival', label: t('showConfigurator.cityFestival'), motifs: [
    motif('reise', t('showConfigurator.travel'), v('compass2d', t('showConfigurator.aCompassTheNeedleSeeksTheNorth')), v('compass3d', t('showConfigurator.theCompassIn3dTheNeedleSwingsIn')), v('travelStory', t('showConfigurator.theCityBecomesAMapPinsLightUpAndA'))),
    // der Papierflieger setzt die Reise fort (dieselbe Karte): direkt dahinter, ab ODYSSEY 450 ist es wieder eine Geschichte
    motif('flieger', t('showConfigurator.paperPlane'), null, null, v('planeStory', t('showConfigurator.aPaperPlaneFollowsTheRouteAndCirclesTheCompass')), O1),
    motif('kolibri', t('showConfigurator.kolibrium'), v('hummingbird2d', t('showConfigurator.aHummingbirdTheWingsSwirlInTheLight')), v('hummingbird3d', t('showConfigurator.aHummingbirdIn3dThatBeatsWings')), v('hummingbirdStory', t('showConfigurator.aHummingbirdFliesToFlowerDrinksAndAscends'))),
    catalogMotif('palme', 'festival', t, locale),
    catalogMotif('cocktail', 'festival', t, locale),
    catalogMotif('ballons', 'festival', t, locale),
    catalogMotif('stern', 'festival', t, locale),
    catalogMotif('bierkrug', 'festival', t, locale),
    motif('riesenrad', t('showConfigurator.ferrisWheel'), v('wheel2d', t('showConfigurator.aFerrisWheelTurnsItsGondolasHangStill')), v('wheel3d', t('showConfigurator.theFerrisWheelIn3dTheGondolasLightUp')), v('wheelStory', t('showConfigurator.aFerrisWheelTakesShapeAndTurnsAStarBlooms')), S1),
    catalogMotif('regenbogen', 'festival', t, locale),
    catalogMotif('kuhufo', 'festival', t, locale),
    catalogMotif('wasserball', 'festival', t, locale),
    motif('delfin', t('showConfigurator.dolphin'), v('dolphin2d', t('showConfigurator.aDolphinOverAWave')), v('dolphin3d', t('showConfigurator.aDolphinJumpsOutOfTheWaterIn3d')), v('dolphinStory', t('showConfigurator.wavesOneDolphinJumpsDivesInTwoDolphinsJumpIn'))),
    catalogMotif('schiff', 'festival', t, locale),
    motif('drache', t('showConfigurator.dragon'), null, v('dragon3d', t('showConfigurator.aDragonIn3dThatBeatsWings')), v('dragonStory', t('showConfigurator.aDragonRisesCirclesAndBreathesFireworks')), H1),
  ] },
  { id: 'hochzeit', label: t('site.wedding'), motifs: [
    motif('ring', t('showConfigurator.rings'), v('weddingRings2d', t('showConfigurator.twoWeddingRingsTheStoneSparkles')), v('rings3d', t('showConfigurator.aSolitaireIn3dRingAndBrilliantSpin')), v('ringsLink', t('showConfigurator.twoWeddingRingsIntertwineIn3dAndBecomeASolitaire'))),
    catalogMotif('doppelherz', 'hochzeit', t, locale),
    motif('herz', t('showConfigurator.heart'), v('heart2d', t('showConfigurator.aHeartLightTravelsAlongItsOutline')), v('heartTunnel', t('showConfigurator.aTunnelOfHeartsLightFlowingThrough')), v('heartsStory', t('showConfigurator.cupidSArrowStrikesA3dHeartTwoHeartsOrbit'))),
    catalogMotif('initialen', 'hochzeit', t, locale),
    catalogMotif('taube', 'hochzeit', t, locale),
    withCatalogSpark(motif('glaeser', t('showConfigurator.sparklingGlasses'), v('flutes2d', t('showConfigurator.twoChampagneGlassesClinkLightGlidesAcrossTheGlass')), v('flutes3d', t('showConfigurator.sparklingGlassesIn3dThePearlsRise')), v('flutesStory', t('showConfigurator.theGlassesStrikeThePearlsRiseAsHeart'))), 'anstossen', 'hochzeit', t, locale),
    catalogMotif('blueten', 'hochzeit', t, locale),
    catalogMotif('unendlich', 'hochzeit', t, locale),
    withCatalogSpark(motif('falter', t('showConfigurator.butterfly'), v('butterfly2d', t('showConfigurator.aButterflyTheWingsShimmering')), v('butterfly3d', t('showConfigurator.aButterflyIn3dStrikesWithItsWings')), v('butterflyStory', t('showConfigurator.a3dButterflyLandsOnAFlowerTheFlowerBecomes')), S1), 'schmetterling', 'hochzeit', t, locale),
    motif('lotus', t('showConfigurator.lotusFlowers'), null, v('lotus3d', t('showConfigurator.twoLotusFlowersIn3dRotateIntoEachOther')), v('lotusStory', t('showConfigurator.twoBudsBloomRotateIntoEachOtherAndBecomeA')), H1),
    motif('antrag', t('showConfigurator.proposal'), null, null, v('ringStory', t('showConfigurator.aRingBoxOpensTheRingFindsTheRingFinger')), O1),
  ] },
  { id: 'kultur', label: t('showConfigurator.culture'), motifs: [
    motif('buch', t('showConfigurator.book'), v('book2d', t('showConfigurator.anOpenBookLightFlipsThePages')), v('book3d', t('showConfigurator.theBookOpensIn3dOnePageTurns')), v('bookStory', t('showConfigurator.theBookOpensAPenWritesTheLinesRise'))),
    motif('vorhang', t('showConfigurator.curtain'), v('curtain', t('showConfigurator.theCurtainMovesInTheAirDraft')), v('curtainStar', t('showConfigurator.curtainOnA3dStarIsReleased')), v('curtainStory', t('showConfigurator.curtainOnGoldRainFallsAStarRises'))),
    catalogMotif('taube', 'kultur', t, locale),
    catalogMotif('galaxie', 'kultur', t, locale),
    motif('maske', t('showConfigurator.masks'), v('masks', t('showConfigurator.theatreMasksComedyAndTragedyWeighThemselves')), v('masks3d', t('showConfigurator.theMasksIn3d')), v('maskStory', t('showConfigurator.comedyAndTragedyJoinToFormTheTheatreSymbol')), S1),
    motif('noten', t('packageDetails.music'), v('notes2d', t('showConfigurator.twoNotesWeighInTime')), v('harpHorizon', t('showConfigurator.aHarpLightPlucksTheStringsNotesRise')), v('harpStory', t('showConfigurator.theStringsSoundNTheNotesFlyNOfThem'))),
    catalogMotif('welle', 'kultur', t, locale),
    catalogMotif('kugel', 'kultur', t, locale),
    catalogMotif('pyramide', 'kultur', t, locale),
    catalogMotif('regenbogen', 'kultur', t, locale),
    // die Tänzerin dreht sich erst als Körper (HORIZON 250); dancer2d bleibt ungespielt
    motif('tanz', t('showConfigurator.dance'), v('dancer2d', t('showConfigurator.aDancerHerRockSwings')), v('dancer3d', t('showConfigurator.theDancerTurnsIn3dTheRockFlies')), v('dancerStory', t('showConfigurator.theDancerTurnsTheSkirtBecomesTheFlowerTheFlower')), H1),
    catalogMotif('lebensbaum', 'kultur', t, locale),
    motif('teufel', 'Bokkenrijders', null, null, v('devilStory', t('showConfigurator.theDevilFromOurBokkenrijdersShowAnActual3dFormation')), O1),
    catalogMotif('mandala', 'kultur', t, locale),
  ] },
  { id: 'silvester', label: t('showConfigurator.winterAndNewYear'), season: [11, 12], motifs: [
    motif('uhr', t('showConfigurator.clock'), v('clock', t('showConfigurator.theHandsRunToTwelve')), v('clock3d', t('showConfigurator.3dWatchTheHandsAreRunning')), v('clockStory', t('showConfigurator.midnightSparksSwirlOutAndWriteTheNewYear'))),
    catalogMotif('sektflasche', 'silvester', t, locale),
    catalogMotif('stern', 'silvester', t, locale),
    catalogMotif('galaxie', 'silvester', t, locale),
    motif('schnee', t('showConfigurator.lightTree'), v('snow2d', t('showConfigurator.aSnowflakeTurns')), v('tree3d', t('showConfigurator.aLightTreeAsASpiralLightAscends')), v('treeStory', t('showConfigurator.aSnowflakeBecomesATreeOfLightsAStarAppears'))),
    catalogMotif('anstossen', 'silvester', t, locale),
    motif('feuerwerk', t('showConfigurator.fireworks'), v('fireworkSpark', t('showConfigurator.fireworkStarsLightUpOneAfterTheOther')), v('fireworkHorizon', t('showConfigurator.fireworksOfLightStarsBloomAndBurn')), v('fireworkStory', t('showConfigurator.aTrailOfLightRisesStarsBloomInWaves')), S1),
    catalogMotif('konfetti', 'silvester', t, locale),
    motif('sekt', t('showConfigurator.champagneCork'), null, v('champagne3d', t('showConfigurator.aChampagneBottleIn3dBubblesRiseInTheLight')), v('champagneStory', t('showConfigurator.aChampagneBottleTheCorkPopsAndFliesInAn')), H1),
    motif('finale', t('showConfigurator.finale'), null, null, v('fireworkFinale', t('showConfigurator.finaleAllStarsAtOnceThenGoldenRainFalls')), O1),
    motif('klee', t('showConfigurator.clover'), v('clover2d', t('showConfigurator.aLuckyCloverTurns')), v('clover3d', t('showConfigurator.theLuckyCloverIn3d')), v('cloverStory', t('showConfigurator.threeLeavesBecomeFourHappinessForTheNewYear'))),
  ] },
].map(occasion=>({...occasion,anlass:formOccasionFor(occasion.id)}));
}
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
