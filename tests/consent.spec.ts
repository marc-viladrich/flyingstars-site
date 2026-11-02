import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Run once against the ordinary build and once against the explicitly configured dummy build.
// PUBLIC_GA_ID=G-CONSENTTEST PUBLIC_GOOGLE_ADS_ID=AW-123456789 PUBLIC_GOOGLE_ADS_LABEL=TEST_LABEL npm run build
// CONSENT_TEST_ENABLED=1 npx playwright test tests/consent.spec.ts --workers=2
const enabled = process.env.CONSENT_TEST_ENABLED === '1';
const key = 'flyingstars:consent';
const requests = new WeakMap<Page, string[]>();
const commands = (page: Page) => page.evaluate(() => ((window as any).dataLayer ?? []).map((value: any) => Array.from(value)));
const emitLead = (page: Page, id = '12345678-1234-4123-8123-123456789abc') => page.evaluate((requestId) => {
  window.dispatchEvent(new CustomEvent('flyingstars:lead-confirmed', { detail: { requestId } }));
}, id);

test.beforeEach(async ({ page }) => {
  const intercepted: string[] = [];
  requests.set(page, intercepted);
  await page.context().route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    intercepted.push(url.href);
    // The tag is a local stub: no Google server or secondary Google request is contacted.
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* intercepted Google tag */' });
  });
});

test('without configured IDs there is no dialog, Google tag, queue or reopen control', async ({ page }) => {
  test.skip(enabled, 'Checks the ordinary OFF build');
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('#consent')).toHaveCount(0);
  await expect(page.locator('[data-consent-open]')).toBeHidden();
  expect(await commands(page)).toEqual([]);
  expect(requests.get(page)).toEqual([]);
});

