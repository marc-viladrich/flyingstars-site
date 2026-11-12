import { test, expect, type Page } from '@playwright/test';

// Show configurator v13 (seamless drone ranges, motifs unlocked by the drone count, see docs). v12: Anlass plays a sequence of four or five motifs; package buttons and the drone slider set package
// and price (every package has its own drone range, crossing it switches the package); switching the package turns the
// motif on stage into its version for that package. The player bar (pause, tempo, a track with one mark per picture)
// runs on the virtual show clock. Shape counts, prices and the data model are unit-tested in scripts/show-*.test.mjs,
// the motion in tests/show-physics.spec.ts.

// Sechzehnte Fassung (31.10.2026): der Konfigurator ist eine Komponente auf der Preisseite (/show-konfigurator/ leitet
// dorthin weiter). CFG_PATH stellt eine andere Seite ein.
const CFG = process.env.CFG_PATH ?? '/drohnenshow-preise/';
// Runde 11: Auf der Preisseite steht der Konfigurator seit dem 31.10. unter den Paketen. Die Specs öffnen ihn wie jeder
// Link auf der Site über den Anker #konfigurator (sonst steht die Bühne außerhalb des Viewports und zeichnet nicht).
// Runde 11: Ordnung der Startseiten-Karten (Silvester rückt im November und Dezember nach vorn, eigener Test unten)
const OCCASIONS = ['launch', 'jubilaeum', 'festival', 'hochzeit', 'kultur', 'silvester'];
const STEPS = [['SPARK', '7.900', '100'], ['HORIZON', '15.900', '200'], ['ODYSSEY', '34.900', '300']] as const;
// Runde 22: der Anlass ist wieder eine Pill-Gruppe (#cfg-occasion, Radios name=occasion)
const occasion = (page: Page, id: string) => page.locator(`#cfg-occasion label[data-occasion="${id}"]`).click();
const chosenOccasion = (page: Page) => page.locator('#cfg-occasion input:checked');
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

test('Deep-Link mit 1000 Drohnen zeigt ODYSSEY, fortgerechneten Preis und die neue Endmarke', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${CFG}?drohnen=1000#konfigurator`);
  await expect(page.locator('#cfg-drones')).toHaveAttribute('max', '1000');
  await expect(page.locator('#cfg-drones')).toHaveValue('1000');
  await expect(page.locator('#cfg-pkg')).toHaveText('ODYSSEY');
  await expect(page.locator('#cfg-price')).toHaveText('ab 104.200 €');
  await expect(page.locator('.cfg-ticks span')).toHaveText(['100', '200', '300', '1000']);
  await expect(field(page)).toHaveAttribute('data-points', '1000');
  await expect(field(page)).toHaveAttribute('data-running', 'true');
  expect(errors).toEqual([]);
});

test('Preis nur über den Aufwand; jeder Anlass zeigt drei Motive, jedes Bild mit genau den Drohnen des Pakets', async ({ page }, info) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await paused(page);
  await page.goto(`${CFG}#konfigurator`);
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
  await page.goto(`${CFG}#konfigurator`);
  await pkg(page, 2);
  for (const id of OCCASIONS) {
    await occasion(page, id);
    await expect(page.locator('label:has([name=pkg][value="2"]) input')).toBeChecked();
    await expect(page.locator('#cfg-price')).toHaveText('ab 34.900 €');
  }
});

test('Die Motive laufen von selbst durch, ein Paketwechsel bleibt beim Motiv', async ({ page }) => {
  await page.goto(`${CFG}#konfigurator`);
  await occasion(page, 'launch'); await pkg(page, 0);
  await expect(scene(page)).toHaveText('Rakete mit Flamme');
  await expect(scene(page)).toHaveText('Beispiel-Logo mit Lichtlauf', { timeout: 15_000 }); // the show moves on by itself
  await pkg(page, 1);
  await expect(scene(page)).toHaveText('Beispiel-Logo in 3D mit Lichtschimmer'); // same motif, next package
  // sechzehnte Fassung: ODYSSEY mit 300 Drohnen bleibt beim Motiv; die Mondlandung kommt erst ab 450 (Freischalt-Leiter)
  await pkg(page, 2);
  await expect(scene(page)).toHaveText('Euer Logo');
  await page.locator('#cfg-drones').focus();
  for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowRight');
  await expect(page.locator('#cfg-toast')).toHaveText('Neues Motiv freigeschaltet: Mondlandung');
  await expect(scene(page)).toHaveText('im Orbit um einen Planeten');
});

test('Dasselbe Motiv wird mit dem Paket größer', async ({ page }) => {
  await paused(page);
  const areas: number[] = [];
  // per link: a click on ODYSSEY would fly on to the motif it unlocks (Kopfsprung, ab 300)
  for (const k of [0, 2]) {
    await page.goto(`${CFG}?anlass=jubilaeum&paket=${STEPS[k][0]}&motiv=wappen#konfigurator`);
    await expect(scene(page)).toHaveText(k === 0 ? 'Wappen mit Stern und wehender Fahne' : '…mit Krone und kreisendem Sternenkranz');
    await page.waitForTimeout(300);
    areas.push((await picture(page)).area);
  }
  expect(areas[1] / areas[0]).toBeGreaterThan(1.5); // three times the drones at the same spacing: a larger picture
});

test('Jedes Paket bewegt sich nach dem Aufbau weiter', async ({ page }) => {
  await page.goto(`${CFG}#konfigurator`);
  await occasion(page, 'launch');
  const frame = () => field(page).evaluate((c) => (c as HTMLCanvasElement).toDataURL());
  for (const [k, caption] of [[0, 'Rakete mit Flamme'], [1, 'Die Rakete als Körper schwebt und dreht sich']] as const) {
    await pkg(page, k);
    await expect(scene(page)).toHaveText(caption);
    await page.waitForTimeout(2500);
    await expect(field(page)).toHaveAttribute('data-running', 'true');
    const before = await frame(); await page.waitForTimeout(400);
    expect(await frame()).not.toBe(before);
  }
});

test('ODYSSEY erzählt jedes Motiv in Akten, ↻ beginnt die Show von vorn', async ({ page }) => {
  await page.goto(`${CFG}#konfigurator`);
  await page.goto(`${CFG}?anlass=launch&paket=ODYSSEY&motiv=idee#konfigurator`);
  await expect(scene(page)).toHaveText('Ein Glühfaden glimmt');
  await expect(scene(page)).toHaveText('um ihn formt sich die Glühbirne', { timeout: 20_000 });
  await page.locator('#cfg-track').focus();
  await page.keyboard.press('Home'); // the track's start: the show from the beginning
  await expect(scene(page)).toHaveText('Startklar');
});

test('Paketknöpfe lassen sich per Tastatur wählen', async ({ page }) => {
  await paused(page);
  await page.goto(`${CFG}#konfigurator`);
  await page.locator('label:has([name=pkg][value="1"]) input').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('label:has([name=pkg][value="2"]) input')).toBeChecked();
  await expect(page.locator('#cfg-pkg')).toHaveText('ODYSSEY');
  await expect.poll(() => pictureWidth(page)).toBeGreaterThan(100);
});

test('Auf den ersten Blick: Anlass, Aufwand, Preis und Anfrage', async ({ page }, info) => {
  await page.goto(`${CFG}#konfigurator`);
  await expect(page.locator('[name=pkg]').first()).toBeAttached();
  if (info.project.use.isMobile) { await expect(page.locator('#cfg-bar-cta')).toBeInViewport(); await expect(page.locator('.cfg-pkgs')).toBeInViewport({ ratio: 1 }); }
  else { await expect(page.locator('#cfg-cta')).toBeInViewport(); await expect(page.locator('.cfg-pkgs')).toBeInViewport({ ratio: 1 }); }
});

