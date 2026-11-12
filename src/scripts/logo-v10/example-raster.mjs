// Exact example inputs across browser SVG renderers. Unknown uploads use the normal rasterizer.
import { rasterizeFile } from './raster.js';
let index;
export function exampleRaster(file) {
 let source;
 const canonical=()=>source??=(async()=>{
  try {
   index??=fetch('/media/logo-modus/beispiele/rasters-index.json').then(r=>r.ok?r.json():{}).catch(()=>({}));
   const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('');
   const id=(await index)[hash];if(!id)return null;
   const r=await fetch(`/media/logo-modus/beispiele/${id}.raster.json`);return r.ok?await r.json():null;
  }catch{return null;}
 })();
 return async (file,size)=>{
  const image=(await canonical())?.[size];
  if(!image)return rasterizeFile(file,size);
  const bytes=atob(image.rgba),data=new Uint8ClampedArray(bytes.length);
  for(let i=0;i<bytes.length;i++)data[i]=bytes.charCodeAt(i);
  return {width:image.width,height:image.height,data};
 };
}

// Same source identity as the canonical raster; prepared options live in the example file.
export async function exampleOptions(file) {
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('');
 index??=fetch('/media/logo-modus/beispiele/rasters-index.json').then(r=>r.ok?r.json():{}).catch(()=>({}));
 const id=(await index)[hash];
 if(!id)return {};
 const response=await fetch(`/media/logo-modus/beispiele/${id}.json`);
 if(!response.ok)throw new Error(`Beispiel ${id}: ${response.status}`);
 return (await response.json()).options||{};
}
