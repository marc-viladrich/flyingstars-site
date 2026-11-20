import { test, expect, type Page } from '@playwright/test';
import { reach, tap } from './helpers/reach';

// Runde 5 (18.11.2026): seit Moritz' Preistext gibt es keine Paketknöpfe mehr. Der Konfigurator startet als „Individuelles
// Paket“; Drohnenzahl und Art der Show (2D · 3D · 3D+, Runde 6 als Pills mit Häkchen) bestimmen Vorschau und Preis, die drei Pakete sind
// feste Startpunkte („SPARK anpassen“). Die Tests der alten Paketwahl (Paketknöpfe, Bereichswechsel am Regler, Paketfarben,
// gleitender Paketrahmen) sind entfernt und durch die Tests am Ende dieser Datei ersetzt.

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

test('ODYSSEY erzählt jedes Motiv in Akten, ↻ beginnt die Show von vorn', async ({ page }) => {
  await page.goto(`${CFG}#konfigurator`);
  await page.goto(`${CFG}?anlass=launch&paket=ODYSSEY&motiv=idee#konfigurator`);
  await expect(scene(page)).toHaveText('Ein Glühfaden glimmt');
  await expect(scene(page)).toHaveText('um ihn formt sich die Glühbirne', { timeout: 20_000 });
  // Runde 10: am Handy gibt es keine Strichleiste mehr (nur Pfeile), dort entfällt der Sprung an den Anfang
  if (!(await page.locator('#cfg-track').isVisible())) return;
  await page.locator('#cfg-track').focus();
  await page.keyboard.press('Home'); // the track's start: the show from the beginning (Runde 10: Marketing beginnt mit Chat/QR)
  await expect(scene(page)).toHaveText('Eine Nachricht kommt an');
});

test('Direktlink öffnet Anlass, Paket und Motiv', async ({ page }) => {
  await page.goto(`${CFG}?anlass=launch&paket=HORIZON&motiv=rakete#konfigurator`);
  await expect(chosenOccasion(page)).toHaveValue('launch');
  await expect(page.locator('#cfg-pkg')).toHaveText('HORIZON');
  await expect(scene(page)).toHaveText('Die Rakete als Körper schwebt und dreht sich');
});

/** Drone count shown next to the slider. */
const droneCount = (page: Page) => page.locator('#cfg-dronecount');

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
  // the track: a click near its end jumps to a later picture; keyboard steps one picture. Runde 10: auf dem Handy gibt es
  // die Spur nicht mehr (nur die Pfeile, eigener Test unten)
  test.skip(Boolean(info.project.use.isMobile), 'Spur nur ab Tablet-Breite');
  const track = page.locator('#cfg-track'), box = (await track.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.9, box.y + box.height / 2);
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
      // Runde 6 (Marc: Aufbau wie vor Runde 5): die Paket-Box steht links unter der Bedienung, bei 1440 × 900 unter dem
      // ersten Bildschirm wie damals; die mobile Preisleiste bzw. das Scrollen bringt sie ins Bild
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
  // every motif of the occasion with its minimum; Runde 10: der Antrag ab dem Einstieg in 3D+ (300), die Lotusblüten mit der
  // zweiten Stufe von 3D+ (400)
  expect([...seen]).toEqual(expect.arrayContaining(['Antrag · ab 300 Drohnen', 'Lotusblüten · ab 400 Drohnen', 'Ringe · ab 300 Drohnen']));
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

