import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LOCALES, localizedHref } from '../src/i18n/routing.mjs';

/** Checks the output that is actually deployed, including redirects; no hand-maintained route list. */
export function checkI18nBuild(dist = new URL('../dist/', import.meta.url)) {
  const files = readdirSync(dist, { recursive: true }).filter((file) => file.endsWith('.html'));
  const german = files.filter((file) => !/^(?:en|nl|poc)\//.test(file));
  const routeOf = (file) => file === '404.html' ? '/404/' : `/${file}`.replace(/index\.html$/, '');
  let content = 0, redirects = 0;
  for (const file of german) for (const locale of LOCALES.filter((l) => l !== 'de')) {
    const localizedFile = file === '404.html' ? `${locale}/404/index.html` : `${locale}/${file}`;
    const target = new URL(localizedFile, dist);
    assert.ok(existsSync(target), `Missing deployed ${locale} route for ${file}`);
    const html = readFileSync(target, 'utf8');
    if (/<meta http-equiv="refresh"/i.test(html)) { redirects++; continue; }
    content++;
    assert.match(html, new RegExp(`<html\\s[^>]*lang="${locale}"`), localizedFile);
    const canonical = /<link[^>]*rel="canonical"[^>]*href="([^"]+)"/.exec(html)?.[1];
    assert.equal(new URL(canonical).pathname, localizedHref(routeOf(file), locale), localizedFile);
    if (!/<meta[^>]*name="robots"[^>]*content="noindex"/.test(html)) {
      for (const alternate of LOCALES) {
        const href = new RegExp(`<link[^>]*hreflang="${alternate}"[^>]*href="([^"]+)"`).exec(html)?.[1];
        assert.ok(href, `${localizedFile}: missing ${alternate} alternate`);
        assert.equal(new URL(href).pathname, localizedHref(routeOf(file), alternate), localizedFile);
      }
      const fallback = /<link[^>]*hreflang="x-default"[^>]*href="([^"]+)"/.exec(html)?.[1];
      assert.equal(new URL(fallback).pathname, routeOf(file), localizedFile);
    }
  }
  return { germanRoutes: german.length, localizedContentRoutes: content, localizedRedirects: redirects, excludedPrototypes: files.filter((file) => file.startsWith('poc/')).length };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(JSON.stringify(checkI18nBuild(), null, 2));
