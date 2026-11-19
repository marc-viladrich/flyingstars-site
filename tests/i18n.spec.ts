import {contact as CONTACT} from '../src/content/contact.mjs';
import { test, expect } from '@playwright/test';
import { createTranslator } from '../src/i18n/ui.mjs';

test.beforeEach(async ({ page }) => {
  if (process.env.CONSENT_TEST_ENABLED !== '1') return;
  await page.goto('/');
  await page.locator('.cm').getByRole('button', { name: 'Ablehnen', exact: true }).click();
  await expect(page.locator('.cm')).toBeHidden();
});

const aboutHeadings = {
  en: {
    values: 'What we stand for These values always fly with us',
    team: 'Our team Everything from a single source',
    location: 'Location At home in NRW',
    places: ['Office', 'Head office'],
  },
  nl: {
    values: 'Waar we voor staan Deze waarden vliegen altijd mee',
    team: 'Ons team Alles uit één hand',
    location: 'Locatie Thuis in NRW',
    places: ['Kantoor', 'Hoofdkantoor'],
  },
};

for (const locale of ['en', 'nl'] as const) {
  const t = createTranslator(locale);
  test(`${locale}: language metadata, localized mobile pricing and about content`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`/${locale}/drohnenshow-preise/`);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    for (const language of ['de', 'en', 'nl', 'x-default']) {
      await expect(page.locator(`head link[rel=alternate][hreflang="${language}"]`)).toHaveCount(1);
    }
    await expect(page.locator('#cfg-upload')).toContainText(t('showConfigurator.yourLogo'));
    await expect(page.locator('.cfg-own-wrap > #cfg-legal')).toHaveCount(1);
    await expect(page.locator('fieldset #cfg-legal')).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 900 });

    const art = page.locator('#konfigurator fieldset.cfg-art');
    await expect(art.locator('legend')).toHaveText(t('preise.art'));
    await expect(art.getByRole('radio')).toHaveCount(3);
    await expect(art.getByRole('radio', { name: t('preise.art.3d'), exact: true })).toBeChecked();
    await expect(art.locator('ul[data-art="3d"]')).toBeVisible();
    await art.getByText(t('preise.art.2d'), { exact: true }).click();
    await expect(art.getByRole('radio', { name: t('preise.art.2d'), exact: true })).toBeChecked();
    const checks = art.locator('ul[data-art="2d"]');
    await expect(checks).toBeVisible();
    await expect(checks.getByRole('listitem')).toHaveText([1, 2, 3].map(i => t(`preise.artItem.2d.${i}`)));
    await expect(art.locator('ul[data-art="3d"]')).toBeHidden();
    await expect(art.locator('ul[data-art="story"]')).toBeHidden();

    const packages = page.locator('#pakete');
    const packageNames = ['SPARK', 'HORIZON', 'ODYSSEY'];
    const tabs = packages.getByRole('radiogroup', { name: t('mobileTabs.choosePackage'), exact: true });
    const cards = packages.locator('article[data-mtab]');
    await expect(tabs).toBeVisible();
    await expect(tabs.getByRole('radio')).toHaveCount(3);
    await expect(cards).toHaveCount(3);
    await expect(tabs.getByRole('radio', { name: 'HORIZON', exact: true })).toBeChecked();
    const visibleCard = cards.filter({ visible: true });
    await expect(visibleCard).toHaveCount(1);
    await expect(visibleCard.getByRole('heading', { name: 'HORIZON', exact: true })).toBeVisible();
    for (const name of packageNames) {
      await tabs.getByText(name, { exact: true }).click();
      await expect(tabs.getByRole('radio', { name, exact: true })).toBeChecked();
      await expect(visibleCard).toHaveCount(1);
      await expect(visibleCard.getByRole('heading', { name, exact: true })).toBeVisible();
      await expect(visibleCard.locator('ul > li')).toHaveText([1, 2, 3].map(i => t(`preise.${name.toLowerCase()}.p${i}`)));
      await expect(visibleCard.getByRole('link', { name: t('preise.pkgEnquire', { name }), exact: true })).toBeVisible();
      await expect(visibleCard.getByRole('link', { name: t('preise.pkgAdjust', { name }), exact: true })).toBeVisible();
    }

    const included = page.locator('#inklusive');
    const services = included.locator('.ig .ic:not(.inc-note)');
    await expect(services).toHaveCount(7);
    await expect(services.getByRole('heading')).toHaveText([
      ...['design', 'tech', 'permit', 'safety', 'insurance', 'crew'].map(key => t(`preise.inc.${key}`)),
      t('preise.incItem.flightTitle'),
    ]);
    const note = included.locator('.ig .inc-note');
    await expect(note).toHaveCount(1);
    await expect(note.getByRole('heading', { name: t('preise.incNoteTitle'), exact: true })).toBeVisible();
    await expect(note.locator('p')).toHaveText(t('preise.incNote'));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);

    await page.goto(`/${locale}/ueber-uns/`);
    const about = aboutHeadings[locale];
    await expect(page.locator('#haltung').getByRole('heading', { name: about.values, exact: true })).toBeVisible();
    await expect(page.locator('#team').getByRole('heading', { name: about.team, exact: true })).toBeVisible();
    const location = page.locator('#standort');
    await expect(location.getByRole('heading', { name: about.location, exact: true })).toBeVisible();
    await expect(location.locator('.loc-map .loc-pin')).toHaveCount(2);
    await expect(location.locator('.loc-places .loc-label')).toHaveText(about.places);

    // Die Standortkarte auf „Über uns“ zeigt die Adressen. Das Sicherheitsdiagramm steht auf der Startseite.
    await page.goto(`/${locale}/`);
    const site = page.locator('#sicherheit.ls-site');
    await expect(site.locator('.st-tips > li')).toHaveCount(5);
    await expect(site.locator('.st-who')).toHaveCount(0);
    await expect(site.locator('svg[role="img"]')).toHaveAccessibleName(t('landingsite.outdoorTitle'));
    for (const route of ['drohnenshow-hochzeit', 'drohnenshow-indoor']) {
      await page.goto(`/${locale}/${route}/`);
      const map = page.locator('.ls-site').first();
      await expect(map.locator('.st-tips > li')).toHaveCount(5);
      await expect(map.locator('svg[role="img"]')).toHaveAccessibleName(t(route === 'drohnenshow-indoor' ? 'landingsite.indoorTitle' : 'landingsite.outdoorTitle'));
      // Die Nummern erscheinen erst nach der Eintrittsanimation der Karte.
      await map.locator('[data-st-map]').scrollIntoViewIfNeeded();
      const hotspot = map.locator('[data-hot]').first();
      await expect(hotspot).toBeVisible();
      await hotspot.click();
      await expect(hotspot).toHaveAttribute('aria-expanded', 'true');
      await expect(map.locator('.st-tips > li.on')).toBeVisible();
      await hotspot.press('Escape');
      await expect(hotspot).toHaveAttribute('aria-expanded', 'false');
      await expect(map.locator('.st-tips > li.on')).toHaveCount(0);
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
    await page.locator('label').filter({ has: page.locator('input[name=anlass][value=unternehmen]') }).click();
    await page.locator('#f-ort').fill('Osnabrück');
    await page.locator('[data-date-open]').check();
    await page.locator('[data-next]').click();
    await expect(page.locator('#inquiry-form')).toContainText(t('contactform.processingNotice'));
    await expect(page.locator('#inquiry-form a')).toHaveAttribute('href', `/${locale}/datenschutz/`);
    await page.locator('#f-name').fill('Integration Test');
    await page.locator('#f-mail').fill('test@example.test');
    await page.locator('button[type=submit]').click();
    await expect(page.locator('[data-form-status]')).toHaveText(t('contact.formDeliveryHasNotBeenSetUpYetNothingWas',{email:CONTACT.email}));
    for (const value of [locale, 'offen', 'express', 'Custom', 'Hello']) expect(submitted).toContain(value);
    await expect(page.locator('#f-name')).toHaveValue('Integration Test');
  });
}

test('Language switch keeps page, query and hash and is keyboard accessible', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/en/kontakt/?paket=offen#anfrage');
  // Sprachwahl öffnet per Fokus wie „Anlässe“ (Runde 20c): Knopf fokussieren, dann den Link wählen
  const button = page.locator('.nav .lang-btn');
  const link = page.locator('.nav .language-switch a[hreflang=nl]');
  await expect(link).toHaveAttribute('href', /\/nl\/kontakt\/\?paket=offen#anfrage$/);
  await expect(link).toBeHidden();
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(link).toBeVisible();
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/nl\/kontakt\/\?paket=offen#anfrage$/);
  await expect(page.locator('input[name=locale]')).toHaveValue('nl');
});
