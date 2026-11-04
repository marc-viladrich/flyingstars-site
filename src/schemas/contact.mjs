import {z} from 'zod';
const phone=z.string().regex(/^0[1-9][0-9 ]+$/,'Deutsche Telefonnummer mit führender 0 und Leerzeichen');
const lines=z.array(z.string().min(1).describe('Adresszeile')).min(1).describe('Adresszeilen').meta({'x-afe':{array:{insertable:true,removable:true,reorderable:true}}});
export const contactSchema=z.object({
 email:z.email().describe('E-Mail'),phone:phone.describe('Festnetz'),mobile:phone.describe('Mobil und WhatsApp'),
 video:z.object({labelKey:z.literal('contact.videoCall').describe('Beschriftung').meta({'x-afe':{readOnly:true}}),href:z.url().refine(v=>v.startsWith('https://'),'HTTPS erforderlich').describe('Buchungslink')}).strict().describe('Videocall'),
 visit:lines.describe('Besuchsanschrift'),post:lines.describe('Postanschrift'),
}).strict().meta({'x-afe':{collection:{label:'Kontakt',title:[],operations:['update']}}});
