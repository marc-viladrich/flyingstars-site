import {templateFor,describeSchema,schemaDescription} from 'astro-frontend-editor/runtime/extensions';
// Section catalogue is derived from the same discriminated union used by Astro.
// Structural insertion stays disabled until coordinated DE/EN/NL edits and preview markers are implemented.
// Ein Typ ohne aktuelle Verwendung bekommt seine Vorlage aus dem Schema. Für `comparison` reicht das nicht: die Regel
// „ein Wert je Spalte“ (checkComparisonRows) erfüllt keine generierte Vorlage. Seit Runde 14 (Indoor-Vergleich entfernt)
// dient deshalb die eingebettete Vergleichstabelle (Nachhaltigkeit, gleiches Tabellenschema) als Beispiel.
const embeddedComparison=sections=>{const host=sections.find(s=>s.comparison);return host&&{_key:'k_template_comparison',type:'comparison',headline:host.headline,...host.comparison};};
export function templates(store,records,pool){return {collections:[],sections:store.site.sectionSchema.options.map(schema=>{
 const type=schema.shape.type.value,sections=records.filter(r=>r.type==='page').flatMap(r=>r.data.sections),sample=sections.find(s=>s.type===type)??(type==='comparison'?embeddedComparison(sections):undefined),data=templateFor(schema,sample,pool);
 return {type,title:type,data,...describeSchema(schema,data,[],'',pool),schema:schemaDescription(schema,pool)};
})};}
