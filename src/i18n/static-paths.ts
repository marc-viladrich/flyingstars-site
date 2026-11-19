import { getCollection } from 'astro:content';
import { publicRouteEntries } from './public-routes.mjs';
import { checkContentCoverage } from './content';

type Kind = 'page' | 'pricing' | 'blog' | 'post' | 'case' | '404';
/**
 * Statische Pfade einer Routenart; `param` ist der Name des Restparameters der Routendatei. Jede Art hat eine eigene Datei unter src/pages/, damit Astro je Art ein eigenes
 * CSS-Bündel baut: die Preisseite lädt so keine Section-Stile der Inhaltsseiten, Inhaltsseiten keine Preis-, Blog- oder
 * Fallstudienstile. Die Routenliste selbst bleibt eine (publicRouteEntries); sie prüft auch doppelte Pfade über alle Arten.
 * Die Inhaltsprüfung davor läuft je Inhaltsstand nur einmal (checkContentCoverage, content-snapshot.mjs).
 */
export async function staticPathsFor(kind: Kind, param: string) {
  await checkContentCoverage();
  const [pages, projects, posts] = await Promise.all([getCollection('pages'), getCollection('projects'), getCollection('posts')]);
  return publicRouteEntries({ pages, projects, posts })
    .filter((route) => route.kind === kind)
    .map(({ path, kind: _kind, ...props }) => ({ params: { [param]: path.replace(/^\/|\/$/g, '') || undefined }, props }));
}
