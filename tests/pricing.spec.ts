import { test, expect } from '@playwright/test';
import { SHOW_PACKAGES, PACKAGE_NAMES } from '../src/content/show-packages';

// Preisseite seit dem 30.10.2026: Pakete, Weg in den Show-Konfigurator, Leistungsvergleich, Zusätze, Fragen zum Preis.
// Der alte Preisrechner ist nicht mehr eingebunden; Preise kommen nur aus show-packages.ts.
const money = (v: number) => `ab ${v.toLocaleString('de-DE')} €`;

test('Preisseite zeigt die drei Pakete mit Preisen aus einer Quelle und führt in den Konfigurator', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/drohnenshow-preise/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Drei Pakete. Feste Einstiegspreise.');
  // Erst die Pakete, dann der Konfigurator (Marc, 31.10.2026)
  await expect(page.locator('#konfigurator canvas')).toHaveCount(1);
  // über den Index statt über die Rolle: auf dem Handy stehen nicht gewählte Karten hinter Reitern (unsichtbar)
  for (const [i, name] of PACKAGE_NAMES.entries()) {
    const card = page.locator(`#pakete article[data-mtab="${i}"]`);
    await expect(card).toContainText(name);
    await expect(card).toContainText(money(SHOW_PACKAGES[name].price));
    await expect(card.locator(`a[href="/kontakt/?paket=${name}"]`)).toHaveText(`${name} anfragen`);
  }
  await expect(page.locator('#pakete .is-rec')).toHaveCount(1);
  await expect(page.locator('#pakete .is-rec')).toContainText('HORIZON');
  await expect(page.locator('#leistungen table thead th')).toHaveCount(4);
  // Kicker sind seit 31.10.2026 wieder Pflicht (docs/DESIGN.md); kein alter Rechner auf der Seite
  await expect(page.locator('#pakete .kicker')).toHaveText('Preise & Pakete');
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

test('Paketwahl auf der Preisseite landet vorausgewählt in der Anfrage', async ({ page, isMobile }) => {
  await page.goto('/drohnenshow-preise/');
  // Handy: Karten stehen hinter Reitern (seit 02.11.2026)
  if (isMobile) await page.locator('#pakete .mtabs').getByText('ODYSSEY', { exact: true }).click();
  await page.getByRole('link', { name: 'ODYSSEY anfragen' }).click();
  await expect(page).toHaveURL(/\/kontakt\/\?paket=ODYSSEY$/);
  await expect(page.getByRole('radio', { name: 'ODYSSEY', exact: true })).toBeChecked();
});

test('Gewählte Extras landen vorbelegt in der Anfrage', async ({ page }) => {
  await page.goto('/drohnenshow-preise/');
  const bar = page.locator('[data-extras-bar]');
  await expect(bar).not.toBeVisible();
  // Klick in die Zelle (nicht aufs Kästchen) wählt das Extra
  await page.locator('.xc', { has: page.locator('#x-express') }).click();
  await page.locator('.xc', { has: page.locator('#x-schweiz') }).click();
  await expect(page.getByRole('checkbox', { name: 'Express-Show in unter zwei Wochen' })).toBeChecked();
  await expect(bar).toBeVisible();
  await expect(bar).toContainText('2 Extras in eurer Anfrage: Express, Schweiz');
  await page.locator('.xc', { has: page.locator('#x-schweiz') }).click();
  await expect(bar).toContainText('1 Extra in eurer Anfrage: Express');
  await page.getByRole('link', { name: 'Show mit diesen Extras anfragen' }).click();
  await expect(page).toHaveURL(/\/\?extras=express#anfrage$/);
  await expect(page.getByRole('checkbox', { name: 'Express', exact: true })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Schweiz', exact: true })).not.toBeChecked();
});

test.describe('ohne JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('Pakete, Preise und Vergleich bleiben vollständig lesbar', async ({ page, isMobile }) => {
    await page.goto('/drohnenshow-preise/');
    for (const name of PACKAGE_NAMES) await expect(page.locator('#pakete')).toContainText(money(SHOW_PACKAGES[name].price));
    if (!isMobile) { await expect(page.locator('#leistungen table')).toBeVisible(); return; }
    // Handy (seit 02.11.2026): Reiter statt Tabelle, schalten auch ohne JavaScript (reine Radiogruppe)
    const panels = page.locator('#leistungen [data-mtab]');
    await expect(panels.filter({ visible: true })).toHaveCount(1);
    await page.locator('#leistungen .mtabs').getByText('ODYSSEY', { exact: true }).click();
    await expect(panels.filter({ visible: true })).toHaveAttribute('data-mtab', '2');
  });
});

test('„Noch unsicher“ führt mit vorgewählter Option „Weiß ich noch nicht“ in die Anfrage', async ({ page }) => {
  await page.goto('/drohnenshow-preise/');
  await expect(page.locator('.promise a[href="/kontakt/?paket=offen"]')).toHaveText('Show anfragen');
  await page.goto('/kontakt/?paket=offen');
  await expect(page.locator('#inquiry-form [name=paket]:checked')).toHaveValue('offen');
});

test('Handy: Pakete und Leistungsvergleich als Reiter, empfohlenes Paket vorgewählt', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Reiter gibt es nur bis 700 px');
  await page.goto('/drohnenshow-preise/');
  for (const scope of ['#pakete', '#leistungen']) {
    const tabs = page.locator(`${scope} .mtabs`);
    await expect(tabs).toBeVisible();
    await expect(tabs.locator('input:checked')).toHaveValue('1');
    const panels = page.locator(`${scope} [data-mtab]`);
    await expect(panels.filter({ visible: true })).toHaveCount(1);
    await expect(panels.filter({ visible: true })).toHaveAttribute('data-mtab', '1');
    await tabs.getByText('SPARK', { exact: true }).click();
    await expect(panels.filter({ visible: true })).toHaveAttribute('data-mtab', '0');
  }
  await expect(page.locator('#leistungen .table-wrap')).toBeHidden();
});
