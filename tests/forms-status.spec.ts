// Versandzustände beider Formulare (Anfrage und Herkunftsfrage auf der Danke-Seite) gegen den Antwortvertrag von
// functions/api/contact.ts: Erfolg nur nach bestätigtem `sent`; fehlende Konfiguration, Netz- und Formatfehler bleiben
// ehrlich und lokalisiert; ohne JavaScript erscheint nie „erhalten“, wenn nichts angekommen ist (Audit A1/A2). Die
// Danke-Seite zeigt immer Dank und Herkunftsfrage, auch direkt aufgerufen (Marc, 19.11.2026; ersetzt den neutralen
// Zustand aus Audit 2 N1/Audit 3 V4). Die Antwort trägt den Bezug der Anfrage, wenn es in der Sitzung einen gibt, sonst
// keinen. Der Freitext geht nur mit „Andere“ mit (N2).
import { test, expect, type Page, type Route } from '@playwright/test';
import { createTranslator } from '../src/i18n/ui.mjs';
import { onRequestPost } from '../functions/api/contact';
import { SOURCE_DONE_ID, INQUIRY_REF_KEY } from '../src/content/inquiry-source.mjs';

const t = createTranslator('de');
const json = (route: Route, body: object, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
const RECEIVED = { de: 'Danke für eure Anfrage! Wir haben sie erhalten', en: 'Thank you for your enquiry!', nl: 'Bedankt voor jullie aanvraag!' } as const;
const CONFIGURED = { BREVO_API_KEY: 'test', CONTACT_TO: 'inbox@example.test', CONTACT_FROM: 'form@example.test' };
/** Der Endpoint unter /api/contact */
const API = (url: URL) => url.pathname === '/api/contact';
/** Der echte Endpoint beantwortet die Anfrage (gleicher Ursprung, echte Header). Mit `mails` ist der Versand
 * eingerichtet: Brevo wird nur für diesen Aufruf im Testprozess ersetzt und der Mailtext gesammelt, nichts verlässt
 * den Rechner. Ohne `mails` fehlt die Versandkonfiguration. Eine Weiterleitung des Endpoints kann Playwright in WebKit
 * nicht als 303 ausliefern: Status und Ziel landen in `redirects`, der Browser folgt demselben Ziel per GET
 * (Meta-Refresh, ohne JavaScript). */
const endpoint = (mails?: string[], redirects: { status: number; location: string }[] = []) => async (route: Route) => {
  const request = route.request();
  const env = mails ? CONFIGURED : {};
  const call = async () => onRequestPost({
    request: new Request(request.url(), { method: 'POST', headers: await request.allHeaders(), body: request.postDataBuffer() ? new Uint8Array(request.postDataBuffer()!) : null }),
    env,
  });
  let response: Response;
  if (!mails) response = await call();
  else {
    const original = globalThis.fetch;
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => { mails.push(JSON.parse(String(init?.body)).textContent); return new Response('{}', { status: 201 }); }) as typeof fetch;
    try { response = await call(); } finally { globalThis.fetch = original; }
  }
  const location = response.headers.get('location');
  if (response.status >= 300 && response.status < 400 && location) {
    redirects.push({ status: response.status, location });
    return route.fulfill({ status: 200, contentType: 'text/html', body: `<!doctype html><meta http-equiv="refresh" content="0; url=${location}">` });
  }
  await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
};
const KICKER = { de: 'Eure Anfrage', en: 'Your enquiry', nl: 'Jullie aanvraag' } as const;
/** Die Danke-Seite, egal wie aufgerufen: Kicker und Titel, Dank und Eingang, Schrittanzeige und Herkunftsfrage mit Absenden. */
async function expectThanks(page: Page, locale: keyof typeof KICKER = 'de') {
  const section = page.locator('section.thanks');
  await expect(page).toHaveTitle(new RegExp(`^${KICKER[locale]} \\|`));
  await expect(section.locator('.kicker')).toHaveText(KICKER[locale]);
  await expect(section.locator('.intro .lead')).toContainText(RECEIVED[locale]);
  await expect(section.locator('.ask-steps')).toBeVisible();
  await expect(section.locator('[data-source-form] fieldset')).toBeVisible();
}
/** Danke-Seite wie direkt nach einer bestätigten Anfrage mit JavaScript (Bezug in sessionStorage, wie contact.ts) */
async function afterInquiry(page: Page, path = '/danke/') {
  await page.goto(path);
  await page.evaluate((ref) => sessionStorage.setItem(ref, '0123456789ab'), INQUIRY_REF_KEY);
  await page.goto(path);
}

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
    await expectThanks(page);
    // Neuladen zeigt dieselbe Seite
    await page.reload();
    await expectThanks(page);
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