test('Die Anfrage übernimmt Anlass, Motive und Paket', async ({ page }) => {
  await page.goto(`${CFG}#konfigurator`);
  await occasion(page, 'launch');
  await pkg(page, 0);
  await page.locator('#cfg-cta').click();
  await expect(page).toHaveURL(/#anfrage$/);
  const form = page.locator('#inquiry-form');
  await expect(form.locator('[name=paket]:checked')).toHaveValue(/SPARK/); // seit der Designsprache-Übertragung (Lead) eine Auswahl statt eines Feldes
  await expect(form.locator('[name=anlass][value=firma]')).toBeChecked();
  await expect(form.locator('[name=message]')).toHaveValue('Anlass: Launch\nBeispielmotive: Rakete, Galaxie, Logo, Glühbirne, Möbius-Schleife\nAufwand: Klassisch in 2D (SPARK, 100 Drohnen, ab 7.900 € netto, Preis laut Konfigurator)');
});

test('Nach schnellem Umschalten leuchten nie mehr Drohnen, als das Paket hat', async ({ page }) => {
  await page.goto(`${CFG}#konfigurator`);
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
  await page.goto(`${CFG}#konfigurator`);
  await occasion(page, 'launch'); await pkg(page, 0);
  await expect(scene(page)).toHaveText('Rakete mit Flamme');
  // Runde 24: SPARK 100 spielt Rakete, Galaxie, Logo, Glühbirne, Möbius-Schleife (Katalogmotive dazwischen)
  await page.locator('#cfg-prev').click(); // before the first picture comes the last one
  await expect(scene(page)).toHaveText('Möbius-Schleife, eine Formation aus dem FlyingStars-Katalog');
  await page.locator('#cfg-next').click(); // after the last picture comes the first one
  await expect(scene(page)).toHaveText('Rakete mit Flamme');
  for (let i = 0; i < 3; i++) await page.locator('#cfg-next').click();
  await expect(scene(page)).toHaveText('Eine Glühbirne: die Idee');
  await pkg(page, 1);
  await expect(scene(page)).toHaveText('Die Glühbirne in 3D, der Glühfaden leuchtet');
  // ODYSSEY bleibt bei der Glühbirne (sechzehnte Fassung), pausiert am Ende ihrer Geschichte; zurück geht es Akt für Akt
  await pkg(page, 2);
  await expect(scene(page)).toHaveText('…und sie strahlt');
  await page.locator('#cfg-prev').click();
  await expect(scene(page)).toHaveText('um ihn formt sich die Glühbirne');
});

test('Eigener Text: einmal durch Schreibschrift, Druckschrift und Initialen, die Auswahl folgt der Bühne; dann die Motive', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${CFG}#konfigurator`);
  await occasion(page, 'hochzeit'); await pkg(page, 0);
  await page.locator('[data-rate="2"]').click();
  await expect(page.locator('#cfg-styles')).toBeHidden();
  await page.locator('#cfg-text').fill('Anna & Ben');
  const checked = () => page.locator('[name=textstyle]:checked');
  await expect(scene(page)).toHaveText('Euer Text am Himmel, in Schreibschrift');
  await expect(field(page)).toHaveAttribute('data-points', '100');
  await expect(page.locator('#cfg-styles')).toBeVisible();
  await expect(checked()).toHaveValue('script');
  // the stage runs through the styles by itself, the picker marks the style on stage
  await expect(scene(page)).toHaveText('Euer Text am Himmel, in Druckschrift', { timeout: 20_000 });
  await expect(checked()).toHaveValue('print');
  await expect(scene(page)).toHaveText('Euer Text am Himmel, in Initialen', { timeout: 20_000 });
  await expect(checked()).toHaveValue('initials');
  // then on with the motifs of the occasion; the picker shows the chosen style again
  await expect(scene(page)).toHaveText('Zwei Eheringe, der Stein funkelt', { timeout: 20_000 });
  await expect(checked()).toHaveValue('script');
  // the text comes back as the finale in the chosen style; choosing a style shows it
  for (const style of ['print', 'initials', 'script']) {
    await page.locator(`label:has([name=textstyle][value=${style}])`).click();
    await expect(scene(page)).toHaveText('Euer Text am Himmel');
    await expect(checked()).toHaveValue(style);
  }
  await pkg(page, 1);
  await expect(scene(page)).toHaveText('Licht schreibt euren Text'); // the package switch stays on the text
  await expect(field(page)).toHaveAttribute('data-points', '200');
  await expect(page.locator('#cfg-cta')).toHaveAttribute('href', /Eigener\+Text%3A\+%E2%80%9EAnna\+%26\+Ben%E2%80%9C\+%28Schreibschrift%29/);
  await page.locator('#cfg-text').fill('');
  await expect(page.locator('#cfg-styles')).toBeHidden();
  await expect(page.locator('#cfg-cta')).not.toHaveAttribute('href', /Eigener/);
  expect(errors).toEqual([]);
});

test('Direktlink öffnet Anlass, Paket und Motiv', async ({ page }) => {
  await page.goto(`${CFG}?anlass=launch&paket=HORIZON&motiv=rakete#konfigurator`);
  await expect(chosenOccasion(page)).toHaveValue('launch');
  await expect(page.locator('#cfg-pkg')).toHaveText('HORIZON');
  await expect(scene(page)).toHaveText('Die Rakete als Körper schwebt und dreht sich');
});

test('SPARK lässt Motive aus, die 100 Drohnen nicht tragen; der Paketwechsel springt aufs nächste Motiv', async ({ page }) => {
  await page.goto(`${CFG}?anlass=festival&paket=ODYSSEY&motiv=drache#konfigurator`);
  await expect(scene(page)).toHaveText('Ein Drache steigt auf');
  await pkg(page, 0);
  await expect(scene(page)).toHaveText('Ein Kompass, die Nadel sucht den Norden'); // the dragon is the last motif: round the loop
  await page.locator('#cfg-cta').click();
  await expect(page.locator('#inquiry-form [name=message]')).toHaveValue(/Beispielmotive: Reise, Kolibri, Cocktailglas, Ballons, Stern, Biene, Delfin\n/);
});


test('Die Vorschau zeigt nur das Paket; Bildbeschreibung bleibt für assistive Technik verfügbar', async ({ page }) => {
  await paused(page);
  await page.goto(`${CFG}#konfigurator`);
  await expect(page.locator('#cfg-count')).toHaveCount(0);
  await expect(page.locator('.cfg-caption')).toHaveText('HORIZON');
  for (const id of OCCASIONS) {
    await occasion(page, id);
    await expect(scene(page)).not.toHaveText('');
    const style = await scene(page).evaluate((node) => {
      const s = getComputedStyle(node);
      return { width: s.width, height: s.height, overflow: s.overflow, position: s.position };
    });
    expect(style).toEqual({ width: '1px', height: '1px', overflow: 'hidden', position: 'absolute' });
    await expect(page.locator('.cfg-stage')).toHaveAttribute('aria-describedby', 'cfg-scene');
    await expect(page.locator('#cfg-error')).toBeHidden();
  }
});

/** Drone count shown next to the slider. */
const droneCount = (page: Page) => page.locator('#cfg-dronecount');

