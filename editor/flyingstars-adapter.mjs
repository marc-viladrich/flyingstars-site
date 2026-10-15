import {mediaUsers} from './web/media-usage.mjs';
import {resolveReference,omitOwnedField} from './web/site-adapter.mjs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {LegacySourceAdapter} from './legacy-source-adapter.mjs';
import {describeSchema,unwrap} from './native-schema.mjs';

import {legacyCollections,siteAddresses} from '../src/lib/content-addresses.mjs';

/** Only this adapter loads the pilot's schemas and source services.
 * @param {string} root Absolute site root, supplied by the composition root.
 */
export async function createFlyingStarsAdapter(root) {
 const load=relative=>import(pathToFileURL(path.join(root,relative)));const {pageSchema,sectionSchema,editorialHref}=await load('src/schemas/page-schema.mjs'),{packageSchema}=await load('src/content/package-schema.mjs'),{screenSchema}=await load('src/content/screen-schema.mjs');const sectionPolicy=(await load('src/schemas/section-policy.mjs')).sectionPolicy;const recordRoute=(await load('src/lib/editorial-routes.mjs')).recordRoute;const packageOwnership=(await load('src/content/package-ownership.mjs')).packageOwnedPagePath;
 const types=[{prefix:'page',directory:'pages',extension:'yaml',schema:pageSchema,format:'yaml',title:'Seite',create:true,remove:true},{prefix:'package',directory:'packages',extension:'json',schema:packageSchema,format:'json',title:'Paket'},{prefix:'screen',directory:'screens',extension:'json',schema:screenSchema,format:'json',title:'Systemseite'}];
 {const schemas=await load('src/schemas/collection-schema.mjs');for(const[prefix,directory,name,title]of[['post','posts','postSchema','Blogartikel'],['project','projects','projectSchema','Projekt'],['faq','faq','faqSchema','FAQ']])types.push({prefix,directory,extension:'md',schema:schemas[name].extend({body:schemas.markdownBodySchema||unwrap(pageSchema.shape.sections).element.options.find(s=>s.shape.type._def.values[0]==='textMedia').shape.body}).meta(schemas[name].meta?.()||{}),format:'markdown',title,create:true,remove:true});}
 {const schemas=await load('src/schemas/entity-schema.mjs');for(const[prefix,directory,name,title]of[['client','clients','clientSchema','Kunde'],['team','team','teamSchema','Teammitglied'],['media','media','mediaSchema','Medium']])types.push({prefix,directory,extension:'json',schema:schemas[name],format:'json',title,create:true,remove:true});}
 {const {siteSchemas}=await load('src/schemas/site-schema.mjs');types.push({prefix:'site',directory:'site',extension:'json',schemas:siteSchemas,format:'json',title:'Website-Daten'});}
 {const {translationSchema}=await load('src/schemas/translation-schema.mjs');types.push({prefix:'translation',directory:'translations',extension:'json',schema:translationSchema,format:'json',title:'Übersetzung',create:true,remove:true});}

 const {translatableFields}=await load('src/lib/translatable-fields.mjs');
 const {validateMarkdown:validateTranslatedMarkdown}=await load('src/lib/markdown-policy.mjs');
 const recordId=/^(page|package|screen|post|project|faq|client|team|media|site|translation)\/([a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)$/;
 const sourceFor=id=>{const match=recordId.exec(id);if(!match)return null;const type=types.find(t=>t.prefix===match[1]);if(!type||type.schemas&&!Object.hasOwn(type.schemas,match[2]))return null;const address=type.prefix==='site'?siteAddresses[match[2]]:{collection:legacyCollections[type.prefix],id:match[2]};return {...type,id,address,locator:{kind:'document'},...type.schemas?{schema:type.schemas[match[2]]}:{},file:'src/content/'+type.directory+'/'+match[2]+'.'+type.extension,identity:type.prefix==='package'?match[2].toUpperCase():undefined};};
 const sourcesFromFiles=files=>files.flatMap(file=>{const type=types.find(t=>file.startsWith('src/content/'+t.directory+'/')&&file.endsWith('.'+t.extension));if(!type)return [];const name=file.slice(('src/content/'+type.directory+'/').length,-(type.extension.length+1));const source=sourceFor(type.prefix+'/'+name);return source?[source]:[];});
 const readOnlyPaths=(source,data)=>{const paths=[];if(source.prefix==='page')paths.push(...[...describeSchema(source.schema,data).fields,...describeSchema(source.schema,data).containers].filter(f=>packageOwnership(data,f.path)).map(f=>f.path));const walk=(value,prefix=[])=>{if(Array.isArray(value))value.forEach((v,i)=>walk(v,[...prefix,i]));else if(value&&typeof value==='object'){if(value.assetId)paths.push(...['src','width','height','alt'].map(key=>[...prefix,key]));for(const[key,child]of Object.entries(value))walk(child,[...prefix,key]);}};walk(data);return paths;};
 const assertOwnedWrite=(source,before,after)=>{for(const path of readOnlyPaths(source,before)){if(source.prefix==='page'&&packageOwnership(before,path))continue;const parent=path.slice(0,-1),a=at(before,parent),b=at(after,parent);if(path.length>1&&a?.assetId!==b?.assetId)continue;if(JSON.stringify(at(before,path))!==JSON.stringify(at(after,path)))throw failure('Dieses Feld wird durch den zugehörigen Datensatz oder Medienupload verwaltet.');}};
 const validateMedia=records=>{for(const record of records){const walk=(value,key)=>{if(Array.isArray(value)){value.forEach(v=>walk(v,key));}else if(value&&typeof value==='object'){if(value.assetId){const id=value.assetId.startsWith('media/')?value.assetId:'media/'+value.assetId,asset=records.find(r=>r.id===id);if(!asset)throw failure('Das referenzierte Medium existiert nicht: '+value.assetId,409);if(value.src!==asset.data.src)throw failure('Bildquelle und ausgewähltes Medium stimmen nicht überein.',409);}if(typeof value.src==='string'&&Object.hasOwn(value,'alt')){const asset=value.assetId?records.find(r=>r.id===(value.assetId.startsWith('media/')?value.assetId:'media/'+value.assetId)):null,effectiveAlt=value.decorative?'':value.altOverride??asset?.data.defaultAlt??value.alt;if(!value.decorative&&(typeof effectiveAlt!=='string'||!effectiveAlt.trim()))throw failure('Dieses Bild braucht einen Alternativtext oder muss als dekorativ gekennzeichnet werden.',409);}for(const[k,v]of Object.entries(value))walk(v,k);}};walk(record.data,'');}};
 return {sourceFor,sourcesFromFiles,resolveReference,readOnlyPaths,assertOwnedWrite,validateMedia,
  recordTitle(source,data){return source.prefix==='package'?data.name:source.prefix==='translation'?source.id:null;},
  validateIdentity(source,data){if(source.identity&&data.name!==source.identity)throw failure('Paketidentität und Dateiname stimmen nicht überein.');},
  omitField(source,data,path){return source.prefix==='page'&&packageOwnership(data,path)||omitOwnedField(data,path);},
  forbiddenPatch(source,data,path){return source.prefix==='page'&&packageOwnership(data,path)||omitOwnedField(data,path);},
  references(records,target){return target.id.startsWith('media/')?mediaUsers(records,target):records.filter(r=>r.data.sourceId===target.id).map(r=>r.id);},
  prepareSection(type,data,sample,records){if(type==='testimonials'&&!sample){const client=records.find(r=>r.type==='client'&&r.data.testimonial)||records.find(r=>r.type==='client');data.clientIds=client?[client.id.slice(7)]:[];}},createSourceAdapter:options=>new LegacySourceAdapter(options),types,editorialHref,sectionSchema,sectionPolicy,recordRoute,packageOwnership,translatableFields,validateTranslatedMarkdown,
  gitIdentity:{GIT_AUTHOR_NAME:'FlyingStars local editor',GIT_AUTHOR_EMAIL:'editor@example.invalid',GIT_COMMITTER_NAME:'FlyingStars Editor',GIT_COMMITTER_EMAIL:'editor@example.invalid'},
  mediaOrigin:'https://flyingstars.art',mediaHosts:['flyingstars.art','flyingstars-relaunch.vercel.app'],
  requiredOutput:['index.html','show-konfigurator/index.html','drohnenshow-preise/index.html'],
  contentCollections:['src/content/pages/','src/content/posts/','src/content/projects/','src/content/faq/',
   'src/content/packages/','src/content/screens/','src/content/clients/','src/content/team/',
   'src/content/media/','src/content/site/','src/content/translations/'],
  contentRoot:'src/content',assetRoot:'public/assets',
  recordId,
  browserFiles:{'/src/lib/content-addresses.mjs':'src/lib/content-addresses.mjs','/core/metadata.mjs':'editor/core/metadata.mjs','/core/afe-meta-spec.mjs':'editor/core/afe-meta-spec.mjs','/editor/site-lib/color-tokens.mjs':'src/lib/color-tokens.mjs','/editor/site-lib/inline-text.mjs':'src/lib/inline-text.mjs','/editor/site-lib/editorial-text.mjs':'src/lib/editorial-text.mjs','/editor/package-ids.mjs':'src/content/package-ids.mjs','/editor/package-ownership.mjs':'src/content/package-ownership.mjs'},
  mediaWrite(asset,requestId){return{id:'media/'+requestId,data:{title:asset.title,src:'/'+asset.src,defaultAlt:'',width:asset.width,height:asset.height,mime:asset.mime},file:'public/'+asset.src};},
 };
}

const at=(value,path)=>path.reduce((value,key)=>value?.[key],value);
const failure=(message,status=400)=>Object.assign(new Error(message),{status});
