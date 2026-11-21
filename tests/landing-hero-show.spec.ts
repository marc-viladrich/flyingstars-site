import { test, expect } from '@playwright/test';

// Runde 14 (Moritz und Marc, 21.11.2026): Der Seitenkopf der Hochzeitsseite zeigt Formationen aus dem Show-Konfigurator
// statt des Showreels (landingHero `show: hochzeitHero`, src/scripts/hero-show.js). Wächter: kein Video, die Bühne im
// selben Rahmen, das Foto als Standbild bis zum ersten Bild, bei reduzierter Bewegung und ohne JavaScript; die Engine
// lädt erst nach dem LCP; keine Eckdaten mehr im Seitenkopf; die Video-Seitenköpfe (Werbung, Indoor) bleiben Video.
const PATH = '/drohnenshow-hochzeit/';
const video = /\.(mp4|webm)(\?|$)/;
const engine = /\/(show-field|show-scenes|hero-show)\.[\w-]+\.js$/;

test('Hochzeit: Formationen statt Video, die Ecke nennt die Art der Show', async ({ page }) => {
  const requests: string[] = [], errors: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(PATH);
  const host = page.locator('.lh [data-lh-show]');
  await expect(host).toHaveCount(1);
  await expect(page.locator('.lh video, .lh [data-lh-reel], .lh [data-lh-toggle]')).toHaveCount(0);
  await expect(page.locator('.lh .facts, .lh dl')).toHaveCount(0); // Moritz: keine Eckdaten, Fokus auf Emotion
  // bis zum ersten Bild steht das Foto, danach blendet es aus und die Bühne beschreibt sich selbst
  await expect(host.locator('img')).toBeVisible();
  await expect(host).toHaveClass(/is-live/, { timeout: 20_000 });
  await expect(host.locator('canvas')).toHaveAttribute('role', 'img');
  await expect(host.locator('canvas')).toHaveAccessibleName(/Herz/);
  await expect(host.locator('[data-lh-art]')).toHaveText(/^(2D|3D|3D\+)$/);
  // Steigerung: auf 2D folgt 3D (Herz → Herztunnel)
  await expect(host.locator('[data-lh-art]')).toHaveText('3D', { timeout: 20_000 });
  expect(requests.filter((u) => video.test(u))).toEqual([]);
  expect(errors).toEqual([]);
});

test('Hochzeit: die Bühne hat Platz und Rahmen des Video-Seitenkopfs, am Handy über der Überschrift', async ({ page, isMobile }) => {
  await page.goto(PATH);
  const frame = (await page.locator('[data-lh-show]').boundingBox())!, canvas = (await page.locator('[data-lh-field]').boundingBox())!;
  expect(Math.abs(canvas.width - frame.width)).toBeLessThan(1);
  expect(Math.abs(canvas.height - frame.height)).toBeLessThan(1);
  expect(frame.width / frame.height).toBeGreaterThan(1.3);
  await expect(page.locator('[data-lh-show] .frame-corners i')).toHaveCount(4);
  const heading = (await page.locator('#hero-h').boundingBox())!;
  if (isMobile) expect(frame.y + frame.height).toBeLessThanOrEqual(heading.y);
});

test('Hochzeit: vor dem LCP lädt keine Show-Engine', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __lcp: number }).__lcp = 0;
    new PerformanceObserver((l) => l.getEntries().forEach((e) => { (window as unknown as { __lcp: number }).__lcp = e.startTime; })).observe({ type: 'largest-contentful-paint', buffered: true });
  });
  await page.goto(PATH, { waitUntil: 'load' });
  await expect(page.locator('[data-lh-show]')).toHaveClass(/is-live/, { timeout: 20_000 });
  const { lcp, early } = await page.evaluate((re) => {
    const lcp = (window as unknown as { __lcp: number }).__lcp;
    return { lcp, early: performance.getEntriesByType('resource').filter((r) => new RegExp(re).test(r.name) && r.startTime < lcp).map((r) => r.name) };
  }, engine.source);
  test.skip(!lcp, 'Dieser Browser meldet kein LCP.');
  expect(early).toEqual([]);
});

test('Hochzeit bei reduzierter Bewegung: das Foto steht, die Engine lädt nicht', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(PATH, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const host = page.locator('[data-lh-show]');
  await expect(host).not.toHaveClass(/is-live/);
  await expect(host.locator('img')).toBeVisible();
  expect(await host.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0 && getComputedStyle(img).opacity === '1')).toBe(true);
  expect(requests.filter((u) => /\/hero-show\.[\w-]+\.js$/.test(u))).toEqual([]);
});

test.describe('ohne JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('Hochzeit: das Foto steht im Rahmen', async ({ page }) => {
    await page.goto(PATH);
    const img = page.locator('[data-lh-show] img');
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute('alt', /Ring aus Drohnen/);
  });
});

test('Werbung und Indoor behalten ihr Video im Seitenkopf', async ({ page }) => {
  for (const path of ['/drohnenshow-werbung/', '/drohnenshow-indoor/']) {
    await page.goto(path);
    await expect(page.locator('.lh [data-lh-reel] video')).toHaveCount(1);
    await expect(page.locator('.lh [data-lh-show]')).toHaveCount(0);
  }
});
