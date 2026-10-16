// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {checkContentImages} from './scripts/check-content-images.mjs';
import {writeSeoFallbackReport} from './scripts/seo-fallback-report.mjs';

// SITE_URL und MEDIA_HOST kommen aus der Umgebung (lokal .env, in CI als Variable),
// damit dieselbe Codebasis für Preview und Produktion gebaut werden kann.
const site = process.env.SITE_URL ?? 'https://example.invalid';
const mediaHost = process.env.MEDIA_HOST ?? 'media.example.invalid';
const excluded = new Set();
// Derive exclusions from the actual HTML (also honors editor noindex), not a second content list.
/** @type {import('astro').AstroIntegration} */
const sitemapExclusions = {name:'flyingstars-sitemap-exclusions',hooks:{'astro:build:done':async({dir})=>{
  excluded.clear();
  console.log('[images] '+JSON.stringify(await checkContentImages(fileURLToPath(dir))));
  /** @param {string} folder */
  const walk=folder=>{for(const entry of fs.readdirSync(folder,{withFileTypes:true})){const file=path.join(folder,entry.name);if(entry.isDirectory())walk(file);else if(entry.name==='index.html'){
    const html=fs.readFileSync(file,'utf8'),route='/'+path.relative(fileURLToPath(dir),path.dirname(file)).split(path.sep).filter(Boolean).join('/')+'/';
    const pathname=route.replace(/^\/\/$/,'/'),canonical=html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/);
    if(/<meta[^>]*name="robots"[^>]*content="[^"]*noindex/.test(html)||canonical&&new URL(canonical[1]).pathname!==pathname)excluded.add(pathname);
  }}};walk(fileURLToPath(dir));
  await writeSeoFallbackReport(process.cwd(),fileURLToPath(dir));
}}};

export default defineConfig({
  site,
  output: 'static',
  cacheDir: process.env.FLYINGSTARS_IMAGE_CACHE_DIR ?? './.astro/cache',
  trailingSlash: 'always',
  i18n: {defaultLocale:'de',locales:['de','en','nl'],routing:{prefixDefaultLocale:false}},
  integrations: [sitemapExclusions,sitemap({i18n:{defaultLocale:'de',locales:{de:'de',en:'en',nl:'nl'}},filter:page=>!excluded.has(new URL(page).pathname),serialize:item=>{const german=item.links?.find(link=>link.lang==='de');if(german)item.links?.push({lang:'x-default',url:german.url});return item;}})],
  // astro-frontend-editor is vendored under editor/vendor until PR 11 installs the package; imports already use its name.
  vite: {cacheDir:'.astro/vite',resolve:{alias:[{find:/^astro-frontend-editor\/markers$/,replacement:fileURLToPath(new URL('./editor/vendor/astro-frontend-editor/src/markers/index.mjs',import.meta.url))}]}},
  image: {
    // Explicit test mode keeps remote URLs/dimensions but performs no network optimization.
    ...(process.env.FLYINGSTARS_OFFLINE_MEDIA==='1'?{service:{entrypoint:'astro/assets/services/noop'}}:{}),
    // Nur der zentrale Medienspeicher darf als Remote-Bildquelle dienen.
    remotePatterns: [...new Set([mediaHost, 'flyingstars.art', 'flyingstars-relaunch.vercel.app'])].map((hostname) => ({ protocol: 'https', hostname })),
  },
  build: { inlineStylesheets: 'auto' },
});
