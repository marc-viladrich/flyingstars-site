import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {git,uploadNativeMedia} from 'astro-frontend-editor/runtime';
import {i18nFixture} from './i18n-test-fixture.mjs';

test('Real native image metadata and normalized bytes are one retryable commit; invalid bytes leave no record',async t=>{
 const {source:root,store}=await i18nFixture(t);
 t.after(()=>store.sync.close());
 const expectedHead=await store.head(),requestId=randomUUID();
 const bytes=await sharp({create:{width:32,height:18,channels:3,background:'#643bae'}}).png().toBuffer();
 const request={bytes,name:'Proof.png',requestId,expectedHead};const uploaded=await uploadNativeMedia(store,request);const record=uploaded.state.records.find(r=>r.id===uploaded.assetId);
 assert.equal(record.data.width,32);assert.equal(record.data.height,18);assert.equal(record.data.defaultAlt,'');assert.match(record.data.src,/^\/assets\/[a-f0-9]{64}\.png$/);
 const tracked=await fs.readFile(path.join(root,'public',record.data.src));assert.equal((await sharp(tracked).metadata()).width,32);
 assert.equal((await uploadNativeMedia(store,request)).state.replayed,true);assert.equal(await store.head(),uploaded.state.head);
 await assert.rejects(uploadNativeMedia(store,{...request,bytes:Buffer.from('<svg onload="evil()"/>'),requestId:randomUUID()}),/PNG|JPEG|WebP/);
 assert.equal(await store.head(),uploaded.state.head);assert.equal(await git(root,['status','--porcelain','--untracked-files=no']),'');
});
