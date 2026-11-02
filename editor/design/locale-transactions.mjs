import {readFileSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {codecs,schemaAt,sourceShaped} from 'astro-frontend-editor/runtime/extensions';
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
   // Source-only editing supports the design's plain strings and Markdown. Never accept executable URLs.
   const walk=value=>{if(typeof value==='string'&&/^(?:javascript|data|vbscript):/i.test(value.trim()))throw failure('Ausführbare URLs sind nicht erlaubt.');if(value&&typeof value==='object')Object.values(value).forEach(walk);};walk(after);
  },
  prepareTransaction({nextRecords,seen,changes}) {
   const proposals=[];
   for(const id of seen){const source=sourceFor(id);if(!source||/\/(en|nl)\//.test(id))continue;
    const [kind,slug]=id.split('/'),targets=['en','nl'].map(locale=>`${kind}/${locale}/${slug}`);
    if(!targets.every(target=>seen.has(target)))throw failure(`Bitte beide Sprachfassungen gemeinsam prüfen und mitspeichern: ${targets.join(', ')}. Die Designsprache verwendet vollständige Sprachdateien, keine Übersetzungs-Overlays.`);
    const sourceHash=hash(candidateBytes(root,source,changes.find(change=>change.id===id)));
    for(const target of targets){const record=nextRecords.find(record=>record.id===target);if(!record)throw failure('Eine Sprachfassung fehlt: '+target);proposals.push({id:target,data:{...record.data,translationSourceHash:sourceHash}});}
   }
   return proposals;
  },
 };
}
