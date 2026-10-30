import { test, expect, type Page } from '@playwright/test';

// Live preview on the pricing page (configurator v13, 30.10.2026): Anlass plays a sequence of four or five motifs, three
// package buttons pick the package; switching the package turns the motif on stage into its version for that package.
// Shape counts and the data model are unit-tested in scripts/show-geometry.test.mjs, the motion in
// tests/show-physics.spec.ts. /show-konfigurator/ only redirects here.
const PAGE = '/drohnenshow-preise/#vorschau';
const at = (query: string) => `/drohnenshow-preise/?${query}#vorschau`;

const OCCASIONS = ['hochzeit', 'jubilaeum', 'launch', 'kultur', 'silvester', 'festival'];
const STEPS = [['SPARK', '7.900', '100'], ['HORIZON', '15.900', '200'], ['ODYSSEY', '34.900', '300']] as const;
const occasion = (page: Page, id: string) => page.locator(`label:has([name=occasion][value=${id}])`).click();
const pkg = (page: Page, k: number) => page.locator(`label:has([name=pkg][value="${k}"])`).click();
const scene = (page: Page) => page.locator('#cfg-scene');
/** Captions of all pictures of the running show, stepping with › until the first comes back. */
const walk = async (page: Page) => {
  const first = await scene(page).textContent(), seen: { caption: string; points: string | null }[] = [];
  for (let i = 0; i < 30; i++) {
    seen.push({ caption: (await scene(page).textContent()) ?? '', points: await field(page).getAttribute('data-points') });
    await page.locator('#cfg-next').click();
    if (await scene(page).textContent() === first) break;
  }
  return seen;
};
const paused = (page: Page) => page.addInitScript(() => sessionStorage.setItem('flyingstars:motion', 'paused'));
const field = (page: Page) => page.locator('#cfg-field');
/** Width of the lit drone picture in canvas pixels; area: width × height of its bounding box. */
const picture = (page: Page) => field(page).evaluate((node) => {
  const c = node as HTMLCanvasElement, d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, x1 = 0, y0 = c.height, y1 = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 60) { const p = (i - 3) / 4, x = p % c.width, y = Math.floor(p / c.width); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { width: x1 - x0, area: Math.max(0, x1 - x0) * Math.max(0, y1 - y0) };
});
const pictureWidth = async (page: Page) => (await picture(page)).width;

test('Preis nur über den Aufwand; jeder Anlass zeigt drei Motive, jedes Bild mit genau den Drohnen des Pakets', async ({ page }, info) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await paused(page);
  await page.goto(PAGE);
  await expect(page.locator('#cfg-motifs')).toHaveCount(0); // motifs are not chosen, they play
  const singles = new Set<string>();
  for (const id of OCCASIONS) {
    await occasion(page, id);
    for (const [k, [name, price, drones]] of STEPS.entries()) {
      await pkg(page, k);
      await expect(page.locator('#cfg-pkg')).toHaveText(name);
      await expect(page.locator('#cfg-price')).toHaveText(`ab ${price} €`);
      await expect(page.locator('#cfg-new')).toHaveText(name);
      if (info.project.name !== 'desktop') continue;
      const seen = await walk(page);
      expect(seen.every((s) => s.points === drones), `${id} ${name}: every picture has ${drones} drones`).toBe(true);
      if (k < 2) { expect(seen.length, `${id} ${name}: three motifs or more`).toBeGreaterThanOrEqual(3); seen.forEach((s) => singles.add(s.caption)); }
      else expect(seen.length, `${id} ODYSSEY tells every motif in acts`).toBeGreaterThanOrEqual(8);
    }
  }
  if (info.project.name === 'desktop') expect(singles.size).toBeGreaterThanOrEqual(OCCASIONS.length * 3 * 2 - 1); // own versions per package
  expect(errors).toEqual([]);
});

test('Der Anlass ändert weder Paket noch Preis', async ({ page }) => {
  await page.goto(PAGE);
  await pkg(page, 2);
  for (const id of OCCASIONS) {
    await occasion(page, id);
    await expect(page.locator('label:has([name=pkg][value="2"]) input')).toBeChecked();
    await expect(page.locator('#cfg-price')).toHaveText('ab 34.900 €');
  }
});

test('Die Motive laufen von selbst durch, ein Paketwechsel bleibt beim Motiv', async ({ page }) => {
  await page.goto(PAGE);
  await occasion(page, 'launch'); await pkg(page, 0);
  await expect(scene(page)).toHaveText('Eine Glühbirne: die Idee');
  await expect(scene(page)).toHaveText('QR-Code mit „Scan me“', { timeout: 15_000 }); // the show moves on by itself
  await pkg(page, 1);
  await expect(scene(page)).toHaveText('Ein Lichtstrahl scannt, der QR-Code baut sich auf'); // same motif, next package
  await pkg(page, 2);
  await expect(page.locator('#cfg-acts')).toBeVisible(); // its story starts
  await expect(scene(page)).not.toHaveText('Ein Lichtstrahl scannt, der QR-Code baut sich auf');
});

