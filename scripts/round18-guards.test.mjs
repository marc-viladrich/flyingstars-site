// Wächter für Runde 18 (Marc, 02.11.2026). Jeder Test hält eine Klasse fest, nicht einen Einzelfall.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('Alle Reveals lösen am selben Punkt aus (3 rem im Bild), kein scroll-gebundener Vorhang', () => {
  for (const file of ['src/scripts/site.ts', 'src/scripts/effects/dotimage.js']) {
    const src = read(file);
    assert.match(src, /import \{ REVEAL_MARGIN \}/, `${file} nutzt REVEAL_MARGIN`);
    assert.doesNotMatch(src, /rootMargin: ['"]0px 0px -\d/, `${file}: eigener Auslösepunkt statt REVEAL_MARGIN`);
  }
  assert.doesNotMatch(read('src/styles/global.css'), /animation-timeline:\s*view\(\)/, 'scroll-gebundener Vorhang öffnet zu spät');
});

test('Showzeit kommt aus einer Quelle (Paketkarten und Konfigurator)', () => {
  const ui = JSON.parse(read('src/i18n/ui.json'));
  assert.ok(!Object.keys(ui).some((k) => /^pricing\.duration\d+$/.test(k)), 'alte Staffel 10/13/15 Min ist zurück');
  assert.match(ui['packageDetails.showtimeLine'].de, /Showzeit/);
  for (const file of ['src/components/configurator/ShowConfigurator.astro', 'src/scripts/show-configurator.js']) assert.match(read(file), /packageDetails\.showtimeLine/, file);
});

test('Kopfzeile des Mobile-Menüs = Kopfzeile der Seite (nichts springt beim Öffnen)', () => {
  const base = read('src/layouts/Base.astro');
  const top = base.match(/<div class="top">([\s\S]*?)<\/div>\n/)[1];
  const order = ['<Logo />', '<LanguageSwitch', 'data-motion-toggle', 'data-menu-close'].map((m) => top.indexOf(m));
  assert.ok(order.every((i) => i >= 0) && order.every((v, i) => i === 0 || v > order[i - 1]), 'Logo, Sprache, Pause, Schließen in Header-Reihenfolge');
  assert.match(read('src/scripts/site.ts'), /--menu-top/, 'Menü übernimmt den Innenabstand des Headers');
  assert.match(read('src/scripts/site.ts'), /querySelectorAll\('\[data-motion-toggle\]'\)/, 'beide Pause-Knöpfe sind verbunden');
});
