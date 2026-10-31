// Navigation Stufe 1 (Vorschlag 30.10.2026, keine bestätigte Sitemap von FlyingStars): akomo-Vorschlag vom 07.10.
// plus Marcs Entscheidungen. Hauptmenü knapp; die Anlass-Seiten (Hochzeit, Indoor, Marken & Werbung) erreicht man über
// „Anlässe“ (Karten auf der Startseite), Kontakt über den Button „Show anfragen“.
export const site = {
  name: 'FlyingStars', locale: 'de',
  description: 'Drohnenshows für Unternehmen, Städte, Festivals und Hochzeiten. Motive, Genehmigung und eigene Flotte aus einer Hand.',
  nav: [
    { label: 'Anlässe', href: '/#anlaesse' },
    { label: 'Referenzen', href: '/referenzen/' },
    { label: 'Preise', href: '/drohnenshow-preise/' },
    { label: 'Über uns', href: '/ueber-uns/' },
    { label: 'FAQ', href: '/faq/' },
  ],
  cta: { label: 'Show anfragen', href: '/kontakt/' },
  footer: { legal: [
    { label: 'Impressum', href: '/impressum/' },
    { label: 'Datenschutz', href: '/datenschutz/' },
    { label: 'AGB', href: 'https://flyingstars.art/agb/' },
  ] },
  formEndpoint: import.meta.env.PUBLIC_FORM_ENDPOINT || '/api/contact',
} as const;
