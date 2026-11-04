import {z} from 'zod';
export const BUSINESS_FACT_IDS=["responseHours", "depositPercent", "earlyBookingPercent", "liabilityEUR", "renewablePercent", "droneWeightGrams", "maxAltitudeMetres", "windForce", "showsTotal"];
const entry=z.object({value:z.number().int().nonnegative().describe('Wert'),unit:z.string().min(1).describe('Einheit'),scope:z.string().min(1).describe('Geltungsbereich'),asOf:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Stand'),source:z.string().min(1).describe('Quelle'),status:z.literal('existing-claim').describe('Bestehende Aussage, keine neue Freigabe')}).strict();
export const businessFactsSchema=z.object(Object.fromEntries(BUSINESS_FACT_IDS.map(id=>[id,entry]))).strict().meta({'x-afe':{collection:{label:'Geschäftsfakten',title:[],operations:['update']}}});
export const businessRefSchema=z.object({fact:z.enum(BUSINESS_FACT_IDS).describe('Geschäftsfakt'),display:z.enum(['number','hours','shows','discount']).default('number').describe('Darstellung')}).strict();
export const businessValueSchema=z.union([z.string(),businessRefSchema]);
