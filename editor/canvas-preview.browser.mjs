import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

let server, browser, origin;
before(async () => {
  server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (path === '/') { res.end('<!doctype html><main></main>'); return; }
      if (!/^\/(src\/(scripts|lib|content)\/|editor\/(web|extensions)\/|editor\/browser-site\.mjs)/.test(path) || path.includes('..')) { res.writeHead(404).end(); return; }
      const source = await readFile(new URL('..' + path, import.meta.url), 'utf8');
      res.setHeader('Content-Type', path.endsWith('.css') ? 'text/css' : 'text/javascript'); res.end(source);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
});
after(async () => { await browser?.close(); await new Promise(resolve => server?.close(resolve)); });
async function pageFor(t, html) {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  t.after(() => page.close());
  await page.goto(origin); await page.setContent(html);
  return page;
}

test('patchInPlace updates registered canvas settings and preserves the live node and bitmap dimensions', async t => {
  const page = await pageFor(t, '<main></main>');
  const result = await page.evaluate(async () => {
    const { patchInPlace } = await import('/editor/web/preview-apply.mjs');
    const before = document.createElement('section'); before.innerHTML = '<canvas data-orb="sphere" data-n="200" data-color="neon-violet"></canvas><div>Horizon</div>';
    const after = before.cloneNode(true), live = before.cloneNode(true), canvas = live.firstChild;
    canvas.dataset.nativeLive = 'true'; canvas.width = 512;
    after.firstChild.dataset.orb = 'torus'; after.firstChild.dataset.n = '230'; after.firstChild.dataset.color = 'neon-orange';
    const report = patchInPlace(live, before, after);
    return { report, same: live.firstChild === canvas, n: canvas.dataset.n, orb: canvas.dataset.orb, color: canvas.dataset.color, width: canvas.width };
  });
  assert.deepEqual(result, { report: { unsafe: false, changed: 3 }, same: true, n: '230', orb: 'torus', color: 'neon-orange', width: 512 });
});

test('unregistered canvas settings and genuine structural changes require replacement without deleting card text', async t => {
  const page = await pageFor(t, '<main></main>');
  const result = await page.evaluate(async () => {
    const { patchInPlace, sameStructure } = await import('/editor/web/preview-apply.mjs');
    const before = document.createElement('section'); before.innerHTML = '<canvas data-orb="sphere"></canvas><div>Spark</div>';
    const live = before.cloneNode(true), after = before.cloneNode(true); after.firstChild.dataset.orb = 'torus';
    const unregistered = patchInPlace(live, before, after).unsafe;
    after.append(document.createElement('p')); live.firstChild.dataset.nativeLive = 'true';
    return { unregistered, sameStructure: sameStructure(before, after), structural: patchInPlace(live, before, after), text: live.lastChild.textContent };
  });
  assert.deepEqual(result, { unregistered: true, sameStructure: false, structural: { unsafe: true, changed: 0 }, text: 'Spark' });
});

