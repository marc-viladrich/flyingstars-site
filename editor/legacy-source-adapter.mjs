import path from 'node:path';
import {promises as fs} from 'node:fs';
import {codecs} from './core/codecs.mjs';
import {SourceRegistry, FileStorage, hashBytes, conflict} from './core/source-registry.mjs';

/** Git revision publication remains here while the pilot owns validation/replay. */
class LegacyGitStorage extends FileStorage {
  constructor(root,git,draftBranch){super(root);this.git=git;this.draftBranch=draftBranch;}
  async readRevision(file,revision){
    await this.resolve(file);
    try{return await this.git(this.root,['show',revision+':'+file],{raw:true});}
    catch(error){if(/fatal: path .* (?:does not exist|exists on disk, but not in)/s.test(String(error.stderr)))return null;throw error;}
  }

  async commit(files,{check,parent,requestId,payload,actor,binaryWrites=[]}){
    const all=[...files,...binaryWrites],index=path.join(this.root,'.git','native-index-'+requestId),env={...actor?{GIT_AUTHOR_NAME:actor.name,GIT_AUTHOR_EMAIL:actor.email}:{},GIT_INDEX_FILE:index};
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
        if(++checked===2){try{await this.git(this.root,['update-ref','refs/heads/'+this.draftBranch,candidate,parent]);published=true;}catch(error){if(await this.git(this.root,['rev-parse','refs/heads/'+this.draftBranch])!==parent)throw conflict('Git-Revision');throw error;}}
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
  decode(source,text){const codec=codecs[source.format],raw=codec.parse(text);return {raw,doc:{bytes:text,codec}};}
  encode(source,raw,doc,patches=[]){
    const codec=codecs[source.format];if(!doc)return codec.create(raw);
    let bytes=doc.bytes;
    for(const patch of patches)bytes=codec.update(bytes,patch.path,patch.path.length?patch.value:raw);
    return bytes;
  }
  async commit(updated,context){
    const tx=this.registry.begin(context.parent),binaryWrites=[];
    for(const update of updated){
      const source=[...this.registry.sources.values()].find(source=>source.file===update.file);
      if(!source){binaryWrites.push(update);continue;}
      const kind=update.bytes===null?'delete':update.before===null?'create':'set';
      await tx.stage({kind,address:source.key,path:[],...update.bytes===null?{}:{value:codecs[source.codec].parse(update.bytes)}});
    }
    return tx.commit({...context,binaryWrites});
  }
}
