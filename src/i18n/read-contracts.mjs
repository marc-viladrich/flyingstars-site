import {parseContent} from './contract.mjs';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {codecs} from 'astro-frontend-editor/runtime/extensions';
import {dependenciesFromRecords,isSource,verifyCurrent} from './transaction.mjs';
/** The same parsed owner snapshot feeds build, CLI and SEO checks. Never reads private state. */
export function readContractRecords(root,site){
 const files=readdirSync(path.join(root,'src/content'),{recursive:true}).map(f=>'src/content/'+f);files.push('src/i18n/ui.json');
 return site.sourcesFromFiles(files).map(source=>({id:source.id,file:source.file,data:parseContent(source.schema,codecs[source.format].parse(readFileSync(path.join(root,source.file),'utf8')))}));
}
export function auditContracts(site,records,options={}){
 const deps=dependenciesFromRecords(records),results=[];
 for(const source of records.filter(r=>isSource(r.id)))for(const locale of ['en','nl']){
  const id=source.id.replace('/',`/${locale}/`),target=records.find(r=>r.id===id);if(!target)throw Error('Missing translation: '+id);
  const result=verifyCurrent(site.sourceFor(source.id).schema,source.data,target.data,locale,deps,options);results.push({id,result});
 }
 return results;
}
