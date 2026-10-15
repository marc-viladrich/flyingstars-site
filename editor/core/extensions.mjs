import {AsyncLocalStorage} from 'node:async_hooks';

/** Server extension contract. Hooks are trusted site code, never request module paths.
 * @typedef {string|number} PathPart
 * @typedef {{id:string, data:object, revision?:string, schema?:object}} RecordEntry
 * @typedef {{id:string, prefix:string, schema:object, file:string}} Source
 * @typedef {{decode:(source:string)=>unknown, encode:(value:unknown)=>string, plainText:(source:string)=>string}} TextCodec
 * @typedef {object} ServerHooks
 * @property {(source:Source,data:object)=>void} [validateRecord] Authoritative identity policy, after schema parsing.
 * @property {(source:Source,before:object,after:object)=>void} [validateWrite] Ownership policy, before staging.
 * @property {(records:RecordEntry[])=>void} [validateRecords] Cross-record invariants.
 * @property {(context:object)=>{id:string,data:object}[]} [prepareTransaction] Propose replacements for records already in the transaction.
 * @property {(context:object)=>void} [validateTransaction] Validate the full candidate, without file writes.
 * @property {(context:{store:object,source:Source,creation:object})=>Promise<void>} [validateCreation] Reserved routes, before staging.
 * @property {(write:{file:string,bytes:Buffer})=>void} [validateBinaryWrite] Upload storage allowlist.
 * @property {(source:Source,data:object,path:PathPart[])=>boolean} [omitField] Owned fields cannot be patched.
 * @property {(source:Source,data:object)=>PathPart[][]} [readOnlyPaths]
 * @property {(id:string)=>boolean} [preventDelete]
 * @property {(source:Source,data:object)=>string|null} [title]
 * @property {(record:RecordEntry,site?:object)=>string|null} [route]
 * @property {(records:RecordEntry[],value:unknown,reference:object)=>RecordEntry|null} [resolveReference]
 * @property {(records:RecordEntry[],target:RecordEntry)=>string[]} [references]
 * @property {(store:object,records:RecordEntry[],pool:unknown[])=>{sections:object[],collections:object[]}} [templates]
 * @property {(prefix:string,template:object,name:string,options?:object)=>object} [createRecord] Creation preset; never writes files.
 * @property {(section:object,existing:object[])=>object} [uniqueSection]
 * @property {(input:{id:string,path:PathPart[],value:unknown,data:object})=>object[]|undefined} [normalize] Additional field proposals, never writes files.
 * @property {(name:string)=>{list:Function,create?:Function,reorder?:Function}|undefined} [query]
 * @property {(name:string)=>TextCodec|undefined} [codec]
 * @property {()=>object} [translationStorage] Overlay transport and review storage.
 * @property {(id:string)=>string|null} [recordGroup]
 * @property {()=>{source:string,locales:Record<string,string>}} [languages]
 * @property {(records:RecordEntry[],locale?:string)=>object[]} [navigation]
 * @property {()=>{maxBytes:number,mime:RegExp,normalize:Function,write:Function,find:Function,response:Function}} [mediaPolicy]
 * @property {(records:RecordEntry[])=>object} [mediaLibrary]
 * @property {(input:{editor:boolean,origin:string,imageCache:string})=>Record<string,string>} [buildEnvironment]
 * @typedef {object} Extension
 * @property {string} name Namespaced, unique identity.
 * @property {'1.0'} contractVersion Exact supported contract version, checked before any hook runs.
 * @property {ServerHooks} [hooks]
 */
