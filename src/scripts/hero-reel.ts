// Ambient-Reels teilen Quelle, Sichtbarkeit und Motion-Policy mit Anlass-Hero und Referenzkarten.
// Startseiten-Hero am Handy (Marc, 21.11.2026): runder Play/Pause-Knopf ohne Beschriftung wie im Anlass-Seitenkopf, damit
// alle Videos am Handy gleich bedienbar sind. Mit Knopf läuft der Controller als 'manual': ohne Wahl verhält er sich wie
// 'ambient' (videoWanted), die Wahl des Knopfes hat Vorrang; die globale Pause bleibt verbindlich.
import { createVideoController } from './video-controller';
import { mountResponsiveHero } from './responsive-hero';
const start = () => document.querySelectorAll<HTMLVideoElement>('video[data-reel]').forEach(async (reel) => {
  const host = reel.closest<HTMLElement>('[data-reel-host]') ?? reel.parentElement!;
  const btn = host.querySelector<HTMLButtonElement>('[data-hero-toggle]');
  const trigger = btn ? 'manual' : 'ambient';
  const show = (on: boolean) => {
    host.classList.toggle('reel-playing', on);
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', (on ? btn.dataset.labelPause : btn.dataset.labelPlay) ?? '');
  };
  let controller: { setChoice: (value: boolean | null) => void } | undefined;
  if (reel.dataset.reelSources) {
    controller = await mountResponsiveHero(reel, JSON.parse(reel.dataset.reelSources), { trigger, onState: show })
      .catch(() => { host.classList.remove('reel-on'); return undefined; });
  } else {
    controller = createVideoController(reel, { host, trigger, onState: (on) => { if (on) host.classList.add('reel-on'); show(on); }, onError: () => host.classList.remove('reel-on') });
  }
  if (!btn || !controller) return;
  btn.hidden = false;
  btn.addEventListener('click', () => controller!.setChoice(!host.classList.contains('reel-playing')));
});
if (document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