test('Dasselbe Motiv wird mit dem Paket größer', async ({ page }) => {
  await paused(page);
  await page.goto(PAGE);
  await occasion(page, 'jubilaeum');
  const areas: number[] = [];
  for (const k of [0, 2]) {
    await pkg(page, k);
    await expect(scene(page)).toHaveText(k === 0 ? 'Wappen mit Stern und wehender Fahne' : '…mit Krone und kreisendem Sternenkranz');
    await page.waitForTimeout(300);
    areas.push((await picture(page)).area);
  }
  expect(areas[1] / areas[0]).toBeGreaterThan(1.5); // three times the drones at the same spacing: a larger picture
});

test('Jedes Paket bewegt sich nach dem Aufbau weiter', async ({ page }) => {
  await page.goto(PAGE);
  await occasion(page, 'launch');
  const frame = () => field(page).evaluate((c) => (c as HTMLCanvasElement).toDataURL());
  for (const [k, caption] of [[0, 'Eine Glühbirne: die Idee'], [1, 'Die Glühbirne in 3D, der Glühfaden leuchtet']] as const) {
    await pkg(page, k);
    await expect(scene(page)).toHaveText(caption);
    await page.waitForTimeout(2500);
    await expect(field(page)).toHaveAttribute('data-running', 'true');
    const before = await frame(); await page.waitForTimeout(400);
    expect(await frame()).not.toBe(before);
  }
});

test('ODYSSEY erzählt jedes Motiv in Akten, ↻ beginnt die Show von vorn', async ({ page }) => {
  await page.goto(PAGE);
  await occasion(page, 'launch'); await pkg(page, 2);
  await expect(scene(page)).toHaveText('Ein Funke');
  await expect(scene(page)).toHaveText('um ihn formt sich die Glühbirne', { timeout: 20_000 });
  await page.locator('#cfg-replay').click();
  await expect(scene(page)).toHaveText('Ein Funke');
});

test('Paketknöpfe lassen sich per Tastatur wählen', async ({ page }) => {
  await paused(page);
  await page.goto(PAGE);
  await page.locator('label:has([name=pkg][value="1"]) input').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('label:has([name=pkg][value="2"]) input')).toBeChecked();
  await expect(page.locator('#cfg-pkg')).toHaveText('ODYSSEY');
  await expect.poll(() => pictureWidth(page)).toBeGreaterThan(100);
});

test('Aus der Paketkarte in die Vorschau: Paket gewählt, Bühne, Preis und Anfrage im Blick', async ({ page }, info) => {
  await page.goto('/drohnenshow-preise/');
  await page.getByRole('link', { name: 'ODYSSEY in der Vorschau ansehen' }).click();
  await expect(page.locator('label:has([name=pkg][value="2"]) input')).toBeChecked();
  await expect(page.locator('label:has([name=pkg][value="2"]) input')).toBeFocused();
  await expect(page.locator('#cfg-price')).toHaveText('ab 34.900 €');
  await expect(page.locator('#cfg-new')).toHaveText('ODYSSEY');
  await expect(page).toHaveURL(/\/drohnenshow-preise\/$/); // no reload
  await expect(page.locator('.cfg-stage')).toBeInViewport({ ratio: 0.9 });
  await expect(page.locator('.cfg-pkgs')).toBeInViewport({ ratio: 1 });
  if (info.project.name === 'mobile') await expect(page.locator('#cfg-bar-cta')).toBeInViewport();
  else await expect(page.locator('#cfg-cta')).toBeInViewport({ ratio: 1 });
});

test('Die Anfrage übernimmt Anlass, Motive und Paket', async ({ page }) => {
  await page.goto(PAGE);
  await occasion(page, 'launch');
  await pkg(page, 0);
  await expect(page.locator('#cfg-cta')).toHaveAttribute('href', /^\/kontakt\/\?paket=SPARK&drohnen=100&anlass=firma&quelle=preise-vorschau&show=/);
  await page.locator('#cfg-cta').click();
  await expect(page).toHaveURL(/\/kontakt\/\?/);
  const form = page.locator('#inquiry-form');
  await expect(form.locator('[name=paket]')).toHaveValue(/SPARK/);
  await expect(form.locator('[name=anlass][value=firma]')).toBeChecked();
  await expect(form.locator('[name=message]')).toHaveValue('Anlass: Launch\nBeispielmotive: Glühbirne, QR-Code, Rakete, Spirale, Logo\nPaket: SPARK, Klassisch in 2D (ab 7.900 € netto zzgl. Anfahrt, Einstiegspreis)');
});

