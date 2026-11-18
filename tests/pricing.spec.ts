import { test, expect } from '@playwright/test';
import { SHOW_PACKAGES, PACKAGE_NAMES } from '../src/content/show-packages';
import { money } from '../src/lib/price-core.mjs';

const pricing = '/drohnenshow-preise/';
test.use({reducedMotion:'reduce'});

test('Preisseite zeigt drei Festpreise und beide Wege für jedes Paket', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pricing);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Erstellt das Paket, das eure Geschichte erzählt/);
  await expect(page.locator('#konfigurator #cfg-field')).toBeVisible();
  for (const [index, name] of PACKAGE_NAMES.entries()) {
    const card = page.locator(`#pakete article[data-mtab="${index}"]`);
    await expect(card.getByRole('heading', { name, includeHidden: true })).toHaveCount(1);
    await expect(card.locator('.p b')).toHaveText(money(SHOW_PACKAGES[name].price, 'de'));
    await expect(card.locator('[data-pick-paket]')).toHaveAttribute('href', `${pricing}?paket=${name}#anfrage`);
    await expect(card.locator('[data-cfg-preset]')).toHaveAttribute('href', `${pricing}?paket=${name}#konfigurator`);
  }
  await expect(page.locator('#pakete .is-rec')).toHaveCount(1);
  await expect(page.locator('#pakete .is-rec')).toContainText('HORIZON');
  expect(errors).toEqual([]);
});

test('Fragen zum Preis nennen die Anzahlung laut Fragebogen (40 %)', async ({ page }) => {
  await page.goto(pricing);
  const faq = page.locator('#preisfragen');
  const payment = faq.locator('details').filter({hasText: 'Wie funktioniert die Bezahlung?'});
  await payment.locator('summary').press('Enter');
  await expect(payment).toHaveAttribute('open', '');
  await expect(payment.getByText(/40 %/)).toBeVisible();
  await expect(page.locator('body')).not.toContainText('30 %');
});

test('Festpaket direkt anfragen und im Preisformular wiederfinden', async ({ page, isMobile }) => {
  await page.goto(pricing);
  if (isMobile) await page.locator('#pakete .mtabs').getByText('ODYSSEY', { exact: true }).click();
  await page.getByRole('link', { name: 'ODYSSEY anfragen' }).click();
  await expect(page).toHaveURL(url => url.pathname === pricing && url.hash === '#anfrage');
  await expect(page.locator('#inquiry-form').getByRole('radio', { name: 'ODYSSEY', exact: true })).toBeChecked();
});

test('Gewählte Extras landen vorbelegt im Preisformular', async ({ page }) => {
  await page.goto(pricing);
  const bar = page.locator('[data-extras-bar]');
  await expect(bar).toBeHidden();
  const toggle = (id: string) => page.locator('.xc', { has: page.locator(`#x-${id}`) }).click();
  await toggle('express');
  await toggle('schweiz');
  await expect(page.locator('[data-extras]').getByRole('checkbox', { name: 'Express', exact: true })).toBeChecked();
  await expect(bar).toBeVisible();
  await expect(bar).toContainText('2 Extras in eurer Anfrage: Express, Schweiz');
  await toggle('schweiz');
  await expect(bar).toContainText('1 Extra in eurer Anfrage: Express');
  await bar.getByRole('link', { name: 'Show mit diesen Extras anfragen' }).click();
  await expect(page).toHaveURL(url => url.pathname === pricing && url.searchParams.get('extras') === 'express' && url.hash === '#anfrage');
  const form = page.locator('#inquiry-form');
  await expect(form.getByRole('checkbox', { name: 'Express', exact: true })).toBeChecked();
  await expect(form.getByRole('checkbox', { name: 'Schweiz', exact: true })).not.toBeChecked();
});

test.describe('ohne JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('Alle Festpakete bleiben lesbar und ihre Anfrage-Links erreichbar', async ({ page, isMobile }) => {
    await page.goto(pricing);
    const cards = page.locator('#pakete article');
    for (const [index, name] of PACKAGE_NAMES.entries()) {
      if (isMobile) await page.locator('#pakete .mtabs').getByText(name, { exact: true }).click();
      const card = cards.nth(index);
      await expect(card).toBeVisible();
      await expect(card.locator('.p b')).toHaveText(money(SHOW_PACKAGES[name].price, 'de'));
      await expect(card.getByRole('link', { name: `${name} anfragen` })).toBeVisible();
    }
  });
});
