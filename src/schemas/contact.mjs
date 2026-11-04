import {fieldPolicy} from '../i18n/field-policy.mjs';
import {z} from 'zod';
const phone=fieldPolicy(z.string().regex(/^0[1-9][0-9 ]+$/,'Deutsche Telefonnummer mit führender 0 und Leerzeichen'), 'shared');
const lines=z.array(fieldPolicy(z.string().min(1).describe('Adresszeile'), 'shared')).min(1).describe('Adresszeilen').meta({'x-afe':{array:{insertable:true,removable:true,reorderable:true}}});
export const contactSchema=z.object({
 email:fieldPolicy(z.email().describe('E-Mail'), 'shared'),phone:phone.describe('Festnetz'),mobile:phone.describe('Mobil und WhatsApp'),
 video:z.object({labelKey:fieldPolicy(z.literal('contact.videoCall').describe('Beschriftung').meta({'x-afe':{readOnly:true}}), 'shared'),href:fieldPolicy(z.url().refine(v=>v.startsWith('https://'),'HTTPS erforderlich').describe('Buchungslink'), 'shared')}).strict().describe('Videocall'),
 visit:lines.describe('Besuchsanschrift'),post:lines.describe('Postanschrift'),
}).strict().meta({'x-afe':{collection:{label:'Kontakt',title:[],operations:['update']}}});
