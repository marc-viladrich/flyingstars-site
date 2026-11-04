import {z} from 'zod';
import {PROJECT_FACTS,projectValue} from '../content/project-facts.mjs';
const localized=z.union([z.string().min(1),z.object({de:z.string().min(1),en:z.string().min(1),nl:z.string().min(1)}).strict()]);
const event=z.object({date:z.string().regex(/^\d{4}-\d{2}(?:-\d{2})?$/),client:localized,location:localized,drones:z.number().int().positive().optional(),shows:z.number().int().positive().optional()}).strict();
export const projectFactsSchema=z.object(Object.fromEntries(Object.keys(PROJECT_FACTS).map(id=>[id,event]))).strict();
export const projectFactRefSchema=z.object({project:z.enum(Object.keys(PROJECT_FACTS)),field:z.enum(['date','client','location','drones','shows','totalDrones']),display:z.enum(['text','iso','numeric','year','long','monthYear','monthYearCapital','dayMonth']).optional()}).strict().superRefine((value,ctx)=>{try{projectValue(value);}catch(error){ctx.addIssue({code:'custom',message:error.message});}}).describe('Fakt einer konkreten historischen Show. Besitzer: Website-Daten → Projektfakten.');
