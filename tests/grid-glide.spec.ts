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
