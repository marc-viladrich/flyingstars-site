import {z} from 'astro/zod';
// Metadata lives on the field, including on an optional wrapper used by the editor schema walker.
export const inlineText=label=>z.string().describe(label).meta({format:'inline'});
