import {editable} from './afe-meta.mjs';
import {z} from 'astro/zod';
// Content format 2: one file per [source record, locale] at translations/<source id>/<locale>.json, and
// value paths address list items by key where the list declares one (see astro-frontend-editor/content).
const keyedSegment=z.record(z.string(),z.union([z.string(),z.number().int()])).refine(segment=>Object.keys(segment).length===1&&!['__proto__','constructor','prototype'].includes(Object.keys(segment)[0]),'Ein Listen-Schlüssel hat genau eine Eigenschaft.');
export const translationSchema=z.object({
 format:z.literal(2).describe("Format").meta(editable({"visibility":"hidden"})),
 sourceId:z.string().regex(/^(page|post|project|faq|client|team|screen|extra|package|site)\/[a-z0-9][a-z0-9/-]*$/).describe("Source Id").meta(editable({"visibility":"advanced"})),
 locale:z.enum(['en','nl']).describe("Locale").meta(editable({"visibility":"advanced"})),
 sourceHash:z.string().regex(/^[a-f0-9]{64}$/).describe("Source Hash").meta(editable({"visibility":"advanced"})),
 values:z.array(z.object({path:z.array(z.union([z.string().refine(k=>!['__proto__','constructor','prototype'].includes(k),'Dieser technische Feldname ist nicht erlaubt.').describe('Path'),z.number().int().nonnegative().describe('Path'),keyedSegment.describe('Path')]).describe("Path")).describe("Path").meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true}})),text:z.string().describe("Text").meta(editable({"translatable":false})),reviewed:z.boolean().default(false).describe("Reviewed"),sourceHash:z.string().regex(/^[a-f0-9]{64}$/).optional().describe("Source Hash").meta(editable({"visibility":"advanced"}))}).describe("Values")).describe("Values").meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true}})),
}).meta(editable({"collection":{"label":"Sprachfassung","title":[],"icon":"languages","group":"Sprachfassungen","operations":["update","create","delete"],"placement":"library","i18n":{"mode":"none"},"policies":["flyingstars/media-ownership"]}}));
