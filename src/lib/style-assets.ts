/** Server-rendered style dependencies, scoped to one Astro request. */
export interface StyleAsset {
  href: string;
  id: string;
  critical?: string;
  /** Opt-in only for a verified first-viewport owner, not any first section. */
  initialViewport?: boolean;
}
export interface StyleLocals {
  styleAssets?: Map<string, StyleAsset>;
}
