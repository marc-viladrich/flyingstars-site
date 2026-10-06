import { test, expect } from '@playwright/test';

test('Anfrage behält Paketauswahl, alle Showdetails und ehrlichen Versandstatus', async ({ page }) => {
  let submitted: string | undefined;
  await page.route('**/api/contact', async (route) => {
    submitted = route.request().postData() || '';
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok:true,state:'not-configured' }) });
  });
  await page.goto('/?paket=HORIZON&drohnen=220#anfrage');
  await expect(page.getByLabel('Drohnen / Paket')).toHaveValue('HORIZON · 200 Drohnen');
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.locator('#anfrage-h').evaluate(node => node.getBoundingClientRect().top)).toBeGreaterThan(70);
  await page.getByRole('button',{name:'Weiter',exact:true}).click();
  await expect(page.getByText('Bitte wähle einen Anlass.')).toBeVisible();
  await page.getByText('Firmenevent',{exact:true}).click();
  await page.getByLabel('Datum (falls schon bekannt)').fill('2026-12-01');
  await page.getByLabel('Ort',{exact:true}).fill('Osnabrück');
  await page.getByRole('button',{name:'Weiter',exact:true}).click();
  await page.getByLabel('Name',{exact:true}).fill('Marc Viladrich');
  await page.getByLabel('E-Mail',{exact:true}).fill('marc@example.test');
  await page.getByLabel('Telefon (optional)').fill('01234');
  await page.getByLabel('Nachricht (optional)').fill('Produktlaunch mit Musik');
  await page.getByRole('button',{name:'Anfrage senden',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Es wurde nichts gesendet oder gespeichert');
  for (const value of ['HORIZON','220','Osnabrück','2026-12-01','Produktlaunch mit Musik','01234']) expect(submitted).toContain(value);
  await expect(page.getByLabel('Name',{exact:true})).toHaveValue('Marc Viladrich');
});

test('Mobiles Menü hält den Fokus und gibt ihn beim Schließen zurück', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  const opener=page.getByRole('button',{name:'Menü öffnen'});
  await opener.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(opener).toBeFocused();
  await opener.click();
  await page.getByRole('dialog').getByRole('link',{name:'Blog',exact:true}).click();
  await expect(page).toHaveURL(/\/blog\/$/);
  await expect(page.getByRole('heading',{level:1})).toHaveText('Blog');
});


test('Neue Paketauswahl entfernt eine zuvor berechnete Drohnenanzahl', async ({page}) => {
  let submitted = '';
  await page.route('**/api/contact', async route => {
    submitted = route.request().postData() || '';
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,state:'not-configured'})});
  });
  await page.goto('/?paket=ODYSSEY&drohnen=1000#anfrage');
  await page.getByLabel('Drohnen / Paket').selectOption('SPARK · 100 Drohnen');
  await page.getByText('Firmenevent',{exact:true}).click();
  await page.getByRole('button',{name:'Weiter',exact:true}).click();
  await expect(page.getByLabel('Name',{exact:true})).toHaveAttribute('maxlength','120');
  await page.getByLabel('Name',{exact:true}).fill('Marc');
  await page.getByLabel('E-Mail',{exact:true}).fill('marc@example.test');
  await page.getByRole('button',{name:'Anfrage senden',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Es wurde nichts gesendet');
  expect(submitted).toContain('SPARK');
  expect(submitted).not.toContain('name="drohnen"');
});

for (const route of ['/drohnenshow-preise/', '/musikalischer-teaser-bokkenrijders/']) {
  test(`Gemeinsame Pausenfunktion hält die Formation an: ${route}`, async ({page}) => {
    await page.goto(route);
    const canvas = page.locator(route.includes('preise') ? '#swarm' : 'canvas[data-formation]');
    await canvas.scrollIntoViewIfNeeded();
    if (!route.includes('preise')) await expect(page.locator('[data-tally]')).toContainText('600 Drohnen');
    const frame = () => canvas.evaluate(node => (node as HTMLCanvasElement).toDataURL());
    await expect.poll(frame).not.toBe(await frame());
    await page.getByRole('button',{name:'Bewegung pausieren',exact:true}).click();
    const stopped = await frame();
    await page.waitForTimeout(250);
    expect(await frame()).toBe(stopped);
    await page.getByRole('button',{name:'Bewegung fortsetzen',exact:true}).click();
    await expect.poll(frame).not.toBe(stopped);
  });
}


test('Porträtlogos behalten ihr Seitenverhältnis nach der Bildoptimierung', async ({page}) => {
  await page.goto('/');
  await page.getByRole('button',{name:'Bewegung pausieren',exact:true}).click();
  await page.locator('.band').scrollIntoViewIfNeeded();
  const nfl = page.locator('.marquee img[alt="NFL"]');
  await expect.poll(()=>nfl.evaluate((node)=>{
    const image=node as HTMLImageElement;
    return image.complete && image.naturalWidth/image.naturalHeight;
  })).toBeGreaterThan(0.65);
  const ratio=await nfl.evaluate(node=>node.getBoundingClientRect().width/node.getBoundingClientRect().height);
  expect(ratio).toBeGreaterThan(0.65);expect(ratio).toBeLessThan(0.8);
});
