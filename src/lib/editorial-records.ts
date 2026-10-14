import {clientSchema,teamSchema,mediaSchema} from '../schemas/entity-schema.mjs';
import {siteSchemas} from '../schemas/site-schema.mjs';
const groups={client:import.meta.glob('../content/clients/*.json',{eager:true,import:'default'}),team:import.meta.glob('../content/team/*.json',{eager:true,import:'default'}),media:import.meta.glob('../content/media/*.json',{eager:true,import:'default'})};
const schemas={client:clientSchema,team:teamSchema,media:mediaSchema};
export function editorialRecord(type:keyof typeof groups,id:string):any {id=id.replace(new RegExp('^'+type+'/'),'');const value=groups[type][`../content/${type==='client'?'clients':type}/${id}.json`];if(!value)throw new Error(`Fehlender ${type}-Datensatz: ${id}`);return schemas[type].parse(value);}
export function resolveMedia(image:any):any {if(!image)return image;const global=image.assetId?editorialRecord('media',image.assetId.replace(/^media\//,'')):undefined;return {...image,...global?{src:global.src,width:global.width,height:global.height}:{},alt:image.decorative?'':image.altOverride??global?.defaultAlt??image.alt};}

export function mediaForSource(src:string):any {for(const raw of Object.values(groups.media)){const value=mediaSchema.parse(raw);if(value.src===src)return value;}throw new Error('Fehlender Medieneintrag: '+src);}
// Website-wide singletons (site/contact, site/inquiry): the single owner of contact values and form texts.
const siteGroup=import.meta.glob('../content/site/*.json',{eager:true,import:'default'});
export function siteRecord(name:keyof typeof siteSchemas):any {const value=siteGroup[`../content/site/${name}.json`];if(!value)throw new Error(`Fehlender site-Datensatz: ${name}`);return siteSchemas[name].parse(value);}
// Replaces {name} placeholders in an editable text; unknown placeholders stay visible so a typo is noticed.
export function fillText(text:string,values:Record<string,string|number>):string {return text.replace(/\{(\w+)\}/g,(match,key)=>key in values?String(values[key]):match);}
