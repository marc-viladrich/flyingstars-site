import {clientSchema,teamSchema,mediaSchema} from '../schemas/entity-schema.mjs';
const groups={client:import.meta.glob('../content/clients/*.json',{eager:true,import:'default'}),team:import.meta.glob('../content/team/*.json',{eager:true,import:'default'}),media:import.meta.glob('../content/media/*.json',{eager:true,import:'default'})};
const schemas={client:clientSchema,team:teamSchema,media:mediaSchema};
export function editorialRecord(type:keyof typeof groups,id:string):any {id=id.replace(new RegExp('^'+type+'/'),'');const value=groups[type][`../content/${type==='client'?'clients':type}/${id}.json`];if(!value)throw new Error(`Fehlender ${type}-Datensatz: ${id}`);return schemas[type].parse(value);}
export function resolveMedia(image:any):any {if(!image)return image;const global=image.assetId?editorialRecord('media',image.assetId.replace(/^media\//,'')):undefined;return {...image,...global?{src:global.src,width:global.width,height:global.height}:{},alt:image.decorative?'':image.altOverride??global?.defaultAlt??image.alt};}

export function mediaForSource(src:string):any {for(const raw of Object.values(groups.media)){const value=mediaSchema.parse(raw);if(value.src===src)return value;}throw new Error('Fehlender Medieneintrag: '+src);}
