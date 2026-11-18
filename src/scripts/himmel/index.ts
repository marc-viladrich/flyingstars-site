// Himmel: der Schwarm (schwarm.ts) und der Lichtlauf der H1 (lichtlauf.ts). Konzept: docs/himmel.md
import { lichtlauf } from './lichtlauf';
import { zeileVorab } from './zeile';

// Die Himmelszeile steht sofort (wie zuvor beim Start des Schwarms), nur ihr Himmel kommt später
zeileVorab();

// Der Lichtlauf startet erst mit geladener Überschriftenschrift, sonst läuft das Licht über die Ersatzschrift
(document.fonts?.ready ?? Promise.resolve()).then(lichtlauf);

// Der Schwarm ist Zugabe, nicht erstes Bild (docs/himmel.md → Performance): Sein Code lädt erst, wenn das erste Bild steht,
// also nach `load` und dem ersten Bild des Hero-Videos (spätestens 2,5 s nach `load`; Seiten ohne Video 1,5 s nach `load`),
// dann in einer Leerlaufphase. Wer vorher scrollt, bekommt ihn sofort. Vorher geladen, verschob er den Start des Hero-Videos
// (LCP) um 0,3–0,5 s; direkt nach `load` geriet er auf Seiten mit spätem LCP (Preisseite) noch in dessen Messfenster.
let go = false;
const start = () => {
  if (go) return; go = true;
  import('./schwarm').then(({ initSchwarm }) => initSchwarm()).catch((e) => console.warn('Himmel nicht verfügbar:', e));
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
