// Gemeinsame Angaben für Blogkarten und Artikelseite: Autor, Datum, Lesezeit, Kicker.
import type { CollectionEntry } from 'astro:content';
import {person} from '../../content/people.mjs';
type Post = CollectionEntry<'posts'>;

/** Laut Fragebogen (21.10.2026) schreibt Florian Becker den Blog; die Zuordnung verwendet seine stabile Personen-ID. */
export const authorOf = (post:Post) => ({ ...person(post.data.authorId), roleKey: 'blog.director' });

import { localeOfId, localeFormat } from '../../i18n/routing.mjs';
import { createTranslator } from '../../i18n/ui.mjs';
export const dateOf = (p: Post) => new Intl.DateTimeFormat(localeFormat(localeOfId(p.id)), { dateStyle: 'long' }).format(p.data.date);
/** Lesezeit bei rund 200 Wörtern pro Minute, ohne Bild-URLs und Markdown-Zeichen. */
export const readingMinutes = (p: Post) => Math.max(1, Math.round((p.body ?? '').replace(/!\[[^\]]*\]\([^)]*\)|\]\([^)]*\)|[#*_>`-]/g, ' ').split(/\s+/).filter(Boolean).length / 200));
/** Thema als Kicker: das erste Schlagwort, das mehr sagt als „Drohnenshow“. */
export const topicOf = (p: Post) => { const topic = p.data.tags.find((t) => t !== 'Drohnenshow') ?? p.data.tags[0] ?? 'Blog'; const key = ({ Technik: 'blog.technology', Nachhaltigkeit: 'blog.sustainability', Programmierung: 'blog.programming' } as Record<string, string>)[topic]; return key ? createTranslator(localeOfId(p.id))(key) : topic; };
export const sortPosts = (list: Post[]) => list.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