test('Der Drohnenregler wechselt an der Bereichsgrenze sichtbar das Paket, mit echter Maus und Tastatur', async ({ page }, info) => {
  test.skip(!!info.project.use.isMobile, 'Maus-Ziehen auf dem Desktop; die Tastatur deckt dieselbe Logik ab.');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${CFG}#konfigurator`);
  await pkg(page, 0);
  await expect(droneCount(page)).toHaveText('100');
  await expect(page.locator('#cfg-price')).toHaveText('ab 7.900 €');
  // keyboard: the ranges are seamless (13th version): SPARK up to 190, one step more is HORIZON's first count
  const slider = page.locator('#cfg-drones');
  await slider.focus();
  for (let i = 0; i < 9; i++) await page.keyboard.press('ArrowRight');
  await expect(droneCount(page)).toHaveText('190');
  await expect(page.locator('#cfg-pkg')).toHaveText('SPARK');
  await expect(page.locator('#cfg-price')).toHaveText('ab 15.200 €');
  await page.keyboard.press('ArrowRight');
  await expect(droneCount(page)).toHaveText('200');
  await expect(page.locator('#cfg-pkg')).toHaveText('HORIZON');
  await expect(page.locator('label:has([name=pkg][value="1"]) input')).toBeChecked();
  await page.keyboard.press('ArrowLeft');
  await expect(droneCount(page)).toHaveText('190');
  await expect(page.locator('#cfg-pkg')).toHaveText('SPARK');
  // mouse: drag the thumb to the far right, the package becomes ODYSSEY, the picture gets the new drone count
  const box = (await slider.boundingBox())!;
  const min = Number(await slider.getAttribute('min')), max = Number(await slider.getAttribute('max'));
  const x = (n: number) => box.x + 10 + ((n - min) / (max - min)) * (box.width - 20);
  await page.mouse.move(x(190), box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(x(250), box.y + box.height / 2, { steps: 8 });
  await expect(page.locator('#cfg-pkg')).toHaveText('HORIZON');
  await page.mouse.move(x(420), box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('#cfg-pkg')).toHaveText('ODYSSEY');
  const n = Number(await droneCount(page).textContent());
  expect(n).toBeGreaterThanOrEqual(380); expect(n).toBeLessThanOrEqual(440);
  await expect(field(page)).toHaveAttribute('data-points', String(n));
  // the inquiry carries the count; a package button goes back to that package's entry count
  await expect(page.locator('#cfg-cta')).toHaveAttribute('href', new RegExp(`drohnen=${n}`));
  await pkg(page, 1);
  await expect(droneCount(page)).toHaveText('200');
  await expect(page.locator('#cfg-price')).toHaveText('ab 15.900 €');
  await expect(page.locator('.cfg')).not.toContainText('Platzhalter'); // Runde 11: nur noch als Code-Kommentar
  expect(errors).toEqual([]);
});

test('Kein Hin und Her zwischen SPARK und HORIZON: Ziehen und Verweilen mit echter Maus', async ({ page }, info) => {
  test.skip(!!info.project.use.isMobile, 'Maus auf dem Desktop.');
  await page.goto(`${CFG}#konfigurator`);
  await pkg(page, 0);
  // every change of the package label, in order
  await page.locator('#cfg-pkg').evaluate((node) => { const w = window as unknown as { __pkgs: string[] }; w.__pkgs = [node.textContent ?? '']; new MutationObserver(() => w.__pkgs.push(node.textContent ?? '')).observe(node, { childList: true, characterData: true, subtree: true }); });
  const slider = page.locator('#cfg-drones'), box = (await slider.boundingBox())!, y = box.y + box.height / 2;
  const min = Number(await slider.getAttribute('min')), max = Number(await slider.getAttribute('max'));
  const x = (n: number) => box.x + 10 + ((n - min) / (max - min)) * (box.width - 20);
  await page.mouse.move(x(100), y); await page.mouse.down();
  // slowly over the former gap (150–200) and the boundary, resting with a trembling hand at several places
  for (const n of [140, 160, 170, 180, 190]) {
    await page.mouse.move(x(n), y, { steps: 6 });
    for (let k = 0; k < 12; k++) await page.mouse.move(x(n) + (k % 2 ? 0.6 : -0.6), y + (k % 3) - 1);
    await expect(droneCount(page)).toHaveText(String(n));
    await expect(page.locator('#cfg-pkg')).toHaveText('SPARK');
  }
  await page.mouse.move(x(220), y, { steps: 6 });
  for (let k = 0; k < 12; k++) await page.mouse.move(x(220) + (k % 2 ? 0.6 : -0.6), y);
  await expect(page.locator('#cfg-pkg')).toHaveText('HORIZON');
  await page.mouse.up();
  const seen = await page.evaluate(() => (window as unknown as { __pkgs: string[] }).__pkgs);
  expect(seen.filter((p, i) => i === 0 || p !== seen[i - 1])).toEqual(['SPARK', 'HORIZON']);
});

test('Mehr Drohnen schalten ein Motiv frei: Meldung auf der Bühne, die Bühne fliegt durch die Wolke dorthin', async ({ page }, info) => {
  test.skip(!!info.project.use.isMobile, 'Maus auf dem Desktop.');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${CFG}#konfigurator`);
  await occasion(page, 'hochzeit'); await pkg(page, 2);
  await page.locator('#cfg-cta').evaluate((a) => a.getAttribute('href')).then((href) => expect(decodeURIComponent(href ?? '')).not.toContain('Antrag'));
  await page.locator('#cfg-field').evaluate((node) => { const w = window as unknown as { __clouds: string[] }; w.__clouds = []; new MutationObserver(() => w.__clouds.push((node as HTMLElement).dataset.cloud ?? '')).observe(node, { attributes: true, attributeFilter: ['data-cloud'] }); });
  const slider = page.locator('#cfg-drones'), box = (await slider.boundingBox())!, y = box.y + box.height / 2;
  const min = Number(await slider.getAttribute('min')), max = Number(await slider.getAttribute('max'));
  const x = (n: number) => box.x + 10 + ((n - min) / (max - min)) * (box.width - 20);
  await page.mouse.move(x(300), y); await page.mouse.down();
  await page.mouse.move(x(460), y, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator('#cfg-toast')).toHaveText(/Neues Motiv freigeschaltet: Antrag/);
  await expect(page.locator('#cfg-toast')).toHaveClass(/is-on/);
  await expect(scene(page)).toHaveText('Ein Schmuckkästchen öffnet sich');
  expect(await page.evaluate(() => (window as unknown as { __clouds: string[] }).__clouds)).toContain('all');
  await expect(page.locator('#cfg-toast')).toHaveText('', { timeout: 6000 }); // it goes away by itself
  expect(errors).toEqual([]);
});

test('Vorführ-Steuerung: Pause friert das Bild ein, Tempo und Bildsprung über die Spur', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${CFG}?anlass=launch&paket=ODYSSEY&motiv=idee#konfigurator`);
  await expect(scene(page)).toHaveText('Ein Glühfaden glimmt');
  const frame = () => field(page).evaluate((c) => (c as HTMLCanvasElement).toDataURL());
  await page.waitForTimeout(800);
  await page.locator('#cfg-play').click();
  await expect(page.locator('#cfg-play')).toHaveAttribute('aria-label', 'Vorführung abspielen');
  const still = await frame(); await page.waitForTimeout(700);
  expect(await frame()).toBe(still); // the exact frame stays, nothing jumps to a finished picture
  await page.locator('#cfg-play').click();
  await page.waitForTimeout(400);
  expect(await frame()).not.toBe(still);
  // tempo: one of three, the pressed one is announced
  await page.locator('[data-rate="2"]').click();
  await expect(page.locator('[data-rate="2"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-rate="1"]')).toHaveAttribute('aria-pressed', 'false');
  // the track: a click near its end jumps to a later picture; keyboard steps one picture
  const track = page.locator('#cfg-track'), box = (await track.boundingBox())!;
  if (info.project.use.isMobile) await page.touchscreen.tap(box.x + box.width * 0.9, box.y + box.height / 2);
  else await page.mouse.click(box.x + box.width * 0.9, box.y + box.height / 2);
  await expect.poll(async () => Number(await track.getAttribute('aria-valuenow'))).toBeGreaterThan(6); // ODYSSEY Launch with 300 drones: 9 pictures
  const at = Number(await track.getAttribute('aria-valuenow'));
  await track.focus(); await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => Number(await track.getAttribute('aria-valuenow'))).toBe(at - 1);
  await expect(track).toHaveAttribute('aria-valuetext', /^Bild \d+ von \d+: /);
  expect(errors).toEqual([]);
});

