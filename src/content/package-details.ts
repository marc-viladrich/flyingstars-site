import packageData from './show-packages.json' with {type:'json'};
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

/** Hinweis unter den Paketkarten (Marc, 02.11.2026: „einfach Alle Preise netto zzgl. Anfahrt“). Die Showzeit steht auf jeder Karte. */
const PRICE_NOTE = t('packageDetails.pricesNetPlusTravel');

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

/** Showzeit je Paket auf jeder Paketkarte (Marc, 02.11.2026: „da fehlt mir die Showzeit“). 
 * FlyingStars hat im Fragebogen 21.10.2026 die frühere Staffel 10/13/15 Min korrigiert („Es gibt keine Dauer je Paket“),
 * Marc hat daraus am 02.11.2026 „überall 10–25 Minuten Showzeit“ gemacht. Eine Quelle für Karten und Konfigurator. */
function showtimeLine(_name?: ShowPackage): string {
  return t('packageDetails.showtimeLine');
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
// The stable service IDs, membership and editorial projections are stored once with the package facts.
// Dictionary references still resolve through the same DE/EN/NL owner; prices remain computed.
function resolveService(value: any): any {
  if (Array.isArray(value)) return value.map(resolveService);
  if (value && typeof value === 'object') {
    if ('key' in value) return t(value.key);
    if ('de' in value && 'en' in value && 'nl' in value) return value[locale] ?? value.de;
    if (value.computed === 'drones') return dronesLine(value.package);
    if (value.computed === 'more-drones') { const p = SHOW_PACKAGES[value.package as ShowPackage]; return t('packageDetails.valuePerValue', { v0: money(p.add), v1: p.step }); }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveService(item)]));
  }
  return value === false ? null : value;
}
const SERVICES: Service[] = packageData.services.map(resolveService);
const COMPARISON = SERVICES.map(({ id, label, cells, all }) => ({ id, label, cells, all }));
const groupTitles = { design: t('packageDetails.designContent'), music: t('packageDetails.music'), service: t('packageDetails.serviceExtras') };
const packageCopy = {
  SPARK: { tag: t('packageDetails.aSparklingStartForWeddingsAnniversariesAndSmallerCorporateAnd'),
    badge: t('packageDetails.entryPackage') },
  HORIZON: { tag: t('packageDetails.yourOwnProductionForProductLaunchesLargeCorporateEventsAnd'),
    badge: 'Bestseller',
    plus: t('packageDetails.everythingInSparkPlus') },
  ODYSSEY: { tag: t('packageDetails.aStorytellingShowForMajorCampaignsFestivalsAndLargeAudiences'),
    badge: t('packageDetails.storytelling3d'),
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

return { SERVICES, PRICE_NOTE, PACKAGE_DETAILS, PACKAGE_POINTS, PACKAGE_FEATURES, dronesLine, addOnLine, COMPARISON, COMPARISON_NOTE, INCLUDED, EXTRAS, showtimeLine };
}