test('Nach schnellem Umschalten leuchten nie mehr Drohnen, als das Paket hat', async ({ page }) => {
  await page.goto(PAGE);
  await occasion(page, 'kultur'); await pkg(page, 2); await page.waitForTimeout(400);
  for (const [id, k] of [['silvester', 0], ['launch', 1], ['hochzeit', 0], ['jubilaeum', 1]] as const) {
    await occasion(page, id); await pkg(page, k); await page.waitForTimeout(250);
  }
  await page.waitForTimeout(6500); // every landing drone has landed
  const [lit, points] = await field(page).evaluate((c) => [Number(c.dataset.lit), Number(c.dataset.points)]);
  expect(points).toBe(200);
  expect(lit).toBeLessThanOrEqual(points);
});

test('Die Bilder lassen sich vor und zurück schalten, im Kreis', async ({ page }) => {
  await paused(page);
  await page.goto(PAGE);
  await occasion(page, 'launch'); await pkg(page, 0);
  await expect(scene(page)).toHaveText('Eine Glühbirne: die Idee');
  await page.locator('#cfg-prev').click(); // before the first picture comes the last one
  await expect(scene(page)).toHaveText('Beispiel-Logo mit Lichtlauf');
  await page.locator('#cfg-next').click(); // after the last picture comes the first one
  await expect(scene(page)).toHaveText('Eine Glühbirne: die Idee');
  await page.locator('#cfg-next').click();
  await page.locator('#cfg-next').click();
  await expect(scene(page)).toHaveText('Rakete mit Flamme');
  await pkg(page, 2);
  await expect(scene(page)).toHaveText('…und landet auf dem Mond. Flagge gehisst!'); // paused: the motif's story at rest
  await page.locator('#cfg-prev').click();
  await expect(scene(page)).toHaveText('im Orbit um einen Planeten');
});

test('Eigener Text erscheint sofort als Finale, in drei Schriften und in der Anfrage', async ({ page }) => {
  const errors: string[] = [], remote: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (new URL(request.url()).hostname !== '127.0.0.1') remote.push(request.url()); });
  await page.goto(PAGE);
  await occasion(page, 'hochzeit'); await pkg(page, 0);
  await expect(page.locator('#cfg-text')).toBeHidden(); // first view: occasion, package, price, inquiry
  await page.getByText('Euren Text hinzufügen (ohne Aufpreis)').click();
  await expect(page.locator('#cfg-styles')).toBeHidden();
  await page.locator('#cfg-text').fill('Anna & Ben');
  await expect(scene(page)).toHaveText('Euer Text am Himmel');
  await expect(field(page)).toHaveAttribute('data-points', '100');
  await expect(page.locator('#cfg-styles')).toBeVisible();
  for (const style of ['print', 'initials', 'script']) {
    await page.locator(`label:has([name=textstyle][value=${style}])`).click();
    await expect(scene(page)).toHaveText('Euer Text am Himmel');
  }
  await pkg(page, 1);
  await expect(scene(page)).toHaveText('Licht schreibt euren Text'); // the package switch stays on the text
  await expect(field(page)).toHaveAttribute('data-points', '200');
  await expect(page.locator('#cfg-cta')).toHaveAttribute('href', /Eigener\+Text%3A\+%E2%80%9EAnna\+%26\+Ben%E2%80%9C\+%28Schreibschrift%29/);
  await page.locator('#cfg-text').fill('');
  await expect(page.locator('#cfg-styles')).toBeHidden();
  await expect(page.locator('#cfg-cta')).not.toHaveAttribute('href', /Eigener/);
  expect(errors).toEqual([]);
  expect(remote).toEqual([]); // fonts and text planner are local
});

