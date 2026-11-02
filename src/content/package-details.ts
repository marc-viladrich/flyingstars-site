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

/** "+900 € je 10 Drohnen, bis 150 Drohnen", built from the price table so it can never drift. */
function addOnLine(name: ShowPackage): string {
  const p = SHOW_PACKAGES[name];
  return t('packageDetails.valuePerValueDronesvalue', { v0: money(p.add), v1: p.step, v2: Number.isFinite(p.max) ? t('pricing.upTo', { count: p.max }) : '' });
}

/** Comparison "Alle Leistungen". A cell of `null` means: not part of this package, `true`: included (checkmark, wie auf
 * SaaS-Preisseiten; Marc 31.10.2026: was überall drin ist, gehört als Häkchen in die Tabelle, nicht in eine Fußnote).
 * `all` spans the three packages. */
type Cell = string | null | true;
type CardPoint = { text: string; order: number };
interface Service {
  id: string; category: 'design' | 'music' | 'service'; label: string;
  cells?: [Cell, Cell, Cell]; all?: string;
  cards?: Partial<Record<ShowPackage, CardPoint[]>>;
  summary?: Partial<Record<ShowPackage, CardPoint>>;
  included?: { order: number; icon: string; title: string; text: string };
}
/** Eine Quelle pro Leistung. Alle Ansichten unten sind Projektionen dieser stabilen IDs.
 * Redaktionelle Kurz-/Langtexte gehören zur Leistung; Preise und Mengen bleiben in SHOW_PACKAGES. */
