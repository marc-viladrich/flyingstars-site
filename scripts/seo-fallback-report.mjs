import {readFile, readdir, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createFlyingStarsAdapter} from '../editor/flyingstars-adapter.mjs';
import {codecs} from '../editor/core/codecs.mjs';
import {describeSchema} from '../editor/native-schema.mjs';
import {getPath, seoFields} from '../src/lib/translatable-fields.mjs';
import {localize, sha256} from '../src/lib/localize.mjs';
import {resolvePath} from '../editor/vendor/astro-frontend-editor/src/content/index.mjs';
import {localizedHref} from '../src/lib/localized-routes.mjs';

export async function readEditorialRecords(root) {
  const site = await createFlyingStarsAdapter(root);
  const files = await readdir(path.join(root,'src/content'), {recursive:true});
  return Promise.all(site.sourcesFromFiles(files.map(file=>'src/content/'+file)).map(async source=>{
    const data = source.schema.parse(codecs[source.format].parse(await readFile(path.join(root,source.file),'utf8')));
    return {id:source.id,data,fields:describeSchema(source.schema,data).fields};
  }));
}

// Read the working tree just built, not Git HEAD, and use the same source schemas as the editor.
export async function seoFallbackReport(root, dist, {editor=false}={}) {
  const site = await createFlyingStarsAdapter(root), records = await readEditorialRecords(root);
  const report = [];
  for (const record of records) {
    const fields = Object.entries(seoFields(record));
    if (!fields.length || record.data.draft && !editor) continue;
    const route = record.id === 'site/ui' ? '/blog/' : site.recordRoute(record);
    if (!route) continue;
    for (const locale of ['en','nl']) {
      const url = localizedHref(route,locale), file = path.join(dist,url,'index.html');
      let html;
      try { html = await readFile(file,'utf8'); } catch (error) { if(error.code==='ENOENT')continue; throw error; }
      const translation = records.find(item=>item.data.sourceId===record.id && item.data.locale===locale)?.data;
      const localized = localize(record,locale,{translation,editor});
      const fallbacks = fields.filter(([,fieldPath])=>localized.localization.fallback.some(p=>JSON.stringify(p)===JSON.stringify(fieldPath)))
        .map(([field,fieldPath])=>{
          const value = translation?.values.find(value=>JSON.stringify(resolvePath(record.data,value.path))===JSON.stringify(fieldPath));
          const reason = !value ? 'missing' : value.sourceHash!==sha256(getPath(record.data,fieldPath)) ? 'stale' : 'unreviewed';
          // Include the real emitted value for a reviewer; no translation text is changed here.
          const output = field==='title' ? html.match(/<title>([\s\S]*?)<\/title>/)?.[1] : html.match(/<meta name="description" content="([^"]*)"/)?.[1];
          return {field,path:fieldPath,reason,output};
        });
      if (fallbacks.length) report.push({url,record:record.id,locale,noindex:/<meta name="robots" content="[^"]*noindex/.test(html),fields:fallbacks});
    }
  }
  return report;
}

export async function writeSeoFallbackReport(root, dist) {
  const report = await seoFallbackReport(root,dist,{editor:process.env.AFE_MODE==='editor'}), file = path.join(root,'.astro/seo-fallbacks.json');
  await mkdir(path.dirname(file),{recursive:true});
  await writeFile(file,JSON.stringify(report,null,2)+'\n');
  console.log(`[SEO] ${report.length} Sprachseiten mit deutschem SEO-Fallback. Bericht: ${file}`);
  for (const page of report) console.log(`[SEO] ${page.url}: ${page.fields.map(f=>`${f.field} (${f.reason})`).join(', ')}`);
  return report;
}
