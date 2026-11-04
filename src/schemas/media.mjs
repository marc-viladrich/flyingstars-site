import {fieldPolicy} from '../i18n/field-policy.mjs';
import {z} from 'zod';
// Shared by ordinary section images and case-study photographs.
export const imageSource = z.union([fieldPolicy(z.url({protocol:/^https$/}), 'shared'),fieldPolicy(z.string().regex(/^\/assets\/[a-f0-9]{64}\.(?:png|jpg|webp)$/), 'shared')]).describe('URL im Medienspeicher oder geprüfter Editor-Upload');
export const imageMetadata = {format:'image','x-afe':{widget:'flyingstars/image',media:{policy:'flyingstars/uploads',shape:{kind:'object',source:['src'],alt:['alt'],width:['width'],height:['height']}}}};
