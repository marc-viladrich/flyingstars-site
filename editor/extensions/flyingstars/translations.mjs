import {createHash} from 'node:crypto';
import {schemaAt,describeSchema,listKeyAt} from 'astro-frontend-editor/runtime/extensions';
import {isStoredPath,resolvePath,storedPath,translationKey} from 'astro-frontend-editor/content';
const hash=x=>createHash('sha256').update(x).digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const getPath=(value,parts)=>parts.reduce((v,k)=>v?.[k],value);
const safeParts=isStoredPath;
// Overlay values are stored with list keys where the list declares one (content format 2); here they are
// compared and read at their position in the source record.
const at=(data,path)=>resolvePath(data,path)||[];
const failure=(message,status=400)=>Object.assign(new Error(message),{status});
export function prepareOverlays({state,nextRecords:input,seen,changes,sourceFor}) {
 const nextRecords=structuredClone(input),proposals=[];
 for(const translation of nextRecords.filter(r=>r.id.startsWith('translation/')&&seen.has(r.id))){
  const source=nextRecords.find(r=>r.id===translation.data.sourceId),baselineSource=state.records.find(r=>r.id===translation.data.sourceId);
  if(!source||!baselineSource||!seen.has(source.id)||translation.data.sourceHash!==baselineSource.revision){
   // A translation saved on its own: only its stored form (list keys, format) is settled here.
   if(!source)continue;
   const keyAt=listKeyAt(sourceFor(source.id).schema,source.data);
   const values=translation.data.values.map(entry=>{const path=resolvePath(source.data,entry.path);return path?{...entry,path:storedPath(source.data,path,keyAt)}:entry;});
   if(!same(values,translation.data.values)||translation.data.format!==2)proposals.push({id:translation.id,data:{...translation.data,format:2,values}});
   continue;
  }
  const baselineTranslation=state.records.find(r=>r.id===translation.id),explicitReview=changes.find(c=>c.id===translation.id)?.reviewedPaths||[];
  if(!Array.isArray(explicitReview)||explicitReview.some(p=>!safeParts(p)))throw failure('Ungültige Übersetzungsprüfung.');
  translation.data.sourceHash=source.revision;
  const schema=sourceFor(source.id).schema,keyAt=listKeyAt(schema,source.data);
  translation.data.values=translation.data.values.filter(entry=>{const path=resolvePath(source.data,entry.path),valid=!!path&&schemaAt(schema,source.data,path)&&typeof getPath(source.data,path)==='string',before=baselineTranslation?.data.values.find(v=>same(v.path,entry.path)),unchanged=before&&before.text===entry.text&&!explicitReview.some(p=>same(p,entry.path));if(entry.sourceHash)return valid&&entry.sourceHash===hash(getPath(source.data,path));return !unchanged||valid&&same(getPath(baselineSource.data,at(baselineSource.data,entry.path)),getPath(source.data,path));});
  // Stored form: list items by key where declared, whatever form the browser sent.
  for(const entry of translation.data.values)entry.path=storedPath(source.data,resolvePath(source.data,entry.path),keyAt);
  translation.data.format=2;
  for(const entry of translation.data.values){const before=baselineTranslation?.data.values.find(v=>same(v.path,entry.path));if(entry.sourceHash)continue;if(before?.reviewed&&before.text===entry.text&&!explicitReview.some(p=>same(p,entry.path)))entry.reviewed=false;}
  proposals.push({id:translation.id,data:translation.data});
 }

 return proposals;
}
export function validateOverlays({store,nextRecords,seen}){
 const {translatableFields,validateTranslatedMarkdown}=store.site;
 for(const translation of nextRecords.filter(r=>r.id.startsWith('translation/'))){
  if(seen.has(translation.id)){let expected;try{expected=translationIdFor(translation.data.sourceId,translation.data.locale);}catch{}if(translation.id!==expected)throw failure('Eine Übersetzung heißt nach ihrer Quelle und Sprache: '+(expected||'Quelle oder Sprache ungültig')+'.');}
  const source=nextRecords.find(r=>r.id===translation.data.sourceId);
  if(!source)throw failure('Die Quelle der Übersetzung existiert nicht.',409);
  if(!seen.has(translation.id))continue;
  const schema=store.sourceFor(source.id).schema,fields=translatableFields({...source,fields:describeSchema(schema,source.data).fields});
  for(const entry of translation.data.values){
   const path=safeParts(entry.path)&&resolvePath(source.data,entry.path),field=path&&fields.find(field=>same(field.path,path));
   if(!field)throw failure('Dieses Übersetzungsfeld gehört nicht zu den Texten der Quelle.');
   if(entry.reviewed&&(entry.sourceHash?entry.sourceHash!==hash(getPath(source.data,path)):translation.data.sourceHash!==source.revision))throw failure('Die geprüfte Übersetzung gehört zu einem älteren Quelltext.',409);
   if(field.markdown)try{validateTranslatedMarkdown(entry.text);}catch(error){throw failure(error.message);}
  }
 }
}

