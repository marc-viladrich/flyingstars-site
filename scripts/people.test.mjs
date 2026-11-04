import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {parse} from 'yaml';
import {PEOPLE,FOUNDERS,person,teamMember} from '../src/content/people.mjs';
import {contentSchemas} from '../src/schemas/content-schema.mjs';
import {createSite} from '../editor/flyingstars-adapter.mjs';
test('Personen-IDs besitzen Name und Porträt; Team und Autor folgen derselben Änderung',()=>{
 assert.equal(FOUNDERS.length,3);
 assert.deepEqual(Object.keys(PEOPLE).sort(),readdirSync('src/content/people').filter(n=>n.endsWith('.json')).map(n=>n.slice(0,-5)).sort());
 const changed=structuredClone(PEOPLE);changed['florian-becker'].name='Testname';changed['florian-becker'].image.src='https://flyingstars.art/probe.jpg';
 for(const locale of ['','en/','nl/'])for(const file of ['index','ueber-uns']){
  const page=parse(readFileSync(`src/content/pages/${locale}${file}.yaml`,'utf8'));contentSchemas.pages.parse(page);
  for(const section of page.sections.filter(s=>s.type==='team'))for(const member of section.members){
   assert.ok(!('name'in member)&&!('image'in member));const resolved=teamMember(member,changed);
   assert.equal(resolved.bio,member.bio);assert.equal(resolved.role,member.role);
   if(member.personId==='florian-becker'){assert.equal(resolved.name,'Testname');assert.equal(resolved.image.src,'https://flyingstars.art/probe.jpg');assert.equal(resolved.image.alt,member.imageAlt);}
  }
 }
 for(const file of readdirSync('src/content/posts',{recursive:true}).filter(n=>n.endsWith('.md'))){const post=contentSchemas.posts.parse(parse(readFileSync('src/content/posts/'+file,'utf8').split('---')[1]));assert.equal(person(post.authorId,changed).name,'Testname');}
 assert.throws(()=>person('missing'),/Unbekannte Person/);
});
test('AFE führt Personen als native Datensätze mit identischer Referenzadresse',async()=>{
 const site=await createSite(process.cwd()),source=site.sourceFor('person/florian-becker');
 assert.deepEqual(source.address,{collection:'people',id:'florian-becker'});
 assert.equal(source.file,'src/content/people/florian-becker.json');
 assert.deepEqual(site.sourcesFromFiles([source.file]).map(s=>s.id),['person/florian-becker']);
 assert.equal(site.recordRoute({id:'person/florian-becker',data:{}}),null);
});