test('real orb controller re-reads shape, count and color while paused, and initializes replaced sections', async t => {
  const page = await pageFor(t, '<main><section><article class="pack"><canvas style="width:96px;height:96px" data-orb="sphere" data-n="200" data-color="neon-violet"></canvas><div>Spark</div></article></section></main>');
  await page.evaluate(() => {
    const original = CanvasRenderingContext2D.prototype.arc;
    window.draws = [];
    CanvasRenderingContext2D.prototype.arc = function (...args) { window.draws.push({ color: this.fillStyle, canvas: this.canvas, args }); return original.apply(this, args); };
  });
  await page.addScriptTag({ type: 'module', url: origin + '/src/scripts/site.ts' });
  await page.waitForFunction(() => document.querySelector('canvas').dataset.nativeLive);
  const result = await page.evaluate(async () => {
    const { patchInPlace } = await import('/editor/web/preview-apply.mjs');
    const canvas = document.querySelector('canvas'), before = canvas.cloneNode(), next = before.cloneNode();
    next.dataset.orb = 'torus'; next.dataset.n = '230'; next.dataset.color = 'neon-orange';
    window.draws = [];
    const report = patchInPlace(canvas, before, next);
    await new Promise(resolve => setTimeout(resolve, 80));
    return { report, same: document.querySelector('canvas') === canvas, count: window.draws.length, colors: [...new Set(window.draws.map(d => d.color))], text: document.querySelector('.pack div').textContent };
  });
  assert.equal(result.report.unsafe, false); assert.equal(result.same, true);
  assert.ok(result.count >= 230 && result.count % 230 === 0, JSON.stringify(result));
  assert.ok(result.colors.some(color => color.includes('255, 158, 41')), JSON.stringify(result.colors));
  assert.equal(result.text, 'Spark');
  await page.evaluate(async () => {
    const { prepareClonedSection } = await import('/editor/web/prepare-cloned-section.mjs');
    const old = document.querySelector('section'), copy = old.cloneNode(true); copy.append(document.createElement('p'));
    prepareClonedSection(copy, { livePreview: true }); window.draws = []; old.replaceWith(copy);
  });
  await page.waitForFunction(() => document.querySelector('canvas').dataset.nativeLive && window.draws.length > 0);
  assert.equal(await page.locator('[data-native-runtime-note],.native-copy-pending').count(), 0);
  assert.equal(await page.locator('canvas').isVisible(), true);
});

test('canvas lifecycle batches settings, releases removed controllers and rebinds controls once', async t => {
  const page = await pageFor(t, '<main><section data-runtime="one"><canvas data-shape="sphere"></canvas><button>Replay</button></section></main>');
  await page.evaluate(async () => {
    const { registerCanvas } = await import('/src/scripts/canvas-runtime.mjs');
    window.mounts = 0; window.disposals = 0; window.clicks = 0;
    registerCanvas('canvas', (canvas, life) => {
      ++window.mounts;
      life.listen(life.scope.querySelector('button'), 'click', () => ++window.clicks);
      life.cleanup(() => ++window.disposals);
    }, { attributes: ['data-shape'], scope: 'section' });
    document.querySelector('canvas').dataset.shape = 'torus'; document.querySelector('section').dataset.runtime = 'two';
  });
  await page.waitForFunction(() => window.mounts === 2);
  await page.getByRole('button').click();
  assert.deepEqual(await page.evaluate(() => [window.mounts, window.disposals, window.clicks]), [2, 1, 1]);
  await page.evaluate(() => { const section = document.querySelector('section'); section.replaceWith(section.cloneNode(true)); });
  await page.waitForFunction(() => window.mounts === 3);
  await page.getByRole('button').click();
  assert.deepEqual(await page.evaluate(() => [window.mounts, window.disposals, window.clicks]), [3, 2, 2]);
});

test('hidden or absent canvas keeps pricing text in column 2 on desktop and mobile', async t => {
  const css = await readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  const page = await pageFor(t, '<main><article class="pack"><canvas hidden></canvas><div><h3>Spark</h3><p>Package description</p></div></article></main>');
  await page.addStyleTag({ content: css });
  for (const width of [1200, 390]) {
    await page.setViewportSize({ width, height: 800 });
    for (const absent of [false, true]) {
      if (absent) await page.locator('canvas').evaluate(node => node.remove());
      const layout = await page.locator('.pack > div').evaluate(node => ({ column: getComputedStyle(node).gridColumnStart, width: node.getBoundingClientRect().width, left: node.getBoundingClientRect().left - node.parentElement.getBoundingClientRect().left }));
      assert.equal(layout.column, '2'); assert.ok(layout.width > 150); assert.ok(layout.left >= (width < 640 ? 72 : 96) + 18);
    }
    await page.locator('.pack').evaluate(node => node.prepend(Object.assign(document.createElement('canvas'), { hidden: true })));
  }
});
