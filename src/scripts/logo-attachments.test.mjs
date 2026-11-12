import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateLogoFile, brevoAttachments, LOGO_FILE_LIMIT, LOGO_BODY_LIMIT } from '../content/logo-attachments.mjs';
import { onRequestPost } from '../../functions/api/contact.ts';
const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 10L90 90" stroke="red"/></svg>';
const file = text => new File([text], 'client.svg', { type:'image/svg+xml' });
test('static SVG accepted; active, external and spoofed images rejected', async () => {
 await validateLogoFile(file(svg));
 for (const text of [svg.replace('<path','<script'),svg.replace('stroke="red"','onload="alert(1)"'),svg.replace('stroke="red"','fill="url(https://evil.test)"'),svg.replace('<path','<image'), '<!DOCTYPE svg>'+svg]) await assert.rejects(validateLogoFile(file(text)));
 await assert.rejects(validateLogoFile(new File(['fake'],'x.png',{type:'image/png'})));
 await assert.rejects(validateLogoFile(new File([new Uint8Array(LOGO_FILE_LIMIT+1)],'x.png',{type:'image/png'})));
});
test('adapter sends exact original bytes in valid uncompressed ZIP with safe generated filename', async () => {
 const form = new FormData(); form.set('logo-original',file(svg));
 const [attachment] = await brevoAttachments(form);
 assert.equal(attachment.name,'logo-original.svg.zip');
 const zip = Buffer.from(attachment.content,'base64');
 assert.equal(zip.readUInt32LE(0),0x04034b50);
 const nameLength = zip.readUInt16LE(26), length = zip.readUInt32LE(18);
 assert.equal(zip.subarray(30+nameLength,30+nameLength+length).toString(),svg);
});
test('multipart reaches Brevo as real attachment; duplicates/unknown files/oversize fail before provider', async t => {
 const calls=[]; t.mock.method(globalThis,'fetch',async (url,init) => { calls.push(JSON.parse(init.body)); return new Response('{}',{status:201}); });
 const data=()=>{const f=new FormData();for(const [k,v] of Object.entries({name:'Test',email:'test@example.test',anlass:'firma'}))f.set(k,v);f.set('logo-original',file(svg));return f;};
 const send=f=>onRequestPost({request:new Request('https://site.test/api/contact',{method:'POST',body:f,headers:{accept:'application/json'}}),env:{BREVO_API_KEY:'fake',CONTACT_TO:'in@example.test',CONTACT_FROM:'out@example.test'}});
 assert.equal((await send(data())).status,200);assert.equal(calls[0].attachment.length,1);
 for(const kind of ['duplicate','unknown','fake','large']) { const f=data();if(kind==='duplicate')f.append('logo-original',file(svg));if(kind==='unknown')f.set('unknown',file(svg));if(kind==='fake')f.set('logo-original',new File(['fake'],'x.png',{type:'image/png'}));if(kind==='large')f.set('logo-original',new File([new Uint8Array(LOGO_BODY_LIMIT)],'x.png',{type:'image/png'}));assert.ok((await send(f)).status>=400); }
 assert.equal(calls.length,1);
});
test('PNG/JPEG/WebP signatures, dimensions and preview type are checked', async () => {
 const {default:sharp}=await import('sharp');
 for(const [format,type] of [['png','image/png'],['jpeg','image/jpeg'],['webp','image/webp']]) {
  const bytes=await sharp({create:{width:16,height:16,channels:3,background:'#ff0000'}}).toFormat(format).toBuffer();
  const image=new File([bytes],`logo.${format}`,{type});
  await validateLogoFile(image);
  if(format!=='png') await assert.rejects(validateLogoFile(image,true));
  else { const corrupt=Buffer.from(bytes);corrupt.writeUInt32BE(2000000,16);await assert.rejects(validateLogoFile(new File([corrupt],'huge.png',{type}))); }
 }
});
