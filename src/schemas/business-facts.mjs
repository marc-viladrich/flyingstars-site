import {fieldPolicy} from '../i18n/field-policy.mjs';
import {z} from 'zod';
export const BUSINESS_FACT_IDS=["responseHours", "depositPercent", "earlyBookingPercent", "liabilityEUR", "renewablePercent", "droneWeightGrams", "maxAltitudeMetres", "windForce", "showsTotal"];
const entry=z.object({value:fieldPolicy(z.number().int().nonnegative().describe('Wert'), 'shared'),unit:fieldPolicy(z.string().min(1).describe('Einheit'), 'shared'),scope:fieldPolicy(z.string().min(1).describe('Geltungsbereich'), 'shared'),asOf:fieldPolicy(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Stand'), 'shared'),source:fieldPolicy(z.string().min(1).describe('Quelle'), 'shared'),status:fieldPolicy(z.literal('existing-claim').describe('Bestehende Aussage, keine neue Freigabe'), 'shared')}).strict();
export const businessFactsSchema=z.object(Object.fromEntries(BUSINESS_FACT_IDS.map(id=>[id,entry]))).strict().meta({'x-afe':{collection:{label:'Geschäftsfakten',title:[],operations:['update']}}});
export const businessRefSchema=z.object({fact:fieldPolicy(z.enum(BUSINESS_FACT_IDS).describe('Geschäftsfakt'), 'shared'),display:fieldPolicy(z.enum(['number','hours','shows','discount']).default('number').describe('Darstellung'), 'shared')}).strict();
export const businessValueSchema=z.union([fieldPolicy(z.string(), 'translatable'),businessRefSchema]);
