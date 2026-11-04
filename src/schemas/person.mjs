import {z} from 'zod';
import {localizedText} from './shared-blocks.mjs';
import {imageSource,imageMetadata} from './media.mjs';
export const personSchema=z.object({name:z.string().min(1).describe('Name'),role:localizedText('Rolle'),bio:localizedText('Kurzvorstellung'),imageAlt:localizedText('Porträtbeschreibung').optional(),order:z.number().int().positive().describe('Reihenfolge'),founder:z.boolean().describe('Gründungsmitglied und Ansprechpartner:in'),image:z.object({src:imageSource,width:z.number().int().positive().describe('Quellbreite in Pixeln'),height:z.number().int().positive().describe('Quellhöhe in Pixeln')}).meta(imageMetadata).optional().describe('Porträt')}).strict().meta({'x-afe':{collection:{label:'Person',title:['name'],operations:['update']}}});