const translatableOwners = /^(page|post|project|faq|client|team|screen|extra|package|site)\//;
// One file per [source record, locale]: translation/<source id>/<locale> (content format 2).
export const translationIdFor = (ownerId, locale) => "translation/" + translationKey(ownerId, locale);

// Machine results become unreviewed values of the owner's translation record; reviewed values whose
// German text is unchanged are kept as they are.
function mergeIntoTranslations({ records, locale, values }, {translatableFields,sourceFor}) {
  const byId = new Map(records.map((r) => [r.id, r]));
  const out = [];
  for (const [ownerId, { revision, entries }] of values) {
    const id = translationIdFor(ownerId, locale);
    const existing = byId.get(id);
    const data = existing ? structuredClone(existing.data) : { format: 2, sourceId: ownerId, locale, sourceHash: revision, values: [] };
    // Older values without a field hash: pin them to their German text if they were current,
    // otherwise to a hash that can never match, so moving the record hash cannot revive them.
    const owner = byId.get(ownerId);
    const allowed=new Set(translatableFields(owner).map(field=>JSON.stringify(field.path)));
    data.values=data.values.filter(value=>allowed.has(JSON.stringify(resolvePath(owner?.data,value.path))));
    for (const value of data.values)
      if (!value.sourceHash) {
        const german = getPath(owner?.data, at(owner?.data, value.path));
        value.sourceHash = data.sourceHash === revision && typeof german === "string" ? hash(german) : hash("");
      }
    data.sourceHash = revision;
    // Machine results address fields by position; they are stored with list keys.
    const keyAt = listKeyAt(sourceFor(ownerId).schema, owner?.data);
    for (const result of entries) {
      const entry = { ...result, path: storedPath(owner?.data, result.path, keyAt) };
      const index = data.values.findIndex((v) => JSON.stringify(resolvePath(owner?.data, v.path)) === JSON.stringify(result.path));
      if (index < 0) data.values.push(entry);
      else data.values[index] = entry;
    }
    out.push({ id, data, create: !existing, expectedRevision: existing?.revision });
  }
  return out;
}


export function translationStorage(translatableFields,sourceFor){return {
 isOwner:record=>translatableOwners.test(record.id),
 find:(records,ownerId,locale)=>records.find(r=>r.id===translationIdFor(ownerId,locale)),
 merge:request=>mergeIntoTranslations(request,{translatableFields,sourceFor}),
 accept(records,values){for(const record of records){const owner=records.find(r=>r.id===record.data.sourceId);const fresh=new Set((values.get(record.data.sourceId)?.entries||[]).map(e=>JSON.stringify(e.path)));for(const value of record.data.values)if(fresh.has(JSON.stringify(value.path))||fresh.has(JSON.stringify(resolvePath(owner?.data,value.path))))value.reviewed=true;}return records;},
};}
