// Runde 11 (Marc 20.11.2026: „solange wir es hinbekommen, die nicht alle auf einmal zu laden … keine riesigen
// performance implications“): Große Motive (300–1000 Drohnen, eine Fassung je Art) liegen je in einer eigenen Datei
// und werden erst geladen, wenn der Konfigurator sie baut. Diese Datei enthält nur die Zuordnung Bauname → Modul;
// Vite macht aus jedem import() ein eigenes kleines Paket. Nie ein Modul aus diesem Ordner statisch importieren
// (Wächter: scripts/gross-lazy.test.mjs). Jedes Modul exportiert `builders` mit genau den hier genannten Baunamen.
export const GROSS = {
};
