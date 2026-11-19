import { test, expect, devices, type Page } from '@playwright/test';

// Fallstudien nach Audit 3 (V5–V7, V9): Kennzahlen bleiben in ihrer Zelle, der Endwert steht immer im Text,
// einspaltig ist keine Überschrift gedimmt, im Hochformat steht das Motiv im eigenen Rahmen.
// Nur Desktop-Chromium und Desktop-WebKit; die Breiten setzt der Test selbst.
const routes = ['/musikalischer-teaser-bokkenrijders/', '/nfl-berlin-game/', '/exploring-reinvented-der-neue-ford-explorer/', '/puma-bundesliga/',
  '/heiratsantrag-hugenpoet/', '/hochzeit-recklinghausen/', '/loreal-prada-rheinturm/'];
test.beforeEach(({}, info) => { test.skip(!['desktop', 'webkit'].includes(info.project.name), 'Breiten setzt der Test selbst'); });

/** Text des Werts ohne dekorative (aria-hidden) Teile. */
const semanticValue = (page: Page, index: number) => page.locator('.c-num dd').nth(index).evaluate((dd) => {
  const walk = (node: Node): string => node instanceof Element && node.getAttribute('aria-hidden') === 'true' ? ''
    : node.nodeType === Node.TEXT_NODE ? node.textContent ?? '' : [...node.childNodes].map(walk).join('');
  return walk(dd).trim();
});

/** Je Kennzahl: rechte Kante des gesetzten Texts gegen die Inhaltskante der eigenen Zelle und die linke Kante der nächsten. */
const overflow = (page: Page) => page.locator('.c-numbers').evaluate((list) => [...list.querySelectorAll('.c-num')].map((cell, i, cells) => {
  const dd = cell.querySelector('dd')!, range = document.createRange(); range.selectNodeContents(dd);
  const text = range.getBoundingClientRect(), box = cell.getBoundingClientRect(), style = getComputedStyle(cell);
  const contentRight = box.right - parseFloat(style.paddingRight);
  const next = cells[i + 1]?.getBoundingClientRect();
  const sameRow = next && Math.abs(next.top - box.top) < 2;
  return { value: dd.textContent!.trim(), overCell: text.right - contentRight, overNext: sameRow ? text.right - next.left : -Infinity, left: text.left - box.left };
}));

for (const [width, height] of [[1024, 768], [1180, 820], [1440, 900], [1920, 1080], [820, 1180], [390, 844]]) {
  test(`V9: „12.000“ neben „20“ bleibt in der eigenen Spalte bei ${width}px`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height });
    await page.goto('/musikalischer-teaser-bokkenrijders/');
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.c-numbers').scrollIntoViewIfNeeded();
    const cells = await overflow(page);
    expect(cells.map((c) => c.value)).toEqual(expect.arrayContaining(['12.000', '20']));
    for (const cell of cells) {
      expect(cell.overCell, `${cell.value} ragt über seine Zelle`).toBeLessThanOrEqual(0.5);
      expect(cell.overNext, `${cell.value} läuft in die nächste Kennzahl`).toBeLessThan(0);
      expect(cell.left).toBeGreaterThanOrEqual(-0.5);
    }
  });
}

test('V9: alle Fallstudien halten ihre Kennzahlen in der Zelle (1024 und 1180)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [width, height] of [[1024, 768], [1180, 820]]) {
    await page.setViewportSize({ width, height });
    for (const route of routes) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      for (const cell of await overflow(page)) expect(cell.overCell, `${route} ${width}: ${cell.value}`).toBeLessThanOrEqual(0.5);
    }
  }
});