test('Große Bildschirme: Bedienung links, Bühne rechts; mobil gestapelt', async ({ page }, info) => {
  for (const [w, h] of info.project.use.isMobile ? [[390, 844]] : [[1440, 900], [2560, 1440]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(`${CFG}#konfigurator`);
    const panel = (await page.locator('#cfg').boundingBox())!, stage = (await page.locator('.cfg-stage').boundingBox())!;
    if (w >= 1000) {
      expect(panel.x + panel.width, `${w}: Bedienung links neben der Bühne`).toBeLessThanOrEqual(stage.x);
      expect(stage.width, `${w}: die Bühne nimmt den größeren Teil`).toBeGreaterThan(panel.width * 1.5);
      await expect(page.locator('#cfg-drones')).toBeInViewport();
      await expect(page.locator('#cfg-price')).toBeInViewport();
    } else expect(stage.y + stage.height, 'Bühne über der Bedienung').toBeLessThanOrEqual(panel.y + 1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow, `${w}: kein seitliches Scrollen`).toBeLessThanOrEqual(0);
  }
});

// ---------- Vierzehnte Fassung (A): Bedienung ----------

/** Records every beat and how it is reached (data-cloud: all / part / empty) on the stage. */
const recordBeats = (page: Page) => field(page).evaluate((node) => {
  const w = window as unknown as { __beats: string[] };
  w.__beats = [];
  new MutationObserver(() => w.__beats.push(`${(node as HTMLElement).dataset.beat}:${(node as HTMLElement).dataset.cloud}`)).observe(node, { attributes: true, attributeFilter: ['data-beat', 'data-cloud'] });
});
const beatsSeen = (page: Page) => page.evaluate(() => (window as unknown as { __beats: string[] }).__beats);

test('Ein Klick irgendwo auf die Bühne hält an und lässt weiterlaufen; Leertaste bei Fokus auf der Bühne', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${CFG}#konfigurator`);
  await occasion(page, 'launch');
  await page.waitForTimeout(600);
  const frame = () => field(page).evaluate((c) => (c as HTMLCanvasElement).toDataURL());
  const hit = page.locator('#cfg-hit'), box = (await page.locator('.cfg-stage').boundingBox())!;
  await expect(hit).toHaveAttribute('aria-pressed', 'false');
  await expect(hit).toHaveAccessibleName('Vorführung anhalten');
  // a corner, the package badge, the middle: wherever the click lands
  const spots: [number, number][] = [[box.x + 30, box.y + 30], [box.x + box.width * 0.5, box.y + box.height * 0.45], [box.x + box.width - 20, box.y + box.height * 0.3]];
  for (const [x, y] of spots) {
    if (info.project.name.startsWith('mobile')) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
    await expect(hit).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#cfg-play')).toHaveAttribute('aria-label', 'Vorführung abspielen');
    const still = await frame(); await page.waitForTimeout(500);
    expect(await frame(), 'das genaue Bild bleibt stehen').toBe(still);
    if (info.project.name.startsWith('mobile')) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
    await expect(hit).toHaveAttribute('aria-pressed', 'false');
    await page.waitForTimeout(300);
    expect(await frame()).not.toBe(still);
  }
  // the player bar keeps its own buttons: a click on › does not pause
  await page.locator('#cfg-next').click();
  await expect(hit).toHaveAttribute('aria-pressed', 'false');
  // keyboard: Space on the focused stage
  await hit.focus();
  await page.keyboard.press('Space');
  await expect(hit).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Space');
  await expect(hit).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});

test('Spur: Überfahren und Fokus zeigen, ab wie vielen Drohnen eine Sequenz möglich ist', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('mobile'), 'Hover gibt es nur mit Maus; der Fokus-Fall läuft auf dem Desktop.');
  await page.goto(`${CFG}?anlass=hochzeit&paket=ODYSSEY&drohnen=600#konfigurator`);
  const track = page.locator('#cfg-track'), tip = page.locator('#cfg-tip');
  await expect(tip).not.toHaveClass(/is-on/);
  await expect.poll(async () => Number(await track.getAttribute('aria-valuemax'))).toBeGreaterThan(10);
  const box = (await track.boundingBox())!, seen = new Set<string>();
  for (let x = 0.02; x < 1; x += 0.04) { await page.mouse.move(box.x + box.width * x, box.y + box.height / 2); await expect(tip).toHaveClass(/is-on/); seen.add((await tip.textContent()) ?? ''); }
  // every motif of the occasion with its minimum (Antrag needs 450, the others the package's start)
  expect([...seen]).toEqual(expect.arrayContaining(['Antrag · ab 450 Drohnen', 'Lotusblüten · ab 300 Drohnen', 'Ringe · ab 300 Drohnen']));
  // the hint stays inside the stage
  const t = (await tip.boundingBox())!, stage = (await page.locator('.cfg-stage').boundingBox())!;
  expect(t.x).toBeGreaterThanOrEqual(stage.x); expect(t.x + t.width).toBeLessThanOrEqual(stage.x + stage.width);
  await page.mouse.move(box.x + box.width / 2, box.y - 200);
  await expect(tip).not.toHaveClass(/is-on/);
  // keyboard: focus shows the hint for the picture on stage, arrows move it
  await track.focus();
  await expect(tip).toHaveClass(/is-on/);
  await expect(tip).toContainText('Drohnen');
  await expect(track).toHaveAttribute('aria-describedby', 'cfg-tip');
});

test('Paketwechsel und Regler melden alle neuen Motive auf einmal und fliegen zum ersten', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${CFG}#konfigurator`);
  await occasion(page, 'hochzeit'); await pkg(page, 0);
  await page.waitForTimeout(400);
  await recordBeats(page);
  // SPARK 100 → HORIZON 200: neu sind alle SPARK-Motive ab 110 Drohnen und der Schmetterling (Runde 25b). Der
  // Paketknopf meldet ihn und bleibt beim Motiv auf der Bühne (dasselbe Motiv, größeres Paket)
  await expect(scene(page)).toHaveText('Zwei Eheringe, der Stein funkelt');
  await pkg(page, 1);
  await expect(page.locator('#cfg-toast')).toHaveText('7 neue Motive: Hochzeitstorte, Amor, Zwei Blüten, Blume, Lotusblume, Unendlich-Zeichen, Schmetterling');
  await expect(scene(page)).toHaveText('Ein Solitär in 3D: Ring und Brillant drehen sich');
  // HORIZON, then the slider to the end in one go: two motifs at once, the stage goes to the first
  await pkg(page, 1);
  await page.locator('#cfg-drones').focus();
  await page.keyboard.press('End');
  await expect(droneCount(page)).toHaveText('1000');
  await expect(page.locator('#cfg-toast')).toHaveText('2 neue Motive: Lotusblüten, Antrag');
  await expect(scene(page)).toHaveText('Zwei Knospen');
  expect(await beatsSeen(page)).toEqual(expect.arrayContaining([expect.stringMatching(/:all$/)])); // durch die Wolke
  // going down is no news
  await page.keyboard.press('Home');
  await expect(droneCount(page)).toHaveText('100');
  await page.waitForTimeout(300);
  await expect(page.locator('#cfg-toast')).not.toHaveText(/neu/i, { timeout: 6000 });
  // the explanatory microcopy is gone (Marc: visible at slider and picker anyway)
  for (const id of ['#cfg-range', '#cfg-switch', '#cfg-more', '#cfg-includes']) await expect(page.locator(id)).toHaveCount(0);
  await expect(page.locator('.cfg')).not.toContainText('Paket gewechselt');
  await expect(page.locator('.cfg')).not.toContainText('Enthalten:');
  expect(errors).toEqual([]);
});

test('Lebendige Wolke beim Wechsel des Anlasses und beim Rücksprung vom letzten zum ersten Bild', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(`${CFG}#konfigurator`);
  await pkg(page, 0); await occasion(page, 'launch');
  await page.waitForTimeout(500);
  await recordBeats(page);
  await occasion(page, 'kultur');
  await expect.poll(() => beatsSeen(page)).toContain('0:all');
  // the last picture, then wait for the loop
  await page.locator('[data-rate="2"]').click();
  const track = page.locator('#cfg-track');
  await track.focus(); await page.keyboard.press('End');
  const last = Number(await track.getAttribute('aria-valuemax')) - 1;
  await expect.poll(async () => Number(await track.getAttribute('aria-valuenow'))).toBe(last + 1);
  await recordBeats(page);
  await expect.poll(() => beatsSeen(page), { timeout: 40_000 }).toContain('0:all');
});

