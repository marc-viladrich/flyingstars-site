import { test, expect, type Page } from '@playwright/test';
test.use({ reducedMotion: 'reduce' });
const open = async (page: Page) => {
  await page.goto('/drohnenshow-preise/?drohnen=200#konfigurator');
  await page.reload();
  await expect(page.locator('#cfg-field')).toHaveAttribute('data-points', /[0-9]+/);
  await page.locator('[data-occasion="logo"]').click();
  await expect(page.locator('#cfg-examples')).toBeVisible();
};
const choose = async (page: Page, id: string) => {
  const workers: string[] = [];
  const watch = (worker: { url(): string }) => workers.push(worker.url());
  page.on('worker', watch);
  await page.locator(`[data-example="${id}"]`).click();
  await expect(page.locator('#cfg')).toHaveAttribute('data-logo-example', id);
  await expect(page.locator('#cfg')).toHaveAttribute('data-logo-state', 'ready', {timeout:90000});
  await expect(page.locator('#cfg-logo-count')).toBeVisible();
  await expect(page.locator('#cfg-scene')).toHaveText('Euer Logo', { timeout: 90000 });
  await expect(page.locator('#cfg-detail')).toHaveAttribute('data-used-density', /[\d.]+/);
  page.off('worker', watch);
  expect(workers.filter(url => url.includes('logo-worker'))).toEqual([]);
  return Number(await page.locator('#cfg-logo-n').textContent());
};
test('Logo-Empfehlung bleibt beim Wechsel stabil, Adidas ist unabhängig vom vorherigen Logo', async ({ page }) => {
  test.setTimeout(240000);
  await open(page);
  const lamborghini = await choose(page, 'lamborghini');
  await page.locator('#cfg-use-logo').click();
  await page.locator('[data-occasion="logo"]').click();
  await expect(page.locator('#cfg-logo-n')).toHaveText(String(lamborghini));
  await expect(page.locator('#cfg-drones')).toHaveValue('200');
  await expect(page.locator('#cfg-scene')).toHaveText('Euer Logo');
  const adidas = await choose(page, 'adidas');
  await page.screenshot({ path: `/tmp/logo-budget-${test.info().project.name}-adidas.png` });
  await open(page);
  expect(await choose(page, 'adidas')).toBe(adidas);
});
test('HORIZON-Logo wird in SPARK vereinfacht; Automatisch zeigt die genutzte Dichte', async ({ page }) => {
  test.setTimeout(240000);
  await open(page);
  const recommendation = await choose(page, 'lamborghini');
  expect(recommendation).toBeGreaterThan(100);
  const density = await page.locator('#cfg-detail').evaluate((el: HTMLInputElement) => ({ value: +el.value, used: +el.dataset.usedDensity! }));
  const levels = [0.07,0.1,0.12,0.15,0.24,0.33,0.42,0.51,0.6,0.69,0.78,0.87,0.96,1.05,1.3,1.6,2,2.5,3];
  expect(density.value).toBe(levels.reduce((best,d,i) => Math.abs(d-density.used)<Math.abs(levels[best]-density.used)?i:best,0));
  await page.locator('#cfg-use-logo').click();
  await page.locator('label:has([name=pkg][value="0"])').click();
  await expect(page.locator('#cfg-scene')).toHaveText('Euer Logo, vereinfacht für 100 Drohnen', { timeout: 90000 });
  await expect(page.locator('#cfg-field')).toHaveAttribute('data-points', '100');
  await expect(page.locator('#cfg-detail')).not.toBeVisible();
  await expect(page.locator('#cfg-logo-caption')).toHaveCount(0);
  await expect.poll(async () => Number(await page.locator('#cfg-field').getAttribute('data-lit')), {timeout:15000}).toBeLessThanOrEqual(100);
  expect(page.workers().filter(worker => worker.url().includes('logo-worker'))).toEqual([]);
  await page.screenshot({ path: `/tmp/logo-budget-${test.info().project.name}-spark.png` });
});
test('Cupra mit niedriger Dichte wird als SPARK übernommen', async ({ page }) => {
  test.setTimeout(240000);
  await open(page); await choose(page, 'cupra');
  await page.locator('#cfg-detail').focus();
  await page.locator('#cfg-detail').press('Home');
  await page.locator('#cfg-detail').press('ArrowRight');
  await expect(page.locator('#cfg-scene')).toHaveText('Euer Logo', { timeout: 90000 });
  await expect.poll(async () => Number(await page.locator('#cfg-logo-n').textContent()), {timeout:90000}).toBeLessThan(200);
  await page.locator('#cfg-use-logo').click();
  await expect(page.locator('#cfg-pkg')).toHaveText('SPARK');
  await expect(page.locator('#cfg-scene')).toHaveText('Euer Logo', {timeout:90000});
  await expect(page.locator('#cfg-field')).toHaveAttribute('data-points', '100');
  await page.screenshot({ path: `/tmp/logo-budget-${test.info().project.name}-cupra.png` });
});

test('Eine nicht passende strenge Fassung bleibt sichtbar mit Mindestbedarf und ohne Panel-Fehler', async ({ page }) => {
  await page.route('**/beispiele/lamborghini.json', async route => {
    const response = await route.fetch();
    const data = await response.json();
    // Deterministic impossible-budget fixture: retain a complete formation above SPARK.
    data.strict[200][100] = data.steps[200];
    await route.fulfill({ response, json: data });
  });
  await open(page);
  const need = await choose(page, 'lamborghini');
  expect(need).toBeGreaterThan(100);
  await page.locator('#cfg-use-logo').click();
  await page.locator('label:has([name=pkg][value="0"])').click();
  await expect(page.locator('#cfg-scene')).toHaveText(`Euer Logo braucht mindestens ${need} Drohnen`);
  await expect(page.locator('#cfg-logo-caption')).toHaveCount(0);
  await expect(page.locator('#cfg-logo-status')).toHaveText('');
  await expect(page.locator('#cfg-error')).toBeHidden();
  await expect(page.locator('#cfg-field')).toHaveAttribute('data-points', String(need));
});
