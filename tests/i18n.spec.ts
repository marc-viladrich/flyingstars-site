import { test, expect } from '@playwright/test';
import { createTranslator } from '../src/i18n/ui.mjs';

for (const locale of ['en', 'nl']) {
  const t = createTranslator(locale);
  test(`${locale}: R13 content, language metadata and localized mobile comparisons`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`/${locale}/drohnenshow-preise/`);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    for (const language of ['de', 'en', 'nl', 'x-default']) {
      await expect(page.locator(`head link[rel=alternate][hreflang="${language}"]`)).toHaveCount(1);
    }
    await expect(page.locator('#inklusive .ig .ic')).toHaveCount(4);
    await expect(page.locator('#inklusive')).toContainText(t('packageDetails.permitAndSafetyPlan'));
    await expect(page.locator('#cfg-upload')).toContainText(t('showConfigurator.yourLogo'));
    await expect(page.locator('.cfg-own-wrap > #cfg-legal')).toHaveCount(1);
    await expect(page.locator('fieldset #cfg-legal')).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 900 });
    for (const id of ['pakete', 'leistungen']) {
      const section = page.locator(`#${id}`);
      await expect(section.getByRole('radiogroup', { name: t('mobileTabs.choosePackage') })).toBeVisible();
      await expect(section.locator('[data-mtab="1"]')).toBeVisible();
      await section.locator('.mtabs').getByText('SPARK', { exact: true }).click();
      await expect(section.locator('[data-mtab="0"]')).toBeVisible();
      await expect(section.locator('[data-mtab="1"]')).not.toBeVisible();
    }
    await expect(page.locator('#leistungen [data-mtab="0"]')).toContainText(t('pricingpage.mobileIncluded'));
    await expect(page.locator('#leistungen [data-mtab="0"]')).toContainText(t('pricingpage.mobileNotIncluded'));
    await page.goto(`/${locale}/ueber-uns/`);
    await expect(page.locator('#zusammenarbeit')).toBeVisible();
    await expect(page.locator('#sicherheit .st-items > li')).toHaveCount(5);
    await expect(page.locator('#sicherheit .st-safeguards > div')).toHaveCount(4);
    // Zuständigkeiten als Tabelle (seit 02.11.2026): Überschrift, Zeichenlegende, Zeilen mit FlyingStars/Ihr
    await expect(page.locator('#sicherheit .st-who')).toContainText(t('landingsite.more'));
    await expect(page.locator('#sicherheit .st-who tbody tr')).toHaveCount(10);
    await expect(page.locator('#sicherheit .st-legend')).toContainText(t('landingsite.part'));
    await expect(page.locator('#sicherheit svg title')).toHaveText(t('landingsite.outdoorTitle'));
    for (const route of ['drohnenshow-hochzeit', 'drohnenshow-indoor']) {
      await page.goto(`/${locale}/${route}/`);
      await expect(page.locator('.ls-site .st-items > li')).toHaveCount(5);
      await expect(page.locator('.ls-site .st-who thead th')).toHaveCount(3);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    }
    expect(errors).toEqual([]);
  });

  test(`${locale}: enquiry keeps offen, extras, original values and truthful delivery notice`, async ({ page }) => {
    let submitted = '';
    await page.route('**/api/contact', async route => {
      submitted = route.request().postData() || '';
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, state: 'not-configured' }) });
    });
    await page.goto(`/${locale}/kontakt/?paket=offen&extras=express&text=Hello&show=Custom#anfrage`);
    await expect(page.locator('input[name=paket][value=offen]')).toBeChecked();
    await expect(page).not.toHaveURL(/[?&](text|show)=/);
    await page.locator('label').filter({ has: page.locator('input[name=anlass][value=firma]') }).click();
    await page.locator('#f-ort').fill('Osnabrück');
    await page.locator('[data-date-open]').check();
    await page.locator('[data-next]').click();
    await expect(page.locator('#inquiry-form')).toContainText(t('contactform.processingNotice'));
    await expect(page.locator('#inquiry-form a')).toHaveAttribute('href', `/${locale}/datenschutz/`);
    await page.locator('#f-name').fill('Integration Test');
    await page.locator('#f-mail').fill('test@example.test');
    // optionale Felder öffnen sich über ihren Knopf (seit 02.11.2026)
    await page.locator('[data-opt-add=quelle]').click();
    await page.locator('#f-quelle').selectOption('Empfehlung');
    await page.locator('button[type=submit]').click();
    await expect(page.locator('[data-form-status]')).toHaveText(t('contact.formDeliveryHasNotBeenSetUpYetNothingWas'));
    for (const value of [locale, 'offen', 'express', 'Empfehlung', 'Custom', 'Hello']) expect(submitted).toContain(value);
    await expect(page.locator('#f-name')).toHaveValue('Integration Test');
  });
}

test('Language switch keeps page, query and hash and is keyboard accessible', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/en/kontakt/?paket=offen#anfrage');
  const link = page.locator('.nav .language-switch a[hreflang=nl]');
  await expect(link).toHaveAttribute('href', /\/nl\/kontakt\/\?paket=offen#anfrage$/);
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/nl\/kontakt\/\?paket=offen#anfrage$/);
  await expect(page.locator('input[name=locale]')).toHaveValue('nl');
});
