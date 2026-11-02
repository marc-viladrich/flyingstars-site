import {readFileSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {describeSchema,codecs,schemaAt,sourceShaped} from 'astro-frontend-editor/runtime/extensions';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const failure=message=>Object.assign(new Error(message),{status:409});
// Replicate the source codec's actual root reconciliation, including comments and absent defaults.
function candidateBytes(root,source,changes) {
 const codec=codecs[source.format],bytes=readFileSync(path.join(root,source.file),'utf8');let raw=codec.parse(bytes);
 for(const patch of changes?.patches||[]) {
  const schema=schemaAt(source.schema,raw,patch.path),before=patch.path.reduce((v,k)=>v?.[k],raw),value=sourceShaped(schema,before,patch.value);
  if(!patch.path.length){raw=structuredClone(value);continue;}
  let target=raw;for(const [i,key]of patch.path.slice(0,-1).entries()){target[key]??=typeof patch.path[i+1]==='number'?[]:{};target=target[key];}
  if(value===undefined)delete target[patch.path.at(-1)];else target[patch.path.at(-1)]=value;
 }
 return codec.update(bytes,[],raw);
}
export function localeTransactions(root,sourceFor) {
 return {
  validateWrite(_source,before,after){
   if(_source.id==='site/ui')for(const [key,value]of Object.entries(after)){const tokens=text=>[...text.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort().join(',');if(tokens(value.de)!==tokens(value.en)||tokens(value.de)!==tokens(value.nl))throw failure('Platzhalter stimmen nicht überein: '+key);}
   // Source-only editing supports the design's plain strings and Markdown. Never accept executable URLs.
   const walk=value=>{if(typeof value==='string'&&/^(?:javascript|data|vbscript):/i.test(value.trim()))throw failure('Ausführbare URLs sind nicht erlaubt.');if(value&&typeof value==='object')Object.values(value).forEach(walk);};walk(after);
  },
  previewFiles({files}){
   const extra=[];for(const [file,bytes]of files){if(bytes===null||!/src\/content\/(?:pages|posts|projects|faq)\/[a-z0-9-]+\.(?:yaml|md)$/.test(file))continue;
    const codec=codecs[file.endsWith('.yaml')?'yaml':'markdown'],sourceHash=hash(bytes),at=file.lastIndexOf('/');
    for(const locale of ['en','nl']){const target=file.slice(0,at+1)+locale+'/'+file.slice(at+1),current=files.has(target)?files.get(target):readFileSync(path.join(root,target),'utf8');if(current!==null)extra.push([target,codec.update(current,['translationSourceHash'],sourceHash)]);}
   }return extra;
  },
  transactionArtifacts({state,nextRecords,seen}) {
   const file='docs/i18n/content-provenance.json',previous=JSON.parse(readFileSync(path.join(root,file),'utf8'));
   let entries=previous;
   for(const id of seen){const source=sourceFor(id);if(!source||!['page','post','project','faq'].includes(source.prefix))continue;
    const isLocale=/\/(en|nl)\//.exec(id),baseId=id.replace(/\/(en|nl)\//,'/'),base=sourceFor(baseId),locale=isLocale?.[1];
    if(!locale)continue;
    const record=nextRecords.find(r=>r.id===id),before=state.find(r=>r.id===id);
    const valid=new Set(record?describeSchema(source.schema,record.data).fields.filter(f=>typeof f.value==='string'&&f.path[0]!=='translationSourceHash').map(f=>JSON.stringify(f.path)):[]);
    entries=entries.filter(e=>e.source!==base.file||e.locale!==locale||valid.has(JSON.stringify(e.path)));
    if(record)for(const field of describeSchema(source.schema,record.data).fields){if(typeof field.value!=='string'||field.path[0]==='translationSourceHash')continue;
     const old=field.path.reduce((v,k)=>v?.[k],before?.data),sourceBefore=state.find(r=>r.id===baseId)?.data,sourceAfter=nextRecords.find(r=>r.id===baseId)?.data,atPath=data=>field.path.reduce((v,k)=>v?.[k],data),sourceChanged=seen.has(baseId)&&JSON.stringify(atPath(sourceBefore))!==JSON.stringify(atPath(sourceAfter));
     if(old===field.value&&!sourceChanged)continue;
     const at=entries.findIndex(e=>e.source===base.file&&e.locale===locale&&JSON.stringify(e.path)===JSON.stringify(field.path));
     const entry={...(at>=0?entries[at]:{}),source:base.file,path:field.path,locale,origin:'editor-revised',editorReviewed:true,revision:'afe-full-files'};
     if(at>=0)entries[at]=entry;else entries.push(entry);
    }
   }
   return JSON.stringify(entries)===JSON.stringify(previous)?[]:[{file,text:JSON.stringify(entries,null,2)+'\n'}];
  },
  prepareTransaction({nextRecords,seen,changes}) {
   const proposals=[];
   for(const id of seen){const source=sourceFor(id);if(!source||['media','site','package'].includes(source.prefix)||/\/(en|nl)\//.test(id))continue;
    const [kind,slug]=id.split('/'),targets=['en','nl'].map(locale=>`${kind}/${locale}/${slug}`);
    if(!targets.every(target=>seen.has(target)))throw failure(`Bitte beide Sprachfassungen gemeinsam prüfen und mitspeichern: ${targets.join(', ')}. Die Designsprache verwendet vollständige Sprachdateien, keine Übersetzungs-Overlays.`);
    const sourceHash=hash(candidateBytes(root,source,changes.find(change=>change.id===id)));
    for(const target of targets){const record=nextRecords.find(record=>record.id===target);if(!record)throw failure('Eine Sprachfassung fehlt: '+target);proposals.push({id:target,data:{...record.data,translationSourceHash:sourceHash}});}
   }
   return proposals;
  },
 };
}
