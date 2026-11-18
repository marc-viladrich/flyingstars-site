/**
 * CSS-Dauerschleifen (Logo-Laufband, Aufnahmepunkt im Showreel-Kopf) laufen nur, solange sie im Bild sind und Bewegung
 * erlaubt ist (motion-policy: keine reduzierte Bewegung, keine globale Pause, Tab sichtbar). Vertrag: das Element trägt
 * data-loop, dieses Skript setzt data-running="true|false"; global.css hält bei "false" über --loop-play an. Ohne
 * JavaScript läuft die Schleife wie bisher.
 */
import { observeVisibility, subscribeMotionPolicy } from './motion-policy';

export function gateLoop(element: HTMLElement): () => void {
  let visible = false, allowed = false;
  const apply = () => { element.dataset.running = String(visible && allowed); };
  const stopPolicy = subscribeMotionPolicy((policy) => { allowed = !policy.reduced && !policy.globalPaused && policy.pageVisible; apply(); });
  const stopView = observeVisibility(element, (inView) => { visible = inView; apply(); }, 0);
  return () => { stopPolicy(); stopView(); };
}

for (const element of document.querySelectorAll<HTMLElement>('[data-loop]:not([data-running])')) gateLoop(element);
