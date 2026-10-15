// Temporary site helper until PR 11 imports astro-frontend-editor/schema.
// The editor and product checker validate this namespace against AFE_META_SPEC.
export const editable=value=>({'x-afe':value});
// Places a field, list or object in a named block of the record overview (x-afe `group`). Its other x-afe
// metadata is kept, also when it sits on the inner schema of an optional/nullable/default wrapper (a
// chained .meta() replaces the whole x-afe object).
/** @template {import('astro/zod').ZodType} T @param {string} group @param {T} schema @returns {T} */
export function inGroup(group,schema){
  let inner=schema;
  while(inner?.def?.innerType)inner=inner.def.innerType;
  return schema.meta({'x-afe':{...(inner.meta?.()?.['x-afe']||{}),...(schema.meta?.()?.['x-afe']||{}),group}});
}
