export const site = {
  name: 'FlyingStars', locale: 'de',
  description: 'Drohnenshows für Marken, Städte und große Momente. Von der ersten Idee bis zur Landung aus einer Hand.',
  nav: [
    { label: 'Anlässe', href: '/#anlaesse' },
    { label: 'Preise', href: '/drohnenshow-preise/' },
    { label: 'Projekte', href: '/projekte/' },
    { label: 'Ablauf', href: '/#ablauf' },
    { label: 'FAQ', href: '/faq/' },
  ],
  cta: { label: 'Show anfragen', href: '/#anfrage' },
  footer: { legal: [{label:'Impressum',href:'/impressum/'},{label:'Datenschutz',href:'/datenschutz/'}] },
  formEndpoint: import.meta.env.PUBLIC_FORM_ENDPOINT || '/api/contact',
} as const;
