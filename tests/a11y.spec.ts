import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { routes } from './routes';

// Automatisierte Barrierefreiheitsprüfung (axe-core, WCAG 2.2 A/AA). Deckt nur einen Teil ab;
// Tastatur, Screenreader und Reflow bleiben manuelle Prüfung (accessibility-inspect).
// Kontrast wird am Endzustand gemessen: Eintritts- und Pulsanimationen (z. B. Sicherheits-Zeichnung) blenden Text
// über Deckkraft ein, axe würde sonst Zwischenbilder messen und je nach Zeitpunkt anders urteilen. Reduzierte Bewegung
// zeigt auf jeder Seite sofort den Endzustand derselben Farben.
test.use({ reducedMotion: 'reduce' });
for (const route of routes) {
  test(`axe: ${route}`, async ({ page }) => {
    await page.goto(route);
    // Kein Skript darf Layout erzwingen, bevor das Stylesheet greift: WebKit stylt die Seite dann mit Browser-Standardfarben
    // und blendet anschließend jedes Element von Schwarz/Link-Blau auf seine Farbe über (19.11.2026: SliderNav-Startmessung).
    const unstyledStart = await page.evaluate(() => document.getAnimations().filter((a) => a instanceof CSSTransition && /^(color|padding|font-size)/.test(a.transitionProperty)).length);
    expect(unstyledStart, 'Farb-/Abstands-Übergänge direkt nach dem Laden').toBe(0);
    // WebKit applies the dropdown's delayed visibility transition at initial paint.
    // Scan the settled closed state, not translucent text during that transition.
    await expect(page.locator('#lang-header')).toBeHidden();
    // Alle FAQ-Akkordeons öffnen, damit auch verborgener Inhalt geprüft wird.
    await page.locator('details').evaluateAll((els) => els.forEach((d) => d.setAttribute('open', '')));
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}

test('Skip-Link ist erstes fokussierbares Element', async ({ page, browserName }) => {
  await page.goto('/');
  if (process.env.CONSENT_TEST_ENABLED === '1') {
    await page.locator('.cm').getByRole('button', { name: 'Ablehnen', exact: true }).click();
    await expect(page.locator('.cm')).toBeHidden();
    await page.reload();
    await expect(page.locator('[data-consent-open]')).toBeVisible();
  }
  // macOS WebKit uses Option-Tab to include links with the default OS settings.
  // https://support.apple.com/en-ie/guide/safari/cpsh003/mac
  await page.keyboard.press(browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab');
  await expect(page.locator(':focus')).toHaveText(/Zum Inhalt/);
});
