import {fieldPolicy} from '../i18n/field-policy.mjs';
import {z} from 'zod';
import {localizedText} from './shared-blocks.mjs';
import {imageSource,imageMetadata} from './media.mjs';
export const personSchema=z.object({name:fieldPolicy(z.string().min(1).describe('Name'), 'shared'),role:localizedText('Rolle'),bio:localizedText('Kurzvorstellung'),imageAlt:localizedText('Porträtbeschreibung').optional(),order:fieldPolicy(z.number().int().positive().describe('Reihenfolge'), 'shared'),founder:fieldPolicy(z.boolean().describe('Gründungsmitglied und Ansprechpartner:in'), 'shared'),image:z.object({src:imageSource,width:fieldPolicy(z.number().int().positive().describe('Quellbreite in Pixeln'), 'shared'),height:fieldPolicy(z.number().int().positive().describe('Quellhöhe in Pixeln'), 'shared')}).meta(imageMetadata).optional().describe('Porträt')}).strict().meta({'x-afe':{collection:{label:'Person',title:['name'],operations:['update']}}});
