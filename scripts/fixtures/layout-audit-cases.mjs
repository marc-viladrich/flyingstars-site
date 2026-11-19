import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspectLayout } from '../layout-audit.mjs';

const fixture = await readFile(new URL('./layout-audit-bokkenrijders-618d93e.html', import.meta.url), 'utf8');
const font = await readFile(new URL('../../public/fonts/space-grotesk-0.woff2', import.meta.url), 'base64');

/** @type {Array<[string, (page: import("playwright").Page) => Promise<void>]>} */
export const layoutCases = [
  ['Team: zweite Karte angeschnitten, beide Enden erreichbar', async (page) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const inspect = (...checks) => page.evaluate(inspectLayout, { checks });
    await page.setContent(`
      <style>
        body { margin: 0; }
        main { padding: 0 20px; }
        .crew {
          display: flex; gap: 12px; margin: 0 -20px;
          padding: 0 20px; scroll-padding-inline: 20px;
          overflow-x: auto; scroll-snap-type: x mandatory;
        }
        .crew > li { flex: 0 0 248px; scroll-snap-align: start; list-style: none; }
      </style>
      <main><ul class="crew" data-crew>
        <li><p>Erste Karte</p></li><li><p>Zweite Karte</p></li><li><p>Letzte Karte</p></li>
      </ul></main>`);
    const peek = await page.locator('.crew li:nth-child(2)').boundingBox();
    assert.ok(peek.x < 390 && peek.x + peek.width > 390);
    assert.deepEqual(await inspect('contain', 'overflow'), []);
    assert.equal(await page.locator('.crew').evaluate((row) => row.scrollLeft), 0, 'die Prüfung stellt die Position wieder her');
    await page.locator('.crew').evaluate((row) => row.removeAttribute('data-crew'));
    assert.ok((await inspect('contain')).some(({ what }) => /Inhalt/.test(what)), 'ohne Kennzeichnung gilt die Content-Kante');
    await page.locator('.crew').evaluate((row) => {
      row.setAttribute('data-crew', '');
      row.style.scrollSnapType = 'none';
    });
    assert.ok((await inspect('contain')).some(({ what }) => /Inhalt/.test(what)), 'ohne horizontalen Snap gilt die Content-Kante');
    await page.locator('.crew').evaluate((row) => row.style.removeProperty('scroll-snap-type'));
    await page.addStyleTag({ content: '.crew > :first-child, .crew > :last-child { flex-basis: 400px; }' });
    const findings = await inspect('contain');
    assert.equal(findings.length, 2);
    assert.match(findings[0].what, /Erste Karte horizontal nicht vollständig erreichbar/);
    assert.match(findings[1].what, /Letzte Karte horizontal nicht vollständig erreichbar/);
  }],

  ['Bokkenrijders 618d93e: 12.000 überlappt 20 bei 1024 px', async (page) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const inspect = (...checks) => page.evaluate(inspectLayout, { checks });
    await page.setContent(fixture);
    await page.addStyleTag({ content: `@font-face {
      font-family: 'Space Grotesk'; font-weight: 300 700;
      src: url(data:font/woff2;base64,${font});
    }` });
    assert.ok(await page.evaluate(async () => (await document.fonts.load('700 100px "Space Grotesk"')).length > 0));
    assert.deepEqual(await inspect('overflow'), []);
    const findings = await inspect('text-overlap');
    assert.equal(findings.length, 1, JSON.stringify(findings));
    assert.equal(findings[0].k, 'text-overlap');
    assert.match(findings[0].what, /Textüberlagerung.*„12\.000“.*„20“/);
    await page.addStyleTag({ content: '.c-num dd { font-size: 8vw; }' });
    assert.deepEqual(await inspect('text-overlap'), []);
  }],

  ['vergleicht sichtbare Texte über Rasterzellen hinweg', async (page) => {
    const inspect = (...checks) => page.evaluate(inspectLayout, { checks });
    await page.setContent(`
      <style>
        .grid { display: grid; grid-template-columns: 40px 1fr; font: 32px monospace; }
        .clipped { overflow: hidden; }
        .hidden { opacity: 0; }
        .off-flow { position: absolute; inset: 0; }
      </style>
      <main>
        <div class="grid"><div class="clipped">AAAA</div><div>BB</div></div>
        <div class="grid"><div class="hidden">AAAA</div><div>BB</div></div>
        <div class="grid"><div>AA</div><span class="off-flow">BB</span></div>
        <div class="grid"><div style="display: contents"><div><span>AAAA</span></div></div><div>BB</div></div>
      </main>`);
    const findings = await inspect('text-overlap');
    assert.equal(findings.length, 1, JSON.stringify(findings));
    assert.match(findings[0].what, /„AAAA“.*„BB“/);
  }],
];
