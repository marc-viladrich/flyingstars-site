import {rgbOf} from '../lib/color-tokens.mjs';
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
 const {runInNewContext}=await import('node:vm');const source=(await fs.readFile(new URL('../scripts/site.ts',import.meta.url),'utf8')).replace(/^import .*?;\n/gm,'');const intervals=[],timeouts=[];
 const word={dataset:{rotate:'Neu|Anders'},textContent:'Eigener Entwurf',isContentEditable:true,classList:{add(){},remove(){}}};
 const document={getElementById(){return null;},hidden:false,documentElement:{classList:{toggle(){}}},querySelector(selector){return selector==='[data-rotate]'?word:null;},querySelectorAll(){return[];},dispatchEvent(){}};
 const window={addEventListener(){}};runInNewContext(source,{rgbOf,document,window,matchMedia:()=>({matches:false}),sessionStorage:{getItem:()=>null},location:{hash:''},setInterval:fn=>intervals.push(fn),setTimeout:fn=>timeouts.push(fn),Event:class{},requestAnimationFrame(){}});
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

test('all site singletons validate through the registered schemas, including navigation lists',async()=>{
 const {siteSchemas}=await import('./site-schema.mjs');
 for(const [id,schema] of Object.entries(siteSchemas))schema.parse(JSON.parse(await fs.readFile(path.join(root,'site',id+'.json'),'utf8')));
 const {siteNavigationSchema}=await import('./site-schema.mjs'),navigation=JSON.parse(await fs.readFile(path.join(root,'site/navigation.json'),'utf8'));
 assert.equal(navigation.header.length,5);assert.equal(navigation.footer.pages.length,7);
 assert.equal(siteNavigationSchema.safeParse({...navigation,header:[{label:'Unsicher',href:'javascript:alert(1)'}]}).success,false);
});

test('package features have unique stable ids and every selected card feature resolves to its package text',async()=>{
 const {packageSchema}=await import('../content/package-schema.mjs'),{selectedPackageFeatures}=await import('../content/package-features.mjs');
 const packages=await readGroup('packages',packageSchema);
 for(const file of await fs.readdir(path.join(root,'pages'))){if(!file.endsWith('.yaml'))continue;const page=pageSchema.parse(parse(await fs.readFile(path.join(root,'pages',file),'utf8')));for(const section of page.sections)if(section.type==='pricing')for(const tier of section.tiers){assert.ok(packages.has(tier.packageId));selectedPackageFeatures(packages.get(tier.packageId),tier.featureIds);assert.ok(!['name','price','unit','orb','features','badge','description','highlight'].some(key=>key in tier));}}
 const pkg=packages.get('spark'),first=pkg.featureGroups[0].items[0],last=pkg.featureGroups[2].items[1];
 assert.deepEqual(selectedPackageFeatures(pkg,[last.id,first.id]).map(x=>x.feature.text),[last.text,first.text]);
 assert.deepEqual(selectedPackageFeatures(pkg,[first.id])[0].path,['featureGroups',0,'items',0,'text']);
 assert.throws(()=>selectedPackageFeatures(pkg,['missing']),/SPARK.*missing/);
 const duplicate=structuredClone(pkg);duplicate.featureGroups[1].items[0].id=first.id;assert.equal(packageSchema.safeParse(duplicate).success,false);
});

test('all FAQ records persist a numeric global order and new entries receive a numeric default',async()=>{
 const {faqSchema}=await import('./collection-schema.mjs');
 for(const file of await fs.readdir(path.join(root,'faq'))){if(!file.endsWith('.md'))continue;const source=await fs.readFile(path.join(root,'faq',file),'utf8');const frontmatter=parse(source.split('---')[1]);assert.equal(typeof frontmatter.order,'number');faqSchema.parse(frontmatter);}
 assert.equal(faqSchema.parse({question:'Eine Frage?'}).order,100);
});

