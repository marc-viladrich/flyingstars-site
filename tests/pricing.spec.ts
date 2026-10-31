import { test, expect } from '@playwright/test';
import { SHOW_PACKAGES, PACKAGE_NAMES } from '../src/content/show-packages';

// Preisseite seit dem 30.10.2026: Pakete, Weg in den Show-Konfigurator, Leistungsvergleich, Zusätze, Fragen zum Preis.
// Der alte Preisrechner ist nicht mehr eingebunden; Preise kommen nur aus show-packages.ts.
const money = (v: number) => `ab ${v.toLocaleString('de-DE')} €`;

test('Preisseite zeigt die drei Pakete mit Preisen aus einer Quelle und führt in den Konfigurator', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/drohnenshow-preise/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Was eure Show kostet.');
  // Der Konfigurator steht direkt oben auf der Seite (Marc, 31.10.2026)
  await expect(page.locator('#konfigurator canvas')).toHaveCount(1);
  for (const name of PACKAGE_NAMES) {
    const card = page.locator('#pakete article', { has: page.getByRole('heading', { name, exact: true }) });
    await expect(card).toContainText(money(SHOW_PACKAGES[name].price));
    await expect(card.getByRole('link', { name: `${name} anfragen` })).toHaveAttribute('href', `/kontakt/?paket=${name}`);
  }
  await expect(page.locator('#pakete .is-rec')).toHaveCount(1);
  await expect(page.locator('#pakete .is-rec')).toContainText('HORIZON');
  await expect(page.locator('#leistungen table thead th')).toHaveCount(4);
  // Kicker sind seit 31.10.2026 wieder Pflicht (docs/DESIGN.md); kein alter Rechner auf der Seite
  await expect(page.locator('#pakete .kicker')).toHaveText('Pakete');
  await expect(page.locator('#drones, #swarm, #calc-cta')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Fragen zum Preis nennen die Anzahlung laut Fragebogen (40 %)', async ({ page }) => {
  await page.goto('/drohnenshow-preise/');
  const faq = page.locator('#preisfragen');
  await faq.getByText('Wie funktioniert die Bezahlung?').click();
  await expect(faq).toContainText('Anzahlung von 40 %');
  await expect(page.locator('body')).not.toContainText('30 %');
});

test('Paketwahl auf der Preisseite landet vorausgewählt in der Anfrage', async ({ page }) => {
  await page.goto('/drohnenshow-preise/');
  await page.getByRole('link', { name: 'ODYSSEY anfragen' }).click();
  await expect(page).toHaveURL(/\/kontakt\/\?paket=ODYSSEY$/);
  await expect(page.getByRole('radio', { name: 'ODYSSEY', exact: true })).toBeChecked();
});

test.describe('ohne JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('Pakete, Preise und Vergleich bleiben vollständig lesbar', async ({ page }) => {
    await page.goto('/drohnenshow-preise/');
    for (const name of PACKAGE_NAMES) await expect(page.locator('#pakete')).toContainText(money(SHOW_PACKAGES[name].price));
    await expect(page.locator('#leistungen table')).toBeVisible();
  });
});
