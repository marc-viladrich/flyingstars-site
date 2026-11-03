import { createVideoController, VIDEO_MOBILE_QUERY, type VideoTrigger } from './video-controller.ts';
import { getMotionPolicy } from './motion-policy.ts';
import { chooseVideo } from './video-lab-selection.mjs';
import { selectHeroPair, heroUpgrade, UPGRADE_STABLE_MS, type HeroPair, type HeroSources, type Rendition } from './hero-video-sizing.ts';
export type { HeroSources } from './hero-video-sizing.ts';

export async function mountResponsiveHero(reel: HTMLVideoElement, sources: HeroSources, {
  trigger = 'ambient', onSelected = (_video: Rendition, _reason: string) => {}, onState = (_on: boolean) => {},
} = {} as { trigger?: VideoTrigger; onSelected?: (video: Rendition, reason: string) => void; onState?: (on: boolean) => void }) {
  const host = reel.closest<HTMLElement>('[data-reel-host]') ?? reel.parentElement!;
  const mobile = matchMedia(VIDEO_MOBILE_QUERY);
  const geometry = () => {
    const box = reel.getBoundingClientRect();
    return { width: box.width, height: box.height, fit: getComputedStyle(reel).objectFit };
  };
  const initialPair = () => { const box = geometry(); return selectHeroPair(sources, mobile.matches, box.width, box.height, box.fit); };
  let selected: Rendition | undefined, selectedPair: HeroPair | undefined, upgradePair: HeroPair | undefined;
  let preparedUpgrade: Rendition | undefined, stabilityGeneration = 0;
  let disposed = false, av1Failed = false, upgraded = false, playing = false, sourceGeneration = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const clearTimer = () => { clearTimeout(timer); timer = undefined; stabilityGeneration++; };
  const upgrade = () => {
    if (!selected || disposed || upgraded || !playing || !reel.src) return;
    const policy = getMotionPolicy();
    // Even an explicit manual play must not turn a resize into an extra Save-Data request.
    if (policy.saveData || policy.reduced || policy.globalPaused || !policy.pageVisible) return;
    const box = geometry();
    return heroUpgrade(sources, selected, mobile.matches, box.width, box.height, box.fit);
  };
  const scheduleUpgrade = () => {
    clearTimer();
    if (!upgrade()) return;
    timer = setTimeout(async () => {
      timer = undefined;
      const pair = upgrade();
      if (!pair) return;
      const stable = stabilityGeneration;
      // Probe while the current file keeps playing. Pause/policy/geometry changes
      // invalidate this candidate before we clear src or spend any media bytes.
      const video = av1Failed ? pair.fallback : await chooseVideo(pair, navigator.mediaCapabilities);
      if (stable !== stabilityGeneration || upgrade() !== pair) return;
      upgraded = true; upgradePair = pair;
      preparedUpgrade = video;
      host.classList.remove('reel-on');
      controller.refreshSource();
    }, UPGRADE_STABLE_MS);
  };
  const controller = createVideoController(reel, {
    host, trigger,
    source: async () => {
      const request = ++sourceGeneration;
      let pair = upgradePair ?? initialPair();
      let video: Rendition = av1Failed ? pair.fallback : preparedUpgrade ?? await chooseVideo(pair, navigator.mediaCapabilities);
      if (disposed || request !== sourceGeneration) return '';
      // Layout may change while MediaCapabilities is pending (at most 250ms).
      // Use the current geometry's H.264 immediately rather than start another probe.
      const latest = upgradePair ?? initialPair();
      if (latest !== pair) { pair = latest; video = pair.fallback; }
      selectedPair = pair; selected = video;
      onSelected(video, av1Failed ? 'H.264 nach Wiedergabefehler' : upgraded ? 'Einmaliges Größenupgrade' : video.codec === 'av1' ? 'AV1: flüssig und energieeffizient gemeldet' : 'H.264: sicherer Rückfallpfad');
      return video.src;
    },
    onState: on => {
      playing = on;
      if (on) { host.classList.add('reel-on'); scheduleUpgrade(); }
      else clearTimer();
      onState(on);
    },
    onError: () => {
      host.classList.remove('reel-on');
      const failed = selected, request = sourceGeneration;
      if (!failed) return;
      if (failed.codec === 'h264' || av1Failed) { onSelected(failed, 'Wiedergabe fehlgeschlagen, Standbild bleibt sichtbar'); return; }
      av1Failed = true;
      // Do not replace a controller/listener inside its own media error dispatch.
      // The retry keeps its size, timeline and every policy subscription.
      upgradePair = selectedPair;
      queueMicrotask(() => {
        if (!disposed && request === sourceGeneration && failed === selected) controller.refreshSource();
      });
    },
  });
  const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(scheduleUpgrade);
  resize?.observe(reel);
  window.addEventListener('resize', scheduleUpgrade);
  mobile.addEventListener('change', scheduleUpgrade);
  return {
    ...controller,
    dispose: () => {
      disposed = true; sourceGeneration++; clearTimer(); resize?.disconnect();
      window.removeEventListener('resize', scheduleUpgrade); mobile.removeEventListener('change', scheduleUpgrade);
      controller.dispose();
    },
  };
}
