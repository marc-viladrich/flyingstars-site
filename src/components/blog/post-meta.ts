// Gemeinsame Angaben für Blogkarten und Artikelseite: Autor, Datum, Lesezeit, Kicker.
import type { CollectionEntry } from 'astro:content';
import { FOUNDERS } from '../people';
type Post = CollectionEntry<'posts'>;

/** Laut Fragebogen (21.10.2026) schreibt Florian Becker den Blog; das Schema kennt (noch) kein Autorenfeld. */
export const AUTHOR = { name: 'Florian Becker', role: 'Geschäftsführer', image: FOUNDERS.find((f) => f.name === 'Florian Becker')!.image };

const fmt = new Intl.DateTimeFormat('de-DE', { dateStyle: 'long' });
export const dateOf = (p: Post) => fmt.format(p.data.date);
/** Lesezeit bei rund 200 Wörtern pro Minute, ohne Bild-URLs und Markdown-Zeichen. */
export const readingMinutes = (p: Post) => Math.max(1, Math.round((p.body ?? '').replace(/!\[[^\]]*\]\([^)]*\)|\]\([^)]*\)|[#*_>`-]/g, ' ').split(/\s+/).filter(Boolean).length / 200));
/** Thema als Kicker: das erste Schlagwort, das mehr sagt als „Drohnenshow“. */
export const topicOf = (p: Post) => p.data.tags.find((t) => t !== 'Drohnenshow') ?? p.data.tags[0] ?? 'Blog';
export const sortPosts = (list: Post[]) => list.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
