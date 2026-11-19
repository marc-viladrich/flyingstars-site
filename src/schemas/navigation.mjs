import {fieldPolicy} from '../i18n/field-policy.mjs';
import {z} from 'zod';
const link=z.object({label:fieldPolicy(z.string().min(1).describe('Wörterbuchschlüssel oder unveränderlicher Name'), 'shared'),href:fieldPolicy(z.string().min(1).describe('Linkziel'), 'shared')}).strict();
const list=schema=>z.array(schema).min(1).meta({'x-afe':{array:{insertable:true,removable:true,reorderable:true}}});
export const navigationSchema=z.object({nav:list(link.extend({children:list(link).optional(),occasions:fieldPolicy(z.literal(true).optional().describe('Unterpunkte sind die Anlässe mit „Im Menü zeigen“ (src/content/occasions.json)'), 'shared')})),cta:link,footer:z.object({legal:list(link)}).strict()}).strict().meta({'x-afe':{collection:{label:'Navigation',title:[],operations:['update']}}});
