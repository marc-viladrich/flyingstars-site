/** Prototype prices from FlyingStars' supplied Vercel reference, 24 September 2026.
 * Net, excluding travel. Customer approval is required before production release.
 */
import spark from './packages/spark.json';
import horizon from './packages/horizon.json';
import odyssey from './packages/odyssey.json';
import { packageSchema } from './package-schema.mjs';

const nativePackage = (input: unknown, expectedName: string) => {
  // Astro validates the native files while rendering. The browser reuses those
  // validated files without bundling the editor/build schema runtime.
  const data = import.meta.env.SSR ? packageSchema.parse(input) : input as ReturnType<typeof packageSchema.parse>;
  if (data.name !== expectedName) throw new Error(`Paketdatei für ${expectedName} enthält ${data.name}.`);
  return { ...data, max: data.max ?? Infinity };
};

export const SHOW_PACKAGES = {
  SPARK: nativePackage(spark, 'SPARK'),
  HORIZON: nativePackage(horizon, 'HORIZON'),
  ODYSSEY: nativePackage(odyssey, 'ODYSSEY'),
};
export type ShowPackage = keyof typeof SHOW_PACKAGES;
export const PACKAGE_NAMES = Object.keys(SHOW_PACKAGES) as ShowPackage[];
export function priceFor(name: ShowPackage, drones: number): number | null {
  const p = SHOW_PACKAGES[name];
  return drones > p.max ? null : p.price + Math.max(0, Math.ceil((drones - p.base) / p.step)) * p.add;
}
export function recommendPackage(drones: number): ShowPackage {
  return drones <= SHOW_PACKAGES.SPARK.max ? 'SPARK' : drones < SHOW_PACKAGES.ODYSSEY.base ? 'HORIZON' : 'ODYSSEY';
}
