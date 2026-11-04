// Review guard: compare a saved baseline with a fresh scan. No automatic deduplication.
// node …/compare.mjs baseline-evidence.json candidate-evidence.json [--fail-new]
import fs from 'node:fs';
const [beforePath,afterPath,...flags]=process.argv.slice(2);
if(!beforePath||!afterPath)throw Error('baseline-evidence.json candidate-evidence.json [--fail-new]');
const before=JSON.parse(fs.readFileSync(beforePath)),after=JSON.parse(fs.readFileSync(afterPath));
const fileSet=x=>[...new Set(x.occurrences.map(r=>r.file))].sort();
const key=x=>x.value;
const results={};
for(const collection of ['contactClusters','urlClusters','repeatedCopy','uiDuplicateValues']){
 const known=new Map((before[collection]??[]).map(x=>[key(x),fileSet(x)]));
 results[collection]=(after[collection]??[]).flatMap(x=>{
  const old=known.get(key(x)),current=fileSet(x);
  if(!old||current.some(f=>!old.includes(f)))return [{value:x.value,reason:old?'zusätzliche Datei':'neuer Cluster',occurrences:x.occurrences}];
  return [];
 });
}
const newCount=Object.values(results).reduce((n,a)=>n+a.length,0);
console.log(JSON.stringify({newCount,notice:'Nur Review-Kandidaten. Redaktionelle Gleichheit und bewusste Ausnahmen anhand der Gruppen prüfen.',results},null,2));
if(flags.includes('--fail-new')&&newCount)process.exitCode=1;
