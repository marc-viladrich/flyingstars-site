import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {parse} from 'yaml';
import {PROJECT_FACTS,projectValue,projectValues,projectText} from '../src/content/project-facts.mjs';
import {projectFactsSchema,projectFactRefSchema} from '../src/schemas/project-facts.mjs';
import {contentSchemas} from '../src/schemas/content-schema.mjs';
import {createSite} from '../editor/flyingstars-adapter.mjs';
test('Alle 20 Projekte besitzen ausschließlich explizite Faktenverweise; Stand und Sprachen folgen dem Besitzer',()=>{
 projectFactsSchema.parse(PROJECT_FACTS);let count=0;
 for(const file of readdirSync('src/content/projects',{recursive:true}).filter(n=>n.endsWith('.md'))){
  const data=contentSchemas.projects.parse(parse(readFileSync('src/content/projects/'+file,'utf8').split('---')[1]));
  for(const field of ['date','client','location','drones'])if(field in data){projectFactRefSchema.parse(data[field]);assert.equal(data[field].field,field);}
  if(data.showcase){
   assert.deepEqual(data.showcase.drones,data.drones);
   assert.ok(data.showcase.credits.some(c=>c.value?.field==='location'));
  }
  count++;
 }
 assert.equal(count,60); // 20 Projekte je DE/EN/NL, seit 15.11.2026 mit E.ON Hamburg (Moritz' Startseitentext)
 const changed=structuredClone(PROJECT_FACTS);changed['puma-bundesliga'].drones=101;changed['puma-bundesliga'].date='2023-12-12';changed['puma-bundesliga'].location={de:'Testort',en:'Test place',nl:'Testplaats'};changed['puma-bundesliga'].client='Testkunde';
 for(const locale of ['de','en','nl']){const ref=field=>({project:'puma-bundesliga',field});assert.equal(projectValue(ref('drones'),locale,changed),101);assert.equal(projectValue(ref('client'),locale,changed),'Testkunde');assert.equal(projectValue(ref('location'),locale,changed),changed['puma-bundesliga'].location[locale]);assert.equal(projectValue({...ref('date'),display:'year'},locale,changed),'2023');assert.equal(projectValue({...ref('date'),display:'numeric'},locale,changed),'12.12.2023');assert.equal(projectText('{{project.puma-bundesliga.drones}}',locale,changed),'101');}
 assert.equal(projectValue({project:'bokkenrijders-musical-2026',field:'totalDrones'}),12000);
 assert.equal(projectValue({project:'musikalischer-teaser-bokkenrijders',field:'date',display:'year'}),'2025');
 assert.equal(projectValue({project:'bokkenrijders-musical-2026',field:'date',display:'year'}),'2026');
 assert.throws(()=>projectValue({project:'vw-50-golf',field:'drones'}),/Unbekannter Projektfakt/);
 assert.throws(()=>projectValue({project:'missing',field:'drones'}),/Unbekannter Projektfakt/);
 assert.equal(projectFactsSchema.safeParse({...PROJECT_FACTS,missing:{}}).success,false);
 const invalid=structuredClone(PROJECT_FACTS);invalid['puma-bundesliga'].date='2026-02-31';assert.equal(projectFactsSchema.safeParse(invalid).success,false);
 assert.throws(()=>projectValue({project:'bokkenrijders-musical-2026',field:'date',display:'dayMonth'}),/Tag unbekannt/);
});
test('AFE bearbeitet denselben historischen Faktenbesitzer; Timeline referenziert vorhandene Ereignisse',async()=>{
 const site=await createSite(process.cwd()),source=site.sourceFor('site/project-facts');assert.deepEqual(source.address,{collection:'projectFacts',id:'configuration'});assert.equal(source.file,'src/content/project-facts.json');
 for(const locale of ['','en/','nl/']){const page=parse(readFileSync(`src/content/pages/${locale}ueber-uns.yaml`,'utf8'));for(const item of page.sections.find(s=>s.type==='timeline').items)if(typeof item.when==='object'){projectFactRefSchema.parse(item.when);assert.equal(typeof projectValues(item,locale.slice(0,-1)||'de').when,'string');}}
});

test('Mehrabend-Shows lösen beide Termine und die Aufführungszahl aus dem Faktenbestand auf',()=>{
 for(const [project,lastDay] of [['airpower24','2024-09-07'],['eisenhuettenstadt-75','2025-08-31']]){
  const reference={project,field:'endDate',display:'iso'};
  assert.equal(projectFactRefSchema.parse(reference).display,'iso');
  assert.equal(projectValue(reference),lastDay);
  assert.equal(projectValue({project,field:'shows'}),2);
  assert.equal(projectText(`{{project.${project}.endDate.iso}}`,'nl'),lastDay);
 }
});