/** @typedef {object} ExtensionRegistry
 * @property {readonly Extension[]} definitions
 * @property {<K extends keyof ServerHooks>(name:K, ...args:Parameters<NonNullable<ServerHooks[K]>>)=>ReturnType<NonNullable<ServerHooks[K]>>|undefined} first
 * @property {<K extends keyof ServerHooks>(name:K, ...args:Parameters<NonNullable<ServerHooks[K]>>)=>ReturnType<NonNullable<ServerHooks[K]>>} require
 * @property {<K extends keyof ServerHooks>(name:K, ...args:Parameters<NonNullable<ServerHooks[K]>>)=>void} run
 * @property {<K extends keyof ServerHooks>(name:K, ...args:Parameters<NonNullable<ServerHooks[K]>>)=>Promise<void>} runAsync
 * @property {<K extends keyof ServerHooks>(name:K, ...args:Parameters<NonNullable<ServerHooks[K]>>)=>boolean} some
 * @property {<K extends keyof ServerHooks>(name:K, ...args:Parameters<NonNullable<ServerHooks[K]>>)=>(ReturnType<NonNullable<ServerHooks[K]>> extends (infer T)[] ? T : never)[]} collect
 */
export const EXTENSION_CONTRACT_VERSION='1.0';
const hookNames=new Set(['prepareTransaction','validateRecord','validateWrite','validateRecords','validateTransaction','validateCreation','validateBinaryWrite','omitField','readOnlyPaths','preventDelete','title','route','resolveReference','references','templates','createRecord','uniqueSection','normalize','query','codec','translationStorage','recordGroup','languages','navigation','mediaPolicy','mediaLibrary','buildEnvironment']);

/** One immutable registry per composition. Names define deterministic, code-point hook order.
 * Resolvers use the first non-null result. Validators run every hook once and stop on error.
 * No hook can register another hook or recursively dispatch through this registry.
 * @param {readonly Extension[]} [definitions]
 * @returns {ExtensionRegistry}
 */
export function createExtensionRegistry(definitions=[]) {
 const names=new Set();
 const ordered=definitions.map(extension=>{
  if(!extension||typeof extension.name!=='string'||!/^[-a-z0-9]+\/[a-z0-9]+(?:[-/][a-z0-9]+)*$/.test(extension.name))throw Error('Extension name must be namespaced.');
  if(names.has(extension.name))throw Error('Duplicate extension: '+extension.name);
  if(extension.contractVersion!==EXTENSION_CONTRACT_VERSION)throw Error('Extension contract version mismatch: '+extension.name);
  names.add(extension.name);
  for(const[name,hook]of Object.entries(extension.hooks||{}))if(!hookNames.has(name)||typeof hook!=='function')throw Error('Invalid extension hook: '+name);
  return Object.freeze({...extension,hooks:Object.freeze({...extension.hooks})});
 }).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
 const dispatch=new AsyncLocalStorage();
 const hooks=name=>{if(!hookNames.has(name))throw Error('Unknown extension hook: '+name);return ordered.flatMap(e=>e.hooks[name]?[e.hooks[name]]:[]);};
 const enter=work=>{if(dispatch.getStore())throw Error('Recursive extension dispatch is not allowed.');return dispatch.run(true,work);};
 const invoke=(name,args,mode)=>{const list=hooks(name);return enter(()=>{const out=[];for(const hook of list){const value=hook(...args);if(value?.then){Promise.resolve(value).catch(()=>{});throw Error('Async hook requires runAsync: '+name);}if(mode==='first'&&value!=null)return value;if(mode==='some'&&value)return true;if(mode==='collect'&&value!=null)out.push(...value);}return mode==='collect'?out:mode==='some'?false:undefined;});};
 return Object.freeze({
  definitions:Object.freeze(ordered),
  first:(name,...args)=>invoke(name,args,'first'),
  some:(name,...args)=>invoke(name,args,'some'),
  collect:(name,...args)=>invoke(name,args,'collect'),
  run:(name,...args)=>invoke(name,args,'run'),
  require(name,...args){if(!hooks(name).length)throw Error('Required extension hook is missing: '+name);return invoke(name,args,'first');},
  async runAsync(name,...args){const list=hooks(name);return enter(async()=>{for(const hook of list)await hook(...args);});},
 });
}
