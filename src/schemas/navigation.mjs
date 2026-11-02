import {z} from 'zod';
const link=z.object({label:z.string().min(1).describe('Wörterbuchschlüssel oder unveränderlicher Name'),href:z.string().min(1).describe('Linkziel')}).strict();
const list=schema=>z.array(schema).min(1).meta({'x-afe':{array:{insertable:true,removable:true,reorderable:true}}});
export const navigationSchema=z.object({nav:list(link.extend({children:list(link).optional()})),cta:link,footer:z.object({legal:list(link)}).strict()}).strict().meta({'x-afe':{collection:{label:'Navigation',title:[],operations:['update']}}});
