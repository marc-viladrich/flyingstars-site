import {promises as fs} from 'node:fs';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {codecs, atPath, safePath, sourceError} from './codecs.mjs';

export const hashBytes = bytes => bytes === null ? null : createHash('sha256').update(bytes).digest('hex');
export const conflict = file => Object.assign(new Error('Diese Datei wurde inzwischen geändert: '+file+'. Deine Eingaben bleiben erhalten.'),{status:409,code:'SOURCE_CONFLICT',file});
export async function fileBytes(file){try{return await fs.readFile(file);}catch(error){if(error.code==='ENOENT')return null;throw error;}}
const keyOf = address => {if(!address||typeof address.collection!=='string'||!address.collection||typeof address.id!=='string'||!address.id)throw sourceError('Ungültige Datensatzadresse.');return JSON.stringify([address.collection,address.id]);};
const same = (a,b) => hashBytes(a)===hashBytes(b);

/** Filesystem storage: cooperating processes lock before checking whole-file hashes.
 * Multi-file crash atomicity belongs to a revision backend (the legacy Git adapter).
 */
export class FileStorage {
  constructor(root){this.root=path.resolve(root);}
  async resolve(file){
    if(typeof file!=='string'||!file||path.isAbsolute(file)||file.split(/[\\/]/).some(p=>p==='..'||p==='.git'))throw sourceError('Unzulässiger Quellpfad.');
    const target=path.resolve(this.root,file);
    let segment=this.root;
    for(const part of path.relative(this.root,target).split(path.sep)){segment=path.join(segment,part);try{if((await fs.lstat(segment)).isSymbolicLink())throw sourceError('Quellpfade mit Symlinks sind nicht schreibbar.');}catch(error){if(error.code==='ENOENT')break;throw error;}}
    if(!target.startsWith(this.root+path.sep))throw sourceError('Quellpfad außerhalb des Projekts.');
    // A registered relative path must not escape through an existing symlink.
    const root=await fs.realpath(this.root);let current=target;
    while(true){try{const real=await fs.realpath(current);if(real!==root&&!real.startsWith(root+path.sep))throw sourceError('Quellpfad verlässt das Projekt über einen Symlink.');break;}catch(error){if(error.code!=='ENOENT')throw error;current=path.dirname(current);}}
    return target;
  }
  async read(file){return fileBytes(await this.resolve(file));}
  async install(entry){if(entry.bytes===null)await fs.rm(entry.target,{force:true});else await fs.rename(entry.temporary,entry.target);}
  async exclusive(work){
    const lock=path.join(this.root,'.afe-source.lock');let handle;
    try{handle=await fs.open(lock,'wx',0o600);}catch(error){if(error.code==='EEXIST')throw Object.assign(new Error('Eine andere Quelltransaktion speichert gerade. Bitte erneut versuchen.'),{status:409});throw error;}
    try{return await work();}finally{await handle.close();await fs.rm(lock,{force:true});}
  }
  async commit(files,{check,afterWrite=async()=>{}}){
    return this.exclusive(async()=>{
    const prepared=[],written=[];
    try{
      await check();
      for(const entry of files){
        const target=await this.resolve(entry.file),temporary=target+'.afe-'+randomUUID();
        prepared.push({...entry,target,temporary});
        if(entry.bytes!==null){await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(temporary,entry.bytes,{flag:'wx',mode:await fs.stat(target).then(s=>s.mode,()=>0o644)});}
      }
      await check();
      for(const entry of prepared){await this.install(entry);written.push(entry);}
      await afterWrite();
    }catch(error){
      // Roll back completed renames on ordinary I/O failure, under the same lock.
      for(const entry of written.reverse()){if(entry.before===null)await fs.rm(entry.target,{force:true});else{await fs.writeFile(entry.temporary,entry.before);await fs.rename(entry.temporary,entry.target);}}
      throw error;
    }finally{for(const entry of prepared)await fs.rm(entry.temporary,{force:true});}
    return {};
    });
  }
}

