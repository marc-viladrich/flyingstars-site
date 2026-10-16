import {createHash} from 'node:crypto';
import {atPath} from './metadata.mjs';

// Translations that live in the site's own content, declared per collection (x-afe.collection.i18n):
// - records: one record per language, grouped by a key (products/rye.de + products/rye.en, key "rye");
// - fields: language containers inside one record (name: {de: "Brot", en: "Bread"}).
// The same storage interface as an overlay (isOwner, fields, find, merge, accept), so planning, machine
// translation and the dialog work unchanged. What it returns are changes to the site's records (patches into
// an existing language record or container), applied to the draft and reviewed by saving.
// Not tracked here: whether a present translation is older than its source text (no place in the site's
// content to keep a source hash); a present text counts as current, a missing or empty one is translated.

const sha256=text=>createHash('sha256').update(String(text),'utf8').digest('hex');
const i18nOf=record=>record?.schema?.['x-afe']?.collection?.i18n;
const collectionOf=id=>id.slice(0,id.indexOf('/'));
const text=value=>typeof value==='string'&&value.trim()?value:null;

export function createLocaleTranslations({source}){
 const mode=record=>i18nOf(record)?.mode;
 // The record in the target language with the same key, if there is one.
 const counterpart=(records,owner,locale)=>{const {key,locale:localePath}=i18nOf(owner);return records.find(record=>collectionOf(record.id)===collectionOf(owner.id)&&atPath(record.data,key)===atPath(owner.data,key)&&atPath(record.data,localePath)===locale);};
 const fields=owner=>{
  const i18n=i18nOf(owner);
  if(i18n?.mode==='records')return (owner.fields||[]).filter(field=>field.kind==='text'&&field['x-afe']?.translatable===true&&text(atPath(owner.data,field.path))).map(field=>({path:field.path,markdown:field.format==='markdown',text:atPath(owner.data,field.path)}));
  if(i18n?.mode==='fields')return (i18n.containers||[]).flatMap(container=>{const value=atPath(owner.data,[...container,source]);return text(value)?[{path:[...container,source],markdown:false,text:value}]:[];});
  return [];
 };
 // Where the translation of a source field goes.
 const target=(records,owner,path,locale)=>mode(owner)==='fields'?{record:owner,path:[...path.slice(0,-1),locale]}:{record:counterpart(records,owner,locale),path};
 return {
  isOwner:record=>mode(record)==='fields'||mode(record)==='records'&&atPath(record.data,i18nOf(record).locale)===source,
  fields,
  // A language record that does not exist cannot receive a translation (see merge).
  writable:(records,owner,locale)=>mode(owner)!=='records'||!!counterpart(records,owner,locale),
  // A present target text counts as the current translation of its source field.
  find(records,ownerId,locale){
   const owner=records.find(record=>record.id===ownerId);
   if(!owner)return undefined;
   const values=fields(owner).flatMap(field=>{const at=target(records,owner,field.path,locale);return at.record&&text(atPath(at.record.data,at.path))?[{path:field.path,sourceHash:sha256(field.text),reviewed:true}]:[];});
   return {data:{values}};
  },
  // Machine results → patches of the language records/containers. A missing language record is reported, not
  // invented: creating records needs the site's file layout.
  merge({records,locale,values}){
   const out=[];
   for(const [ownerId,{entries}] of values){
    const owner=records.find(record=>record.id===ownerId);
    if(!owner||!entries.length)continue;
    const patches=new Map();
    for(const entry of entries){const at=target(records,owner,entry.path,locale);if(!at.record)continue;(patches.get(at.record)??patches.set(at.record,[]).get(at.record)).push({path:at.path,value:entry.text});}
    if(!patches.size&&mode(owner)==='records')out.push({id:ownerId,missing:locale});
    for(const [record,list] of patches)out.push({id:record.id,expectedRevision:record.revision,patches:list});
   }
   return out;
  },
  // Language records are the site's own content: saving is the review.
  accept:records=>records,
 };
}
