import fs from 'node:fs';
import {findings} from './findings.mjs';
const dir='docs/dupes-inventory-r20',e=JSON.parse(fs.readFileSync(dir+'/evidence.json'));
const concurrent=file=>file==='src/layouts/Base.astro'||file==='src/components/LanguageSwitch.astro'||file==='src/components/people.ts'||file==='src/components/ContactWays.astro'||/^src\/content\/pages\/(?:en\/|nl\/)?kontakt.yaml$/.test(file)?'in Arbeit bei Claude, nur Baseline inventarisiert':file==='src/styles/global.css'?'Nav-Block in Arbeit bei Claude; übriges Blatt unabhängig':undefined;
function role(file){if(/(?:\.test\.|\.spec\.|^tests\/|\/test\/)/.test(file))return 'guard-or-fixture';if(file.startsWith('editor/'))return 'editor';if(file.startsWith('src/pages/poc/')||file==='src/styles/poc.css'||file.startsWith('src/scripts/poc/'))return 'poc';if(/\/en\//.test(file))return 'content-en';if(/\/nl\//.test(file))return 'content-nl';if(file.startsWith('src/content/'))return 'content-owner-or-copy';if(file.startsWith('docs/'))return 'mapping-or-provenance';return 'renderer-or-config';}
const sources=new Map(e.scope.files.map(file=>[file,fs.readFileSync(file,'utf8').split('\n')]));
const compact=(file,line)=>({file,line,role:role(file),...(concurrent(file)?{concurrent:concurrent(file)}:{}),excerpt:sources.get(file)?.[line-1]?.trim().slice(0,400)??''});
function unique(refs){return [...new Map(refs.map(r=>[r.file+':'+r.line,compact(r.file,r.line)])).values()].sort((a,b)=>a.file.localeCompare(b.file)||a.line-b.line);}
const groups=findings.map(({files,match,...f})=>{
 let refs=[];
 for(const [file,lines]of sources){if(!files.test(file))continue;for(let i=0;i<lines.length;i++)if(match.test(lines[i]))refs.push({file,line:i+1});}
 if(f.id==='I01')refs=[...e.localeCopies.flatMap(x=>[x.source,x.target]),...refs.filter(r=>!r.file.startsWith('src/content/'))];
 if(f.id==='T01')refs.push(...e.uiDuplicateValues.flatMap(x=>x.occurrences));
 const occurrences=unique(refs);
 return {...f,selection:{files:files.source,match:match.source,flags:match.flags,meaning:'Vollständige Zeilenliste nach dokumentierter Gruppenregel; enthält Besitzer, Kopien, Verbraucher und Guards, nicht ausschließlich Fehler.'},locationCount:occurrences.length,fileCount:new Set(occurrences.map(x=>x.file)).size,occurrences};
});
const categories=[1,2,3,4,5,6,7,8].map(category=>{const g=groups.filter(x=>x.category===category),refs=unique(g.flatMap(x=>x.occurrences));return {category,groups:g.length,A:g.filter(x=>x.kind==='A').length,B:g.filter(x=>x.kind==='B').length,C:g.filter(x=>x.kind==='C').length,locations:refs.length,files:new Set(refs.map(x=>x.file)).size};});
const result={schemaVersion:1,sourceCommit:e.base,inputSha256:e.inputSha256,scopeNote:'Statisches Inventar der versionierten operativen Texte. Fundstellenlisten sind innerhalb der Regeln vollständig; semantische Ähnlichkeit bleibt menschliche Bewertung. Raw-Treffer sind keine bestätigten Dubletten.',categories,groups};
fs.writeFileSync(dir+'/inventory.json',JSON.stringify(result,null,2)+'\n');
const md=['# Bewertete Gruppen','', 'A = echte Mehrfachpflege vereinheitlichen. B = begründet getrennt. C = Altbestand nach Abhängigkeitsprüfung entfernen. Fundstellen umfassen Quelle, Kopien, Verbraucher und Guards. Die vollständigen Datei:Zeile-Listen stehen in inventory.json; sie sind hier bewusst nicht auf Beispiele gekürzt.',''];
for(const g of groups){md.push(`## ${g.id}: ${g.title}`,'',`${g.kind}, Priorität ${g.priority}, Aufwand ${g.effort}, Risiko ${g.risk}. ${g.locationCount} Zeilen in ${g.fileCount} Dateien.${g.concurrent?' In Arbeit bei Claude bzw. von seinem laufenden Umbau berührt.':''}`,'',g.observed,'',`**Einziger Besitzer:** ${g.owner}`,'',`**Ableitung:** ${g.consumers}`,'',`**AFE:** ${g.editor}`,'',`**Übersetzungen:** ${g.i18n}`,'',`**Guard:** ${g.guard}`,'',`**Sichtbare Wirkung:** ${g.visibility}`,'');}
fs.writeFileSync(dir+'/groups.md',md.join('\n'));
console.log(JSON.stringify({groups:groups.length,kinds:Object.fromEntries(['A','B','C'].map(k=>[k,groups.filter(x=>x.kind===k).length])),categories},null,2));
