// Frame marker queries against a real DOM: the same shapes the site renders (sections as blocks, cards as items
// with occurrences, nested parts, query cards, panel fields, Markdown bodies).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

let server, browser, origin;
before(async () => {
  server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/') return res.end('<!doctype html><main></main>');
    if (!/^\/editor\/(web|vendor)\/[\w/.-]+\.mjs$/.test(path)) return res.writeHead(404).end();
    try { res.setHeader('Content-Type', 'text/javascript'); res.end(await readFile(new URL('..' + path, import.meta.url))); } catch { res.writeHead(404).end(); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
});
after(async () => { await browser?.close(); await new Promise((resolve) => server?.close(resolve)); });

const owner = (collection, id) => ({ collection, id });
const at = (o, path, part = 'data') => ({ owner: o, part, path });
const page = owner('pages', 'index'), pkg = owner('packages', 'horizon'), faq = owner('faq', 'show-01');
const attr = (...markers) => JSON.stringify(markers.length === 1 ? { v: 1, ...markers[0] } : { v: 1, markers: markers.map((m) => ({ v: 1, ...m })) }).replaceAll('"', '&quot;');
const records = [
  { id: 'page/index', address: page, data: { sections: [{ type: 'hero' }, { type: 'pricing', tiers: [{ featureIds: ['a', 'b'] }, { featureIds: [] }] }] }, containers: [{ path: ['sections'], 'x-afe': { array: { role: 'blocks', discriminator: 'type' } } }] },
  { id: 'package/horizon', address: pkg, data: { price: 1, displayName: 'HORIZON' } },
  { id: 'faq/show-01', address: faq, data: { order: 1, body: 'Antwort' } },
];
const html = `
<template data-afe="${attr({ kind: 'blocks', address: at(page, ['sections']) })}"></template>
<section id="s1" data-afe="${attr({ kind: 'blocks', address: at(page, ['sections', 1]) })}">
  <a id="card" data-afe="${attr({ kind: 'item', rendered: pkg, occurrence: 'page/index/sections/1 tiers/0', membership: at(page, ['sections', 1, 'tiers', 0]) }, { kind: 'uses', addresses: [at(page, ['sections', 1, 'tiers', 0, 'packageId']), at(pkg, ['highlight'])] })}">
    <h3 id="name" data-afe="${attr({ kind: 'field', address: at(pkg, ['displayName']), mode: 'inline' })}">HORIZON</h3>
    <div id="price" data-afe="${attr({ kind: 'field', address: at(pkg, ['price']), mode: 'panel' })}">1 €</div>
    <li id="part" data-afe="${attr({ kind: 'item', rendered: pkg, occurrence: 'page/index/sections/1 tiers/0/f/1', membership: at(page, ['sections', 1, 'tiers', 0, 'featureIds', 1]) }, { kind: 'field', address: at(pkg, ['displayName']), mode: 'inline' })}">B</li>
  </a>
  <div id="faqs" data-afe="${attr({ kind: 'order', collection: 'faq', path: ['order'] })}">
    <details id="q" data-afe="${attr({ kind: 'item', rendered: faq, occurrence: 'page/index/sections/1 record:faq/show-01' })}"><div id="answer" data-afe="${attr({ kind: 'body', address: at(faq, [], 'body') })}">Antwort</div></details>
  </div>
</section>`;

async function load(t) {
  const tab = await browser.newPage();
  t.after(() => tab.close());
  await tab.goto(origin);
  await tab.setContent(`<main>${html}</main>`);
  return (fn) => tab.evaluate(async ({ fn, records }) => { const afe = await import('/editor/web/frame-markers.mjs'); return new Function('afe', 'records', 'document', `return (${fn})(afe, records, document);`)(afe, records, document); }, { fn: fn.toString(), records });
}

test('fields, panel fields, Markdown bodies and blocks resolve to editor records and paths', async (t) => {
  const run = await load(t);
  assert.deepEqual(await run((afe, records, document) => [
    afe.binding(records, afe.markerOf(document.getElementById('name'), afe.isInlineField).address),
    afe.isPanelField(afe.markerOf(document.getElementById('price'), afe.isField)),
    afe.binding(records, afe.markerOf(document.getElementById('answer'), afe.isInlineField).address),
    afe.blockInfo(records, document.getElementById('price')) && { id: afe.blockInfo(records, document.getElementById('price')).id, index: afe.blockInfo(records, document.getElementById('price')).index },
    afe.blockLists(document),
  ]), [{ id: 'package/horizon', path: ['displayName'] }, true, { id: 'faq/show-01', path: ['body'] }, { id: 'page/index', index: 1 }, [['sections']]]);
});

test('the outermost item is the card; nested parts of its owner collapse into their entry', async (t) => {
  const run = await load(t);
  const result = await run((afe, records, document) => {
    const card = afe.occurrenceInfo(records, document.getElementById('part'));
    return { id: card.id, path: card.path, record: card.record, node: card.node.id, rendered: afe.occurrenceBindings(records, document, card.identity) };
  });
  assert.deepEqual({ id: result.id, path: result.path, record: result.record, node: result.node }, { id: 'page/index', path: ['sections', 1, 'tiers', 0], record: 'package/horizon', node: 'card' });
  assert.deepEqual(result.rendered.find((b) => b.kind === 'entry'), { id: 'page/index', path: ['sections', 1, 'tiers', 0, 'featureIds', 1], kind: 'entry' });
  assert.ok(result.rendered.some((b) => b.id === 'package/horizon' && b.path[0] === 'price'), 'panel fields count as rendered');
});

test('a query card is an occurrence of its record; records on the page include shown records and value owners', async (t) => {
  const run = await load(t);
  assert.deepEqual(await run((afe, records, document) => {
    const card = afe.occurrenceInfo(records, document.getElementById('answer'));
    return [card.id, card.path, card.record, afe.recordsOnPage(records, document).sort()];
  }), ['faq/show-01', [], null, ['faq/show-01', 'package/horizon', 'page/index']]);
});

test('renumbering rewrites only addresses of the moved entry and owner, including membership and uses', async (t) => {
  const run = await load(t);
  const after = await run((afe, records, document) => {
    afe.renumber(document.getElementById('s1'), { collection: 'pages', id: 'index' }, ['sections'], 4);
    return [document.getElementById('s1'), document.getElementById('card'), document.getElementById('price')].map((n) => afe.markersOf(n));
  });
  assert.deepEqual(after[0][0].address.path, ['sections', 4]);
  assert.deepEqual(after[1][0].membership.path, ['sections', 4, 'tiers', 0]);
  assert.deepEqual(after[1][1].addresses.map((a) => a.path), [['sections', 4, 'tiers', 0, 'packageId'], ['highlight']]);
  assert.deepEqual(after[2][0].address.path, ['price'], 'another record keeps its address');
});

test('positionless comparison blanks positions only in the named lists and in occurrence names', async (t) => {
  const run = await load(t);
  const [moved, other] = await run((afe, records, document) => {
    const card = document.getElementById('card'), a = card.outerHTML;
    afe.renumber(card, { collection: 'pages', id: 'index' }, ['sections'], 7);
    const b = card.outerHTML;
    afe.renumber(card, { collection: 'pages', id: 'index' }, ['sections', 7, 'tiers'], 1);
    return [afe.positionless(a, [['sections']]) === afe.positionless(b, [['sections']]), afe.positionless(b, [['sections']]) === afe.positionless(card.outerHTML, [['sections']])];
  });
  assert.equal(moved, true, 'a moved section compares equal');
  assert.equal(other, false, 'a card that changed place inside its section does not');
});
