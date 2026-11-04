import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {readContractRecords,auditContracts} from '../src/i18n/read-contracts.mjs';
import {createFlyingStarsAdapter} from '../editor/flyingstars-adapter.mjs';
import {codecs} from 'astro-frontend-editor/runtime/extensions';
export async function readEditorialRecords(root) {return readContractRecords(root,await createFlyingStarsAdapter(root));}
export async function seoFallbackReport(root,dist) {
 const site=await createFlyingStarsAdapter(root),records=await readEditorialRecords(root),ids=new Map(records.map(r=>[r.id,r]));
 auditContracts(site,records,{allowUnreviewed:process.env.AFE_MODE==='editor'});
 for(const record of records.filter(r=>/^(page|post|project|faq)\/[^/]+$/.test(r.id))){
  const [kind,slug]=record.id.split('/');
  for(const locale of ['en','nl']){
   const translated=ids.get(`${kind}/${locale}/${slug}`);
   if(!translated)throw Error(`Missing or stale ${locale} translation: ${record.id}`);
   const route=site.recordRoute(translated);if(!route||translated.data.draft)continue;
   const html=await readFile(path.join(dist,route,'index.html'),'utf8');
   if(!html.includes(`lang="${locale}"`))throw Error('Wrong rendered locale: '+route);
   if(!/<title>[^<]+<\/title>/.test(html)||!/<meta name="description" content="[^"]+"/.test(html))throw Error('Missing rendered SEO: '+route);
  }
 }
 return [];
}
export async function writeSeoFallbackReport(root,dist){const report=await seoFallbackReport(root,dist),file=path.join(root,'.astro/seo-fallbacks.json');await mkdir(path.dirname(file),{recursive:true});await writeFile(file,JSON.stringify(report)+'\n');return report;}
