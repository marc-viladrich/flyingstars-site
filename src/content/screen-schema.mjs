import {z} from 'astro/zod';
import {inlineText} from '../schemas/inline-text.mjs';
const tier=z.object({build:z.string().describe('Animationskennung'),caption:z.string().describe('Beschreibung der Vorschau')});
const motif=z.object({id:z.string().describe('Motivkennung'),label:z.string().describe('Motivname'),tiers:z.object({SPARK:tier.optional(),HORIZON:tier,ODYSSEY:tier}).describe('Paketvarianten')});
const occasion=z.object({id:z.string().describe('Anlasskennung'),label:z.string().describe('Anlassname'),anlass:z.enum(['privat','sonstiges','firma','stadt']).describe('Formular-Anlass'),motifs:z.array(motif).describe('Motive')});
export const screenSchema=z.object({title:z.string().min(1).describe('Meta-Titel'),description:z.string().min(50).max(160).describe('Meta-Beschreibung'),headline:inlineText('Überschrift').min(1),text:z.string().optional().describe('Einleitung'),noindex:z.boolean(),occasions:z.array(occasion).optional().describe('Vorschau-Anlässe')}).strict();
