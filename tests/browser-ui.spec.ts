import { expect, test, type Page } from '@playwright/test';
import { createTranslator } from '../src/i18n/ui.mjs';

const consent = (page: Page) => page.locator('.cm');
const article = '/blog/2025-01-14-wie-funktioniert-drohnenshow-drohne/';

for (const locale of ['de', 'en'] as const) {
  test(`${locale}: Browser-Übersetzungen für Shows, Consent, Artikel, Kontakt und 404`, async ({ page }) => {
    test.setTimeout(90_000);
    const t = createTranslator(locale);
    const prefix = locale === 'de' ? '' : '/en';
    const problems: string[] = [];
    page.on('pageerror', error => problems.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' || /Missing .* UI message|UI-Wörterbuch/.test(message.text())) problems.push(message.text());
    });
    // Entfernte Medien sind für die Prüfung der Browser-Texte nicht erforderlich.
    await page.route('**/*', route => {
      if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
      return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' });
    });

    await page.goto(`${prefix}/`);
    const config = page.locator('#consent-config');
    if (process.env.CONSENT_TEST_ENABLED === '1') await expect(config).toHaveCount(1);
    if (await config.count()) {
      await expect(consent(page)).toBeVisible();
      await consent(page).getByRole('button', { name: t('consent.reject'), exact: true }).click();
      await expect(consent(page)).toBeHidden();
    }
    const teaser = page.locator('[data-cft-root]').first();
    await teaser.scrollIntoViewIfNeeded();
    await expect(teaser.locator('canvas')).toHaveAttribute('data-points', /[1-9]\d*/);
    await page.locator('#warum-drohnen').scrollIntoViewIfNeeded();
    await expect(page.locator('canvas.hm-folge')).toHaveAttribute('data-points', /[1-9]\d*/);

    await page.goto(`${prefix}/drohnenshow-preise/#konfigurator`);
    await expect(page.locator('#cfg-field')).toHaveAttribute('data-points', /[1-9]\d*/);
    await page.locator('#cfg-occasion label[data-occasion="hochzeit"]').click();
    await expect(page.locator('#cfg-occasion input:checked')).toHaveValue('hochzeit');
    await page.locator('#cfg-arts label[data-art="story"]').click();
    await expect(page.locator('#cfg-arts input:checked')).toHaveValue('story');
    await expect(page.locator('#cfg-pkg')).toHaveText(t('preise.yourShow.story'));
    await page.locator('#cfg-text').fill('Anna & Ben');
    await page.locator('#cfg-text').press('Enter');
    await expect(page.locator('#cfg-text-budget')).toHaveText(/^[89] (?:von|of) /);
    await page.locator('#cfg-occasion label[data-occasion="logo"]').click();
    await expect(page.locator('.cfg-notice')).toBeVisible();
    await expect(page.locator('#cfg-drones-label')).toHaveText(t('logoMode.wanted'));
    await page.locator('#cfg-examples [data-example]').first().click();
    await expect(page.locator('#cfg')).toHaveAttribute('data-logo-state', 'ready', { timeout: 15_000 });

    await page.goto(`${prefix}/drohnenshow-hochzeit/`);
    await expect(page.locator('[data-lh-show] canvas')).toHaveAttribute('role', 'img', { timeout: 15_000 });
    await expect(page.locator('[data-lh-art]')).toHaveText(/2D|3D/);

    await page.goto(prefix + article);
    const scene = page.locator('[data-ss]').first();
    await scene.scrollIntoViewIfNeeded();
    await expect(scene.locator('[data-now]')).not.toBeEmpty();
    const finale = page.locator('[data-ff]');
    await finale.scrollIntoViewIfNeeded();
    await expect(finale).toHaveClass(/is-live/);

    await page.goto(`${prefix}/kontakt/#anfrage`);
    const next = page.locator('#inquiry-form [data-next]');
    await next.click();
    await expect(page.locator('[data-err-for="anlass"]')).toHaveText(t('contact.pleaseChooseAnOccasion'));

    await page.goto(locale === 'de' ? '/404.html' : '/en/404/');
    await expect(page.locator('[data-chopper] h1')).toContainText(t('404.headline'));
    await expect(page.locator('script[data-fs-ui]')).toHaveCount(0);
    expect(problems).toEqual([]);
  });
}
