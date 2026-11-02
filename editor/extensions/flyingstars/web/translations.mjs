import {sha256,followPath,resolvePath,storedPath,translationKey,valueAt} from 'astro-frontend-editor/content';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Content format 2: one overlay record per [source record, locale]; value paths name list items by key where
// the list declares one. The shell and frame work with positions; this module converts at the storage boundary.
export const translationId=(ownerId,locale)=>'translation/'+translationKey(ownerId,locale);
// The key property a list of the owner declares (x-afe.array.key on its container).
const keyAt=owner=>listPath=>{const key=owner?.containers?.find(container=>container.kind==='array'&&same(container.path,listPath))?.['x-afe']?.array?.key;return Array.isArray(key)&&key.length===1&&typeof key[0]==='string'?key[0]:null;};
const at=(owner,value)=>resolvePath(owner?.data,value.path);
function valueFresh(owner, translation, value) {
  if (!value || !owner) return false;
  const german = valueAt(owner.data, value.path);
  if (typeof german !== "string") return false;
  // Fresh means exactly: written for the current German text. Old values without a field hash are not shown.
  return !!value.sourceHash && value.sourceHash === sha256(german);
}

export function write({owner,path,locale,text,record,draft,recordTemplate}) {
  const id = translationId(owner.id, locale),
    existing = record(id),
    data = existing ? structuredClone(existing.data) : { format: 2, sourceId: owner.id, locale, sourceHash: owner.revision, values: [] };
  if (data.sourceHash !== owner.revision) {
    // Values keep their own field hash, so they stay valid for German texts that did not change.
    data.values = data.values
      .filter((v) => valueAt(owner.data, v.path) !== undefined)
      .map((v) => (v.sourceHash ? v : { ...v, sourceHash: sha256(""), reviewed: false }));
    data.sourceHash = owner.revision;
  }
  const index = data.values.findIndex((v) => same(at(owner, v), path)),
    next = { path: storedPath(owner.data, path, keyAt(owner)), text, reviewed: true, sourceHash: sha256(path.reduce((v, k) => v?.[k], owner.data) ?? "") };
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
          const index = data.values.findIndex((v) => same(at(owner, v), at(owner, value)));
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
// A change to a source record moves, inserts or removes list items: its translations go with the items, in
// the same undo step. Removed items take their translations with them.
export function follow(id, before, after, {records, draft}) {
  if (isRecord({id})) return;
  const cache = new WeakMap();
  for (const translation of records().filter((r) => isRecord(r) && r.data.sourceId === id)) {
    let changed = false;
    const values = [];
    for (const value of translation.data.values) {
      const path = followPath(before, after, value.path, cache);
      if (!path) { changed = true; continue; }
      if (!same(path, value.path)) changed = true;
      values.push(same(path, value.path) ? value : { ...value, path });
    }
    if (changed) draft.set(translation.id, ["values"], values);
  }
}

const isRecord=record=>!!record?.id?.startsWith('translation/');
const metadata=record=>isRecord(record)?{ownerId:record.data.sourceId,locale:record.data.locale}:null;
const value=(owner,path,locale,record)=>{const translation=record(translationId(owner.id,locale)),v=translation?.data.values?.find(v=>same(at(owner,v),path));return valueFresh(owner,translation,v)?v:undefined;};
// For the page shown: fresh values at their position in the current source record.
const overlay=(records,locale)=>records.filter(r=>isRecord(r)&&r.data.locale===locale).flatMap(r=>{const owner=records.find(s=>s.id===r.data.sourceId);return r.data.values.filter(v=>valueFresh(owner,r,v)).map(v=>({...v,path:at(owner,v),sourceId:r.data.sourceId})).filter(v=>v.path);});
export const translationStorage={id:translationId,isRecord,metadata,value,fresh:valueFresh,write,accept:acceptSuggestions,merge:mergeTranslationRecords,overlay,follow,
 type:'translation',orphanLabel:'Sprachfassungen ohne Ursprung',
 owner:(user,record)=>isRecord(user)?record(user.data.sourceId)||user:user,
 pending:(owner,translation)=>translation?.data.values?.filter(v=>!v.reviewed&&valueFresh(owner,translation,v))||[],
 find:(values,id,path)=>values?.find(value=>value.sourceId===id&&same(value.path,path)),
 suggested:value=>!!value&&!value.reviewed,
};
