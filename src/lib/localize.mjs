import {createHash} from 'node:crypto';
import {getPath,translatableFields} from './translatable-fields.mjs';
// Until the package is installed (step 11) the product module is read from the editor's vendored copy.
import {resolvePath} from '../../editor/vendor/astro-frontend-editor/src/content/index.mjs';
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
  // Stored paths name list items by key where the list has one; here they become positions in this record.
  const byPath = new Map(values.map(value => [resolvePath(record.data,value.path),value]).filter(([path]) => safePath(path)).map(([path,value]) => [JSON.stringify(path),value]));
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