test('V5: der Endwert steht vor, während und nach dem Hochzählen im Text', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/musikalischer-teaser-bokkenrijders/');
  // vor dem Erscheinen: Endwert, nicht „0“
  expect(await semanticValue(page, 1)).toBe('12.000');
  await page.locator('.c-numbers').scrollIntoViewIfNeeded();
  const dd = page.locator('.c-num dd').nth(1);
  await expect(dd).toHaveClass(/is-counting/);
  await expect(dd.locator('.count-run')).toHaveAttribute('aria-hidden', 'true');
  expect(await semanticValue(page, 1)).toBe('12.000');
  // danach: keine Zierde mehr, sichtbarer Endwert
  await expect(dd).not.toHaveClass(/is-counting/, { timeout: 5000 });
  await expect(dd.locator('.count-run')).toHaveCount(0);
  await expect(dd).toHaveText('12.000');
  expect(await dd.locator('.count-final').evaluate((n) => getComputedStyle(n).opacity)).toBe('1');
});

test('V5: die Pausetaste der Seite zeigt sofort den Endwert', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/nfl-berlin-game/');
  await page.locator('.c-numbers').scrollIntoViewIfNeeded();
  const dd = page.locator('.c-num dd').first();
  await expect(dd).toHaveClass(/is-counting/);
  await page.getByRole('button', { name: 'Bewegung pausieren', exact: true }).click();
  await expect(dd).not.toHaveClass(/is-counting/);
  await expect(dd.locator('.count-run')).toHaveCount(0);
  await expect(page.locator('.c-hero .c-credits')).toContainText(await dd.innerText());
});

test('V5: bei reduzierter Bewegung oder schon pausierter Seite wird nicht gezählt', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/musikalischer-teaser-bokkenrijders/');
  await page.locator('.c-numbers').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await expect(page.locator('.c-num .count-run, .c-num dd.is-counting')).toHaveCount(0);
  await expect(page.locator('.c-num dd').nth(1)).toHaveText('12.000');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => sessionStorage.setItem('flyingstars:motion', 'paused'));
  await page.goto('/musikalischer-teaser-bokkenrijders/');
  await page.locator('.c-numbers').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await expect(page.locator('.c-num .count-run, .c-num dd.is-counting')).toHaveCount(0);
});

test('V6: einspaltig steht jede Überschrift der Geschichte in voller Stärke, zweispaltig tritt nur die inaktive zurück', async ({ page }) => {
  const opacities = () => page.locator('.c-step').evaluateAll((steps) => steps.map((step) => ['.head-line', 'h2 .k', 'p'].map((s) => {
    let n: Element | null = step.querySelector(s), o = 1;
    while (n && n !== step) { o *= Number(getComputedStyle(n).opacity); n = n.parentElement; }
    return o;
  })));
  for (const [width, height] of [[390, 844], [820, 1180]]) {
    await page.setViewportSize({ width, height });
    await page.goto('/nfl-berlin-game/');
    await page.locator('.c-step').nth(3).scrollIntoViewIfNeeded();
    for (const step of await opacities()) expect(step, `${width}px`).toEqual([1, 1, 1]);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/nfl-berlin-game/');
  await page.locator('.c-step').nth(1).scrollIntoViewIfNeeded();
  await expect(page.locator('.c-step').nth(1)).toHaveClass(/\bon\b/);
  await expect.poll(async () => (await opacities())[0][0]).toBeLessThan(1);
  await expect.poll(async () => (await opacities())[1][0]).toBe(1);
});

test('V7: im Hochformat steht das Motiv im eigenen Rahmen, quer bleibt der seitliche Schnitt', async ({ page }) => {
  for (const [width, height] of [[768, 1024], [820, 1180], [1024, 1366]]) {
    await page.setViewportSize({ width, height });
    for (const route of routes) {
      await page.goto(route);
      const frame = await page.locator('.c-hero .hero-media').evaluate((m) => { const r = m.getBoundingClientRect(); return { w: r.width, h: r.height, left: r.left, position: getComputedStyle(m).position }; });
      expect(frame.position, `${route} ${width}×${height}`).toBe('relative');
      expect(frame.w / frame.h).toBeCloseTo(1.6, 1);
      expect(frame.left).toBeGreaterThan(0);
      // Titel steht unter dem Bild, nicht darauf
      const title = await page.locator('.c-hero .c-title').boundingBox();
      expect(title!.y).toBeGreaterThanOrEqual(frame.h);
    }
  }
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/nfl-berlin-game/');
  const wide = await page.locator('.c-hero .hero-media').evaluate((m) => ({ position: getComputedStyle(m).position, share: m.getBoundingClientRect().width / innerWidth }));
  expect(wide.position).toBe('absolute');
  expect(wide.share).toBeCloseTo(0.64, 1);
});

// Learned Rule 34: eine oder zwei Kennzahlen stehen nicht allein links in einer leeren Reihe. Eine Zahl steht neben dem Satz
// der Fallstudie (meta.description), zwei Zahlen tragen ihr Label als Schlagzeile daneben. Kein Text, der nicht in den Falldaten steht.
const band = (page: Page) => page.locator('.c-figures').evaluate((section) => {
  const style = getComputedStyle(section), box = section.getBoundingClientRect();
  const content = { left: box.left + parseFloat(style.paddingLeft), right: box.right - parseFloat(style.paddingRight) };
  const rect = (el: Element | null) => { if (!el) return null; const r = document.createRange(); r.selectNodeContents(el); const b = r.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom }; };
  return { content, nums: [...section.querySelectorAll('.c-num')].map((cell) => ({ dd: rect(cell.querySelector('dd')), dt: rect(cell.querySelector('dt')), label: cell.querySelector('dt')!.textContent!.trim() })),
    lead: rect(section.querySelector('.c-figures-lead')), leadText: section.querySelector('.c-figures-lead')?.textContent?.trim(), text: (section as HTMLElement).innerText };
});
const description = async (page: Page) => norm((await page.locator('meta[name="description"]').getAttribute('content'))!);
/** Der Build setzt gegen Hurenkinder ein geschütztes Leerzeichen vor das letzte Wort. */
const norm = (text: string) => text.replace(/\s+/g, ' ').trim();

