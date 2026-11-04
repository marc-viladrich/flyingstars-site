import {projectView} from '../../content/project-facts.mjs';
// Gemeinsame Logik für Referenzkarten (ProjectGrid, References): Adresse, Kennzahlen, Filterwerte.
import type { CollectionEntry } from 'astro:content';
import { videos } from '../../lib/videos';
type Project = CollectionEntry<'projects'>;

export const OCCASIONS = { firma: 'references.brands', stadt: 'references.cities', kultur: 'references.culture', privat: 'contactform.weddingPrivate', indoor: 'references.indoor', sonstiges: 'contactform.other' } as const;
export type Occasion = keyof typeof OCCASIONS;
// Drohnenzahl in drei Stufen, angelehnt an die Pakete (SPARK bis 150, darüber HORIZON, ab 300+ ODYSSEY-Größe)
export const DRONE_BANDS = [
  { id: 'bis-150', labelKey: 'references.upTo', test: (n: number) => n <= 150 },
  { id: '151-300', labelKey: 'references.medium', test: (n: number) => n > 150 && n <= 300 },
  { id: 'ueber-300', labelKey: 'references.over', test: (n: number) => n > 300 },
] as const;

/** Fallstudien liegen im Wurzelverzeichnis (/<route>/); andere Referenzen haben keine eigene Seite. */
export const hrefOf = (p: Project) => (p.data.showcase ? `/${p.data.showcase.route}/` : undefined);
export const dronesOf = (p: Project) => projectView(p).data.drones ?? projectView(p).data.showcase?.drones;
export const yearOf = (p: Project) => projectView(p).data.date.getUTCFullYear();
export const bandOf = (p: Project) => { const n = dronesOf(p); return n ? DRONE_BANDS.find((b) => b.test(n))?.id : undefined; };
export const kickOf = (p: Project) => p.data.showcase?.category ?? [projectView(p).data.client, projectView(p).data.location].filter(Boolean).join(' · ');
export const sortProjects = (list: Project[]) => list.sort((a, b) => (a.data.showcase?.order ?? 999) - (b.data.showcase?.order ?? 999) || Number(b.data.featured) - Number(a.data.featured) || projectView(b).data.date.valueOf() - projectView(a).data.date.valueOf());

/** Referenz mit registriertem Showvideo (dieselbe Prüfung wie in ProjectCard). */
export const hasVideo = (p: Project) => { const clip = p.data.showcase?.heroVideo; return !!clip && Object.values(videos).some((src) => src === clip); };
/** Referenzen-Seite (Marc, 31.10.2026): zuerst die Shows mit Video in Fallstudien-Reihenfolge, danach alle anderen chronologisch, neueste zuerst. */
export const sortReferences = (list: Project[]) => list.sort((a, b) =>
  Number(hasVideo(b)) - Number(hasVideo(a))
  || (hasVideo(a) ? (a.data.showcase?.order ?? 999) - (b.data.showcase?.order ?? 999) : 0)
  || projectView(b).data.date.valueOf() - projectView(a).data.date.valueOf());
