import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {personSchema} from '../schemas/person.mjs';
const directory=resolve(process.cwd(),'src/content/people');
export const PEOPLE=Object.fromEntries(readdirSync(directory).filter(n=>n.endsWith('.json')).map(file=>[file.slice(0,-5),personSchema.parse(JSON.parse(readFileSync(resolve(directory,file),'utf8')))]));
export const PERSON_IDS=Object.keys(PEOPLE);
export function person(id,source=PEOPLE){const value=source[id];if(!value)throw Error('Unbekannte Person: '+id);return {...value,id,image:value.image?{...value.image,alt:value.name}:undefined};}
export const FOUNDERS=PERSON_IDS.filter(id=>PEOPLE[id].founder).sort((a,b)=>PEOPLE[a].order-PEOPLE[b].order).map(id=>person(id));
export function teamMember(member,source=PEOPLE){const p=person(member.personId,source);return {...member,...p,image:p.image?{...p.image,alt:member.imageAlt??p.name}:undefined};}
