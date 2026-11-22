import { expect, test } from '@playwright/test';
import { inspectTextInk, prepareText } from './helpers/text-ink.mjs';

const routes = [
  { path: '/', gradient: true },
  { path: '/drohnenshow-hochzeit/', gradient: true },
  { path: '/drohnenshow-indoor/', gradient: true },
  { path: '/drohnenshow-werbung/', gradient: true },
  { path: '/drohnenshow-preise/', gradient: true },
  { path: '/blog/2025-01-14-wie-funktioniert-drohnenshow-drohne/', gradient: false },
];

for (const { path, gradient } of routes) {
  test(`Space-Grotesk-Glyphen bleiben vollständig sichtbar auf ${path}`, async ({ page, isMobile }) => {
    await page.setViewportSize({ width: isMobile ? 390 : 1440, height: 900 });
    await page.route('**/*', route => ['image', 'media'].includes(route.request().resourceType())
      ? route.abort() : route.continue());

    for (const reducedMotion of ['no-preference', 'reduce'] as const) {
      await page.emulateMedia({ reducedMotion });
      const response = await page.goto(path);
      expect(response?.ok(), path).toBe(true);
      if (gradient && reducedMotion === 'no-preference') {
        await expect(page.locator('h1 .grad .st-v').first()).toBeAttached();
      }
      await prepareText(page);
      const weights = reducedMotion === 'no-preference' ? ['300', 'inherit'] : ['inherit'];
      for (const weight of weights) {
        const style = await page.addStyleTag({ content: `.grad .st-v { font-weight: ${weight} !important; }` });
        const result = await page.evaluate(inspectTextInk);
        expect(result.glyphs, 'Geprüfte Glyphen').toBeGreaterThan(0);
        if (gradient) expect(result.gradients, 'Glyphen in Verlaufswörtern').toBeGreaterThan(0);
        expect.soft(result.findings, `${reducedMotion} / Schriftstärke ${weight}`).toEqual([]);
        await style.evaluate(el => el.remove());
      }
    }
  });
}
