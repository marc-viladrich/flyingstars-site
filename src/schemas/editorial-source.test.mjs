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
 const window={addEventListener(){}};runInNewContext(source,{registerCanvas(){},rgbOf,document,window,matchMedia:()=>({matches:false}),sessionStorage:{getItem:()=>null},location:{hash:''},setInterval:fn=>intervals.push(fn),setTimeout:fn=>timeouts.push(fn),Event:class{},requestAnimationFrame(){}});
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

// The site marker helpers, transpiled and loaded once per mode: the product helpers read AFE_MODE when their
// module is first evaluated, so each mode imports its own copy (query string) of the package module.
async function markerHelpers(mode){
 const {transpileModule}=await import('typescript'),os=await import('node:os');
 const product=import.meta.resolve('astro-frontend-editor/markers')+'?mode='+mode;
 const source=(await fs.readFile(new URL('../lib/editor-markers.ts',import.meta.url),'utf8')).replace("'astro-frontend-editor/markers'",JSON.stringify(product)).replace("'./content-addresses.mjs'",JSON.stringify(new URL('../lib/content-addresses.mjs',import.meta.url).href));
 const file=path.join(await fs.mkdtemp(path.join(os.tmpdir(),'editor-markers-')),'editor-markers.mjs');
 await fs.writeFile(file,transpileModule(source,{compilerOptions:{module:99,target:99}}).outputText);
 const previous=process.env.AFE_MODE;process.env.AFE_MODE=mode;
 try{return await import(file);}finally{if(previous===undefined)delete process.env.AFE_MODE;else process.env.AFE_MODE=previous;}
}
const afe=attrs=>attrs['data-afe']===undefined?undefined:JSON.parse(attrs['data-afe']);
const at=(collection,id,path)=>({owner:{collection,id},part:'data',path});
test('editor markers carry full addresses and explicit occurrences only in editor builds',async()=>{
 const editor=await markerHelpers('editor'),site=await markerHelpers('public');
 assert.deepEqual(afe(editor.collectionOrder('faq','order')),{v:1,kind:'order',collection:'faq',path:['order']});
 // A card showing another record, whose membership lives in the section's own record.
 assert.deepEqual(afe(editor.listItem({_recordId:'page/index',_sectionIndex:3},{record:'package/spark',entry:['tiers',0,'featureIds',1]})),{v:1,kind:'item',rendered:{collection:'packages',id:'spark'},occurrence:'page/index/sections/3 page/index#["sections",3,"tiers",0,"featureIds",1]',membership:at('pages','index',['sections',3,'tiers',0,'featureIds',1])});
 // Query-backed cards (no entry) are occurrences too; their location tells two places apart.
 assert.deepEqual(afe(editor.listItem({_recordId:'page/index',_sectionIndex:7},{record:'project/nfl'})),{v:1,kind:'item',rendered:{collection:'projects',id:'nfl'},occurrence:'page/index/sections/7 record:project/nfl'});
 assert.deepEqual(afe(editor.listItem({_recordId:'page/index',_sectionIndex:2},{entry:['steps',1]})).rendered,{collection:'pages',id:'index'});
 assert.deepEqual(afe(editor.listItem({},{record:'package/odyssey',entry:['featureGroups',0]})).membership,at('packages','odyssey',['featureGroups',0]));
 assert.deepEqual(editor.listItem({_recordId:'page/index',_sectionIndex:2},{}),{});
 assert.deepEqual(afe(editor.sectionUses({_recordId:'page/index',_sectionIndex:4},[['tiers',1,'cta','href'],{record:'package/horizon',path:['dur']}])).addresses,[at('pages','index',['sections',4,'tiers',1,'cta','href']),at('packages','horizon',['dur'])]);
 assert.deepEqual(editor.sectionUses({},[['date']]),{});
 assert.deepEqual(afe(editor.sectionBlock({_recordId:'page/index',_sectionIndex:1})),{v:1,kind:'blocks',address:at('pages','index',['sections',1])});
 assert.deepEqual(afe(editor.recordBody('faq/show-01')),{v:1,kind:'body',address:{owner:{collection:'faq',id:'show-01'},part:'body',path:[]}});
 assert.equal(afe(editor.recordPanelField('package/horizon',['price'])).mode,'panel');
 assert.equal(afe(editor.recordField('site/ui',['base','navigation','skipLink'])).address.owner.collection,'siteUi');
 assert.throws(()=>editor.recordField('unknown/x',['a']),/Unbekannte Datensatz-ID/);
 // Several markers on one element become one attribute; plain attributes such as lang survive.
 const localized={_recordId:'page/index',_sectionIndex:0,_localization:{locale:'en',fallback:[['sections',0,'text']],applied:[],machine:[]}};
 const both=editor.markers(editor.sectionField(localized,['text']),editor.listItem(localized,{entry:['text']}));
 assert.equal(both.lang,'de');assert.deepEqual(afe(both).markers.map(m=>m.kind),['field','item']);
 // Public builds: no marker at all, the language attribute stays.
 assert.deepEqual(site.collectionOrder('faq','order'),{});assert.deepEqual(site.listItem({},{record:'faq/show-01'}),{});assert.deepEqual(site.sectionUses({},[{record:'post/a',path:['date']}]),{});
 assert.deepEqual(site.sectionField(localized,['text']),{lang:'de'});assert.deepEqual(site.markers(site.sectionField(localized,['text'])),{lang:'de'});
});

