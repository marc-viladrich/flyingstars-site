import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { expect, test } from '@playwright/test';

const path = '/drohnenshow-preise/';
const points = [
  '/media/katalog/m-8098c062d26f4a02.json',
  '/media/katalog/m-8b17885a380498eb.json',
];

test('Preisseite lädt nur die Winterrunde innerhalb des Startbudgets', async ({ page, baseURL }, info) => {
  test.skip(info.project.name !== 'desktop', 'Produktionsbudget für Chromium bei 1440 × 900');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.clock.setFixedTime(new Date('2026-11-23T11:00:00Z'));
  const origin = new URL(baseURL!).origin;
  const requests: string[] = [], workers: string[] = [];
  page.on('worker', (worker) => workers.push(worker.url()));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin === origin && /\.(js|json)$/.test(url.pathname)) requests.push(url.pathname);
  });
  await page.goto(path);
  await expect(page.locator('#cfg-field')).toHaveAttribute('data-lit', '200');
  await expect(page.locator('#cfg-scene')).toContainText('Lichterbaum');
  await expect(page.locator('#cfg-marks .is-motif')).toHaveCount(12);
  await page.waitForTimeout(3300); // Start einschließlich Leerlauf-Imports
  expect(requests.filter((url) => url.endsWith('.json')).sort()).toEqual(points);
  expect(workers).toEqual([]);
  expect(requests.filter((url) => /\/(?:wahrzeichen|sport|alt-ehe|catalog-actions|text-worker|logo-mode|kultur|technik)[.-]/.test(url))).toEqual([]);
  expect(requests).toHaveLength(new Set(requests).size);
  const sizes = await Promise.all(requests.map(async (url) => {
    const bytes = await readFile(resolve('dist', '.' + url));
    return gzipSync(bytes, { level: 6 }).length;
  }));
  expect(sizes.reduce((sum, bytes) => sum + bytes, 0)).toBeLessThanOrEqual(180_000);
});

test('Ein fehlender Katalogdatensatz lässt sich erneut laden und räumt die Bühne nicht ab', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.clock.setFixedTime(new Date('2026-11-23T11:00:00Z'));
  const atom = /\/m-a300ca052ba95aab\.json$/;
  let requests = 0;
  await page.route(atom, (route) => { requests += 1; return requests === 1 ? route.abort() : route.continue(); });
  await page.goto(path + '#konfigurator');
  const field = page.locator('#cfg-field');
  await expect(field).toHaveAttribute('data-points', '200');
  await page.locator('#cfg-drones').press('ArrowRight');
  await expect(page.locator('#cfg-error')).toBeVisible();
  await expect(field).toHaveAttribute('data-points', '200');
  await expect(field).toHaveAttribute('data-lit', '200');
  // Mit einer anderen Stufe dieselbe Quellauflösung anfordern.
  await page.locator('#cfg-drones').press('ArrowRight');
  await expect(field).toHaveAttribute('data-points', '300');
  await expect(page.locator('#cfg-error')).toBeHidden();
  expect(requests).toBe(2);
});
