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

import { DRONE_RANGES, DRONE_STEP } from './show-packages.ts';

export const PACKAGE_ORDER = ['SPARK', 'HORIZON', 'ODYSSEY'];

function stepsFor(locale) { const t = createTranslator(locale);
return  [
  { pkg: 'SPARK', label: t('packageDetails.classic2d'), includes: t('showConfigurator.predefinedFormationsSuchAsHeartsOrRingsAndUpTo') },
  { pkg: 'HORIZON', label: t('contactform.3dInMotion'), includes: t('showConfigurator.everythingFromSparkPlusIndividual2dAnimationsAndSimple3d') },
  { pkg: 'ODYSSEY', label: t('packageDetails.3dStorytellingShow'), includes: t('showConfigurator.everythingFromHorizonPlusComplex3dAnimationsVolumetricEffectsAnd') },
];
}
export const STEPS = stepsFor('de');

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
// Runde 11 (Marc, 1.11.2026): Die Anlässe stehen in derselben Ordnung wie die Anlass-Karten der Startseite
// (src/content/pages/index.yaml, Section `occasions`): Unternehmen → Launch, gleich danach Jubiläum (auch Unternehmen),
// Städte & Gemeinden → Stadtfest, Hochzeit & Privat → Hochzeit, Festivals & Konzerte → Kultur, Silvester → Winter &
// Silvester. Agenturen und Indoor haben keinen eigenen Anlass. `season` wie an den Karten: In diesen Monaten rückt der
// Anlass nach vorn (bySeason unten). Vorausgewählt ist der erste Anlass dieser Ordnung, ein ?anlass=… gewinnt.
function occasionsFor(locale) { const t = createTranslator(locale);
return  [
  // Reihenfolge der Motive = Ablauf der Show. Die letzte Angabe ist die Sprosse der Freischalt-Leiter (ohne Angabe: SPARK-Einstieg).
  { id: 'launch', label: 'Launch', anlass: 'firma', motifs: [
    motif('rakete', t('showConfigurator.rocket'), v('rocket', t('showConfigurator.rocketWithFlame')), v('rocket3d', t('showConfigurator.theRocketAsABodyFloatsAndRotates')), v('rocketLaunch', t('showConfigurator.launchFromThePadTheRocketEntersOrbitAroundA'))),
    motif('mond', t('showConfigurator.moonLanding'), null, null, v('moonStory', t('showConfigurator.theRocketLeavesOrbitAndLandsOnTheMoonA')), O1),
    motif('logo', 'Logo', v('logo', t('showConfigurator.exampleLogoWithLightSkating')), v('logo3d', t('showConfigurator.exampleLogoIn3dWithLightGlimmer')), v('logoStory', t('showConfigurator.yourLogoBecomesA3dRingOfLight'))),
    motif('idee', t('showConfigurator.lightBulb'), v('bulb2d', t('showConfigurator.aLightBulbTheIdea')), v('bulb3d', t('showConfigurator.theLightBulbIn3dTheLightFadeNIs')), v('bulbStory', t('showConfigurator.aLightBulbFormsAroundAFilamentAndShines'))),
    // der echte, scannbare Code braucht seine 198 Module plus Rahmen: erst ab HORIZON 250 (qr2d bleibt ungespielt)
    motif('qr', 'QR-Code', v('qr2d', t('showConfigurator.qrCodeWithScanMe')), v('qrHorizon', t('showConfigurator.aLightBeamScansTheQrCodeBuildsUp')), v('qrStory', t('showConfigurator.aMessageArrivesItBecomesAScannableQrCode')), H1),
    motif('spirale', t('showConfigurator.spiral'), v('spiral2d', t('showConfigurator.aSpiralLightRunningInwards')), v('spiral3d', t('showConfigurator.aSpiralIn3dLightRisesTheWindings')), v('spiralStory', t('showConfigurator.theSpiralBecomesTheTorusThatRotatesByItself')), S1),
  ] },
  { id: 'jubilaeum', label: t('showConfigurator.jubilee'), anlass: 'sonstiges', motifs: [
    motif('wappen', t('showConfigurator.arms'), v('shield', t('showConfigurator.coatOfArmsWithStarAndFlyingFlag')), v('shield3d', t('showConfigurator.3dCoatOfArmsWithYourNumberAndWavingFlag')), v('shieldStory', t('showConfigurator.fromTheStarInTheCoatOfArmsBecomesYour'))),
    motif('fussball', t('showConfigurator.football'), v('kick2d', t('showConfigurator.aPlayerTheBallRotatesOverHisFoot')), v('kickHorizon', t('showConfigurator.thePlayerShootsTheBallSpinsThroughTheAir')), v('kickStory', t('showConfigurator.aPlayerScoresTheBallBecomesYourNumber')), S1),
    motif('wahrzeichen', t('showConfigurator.landmarks'), v('tower', t('showConfigurator.exampleBerlinTvTowerWithWarningLight')), v('tower3d', t('showConfigurator.theTvTowerIn3dLightRunsAroundTheBall')), v('towerStory', t('showConfigurator.theTvTowerBroadcastsAndBecomesTheBrandenburgGate'))),
    motif('pokal', t('showConfigurator.cup'), v('trophy2d', t('showConfigurator.aCupAboveItSparklingStars')), v('trophy3d', t('showConfigurator.theCupIn3dLightGlidesOverIt')), v('trophyStory', t('showConfigurator.theCupGrowsYourNumberRisesOut'))),
    motif('sprung', t('showConfigurator.head'), null, v('diveHorizon', t('showConfigurator.theJumperDipsInTheWaterMovesInRings')), v('diveStory', t('showConfigurator.divingBoardTakeOffSplashRipplesSpread')), H1),
    motif('medaille', t('showConfigurator.medal'), null, null, v('medalStory', t('showConfigurator.theRipplesBecomeYourNumberOnAMedalRibbon')), O1),
  ] },
  { id: 'festival', label: t('showConfigurator.cityFestival'), anlass: 'stadt', motifs: [
    motif('reise', t('showConfigurator.travel'), v('compass2d', t('showConfigurator.aCompassTheNeedleSeeksTheNorth')), v('compass3d', t('showConfigurator.theCompassIn3dTheNeedleSwingsIn')), v('travelStory', t('showConfigurator.theCityBecomesAMapPinsLightUpAndA'))),
    // der Papierflieger setzt die Reise fort (dieselbe Karte): direkt dahinter, ab ODYSSEY 450 ist es wieder eine Geschichte
    motif('flieger', t('showConfigurator.paperPlane'), null, null, v('planeStory', t('showConfigurator.aPaperPlaneFollowsTheRouteAndCirclesTheCompass')), O1),
    motif('kolibri', t('showConfigurator.kolibrium'), v('hummingbird2d', t('showConfigurator.aHummingbirdTheWingsSwirlInTheLight')), v('hummingbird3d', t('showConfigurator.aHummingbirdIn3dThatBeatsWings')), v('hummingbirdStory', t('showConfigurator.aHummingbirdFliesToFlowerDrinksAndAscends'))),
    motif('riesenrad', t('showConfigurator.ferrisWheel'), v('wheel2d', t('showConfigurator.aFerrisWheelTurnsItsGondolasHangStill')), v('wheel3d', t('showConfigurator.theFerrisWheelIn3dTheGondolasLightUp')), v('wheelStory', t('showConfigurator.aFerrisWheelTakesShapeAndTurnsAStarBlooms')), S1),
    motif('delfin', t('showConfigurator.dolphin'), v('dolphin2d', t('showConfigurator.aDolphinOverAWave')), v('dolphin3d', t('showConfigurator.aDolphinJumpsOutOfTheWaterIn3d')), v('dolphinStory', t('showConfigurator.wavesOneDolphinJumpsDivesInTwoDolphinsJumpIn'))),
    motif('drache', t('showConfigurator.dragon'), null, v('dragon3d', t('showConfigurator.aDragonIn3dThatBeatsWings')), v('dragonStory', t('showConfigurator.aDragonRisesCirclesAndBreathesFireworks')), H1),
  ] },
  { id: 'hochzeit', label: t('site.wedding'), anlass: 'privat', motifs: [
    motif('ring', t('showConfigurator.rings'), v('weddingRings2d', t('showConfigurator.twoWeddingRingsTheStoneSparkles')), v('rings3d', t('showConfigurator.aSolitaireIn3dRingAndBrilliantSpin')), v('ringsLink', t('showConfigurator.twoWeddingRingsIntertwineIn3dAndBecomeASolitaire'))),
    motif('herz', t('showConfigurator.heart'), v('heart2d', t('showConfigurator.aHeartLightTravelsAlongItsOutline')), v('heartTunnel', t('showConfigurator.aTunnelOfHeartsLightFlowingThrough')), v('heartsStory', t('showConfigurator.cupidSArrowStrikesA3dHeartTwoHeartsOrbit'))),
    motif('lotus', t('showConfigurator.lotusFlowers'), null, v('lotus3d', t('showConfigurator.twoLotusFlowersIn3dRotateIntoEachOther')), v('lotusStory', t('showConfigurator.twoBudsBloomRotateIntoEachOtherAndBecomeA')), H1),
    motif('falter', t('showConfigurator.butterfly'), v('butterfly2d', t('showConfigurator.aButterflyTheWingsShimmering')), v('butterfly3d', t('showConfigurator.aButterflyIn3dStrikesWithItsWings')), v('butterflyStory', t('showConfigurator.a3dButterflyLandsOnAFlowerTheFlowerBecomes')), S1),
    motif('glaeser', t('showConfigurator.sparklingGlasses'), v('flutes2d', t('showConfigurator.twoChampagneGlassesClinkLightGlidesAcrossTheGlass')), v('flutes3d', t('showConfigurator.sparklingGlassesIn3dThePearlsRise')), v('flutesStory', t('showConfigurator.theGlassesStrikeThePearlsRiseAsHeart'))),
    motif('antrag', t('showConfigurator.proposal'), null, null, v('ringStory', t('showConfigurator.aRingBoxOpensTheRingFindsTheRingFinger')), O1),
  ] },
  { id: 'kultur', label: t('showConfigurator.culture'), anlass: 'sonstiges', motifs: [
    motif('buch', t('showConfigurator.book'), v('book2d', t('showConfigurator.anOpenBookLightFlipsThePages')), v('book3d', t('showConfigurator.theBookOpensIn3dOnePageTurns')), v('bookStory', t('showConfigurator.theBookOpensAPenWritesTheLinesRise'))),
    motif('vorhang', t('showConfigurator.curtain'), v('curtain', t('showConfigurator.theCurtainMovesInTheAirDraft')), v('curtainStar', t('showConfigurator.curtainOnA3dStarIsReleased')), v('curtainStory', t('showConfigurator.curtainOnGoldRainFallsAStarRises'))),
    motif('maske', t('showConfigurator.masks'), v('masks', t('showConfigurator.theatreMasksComedyAndTragedyWeighThemselves')), v('masks3d', t('showConfigurator.theMasksIn3d')), v('maskStory', t('showConfigurator.comedyAndTragedyJoinToFormTheTheatreSymbol')), S1),
    motif('noten', t('packageDetails.music'), v('notes2d', t('showConfigurator.twoNotesWeighInTime')), v('harpHorizon', t('showConfigurator.aHarpLightPlucksTheStringsNotesRise')), v('harpStory', t('showConfigurator.theStringsSoundNTheNotesFlyNOfThem'))),
    // die Tänzerin dreht sich erst als Körper (HORIZON 250); dancer2d bleibt ungespielt
    motif('tanz', t('showConfigurator.dance'), v('dancer2d', t('showConfigurator.aDancerHerRockSwings')), v('dancer3d', t('showConfigurator.theDancerTurnsIn3dTheRockFlies')), v('dancerStory', t('showConfigurator.theDancerTurnsTheSkirtBecomesTheFlowerTheFlower')), H1),
    motif('teufel', 'Bokkenrijders', null, null, v('devilStory', t('showConfigurator.theDevilFromOurBokkenrijdersShowAnActual3dFormation')), O1),
  ] },
  { id: 'silvester', label: t('showConfigurator.winterAndNewYear'), anlass: 'stadt', season: [11, 12], motifs: [
    motif('uhr', t('showConfigurator.clock'), v('clock', t('showConfigurator.theHandsRunToTwelve')), v('clock3d', t('showConfigurator.3dWatchTheHandsAreRunning')), v('clockStory', t('showConfigurator.midnightSparksSwirlOutAndWriteTheNewYear'))),
    motif('sekt', t('showConfigurator.champagneCork'), null, v('champagne3d', t('showConfigurator.aChampagneBottleIn3dBubblesRiseInTheLight')), v('champagneStory', t('showConfigurator.aChampagneBottleTheCorkPopsAndFliesInAn')), H1),
    motif('schnee', t('showConfigurator.lightTree'), v('snow2d', t('showConfigurator.aSnowflakeTurns')), v('tree3d', t('showConfigurator.aLightTreeAsASpiralLightAscends')), v('treeStory', t('showConfigurator.aSnowflakeBecomesATreeOfLightsAStarAppears'))),
    motif('feuerwerk', t('showConfigurator.fireworks'), v('fireworkSpark', t('showConfigurator.fireworkStarsLightUpOneAfterTheOther')), v('fireworkHorizon', t('showConfigurator.fireworksOfLightStarsBloomAndBurn')), v('fireworkStory', t('showConfigurator.aTrailOfLightRisesStarsBloomInWaves')), S1),
    motif('finale', t('showConfigurator.finale'), null, null, v('fireworkFinale', t('showConfigurator.finaleAllStarsAtOnceThenGoldenRainFalls')), O1),
    motif('klee', t('showConfigurator.clover'), v('clover2d', t('showConfigurator.aLuckyCloverTurns')), v('clover3d', t('showConfigurator.theLuckyCloverIn3d')), v('cloverStory', t('showConfigurator.threeLeavesBecomeFourHappinessForTheNewYear'))),
  ] },
];
}
export const OCCASIONS = occasionsFor('de');
export const getConfiguratorContent = (locale = 'de') => ({ STEPS: stepsFor(locale), OCCASIONS: occasionsFor(locale) });

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
