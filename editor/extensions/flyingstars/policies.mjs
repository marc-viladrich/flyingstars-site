import {describeSchema} from '../../native-schema.mjs';
import {resolveReference,omitOwnedField} from './references.mjs';
import {mediaUsers} from './media.mjs';
const at=(value,path)=>path.reduce((value,key)=>value?.[key],value);
const failure=(message,status=400)=>Object.assign(new Error(message),{status});
export function policies({packageOwnership}){
 const readOnlyPaths=(source,data)=>{const paths=[];if(source.prefix==='page')paths.push(...[...describeSchema(source.schema,data).fields,...describeSchema(source.schema,data).containers].filter(f=>packageOwnership(data,f.path)).map(f=>f.path));const walk=(value,prefix=[])=>{if(Array.isArray(value))value.forEach((v,i)=>walk(v,[...prefix,i]));else if(value&&typeof value==='object'){if(value.assetId)paths.push(...['src','width','height','alt'].map(key=>[...prefix,key]));for(const[key,child]of Object.entries(value))walk(child,[...prefix,key]);}};walk(data);return paths;};
 const assertOwnedWrite=(source,before,after)=>{for(const path of readOnlyPaths(source,before)){if(source.prefix==='page'&&packageOwnership(before,path))continue;const parent=path.slice(0,-1),a=at(before,parent),b=at(after,parent);if(path.length>1&&a?.assetId!==b?.assetId)continue;if(JSON.stringify(at(before,path))!==JSON.stringify(at(after,path)))throw failure('Dieses Feld wird durch den zugehörigen Datensatz oder Medienupload verwaltet.');}};
 const validateMedia=records=>{for(const record of records){const walk=(value,key)=>{if(Array.isArray(value)){value.forEach(v=>walk(v,key));}else if(value&&typeof value==='object'){if(value.assetId){const id=value.assetId.startsWith('media/')?value.assetId:'media/'+value.assetId,asset=records.find(r=>r.id===id);if(!asset)throw failure('Das referenzierte Medium existiert nicht: '+value.assetId,409);if(value.src!==asset.data.src)throw failure('Bildquelle und ausgewähltes Medium stimmen nicht überein.',409);}if(typeof value.src==='string'&&Object.hasOwn(value,'alt')){const asset=value.assetId?records.find(r=>r.id===(value.assetId.startsWith('media/')?value.assetId:'media/'+value.assetId)):null,effectiveAlt=value.decorative?'':value.altOverride??asset?.data.defaultAlt??value.alt;if(!value.decorative&&(typeof effectiveAlt!=='string'||!effectiveAlt.trim()))throw failure('Dieses Bild braucht einen Alternativtext oder muss als dekorativ gekennzeichnet werden.',409);}for(const[k,v]of Object.entries(value))walk(v,k);}};walk(record.data,'');}};
return {resolveReference,readOnlyPaths,validateWrite:assertOwnedWrite,validateRecords:validateMedia,
  title(source,data){return source.prefix==='package'?data.name:source.prefix==='translation'?source.id:null;},
  validateRecord(source,data){if(source.identity&&data.name!==source.identity)throw failure('Paketidentität und Dateiname stimmen nicht überein.');},
  omitField(source,data,path){return source.prefix==='page'&&packageOwnership(data,path)||omitOwnedField(data,path);},
  references(records,target){return target.id.startsWith('media/')?mediaUsers(records,target):records.filter(r=>r.data.sourceId===target.id).map(r=>r.id);},
};
}