/** A test PNG: a red ring, a blue box and a black triangle on transparent ground (black lights as warm white). */
const LOGO_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAHgAAABaCAYAAABzAJLvAAACk0lEQVR42u2doVLDUBBFk5XofAKiGlVRhUDxaXwHX4BCI/gERBU6GlsUM0wm07y2eXm7d8+1MOR1D/dukpduug4hhBBCCCGEEEIIIYQQqqu+5cGPu8Op9Hfvvz56cDkHfAlQgAcCvCZYQDsBXBMqsMtlKnBbHjeNgz0VGDevDPhauCUgav5tADu83OHyakPApcWuUeiWx04BuKTAWxTXyzqkAC8VtUVBPa4p5GWS10IuHTfjZVSv6JLj7nB6fHhJF8ffr/v+JgdHiUAujyrcyaKowQGfcy9wgwMGLhGNFAHjXgHAbMEldTDuFQCMe5M6GPdyFo0AjJoCpv8mdTD9l4hGAG6nn/dnAKvDzQSZiAawZjRncbFl7rsZIFv2kyp1yOl68N3TGz24E9lhmrrzD+4UsrKLTfWO1aXQVCFb1mjOEtWSgIdhOJXAzBDVpjYqYQo3+61MU9o5moO7FMVzP1eCbMoDT0r7rHI/NpX939K+WwpZxcWmMFXn1r6r3I8lz6LHcey5y3UB4HMx3drFU/deC1c1qm2NZ7FaQa4VzUpRbVGn3M3BvdW9ipdOpjLk5D/cNdah0o/7iFN2zvXdtde2do+X+G5STSef67tb/ONt1ffTTrqbc1TtdUR2cahZldNCfw67rtWxo0C2rcYnHXeH0y3RfW001jofiBLVIeZFzxWzxL2120MEJ4eY+L4fv5rDjRrVvfd3J1wKd4vdr0iQzfOsyClcr1ubnvux6/cmlbjXC1SvLnb75rMluB4eRIgA2eW7C+ei2WPxIpxVUzTx9Zrq0xmszyHgqLcDp+v0dFZtKg+sqz2ALx/R0fZdva7XiGbtqO6JMm13G3C1PydjlDq+H4x7+bwIIYQQQgghpKJfeZOW/W2RGroAAAAASUVORK5CYII=', 'base64');

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

test('Logo, Text-Durchlauf, Anlasswechsel und Rücksprung bleiben fliegbar (Grenzen wie tests/show-physics.spec.ts)', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Die Bewegung ist auf allen Geräten dieselbe.');
  test.setTimeout(600_000);
  const { expectFlyable, measure } = await import('./helpers/physics');
  await page.clock.install();
  await page.goto(`${CFG}?anlass=hochzeit&paket=ODYSSEY&drohnen=600#konfigurator`);
  await page.clock.runFor(1000);
  await page.evaluate(() => { (window as unknown as { __showTrace: unknown[] }).__showTrace = []; });
  await page.locator('#cfg-file').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: LOGO_PNG });
  await page.clock.runFor(2000);
  await expect(scene(page)).toHaveText('Euer Logo');
  await page.locator('#cfg-use-logo').click();
  await expect(chosenOccasion(page)).toHaveValue('hochzeit');
  // Applying a logo sets the show to the recommended fleet rather than the URL's starting count.
  const showDrones = Number(await droneCount(page).textContent());
  expect(showDrones).toBeGreaterThanOrEqual(300);
  await page.locator('#cfg-text').fill('Anna & Ben');
  await page.locator('#cfg-text').press('Enter');
  await page.clock.runFor(90_000); // the run-through, the logo, motifs
  expectFlyable(await measure(page), 'Logo und Text-Durchlauf', 600, 92);
  await occasion(page, 'kultur'); // through the cloud
  await expect(chosenOccasion(page)).toHaveValue('kultur');
  await page.clock.runFor(150_000); // a whole round and the loop back to the logo
  expectFlyable(await measure(page), 'Anlasswechsel und Rücksprung', showDrones, 150);
});

const transitionX = (page: Page) => page.evaluate(() => (window as unknown as { __transitionX: number | null }).__transitionX);

test('Runde 22: nicht gewählte Anlässe gedämpft, aber über 4,5:1, beim Zeigen voll', async ({ page, hasTouch }) => {
  await page.goto(`${CFG}?anlass=launch#konfigurator`);
  const span = (id: string) => page.locator(`#cfg-occasion label[data-occasion="${id}"] span`);
  const ratio = (fg: string, bg = [15, 13, 12]) => { const c = fg.match(/[\d.]+/g)!.map(Number); const a = c[3] ?? 1; const mix = c.slice(0, 3).map((v, i) => v * a + bg[i] * (1 - a)); const L = (x: number[]) => { const [r, g, b] = x.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }; return (L(mix) + 0.05) / (L(bg) + 0.05); };
  const dim = ratio(await span('hochzeit').evaluate((e) => getComputedStyle(e).color));
  expect(dim).toBeGreaterThanOrEqual(4.5);
  expect(dim).toBeLessThan(6);
  // Der Kontrast gilt überall; „beim Zeigen voll“ ist ein Maus-Zustand (:hover). Touch-Profile (Pixel 7, iPhone 13) haben
  // keinen Zeiger, der stehen bleibt, dort endet der Test nach der Kontrastprüfung.
  test.skip(hasTouch, 'Zeigen (Hover) gibt es nur mit Maus; auf Touch-Geräten gilt nur die Kontrastprüfung oben');
  await page.locator('#cfg-occasion label[data-occasion="hochzeit"]').hover();
  await expect.poll(async () => ratio(await span('hochzeit').evaluate((e) => getComputedStyle(e).color))).toBeGreaterThan(15);
});

