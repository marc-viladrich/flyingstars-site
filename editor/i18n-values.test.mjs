import {createFlyingStarsAdapter as translationSite} from './flyingstars-adapter.mjs';
import {fileURLToPath as translationRoot} from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import {localize,sha256} from '../src/lib/localize.mjs';
import {textFields,translatableFields} from '../src/lib/translatable-fields.mjs';
import {siteSchemas} from '../src/schemas/site-schema.mjs';
import {packageSchema} from '../src/content/package-schema.mjs';
import {localizedHref,localeFromPath,sourcePath} from '../src/lib/localized-routes.mjs';
import {markdownHtml} from '../src/lib/markdown-policy.mjs';
import {jsonScript} from '../src/lib/json-script.mjs';
import {fake,translationProvider} from './translation-providers.mjs';
import {executeBatched, createTranslationCore} from './translation-core.mjs';
import {readFile,readdir} from 'node:fs/promises';
const {plan,mergeIntoTranslations}=createTranslationCore(await translationSite(translationRoot(new URL('../',import.meta.url))));
const record={id:'page/example',data:{title:'Grüße aus Köln',href:'/kontakt/',date:new Date('2026-10-14'),sections:[{headline:'Unser Himmel'}]},fields:[{path:['title'],kind:'text', 'x-afe': {translatable:true}},{path:['href'],kind:'text', 'x-afe': {translatable:false}},{path:['date'],kind:'text', 'x-afe': {translatable:false}},{path:['sections',0,'headline'],kind:'text', 'x-afe': {translatable:true}}]};
const value=(path,text,reviewed=true,sourceHash=sha256(path.reduce((v,k)=>v[k],record.data)))=>({path,text,reviewed,sourceHash});
const translation=values=>({sourceId:record.id,locale:'en',sourceHash:'0'.repeat(64),values});
test('Public eligibility is per-value review AND exact UTF-8 source hash; editor alone exposes fresh machine values',()=>{
 const values=[value(['title'],'Reviewed English'),value(['sections',0,'headline'],'Machine English',false),value(['href'],'/evil/')];
 const publicRecord=localize(record,'en',{translation:translation(values)});
 assert.equal(publicRecord.data.title,'Reviewed English');assert.equal(publicRecord.data.sections[0].headline,'Unser Himmel');assert.equal(publicRecord.data.href,'/kontakt/');
 const editorRecord=localize(record,'en',{editor:true,translation:translation(values)});
 assert.equal(editorRecord.data.sections[0].headline,'Machine English');assert.deepEqual(editorRecord.localization.machine,[['sections',0,'headline']]);
 assert.equal(record.data.title,'Grüße aus Köln');assert.ok(publicRecord.data.date instanceof Date);assert.equal(publicRecord.id,record.id);
 for(const invalid of [{...values[0],sourceHash:undefined},{...values[0],sourceHash:sha256('Grusse aus Koln')},{...values[0],reviewed:false}])assert.equal(localize(record,'en',{translation:translation([invalid])}).data.title,record.data.title);
 assert.equal(localize(record,'nl',{translation:translation(values)}).data.title,record.data.title);
 assert.equal(localize(record,'de',{translation:translation(values)}).data.title,record.data.title);
 assert.equal(localize(record,'en',{translation:{...translation(values),sourceId:'page/other'}}).data.title,record.data.title);
 assert.equal(localize(record,'en',{translation:translation([value(['title'],'<script>still text</script>'),{path:['__proto__','polluted'],text:'yes',reviewed:true,sourceHash:sha256('yes')}])}).data.title,'<script>still text</script>');
 assert.equal({}.polluted,undefined);
});
test('New navigation/UI and package feature text paths use schemas; identifiers and link targets stay German-owned',async()=>{
 for(const [id,schema,file,required,excluded]of[
  ['site/navigation',siteSchemas.navigation,'site/navigation.json',['header',0,'label'],['header',0,'href']],
  ['site/ui',siteSchemas.ui,'site/ui.json',['base','navigation','languageLabel'],[]],
  ['package/spark',packageSchema,'packages/spark.json',['featureGroups',0,'items',0,'text'],['featureGroups',0,'items',0,'id']],
 ]){
  const data=schema.parse(JSON.parse(await readFile(new URL('../src/content/'+file,import.meta.url))));
  const fields=translatableFields({id,data,fields:textFields(schema,data)}).map(field=>JSON.stringify(field.path));
  assert.ok(fields.includes(JSON.stringify(required)),id);assert.ok(!fields.includes(JSON.stringify(excluded)),id);
 }
});
test('Language links preserve query/hash and every locale; media, downloads, API and external links stay intact',()=>{
 assert.equal(localizedHref('/kontakt/?a=1#form','en'),'/en/kontakt/?a=1#form');
 assert.equal(localizedHref('/en/kontakt/','nl'),'/nl/kontakt/');assert.equal(localizedHref('/nl/','de'),'/');
 assert.equal(localizedHref('/en?a=1#faq','nl'),'/nl/?a=1#faq');
 assert.equal(localeFromPath('/en/blog/'),'en');assert.equal(sourcePath('/nl/blog/'),'/blog/');
 for(const link of ['/assets/a.png','/media/formation.json','/api/contact','/api?x=1','/editor#tools','/editor/api','/download/file.pdf','//example.com','https://example.com','#faq','mailto:a@example.com'])assert.equal(localizedHref(link,'en'),link);
});
test('Translated Markdown rejects raw HTML, obfuscated/executable links and remote trackers before rendering',async()=>{
 for(const text of ['<script>alert(1)</script>','hello <img src=x onerror=alert(1)>','[evil](javascript:alert%281%29)','[evil](data:text/html,x)','![tracker](https://other.example/pixel.png)','[evil](//other.example)'])assert.throws(()=>markdownHtml(text));
 assert.match(await markdownHtml('## Überschrift\n\n**Fett** und [Kontakt](/kontakt/)'),/<h2>Überschrift<\/h2>[\s\S]*<strong>Fett<\/strong>/);
 assert.match(await markdownHtml('[Kontakt](/kontakt/?a=1#form)','nl'),/href="\/nl\/kontakt\/\?a=1#form"/);
});
test('Reviewed UI copy cannot escape the JSON-LD script element',()=>{
 const value={question:'</script><script>alert("I3")</script>'};
 const serialized=jsonScript(value);assert.ok(!serialized.includes('<'));assert.deepEqual(JSON.parse(serialized),value);
});
test('Markdown beginning with a heading remains translatable and every inline format mark survives the provider',async()=>{
 const owner={id:'post/a',revision:'r',data:{body:'## Ein neuer Absatz\n\n**Fett** *kursiv* ~~gestrichen~~ {o}Kontur{/o}'},fields:[{path:['body'],kind:'text', 'x-afe': {translatable:true},format:'markdown'}]},memory={entries:{}};
 const planned=plan({records:[owner],locale:'en',memory});assert.equal(planned.jobs.length,1);
 assert.ok(planned.toSend.every(segment=>!segment.text.includes('**')&&!segment.text.includes('~~')&&!segment.text.includes('{o}')));
 const result=await executeBatched(planned,fake(),{memory,maxChars:3000,budgetChars:3000});
 const text=result.values.get(owner.id).entries[0].text;assert.match(text,/\*\*Fett\*\* \*kursiv\* ~~gestrichen~~ \{o\}Kontur\{\/o\}/);
});
test('A provider that damages tokens is rejected and a later valid run can recover',async()=>{
 const owner={id:'page/a',revision:'r',data:{title:'Hallo {name}'},fields:[{path:['title'],kind:'text', 'x-afe': {translatable:true}}]},memory={entries:{}};
 const first=await executeBatched(plan({records:[owner],locale:'en',memory}),{id:'bad',async translate({texts}){return{texts:texts.map(()=> 'Broken'),billedCharacters:12};}},{memory});
 assert.equal(first.failedSegments,1);assert.equal(first.skippedFields,1);assert.equal(first.values.size,0);
 const recovered=await executeBatched(plan({records:[owner],locale:'en',memory}),fake(),{memory});assert.equal(recovered.skippedFields,0);assert.match(recovered.values.get(owner.id).entries[0].text,/\{name\}/);
});
test('Architecture guard: every production editorial read lives behind content.ts',async()=>{
 const root=new URL('../src/',import.meta.url);
 const walk=async dir=>{const files=[];for(const entry of await readdir(dir,{withFileTypes:true})){const file=new URL(entry.name+(entry.isDirectory()?'/':''),dir);if(entry.isDirectory())files.push(...await walk(file));else if(/\.(?:astro|[cm]?js|ts)$/.test(entry.name)&&!entry.name.includes('.test.'))files.push(file);}return files;};
 for(const file of await walk(root)){
  if(file.pathname.endsWith('/lib/content.ts'))continue;
  const source=await readFile(file,'utf8');
  assert.doesNotMatch(source,/\bgetCollection\s*\(|import\.meta\.glob\s*\([^)]*content\/|(?:from|import)\s*['"][^'"]*content\/[^'"]*\.(?:json|yaml|md)['"]/,file.pathname);
 }
});
test('Fake provider preserves protected tokens and exact billing; batching exhausts and resumes without paying twice',async()=>{
 const provider=translationProvider('fake');assert.equal(provider.id,'fake');assert.deepEqual(await fake().translate({target:'nl',texts:['Hallo ⟦0⟧']}),{texts:['[NL] Hallo ⟦0⟧'],billedCharacters:9});
 const owner={id:'site/ui',revision:'a'.repeat(64),data:{a:'Hallo {name}',b:'Wir {o}formen{/o} den {c}Himmel{/c}',c:'Ein weiterer langer Text. Noch ein Satz. Noch mehr Worte für mehrere Batches.'},fields:['a','b','c'].map(key=>({path:[key],kind:'text', 'x-afe': {translatable:true}}))};
 const memory={entries:{}};let calls=0;const counted={...provider,async translate(request){calls++;return provider.translate(request);}};
 const planned=plan({records:[owner],locale:'en',memory});
 const first=await executeBatched(planned,counted,{memory,maxChars:30,budgetChars:30});assert.ok(first.budgetExhausted);assert.ok(first.batches>0);assert.ok(first.sent<=30);
 const second=await executeBatched(plan({records:[owner],locale:'en',memory}),counted,{memory,maxChars:30,budgetChars:1000});
 assert.equal(second.remainingSegments,0);assert.ok(calls>1);assert.ok(second.sent<planned.chars);
 const merged=mergeIntoTranslations({records:[owner],locale:'en',values:second.values});
 assert.equal(merged[0].data.values.length,3);for(const entry of merged[0].data.values){assert.equal(entry.reviewed,false);assert.equal(entry.sourceHash,sha256(owner.data[entry.path[0]]));}
 assert.match(merged[0].data.values.find(v=>v.path[0]==='a').text,/\{name\}/);assert.match(merged[0].data.values.find(v=>v.path[0]==='b').text,/\{o\}.*\{\/o\}.*\{c\}.*\{\/c\}/);
});

test('package names are proper names: never offered for translation, and no translation of them is stored', async () => {
  const {translatableFields} = await import('../src/lib/translatable-fields.mjs');
  const {readdir, readFile} = await import('node:fs/promises');
  const pkg = {id: 'package/horizon', data: {displayName: 'HORIZON', description: 'Die individuelle Inszenierung', badge: 'Bestseller'}};
  const paths = translatableFields(pkg).map((field) => JSON.stringify(field.path ?? field));
  assert.ok(!paths.some((p) => p.includes('displayName')), paths.join(' '));
  const dir = new URL('../src/content/translations/', import.meta.url);
  for (const file of (await readdir(dir)).filter((name) => name.startsWith('package-')))
    assert.ok(!JSON.parse(await readFile(new URL(file, dir), 'utf8')).values.some((v) => v.path[0] === 'displayName'), file);
});
