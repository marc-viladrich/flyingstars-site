import {editable} from '../schemas/afe-meta.mjs';
import { z } from 'astro/zod';
import {isColorToken} from '../lib/color-tokens.mjs';
import {inlineText} from '../schemas/inline-text.mjs';

import {PACKAGE_KEYS} from './package-ids.mjs';
export {PACKAGE_KEYS};
const text = label => z.string().min(1).describe(label).meta(editable({translatable:true}));
const count = label => z.number().int().positive().max(1000).describe(label);
const amount = label => z.number().int().positive().max(1000000).describe(label);

/** The same native package schema validates builds and editor changes. */
export const packageSchema = z.object({
  name: z.enum(PACKAGE_KEYS).describe('Interne Paketkennung').meta(editable({"readOnly":true,"visibility":"hidden"})),
  displayName: inlineText('Paketname auf der Website').min(1).max(80).optional(),
  base: count('Drohnen im Einstiegspaket'),
  max: count('Maximale Drohnenzahl').nullable().describe('Maximale Drohnenzahl; null bedeutet unbegrenzt'),
  price: amount('Einstiegspreis in Euro, netto'),
  step: count('Zusätzliche Drohnen je Preisstufe'),
  add: amount('Aufpreis je Preisstufe in Euro'),
  dur: text('Showdauer').meta(editable({"translatable":true})),
  color: z.string().refine(isColorToken, 'Unbekannte Farbe').describe('Paketfarbe').meta({format: 'color', palette: ['Marke', 'Pakete']}),
  orbShape: z.enum(['ring', 'sphere', 'torus']).describe('Animierte Paketformation').meta(editable({"choices":{"ring":{"label":"Ring"},"sphere":{"label":"Kugel"},"torus":{"label":"Torus"}}})),
  badge: text('Paketkennzeichnung').meta(editable({"translatable":true})),
  description: text('Paketbeschreibung').meta(editable({"format":"multiline","translatable":true})),
  inheritsText: z.string().describe('Enthaltenes Vorgängerpaket').meta(editable({"translatable":true})),
  highlight: z.boolean().describe('Paket hervorheben'),
  featureGroups: z.array(z.object({
    title: text('Leistungsgruppe').meta(editable({"translatable":true})),
    items: z.array(z.object({id:z.string().min(1).max(40).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).describe('Stabile Leistungskennung').meta(editable({"visibility":"advanced"})),text:text('Leistung').meta(editable({"format":"multiline","translatable":true}))}).strict().describe("Einträge")).min(1).describe('Leistungen').meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true,"itemLabel":[]},"widget":"flyingstars/compact-table"})),
  }).strict().describe("Feature Groups")).min(1).describe('Ausführliche Paketleistungen').meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true,"itemLabel":["title"]}})),
  effortLabel: text('Aufwand im Show-Konfigurator').meta(editable({"translatable":true})),
  includes: text('Enthaltene Leistungen im Show-Konfigurator').meta(editable({"format":"multiline","translatable":true})),
}).strict().superRefine((value, context) => {
  const ids=new Set();
  value.featureGroups.forEach((group,i)=>group.items.forEach((item,j)=>{if(ids.has(item.id))context.addIssue({code:'custom',path:['featureGroups',i,'items',j,'id'],message:`Doppelte Leistungskennung im Paket: ${item.id}`});ids.add(item.id);}));
  if (value.max !== null && value.max < value.base) {
    context.addIssue({ code: 'custom', path: ['max'], message: 'Die maximale Drohnenzahl darf nicht kleiner als die Einstiegszahl sein.' });
  }
}).meta(editable({"collection":{"label":"Show-Paket","title":["displayName"],"icon":"package","group":"Show-Pakete","operations":["update"],"placement":"frontend","i18n":{"mode":"overlay"},"policies":["flyingstars/media-ownership"]}}));
