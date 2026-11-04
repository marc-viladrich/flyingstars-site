import {factText} from '../content/show-extras.mjs';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { getCollection, type CollectionEntry, type CollectionKey } from 'astro:content';
import { LOCALES, localeOfId, sourceId } from './routing.mjs';

/** Every query uses the requested locale, including related cards and FAQ. No silent DE fallback. */
export async function localizedCollection<C extends CollectionKey>(collection: C, locale: string, filter: (entry: CollectionEntry<C>) => unknown = () => true): Promise<CollectionEntry<C>[]> {
  return (await getCollection(collection)).filter((entry) => localeOfId(entry.id) === locale && filter(entry));
}

/** A new source entry requires EN and NL entries before it can be built. Drafts stay drafts. */
export async function checkContentCoverage() {
  for (const collection of ['pages', 'projects', 'posts', 'faq'] as const) {
    const entries = await getCollection(collection);
    for(const entry of entries){const raw=await readFile(`src/content/${collection}/${entry.id}.${collection==='pages'?'yaml':'md'}`,'utf8');factText(raw,localeOfId(entry.id));}
    const source = entries.filter((e) => localeOfId(e.id) === 'de');
    for (const locale of LOCALES.filter((l) => l !== 'de')) {
      const ids = new Set(entries.filter((e) => localeOfId(e.id) === locale).map((e) => sourceId(e.id)));
      for (const e of source) {
        if (!ids.delete(e.id)) throw new Error(`Missing ${locale} translation: ${collection}/${e.id}`);
        const translated = entries.find((entry) => entry.id === `${locale}/${e.id}`)!;
        const raw = await readFile(`src/content/${collection}/${e.id}.${collection === 'pages' ? 'yaml' : 'md'}`, 'utf8');
        const hash = createHash('sha256').update(raw).digest('hex');
        if (translated.data.translationSourceHash !== hash) throw new Error(`Stale ${locale} translation: ${collection}/${e.id}. Review changed German copy and update translationSourceHash.`);
      }
      if (ids.size) throw new Error(`Orphan ${locale} translations in ${collection}: ${[...ids].join(', ')}`);
    }
  }
}
