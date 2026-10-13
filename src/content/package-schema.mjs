import { z } from 'astro/zod';

import {PACKAGE_KEYS} from './package-ids.mjs';
export {PACKAGE_KEYS};
const text = label => z.string().min(1).describe(label);
const count = label => z.number().int().positive().max(1000).describe(label);
const amount = label => z.number().int().positive().max(1000000).describe(label);

/** The same native package schema validates builds and editor changes. */
export const packageSchema = z.object({
  name: z.enum(PACKAGE_KEYS).describe('Paketname'),
  base: count('Drohnen im Einstiegspaket'),
  max: count('Maximale Drohnenzahl').nullable().describe('Maximale Drohnenzahl; null bedeutet unbegrenzt'),
  price: amount('Einstiegspreis in Euro, netto'),
  step: count('Zusätzliche Drohnen je Preisstufe'),
  add: amount('Aufpreis je Preisstufe in Euro'),
  dur: text('Showdauer'),
  color: z.tuple([z.number().int().min(0).max(255), z.number().int().min(0).max(255), z.number().int().min(0).max(255)]).describe('Paketfarbe als RGB'),
  orbShape: z.enum(['ring', 'sphere', 'torus']).describe('Animierte Paketformation'),
  badge: text('Paketkennzeichnung'),
  description: text('Paketbeschreibung'),
  inheritsText: z.string().describe('Enthaltenes Vorgängerpaket'),
  highlight: z.boolean().describe('Paket hervorheben'),
  featureGroups: z.array(z.object({
    title: text('Leistungsgruppe'),
    items: z.array(text('Leistung')).min(1).describe('Leistungen'),
  }).strict()).min(1).describe('Ausführliche Paketleistungen'),
  effortLabel: text('Aufwand im Show-Konfigurator'),
  includes: text('Enthaltene Leistungen im Show-Konfigurator'),
}).strict().superRefine((value, context) => {
  if (value.max !== null && value.max < value.base) {
    context.addIssue({ code: 'custom', path: ['max'], message: 'Die maximale Drohnenzahl darf nicht kleiner als die Einstiegszahl sein.' });
  }
});