test('Runde 24: Katalogmotive spielen ab ihrer Punktzahl, der eigene Text hebt die Drohnenzahl auf seinen Bedarf', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // Drehzahlmesser spielt ab der Stufe 150 (Runde 10: Freischaltungen nur auf Stufen); ein Link mit weniger öffnet ihn mit genug Drohnen
  await page.goto(`${CFG}?anlass=launch&paket=SPARK&drohnen=100&motiv=drehzahl#konfigurator`);
  await expect(page.locator('#cfg-dronecount')).toHaveText('150');
  await expect(scene(page)).toHaveText('Drehzahlmesser, eine Formation aus dem FlyingStars-Katalog');
  await expect(field(page)).toHaveAttribute('data-points', '150');
  // ein Lichtpunkt je Schwelle: bei 100 Drohnen schaltet erst 150 wieder mehrere Motive frei (Runde 10)
  await page.goto(`${CFG}?anlass=launch&paket=SPARK&drohnen=100#konfigurator`);
  const locks = page.locator('#cfg-locks .cfg-lock');
  await expect(locks.first()).toHaveAttribute('data-at', '150'); // Runde 10: keine Einzel-Freischaltung bei 110–140
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

// ---------- Runde 5: Show-Art, Paket als Startpunkt, Upgrades eingeklappt, erster Bildschirm, Katalogmotive ----------
// Runde 10: reach/tap liegen in tests/helpers/reach.ts (auch für logo-show-budget und inquiry-roundtrip)
const art = async (page: Page, id: '2d' | '3d' | 'story') => {
  const pill = page.locator(`#cfg-arts label[data-art="${id}"]`);
  await reach(page, pill);
  await pill.click();
};
const price = (page: Page) => page.locator('#cfg-price');

test('Runde 5: Start als individuelles 3D-Paket; Drohnenzahl und Art der Show bestimmen den Preis', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${CFG}#konfigurator`);
  await expect(page.locator('#cfg-pkg')).toHaveText('Eure 3D Show');
  await expect(page.locator('#cfg-arts input[value="3d"]')).toBeChecked();
  await expect(droneCount(page)).toHaveText('200');
  await expect(price(page)).toHaveText('ab 15.900 €');
  await expect(page.locator('.cfg-check-list[data-art="3d"]')).toBeVisible();
  await expect(page.locator('.cfg-check-list[data-art="3d"] li')).toHaveText(['Präzise Logos', 'Komplexe Schriftzüge', 'Synchron zu eurer Wunschmusik']);
  // Runde 9 (Punkt 5): 2D schlägt seine Einstiegszahl vor, 100 Drohnen zu 7.900 €
  await art(page, '2d');
  await expect(droneCount(page)).toHaveText('100');
  await expect(price(page)).toHaveText('ab 7.900 €');
  await expect(page.locator('#cfg-floor-note')).toHaveText('2D Show ab 100 Drohnen');
  await page.locator('#cfg-drones').focus(); await page.keyboard.press('Home');
  await expect(droneCount(page)).toHaveText('100');
  await expect(price(page)).toHaveText('ab 7.900 €');
  // Storytelling beginnt bei 300 Drohnen: die Zahl steigt mit, der Hinweis sagt warum
  await art(page, 'story');
  await expect(droneCount(page)).toHaveText('300');
  await expect(price(page)).toHaveText('ab 34.900 €');
  await expect(page.locator('#cfg-floor-note')).toHaveText('3D+ Show ab 300 Drohnen');
  // Runde 6: die Häkchen der gewählten Art blenden ein, die anderen sind unsichtbar (auch für Screenreader)
  await expect(page.locator('.cfg-check-list[data-art="story"]')).toBeVisible();
  await expect(page.locator('.cfg-check-list[data-art="story"] li').first()).toHaveText('Mit Storytelling');
  await expect(page.locator('.cfg-check-list[data-art="3d"]')).toBeHidden();
  // der Regler bleibt an der Mindestzahl stehen
  await page.locator('#cfg-drones').focus(); await page.keyboard.press('Home');
  await expect(droneCount(page)).toHaveText('300');
  await page.keyboard.press('End');
  await expect(price(page)).toHaveText('ab 104.200 €');
  expect(errors).toEqual([]);
});

