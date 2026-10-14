import {createHash} from 'node:crypto';
import {getPath,translatableFields} from './translatable-fields.mjs';
export const sha256 = text => createHash('sha256').update(String(text),'utf8').digest('hex');
const safePath = path => Array.isArray(path) && path.length > 0 && path.every(key => typeof key === 'string' ? !['__proto__','prototype','constructor'].includes(key) : Number.isInteger(key) && key >= 0);
/** @param {any} record @param {string} locale @param {{editor?:boolean,translation?:any,fields?:any[]}} options */
// Pure: no disk reads, no process state, no source mutation. Extra metadata is kept out of editorial data.
export function localize(record, locale, {editor = false, translation = undefined, fields = record.fields || []} = {}) {
  const result = structuredClone(record);
  result.localization = {locale, applied:[], machine:[], fallback:[]};
  if (locale === 'de') return result;
  const allowed = translatableFields({...record,fields});
  const values = translation?.sourceId === record.id && translation.locale === locale ? translation.values || [] : [];
  const byPath = new Map(values.filter(value => safePath(value.path)).map(value => [JSON.stringify(value.path),value]));
  for (const field of allowed) {
    const value = byPath.get(JSON.stringify(field.path));
    if (!value || typeof value.text !== 'string' || value.sourceHash !== sha256(field.text) || !(value.reviewed === true || editor)) {
      result.localization.fallback.push(field.path);
      continue;
    }
    const parent = getPath(result.data,field.path.slice(0,-1));
    parent[field.path.at(-1)] = value.text;
    result.localization.applied.push(field.path);
    if (value.reviewed !== true) result.localization.machine.push(field.path);
  }
  return result;
}
