import { test, expect } from '@playwright/test';

// Pricing page (30.10.2026): three package cards, the live preview, what every package includes, the comparison,
// extras and price questions. Prices come from show-packages.ts; facts follow the FlyingStars questionnaire of
// 21.10.2026 (no duration per package, 40 % deposit, AGB cancellation scale). The preview has its own tests in
// show-configurator.spec.ts.

const CARDS = [
  ['SPARK', 'ab 7.900 €', '100 Drohnen', '+900 € je 10 Drohnen, bis 150 Drohnen'],
  ['HORIZON', 'ab 15.900 €', '200 Drohnen', '+4.900 € je 50 Drohnen'],
  ['ODYSSEY', 'ab 34.900 €', '300 Drohnen', '+9.900 € je 100 Drohnen'],
] as const;

test('Paketkarten zeigen Preis, Umfang, Aufpreis und zwei klare Wege weiter', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/drohnenshow-preise/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Was eine Drohnenshow kostet.');
  const cards = page.locator('#pakete article');
  await expect(cards).toHaveCount(3);
  for (const [i, [name, price, drones, more]] of CARDS.entries()) {
    const card = cards.nth(i);
    await expect(card.getByRole('heading', { level: 2 })).toHaveText(name);
    await expect(card).toContainText(price);
    await expect(card).toContainText(drones);
    await expect(card).toContainText(more);
    for (const label of ['Am Himmel', 'Betreuung', 'Mehr Drohnen', 'Typisch für']) await expect(card.locator('dt', { hasText: label })).toHaveCount(1);
    await expect(card.getByRole('link', { name: `Mit ${name} anfragen` })).toHaveAttribute('href', `/kontakt/?paket=${name}&quelle=preise-karte`);
    await expect(card.getByRole('link', { name: `${name} in der Vorschau ansehen` })).toHaveAttribute('href', `/drohnenshow-preise/?paket=${name}#vorschau`);
    const height = await card.getByRole('link', { name: `Mit ${name} anfragen` }).evaluate((node) => node.getBoundingClientRect().height);
    expect(height).toBeGreaterThanOrEqual(44);
  }
  // only the claim FlyingStars confirmed ("Am häufigsten verkaufen wir Horizon"), no badges, no price promise
  await expect(page.getByText('Am häufigsten gebucht', { exact: true })).toHaveCount(1);
  await expect(cards.nth(1)).toContainText('Am häufigsten gebucht');
  await expect(page.locator('body')).not.toContainText('Bestseller');
  await expect(page.locator('body')).not.toContainText('Preisversprechen');
  await expect(page.locator('body')).not.toContainText('Zufriedenheitsgarantie');
  // no duration per package: one line for all of them
  await expect(page.getByText('Eine Show dauert in der Regel ca. 13 Minuten, bis 25 Minuten sind möglich. Das gilt für jedes Paket.')).toBeVisible();
  await expect(page.locator('#pakete .pk-grid')).not.toContainText(/Min\b|Minuten/); // "ca. 10 Min", "15+ Min" were package durations
  // the drone slider is gone
  await expect(page.getByRole('slider')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Vergleich, Zusätze und Abschluss mit bestätigten Zahlen', async ({ page }) => {
  await page.goto('/drohnenshow-preise/');
  const table = page.locator('#leistungen table');
  for (const [name, price] of CARDS.map(([n, p]) => [n, p])) await expect(table.locator('thead th', { hasText: name })).toContainText(price);
  for (const row of ['Drohnen', 'Dauer', 'Design und Motive', 'Eigene Elemente', '3D', 'Storytelling', 'Musik', 'Freigabe und Vorschau', 'Kreativ-Workshop', 'Genehmigung', 'Hilfe bei der Zustimmung der Grundstückseigentümer*innen', 'Eigene Projektleitung', 'Video der Show (Rohaufnahmen)', 'Vor-Ort-Termin vorab']) {
    await expect(table.getByRole('rowheader', { name: row, exact: true })).toHaveCount(1);
  }
  await expect(table.getByRole('row', { name: /^Dauer/ })).toContainText('In der Regel ca. 13 Minuten, bis 25 Minuten möglich');
  await expect(table.getByRole('row', { name: /^Video der Show/ }).locator('td').nth(2)).toHaveText('Inklusive');
  const extras = page.locator('#zusaetze');
  await expect(extras).toContainText('Aufpreis nach Aufwand');
  await expect(extras).toContainText('900 €, bei ODYSSEY inklusive');
  await expect(extras).toContainText('+1.900 € netto');
  await expect(extras).toContainText('ab ca. 15.000 € netto für 20 Drohnen');
  await expect(extras.getByRole('link', { name: 'Mehr zu Indoor-Shows' })).toHaveAttribute('href', '/drohnenshow-indoor/');
  await expect(page.getByRole('link', { name: 'Paket vorschlagen lassen' }).last()).toHaveAttribute('href', '/kontakt/?paket=beraten');
});

test('Fragen zum Preis: Anzahlung, Ausfall und Ausland nach Fragebogen, als Akkordeon und JSON-LD', async ({ page }) => {
  await page.goto('/drohnenshow-preise/');
  const faq = page.locator('#faq');
  const open = async (q: string) => { const d = faq.locator('details', { has: page.getByText(q, { exact: true }) }); if (!(await d.getAttribute('open') !== null)) await d.locator('summary').click(); return d; };
  await expect(await open('Wie funktioniert die Bezahlung?')).toContainText('Anzahlung von 40 %');
  const cancel = await open('Was passiert, wenn die Show ausfällt?');
  await expect(cancel).toContainText('solange unser Team die Anfahrt noch nicht angetreten hat');
  await expect(cancel).toContainText('40, 60, 80 oder 95 %');
  await expect(await open('Kostet eine Show im Ausland mehr?')).toContainText('4 bis 8 Wochen');
  await expect(await open('Geht es größer als 300 Drohnen?')).toContainText('600 Drohnen');
  await expect(page.locator('main')).not.toContainText('30 %');
  const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').first().textContent() ?? '{}');
  expect(ld['@type']).toBe('FAQPage');
  const visible = await faq.locator('summary').allTextContents();
  expect(ld.mainEntity.map((q: { name: string }) => q.name)).toEqual(visible);
});

test('Die alte Konfigurator-Adresse leitet auf die Vorschau und wird nicht indexiert', async ({ page, request }) => {
  const html = await (await request.get('/show-konfigurator/')).text();
  expect(html).toContain('<meta name="robots" content="noindex">');
  expect(html).toMatch(/http-equiv="refresh" content="0; url=\/drohnenshow-preise\/#vorschau"/);
  await page.goto('/show-konfigurator/');
  await expect(page).toHaveURL(/\/drohnenshow-preise\/#vorschau$/);
});
