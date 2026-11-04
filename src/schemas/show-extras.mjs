import {z} from 'zod';
import {PACKAGE_NAMES} from '../content/package-identity.mjs';
export const priceSchema=z.object({amount:z.number().int().nonnegative().describe('Betrag'),currency:z.literal('EUR').describe('Währung').meta({'x-afe':{readOnly:true}}),qualifier:z.enum(['exact','from','from-approx','surcharge']).describe('Preisqualifikator').meta({'x-afe':{choices:{exact:{label:'Fester Betrag'},from:{label:'Ab'},'from-approx':{label:'Ab ca.'},surcharge:{label:'Aufpreis'}}}}),net:z.literal(true).describe('Nettopreis').meta({'x-afe':{readOnly:true}}),travel:z.literal('unspecified').describe('Anfahrt hier nicht angegeben').meta({'x-afe':{readOnly:true}})}).strict().describe('Preis');
const count=z.number().int().positive();
export const showExtrasSchema=z.object({
 film:z.object({price:priceSchema,includedIn:z.array(z.enum(PACKAGE_NAMES).describe('Paket')).min(1).refine(ids=>new Set(ids).size===ids.length,'Paket nur einmal angeben').describe('In diesen Paketen enthalten')}).strict().describe('Filmaufnahmen'),
 schweiz:z.object({price:priceSchema}).strict().describe('Schweiz'),
 indoor:z.object({price:priceSchema,drones:z.object({min:count.describe('Untergrenze'),max:count.describe('Obergrenze')}).strict().refine(value=>value.min<=value.max,'Maximum muss mindestens dem Minimum entsprechen').describe('Drohnenzahl'),ceilingMin:z.number().positive().describe('Mindestdeckenhöhe in Metern')}).strict().describe('Indoor-Sonderangebot'),
}).strict().meta({'x-afe':{collection:{label:'Extras und Sonderangebote',title:[],operations:['update']}}});
