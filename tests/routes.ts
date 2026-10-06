import { readdirSync } from 'node:fs';

// Alle tatsächlich gebauten HTML-Seiten prüfen, auch automatisch erzeugte Inhalte.
export const routes = readdirSync(new URL('../dist/', import.meta.url), { recursive: true })
  .filter((file) => typeof file === 'string' && file.endsWith('.html'))
  .map((file) => `/${String(file).replaceAll('\\', '/')}`.replace(/\/index\.html$/, '/'))
  .sort();
