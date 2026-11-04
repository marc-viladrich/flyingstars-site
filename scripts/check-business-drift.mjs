import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';
import {BUSINESS_FACTS} from '../src/content/business-facts.mjs';
/** Free prose stays editable. This scanner enumerates actual leaves, including new files. Historical projects are separate. */
export function businessDocuments(root=fileURLToPath(new URL('../',import.meta.url))){
 const result=[];
 for(const dir of ['pages','faq'])for(const name of readdirSync(resolve(root,'src/content',dir),{recursive:true}).filter(n=>/\.(yaml|md)$/.test(n))){
  const file=`src/content/${dir}/${name}`,raw=readFileSync(resolve(root,file),'utf8');
  const data=name.endsWith('.yaml')?parse(raw):{...parse(raw.split('---')[1]),body:raw.split('---').slice(2).join('---')};
  const walk=(v,path=[])=>{if(typeof v==='string'&&!['todo','translationSourceHash'].includes(path.at(-1)))result.push({file,path,text:v});else if(v&&typeof v==='object')Object.entries(v).forEach(([k,x])=>walk(x,[...path,Array.isArray(v)?Number(k):k]));};walk(data);
 }
 for(const name of ['safety-concept','sustainability-pillars']){const file=`src/content/${name}.json`,data=JSON.parse(readFileSync(resolve(root,file),'utf8'));const walk=(v,path=[])=>{if(typeof v==='string')result.push({file,path,text:v});else if(v&&typeof v==='object')Object.entries(v).forEach(([k,x])=>walk(x,[...path,Array.isArray(v)?Number(k):k]));};walk(data);}
 return result;
}
const rules=[
 ['responseHours',/antwort|reply|respond|response|reactie|reager|antwoor/i,/(\d+)\s*(?:Stunden|hours|uur|h)\b/gi,1],
 ['depositPercent',/Anzahlung|deposit|aanbetaling/i,/(\d+)\s*%/g,1],
 ['earlyBookingPercent',/rabatt|discount|korting/i,/(\d+)\s*%/g,1],
 ['liabilityEUR',/Haftpflicht|liability|aansprakelijk/i,/(\d+[.,]\d+)\s*(?:Mio|million|mln|m\b|miljoen)/gi,1000000],
 ['renewablePercent',/naturstrom|Ökostrom|green electricity|groene stroom/i,/(\d+)\s*%/g,1],
 ['droneWeightGrams',/Drohnen|drones/i,/(\d+)\s*(?:Gramm|grams|gram)\b/gi,1],
 ['maxAltitudeMetres',/höher|higher|hoger/i,/(\d+)\s*(?:Meter|metres|meter)\b/gi,1],
 ['windForce',/Windstärke|wind force|windkracht|Beaufort/i,/(?:Windstärke|wind force|windkracht|Beaufort)\s*(\d+)|(\d+)\s*Beaufort/gi,1],
];
export function businessDrift(documents=businessDocuments(),facts=BUSINESS_FACTS){
 const checked=[],drift=[];
 for(const original of documents)for(const text of original.text.split(/\n|(?<=[.!?])\s+/)){const doc={...original,text};for(const [fact,context,pattern,scale]of rules){if(!context.test(doc.text))continue;for(const match of doc.text.matchAll(pattern)){const actual=Number((match[1]??match[2]).replace(',','.'))*scale;const finding={...doc,fact,actual,expected:facts[fact].value};checked.push(finding);if(actual!==finding.expected)drift.push(finding);}}
 if(/(?:seit|since|sinds) 2022|178/.test(doc.text)&&/shows/i.test(doc.text)){
  const exact=/(\d+)\s+shows/i.exec(doc.text),rounded=/(?:über|over|more than|ruim)\s+(\d+)\s+shows/i.exec(doc.text);
  if(exact){const actual=Number(exact[1]),finding={...doc,fact:'showsTotal',actual,expected:facts.showsTotal.value,rounded:Boolean(rounded)};checked.push(finding);if(rounded?actual>=finding.expected:actual!==finding.expected)drift.push(finding);}
 }}return {checked,drift};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const result=businessDrift();console.log(JSON.stringify(result,null,2));process.exitCode=result.drift.length?1:0;}
