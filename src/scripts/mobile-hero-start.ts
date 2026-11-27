import type { HeroSources, Rendition } from './hero-video-sizing.ts';
import { readMotionPolicy } from './motion-policy.ts';
import { VIDEO_MOBILE_QUERY, videoWanted } from './video-controller.ts';
import { chooseVideo } from './video-lab-selection.mjs';

export type MobileHeroVideo = HTMLVideoElement & { mobileRendition?: Promise<Rendition | undefined> };

// These explicit dependencies are shared with the player. The homepage runs the same functions from the head.
function prepareMobileHero(
  mobileQuery: string,
  policy: typeof readMotionPolicy,
  wanted: typeof videoWanted,
  select: typeof chooseVideo,
) {
  const mobile = matchMedia(mobileQuery);
  const permitted = () => mobile.matches && !location.hash && scrollY === 0
    && !document.documentElement.hasAttribute('data-language-redirecting')
    && wanted({ trigger: 'ambient', policy: policy(), visible: true, choice: null, hovered: false, touch: false, wide: true });
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (navigation?.type === 'back_forward' || !permitted() || !('MutationObserver' in window)) return;

  const observer = new MutationObserver(() => {
    const reel = document.querySelector<MobileHeroVideo>('video[data-reel-first]');
    if (!reel) return;
    observer.disconnect();
    if (!permitted()) return;
    const { mobile: pair } = JSON.parse(reel.dataset.reelSources!) as HeroSources;
    reel.mobileRendition = select(pair, navigator.mediaCapabilities).then((rendition: Rendition) => {
      if (!reel.isConnected || !permitted()) return;
      reel.preload = 'auto';
      reel.src = rendition.src;
      return rendition;
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', () => observer.disconnect(), { once: true });
}

// Classic inline execution starts resource discovery before external CSS and deferred modules.
export const mobileHeroStart = '(' + prepareMobileHero.toString() + ')(' + [
  JSON.stringify(VIDEO_MOBILE_QUERY), readMotionPolicy.toString(), videoWanted.toString(), chooseVideo.toString(),
].join(',') + ');';