test('Runde 5: die Art der Show steuert die Vorschau (2D flach, 3D als Körper, Storytelling in Akten)', async ({ page }) => {
  // Runde 9 (Punkt 5): ein Wechsel zu einer kleineren Art setzt deren Einstiegszahl; darum von 2D aufwärts
  await page.goto(`${CFG}?anlass=hochzeit&drohnen=300&art=2d#konfigurator`);
  const captions: Record<string, string[]> = {};
  for (const id of ['2d', '3d', 'story'] as const) {
    await art(page, id);
    await expect(field(page)).toHaveAttribute('data-points', '300');
    await page.waitForTimeout(400);
    captions[id] = [];
    for (let i = 0; i < 3; i++) { captions[id].push((await scene(page).textContent()) ?? ''); await page.locator('#cfg-next').click(); }
  }
  // jede Art zeigt eigene Fassungen derselben Motive
  expect(captions['2d'][0]).not.toBe(captions['3d'][0]);
  expect(captions['3d'][0]).not.toBe(captions.story[0]);
  expect(new Set([...captions['2d'], ...captions['3d'], ...captions.story]).size).toBeGreaterThanOrEqual(7);
});

test('Runde 5: ein Paket ist ein fester Startpunkt; jede Änderung, auch die Show-Art, macht ein individuelles Paket', async ({ page }) => {
  await page.goto(`${CFG}?paket=HORIZON#konfigurator`);
  await expect(page.locator('#cfg-pkg')).toHaveText('HORIZON');
  await expect(price(page)).toHaveText('15.900 €'); // Festpreis ohne „ab“
  await expect(page.locator('#cfg-pkg-label')).toHaveText('Festes Paket · Festpreis');
  await expect(page.locator('#cfg-arts input[value="3d"]')).toBeChecked();
  await art(page, '2d');
  await expect(page.locator('#cfg-pkg')).toHaveText('Eure 2D Show');
  await expect(price(page)).toHaveText('ab 7.900 €');
  expect(new URL(page.url()).searchParams.get('paket')).toBeNull();
  // ODYSSEY: Storytelling mit 300 Drohnen, Festpreis; mehr Drohnen = individuell mit dem Storytelling-Preis
  await page.goto(`${CFG}?paket=ODYSSEY#konfigurator`);
  await expect(page.locator('#cfg-arts input[value="story"]')).toBeChecked();
  await expect(droneCount(page)).toHaveText('300');
  await expect(price(page)).toHaveText('34.900 €');
  await page.locator('#cfg-drones').focus(); await page.keyboard.press('ArrowRight');
  await expect(page.locator('#cfg-pkg')).toHaveText('Eure 3D+ Show');
  await expect(droneCount(page)).toHaveText('400'); // Runde 9 (Punkt 8): eine Preisstufe weiter, 3D+ in 100er-Schritten
  await expect(price(page)).toHaveText('ab 44.800 €');
  // „SPARK anpassen“ auf derselben Seite setzt Drohnenzahl und Show-Art des Pakets
  // auf dem Handy liegt die feste Preisleiste über dem Link, solange er am unteren Rand steht: Klick per Skript
  await page.locator('a[data-cfg-preset="SPARK"]').evaluate((a: HTMLElement) => a.click());
  await expect(page.locator('#cfg-pkg')).toHaveText('SPARK');
  await expect(page.locator('#cfg-arts input[value="2d"]')).toBeChecked();
  await expect(droneCount(page)).toHaveText('100');
  await expect(price(page)).toHaveText('7.900 €');
});