/** Generic, explicit source registrations. No collection-name or filename semantics. */
export class SourceRegistry {
  constructor({root, sources=[], storage=new FileStorage(root)}={}){this.storage=storage;this.sources=new Map();for(const source of sources)this.register(source.key??source.address,source);}
  register(address,source){
    const key=keyOf(address),codec=source.codec??source.format,locator=source.locator??{kind:'document'};
    if(!codecs[codec])throw sourceError('Unbekannter Quellcodec: '+codec);
    if(!['document','object-entry','array-entry'].includes(locator.kind))throw sourceError('Unbekannter Quelllocator.');
    if(codec==='markdown'&&locator.kind!=='document')throw sourceError('Markdown ist nur als vollständiges Dokument schreibbar.');
    if(locator.kind==='object-entry'&&(typeof locator.key!=='string'||!safePath([locator.key])))throw sourceError('Ungültiger Map-Schlüssel.');
    if(locator.kind==='array-entry'&&(!safePath(locator.idField)||!locator.idField.length||!['string','number'].includes(typeof locator.idValue)))throw sourceError('Arrays benötigen einen stabilen ID-Selector.');
    const descriptor={key:structuredClone(address),file:source.file??locator.file,codec,locator:structuredClone(locator),writable:source.writable!==false};
    if(typeof descriptor.file!=='string'||!descriptor.file)throw sourceError('Ein Quellpfad ist erforderlich.');
    const previous=this.sources.get(key);
    if(previous&&JSON.stringify(previous)!==JSON.stringify(descriptor))throw sourceError('Datensatzadresse ist bereits anders registriert.');
    for(const [otherKey,other]of this.sources){if(otherKey===key||other.file!==descriptor.file)continue;if(other.codec!==codec||other.locator.kind==='document'||locator.kind==='document'||JSON.stringify(other.locator)===JSON.stringify(locator))throw sourceError('Mehrdeutige Quellregistrierung.');}
    this.sources.set(key,descriptor);return descriptor;
  }
  source(address){const source=this.sources.get(keyOf(address));if(!source)throw sourceError('Datensatz ist nicht registriert.');return source;}
  async readBytes(file,revision){return revision!==undefined&&this.storage.readRevision?this.storage.readRevision(file,revision):this.storage.read(file);}
  async snapshot(){const capture=async()=>{const files={};for(const file of new Set([...this.sources.values()].map(source=>source.file)))files[file]=hashBytes(await this.storage.read(file));return {files};};return this.storage.exclusive?this.storage.exclusive(capture):capture();}
  async read(address,{revision}={}){
    const source=this.source(address),bytes=await this.readBytes(source.file,revision);
    if(bytes===null)throw sourceError('Quelldatei fehlt: '+source.file);
    const data=codecs[source.codec].parse(bytes),selected=select(data,source.locator);
    return {source,raw:structuredClone(atPath(data,selected)),revision:{files:{[source.file]:hashBytes(bytes)}},fileHash:hashBytes(bytes),bytes};
  }
  begin(baseRevision){if(!baseRevision||typeof baseRevision!=='object'&&!this.storage.readRevision)throw sourceError('Eine Baseline-Revision ist erforderlich.');return new SourceTransaction(this,structuredClone(baseRevision));}
}

function select(data,locator,{missing=false}={}){
  if(locator.kind==='document')return [];
  if(locator.kind==='object-entry'){
    if(!data||Array.isArray(data)||typeof data!=='object')throw sourceError('Der Locator benötigt ein Quellobjekt.');
    if(!Object.hasOwn(data,locator.key)&&!missing)throw sourceError('Der Quelleintrag fehlt: '+locator.key);
    return [locator.key];
  }
  if(!Array.isArray(data))throw sourceError('Der Locator benötigt ein Quellarray.');
  const matches=data.flatMap((item,index)=>Object.is(atPath(item,locator.idField),locator.idValue)?[index]:[]);
  if(matches.length>1)throw sourceError('Der ID-Selector ist nicht eindeutig.');
  if(!matches.length&&!missing)throw sourceError('Der Array-Eintrag fehlt.');
  return [matches[0]??data.length];
}

