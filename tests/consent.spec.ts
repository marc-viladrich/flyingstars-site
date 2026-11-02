import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const enabled = process.env.CONSENT_TEST_ENABLED === '1';
const ga = process.env.PUBLIC_GA_ID || 'G-CONSENTTEST';
const ads = process.env.PUBLIC_GOOGLE_ADS_ID || 'AW-123456789';
const label = process.env.PUBLIC_GOOGLE_ADS_LABEL || 'TEST_LABEL';
const key = 'flyingstars:consent';
const id = '12345678-1234-4123-8123-123456789abc';
const requests = new WeakMap<Page, string[]>();
const commands = (page: Page) => page.evaluate(() => ((window as any).dataLayer ?? []).map((value: any) => Array.from(value)));
const events = async (page: Page) => (await commands(page)).filter((value: any) => value[0] === 'event');
const emitLead = (page: Page, requestId = id) => page.evaluate((requestId) => window.dispatchEvent(new CustomEvent('flyingstars:lead-confirmed', { detail: { requestId } })), requestId);
const consent = (page: Page) => page.locator('.cm');
const settings = (page: Page) => page.locator('.pm');
const accept = async (page: Page) => {
  await consent(page).getByRole('button', { name: 'Akzeptieren', exact: true }).click();
  await expect(page.locator('script[data-consent-tag]')).toHaveCount(1);
  await expect(consent(page)).toBeHidden();
  // The library releases background interaction 500ms after hiding the notice.
  await expect(page.locator('html')).not.toHaveClass(/disable--interaction/);
};
const openSettings = async (page: Page) => { await page.locator('[data-consent-open]').click(); await expect(settings(page)).toBeVisible(); };

async function fillInquiry(page: Page) {
  await page.locator('label').filter({ has: page.locator('input[name=anlass][value=firma]') }).click();
  await page.locator('#f-ort').fill('Osnabrück');
  await page.locator('[data-date-open]').check();
  await page.locator('[data-next]').click();
  await page.locator('#f-name').fill('Integration Test');
  await page.locator('#f-mail').fill('test@example.test');
  // Seit Runde 15 liegt „Wie habt ihr uns gefunden?“ hinter einem „+“-Chip.
  await page.locator('[data-opt-add=quelle]').click();
  await page.locator('#f-quelle').selectOption('Empfehlung');
}

test.beforeEach(async ({ page }) => {
  const intercepted: string[] = [];
  requests.set(page, intercepted);
  await page.context().route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    intercepted.push(url.href);
    // Every external request is intercepted, including all secondary Google requests.
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* intercepted Google tag */' });
  });
});

test('without IDs no library, CSS, queue, dialog or reopen control downloads', async ({ page }) => {
  test.skip(enabled, 'OFF build');
  const assets: string[] = [];
  page.on('request', (request) => assets.push(request.url()));
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('#cc-main, #consent-config')).toHaveCount(0);
  await expect(page.locator('[data-consent-open]')).toBeHidden();
  expect(assets.some((url) => /\/(?:cookieconsent|consent)\.[^/]+\.(js|css)/.test(url))).toBe(false);
  expect(await commands(page)).toEqual([]);
  expect(requests.get(page)).toEqual([]);
});

