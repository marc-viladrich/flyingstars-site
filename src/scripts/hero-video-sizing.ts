export interface Rendition { id: string; src: string; codec: string; contentType: string; width: number; height: number; bitrate: number; fps: number }
export interface HeroPair { preferred: Rendition; fallback: Rendition }
export interface HeroSources { desktop: HeroPair[]; mobile: HeroPair }

// CSS pixels, deliberately without DPR multiplication for this masked, ambient reel.
// A little upscale avoids downloading the next complete file for a few pixels.
export const INITIAL_UPSCALE_LIMIT = 1.1;
export const UPGRADE_UPSCALE_LIMIT = 1.25;
export const UPGRADE_STABLE_MS = 1000;

/** Full source width after object-fit, including pixels cropped by cover. */
export function fittedVideoWidth(width: number, height: number, aspect: number, fit: string): number {
  if (fit === 'cover') return Math.max(width, height * aspect);
  if (fit === 'contain' || fit === 'scale-down') return Math.min(width, height * aspect);
  return width;
}

export function selectHeroPair(sources: HeroSources, mobile: boolean, width: number, height: number, fit: string): HeroPair {
  if (mobile) return sources.mobile;
  const tiers = [...sources.desktop].sort((a, b) => a.fallback.width - b.fallback.width);
  return tiers.find(pair => fittedVideoWidth(width, height, pair.fallback.width / pair.fallback.height, fit) <= pair.fallback.width * INITIAL_UPSCALE_LIMIT) ?? tiers[tiers.length - 1];
}

/** One substantial upgrade goes straight to the cap, never through every tier. */
export function heroUpgrade(sources: HeroSources, current: Rendition, mobile: boolean, width: number, height: number, fit: string): HeroPair | undefined {
  if (mobile) return;
  const largest = sources.desktop.reduce((a, b) => a.fallback.width > b.fallback.width ? a : b);
  const demand = fittedVideoWidth(width, height, current.width / current.height, fit);
  if (demand > current.width * UPGRADE_UPSCALE_LIMIT && largest.fallback.width >= current.width * UPGRADE_UPSCALE_LIMIT) return largest;
}
