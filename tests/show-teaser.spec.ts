import { test, expect, type Page } from '@playwright/test';

// Teaser des Show-Konfigurators (ConfiguratorTeaser.astro, src/scripts/show-teaser.js), Runde 9: ein Showreel, das sich
// selbst abspielt, in drei Abläufen (start, marke, hochzeit). Daneben ein Regler mit „N Drohnen“ und acht Euro-Stufen. Das Logo bzw. die Initialen stehen am Anfang und werden mit mehr Drohnen
// schärfer; die Bühne ist ein Link ohne eigenen Tab-Stopp, der Knopf bleibt der Weg per Tastatur. Keine
// Formularelemente. Lädt erst in der Nähe des Viewports, zeichnet außerhalb nicht, steht bei reduzierter Bewegung.
// TEASER_PATH stellt die Seite ein (Standard: Startseite). Die Prüfseite /poc/konfigurator-teaser/ ist seit Runde 20
// gelöscht (Marc, 04.11.2026); die Abläufe „marke“ und „hochzeit“ stehen auf ihren Landingpages.
const PAGE = process.env.TEASER_PATH ?? '/';
const root = (page: Page, sel = '[data-cft-root]') => page.locator(sel).first();
const field = (page: Page, sel?: string) => root(page, sel).locator('[data-cft=field]');
const reach = async (page: Page, sel?: string) => { await root(page, sel).scrollIntoViewIfNeeded(); await expect(root(page, sel)).toHaveAttribute('data-cft-loaded', 'true', { timeout: 20_000 }); };
test('Der Teaser lädt erst in der Nähe des Viewports', async ({ page }) => {
  await page.goto(PAGE);
  const far = await root(page).evaluate((el) => el.getBoundingClientRect().top - innerHeight);
  test.skip(far < 400, 'Der Teaser steht auf dieser Seite schon im ersten Blick.');
  await page.waitForTimeout(800);
  await expect(root(page)).not.toHaveAttribute('data-cft-ready', 'true');
  await reach(page);
});

test('Dekorative Regler und genau ein erreichbarer Link zu Show planen', async ({ page }) => {
  await page.goto(PAGE);
  const r = root(page);
  await expect(r.locator('input, button, select, textarea')).toHaveCount(0);
  await expect(r.locator('.cft-pill')).toHaveCount(0); // Runde 9: Anlass-Pills ersatzlos raus
  await expect(r.locator('[data-cft=pkg]').filter({ visible: true })).toHaveCount(0);
  await expect(r.locator('[data-cft=thumb]')).toBeVisible();
  const price = r.locator('.cft-price');
  if (await price.isVisible()) await expect(price.locator('[data-cft=euro]').filter({ visible: true })).toHaveCount(8);
  await expect(r.locator('.cft-count')).toContainText('Drohnen');
  await expect(r.locator('a:not([tabindex="-1"])')).toHaveCount(1);
  await expect(r.locator('a.cft-cta')).toHaveText('Show planen');
  await expect(r.locator('a.cft-cta')).toHaveAttribute('href', '/drohnenshow-preise/#konfigurator');
  await expect(r.locator('a.cft-hit')).toHaveAttribute('href', '/drohnenshow-preise/#konfigurator');
  await expect(r.locator('a.cft-hit')).toHaveAttribute('aria-hidden', 'true');
  await expect(r.locator('.cft-mock')).toHaveAttribute('aria-hidden', 'true');
  await expect(r.locator('[role=img]')).toHaveAttribute('aria-label', /Drohnenshow/);
});

test('Logo und Herz wechseln die sichtbare Drohnenzahl und Preisindikation', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Die Euro-Skala gehört zum Desktop-Wireframe.');
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(PAGE);
  await reach(page);
  const r = root(page), count = r.locator('[data-cft=count]'), note = r.locator('[data-cft=note]');
  await expect(count).toBeVisible();
  await expect(r.locator('.cft-price')).toBeVisible();
  // Stufen mitschreiben: Drohnenzahl → Euro-Zeichen
  await page.evaluate(() => {
    const el = document.querySelector('[data-cft-root]')!, c = el.querySelector('[data-cft=count]')!, w = window as unknown as { __steps: [string, number][] };
    const take = () => w.__steps.push([c.textContent ?? '', Array.from(el.querySelectorAll('[data-cft=euro].is-on')).filter(e => e.getClientRects().length > 0).length]);
    w.__steps = []; take(); new MutationObserver(take).observe(el, { subtree: true, attributes: true, attributeFilter: ['class'] });
  });
  await expect(note).toHaveCSS('opacity', '1');
  await expect(note).toHaveText('Platz für euer Logo');
  await expect(count).toHaveText('300', { timeout: 15_000 });
  await expect(count).toHaveText('600', { timeout: 15_000 });
  await expect(note).toHaveCSS('opacity', '0', { timeout: 15_000 }); // Logo wechselt zur Herzensfolge
  await expect(count).toHaveText('200', { timeout: 10_000 }); // der Herztunnel
  await expect(count).toHaveText('300', { timeout: 10_000 }); // Amors Pfeil und QR-Code
  await expect(count).toHaveText('450', { timeout: 20_000 }); // Rakete und Mondlandung
  await expect(count).toHaveText('600', { timeout: 20_000 }); // Bokkenrijders
  const steps = await page.evaluate(() => (window as unknown as { __steps: [string, number][] }).__steps);
  const level = new Map<number, Set<number>>();
  for (const [n, e] of steps) if (e) { if (!level.has(+n)) level.set(+n, new Set()); level.get(+n)!.add(e); }
  const sorted = [...level.keys()].sort((a, b) => a - b), euro = sorted.map((n) => Math.max(...level.get(n)!));
  expect(sorted).toEqual([100, 200, 300, 450, 600]);
  for (let i = 1; i < euro.length; i++) expect(euro[i], `${sorted[i]} Drohnen`).toBeGreaterThan(euro[i - 1]);
  expect(euro.at(-1)).toBe(8);
  expect(errors).toEqual([]);
});