test.describe('Direkter Aufruf der Danke-Seite mit JavaScript', () => {
  for (const path of ['/danke/', `/danke/#${SOURCE_DONE_ID}`, '/en/danke/', '/nl/danke/']) test(`${path}: Dank und Herkunftsfrage`, async ({ page }) => {
    await page.goto(path);
    await expectThanks(page, path.startsWith('/en/') ? 'en' : path.startsWith('/nl/') ? 'nl' : 'de');
  });

  test('ohne Bezug in der Sitzung geht die Antwort ohne ref und wird angenommen', async ({ page }) => {
    const mails: string[] = [], bodies: string[] = [];
    await page.route('**/api/contact', (route) => { bodies.push(route.request().postDataBuffer()?.toString('utf8') ?? ''); return endpoint(mails)(route); });
    await page.goto('/danke/');
    const form = page.locator('[data-source-form]');
    await form.getByText('Instagram', { exact: true }).click();
    await form.getByRole('button', { name: 'Antwort senden' }).click();
    await expect(form.locator(`#${SOURCE_DONE_ID}`)).toBeVisible();
    expect(bodies[0]).not.toMatch(/name="ref"\r\n\r\n[a-f0-9]{12}/); // Formular sendet multipart, das Feld bleibt leer
    expect(mails[0]).toContain('quelle: instagram');
    expect(mails[0]).toContain('ref: ohne Bezug');
  });
});

