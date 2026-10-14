export const site = {
  name: 'FlyingStars', locale: 'de',
  description: 'Drohnenshows für Marken, Städte und große Momente. Von der ersten Idee bis zur Landung aus einer Hand.',
  formEndpoint: import.meta.env.PUBLIC_FORM_ENDPOINT || '/api/contact',
} as const;
