// Kontaktdaten und Gesichter der Anfrage, an einer Stelle (ContactForm, FAQ-Abschluss).
const U = 'https://flyingstars.art/wp-content/uploads/';
export const FOUNDERS = [
  { name: 'Ronja Donsbach', image: { src: `${U}2024/08/Ronja_Teamfoto.jpg`, alt: 'Ronja Donsbach', width: 800, height: 1000 } },
  { name: 'Florian Becker', image: { src: `${U}2024/08/Florian_Teamfoto.jpg`, alt: 'Florian Becker', width: 800, height: 1000 } },
  { name: 'Erwin Wilms', image: { src: `${U}2024/08/Erwin_Teamfoto.jpg`, alt: 'Erwin Wilms', width: 800, height: 1000 } },
];
export const CONTACT = {
  email: 'team@flyingstars.art',
  phone: { label: '0209 883 065 62', href: 'tel:+4920988306562' },
  mobile: { label: '01579 260 86 72', href: 'tel:+4915792608672' },
  video: { labelKey: 'contact.videoCall', href: 'https://calendly.com/team-flyingstars/beratung' },
  whatsapp: { label: 'WhatsApp', href: 'https://wa.me/4915792608672' },
  // Anschriften zeilenweise wie auf einem Briefumschlag (Kontakt-Section, Footer)
  visit: ['Triple Z', 'Gründungszentrum Zeche Zollverein', 'Katernberger Str. 107', '45327 Essen'],
  post: ['FlyingStars GmbH', 'Bulmker Straße 107', '45888 Gelsenkirchen'],
};
