/** Resolve editorial URLs without changing persisted upload paths. */
export async function resolveImageSource(src, {uploads, hosts, remoteSize}) {
  if (src.startsWith('/assets/')) {
    if (!/^\/assets\/[a-zA-Z0-9._/-]+$/.test(src) || src.split('/').includes('..')) throw new Error('Ungültiger Medienpfad');
    const load = uploads['../../public' + src];
    if (!load) throw new Error('Fehlender Bild-Upload: ' + src);
    const image = await load();
    return {src: image, width: image.width, height: image.height};
  }
  const url = new URL(src);
  if (url.protocol !== 'https:' || url.port || url.username || url.password || !hosts.has(url.hostname)) throw new Error('Nicht freigegebene FlyingStars-Medienquelle: ' + url.hostname);
  return {src, ...await remoteSize(src)};
}

/** Include the endpoint even for sources smaller than the first breakpoint. Never upscale. */
export function imageWidths(sourceWidth, maximum = 1600) {
  const end = Math.min(sourceWidth, maximum);
  return [...new Set([320, 480, 768, 960, 1200, 1600, end].filter(width => width <= end))].sort((a,b) => a-b);
}
