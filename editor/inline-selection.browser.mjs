// Inline mark detection with the selections real drags produce (Chromium and WebKit place boundaries differently).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium, webkit } from '@playwright/test';

let server, origin;
before(async () => {
  server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/') return res.end('<!doctype html><main></main>');
    if (path !== '/editor/web/inline-selection.mjs') return res.writeHead(404).end();
    res.setHeader('Content-Type', 'text/javascript'); res.end(await readFile(new URL('./web/inline-selection.mjs', import.meta.url)));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((resolve) => server?.close(resolve)));

for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) test(`${name}: a selection starting at the end of the text before a mark selects only the marked word`, async (t) => {
  const browser = await engine.launch(); t.after(() => browser.close());
  const page = await browser.newPage(); await page.goto(origin);
  const result = await page.evaluate(async () => {
    const { selectedTextNodes } = await import('/editor/web/inline-selection.mjs');
    document.querySelector('main').innerHTML = '<h1>Wir gestalten dein <span class="t-outline">Stück</span> Himmel.</h1>';
    const [before, span, rest] = document.querySelector('h1').childNodes, word = span.firstChild, range = document.createRange();
    const texts = (r) => selectedTextNodes(r).map((n) => n.data);
    range.setStart(before, before.length - 1); range.setEnd(word, word.length); // WebKit drag: "dein| Stück|"
    const dragged = texts(range);
    range.setStart(before, before.length); range.setEnd(rest, 0); // boundaries touching both neighbours
    const touching = texts(range);
    range.setStart(before, before.length - 3); range.setEnd(word, 2); // really selects "in " and "St"
    const across = texts(range);
    return { dragged, touching, across };
  });
  assert.deepEqual(result, { dragged: ['Stück'], touching: ['Stück'], across: ['Wir gestalten dein ', 'Stück'] });
});
