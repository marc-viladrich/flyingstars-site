import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {z} from 'zod';
import {createExtensionRegistry,LegacySourceAdapter} from 'astro-frontend-editor/runtime/extensions';
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
  schema:directory==='pages'?schema:schema.extend({body:z.string().meta({'x-afe':{format:'markdown'}})}),
  // Locale triplets and structural edits need coordinated review. This adapter updates existing records only.
  title:directory,
 }));
 const recordId=/^(page|post|project|faq)\/((?:(?:en|nl)\/)?[a-z0-9]+(?:-[a-z0-9]+)*)$/;
 const sourceFor=id=>{const match=recordId.exec(id);if(!match)return null;const type=types.find(t=>t.prefix===match[1]);return {...type,id,address:{collection:type.directory,id:match[2]},locator:{kind:'document'},file:`src/content/${type.directory}/${match[2]}.${type.extension}`};};
 const sourcesFromFiles=files=>files.flatMap(file=>{const type=types.find(t=>file.startsWith(`src/content/${t.directory}/`)&&file.endsWith('.'+t.extension));if(!type)return [];const id=type.prefix+'/'+file.slice(`src/content/${type.directory}/`.length,-type.extension.length-1),source=sourceFor(id);return source?[source]:[];});
 const recordRoute=record=>{const source=sourceFor(record.id);if(!source)return null;const parts=source.address.id.split('/'),locale=parts.length===2?parts.shift():'de',slug=parts[0],prefix=locale==='de'?'':'/'+locale;
  if(source.prefix==='page')return prefix+(slug==='index'?'/':'/'+slug+'/');
  if(source.prefix==='post')return prefix+'/blog/'+slug+'/';
  if(source.prefix==='project'&&record.data.showcase)return prefix+'/'+record.data.showcase.route+'/';
  return null;
 };
 const site={label:'FlyingStars · Designsprache',types,sourceFor,sourcesFromFiles,recordId,recordRoute,sectionSchema,sectionPolicy:{},
  editorialHref:/^(?:(?:https?:|mailto:|tel:)\/?.*|\/(?!\/)[^\s]*|#[^\s]*)$/,
  createSourceAdapter:options=>new LegacySourceAdapter(options),previewPrefix:routeTools.previewPrefix,
  contentRoot:'src/content',contentCollections:types.map(t=>`src/content/${t.directory}/`),assetRoot:'public/assets',
  mediaOrigin:'https://flyingstars.art',mediaHosts:['flyingstars.art','flyingstars-relaunch.vercel.app'],
  requiredOutput:['index.html','drohnenshow-preise/index.html','en/index.html','nl/index.html'],
  login:{layout:'split',logo:{src:'editor/login/logo.svg',alt:'FlyingStars'},image:{src:'editor/login/show.jpg',alt:''},imageFocus:'50% 45%',accent:'#111114'},
  browserFiles:{'/browser-site.mjs':'editor/design/browser-site.mjs','/design/browser-site.mjs':'editor/design/browser-site.mjs','/extensions/flyingstars/web/routing.mjs':'editor/extensions/flyingstars/web/routing.mjs'},
 };
 site.extensions=createExtensionRegistry([{name:'flyingstars/design',contractVersion:'1.0',hooks:{
  templates,
  title:(source,data)=>data.title||data.question||source.id,
  route:recordRoute,
  omitField:(_source,_data,field)=>field[0]==='translationSourceHash',
  validateWrite:localeTransactions(root,sourceFor).validateWrite,
  ...localeTransactions(root,sourceFor),
  buildEnvironment:({editor,origin,imageCache})=>({SITE_URL:origin,...editor?{AFE_MODE:'editor'}:{},...imageCache?{FLYINGSTARS_IMAGE_CACHE_DIR:imageCache}:{}}),
  recordGroup:id=>id.split('/')[0],
  // Automatic overlay translation is intentionally unavailable. The actual EN/NL files are ordinary records.
  languages:()=>({source:'de',locales:{}}),
  navigation:records=>records.filter(r=>recordRoute(r)).map(r=>({value:recordRoute(r),label:r.title})),
 }}]);
 return site;
}
export {createFlyingStarsAdapter as createSite};
