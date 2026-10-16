import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {resolveImageSource,imageWidths} from '../src/lib/media-source.mjs';
import {uploadNativeMedia} from './native-media.mjs';
import {i18nFixture} from './i18n-test-fixture.mjs';
import {git} from './native-store.mjs';
import {NativeBuilder} from './native-builder.mjs';

const hosts=new Set(['flyingstars.art']);
test('Media resolution accepts approved remote sources and caps responsive widths',async()=>{
 const src='https://flyingstars.art/wp-content/uploads/photo.jpg';
 assert.deepEqual(await resolveImageSource(src,{hosts,uploads:{},remoteSize:async()=>({width:700,height:400})}),{src,width:700,height:400});
 assert.deepEqual(imageWidths(700),[320,480,700]);
 assert.deepEqual(imageWidths(120),[120]);
 assert.deepEqual(imageWidths(2000,960),[320,480,768,960]);
 for(const src of ['http://flyingstars.art/a.jpg','https://other.invalid/a.jpg','https://user@flyingstars.art/a.jpg'])await assert.rejects(resolveImageSource(src,{hosts}),/Nicht freigegebene/);
});
test('Media resolution imports uploads and rejects missing or traversing paths',async()=>{
 const image={src:'/_astro/upload.png',width:901,height:600,format:'png'};
 assert.deepEqual(await resolveImageSource('/assets/hash.png',{uploads:{'../../public/assets/hash.png':async()=>image}}),{src:image,width:901,height:600});
 await assert.rejects(resolveImageSource('/assets/missing.png',{uploads:{}}),/Fehlender Bild-Upload/);
 await assert.rejects(resolveImageSource('/assets/../secret.png',{uploads:{}}),/Ungültiger Medienpfad/);
});
test('Actual editor upload → media record → Astro local import → responsive build; next commit reuses host cache',{timeout:120_000},async t=>{
 // CI sets FLYINGSTARS_OFFLINE_MEDIA=1, which the fixture's build environment would carry into the noop image service.
 const offline=process.env.FLYINGSTARS_OFFLINE_MEDIA;delete process.env.FLYINGSTARS_OFFLINE_MEDIA;t.after(()=>{if(offline!==undefined)process.env.FLYINGSTARS_OFFLINE_MEDIA=offline;});
 const {root,source,store}=await i18nFixture(t,{forCI:true});t.after(()=>store.sync.close());
 // Keep this integration test network-free but run the real Sharp service on the uploaded bytes.
 const config=path.join(source,'astro.config.mjs');
 await fs.writeFile(config,(await fs.readFile(config,'utf8')).replace("image: {service:{entrypoint:'astro/assets/services/noop'},",'image: {'));
 await fs.rm(path.join(source,'src/pages'),{recursive:true});await fs.mkdir(path.join(source,'src/pages'));
 const bytes=await sharp({create:{width:901,height:600,channels:3,background:{r:80,g:100,b:120}}}).png().toBuffer();
 const uploaded=await uploadNativeMedia(store,{bytes,name:'Upload-Test',requestId:randomUUID(),expectedHead:await store.head()});
 const media=uploaded.state.records.find(r=>r.id===uploaded.assetId);
 assert.match(media.data.src,/^\/assets\/[a-f0-9]{64}\.png$/);
 await fs.writeFile(path.join(source,'src/pages/index.astro'),`---\nimport Picture from '../components/Picture.astro';\n---\n<html><body><Picture assetId="${uploaded.assetId}" altOverride="Upload-Test" sizes="(max-width: 640px) 100vw, 50vw" /></body></html>`);
 const commit=async()=>{await git(source,['add','.']);await git(source,['-c','commit.gpgsign=false','commit','-qm','Upload integration fixture']);return store.head();};
 const builder=new NativeBuilder(store,root,{editor:false,origin:'https://example.invalid'});
 // This fixture deliberately contains just one route.
 builder.required=['index.html'];
 const first=await builder.prepare(await commit());
 const html=await fs.readFile(path.join(first.site,'index.html'),'utf8');
 const tag=html.match(/<img\b[^>]*>/)[0];
 assert.match(tag,/srcset="[^"]+320w[^\"]+901w"/);assert.match(tag,/sizes="\(max-width: 640px\) 100vw, 50vw"/);
 assert.doesNotMatch(tag,/src="\/assets\//);
 for(const [,url,width]of tag.matchAll(/(\/_astro\/[^\s",]+) (\d+)w/g)){
  const info=await sharp(path.join(first.site,url)).metadata();assert.equal(info.width,Number(width));assert.ok(info.width<=901);
 }
 await fs.appendFile(path.join(source,'src/pages/index.astro'),'\n<!-- next commit -->');
 const second=await builder.prepare(await commit());
 const log=await fs.readFile(path.join(path.dirname(second.site),'build.log'),'utf8');
 assert.match(log,/reused cache/);
 assert.ok(!builder.imageCache.startsWith(path.dirname(first.site)));
 assert.ok((await fs.readdir(builder.imageCache)).length>0);
});
