// Versandzustände beider Formulare (Anfrage und Herkunftsfrage auf der Danke-Seite) gegen den Antwortvertrag von
// functions/api/contact.ts: Erfolg nur nach bestätigtem `sent`; fehlende Konfiguration, Netz- und Formatfehler bleiben
// ehrlich und lokalisiert; ohne JavaScript erscheint nie „erhalten“, wenn nichts angekommen ist (Audit A1/A2).
import { test, expect, type Page, type Route } from '@playwright/test';
import { createTranslator } from '../src/i18n/ui.mjs';
import { onRequestPost } from '../functions/api/contact';
import { SOURCE_DONE_ID } from '../src/content/inquiry-source.mjs';

const t = createTranslator('de');
const json = (route: Route, body: object, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
/** Der echte Endpoint ohne Versandkonfiguration beantwortet die Anfrage (gleicher Ursprung, echte Header). */
const endpoint = async (route: Route) => {
  const request = route.request();
  const response = await onRequestPost({ request: new Request(request.url(), { method: 'POST', headers: await request.allHeaders(), body: request.postDataBuffer() ? new Uint8Array(request.postDataBuffer()!) : null }), env: {} });
  await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
};

async function fillInquiry(page: Page) {
  const form = page.locator('#inquiry-form');
  await form.getByText(t('contactform.corporateEvent'), { exact: true }).click();
  await form.getByLabel(t('contactform.whereWillItTakePlace')).fill('Essen');
  await form.getByText(t('contactform.notDecidedYet')).click();
  await form.getByRole('button', { name: t('contactform.next'), exact: true }).click();
  await form.getByLabel(t('contactform.yourName')).fill('Testperson');
  await form.getByLabel(t('contactform.yourEmailAddress')).fill('test@example.test');
  return form;
}

test.describe('Anfrage mit JavaScript', () => {
  test('bestätigter Versand meldet Erfolg und führt zur Danke-Seite', async ({ page }) => {
    await page.route('**/api/contact', (route) => json(route, { ok: true, state: 'sent', requestId: '00000000-0000-4000-8000-000000000000' }));
    await page.goto('/kontakt/');
    const form = await fillInquiry(page);
    await form.getByRole('button', { name: t('contactform.sendEnquiry'), exact: true }).click();
    await expect(form.getByRole('status')).toHaveText(t('contact.yourEnquiryHasBeenSentWeLlGetBackTo'));
    await expect(page).toHaveURL(/\/danke\/$/);
  });

  test('ohne Versandkonfiguration bleibt die Seite stehen und sagt, dass nichts gesendet wurde', async ({ page }) => {
    await page.route('**/api/contact', (route) => json(route, { ok: true, state: 'not-configured' }));
    await page.goto('/kontakt/');
    const form = await fillInquiry(page);
    await form.getByRole('button', { name: t('contactform.sendEnquiry'), exact: true }).click();
    await expect(form.getByRole('status')).toContainText('Es wurde nichts gesendet.');
    await expect(form.getByRole('status')).toBeFocused();
    await page.waitForTimeout(2600); // länger als die Weiterleitungsverzögerung nach Erfolg
    await expect(page).toHaveURL(/\/kontakt\/$/);
    await expect(form.getByLabel(t('contactform.yourName'))).toHaveValue('Testperson');
  });

  for (const [name, answer] of [
    ['Netzfehler', (route: Route) => route.abort('failed')],
    ['Antwort ohne JSON (Proxyfehler)', (route: Route) => route.fulfill({ status: 502, contentType: 'text/html', body: '<h1>Bad Gateway</h1>' })],
  ] as const) test(`${name}: lokalisierte Meldung statt technischer Browsertext`, async ({ page }) => {
    await page.route('**/api/contact', answer);
    await page.goto('/kontakt/');
    const form = await fillInquiry(page);
    await form.getByRole('button', { name: t('contactform.sendEnquiry'), exact: true }).click();
    const status = form.getByRole('status');
    await expect(status).toHaveText(t('contact.valuePleaseTryAgainLaterOrEmailTeamFlyingstarsArt', { email: 'team@flyingstars.art', v0: t('contact.deliveryFailed') }));
    await expect(form.getByRole('button', { name: t('contactform.sendEnquiry'), exact: true })).toBeEnabled();
    await expect(page).toHaveURL(/\/kontakt\/$/);
  });

  test('Servermeldung erscheint wörtlich', async ({ page }) => {
    await page.route('**/api/contact', (route) => json(route, { ok: false, detail: t('contactAPI.email') }, 400));
    await page.goto('/kontakt/');
    const form = await fillInquiry(page);
    await form.getByRole('button', { name: t('contactform.sendEnquiry'), exact: true }).click();
    await expect(form.getByRole('status')).toContainText(t('contactAPI.email'));
  });
});

test.describe('Herkunftsfrage mit JavaScript', () => {
  const answer = (page: Page) => page.locator('[data-source-form]');

  test('ohne Auswahl: Meldung an der Gruppe, Fokus auf der ersten Antwort, Eingabe nimmt den Fehler zurück', async ({ page }) => {
    let sent = 0;
    await page.route('**/api/contact', (route) => { sent++; return json(route, { ok: true, state: 'sent' }); });
    await page.goto('/danke/');
    const form = answer(page);
    await form.getByRole('button', { name: 'Antwort senden' }).click();
    const error = form.locator('#quelle-err');
    await expect(error).toHaveText(t('thanks.pleaseChooseAnAnswer'));
    await expect(error).toHaveAttribute('role', 'alert');
    await expect(form.locator('fieldset')).toHaveAttribute('aria-describedby', 'quelle-err');
    await expect(form.locator('[name=quelle]').first()).toBeFocused();
    await expect(form.locator('[name=quelle]').first()).toHaveAttribute('aria-invalid', 'true');
    expect(sent).toBe(0);
    await form.getByText('LinkedIn', { exact: true }).click();
    await expect(error).toHaveText('');
    await expect(form.locator('[name=quelle]').first()).toHaveAttribute('aria-invalid', 'false');
  });

  test('nur ein bestätigter Versand zeigt den Dank', async ({ page }) => {
    await page.route('**/api/contact', (route) => json(route, { ok: true, state: 'sent' }));
    await page.goto('/danke/');
    const form = answer(page);
    await form.getByText('LinkedIn', { exact: true }).click();
    await form.getByRole('button', { name: 'Antwort senden' }).click();
    await expect(form.locator(`#${SOURCE_DONE_ID}`)).toBeVisible();
    await expect(form.locator(`#${SOURCE_DONE_ID}`)).toBeFocused();
    await expect(form.locator('fieldset')).toBeHidden();
  });

  test('ohne Versandkonfiguration: kein Dank, Auswahl bleibt, ehrliche Meldung', async ({ page }) => {
    await page.route('**/api/contact', (route) => json(route, { ok: true, state: 'not-configured' }));
    await page.goto('/danke/');
    const form = answer(page);
    await form.getByText('LinkedIn', { exact: true }).click();
    await form.getByRole('button', { name: 'Antwort senden' }).click();
    await expect(form.getByRole('status')).toHaveText(`${t('thanks.answerNotSent')} ${t('thanks.answerNotConfigured')}`);
    await expect(form.locator(`#${SOURCE_DONE_ID}`)).toBeHidden();
    await expect(form.locator('fieldset')).toBeVisible();
    await expect(form.locator('[name=quelle][value=linkedin]')).toBeChecked();
  });

  test('Netzfehler: kein Dank, lokalisierte Meldung, erneut sendbar', async ({ page }) => {
    await page.route('**/api/contact', (route) => route.abort('failed'));
    await page.goto('/danke/');
    const form = answer(page);
    await form.getByText('LinkedIn', { exact: true }).click();
    await form.getByRole('button', { name: 'Antwort senden' }).click();
    await expect(form.getByRole('status')).toHaveText(`${t('thanks.answerNotSent')} ${t('thanks.tryAgainLater')}`);
    await expect(form.locator(`#${SOURCE_DONE_ID}`)).toBeHidden();
    await expect(form.getByRole('button', { name: 'Antwort senden' })).toBeEnabled();
  });
});

test.describe('angehaltene Bewegung (Systemeinstellung oder Pause-Knopf)', () => {
  test.use({ reducedMotion: 'reduce' });
  const opacity = (locator: ReturnType<Page['locator']>) => locator.evaluate((node) => getComputedStyle(node).opacity);

  test('Dank der Herkunftsfrage erscheint sofort und voll deckend', async ({ page }) => {
    await page.route('**/api/contact', (route) => json(route, { ok: true, state: 'sent' }));
    await page.goto('/danke/');
    const form = page.locator('[data-source-form]');
    await form.getByText('LinkedIn', { exact: true }).click();
    await form.getByRole('button', { name: 'Antwort senden' }).click();
    await expect(form.locator(`#${SOURCE_DONE_ID}`)).toBeVisible();
    expect(await opacity(form.locator(`#${SOURCE_DONE_ID}`))).toBe('1');
  });

  test('optionale Angaben der Anfrage öffnen sofort und voll deckend', async ({ page }) => {
    await page.goto('/kontakt/');
    const form = await fillInquiry(page);
    await form.getByRole('button', { name: t('contactform.addPhone') }).click();
    await expect(form.getByLabel(t('contactform.yourPhoneNumber'))).toBeFocused();
    expect(await opacity(form.locator('#opt-tel'))).toBe('1');
  });
});

test.describe('ohne JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('Anfrage ohne Versandkonfiguration: lesbare Seite statt „erhalten“', async ({ page }) => {
    await page.route('**/api/contact', endpoint);
    await page.goto('/kontakt/');
    const form = page.locator('#inquiry-form');
    await form.locator('[name=anlass][value=firma]').check({ force: true });
    await form.locator('[name=datum-offen]').check({ force: true });
    await form.locator('[name=ort]').fill('Essen');
    await form.locator('[name=name]').fill('Testperson');
    await form.locator('[name=email]').fill('test@example.test');
    const response = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/contact');
    await form.locator('[type=submit]').click();
    expect((await response).status()).toBe(503);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(t('contact.yourEnquiryCouldNotBeSent'));
    await expect(page.getByRole('main')).toContainText('Es wurde nichts gesendet.');
    await expect(page.getByRole('main')).not.toContainText('Wir haben eure Anfrage erhalten');
    await expect(page.getByRole('link', { name: t('contactAPI.backToForm') })).toHaveAttribute('href', '/kontakt/#anfrage');
  });

  test('Herkunftsfrage: Auswahl ist Pflicht, Antwort ohne Versandkonfiguration wird nicht als Dank gemeldet', async ({ page }) => {
    let sent = 0;
    await page.route('**/api/contact', (route) => { sent++; return endpoint(route); });
    await page.goto('/danke/');
    const form = page.locator('[data-source-form]');
    await expect(form.locator('[name=quelle]').first()).toHaveAttribute('required', '');
    await form.getByRole('button', { name: 'Antwort senden' }).click();
    expect(await form.evaluate((node: HTMLFormElement) => node.checkValidity())).toBe(false);
    expect(sent).toBe(0);
    // Frische Seite: WebKits nativer Validierungshinweis hält sonst in Playwright den Knopf „instabil“
    await page.reload();
    await form.locator('[name=quelle][value=linkedin]').check({ force: true });
    const response = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/contact');
    await form.getByRole('button', { name: 'Antwort senden' }).click();
    expect((await response).status()).toBe(503);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(t('thanks.answerNotSent'));
    await expect(page.getByRole('main')).not.toContainText('Danke, das hilft uns sehr!');
    await expect(page.getByRole('link', { name: t('contactAPI.backToForm') })).toHaveAttribute('href', '/danke/#danke');
  });

  test('Herkunftsfrage: das Sprungziel der bestätigten Weiterleitung zeigt den Dank statt der Frage', async ({ page }) => {
    await page.goto(`/danke/#${SOURCE_DONE_ID}`);
    const form = page.locator('[data-source-form]');
    await expect(form.locator(`#${SOURCE_DONE_ID}`)).toBeVisible();
    await expect(form.locator(`#${SOURCE_DONE_ID}`)).toHaveText('Danke, das hilft uns sehr!');
    await expect(form.locator('fieldset')).toBeHidden();
    await page.goto('/danke/');
    await expect(form.locator(`#${SOURCE_DONE_ID}`)).toBeHidden();
    await expect(form.locator('fieldset')).toBeVisible();
  });
});
