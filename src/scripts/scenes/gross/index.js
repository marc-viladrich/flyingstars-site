// Runde 11 (Marc 20.11.2026: „solange wir es hinbekommen, die nicht alle auf einmal zu laden … keine riesigen
// performance implications“): Große Motive (300–1000 Drohnen, eine Fassung je Art) liegen je in einer eigenen Datei
// und werden erst geladen, wenn der Konfigurator sie baut. Diese Datei enthält nur die Zuordnung Bauname → Modul;
// Vite macht aus jedem import() ein eigenes kleines Paket. Nie ein Modul aus diesem Ordner statisch importieren
// (Wächter: scripts/gross-lazy.test.mjs). Jedes Modul exportiert `builders` mit genau den hier genannten Baunamen.
export const GROSS = {
  countdown3d: () => import('./countdown.js'),
  countdownStory: () => import('./countdown.js'),
  adventskranz2d: () => import('./adventskranz.js'),
  adventskranz3d: () => import('./adventskranz.js'),
  adventskranzStory: () => import('./adventskranz.js'),
  firstDance3d: () => import('./erster-tanz.js'),
  firstDanceStory: () => import('./erster-tanz.js'),
  satellite3d: () => import('./satellit.js'),
  satelliteStory: () => import('./satellit.js'),
  octopus3d: () => import('./tintenfisch.js'),
  octopusStory: () => import('./tintenfisch.js'),
};
