// Kontaktdaten und Gesichter der Anfrage, an einer Stelle (ContactForm, FAQ-Abschluss).
const U = 'https://flyingstars.art/wp-content/uploads/';
export const FOUNDERS = [
  { name: 'Ronja Donsbach', image: { src: `${U}2024/08/Ronja_Teamfoto.jpg`, alt: 'Ronja Donsbach', width: 800, height: 1000 } },
  { name: 'Florian Becker', image: { src: `${U}2024/08/Florian_Teamfoto.jpg`, alt: 'Florian Becker', width: 800, height: 1000 } },
  { name: 'Erwin Wilms', image: { src: `${U}2024/08/Erwin_Teamfoto.jpg`, alt: 'Erwin Wilms', width: 800, height: 1000 } },
];
// Leseschnittstelle für alle operativen Kontaktangaben.
export { contact as CONTACT } from '../content/contact.mjs';
