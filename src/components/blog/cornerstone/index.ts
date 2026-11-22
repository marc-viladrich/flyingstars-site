// Registrierung der Cornerstone-Artikel: jede Datei in ./articles/ exportiert per default ein CornerstoneArticle
// (defineCornerstone) und ist damit eingehängt; keine zentrale Liste zu pflegen. Der Lead hängt weitere Artikel ein, indem er
// ihre Datei dort ablegt (Szene, Fotos, Texte unter ihrem i18n-Präfix in src/i18n/ui.json).
import type { CollectionEntry } from 'astro:content';
import { sourceId } from '../../../i18n/routing.mjs';
import type { CornerstoneArticle } from './types';

const modules = import.meta.glob<{ default: CornerstoneArticle }>('./articles/*.ts', { eager: true });
const registry = new Map<string, CornerstoneArticle>();
for (const [file, mod] of Object.entries(modules)) {
  const article = mod.default;
  if (!article?.post) throw new Error(`Cornerstone ${file}: default export mit post fehlt`);
  if (registry.has(article.post)) throw new Error(`Cornerstone ${article.post} ist doppelt registriert (${file})`);
  registry.set(article.post, article);
}
/** Der registrierte Cornerstone-Artikel zu einem Post (jede Sprache), sonst undefined */
export const cornerstoneOf = (post: CollectionEntry<'posts'>) => registry.get(sourceId(post.id));
export const cornerstones = () => [...registry.values()];