test('Runde 5: Upgrades eingeklappt mit Zähler, klappen weich auf, rechnen in den Preis', async ({ page }) => {
  await page.goto(`${CFG}#konfigurator`);
  const toggle = page.locator('#cfg-up-toggle'), inner = page.locator('.cfg-up-inner');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(await inner.evaluate((el) => (el as HTMLElement).inert)).toBe(true);
  expect((await inner.boundingBox())?.height ?? 0).toBeLessThan(2);
  expect(await page.locator('.cfg-up-body').evaluate((el) => getComputedStyle(el).transitionProperty)).toContain('grid-template-rows');
  await expect(page.locator('#cfg-up-count')).toHaveText('(optional)');
  await reach(page, toggle); await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(await inner.evaluate((el) => (el as HTMLElement).inert)).toBe(false);
  await reach(page, page.locator('#cfg-upgrades label:has([value="film"])')); await page.locator('#cfg-upgrades label:has([value="film"])').click();
  await expect(page.locator('#cfg-up-count')).toHaveText('1 gewählt');
  await expect(price(page)).toHaveText('ab 16.800 €');
  await reach(page, page.locator('#cfg-upgrades label:has([value="indoor"])')); await page.locator('#cfg-upgrades label:has([value="indoor"])').click();
  await expect(page.locator('#cfg-up-count')).toHaveText('2 gewählt');
  await reach(page, toggle); await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#cfg-up-count')).toHaveText('2 gewählt');
});

test('Runde 6: Aufbau wie vor Runde 5 – Bedienung mit Paket-Box links, Vorschau rechts; Immer dabei unter der Box; Kopfabstand', async ({ page }, info) => {
  test.skip(Boolean(info.project.use.isMobile), 'Desktop-Anordnung');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(CFG);
  await expect(page.locator('.cfg-stage')).toBeInViewport({ ratio: 0.95 });
  await expect(page.locator('#cfg-drones')).toBeInViewport();
  const box = async (sel: string) => (await page.locator(sel).boundingBox())!;
  const panel = await box('#cfg'), stage = await box('.cfg-stage'), sum = await box('.cfg-sum'), always = await box('.cfg-always'), up = await box('.cfg-upgrades');
  expect(panel.x + panel.width, 'Bedienung links neben der Bühne').toBeLessThanOrEqual(stage.x);
  for (const b of [sum, always]) expect(b.x + b.width, 'Paket-Box und Immer dabei in der Bedienung').toBeLessThanOrEqual(stage.x);
  expect(sum.y, 'Paket-Box unter den Upgrades').toBeGreaterThan(up.y + up.height - 1);
  expect(always.y, 'Immer dabei unter der Paket-Box').toBeGreaterThan(sum.y + sum.height - 1);
  const h1 = await box('.cfg-head h1');
  expect(panel.y - (h1.y + h1.height), 'mehr Abstand Kopf → Werkzeug').toBeGreaterThanOrEqual(64);
  // Upgrades: eine Beschriftung wie die übrigen Felder, ohne Linien
  const toggle = page.locator('#cfg-up-toggle');
  for (const side of ['top', 'bottom']) expect(await toggle.evaluate((el, s) => getComputedStyle(el).getPropertyValue(`border-${s}-width`), side)).toBe('0px');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
});

test('Runde 5: die Anfrage nimmt Art der Show, Drohnenzahl und Paket mit', async ({ page }) => {
  await page.goto(`${CFG}#konfigurator`);
  await art(page, 'story');
  await expect(droneCount(page)).toHaveText('300');
  // (über URLSearchParams lesen: „+“ ist seit Runde 9 Teil von „3D+“, kein kodiertes Leerzeichen)
  const link = new URL((await page.locator('#cfg-cta').getAttribute('href')) ?? '', page.url());
  expect(link.searchParams.get('show')).toContain('Art der Show: 3D+ Show');
  expect(link.searchParams.get('drohnen')).toBe('300');
  await page.goto(`${CFG}?paket=SPARK#konfigurator`);
  await expect(page.locator('#cfg-pkg')).toHaveText('SPARK');
  const fixed = new URL((await page.locator('#cfg-cta').getAttribute('href')) ?? '', page.url());
  expect(fixed.searchParams.get('paket')).toBe('SPARK');
  expect(fixed.searchParams.get('show')).toContain('Art der Show: 2D Show');
});

