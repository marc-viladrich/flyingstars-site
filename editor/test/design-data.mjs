import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createSite} from '../flyingstars-adapter.mjs';
import {codecs,describeSchema,schemaDescription} from 'astro-frontend-editor/runtime/extensions';
export const root=fileURLToPath(new URL('../../',import.meta.url));
export const site=await createSite(root);
const files=(await readdir(root+'src',{recursive:true})).map(file=>'src/'+file);
export const records=await Promise.all(site.sourcesFromFiles(files).map(async source=>{
 const data=source.schema.parse(codecs[source.format].parse(await readFile(root+source.file,'utf8')));
 return {id:source.id,type:source.prefix,address:source.address,title:data.title||data.question||source.id,file:source.file,data,route:site.recordRoute({id:source.id,data}),...describeSchema(source.schema,data),schema:schemaDescription(source.schema)};
}));
export const pages=records.filter(r=>r.type==='page');
export const record=id=>records.find(r=>r.id===id);
