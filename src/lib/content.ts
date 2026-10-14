// The only editorial read boundary. A future request-scoped snapshot replaces the sources here.
import {getCollection,render} from 'astro:content';
import {pageSchema} from '../schemas/page-schema.mjs';
import {postSchema,projectSchema,faqSchema} from '../schemas/collection-schema.mjs';
import {clientSchema,teamSchema,mediaSchema} from '../schemas/entity-schema.mjs';
import {siteSchemas} from '../schemas/site-schema.mjs';
import {packageSchema} from '../content/package-schema.mjs';
import {screenSchema} from '../content/screen-schema.mjs';
import {translationSchema} from '../schemas/translation-schema.mjs';
import {localize} from './localize';
import {textFields} from './translatable-fields.mjs';
import {markdownHtml} from './markdown-policy.mjs';
import type {ShowPackage} from '../content/show-packages';
type LocalizedPackage = ReturnType<typeof packageSchema.parse> & {displayName:string;max:number};

const json = import.meta.glob('../content/**/*.json',{eager:true,import:'default'}) as Record<string,any>;
const markdown = import.meta.glob('../content/{posts,projects,faq}/**/*.md',{eager:true,query:'?raw',import:'default'}) as Record<string,string>;
const translations = Object.entries(json).filter(([file]) => file.startsWith('../content/translations/')).map(([,raw]) => translationSchema.parse(raw));
const translationIndex=new Map<string,any>();
for(const value of translations){const key=value.sourceId+':'+value.locale;if(translationIndex.has(key))throw new Error('Doppelte Übersetzung für '+key);translationIndex.set(key,value);}
const editor = () => process.env.FLYINGSTARS_EDITOR === '1';
const schemas = {page:pageSchema,post:postSchema,project:projectSchema,faq:faqSchema,client:clientSchema,team:teamSchema,media:mediaSchema,package:packageSchema};
function localized(id:string,data:any,schema:any,locale:string) {
  const fields = textFields(schema,data);
  if (typeof data.body === 'string' && !fields.some((field:any) => field.path.length === 1 && field.path[0] === 'body')) fields.push({path:['body'],kind:'text',format:'markdown'});
  return localize({id,data},locale,{editor:editor(),fields,translation:translationIndex.get(id+':'+locale)});
}
async function entries(collection:'pages'|'posts'|'projects'|'faq',owner:keyof typeof schemas,locale:string) {
  const source = await getCollection(collection);
  return source.filter(entry => editor() || !('draft' in entry.data) || !entry.data.draft).map(entry => {
    // Match NativeStore.decode exactly, including trailing whitespace, for per-field body hashes.
    const raw = markdown[`../content/${collection}/${entry.id}.md`];
    const body = raw?.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)([\s\S]*)$/)?.[1] ?? entry.body;
    const result = localized(`${owner}/${entry.id}`,{...entry.data,...body !== undefined ? {body} : {}},schemas[owner],locale);
    return {...entry,data:result.data,body:result.data.body,localization:result.localization,sourceEntry:entry};
  });
}
export const getPages = (locale='de') => entries('pages','page',locale);
export async function getPage(route:string,locale='de') {const id=route.replace(/^\/(en|nl)(?=\/|$)/,'').replace(/^\/|\/$/g,'') || 'index';return (await getPages(locale)).find(page => page.id === id);}
export const getPosts = (locale='de') => entries('posts','post',locale);
export const getProjects = (locale='de') => entries('projects','project',locale);
export async function getFaq(tags:string[]=[],locale='de') {return (await entries('faq','faq',locale)).filter(entry => !tags.length || entry.data.tags.some((tag:string) => tags.includes(tag))).sort((a,b) => a.data.order-b.data.order);}
function read(directory:string,id:string,schema:any,owner:string,locale:string) {
  const raw=json[`../content/${directory}/${id}.json`];
  if (!raw) throw new Error(`Fehlender ${owner}-Datensatz: ${id}`);
  return localized(`${owner}/${id}`,schema.parse(raw),schema,locale).data;
}
export function editorialRecord(type:'client'|'team'|'media',id:string,locale='de'):any {return read(type==='client'?'clients':type,id.replace(new RegExp('^'+type+'/'),''),schemas[type],type,locale);}
const all = (type:'client'|'team'|'media',locale:string) => Object.keys(json).filter(file => file.startsWith(`../content/${type==='client'?'clients':type}/`)).map(file => ({id:file.split('/').at(-1)!.replace(/\.json$/,''),...editorialRecord(type,file.split('/').at(-1)!.replace(/\.json$/,''),locale)}));
export const getClients = (locale='de') => all('client',locale);
export const getTeam = (locale='de') => all('team',locale);
export const getMedia = (locale='de') => all('media',locale);
export function resolveMedia(image:any,locale='de'):any {if(!image)return image;const global=image.assetId?editorialRecord('media',image.assetId,locale):undefined;return {...image,...global?{src:global.src,width:global.width,height:global.height}:{},alt:image.decorative?'':image.altOverride??global?.defaultAlt??image.alt};}
export function mediaForSource(src:string):any {const value=getMedia().find(media => media.src===src);if(!value)throw new Error('Fehlender Medieneintrag: '+src);return value;}
export function siteRecord(name:keyof typeof siteSchemas,locale='de'):any {return read('site',String(name),siteSchemas[name],'site',locale);}
export function getPackages(locale='de'):Record<ShowPackage,LocalizedPackage> {return Object.fromEntries(['SPARK','HORIZON','ODYSSEY'].map(name => {const data=read('packages',name.toLowerCase(),packageSchema,'package',locale);if(data.name!==name)throw new Error(`Paketdatei für ${name} enthält ${data.name}.`);return [name,{...data,displayName:data.displayName??data.name,max:data.max??Infinity}];})) as Record<ShowPackage,LocalizedPackage>;}
export function getScreen(name:string,locale='de'):any {return read('screens',String(name),screenSchema,'screen',locale);}
export const fillText = (text:string,values:Record<string,string|number>) => text.replace(/\{(\w+)\}/g,(match,key)=>key in values?String(values[key]):match);
// German retains Astro's compiled source pipeline. Localized bodies use guarded marked (also
// TextMedia's renderer) so fallback/translated Markdown links can follow the active language.
export async function renderBody(entry:any) {
  const translated = entry.localization.applied.some((path:any[]) => path.length===1 && path[0]==='body');
  if (translated || entry.localization.locale !== 'de') return {html:await markdownHtml(entry.body,entry.localization.locale),Content:undefined,lang:translated?entry.localization.locale:'de'};
  const {Content}=await render(entry.sourceEntry);
  return {Content,html:undefined,lang:'de'};
}
