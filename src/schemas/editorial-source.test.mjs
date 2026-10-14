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

test('native word rotation respects editable ownership and resumes in preview',async()=>{
 const {runInNewContext}=await import('node:vm');const source=await fs.readFile(new URL('../scripts/site.ts',import.meta.url),'utf8');const intervals=[],timeouts=[];
 const word={dataset:{rotate:'Neu|Anders'},textContent:'Eigener Entwurf',isContentEditable:true,classList:{add(){},remove(){}}};
 const document={getElementById(){return null;},hidden:false,documentElement:{classList:{toggle(){}}},querySelector(selector){return selector==='[data-rotate]'?word:null;},querySelectorAll(){return[];},dispatchEvent(){}};
 const window={addEventListener(){}};runInNewContext(source,{document,window,matchMedia:()=>({matches:false}),sessionStorage:{getItem:()=>null},location:{hash:''},setInterval:fn=>intervals.push(fn),setTimeout:fn=>timeouts.push(fn),Event:class{},requestAnimationFrame(){}});
 intervals[0]();assert.equal(timeouts.length,0);assert.equal(word.textContent,'Eigener Entwurf');
 word.isContentEditable=false;intervals[0]();assert.equal(timeouts.length,1);timeouts.shift()();assert.equal(word.textContent,'Anders');
 intervals[0]();word.isContentEditable=true;word.textContent='Neue Eingabe';timeouts.shift()();assert.equal(word.textContent,'Neue Eingabe');
});
test('article blocks share the actual section schema and record routes',async()=>{
 const {postSchema,projectSchema}=await import('./collection-schema.mjs');const {recordRoute}=await import('../lib/editorial-routes.mjs');
 const section={type:'cta',headline:'Eine Show planen',button:{label:'Anfragen',href:'/kontakt/'}};
 assert.equal(postSchema.safeParse({title:'Blog',description:'Ein ausführlicher Artikel über die Entstehung einer Drohnenshow für FlyingStars.',date:'2026-10-13',sections:[section]}).success,true);
 assert.equal(projectSchema.safeParse({title:'Projekt',summary:'Ein Projektbericht zur Vorbereitung einer Drohnenshow.',date:'2026-10-13',sections:[section]}).success,true);
 assert.equal(recordRoute({id:'post/neuer-artikel'}),'/blog/neuer-artikel/');assert.equal(recordRoute({id:'project/projekt',data:{showcase:{route:'echte-show'}}}),'/echte-show/');
});


test('singleton native controllers cannot be duplicated while reusable blocks remain available',()=>{
 const base={title:'Seite',description:'Eine ausreichend lange Seitenbeschreibung zur Prüfung der nativen Bausteine.'};
 const form={type:'contactForm',headline:'Eine Show planen'};
 assert.equal(pageSchema.safeParse({...base,sections:[form,form]}).success,false);
 const hero={type:'hero',headline:'Ein Auftakt'};
 assert.equal(pageSchema.safeParse({...base,sections:[hero,hero]}).success,true);
});

test('public package labels can change without renaming engine identity or allowing HTML readouts',async()=>{
 const {packageSchema}=await import('../content/package-schema.mjs'),{escapeHTML}=await import('../lib/editorial-text.mjs');
 const original=JSON.parse(await fs.readFile(new URL('../content/packages/spark.json',import.meta.url),'utf8'));
 const renamed=packageSchema.parse({...original,displayName:'Funkenflug'});assert.equal(renamed.name,'SPARK');assert.equal(renamed.displayName,'Funkenflug');
 assert.equal(packageSchema.safeParse({...original,name:'Funkenflug'}).success,false);
 assert.equal(packageSchema.safeParse({...original,displayName:''}).success,false);
 assert.equal(escapeHTML('<img src=x onerror="alert(1)">'),'&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});

// Editor markers belong on elements, never inside attribute strings (aria-label, label, alt, title).
test('editor field markers never end up inside attribute or template strings',async()=>{
 const files=[];const walk=async dir=>{for(const entry of await fs.readdir(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())await walk(full);else if(entry.name.endsWith('.astro'))files.push(full);}};
 await walk(fileURLToPath(new URL('../',import.meta.url)));
 const bad=[];for(const file of files){const text=await fs.readFile(file,'utf8');for(const m of text.matchAll(/[\w-]+=\{`([^`]*)`\}|[\w-]+="([^"]*)"/g))if(/<span \{\.\.\./.test(m[1]??m[2]))bad.push(path.basename(file)+': '+m[0].slice(0,80));}
 assert.deepEqual(bad,[]);
});