test('Beim Zeigen auf die Bühne erscheint „Eigene Show zusammenstellen“, ein Klick führt in den Konfigurator; auch der Fokus auf dem Knopf zeigt es', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('mobile'), 'Zeigen gibt es nur mit Maus.');
  await page.goto(PAGE);
  await reach(page);
  const hit = root(page).locator('a.cft-hit');
  await expect(hit).toHaveCSS('opacity', '0');
  await root(page).locator('.cft-stage').hover();
  await expect(hit).toHaveCSS('opacity', '1');
  await expect(hit).toContainText('Eigene Show zusammenstellen');
  await page.mouse.move(0, 0);
  await expect(hit).toHaveCSS('opacity', '0');
  await root(page).locator('a.cft-cta').focus(); // Tastatur: der Knopf ist der Tab-Stopp (WebKit springt per Tab nur mit Einstellung auf Links)
  await expect(hit).toHaveCSS('opacity', '1');
  await root(page).locator('.cft-stage').click();
  await expect(page).toHaveURL(/\/drohnenshow-preise\/#konfigurator$/);
});

test('Abläufe für die Landingpages: „marke“ beginnt mit dem Logo, „hochzeit“ mit Initialen im Herz', async ({ page }) => {
  test.setTimeout(60_000);
  for (const [path, reel, note] of [['/drohnenshow-werbung/', 'marke', 'Platz für euer Logo'], ['/drohnenshow-hochzeit/', 'hochzeit', 'Eure Initialen']] as const) {
    await page.goto(path);
    const sel = `[data-cft-root][data-reel=${reel}]`;
    await reach(page, sel);
    const annotation = root(page, sel).locator('[data-cft=note]');
    await expect(annotation).toHaveCSS('opacity', '1');
    await expect(annotation).toContainText(note);
    await expect(root(page, sel).locator('[data-cft=count]')).toHaveText('300', { timeout: 15_000 });
  }
});

test('Die globale Pause hält die sichtbare Bühne an und lässt sie wieder starten', async ({ page }) => {
  await page.goto(PAGE);
  await reach(page);
  await expect(field(page)).toHaveAttribute('data-running', 'true');
  await page.getByRole('button', {name: 'Bewegung pausieren'}).click();
  await reach(page);
  await expect(field(page)).toBeVisible();
  await expect(field(page)).toHaveAttribute('data-running', 'false');
  await page.getByRole('button', {name: 'Bewegung fortsetzen'}).click();
  await reach(page);
  await expect(field(page)).toHaveAttribute('data-running', 'true');
});

test('Außerhalb des Viewports zeichnet die Engine nicht, bei reduzierter Bewegung steht die Bokkenrijders-Maske in Ruhe', async ({ page }) => {
  await page.goto(PAGE);
  await reach(page);
  await expect(field(page)).toHaveAttribute('data-running', 'true');
  await page.evaluate(() => scrollTo(0, 0));
  await expect(field(page)).toHaveAttribute('data-running', 'false');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await reach(page);
  await expect(field(page)).toHaveAttribute('data-running', 'false');
  expect(Number(await field(page).getAttribute('data-points'))).toBe(600);
});

test('Der sichtbare Regler gleitet beim Wechsel und steht bei reduzierter Bewegung', async ({ page }) => {
  await page.goto(PAGE);
  await reach(page);
  const thumb = root(page).locator('[data-cft=thumb]');
  await expect(thumb).toBeVisible();
  const movement = await thumb.evaluate(async el => {
    const sample = () => parseFloat(getComputedStyle(el).left);
    const start = sample();
    const samples = [start];
    const deadline = performance.now() + 8000;
    while (performance.now() < deadline) {
      await new Promise(requestAnimationFrame);
      samples.push(sample());
      const last = samples.length - 1;
      if (last > 3 && Math.abs(samples[last] - start) > 20 &&
          samples[last] === samples[last - 1] && samples[last] === samples[last - 2]) break;
    }
    return { start, end: samples.at(-1)!, samples };
  });
  expect(Math.abs(movement.end - movement.start)).toBeGreaterThan(20);
  const [low, high] = [movement.start, movement.end].sort((a, b) => a - b);
  expect(movement.samples.some(x => x > low + 2 && x < high - 2)).toBe(true);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => thumb.evaluate(el =>
    Math.max(...getComputedStyle(el).transitionDuration.split(',').map(parseFloat)))).toBeLessThan(0.001);
  await expect(field(page)).toHaveAttribute('data-running', 'false');
});
