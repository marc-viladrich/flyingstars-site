// Stummes Hintergrund-Showreel in Seitenköpfen (Startseite und Referenzen, Marc 01.11.2026: „der gleiche Effekt wie auf
// der Startseite“). Markup: ein Element mit [data-reel-host], darin <video data-reel data-src=… muted loop playsinline>.
// Startet erst nach dem ersten Bild und nur, wenn es sichtbar ist; der Host bekommt .reel-on, sobald es wirklich läuft
// (dann blendet das CSS das Standbild aus). Kein Video bei reduzierter Bewegung, globaler Pause und Datensparmodus: dort
// bleibt das Standbild stehen. Auf schmalen Bildschirmen (bis 700 px) lädt die kleine Fassung aus data-src-small; das CSS
// zeigt das Video dort als gerahmtes Bild im Seitenfluss statt als Hintergrund (Marc, 02.11.2026).
document.querySelectorAll<HTMLVideoElement>('video[data-reel]').forEach((reel) => {
  const root = document.documentElement;
  const host = reel.closest<HTMLElement>('[data-reel-host]') ?? reel.parentElement!;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  const allowed = () => !matchMedia('(prefers-reduced-motion: reduce)').matches && !root.classList.contains('motion-paused') && !conn?.saveData;
  let visible = true;
  const sync = () => {
    if (allowed() && visible) {
      if (!reel.src) reel.src = (matchMedia('(max-width: 700px)').matches && reel.dataset.srcSmall) || reel.dataset.src!;
      reel.play().then(() => host.classList.add('reel-on')).catch(() => {});
    } else reel.pause();
  };
  reel.addEventListener('error', () => { host.classList.remove('reel-on'); reel.removeAttribute('src'); });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, { threshold: 0.2 }).observe(host);
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['class'] });
  const start = () => sync();
  if (document.readyState === 'complete') setTimeout(start, 300); else addEventListener('load', () => setTimeout(start, 300), { once: true });
});
