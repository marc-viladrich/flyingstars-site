import { getImage } from 'astro:assets';

const hosts = new Set(['flyingstars.art', 'flyingstars-relaunch.vercel.app', process.env.MEDIA_HOST ?? 'media.example.invalid']);
const dimensions = new Map<string, Promise<{width:number;height:number}>>();
async function sourceSize(src: string) {
  const url = new URL(src);
  if (url.protocol !== 'https:' || !hosts.has(url.hostname)) throw new Error(`Nicht freigegebene FlyingStars-Medienquelle: ${url.hostname}`);
  if (!dimensions.has(src)) dimensions.set(src, getImage({src,inferSize:true}).then(image => ({width:Number(image.attributes.width),height:Number(image.attributes.height)})));
  return dimensions.get(src)!;
}
/** Infer source dimensions first: inferSize plus width alone retains the source height in Astro 7. */
export async function optimizedImage(src: string, width = 960, height?: number, format: 'webp' | 'jpg' = 'webp') {
  const size = await sourceSize(src);
  const targetWidth = Math.min(width, 960, size.width);
  const targetHeight = height ?? Math.round(targetWidth * size.height / size.width);
  const image = await getImage({src,width:targetWidth,height:targetHeight,fit:'cover',format,quality:format === 'jpg' ? 78 : 65});
  return {src:image.src,width:Number(image.attributes.width),height:Number(image.attributes.height),attributes:image.attributes};
}
/** Keep the full logo and size it by its rendered height, including portrait marks. */
export async function optimizedLogo(src: string, height: number) {
  const size = await sourceSize(src);
  return optimizedImage(src, Math.round(size.width / size.height * height));
}
