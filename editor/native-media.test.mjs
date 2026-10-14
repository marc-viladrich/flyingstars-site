import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {NativeStore,git} from './native-store.mjs';
import {uploadNativeMedia} from './native-media.mjs';

test('Real native image metadata and normalized bytes are one retryable commit; invalid bytes leave no record',async t=>{
 const here=path.dirname(fileURLToPath(import.meta.url)),root=await fs.mkdtemp(path.join(os.tmpdir(),'fs-native-media-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await git(here,['clone','--quiet','--no-hardlinks',path.join(here,'..'),root]);await fs.symlink(await fs.realpath(path.join(here,'../node_modules')),path.join(root,'node_modules'));
 const store=await new NativeStore(root,{remote:false}).init(),expectedHead=await store.head(),requestId=randomUUID();
 const bytes=await sharp({create:{width:32,height:18,channels:3,background:'#643bae'}}).png().toBuffer();
 const request={bytes,name:'Proof.png',requestId,expectedHead};const uploaded=await uploadNativeMedia(store,request);const record=uploaded.state.records.find(r=>r.id===uploaded.assetId);
 assert.equal(record.data.width,32);assert.equal(record.data.height,18);assert.equal(record.data.defaultAlt,'');assert.match(record.data.src,/^\/assets\/[a-f0-9]{64}\.png$/);
 const tracked=await fs.readFile(path.join(root,'public',record.data.src));assert.equal((await sharp(tracked).metadata()).width,32);
 assert.equal((await uploadNativeMedia(store,request)).state.replayed,true);assert.equal(await store.head(),uploaded.state.head);
 await assert.rejects(uploadNativeMedia(store,{...request,bytes:Buffer.from('<svg onload="evil()"/>'),requestId:randomUUID()}),/PNG|JPEG|WebP/);
 assert.equal(await store.head(),uploaded.state.head);assert.equal(await git(root,['status','--porcelain','--untracked-files=no']),'');
});
