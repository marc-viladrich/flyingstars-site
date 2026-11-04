import {sharedPaths,localeOf} from '../src/i18n/transaction.mjs';
import path from 'node:path';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {z} from 'zod';
import {fieldPolicy} from '../src/i18n/field-policy.mjs';
import {createExtensionRegistry,LegacySourceAdapter} from 'astro-frontend-editor/runtime/extensions';
import {mediaHooks} from './design/media.mjs';
import {templates} from './design/templates.mjs';
import {routeTools} from './extensions/flyingstars/web/routing.mjs';
import {localeTransactions} from './design/locale-transactions.mjs';
export {compatibility} from './extensions/flyingstars/runtime-compatibility.mjs';

/** The visitor schema is authoritative. Old package/site/translation records are deliberately not registered. */
export async function createFlyingStarsAdapter(root) {
 const {contentSchemas,sectionSchema}=await import(pathToFileURL(path.join(root,'src/schemas/content-schema.mjs')));
 const types=Object.entries(contentSchemas).map(([directory,schema])=>({
  prefix:directory==='pages'?'page':directory==='posts'?'post':directory==='projects'?'project':'faq',directory,
  extension:directory==='pages'?'yaml':'md',format:directory==='pages'?'yaml':'markdown',
  schema:directory==='pages'?schema:schema.extend({body:fieldPolicy(z.string().describe('Artikeltext').meta({'x-afe':{format:'markdown'}}), 'translatable')}).meta(schema.meta()),
  // Locale triplets and structural edits need coordinated review. This adapter updates existing records only.
  title:directory,
 }));
 const {personSchema}=await import(pathToFileURL(path.join(root,'src/schemas/person.mjs')));
 types.push({prefix:'person',directory:'people',extension:'json',format:'json',title:'Person',schema:personSchema});
 types.push({prefix:'media',directory:'editor-media',extension:'json',format:'json',title:'Mediathek',create:true,remove:true,schema:z.object({title:fieldPolicy(z.string(), 'translatable'),src:fieldPolicy(z.string().regex(/^\/assets\/[a-f0-9]{64}\.(?:png|jpg|webp)$/), 'shared'),defaultAlt:fieldPolicy(z.string(), 'translatable'),width:fieldPolicy(z.number().int().positive(), 'shared'),height:fieldPolicy(z.number().int().positive(), 'shared'),mime:fieldPolicy(z.enum(['image/png','image/jpeg','image/webp']), 'shared')}).strict().meta({'x-afe':{collection:{label:'Bild',title:['title'],operations:['create','update','delete']}}})});
 const recordId=/^(page|post|project|faq|media|person)\/((?:(?:en|nl)\/)?[a-z0-9]+(?:-[a-z0-9]+)*)$/;
 const {navigationSchema}=await import(pathToFileURL(path.join(root,'src/schemas/navigation.mjs')));
 const {showPackagesSchema}=await import(pathToFileURL(path.join(root,'src/schemas/show-packages.mjs')));
 const {contactSchema}=await import(pathToFileURL(path.join(root,'src/schemas/contact.mjs')));
 const {showDurationSchema}=await import(pathToFileURL(path.join(root,'src/schemas/show-duration.mjs')));
 const {previewPolicySchema}=await import(pathToFileURL(path.join(root,'src/schemas/preview-policy.mjs')));
 const {showExtrasSchema}=await import(pathToFileURL(path.join(root,'src/schemas/show-extras.mjs')));
 const {businessFactsSchema}=await import(pathToFileURL(path.join(root,'src/schemas/business-facts.mjs')));
 const {projectFactsSchema}=await import(pathToFileURL(path.join(root,'src/schemas/project-facts.mjs')));
 const {safetyConceptSchema,sustainabilityPillarsSchema}=await import(pathToFileURL(path.join(root,'src/schemas/shared-blocks.mjs')));
 const sharedSources={'site/safety-concept':{collection:'safetyConcept',file:'safety-concept',schema:safetyConceptSchema,title:'Sicherheitskonzept Outdoor'},'site/sustainability-pillars':{collection:'sustainabilityPillars',file:'sustainability-pillars',schema:sustainabilityPillarsSchema,title:'Nachhaltigkeitspunkte'}};
 const ui=JSON.parse(readFileSync(path.join(root,'src/i18n/ui.json'),'utf8'));
 const uiSchema=z.object(Object.fromEntries(Object.keys(ui).map(key=>[key,z.object({de:fieldPolicy(z.string().min(1), 'translatable'),en:fieldPolicy(z.string().min(1), 'translatable'),nl:fieldPolicy(z.string().min(1), 'translatable')}).strict()]))).strict();
 const sourceFor=id=>{if(Object.hasOwn(sharedSources,id)){const s=sharedSources[id];return {id,prefix:'site',address:{collection:s.collection,id:'configuration'},file:`src/content/${s.file}.json`,locator:{kind:'document'},format:'json',schema:s.schema};}if(id==='site/project-facts')return {id,prefix:'site',address:{collection:'projectFacts',id:'configuration'},file:'src/content/project-facts.json',locator:{kind:'document'},format:'json',schema:projectFactsSchema};if(id==='site/business-facts')return {id,prefix:'site',address:{collection:'businessFacts',id:'configuration'},file:'src/content/business-facts.json',locator:{kind:'document'},format:'json',schema:businessFactsSchema};if(id==='site/show-extras')return {id,prefix:'site',address:{collection:'showExtras',id:'configuration'},file:'src/content/show-extras.json',locator:{kind:'document'},format:'json',schema:showExtrasSchema};if(id==='site/preview-policy')return {id,prefix:'site',address:{collection:'previewPolicy',id:'configuration'},file:'src/content/preview-policy.json',locator:{kind:'document'},format:'json',schema:previewPolicySchema};if(id==='site/show-duration')return {id,prefix:'site',address:{collection:'showDuration',id:'configuration'},file:'src/content/show-duration.json',locator:{kind:'document'},format:'json',schema:showDurationSchema};if(id==='site/contact')return {id,prefix:'site',address:{collection:'contact',id:'configuration'},file:'src/content/contact.json',locator:{kind:'document'},format:'json',schema:contactSchema};if(id==='site/navigation')return {id,prefix:'site',address:{collection:'siteNavigation',id:'configuration'},file:'src/content/navigation.json',locator:{kind:'document'},format:'json',schema:navigationSchema};if(id==='package/configuration')return {id,prefix:'package',address:{collection:'showPackages',id:'configuration'},file:'src/content/show-packages.json',locator:{kind:'document'},format:'json',schema:showPackagesSchema};if(id==='site/ui')return {id,prefix:'site',address:{collection:'siteUi',id:'ui'},file:'src/i18n/ui.json',locator:{kind:'document'},format:'json',schema:uiSchema};const match=recordId.exec(id);if(!match)return null;const type=types.find(t=>t.prefix===match[1]);return {...type,id,address:{collection:type.directory,id:match[2]},locator:{kind:'document'},file:`src/content/${type.directory}/${match[2]}.${type.extension}`};};
 const sourcesFromFiles=files=>files.flatMap(file=>{const shared=Object.keys(sharedSources).find(id=>file===`src/content/${sharedSources[id].file}.json`);if(shared)return [sourceFor(shared)];if(file==='src/content/project-facts.json')return [sourceFor('site/project-facts')];if(file==='src/content/business-facts.json')return [sourceFor('site/business-facts')];if(file==='src/content/show-extras.json')return [sourceFor('site/show-extras')];if(file==='src/content/preview-policy.json')return [sourceFor('site/preview-policy')];if(file==='src/content/show-duration.json')return [sourceFor('site/show-duration')];if(file==='src/content/contact.json')return [sourceFor('site/contact')];if(file==='src/content/navigation.json')return [sourceFor('site/navigation')];if(file==='src/content/show-packages.json')return [sourceFor('package/configuration')];if(file==='src/i18n/ui.json')return [sourceFor('site/ui')];const type=types.find(t=>file.startsWith(`src/content/${t.directory}/`)&&file.endsWith('.'+t.extension));if(!type)return [];const id=type.prefix+'/'+file.slice(`src/content/${type.directory}/`.length,-type.extension.length-1),source=sourceFor(id);return source?[source]:[];});
 const {contentRoute}=await import(pathToFileURL(path.join(root,'src/i18n/public-routes.mjs')));
 const recordRoute=record=>{const source=sourceFor(record.id);return source?contentRoute(source.address.collection,source.address.id,record.data):null;};
 const {LEGACY_MEDIA_ORIGIN,LEGACY_MEDIA_HOSTS}=await import(pathToFileURL(path.join(root,'src/site-policy.mjs')));
 const site={label:'FlyingStars · Designsprache',types,sourceFor,sourcesFromFiles,recordId,recordRoute,sectionSchema,sectionPolicy:{},
  editorialHref:/^(?:(?:https?:|mailto:|tel:)\/?.*|\/(?!\/)[^\s]*|#[^\s]*)$/,
  createSourceAdapter:options=>new LegacySourceAdapter(options),previewPrefix:routeTools.previewPrefix,
  contentRoot:'src',contentCollections:types.map(t=>`src/content/${t.directory}/`),assetRoot:'public/assets',
  mediaOrigin:LEGACY_MEDIA_ORIGIN,mediaHosts:LEGACY_MEDIA_HOSTS,
  requiredOutput:['index.html','drohnenshow-preise/index.html','en/index.html','nl/index.html'],
  login:{layout:'split',logo:{src:'editor/login/logo.svg',alt:'FlyingStars'},image:{src:'editor/login/show.jpg',alt:''},imageFocus:'50% 45%',accent:'#111114'},
  browserFiles:{'/src/content/offer-core.mjs':'src/content/offer-core.mjs','/src/lib/price-core.mjs':'src/lib/price-core.mjs','/src/i18n/contract.mjs':'src/i18n/contract.mjs','/src/i18n/contract-dependencies.mjs':'src/i18n/contract-dependencies.mjs','/src/i18n/transaction.mjs':'src/i18n/transaction.mjs','/src/i18n/field-policy.mjs':'src/i18n/field-policy.mjs','/src/i18n/sha256.mjs':'src/i18n/sha256.mjs','/src/i18n/keys.mjs':'src/i18n/keys.mjs','/src/i18n/ui.json':'src/i18n/ui.json','/src/i18n/ui-core.mjs':'src/i18n/ui-core.mjs','/src/i18n/routing.mjs':'src/i18n/routing.mjs','/src/content/project-facts.mjs':'src/content/project-facts.mjs','/src/content/project-facts.json':'src/content/project-facts.json','/src/content/contact.mjs':'src/content/contact.mjs','/src/content/contact.json':'src/content/contact.json','/src/content/show-duration.mjs':'src/content/show-duration.mjs','/src/content/show-duration.json':'src/content/show-duration.json','/src/content/show-extras.mjs':'src/content/show-extras.mjs','/src/content/show-extras.json':'src/content/show-extras.json','/src/content/business-facts.mjs':'src/content/business-facts.mjs','/src/content/business-facts.json':'src/content/business-facts.json','/src/lib/price.mjs':'src/lib/price.mjs','/src/i18n/routing.mjs':'src/i18n/routing.mjs','/browser-site.mjs':'editor/browser-site.mjs','/design/browser-site.mjs':'editor/design/browser-site.mjs','/design/locale-review.mjs':'editor/design/locale-review.mjs','/design/inline.mjs':'editor/design/inline.mjs','/design/media-browser.mjs':'editor/design/media-browser.mjs','/extensions/flyingstars/web/media-usage.mjs':'editor/extensions/flyingstars/web/media-usage.mjs','/extensions/flyingstars/web/record-kinds.mjs':'editor/extensions/flyingstars/web/record-kinds.mjs','/extensions/flyingstars/web/routing.mjs':'editor/extensions/flyingstars/web/routing.mjs','/extensions/flyingstars/web/preview.mjs':'editor/extensions/flyingstars/web/preview.mjs'},
 };
 site.extensions=createExtensionRegistry([{name:'flyingstars/design',contractVersion:'1.0',hooks:{
  templates,...mediaHooks,
  resolveReference:(records,value,reference)=>records.find(r=>r.address?.collection===reference?.collection&&r.address.id===value),
  title:(source,data)=>sharedSources[source.id]?.title??(source.id==='site/project-facts'?'Historische Projektfakten':source.id==='site/business-facts'?'Geschäftsfakten':source.id==='site/show-extras'?'Extras und Sonderangebote':source.id==='site/preview-policy'?'Vorschaupolicy · nicht freigegebene Preise':source.id==='site/show-duration'?'Showzeiten':source.id==='site/contact'?'Kontakt':source.id==='site/navigation'?'Navigation':source.id==='site/ui'?'Website-Texte':source.id==='package/configuration'?'Show-Pakete':data.name||data.title||data.question||source.id),
  route:recordRoute,
  omitField:(_source,_data,field)=>['translationSourceHash','translationContractVersion','translationEvidence'].includes(field[0])||field.at(-1)==='_key',
  readOnlyPaths:(source,data)=>localeOf(source.id)?sharedPaths(source.schema,data):[],
  ...localeTransactions(root,sourceFor),
  buildEnvironment:({editor,origin,imageCache})=>({SITE_URL:origin,...editor?{AFE_MODE:'editor'}:{},...imageCache?{FLYINGSTARS_IMAGE_CACHE_DIR:imageCache}:{}}),
  recordGroup:id=>id.split('/')[0],
  // Suggestions target the shared review dialog; the browser does not register overlay storage.
  languages:()=>({source:'de',locales:{en:'English',nl:'Nederlands'}}),
  navigation:records=>records.filter(r=>recordRoute(r)).map(r=>({value:recordRoute(r),label:r.title})),
 }}]);
 return site;
}
export {createFlyingStarsAdapter as createSite};
