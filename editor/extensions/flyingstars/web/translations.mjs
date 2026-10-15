import {sha256} from '../../../web/sha256.mjs';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const getPath=(data,path)=>path.reduce((v,k)=>v?.[k],data);
export const translationId=(ownerId,locale)=>'translation/'+ownerId.replaceAll('/','-')+'-'+locale;
function valueFresh(owner, translation, value) {
  if (!value || !owner) return false;
  const german = getPath(owner.data, value.path);
  if (typeof german !== "string") return false;
  // Fresh means exactly: written for the current German text. Old values without a field hash are not shown.
  return !!value.sourceHash && value.sourceHash === sha256(german);
}

export function write({owner,path,locale,text,record,draft,recordTemplate}) {
  const id = translationId(owner.id, locale),
    existing = record(id),
    data = existing ? structuredClone(existing.data) : { sourceId: owner.id, locale, sourceHash: owner.revision, values: [] };
  if (data.sourceHash !== owner.revision) {
    // Values keep their own field hash, so they stay valid for German texts that did not change.
    data.values = data.values
      .filter((v) => getPath(owner.data, v.path) !== undefined)
      .map((v) => (v.sourceHash ? v : { ...v, sourceHash: sha256(""), reviewed: false }));
    data.sourceHash = owner.revision;
  }
  const index = data.values.findIndex((v) => same(v.path, path)),
    next = { path, text, reviewed: true, sourceHash: sha256(getPath(owner.data, path) ?? "") };
  if (index < 0) data.values.push(next);
  else data.values[index] = next;
  if (existing) draft.set(id, [], data);
  else {
    const t = recordTemplate("translation/");
    draft.create({
      id,
      title: owner.title + " · " + locale,
      file: id,
      revision: null,
      data,
      schema: t?.schema,
      fields: t?.fields || [],
      containers: t?.containers || [],
    });
  }
}
export function acceptSuggestions(ownerIds, locales,{record,draft}) {
  for (const ownerId of ownerIds)
    for (const locale of locales) {
      const owner = record(ownerId),
        translation = owner && record(translationId(owner.id, locale));
      if (!translation) continue;
      const data = structuredClone(translation.data);
      let changedAny = false;
      for (const v of data.values)
        if (!v.reviewed && valueFresh(owner, translation, v)) {
          v.reviewed = true;
          changedAny = true;
        }
      if (changedAny) draft.set(translation.id, [], data);
    }
}
export function mergeTranslationRecords(items, accept,{record,draft,recordTemplate}) {
  draft.group(() => {
    for (const item of items) {
      const current = record(item.id);
      if (current) {
        // A reviewed, current translation in the draft is never replaced by a suggestion.
        const owner = record(item.data.sourceId);
        const data = structuredClone(current.data);
        for (const value of item.data.values) {
          const index = data.values.findIndex((v) => same(v.path, value.path));
          const existing = index >= 0 ? data.values[index] : null;
          if (existing?.reviewed && valueFresh(owner, current, existing)) continue;
          if (index < 0) data.values.push(value);
          else data.values[index] = value;
        }
        data.sourceHash = item.data.sourceHash;
        draft.set(item.id, [], data);
      } else {
        const t = recordTemplate("translation/");
        draft.create({ id: item.id, title: item.id, file: item.id, revision: null, data: item.data, schema: t?.schema, fields: t?.fields || [], containers: t?.containers || [] });
      }
    }
    if (accept) acceptSuggestions(accept.ids, accept.locales,{record,draft});
  });
}

const isRecord=record=>!!record?.id?.startsWith('translation/');
const metadata=record=>isRecord(record)?{ownerId:record.data.sourceId,locale:record.data.locale}:null;
const value=(owner,path,locale,record)=>{const translation=record(translationId(owner.id,locale)),v=translation?.data.values?.find(v=>same(v.path,path));return valueFresh(owner,translation,v)?v:undefined;};
const overlay=(records,locale)=>records.filter(r=>isRecord(r)&&r.data.locale===locale).flatMap(r=>r.data.values.filter(v=>valueFresh(records.find(s=>s.id===r.data.sourceId),r,v)).map(v=>({...v,sourceId:r.data.sourceId})));
export const translationStorage={id:translationId,isRecord,metadata,value,fresh:valueFresh,write,accept:acceptSuggestions,merge:mergeTranslationRecords,overlay,
 type:'translation',orphanLabel:'Sprachfassungen ohne Ursprung',
 owner:(user,record)=>isRecord(user)?record(user.data.sourceId)||user:user,
 pending:(owner,translation)=>translation?.data.values?.filter(v=>!v.reviewed&&valueFresh(owner,translation,v))||[],
 find:(values,id,path)=>values?.find(value=>value.sourceId===id&&same(value.path,path)),
 suggested:value=>!!value&&!value.reviewed,
};
