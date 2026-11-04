import {z} from 'zod';
const minutes=z.number().int().positive();
const range=z.object({min:minutes.describe('Kürzeste Show in Minuten'),max:minutes.describe('Längste Show in Minuten')}).strict();
export const showDurationSchema=z.object({outdoor:range.extend({typical:minutes.describe('Typische Show in Minuten')}).describe('Outdoor'),indoor:range.describe('Indoor')}).strict().superRefine((data,ctx)=>{
 for(const [kind,value]of Object.entries(data))if(value.min>value.max)ctx.addIssue({code:'custom',path:[kind,'max'],message:'Maximum muss mindestens dem Minimum entsprechen.'});
 if(data.outdoor.typical<data.outdoor.min||data.outdoor.typical>data.outdoor.max)ctx.addIssue({code:'custom',path:['outdoor','typical'],message:'Typische Dauer muss innerhalb der Outdoor-Spanne liegen.'});
}).meta({'x-afe':{collection:{label:'Showzeiten',title:[],operations:['update']}}});