/** A test PNG: a red ring, a blue box and a black triangle on transparent ground (black lights as warm white). */
const LOGO_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAHgAAABaCAYAAABzAJLvAAACk0lEQVR42u2doVLDUBBFk5XofAKiGlVRhUDxaXwHX4BCI/gERBU6GlsUM0wm07y2eXm7d8+1MOR1D/dukpduug4hhBBCCCGEEEIIIYQQqqu+5cGPu8Op9Hfvvz56cDkHfAlQgAcCvCZYQDsBXBMqsMtlKnBbHjeNgz0VGDevDPhauCUgav5tADu83OHyakPApcWuUeiWx04BuKTAWxTXyzqkAC8VtUVBPa4p5GWS10IuHTfjZVSv6JLj7nB6fHhJF8ffr/v+JgdHiUAujyrcyaKowQGfcy9wgwMGLhGNFAHjXgHAbMEldTDuFQCMe5M6GPdyFo0AjJoCpv8mdTD9l4hGAG6nn/dnAKvDzQSZiAawZjRncbFl7rsZIFv2kyp1yOl68N3TGz24E9lhmrrzD+4UsrKLTfWO1aXQVCFb1mjOEtWSgIdhOJXAzBDVpjYqYQo3+61MU9o5moO7FMVzP1eCbMoDT0r7rHI/NpX939K+WwpZxcWmMFXn1r6r3I8lz6LHcey5y3UB4HMx3drFU/deC1c1qm2NZ7FaQa4VzUpRbVGn3M3BvdW9ipdOpjLk5D/cNdah0o/7iFN2zvXdtde2do+X+G5STSef67tb/ONt1ffTTrqbc1TtdUR2cahZldNCfw67rtWxo0C2rcYnHXeH0y3RfW001jofiBLVIeZFzxWzxL2120MEJ4eY+L4fv5rDjRrVvfd3J1wKd4vdr0iQzfOsyClcr1ubnvux6/cmlbjXC1SvLnb75rMluB4eRIgA2eW7C+ei2WPxIpxVUzTx9Zrq0xmszyHgqLcDp+v0dFZtKg+sqz2ALx/R0fZdva7XiGbtqO6JMm13G3C1PydjlDq+H4x7+bwIIYQQQgghpKJfeZOW/W2RGroAAAAASUVORK5CYII=', 'base64');

test('Eigenes Logo per Dateiauswahl und Drag&Drop: eigenes Bild im Ablauf, die Datei bleibt im Browser', async ({ page }, info) => {
  test.setTimeout(240_000); // Runde 25b: HORIZON-Runde mit rund 40 Bildern, die der Test einzeln durchklickt
  const errors: string[] = [], requests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${CFG}#konfigurator`);
  await occasion(page, 'hochzeit');
  await page.waitForTimeout(300);
  const storage = await page.evaluate(() => JSON.stringify([{ ...localStorage }, { ...sessionStorage }]));
  page.on('request', (r) => { if (!r.url().startsWith('blob:') && !r.url().startsWith('data:')) requests.push(`${r.method()} ${r.url()} ${r.postData() ?? ''}`); });
  await expect(page.locator('#cfg-legal')).toHaveText('Lade nur Logos hoch, die du verwenden darfst. Die Umrechnung läuft in deinem Browser. Übertragen wird das Logo erst, wenn du es mit einer Anfrage absendest.');
  await expect(page.locator('#cfg-file')).toHaveAccessibleDescription(/Lade nur Logos hoch/);
  await recordBeats(page);
  // Der Budgetvertrag erlaubt nur die vollständige Mindestfassung oberhalb des Show-Budgets.
  const expectLogo = async (budget: number) => {
    await expect.poll(async () => {
      const points = Number(await field(page).getAttribute('data-points'));
      const caption = await scene(page).textContent();
      return points === budget
        ? ['Euer Logo', `Euer Logo, vereinfacht für ${budget} Drohnen`].includes(caption ?? '')
        : points > budget && caption === `Euer Logo braucht mindestens ${points} Drohnen`;
    }, { timeout: 90000 }).toBe(true);
    return (await scene(page).textContent())!;
  };
  // 1) file picker
  await page.locator('#cfg-file').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: LOGO_PNG });
  await expect(page.locator('#cfg-use-logo')).toBeVisible();
  await page.locator('#cfg-use-logo').click();
  await pkg(page, 1);
  const logoCaption = await expectLogo(200);
  await expect.poll(() => beatsSeen(page)).toContainEqual(expect.stringMatching(/:all$/)); // through the living cloud
  await expect(page.locator('#cfg-logo-off')).toBeVisible();
  // the logo stands 5 s and comes back in the round: the round has it before every second motif
  const pictures = Number(await page.locator('#cfg-track').getAttribute('aria-valuemax')), captions: string[] = [];
  for (let i = 0; i < pictures; i++) { captions.push((await scene(page).textContent()) ?? ''); await page.locator('#cfg-next').click(); }
  expect(captions[0]).toBe(logoCaption);
  expect(captions.filter((c) => c === logoCaption).length).toBeGreaterThanOrEqual(2);
  await expect(scene(page)).toHaveText(logoCaption); // round the loop: the round starts with the logo
  // a new drone count goes back to the logo
  await page.locator('#cfg-next').click();
  await expect(scene(page)).not.toHaveText(logoCaption);
  await page.locator('#cfg-drones').focus();
  await page.keyboard.press('ArrowRight'); // 210: nothing new to unlock, so back to the logo
  await expectLogo(210);
  await expect(page.locator('#cfg-cta')).toHaveAttribute('href', /Eigenes\+Logo/);
  // 2) remove, then drag & drop onto the stage
  await page.locator('#cfg-logo-off').click();
  await expect(page.locator('#cfg-logo-off')).toBeHidden();
  await expect(scene(page)).not.toHaveText(logoCaption);
  const stage = page.locator('.cfg-stage');
  const dt = await page.evaluateHandle((b64) => { const d = new DataTransfer(); const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); d.items.add(new File([bin], 'logo.png', { type: 'image/png' })); return d; }, LOGO_PNG.toString('base64'));
  if (!info.project.name.startsWith('mobile')) { const b = (await stage.boundingBox())!; await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); }
  await page.locator('#cfg-hit').dispatchEvent('dragenter', { dataTransfer: dt });
  await page.locator('#cfg-hit').dispatchEvent('dragover', { dataTransfer: dt });
  await expect(stage).toHaveClass(/is-drag/);
  await expect(page.locator('.cfg-drop')).toHaveCSS('opacity', '1');
  await page.locator('#cfg-hit').dispatchEvent('drop', { dataTransfer: dt });
  // the drop zone is gone at once, even with the mouse still on the stage
  // is-done unterdrückt nur Maus-Hover; Touch darf den Marker bei pointerleave entfernen.
  if (!info.project.name.startsWith('mobile')) await expect(stage).toHaveClass(/is-done/);
  await expect(stage).not.toHaveClass(/is-drag/);
  await expect(page.locator('.cfg-drop')).toHaveCSS('opacity', '0');
  await expect(page.locator('#cfg-use-logo')).toBeVisible();
  await page.locator('#cfg-use-logo').click();
  await expectLogo(Number(await droneCount(page).textContent()));
  // nothing left the browser: no request with the file, no storage
  expect(requests.filter((r) => !r.startsWith('GET ')), 'keine Übertragung').toEqual([]);
  expect(requests.filter((r) => !/^GET http:\/\/127\.0\.0\.1:\d+\//.test(r)), 'nur eigene Dateien der Seite').toEqual([]);
  // Runde 28: „Dieses Logo in der Show verwenden“ bereitet den Anfrage-Anhang tabgebunden in sessionStorage vor
  // (docs/integrations/logo-attachments.md); sonst bleibt der Speicher unverändert, und gesendet wird erst mit der Anfrage
  expect(await page.evaluate(() => { const ss: Record<string, string> = { ...sessionStorage }; delete ss['flyingstars:logo-inquiry']; return JSON.stringify([{ ...localStorage }, ss]); })).toBe(storage);
  expect(errors).toEqual([]);
});

