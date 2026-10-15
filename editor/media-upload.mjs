import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {MAX_MEDIA_BYTES,MAX_MEDIA_PIXELS} from './core/media-limits.mjs';
export {MAX_MEDIA_BYTES,MAX_MEDIA_PIXELS} from './core/media-limits.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const invalid=message=>Object.assign(new Error(message),{status:400});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function decodeUpload({name,base64,requestId}){
 if(typeof requestId!=='string'||!uuid.test(requestId))throw invalid('Eine gültige Auftrags-ID fehlt.');
 if(typeof name!=='string'||!name.trim()||name.length>150||/[\u0000-\u001f\u007f]/.test(name))throw invalid('Der Bildname fehlt oder ist ungültig.');
 if(typeof base64!=='string'||!base64.length||base64.length>Math.ceil(MAX_MEDIA_BYTES/3)*4)throw invalid('Bilder dürfen höchstens 5 MB groß sein.');
 // Do not repeat grouped regexes over multi-megabyte payloads: V8 can overflow its stack.
 // Exact padding and canonical encoding are checked by the bounded roundtrip below.
 if(base64.length%4!==0||/[^A-Za-z0-9+/=]/.test(base64))throw invalid('Ungültige Bildübertragung.');
 const input=Buffer.from(base64,'base64');
 if(input.length>MAX_MEDIA_BYTES||input.toString('base64')!==base64)throw invalid('Ungültige Bildübertragung.');
 let format;
 if(input.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))format='png';
 else if(input.length>=3&&input[0]===255&&input[1]===216&&input[2]===255)format='jpeg';
 else if(input.length>=12&&input.toString('ascii',0,4)==='RIFF'&&input.toString('ascii',8,12)==='WEBP')format='webp';
 else throw invalid('Bitte ein PNG-, JPEG- oder WebP-Bild auswählen. SVG-Uploads sind nicht freigegeben.');
 return {name:name.trim().normalize('NFC'),input,format,requestId};
}

// The library shows titles, not file names: "testbild-violett_2.png" → "Testbild violett 2".
export function mediaTitle(name){const words=String(name||'').replace(/\.[a-z0-9]{2,5}$/i,'').replace(/[-_.\s]+/g,' ').trim();return words?words[0].toLocaleUpperCase('de')+words.slice(1):'Bild';}

/** Untrusted uploads are decoded and re-encoded; EXIF, GPS and ICC metadata never persist. */
export async function normalizeUpload(upload){
 const {name,input,format,requestId}=decodeUpload(upload);
 let output,info;
 try{
  const image=sharp(input,{limitInputPixels:MAX_MEDIA_PIXELS,failOn:'warning'});
  const metadata=await image.metadata();
  if(metadata.format!==format||(metadata.pages||1)!==1)throw new Error('Nur einzelne Rasterbilder sind freigegeben.');
  image.rotate();
  if(format==='jpeg')image.jpeg({quality:90});
  else if(format==='png')image.png({compressionLevel:9});
  else image.webp({lossless:true});
  ({data:output,info}=await image.toBuffer({resolveWithObject:true}));
 }catch{throw invalid('Das Bild konnte nicht vollständig gelesen werden. Erlaubt sind einzelne PNG-, JPEG- oder WebP-Bilder mit höchstens 20 Megapixeln.');}
 if(output.length>MAX_MEDIA_BYTES)throw invalid('Das aufbereitete Bild überschreitet die Grenze von 5 MB.');
 const extension=format==='jpeg'?'jpg':format;
 const asset=({id:'asset/'+requestId,type:'asset',title:mediaTitle(name),src:'assets/'+hash(output)+'.'+extension,mime:'image/'+format,width:info.width,height:info.height,defaultAlt:''});
 const payload=hash(JSON.stringify({operation:'upload-media',name,inputHash:hash(input)}));
 return {asset,output,payload,requestId};
}

