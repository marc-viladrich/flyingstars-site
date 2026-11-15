// Himmel: der Schwarm (schwarm.ts) und der Lichtlauf der H1 (lichtlauf.ts). Konzept: docs/himmel.md
import { lichtlauf } from './lichtlauf';
import { initSchwarm } from './schwarm';

// Der Lichtlauf startet erst mit geladener Überschriftenschrift, sonst läuft das Licht über die Ersatzschrift
(document.fonts?.ready ?? Promise.resolve()).then(lichtlauf);
initSchwarm();
