import {getImage,inferRemoteSize} from 'astro:assets';
import type {ImageMetadata} from 'astro';
import {mediaForSource} from './content';
import {resolveImageSource,imageWidths} from './media-source.mjs';
import {editorBuild} from './editor-markers';

// Astro imports these files as ImageMetadata, even though their stable public URLs remain /assets/… .
// Lazy imports read only used uploads. Vite also tracks additions during live preview.
const uploads = import.meta.glob<ImageMetadata>('../../public/assets/**/*.{png,jpg,jpeg,webp}',{import:'default'});
const hosts = new Set(['flyingstars.art','flyingstars-relaunch.vercel.app',process.env.MEDIA_HOST ?? 'media.example.invalid']);
const sources = new Map<string,ReturnType<typeof resolveImageSource>>();
const fast = () => process.env.FLYINGSTARS_OFFLINE_MEDIA === '1' || editorBuild();
async function source(src:string) {
  if (!sources.has(src)) sources.set(src,resolveImageSource(src,{uploads,hosts,remoteSize:async (url:string) => {
    // Production probes the original, so stale editorial dimensions can never cause upscaling.
    // Fast previews use the existing media record without remote GETs.
    const info = fast() ? await mediaForSource(url) : await inferRemoteSize(url);
    return {width:Number(info.width),height:Number(info.height)};
  }}));
  return sources.get(src)!;
}
async function transformImage(src:string,width:number,height:number|undefined,format:'webp'|'jpg',sizes?:string) {
  const resolved = await source(src);
  const targetWidth = Math.min(width,resolved.width);
  // Preserve a requested crop ratio when a small original caps the width.
  const targetHeight = Math.round(targetWidth * (height ? height/width : resolved.height/resolved.width));
  if (fast()) return {src,width:targetWidth,height:targetHeight,attributes:{width:targetWidth,height:targetHeight,...(sizes?{srcset:`${src} ${resolved.width}w`,sizes}:{})}};
  const image = await getImage({src:resolved.src,width:targetWidth,height:targetHeight,fit:'cover',format,quality:format==='jpg'?78:65,...(sizes?{widths:imageWidths(resolved.width,width),sizes}:{})});
  return {src:image.src,width:Number(image.attributes.width),height:Number(image.attributes.height),attributes:{...image.attributes,...(sizes?{srcset:image.srcSet.attribute,sizes}:{})}};
}
/** Responsive content images require a sizes value supplied by the rendering layout. */
export const responsiveImage = (src:string,sizes:string,width=1600,height?:number) => transformImage(src,width,height,'webp',sizes);
/** Single image for social metadata and explicitly exempt small logos. */
export const optimizedImage = (src:string,width=960,height?:number,format:'webp'|'jpg'='webp') => transformImage(src,width,height,format);
export async function optimizedLogo(src:string,height:number) {
  const size = await source(src);
  return optimizedImage(src,Math.round(size.width/size.height*height));
}
