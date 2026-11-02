import { createTranslator } from '../i18n/ui.mjs';
import { localeFormat } from '../i18n/routing.mjs';
/** Texts of the pricing page (30.10.2026, from the Elevate branch): package cards, the comparison and extras.
 * The price questions live in the FAQ collection (tag `preise`), so the FAQ page and the pricing page share them.
 * Prices and drone counts come only from show-packages.ts. Facts follow the FlyingStars questionnaire of 21.10.2026:
 * no duration per package, 40 % deposit, cancellation scale from the AGB, extras as confirmed there. */
import { SHOW_PACKAGES, type ShowPackage } from './show-packages.ts';

export function getPackageDetails(locale = 'de') {
const t = createTranslator(locale);
const money = (v: number) => v.toLocaleString(localeFormat(locale));

/** One line above all packages; the questionnaire: "Es gibt keine Dauer je Paket." */
const SHOW_DURATION = t('packageDetails.aShowUsuallyLastsAround13MinutesWithUpTo');

interface PackageDetail {
  /** Short name of the step, the same as in the live preview. */
  label: string;
  /** "Am Himmel": what the audience sees. */
  sky: string;
  /** "Betreuung": what working with FlyingStars looks like. */
  care: string;
  /** "Typisch für": typical occasions. */
  typical: string;
  /** Quiet line on the card, only where FlyingStars confirmed it ("Am häufigsten verkaufen wir Horizon"). */
  often?: string;
}

const PACKAGE_DETAILS: Record<ShowPackage, PackageDetail> = {
  SPARK: {
    label: t('packageDetails.classic2d'),
    sky: t('packageDetails.2dFormationsFromOurCatalogueWithUpToFourCustom'),
    care: t('packageDetails.yourCustomElementsForApprovalInAdvanceMusicFreeOf'),
    typical: t('packageDetails.weddingsAnniversariesSmallerCorporateEvents'),
  },
  HORIZON: {
    label: t('contactform.3dInMotion'),
    sky: t('packageDetails.everythingInSparkPlusCustom2dAnimationsSimple3dObjects'),
    care: t('packageDetails.creativeWorkshopWithStoryboardVideoPreviewWithFeedbackSynchronisedTo'),
    typical: t('packageDetails.productLaunchesCorporateEventsCityFestivals'),
    often: 'Bestseller',
  },
  ODYSSEY: {
    label: t('packageDetails.3dStorytellingShow'),
    sky: t('packageDetails.everythingInHorizonPlus3dStorytellingAnimationAndVolumetricEffects'),
    care: t('packageDetails.multipleFeedbackRoundsDedicatedProjectManagerRawVideoFootageTimecode'),
    typical: t('packageDetails.campaignsFestivalsLargeEvents'),
  },
};

/** Drohnenzahl je Paket in einer Zeile, für Paketkarten und Vergleich (Marc, 01.11.2026: „ab 200 Drohnen“ statt
 * „200 Drohnen, mehr möglich“). SPARK hat eine Obergrenze, HORIZON und ODYSSEY nicht. */
function dronesLine(name: ShowPackage): string {
  const p = SHOW_PACKAGES[name];
  return Number.isFinite(p.max) ? t('packageDetails.valueToValueDrones', { v0: p.base, v1: p.max }) : t('packageDetails.fromValueDrones', { v0: p.base });
}

/** Kernpunkte der Paket-Kurzfassung (Startseite und Anlass-Seiten zeigen dieselbe Vorschau, Marc 01.11.2026). Die
 * Drohnenzahl steht als eigene Zeile davor (dronesLine). Eine Seite kann im YAML eigene `points` setzen. */
const PACKAGE_POINTS: Record<ShowPackage, string[]> = {
  SPARK: [t('packageDetails.formationsFromOurCatalogue'), t('packageDetails.upToFourCustomElementsSuchAsInitialsOrA'), t('packageDetails.musicFreeOfGemaRoyalties')],
  HORIZON: [t('packageDetails.custom2dAnimationsAndSimple3d'), t('packageDetails.yourLogoDrawnPreciselyInTheSky'), t('packageDetails.synchronisedToYourChosenMusic')],
  ODYSSEY: [t('packageDetails.aStorylineWithADramaticArc'), t('packageDetails.complex3dAnimations'), t('packageDetails.dedicatedProjectManager')],
};

/** Paketkarten der Preisseite im Aufbau des Vercel-Prototyps (Marc, 31.10.2026: „besser strukturiert mit diesen Bullet
 * Points, die auch farbig sind“): Kurzbeschreibung, dann Gruppen Design & Inhalt / Musik / Service & Extras. Inhalte aus
 * der Vergleichstabelle unten (Fragebogen 21.10.), ab HORIZON nur was dazukommt („Alles aus SPARK, plus:“). */
interface PackageFeatures { tag: string; badge: string; plus?: string; groups: { title: string; items: string[] }[] }
const PACKAGE_FEATURES: Record<ShowPackage, PackageFeatures> = {
  SPARK: {
    tag: t('packageDetails.aSparklingStartForWeddingsAnniversariesAndSmallerCorporateAnd'),
    badge: t('packageDetails.entryPackage'),
    groups: [
      { title: t('packageDetails.designContent'), items: [t('packageDetails.formationsFromOurCatalogueSuchAsHeartsOrRings'), t('packageDetails.upToFourCustomElementsInitialsLogoCoatOfArms')] },
      { title: t('packageDetails.music'), items: [t('packageDetails.musicFreeOfGemaRoyalties'), t('packageDetails.gemaMusicPossibleIfTheEventIsRegistered')] },
      { title: t('packageDetails.serviceExtras'), items: [t('packageDetails.customElementsForApprovalInAdvance'), t('packageDetails.standardPermitProcedure'), t('packageDetails.onSiteCrewSafetyPlanAndLiabilityInsurance')] },
    ],
  },
  HORIZON: {
    tag: t('packageDetails.yourOwnProductionForProductLaunchesLargeCorporateEventsAnd'),
    badge: 'Bestseller',
    plus: t('packageDetails.everythingInSparkPlus'),
    groups: [
      { title: t('packageDetails.designContent'), items: [t('packageDetails.fullyCustom2dAnimationsAndSimple3dElements'), t('packageDetails.preciseLogosAndComplexLettering')] },
      { title: t('packageDetails.music'), items: [t('packageDetails.synchronisedToYourChosenMusic')] },
      { title: t('packageDetails.serviceExtras'), items: [t('packageDetails.creativeWorkshopWithStoryboard'), t('packageDetails.moreComplexPermitsTooSuchAsNearAirports'), t('packageDetails.videoPreviewWithAFeedbackRound'), t('packageDetails.helpObtainingLandownerConsent')] },
    ],
  },
  ODYSSEY: {
    tag: t('packageDetails.aStorytellingShowForMajorCampaignsFestivalsAndLargeAudiences'),
    badge: t('packageDetails.from300Drones'),
    plus: t('packageDetails.everythingInHorizonPlus'),
    groups: [
      { title: t('packageDetails.designContent'), items: [t('packageDetails.complex3dAnimationsAndVolumetricEffects'), t('packageDetails.aStorytellingShowWithADramaticArc')] },
      { title: t('packageDetails.music'), items: [t('packageDetails.onSiteTimecodeSynchronisationAvailable')] },
      { title: t('packageDetails.serviceExtras'), items: [t('packageDetails.multipleFeedbackRounds'), t('packageDetails.dedicatedProjectManager'), t('packageDetails.showVideoRawFootage'), t('packageDetails.advanceSiteVisitOnRequest')] },
    ],
  },
};

/** "+900 € je 10 Drohnen, bis 150 Drohnen", built from the price table so it can never drift. */
function addOnLine(name: ShowPackage): string {
  const p = SHOW_PACKAGES[name];
  return t('packageDetails.valuePerValueDronesvalue', { v0: money(p.add), v1: p.step, v2: Number.isFinite(p.max) ? t('pricing.upTo', { count: p.max }) : '' });
}

/** Comparison "Alle Leistungen". A cell of `null` means: not part of this package, `true`: included (checkmark, wie auf
 * SaaS-Preisseiten; Marc 31.10.2026: was überall drin ist, gehört als Häkchen in die Tabelle, nicht in eine Fußnote).
 * `all` spans the three packages. */
type Cell = string | null | true;
interface Row { label: string; cells?: [Cell, Cell, Cell]; all?: string }
const COMPARISON: Row[] = [
  { label: t('configuratorteaser.drones'), cells: [
    dronesLine('SPARK'),
    dronesLine('HORIZON'),
    dronesLine('ODYSSEY'),
  ] },
  { label: t('packageDetails.moreDrones'), cells: [
    t('packageDetails.valuePerValue', { v0: money(SHOW_PACKAGES.SPARK.add), v1: SHOW_PACKAGES.SPARK.step }),
    t('packageDetails.valuePerValue', { v0: money(SHOW_PACKAGES.HORIZON.add), v1: SHOW_PACKAGES.HORIZON.step }),
    t('packageDetails.valuePerValue', { v0: money(SHOW_PACKAGES.ODYSSEY.add), v1: SHOW_PACKAGES.ODYSSEY.step }),
  ] },
  { label: t('packageDetails.duration'), all: t('packageDetails.usuallyAround13MinutesUpTo25MinutesPossible') },
  { label: t('packageDetails.designAndMotifs'), cells: [t('packageDetails.formationsFromOurCatalogueSuchAsHeartsOrRings'), t('packageDetails.fullyCustom2dAnimations'), t('packageDetails.asHorizonPlusComplex3dAnimations')] },
  { label: t('packageDetails.customElements'), cells: [t('packageDetails.upToFourSuchAsInitialsLogoOrCoatOf'), t('packageDetails.preciseLogosAndComplexLettering'), t('packageDetails.asHorizon')] },
  { label: '3D', cells: [null, t('packageDetails.simple3dElements'), t('packageDetails.complex3dAnimationsAndVolumetricEffects')] },
  { label: 'Storytelling', cells: [null, null, t('packageDetails.aStorytellingShowWithADramaticArc')] },
  { label: t('packageDetails.music'), cells: [t('packageDetails.musicFreeOfGemaRoyaltiesGemaMusicPossibleIfThe'), t('packageDetails.synchronisedToYourChosenMusic'), t('packageDetails.asHorizonOnSiteTimecodeSynchronisationAvailable')] },
  { label: t('packageDetails.approvalAndPreview'), cells: [t('packageDetails.yourCustomElementsForApprovalInAdvance'), t('packageDetails.videoPreviewWithAFeedbackRound'), t('packageDetails.multipleFeedbackRounds')] },
  { label: t('packageDetails.creativeWorkshop'), cells: [null, t('packageDetails.withStoryboard'), t('packageDetails.withStoryboard')] },
  { label: t('packageDetails.safetyPlan'), cells: [true, true, true] },
  { label: t('packageDetails.liabilityCoverUpTo13Million'), cells: [true, true, true] },
  { label: t('packageDetails.onSiteCrew'), cells: [true, true, true] },
  { label: t('packageDetails.permit'), cells: [t('packageDetails.standardProcedure'), t('packageDetails.moreComplexProceduresTooSuchAsNearAirports'), t('packageDetails.asHorizon')] },
  { label: t('packageDetails.helpObtainingLandownerConsent'), cells: [null, true, true] },
  { label: t('packageDetails.dedicatedProjectManager'), cells: [null, null, true] },
  { label: t('packageDetails.showVideoRawFootage'), cells: [`+900 €`, `+900 €`, true] },
  { label: t('packageDetails.advanceSiteVisit'), cells: [null, null, t('packageDetails.onRequest')] },
];
const COMPARISON_NOTE = t('packageDetails.youProvideTheOnSiteSoundSystemAsTheEvent');

/** "Wofür ihr bei jedem Paket bezahlt" */
const INCLUDED = [
  { title: t('packageDetails.designForYourLocation'), text: t('packageDetails.weProgrammeTheShowForYourSiteMusicAndMotifs') },
  { title: t('packageDetails.permitAndSafetyPlan'), text: t('packageDetails.aviationPermitsSafetyZonesAndLiabilityCoverUpTo1') },
  { title: t('packageDetails.approvalInAdvance'), text: t('packageDetails.youReviewAndApproveYourCustomElementsBeforeTheShow') },
  { title: t('packageDetails.onSiteCrew'), text: t('packageDetails.ourPilotsAndTechniciansSetUpInAround3Hours') },
];

/** Extras on the pricing page. Selectable since 01.11.2026 (Marc): the chosen ones travel as `?extras=<id>,<id>` into the
 * inquiry form (field „Extras“, src/components/sections/ContactForm.astro). `id` is that URL/form value, `short` the chip
 * label in the form and in the summary bar. No eyebrow line in the card any more. */
interface Extra { id: string; short: string; icon: string; title: string; text: string; price: string; link?: { label: string; href: string } }
const EXTRAS: Extra[] = [
  { id: 'express', short: 'Express', icon: 'zap', title: t('packageDetails.aShowInUnderTwoWeeks'), text: t('packageDetails.lessThan14DaysUntilTheShowWePrioritiseDesign'), price: t('packageDetails.surchargeBasedOnScope') },
  { id: 'film', short: t('packageDetails.rawFootage'), icon: 'camera', title: t('packageDetails.rawFootageFilmedByCameraDrone'), text: t('packageDetails.footageForYourAftermovieAndSocialMedia'), price: t('packageDetails.900IncludedInOdyssey') },
  { id: 'behoerden', short: t('packageDetails.authorityLiaison'), icon: 'landmark', title: t('packageDetails.extendedAuthorityLiaison'), text: t('packageDetails.weHandleAllCommunicationWithPublicOfficesAndAuthorities'), price: t('packageDetails.priceOnRequest') },
  { id: 'kontrollzone', short: t('packageDetails.nearAirports'), icon: 'plane', title: t('packageDetails.controlledAirspaceAndAirportLocations'), text: t('packageDetails.forControlledAirspaceAndSitesNearAirports'), price: t('packageDetails.priceOnRequest') },
  { id: 'schweiz', short: t('packageDetails.switzerland'), icon: 'swiss', title: t('packageDetails.showsInSwitzerland'), text: t('packageDetails.focaApplicationAndCustomsClearanceForOurFleet'), price: t('packageDetails.1900ExcludingVat') },
  { id: 'indoor', short: 'Indoor', icon: 'building-2', title: t('packageDetails.indoorDroneShows'), text: t('packageDetails.20To50Drones5To8MinutesCeilingHeight'), price: t('packageDetails.fromApprox15000ExcludingVatFor20Drones'), link: { label: t('packageDetails.moreAboutIndoorShows'), href: '/drohnenshow-indoor/' } },
];

return { SHOW_DURATION, PACKAGE_DETAILS, PACKAGE_POINTS, PACKAGE_FEATURES, dronesLine, addOnLine, COMPARISON, COMPARISON_NOTE, INCLUDED, EXTRAS };
}