test('Fünfzehnte Fassung: die Dropzone lädt beim ersten Überfahren der Bühne einmal ein, die Freischalt-Meldung trägt den Namen im Verlauf', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('mobile'), 'Überfahren mit der Maus gibt es nur am Desktop.');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${CFG}?anlass=hochzeit&paket=ODYSSEY&drohnen=440#konfigurator`);
  const stage = page.locator('.cfg-stage'), drop = page.locator('.cfg-drop'), b = (await stage.boundingBox())!;
  const centre = () => page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 4 });
  await page.mouse.move(b.x - 60, b.y + 40);
  await expect(drop).toHaveCSS('opacity', '0');
  // erstes Überfahren: die Einladung
  await centre();
  await expect(stage).toHaveClass(/is-invite/);
  await expect(drop).toHaveCSS('opacity', '1');
  // Maus raus: weg; wieder rein: keine zweite Einladung
  await page.mouse.move(b.x - 60, b.y + 40);
  await expect(drop).toHaveCSS('opacity', '0');
  await centre();
  await page.waitForTimeout(500);
  await expect(stage).not.toHaveClass(/is-invite/);
  await expect(drop).toHaveCSS('opacity', '0');
  // zeigen auf „Logo“ zeigt sie weiter
  await page.locator('#cfg-upload').hover();
  await expect(drop).toHaveCSS('opacity', '1');
  await page.mouse.move(b.x - 60, b.y + 40);
  await expect(drop).toHaveCSS('opacity', '0');
  // Freischalt-Meldung: derselbe Satz für Screenreader, der Name des Motivs im FlyingStars-Verlauf
  await page.locator('#cfg-drones').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#cfg-toast')).toHaveText('Neues Motiv freigeschaltet: Antrag');
  await expect(page.locator('#cfg-toast b')).toHaveText('Antrag');
  await expect(page.locator('#cfg-toast b')).toHaveCSS('background-image', /linear-gradient\(90deg, rgb\(255, 158, 41\).*rgb\(219, 100, 232\).*rgb\(51, 237, 242\)/);
  await expect(page.locator('#cfg-toast')).toHaveCSS('border-top-width', '0px'); // kein Kasten
  expect(errors).toEqual([]);
});

test('Ein Klick auf die Bühne beendet die Einladung und hält die Show an', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('mobile'), 'Überfahren mit der Maus gibt es nur am Desktop.');
  await page.goto(`${CFG}#konfigurator`);
  const stage = page.locator('.cfg-stage'), b = (await stage.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 4 });
  await expect(stage).toHaveClass(/is-invite/);
  await page.mouse.down(); await page.mouse.up();
  await expect(stage).not.toHaveClass(/is-invite/);
  await expect(page.locator('.cfg-drop')).toHaveCSS('opacity', '0');
  await expect(page.locator('#cfg-hit')).toHaveAttribute('aria-pressed', 'true');
});

test('Euer Text und Logo stehen bei den Auswahlen, vor Preis und Anfrage', async ({ page }) => {
  await page.goto(`${CFG}#konfigurator`);
  const y = async (sel: string) => (await page.locator(sel).boundingBox())!.y;
  expect(await y('#cfg-text')).toBeGreaterThan(await y('#cfg-drones'));
  expect(await y('#cfg-text')).toBeLessThan(await y('#cfg-price'));
  expect(Math.abs(await y('#cfg-upload') - await y('#cfg-text'))).toBeLessThan(4); // side by side
  expect(await y('#cfg-cta')).toBeGreaterThan(await y('#cfg-text'));
});

test('Logo, Text-Durchlauf, Anlasswechsel und Rücksprung bleiben fliegbar (Grenzen wie tests/show-physics.spec.ts)', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Die Bewegung ist auf allen Geräten dieselbe.');
  test.setTimeout(600_000);
  const LIMITS = { speed: 2.6, accel: 5.5 };
  const measure = () => page.evaluate(() => {
    const trace = (window as unknown as { __showTrace: [number, number[]][] }).__showTrace;
    let speed = 0, accel = 0;
    for (let f = 2; f < trace.length; f++) {
      const [t0, p0] = trace[f - 2], [t1, p1] = trace[f - 1], [t2, p2] = trace[f];
      const d1 = t1 - t0, d2 = t2 - t1;
      if (d1 < 0.012 || d2 < 0.012 || Math.abs(d1 - d2) > 0.002) continue;
      for (let k = 0; k < Math.min(p0.length, p1.length, p2.length); k += 3) {
        const v1 = [0, 1, 2].map((q) => (p1[k + q] - p0[k + q]) / d1), v2 = [0, 1, 2].map((q) => (p2[k + q] - p1[k + q]) / d2);
        speed = Math.max(speed, Math.hypot(...v2));
        accel = Math.max(accel, Math.hypot(v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]) / ((d1 + d2) / 2));
      }
    }
    (window as unknown as { __showTrace: unknown[] }).__showTrace = [];
    return { speed, accel };
  });
  await page.clock.install();
  await page.goto(`${CFG}?anlass=hochzeit&paket=ODYSSEY&drohnen=600#konfigurator`);
  await page.clock.runFor(1000);
  await page.evaluate(() => { (window as unknown as { __showTrace: unknown[] }).__showTrace = []; });
  await page.locator('#cfg-file').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: LOGO_PNG });
  await page.clock.runFor(2000);
  await expect(scene(page)).toHaveText('Euer Logo');
  await page.locator('#cfg-use-logo').click();
  await page.locator('#cfg-text').fill('Anna & Ben');
  await page.locator('#cfg-text').press('Enter');
  await page.clock.runFor(90_000); // the run-through, the logo, motifs
  await occasion(page, 'kultur'); // through the cloud
  await page.clock.runFor(150_000); // a whole round and the loop back to the logo
  const { speed, accel } = await measure();
  expect.soft(speed, 'speed').toBeLessThanOrEqual(LIMITS.speed);
  expect.soft(accel, 'acceleration').toBeLessThanOrEqual(LIMITS.accel);
});

test('Sechzehnte Fassung: gesperrte Motive stehen neben der Spur, ein Klick stellt ihre Drohnenzahl ein', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${CFG}?anlass=hochzeit&paket=HORIZON#konfigurator`);
  const locks = page.locator('#cfg-locks .cfg-lock');
  await expect(locks).toHaveCount(2);
  await expect(locks.nth(0)).toHaveAttribute('aria-label', 'Lotusblüten: ab 250 Drohnen, Drohnenzahl auf 250 stellen');
  await expect(locks.nth(1)).toHaveAttribute('aria-label', 'Antrag: ab 450 Drohnen, Drohnenzahl auf 450 stellen');
  await locks.nth(0).focus();
  await expect(page.locator('#cfg-tip')).toHaveClass(/is-on/);
  await expect(page.locator('#cfg-tip')).toHaveText('Lotusblüten · ab 250 Drohnen');
  await page.keyboard.press('Enter');
  await expect(page.locator('#cfg-dronecount')).toHaveText('250');
  await expect(page.locator('#cfg-toast')).toHaveText('Neues Motiv freigeschaltet: Lotusblüten');
  await expect(scene(page)).toHaveText('Zwei Lotusblüten in 3D drehen sich ineinander');
  await expect(locks).toHaveCount(1);
  // SPARK mit 100 Drohnen: gesperrt sind die Schwellen 110, 120, 150 (Katalog- und Showmotive), 250 und 450 (Runde 25: ein Punkt je Schwelle)
  await pkg(page, 0);
  await expect(locks).toHaveCount(5);
  expect(errors).toEqual([]);
});

