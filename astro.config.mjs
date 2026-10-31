// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// SITE_URL und MEDIA_HOST kommen aus der Umgebung (lokal .env, in CI als Variable),
// damit dieselbe Codebasis für Preview und Produktion gebaut werden kann.
const site = process.env.SITE_URL ?? 'https://example.invalid';
const mediaHost = process.env.MEDIA_HOST ?? 'media.example.invalid';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap()],
  image: {
    // Nur der zentrale Medienspeicher darf als Remote-Bildquelle dienen.
    remotePatterns: [...new Set([mediaHost, 'flyingstars.art', 'flyingstars-relaunch.vercel.app'])].map((hostname) => ({ protocol: 'https', hostname })),
  },
  build: { inlineStylesheets: 'auto' },
  // Weiterleitungen nach dem Umbau zu Stufe 1 (30.10.2026). Im statischen Build entstehen daraus Seiten mit
  // meta refresh und canonical; auf dem Host sollten dieselben Paare zusätzlich als echte 301 eingetragen werden.
  // Die Fallstudien bleiben unter ihren Live-URLs im Wurzelverzeichnis (Moritz' Sitemap vom 07.10.).
  redirects: {
    '/projekte': '/referenzen/',
    '/projekte/musikalischer-teaser-bokkenrijders': '/musikalischer-teaser-bokkenrijders/',
    '/projekte/nfl-berlin-game': '/nfl-berlin-game/',
    '/projekte/exploring-reinvented-der-neue-ford-explorer': '/exploring-reinvented-der-neue-ford-explorer/',
    '/projekte/puma-bundesliga': '/puma-bundesliga/',
    '/leistungen': '/drohnenshow-preise/',
    '/warum-wir': '/ueber-uns/',
  },
});
