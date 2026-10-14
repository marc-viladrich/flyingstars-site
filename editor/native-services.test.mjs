import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {NativePublisher} from './native-publisher.mjs';
import {NativeTranslation} from './native-translation.mjs';
import {git} from './native-store.mjs';

test('Publication pins review, retains current main on failed build, and retries exact successful activation',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'fs-publish-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await git(root,['init','--quiet']);await fs.writeFile(path.join(root,'file.txt'),'one');await git(root,['add','.']);await git(root,['commit','-qm','initial']);const initial=await git(root,['rev-parse','HEAD']);await git(root,['checkout','-qb','content/draft']);
 const store={root,head:()=>git(root,['rev-parse','content/draft']),exclusive:work=>work()};
 let broken=false;const builder={origin:'http://127.0.0.1:4543',current:null,init:async head=>{builder.current={head};},prepare:async head=>{if(broken)throw Error('failed');return{head};},activate:async artifact=>{builder.current=artifact;}};
 const publisher=await new NativePublisher(store,builder).init();assert.equal((await publisher.review()).publishedHead,initial);
 await fs.writeFile(path.join(root,'file.txt'),'two');await git(root,['add','.']);await git(root,['commit','-qm','draft']);const draft=await store.head();
 const request={expectedHead:draft,expectedPublishedHead:initial,requestId:randomUUID()};
 broken=true;await assert.rejects(publisher.publish(request),/failed/);assert.equal(await git(root,['rev-parse','main']),initial);assert.equal(builder.current.head,initial);
 await assert.rejects(publisher.publish({...request,expectedHead:initial}),/nach deiner Prüfung/);
 broken=false;const result=await publisher.publish(request);assert.equal(result.publishedHead,draft);assert.equal(await git(root,['rev-parse','main']),draft);assert.equal(builder.current.head,draft);
 assert.equal((await publisher.publish(request)).replayed,true);
});
test('Translation without configured service terminates honestly; provider error and response shape do not produce fake suggestions',async()=>{
 const none=new NativeTranslation({url:''});assert.equal(none.status().available,false);await assert.rejects(none.suggest({text:'Hallo',locale:'en'}),error=>error.status===503);
 assert.throws(()=>new NativeTranslation({url:'http://example.com/translate'}),/HTTPS/);
 const bad=new NativeTranslation({url:'http://127.0.0.1:5000/translate',fetcher:async()=>({ok:true,json:async()=>({})})});await assert.rejects(bad.suggest({text:'Hallo',locale:'en'}),error=>error.status===502);
 const good=new NativeTranslation({url:'http://127.0.0.1:5000/translate',fetcher:async(url,options)=>{assert.equal(JSON.parse(options.body).target,'nl');return{ok:true,json:async()=>({translatedText:'Hallo wereld'})};}});
 assert.deepEqual(await good.suggest({text:'Hallo Welt',locale:'nl'}),{text:'Hallo wereld',locale:'nl',status:'unreviewed'});
 await assert.rejects(good.suggest({text:'Hallo',locale:'fr'}),error=>error.status===400);
});
