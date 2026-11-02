import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const repository=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const mediaURL=/https:\/\/[^\s"'<>`\\]+/g;

/** All literal remote media in content and executable site code, with every referring file. */
export async function inventoryMedia(root=repository) {
 const found=new Map();
 async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else if(/\.(astro|ts|js|mjs|json|yaml|yml|md)$/.test(entry.name)&&!entry.name.endsWith('.test.mjs')){
   const text=await fs.readFile(file,'utf8');
   for(const [raw]of text.matchAll(mediaURL)){
    const url=raw.replace(/&amp;/g,'&');
    if(!/\.(?:jpe?g|png|webp|gif|svg|avif|mp4|webm|pdf)(?:[?#].*)?$/i.test(url)&&!url.includes('/wp-content/uploads/'))continue;
    if(!found.has(url))found.set(url,new Set());found.get(url).add(path.relative(root,file));
   }
  }
 }}await walk(path.join(root,'src'));
 return [...found].sort(([a],[b])=>a.localeCompare(b)).map(([url,files])=>({url,files:[...files].sort(),wordpress:url.startsWith('https://flyingstars.art/wp-content/uploads/')}));
}
async function verify(bytes,contentType,url){
 if(!bytes.length)throw Error('Leere Datei');
 const mime=contentType.split(';')[0].trim().toLowerCase();
 if(mime.startsWith('image/')){
  const info=await sharp(bytes,{limitInputPixels:100_000_000}).metadata();
  const expected={jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',svg:'image/svg+xml',avif:'image/avif',heif:'image/avif'}[info.format];
  if(expected!==mime||!info.width||!info.height)throw Error('Bildtyp oder Abmessungen ungültig');
  return {mime,width:info.width,height:info.height};
 }
 if(mime==='video/mp4'&&bytes.toString('ascii',4,8)==='ftyp')return {mime};
 if(mime==='video/webm'&&bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])))return {mime};
 if(mime==='application/pdf'&&bytes.toString('ascii',0,5)==='%PDF-')return {mime};
 throw Error('Unerwarteter Medientyp für '+url+': '+mime);
}

/** GET only. A failed entry remains in the manifest and makes the CLI fail. Never uploads. */
export async function fetchLegacyMedia({root=repository,staging=path.join(os.homedir(),'flyingstars-media-staging'),fetcher=fetch}={}){
 root=await fs.realpath(root);staging=path.resolve(staging);
 // Resolve an existing ancestor before mkdir, so a symlink cannot stage into the repository.
 let ancestor=staging,tail=[];
 while(true){try{ancestor=await fs.realpath(ancestor);break;}catch(error){if(error.code!=='ENOENT')throw error;tail.unshift(path.basename(ancestor));ancestor=path.dirname(ancestor);}}
 staging=path.join(ancestor,...tail);
 if(staging===root||staging.startsWith(root+path.sep))throw Error('Staging muss außerhalb des Repositorys liegen.');
 await fs.mkdir(path.join(staging,'originals'),{recursive:true});
 const inventory=await inventoryMedia(root);
 const manifest={version:1,createdAt:new Date().toISOString(),expectedEntries:inventory.length,complete:inventory.length===0,entries:[]};
 const save=async()=>{const pending=path.join(staging,'manifest.json.tmp');await fs.writeFile(pending,JSON.stringify(manifest,null,2)+'\n');await fs.rename(pending,path.join(staging,'manifest.json'));};
 await save();
 for(const item of inventory){
  const entry={...item};
  try{
   const response=await fetcher(item.url,{signal:AbortSignal.timeout(180_000)});
   if(!response.ok)throw Error('HTTP '+response.status);
   const limit=512*1024*1024,chunks=[];let size=0;
   for await(const chunk of response.body){size+=chunk.length;if(size>limit)throw Error('Mehr als 512 MiB');chunks.push(chunk);}
   const bytes=Buffer.concat(chunks),declared=response.headers.get('content-length');
   if(declared&&!response.headers.get('content-encoding')&&Number(declared)!==bytes.length)throw Error('Content-Length stimmt nicht');
   const info=await verify(bytes,response.headers.get('content-type')||'',item.url),digest=sha256(bytes);
   const extension=path.extname(new URL(item.url).pathname).toLowerCase();
   const file='originals/'+digest+extension;
   await fs.writeFile(path.join(staging,file),bytes);
   // Read back the persisted file; the manifest attests to staging bytes, not just the response.
   if(sha256(await fs.readFile(path.join(staging,file)))!==digest)throw Error('SHA-256 nach Speicherung abweichend');
   Object.assign(entry,{status:'verified',file,bytes:bytes.length,sha256:digest,...info,finalURL:response.url||item.url});
  }catch(error){Object.assign(entry,{status:'failed',error:[error.message,error.cause?.code,error.cause?.hostname].filter(Boolean).join(': ')});}
  manifest.entries.push(entry);
  manifest.complete=manifest.entries.length===manifest.expectedEntries;
  await save();
 }
 return manifest;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);if(args.length>1)throw Error('Aufruf: node scripts/fetch-legacy-media.mjs [Staging-Verzeichnis]');
  const manifest=await fetchLegacyMedia({staging:args[0]});
  const failed=manifest.entries.filter(entry=>entry.status==='failed');
  console.log(JSON.stringify({total:manifest.entries.length,wordpress:manifest.entries.filter(entry=>entry.wordpress).length,verified:manifest.entries.length-failed.length,failed},null,2));
  if(failed.length)process.exitCode=1;
 }catch(error){console.error(error.message);process.exitCode=1;}
}