for (const [width, height] of [[1024, 768], [1440, 900], [1920, 1080], [768, 1024]]) {
  test(`Rule 34: einzelne und doppelte Kennzahlen füllen ihre Reihe bei ${width}px`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height });
    const span = (b: Awaited<ReturnType<typeof band>>, right: number) => (right - b.content.left) / (b.content.right - b.content.left);
    // Satz beginnt mit Zahl und Label: der Rest wird zum Label, „220 Drohnen“ steht nur einmal
    await page.goto('/heiratsantrag-hugenpoet/');
    let b = await band(page);
    expect(norm(b.nums[0].label)).toBe((await description(page)).replace(/^220 /, ''));
    expect(b.text.match(/220/g)).toHaveLength(1);
    expect(b.nums[0].dd!.right).toBeLessThan(b.nums[0].dt!.left);
    expect(span(b, b.nums[0].dt!.right)).toBeGreaterThan(0.6);
    // Satz ohne Zahl: steht als Lead neben „350 / Drohnen“
    await page.goto('/loreal-prada-rheinturm/');
    b = await band(page);
    expect(norm(b.leadText!)).toBe(await description(page));
    expect(b.nums[0].label).toBe('Drohnen');
    expect(b.nums[0].dd!.right).toBeLessThan(b.lead!.left);
    expect(span(b, b.lead!.right)).toBeGreaterThan(0.6);
    // zwei Zahlen: Label neben der Zahl
    await page.goto('/hochzeit-recklinghausen/');
    b = await band(page);
    for (const n of b.nums) expect(n.dd!.right).toBeLessThan(n.dt!.left);
  });
}

test('Rule 34: auf dem Handy stehen Zahl und Satz untereinander', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/heiratsantrag-hugenpoet/', '/loreal-prada-rheinturm/', '/hochzeit-recklinghausen/']) {
    await page.goto(route);
    const b = await band(page);
    const below = b.lead ?? b.nums[0].dt!;
    // Zahl mit Zeilenhöhe 0,9: die Glyphenbox ragt wenige Pixel über ihre Zeile hinaus
    expect(below.top, route).toBeGreaterThanOrEqual(b.nums[0].dd!.bottom - 4);
    expect(Math.max(below.right, ...b.nums.map((n) => n.dt!.right))).toBeLessThanOrEqual(b.content.right + 0.5);
  }
});