test('Runde 9: weniger Text; der Hinweis zum Logo steht hinter dem Info-Zeichen (Klick, Fokus, Esc)', async ({ page }, info) => {
  await page.goto(`${CFG}#konfigurator`);
  const tip = page.locator('#cfg-legal'), button = page.locator('#cfg-info');
  await expect(tip).toBeHidden();
  await expect(page.locator('#cfg-meta')).not.toContainText('Drohnen'); // die Zahl steht am Regler
  await expect(page.locator('#cfg-note')).toHaveText('Alle Motive hier sind Beispiele. Für eure Show entwerfen wir eigene.'); // Runde 11
  // per Tastatur: Fokus öffnet, Esc schließt
  await button.focus();
  await expect(tip).toBeVisible();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(tip).toBeHidden();
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  // per Klick (bzw. Tippen): bleibt offen, bis man woanders hintippt
  if (info.project.name.startsWith('mobile')) await button.tap(); else await button.click();
  await expect(tip).toBeVisible();
  await page.mouse.click(2, 400); // irgendwo anders hin (am Rand, außerhalb des Hinweises)
  await expect(tip).toBeHidden();
  await expect(page.locator('#cfg-file')).toHaveAccessibleDescription(/Lade nur Logos hoch/);
});

test('Runde 10: nicht gewählte Pakete behalten ihre Farbe, gedämpft und mit mindestens 4,5:1 Kontrast', async ({ page }) => {
  await page.goto(`${CFG}#konfigurator`);
  const colours = await page.locator('.cfg-pkgs input:not(:checked) + span b').evaluateAll((els) => els.map((el) => getComputedStyle(el).color));
  expect(colours).toHaveLength(2);
  const L = (c: number[]) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  for (const c of colours) {
    const rgb = (c.match(/[\d.]+/g) ?? []).map(Number).slice(0, 3).map((v) => (c.startsWith('color(') ? v * 255 : v)); // color-mix kommt als color(srgb 0–1)
    expect(Math.max(...rgb) - Math.min(...rgb), `${c} ist farbig, nicht grau`).toBeGreaterThan(30);
    expect((L(rgb) + 0.05) / (L([15, 13, 12]) + 0.05), `${c} auf --ground`).toBeGreaterThanOrEqual(4.5);
  }
});

// ---------- Runde 11 (Marc, 1.11.2026): Anlass als Dropdown, Ordnung der Startseite, gleitender Paketrahmen, Luft ----------

/** x-Verschiebung eines Elements aus seiner berechneten transform-Matrix. */
const shiftX = (page: Page, sel: string) => page.locator(sel).evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);
/** Zeichnet die x-Verschiebung eines Elements je Bild auf, bis stop() gerufen wird. */
const sample = (page: Page, sel: string) => page.evaluate((s) => {
  const el = document.querySelector(s)!, w = window as unknown as { __xs: number[]; __stop: boolean };
  w.__xs = []; w.__stop = false;
  const tick = () => { w.__xs.push(new DOMMatrixReadOnly(getComputedStyle(el).transform).m41); if (!w.__stop) requestAnimationFrame(tick); };
  tick();
}, sel);
const stopSample = (page: Page) => page.evaluate(() => { const w = window as unknown as { __xs: number[]; __stop: boolean }; w.__stop = true; return w.__xs; });
/** Linke Kante der Paketspalte k relativ zur Gruppe (dort sitzt der Rahmen am Ende). */
const columnX = (page: Page, k: number) => page.locator('.cfg-pkgs').evaluate((g, i) => (g.querySelectorAll('label')[i] as HTMLElement).getBoundingClientRect().left - (g.querySelector('.cfg-ind-sel') as HTMLElement).offsetLeft - g.getBoundingClientRect().left - g.clientLeft, k);

/** Sample the real CSS transition at a fixed point; rAF can miss its middle on loaded CI WebKit. */
const armTransition = (page: Page, selector: string) => page.locator(selector).evaluate((el) => {
  const w = window as unknown as { __transitionX: number | null };
  w.__transitionX = null;
  const capture = (event: Event) => {
    if ((event as TransitionEvent).propertyName !== 'transform') return;
    const animation = el.getAnimations().find(a => (a as Animation & { transitionProperty?: string }).transitionProperty === 'transform');
    if (!animation) return;
    animation.pause();
    animation.currentTime = Number(animation.effect!.getComputedTiming().duration) / 4;
    w.__transitionX = new DOMMatrixReadOnly(getComputedStyle(el).transform).m41;
    animation.play();
    el.removeEventListener('transitionrun', capture);
  };
  el.addEventListener('transitionrun', capture);
});
const transitionX = (page: Page) => page.evaluate(() => (window as unknown as { __transitionX: number | null }).__transitionX);

test('Runde 22: Anlass als Pills in der Ordnung der Startseite, der erste ist gewählt, ?anlass gewinnt', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-06-15T12:00:00'));
  await page.goto(`${CFG}#konfigurator`);
  await expect(page.getByRole('group', { name: 'Anlass' })).toBeVisible();
  await expect(page.locator('#cfg-occasion label')).toHaveText(['Launch', 'Jubiläum', 'Stadtfest', 'Hochzeit', 'Kultur', 'Winter & Silvester', 'Euer Logo']);
  await expect(chosenOccasion(page)).toHaveValue('launch');
  await expect(scene(page)).toHaveText('Die Rakete als Körper schwebt und dreht sich');
  // ein Klick wechselt den Anlass (Marc: kein zusätzlicher Klick wie beim Dropdown)
  await occasion(page, 'hochzeit');
  await expect(chosenOccasion(page)).toHaveValue('hochzeit');
  await expect(scene(page)).toHaveText(/Solitär|Ring/);
  // Tastatur: Pfeiltaste wechselt innerhalb der Radio-Gruppe
  await chosenOccasion(page).focus();
  await page.keyboard.press('ArrowRight');
  await expect(chosenOccasion(page)).toHaveValue('kultur');
  await page.goto(`${CFG}?anlass=kultur#konfigurator`);
  await expect(chosenOccasion(page)).toHaveValue('kultur');
});

test('Runde 22: nicht gewählte Anlässe gedämpft, aber über 4,5:1, beim Zeigen voll', async ({ page }) => {
  await page.goto(`${CFG}?anlass=launch#konfigurator`);
  const span = (id: string) => page.locator(`#cfg-occasion label[data-occasion="${id}"] span`);
  const ratio = (fg: string, bg = [15, 13, 12]) => { const c = fg.match(/[\d.]+/g)!.map(Number); const a = c[3] ?? 1; const mix = c.slice(0, 3).map((v, i) => v * a + bg[i] * (1 - a)); const L = (x: number[]) => { const [r, g, b] = x.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }; return (L(mix) + 0.05) / (L(bg) + 0.05); };
  const dim = ratio(await span('hochzeit').evaluate((e) => getComputedStyle(e).color));
  expect(dim).toBeGreaterThanOrEqual(4.5);
  expect(dim).toBeLessThan(6);
  await page.locator('#cfg-occasion label[data-occasion="hochzeit"]').hover();
  await expect.poll(async () => ratio(await span('hochzeit').evaluate((e) => getComputedStyle(e).color))).toBeGreaterThan(15);
});

test('Runde 11: im November und Dezember steht Winter & Silvester vorn und ist gewählt, wie die Karte der Startseite', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-01T12:00:00'));
  await page.goto(`${CFG}#konfigurator`);
  await expect(page.locator('#cfg-occasion label')).toHaveText(['Winter & Silvester', 'Launch', 'Jubiläum', 'Stadtfest', 'Hochzeit', 'Kultur', 'Euer Logo']);
  await expect(chosenOccasion(page)).toHaveValue('silvester');
  await page.locator('#cfg-cta').scrollIntoViewIfNeeded();
  await expect(page.locator('#cfg-cta')).toHaveAttribute('href', /anlass=stadt/);
});

test('Bewegung pausiert: der Auswahlrahmen springt ohne Zwischenwerte (Marc, Runde 20c)', async ({ page }) => {
  await paused(page);
  await page.goto(`${CFG}#konfigurator`);
  const sel = '.cfg-ind-sel';
  await expect.poll(() => shiftX(page, sel)).toBeCloseTo(await columnX(page, 1), 0);
  const [from, to] = [await columnX(page, 1), await columnX(page, 2)];
  await sample(page, sel);
  await pkg(page, 2);
  await page.waitForTimeout(500);
  const xs = await stopSample(page);
  expect(xs.some((x) => x > from + 4 && x < to - 4), `keine Zwischenwerte erwartet: ${xs.map(Math.round).join(',')}`).toBe(false);
  expect(xs.at(-1)).toBeCloseTo(to, 0);
});

