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
  // Lokal leitet Tailscale den Dev-Port (4391) aufs Handy weiter und belegt ihn dafür auf der Tailnet-Adresse. Vite hält
  // den Port dann für belegt und weicht aus; mit STRICT_PORT=1 bindet es trotzdem an 127.0.0.1:4391.
  vite: { server: { strictPort: process.env.STRICT_PORT === '1' } },
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
    // Sechzehnte Fassung des Konfigurators (31.10.2026): er steht als Komponente direkt auf der Preisseite. Achtung: Die
    // statische Weiterleitung (meta refresh) verliert Query-Parameter; Direktlinks zeigen deshalb auf
    // /drohnenshow-preise/?anlass=…#konfigurator.
    '/show-konfigurator': '/drohnenshow-preise/#konfigurator',
  },
});
