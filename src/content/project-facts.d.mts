import type {CollectionEntry} from 'astro:content';
import data from './project-facts.json';
type Raw = CollectionEntry<'projects'>['data'];
type Showcase = NonNullable<Raw['showcase']>;
export type ProjectView = Omit<CollectionEntry<'projects'>,'data'> & {data:Omit<Raw,'date'|'client'|'location'|'drones'|'showcase'> & {
 date:Date;client?:string;location?:string;drones?:number;
 showcase?:Omit<Showcase,'drones'|'credits'|'numbers'> & {drones:number;credits:{label:string;value:string}[];numbers:{label:string;value:number}[]};
}};
export const PROJECT_FACTS:typeof data;
export function projectValue(ref:unknown,locale?:string,source?:Record<string,any>):any;
export function projectText<T>(text:T,locale?:string,source?:Record<string,any>,options?:{markdown?:boolean}):T;
export function projectValues(value:unknown,locale?:string,source?:Record<string,any>):any;
export function projectView(entry:CollectionEntry<'projects'>):ProjectView;