test.describe('configured public IDs', () => {
  test.skip(!enabled, 'Requires an explicitly configured build');

  test('all v2 defaults deny before choice; rejection persists across languages without Google requests', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(consent(page)).toBeVisible();
    expect((await commands(page))[0]).toEqual(['consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }]);
    expect(requests.get(page)).toEqual([]);
    await emitLead(page);
    await consent(page).getByRole('button', { name: 'Ablehnen', exact: true }).click();
    await expect(consent(page)).toBeHidden();
    await emitLead(page);
    await page.goto('/nl/', { waitUntil: 'networkidle' });
    await expect(consent(page)).toBeHidden();
    expect(requests.get(page)).toEqual([]);
    expect(await events(page)).toEqual([]);
    const record = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
    expect(record.categories).toEqual(['necessary']);
    expect(record.expirationTime - Date.parse(record.lastConsentTimestamp)).toBeCloseTo(180 * 86400000, -3);
  });

  test('accept loads exactly one intercepted tag, restores consent and deduplicates only consented leads', async ({ page }) => {
    await page.goto('/');
    await emitLead(page);
    await accept(page);
    await expect.poll(() => requests.get(page)!.length).toBe(1);
    expect(requests.get(page)![0]).toBe(`https://www.googletagmanager.com/gtag/js?id=${ga}`);
    let queue = await commands(page);
    expect(queue.filter((value: any) => value[0] === 'config').map((value: any) => value[1])).toEqual([ga, ads]);
    expect(await events(page)).toEqual([]); // no replay
    expect(queue.find((value: any) => value[0] === 'consent' && value[1] === 'update')?.[2]).toEqual({ analytics_storage: 'granted', ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'denied' });
    expect(queue.filter((value: any) => value[0] === 'config').every((value: any) => value[2].allow_enhanced_conversions === false)).toBe(true);
    await emitLead(page, 'email@example.test');
    await emitLead(page); await emitLead(page);
    expect(await events(page)).toEqual([
      ['event', 'conversion', { send_to: `${ads}/${label}`, transaction_id: id, page_location: new URL(page.url()).origin + '/', page_referrer: '', page_title: '' }],
      ['event', 'generate_lead', { send_to: ga, page_location: new URL(page.url()).origin + '/', page_referrer: '', page_title: '' }],
    ]);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(consent(page)).toBeHidden();
    expect(requests.get(page)).toHaveLength(2);
  });

  for (const purpose of ['analytics', 'marketing']) test(`settings grant only ${purpose}`, async ({ page }) => {
    await page.goto('/?text=private&show=private#anfrage');
    await consent(page).getByRole('button', { name: 'Einstellungen', exact: true }).click();
    await expect(settings(page).locator('input:checked:not(:disabled)')).toHaveCount(0);
    const input = settings(page).locator(`input[name="cc-${purpose}"]`);
    await settings(page).locator("label").filter({ has: page.locator(`input[name="cc-${purpose}"]`) }).click();
    await expect(input).toBeChecked();
    await settings(page).getByRole('button', { name: 'Auswahl speichern' }).click();
    await expect.poll(() => requests.get(page)!.length).toBe(1);
    const configs = (await commands(page)).filter((value: any) => value[0] === 'config');
    expect(configs).toHaveLength(1);
    expect(configs[0][1]).toBe(purpose === 'analytics' ? ga : ads);
    expect(configs[0][2]).toMatchObject({ page_location: new URL(page.url()).origin + '/', page_referrer: '', page_title: '' });
    await emitLead(page);
    expect((await events(page)).map((value: any) => value[1])).toEqual([purpose === 'marketing' ? 'conversion' : 'generate_lead']);
  });

  test('footer withdrawal clears accessible Google cookies and unloads tags without another Google request', async ({ page }) => {
    await page.goto('/'); await accept(page);
    await expect.poll(() => requests.get(page)!.length).toBe(1);
    await page.evaluate(() => { document.cookie = '_ga=test; Path=/'; document.cookie = '_gcl_aw=test; Path=/'; });
    await openSettings(page);
    await settings(page).getByRole('button', { name: 'Ablehnen', exact: true }).click();
    await expect(page.locator('script[data-consent-tag]')).toHaveCount(0);
    await page.waitForLoadState('networkidle');
    expect(requests.get(page)).toHaveLength(1);
    expect(await page.evaluate(() => document.cookie)).not.toMatch(/_ga=|_gcl_aw=/);
    await emitLead(page); expect(await events(page)).toEqual([]);
  });

  test('corrupt, expired, future-dated, old native and changed-revision records never restore tracking', async ({ page }) => {
    await page.goto('/');
    await consent(page).getByRole('button', { name: 'Ablehnen', exact: true }).click();
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), key)).not.toBeNull();
    const record = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
    for (const raw of ['{', JSON.stringify({ ...record, expirationTime: 1 }), JSON.stringify({ ...record, lastConsentTimestamp: new Date(Date.now() + 86400000).toISOString() }), JSON.stringify({ ...record, revision: 0, categories: ['necessary', 'analytics', 'marketing'] }), JSON.stringify({ version: 1, ads: true, analytics: true })]) {
      await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key, raw });
      await page.reload({ waitUntil: 'networkidle' });
      await expect(consent(page)).toBeVisible();
    }
    expect(requests.get(page)).toEqual([]);
  });

  test('second tab also stops after revocation', async ({ page, context }) => {
    await page.goto('/'); await accept(page);
    const other = await context.newPage();
    await other.goto('/en/', { waitUntil: 'networkidle' });
    await expect.poll(() => requests.get(page)!.length).toBe(2);
    await openSettings(page);
    await settings(page).getByRole('button', { name: 'Ablehnen', exact: true }).click();
    await expect(page.locator('script[data-consent-tag]')).toHaveCount(0);
    await expect(other.locator('script[data-consent-tag]')).toHaveCount(0);
    await other.waitForLoadState('networkidle');
    expect(requests.get(page)).toHaveLength(2);
    await other.close();
  });

  test('blocked storage reports session-only consent and fails closed on next page', async ({ page }) => {
    await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('blocked'); }; });
    await page.goto('/');
    await consent(page).getByRole('button', { name: 'Ablehnen', exact: true }).click();
    await expect(page.locator('[data-consent-error]')).toBeVisible();
    await page.reload({ waitUntil: 'networkidle' });
    await expect(consent(page)).toBeVisible();
    expect(requests.get(page)).toEqual([]);
  });

  test('read-only storage cannot restore its stale grant after withdrawal', async ({ page }) => {
    await page.goto('/'); await accept(page);
    const block = () => {
      Storage.prototype.setItem = () => { throw new Error('read-only'); };
      Storage.prototype.removeItem = () => { throw new Error('read-only'); };
    };
    await page.addInitScript(block); await page.evaluate(block);
    await openSettings(page);
    await settings(page).getByRole('button', { name: 'Ablehnen', exact: true }).click();
    await expect(page.locator('script[data-consent-tag]')).toHaveCount(0);
    await expect(consent(page)).toBeVisible();
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('script[data-consent-tag]')).toHaveCount(0);
    expect(requests.get(page)).toHaveLength(1);
  });

  test('legal pages remain readable; EN/NL footer settings close back to their trigger', async ({ page }) => {
    for (const [locale, label] of [['en', 'Privacy settings'], ['nl', 'Privacyinstellingen']]) {
      await page.goto(`/${locale}/datenschutz/`);
      await expect(consent(page)).toBeHidden();
      const reopen = page.getByRole('button', { name: label, exact: true });
      await reopen.click(); await expect(settings(page)).toBeVisible();
      await page.keyboard.press('Escape'); await expect(reopen).toBeFocused();
      await expect(page.locator('main')).not.toHaveAttribute('inert');
    }
    expect(requests.get(page)).toEqual([]);
  });

  test('banner and settings at 1440/390: equal decisions, keyboard, no overflow and axe', async ({ page, browserName }, testInfo) => {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 }); await page.goto('/');
      await expect(consent(page)).toBeVisible();
      await expect.poll(() => consent(page).evaluate(el => getComputedStyle(el).opacity)).toBe('1');
      await page.bringToFront(); // Keyboard input requires the same foreground tab a person uses.
      const reject = consent(page).getByRole('button', { name: 'Ablehnen', exact: true });
      const accept = consent(page).getByRole('button', { name: 'Akzeptieren', exact: true });
      const a = await accept.boundingBox(); const r = await reject.boundingBox();
      expect(a?.width).toBe(r?.width); expect(a?.height).toBe(r?.height);
      expect(await accept.getAttribute('class')).toBe(await reject.getAttribute('class'));
      await expect.poll(() => page.locator(':focus').evaluate((element) => !!element.closest('.cm'))).toBe(true);
      const tab = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
      await page.keyboard.press(tab); await expect(consent(page).locator('.cm__desc')).toBeFocused();
      await page.keyboard.press(tab); await expect(consent(page).locator('.cm__desc a')).toBeFocused();
      await page.keyboard.press(tab); await expect(page.locator(':focus')).toHaveText('Ablehnen');
      await page.screenshot({ path: testInfo.outputPath(`consent-de-${width}.png`) });
      expect((await new AxeBuilder({ page }).include('#cc-main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
      await consent(page).getByRole('button', { name: 'Einstellungen', exact: true }).click();
      await expect(settings(page)).toBeVisible();
      await expect.poll(() => settings(page).evaluate(el => getComputedStyle(el).opacity)).toBe('1');
      await page.screenshot({ path: testInfo.outputPath(`consent-settings-de-${width}.png`) });
      expect((await new AxeBuilder({ page }).include('#cc-main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
      expect(await settings(page).evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      await page.keyboard.press('Escape'); await expect(settings(page)).toBeHidden();
      // Escape on initial notice must never grant anything.
      expect(await events(page)).toEqual([]);
    }
    expect(requests.get(page)).toEqual([]);
  });

  for (const state of ['confirmed', 'honeypot', 'not-configured', 'missing-state', 'failed', 'timeout']) test(`inquiry ${state}: conversions only after confirmed successful submit`, async ({ page }) => {
    let submits = 0;
    await page.route('**/api/contact', async (route) => {
      submits++;
      if (state === 'timeout') return route.abort('timedout');
      const result = state === 'confirmed' ? { ok: true, state: 'sent', requestId: id }
        : state === 'honeypot' ? { ok: true, state: 'sent' }
        : state === 'not-configured' ? { ok: true, state, requestId: id }
        : state === 'missing-state' ? { ok: true, requestId: id } : { ok: false, state: 'sent', requestId: id };
      return route.fulfill({ status: state === 'failed' ? 502 : 200, contentType: 'application/json', body: JSON.stringify(result) });
    });
    await page.goto('/kontakt/'); await accept(page);
    expect(await events(page)).toEqual([]);
    await fillInquiry(page);
    await page.locator('button[type=submit]').click();
    await expect(page.locator('[data-form-status]')).not.toHaveText('');
    expect(submits).toBe(1);
    expect((await events(page)).map((value: any) => value[1])).toEqual(state === 'confirmed' ? ['conversion', 'generate_lead'] : []);
    await page.goto('/danke/'); expect(await events(page)).toEqual([]);
  });

  test('confirmed inquiry without consent never replays after later acceptance', async ({ page }) => {
    await page.route('**/api/contact', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, state: 'sent', requestId: id }) }));
    await page.goto('/kontakt/');
    await consent(page).getByRole('button', { name: 'Ablehnen', exact: true }).click();
    await fillInquiry(page); await page.locator('button[type=submit]').click();
    await expect(page.locator('[data-form-status]')).toContainText('gesendet');
    expect(await events(page)).toEqual([]);
    await openSettings(page);
    await settings(page).getByRole('button', { name: 'Akzeptieren', exact: true }).click();
    await expect(page.locator('script[data-consent-tag]')).toHaveCount(1);
    expect(await events(page)).toEqual([]);
  });

  test('pending confirmation is blocked immediately on revocation, before deferred library callbacks', async ({ page }) => {
    let pending: import('@playwright/test').Route | undefined;
    await page.route('**/api/contact', (route) => { pending = route; });
    await page.goto('/kontakt/'); await accept(page);
    await fillInquiry(page); await page.locator('button[type=submit]').click();
    await expect.poll(() => Boolean(pending)).toBe(true);
    await openSettings(page);
    // Hold the library's after-paint callback to expose the real revocation window.
    // The form must already obey acceptedCategory(), not the previous callback state.
    await settings(page).getByRole('button', { name: 'Ablehnen', exact: true }).evaluate((button: HTMLButtonElement) => {
      window.requestAnimationFrame = () => 0;
      button.click();
    });
    await pending!.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, state: 'sent', requestId: id }) });
    await expect(page.locator('[data-form-status]')).toContainText('gesendet');
    expect(await events(page)).toEqual([]);
  });

  test('notice sits small in the bottom-right corner, leaves the page usable and undimmed; only settings isolate', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 }); await page.goto('/');
    await expect(consent(page)).toBeVisible();
    await expect.poll(() => consent(page).evaluate(el => getComputedStyle(el).opacity)).toBe('1');
    await expect(consent(page)).toHaveAttribute('role', 'region');
    await expect(page.locator('main')).not.toHaveAttribute('inert');
    await expect(page.locator('html')).not.toHaveClass(/disable--interaction/);
    await expect(page.locator('#cc-main .cm-wrapper .cm-overlay, #cc-main .cm-overlay')).toHaveCount(0);
    const box = (await consent(page).boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(380);
    expect(box.height).toBeLessThanOrEqual(360);
    expect(1440 - (box.x + box.width)).toBeLessThanOrEqual(40);
    expect(900 - (box.y + box.height)).toBeLessThanOrEqual(40);
    // The page beside the notice stays clickable.
    await page.locator('header a[href]').first().click({ trial: true });
    await consent(page).getByRole('button', { name: 'Ablehnen', exact: true }).click();
    await expect(consent(page)).toBeHidden();
    await openSettings(page);
    await expect(page.locator('main')).toHaveAttribute('inert', '');
    await page.keyboard.press('Escape');
    await expect(page.locator('main')).not.toHaveAttribute('inert');
  });

  test('Tab leaves the notice instead of cycling inside it', async ({ page, browserName }) => {
    await page.goto('/');
    await expect.poll(() => consent(page).evaluate(el => getComputedStyle(el).opacity)).toBe('1');
    await page.bringToFront();
    await consent(page).getByRole('button', { name: 'Einstellungen', exact: true }).focus();
    const tab = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
    await page.keyboard.press(`Shift+${tab}`);
    await expect.poll(() => page.locator(':focus').evaluate((element) => !!element.closest('.cm'))).toBe(true);
    await consent(page).locator('.cm__desc').focus();
    await page.keyboard.press(`Shift+${tab}`);
    await expect.poll(() => page.evaluate(() => !document.activeElement?.closest('.cm'))).toBe(true);
  });

  test('notice stays compact on a short mobile viewport and keeps both bullets', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 600 }); await page.goto('/');
    await expect.poll(() => consent(page).evaluate(el => getComputedStyle(el).opacity)).toBe('1');
    const box = (await consent(page).boundingBox())!;
    expect(box.height).toBeLessThanOrEqual(600 * 0.7);
    await expect(consent(page).locator('.consent-list [role=listitem]')).toHaveCount(2);
    const description = consent(page).locator('.cm__desc');
    if (await description.evaluate(el => el.scrollHeight > el.clientHeight)) await expect(description).toHaveAttribute('tabindex', '0');
  });
});
