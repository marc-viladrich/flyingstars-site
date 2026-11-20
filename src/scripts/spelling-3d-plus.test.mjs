// Runde 9 (Marc 20.11.2026: „Bitte einheitlich 3D+ immer“): keine andere Schreibweise als „3D+“ in sichtbaren Texten
// (UI-Wörterbuch, Inhalte, Formular-Function). Zitate in docs/ und Code-Kommentare zählen nicht.
// Aufruf: node --test src/scripts/spelling-3d-plus.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const WRONG = /3\s*-?\s*D[\s-]*plus\b|3D\+\s*plus/i;
const files = (dir, ext) => fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).map((f) => path.join(dir, f)).filter((f) => ext.test(f) && fs.statSync(f).isFile()) : [];

test('UI-Wörterbuch: nur „3D+“', () => {
  const ui = JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/ui.json'), 'utf8'));
  for (const [key, value] of Object.entries(ui)) for (const [lang, text] of Object.entries(value)) assert.ok(!WRONG.test(String(text)), `${key}.${lang}: ${text}`);
  for (const art of ['de', 'en', 'nl']) assert.match(ui['preise.art.story'][art], /^3D\+$/);
});

test('Inhalte und Formular: nur „3D+“', () => {
  for (const f of [...files(path.join(root, 'src/content'), /\.(ya?ml|md|json)$/), ...files(path.join(root, 'functions'), /\.(ts|js|mjs)$/)]) {
    fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => assert.ok(!WRONG.test(line), `${path.relative(root, f)}:${i + 1}: ${line.trim()}`));
  }
});

// Runde 10 (Marc 20.11.2026: „keinen Bindestrich zwischen Typ und Show“, „ab 300 Drohnen rausnehmen“): „Eure 2D Show“,
// „Eure 3D Show“, „Eure 3D+ Show“ (EN „Your 3D+ show“, NL „Jullie 3D+ show“); nirgends „3D+-“, keine Drohnenzahl im Titel
test('Show-Art-Namen: kein Bindestrich zwischen Typ und Show, keine Drohnenzahl im Titel der Preisbox', () => {
  const ui = JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/ui.json'), 'utf8'));
  for (const [key, value] of Object.entries(ui)) for (const [lang, text] of Object.entries(value)) assert.ok(!/3D\+-/.test(String(text)), `${key}.${lang}: ${text}`);
  const lead = { de: 'Eure ', en: 'Your ', nl: 'Jullie ' }, show = { de: 'Show', en: 'show', nl: 'show' };
  for (const [art, label] of [['2d', '2D'], ['3d', '3D'], ['story', '3D+']]) for (const lang of ['de', 'en', 'nl']) {
    assert.equal(ui[`preise.yourShow.${art}`][lang], `${lead[lang]}${label} ${show[lang]}`);
    assert.equal(ui[`preise.artName.${art}`][lang], `${label} ${show[lang]}`);
  }
  assert.ok(!('preise.yourShowFrom' in ui), 'kein Titel mit „ab … Drohnen“ mehr');
  for (const f of ['src/scripts/show-configurator.js', 'src/components/configurator/ShowConfigurator.astro']) assert.ok(!fs.readFileSync(path.join(root, f), 'utf8').includes('yourShowFrom'), f);
});