test.describe('Herkunftsfrage mit JavaScript', () => {
  const answer = (page: Page) => page.locator('[data-source-form]');

  test('Freitext nur bei „Andere“: Wechsel zu einer festen Auswahl sendet ihn nicht mit', async ({ page }) => {
    const mails: string[] = [], bodies: string[] = [];
    await page.route('**/api/contact', (route) => { bodies.push(route.request().postDataBuffer()?.toString('utf8') ?? ''); return endpoint(mails)(route); });
    await afterInquiry(page);
    const form = answer(page);
    const text = form.getByLabel('Wo genau?');
    await expect(text).toBeHidden();
    await form.getByText('Andere', { exact: true }).click();
    await text.fill('Messe in Köln');
    await form.getByText('LinkedIn', { exact: true }).click();
    await expect(text).toBeHidden();
    await form.getByRole('button', { name: 'Antwort senden' }).click();
    await expect(form.locator(`#${SOURCE_DONE_ID}`)).toBeVisible();
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).not.toContain('Messe');
    expect(bodies[0]).not.toContain('quelle-text');
    expect(mails).toHaveLength(1);
    expect(mails[0]).toContain('quelle: linkedin');
    expect(mails[0]).not.toContain('freitext');
    expect(mails[0]).toContain('ref: 0123456789ab'); // Bezug zur Anfrage aus der Sitzung
  });

  test('Freitext bei „Andere“ geht mit und bleibt beim Hin- und Zurückwechseln erhalten', async ({ page }) => {
    const mails: string[] = [];
    await page.route('**/api/contact', endpoint(mails));
    await afterInquiry(page);
    const form = answer(page);
    await form.getByText('Andere', { exact: true }).click();
    await form.getByLabel('Wo genau?').fill('Messe in Köln');
    await form.getByText('Instagram', { exact: true }).click();
    await form.getByText('Andere', { exact: true }).click();
    await expect(form.getByLabel('Wo genau?')).toHaveValue('Messe in Köln');
    await form.getByRole('button', { name: 'Antwort senden' }).click();
    await expect(form.locator(`#${SOURCE_DONE_ID}`)).toBeVisible();
    expect(mails[0]).toContain('quelle: andere\nfreitext: Messe in Köln');
  });

  test('ohne Auswahl: Meldung an der Gruppe, Fokus auf der ersten Antwort, Eingabe nimmt den Fehler zurück', async ({ page }) => {
    let sent = 0;
    await page.route('**/api/contact', (route) => { sent++; return json(route, { ok: true, state: 'sent' }); });
    await afterInquiry(page);
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
    await afterInquiry(page);
    const form = answer(page);
    await form.getByText('LinkedIn', { exact: true }).click();
    await form.getByRole('button', { name: 'Antwort senden' }).click();
    await expect(form.locator(`#${SOURCE_DONE_ID}`)).toBeVisible();
    await expect(form.locator(`#${SOURCE_DONE_ID}`)).toBeFocused();
    await expect(form.locator('fieldset')).toBeHidden();
  });

  test('ohne Versandkonfiguration: kein Dank, Auswahl bleibt, ehrliche Meldung', async ({ page }) => {
    await page.route('**/api/contact', (route) => json(route, { ok: true, state: 'not-configured' }));
    await afterInquiry(page);
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
    await afterInquiry(page);
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
    await afterInquiry(page);
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

  async function fillNative(page: Page) {
    await page.goto('/kontakt/');
    const form = page.locator('#inquiry-form');
    await form.locator('[name=anlass][value=firma]').check({ force: true });
    await form.locator('[name=datum-offen]').check({ force: true });
    await form.locator('[name=ort]').fill('Essen');
    await form.locator('[name=name]').fill('Testperson');
    await form.locator('[name=email]').fill('test@example.test');
    return form;
  }

  for (const path of ['/danke/', `/danke/#${SOURCE_DONE_ID}`]) test(`direkter Aufruf ${path}: Dank und Herkunftsfrage`, async ({ page }) => {
    await page.goto(path);
    await expectThanks(page);
  });

  /** Anfrage ohne JavaScript mit eingerichtetem Versand absenden; die Herkunftsantwort beantwortet `source` */
  async function nativeInquiry(page: Page, mails: string[], redirects: { status: number; location: string }[] = [], source?: (route: Route) => Promise<void>) {
    await page.route(API, (route) => (source && /(^|&)kind=quelle(&|$)/.test(route.request().postData() ?? '') ? source(route) : endpoint(mails, redirects)(route)));
    const form = await fillNative(page);
    await form.locator('[type=submit]').click();
    await expect(page).toHaveURL(/\/danke\/$/);
  }

  test('bestätigte Anfrage über POST: 303 auf die Danke-Seite mit Dank und Herkunftsfrage', async ({ page }) => {
    const mails: string[] = [], redirects: { status: number; location: string }[] = [];
    await nativeInquiry(page, mails, redirects);
    expect(mails).toHaveLength(1);
    expect(redirects).toHaveLength(1);
    expect(redirects[0].status).toBe(303);
    expect(new URL(redirects[0].location).pathname).toBe('/danke/');
    await expectThanks(page);
  });

  test('bestätigte Anfrage über POST auf Englisch: Danke-Seite in der Sprache der Anfrage', async ({ page }) => {
    const mails: string[] = [];
    await page.route(API, endpoint(mails));
    await page.goto('/en/kontakt/');
    const form = page.locator('#inquiry-form');
    await form.locator('[name=anlass][value=firma]').check({ force: true });
    await form.locator('[name=datum-offen]').check({ force: true });
    await form.locator('[name=ort]').fill('Essen');
    await form.locator('[name=name]').fill('Testperson');
    await form.locator('[name=email]').fill('test@example.test');
    await form.locator('[type=submit]').click();
    await expect(page).toHaveURL(/\/en\/danke\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expectThanks(page, 'en');
  });

  test('Anfrage ohne Versandkonfiguration: lesbare Seite statt „erhalten“', async ({ page }) => {
    await page.route('**/api/contact', endpoint());
    const form = await fillNative(page);
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
    await nativeInquiry(page, [], [], (route) => { sent++; return endpoint()(route); });
    const form = page.locator('[data-source-form]');
    await expect(form.locator('[name=quelle]').first()).toHaveAttribute('required', '');
    await form.getByRole('button', { name: 'Antwort senden' }).click();
    expect(await form.evaluate((node: HTMLFormElement) => node.checkValidity())).toBe(false);
    expect(sent).toBe(0);
    // Frische Seite: WebKits nativer Validierungshinweis hält sonst den Knopf „instabil“
    await page.reload();
    await expectThanks(page);
    await form.locator('[name=quelle][value=linkedin]').check({ force: true });
    const response = page.waitForResponse((r) => API(new URL(r.url())) && r.request().method() === 'POST');
    await form.getByRole('button', { name: 'Antwort senden' }).click();
    expect((await response).status()).toBe(503);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(t('thanks.answerNotSent'));
    await expect(page.getByRole('main')).not.toContainText('Danke, das hilft uns sehr!');
    // Zurück zum Formular = zurück auf die Danke-Seite, dort steht die Frage
    await expect(page.getByRole('link', { name: t('contactAPI.backToForm') })).toHaveAttribute('href', '/danke/#danke');
  });

  test('Herkunftsfrage über POST: Freitext nur bei „Andere“ sichtbar, ein Rest aus der vorherigen Wahl wird verworfen, Dank als Antwort des Endpoints', async ({ page }) => {
    const mails: string[] = [];
    await nativeInquiry(page, mails);
    const form = page.locator('[data-source-form]');
    const text = form.getByLabel('Wo genau?');
    await expect(text).toBeHidden();
    await form.locator('[name=quelle][value=andere]').check({ force: true });
    await expect(text).toBeVisible();
    await text.fill('Messe in Köln');
    await form.locator('[name=quelle][value=linkedin]').check({ force: true });
    await expect(text).toBeHidden();
    const response = page.waitForResponse((r) => API(new URL(r.url())) && r.request().method() === 'POST');
    await form.getByRole('button', { name: 'Antwort senden' }).click();
    expect((await response).status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(t('thanks.answerReceived'));
    await expect(page.getByRole('main')).toContainText(t('thanks.answerThanks'));
    await expect(page.getByRole('link', { name: t('contactAPI.toHome') })).toHaveAttribute('href', '/');
    expect(mails).toHaveLength(2); // Anfrage + Herkunftsantwort
    expect(mails[1]).toContain('quelle: linkedin');
    expect(mails[1]).not.toContain('Messe');
  });
});
