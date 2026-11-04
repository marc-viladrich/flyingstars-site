import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {codecs} from 'astro-frontend-editor/runtime/extensions';
import {project,reviewRequired} from '../../src/i18n/contract.mjs';
import {metadataKeys,contentData,dependenciesFromRecords,isSource,baseId,localeOf,seedTranslation,stamp,survivingEvidence,verifyCurrent,same} from '../../src/i18n/transaction.mjs';
const failure=message=>Object.assign(new Error(message),{status:409});
export function localeTransactions(root,sourceFor) {
 const fileRecords=files=>{
  const paths=readdirSync(path.join(root,'src/content'),{recursive:true}).map(f=>'src/content/'+f);paths.push('src/i18n/ui.json');
  return paths.flatMap(file=>{const id=file==='src/i18n/ui.json'?'site/ui':file==='src/content/contact.json'?'site/contact':file==='src/content/show-extras.json'?'site/show-extras':file==='src/content/show-duration.json'?'site/show-duration':file==='src/content/project-facts.json'?'site/project-facts':file==='src/content/business-facts.json'?'site/business-facts':/^src\/content\/(pages|posts|projects|faq|people)\/(.+)\.(yaml|md|json)$/.test(file)?file.replace(/^src\/content\/(pages|posts|projects|faq|people)\/(.+)\.(yaml|md|json)$/,(_,kind,slug)=>({pages:'page',posts:'post',projects:'project',faq:'faq',people:'person'}[kind])+'/'+slug):null;
   const source=id&&sourceFor(id);if(!source)return [];const raw=files.has(file)?files.get(file):readFileSync(path.join(root,file),'utf8');return raw===null?[]:[{id,file,data:source.schema.parse(codecs[source.format].parse(raw))}];
  });
 };
 return {
  validateWrite(source,before,after){
   if(source.id==='site/ui')for(const [key,value]of Object.entries(after)){const tokens=text=>[...text.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort().join(',');if(tokens(value.de)!==tokens(value.en)||tokens(value.de)!==tokens(value.nl))throw failure('Platzhalter stimmen nicht überein: '+key);}
   const walk=value=>{if(typeof value==='string'&&/^(?:javascript|data|vbscript):/i.test(value.trim()))throw failure('Ausführbare URLs sind nicht erlaubt.');if(value&&typeof value==='object')Object.values(value).forEach(walk);};walk(after);
  },
  previewFiles({files}){
   const records=fileRecords(files),deps=dependenciesFromRecords(records),extra=[];
   for(const source of records.filter(r=>isSource(r.id)))for(const locale of ['en','nl']){
    const id=source.id.replace('/',`/${locale}/`),target=records.find(r=>r.id===id);if(!target)throw failure('Sprachfassung fehlt: '+id);
    const schema=sourceFor(source.id).schema,result=project(schema,source.data,seedTranslation(schema,source.data,target.data),locale,deps);
    const data={...stamp(result),translationEvidence:target.data.translationEvidence},descriptor=sourceFor(id),current=files.get(target.file)??readFileSync(path.join(root,target.file),'utf8');
    extra.push([target.file,codecs[descriptor.format].update(current,[],data)]);
   }
   return extra;
  },
  prepareTransaction({state,nextRecords,seen}) {
   const before=state.records??state,dependencies=dependenciesFromRecords(nextRecords),proposals=[];
   // Every projection reads these owner snapshots. A working-copy change to any read owner is a conflict.
   for(const record of before){const source=sourceFor(record.id);if(!source)continue;const bytes=readFileSync(path.join(root,source.file));if(createHash('sha256').update(bytes).digest('hex')!==record.revision)throw failure('Eine gelesene Quelldatei wurde außerhalb des Editors geändert: '+source.file);}
   for(const id of seen){const old=before.find(r=>r.id===id),now=nextRecords.find(r=>r.id===id);if(!old||!now||!localeOf(id)&&!isSource(id))continue;
    for(const key of metadataKeys)if(key!=='translationReview'&&!same(old.data[key],now.data[key]))throw failure('Übersetzungsnachweise werden vom Vertrag verwaltet: '+key);
    if(isSource(id)&&now.data.translationReview)throw failure('Sprachprüfung gehört zur Zielsprache.');
   }
   for(const source of nextRecords.filter(r=>isSource(r.id))){
    const targets=['en','nl'].map(locale=>source.id.replace('/',`/${locale}/`));
    if(seen.has(source.id)&&!targets.every(id=>seen.has(id)))throw failure(`Bitte beide Sprachfassungen gemeinsam prüfen und mitspeichern: ${targets.join(', ')}.`);
    for(const id of targets){
     const locale=localeOf(id),target=nextRecords.find(r=>r.id===id),old=before.find(r=>r.id===id);if(!target||!old)throw failure('Sprachfassung fehlt: '+id);
     const result=project(sourceFor(source.id).schema,source.data,target.data,locale,dependencies);
     if(result.sharedDifferences.length||!same(contentData(target.data),result.projection))throw failure('Gemeinsame Werte müssen aus DE projiziert werden: '+id+' '+result.sharedDifferences.map(f=>f.address).join(', '));
     const previous=seen.has(source.id)?survivingEvidence(result,old.data.translationEvidence):old.data.translationEvidence;
     const needed=reviewRequired(result,previous),approvals=target.data.translationReview??[];
     const byAddress=new Map();for(const approval of approvals){if(byAddress.has(approval.address))throw failure('Doppelte Sprachprüfung.');byAddress.set(approval.address,approval);}
     const fields=result.fields.map(field=>{
      const prior=previous.fields.find(f=>f.address===field.address);
      if(!needed.includes(field.address))return prior;
      if(!seen.has(id))throw failure('Textprüfung nötig: '+id+' '+field.address);
      const approval=byAddress.get(field.address);byAddress.delete(field.address);
      // Saving a direct target correction confirms only an already current SOURCE field.
      const direct=!seen.has(source.id)&&prior?.sourceFingerprint===field.sourceFingerprint&&prior.targetFingerprint!==field.targetFingerprint;
      if(!direct&&(!approval||approval.sourceFingerprint!==field.sourceFingerprint||approval.targetFingerprint!==field.targetFingerprint))throw failure('Explizite Textprüfung nötig: '+id+' '+field.address);
      return {address:field.address,sourceFingerprint:field.sourceFingerprint,targetFingerprint:field.targetFingerprint,status:'reviewed'};
     });
     if(byAddress.size)throw failure('Verwaiste oder unnötige Sprachprüfung: '+id);
     if(seen.has(id))proposals.push({id,data:{...stamp(result),translationEvidence:{...previous,sourceFingerprint:result.sourceFingerprint,fields}}});
     else verifyCurrent(sourceFor(source.id).schema,source.data,target.data,locale,dependencies);
    }
   }
   return proposals;
  },
  validateTransaction({nextRecords}){
   const deps=dependenciesFromRecords(nextRecords);
   for(const source of nextRecords.filter(r=>isSource(r.id)))for(const locale of ['en','nl']){const target=nextRecords.find(r=>r.id===source.id.replace('/',`/${locale}/`));verifyCurrent(sourceFor(source.id).schema,source.data,target.data,locale,deps);}
  },
 };
}