async function nativeHelpers(){
 const {transpileModule}=await import('typescript');
 const source=await fs.readFile(new URL('../lib/native-editor.ts',import.meta.url),'utf8');
 return import('data:text/javascript;base64,'+Buffer.from(transpileModule(source,{compilerOptions:{module:99,target:99}}).outputText).toString('base64'));
}
test('native order and cross-record entries expose exact owners only in editor builds',async()=>{
 const helpers=await nativeHelpers(),previous=process.env.FLYINGSTARS_EDITOR;
 try{
  process.env.FLYINGSTARS_EDITOR='1';assert.deepEqual(helpers.nativeOrder('order'),{'data-native-order-field':'order'});
  assert.deepEqual(helpers.nativeItem({_nativeRecord:'page/index',_nativeIndex:3},{record:'package/spark',entry:['tiers',0,'featureIds',1]}),{'data-native-record':'package/spark','data-native-entry':'["sections",3,"tiers",0,"featureIds",1]','data-native-entry-record':'page/index'});
  process.env.FLYINGSTARS_EDITOR='0';assert.deepEqual(helpers.nativeOrder('order'),{});assert.deepEqual(helpers.nativeItem({},{record:'faq/show-01'}),{});
 }finally{if(previous===undefined)delete process.env.FLYINGSTARS_EDITOR;else process.env.FLYINGSTARS_EDITOR=previous;}
});

test('enhanced sustainability facts are inert initially and after scroll except the visible fact; reduced motion keeps all interactive',async()=>{
 const {runInNewContext}=await import('node:vm'),source=(await fs.readFile(new URL('../scripts/site.ts',import.meta.url),'utf8')).replace(/^import .*?;\n/gm,'');
 for(const reduce of [false,true]){
  let top=0;const events={},facts=Array.from({length:4},()=>({inert:false,classList:{toggle(){}},contains(){return false;}}));
  const canvas={getContext:()=>({}),getBoundingClientRect:()=>({width:1000,height:800})},pin={addEventListener(){}},scrolly={classList:{add(){}},style:{setProperty(){}},querySelectorAll:s=>s==='.fact'?facts:[],querySelector:s=>s==='canvas'?canvas:s==='.eco-pin'?pin:null,getBoundingClientRect:()=>({top,height:4000})};
  const document={getElementById(){return null;},hidden:false,documentElement:{classList:{toggle(){}}},querySelector:s=>s==='[data-scrolly]'?scrolly:null,querySelectorAll:()=>[],dispatchEvent(){}};
  class Observer{observe(){}unobserve(){}}
  runInNewContext(source,{rgbOf,document,window:{addEventListener(){},IntersectionObserver:Observer},IntersectionObserver:Observer,matchMedia:()=>({matches:reduce}),sessionStorage:{getItem:()=>null},location:{hash:''},Event:class{},requestAnimationFrame(){},devicePixelRatio:1,innerHeight:1000,addEventListener:(name,fn)=>events[name]=fn});
  assert.deepEqual(facts.map(f=>f.inert),reduce?[false,false,false,false]:[false,true,true,true]);
  if(!reduce){top=-1600;events.scroll();assert.deepEqual(facts.map(f=>f.inert),[true,true,false,true]);top=0;events.scroll();assert.deepEqual(facts.map(f=>f.inert),[false,true,true,true]);}
 }
});

test('inline rendering escapes HTML and supports only the five nested text formats',async()=>{
 const {inlineHtml,inlinePlain}=await import('../lib/inline-text.mjs');
 const cases=[
  ['**fett**','<strong>fett</strong>','fett'],['*kursiv*','<em>kursiv</em>','kursiv'],['~~weg~~','<s>weg</s>','weg'],
  ['{o}Kontur{/o}','<span class="t-outline">Kontur</span>','Kontur'],['{c}groß{/c}','<span class="t-caps">groß</span>','groß'],
  ['***beides***','<strong><em>beides</em></strong>','beides'],['*innen **fett***','<em>innen <strong>fett</strong></em>','innen fett'],
  ['**außen *innen***','<strong>außen <em>innen</em></strong>','außen innen'],
  ['{o}**Hallo *Welt* ~~alt~~** {c}neu{/c}{/o}','<span class="t-outline"><strong>Hallo <em>Welt</em> <s>alt</s></strong> <span class="t-caps">neu</span></span>','Hallo Welt alt neu'],
  ['**offen','**offen','**offen'],['{o}offen','{o}offen','{o}offen'],['a * b','a * b','a * b'],
  ['[Link](https://example.com) _normal_','[Link](https://example.com) _normal_','[Link](https://example.com) _normal_'],
  ['**<img src=x onerror="evil()">**','<strong>&lt;img src=x onerror=&quot;evil()&quot;&gt;</strong>','<img src=x onerror="evil()">'],
  ['&amp; <script> " \'','&amp;amp; &lt;script&gt; &quot; &#39;','&amp; <script> " \''],
 ];
 for(const [source,html,plain] of cases){assert.equal(inlineHtml(source),html,source);assert.equal(inlinePlain(source),plain,source);}
 const marks=[['**','**'],['*','*'],['~~','~~'],['{o}','{/o}'],['{c}','{/c}']];
 for(const [a,ac] of marks)for(const[b,bc]of marks){const source=a+'außen '+b+'innen'+bc+' außen'+ac;assert.equal(inlinePlain(source),'außen innen außen',source);assert.doesNotMatch(inlineHtml(source),/[{}~*]/);}
});