test('Direktlink öffnet Anlass, Paket und Motiv, auch über die alte Konfigurator-Adresse', async ({ page }) => {
  await page.goto(at('anlass=launch&paket=HORIZON&motiv=rakete'));
  await expect(page.locator('[name=occasion][value=launch]')).toBeChecked();
  await expect(page.locator('#cfg-pkg')).toHaveText('HORIZON');
  await expect(scene(page)).toHaveText('Die Rakete als Körper schwebt und dreht sich');
  await page.goto('/show-konfigurator/?anlass=kultur&paket=SPARK&motiv=maske');
  await expect(page).toHaveURL(/\/drohnenshow-preise\/\?anlass=kultur&paket=SPARK&motiv=maske#vorschau$/);
  await expect(page.locator('[name=occasion][value=kultur]')).toBeChecked();
  await expect(scene(page)).toHaveText('Theatermasken: Komödie und Tragödie wiegen sich');
});

test('SPARK lässt Motive aus, die 100 Drohnen nicht tragen; der Paketwechsel springt aufs nächste Motiv', async ({ page }) => {
  await page.goto(at('anlass=festival&paket=HORIZON&motiv=drache'));
  await expect(scene(page)).toHaveText('Ein Drache in 3D, die Flügel schlagen');
  await pkg(page, 0);
  await expect(scene(page)).toHaveText('Ein Kompass, die Nadel sucht den Norden'); // the dragon is the last motif: round the loop
  await page.locator('#cfg-cta').click();
  await expect(page.locator('#inquiry-form [name=message]')).toHaveValue(/Beispielmotive: Reise, Kolibri, Delfin\n/);
});


test('Die Bühne zeigt das Paket und eine dezente Bildunterschrift für jedes Motiv', async ({ page }, info) => {
  await paused(page);
  await page.goto(PAGE);
  await expect(page.locator('#cfg-count')).toHaveCount(0);
  await expect(page.locator('#cfg-new')).toHaveText('HORIZON');
  await expect(page.locator('.cfg-stage')).toHaveAttribute('aria-describedby', 'cfg-scene');
  for (const id of OCCASIONS) {
    await occasion(page, id);
    await expect(scene(page)).toBeVisible();
    await expect(scene(page)).not.toHaveText('');
    const box = await scene(page).evaluate((node) => ({ size: parseFloat(getComputedStyle(node).fontSize), lines: Math.round(node.getBoundingClientRect().height / parseFloat(getComputedStyle(node).lineHeight)) }));
    expect(box.size).toBeLessThanOrEqual(14);
    expect(box.lines).toBeLessThanOrEqual(info.project.name === 'mobile' ? 2 : 1);
    await expect(page.locator('#cfg-error')).toBeHidden();
  }
});

test('Ruhe vor Sichtbarkeit: die Drohnen laden erst, wenn die Bühne in die Nähe kommt', async ({ page }) => {
  const engine: string[] = [];
  page.on('request', (request) => { if (/show-(field|scenes)/.test(request.url())) engine.push(request.url()); });
  await page.goto('/drohnenshow-preise/');
  await page.waitForTimeout(600);
  await expect(page.locator('[data-preview]')).toHaveAttribute('data-state', 'idle');
  expect(engine).toEqual([]);
  await page.locator('.cfg-stage').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-preview]')).toHaveAttribute('data-state', /running|paused/);
  expect(engine.length).toBeGreaterThan(0);
});

test('Pausiert: Motiv in Ruhe, Abspielen setzt die Bewegung fort', async ({ page }) => {
  await paused(page);
  await page.goto(at('anlass=kultur&paket=ODYSSEY'));
  await expect(page.locator('[data-preview]')).toHaveAttribute('data-state', 'paused');
  await expect(field(page)).toHaveAttribute('data-running', 'false');
  await page.getByRole('button', { name: 'Abspielen' }).click();
  await expect(page.locator('[data-preview]')).toHaveAttribute('data-state', 'running');
  await expect(page.getByRole('button', { name: 'Abspielen' })).toBeHidden();
  await expect(page.locator('header.nav').getByRole('button', { name: 'Bewegung pausieren', exact: true })).toBeVisible();
});

test('Reduzierte Bewegung: Bilder stehen, ‹ › schalten weiter, kein Abspielen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(at('anlass=launch&paket=SPARK'));
  await expect(page.locator('[data-preview]')).toHaveAttribute('data-state', 'paused');
  await expect(page.getByRole('button', { name: 'Abspielen' })).toBeHidden();
  await expect(scene(page)).toHaveText('Eine Glühbirne: die Idee');
  await page.locator('#cfg-next').click();
  await expect(scene(page)).toHaveText('QR-Code mit „Scan me“');
  await pkg(page, 2);
  await expect(page.locator('#cfg-price')).toHaveText('ab 34.900 €');
});

test('Fehler: Standbild und Hinweis, Paket, Preis und Anfrage bleiben nutzbar', async ({ page }) => {
  await page.route(/show-(field|scenes)/, (route) => route.abort());
  await page.goto(PAGE);
  await expect(page.locator('#cfg-error')).toBeVisible();
  await expect(page.locator('#cfg-error img')).toBeVisible();
  await expect(page.locator('[data-preview]')).toHaveAttribute('data-state', 'error');
  await pkg(page, 0);
  await expect(page.locator('#cfg-price')).toHaveText('ab 7.900 €');
  await expect(page.locator('#cfg-cta')).toHaveAttribute('href', /paket=SPARK/);
  await expect(page.getByRole('link', { name: 'Mit SPARK anfragen' })).toHaveAttribute('href', '/kontakt/?paket=SPARK&quelle=preise-karte');
});
