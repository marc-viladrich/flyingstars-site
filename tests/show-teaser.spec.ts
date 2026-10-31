import { test, expect, type Page } from '@playwright/test';

// Teaser des Show-Konfigurators (ConfiguratorTeaser.astro, src/scripts/show-teaser.js), Runde 9: ein Showreel, das sich
// selbst abspielt, in drei Abläufen (Prop `reel`: start, marke, hochzeit). Daneben ein reduziertes Wireframe (Paket,
// Regler mit „N Drohnen“, acht Euro-Stufen). Das Logo bzw. die Initialen stehen am Anfang und werden mit mehr Drohnen
// schärfer; die Bühne ist ein Link ohne eigenen Tab-Stopp, der Knopf bleibt der Weg per Tastatur. Keine
// Formularelemente. Lädt erst in der Nähe des Viewports, zeichnet außerhalb nicht, steht bei reduzierter Bewegung.
// TEASER_PATH stellt die Seite ein (Standard: die Prüfseite mit allen drei Abläufen; Startseite: TEASER_PATH=/).
const PAGE = process.env.TEASER_PATH ?? '/poc/konfigurator-teaser/';
const root = (page: Page, sel = '[data-cft-root]') => page.locator(sel).first();
const field = (page: Page, sel?: string) => root(page, sel).locator('[data-cft=field]');
const reach = async (page: Page, sel?: string) => { await root(page, sel).scrollIntoViewIfNeeded(); await expect(root(page, sel)).toHaveAttribute('data-cft-loaded', 'true', { timeout: 20_000 }); };
/** WCAG-Kontrast zweier Farben (sRGB 0–255). */
const contrast = (a: number[], b: number[]) => { const L = (c: number[]) => { const [r, g, bl] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * bl; }; const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const on = (page: Page, id: string, sel?: string) => root(page, sel).locator(`[data-cft=pkg][data-id=${id}]`);

test('Der Teaser lädt erst in der Nähe des Viewports', async ({ page }) => {
  await page.goto(PAGE);
  const far = await root(page).evaluate((el) => el.getBoundingClientRect().top - innerHeight);
  test.skip(far < 400, 'Der Teaser steht auf dieser Seite schon im ersten Blick.');
  await page.waitForTimeout(800);
  await expect(root(page)).not.toHaveAttribute('data-cft-ready', 'true');
  await reach(page);
});

test('Das Mockup ist Dekoration: keine Formularelemente, nur der Knopf als Tab-Stopp, die Bühne als Link ohne eigenen Tab-Stopp', async ({ page }) => {
  await page.goto(PAGE);
  const r = root(page);
  await expect(r.locator('input, button, select, textarea')).toHaveCount(0);
  await expect(r.locator('.cft-pill')).toHaveCount(0); // Runde 9: Anlass-Pills ersatzlos raus
  await expect(r.locator('.cft-label')).toHaveText('Paket');
  await expect(r.locator('[data-cft=euro]')).toHaveCount(8);
  await expect(r.locator('.cft-count')).toContainText('Drohnen');
  await expect(r.locator('a:not([tabindex="-1"])')).toHaveCount(1);
  await expect(r.locator('a.cft-cta')).toHaveText('Show selbst zusammenstellen');
  await expect(r.locator('a.cft-cta')).toHaveAttribute('href', '/drohnenshow-preise/#konfigurator');
  await expect(r.locator('a.cft-hit')).toHaveAttribute('href', '/drohnenshow-preise/#konfigurator');
  await expect(r.locator('a.cft-hit')).toHaveAttribute('aria-hidden', 'true');
  await expect(r.locator('.cft-mock')).toHaveAttribute('aria-hidden', 'true');
  await expect(r.locator('[role=img]')).toHaveAttribute('aria-label', /Drohnenshow/);
});

test('Start: erst das Logo mit wachsender Drohnenzahl, dann das Herz über die drei Pakete; jede Drohnenzahl hat ihre Euro-Stufe', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(PAGE);
  await reach(page);
  const r = root(page), count = r.locator('[data-cft=count]'), note = r.locator('[data-cft=note]');
  // Stufen mitschreiben: Drohnenzahl → Euro-Zeichen
  await page.evaluate(() => {
    const el = document.querySelector('[data-cft-root]')!, c = el.querySelector('[data-cft=count]')!, w = window as unknown as { __steps: [string, number][] };
    const take = () => w.__steps.push([c.textContent ?? '', el.querySelectorAll('[data-cft=euro].is-on').length]);
    w.__steps = []; take(); new MutationObserver(take).observe(el, { subtree: true, attributes: true, attributeFilter: ['class'] });
  });
  await expect(note).toHaveClass(/is-on/);
  await expect(note).toHaveText('Platz für euer Logo');
  await expect(count).toHaveText('300', { timeout: 15_000 });
  await expect(count).toHaveText('600', { timeout: 15_000 });
  await expect(on(page, 'SPARK')).toHaveClass(/is-on/, { timeout: 15_000 }); // das Herz in 2D
  await expect(note).not.toHaveClass(/is-on/);
  await expect(count).toHaveText('200', { timeout: 10_000 }); // der Herztunnel
  await expect(on(page, 'HORIZON')).toHaveClass(/is-on/);
  await expect(count).toHaveText('300', { timeout: 10_000 }); // Amors Pfeil in 3D, dann der QR-Code
  await expect(on(page, 'ODYSSEY')).toHaveClass(/is-on/);
  await expect(count).toHaveText('450', { timeout: 20_000 }); // Rakete und Mondlandung
  await expect(count).toHaveText('600', { timeout: 20_000 }); // Bokkenrijders
  const steps = await page.evaluate(() => (window as unknown as { __steps: [string, number][] }).__steps);
  const level = new Map<number, Set<number>>();
  for (const [n, e] of steps) if (e) { if (!level.has(+n)) level.set(+n, new Set()); level.get(+n)!.add(e); }
  const sorted = [...level.keys()].sort((a, b) => a - b), euro = sorted.map((n) => Math.max(...level.get(n)!));
  expect(sorted).toEqual([100, 200, 300, 450, 600]);
  for (let i = 1; i < euro.length; i++) expect(euro[i], `${sorted[i]} Drohnen`).toBeGreaterThan(euro[i - 1]);
  expect(euro.at(-1)).toBe(8);
  expect(errors).toEqual([]);
});

