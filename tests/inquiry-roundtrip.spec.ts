import {test,expect} from '@playwright/test';
import {onRequestPost} from '../functions/api/contact';
import { money } from '../src/lib/price-core.mjs';

test.use({reducedMotion:'reduce'});

const labels = {
 de: {individual:'Eure 3D+-Show · ab 300 Drohnen', from:'ab', art:'Art der Show:'},
 en: {individual:'Your 3D+ show · from 300 drones', from:'from', art:'Type of show:'},
 nl: {individual:'Jullie 3D+-show · vanaf 300 drones', from:'vanaf', art:'Soort show:'},
} as const;
for (const locale of ['de', 'en', 'nl'] as const) {
 const prefix = locale === 'de' ? '' : `/${locale}`;
 const pricing = `${prefix}/drohnenshow-preise/`;
 test(`${locale}: Festpaket anpassen, Show-Art und Extras bis ins Preisformular übernehmen`, async ({page, isMobile}) => {
  await page.goto(pricing);
  if (isMobile) await page.locator('#pakete .mtabs').getByText('SPARK', {exact:true}).click();
  await page.locator('[data-cfg-preset=SPARK]').press('Enter');
  await expect(page).toHaveURL(url => url.searchParams.get('paket') === 'SPARK' && url.hash === '#konfigurator');
  await expect(page.locator('#cfg-pkg')).toHaveText('SPARK');
  await expect(page.locator('#cfg-price')).toHaveText(money(7900, locale));

  for (const [art, drones, amount] of [['3d', 200, 15900], ['story', 300, 34900], ['2d', 100, 7900], ['story', 300, 34900]] as const) {
   await page.locator(`#cfg-arts label[data-art="${art}"]`).click();
   await expect(page.locator('#cfg-arts input:checked')).toHaveValue(art);
   await expect(page.locator('#cfg-drones')).toHaveValue(String(drones));
   await expect(page.locator('#cfg-price')).toHaveText(`${labels[locale].from} ${money(amount, locale)}`);
  }
  await expect(page.locator('#cfg-pkg')).toHaveText(labels[locale].individual);
  await expect(page).toHaveURL(url => !url.searchParams.has('paket'));

  await page.locator('[data-occasion=hochzeit]').click();
  await page.locator('#cfg-up-toggle').click();
  await page.locator('#cfg-upgrades label:has([value=film])').click();
  await expect(page.locator('#x-film')).toBeChecked();
  await page.locator('.xc', {has:page.locator('#x-express')}).click();
  await expect(page.locator('#cfg-upgrades [value=express]')).toBeChecked();
  await expect(page.locator('#cfg-price')).toHaveText(`${labels[locale].from} ${money(35800, locale)}`);

  const skyText = 'Müller & Söhne + 50% #?';
  const input = page.locator('#cfg-text');
  await input.fill(skyText);
  await input.press('Enter');
  const cta = page.locator('#cfg-cta');
  await expect.poll(async () => new URL((await cta.getAttribute('href'))!, page.url()).searchParams.get('show')).toContain(skyText);
  const url = new URL((await cta.getAttribute('href'))!, page.url());
  expect(url.pathname).toBe(pricing);
  expect(url.hash).toBe('#anfrage');
  expect(url.searchParams.has('paket')).toBe(false);
  await cta.click();

  const form = page.locator('#inquiry-form');
  await expect(page).toHaveURL(next => next.pathname === pricing && next.hash === '#anfrage' && !next.searchParams.has('show'));
  await expect(form.locator('[name=anlass][value=privat]')).toBeChecked();
  await expect(form.locator('[name=drohnen]')).toHaveValue('300');
  await expect(form.locator('[name=extras][value=film]')).toBeChecked();
  await expect(form.locator('[name=extras][value=express]')).toBeChecked();
  const draft = await form.locator('[name=message]').inputValue();
  expect(draft).toContain(labels[locale].art);
  expect(draft).toContain(skyText);
 });
 test.describe('ohne JavaScript', () => {
  test.use({javaScriptEnabled:false});

  test(`${locale}: Paketlink und native Formularabgabe ohne eingerichteten Versand`, async ({page, isMobile}) => {
   let submitted: URLSearchParams | undefined;
   await page.route('**/api/contact', async route => {
    const request = route.request();
    const body = request.postData() ?? '';
    submitted = new URLSearchParams(body);
    const response = await onRequestPost({
     request: new Request(request.url(), {method:request.method(), headers:await request.allHeaders(), body}),
     env: {},
    });
    await route.fulfill({
     status: response.status,
     headers: Object.fromEntries(response.headers),
     body: await response.text(),
    });
   });

   await page.goto(pricing, {waitUntil:'domcontentloaded'});
   if (isMobile) await page.locator('#pakete .mtabs').getByText('SPARK', {exact:true}).click();
   await page.locator('#pakete [data-pick-paket=SPARK]').press('Enter');
   await expect(page).toHaveURL(url => url.pathname === pricing && url.searchParams.get('paket') === 'SPARK' && url.hash === '#anfrage');

   const form = page.locator('#inquiry-form');
   for (const selector of ['[name=anlass][value=unternehmen]', '[name=paket][value=SPARK]', '[name=datum-offen]']) {
    const option = form.locator(selector);
    await option.press('Space');
    await expect(option).toBeChecked();
   }
   await form.locator('[name=ort]').fill('Köln & Düsseldorf');
   await form.locator('[name=name]').fill('Müller & Söhne');
   await form.locator('[name=email]').fill('test@example.test');
   await form.locator('[name=message]').fill('Eine Show + Musik, 50% Herzen <3');

   const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/contact' && r.request().method() === 'POST');
   await form.locator('[type=submit]').press('Enter');
   expect((await response).status()).toBe(503);
   await expect(page).toHaveURL(url => url.pathname === '/api/contact');
   await expect(page.locator('html')).toHaveAttribute('lang', locale);
   await expect(page.getByRole('main').locator('[data-status="503"]')).toBeVisible();
   await expect(page.getByRole('main').locator(`a[href="${pricing}#anfrage"]`)).toBeVisible();
   expect(submitted?.get('locale')).toBe(locale);
   expect(submitted?.get('name')).toBe('Müller & Söhne');
   expect(submitted?.get('ort')).toBe('Köln & Düsseldorf');
   expect(submitted?.get('message')).toBe('Eine Show + Musik, 50% Herzen <3');
   expect(submitted?.get('paket')).toBe('SPARK');
   expect(submitted?.has('form-duration')).toBe(false);
  });
 });
}
