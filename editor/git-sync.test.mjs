import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {GitSync} from './git-sync.mjs';
import {i18nFixture} from './i18n-test-fixture.mjs';
import {git} from './native-store.mjs';

test('A slow remote push never holds the save lock; later content is pushed in the next round', {timeout:20000}, async t => {
  const {store}=await i18nFixture(t);
  let pushing, finishPush;
  const started=new Promise(resolve=>pushing=resolve),gate=new Promise(resolve=>finishPush=resolve);
  let first=true,pushed=[];
  store.sync=new GitSync(store,async(root,args,options)=>{
    if(args[0]!=='push')return git(root,args,options);
    pushed.push(args.at(-1).split(':')[0]);
    if(first){first=false;pushing();await gate;}
    return '';
  },'origin');
  t.after(()=>{finishPush();store.sync.close();});
  const pendingPush=store.sync.flush();await started;
  const state=await store.state(),record=state.records.find(r=>r.id==='page/index');
  const saved=await store.save({expectedHead:state.head,requestId:randomUUID(),changes:[{id:record.id,expectedRevision:record.revision,patches:[{path:['title'],value:'Speichern während eines langsamen Pushs'}]}]});
  assert.notEqual(saved.head,state.head);
  finishPush();await pendingPush;assert.equal(store.sync.status.pending,true);
  await store.sync.flush();assert.equal(store.sync.status.pending,false);assert.equal(pushed.at(-1),saved.head);
});

test('Push failure keeps a successful save; retry backs up that exact commit to a local bare remote', async t => {
  const {root,source,store}=await i18nFixture(t),remote=path.join(root,'github.git');
  await git(source,['clone','--bare','--quiet',source,remote]);await git(source,['remote','add','origin',remote]);
  let failing=true;
  store.sync=new GitSync(store,(dir,args,options)=>{
    if(args[0]==='push'&&failing)throw Error('Simulierter Verbindungsabbruch');
    return git(dir,args,options);
  },'origin');t.after(()=>store.sync.close());
  const state=await store.state(),record=state.records.find(r=>r.id==='page/index');
  const saved=await store.save({expectedHead:state.head,requestId:randomUUID(),changes:[{id:record.id,expectedRevision:record.revision,patches:[{path:['title'],value:'Auch ohne Remote gespeichert'}]}]});
  await store.sync.flush();assert.equal(store.sync.status.pending,true);assert.match(store.sync.status.lastError,/lokal gespeichert/);
  assert.equal(await store.head(),saved.head);
  failing=false;await store.sync.flush();assert.equal(store.sync.status.lastError,null);assert.equal(store.sync.status.pending,false);
  assert.equal(await git(remote,['rev-parse','content/draft']),saved.head);
});