test('Nicht gewählte Pakete behalten ihre Farbe, gedämpft und mit mindestens 4,5:1 Kontrast', async ({ page }) => {
  await page.goto(PAGE);
  const colours = await root(page).locator('[data-cft=pkg]:not(.is-on)').evaluateAll((els) => els.map((el) => getComputedStyle(el).color));
  expect(colours).toHaveLength(2);
  for (const c of colours) {
    const [r, g, b] = (c.match(/[\d.]+/g) ?? []).map(Number).slice(0, 3).map((v) => (c.startsWith('color(') ? v * 255 : v)); // color-mix kommt als color(srgb 0–1)
    expect(Math.max(r, g, b) - Math.min(r, g, b), `${c} ist farbig, nicht grau`).toBeGreaterThan(30);
    expect(contrast([r, g, b], [19, 17, 16]), `${c} auf der Karte`).toBeGreaterThanOrEqual(4.5);
  }
});

test('Beim Zeigen auf die Bühne erscheint „Eigene Show zusammenstellen“, ein Klick führt in den Konfigurator; auch der Fokus auf dem Knopf zeigt es', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('mobile'), 'Zeigen gibt es nur mit Maus.');
  await page.goto(PAGE);
  await reach(page);
  const hit = root(page).locator('a.cft-hit');
  await expect(hit).toHaveCSS('opacity', '0');
  await root(page).locator('.cft-stage').hover();
  await expect(hit).toHaveCSS('opacity', '1');
  await expect(hit).toContainText('Eigene Show zusammenstellen');
  await page.mouse.move(0, 0);
  await expect(hit).toHaveCSS('opacity', '0');
  await root(page).locator('a.cft-cta').focus(); // Tastatur: der Knopf ist der Tab-Stopp (WebKit springt per Tab nur mit Einstellung auf Links)
  await expect(hit).toHaveCSS('opacity', '1');
  await root(page).locator('.cft-stage').click();
  await expect(page).toHaveURL(/\/drohnenshow-preise\/#konfigurator$/);
});

test('Abläufe für die Landingpages: „marke“ beginnt mit dem Logo, „hochzeit“ mit Initialen im Herz', async ({ page }) => {
  test.skip(!PAGE.includes('/poc/'), 'Die Abläufe stehen nur auf der Prüfseite nebeneinander.');
  test.setTimeout(60_000);
  await page.goto(PAGE);
  for (const [sel, note] of [['#cft-marke', 'Platz für euer Logo'], ['#cft-hochzeit', 'Eure Initialen']] as const) {
    await reach(page, sel);
    await expect(root(page, sel)).toHaveAttribute('data-reel', sel.replace('#cft-', ''));
    await expect(root(page, sel).locator('[data-cft=note]')).toContainText(note);
    await expect(root(page, sel).locator('[data-cft=count]')).toHaveText('300', { timeout: 15_000 });
    await expect(on(page, 'ODYSSEY', sel)).toHaveClass(/is-on/);
  }
});

test('Außerhalb des Viewports zeichnet die Engine nicht, bei reduzierter Bewegung steht die Bokkenrijders-Maske in Ruhe', async ({ page }) => {
  await page.goto(PAGE);
  await reach(page);
  await expect(field(page)).toHaveAttribute('data-running', 'true');
  await page.evaluate(() => scrollTo(0, 0));
  await expect(field(page)).toHaveAttribute('data-running', 'false');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await reach(page);
  await page.waitForTimeout(500);
  await expect(field(page)).toHaveAttribute('data-running', 'false');
  await expect(on(page, 'ODYSSEY')).toHaveClass(/is-on/);
  expect(Number(await field(page).getAttribute('data-points'))).toBe(600);
});
