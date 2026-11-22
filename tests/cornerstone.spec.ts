import { test, expect } from '@playwright/test';

// Cornerstone-Artikel (components/blog/cornerstone/, Runde 15, 22.11.2026): registrierte Artikel zeigen Titelbild im
// Lichtraster, Fotos, Scroll-Szene und Logo-Formation in jeder Sprache; normale Artikel bleiben im normalen Format.
// SEO (27-blog-bilder-2026-11-21/seo-interaktive-grafiken.md): og:image und BlogPosting mit dem Titelbild, Text vollständig im
// HTML, Szene mit Endzustand ohne JavaScript, reduzierte Bewegung ohne Schleifen.
const CS = '2025-06-12-wie-programmiert-man-eine-drohnenshow';
const PAGES = [['de', `/blog/${CS}/`, 'Leuchtstarke LED'], ['en', `/en/blog/${CS}/`, 'Bright LED'], ['nl', `/nl/blog/${CS}/`, 'Felle led']] as const;

for (const [locale, path, led] of PAGES) {
  test(`Cornerstone ${locale}: Szene, Fotos, Formation, Suche`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('[data-ss]')).toHaveCount(1);
    await expect(page.locator('.ss-step')).toHaveCount(9);
    await expect(page.locator('.ap img')).toHaveCount(4);
    await expect(page.locator('[data-ff] .ff-poster')).toHaveCount(1);
    await expect(page.locator('.sn-pill', { hasText: led })).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/media\/blog\/wie-programmiert-man-eine-drohnenshow\/titel-16x9\.jpg$/);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
    const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').first().textContent() ?? '{}');
    expect(ld['@type']).toBe('BlogPosting');
    expect(ld.inLanguage).toBe(locale);
    expect(ld.image).toHaveLength(3);
    // Titelbild: AVIF mit WebP-Rückfall, mit Maßen und Alternativtext
    const cover = page.locator('.post-cover img');
    await expect(cover).toHaveAttribute('width', '1600');
    expect((await cover.getAttribute('alt'))?.length).toBeGreaterThan(10);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
}

// Weitere Cornerstone-Artikel (Runde 18): Ablauf-Szene aus der Aufzählung, Vergleichstabelle der Nachhaltigkeitsseite
const FUNKTION = '2025-01-14-wie-funktioniert-drohnenshow-drohne', FEUERWERK = '2025-03-31-drohnen-feuerwerk-als-alternative';
for (const [locale, prefix, landing, compare] of [['de', '', 'Landung am Startpunkt', 'Lasershow'], ['en', '/en', 'Landing at the starting point', 'Laser show'], ['nl', '/nl', 'Landing op het startpunt', 'Lasershow']] as const) {
  test(`Wie funktioniert eine Drohnenshow ${locale}: Ablauf-Szene in vier Schritten, Fotos, Formation`, async ({ page }) => {
    await page.goto(`${prefix}/blog/${FUNKTION}/`);
    await expect(page.locator('[data-ss]')).toHaveCount(1);
    await expect(page.locator('.ss-step')).toHaveCount(4);
    await expect(page.locator('.ap img')).toHaveCount(4);
    await expect(page.locator('.sn-pill', { hasText: landing })).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/media\/blog\/wie-funktioniert-eine-drohnenshow\/titel-16x9\.jpg$/);
    await expect(page.locator('[data-ff]')).toHaveCount(1);
  });
  test(`Feuerwerk ${locale}: Vergleichstabelle statt Szene, Fotos, Formation`, async ({ page }) => {
    await page.goto(`${prefix}/blog/${FEUERWERK}/`);
    await expect(page.locator('[data-ss]')).toHaveCount(0);
    await expect(page.locator('.cs-compare')).toBeVisible(); // breit Tabelle, schmal Karten (ComparisonMatrix)
    await expect(page.locator('.cs-compare')).toContainText(compare);
    await expect(page.locator('.ap img')).toHaveCount(5);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/media\/blog\/drohnen-als-alternative-zum-feuerwerk\/titel-16x9\.jpg$/);
    await expect(page.locator('[data-ff]')).toHaveCount(1);
  });
}

// Rückfall ins normale Format: scripts/cornerstone-plan.test.mjs (alle veröffentlichten Artikel sind Cornerstones)

test('Szene folgt dem Lesen und ruht bei reduzierter Bewegung', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/blog/${CS}/`);
  const stage = page.locator('[data-stage]');
  for (const step of [0, 2, 8]) {
    await page.locator('.ss-step').nth(step).scrollIntoViewIfNeeded();
    await page.evaluate((i) => { const m = document.querySelectorAll('.ss-step')[i]; scrollBy({ top: m.getBoundingClientRect().top - innerHeight * 0.3, behavior: 'instant' }); }, step);
    await expect(stage).toHaveAttribute('data-step', String(step));
  }
  // reduzierte Bewegung: keine Eigenbewegung der Drohnen
  expect(await page.locator('.sd .sw').evaluateAll((els) => els.filter((e) => (e as SVGElement).style.transform).length)).toBe(0);
});
