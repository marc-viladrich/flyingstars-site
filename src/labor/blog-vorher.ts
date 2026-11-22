// Vorher-Fassungen der drei Cornerstone-Artikel (Marc, 22.11.2026: „mach die neuen Artikel als Duplikate der alten, damit wir den
// Vorher/Nachher-Vergleich später machen können“). Die Collection trägt seit Runde 19 den neuen Text in Wir-Form; der alte Text
// liegt unverändert in ./blog-vorher/ (DE) bzw. ./blog-vorher/<en|nl>/ und erscheint unter /blog-vorher/<post-id>/ (EN/NL mit
// Sprachpräfix) im normalen Blogformat: noindex, nicht im Blog, nicht in der Sitemap (astro.config.mjs), nirgends verlinkt.
// Nach der Entscheidung: diese Datei, den Ordner ./blog-vorher/, die Seiten src/pages/**/blog-vorher/ und den Sitemap-Filter löschen.
type Old = { frontmatter: { title: string; description: string }; Content: any };
const files = import.meta.glob<Old>('./blog-vorher/**/*.md', { eager: true });
const localeOf = (file: string) => /\/blog-vorher\/(en|nl)\//.exec(file)?.[1] ?? 'de';
const idOf = (file: string) => file.split('/').pop()!.replace(/\.md$/, '');
export const vorherPaths = (locale: 'de' | 'en' | 'nl') =>
  Object.keys(files).filter((f) => localeOf(f) === locale).map((f) => ({ params: { slug: idOf(f) } }));
export const vorher = (locale: string, slug: string) =>
  Object.entries(files).find(([f]) => localeOf(f) === locale && idOf(f) === slug)?.[1];
