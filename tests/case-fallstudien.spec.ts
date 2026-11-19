import { test, expect, type Page } from '@playwright/test';

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
