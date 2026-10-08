import { test, expect } from '@playwright/test';

test('Preisrechner behält Paketgrenzen, aufgerundete Aufpreise und Anfrageauswahl bei', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/drohnenshow-preise/');
  const slider = page.getByRole('slider', { name: 'Anzahl Drohnen' });
  const total = page.locator('#total');
  const request = page.locator('#calc-cta');
  for (const [drones, price, pkg] of [
    [100, '7.900', 'SPARK'], [150, '12.400', 'SPARK'],
    [160, '15.900', 'HORIZON'], [210, '20.800', 'HORIZON'],
    [300, '34.900', 'ODYSSEY'], [1000, '104.200', 'ODYSSEY'],
  ] as const) {
    await slider.fill(String(drones));
    await expect(total).toContainText(`ab ${price} €`);
    await expect(request).toHaveAttribute('href', `/?paket=${pkg}&drohnen=${drones}#anfrage`);
    await expect(page.locator(`[data-tier="${pkg}"]`)).toHaveAttribute('aria-pressed', 'true');
  }
  await page.locator('[data-tier="HORIZON"]').click();
  await expect(slider).toHaveValue('1000');
  await expect(total).toContainText('ab 94.300 €');
  await expect(request).toHaveAttribute('href', '/?paket=HORIZON&drohnen=1000#anfrage');
  await page.locator('[data-tier="SPARK"]').click();
  await expect(slider).toHaveValue('150');
  await expect(total).toContainText('ab 12.400 €');
  await expect(request).toHaveAttribute('href', '/?paket=SPARK&drohnen=150#anfrage');
  expect(errors).toEqual([]);
});

test('Eigener Text lädt den lokalen Formationsplaner und passt die Mindestzahl an', async ({ page }) => {
  const errors: string[] = [];
  const remoteRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (new URL(request.url()).hostname !== '127.0.0.1') remoteRequests.push(request.url());
  });
  await page.goto('/drohnenshow-preise/');
  await page.getByRole('slider', { name: 'Anzahl Drohnen' }).fill('100');
  await page.getByLabel('Dein Text am Himmel').fill('FLYINGSTARS FLYINGSTARS');
  await expect(page.getByRole('slider', { name: 'Anzahl Drohnen' })).toHaveValue('220');
  await expect(page.locator('#text-read')).toContainText('Einstrich-Schrift', { timeout: 15_000 });
  await expect(page.locator('#calc-read')).toContainText('Motivgröße');
  await expect(page.locator('#calc-cta')).toHaveAttribute('href', '/?paket=HORIZON&drohnen=220&text=FLYINGSTARS+FLYINGSTARS#anfrage');
  await page.getByLabel('Dein Text am Himmel').fill('');
  await expect(page.locator('#text-read')).toHaveText('Wir zeigen ihn mit deiner Drohnenzahl in unserer Show-Schrift.');
  expect(errors).toEqual([]);
  expect(remoteRequests).toEqual([]);
});

test('Animation ist pausierbar und der Rechner funktioniert mit reduzierter Bewegung', async ({ page }) => {
  await page.goto('/drohnenshow-preise/');
  const pause = page.locator('#swarm-motion');
  await pause.click();
  await expect(pause).toHaveText('Animation fortsetzen');
  await expect(pause).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('slider', { name: 'Anzahl Drohnen' }).fill('1000');
  await expect(page.locator('#total')).toContainText('104.200 €');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(pause).toHaveText('Animation reduziert');
  await expect(pause).toBeDisabled();
  await page.getByRole('slider', { name: 'Anzahl Drohnen' }).fill('100');
  await expect(page.locator('#total')).toContainText('7.900 €');
});
