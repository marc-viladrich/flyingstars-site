import test from 'node:test';import assert from 'node:assert/strict';import fs from'node:fs/promises';import path from'node:path';import {fileURLToPath}from'node:url';import {parse}from'yaml';import {pageSchema,image}from'./page-schema.mjs';import {clientSchema,teamSchema,mediaSchema}from'./entity-schema.mjs';
const root=fileURLToPath(new URL('../content/',import.meta.url));
async function readGroup(name,schema){const out=new Map();for(const file of await fs.readdir(path.join(root,name))){if(!file.endsWith('.json'))continue;out.set(file.slice(0,-5),schema.parse(JSON.parse(await fs.readFile(path.join(root,name,file),'utf8'))));}return out;}
test('all actual section references and media references resolve to canonical records',async()=>{
 const clients=await readGroup('clients',clientSchema),team=await readGroup('team',teamSchema),media=await readGroup('media',mediaSchema);
 const walk=value=>{if(!value||typeof value!=='object')return;if(value.assetId)assert.ok(media.has(value.assetId.replace(/^media\//,'')),`Mediareference ${value.assetId}`);for(const nested of Object.values(value))walk(nested);};
 for(const file of await fs.readdir(path.join(root,'pages'))){if(!file.endsWith('.yaml'))continue;const page=pageSchema.parse(parse(await fs.readFile(path.join(root,'pages',file),'utf8')));for(const section of page.sections){for(const id of section.clientIds??[])assert.ok(clients.has(id.replace(/^client\//,'')),`Clientreference ${id}`);for(const id of section.memberIds??[])assert.ok(team.has(id.replace(/^team\//,'')),`Teamreference ${id}`);}walk(page);}
 for(const value of [...clients.values(),...team.values()])walk(value);
});
test('duplicate section anchors and unsafe media URLs are rejected',()=>{
 const page={title:'Titel',description:'Eine ausreichend lange Seitenbeschreibung zur Validierung der neuen Datenstruktur.',sections:[{type:'faq',headline:'Fragen',id:'kontakt'},{type:'faq',headline:'Weitere Fragen',id:'kontakt'}]};
 assert.equal(pageSchema.safeParse(page).success,false);
 assert.equal(image.safeParse({src:'javascript:alert(1)',alt:'Bild',width:10,height:10}).success,false);
 assert.equal(image.safeParse({src:'/assets/test.webp',alt:'',width:10,height:10,decorative:true}).success,true);
});
