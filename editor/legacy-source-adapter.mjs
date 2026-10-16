import path from 'node:path';
import {promises as fs} from 'node:fs';
import {codecs,atPath} from './core/codecs.mjs';
import {SourceRegistry, FileStorage, hashBytes, conflict, select} from './core/source-registry.mjs';
import {gitDirs} from './git-dirs.mjs';

/** Git revision publication remains here while the pilot owns validation/replay. */
class LegacyGitStorage extends FileStorage {
  constructor(root,git,draftBranch){super(root);this.git=git;this.draftBranch=draftBranch;}
  async readRevision(file,revision){
    await this.resolve(file);
    try{return await this.git(this.root,['show',revision+':'+file],{raw:true});}
    catch(error){if(/fatal: path .* (?:does not exist|exists on disk, but not in)/s.test(String(error.stderr)))return null;throw error;}
  }

  async commit(files,{check,parent,requestId,payload,actor,binaryWrites=[],...context}){
    const all=[...files,...binaryWrites],index=path.join((await gitDirs(this.root)).gitDir,'native-index-'+requestId),env={...actor?{GIT_AUTHOR_NAME:actor.name,GIT_AUTHOR_EMAIL:actor.email}:{},GIT_INDEX_FILE:index};
    const blobs=new Map();let candidate,published=false;
    try{
      await this.git(this.root,['read-tree',parent],{extraEnv:env});
      for(const {file,bytes}of all){
        if(bytes===null)await this.git(this.root,['update-index','--force-remove','--',file],{extraEnv:env});
        else{const blob=await this.git(this.root,['hash-object','-w','--stdin'],{input:bytes,extraEnv:env});blobs.set(file,blob);await this.git(this.root,['update-index','--add','--cacheinfo','100644',blob,file],{extraEnv:env});}
      }
      const tree=await this.git(this.root,['write-tree'],{extraEnv:env});
      candidate=await this.git(this.root,['commit-tree',tree,'-p',parent,'-m','Native editor save\n\nNative-Operation: '+requestId+'\nNative-Payload: '+payload+'\n'],{extraEnv:env});
      let checked=0;
      await super.commit(all,{check:async()=>{
        await check();for(const entry of binaryWrites)if(hashBytes(await this.read(entry.file))!==hashBytes(entry.before))throw conflict(entry.file);
        if(++checked===2){if(context.verify)await context.verify(candidate);try{await this.git(this.root,['update-ref','refs/heads/'+this.draftBranch,candidate,parent]);published=true;}catch(error){if(await this.git(this.root,['rev-parse','refs/heads/'+this.draftBranch])!==parent)throw conflict('Git-Revision');throw error;}}
      },afterWrite:async()=>{
        const entries=all.map(({file,bytes})=>(bytes===null?'0 '+'0'.repeat(40):'100644 '+blobs.get(file))+'\t'+file+'\0').join('');
        if(entries)await this.git(this.root,['update-index','-z','--index-info'],{input:Buffer.from(entries)});
      }});
      return {head:candidate};
    }catch(error){if(published)await this.git(this.root,['update-ref','refs/heads/'+this.draftBranch,parent,candidate]);throw error;}
    finally{await fs.rm(index,{force:true});await fs.rm(index+'.lock',{force:true});}
  }
}

export class LegacySourceAdapter {
  constructor({root,site,git,draftBranch}){this.site=site;this.registry=new SourceRegistry({storage:new LegacyGitStorage(root,git,draftBranch)});}
  register(source){this.registry.register(source.address,{file:source.file,codec:source.format,locator:source.locator});return source;}
  sourceFor(id){const source=this.site.sourceFor(id);return source?this.register(source):null;}
  async sourcesAt(head){const files=(await this.registry.storage.git(this.registry.storage.root,['ls-tree','-r','--name-only',head,'--',this.site.contentRoot])).split('\n');return this.site.sourcesFromFiles(files).map(source=>this.register(source));}
  async readFile(head,file){const bytes=await this.registry.readBytes(file,head);if(bytes===null)throw Error('Quelldatei fehlt: '+file);return bytes.toString('utf8');}
  bytes(file){return this.registry.storage.read(file);}
  // A record is its entry inside the source file: the whole document, or one entry of a shared map/array
  // (several records in one YAML/JSON file). Reads select the entry; writes edit inside it.
  decode(source,text){const codec=codecs[source.format],parsed=codec.parse(text),entry=select(parsed,source.locator||{kind:'document'});return {raw:atPath(parsed,entry),doc:{bytes:text,codec}};}
  encode(source,raw,doc,patches=[]){
    const codec=codecs[source.format],locator=source.locator||{kind:'document'};
    if(!doc)return codec.create(locator.kind==='document'?raw:locator.kind==='object-entry'?{[locator.key]:raw}:[raw]);
    let bytes=doc.bytes;
    for(const patch of patches){const entry=select(codec.parse(bytes),locator);bytes=codec.update(bytes,[...entry,...patch.path],patch.path.length?patch.value:raw);}
    return bytes;
  }
  // A new record in a file that holds other records already: its entry is added, the file stays.
  encodeCreate(source,raw,existing){if(existing===null||(source.locator||{kind:'document'}).kind==='document')return this.encode(source,raw);const codec=codecs[source.format],entry=select(codec.parse(existing),source.locator,{missing:true});return codec.update(existing,entry,raw);}
  // Removing a record from a shared file removes its entry; a record that is the whole file removes the file.
  encodeDelete(source,existing){if(!this.shared(source))return null;const codec=codecs[source.format];return codec.update(existing,select(codec.parse(existing),source.locator),undefined);}
  shared(source){return (source.locator||{kind:'document'}).kind!=='document';}
  async commit(updated,context){
    const tx=this.registry.begin(context.parent),binaryWrites=[];
    // Record writes are staged by address; the transaction edits each record's entry and writes every touched
    // file once, so two records of one shared file are one consistent write.
    for(const update of updated){
      if(!update.address){binaryWrites.push(update);continue;}
      const kind=update.kind||(update.bytes===null?'delete':update.before===null?'create':'set');
      await tx.stage({kind,address:update.address,path:[],...kind==='delete'?{}:{value:update.raw}});
    }
    return tx.commit({...context,binaryWrites});
  }
}
