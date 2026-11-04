import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,symlink,rm,readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';import {randomUUID} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {NativeStore,NativeBuilder,git} from 'astro-frontend-editor/runtime';
import {createSite} from './flyingstars-adapter.mjs';import {resolveRuntimeOptions} from './server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
test('Ein natives AFE-Speichern von Person und Projektfakten erreicht die echten DE/EN/NL-Ausgaben und ihre Besitzer',async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'fs-facts-proof-'));
 await git(root,['clone','--quiet','--no-hardlinks',root,dir]);await git(dir,['checkout','-B','content/draft']);await symlink(path.join(root,'node_modules'),path.join(dir,'node_modules'));
 const site=await createSite(dir),runtime=resolveRuntimeOptions({env:{},values:{siteRoot:dir,stateDir:path.join(dir,'state')}}),store=await new NativeStore(dir,{remote:false,site,runtime}).init();
 t.after(async()=>{store.sync.close();await rm(dir,{recursive:true,force:true});});
 const state=await store.state(),person=state.records.find(r=>r.id==='person/florian-becker'),facts=state.records.find(r=>r.id==='site/project-facts');
 assert.ok(person);assert.ok(facts);
 const before={};for(const locale of ['','en/','nl/'])for(const name of ['index','ueber-uns']){const f=`src/content/pages/${locale}${name}.yaml`;before[f]=await readFile(path.join(dir,f),'utf8');}
 const photo='https://flyingstars.art/wp-content/uploads/2024/08/Ronja_Teamfoto.jpg';
 const saved=await store.save({expectedHead:state.head,requestId:randomUUID(),changes:[
  {id:person.id,expectedRevision:person.revision,patches:[{path:['name'],value:'Beweisname'},{path:['image','src'],value:photo}]},
  {id:facts.id,expectedRevision:facts.revision,patches:[{path:['puma-bundesliga','drones'],value:101},{path:['puma-bundesliga','client'],value:'Beweiskunde'},{path:['puma-bundesliga','location'],value:'Beweisort'},{path:['puma-bundesliga','date'],value:'2022-11-12'}]},
 ]});
 for(const [f,raw]of Object.entries(before))assert.equal(await readFile(path.join(dir,f),'utf8'),raw,'Personen-/Faktenänderung schreibt keine Team-Bios oder Sprachdateien um');
 const persisted=JSON.parse(await readFile(path.join(dir,'src/content/people/florian-becker.json'),'utf8'));assert.equal(persisted.name,'Beweisname');assert.equal(persisted.image.src,photo);
 const builder=new NativeBuilder(store,path.join(dir,'artifacts'),{editor:true,origin:'https://flyingstars.art',env:{...process.env,AFE_STATE_DIR:path.join(dir,'build-state'),FLYINGSTARS_OFFLINE_MEDIA:'1'}}),artifact=await builder.prepare(saved.head);
 const markers=html=>[...html.matchAll(/data-afe="([^"]+)"/g)].flatMap(m=>{const parsed=JSON.parse(m[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));return parsed.markers??[parsed];});
 for(const locale of ['','en/','nl/']){
  const home=await readFile(path.join(artifact.site,locale,'index.html'),'utf8'),about=await readFile(path.join(artifact.site,locale,'ueber-uns/index.html'),'utf8'),contact=await readFile(path.join(artifact.site,locale,'kontakt/index.html'),'utf8'),blog=await readFile(path.join(artifact.site,locale,'blog/2025-01-14-wie-funktioniert-drohnenshow-drohne/index.html'),'utf8'),puma=await readFile(path.join(artifact.site,locale,'puma-bundesliga/index.html'),'utf8');
  const evidence=path.join(process.env.AFE_STATE_DIR??dir,'facts-proof');await mkdir(evidence,{recursive:true});for(const [name,html]of Object.entries({home,about,contact,blog,puma}))await writeFile(path.join(evidence,`${locale.replace('/','')||'de'}-${name}.html`),html);
  for(const html of [home,about,contact,blog])assert.ok(html.includes('Beweisname'),locale+': Person erreicht alle Verbraucher');
  const cards=[...home.matchAll(/<li\b[^>]*class="[^"]*\bmember\b[^"]*"[^>]*>([\s\S]*?)<\/li>/g)].map(match=>match[1]),visible=html=>html.replace(/<[^>]*>/g,''),imageOf=html=>/<img\b[^>]*src="([^"]+)"/.exec(html)?.[1];
  const team=cards.find(html=>visible(html).includes('Beweisname')),ronja=cards.find(html=>visible(html).includes('Ronja Donsbach'));
  assert.ok(team&&ronja);assert.ok(imageOf(team));assert.equal(imageOf(team),imageOf(ronja),'Team-Porträt wird wie das gleiche Ronja-Quellbild optimiert');
  const byline=blog.split('class="byline"')[1]?.split('</div>')[0],faces=home.split('class="faces"')[1]?.split('</ul>')[0];
  assert.ok(byline&&faces);assert.ok(imageOf(byline));assert.equal(imageOf(byline),imageOf(faces),'Blogfoto folgt dem neuen Quellbild mit derselben 160px-Projektion wie Faces');
  for(const value of ['101','Beweiskunde','Beweisort'])assert.ok(puma.includes(value),locale+': '+value);
  assert.ok(about.includes('101'));assert.ok(!/\{\{project\./.test(puma+about));
  assert.ok(markers(home).some(m=>m.address?.owner?.collection==='people'&&m.address?.owner?.id==='florian-becker'));
  assert.ok(markers(puma).some(m=>m.address?.owner?.collection==='projectFacts'&&m.mode==='panel'));
 }
});
