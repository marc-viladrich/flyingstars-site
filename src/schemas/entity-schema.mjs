import {editable} from './afe-meta.mjs';
import {z} from 'astro/zod';
import {image,editorialHref} from './page-schema.mjs';
export const clientSchema=z.object({
  name:z.string().min(1).describe('Kundenname'),
  logo:image.optional().describe('Kundenlogo'),
  href:z.string().regex(editorialHref).optional().describe('Website des Kunden').meta(editable({"format":"url"})),
  tall:z.boolean().default(false).describe('Hochformat-Logo'),
  featured:z.boolean().default(false).describe('Hervorgehobener Kunde'),
  testimonial:z.object({quote:z.string().min(1).describe('Kundenstimme').meta(editable({"format":"multiline","translatable":true})),person:z.string().min(1).describe('Name der Person').meta(editable({"translatable":true})),role:z.string().optional().describe('Rolle').meta(editable({"translatable":true}))}).optional().describe('Kundenstimme'),
}).meta(editable({"collection":{"label":"Kunde","title":["name"],"icon":"building-2","group":"Kunden","operations":["update","create","delete"],"placement":"frontend","i18n":{"mode":"overlay"},"policies":["flyingstars/media-ownership"]}}));
export const teamSchema=z.object({name:z.string().min(1).describe('Name'),role:z.string().min(1).describe('Rolle').meta(editable({"translatable":true})),image:image.optional().describe('Porträt'),bio:z.string().optional().describe('Kurzbiografie').meta(editable({"format":"multiline","translatable":true}))}).meta(editable({"collection":{"label":"Teammitglied","title":["name"],"icon":"user","group":"Team","operations":["update","create","delete"],"placement":"frontend","i18n":{"mode":"overlay"},"policies":["flyingstars/media-ownership"]}}));
export const mediaSchema=z.object({title:z.string().min(1).describe('Medientitel').meta(editable({"translatable":false})),src:image.shape.src.describe("Src").meta(editable({"visibility":"advanced","readOnly":true})),defaultAlt:z.string().describe('Standard-Alternativtext').meta(editable({"translatable":false})),width:z.number().int().positive().describe("Width").meta(editable({"visibility":"advanced","readOnly":true})),height:z.number().int().positive().describe("Height").meta(editable({"visibility":"advanced","readOnly":true})),mime:z.string().min(1).describe("Mime").meta(editable({"visibility":"advanced","readOnly":true}))}).meta(editable({"collection":{"label":"Medium","title":["title"],"icon":"image","group":"Medien","operations":["update","create","delete"],"placement":"library","i18n":{"mode":"none"},"policies":["flyingstars/media-ownership"]}}));