test('inline metadata survives constraints and optional unwrapping in Zod 4.6; non-editorial fields stay plain',async()=>{
 const {inlineText}=await import('./inline-text.mjs'),{sectionSchema}=await import('./page-schema.mjs'),{packageSchema}=await import('../content/package-schema.mjs'),{projectShowcaseSchema}=await import('./project-showcase.mjs');
 const inner=s=>s._def.type==='optional'?inner(s._def.innerType):s;
 assert.equal(inlineText('Kurztext').meta().format,'inline');assert.equal(inner(inlineText('Kurztext').optional()).meta().format,'inline');
 for(const option of sectionSchema.options){const shape=option.shape;if(shape.headline)assert.equal(inner(shape.headline).meta().format,'inline',shape.type.value);}
 assert.equal(inner(packageSchema.shape.displayName).meta().format,'inline');assert.equal(projectShowcaseSchema.shape.cardTitle.meta().format,'inline');
 assert.equal(pageSchema.shape.title.meta()?.format,undefined);assert.equal(pageSchema.shape.description.meta()?.format,undefined);
 const {nativeField,nativeRecord}=await nativeHelpers(),previous=process.env.FLYINGSTARS_EDITOR;
 try{process.env.FLYINGSTARS_EDITOR='1';assert.equal(nativeField({_nativeRecord:'page/index',_nativeIndex:0},['headline'],true)['data-native-inline'],'true');assert.equal(nativeRecord('package/spark',['displayName'],true)['data-native-inline'],'true');process.env.FLYINGSTARS_EDITOR='0';assert.deepEqual(nativeRecord('package/spark',['displayName'],true),{});}finally{if(previous===undefined)delete process.env.FLYINGSTARS_EDITOR;else process.env.FLYINGSTARS_EDITOR=previous;}
});

test('rotating inline words retain safe rendered marks and update the exact word field path',async()=>{
 const {runInNewContext}=await import('node:vm'),source=(await fs.readFile(new URL('../scripts/site.ts',import.meta.url),'utf8')).replace(/^import .*?;\n/gm,''),intervals=[],timeouts=[];
 const word={dataset:{rotate:'Neu|Anders',nativePath:'["sections",0,"words",0]'},innerHTML:'<strong>Neu</strong>',isContentEditable:false,classList:{add(){},remove(){}}};
 const document={getElementById(){return null;},hidden:false,documentElement:{classList:{toggle(){}}},querySelector:s=>s==='[data-rotate]'?word:s==='[data-rotate-words]'?{content:{children:[{innerHTML:'<strong>Neu</strong>'},{innerHTML:'<em>Anders</em>'}]}}:null,querySelectorAll:()=>[],dispatchEvent(){}};
 runInNewContext(source,{rgbOf,document,window:{addEventListener(){}},matchMedia:()=>({matches:false}),sessionStorage:{getItem:()=>null},location:{hash:''},setInterval:fn=>intervals.push(fn),setTimeout:fn=>timeouts.push(fn),Event:class{},requestAnimationFrame(){}});
 intervals[0]();timeouts.shift()();assert.equal(word.innerHTML,'<em>Anders</em>');assert.equal(word.dataset.nativePath,'["sections",0,"words",1]');
});

test('a backslash keeps typed mark characters literal',async()=>{
 const {inlineHtml,inlinePlain}=await import('../lib/inline-text.mjs');
 assert.equal(inlineHtml('A \\*\\*literal\\*\\* B'),'A **literal** B');
 assert.equal(inlinePlain('5\\* und \\~\\~ und \\{o}'),'5* und ~~ und {o}');
 assert.equal(inlineHtml('\\\\'),'\\');
});
