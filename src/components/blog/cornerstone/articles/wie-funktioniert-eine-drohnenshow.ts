// Cornerstone „Wie funktioniert eine Drohnenshow?“ (Runde 18, zweiter Agent im Labor; produktiv seit 22.11.2026).
// Szene nur für „Ablauf einer Drohnenshow“ mit seinen vier Schlüsselschritten (Aufzählung im Text): Raster auf dem Feld →
// synchroner Start zum Kreis → Kreis wird Herz → Landung am Startpunkt (ablauf-scene.ts). Keine Drohne, Software oder
// Simulation: das zeigt der Programmier-Artikel. Sonst echte Fotos. Medien: tools/blog/cornerstone-media.json. Texte:
// ui.json unter cornerstone.funktion.*.
import { defineCornerstone } from '../types';
import { ablaufScene } from '../../ablauf-scene';
import { scenePalette } from '../../scene-palette';

const M = '/media/blog/wie-funktioniert-eine-drohnenshow/';
export default defineCornerstone({
  post: '2025-01-14-wie-funktioniert-drohnenshow-drohne',
  i18n: 'cornerstone.funktion',
  cover: {
    avif: `${M}titel.avif`, webp: `${M}titel.webp`, width: 1600, height: 800, alt: 'cover',
    social: [{ src: `${M}titel-16x9.jpg`, width: 1280, height: 720 }, { src: `${M}titel-4x3.jpg`, width: 1200, height: 900 }, { src: `${M}titel-1x1.jpg`, width: 1200, height: 1200 }],
  },
  layout: 'basic',
  blocks: [
    { kind: 'text', section: 0 },
    { kind: 'text', section: 1 },
    { kind: 'photos', photos: [
      { src: `${M}showdrohne.webp`, width: 960, height: 1200, alt: 'photoDrone' },
      { src: `${M}startunterlagen.webp`, width: 960, height: 1200, alt: 'photoPads' },
    ], caption: 'photoDronesCaption', afterSection: 1 },
    { kind: 'text', section: 2 },
    { kind: 'story', sections: [3], steps: 'list', scene: () => ablaufScene(scenePalette), groups: ['groupFlow'], label: 'sceneLabel', caption: 'sceneCaption' },
    { kind: 'text', section: 4 },
    { kind: 'photos', photos: [{ src: `${M}nieheim.webp`, width: 1600, height: 1000, alt: 'photoNieheim' }], caption: 'photoNieheimCaption', afterSection: 4 },
    { kind: 'text', section: 5 },
    { kind: 'photos', photos: [{ src: `${M}startraster-park.webp`, width: 1600, height: 1000, alt: 'photoPark' }], caption: 'photoParkCaption', focus: '20% 80%' },
    { kind: 'text', section: 6 },
    { kind: 'finale', section: 7 },
  ],
});
