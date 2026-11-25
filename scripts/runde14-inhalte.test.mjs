// Runde 14 (21.11.2026): Rückmeldungen von Moritz und Marc zu den Texten, als Wächter festgehalten.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';
const page = (locale, name) => parse(readFileSync(new URL(`../src/content/pages/${locale ? locale + '/' : ''}${name}.yaml`, import.meta.url), 'utf8'));
const LOCALES = ['', 'en', 'nl'];

test('Paketkarten nur auf der Preisseite: Startseite und Anlass-Seiten zeigen den Konfigurator-Teaser ohne Pakete', () => {
  // Moritz: Fokus auf den Konfigurator; das kleinste Paket soll z. B. für Werbung nicht hervorgehoben werden.
  // Die Preiskarte mit einem Paket (landingPrice, Hochzeit/Indoor) bleibt erlaubt.
  for (const locale of LOCALES) for (const file of readdirSync(new URL(`../src/content/pages/${locale}`, import.meta.url)).filter((f) => f.endsWith('.yaml'))) {
    for (const s of page(locale, file.replace(/\.yaml$/, '')).sections ?? []) {
      assert.notEqual(s.type, 'packages', `${locale}/${file}: Paketkarten`);
      if (s.type === 'landingTeaser') assert.ok(!s.packages?.length, `${locale}/${file}#${s.id}: Paketkarten unter dem Teaser`);
    }
  }
});

test('Über uns: drei Werte ohne „Nachhaltigkeit“ (kein Green Claim als Wert)', () => {
  for (const locale of LOCALES) {
    const values = page(locale, 'ueber-uns').sections.find((s) => s.id === 'haltung');
    assert.equal(values.steps.length, 3, locale);
    assert.ok(values.steps.every((v) => v.icon !== 'leaf' && !/nachhaltig|sustainab|duurzaam/i.test(v.title)), locale);
  }
});

test('Indoor ohne Vergleich Drohne/Feuerwerk/Laser; Brandgefahr ohne absolute Verneinung', () => {
  for (const locale of LOCALES) {
    assert.ok(!page(locale, 'drohnenshow-indoor').sections.some((s) => s.type === 'comparison'), locale);
    const rows = page(locale, 'nachhaltigkeit').sections.find((s) => s.comparison).comparison.rows;
    const fire = rows.find((r) => r._key === 'k_37b5b5e74c7bd7792e72');
    assert.ok(fire, `${locale}: Zeile Brandgefahr bleibt (Marc)`);
    assert.doesNotMatch(fire.label, /kein|no |geen/i, locale);
    for (const cell of [...fire.cells, ...fire.values]) assert.doesNotMatch(cell.label ?? cell.value, /^(keine|none|geen)$/i, locale);
    assert.deepEqual(fire.cells.map((c) => c.tone), ['y', 'n', 'y'], locale);
    const noFlame = { '': 'Kein offenes Feuer', en: 'No open flame', nl: 'Geen open vuur' }[locale];
    for (const column of [0, 2]) {
      assert.equal(fire.cells[column].label, noFlame, locale);
      assert.equal(fire.values[column].value, noFlame, locale);
    }
  }
});

test('Größte Show mit 700 Drohnen überall gleich (Über uns, Werbung, Startseite)', () => {
  for (const locale of LOCALES) {
    assert.ok(page(locale, 'ueber-uns').sections[0].facts.some((f) => f.value === '700'), locale);
    assert.ok(page(locale, 'drohnenshow-werbung').sections[0].facts.some((f) => /^700 /.test(f.value)), locale);
    assert.match(page(locale, 'index').sections.find((s) => s.id === 'ablauf').facts[1].value, /^700 /, locale);
  }
});
