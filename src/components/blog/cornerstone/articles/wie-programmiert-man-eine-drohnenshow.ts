// Cornerstone „Wie programmiert man eine Drohnenshow?“ (Runde 15, Prototypen 1–3 mit Marc, 21./22.11.2026). Medien:
// tools/blog/cornerstone-media.json → public/media/blog/wie-programmiert-man-eine-drohnenshow/. Texte: ui.json unter
// cornerstone.programmieren.*. Szene: story-scene.ts (Runde 19: sieben Schritte, zwei Werkzeuge „Womit wir arbeiten“ und
// fünf Schritte „Wie eure Show entsteht“).
import { defineCornerstone } from '../types';
import { storyScene } from '../../story-scene';
import { scenePalette } from '../../scene-palette';

const M = '/media/blog/wie-programmiert-man-eine-drohnenshow/';
export default defineCornerstone({
  post: '2025-06-12-wie-programmiert-man-eine-drohnenshow',
  i18n: 'cornerstone.programmieren',
  cover: {
    avif: `${M}titel.avif`, webp: `${M}titel.webp`, width: 1600, height: 800, alt: 'cover',
    social: [{ src: `${M}titel-16x9.jpg`, width: 1280, height: 720 }, { src: `${M}titel-4x3.jpg`, width: 1200, height: 900 }, { src: `${M}titel-1x1.jpg`, width: 1200, height: 1200 }],
  },
  dropBodyImages: true,
  blocks: [
    { kind: 'text', section: 0 },
    { kind: 'photos', photos: [{ src: `${M}startunterlagen.webp`, width: 1600, height: 1000, alt: 'photoPads' }], caption: 'photoPadsCaption' },
    { kind: 'text', section: 1 },
    { kind: 'photos', photos: [
      { src: `${M}stativ.webp`, width: 960, height: 1200, alt: 'photoTripod' },
      { src: `${M}bluete.webp`, width: 960, height: 1200, alt: 'photoBlossom' },
      { src: `${M}doppelherz.webp`, width: 960, height: 1200, alt: 'photoHeart' },
    ], caption: 'photoRowCaption', focus: '20% 80%' },
    { kind: 'story', sections: [2, 3], scene: () => storyScene(scenePalette), groups: ['groupTools', 'groupFlow'], label: 'sceneLabel', caption: 'sceneCaption' },
    { kind: 'text', section: 4 }, // Runde 20 (Marc): ein normaler Abschnitt als Abschluss, bevor Logo und Einladung kommen
    { kind: 'finale', section: 5 },
  ],
});
