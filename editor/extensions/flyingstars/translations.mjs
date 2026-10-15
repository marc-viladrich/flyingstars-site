import {createHash} from 'node:crypto';
import {schemaAt,describeSchema} from '../../native-schema.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const getPath=(value,parts)=>parts.reduce((v,k)=>v?.[k],value);
const safeParts=parts=>Array.isArray(parts)&&parts.every(k=>typeof k==='string'&&!['__proto__','constructor','prototype'].includes(k)||Number.isInteger(k)&&k>=0);
const failure=(message,status=400)=>Object.assign(new Error(message),{status});
export function prepareOverlays({state,nextRecords:input,seen,changes,sourceFor}) {
 const nextRecords=structuredClone(input),proposals=[];
 for(const translation of nextRecords.filter(r=>r.id.startsWith('translation/')&&seen.has(r.id))){
  const source=nextRecords.find(r=>r.id===translation.data.sourceId),baselineSource=state.records.find(r=>r.id===translation.data.sourceId);
  if(!source||!baselineSource||!seen.has(source.id)||translation.data.sourceHash!==baselineSource.revision)continue;
  const baselineTranslation=state.records.find(r=>r.id===translation.id),explicitReview=changes.find(c=>c.id===translation.id)?.reviewedPaths||[];
  if(!Array.isArray(explicitReview)||explicitReview.some(p=>!safeParts(p)))throw failure('Ungültige Übersetzungsprüfung.');
  translation.data.sourceHash=source.revision;
  translation.data.values=translation.data.values.filter(entry=>{const valid=safeParts(entry.path)&&schemaAt(sourceFor(source.id).schema,source.data,entry.path)&&typeof getPath(source.data,entry.path)==='string',before=baselineTranslation?.data.values.find(v=>same(v.path,entry.path)),unchanged=before&&before.text===entry.text&&!explicitReview.some(p=>same(p,entry.path));if(entry.sourceHash)return valid&&entry.sourceHash===hash(getPath(source.data,entry.path));return !unchanged||valid&&same(getPath(baselineSource.data,entry.path),getPath(source.data,entry.path));});
  for(const entry of translation.data.values){const before=baselineTranslation?.data.values.find(v=>same(v.path,entry.path));if(entry.sourceHash)continue;if(before?.reviewed&&before.text===entry.text&&!explicitReview.some(p=>same(p,entry.path)))entry.reviewed=false;}
  proposals.push({id:translation.id,data:translation.data});
 }

 return proposals;
}
export function validateOverlays({store,nextRecords,seen}){
 const {translatableFields,validateTranslatedMarkdown}=store.site;
 for(const translation of nextRecords.filter(r=>r.id.startsWith('translation/'))){
  const source=nextRecords.find(r=>r.id===translation.data.sourceId);
  if(!source)throw failure('Die Quelle der Übersetzung existiert nicht.',409);
  if(!seen.has(translation.id))continue;
  const schema=store.sourceFor(source.id).schema,fields=translatableFields({...source,fields:describeSchema(schema,source.data).fields});
  for(const entry of translation.data.values){
   const field=fields.find(field=>same(field.path,entry.path));
   if(!safeParts(entry.path)||!field)throw failure('Dieses Übersetzungsfeld gehört nicht zu den Texten der Quelle.');
   if(entry.reviewed&&(entry.sourceHash?entry.sourceHash!==hash(getPath(source.data,entry.path)):translation.data.sourceHash!==source.revision))throw failure('Die geprüfte Übersetzung gehört zu einem älteren Quelltext.',409);
   if(field.markdown)try{validateTranslatedMarkdown(entry.text);}catch(error){throw failure(error.message);}
  }
 }
}

const translatableOwners = /^(page|post|project|faq|client|team|screen|package|site)\//;
const translationIdFor = (ownerId, locale) => "translation/" + ownerId.replaceAll("/", "-") + "-" + locale;

// Machine results become unreviewed values of the owner's translation record; reviewed values whose
// German text is unchanged are kept as they are.
function mergeIntoTranslations({ records, locale, values }, {translatableFields}) {
  const byId = new Map(records.map((r) => [r.id, r]));
  const out = [];
  for (const [ownerId, { revision, entries }] of values) {
    const id = translationIdFor(ownerId, locale);
    const existing = byId.get(id);
    const data = existing ? structuredClone(existing.data) : { sourceId: ownerId, locale, sourceHash: revision, values: [] };
    // Older values without a field hash: pin them to their German text if they were current,
    // otherwise to a hash that can never match, so moving the record hash cannot revive them.
    const owner = byId.get(ownerId);
    const allowed=new Set(translatableFields(owner).map(field=>JSON.stringify(field.path)));
    data.values=data.values.filter(value=>allowed.has(JSON.stringify(value.path)));
    for (const value of data.values)
      if (!value.sourceHash) {
        const german = getPath(owner?.data, value.path);
        value.sourceHash = data.sourceHash === revision && typeof german === "string" ? hash(german) : hash("");
      }
    data.sourceHash = revision;
    for (const entry of entries) {
      const index = data.values.findIndex((v) => JSON.stringify(v.path) === JSON.stringify(entry.path));
      if (index < 0) data.values.push(entry);
      else data.values[index] = entry;
    }
    out.push({ id, data, create: !existing, expectedRevision: existing?.revision });
  }
  return out;
}


export function translationStorage(translatableFields){return {
 isOwner:record=>translatableOwners.test(record.id),
 find:(records,ownerId,locale)=>records.find(r=>r.id===translationIdFor(ownerId,locale)),
 merge:request=>mergeIntoTranslations(request,{translatableFields}),
 accept(records,values){for(const record of records){const fresh=new Set((values.get(record.data.sourceId)?.entries||[]).map(e=>JSON.stringify(e.path)));for(const value of record.data.values)if(fresh.has(JSON.stringify(value.path)))value.reviewed=true;}return records;},
};}
