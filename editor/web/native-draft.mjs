import {extensions} from './site-adapter.mjs';
const clone=value=>structuredClone(value);
export const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const getPath=(data,path)=>path.reduce((value,key)=>value?.[key],data);
export function setPath(data,path,value){if(!path.length)return clone(value);let target=data;for(let index=0;index<path.length-1;index++){const key=path[index];if(target[key]===undefined)target[key]=typeof path[index+1]==='number'?[]:{};target=target[key];}if(value===undefined)delete target[path.at(-1)];else target[path.at(-1)]=clone(value);return data;}
const startsWith=(prefix,path)=>prefix.length<=path.length&&prefix.every((part,index)=>part===path[index]);
// Browser draft only: canonical records and schema continue to belong to NativeStore.
// Each changed record remembers which paths were edited, so a save writes exactly those fields; the record
// data the browser holds is schema-parsed (defaults filled in) and must not be written back whole.
export class NativeDraft {
 constructor(){this.base=new Map();this.local=new Map();this.created=new Map();this.deleted=new Set();this.paths=new Map();this.history=[];}
 reset(records){this.base=new Map(records.map(r=>[r.id,clone(r)]));this.local.clear();this.created.clear();this.deleted.clear();this.paths.clear();this.history=[];}
 checkpoint(operation){if(this.grouping){if(this.grouping.done)return;this.grouping.done=true;}this.history.push({operation,local:clone(this.local),created:clone(this.created),deleted:clone(this.deleted),paths:clone(this.paths)});if(this.history.length>100)this.history.shift();}
 // A path covers its descendants: editing a list and then an entry of it stays one list write.
 touch(id,path){const paths=this.paths.get(id)||[];if(paths.some(known=>startsWith(known,path)))return;this.paths.set(id,[...paths.filter(known=>!startsWith(path,known)),clone(path)]);}
 get(id){return this.deleted.has(id)?undefined:this.created.get(id)||this.local.get(id)||this.base.get(id);}
 records(){return [...new Set([...this.base.keys(),...this.created.keys()])].map(id=>this.get(id)).filter(Boolean);}
 set(id,path,value){const before=this.get(id);if(!before||same(getPath(before.data,path),value))return false;this.checkpoint({kind:'set',id,path:clone(path)});const next=clone(before);next.data=setPath(next.data,path,value);if(this.created.has(id))this.created.set(id,next);else if(same(next.data,this.base.get(id).data)){this.local.delete(id);this.paths.delete(id);}else{this.local.set(id,next);this.touch(id,path);}return true;}
 create(item){if(this.get(item.id))throw Error('Dieser Dateiname ist bereits belegt.');this.checkpoint({kind:'create',id:item.id});this.created.set(item.id,clone(item));this.deleted.delete(item.id);}
 remove(id){if(!this.get(id))return;this.checkpoint({kind:'remove',id});if(this.created.has(id))this.created.delete(id);else this.deleted.add(id);this.local.delete(id);}
 // Everything inside fn is one undo step (e.g. a phone number and its tel: link, a record and its reference).
 group(fn){if(this.grouping)return fn();this.grouping={done:false};try{return fn();}finally{this.grouping=null;}}
 undo(){const snapshot=this.history.pop();if(!snapshot)return false;Object.assign(this,snapshot);return true;}
 discard(){this.local.clear();this.created.clear();this.deleted.clear();this.paths.clear();this.history=[];}
 get size(){return this.local.size+this.created.size+this.deleted.size;}
 // One patch per edited path whose value differs from the saved one (a value set back is no change).
 patches(id){const base=this.base.get(id).data,data=this.local.get(id).data;return (this.paths.get(id)||[]).filter(path=>!same(getPath(base,path),getPath(data,path))).map(path=>({path:clone(path),value:clone(getPath(data,path))}));}
 request(expectedHead,requestId){return {expectedHead,requestId,changes:[...this.local].map(([id])=>({id,expectedRevision:this.base.get(id).revision,patches:this.patches(id)})).filter(change=>change.patches.length),creates:[...this.created].map(([id,r])=>({id,data:clone(r.data)})),deletes:[...this.deleted].map(id=>({id,expectedRevision:this.base.get(id).revision}))};}
 accept(records){this.reset(records);}
}
export function sectionMutation(sections,index,action,template){const next=clone(sections);if(action==='insert'){const inserted=uniqueSection(clone(template),next);next.splice(index,0,inserted);return next;}if(index<0||index>=next.length)throw Error('Abschnitt nicht mehr vorhanden.');if(action==='remove')next.splice(index,1);else if(action==='duplicate')next.splice(index+1,0,uniqueSection(clone(next[index]),next));else if(action==='up'&&index>0)[next[index-1],next[index]]=[next[index],next[index-1]];else if(action==='down'&&index<next.length-1)[next[index+1],next[index]]=[next[index],next[index+1]];return next;}


const uniqueSection=(section,existing)=>extensions.first('uniqueSection',section,existing)??section;
export const newRecordData=(...args)=>extensions.require('createRecord',...args);
