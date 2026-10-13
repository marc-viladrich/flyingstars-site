import {z} from 'astro/zod';
export const translationSchema=z.object({
 sourceId:z.string().regex(/^(page|post|project|faq|client|team|screen|package)\/[a-z0-9][a-z0-9/-]*$/),
 locale:z.enum(['en','nl']),
 sourceHash:z.string().regex(/^[a-f0-9]{64}$/),
 values:z.array(z.object({path:z.array(z.union([z.string().refine(k=>!['__proto__','constructor','prototype'].includes(k)),z.number().int().nonnegative()])),text:z.string(),reviewed:z.boolean().default(false)})),
});
