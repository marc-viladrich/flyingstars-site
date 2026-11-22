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
    await expect(page.locator('.ss-step')).toHaveCount(7); // Runde 19: Werkzeug (2) + Ablauf (5)
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
  for (const step of [0, 2, 6]) {
    await page.locator('.ss-step').nth(step).scrollIntoViewIfNeeded();
    await page.evaluate((i) => { const m = document.querySelectorAll('.ss-step')[i]; scrollBy({ top: m.getBoundingClientRect().top - innerHeight * 0.3, behavior: 'instant' }); }, step);
    await expect(stage).toHaveAttribute('data-step', String(step));
  }
  // reduzierte Bewegung: keine Eigenbewegung der Drohnen
  expect(await page.locator('.sd .sw').evaluateAll((els) => els.filter((e) => (e as SVGElement).style.transform).length)).toBe(0);
});

test('Musik und Licht: der Abspielkopf treibt Lichtblöcke und Sternbildung, reduziert steht der Endzustand', async ({ page }) => {
  await page.goto(`/blog/${CS}/`);
  const stage = page.locator('[data-stage]');
  await page.evaluate(() => { const m = document.querySelectorAll('.ss-step')[4]; scrollBy({ top: m.getBoundingClientRect().top - innerHeight * 0.3, behavior: 'instant' }); });
  await expect(stage).toHaveAttribute('data-step', '4');
  await expect(stage).toHaveClass(/is-sweeping/);
  // ein Block je Spur höchstens hell, die Drohnen folgen dem Kopf über ihren Versatz
  await expect.poll(() => page.locator('.bar.lit').count()).toBeGreaterThan(0);
  expect(await page.locator('.bar.lit').count()).toBeLessThanOrEqual(5);
  await expect.poll(() => page.locator('.sd .sw').evaluateAll((els) => els.filter((e) => (e as SVGElement).style.getPropertyValue('--wx')).length)).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(stage).not.toHaveClass(/is-sweeping/);
  expect(await page.locator('.bar.lit').count()).toBe(0);
});

// Runde 20 (Marc, 22.11.2026): zwei Spalten auf jedem Querformat (auch am hohen Monitor); Zuordnung über die Fläche am
// aktiven Schritt (wie Icon-Karten) und Nummern wie in der Schrittleiste. Die Fläche verändert keine Zeilenumbrüche.
for (const vp of [{ width: 2560, height: 1440 }, { width: 1280, height: 720 }]) {
  test(`Zwei Spalten ${vp.width}×${vp.height}: Szene neben dem Text, Fläche am aktiven Schritt, Nummern`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto(`/blog/${CS}/`);
    await page.evaluate(() => { const u = document.querySelectorAll('.ss-unit')[2]; scrollBy({ top: u.getBoundingClientRect().top - innerHeight * 0.3, behavior: 'instant' }); });
    await expect(page.locator('[data-stage]')).toHaveAttribute('data-step', '2');
    const geo = await page.evaluate(() => {
      const fig = document.querySelector('.ss-fig')!.getBoundingClientRect(), text = document.querySelector('.ss-text')!;
      const units = [...document.querySelectorAll<HTMLElement>('.ss-unit')];
      const steps = units.map((u) => u.querySelector<HTMLElement>('.ss-step')!);
      const inner = (el: HTMLElement) => { const cs = getComputedStyle(el); return el.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); };
      return { beside: fig.left > text.getBoundingClientRect().right, figH: fig.height, textW: text.getBoundingClientRect().width, stepW: steps.map(inner),
        mark: steps.map((st) => Number(getComputedStyle(st, '::before').opacity)), nums: steps.map((st) => getComputedStyle(st.firstElementChild!, '::before').content) };
    });
    expect(geo.beside).toBe(true);
    expect(geo.figH).toBeLessThanOrEqual(vp.height);
    for (const w of geo.stepW) expect(Math.abs(w - geo.textW)).toBeLessThan(1); // Textbreite wie ohne Fläche
    await expect.poll(() => page.locator('.ss-step').evaluateAll((els) => els.map((e) => Number(getComputedStyle(e, '::before').opacity)))).toEqual([0, 0, 1, 0, 0, 0, 0]);
    expect(geo.nums).toEqual(['"01"', '"02"', '"01"', '"02"', '"03"', '"04"', '"05"']);
  });
}

test('Drohne zerlegt sich nur auf Wunsch: Hover mit der Maus, Tippen am Handy, Knopf mit Tastatur', async ({ page, isMobile }) => {
  await page.goto(`/blog/${CS}/`);
  await page.evaluate(() => { const u = document.querySelector('.ss-unit')!; scrollBy({ top: u.getBoundingClientRect().top - innerHeight * 0.45, behavior: 'instant' }); });
  const stage = page.locator('[data-stage]'), btn = page.locator('[data-explode]');
  await expect(stage).toHaveAttribute('data-step', '0');
  await page.waitForTimeout(3000); // früher zerfiel sie nach 2,6 s von selbst
  await expect(page.locator('.sn.on')).toHaveCount(0);
  await expect(btn).toHaveAttribute('aria-pressed', 'false');
  const box = (await stage.boundingBox())!;
  if (isMobile) {
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator('.sn.on')).toHaveCount(3);
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator('.sn.on')).toHaveCount(0);
    return;
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator('.sn.on')).toHaveCount(3);
  await page.mouse.move(2, box.y + box.height / 2);
  await expect(page.locator('.sn.on')).toHaveCount(0);
  await btn.focus(); await page.keyboard.press('Enter');
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.sn.on')).toHaveCount(3);
});

test('Showabend: Startraster, Funk, dann Stern → Herz → Kreis mit Signalen vor jedem Wechsel; reduziert ruht der Stern', async ({ page }) => {
  await page.goto(`/blog/${CS}/`);
  const stage = page.locator('[data-stage]');
  await page.evaluate(() => { const u = document.querySelectorAll('.ss-unit')[5]; scrollBy({ top: u.getBoundingClientRect().top - innerHeight * 0.3, behavior: 'instant' }); });
  await expect(stage).toHaveAttribute('data-step', '5');
  await page.evaluate(() => { const u = document.querySelectorAll('.ss-unit')[6]; scrollBy({ top: u.getBoundingClientRect().top - innerHeight * 0.3, behavior: 'instant' }); });
  await expect(stage).toHaveAttribute('data-step', '6');
  await expect(stage).toHaveClass(/is-signal/); // erst am Boden, Funk
  await expect(stage).toHaveAttribute('data-pulse', /[0-2]/, { timeout: 12_000 }); // Signal vor dem ersten Wechsel
  await expect.poll(() => page.locator('.sd .sw').evaluateAll((els) => els.filter((e) => Math.abs(parseFloat((e as SVGElement).style.getPropertyValue('--wx') || '0')) > 3).length), { timeout: 8_000 }).toBeGreaterThan(10);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => document.dispatchEvent(new Event('flyingstars:motion-change')));
  await expect(stage).not.toHaveAttribute('data-pulse', /.*/);
});
