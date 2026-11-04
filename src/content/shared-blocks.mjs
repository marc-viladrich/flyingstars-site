import safety from './safety-concept.json' with {type:'json'};
import sustainability from './sustainability-pillars.json' with {type:'json'};
import {safetyConceptSchema,sustainabilityPillarsSchema} from '../schemas/shared-blocks.mjs';
export const SAFETY_CONCEPT=safetyConceptSchema.parse(safety);
export const SUSTAINABILITY_PILLARS=sustainabilityPillarsSchema.parse(sustainability);
export function localizedBlock(source,locale){if(!Object.hasOwn(source,locale))throw Error('Unbekannte Bausteinsprache: '+locale);return source[locale];}
export function landingSiteContent(section,locale,source=SAFETY_CONCEPT){return section.safetyRef?{...section,...localizedBlock(source,locale),responsibilities:[...(section.additionalResponsibilities??[]),...localizedBlock(source,locale).responsibilities]}:section;}
