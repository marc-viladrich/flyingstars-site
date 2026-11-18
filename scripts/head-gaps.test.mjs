// Abstandsrollen der Section-Köpfe (Runde 6, Marc: „einheitliche gaps between headings and body copy … a centrally
// defined system“). Ein Besitzer: SectionHead.astro setzt Kicker-, Text- und Link-Abstand mit --head-gap-*; einbettende
// Layouts dürfen für Köpfe nur diese Rollen (oder 0) verwenden, keine eigenen Zahlen. Die gemessene Gegenprobe im Browser
// ist `node scripts/layout-audit.mjs <url> --only=head-gap`.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import postcss from 'postcss';
const root = fileURLToPath(new URL('../', import.meta.url));
const read = (file) => readFileSync(join(root, file), 'utf8');
const files = (dir) => readdirSync(join(root, dir), {withFileTypes: true}).flatMap((e) => e.isDirectory() ? files(join(dir, e.name)) : /\.(css|astro)$/.test(e.name) ? [join(dir, e.name)] : []);
const styles = (file) => file.endsWith('.css') ? [read(file)] : [...read(file).matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
const ROLES = ['kicker', 'text', 'cta', 'content'];
// Köpfe: die SectionHead-Klassen und die Klassen, mit denen Komponenten ihren SectionHead ansprechen
const HEAD = /(?:^|[\s>(,])\.(?:section-head|sec-head|eco-head|eco-head-std|intro|[a-z]+-f-head|inc-head|tm-head|st-copy|cfg-head)\b(?![\w-])/;
const SPACING = /^(?:gap|row-gap|margin|margin-top|margin-bottom|margin-block)$/;
const allowed = (prop, value) => {
  const first = prop === 'gap' ? value.trim().split(/\s+(?![^(]*\))/)[0] : value;
  if (prop === 'margin') { const [top, , bottom = top] = value.trim().split(/\s+(?![^(]*\))/); return [top, bottom].every((v) => v === '0' || v.includes('--head-gap-')); }
  return first === '0' || first.includes('--head-gap-');
};

test('global.css definiert die vier Abstandsrollen', () => {
  const css = read('src/styles/global.css');
  for (const role of ROLES) assert.match(css, new RegExp(`--head-gap-${role}:`), `--head-gap-${role} fehlt`);
});

test('SectionHead setzt Kicker-, Text- und Link-Abstand aus den Rollen', () => {
  const head = read('src/components/SectionHead.astro');
  for (const role of ['kicker', 'text', 'cta']) assert.ok(head.includes(`var(--head-gap-${role})`), `SectionHead nutzt --head-gap-${role} nicht`);
});

test('Kein Kopf bekommt eigene Abstandswerte', () => {
  const found = [];
  for (const file of [...files('src/components'), ...files('src/templates'), 'src/styles/global.css']) {
    for (const css of styles(file)) postcss.parse(css.replace(/:global\(([^()]*(?:\([^()]*\))*[^()]*)\)/g, '$1'), {from: file}).walkDecls((d) => {
      if (!SPACING.test(d.prop) || !HEAD.test(d.parent.selector ?? '')) return;
      // Ausrichtung im Raster (Spalten) und das Ausblenden des Randes sind keine Kopfabstände
      if (allowed(d.prop, d.value)) return;
      found.push(`${file}: ${d.parent.selector} { ${d.prop}: ${d.value} }`);
    });
  }
  assert.deepEqual(found, [], `Kopfabstände außerhalb der Rollen --head-gap-*:\n${found.join('\n')}`);
});