// Runde 9: 2D reicht seit Runde 7 nur bis unter 400 Drohnen (Preisstufe 350), und die 2D-Verdichtung leuchtet dort alle
// Drohnen (gemessen 20.11.2026: 350 von 350); ab 400 ist die Show 3D
test('Runde 5/6: Katalogmotive zeichnen in 2D mit jeder Drohnenzahl dichter', async ({ page }) => {
  for (const [n, lit] of [[150, 150], [350, 350]]) {
    await page.goto(`${CFG}?anlass=silvester&motiv=lebkuchen&drohnen=${n}&art=2d#konfigurator`);
    await expect(scene(page)).toContainText('Lebkuchen');
    await expect(field(page)).toHaveAttribute('data-points', String(n));
    // vorher leuchteten immer die 99 Katalogpunkte; Runde 6 (Marc): verdichtet nur bis 200, weitere Drohnen bleiben dunkel
    await expect.poll(async () => Number(await field(page).getAttribute('data-lit')), { timeout: 15_000 }).toBeGreaterThan(lit * 0.9);
    expect(Number(await field(page).getAttribute('data-lit'))).toBeLessThanOrEqual(lit * 1.05);
  }
});


// Linkabgleich (19.11.2026): Art und Drohnenzahl werden erst nach allen Link-Werten abgeglichen. Nennt der Link die Art,
// gilt deren Mindestzahl; sonst folgt die Art der Drohnenzahl. Die Pills „Art der Show“ zeigen den Zustand, die Bühne
// zeigt ein Motiv, die Seite wirft keinen Fehler.
for (const [query, want] of [
  ['?anlass=kultur&drohnen=190', { art: '2d', drones: '190', pkg: 'Eure 2D Show', occasion: 'kultur' }],
  ['?art=story&drohnen=190', { art: 'story', drones: '300', pkg: 'Eure 3D+ Show' }],
  ['?paket=ODYSSEY&drohnen=190', { art: '2d', drones: '190', pkg: 'Eure 2D Show' }],
  ['?drohnen=400', { art: '3d', drones: '400', pkg: 'Eure 3D Show' }],
  ['?drohnen=210', { art: '3d', drones: '250', pkg: 'Eure 3D Show' }], // Runde 9: auf die Preisstufe
] as const) {
  test(`Linkabgleich ${query}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${CFG}${query}#konfigurator`);
    for (const id of ['2d', '3d', 'story']) {
      if (id === want.art) await expect(page.locator(`#cfg-arts input[value="${id}"]`)).toBeChecked();
      else await expect(page.locator(`#cfg-arts input[value="${id}"]`)).not.toBeChecked();
    }
    await expect(page.locator('.cfg-check-list[data-art="' + want.art + '"]')).toBeVisible();
    await expect(page.locator('#cfg-drones')).toHaveValue(want.drones);
    await expect(droneCount(page)).toHaveText(want.drones);
    await expect(page.locator('#cfg-pkg')).toHaveText(want.pkg);
    expect(new URL(page.url()).searchParams.get('paket')).toBeNull();
    if ('occasion' in want) await expect(page.locator(`input[name=occasion][value="${want.occasion}"]`)).toBeChecked();
    await expect(field(page)).toHaveAttribute('data-points', want.drones);
    await expect(scene(page)).not.toHaveText('');
    expect(errors).toEqual([]);
  });
}

// ---------- Runde 10 (Marc 20.11.2026) ----------

test('Runde 10: der Konfigurator startet direkt mit dem ersten Motiv, ohne lebendige Wolke vorweg', async ({ page }) => {
  // jede Bildbeschreibung, die die Bühne ansagt; die Wolke des Einstiegs (Runde 9) hatte eine leere
  await page.addInitScript(() => {
    const seen: string[] = ((window as unknown as { __captions: string[] }).__captions = []);
    document.addEventListener('DOMContentLoaded', () => {
      const node = document.querySelector('#cfg-scene');
      if (node) new MutationObserver(() => seen.push(node.textContent ?? '')).observe(node, { childList: true, characterData: true, subtree: true });
    });
  });
  await page.goto(`${CFG}#konfigurator`);
  await expect.poll(async () => Number(await field(page).getAttribute('data-lit'))).toBeGreaterThan(0);
  await page.waitForTimeout(2500);
  const captions = await page.evaluate(() => (window as unknown as { __captions: string[] }).__captions);
  expect(captions.length).toBeGreaterThan(0);
  expect(captions.filter((c) => !c.trim()), 'keine Wolke ohne Bildbeschreibung').toEqual([]);
});

