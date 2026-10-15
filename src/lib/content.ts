// The only editorial read boundary. A future request-scoped snapshot replaces the sources here.
import {getCollection,getEntry,render} from 'astro:content';
import {pageSchema} from '../schemas/page-schema.mjs';
import {postSchema,projectSchema,faqSchema} from '../schemas/collection-schema.mjs';
import {clientSchema,teamSchema,mediaSchema} from '../schemas/entity-schema.mjs';
import {siteSchemas} from '../schemas/site-schema.mjs';
import {extraSchema} from '../schemas/extra-schema.mjs';
import {packageSchema} from '../content/package-schema.mjs';
import {screenSchema} from '../content/screen-schema.mjs';
import {legacyCollections,siteAddresses} from './content-addresses.mjs';
import {localize} from './localize';
import {textFields} from './translatable-fields.mjs';
import {markdownHtml} from './markdown-policy.mjs';
import type {ShowPackage} from '../content/show-packages';
type LocalizedPackage = ReturnType<typeof packageSchema.parse> & {displayName:string;max:number};

// Compatibility bridge: resolveMedia is called synchronously inside templates.
// Overlay sourceId excludes media, so media data has no localized overlay.
const mediaJson = import.meta.glob('../content/media/**/*.json',{eager:true,import:'default'}) as Record<string,any>;
const markdown = import.meta.glob('../content/{posts,projects,faq}/**/*.md',{eager:true,query:'?raw',import:'default'}) as Record<string,string>;
async function translations() {
  const index = new Map<string,any>();
  for (const {data} of await getCollection('translations')) {
    const key = data.sourceId+':'+data.locale;
    if (index.has(key)) throw new Error('Doppelte Übersetzung für '+key);
    index.set(key,data);
  }
  return index;
}
const editor = () => process.env.FLYINGSTARS_EDITOR === '1';
const schemas = {page:pageSchema,post:postSchema,project:projectSchema,faq:faqSchema,client:clientSchema,team:teamSchema,media:mediaSchema,package:packageSchema};
function localized(id:string,data:any,schema:any,locale:string,translationIndex:Map<string,any>) {
  const fields = textFields(schema,data);
  const body = schema.meta?.()?.['x-afe']?.collection?.body;
  if (body && typeof data.body === 'string' && !fields.some((field:any) => field.path.length === 1 && field.path[0] === 'body')) fields.push({path:['body'],label:body.label,kind:'text',format:'markdown','x-afe':{translatable:body.translatable === true}});
  return localize({id,data},locale,{editor:editor(),fields,translation:translationIndex.get(id+':'+locale)});
}
async function entries(collection:'pages'|'posts'|'projects'|'faq',owner:keyof typeof schemas,locale:string) {
  const source = await getCollection(collection), translationIndex = await translations();
  return source.filter(entry => editor() || !('draft' in entry.data) || !entry.data.draft).map(entry => {
    // Match NativeStore.decode exactly, including trailing whitespace, for per-field body hashes.
    const raw = markdown[`../content/${collection}/${entry.id}.md`];
    const body = raw?.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)([\s\S]*)$/)?.[1] ?? entry.body;
    const result = localized(`${owner}/${entry.id}`,{...entry.data,...body !== undefined ? {body} : {}},schemas[owner],locale,translationIndex);
    return {...entry,data:result.data,body:result.data.body,localization:result.localization,sourceEntry:entry};
  });
}
export const getPages = (locale='de') => entries('pages','page',locale);
export async function getPage(route:string,locale='de') {const id=route.replace(/^\/(en|nl)(?=\/|$)/,'').replace(/^\/|\/$/g,'') || 'index';return (await getPages(locale)).find(page => page.id === id);}
export const getPosts = (locale='de') => entries('posts','post',locale);
export const getProjects = (locale='de') => entries('projects','project',locale);
export async function getFaq(tags:string[]=[],locale='de') {return (await entries('faq','faq',locale)).filter(entry => !tags.length || entry.data.tags.some((tag:string) => tags.includes(tag))).sort((a,b) => a.data.order-b.data.order);}
type JsonCollection = 'clients'|'team'|'media'|'extras'|'packages'|'screens'|'siteContact'|'siteInquiry'|'siteNavigation'|'siteUi';
async function read(collection:JsonCollection,id:string,schema:any,owner:string,locale:string) {
  const entry=await getEntry(collection,id);
  if (!entry) throw new Error(`Fehlender ${owner}-Datensatz: ${id}`);
  return localized(`${owner}/${id}`,entry.data,schema,locale,await translations()).data;
}
export async function editorialRecord(type:'client'|'team'|'media',id:string,locale='de'):Promise<any> {return read(legacyCollections[type],id.replace(new RegExp('^'+type+'/'),''),schemas[type],type,locale);}
async function all(type:'client'|'team'|'media',locale:string) {
  // The previous eager glob exposed filename order, not loader insertion order.
  const source=(await getCollection(legacyCollections[type])).sort((a,b)=>a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const translationIndex=await translations();
  return source.map(entry=>({id:entry.id,...localized(`${type}/${entry.id}`,entry.data,schemas[type],locale,translationIndex).data}));
}
export const getClients = (locale='de') => all('client',locale);
export const getTeam = (locale='de') => all('team',locale);
export const getMedia = (locale='de') => all('media',locale);
function synchronousMedia(id:string) {
  const key=id.replace(/^media\//,'');
  const raw=mediaJson[`../content/media/${key}.json`];
  if (!raw) throw new Error(`Fehlender media-Datensatz: ${key}`);
  return mediaSchema.parse(raw);
}
export function resolveMedia(image:any,_locale='de'):any {if(!image)return image;const global=image.assetId?synchronousMedia(image.assetId):undefined;return {...image,...global?{src:global.src,width:global.width,height:global.height}:{},alt:image.decorative?'':image.altOverride??global?.defaultAlt??image.alt};}
export async function mediaForSource(src:string):Promise<any> {const value=(await getMedia()).find(media => media.src===src);if(!value)throw new Error('Fehlender Medieneintrag: '+src);return value;}
export function siteRecord(name:keyof typeof siteSchemas,locale='de'):Promise<any> {const address=siteAddresses[name as keyof typeof siteAddresses];return read(address.collection,address.id,siteSchemas[name],'site',locale);}
export async function getPackages(locale='de'):Promise<Record<ShowPackage,LocalizedPackage>> {return Object.fromEntries(await Promise.all(['SPARK','HORIZON','ODYSSEY'].map(async name => {const data=await read('packages',name.toLowerCase(),packageSchema,'package',locale);if(data.name!==name)throw new Error(`Paketdatei für ${name} enthält ${data.name}.`);return [name,{...data,displayName:data.displayName??data.name,max:data.max??Infinity}];}))) as Record<ShowPackage,LocalizedPackage>;}
export function getScreen(name:string,locale='de'):Promise<any> {return read('screens',String(name),screenSchema,'screen',locale);}
export const fillText = (text:string,values:Record<string,string|number>) => text.replace(/\{(\w+)\}/g,(match,key)=>key in values?String(values[key]):match);
// German retains Astro's compiled source pipeline. Localized bodies use guarded marked (also
// TextMedia's renderer) so fallback/translated Markdown links can follow the active language.
export async function renderBody(entry:any) {
  const translated = entry.localization.applied.some((path:any[]) => path.length===1 && path[0]==='body');
  if (translated || entry.localization.locale !== 'de') return {html:await markdownHtml(entry.body,entry.localization.locale),Content:undefined,lang:translated?entry.localization.locale:'de'};
  const {Content}=await render(entry.sourceEntry);
  return {Content,html:undefined,lang:'de'};
}

export async function getExtras(locale='de') {
  const index=await translations();
  return (await getCollection('extras')).sort((a,b)=>a.data.order-b.data.order||a.id.localeCompare(b.id)).map(entry=>({id:entry.id,data:localized(`extra/${entry.id}`,entry.data,extraSchema,locale,index).data}));
}
