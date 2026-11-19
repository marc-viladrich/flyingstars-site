import { test, expect } from '@playwright/test';

// Icon-Raster (.ig, src/scripts/grid-glide.ts): eine Hover-Fläche gleitet von Zelle zu Zelle. Marc, 18.11.2026, Preisseite
// „Immer dabei“ (Kopf klebt links): „When I scroll down and then point my mouse up, the page scrolls up.“ Die Maus über
// das Raster nach oben zu führen darf weder die Seite scrollen noch das Raster verschieben.
test('Hover im Icon-Raster gleitet zur Zelle und verschiebt die Seite nicht', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Hover nur mit Maus');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/drohnenshow-preise/');
  const grid = page.locator('.inc-grid');
  // so weit scrollen, dass der Kopf klebt und die untere Hälfte des Rasters im Bild ist
  await grid.evaluate((g) => { const r = g.getBoundingClientRect(); scrollTo({ top: r.top + scrollY + r.height - 850, behavior: 'instant' }); });
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => ({ y: scrollY, top: document.querySelector('.inc-grid')!.getBoundingClientRect().top }));
  for (let y = 880; y >= 100; y -= 20) await page.mouse.move(1000, y);
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => ({ y: scrollY, top: document.querySelector('.inc-grid')!.getBoundingClientRect().top }));
  expect(after).toEqual(before);
  // die Fläche steht eingerastet auf der Zelle unter dem Zeiger
  const hovered = await page.evaluate(() => {
    const g = document.querySelector<HTMLElement>('.inc-grid')!;
    const cell = [...g.children].find((c) => c.matches(':hover')) as HTMLElement | undefined;
    const m = new DOMMatrix(getComputedStyle(g, '::before').transform);
    return { on: g.classList.contains('ig-on'), cell: cell ? [cell.offsetLeft, cell.offsetTop] : null, mark: [Math.round(m.e), Math.round(m.f)] };
  });
  expect(hovered.on).toBe(true);
  expect(hovered.cell).not.toBeNull();
  expect(hovered.mark).toEqual(hovered.cell);
});

// Wechsel der Eingabemethode (Audit 2, N6): Tastaturfokus auf „Indoor“, Maus über „Express“ und aus dem Raster hinaus. Die
// Fläche darf nicht auf „Express“ neben dem Fokusring stehen bleiben, sondern gleitet zur Zelle mit dem Fokus zurück.
test('Maus verlässt das Raster: Fläche kehrt zur Zelle des Tastaturfokus zurück', async ({ page, isMobile, browserName }) => {
  test.skip(isMobile, 'Hover nur mit Maus');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/drohnenshow-preise/');
  const grid = page.locator('.xg');
  const indoor = page.locator('#x-indoor'), express = page.locator('.xc', { has: page.locator('#x-express') });
  // Raster mit Luft unter dem klebenden Kopf ins Bild, Zeiger darüber parken
  await grid.evaluate((g) => scrollTo({ top: g.getBoundingClientRect().top + scrollY - 240, behavior: 'instant' }));
  await page.mouse.move(700, 120);
  // Tastaturfokus: von der Überschrift per Tab ins Raster, damit :focus-visible greift
  await page.locator('#zusaetze-h').evaluate((el) => { el.setAttribute('tabindex', '-1'); (el as HTMLElement).focus(); });
  // WebKit erreicht Checkboxen per Tab nur mit der Systemeinstellung „Jedes Element“: dort den Fokus nach einem Tastendruck
  // setzen, die Tastaturheuristik macht ihn ebenfalls :focus-visible
  if (browserName === 'webkit') { await page.keyboard.press('Shift'); await indoor.focus(); }
  else await page.keyboard.press('Tab');
  await expect(indoor).toBeFocused();
  expect(await indoor.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
  const mark = () => grid.evaluate((g) => { const m = new DOMMatrix(getComputedStyle(g, '::before').transform); return { on: g.classList.contains('ig-on'), at: [Math.round(m.e), Math.round(m.f)] }; });
  const at = (cell: import('@playwright/test').Locator) => cell.evaluate((c: HTMLElement) => [c.offsetLeft, c.offsetTop]);
  const indoorCell = page.locator('.xc', { has: indoor });
  await expect.poll(mark).toEqual({ on: true, at: await at(indoorCell) });
  // Maus über Express: die Fläche folgt dem Zeiger
  const box = (await express.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
  await expect.poll(mark).toEqual({ on: true, at: await at(express) });
  // Maus verlässt das Raster nach oben: zurück zu Indoor, der Fokus bleibt dort
  const g = (await grid.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, g.y - 40, { steps: 6 });
  await expect.poll(mark).toEqual({ on: true, at: await at(indoorCell) });
  await expect(indoor).toBeFocused();
  // ohne Tastaturfokus im Raster blendet die Fläche beim Verlassen weiterhin aus
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
  await page.mouse.click(10, g.y - 40);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
  await page.mouse.move(box.x + box.width / 2, g.y - 40, { steps: 6 });
  await expect.poll(mark).toMatchObject({ on: false });
});
