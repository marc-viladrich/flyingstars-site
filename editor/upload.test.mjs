import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {git} from './native-store.mjs';
import {NativePublisher} from './native-publisher.mjs';
import {resolveRuntimeOptions} from './runtime-options.mjs';

const commit=async(dir,file,text)=>{await fs.writeFile(path.join(dir,file),text);await git(dir,['add',file]);await git(dir,['-c','commit.gpgsign=false','commit','-qm',file]);return git(dir,['rev-parse','HEAD']);};
// A working clone with a GitHub-like bare remote; publication = local main, as on Marc's machine.
async function fixture(t){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'afe-upload-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const remote=path.join(dir,'remote.git'),work=path.join(dir,'work'),other=path.join(dir,'other');
 await git(dir,['init','-q','--bare','-b','main',remote]);await git(dir,['clone','-q',remote,work]);
 await git(work,['checkout','-q','-b','main']);await commit(work,'a.txt','a');await git(work,['push','-q','origin','main']);
 await git(work,['remote','add','github',remote]);
 const store={root:work,git,exclusive:run=>run()};
 const publisher=new NativePublisher(store,{origin:'http://127.0.0.1:4543'},{upload:'github',liveUrl:'https://example.pages.dev'});
 return {dir,remote,work,other,publisher,head:()=>git(work,['rev-parse','main']),remoteHead:()=>git(remote,['rev-parse','main'])};
}

test('upload pushes the locally published branch once and reports what GitHub still lacks',async t=>{
 const f=await fixture(t);
 let status=await f.publisher.uploadStatus();
 assert.equal(status.enabled,true);assert.equal(status.ahead,0);assert.equal(status.behind,0);assert.deepEqual(status.changed,[]);
 const published=await commit(f.work,'b.txt','b');
 status=await f.publisher.uploadStatus();
 assert.equal(status.ahead,1);assert.equal(status.publishedHead,published);assert.deepEqual(status.changed.map(c=>[c.status,c.file]),[['A','b.txt']]);
 assert.equal(status.liveUrl,'https://example.pages.dev');
 const uploaded=await f.publisher.upload({expectedPublishedHead:published,requestId:randomUUID()});
 assert.equal(uploaded.uploadedHead,published);assert.equal(uploaded.replayed,false);assert.equal(await f.remoteHead(),published);
 const again=await f.publisher.upload({expectedPublishedHead:published,requestId:randomUUID()});
 assert.equal(again.replayed,true);
});

test('upload refuses when GitHub has commits this machine lacks, and when the publication moved',async t=>{
 const f=await fixture(t);
 await git(f.dir,['clone','-q',f.remote,f.other]);const foreign=await commit(f.other,'c.txt','c');await git(f.other,['push','-q','origin','main']);
 const published=await commit(f.work,'b.txt','b');
 await assert.rejects(f.publisher.upload({expectedPublishedHead:published,requestId:randomUUID()}),e=>e.status===409&&/eine Änderung, die hier fehlen/.test(e.message));
 assert.equal(await f.remoteHead(),foreign,'nothing pushed, nothing overwritten');
 await git(f.work,['pull','-q','--no-rebase','--no-edit','github','main']);
 await assert.rejects(f.publisher.upload({expectedPublishedHead:published,requestId:randomUUID()}),e=>e.status===409&&/neu freigegeben/.test(e.message));
 const merged=await f.head();
 await f.publisher.upload({expectedPublishedHead:merged,requestId:randomUUID()});
 assert.equal(await f.remoteHead(),merged);
});

test('without AFE_UPLOAD_REMOTE there is no upload; automatic and manual remotes exclude each other',async t=>{
 const f=await fixture(t);
 const plain=new NativePublisher(f.publisher.store,{});
 assert.deepEqual(await plain.uploadStatus(),{enabled:false});
 await assert.rejects(plain.upload({expectedPublishedHead:await f.head(),requestId:randomUUID()}),e=>e.status===404);
 await assert.rejects(f.publisher.upload({expectedPublishedHead:'x',requestId:randomUUID()}),e=>e.status===400);
 assert.throws(()=>resolveRuntimeOptions({env:{AFE_GIT_REMOTE:'origin',AFE_UPLOAD_REMOTE:'github'}}),/schließen sich aus/);
 const options=resolveRuntimeOptions({env:{AFE_UPLOAD_REMOTE:'github',AFE_LIVE_URL:'https://example.pages.dev'}});
 assert.equal(options.git.upload,'github');assert.equal(options.git.remote,null);assert.equal(options.liveUrl,'https://example.pages.dev');
 assert.throws(()=>resolveRuntimeOptions({env:{AFE_LIVE_URL:'https://example.pages.dev/path'}}),/AFE_LIVE_URL/);
});

test('the GitHub Actions link is derived from SSH and HTTPS remote URLs only',async t=>{
 const f=await fixture(t);
 for(const[url,expected]of[['git@github.com:marc-viladrich/flyingstars-site.git','https://github.com/marc-viladrich/flyingstars-site/actions'],['https://github.com/o/r','https://github.com/o/r/actions'],[f.remote,null]]){
  await git(f.work,['remote','set-url','github',url]);assert.equal(await f.publisher.actionsUrl(),expected);
 }
});