const SERVICES: Service[] = [
  { id: 'drones', category: 'service', label: t('configuratorteaser.drones'), cells: [
    dronesLine('SPARK'),
    dronesLine('HORIZON'),
    dronesLine('ODYSSEY'),
  ] },
  { id: 'more-drones', category: 'service', label: t('packageDetails.moreDrones'), cells: [
    t('packageDetails.valuePerValue', { v0: money(SHOW_PACKAGES.SPARK.add), v1: SHOW_PACKAGES.SPARK.step }),
    t('packageDetails.valuePerValue', { v0: money(SHOW_PACKAGES.HORIZON.add), v1: SHOW_PACKAGES.HORIZON.step }),
    t('packageDetails.valuePerValue', { v0: money(SHOW_PACKAGES.ODYSSEY.add), v1: SHOW_PACKAGES.ODYSSEY.step }),
  ] },
  { id: 'duration', category: 'service', label: t('packageDetails.duration'), all: t('packageDetails.usuallyAround13MinutesUpTo25MinutesPossible') },
  { id: 'design', category: 'design', label: t('packageDetails.designAndMotifs'), cells: [t('packageDetails.formationsFromOurCatalogueSuchAsHeartsOrRings'), t('packageDetails.fullyCustom2dAnimations'), t('packageDetails.asHorizonPlusComplex3dAnimations')], cards: { SPARK: [{ text: t('packageDetails.formationsFromOurCatalogueSuchAsHeartsOrRings'), order: 0 }], HORIZON: [{ text: t('packageDetails.fullyCustom2dAnimationsAndSimple3dElements'), order: 0 }] }, summary: { SPARK: { text: t('packageDetails.formationsFromOurCatalogue'), order: 0 }, HORIZON: { text: t('packageDetails.custom2dAnimationsAndSimple3d'), order: 0 } }, included: { order: 0, icon: 'pen-tool', title: t('packageDetails.designForYourLocation'), text: t('packageDetails.weProgrammeTheShowForYourSiteMusicAndMotifs') } },
  { id: 'custom-elements', category: 'design', label: t('packageDetails.customElements'), cells: [t('packageDetails.upToFourSuchAsInitialsLogoOrCoatOf'), t('packageDetails.preciseLogosAndComplexLettering'), t('packageDetails.asHorizon')], cards: { SPARK: [{ text: t('packageDetails.upToFourCustomElementsInitialsLogoCoatOfArms'), order: 1 }], HORIZON: [{ text: t('packageDetails.preciseLogosAndComplexLettering'), order: 1 }] }, summary: { SPARK: { text: t('packageDetails.upToFourCustomElementsSuchAsInitialsOrA'), order: 1 }, HORIZON: { text: t('packageDetails.yourLogoDrawnPreciselyInTheSky'), order: 1 } } },
  { id: '3d', category: 'design', label: '3D', cells: [null, t('packageDetails.simple3dElements'), t('packageDetails.complex3dAnimationsAndVolumetricEffects')], cards: { ODYSSEY: [{ text: t('packageDetails.complex3dAnimationsAndVolumetricEffects'), order: 0 }] }, summary: { ODYSSEY: { text: t('packageDetails.complex3dAnimations'), order: 1 } } },
  { id: 'storytelling', category: 'design', label: 'Storytelling', cells: [null, null, t('packageDetails.aStorytellingShowWithADramaticArc')], cards: { ODYSSEY: [{ text: t('packageDetails.aStorytellingShowWithADramaticArc'), order: 1 }] }, summary: { ODYSSEY: { text: t('packageDetails.aStorylineWithADramaticArc'), order: 0 } } },
  { id: 'music', category: 'music', label: t('packageDetails.music'), cells: [t('packageDetails.musicFreeOfGemaRoyaltiesGemaMusicPossibleIfThe'), t('packageDetails.synchronisedToYourChosenMusic'), t('packageDetails.asHorizonOnSiteTimecodeSynchronisationAvailable')], cards: { SPARK: [{ text: t('packageDetails.musicFreeOfGemaRoyalties'), order: 2 }, { text: t('packageDetails.gemaMusicPossibleIfTheEventIsRegistered'), order: 3 }], HORIZON: [{ text: t('packageDetails.synchronisedToYourChosenMusic'), order: 2 }], ODYSSEY: [{ text: t('packageDetails.onSiteTimecodeSynchronisationAvailable'), order: 2 }] }, summary: { SPARK: { text: t('packageDetails.musicFreeOfGemaRoyalties'), order: 2 }, HORIZON: { text: t('packageDetails.synchronisedToYourChosenMusic'), order: 2 } } },
  { id: 'preview', category: 'service', label: t('packageDetails.approvalAndPreview'), cells: [t('packageDetails.yourCustomElementsForApprovalInAdvance'), t('packageDetails.videoPreviewWithAFeedbackRound'), t('packageDetails.multipleFeedbackRounds')], cards: { SPARK: [{ text: t('packageDetails.customElementsForApprovalInAdvance'), order: 4 }], HORIZON: [{ text: t('packageDetails.videoPreviewWithAFeedbackRound'), order: 5 }], ODYSSEY: [{ text: t('packageDetails.multipleFeedbackRounds'), order: 3 }] }, included: { order: 2, icon: 'monitor-play', title: t('packageDetails.approvalInAdvance'), text: t('packageDetails.youReviewAndApproveYourCustomElementsBeforeTheShow') } },
  { id: 'workshop', category: 'service', label: t('packageDetails.creativeWorkshop'), cells: [null, t('packageDetails.withStoryboard'), t('packageDetails.withStoryboard')], cards: { HORIZON: [{ text: t('packageDetails.creativeWorkshopWithStoryboard'), order: 3 }] } },
  { id: 'safety-plan', category: 'service', label: t('packageDetails.safetyPlan'), cells: [true, true, true] },
  { id: 'liability', category: 'service', label: t('packageDetails.liabilityCoverUpTo13Million'), cells: [true, true, true] },
  { id: 'crew', category: 'service', label: t('packageDetails.onSiteCrew'), cells: [true, true, true], cards: { SPARK: [{ text: t('packageDetails.onSiteCrewSafetyPlanAndLiabilityInsurance'), order: 6 }] }, included: { order: 3, icon: 'users', title: t('packageDetails.onSiteCrew'), text: t('packageDetails.ourPilotsAndTechniciansSetUpInAround3Hours') } },
  { id: 'permit', category: 'service', label: t('packageDetails.permit'), cells: [t('packageDetails.standardProcedure'), t('packageDetails.moreComplexProceduresTooSuchAsNearAirports'), t('packageDetails.asHorizon')], cards: { SPARK: [{ text: t('packageDetails.standardPermitProcedure'), order: 5 }], HORIZON: [{ text: t('packageDetails.moreComplexPermitsTooSuchAsNearAirports'), order: 4 }] }, included: { order: 1, icon: 'shield-check', title: t('packageDetails.permitAndSafetyPlan'), text: t('packageDetails.aviationPermitsSafetyZonesAndLiabilityCoverUpTo1') } },
  { id: 'landowner-consent', category: 'service', label: t('packageDetails.helpObtainingLandownerConsent'), cells: [null, true, true], cards: { HORIZON: [{ text: t('packageDetails.helpObtainingLandownerConsent'), order: 6 }] } },
  { id: 'project-manager', category: 'service', label: t('packageDetails.dedicatedProjectManager'), cells: [null, null, true], cards: { ODYSSEY: [{ text: t('packageDetails.dedicatedProjectManager'), order: 4 }] }, summary: { ODYSSEY: { text: t('packageDetails.dedicatedProjectManager'), order: 2 } } },
  { id: 'footage', category: 'service', label: t('packageDetails.showVideoRawFootage'), cells: [`+900 €`, `+900 €`, true], cards: { ODYSSEY: [{ text: t('packageDetails.showVideoRawFootage'), order: 5 }] } },
  { id: 'site-visit', category: 'service', label: t('packageDetails.advanceSiteVisit'), cells: [null, null, t('packageDetails.onRequest')], cards: { ODYSSEY: [{ text: t('packageDetails.advanceSiteVisitOnRequest'), order: 6 }] } },
];
const COMPARISON = SERVICES.map(({ id, label, cells, all }) => ({ id, label, cells, all }));
const groupTitles = { design: t('packageDetails.designContent'), music: t('packageDetails.music'), service: t('packageDetails.serviceExtras') };
const packageCopy = {
  SPARK: { tag: t('packageDetails.aSparklingStartForWeddingsAnniversariesAndSmallerCorporateAnd'),
    badge: t('packageDetails.entryPackage') },
  HORIZON: { tag: t('packageDetails.yourOwnProductionForProductLaunchesLargeCorporateEventsAnd'),
    badge: 'Bestseller',
    plus: t('packageDetails.everythingInSparkPlus') },
  ODYSSEY: { tag: t('packageDetails.aStorytellingShowForMajorCampaignsFestivalsAndLargeAudiences'),
    badge: t('packageDetails.from300Drones'),
    plus: t('packageDetails.everythingInHorizonPlus') }
};
const PACKAGE_POINTS = Object.fromEntries(Object.keys(SHOW_PACKAGES).map((name) => [name,
  SERVICES.flatMap((service) => service.summary?.[name as ShowPackage] ?? []).sort((a, b) => a.order - b.order).map((point) => point.text),
])) as Record<ShowPackage, string[]>;
const PACKAGE_FEATURES = Object.fromEntries(Object.keys(SHOW_PACKAGES).map((name) => [name, {
  ...packageCopy[name as ShowPackage],
  groups: Object.entries(groupTitles).map(([category, title]) => ({ title, items: SERVICES
    .filter((service) => service.category === category)
    .flatMap((service) => service.cards?.[name as ShowPackage] ?? [])
    .sort((a, b) => a.order - b.order).map((point) => point.text) })),
}])) as Record<ShowPackage, { tag: string; badge: string; plus?: string; groups: { title: string; items: string[] }[] }>;
const INCLUDED = SERVICES.filter((service) => service.included && service.cells?.every(Boolean)).sort((a, b) => a.included!.order - b.included!.order).map((service) => ({ id: service.id, ...service.included! }));
const COMPARISON_NOTE = t('packageDetails.youProvideTheOnSiteSoundSystemAsTheEvent');

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

return { SERVICES, SHOW_DURATION, PACKAGE_DETAILS, PACKAGE_POINTS, PACKAGE_FEATURES, dronesLine, addOnLine, COMPARISON, COMPARISON_NOTE, INCLUDED, EXTRAS };
}
