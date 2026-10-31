// Navigation nach Moritz' Sitemap-Entwurf (31.10.2026, noch nicht von FlyingStars abgenommen): Anlässe, Preise,
// Referenzen, Über uns, FAQ, Blog; Kontakt über den Button „Show anfragen“. „Anlässe“ ist nur ein Menüpunkt ohne eigene
// Seite. „Unternehmen“ führt auf die Startseite (Moritz' Option b: die Startseite ist auf „Drohnenshow“ optimiert, eine
// eigene Unternehmensseite würde mit ihr konkurrieren). Im Menü stehen nur Anlass-Seiten, die es schon gibt; Städte,
// Festivals, Privat, Heiratsantrag, Silvester usw. kommen nach Moritz' Prioritäten dazu.
export const site = {
  name: 'FlyingStars', locale: 'de',
  description: 'Drohnenshows für Unternehmen, Städte, Festivals und Hochzeiten. Motive, Genehmigung und eigene Flotte aus einer Hand.',
  nav: [
    { label: 'Anlässe', href: '/#anlaesse', children: [
      { label: 'Unternehmen', href: '/' },
      { label: 'Marken & Werbung', href: '/drohnenshow-werbung/' },
      { label: 'Agenturen', href: '/drohnenshow-werbung/#agenturen' },
      { label: 'Hochzeit', href: '/drohnenshow-hochzeit/' },
      { label: 'Indoor', href: '/drohnenshow-indoor/' },
    ] },
    { label: 'Preise', href: '/drohnenshow-preise/' },
    { label: 'Referenzen', href: '/referenzen/' },
    { label: 'Über uns', href: '/ueber-uns/' },
    { label: 'FAQ', href: '/faq/' },
    { label: 'Blog', href: '/blog/' },
  ] as { label: string; href: string; children?: { label: string; href: string }[] }[],
  cta: { label: 'Show anfragen', href: '/kontakt/' },
  footer: { legal: [
    { label: 'Impressum', href: '/impressum/' },
    { label: 'Datenschutz', href: '/datenschutz/' },
    { label: 'AGB', href: 'https://flyingstars.art/agb/' },
  ] },
  formEndpoint: import.meta.env.PUBLIC_FORM_ENDPOINT || '/api/contact',
} as const;
