import {promises as fs} from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import {activateWebroot} from './public-webroot.mjs';
import {git} from './native-store.mjs';
const run=promisify(execFile);

/** Build an immutable commit. Publication and preview have separate artifacts. */
export class NativeBuilder {
 constructor(store,root,{editor=true,origin='http://127.0.0.1:4542',runtimeName='runtime',webroot=editor?null:store.runtime?.publicWebroot,site=store.site,env=store.runtime?.buildEnv||{}}={}) {
  this.git=store.git||git;this.required=site?.requiredOutput||['index.html'];this.env=env;this.store=store;this.root=path.resolve(root);this.runtime=path.join(this.root,runtimeName);
  this.webroot=webroot;this.editor=editor;this.origin=origin;this.queue=Promise.resolve();this.current=null;
 }
 async ready(head) {
  const output=path.join(this.runtime,head),site=path.join(output,'site');
  const manifest=JSON.parse(await fs.readFile(path.join(output,'ready.json'),'utf8'));
  if(manifest.head!==head||manifest.editor!==this.editor||manifest.origin!==this.origin)throw Error('Unvollständiger Aufbau.');
  for(const file of this.required)await fs.access(path.join(site,file));
  return {head,site};
 }
 async init(head) {
  try{const active=JSON.parse(await fs.readFile(path.join(this.runtime,'active.json'),'utf8'));if(!/^[a-f0-9]{40}$/.test(active.head))throw Error();this.current=await this.ready(active.head);}catch{}
  try{await this.build(head||await this.store.head());}catch(error){if(!this.current)throw error;console.error(error.message);}
  return this;
 }
 enqueue(work){const result=this.queue.then(work);this.queue=result.catch(()=>{});return result;}
 async activateNow(artifact) {
  const verified=await this.ready(artifact.head);
  if(this.webroot)await activateWebroot(verified,this.webroot);
  const temporary=path.join(this.runtime,'active-next-'+randomUUID()+'.json');
  try{await fs.writeFile(temporary,JSON.stringify({head:verified.head}));await fs.rename(temporary,path.join(this.runtime,'active.json'));}finally{await fs.rm(temporary,{force:true});}
  this.current=verified;return verified;
 }
 async prepareNow(head) {
   if(!/^[a-f0-9]{40}$/.test(head))throw Error('Ungültiger Build-Stand.');
   await fs.mkdir(this.runtime,{recursive:true});
   try{return await this.ready(head);}catch{}
   const output=path.join(this.runtime,head),source=path.join(output,'source'),site=path.join(output,'site');
   await fs.rm(source,{recursive:true,force:true});await fs.rm(site,{recursive:true,force:true});
   await fs.mkdir(source,{recursive:true});const tar=path.join(output,'source.tar');
   await this.git(this.store.root,['archive','--format=tar','--output='+tar,head]);
   await run('tar',['-xf',tar,'-C',source]);await fs.rm(tar);
   await fs.symlink(await fs.realpath(path.join(this.store.root,'node_modules')),path.join(source,'node_modules'));
   const pkg=JSON.parse(await fs.readFile(path.join(source,'node_modules/astro/package.json')));
   const cli=path.join(source,'node_modules/astro',typeof pkg.bin==='string'?pkg.bin:pkg.bin.astro);

   try{
    const result=await run(process.execPath,[cli,'build','--outDir',site],{cwd:source,env:{...this.env,ASTRO_TELEMETRY_DISABLED:'1',...(this.editor?{FLYINGSTARS_EDITOR:'1'}:{}),SITE_URL:this.origin},timeout:180000,maxBuffer:5_000_000});
    await fs.writeFile(path.join(output,'build.log'),result.stdout+result.stderr);
   }catch(error){await fs.writeFile(path.join(output,'build.log'),(error.stdout||'')+(error.stderr||''));throw Error('Inhalt gespeichert, Astro-Aufbau fehlgeschlagen. Der vorherige Seitenstand bleibt aktiv.');}
   for(const file of this.required)await fs.access(path.join(site,file));
   await fs.writeFile(path.join(output,'ready.json'),JSON.stringify({head,editor:this.editor,origin:this.origin}));
   return {head,site};
 }
 prepare(head){return this.enqueue(()=>this.prepareNow(head));}
 activate(artifact){return this.enqueue(()=>this.activateNow(artifact));}
 build(head){return this.enqueue(async()=>this.activateNow(await this.prepareNow(head)));}
}
