import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {inventoryMedia,fetchLegacyMedia} from './fetch-legacy-media.mjs';
import {checkContentImages} from './check-content-images.mjs';
async function fixture(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'media-delivery-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));return root;}
test('Build gate rejects omitted responsive attributes and unknown/oversized exemptions',async t=>{
 const root=await fixture(t),html=path.join(root,'index.html');
 for(const tag of ['<img src="/a.jpg">','<img src="/a.jpg" data-media-single="anything">','<img src="/a.jpg" data-media-single="logo-footer" width="2000" height="800">']){
  await fs.writeFile(html,tag);await assert.rejects(checkContentImages(root),/srcset\/sizes/);
 }
 await fs.writeFile(html,'<img src="/a.jpg" srcset="/a.jpg 480w" sizes="50vw"><img src="/logo.png" data-media-single="logo-footer" width="160" height="40">');
 assert.deepEqual(await checkContentImages(root),{pages:1,img:2,srcset:1,sizes:1,exempt:1});
});
test('Legacy inventory deduplicates file references; staging verifies persisted bytes and records failures',async t=>{
 const root=await fixture(t),source=path.join(root,'repo'),staging=path.join(root,'staging');
 await fs.mkdir(path.join(source,'src/content'),{recursive:true});
 const url='https://flyingstars.art/wp-content/uploads/photo.png',bad='https://media.example.org/bad.jpg';
 await fs.writeFile(path.join(source,'src/content/a.json'),JSON.stringify({src:url,video:'https://media.example.org/clip.mp4'}));
 await fs.writeFile(path.join(source,'src/view.astro'),`<img src="${url}"><img src="${bad}">`);
 const inventory=await inventoryMedia(source);assert.equal(inventory.length,3);assert.equal(inventory.find(i=>i.url===url).files.length,2);
 await assert.rejects(fetchLegacyMedia({root:source,staging:path.join(source,'staging')}),/außerhalb/);
 await fs.symlink(source,path.join(root,'repo-link'));
 await assert.rejects(fetchLegacyMedia({root:source,staging:path.join(root,'repo-link/staging')}),/außerhalb/);
 const bytes=await sharp({create:{width:50,height:30,channels:3,background:{r:10,g:20,b:30}}}).png().toBuffer();
 const fetcher=async url=>url===bad?new Response('invalid',{headers:{'content-type':'image/jpeg'}}):url.endsWith('.mp4')?new Response('missing',{status:404}):new Response(bytes,{headers:{'content-type':'image/png','content-length':String(bytes.length)}});
 const manifest=await fetchLegacyMedia({root:source,staging,fetcher});
 assert.equal(manifest.complete,true);assert.equal(manifest.expectedEntries,3);
 const image=manifest.entries.find(i=>i.url===url);assert.equal(image.status,'verified');assert.equal(image.width,50);assert.equal(image.height,30);assert.equal(image.bytes,bytes.length);
 assert.equal(image.sha256,createHash('sha256').update(await fs.readFile(path.join(staging,image.file))).digest('hex'));
 assert.equal(manifest.entries.filter(i=>i.status==='failed').length,2);
 assert.deepEqual(JSON.parse(await fs.readFile(path.join(staging,'manifest.json'))),manifest);
 const retry=await fetchLegacyMedia({root:source,staging,fetcher});assert.equal(retry.entries.find(i=>i.url===url).sha256,image.sha256);
 const truncated=await fetchLegacyMedia({root:source,staging,fetcher:async()=>new Response(bytes,{headers:{'content-type':'image/png','content-length':'1'}})});
 assert.ok(truncated.entries.every(i=>i.status==='failed'&&/Content-Length/.test(i.error)));
});
