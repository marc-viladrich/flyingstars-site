import { createTranslator } from './i18n/ui.mjs';
// Navigation nach Moritz' Sitemap-Entwurf (31.10.2026, noch nicht von FlyingStars abgenommen): Anlässe, Preise,
// Referenzen, Über uns, FAQ, Blog; Kontakt über den Button „Show anfragen“. „Anlässe“ ist nur ein Menüpunkt ohne eigene
// Seite. „Unternehmen“ führt auf die Startseite (Moritz' Option b: die Startseite ist auf „Drohnenshow“ optimiert, eine
// eigene Unternehmensseite würde mit ihr konkurrieren). Im Menü stehen nur Anlass-Seiten, die es schon gibt; Städte,
// Festivals, Privat, Heiratsantrag, Silvester usw. kommen nach Moritz' Prioritäten dazu.
export function getSite(locale = 'de') {
const t = createTranslator(locale);
return {
  name: 'FlyingStars', locale,
  description: t('site.droneShowsForBusinessesCitiesFestivalsAndWeddingsDesignPermits'),
  nav: [
    { label: t('base.occasions'), href: '/#anlaesse', children: [
      { label: t('site.businesses'), href: '/' },
      { label: t('site.brandsAdvertising'), href: '/drohnenshow-werbung/' },
      { label: t('site.agencies'), href: '/drohnenshow-werbung/#agenturen' },
      { label: t('site.wedding'), href: '/drohnenshow-hochzeit/' },
      { label: 'Indoor', href: '/drohnenshow-indoor/' },
    ] },
    { label: t('site.prices'), href: '/drohnenshow-preise/' },
    { label: t('casestudy.ourWork'), href: '/referenzen/' },
    { label: t('site.aboutUs'), href: '/ueber-uns/' },
    { label: 'FAQ', href: '/faq/' },
    { label: 'Blog', href: '/blog/' },
  ] as { label: string; href: string; children?: { label: string; href: string }[] }[],
  cta: { label: t('chopper404.requestAShow'), href: '/kontakt/' },
  footer: { legal: [
    { label: t('site.legalNotice'), href: '/impressum/' },
    { label: t('site.privacy'), href: '/datenschutz/' },
    { label: t('site.terms'), href: 'https://flyingstars.art/agb/' },
  ] },
  formEndpoint: import.meta.env.PUBLIC_FORM_ENDPOINT || '/api/contact',
} as const;
}
export const site = getSite();
