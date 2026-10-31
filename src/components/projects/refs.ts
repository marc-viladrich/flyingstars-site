// Gemeinsame Logik für Referenzkarten (ProjectGrid, References): Adresse, Kennzahlen, Filterwerte.
import type { CollectionEntry } from 'astro:content';
type Project = CollectionEntry<'projects'>;

export const OCCASIONS = { firma: 'Marken & Unternehmen', stadt: 'Städte & Festivals', kultur: 'Kultur & Bühne', privat: 'Hochzeit & Privat', indoor: 'Indoor', sonstiges: 'Sonstiges' } as const;
export type Occasion = keyof typeof OCCASIONS;
// Drohnenzahl in drei Stufen, angelehnt an die Pakete (SPARK bis 150, darüber HORIZON, ab 300+ ODYSSEY-Größe)
export const DRONE_BANDS = [
  { id: 'bis-150', label: 'bis 150', test: (n: number) => n <= 150 },
  { id: '151-300', label: '151 bis 300', test: (n: number) => n > 150 && n <= 300 },
  { id: 'ueber-300', label: 'über 300', test: (n: number) => n > 300 },
] as const;

/** Fallstudien liegen im Wurzelverzeichnis (/<route>/); andere Referenzen haben keine eigene Seite. */
export const hrefOf = (p: Project) => (p.data.showcase ? `/${p.data.showcase.route}/` : undefined);
export const dronesOf = (p: Project) => p.data.drones ?? p.data.showcase?.drones;
export const yearOf = (p: Project) => p.data.date.getFullYear();
export const bandOf = (p: Project) => { const n = dronesOf(p); return n ? DRONE_BANDS.find((b) => b.test(n))?.id : undefined; };
export const kickOf = (p: Project) => p.data.showcase?.category ?? [p.data.client, p.data.location].filter(Boolean).join(' · ');
export const sortProjects = (list: Project[]) => list.sort((a, b) => (a.data.showcase?.order ?? 999) - (b.data.showcase?.order ?? 999) || Number(b.data.featured) - Number(a.data.featured) || b.data.date.valueOf() - a.data.date.valueOf());
