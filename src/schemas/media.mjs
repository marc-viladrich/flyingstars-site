import {z} from 'zod';
// Shared by ordinary section images and case-study photographs.
export const imageSource = z.union([z.url({protocol:/^https$/}),z.string().regex(/^\/assets\/[a-f0-9]{64}\.(?:png|jpg|webp)$/)]).describe('URL im Medienspeicher oder geprüfter Editor-Upload');
export const imageMetadata = {format:'image','x-afe':{widget:'flyingstars/image',media:{policy:'flyingstars/uploads',shape:{kind:'object',source:['src'],alt:['alt'],width:['width'],height:['height']}}}};
