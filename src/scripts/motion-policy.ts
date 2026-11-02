/** Gemeinsame Lesepolitik. Der Schalter und sein Storage bleiben in site.ts. */
export interface MotionPolicy { reduced: boolean; globalPaused: boolean; pageVisible: boolean; saveData: boolean }
type Connection = EventTarget & { saveData?: boolean };
let reduced: MediaQueryList | undefined;
const listeners = new Set<(policy: MotionPolicy) => void>();
let stop: (() => void) | undefined;
export function getMotionPolicy(): MotionPolicy {
  reduced ??= matchMedia('(prefers-reduced-motion: reduce)');
  return { reduced: reduced.matches, globalPaused: document.documentElement.classList.contains('motion-paused'), pageVisible: !document.hidden,
    saveData: Boolean((navigator as Navigator & { connection?: Connection }).connection?.saveData) };
}
export function subscribeMotionPolicy(listener: (policy: MotionPolicy) => void): () => void {
  listeners.add(listener);
  if (!stop) {
    getMotionPolicy();
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    const emit = () => { const policy = getMotionPolicy(); listeners.forEach((fn) => fn(policy)); };
    const observer = new MutationObserver(emit);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', emit);
    document.addEventListener('flyingstars:motion-change', emit);
    reduced!.addEventListener('change', emit);
    connection?.addEventListener('change', emit);
    stop = () => {
      observer.disconnect(); document.removeEventListener('visibilitychange', emit); document.removeEventListener('flyingstars:motion-change', emit);
      reduced!.removeEventListener('change', emit); connection?.removeEventListener('change', emit);
    };
  }
  listener(getMotionPolicy());
  return () => { listeners.delete(listener); if (!listeners.size) { stop?.(); stop = undefined; } };
}
export function observeVisibility(element: Element, listener: (visible: boolean) => void, threshold = 0.2): () => void {
  if (!('IntersectionObserver' in window)) { listener(true); return () => {}; }
  const observer = new IntersectionObserver(([entry]) => listener(entry.isIntersecting && entry.intersectionRatio >= threshold), { threshold: [0, threshold] });
  observer.observe(element);
  return () => observer.disconnect();
}
