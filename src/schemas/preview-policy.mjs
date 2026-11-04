import {z} from 'zod';
import {PACKAGE_NAMES} from '../content/package-identity.mjs';
const count=z.number().int().positive();
export const previewPolicySchema=z.object({
 placeholder:z.literal(true).describe('Nicht freigegebene Vorschaupreise').meta({'x-afe':{readOnly:true}}),
 step:count.describe('Schrittweite'),
 ranges:z.object(Object.fromEntries(PACKAGE_NAMES.map(name=>[name,z.object({min:count.describe('Untergrenze'),max:count.describe('Obergrenze')}).strict().describe(name)]))).strict().describe('Vorschaubereiche'),
 extension:z.object({package:z.enum(PACKAGE_NAMES).describe('Paket der Erweiterung').meta({'x-afe':{group:'Paketbezug'}}),from:count.describe('Ab dieser Drohnenzahl'),add:z.number().int().nonnegative().describe('Aufpreis je Vorschau-Schritt')}).strict().describe('Erweiterung über die kommerzielle Grenze'),
}).strict().superRefine((policy,ctx)=>{
 PACKAGE_NAMES.forEach((name,i)=>{const range=policy.ranges[name];if(range.min>range.max||range.min%policy.step||range.max%policy.step||(i&&range.min!==policy.ranges[PACKAGE_NAMES[i-1]].max+policy.step))ctx.addIssue({code:'custom',path:['ranges',name],message:'Vorschaubereiche müssen aufsteigend, auf Schrittgrenzen und lückenlos sein.'});});
 const range=policy.ranges[policy.extension.package];if(policy.extension.from<range.min||policy.extension.from>=range.max||policy.extension.from%policy.step)ctx.addIssue({code:'custom',path:['extension','from'],message:'Erweiterung muss auf einer Schrittgrenze innerhalb ihres Vorschaubereichs beginnen.'});
}).meta({'x-afe':{collection:{label:'Vorschaupolicy · nicht freigegebene Preise',title:[],operations:['update']}}});
