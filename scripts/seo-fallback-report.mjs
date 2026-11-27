import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {readContractRecords,auditContracts} from '../src/i18n/read-contracts.mjs';
import {createFlyingStarsAdapter} from '../editor/flyingstars-adapter.mjs';
import {localeOf} from '../src/i18n/transaction.mjs';
export async function readEditorialRecords(root) {return readContractRecords(root,await createFlyingStarsAdapter(root));}
export async function seoFallbackReport(root,dist) {
 const site=await createFlyingStarsAdapter(root),records=await readEditorialRecords(root);
 auditContracts(site,records,{allowUnreviewed:process.env.AFE_MODE==='editor'});
 for(const record of records){
  const locale=localeOf(record.id),route=site.recordRoute(record);
  if(!locale||!route||record.data.draft)continue;
  const html=await readFile(path.join(dist,route,'index.html'),'utf8');
  if(!html.includes(`lang="${locale}"`))throw Error('Wrong rendered locale: '+route);
  if(!/<title>[^<]+<\/title>/.test(html)||!/<meta name="description" content="[^"]+"/.test(html))throw Error('Missing rendered SEO: '+route);
 }
 return [];
}
export async function writeSeoFallbackReport(root,dist){const report=await seoFallbackReport(root,dist),file=path.join(root,'.astro/seo-fallbacks.json');await mkdir(path.dirname(file),{recursive:true});await writeFile(file,JSON.stringify(report)+'\n');return report;}
