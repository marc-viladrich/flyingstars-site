import type { Page } from '@playwright/test';

// Runde 10: am Handy klebt die Bühne mit 50 % der Sichthöhe; Playwrights eigenes Scrollen legt die Pill dahinter oder unter
// die Preisleiste. Wie ein Mensch: erst in den freien Streifen zwischen Bühne und Preisleiste scrollen, dann echt klicken
export const reach = async (page: Page, target: ReturnType<Page['locator']>) => {
  for (let i = 0; i < 4; i++) {
    const off = await target.evaluate((el) => {
      const r = el.getBoundingClientRect(), stage = document.querySelector('.cfg-stage')!.getBoundingClientRect();
      const bar = document.querySelector('.cfg-bar')!.getBoundingClientRect(), barTop = bar.height && bar.top < innerHeight ? bar.top : innerHeight;
      const top = stage.bottom > 0 && stage.top < r.top ? Math.max(0, stage.bottom) : 0, mid = (r.top + r.bottom) / 2;
      return mid > top + r.height / 2 + 4 && mid < barTop - r.height / 2 - 4 ? 0 : mid - (top + barTop) / 2;
    });
    if (!off) return;
    await page.evaluate((y) => scrollBy(0, y), off);
    await page.waitForTimeout(350);
  }
};
/** Wie ein Mensch klicken: erst in den freien Streifen scrollen, dann echt klicken. */
export const tap = async (page: Page, target: ReturnType<Page['locator']>) => { await reach(page, target); await target.click(); };