test('Runde 10: am Handy hat die Steuerleiste nur Pause, Pfeile und Tempo, über die volle Breite', async ({ page }, info) => {
  test.skip(!info.project.use.isMobile, 'schmale Breiten');
  await page.goto(`${CFG}?anlass=hochzeit#konfigurator`);
  await expect.poll(async () => Number(await field(page).getAttribute('data-lit'))).toBeGreaterThan(0);
  await expect(page.locator('#cfg-track')).toBeHidden();
  await expect(page.locator('#cfg-locks')).toBeHidden();
  for (const id of ['#cfg-play', '#cfg-prev', '#cfg-next', '[data-rate="1"]']) await expect(page.locator(id)).toBeVisible();
  const bar = (await page.locator('#cfg-player').boundingBox())!, stage = (await page.locator('.cfg-stage').boundingBox())!;
  expect(bar.width, 'Leiste so breit wie die Bühne (abzüglich Rand)').toBeGreaterThan(stage.width - 32);
  const before = await scene(page).textContent();
  await page.locator('#cfg-next').tap();
  await expect(scene(page)).not.toHaveText(before ?? '');
});

test('Runde 10: Preisbox heißt „Eure 2D Show“, „Eure 3D Show“, „Eure 3D+ Show“, ohne Drohnenzahl', async ({ page }) => {
  await page.goto(`${CFG}#konfigurator`);
  await expect.poll(async () => Number(await field(page).getAttribute('data-lit'))).toBeGreaterThan(0);
  for (const [id, name] of [['2d', 'Eure 2D Show'], ['3d', 'Eure 3D Show'], ['story', 'Eure 3D+ Show']] as const) {
    await page.locator(`#cfg-arts label[data-art="${id}"] input`).evaluate((i) => (i as HTMLInputElement).click());
    await expect(page.locator('#cfg-pkg')).toHaveText(name);
  }
});

test('Runde 10: das Motiv steht im freien Teil der Bühne, über der Steuerleiste und unter der Oberkante', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); // jedes Motiv steht sofort in Ruhe
  await page.goto(`${CFG}?anlass=silvester&art=story&drohnen=600#konfigurator`);
  await expect.poll(async () => Number(await field(page).getAttribute('data-lit'))).toBeGreaterThan(0);
  for (let i = 0; i < 6; i++) {
    const r = await page.evaluate(() => {
      const c = document.querySelector<HTMLCanvasElement>('#cfg-field')!, k = c.width / c.getBoundingClientRect().width;
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      let y0 = Infinity, y1 = -1;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const o = (y * c.width + x) * 4; if (d[o] + d[o + 1] + d[o + 2] > 300) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
      const s = document.querySelector('.cfg-stage')!.getBoundingClientRect(), p = document.querySelector('#cfg-player')!.getBoundingClientRect();
      return { top: y0 / k, bottom: y1 / k, bar: p.top - s.top, scene: document.querySelector('#cfg-scene')!.textContent };
    });
    expect(r.top, `${r.scene}: oben frei`).toBeGreaterThan(2);
    expect(r.bottom, `${r.scene}: über der Leiste`).toBeLessThan(r.bar);
    await page.locator('#cfg-next').evaluate((b) => (b as HTMLButtonElement).click());
    await page.waitForTimeout(400);
  }
});

// ---------- Runde 10b (Marc 20.11.2026) ----------

