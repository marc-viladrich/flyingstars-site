// Ambient-Reels teilen Quelle, Sichtbarkeit und Motion-Policy mit Anlass-Hero und Referenzkarten.
import { createVideoController } from './video-controller';
const start = () => document.querySelectorAll<HTMLVideoElement>('video[data-reel]').forEach((reel) => {
  const host = reel.closest<HTMLElement>('[data-reel-host]') ?? reel.parentElement!;
  createVideoController(reel, { host, trigger: 'ambient', onState: (on) => { if (on) host.classList.add('reel-on'); }, onError: () => host.classList.remove('reel-on') });
});
if (document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
