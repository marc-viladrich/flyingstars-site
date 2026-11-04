import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {parse} from 'yaml';
import {contentSchemas,sectionSchema} from '../src/schemas/content-schema.mjs';
import {PEOPLE,teamMember} from '../src/content/people.mjs';
import {SAFETY_CONCEPT,SUSTAINABILITY_PILLARS,landingSiteContent,localizedBlock} from '../src/content/shared-blocks.mjs';
import {createSite} from '../editor/flyingstars-adapter.mjs';
const pages=()=>readdirSync('src/content/pages',{recursive:true}).filter(n=>n.endsWith('.yaml')).map(n=>[n,parse(readFileSync('src/content/pages/'+n,'utf8'))]);
test('T02: sämtliche tatsächlichen Seiten referenzieren gemeinsame Besitzer ohne Bio-, Rollen- oder Bausteinkopien',()=>{
 let teams=0,safety=0,pillars=0;
 for(const [file,page]of pages()){
  contentSchemas.pages.parse(page);
  for(const s of page.sections){
   if(s.type==='team'){teams++;for(const m of s.members)assert.deepEqual(Object.keys(m),['personId'],file);assert.ok(!sectionSchema.safeParse({...s,members:[{personId:'patrick',bio:'Kopie',role:'Kopie'}]}).success);}
   if(s.type==='sustainability'){pillars++;assert.equal(s.pillarsRef,'sustainability-pillars');assert.ok(!sectionSchema.safeParse({...s,pillars:SUSTAINABILITY_PILLARS.de.pillars}).success);}
   if(s.type==='landingSite'&&s.variant==='outdoor'){safety++;assert.equal(s.safetyRef,'safety-concept');for(const k of ['diagram','items','responsibilities','download'])assert.ok(!(k in s),file+k);assert.ok(!sectionSchema.safeParse({...s,items:SAFETY_CONCEPT.de.items}).success);}
  }
 }
 assert.equal(teams,6);assert.equal(safety,9);assert.equal(pillars,6);
});
test('T02: DE/EN/NL lösen Person, Sicherheit und Nachhaltigkeit am Besitzer auf; Werbungs-Zusatzaufgaben bleiben erhalten',()=>{
 const people=structuredClone(PEOPLE),safety=structuredClone(SAFETY_CONCEPT),eco=structuredClone(SUSTAINABILITY_PILLARS);
 for(const locale of ['en','nl']){assert.deepEqual(SAFETY_CONCEPT[locale].items.map(i=>i.zone),SAFETY_CONCEPT.de.items.map(i=>i.zone));assert.deepEqual(SAFETY_CONCEPT[locale].responsibilities.map(({us,you})=>({us,you})),SAFETY_CONCEPT.de.responsibilities.map(({us,you})=>({us,you})));assert.deepEqual(SUSTAINABILITY_PILLARS[locale].pillars.map(i=>i.icon),SUSTAINABILITY_PILLARS.de.pillars.map(i=>i.icon));}
 for(const locale of ['de','en','nl']){people.patrick.bio[locale]='Bio '+locale;safety[locale].responsibilities[0].task='Sicherheit '+locale;eco[locale].pillars[0].text='Nachhaltigkeit '+locale;}
 for(const [file,page]of pages()){const locale=/^(en|nl)\//.exec(file)?.[1]??'de';for(const s of page.sections){if(s.type==='team')for(const m of s.members){if(m.personId==='patrick')assert.equal(teamMember(m,people,locale).bio,'Bio '+locale);}if(s.safetyRef){const actual=landingSiteContent(s,locale,safety);assert.ok(actual.responsibilities.some(r=>r.task==='Sicherheit '+locale));assert.equal(actual.responsibilities.length,file.includes('werbung')?12:10);if(file.includes('werbung'))assert.deepEqual(actual.responsibilities.slice(0,2),s.additionalResponsibilities);}if(s.pillarsRef)assert.equal(localizedBlock(eco,locale).pillars[0].text,'Nachhaltigkeit '+locale);}}
 assert.throws(()=>localizedBlock(eco,'fr'),/Unbekannte/);
});
test('T02: native AFE-Datensatzadressen besitzen beschriftete Sprachfelder',async()=>{
 const site=await createSite(process.cwd());
 for(const [id,collection,file]of [['site/safety-concept','safetyConcept','safety-concept'],['site/sustainability-pillars','sustainabilityPillars','sustainability-pillars']]){const source=site.sourceFor(id);assert.deepEqual(source.address,{collection,id:'configuration'});assert.deepEqual(site.sourcesFromFiles([`src/content/${file}.json`]).map(s=>s.id),[id]);assert.ok(source.schema.safeParse(JSON.parse(readFileSync(source.file,'utf8'))).success);}
});
