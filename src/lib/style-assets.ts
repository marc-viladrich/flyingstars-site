/** Server-rendered style dependencies, scoped to one Astro request. */
export interface StyleAsset {
  href: string;
  id: string;
  critical?: string;
}
export interface StyleLocals {
  styleAssets?: Map<string, StyleAsset>;
}
