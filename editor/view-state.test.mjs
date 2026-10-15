import test from 'node:test';import assert from 'node:assert/strict';import {normalizedRoute,navigationChoices,savedRecordRoute,publishNeedsActivation,mediaSourceChanged,fieldsInScope} from './web/view-state.mjs';
test('route reconciliation follows record identity, removes deleted/old routes and matches slashless links',()=>{const records=[{id:'page/index',route:'/',title:'Start'},{id:'project/one',route:'/new-project/',title:'Project'}];assert.equal(normalizedRoute('/new-project'),'/new-project/');assert.equal(normalizedRoute('/new-project/?q=1#title'),'/new-project/');assert.equal(savedRecordRoute(records,'project/one'),'/new-project/');assert.equal(savedRecordRoute(records,'page/deleted'),'/');assert.ok(!navigationChoices(records).some(option=>option.value==='/old-project/'));assert.ok(navigationChoices(records).some(option=>option.value==='/show-konfigurator/'));});
test('an already committed publication still offers recovery when static activation failed',()=>{assert.equal(publishNeedsActivation({publishedHead:'new',activePublishedHead:'old',changed:[]}),true);assert.equal(publishNeedsActivation({publishedHead:'new',activePublishedHead:'new',changed:[]}),false);});
test('alt text-only changes preserve native optimized image sources and source replacement is explicit',()=>{assert.equal(mediaSourceChanged('photo.webp','photo.webp'),false);assert.equal(mediaSourceChanged('photo.webp','replacement.webp'),true);});
test('media object scope includes per-use alt override and decorative flag without neighboring section fields',()=>{const fields=[{path:['sections',0,'image','altOverride'],kind:'text'},{path:['sections',0,'image','decorative'],kind:'boolean'},{path:['sections',0,'headline'],kind:'text'}];assert.deepEqual(fieldsInScope(fields,['sections',0,'image'],'media').map(f=>f.path.at(-1)),['altOverride','decorative']);});
import {sourceMediaSources} from './web/view-state.mjs';
test('source media identity comes from saved records and global assets rather than staged or optimized HTML URLs',()=>{const records=[{id:'media/a',data:{src:'/assets/source.webp',width:100,height:80}},{id:'page/index',containers:[{path:['sections',0,'image'],format:'image'}],data:{sections:[{image:{src:'cached-original.jpg',assetId:'media/a'}}],formation:{src:'formation.json',width:100,height:80}}}];assert.equal(sourceMediaSources(records)['page/index/["sections",0,"image"]'],'/assets/source.webp');});
import {floatingInspectorAllowed,richFormattingAllowed} from './web/view-state.mjs';
test('rich text owns its floating actions; inspector cannot cover its formatting buttons',()=>{assert.equal(floatingInspectorAllowed({rich:true}),false);assert.equal(floatingInspectorAllowed({rich:false}),true);assert.equal(floatingInspectorAllowed({rich:false},{busy:true}),false);});
test('formatting is permitted only in an editable German draft, never while saving or previewing',()=>{assert.equal(richFormattingAllowed({}),true);for(const state of [{busy:true},{preview:true},{locale:'en'},{locale:'nl'}])assert.equal(richFormattingAllowed(state),false);});
import {disclosedContainers,disclosedOptionalFields} from './web/view-state.mjs';
test('missing optional groups expose one group action and hide duplicate or descendant controls until enabled',()=>{const containers=[{path:['image'],kind:'object',format:'image'},{path:['image','caption'],kind:'object'}],fields=[{path:['image'],kind:'object'},{path:['image','assetId'],kind:'text'},{path:['image','altOverride'],kind:'text'},{path:['description'],kind:'text'}];assert.deepEqual(disclosedContainers(containers,{}).map(c=>c.path),[['image']]);assert.deepEqual(disclosedOptionalFields(fields,containers,{}).map(f=>f.path),[['description']]);assert.ok(disclosedOptionalFields(fields,containers,{image:{src:'photo'}}).some(f=>f.path.at(-1)==='altOverride'));});
import {inspectionTarget} from './web/view-state.mjs';
test('pointer, gear and keyboard inspection share section ownership for referenced collection records',()=>{const quote={id:'client/jade',path:['testimonial','quote']},section={id:'page/index',index:4};assert.deepEqual(inspectionTarget(quote,section),{id:'page/index',path:['sections',4],linkedId:'client/jade'});const own={id:'page/index',path:['sections',4,'headline'],derived:false};assert.deepEqual(inspectionTarget(own,section),own);assert.deepEqual(inspectionTarget({id:'package/spark',path:['price'],derived:true}),{id:'package/spark',path:['price'],derived:true});});
import {restoredInspector} from './web/view-state.mjs';
test('Undo keeps an inspector only when its original source is still valid; structural index selections close',()=>{const inspector={context:{id:'page/index',path:['sections',3,'showImages']},scope:'context'},records=[{id:'page/index'}];assert.equal(restoredInspector(inspector,records,{kind:'set',path:['sections',3,'showImages']}),inspector);assert.equal(restoredInspector(inspector,records,{kind:'set',path:['sections']}),null);assert.equal(restoredInspector(inspector,[],{kind:'create'}),null);assert.equal(restoredInspector({scope:'library'},records,{kind:'set',path:['title']}),null);});
import {mediaRecordFor,linkedRecordFor,itemSummary,imageSummary,instanceMarkers,sameOccurrence,scopeUnits,partitionUnits,covers} from './web/view-state.mjs';
const mediaRecords=[{id:'media/image-a',title:'Berlin Game',data:{title:'Berlin Game 2025',src:'/m/02.jpg',defaultAlt:'Stadion bei Nacht'}},{id:'package/horizon',title:'HORIZON',data:{displayName:'HORIZON'}}];
test('media usages resolve their library record by full id first, then by bare id',()=>{assert.equal(mediaRecordFor(mediaRecords,'media/image-a').id,'media/image-a');assert.equal(mediaRecordFor(mediaRecords,'image-a').id,'media/image-a');assert.equal(mediaRecordFor(mediaRecords,'image-x'),null);assert.equal(mediaRecordFor(mediaRecords,undefined),null);});
const referenceDescriptor=(key,collection)=>({itemLabel:[key],element:{kind:'object',properties:{[key]:{kind:'text','x-afe':{reference:{collection,encoding:'id'}}}}}});
test('explicit references resolve legacy full and bare IDs; names never infer a collection',()=>{
 assert.equal(linkedRecordFor(mediaRecords,{packageId:'horizon'},referenceDescriptor('packageId','packages')).id,'package/horizon');
 for(const id of ['media/image-a','image-a'])assert.equal(linkedRecordFor(mediaRecords,{assetId:id},referenceDescriptor('assetId','media')).id,'media/image-a');
 assert.equal(linkedRecordFor(mediaRecords,{packageId:'horizon'}),null);
 assert.equal(linkedRecordFor(mediaRecords,{unrelated:'horizon'},referenceDescriptor('unrelated','packages')).id,'package/horizon');
});
test('image items are named caption → effective alt → library title → file name → Eintrag N, with a thumbnail',()=>{
 const name=(entry,i=0)=>itemSummary(entry,i,{records:mediaRecords,image:true});
 assert.deepEqual(name({src:'/old.jpg',caption:'Berlin Game',alt:'x',assetId:'media/image-a'}),{label:'Berlin Game',thumb:'/m/02.jpg'});
 assert.equal(name({src:'/a.jpg',caption:' ',altOverride:'Hier anders',alt:'Eigener Alt',assetId:'image-a'}).label,'Hier anders');
 assert.equal(name({src:'/a.jpg',altOverride:null,alt:'Eigener Alt'}).label,'Eigener Alt');
 assert.equal(name({src:'/a.jpg',assetId:'media/image-a'}).label,'Stadion bei Nacht');
 assert.equal(itemSummary({src:'/a.jpg',assetId:'image-b'},0,{records:[{id:'media/image-b',data:{title:'Nur Titel',src:'/b.jpg'}}],image:true}).label,'Nur Titel');
 assert.deepEqual(name({src:'https://cdn.example/media/projekte/nfl/03%20final.jpg'},2),{label:'03 final.jpg',thumb:'https://cdn.example/media/projekte/nfl/03%20final.jpg'});
 assert.deepEqual(name({},4),{label:'Eintrag 5',thumb:null});
});
test('other entries keep their linked record or own name; image-bearing entries fall back to their image',()=>{
 const opts={records:mediaRecords,recordName:r=>r.data.displayName};
 assert.equal(itemSummary({packageId:'horizon',showOrb:true},1,{...opts,...referenceDescriptor('packageId','packages')}).label,'HORIZON');
 assert.equal(itemSummary({title:'Ablauf',text:'x'},0,{...opts,itemLabel:['title']}).label,'Ablauf');
 assert.deepEqual(itemSummary({text:'ohne Namen'},0,{...opts,imageChild:{src:'/p.jpg',caption:'Porträt'}}),{label:'Porträt',thumb:'/p.jpg'});
 assert.deepEqual(itemSummary({name:'Jana'},0,{...opts,itemLabel:['name'],imageChild:{src:'/p.jpg'}}),{label:'Jana',thumb:'/p.jpg'});
 assert.equal(itemSummary('Fakt',3).label,'Fakt');assert.equal(itemSummary('',3).label,'Eintrag 4');assert.equal(itemSummary({},0).label,'Eintrag 1');
});
// A pricing card: page/index tiers[1] renders package/horizon.
const page='page/index',tier=['sections',4,'tiers',1],pkg='package/horizon';
const tierData={sections:{4:{tiers:{1:{packageId:'horizon',showOrb:true,featureIds:[],cta:{label:'Paket ansehen',href:'/preise/'}}}}}};
const tierScope={data:tierData,prefix:tier,fields:[{path:[...tier,'packageId'],kind:'enum'},{path:[...tier,'showOrb'],kind:'boolean'},{path:[...tier,'cta','label'],kind:'text'},{path:[...tier,'cta','href'],kind:'text'}],containers:[{path:[...tier,'featureIds'],kind:'array',reference:true,candidates:7},{path:[...tier,'cta'],kind:'object',optional:true,template:{label:'',href:''}}]};
const cardMarkers=[{id:page,path:[...tier,'packageId'],kind:'uses'},{id:page,path:[...tier,'cta','href'],kind:'uses'},{id:page,path:[...tier,'showOrb'],kind:'uses'},{id:pkg,path:['displayName'],kind:'field'},{id:pkg,path:['price'],kind:'derived'},{id:pkg,path:['highlight'],kind:'uses'},{id:pkg,path:['color'],kind:'uses'}];
test('an instance shows what its card renders; the unrendered rest is exactly "Weitere Felder (N)"',()=>{
 const own=partitionUnits(scopeUnits(tierScope),cardMarkers,{id:page,path:tier});
 assert.deepEqual(own.shown.map(u=>u.path.slice(4).join('.')),['packageId','showOrb','cta.href']);
 // empty Leistungen selection renders nothing: the whole picker (with its catalogue) is one hidden control; cta.label is not rendered either
 assert.deepEqual(own.more.map(u=>u.kind+':'+u.path.slice(4).join('.')),['array:featureIds','field:cta.label']);assert.equal(own.count,2);
});
test('a rendered selection stays visible and only the unchosen candidates move into Weitere Felder',()=>{
 const markers=[...cardMarkers,...instanceMarkers([{id:pkg,path:['featureGroups',0,'items',1,'text'],kind:'field',via:{id:page,path:[...tier,'featureIds',0]}}],page)];
 const own=partitionUnits(scopeUnits(tierScope),markers,{id:page,path:tier});
 assert.ok(own.shown.some(u=>u.kind==='array'&&u.path.at(-1)==='featureIds'));
 assert.deepEqual(own.more.map(u=>u.kind),['candidates','field']);assert.equal(own.count,2);
 assert.ok(!markers.some(m=>m.id===pkg&&m.path[0]==='featureGroups'),'the shown Leistung is the entry, not a package text field');
 const allChosen=partitionUnits(scopeUnits({...tierScope,containers:[{...tierScope.containers[0],candidates:0},tierScope.containers[1]]}),markers,{id:page,path:tier});assert.equal(allChosen.count,1);
});
test('mixed owners: the shared record shows only rendered fields, canvas text stays on the canvas, foreign records are ignored',()=>{
 const shared=scopeUnits({data:{displayName:'HORIZON',price:15900,dur:'13 Min',highlight:true,color:[1,2,3],featureGroups:[{}]},fields:[{path:['displayName'],kind:'text',inline:true},{path:['price'],kind:'number'},{path:['dur'],kind:'text'},{path:['highlight'],kind:'boolean'},{path:['color',0],kind:'number'},{path:['color',1],kind:'number'},{path:['color',2],kind:'number'}],containers:[{path:['featureGroups'],kind:'array'}]});
 const markers=[...cardMarkers,{id:'client/other',path:['name'],kind:'field'},{id:pkg,path:['dur'],kind:'uses'}];
 assert.deepEqual(partitionUnits(shared,markers,{id:pkg,path:[]}).shown.map(u=>u.path.join('.')),['price','dur','highlight','color.0','color.1','color.2']);
 assert.deepEqual(partitionUnits(shared,markers,{id:pkg,path:[]},{includeInline:true}).shown[0].path,['displayName']);
});
test('duplicate occurrences: two cards of the same package never share their own entries',()=>{
 const other=['sections',4,'tiers',0];
 const markers=[{id:page,path:[...other,'showOrb'],kind:'uses'},{id:page,path:[...other,'featureIds',0],kind:'entry'},{id:page,path:tier,kind:'entry'}];
 const own=partitionUnits(scopeUnits(tierScope),markers,{id:page,path:tier});
 assert.equal(own.shown.length,0,'neither the sibling card nor the own wrapper entry marks anything as rendered');
 assert.equal(sameOccurrence({section:{id:page,index:4},entry:{id:page,path:tier},record:pkg},{section:{id:page,index:4},entry:{id:page,path:other},record:pkg}),false);
 assert.equal(sameOccurrence({section:{id:page,index:2},entry:{id:page,path:['sections',2,'facts',1]}},{section:{id:page,index:2},entry:{id:page,path:['sections',2,'facts',1]}}),true);
 assert.equal(sameOccurrence({section:{id:page,index:7},record:'project/a'},{section:{id:page,index:7},record:'project/b'}),false);
 assert.deepEqual(instanceMarkers([{id:pkg,path:['dur'],kind:'uses'},{id:pkg,path:['dur'],kind:'uses'}],page).length,1);
});
test('absent optionals are units of their own: switches with a rendered default show, everything else counts once',()=>{
 const data={sections:{4:{tiers:{1:{packageId:'horizon',featureIds:[]}}}}};
 const units=scopeUnits({...tierScope,data,fields:tierScope.fields.filter(f=>!/showOrb|cta/.test(f.path.join('.'))),optionalFields:[{path:[...tier,'showOrb'],kind:'boolean'},{path:[...tier,'cta','label'],kind:'text'}]});
 assert.deepEqual(units.map(u=>u.kind+':'+u.path.slice(4).join('.')),['field:packageId','array:featureIds','add:cta','variant:showOrb']);
 const own=partitionUnits(units,cardMarkers,{id:page,path:tier});
 assert.deepEqual(own.shown.map(u=>u.path.at(-1)),['packageId','showOrb']);assert.deepEqual(own.more.map(u=>u.kind),['array','add']);assert.equal(own.count,2);
});
test('a query-backed card is an occurrence of its whole record; media and derived markers count as rendered',()=>{
 const id='project/nfl',data={title:'NFL',cover:{src:'/c.jpg',assetId:'media/a'},showcase:{category:'Sport',cardTitle:'NFL',route:'nfl',drones:500,gallery:[{src:'/g.jpg'}]}};
 const units=scopeUnits({data,fields:[{path:['title'],kind:'text'},{path:['showcase','category'],kind:'text',inline:true},{path:['showcase','cardTitle'],kind:'text',inline:true},{path:['showcase','route'],kind:'text'},{path:['showcase','drones'],kind:'number'},{path:['showcase','gallery',0,'caption'],kind:'text'}],containers:[{path:['cover'],kind:'object',media:true},{path:['showcase'],kind:'object'},{path:['showcase','gallery'],kind:'array'},{path:['showcase','gallery',0],kind:'object',media:true}]});
 const markers=[{id,path:['cover'],kind:'media'},{id,path:['showcase','category'],kind:'field'},{id,path:['showcase','route'],kind:'uses'},{id,path:['showcase','drones'],kind:'uses'}];
 const result=partitionUnits(units,markers,{id,path:[]});
 assert.deepEqual(result.shown.map(u=>u.path.join('.')),['cover','showcase.route','showcase.drones']);
 assert.deepEqual(result.more.map(u=>u.path.join('.')),['title','showcase.cardTitle','showcase.gallery']);assert.equal(result.count,3);
 assert.ok(covers(['color'],['color',1])&&covers(['cta','href'],['cta'])&&!covers(['cta','href'],['cta','label']));
});
