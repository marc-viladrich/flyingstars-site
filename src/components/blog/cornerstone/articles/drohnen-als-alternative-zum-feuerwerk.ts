// Cornerstone „Drohnen als Alternative zum Feuerwerk“ (Runde 18, zweiter Agent im Labor; produktiv seit 22.11.2026).
// Keine Szene: Der Text vergleicht und zählt auf, er erklärt keinen Ablauf. Stattdessen die Vergleichstabelle der Seite
// Nachhaltigkeit (dieselben Daten, keine Kopie) direkt nach der Umwelt-Aussage (Abschnitt 2 nach dem ersten Absatz geteilt).
// Medien: tools/blog/cornerstone-media.json. Texte: ui.json unter cornerstone.feuerwerk.*.
import { defineCornerstone } from '../types';

const M = '/media/blog/drohnen-als-alternative-zum-feuerwerk/';
export default defineCornerstone({
  post: '2025-03-31-drohnen-feuerwerk-als-alternative',
  i18n: 'cornerstone.feuerwerk',
  cover: {
    avif: `${M}titel.avif`, webp: `${M}titel.webp`, width: 1600, height: 800, alt: 'cover',
    social: [{ src: `${M}titel-16x9.jpg`, width: 1280, height: 720 }, { src: `${M}titel-4x3.jpg`, width: 1200, height: 900 }, { src: `${M}titel-1x1.jpg`, width: 1200, height: 1200 }],
  },
  layout: 'basic',
  blocks: [
    { kind: 'text', section: 0 },
    { kind: 'photos', photos: [{ src: `${M}bluete.webp`, width: 1600, height: 1000, alt: 'photoBlossom' }], caption: 'photoBlossomCaption' },
    { kind: 'text', section: 1 },
    { kind: 'text', section: 2, split: { after: 1, part: 0 } },
    { kind: 'compare', label: 'compareLabel', caption: 'compareCaption' },
    { kind: 'text', section: 2, split: { after: 1, part: 1 } },
    { kind: 'photos', photos: [{ src: `${M}transportkoffer.webp`, width: 1600, height: 1000, alt: 'photoCases' }], caption: 'photoCasesCaption' },
    { kind: 'text', section: 3 },
    { kind: 'photos', photos: [
      { src: `${M}markenzeichen.webp`, width: 1000, height: 1000, alt: 'photoMark' },
      { src: `${M}schriftzug.webp`, width: 1000, height: 1000, alt: 'photoLettering' },
      { src: `${M}jubilaeum.webp`, width: 1000, height: 1000, alt: 'photoAnniversary' },
    ], caption: 'photoAdsCaption', focus: '20% 80%', afterSection: 3 },
    { kind: 'text', section: 4 },
    { kind: 'text', section: 5 },
    { kind: 'finale', section: 6 },
  ],
});