// ---- Audit 4: E1, E3, E7, E8, E9, C2 ----

const allCases = routes;
const sizes = (page: Page) => page.locator('.c-num dd').evaluateAll((dds) => dds.map((dd) => parseFloat(getComputedStyle(dd).fontSize)));

test('E9: eine Zahlgröße je Reihe, ausgehend von der schmalsten Zelle (1024, 1180, 1440, 1920)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [width, height] of [[1024, 768], [1180, 820], [1440, 900], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    for (const route of allCases) {
      await page.goto(route);
      const px = await sizes(page);
      expect(Math.max(...px) - Math.min(...px), `${route} ${width}: ${px.join(' / ')}`).toBeLessThan(0.1);
      for (const cell of await overflow(page)) expect(cell.overCell, `${route} ${width}: ${cell.value}`).toBeLessThanOrEqual(0.5);
    }
  }
});

test('E9: eine Textauswahl der laufenden Zahl enthält nur den Endwert', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/musikalischer-teaser-bokkenrijders/');
  await page.locator('.c-numbers').scrollIntoViewIfNeeded();
  const dd = page.locator('.c-num dd').nth(1);
  await expect(dd).toHaveClass(/is-counting/);
  const selected = await dd.evaluate((node) => { const range = document.createRange(); range.selectNodeContents(node); const sel = getSelection()!; sel.removeAllRanges(); sel.addRange(range); return sel.toString(); });
  expect(norm(selected)).toBe('12.000');
});

test('E1: drei Kennzahlen im Tablet-Hochformat tragen ihr Label neben der Zahl und füllen die Zeile', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [width, height] of [[768, 1024], [820, 1180]]) {
    await page.setViewportSize({ width, height });
    for (const route of ['/nfl-berlin-game/', '/musikalischer-teaser-bokkenrijders/', '/exploring-reinvented-der-neue-ford-explorer/', '/puma-bundesliga/']) {
      await page.goto(route);
      const b = await band(page);
      expect(b.nums).toHaveLength(3);
      const width_ = b.content.right - b.content.left;
      for (const n of b.nums) {
        expect(n.dd!.right, `${route} ${width}: ${n.label}`).toBeLessThan(n.dt!.left);
        expect(n.dt!.right).toBeLessThanOrEqual(b.content.right + 0.5);
      }
      expect(Math.max(...b.nums.map((n) => n.dt!.right - b.content.left)) / width_, `${route} ${width}`).toBeGreaterThan(0.5);
    }
  }
});

test('E3: Eckdaten zeigen Daten ausgeschrieben und lokalisiert, nie ISO oder Ziffern', async ({ page }) => {
  for (const locale of ['', '/en', '/nl']) for (const route of allCases) {
    await page.goto(`${locale}${route}`);
    const text = norm(await page.locator('.c-hero .c-credits').innerText());
    expect(text, `${locale}${route}`).not.toMatch(/\b\d{4}-\d{2}(-\d{2})?\b|\b\d{1,2}\.\d{1,2}\.\d{4}\b|\b\d{1,2}\/\d{1,2}\/\d{4}\b/);
  }
  const date = async (path: string) => norm(await page.locator('.c-hero .c-credits div').nth(2).locator('dd').innerText()).toLowerCase();
  await page.goto('/hochzeit-recklinghausen/'); expect(await date('de')).toBe('29. juni 2024');
  await page.goto('/en/hochzeit-recklinghausen/'); expect(await date('en')).toBe('29 june 2024');
  await page.goto('/nl/hochzeit-recklinghausen/'); expect(await date('nl')).toBe('29 juni 2024');
});

