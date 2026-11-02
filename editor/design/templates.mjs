import {templateFor,describeSchema,schemaDescription} from 'astro-frontend-editor/runtime/extensions';
// Section catalogue is derived from the same discriminated union used by Astro.
// Structural insertion stays disabled until coordinated DE/EN/NL edits and preview markers are implemented.
export function templates(store,records,pool){return {collections:[],sections:store.site.sectionSchema.options.map(schema=>{
 const type=schema.shape.type.value,sample=records.filter(r=>r.type==='page').flatMap(r=>r.data.sections).find(s=>s.type===type),data=templateFor(schema,sample,pool);
 return {type,title:type,data,...describeSchema(schema,data,[],'',pool),schema:schemaDescription(schema,pool)};
})};}
