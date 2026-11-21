// Wächter für einfarbige Logos (Marc, 21.11.2026: Presse- und Siegel-Logos erschienen auf dem iPhone in Originalfarben,
// weil Safari 26 den CSS-Filter auf Bildern nicht zuverlässig anwendet). Prüft jede abgeleitete Variante und dass kein
// Stil mehr Logos per CSS-Filter umfärbt.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { monoLogoFiles, renderMonoLogo, monoLogoSrc, monoSvg } from '../src/lib/mono-logo.mjs';

async function pixels(body) {
  const { data } = await sharp(Buffer.from(body), { density: 96 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let opaque = 0, colored = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 32) continue;
    opaque++;
    if (data[i] < 235 || data[i + 1] < 235 || data[i + 2] < 235) colored++;
  }
  return { opaque, colored };
}

test('jede Variante rendert, ist sichtbar und durchgehend weiß', async () => {
  const files = await monoLogoFiles();
  assert.ok(files.length >= 10, `zu wenige Logos: ${files.length}`);
  for (const file of files) {
    const out = await renderMonoLogo(file);
    assert.ok(out, file);
    const { opaque, colored } = await pixels(out.body);
    assert.ok(opaque > 50, `${file}: nichts sichtbar`);
    // Kantenglättung mischt an Rändern etwas Grau, Flächen selbst sind weiß
    assert.ok(colored / opaque < 0.02, `${file}: ${(colored / opaque * 100).toFixed(1)} % nicht weiß`);
  }
});

test('knock spart helle Flächen aus (ZDF-„2“, ntv-Schrift)', async () => {
  for (const name of ['presse-zdf', 'presse-ntv']) {
    const full = await pixels((await renderMonoLogo(`${name}.svg`)).body);
    const knock = await pixels((await renderMonoLogo(`${name}--knock.svg`)).body);
    assert.ok(knock.opaque < full.opaque * 0.95, `${name}: keine Aussparung (${knock.opaque} vs ${full.opaque})`);
  }
});

test('Pfade: nur Dateien aus /brand/logos/', () => {
  assert.equal(monoLogoSrc('/brand/logos/presse-zdf.svg', { knock: true }), '/brand/logos/mono/presse-zdf--knock.svg');
  assert.equal(monoLogoSrc('/brand/logos/quali-lba-weiss.png'), '/brand/logos/mono/quali-lba-weiss.png');
  assert.throws(() => monoLogoSrc('https://example.org/x.svg'));
});

test('Farben ohne Angabe werden weiß, Präfix-Namensräume bleiben gültig', async () => {
  const svg = monoSvg('<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="0 0 10 10"><rect inkscape:label="a" width="10" height="10"/></svg>');
  const { opaque, colored } = await pixels(svg);
  assert.ok(opaque > 0 && colored === 0);
});

test('kein Logo wird mehr per CSS-Filter eingefärbt', async () => {
  const roots = ['src/components', 'src/layouts', 'src/styles'];
  const hits = [];
  async function walk(dir) {
    for (const e of await fs.readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (/\.(astro|css)$/.test(e.name)) {
        const text = await fs.readFile(p, 'utf8');
        if (/--logo-mono|--logo-knock|brightness\(0\)\s*invert\(1\)/.test(text)) hits.push(p);
      }
    }
  }
  for (const r of roots) await walk(r);
  assert.deepEqual(hits, [], 'Logos über LocalImage mono einfärben (src/lib/mono-logo.mjs)');
});
