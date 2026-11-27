import type { ImageMetadata } from 'astro';
import { bundledImageName } from './bundled-media.mjs';

const assets = import.meta.glob<ImageMetadata>('/src/assets/wordpress/*', { eager: true, import: 'default' });

export function resolveImage(src: string): string | ImageMetadata {
  const name = bundledImageName(src);
  if (!name) return src;
  const metadata = assets[`/src/assets/wordpress/${name}`];
  if (!metadata) throw new Error(`Mitgeliefertes Bild fehlt: ${src}`);
  return metadata;
}
