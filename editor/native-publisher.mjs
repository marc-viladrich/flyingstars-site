import {git,failure} from './native-store.mjs';
import {prepareDraftRebase,applyDraftRebase} from './rebase-draft.mjs';
const ref='refs/heads/main';
export class NativePublisher {
 constructor(store,builder){this.store=store;this.builder=builder;}
 async init(){let head;try{head=await git(this.store.root,['rev-parse',ref]);}catch{head=await this.store.head();await git(this.store.root,['update-ref',ref,head,'0'.repeat(40)]);}await this.builder.init(head);return this;}
 async review(){const draftHead=await this.store.head(),publishedHead=await git(this.store.root,['rev-parse',ref]);const diff=await git(this.store.root,['diff','--name-status',publishedHead,draftHead]);// When and by whom each file last changed since the last publication (newest commit wins).
  const log=publishedHead===draftHead?'':await git(this.store.root,['log','--format=%x01%ct%x09%an','--name-only',publishedHead+'..'+draftHead]);const last=new Map();let current=null;for(const line of log.split('\n')){if(line.startsWith('\x01')){const[at,author]=line.slice(1).split('\t');current={at:Number(at)*1000,author};}else if(line&&current&&!last.has(line))last.set(line,current);}
  return{draftHead,publishedHead,activePublishedHead:this.builder.current?.head,changed:diff?diff.split('\n').map(line=>{const[status,...file]=line.split('\t');const name=file.at(-1);return{status,file:file.join('\t'),...(last.get(name)||{})};}):[],url:this.builder.origin};}
 async publish({expectedHead,expectedPublishedHead,requestId},{actor}={}){
  if(!/^[a-f0-9]{40}$/.test(expectedHead||'')||!/^[a-f0-9]{40}$/.test(expectedPublishedHead||'')||!/^[a-f0-9-]{36}$/.test(requestId||''))throw failure('Ungültige Freigabe.');
  return this.store.exclusive(async()=>{
   const draft=await this.store.head(),published=await git(this.store.root,['rev-parse',ref]);
   if(draft!==expectedHead)throw failure('Der Entwurf wurde nach deiner Prüfung geändert. Bitte erneut prüfen.',409);
   if(published!==expectedPublishedHead&&published!==expectedHead)throw failure('Der veröffentlichte Stand wurde inzwischen geändert.',409);
   let target=expectedHead;
   if(this.store.remote){
    try{await git(this.store.root,['fetch',this.store.remote],{timeout:30000});}
    catch{throw failure('GitHub konnte nicht erreicht werden. Der Entwurf bleibt gespeichert; bitte später erneut freigeben.',503);}
    const main=await git(this.store.root,['rev-parse','refs/remotes/'+this.store.remote+'/main']);
    let prepared;try{prepared=await prepareDraftRebase(this.store.root,main,git,this.store.remote);}
    catch(error){throw failure(error.message,409);}
    target=prepared.head;
    const artifact=await this.builder.prepare(target);
    await applyDraftRebase(this.store.root,prepared,git);
    // A concurrent main push rejects this ordinary fast-forward; no force-push to main.
    try{await git(this.store.root,['push',this.store.remote,target+':refs/heads/main'],{timeout:30000});}
    catch{throw failure('main konnte nicht gesichert werden. Bitte den entfernten Stand erneut prüfen und freigeben.',409);}
    await git(this.store.root,['update-ref',ref,target,published]);
    this.store.sync.enqueue();await this.builder.activate(artifact);
    return{...actor?{actor}:{},publishedHead:target,url:this.builder.origin,replayed:published===target};
   }
   const artifact=await this.builder.prepare(target);
   if(await this.store.head()!==target)throw failure('Der Entwurf wurde während des Aufbaus geändert.',409);
   if(published!==target)try{await git(this.store.root,['update-ref',ref,target,expectedPublishedHead]);}catch{throw failure('Die Freigabe wurde gleichzeitig geändert.',409);}
   await this.builder.activate(artifact);
   return{...actor?{actor}:{},publishedHead:expectedHead,url:this.builder.origin,replayed:published===expectedHead};
  });
 }
}