export class SourceTransaction {
  constructor(registry,baseRevision){this.registry=registry;this.baseRevision=baseRevision;this.files=new Map();this.closed=false;}
  async stage(operation){
    try{return await this.apply(operation);}catch(error){this.closed=true;throw error;}
  }
  async apply(operation){
    if(this.closed)throw sourceError('Die Transaktion ist bereits abgeschlossen.');
    const address=operation.owner??operation.address?.owner??operation.address,source=this.registry.source(address);
    if(!source.writable)throw sourceError('Diese Quelle ist schreibgeschützt.');
    let file=this.files.get(source.file);
    if(!file){
      const before=await this.registry.readBytes(source.file,typeof this.baseRevision==='string'?this.baseRevision:undefined);
      if(typeof this.baseRevision!=='string'&&(!Object.hasOwn(this.baseRevision.files??{},source.file)||this.baseRevision.files[source.file]!==hashBytes(before)))throw conflict(source.file);
      file={file:source.file,before,bytes:before};this.files.set(source.file,file);
    }
    const codec=codecs[source.codec],kind=operation.kind,path=operation.path??operation.address?.path??[];
    if(!safePath(path))throw sourceError('Ungültiger Feldpfad.');
    const fieldPath=operation.address?.part==='body'?['body',...path]:path;
    if(kind==='create'&&file.bytes===null){
      const value=source.locator.kind==='document'?operation.value:source.locator.kind==='object-entry'?{[source.locator.key]:operation.value}:[operation.value];
      file.bytes=Buffer.from(codec.create(value));
    }else{
      if(file.bytes===null)throw sourceError('Quelldatei fehlt.');
      const data=codec.parse(file.bytes),entry=select(data,source.locator,{missing:kind==='create'}),full=kind==='reorder'&&operation.scope==='source'?fieldPath:[...entry,...fieldPath];
      if(kind==='create'){
        if(source.locator.kind==='document'||atPath(data,entry)!==undefined)throw sourceError('Der Quelleintrag existiert bereits.');
        file.bytes=codec.update(file.bytes,entry,operation.value);
      }else if(kind==='delete')file.bytes=source.locator.kind==='document'||source.codec==='yaml'&&(Array.isArray(data)?data.length:Object.keys(data).length)===1?null:codec.update(file.bytes,entry,undefined);
      else if(kind==='set'||kind==='unset')file.bytes=codec.update(file.bytes,full,kind==='unset'?undefined:operation.value);
      else if(kind==='move'||kind==='reorder')file.bytes=codec.move(file.bytes,full,operation.from,operation.to);
      else if(kind==='insert'||kind==='remove'){
        const list=atPath(data,full);if(!Array.isArray(list)||!Number.isInteger(operation.index)||operation.index<0||operation.index>(kind==='insert'?list.length:list.length-1))throw sourceError('Ungültiger Listeneingriff.');
        if(kind==='insert')list.splice(operation.index,0,operation.value);else list.splice(operation.index,1);
        file.bytes=codec.update(file.bytes,full,list);
      }else throw sourceError('Unbekannte Quelloperation.');
    }
    // Stable selectors must survive updates and agree with newly created entries.
    if(file.bytes!==null&&kind!=='delete')select(codec.parse(file.bytes),source.locator);
    return this;
  }
  updates(){return [...this.files.values()].filter(file=>!same(file.before,file.bytes)).map(file=>({...file}));}
  async commit(context={}){
    if(this.closed)throw sourceError('Die Transaktion ist bereits abgeschlossen.');
    this.closed=true;
    const files=this.updates(),check=async()=>{for(const entry of this.files.values())if(hashBytes(await this.registry.storage.read(entry.file))!==hashBytes(entry.before))throw conflict(entry.file);};
    const result=await this.registry.storage.commit(files,{...context,check});
    return {...result,revision:{files:Object.fromEntries([...this.files.values()].map(file=>[file.file,hashBytes(file.bytes)]))},changed:files.map(file=>file.file)};
  }
}
