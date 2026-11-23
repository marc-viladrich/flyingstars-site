// Himmel: der Schwarm (schwarm.ts) und die Schriftstärke der Verlaufsworte (staerke.ts). Konzept: docs/himmel.md
import { staerke } from './staerke';

import type { FolgeLoader } from './schwarm';

export function initHimmel(loadFolge?: FolgeLoader) {
  // Die Verlaufsworte messen ihren Ausgleich erst mit geladener Überschriftenschrift, sonst mit den Maßen der Ersatzschrift
  (document.fonts?.ready ?? Promise.resolve()).then(staerke);

  // Der Schwarm lädt nach dem ersten Hero-Bild oder beim Scrollen. Spätestens 2,5 s nach load gibt der Timer den
  // Import in der nächsten Leerlaufphase frei. Seiten ohne Video warten 1,5 s nach load. Siehe docs/himmel.md.
  let go = false;
  const start = () => {
    if (go) return; go = true;
    import('./schwarm').then(({ initSchwarm }) => initSchwarm(loadFolge)).catch((e) => console.warn('Himmel nicht verfügbar:', e));
  };
  const idle = (fn: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1200 }) : setTimeout(fn, 150));
  const afterFirstView = () => {
    const reel = document.querySelector<HTMLVideoElement>('video[data-reel]');
    let done = false;
    const ready = () => { if (!done) { done = true; idle(start); } };
    if (reel && !document.documentElement.classList.contains('motion-paused')) {
      if (reel.readyState >= 3 && !reel.paused) ready();
      else reel.addEventListener('playing', ready, { once: true });
      setTimeout(ready, 2500);
    } else setTimeout(ready, 1500);
  };
  addEventListener('scroll', start, { once: true, passive: true });
  if (document.readyState === 'complete') afterFirstView(); else addEventListener('load', afterFirstView, { once: true });
}