test('inline metadata survives constraints and optional unwrapping in Zod 4.6; non-editorial fields stay plain',async()=>{
 const {inlineText}=await import('./inline-text.mjs'),{sectionSchema}=await import('./page-schema.mjs'),{packageSchema}=await import('../content/package-schema.mjs'),{projectShowcaseSchema}=await import('./project-showcase.mjs');
 const inner=s=>s._def.type==='optional'?inner(s._def.innerType):s;
 assert.equal(inlineText('Kurztext').meta().format,'inline');assert.equal(inner(inlineText('Kurztext').optional()).meta().format,'inline');
 for(const option of sectionSchema.options){const shape=option.shape;if(shape.headline)assert.equal(inner(shape.headline).meta().format,'inline',shape.type.value);}
 assert.equal(inner(packageSchema.shape.displayName).meta().format,'inline');assert.equal(projectShowcaseSchema.shape.cardTitle.meta().format,'inline');
 assert.equal(pageSchema.shape.title.meta()?.format,undefined);assert.equal(pageSchema.shape.description.meta()?.format,undefined);
});

test('rotating inline words retain safe rendered marks and update the exact word field path',async()=>{
 const {runInNewContext}=await import('node:vm'),source=(await fs.readFile(new URL('../scripts/site.ts',import.meta.url),'utf8')).replace(/^import .*?;\n/gm,''),intervals=[],timeouts=[];
 const marker=path=>JSON.stringify({v:1,kind:'field',address:{owner:{collection:'pages',id:'index'},part:'data',path},mode:'inline'});
 const word={dataset:{rotate:'Neu|Anders',afe:marker(['sections',0,'words',0])},innerHTML:'<strong>Neu</strong>',isContentEditable:false,classList:{add(){},remove(){}}};
 const document={getElementById(){return null;},hidden:false,documentElement:{classList:{toggle(){}}},querySelector:s=>s==='[data-rotate]'?word:s==='[data-rotate-words]'?{content:{children:[{innerHTML:'<strong>Neu</strong>'},{innerHTML:'<em>Anders</em>'}]}}:null,querySelectorAll:()=>[],dispatchEvent(){}};
 runInNewContext(source,{registerCanvas(){},rgbOf,document,window:{addEventListener(){}},matchMedia:()=>({matches:false}),sessionStorage:{getItem:()=>null},location:{hash:''},setInterval:fn=>intervals.push(fn),setTimeout:fn=>timeouts.push(fn),Event:class{},requestAnimationFrame(){}});
 intervals[0]();timeouts.shift()();assert.equal(word.innerHTML,'<em>Anders</em>');assert.equal(word.dataset.afe,marker(['sections',0,'words',1]));
});

test('a backslash keeps typed mark characters literal',async()=>{
 const {inlineHtml,inlinePlain}=await import('../lib/inline-text.mjs');
 assert.equal(inlineHtml('A \\*\\*literal\\*\\* B'),'A **literal** B');
 assert.equal(inlinePlain('5\\* und \\~\\~ und \\{o}'),'5* und ~~ und {o}');
 assert.equal(inlineHtml('\\\\'),'\\');
});

test('UI fields use editorial roles and every section has at most ten direct fields',async()=>{
 const {siteUiSchema}=await import('./ui-schema.mjs'),{describeSchema,unwrap}=await import('astro-frontend-editor/runtime/extensions');
 const data=JSON.parse(await fs.readFile(path.join(root,'site/ui.json'),'utf8'));
 const description=describeSchema(siteUiSchema,data);
 for(const field of description.fields)assert.notEqual(field.label,field.value,field.path.join('.'));
 const walk=(schema,parts=[])=>{const node=unwrap(schema);if(node.shape){const children=Object.values(node.shape),direct=children.filter(child=>!['object','array'].includes(unwrap(child)._def.type));assert.ok(direct.length<=10,parts.join('.')+': '+direct.length);for(const[key,child]of Object.entries(node.shape))walk(child,[...parts,key]);}else if(node.element)walk(node.element,[...parts,'[]']);};walk(siteUiSchema);
});

