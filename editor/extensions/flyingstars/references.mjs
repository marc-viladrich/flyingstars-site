import {legacyCollections} from '../../../src/lib/content-addresses.mjs';
const getPath=(data,path)=>path.reduce((value,key)=>value?.[key],data);
export function resolveReference(records,value,reference){
 if(!reference||value==null)return null;
 const prefix=Object.entries(legacyCollections).find(([,collection])=>collection===reference.collection)?.[0];
 const id=reference.encoding==='astro-reference'?value.id:value;
 return records.find(record=>record.address?.collection===reference.collection&&record.address.id===id)||records.find(record=>prefix&&record.id.startsWith(prefix+'/')&&record.id===(String(id).includes('/')?id:prefix+'/'+id))||null;
}
export function omitOwnedField(data,path){return !!getPath(data,path.slice(0,-1))?.assetId&&['src','width','height','alt'].includes(path.at(-1));}
