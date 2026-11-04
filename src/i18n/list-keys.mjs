import {z} from 'zod';
import {fieldPolicy} from './field-policy.mjs';
const key=()=>fieldPolicy(z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/).meta({'x-afe':{visibility:'hidden'}}),'shared');
const localized=node=>node.meta?.()?.['x-afe']?.translatable===true||Object.values(node.shape??{}).some(localized)||node.options?.some(localized)||(node._def?.innerType&&localized(node._def.innerType))||(node._def?.element&&localized(node._def.element));
/** Add internal identities at every list boundary containing translated descendants.
 * Primitive text entries become {_key,value}; schemas, limits and refinements remain authoritative. */
/** @template {import('zod').ZodType} T @param {T} schema @param {boolean} item @returns {T} */
export function keyedSchema(schema,item=false){
 const def=schema._def;let next={...def};
 if(def.innerType)next.innerType=keyedSchema(def.innerType,item);
 else if(def.type==='object')next.shape={...Object.fromEntries(Object.entries(schema.shape).map(([k,v])=>[k,keyedSchema(v)])),...item?{_key:key()}: {}};
 else if(def.type==='union')next.options=schema.options.map(s=>keyedSchema(s,item));
 else if(def.type==='array')next.element=keyedSchema(def.element,localized(def.element));
 else if(item&&localized(schema))return z.object({_key:key(),value:schema}).strict();
 return schema.clone(next).meta(schema.meta()??{});
}

/** @template {import('zod').ZodType} T @param {T} schema */
export const keyedText=schema=>z.object({_key:key(),value:schema}).strict();