test('every UI text has a public consumer or an explicit unused reason',async()=>{
 const {siteUiSchema}=await import('./ui-schema.mjs'),{schemaAt,describeSchema}=await import('astro-frontend-editor/runtime/extensions');
 const ui=JSON.parse(await fs.readFile(path.join(root,'site/ui.json'),'utf8'));
 const files=[];const walk=async dir=>{for(const entry of await fs.readdir(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())await walk(full);else if(/\.(astro|js|mjs|ts)$/.test(full)&&!full.includes('/schemas/')&&!full.includes('/content/'))files.push(full);}};
 await walk(fileURLToPath(new URL('../',import.meta.url)));
 const source=(await Promise.all(files.map(file=>fs.readFile(file,'utf8')))).join('\n');
 const missing=[];for(const field of describeSchema(siteUiSchema,ui).fields){
  const dotted='ui.'+field.path.join('.'),runtime=field.path.slice(1).join('.');
  const item=field.path.indexOf('items'),listUse=item>=0&&source.includes('ui.'+field.path.slice(0,item+1).join('.')+'.map')&&source.includes('item.'+field.path.at(-1));
  // FAQ aliases feed both rendered details and structured data from the same list.
  const faqUse=item>=0&&field.path[1]==='faq'&&source.includes('=ui.prices.faq.items')&&source.includes('pricingFaq.map')&&source.includes('item.'+field.path.at(-1));
  const runtimeUse=['calculator','configurator','caseStudy'].includes(field.path[0])&&(source.includes('"'+runtime+'"')||source.includes("'"+runtime+"'"));
  if(!(source.includes(dotted)||listUse||faqUse||runtimeUse||schemaAt(siteUiSchema,ui,field.path)?.meta()?.unused))missing.push(field.path.join('.'));
 }assert.deepEqual(missing,[]);
});