/** Leuchtende Drohnenkerne (Deckkraft > 40 %) im Bereich der Beschriftung der Formation. */
const dotsUnderCopy = (page: Page) => page.locator('.c-play').evaluate((host) => {
  const cv = host.querySelector('canvas') as HTMLCanvasElement, copy = host.querySelector('.c-play-copy')!;
  const c = cv.getBoundingClientRect(), t = copy.getBoundingClientRect(), k = cv.width / c.width;
  const x0 = Math.max(0, Math.floor((t.left - c.left) * k)), y0 = Math.max(0, Math.floor((t.top - c.top) * k));
  const x1 = Math.min(cv.width, Math.ceil((t.right - c.left) * k)), y1 = Math.min(cv.height, Math.ceil((t.bottom - c.top) * k));
  if (x1 <= x0 || y1 <= y0) return 0;
  const d = cv.getContext('2d')!.getImageData(x0, y0, x1 - x0, y1 - y0).data;
  let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 100) n++;
  return n;
});

test('E7: keine Drohne leuchtet unter Überschrift und Absatz der Formation (Handy bis Desktop)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [width, height] of [[390, 844], [768, 1024], [1024, 768], [1180, 820], [1440, 900], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    for (const route of ['/nfl-berlin-game/', '/musikalischer-teaser-bokkenrijders/', '/exploring-reinvented-der-neue-ford-explorer/', '/puma-bundesliga/']) {
      await page.goto(route);
      await page.locator('.c-play').scrollIntoViewIfNeeded();
      await expect(page.locator('[data-tally]')).toContainText(/\d/);
      await expect.poll(() => page.locator('canvas[data-formation]').evaluate((node) => {
        const cv = node as HTMLCanvasElement, d = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
        for (let i = 3; i < d.length; i += 4) if (d[i] > 100) return true; return false;
      })).toBe(true);
      expect(await dotsUnderCopy(page), `${route} ${width}×${height}`).toBe(0);
    }
  }
});

test('E8: die Formation fordert nur Frames an, solange sie sichtbar ist und nicht pausiert', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __caseFrames: number };
    w.__caseFrames = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => { if (/CaseStudy\.astro_astro_type_script_index_0/.test(new Error().stack ?? '')) w.__caseFrames++; return raf(cb); };
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/nfl-berlin-game/');
  const frames = async (ms: number) => { await page.evaluate(() => { (window as unknown as { __caseFrames: number }).__caseFrames = 0; }); await page.waitForTimeout(ms); return page.evaluate(() => (window as unknown as { __caseFrames: number }).__caseFrames); };
  expect(await frames(1000), 'Seitenanfang, Formation weit unten').toBe(0);
  await page.locator('.c-play').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-tally]')).toContainText('289');
  expect(await frames(1000), 'sichtbar und aktiv').toBeGreaterThan(10);
  await page.getByRole('button', { name: 'Bewegung pausieren', exact: true }).click();
  await page.waitForTimeout(100);
  expect(await frames(1000), 'globale Pause').toBe(0);
  await page.getByRole('button', { name: 'Bewegung fortsetzen', exact: true }).click();
  expect(await frames(1000), 'fortgesetzt').toBeGreaterThan(10);
  await page.getByRole('button', { name: 'Animation pausieren', exact: true }).click();
  await page.waitForTimeout(100);
  expect(await frames(1000), 'eigene Pause').toBe(0);
  await page.getByRole('button', { name: 'Animation fortsetzen', exact: true }).click();
  expect(await frames(1000), 'eigene Pause aufgehoben').toBeGreaterThan(10);
  // Auf dem Rückweg kommen die Kennzahlen erstmals ins Bild und zählen höchstens 2,6 s hoch (eigene, endliche Frames)
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(3000);
  expect(await frames(1000), 'aus dem Bild gescrollt').toBe(0);
});