test('Runde 11: der Auswahlrahmen gleitet zum neuen Paket (Klick und Regler), der Schatten beim Zeigen gedämpft', async ({ page }, info) => {
  // Runde 20c: bei pausierter Bewegung gleitet nichts (zentraler Schalter in global.css), dieser Test prüft das Gleiten
  // deshalb mit laufender Bewegung; das Springen bei Pause prüft der Test „Bewegung pausiert: der Rahmen springt“.
  await page.goto(`${CFG}#konfigurator`);
  // Only the preview engine pauses; global motion and the native CSS transitions stay enabled.
  await page.locator('#cfg-play').click();
  await expect(page.locator('#cfg-play')).toHaveAttribute('data-paused', 'true');
  const sel = '.cfg-ind-sel', ghost = page.locator('.cfg-ind-hover');
  await expect.poll(() => shiftX(page, sel)).toBeCloseTo(await columnX(page, 1), 0); // HORIZON zu Beginn
  // Klick: der Rahmen läuft über Zwischenwerte von HORIZON nach ODYSSEY
  const [from, to] = [await columnX(page, 1), await columnX(page, 2)];
  await armTransition(page, sel);
  await pkg(page, 2);
  await expect.poll(() => transitionX(page)).not.toBeNull();
  const middle = (await transitionX(page))!;
  expect(middle).toBeGreaterThan(from + 4);
  expect(middle).toBeLessThan(to - 4);
  await expect.poll(() => shiftX(page, sel)).toBeCloseTo(to, 0);
  await expect(page.locator(sel)).toHaveCSS('border-top-color', 'rgb(51, 237, 242)'); // in der Farbe von ODYSSEY
  // der Regler stellt das Paket um: auch dann gleitet der Rahmen
  await armTransition(page, sel);
  const slider = page.locator('#cfg-drones');
  await slider.focus();
  for (let i = 0; i < 11; i++) await page.keyboard.press('ArrowLeft'); // 300 → 190: SPARK
  await expect(page.locator('#cfg-pkg')).toHaveText('SPARK');
  await expect.poll(() => transitionX(page)).not.toBeNull();
  const back = (await transitionX(page))!;
  expect(back).toBeGreaterThan(4);
  expect(back).toBeLessThan(to - 4);
  await expect.poll(() => shiftX(page, sel)).toBeCloseTo(0, 0);
  if (info.project.use.isMobile) return; // Zeigen gibt es nur mit Maus
  // Zeigen auf ein anderes Paket: der Schatten gleitet gedämpft dorthin, der Rahmen bleibt beim gewählten
  const box = (await page.locator('label:has([name=pkg][value="2"])').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
  await expect.poll(async () => Number(await ghost.evaluate((el) => getComputedStyle(el).opacity))).toBeCloseTo(0.5, 1);
  await expect.poll(() => shiftX(page, '.cfg-ind-hover')).toBeCloseTo(to, 0);
  expect(await shiftX(page, sel)).toBeCloseTo(0, 0);
  await expect(ghost).toHaveCSS('border-top-color', 'rgb(51, 237, 242)');
  // Maus raus: der Schatten blendet aus und gleitet zurück zum gewählten Paket
  await page.mouse.move(box.x + box.width / 2, box.y + box.height + 160, { steps: 4 });
  await expect.poll(async () => Number(await ghost.evaluate((el) => getComputedStyle(el).opacity))).toBe(0);
  await expect.poll(() => shiftX(page, '.cfg-ind-hover')).toBeCloseTo(0, 0);
});

test('Runde 11: bei reduzierter Bewegung wechselt der Rahmen sofort', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${CFG}#konfigurator`);
  // die Site setzt bei reduzierter Bewegung global 0,01 ms (global.css), die Komponente selbst „none“
  await expect.poll(() => page.locator('.cfg-ind-sel').evaluate((el) => Math.max(...getComputedStyle(el).transitionDuration.split(',').map(parseFloat)))).toBeLessThan(0.001);
  await pkg(page, 0);
  expect(await shiftX(page, '.cfg-ind-sel')).toBeCloseTo(0, 0);
});

test('Runde 11: Paket, Preis und Anfrage als eigene Fläche mit Abstand zur Bedienung', async ({ page }) => {
  await page.goto(`${CFG}#konfigurator`);
  const sum = page.locator('.cfg-sum');
  await expect(sum.locator('#cfg-pkg')).toBeVisible();
  await expect(sum.locator('#cfg-price')).toBeVisible();
  await expect(sum.locator('#cfg-meta')).toBeVisible();
  await expect(sum.locator('#cfg-cta')).toBeVisible();
  const gap = await page.evaluate(() => {
    const own = document.querySelector('.cfg-own')!.getBoundingClientRect(), s = document.querySelector('.cfg-sum')!.getBoundingClientRect();
    const blocks = [...document.querySelectorAll('.cfg-panel > .cfg-block')].map((b) => b.getBoundingClientRect());
    return { sum: s.top - own.bottom, between: Math.min(...blocks.slice(1).map((b, i) => b.top - blocks[i].bottom)),
      compact: matchMedia('(max-width: 62.5em) and (max-height: 45em)').matches };
  });
  // Niedrige Handys (Runde 27): bewusst 1rem statt des geräumigen Desktop-Abstands.
  expect(gap.between, 'Abstand zwischen den Eingabegruppen').toBeGreaterThanOrEqual(gap.compact ? 16 : 18);
  expect(gap.sum, 'Abstand zur Ergebnisfläche').toBeGreaterThan(gap.between);
  expect(await sum.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
});


test('Runde 24: Katalogmotive spielen ab ihrer Punktzahl, der eigene Text hebt die Drohnenzahl auf seinen Bedarf', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // Sportwagen (147 Punkte) spielt ab 150 Drohnen; ein Link mit weniger öffnet ihn mit genug Drohnen
  await page.goto(`${CFG}?anlass=launch&paket=SPARK&drohnen=100&motiv=sportwagen#konfigurator`);
  await expect(page.locator('#cfg-dronecount')).toHaveText('150');
  await expect(scene(page)).toHaveText('Sportwagen, eine Formation aus dem FlyingStars-Katalog');
  await expect(field(page)).toHaveAttribute('data-points', '150');
  // ein Lichtpunkt je Schwelle: bei 100 Drohnen schalten 120 und 150 je mehrere Motive frei
  await page.goto(`${CFG}?anlass=launch&paket=SPARK&drohnen=100#konfigurator`);
  const locks = page.locator('#cfg-locks .cfg-lock');
  await expect(locks.first()).toHaveAttribute('data-at', '110'); // Roboter, Zahnräder (Runde 25)
  const thresholds = await locks.evaluateAll((els) => els.map((el) => Number((el as HTMLElement).dataset.at)));
  expect(new Set(thresholds).size).toBe(thresholds.length);
  // Text: 10 Drohnen je Zeichen ohne Leerzeichen; „ANNA & BEN TOM“ = 11 Zeichen → 110 Drohnen
  const budget = page.locator('#cfg-text-budget');
  await expect(budget).toBeHidden();
  await page.locator('#cfg-text').fill('ANNA & BEN');
  await page.locator('#cfg-text').press('Enter');
  await expect(budget).toHaveText('8 von 10 Zeichen bei 100 Drohnen');
  await expect(page.locator('#cfg-dronecount')).toHaveText('100');
  await page.locator('#cfg-text').fill('ANNA & BEN TOM');
  await page.locator('#cfg-text').press('Enter');
  await expect(page.locator('#cfg-dronecount')).toHaveText('110');
  await expect(budget).toContainText('11 von 11 Zeichen bei 110 Drohnen');
  await expect(budget).toContainText('mindestens 110 Drohnen');
  // ein Absenken unter den Bedarf hält der Regler fest
  await page.locator('#cfg-drones').fill('100');
  await expect(page.locator('#cfg-dronecount')).toHaveText('110');
  await expect(budget).toContainText('Mit eurem Text bleiben es mindestens 110 Drohnen');
  expect(errors).toEqual([]);
});