test('all project, next-project and package-upgrade relationships resolve to stored records',async()=>{
 const {projectSchema}=await import('./collection-schema.mjs'),{packageSchema}=await import('../content/package-schema.mjs'),{extraSchema}=await import('./extra-schema.mjs'),{describeSchema}=await import('astro-frontend-editor/runtime/extensions');
 const records=[];
 for(const[collection,schema]of [['projects',projectSchema],['packages',packageSchema],['extras',extraSchema],['clients',clientSchema],['media',mediaSchema]])for(const file of await fs.readdir(path.join(root,collection))){if(!/\.(md|json)$/.test(file))continue;const source=await fs.readFile(path.join(root,collection,file),'utf8'),raw=file.endsWith('.md')?parse(source.split('---')[1]):JSON.parse(source),data=schema.parse(raw);records.push({collection,id:file.replace(/\.(md|json)$/,''),data,schema});}
 for(const record of records)for(const field of describeSchema(record.schema,record.data).fields){const ref=field['x-afe']?.reference;if(ref&&field.value!==undefined)assert.ok(records.some(target=>target.collection===ref.collection&&target.id===field.value.replace(/^media\//,'')),`${record.collection}/${record.id}: ${field.path.join('.')} → ${field.value}`);}
});

test('nested runtime text paths resolve without changing configurator style or deep-link identities',async()=>{
 const {readRuntime}=await import('../lib/ui-runtime.mjs');
 const ui=JSON.parse(await fs.readFile(path.join(root,'site/ui.json'),'utf8'));
 const previous=globalThis.document;
 try{for(const[group,file]of [['calculator','../scripts/pricing.js'],['configurator','../scripts/show-configurator.js'],['caseStudy','../components/projects/case.js']]){
  globalThis.document={querySelector:()=>({dataset:{runtime:JSON.stringify({ui:ui[group]})}})};
  const {t}=readRuntime('test'),source=await fs.readFile(new URL(file,import.meta.url),'utf8');
  for(const [,key]of source.matchAll(/\b(?:t|h)\(\s*["']([\w.]+)["']/g))assert.equal(typeof t(key),'string',group+'.'+key);
 }}finally{globalThis.document=previous;}
 const script=await fs.readFile(new URL('../scripts/show-configurator.js',import.meta.url),'utf8');
 assert.match(script,/style = "script"/);assert.match(script,/params.get\("anlass"\)/);
 assert.match(script,/\['script', 'print', 'initials'\]\.includes\(saved.style\)/);
});

test('Astro references derive from native relationship metadata and retain package refinements',async()=>{
 const {createReference}=await import('astro/content/runtime'),{astroReferences}=await import('./astro-references.mjs'),{projectSchema}=await import('./collection-schema.mjs'),{packageSchema}=await import('../content/package-schema.mjs');
 const project=astroReferences(projectSchema,createReference());
 const value=project.parse({title:'Projekt',date:'2026-10-13',summary:'Ein Projektbericht mit einer bestehenden Kundenbeziehung.',client:'nfl',package:'spark'});
 assert.deepEqual(value.client,{collection:'clients',id:'nfl'});assert.deepEqual(value.package,{collection:'packages',id:'spark'});
 assert.equal(project.parse({title:'Projekt',date:'2026-10-13',summary:'Ein Projektbericht ohne eine bestehende Kundenbeziehung.'}).client,undefined);
 const raw=JSON.parse(await fs.readFile(path.join(root,'packages/odyssey.json'),'utf8')),schema=astroReferences(packageSchema,createReference());
 assert.deepEqual(schema.parse(raw).featureGroups[2].items[2].extraId,{collection:'extras',id:'film'});
 const invalid=structuredClone(raw);invalid.featureGroups[2].items[1].id=invalid.featureGroups[2].items[0].id;assert.equal(schema.safeParse(invalid).success,false);
});

test('migrated UI and upgrade translations retain valid paths and current per-field source hashes',async()=>{
 const {siteUiSchema}=await import('./ui-schema.mjs'),{extraSchema}=await import('./extra-schema.mjs'),{schemaAt}=await import('astro-frontend-editor/runtime/extensions'),{sha256}=await import('../lib/localize.mjs');
 for(const file of await fs.readdir(path.join(root,'translations'))){if(!/^(site-ui|extra-).+\.json$/.test(file))continue;const translation=JSON.parse(await fs.readFile(path.join(root,'translations',file),'utf8')),extra=translation.sourceId.startsWith('extra/'),data=JSON.parse(await fs.readFile(path.join(root,extra?'extras/'+translation.sourceId.slice(6)+'.json':'site/ui.json'),'utf8')),schema=extra?extraSchema:siteUiSchema;
  assert.equal(translation.sourceHash,sha256(await fs.readFile(path.join(root,extra?'extras/'+translation.sourceId.slice(6)+'.json':'site/ui.json'),'utf8')));
  for(const value of translation.values){assert.ok(schemaAt(schema,data,value.path),file+': '+value.path.join('.'));const german=value.path.reduce((v,k)=>v?.[k],data);assert.equal(value.sourceHash,sha256(german),file+': '+value.path.join('.'));}
 }
});

test('all stored case titles and their translated lines carry caps with current source hashes',async()=>{
 const {sha256}=await import('../lib/localize.mjs');
 const projects=new Map();for(const file of await fs.readdir(path.join(root,'projects'))){if(!file.endsWith('.md'))continue;const data=parse((await fs.readFile(path.join(root,'projects',file),'utf8')).split('---')[1]);projects.set(file.slice(0,-3),data);for(const line of data.showcase?.titleLines??[])assert.match(line,/^\{c\}[\s\S]+\{\/c\}$/);}
 for(const file of await fs.readdir(path.join(root,'translations'))){if(!file.startsWith('project-'))continue;const translation=JSON.parse(await fs.readFile(path.join(root,'translations',file),'utf8'));for(const value of translation.values.filter(value=>value.path[0]==='showcase'&&value.path[1]==='titleLines')){assert.match(value.text,/^\{c\}[\s\S]+\{\/c\}$/);assert.equal(value.sourceHash,sha256(value.path.reduce((v,k)=>v[k],projects.get(translation.sourceId.slice(8)))));}}
 const css=await fs.readFile(new URL('../styles/global.css',import.meta.url),'utf8');assert.doesNotMatch(css.match(/\.c-name\s*\{([^}]+)\}/)?.[1]??'',/text-transform/);assert.match(css,/\.t-caps\s*\{\s*text-transform:\s*uppercase/);
});

test('UI edit markers resolve to active fields rather than unused extraction fragments',async()=>{
 const {siteUiSchema}=await import('./ui-schema.mjs'),{schemaAt}=await import('astro-frontend-editor/runtime/extensions');
 const ui=JSON.parse(await fs.readFile(path.join(root,'site/ui.json'),'utf8'));
 const walk=async dir=>{for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory()){await walk(file);continue;}if(!file.endsWith('.astro'))continue;const source=await fs.readFile(file,'utf8');for(const [,literal]of source.matchAll(/uiMarker\(['"]site\/ui['"],(\[[^\]]+\])\)/g)){const parts=JSON.parse(literal.replaceAll("'",'"').replace(/\bi\b/g,'0')),field=schemaAt(siteUiSchema,ui,parts);assert.ok(field,file+': '+literal);assert.ok(!field.meta()?.unused,file+': inactive '+literal);}}};
 await walk(fileURLToPath(new URL('../components/',import.meta.url)));await walk(fileURLToPath(new URL('../layouts/',import.meta.url)));
});
