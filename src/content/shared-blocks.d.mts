import type {z} from 'zod';
import type {Section} from '../content.config';
import type {siteDiagramSchema,siteItemsSchema,responsibilitySchema,siteDownloadSchema,pillarsSchema} from '../schemas/shared-blocks.mjs';
type Safety={diagram:z.infer<typeof siteDiagramSchema>;items:z.infer<typeof siteItemsSchema>;responsibilities:z.infer<typeof responsibilitySchema>[];download:z.infer<typeof siteDownloadSchema>};
export const SAFETY_CONCEPT:Record<string,Safety>;
export const SUSTAINABILITY_PILLARS:Record<string,{pillars:z.infer<typeof pillarsSchema>}>;
export function localizedBlock<T>(source:Record<string,T>,locale:string):T;
export function landingSiteContent(section:Extract<Section,{type:'landingSite'}>,locale:string,source?:typeof SAFETY_CONCEPT):Extract<Section,{type:'landingSite'}>&Safety;
