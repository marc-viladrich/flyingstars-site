import {git,failure} from './native-store.mjs';
import {prepareDraftRebase,applyDraftRebase} from './rebase-draft.mjs';
import {configuredRemote} from './git-sync.mjs';
export class NativePublisher {
 constructor(store,builder,{upload=null,liveUrl=null}={}){this.store=store;this.builder=builder;this.uploadRemote=upload;this.liveUrl=liveUrl;this.git=store.git||git;this.branches=store.runtime?.git||{draftBranch:'content/draft',publishedBranch:'main'};this.ref='refs/heads/'+this.branches.publishedBranch;}
 async init(){if(this.uploadRemote)this.uploadRemote=await configuredRemote(this.store.root,this.git,this.uploadRemote);let head;try{head=await this.git(this.store.root,['rev-parse',this.ref]);}catch{head=await this.store.head();await this.git(this.store.root,['update-ref',this.ref,head,'0'.repeat(40)]);}await this.builder.init(head);return this;}
 async review(){const draftHead=await this.store.head(),publishedHead=await this.git(this.store.root,['rev-parse',this.ref]);
  return{draftHead,publishedHead,activePublishedHead:this.builder.current?.head,changed:await this.changes(publishedHead,draftHead),url:this.builder.origin};}
 /** Files changed between two commits, each with when and by whom it last changed (newest commit wins). `from` null = everything. */
 async changes(from,to){if(from===to)return[];const diff=from?await this.git(this.store.root,['diff','--name-status',from,to]):await this.git(this.store.root,['show','--format=','--name-status','--root',to]);
  const log=await this.git(this.store.root,['log','--format=%x01%ct%x09%an','--name-only',from?from+'..'+to:to]);const last=new Map();let current=null;for(const line of log.split('\n')){if(line.startsWith('\x01')){const[at,author]=line.slice(1).split('\t');current={at:Number(at)*1000,author};}else if(line&&current&&!last.has(line))last.set(line,current);}
  return diff?diff.split('\n').map(line=>{const[status,...file]=line.split('\t');const name=file.at(-1);return{status,file:file.join('\t'),...(last.get(name)||{})};}):[];}
 // Manual upload (developer machine, AFE_UPLOAD_REMOTE): a publication stays local until it is uploaded on request.
 // The remote's CI decides whether it goes live; the editor only pushes the published branch, never with force.
 async remoteState(){const remote=this.uploadRemote,branch=this.branches.publishedBranch,tracking='refs/remotes/'+remote+'/'+branch;
  try{await this.git(this.store.root,['fetch','--quiet',remote,'+'+this.ref+':'+tracking],{timeout:30000});}
  catch(error){if(!/couldn't find remote ref|could not find remote ref/i.test(String(error.stderr||error.message)))throw failure('GitHub konnte nicht erreicht werden. Der Stand bleibt lokal veröffentlicht; bitte später erneut hochladen.',503);}
  const remoteHead=await this.git(this.store.root,['rev-parse','--verify','--quiet',tracking]).catch(()=>null)||null,publishedHead=await this.git(this.store.root,['rev-parse',this.ref]);
  const count=async range=>Number(await this.git(this.store.root,['rev-list','--count',range]));
  return{remoteHead,publishedHead,ahead:remoteHead?await count(remoteHead+'..'+publishedHead):await count(publishedHead),behind:remoteHead?await count(publishedHead+'..'+remoteHead):0};}
 async uploadStatus(){if(!this.uploadRemote)return{enabled:false};const state=await this.remoteState();
  return{enabled:true,remote:this.uploadRemote,...state,changed:state.ahead?await this.changes(state.remoteHead,state.publishedHead):[],actionsUrl:await this.actionsUrl(),liveUrl:this.liveUrl};}
 async upload({expectedPublishedHead,requestId}={},{actor}={}){
  if(!this.uploadRemote)throw failure('Hochladen ist nicht eingerichtet (AFE_UPLOAD_REMOTE).',404);
  if(!/^[a-f0-9]{40}$/.test(expectedPublishedHead||'')||!/^[a-f0-9-]{36}$/.test(requestId||''))throw failure('Ungültiges Hochladen.');
  return this.store.exclusive(async()=>{
   const state=await this.remoteState();
   if(state.publishedHead!==expectedPublishedHead)throw failure('Inzwischen wurde neu freigegeben. Bitte erneut prüfen.',409);
   if(state.behind)throw failure(`Auf GitHub liegen ${state.behind===1?'eine Änderung':state.behind+' Änderungen'}, die hier fehlen. Bitte zuerst abgleichen (git pull), dann erneut hochladen.`,409);
   if(state.ahead)try{await this.git(this.store.root,['push',this.uploadRemote,state.publishedHead+':'+this.ref],{timeout:60000});}
   catch{throw failure('GitHub hat das Hochladen abgelehnt. Der Stand bleibt lokal veröffentlicht.',409);}
   return{...actor?{actor}:{},uploadedHead:state.publishedHead,replayed:!state.ahead,actionsUrl:await this.actionsUrl(),liveUrl:this.liveUrl};
  });
 }
 /** GitHub Actions page of the upload remote, if it is a GitHub repository. */
 async actionsUrl(){const url=await this.git(this.store.root,['remote','get-url',this.uploadRemote]).catch(()=>'');const match=/github\.com[:/]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/.exec(url);return match?`https://github.com/${match[1]}/${match[2]}/actions`:null;}
 async publish({expectedHead,expectedPublishedHead,requestId},{actor}={}){
  if(!/^[a-f0-9]{40}$/.test(expectedHead||'')||!/^[a-f0-9]{40}$/.test(expectedPublishedHead||'')||!/^[a-f0-9-]{36}$/.test(requestId||''))throw failure('Ungültige Freigabe.');
  return this.store.exclusive(async()=>{
   const draft=await this.store.head(),published=await this.git(this.store.root,['rev-parse',this.ref]);
   if(draft!==expectedHead)throw failure('Der Entwurf wurde nach deiner Prüfung geändert. Bitte erneut prüfen.',409);
   if(published!==expectedPublishedHead&&published!==expectedHead)throw failure('Der veröffentlichte Stand wurde inzwischen geändert.',409);
   let target=expectedHead;
   if(this.store.remote){
    try{await this.git(this.store.root,['fetch',this.store.remote],{timeout:30000});}
    catch{throw failure('GitHub konnte nicht erreicht werden. Der Entwurf bleibt gespeichert; bitte später erneut freigeben.',503);}
    const main=await this.git(this.store.root,['rev-parse','refs/remotes/'+this.store.remote+'/'+this.branches.publishedBranch]);
    let prepared;try{prepared=await prepareDraftRebase(this.store.root,main,this.git,this.store.remote,this.branches);}
    catch(error){throw failure(error.message,409);}
    target=prepared.head;
    const artifact=await this.builder.prepare(target);
    await applyDraftRebase(this.store.root,prepared,this.git,this.branches);
    // A concurrent main push rejects this ordinary fast-forward; no force-push to main.
    try{await this.git(this.store.root,['push',this.store.remote,target+':'+this.ref],{timeout:30000});}
    catch{throw failure('main konnte nicht gesichert werden. Bitte den entfernten Stand erneut prüfen und freigeben.',409);}
    await this.git(this.store.root,['update-ref',this.ref,target,published]);
    this.store.sync.enqueue();await this.builder.activate(artifact);
    return{...actor?{actor}:{},publishedHead:target,url:this.builder.origin,replayed:published===target};
   }
   const artifact=await this.builder.prepare(target);
   if(await this.store.head()!==target)throw failure('Der Entwurf wurde während des Aufbaus geändert.',409);
   if(published!==target)try{await this.git(this.store.root,['update-ref',this.ref,target,expectedPublishedHead]);}catch{throw failure('Die Freigabe wurde gleichzeitig geändert.',409);}
   await this.builder.activate(artifact);
   return{...actor?{actor}:{},publishedHead:expectedHead,url:this.builder.origin,replayed:published===expectedHead};
  });
 }
}
