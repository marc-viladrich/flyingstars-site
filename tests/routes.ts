import { readdirSync, readFileSync } from 'node:fs';

const dist = new URL('../dist/', import.meta.url);
const files = readdirSync(dist, { recursive: true })
  .filter((file) => typeof file === 'string' && file.endsWith('.html'))
  .map((file) => String(file).replaceAll('\\', '/'));
const toRoute = (file: string) => `/${file}`.replace(/\/index\.html$/, '/');
// Astro schreibt Weiterleitungen (astro.config redirects) als kleine Seiten mit meta refresh. Sie sind keine
// Inhaltsseiten und werden in tests/projects.spec.ts eigens geprüft (Ziel und canonical).
const isRedirect = (file: string) => /<meta http-equiv="refresh"/i.test(readFileSync(new URL(file, dist), 'utf8'));

// Alle tatsächlich gebauten HTML-Seiten prüfen, auch automatisch erzeugte Inhalte.
export const routes = files.filter((file) => !isRedirect(file)).map(toRoute).sort();
export const redirects = files.filter(isRedirect).map(toRoute).sort();
