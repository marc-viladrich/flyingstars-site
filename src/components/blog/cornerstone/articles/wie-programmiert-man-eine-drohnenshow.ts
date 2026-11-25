// Cornerstone „Wie programmiert man eine Drohnenshow?“ (Runde 15, Prototypen 1–3 mit Marc, 21./22.11.2026). Medien:
// tools/blog/cornerstone-media.json → public/media/blog/wie-programmiert-man-eine-drohnenshow/. Texte: ui.json unter
// cornerstone.programmieren.*. Szene: story-scene.ts (Runde 19: sieben Schritte, zwei Werkzeuge „Womit wir arbeiten“ und
// fünf Schritte „Wie eure Show entsteht“).
import { defineCornerstone } from '../types';
import { storyScene, remapStorySteps } from '../../story-scene';
import { scenePalette } from '../../scene-palette';

const M = '/media/blog/wie-programmiert-man-eine-drohnenshow/';
export default defineCornerstone({
  post: '2025-06-12-wie-programmiert-man-eine-drohnenshow',
  i18n: 'cornerstone.programmieren',
  cover: {
    avif: `${M}titel.avif`, webp: `${M}titel.webp`, width: 1600, height: 800, alt: 'cover',
    social: [{ src: `${M}titel-16x9.jpg`, width: 1280, height: 720 }, { src: `${M}titel-4x3.jpg`, width: 1200, height: 900 }, { src: `${M}titel-1x1.jpg`, width: 1200, height: 1200 }],
  },
  layout: 'basic',
  blocks: [
    { kind: 'text', section: 0 },
    { kind: 'photos', photos: [{ src: `${M}startunterlagen.webp`, width: 1600, height: 1000, alt: 'photoPads' }], caption: 'photoPadsCaption', afterSection: 2 },
    { kind: 'text', section: 1 },
    { kind: 'photos', photos: [
      { src: `${M}stativ.webp`, width: 960, height: 1200, alt: 'photoTripod' },
      { src: `${M}bluete.webp`, width: 960, height: 1200, alt: 'photoBlossom' },
      { src: `${M}doppelherz.webp`, width: 960, height: 1200, alt: 'photoHeart' },
    ], caption: 'photoRowCaption', focus: '20% 80%', afterSection: 3 },
    { kind: 'story', sections: [2, 3], scene: () => remapStorySteps(storyScene(scenePalette), [0, 3, 5, 1, 2, 4, 5, 1, 6]), groups: ['groupTools', 'groupFlow'], label: 'sceneLabel', caption: 'sceneCaption' },
    { kind: 'finale', section: 4 },
  ],
});
