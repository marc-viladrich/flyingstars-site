import { test, expect, type Page } from '@playwright/test';
import { tap } from './helpers/reach';
test.use({ reducedMotion: 'reduce' });
// Runde 5 (18.11.2026): keine Paketknöpfe mehr. Die Art der Show (2D ab 100, 3D ab 200, Storytelling ab 300) steht vor dem
// Logo-Anlass fest; „SPARK mit 100 Drohnen“ heißt jetzt: 2D-Show, Regler auf 100.
const open = async (page: Page) => {
  await page.goto('/drohnenshow-preise/?drohnen=200&art=2d#konfigurator');
  await page.reload();
  await expect(page.locator('#cfg-field')).toHaveAttribute('data-points', /[0-9]+/);
  await tap(page, page.locator('[data-occasion="logo"]'));
  await expect(page.locator('#cfg-examples')).toBeVisible();
};
const choose = async (page: Page, id: string) => {
  const workers: string[] = [];
  const watch = (worker: { url(): string }) => workers.push(worker.url());
  page.on('worker', watch);
  await tap(page, page.locator(`[data-example="${id}"]`));
  await expect(page.locator('#cfg')).toHaveAttribute('data-logo-example', id);
  await expect(page.locator('#cfg')).toHaveAttribute('data-logo-state', 'ready', {timeout:90000});
  await expect(page.locator('#cfg-logo-count')).toBeVisible();
  await expect(page.locator('#cfg-scene')).toHaveText('Euer Logo', { timeout: 90000 });
  // Runde 9 (Punkt 1): der Griff steht auf der gemessenen Stufe des automatischen Bilds (beispiele/<id>.json, density[n])
  await expect(page.locator('#cfg-detail')).not.toHaveAttribute('aria-busy', 'true');
  const wanted = Number(await page.locator('#cfg-drones').inputValue());
  const stored = await page.evaluate(async ([x, n]) => (await (await fetch(`/media/logo-modus/beispiele/${x}.json`)).json()).density[n].index, [id, wanted] as const);
  await expect(page.locator('#cfg-detail')).toHaveValue(String(stored));
  page.off('worker', watch);
  expect(workers.filter(url => url.includes('logo-worker'))).toEqual([]);
  return Number(await page.locator('#cfg-logo-n').textContent());
};
test('Logo-Empfehlung bleibt beim Wechsel stabil, Adidas ist unabhängig vom vorherigen Logo', async ({ page }) => {
  test.setTimeout(240000);
  await open(page);
  const lamborghini = await choose(page, 'lamborghini');
  await tap(page, page.locator('#cfg-use-logo'));
  await tap(page, page.locator('[data-occasion="logo"]'));
  await expect(page.locator('#cfg-logo-n')).toHaveText(String(lamborghini));
  await expect(page.locator('#cfg-drones')).toHaveValue('200');
  await expect(page.locator('#cfg-scene')).toHaveText('Euer Logo');
  const adidas = await choose(page, 'adidas');
  await page.screenshot({ path: `/tmp/logo-budget-${test.info().project.name}-adidas.png` });
  await open(page);
  expect(await choose(page, 'adidas')).toBe(adidas);
});
test('HORIZON-Logo wird in SPARK vereinfacht; Automatisch zeigt die wirksame Stufe', async ({ page }) => {
  test.setTimeout(240000);
  await open(page);
  const recommendation = await choose(page, 'lamborghini'); // (choose prüft die gemessene Stufe des Griffs)
  expect(recommendation).toBeGreaterThan(100);
  await tap(page, page.locator('#cfg-use-logo'));
  // 360 Drohnen: Preisstufe 400, ab 400 ist die Show 3D; Home geht bei automatischem 3D wieder bis 100
  await page.locator('#cfg-drones').focus(); await page.keyboard.press('Home'); // 2D-Show mit 100 Drohnen
  await expect(page.locator('#cfg-scene')).toHaveText('Euer Logo, vereinfacht für 100 Drohnen', { timeout: 90000 });
  await expect(page.locator('#cfg-field')).toHaveAttribute('data-points', '100');
  await expect(page.locator('#cfg-detail')).not.toBeVisible();
  await expect(page.locator('#cfg-logo-caption')).toHaveCount(0);
  await expect.poll(async () => Number(await page.locator('#cfg-field').getAttribute('data-lit')), {timeout:15000}).toBeLessThanOrEqual(100);
  expect(page.workers().filter(worker => worker.url().includes('logo-worker'))).toEqual([]);
  await page.screenshot({ path: `/tmp/logo-budget-${test.info().project.name}-spark.png` });
});
test('Cupra mit niedriger Dichte wird als 2D-Show mit 100 Drohnen übernommen', async ({ page }) => {
  test.setTimeout(240000);
  await open(page); await choose(page, 'cupra');
  await page.locator('#cfg-detail').focus();
  await page.locator('#cfg-detail').press('Home');
  await page.locator('#cfg-detail').press('ArrowRight');
  await expect(page.locator('#cfg-scene')).toHaveText('Euer Logo', { timeout: 90000 });
  await expect.poll(async () => Number(await page.locator('#cfg-logo-n').textContent()), {timeout:90000}).toBeLessThan(200);
  await tap(page, page.locator('#cfg-use-logo'));
  await expect(page.locator('#cfg-pkg')).toHaveText('Eure 2D Show');
  await expect(page.locator('#cfg-dronecount')).toHaveText('100');
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
  await tap(page, page.locator('#cfg-use-logo'));
  await page.locator('#cfg-drones').focus(); await page.keyboard.press('Home'); // 2D-Show mit 100 Drohnen
  // Runde 10b: die große Zahl ist die buchbare Empfehlung (logo-advice.mjs, Preisstufe), die Bühne nennt den echten
  // Mindestbedarf der Formation (ihre Punktzahl); der liegt nie über der Empfehlung
  await expect(page.locator('#cfg-scene')).toHaveText(/^Euer Logo braucht mindestens \d+ Drohnen$/);
  const raw = Number(await page.locator('#cfg-field').getAttribute('data-points'));
  await expect(page.locator('#cfg-scene')).toHaveText(`Euer Logo braucht mindestens ${raw} Drohnen`);
  expect(raw).toBeGreaterThan(100); expect(raw).toBeLessThanOrEqual(need);
  await expect(page.locator('#cfg-logo-caption')).toHaveCount(0);
  await expect(page.locator('#cfg-logo-status')).toHaveText('');
  await expect(page.locator('#cfg-error')).toBeHidden();
});
