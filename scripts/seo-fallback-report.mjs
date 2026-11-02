import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createFlyingStarsAdapter} from '../editor/flyingstars-adapter.mjs';
import {codecs} from 'astro-frontend-editor/runtime/extensions';
export async function readEditorialRecords(root) {
 const site=await createFlyingStarsAdapter(root),files=await readdir(path.join(root,'src/content'),{recursive:true});
 return Promise.all(site.sourcesFromFiles(files.map(file=>'src/content/'+file)).map(async source=>({id:source.id,data:source.schema.parse(codecs[source.format].parse(await readFile(path.join(root,source.file),'utf8')))})));
}
// Full language files replace the old overlay/fallback model. Coverage and freshness are hard build gates.
export async function seoFallbackReport(){return [];}
export async function writeSeoFallbackReport(root){const file=path.join(root,'.astro/seo-fallbacks.json');await mkdir(path.dirname(file),{recursive:true});await writeFile(file,'[]\n');return [];}
