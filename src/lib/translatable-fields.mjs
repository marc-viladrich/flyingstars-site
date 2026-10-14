// Shared by public rendering and translation tooling. URLs, identities and references are never prose.
const owners = /^(page|post|project|faq|client|team|screen|package|site)\//;
const excluded = new Set(['href','url','src','video','heroVideo','id','assetId','sourceIssue','sourceId','sourceHash','date','updated','route','nextRoute','tags','mime','color','accent','name','client','slug','street','packageId','featureIds','clientIds','memberIds','build','anlass','orbShape']);
const looksLikeData = text => !/\p{L}{2}/u.test(text) || /^(https?:|mailto:|tel:|\/|#)/.test(text.trim()) || /^[\w.+-]+@[\w-]+\.[\w.]+$/.test(text.trim());
export const getPath = (data, path) => path.reduce((value, key) => value?.[key], data);
export function translatableFields(record) {
  if (!owners.test(record.id)) return [];
  return (record.fields || []).filter(field => field.kind === 'text')
    .filter(field => !excluded.has([...field.path].reverse().find(part => typeof part !== 'number')))
    .map(field => ({path:field.path, markdown:field.format === 'markdown' || field.path.at(-1) === 'body', text:getPath(record.data,field.path)}))
    .filter(field => typeof field.text === 'string' && field.text.trim() && (field.markdown || !looksLikeData(field.text)));
}
// Enumerate strings from the actual Zod schema, never arbitrary properties of a translation file.
export function textFields(schema, data, path = []) {
  while (['optional','default','nullable','prefault','catch','readonly'].includes(schema._def.type)) schema = schema._def.innerType;
  if (data == null) return [];
  const type = schema._def.type;
  if (type === 'union') return textFields(schema.options.find(option => option.safeParse(data).success) || schema.options[0],data,path);
  if (type === 'object') return Object.entries(schema.shape).flatMap(([key,child]) => textFields(child,data[key],[...path,key]));
  if (type === 'array') return data.flatMap((value,i) => textFields(schema.element,value,[...path,i]));
  if (type === 'tuple') return schema._def.items.flatMap((child,i) => textFields(child,data[i],[...path,i]));
  return type === 'string' ? [{path,kind:'text',format:path.at(-1) === 'body' ? 'markdown' : schema.meta?.()?.format}] : [];
}