test('Runde 10b: ein X im Textfeld nimmt den eigenen Text mit einem Klick heraus, auch per Tastatur', async ({ page }) => {
  await page.goto(`${CFG}#konfigurator`);
  await expect.poll(async () => Number(await field(page).getAttribute('data-lit'))).toBeGreaterThan(0);
  const input = page.locator('#cfg-text'), clear = page.locator('#cfg-text-clear');
  await expect(clear).toBeHidden();
  await reach(page, input); await input.fill('ANNA & BEN'); await input.press('Enter');
  await expect(clear).toBeVisible();
  await expect(clear).toHaveAccessibleName('Text entfernen');
  await expect(page.locator('#cfg-styles')).toBeVisible();
  await tap(page, clear);
  await expect(input).toHaveValue('');
  await expect(clear).toBeHidden();
  await expect(page.locator('#cfg-styles')).toBeHidden(); // wie ein leeres Feld: Schriftwahl weg, Show ohne Text
  await expect(input).toBeFocused();
  // Tastatur: Tab vom Feld auf das X, Eingabe leert
  await input.fill('LISA'); await expect(clear).toBeVisible();
  await clear.focus(); await page.keyboard.press('Enter'); // Safari springt mit Tab standardmäßig nicht auf Knöpfe
  await expect(input).toHaveValue('');
  // das X steht im Feld, rechts innen, und der Text läuft nicht darunter
  await input.fill('EIN LANGER NAME HIER');
  const i = (await input.boundingBox())!, x = (await clear.boundingBox())!;
  expect(x.x + x.width).toBeLessThanOrEqual(i.x + i.width + 0.5);
  expect(x.x).toBeGreaterThan(i.x + i.width / 2);
  expect(await input.evaluate((el) => parseFloat(getComputedStyle(el).paddingRight))).toBeGreaterThanOrEqual(x.width);
});

test('Runde 10b: „Herz mit Initialen“ in der Hochzeit kommt aus dem Text-Weg (Initialen im Herz, „A & T“)', async ({ page }) => {
  await page.goto(`${CFG}?anlass=hochzeit&art=2d&drohnen=100&motiv=initialen#konfigurator`);
  await expect(scene(page)).toHaveText('Ein Herz, eure Initialen darin');
  await expect(field(page)).toHaveAttribute('data-points', '100'); // schon bei 100 Drohnen (Marc)
});

test('Runde 10b: im Logo-Modus steht jedes Beispiel-Logo mittig, Luft oben ≈ Luft unten', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${CFG}#konfigurator`);
  await expect.poll(async () => Number(await field(page).getAttribute('data-lit'))).toBeGreaterThan(0);
  await page.locator('#cfg-occasion label[data-occasion="logo"] input').evaluate((i) => (i as HTMLInputElement).click());
  for (const id of await page.locator('#cfg-examples [data-example]').evaluateAll((l) => l.map((x) => (x as HTMLElement).dataset.example!))) {
    await page.locator(`#cfg-examples [data-example="${id}"]`).evaluate((b) => (b as HTMLButtonElement).click());
    // bis das Logo gerechnet ist, steht die lebendige Wolke auf der Bühne
    await expect(scene(page)).not.toHaveText(/berechnet/, { timeout: 15_000 });
    await page.waitForTimeout(800);
    const m = await page.evaluate(() => {
      const c = document.querySelector<HTMLCanvasElement>('#cfg-field')!, s = document.querySelector('.cfg-stage')!.getBoundingClientRect(), k = c.width / c.getBoundingClientRect().width;
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      let x0 = Infinity, x1 = -1, y0 = Infinity, y1 = -1;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const o = (y * c.width + x) * 4; if (d[o] + d[o + 1] + d[o + 2] > 300) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
      // mittig in der Bühne oder, wenn es einer Abdeckung (Hinweiskarte, Minimap) ausweicht, im Teil darüber
      const floors = [s.height];
      for (const sel of ['#cfg-over-card', '#cfg-minimap']) { const el = document.querySelector<HTMLElement>(sel); if (!el || el.hidden) continue; const r = el.getBoundingClientRect(); if (r.height && r.left - s.left < x1 / k && r.right - s.left > x0 / k && r.top - s.top > s.height * 0.45) floors.push(r.top - s.top); }
      const top = y0 / k, gaps = floors.map((f) => f - y1 / k);
      return { top, gaps, best: Math.min(...gaps.map((g) => Math.abs(top - g))), H: s.height };
    });
    // Lichthöfe zählen mit; die Abdeckung bekommt 4 % Abstand: Unterschied höchstens 8 % der Bühnenhöhe
    expect(m.best, `${id}: oben ${m.top.toFixed(0)} px, unten ${m.gaps.map((g) => g.toFixed(0)).join(' / ')} px`).toBeLessThanOrEqual(0.08 * m.H);
  }
});

