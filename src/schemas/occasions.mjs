import {fieldPolicy} from '../i18n/field-policy.mjs';
import {z} from 'zod';
// Zentrale Anlass-Kategorien (Marc, 19.11.2026: „überall die gleichen Kategorien … centrally defined“). Menü, Footer,
// Startseiten-Karten, Referenzfilter, Fallstudien und Anfrageformular lesen nur diese Datei. Die Schlüssel sind Identitäten
// (Inhalte, Formularwerte, Links mit ?anlass=…) und deshalb im Editor nicht änderbar.
const id=fieldPolicy(z.string().regex(/^[a-z]+(?:-[a-z]+)*$/).describe('Schlüssel').meta({'x-afe':{readOnly:true}}), 'shared');
const text=label=>z.object({de:fieldPolicy(z.string().min(1).describe('Deutsch'), 'translatable'),en:fieldPolicy(z.string().min(1).describe('Englisch'), 'translatable'),nl:fieldPolicy(z.string().min(1).describe('Niederländisch'), 'translatable')}).strict().describe(label);
const path=label=>fieldPolicy(z.string().regex(/^\/[^\s?#]*(?:#[\w-]+)?$/,'Lokaler Pfad, optional mit #Abschnitt').optional().describe(label), 'shared');
const occasion=z.object({
 id,label:text('Bezeichnung (Karten, Filter, Formular)'),
 page:path('Eigene Anlass-Seite: erscheint damit automatisch in Menü und Footer, das Formular dort wählt den Anlass vor'),
 href:path('Nur ohne eigene Seite: Linkziel der Startseiten-Karte (z. B. eine Fallstudie). Leer: Anfrage mit diesem Anlass'),
 menuLabel:text('Abweichende Bezeichnung in Menü und Footer').optional(),
}).strict();
export const occasionsSchema=z.object({
 occasions:z.array(occasion).min(1).refine(list=>new Set(list.map(o=>o.id)).size===list.length,'Schlüssel nur einmal vergeben').refine(list=>list.every(o=>!(o.page&&o.href)),'Entweder eigene Seite oder Linkziel').meta({'x-afe':{array:{reorderable:true}}}).describe('Anlässe'),
}).strict().meta({'x-afe':{derivedNote:'Ändert Menü, Footer, Startseiten-Karten, Referenzfilter, Fallstudien und Anfrageformular zugleich.',collection:{label:'Anlässe',title:[],operations:['update']}}});
