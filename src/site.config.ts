export const site = {
  name: 'FlyingStars', locale: 'de',
  description: 'Drohnenshows für Firmen, Städte und Hochzeiten. Motive, Genehmigung und eigene Flotte aus einer Hand.',
  nav: [
    { label: 'Anlässe', href: '/#anlaesse' },
    { label: 'Preise', href: '/drohnenshow-preise/' },
    { label: 'Referenzen', href: '/projekte/' },
    { label: 'Über uns', href: '/ueber-uns/' },
    { label: 'FAQ', href: '/faq/' },
  ],
  cta: { label: 'Show anfragen', href: '/kontakt/' },
  contact: {
    email: 'team@flyingstars.art',
    phone: { label: '0209 88306562', href: 'tel:+4920988306562' },
    mobile: { label: '01579 2608672', href: 'tel:+4915792608672' },
    whatsapp: 'https://wa.me/4915792608672',
    calendly: 'https://calendly.com/team-flyingstars/beratung',
  },
  footer: {
    note: 'Seit 2021 aus dem Ruhrgebiet. 178 Shows bis Oktober 2026.',
    columns: [
      { heading: 'Anlässe', links: [
        { label: 'Hochzeit', href: '/drohnenshow-hochzeit/' },
        { label: 'Marken & Werbung', href: '/drohnenshow-werbung/' },
        { label: 'Indoor', href: '/drohnenshow-indoor/' },
        { label: 'Agenturen', href: '/drohnenshow-werbung/#agenturen' },
      ] },
      { heading: 'FlyingStars', links: [
        { label: 'Über uns', href: '/ueber-uns/' },
        { label: 'Referenzen', href: '/projekte/' },
        { label: 'Preise', href: '/drohnenshow-preise/' },
        { label: 'Kontakt', href: '/kontakt/' },
        { label: 'Blog', href: '/blog/' },
        { label: 'FAQ', href: '/faq/' },
      ] },
    ],
    address: {
      visit: ['Triple Z, Gründungszentrum Zeche Zollverein', 'Katernberger Str. 107', '45327 Essen'],
      post: ['FlyingStars GmbH', 'Bulmker Straße 107', '45888 Gelsenkirchen'],
    },
    social: [
      { label: 'Instagram', href: 'https://www.instagram.com/flyingstars.art/' },
      { label: 'YouTube', href: 'https://www.youtube.com/@flyingstars.' },
      { label: 'TikTok', href: 'https://www.tiktok.com/@flyingstars_art' },
      { label: 'Facebook', href: 'https://www.facebook.com/FlyingStars.Art/' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/company/flyingstars-gmbh/' },
    ],
    legal: [
      { label: 'Impressum', href: '/impressum/' },
      { label: 'Datenschutz', href: '/datenschutz/' },
      { label: 'AGB', href: 'https://flyingstars.art/agb/' },
    ],
  },
  formEndpoint: import.meta.env.PUBLIC_FORM_ENDPOINT || '/api/contact',
} as const;
