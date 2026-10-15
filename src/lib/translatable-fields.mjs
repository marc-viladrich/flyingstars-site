// Shared by public rendering and translation tooling. URLs, identities and references are never prose.
const looksLikeData = text => !/\p{L}{2}/u.test(text) || /^(https?:|mailto:|tel:|\/|#)/.test(text.trim()) || /^[\w.+-]+@[\w-]+\.[\w.]+$/.test(text.trim());
export const getPath = (data, path) => path.reduce((value, key) => value?.[key], data);
// These are the existing fields consumed by the page templates, not separate SEO content.
// Shared with the build report so review/hash eligibility stays in localize().
export function seoFields(record) {
  const owner = record.id.split('/')[0];
  if (['page','screen','post'].includes(owner)) return {title:['title'], description:['description']};
  if (owner === 'project') return record.data.showcase
    ? {title:['showcase','meta','title'], description:['showcase','meta','description']}
    : {title:['title'], description:['summary']};
  // The blog index has a language-neutral title and a UI-owned description.
  if (record.id === 'site/ui') return {description:["blog", "index", "description"]};
  return {};
}
export function translatableFields(record) {
  return (record.fields || []).filter(field => field.kind === 'text' && field.format !== 'color')
    .filter(field => field['x-afe']?.translatable===true)
    .map(field => ({path:field.path, markdown:field.format === 'markdown', text:getPath(record.data,field.path)}))
    .filter(field => typeof field.text === 'string' && field.text.trim() && (field.markdown || !looksLikeData(field.text)));
}
// Enumerate strings from the actual Zod schema, never arbitrary properties of a translation file.
export function textFields(schema, data, path = []) {
  const meta=schema.meta?.()||{};
  while (['optional','default','nullable','prefault','catch','readonly'].includes(schema._def.type)) schema = schema._def.innerType;
  if (data == null) return [];
  const type = schema._def.type;
  if (type === 'union') return textFields(schema.options.find(option => option.safeParse(data).success) || schema.options[0],data,path);
  if (type === 'object') return Object.entries(schema.shape).flatMap(([key,child]) => textFields(child,data[key],[...path,key]));
  if (type === 'array') return data.flatMap((value,i) => textFields(schema.element,value,[...path,i]));
  if (type === 'tuple') return schema._def.items.flatMap((child,i) => textFields(child,data[i],[...path,i]));
  return type === 'string' ? [{path,kind:'text','x-afe':meta['x-afe']||schema.meta?.()?.['x-afe'],format:meta['x-afe']?.format||meta.format||schema.meta?.()?.['x-afe']?.format||schema.meta?.()?.format}] : [];
}
