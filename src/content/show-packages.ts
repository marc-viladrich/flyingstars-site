/** Prototype prices from FlyingStars' supplied Vercel reference, 24 September 2026.
 * Net, excluding travel. Customer approval is required before production release.
 */
export const SHOW_PACKAGES = {
  SPARK: { base: 100, max: 150, price: 7900, step: 10, add: 900, dur: 'ca. 10 Min', color: [255, 158, 41] },
  HORIZON: { base: 200, max: Infinity, price: 15900, step: 50, add: 4900, dur: 'ca. 13 Min', color: [219, 100, 232] },
  ODYSSEY: { base: 300, max: Infinity, price: 34900, step: 100, add: 9900, dur: '15+ Min', color: [51, 237, 242] },
} as const;
export type ShowPackage = keyof typeof SHOW_PACKAGES;
export const PACKAGE_NAMES = Object.keys(SHOW_PACKAGES) as ShowPackage[];
export function priceFor(name: ShowPackage, drones: number): number | null {
  const p = SHOW_PACKAGES[name];
  return drones > p.max ? null : p.price + Math.max(0, Math.ceil((drones - p.base) / p.step)) * p.add;
}
export function recommendPackage(drones: number): ShowPackage {
  return drones <= 150 ? 'SPARK' : drones < 300 ? 'HORIZON' : 'ODYSSEY';
}