test('C2: Fallstudien-Stile laden nur die Fallstudien-Routen', async ({ page }) => {
  const sheets = async (path: string) => {
    await page.goto(path);
    const hrefs = await page.locator('link[rel="stylesheet"]').evaluateAll((links) => links.map((l) => (l as HTMLLinkElement).href));
    return Promise.all(hrefs.map(async (href) => (await page.request.get(href)).text()));
  };
  for (const path of ['/', '/drohnenshow-preise/', '/referenzen/']) for (const css of await sheets(path)) expect(css, path).not.toMatch(/\.c-(hero|step|figures|play)\b/);
  expect((await sheets('/nfl-berlin-game/')).some((css) => /\.c-hero\b/.test(css) && /\.c-figures\b/.test(css))).toBe(true);
});

// Nachauftrag 4b: Die Mitmach-Aufforderung der Formation passt zum Eingabegerät. Maus: „Fahrt mit der Maus hindurch.“,
// Touch: Finger statt Maus (case.js reagiert auf Tippen und seitliches Ziehen). Genau eine Fassung ist sichtbar.
const formationCases = [
  { route: '/nfl-berlin-game/', mouse: { de: 'Fahrt mit der Maus hindurch.', en: 'Move your mouse through them.', nl: 'Beweeg de muis erdoorheen.' }, touch: { de: 'Fahrt mit dem Finger hindurch.', en: 'Run a finger through them.', nl: 'Beweeg een vinger erdoorheen.' } },
  { route: '/puma-bundesliga/', mouse: { de: 'Fahrt mit der Maus hindurch.', en: 'Move your mouse through them.', nl: 'Beweeg de muis erdoorheen.' }, touch: { de: 'Fahrt mit dem Finger hindurch.', en: 'Run a finger through them.', nl: 'Beweeg een vinger erdoorheen.' } },
  { route: '/exploring-reinvented-der-neue-ford-explorer/', mouse: { de: 'Fahrt mit der Maus hindurch.', en: 'Move your mouse through them.', nl: 'Beweeg de muis erdoorheen.' }, touch: { de: 'Fahrt mit dem Finger hindurch.', en: 'Run a finger through them.', nl: 'Beweeg een vinger erdoorheen.' } },
  { route: '/musikalischer-teaser-bokkenrijders/', mouse: { de: 'Bewegt die Maus, er schaut euch hinterher.', en: "Move your mouse and he'll follow you with his eyes.", nl: 'Beweeg de muis, hij kijkt jullie na.' }, touch: { de: 'Tippt auf die Formation, er schaut euch hinterher.', en: "Tap the formation and he'll follow you with his eyes.", nl: 'Tik op de formatie, hij kijkt jullie na.' } },
] as const;
const visibleCopy = (page: Page) => page.locator('.c-play-copy p').evaluate((p) => (p as HTMLElement).innerText.replace(/\s+/g, ' ').trim());

test('4b: mit Maus steht die Maus-Aufforderung, nie die Finger-Fassung', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const c of formationCases) for (const locale of ['de', 'en', 'nl'] as const) {
    await page.goto(`${locale === 'de' ? '' : `/${locale}`}${c.route}`);
    const text = await visibleCopy(page);
    expect(text, `${locale}${c.route}`).toContain(c.mouse[locale]);
    expect(text.split(c.mouse[locale])).toHaveLength(2);
    expect(text).not.toContain(c.touch[locale]);
  }
});

test('4b: auf dem Touch-Gerät steht kein „Maus“, sondern die Finger-Aufforderung', async ({ browser }) => {
  const { defaultBrowserType: _engine, ...phone } = devices['iPhone 13'];
  const ctx = await browser.newContext(phone);
  const page = await ctx.newPage();
  for (const c of formationCases) for (const locale of ['de', 'en', 'nl'] as const) {
    await page.goto(`${locale === 'de' ? '' : `/${locale}`}${c.route}`);
    const text = await visibleCopy(page);
    expect(text, `${locale}${c.route}`).toContain(c.touch[locale]);
    expect(text).not.toMatch(/\b(Maus|mouse|muis)\b/i);
  }
  await ctx.close();
});