test.describe('explicitly configured dummy IDs', () => {
  test.skip(!enabled, 'Requires the documented dummy-ID build');

  test('before a choice all v2 defaults deny, with no Google request; rejecting persists across languages', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('#consent')).toBeVisible();
    const queue = await commands(page);
    expect(queue[0]).toEqual(['consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }]);
    expect(queue.some((value: any) => ['config', 'event'].includes(value[0]))).toBe(false);
    expect(requests.get(page)).toEqual([]);
    await emitLead(page);
    await page.getByRole('button', { name: 'Ablehnen', exact: true }).click();
    await expect(page.locator('#consent')).not.toBeVisible();
    await emitLead(page);
    await page.goto('/nl/', { waitUntil: 'networkidle' });
    await expect(page.locator('#consent')).not.toBeVisible();
    expect(requests.get(page)).toEqual([]);
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).ads, key)).toBe(false);
  });

  test('accepting loads one intercepted tag, restores consent, and emits only consented deduplicated conversions', async ({ page }) => {
    await page.goto('/');
    await emitLead(page); // No retrospective replay after consent.
    await page.getByRole('button', { name: 'Akzeptieren', exact: true }).click();
    await expect(page.locator('script[data-consent-tag]')).toHaveCount(1);
    await expect.poll(() => requests.get(page)!.length).toBe(1);
    expect(requests.get(page)![0]).toBe('https://www.googletagmanager.com/gtag/js?id=G-CONSENTTEST');
    let queue = await commands(page);
    expect(queue.filter((value: any) => value[0] === 'config').map((value: any) => value[1])).toEqual(['G-CONSENTTEST', 'AW-123456789']);
    expect(queue.some((value: any) => value[0] === 'event')).toBe(false);
    expect(queue.find((value: any) => value[0] === 'consent' && value[1] === 'update')?.[2]).toEqual({ analytics_storage: 'granted', ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'denied' });
    await emitLead(page, 'email@example.test');
    await emitLead(page); await emitLead(page);
    queue = await commands(page);
    expect(queue.filter((value: any) => value[0] === 'event')).toEqual([['event', 'conversion', { send_to: 'AW-123456789/TEST_LABEL', transaction_id: '12345678-1234-4123-8123-123456789abc', page_location: new URL(page.url()).origin + '/', page_referrer: '', page_title: '' }]]);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('#consent')).not.toBeVisible();
    expect(requests.get(page)).toHaveLength(2);
  });

  for (const purpose of ['analytics', 'ads']) test(`settings grant only ${purpose}, never the other purpose`, async ({ page }) => {
    await page.goto('/?text=private&show=private#anfrage');
    await page.getByRole('button', { name: 'Einstellungen', exact: true }).click();
    await expect(page.locator('#consent input:checked')).toHaveCount(0);
    await page.locator(`#consent [name="${purpose}"]`).check();
    await page.getByRole('button', { name: 'Auswahl speichern' }).click();
    await expect.poll(() => requests.get(page)!.length).toBe(1);
    const queue = await commands(page);
    const configs = queue.filter((value: any) => value[0] === 'config');
    expect(configs).toHaveLength(1);
    expect(configs[0][1]).toBe(purpose === 'analytics' ? 'G-CONSENTTEST' : 'AW-123456789');
    expect(configs[0][2]).toMatchObject({ page_location: new URL(page.url()).origin + '/', page_referrer: '', page_title: '' });
    await emitLead(page);
    expect((await commands(page)).filter((value: any) => value[0] === 'event')).toHaveLength(purpose === 'ads' ? 1 : 0);
  });

  test('withdrawal via footer removes first-party Google cookies and blocks tags on a fresh document', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Akzeptieren', exact: true }).click();
    await expect.poll(() => requests.get(page)!.length).toBe(1);
    await page.evaluate(() => { document.cookie = '_ga=test; Path=/'; document.cookie = '_gcl_aw=test; Path=/'; });
    await page.locator('[data-consent-open]').click();
    await expect(page.locator('#consent-settings')).toBeVisible();
    await page.getByRole('button', { name: 'Ablehnen', exact: true }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('script[data-consent-tag]')).toHaveCount(0);
    expect(requests.get(page)).toHaveLength(1);
    expect(await page.context().cookies()).not.toEqual(expect.arrayContaining([expect.objectContaining({ name: '_ga' })]));
    expect(await page.evaluate(() => document.cookie)).not.toContain('_gcl_aw');
    await emitLead(page);
    expect((await commands(page)).some((value: any) => value[0] === 'event')).toBe(false);
  });

  test('corrupt, expired and changed-purpose records prompt again and never load a tag', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Ablehnen', exact: true }).click();
    const record = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
    for (const raw of ['{', JSON.stringify({ ...record, updatedAt: 1, expiresAt: 2, analytics: true, ads: true }), JSON.stringify({ ...record, version: 0, analytics: true, ads: true }), JSON.stringify({ ...record, config: '{}', analytics: true, ads: true })]) {
      await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key, raw });
      await page.reload({ waitUntil: 'networkidle' });
      await expect(page.locator('#consent')).toBeVisible();
    }
    expect(requests.get(page)).toEqual([]);
  });

  test('withdrawing in one tab also stops the already consented second tab', async ({ page, context }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Akzeptieren', exact: true }).click();
    await expect.poll(() => requests.get(page)!.length).toBe(1);
    const other = await context.newPage();
    await other.goto('/en/', { waitUntil: 'networkidle' });
    await expect.poll(() => requests.get(page)!.length).toBe(2);
    await page.locator('[data-consent-open]').click();
    await page.getByRole('button', { name: 'Ablehnen', exact: true }).click();
    await expect(page.locator('script[data-consent-tag]')).toHaveCount(0);
    await expect(other.locator('script[data-consent-tag]')).toHaveCount(0);
    await other.waitForLoadState('networkidle');
    expect(requests.get(page)).toHaveLength(2);
    await other.close();
  });

  test('a storage failure remains usable and fails closed on the next page', async ({ page }) => {
    await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('blocked'); }; });
    await page.goto('/');
    await page.getByRole('button', { name: 'Ablehnen', exact: true }).click();
    await expect(page.locator('[data-consent-error]')).toBeVisible();
    await page.getByRole('button', { name: 'Schließen ohne Änderung' }).click();
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('#consent')).toBeVisible();
    expect(requests.get(page)).toEqual([]);
  });

  test('withdrawal with read-only storage never restores its stale grant', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Akzeptieren', exact: true }).click();
    await expect.poll(() => requests.get(page)!.length).toBe(1);
    const block = () => {
      Storage.prototype.setItem = () => { throw new Error('read-only'); };
      Storage.prototype.removeItem = () => { throw new Error('read-only'); };
    };
    await page.addInitScript(block);
    await page.evaluate(block);
    await page.locator('[data-consent-open]').click();
    await page.getByRole('button', { name: 'Ablehnen', exact: true }).click();
    await expect(page.locator('script[data-consent-tag]')).toHaveCount(0);
    await expect(page.locator('#consent')).toBeVisible();
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('script[data-consent-tag]')).toHaveCount(0);
    expect(requests.get(page)).toHaveLength(1);
  });

  test('legal information is readable without a choice and the footer opens translated settings', async ({ page }) => {
    for (const [locale, label] of [['en', 'Privacy settings'], ['nl', 'Privacyinstellingen']]) {
      await page.goto(`/${locale}/datenschutz/`);
      await expect(page.locator('#consent')).not.toBeVisible();
      await page.getByRole('button', { name: label, exact: true }).click();
      await expect(page.locator('#consent-settings')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: label, exact: true })).toBeFocused();
    }
    expect(requests.get(page)).toEqual([]);
  });

  test('dialog, settings, keyboard focus and equal decisions at 1440 and 390 pixels', async ({ page }, testInfo) => {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await expect(page.locator('#consent-title')).toBeFocused();
      const reject = page.getByRole('button', { name: 'Ablehnen', exact: true });
      const accept = page.getByRole('button', { name: 'Akzeptieren', exact: true });
      const a = await accept.boundingBox(); const r = await reject.boundingBox();
      expect(a?.width).toBe(r?.width); expect(a?.height).toBe(r?.height);
      expect(await accept.getAttribute('class')).toBe(await reject.getAttribute('class'));
      await page.screenshot({ path: testInfo.outputPath(`consent-de-${width}.png`) });
      const initial = await new AxeBuilder({ page }).include('#consent').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(initial.violations).toEqual([]);
      await page.getByRole('button', { name: 'Einstellungen', exact: true }).click();
      await expect(page.locator('#consent input').first()).toBeFocused();
      await page.screenshot({ path: testInfo.outputPath(`consent-settings-de-${width}.png`) });
      const settings = await new AxeBuilder({ page }).include('#consent').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(settings.violations).toEqual([]);
      expect(await page.locator('#consent').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      await page.keyboard.press('Escape');
      await expect(page.locator('#consent')).not.toBeVisible();
    }
    expect(requests.get(page)).toEqual([]);
  });
});
