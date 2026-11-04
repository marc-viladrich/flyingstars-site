// Examples: node …/query.mjs group F01 | pattern contact | copies url | clones | css
import fs from 'node:fs';
const dir='docs/dupes-inventory-r20',command=process.argv[2],value=process.argv[3];
const e=JSON.parse(fs.readFileSync(dir+'/evidence.json'));
let result;
if(command==='group')result=JSON.parse(fs.readFileSync(dir+'/inventory.json')).groups.find(x=>x.id===value);
else if(command==='pattern')result=e.matches[value];
else if(command==='copies')result=e.localeCopies.filter(x=>!value||x.classification===value);
else if(command==='clones')result=e.functionClones;
else if(command==='css')result={identicalRules:e.cssDuplicates,ownerCandidates:e.cssCompetingOwners,breakpoints:e.breakpoints};
else if(command==='graph')result=e.graph.filter(x=>!value||x.file.includes(value));
else if(command==='copy')result={exact:e.repeatedCopy,near:e.nearCopy,ui:e.uiDuplicateValues};
else if(command==='counts')result=e.counts;
else throw Error('group ID | pattern contact/identity/commercial/social/urls/tracking/routes/colors/motion/helpers/schemaEditor/brittleTests | copies [class] | clones | css | graph [path] | copy | counts');
if(result===undefined)throw Error('Unbekannter Wert');
console.log(JSON.stringify(result,null,2));
