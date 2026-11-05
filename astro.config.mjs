// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import {cssDeliveryAudit} from './scripts/css-delivery.mjs';
import {cssMedia} from './scripts/css-media.mjs';
const markerIntegration='astro-frontend-editor/astro/markers';
const editorIntegrations=process.env.AFE_MODE==='editor'?[(await import(markerIntegration)).default()]:[];
import {astroRedirects} from './src/i18n/public-routes.mjs';
import {DEFAULT_BUILD_ORIGIN,mediaHosts} from './src/site-policy.mjs';
import { LOCALES } from './src/i18n/routing.mjs';

// SITE_URL und MEDIA_HOST kommen aus der Umgebung (lokal .env, in CI als Variable),
// damit dieselbe Codebasis für Preview und Produktion gebaut werden kann.
const site = process.env.SITE_URL ?? DEFAULT_BUILD_ORIGIN;
const mediaHost = process.env.MEDIA_HOST ?? 'media.example.invalid';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  cacheDir: process.env.FLYINGSTARS_IMAGE_CACHE_DIR ?? './.astro/cache',
  i18n: { defaultLocale: 'de', locales: [...LOCALES], routing: { prefixDefaultLocale: false } },
  integrations: [...editorIntegrations, cssDeliveryAudit(), sitemap({ i18n: { defaultLocale: 'de', locales: { de: 'de', en: 'en', nl: 'nl' } } })],
  image: {
    ...(process.env.FLYINGSTARS_OFFLINE_MEDIA === '1' ? { service: { entrypoint: 'astro/assets/services/noop' } } : {}),
    // Nur der zentrale Medienspeicher darf als Remote-Bildquelle dienen.
    remotePatterns: mediaHosts(mediaHost).map((hostname) => ({ protocol: 'https', hostname })),
  },
  build: { inlineStylesheets: 'auto' },
  // Lokal leitet Tailscale den Dev-Port (4391) aufs Handy weiter und belegt ihn dafür auf der Tailnet-Adresse. Vite hält
  // den Port dann für belegt und weicht aus; mit STRICT_PORT=1 bindet es trotzdem an 127.0.0.1:4391.
  vite: { css: { postcss: { plugins: [cssMedia()] } }, cacheDir: '.astro/vite', server: { strictPort: process.env.STRICT_PORT === '1' } },
  // Weiterleitungen nach dem Umbau zu Stufe 1 (30.10.2026). Im statischen Build entstehen daraus Seiten mit
  // meta refresh und canonical; auf dem Host sollten dieselben Paare zusätzlich als echte 301 eingetragen werden.
  // Die Fallstudien bleiben unter ihren Live-URLs im Wurzelverzeichnis (Moritz' Sitemap vom 07.10.).
  redirects: astroRedirects(),
});
