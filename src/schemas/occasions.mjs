import {fieldPolicy} from '../i18n/field-policy.mjs';
import {z} from 'zod';
// Zentrale Anlass-Kategorien (Marc, 19.11.2026: „überall die gleichen Kategorien … centrally defined“). Menü, Startseiten-
// Karten, Referenzfilter, Fallstudien und Anfrageformular lesen nur diese Datei. Die Schlüssel sind Identitäten (Inhalte,
// Formularwerte, Links mit ?anlass=…) und deshalb im Editor nicht änderbar.
const id=fieldPolicy(z.string().regex(/^[a-z]+(?:-[a-z]+)*$/).describe('Schlüssel').meta({'x-afe':{readOnly:true}}), 'shared');
const label=z.object({de:fieldPolicy(z.string().min(1).describe('Deutsch'), 'translatable'),en:fieldPolicy(z.string().min(1).describe('Englisch'), 'translatable'),nl:fieldPolicy(z.string().min(1).describe('Niederländisch'), 'translatable')}).strict().describe('Bezeichnung');
const href=fieldPolicy(z.string().regex(/^\/[^\s?]*(?:#[\w-]+)?$/,'Lokaler Pfad, optional mit #Abschnitt').optional().describe('Zielseite (leer: Anfrageformular mit diesem Anlass)'), 'shared');
const occasion=z.object({id,label,href,menu:fieldPolicy(z.boolean().describe('Im Menü „Anlässe“ zeigen'), 'shared')}).strict();
export const occasionsSchema=z.object({
 occasions:z.array(occasion).min(1).refine(list=>new Set(list.map(o=>o.id)).size===list.length,'Schlüssel nur einmal vergeben').meta({'x-afe':{array:{reorderable:true}}}).describe('Anlässe'),
 fallback:z.object({id,label}).strict().describe('Nur im Anfrageformular: „passt nirgends“'),
}).strict().refine(data=>!data.occasions.some(o=>o.id===data.fallback.id),'Der Ausweichwert darf kein Anlass sein').meta({'x-afe':{derivedNote:'Ändert Menü, Startseiten-Karten, Referenzfilter, Fallstudien und Anfrageformular zugleich.',collection:{label:'Anlässe',title:[],operations:['update']}}});
