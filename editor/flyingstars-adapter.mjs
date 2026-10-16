import {createExtensionRegistry} from './core/extensions.mjs';
import {createFlyingStarsExtensions} from './extensions/flyingstars/index.mjs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {LegacySourceAdapter} from './legacy-source-adapter.mjs';
import {unwrap} from './native-schema.mjs';

import {legacyCollections,siteAddresses} from '../src/lib/content-addresses.mjs';

/** Only this adapter loads the pilot's schemas and source services.
 * @param {string} root Absolute site root, supplied by the composition root.
 */
export async function createFlyingStarsAdapter(root) {
 const load=relative=>import(pathToFileURL(path.join(root,relative)));const {pageSchema,sectionSchema,editorialHref}=await load('src/schemas/page-schema.mjs'),{packageSchema}=await load('src/content/package-schema.mjs'),{screenSchema}=await load('src/content/screen-schema.mjs');const sectionPolicy=(await load('src/schemas/section-policy.mjs')).sectionPolicy;const recordRoute=(await load('src/lib/editorial-routes.mjs')).recordRoute;const packageOwnership=(await load('src/content/package-ownership.mjs')).packageOwnedPagePath;
 const {extraSchema}=await load('src/schemas/extra-schema.mjs');
 const types=[{prefix:'extra',directory:'extras',extension:'json',schema:extraSchema,format:'json',title:'Paket-Upgrade',create:true,remove:true},{prefix:'page',directory:'pages',extension:'yaml',schema:pageSchema,format:'yaml',title:'Seite',create:true,remove:true},{prefix:'package',directory:'packages',extension:'json',schema:packageSchema,format:'json',title:'Paket'},{prefix:'screen',directory:'screens',extension:'json',schema:screenSchema,format:'json',title:'Systemseite'}];
 {const schemas=await load('src/schemas/collection-schema.mjs');for(const[prefix,directory,name,title]of[['post','posts','postSchema','Blogartikel'],['project','projects','projectSchema','Projekt'],['faq','faq','faqSchema','FAQ']])types.push({prefix,directory,extension:'md',schema:schemas[name].extend({body:schemas.markdownBodySchema||unwrap(pageSchema.shape.sections).element.options.find(s=>s.shape.type._def.values[0]==='textMedia').shape.body}).meta(schemas[name].meta?.()||{}),format:'markdown',title,create:true,remove:true});}
 {const schemas=await load('src/schemas/entity-schema.mjs');for(const[prefix,directory,name,title]of[['client','clients','clientSchema','Kunde'],['team','team','teamSchema','Teammitglied'],['media','media','mediaSchema','Medium']])types.push({prefix,directory,extension:'json',schema:schemas[name],format:'json',title,create:true,remove:true});}
 {const {siteSchemas}=await load('src/schemas/site-schema.mjs');types.push({prefix:'site',directory:'site',extension:'json',schemas:siteSchemas,format:'json',title:'Website-Daten'});}
 {const {translationSchema}=await load('src/schemas/translation-schema.mjs');types.push({prefix:'translation',directory:'translations',extension:'json',schema:translationSchema,format:'json',title:'Übersetzung',create:true,remove:true});}

 const {translatableFields}=await load('src/lib/translatable-fields.mjs');
 const {validateMarkdown:validateTranslatedMarkdown}=await load('src/lib/markdown-policy.mjs');
 const recordId=/^(page|extra|package|screen|post|project|faq|client|team|media|site|translation)\/([a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)$/;
 const sourceFor=id=>{const match=recordId.exec(id);if(!match)return null;const type=types.find(t=>t.prefix===match[1]);if(!type||type.schemas&&!Object.hasOwn(type.schemas,match[2]))return null;const address=type.prefix==='site'?siteAddresses[match[2]]:{collection:legacyCollections[type.prefix],id:match[2]};return {...type,id,address,locator:{kind:'document'},...type.schemas?{schema:type.schemas[match[2]]}:{},file:'src/content/'+type.directory+'/'+match[2]+'.'+type.extension,identity:type.prefix==='package'?match[2].toUpperCase():undefined};};
 const sourcesFromFiles=files=>files.flatMap(file=>{const type=types.find(t=>file.startsWith('src/content/'+t.directory+'/')&&file.endsWith('.'+t.extension));if(!type)return [];const name=file.slice(('src/content/'+type.directory+'/').length,-(type.extension.length+1));const source=sourceFor(type.prefix+'/'+name);return source?[source]:[];});
 const {inlinePlain,inlineHtml}=await load('src/lib/inline-text.mjs');
 const inlineCodec={decode:source=>String(source),encode:value=>{if(typeof value!=='string')throw Error('Inline text must be a string.');return value;},plainText:inlinePlain,html:inlineHtml};
 const site={inlineCodec,sourceFor,sourcesFromFiles,recordTitle(source,data){return source.prefix==='package'?data.name:source.prefix==='translation'?source.id:null;},
  createSourceAdapter:options=>new LegacySourceAdapter(options),types,editorialHref,sectionSchema,sectionPolicy,recordRoute,packageOwnership,translatableFields,validateTranslatedMarkdown,
  gitIdentity:{GIT_AUTHOR_NAME:'FlyingStars local editor',GIT_AUTHOR_EMAIL:'editor@example.invalid',GIT_COMMITTER_NAME:'FlyingStars Editor',GIT_COMMITTER_EMAIL:'editor@example.invalid'},
  mediaOrigin:'https://flyingstars.art',mediaHosts:['flyingstars.art','flyingstars-relaunch.vercel.app'],
  requiredOutput:['index.html','show-konfigurator/index.html','drohnenshow-preise/index.html'],
  contentCollections:['src/content/pages/','src/content/posts/','src/content/projects/','src/content/faq/',
   'src/content/extras/','src/content/packages/','src/content/screens/','src/content/clients/','src/content/team/',
   'src/content/media/','src/content/site/','src/content/translations/'],
  contentRoot:'src/content',assetRoot:'public/assets',
  recordId,
  browserFiles:{'/browser-site.mjs':'editor/browser-site.mjs',...Object.fromEntries(['index','site-adapter','inline-format','prepare-cloned-section','record-kinds','media-usage','factories','navigation','preview','frame','translations','routing'].map(name=>['/extensions/flyingstars/web/'+name+'.mjs','editor/extensions/flyingstars/web/'+name+'.mjs'])),...Object.fromEntries(['queries','site-data'].map(name=>['/extensions/flyingstars/'+name+'.mjs','editor/extensions/flyingstars/'+name+'.mjs'])),'/src/lib/color-tokens.mjs':'src/lib/color-tokens.mjs','/src/lib/editorial-text.mjs':'src/lib/editorial-text.mjs','/src/content/package-ids.mjs':'src/content/package-ids.mjs','/src/lib/inline-text.mjs':'src/lib/inline-text.mjs','/src/content/package-ownership.mjs':'src/content/package-ownership.mjs','/src/lib/content-addresses.mjs':'src/lib/content-addresses.mjs','/editor/site-lib/color-tokens.mjs':'src/lib/color-tokens.mjs','/editor/site-lib/inline-text.mjs':'src/lib/inline-text.mjs','/editor/site-lib/editorial-text.mjs':'src/lib/editorial-text.mjs','/editor/package-ids.mjs':'src/content/package-ids.mjs','/editor/package-ownership.mjs':'src/content/package-ownership.mjs'},

 };
 site.extensions=createExtensionRegistry(createFlyingStarsExtensions(site));
 return site;
}

export {legacyRuntimePaths,legacyEnvironmentOptions,legacyBuildEnvironment,legacyRestartEnvironment,legacyRuntimeMessages} from './extensions/flyingstars/runtime-compatibility.mjs';
