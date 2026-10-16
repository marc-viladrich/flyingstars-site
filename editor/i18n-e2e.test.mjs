import {createFlyingStarsAdapter as translationSite} from './flyingstars-adapter.mjs';
import {fileURLToPath as translationRoot} from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {NativeBuilder} from './native-builder.mjs';
import {executeBatched, sha256, createTranslationCore} from './translation-core.mjs';
import {fake} from './translation-providers.mjs';
import {verifyPricingRuntime} from './i18n-runtime-proof.mjs';
import {i18nFixture} from './i18n-test-fixture.mjs';
const {plan,mergeIntoTranslations}=createTranslationCore(await translationSite(translationRoot(new URL('../',import.meta.url))));
const at=(data,path)=>path.reduce((value,key)=>value[key],data);
async function suggest(store,locale,ids) {
 let state=await store.state();const memory={entries:{}};
 const planned=plan({records:state.records,locale,memory,ids});
 const generated=await executeBatched(planned,fake(),{memory,maxChars:2500,budgetChars:100000});
 assert.equal(generated.skippedFields,0);assert.equal(generated.remainingSegments,0);
 const merged=mergeIntoTranslations({records:state.records,locale,values:generated.values});
 for(const change of merged)for(const value of change.data.values){assert.equal(value.reviewed,false);assert.equal(value.sourceHash,sha256(at(state.records.find(r=>r.id===change.data.sourceId).data,value.path)));}
 for(let start=0;start<merged.length;start+=50){const batch=merged.slice(start,start+50);state=await store.save({expectedHead:state.head,requestId:randomUUID(),changes:batch.filter(m=>!m.create).map(m=>({id:m.id,expectedRevision:m.expectedRevision,patches:[{path:[],value:m.data}]})),creates:batch.filter(m=>m.create).map(m=>({id:m.id,data:m.data})),deletes:[]});}
 return state;
}
async function review(store,id,field,text) {
 const state=await store.state(),record=state.records.find(r=>r.id===id),index=record.data.values.findIndex(value=>JSON.stringify(value.path)===JSON.stringify(field));
 assert.ok(index>=0);
 // Same values-array patch and explicit reviewedPaths shape sent by the editor.
 const values=structuredClone(record.data.values);values[index]={...values[index],text,reviewed:true};
 return store.save({expectedHead:state.head,requestId:randomUUID(),changes:[{id,expectedRevision:record.revision,reviewedPaths:[field],patches:[{path:['values'],value:values}]}],creates:[],deletes:[]});
}
test('Offline real Astro: EN/NL saved translations, review, public/editor eligibility, stale German changes and all routes', {timeout:180000}, async t=>{
 const {root,store}=await i18nFixture(t);
 const initial=await store.state();
 // Homepage references packages, FAQ, projects, clients, team and global records. Include all their owners.
 const ids=initial.records.filter(record=>record.id==='page/index'||/^(site|screen|package|faq|post|project|client|team)\//.test(record.id)).map(record=>record.id);
 let state=await suggest(store,'en',ids);
 const field=['sections',0,'headline'],other=['sections',0,'text'];
 const german=at(state.records.find(r=>r.id==='page/index').data,other);
 const machine=state.records.find(r=>r.id==='translation/page-index-en').data.values.find(value=>JSON.stringify(value.path)===JSON.stringify(other)).text;
 state=await review(store,'translation/page-index-en',field,'Reviewed English homepage I3');
 assert.equal(state.records.find(r=>r.id==='translation/page-index-en').data.values.find(v=>JSON.stringify(v.path)===JSON.stringify(field)).reviewed,true);
 const publicBuilder=new NativeBuilder(store,root,{editor:false,origin:'https://fixture.example',runtimeName:'public'});
 let artifact=await publicBuilder.build(state.head);
 const html=await fs.readFile(path.join(artifact.site,'en/index.html'),'utf8');
 assert.match(html,/<html lang="en"/);assert.match(html,/Reviewed English homepage I3/);
 for(const locale of ['de','en','nl','x-default'])assert.match(html.split('</head>')[0],new RegExp(`rel="alternate" hreflang="${locale}"`));
 assert.match(html,/<link rel="canonical" href="https:\/\/fixture\.example\/en\/"/);
 assert.ok(html.includes(german));assert.ok(!html.includes(machine));assert.doesNotMatch(html,/\[EN\]|data-afe|data-native-|\/editor\/frame/);
 assert.match(html,/lang="de"[^>]*>Über 150 Drohnenshows/);
 assert.match(html,/href="\/en\/projekte\/"/);assert.match(html,/href="\/nl\/"[^>]*lang="nl"/);
 const editorBuilder=new NativeBuilder(store,root,{editor:true,origin:'https://fixture.example',runtimeName:'editor'});
 const privateArtifact=await editorBuilder.build(state.head),privateHtml=await fs.readFile(path.join(privateArtifact.site,'en/index.html'),'utf8');
 await verifyPricingRuntime(await fs.readFile(path.join(privateArtifact.site,'en/drohnenshow-preise/index.html'),'utf8'));
 assert.ok(privateHtml.includes(machine));// Translated output stays bound to the German source record; the frame marks machine suggestions at runtime.
 assert.match(privateHtml,/&quot;owner&quot;:\{&quot;collection&quot;:&quot;pages&quot;,&quot;id&quot;:&quot;index&quot;\}/);assert.doesNotMatch(privateHtml,/&quot;id&quot;:&quot;(?:en|nl)\//);assert.doesNotMatch(privateHtml,/data-native-/);
 for(const file of ['en/drohnenshow-preise/index.html','en/show-konfigurator/index.html','en/blog/index.html','nl/drohnenshow-preise/index.html','nl/show-konfigurator/index.html'])await fs.access(path.join(artifact.site,file));
 const configHtml=await fs.readFile(path.join(artifact.site,'en/show-konfigurator/index.html'),'utf8');assert.match(configHtml,/<meta name="robots" content="noindex"/);assert.match(configHtml,/data-runtime=/);
 const sitemap=await fs.readFile(path.join(artifact.site,'sitemap-0.xml'),'utf8');
 assert.match(sitemap,/hreflang="en"/);assert.match(sitemap,/hreflang="nl"/);assert.match(sitemap,/hreflang="x-default"/);assert.doesNotMatch(sitemap,/show-konfigurator/);
 const showcase=state.records.find(record=>record.id.startsWith('project/')&&record.data.showcase),slug=showcase.id.slice(8);
 await assert.rejects(fs.access(path.join(artifact.site,'en/projekte',slug,'index.html')));
 const canonical=await fs.readFile(path.join(artifact.site,'en',showcase.data.showcase.route,'index.html'),'utf8');
 assert.ok(canonical.includes(`rel="canonical" href="https://fixture.example/en/${showcase.data.showcase.route}/"`));
 const htaccess=await fs.readFile(path.join(artifact.site,'.htaccess'),'utf8');
 assert.ok(htaccess.includes(`RewriteRule ^en/projekte/${slug}/?$ /en/${showcase.data.showcase.route}/ [R=301,L]`));
 assert.ok(!sitemap.includes(`/projekte/${slug}/`));
 const source=state.records.find(r=>r.id==='page/index');
 state=await store.save({expectedHead:state.head,requestId:randomUUID(),changes:[{id:source.id,expectedRevision:source.revision,patches:[{path:field,value:'Geänderte deutsche Startüberschrift I3'}]}]});
 artifact=await publicBuilder.build(state.head);const staleHtml=await fs.readFile(path.join(artifact.site,'en/index.html'),'utf8');
 assert.match(staleHtml,/Geänderte deutsche Startüberschrift I3/);assert.doesNotMatch(staleHtml,/Reviewed English homepage I3/);
 state=await suggest(store,'nl',['page/index','site/navigation']);
 state=await review(store,'translation/page-index-nl',field,'Reviewed Dutch homepage I3');
 artifact=await publicBuilder.build(state.head);const dutch=await fs.readFile(path.join(artifact.site,'nl/index.html'),'utf8');
 assert.match(dutch,/<html lang="nl"/);assert.match(dutch,/Reviewed Dutch homepage I3/);assert.doesNotMatch(dutch,/\[NL\]/);
 // Validate translated Markdown through the real store, not only the renderer.
 const faq=state.records.find(r=>r.id.startsWith('faq/')),id='translation/'+faq.id.replaceAll('/','-')+'-en';
 const before=await store.head();await assert.rejects(review(store,id,['body'],'<script>alert(1)</script>'),/HTML|Skript/);assert.equal(await store.head(),before);
 state=await review(store,id,['body'],'**Reviewed FAQ Markdown I3** and [Contact](/kontakt/).');
 artifact=await publicBuilder.build(state.head);const faqHtml=await fs.readFile(path.join(artifact.site,'en/faq/index.html'),'utf8');
 assert.match(faqHtml,/<strong>Reviewed FAQ Markdown I3<\/strong>/);
 assert.match(faqHtml,/href="\/en\/kontakt\/"/);
 state=await review(store,'translation/site-ui-en',['prices','faq','items',0,'question'],'</script><script>alert("I3 reviewed copy")</script>');
 artifact=await publicBuilder.build(state.head);
 const safePrice=await fs.readFile(path.join(artifact.site,'en/drohnenshow-preise/index.html'),'utf8');
 assert.ok(!safePrice.includes('<script>alert("I3 reviewed copy")'));
 assert.ok(safePrice.includes('\\u003c/script>\\u003cscript>'));
 t.diagnostic('All builds use a committed fixture image passthrough; no page or network-dependent assertion was skipped.');
});
