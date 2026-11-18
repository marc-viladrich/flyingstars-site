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
// Köpfe: das Markup von SectionHead.astro (Klassen, data-section-head, Textblock .head-body) und jede Klasse, die eine
// Komponente ihrem SectionHead mitgibt (class, class:list, titleClass, textClass, kickerClass). Die Liste kommt aus den
// Aufrufen selbst; ein neu benannter Kopf ist damit automatisch unter Aufsicht.
export function headClasses(sources) {
  const out = new Set(['section-head', 'sec-head', 'head-body', 'head-line']);
  for (const source of sources) for (const tag of source.matchAll(/<SectionHead\b((?:[^>{]|\{(?:[^{}]|\{[^{}]*\})*\})*)\/?>/g)) {
    for (const m of tag[1].matchAll(/\b(?:class|titleClass|textClass|kickerClass)=(?:"([^"]*)"|'([^']*)')/g)) for (const c of (m[1] ?? m[2]).split(/\s+/)) if (c) out.add(c);
    for (const m of tag[1].matchAll(/\bclass:list=\{([^}]*(?:\}[^}]*)*?)\}\s/g)) for (const q of m[1].matchAll(/'([\w-]+)'|"([\w-]+)"/g)) out.add(q[1] ?? q[2]);
  }
  return out;
}
const sourcesAstro = [...files('src/components'), ...files('src/templates')].filter((f) => f.endsWith('.astro')).map(read);
const CLASSES = headClasses(sourcesAstro);
const HEAD = new RegExp(`(?:^|[\\s>(,~+])(?:\\.(?:${[...CLASSES].map((c) => c.replace(/[-]/g, '\\-')).join('|')})(?![\\w-])|\\[data-section-head)`);
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

test('Kopfklassen kommen aus den SectionHead-Aufrufen', () => {
  const found = headClasses(['<SectionHead class="a b" titleClass="t" kickerClass=\'k\' />', "<SectionHead class:list={['x', { 'y-z': cond }]} headline={h} />"]);
  for (const c of ['a', 'b', 't', 'k', 'x', 'y-z', 'section-head', 'head-body']) assert.ok(found.has(c), c);
  // die bisher von Hand gepflegten Köpfe sind im abgeleiteten Satz enthalten
  for (const c of ['eco-head', 'eco-head-std', 'intro', 'lp-f-head', 'inc-head', 'tm-head', 'st-copy', 'proof-h', 'cd-lead']) assert.ok(CLASSES.has(c), c);
  assert.ok(HEAD.test('.faq-grid .intro') && HEAD.test('[data-section-head="embedded"] > p') && HEAD.test('.x > .head-body') && !HEAD.test('.intro-copy'));
});

test('Kein Kopf bekommt eigene Abstandswerte', () => {
  const found = [];
  for (const file of [...files('src/components'), ...files('src/templates'), 'src/styles/global.css', 'src/styles/show-configurator.css']) {
    for (const css of styles(file)) postcss.parse(css.replace(/:global\(([^()]*(?:\([^()]*\))*[^()]*)\)/g, '$1'), {from: file}).walkDecls((d) => {
      if (!SPACING.test(d.prop) || !HEAD.test(d.parent.selector ?? '')) return;
      // Ausrichtung im Raster (Spalten) und das Ausblenden des Randes sind keine Kopfabstände
      if (allowed(d.prop, d.value)) return;
      found.push(`${file}: ${d.parent.selector} { ${d.prop}: ${d.value} }`);
    });
  }
  assert.deepEqual(found, [], `Kopfabstände außerhalb der Rollen --head-gap-*:\n${found.join('\n')}`);
});

// Preisseite (Marc, Runde 5/6: mehr Luft zwischen Seitenkopf und Konfigurator): eine benannte Rolle statt eines Sonderwerts
// im Seiten-Template; der Konfigurator besitzt seine Kopf-Variante (has-head) selbst (Codex-Audit 18.11.2026, C1/R2).
test('Kopf → Werkzeug ist die Rolle --head-gap-tool, gesetzt in der Kopf-Variante des Konfigurators', () => {
  assert.match(read('src/styles/global.css'), /--head-gap-tool:/);
  assert.match(read('src/styles/show-configurator.css'), /\.cfg\.has-head > :is\(\.cfg-panel, \.cfg-stage\) \{ margin-top: var\(--head-gap-tool\); \}/);
  const page = read('src/templates/PricingPage.astro');
  assert.doesNotMatch(page, /\.cfg|has-head|:global/, 'PricingPage steuert keine Konfigurator-Interna');
  assert.doesNotMatch(page, /margin(?:-top)?:\s*calc\(-1/, 'keine negative Randkorrektur');
});
