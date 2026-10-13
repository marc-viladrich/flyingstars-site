import {z} from 'astro/zod';
import {image,editorialHref} from './page-schema.mjs';
export const clientSchema=z.object({
  name:z.string().min(1).describe('Kundenname'),
  logo:image.optional().describe('Kundenlogo'),
  href:z.string().regex(editorialHref).optional().describe('Website des Kunden'),
  tall:z.boolean().default(false).describe('Hochformat-Logo'),
  featured:z.boolean().default(false).describe('Hervorgehobener Kunde'),
  testimonial:z.object({quote:z.string().min(1).describe('Kundenstimme'),person:z.string().min(1).describe('Name der Person'),role:z.string().optional().describe('Rolle')}).optional().describe('Kundenstimme'),
});
export const teamSchema=z.object({name:z.string().min(1).describe('Name'),role:z.string().min(1).describe('Rolle'),image:image.optional().describe('Porträt'),bio:z.string().optional().describe('Kurzbiografie')});
export const mediaSchema=z.object({title:z.string().min(1).describe('Medientitel'),src:image.shape.src,defaultAlt:z.string().describe('Standard-Alternativtext'),width:z.number().int().positive(),height:z.number().int().positive(),mime:z.string().min(1)});
