import { test, expect } from '@playwright/test';
import { redirects } from './routes';
import { LOCALES, localizedHref } from '../src/i18n/routing.mjs';

const cases = [
  { route: '/musikalischer-teaser-bokkenrijders/', name: 'Bokkenrijders', droneCount: 600, pictures: 6, next: '/nfl-berlin-game/' },
  { route: '/nfl-berlin-game/', name: 'NFL Berlin Game', droneCount: 289, pictures: 6, next: '/exploring-reinvented-der-neue-ford-explorer/' },
  { route: '/exploring-reinvented-der-neue-ford-explorer/', name: 'Ford Explorer', droneCount: 369, pictures: 6, next: '/puma-bundesliga/' },
  { route: '/puma-bundesliga/', name: 'PUMA', droneCount: 78, pictures: 4, next: '/musikalischer-teaser-bokkenrijders/' },
];

for (const project of cases) {
  test(`${project.name}: Geschichte, echte Formation und nächstes Projekt`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(project.route);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(project.name);
    await expect(page.locator('.c-step')).toHaveCount(4);
    await expect(page.locator('.c-track figure')).toHaveCount(project.pictures);
    // Kopf wie auf der Startseite: stummes Showvideo ohne Abspielknopf (Marc, 01.11.2026)
    await expect(page.locator('.c-hero video[data-reel]')).toHaveJSProperty('muted', true);
    await expect(page.locator('.c-hero video[data-reel]')).not.toHaveAttribute('controls');
    await expect(page.getByRole('button', { name: /Showvideo abspielen/ })).toHaveCount(0);
    const formation = page.locator('.c-play');
    await formation.scrollIntoViewIfNeeded();
    await expect(page.locator('[data-tally]')).toContainText(`${project.droneCount} Drohnen`);
    await expect(page.locator('[data-replay]')).toBeEnabled();
    await page.getByRole('button', { name: 'Animation pausieren', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Animation fortsetzen', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Noch mal starten', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Animation pausieren', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.c-next')).toHaveAttribute('href', project.next);
    expect(errors).toEqual([]);
  });
}

test('Referenzen verlinken alle vier Fälle und blenden redaktionelle Entwürfe aus', async ({ page }) => {
  await page.goto('/referenzen/');
  await expect(page.locator('header.nav nav a[href="/referenzen/"]')).toHaveAttribute('aria-current', 'page');
  for (const project of cases) await expect(page.locator(`a.proj[href="${project.route}"]`).first()).toBeVisible();
  await expect(page.getByText('Beispielprojekt', { exact: true })).toHaveCount(0);
  await page.locator(`a.proj[href="${cases[0].route}"]`).first().click();
  await expect(page).toHaveURL(new RegExp(cases[0].route));
});

test('Bildergalerie lässt sich mit der Tastatur horizontal bedienen', async ({ page }) => {
  await page.goto('/musikalischer-teaser-bokkenrijders/');
  const gallery = page.getByRole('region', { name: 'Bokkenrijders: Bildergalerie' });
  await gallery.scrollIntoViewIfNeeded();
  await gallery.focus();
  await gallery.press('ArrowRight');
  await expect.poll(() => gallery.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
});

test('Reduzierte Bewegung zeigt eine statische echte Formation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/musikalischer-teaser-bokkenrijders/');
  await page.locator('.c-play').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-tally]')).toContainText('600 Drohnen');
  await expect(page.locator('[data-formation-pause]')).toBeHidden();
  await expect(page.locator('[data-replay]')).toBeDisabled();
  // A visible formation, not just a successfully downloaded JSON document.
  await expect.poll(() => page.locator('canvas[data-formation]').evaluate((node) => {
    const canvas = node as HTMLCanvasElement;
    const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    return pixels.some((value, index) => index % 4 === 3 && value > 0);
  })).toBe(true);
});

// „Projekte“ heißt seit dem 30.10.2026 „Referenzen“. Alte Adressen leiten weiter, die Fallstudien bleiben unter ihren Live-URLs.
const moved: Record<string, string> = {
  '/projekte/': '/referenzen/',
  ...Object.fromEntries(cases.map((c) => [`/projekte${c.route}`, c.route])),
  '/leistungen/': '/drohnenshow-preise/',
  '/warum-wir/': '/ueber-uns/',
  // Konfigurator steht seit der sechzehnten Fassung (31.10.2026) direkt auf der Preisseite
  '/show-konfigurator/': '/drohnenshow-preise/#konfigurator',
};

test('Alte Adressen leiten auf die neue Seite weiter', async ({ page }) => {
  const localizedMoves = Object.fromEntries(LOCALES.flatMap(locale => Object.entries(moved).map(([from, to]) => [localizedHref(from, locale), localizedHref(to, locale)])));
  expect(redirects).toEqual(Object.keys(localizedMoves).sort());
  for (const [from, to] of Object.entries(localizedMoves)) {
    await page.goto(from);
    await expect(page).toHaveURL(new RegExp(`${to.replaceAll('/', '\\/')}$`));
    // canonical ohne Sprungmarke
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${to.split('#')[0]}$`));
  }
});

test('Referenzen zeigen die Zahl der Shows pro Jahr', async ({ page }) => {
  await page.goto('/referenzen/');
  const years = page.locator('#pro-jahr .cell');
  await expect(years).toHaveCount(6);
  await expect(years.last()).toContainText('178');
});

// Real source material without a downloadable hero loop or formation file.
const addedCases = [
  { route: 'hochzeit-recklinghausen', name: 'Hochzeit', video: 'WRoA4dbs88w', gallery: 0 },
  { route: 'heiratsantrag-hugenpoet', name: 'Hugenpoet', video: 'JhOLT_DfA8M', gallery: 0 },
  { route: 'loreal-prada-rheinturm', name: 'Prada Paradoxe', video: 'm2K9VoelZYY', gallery: 3 },
];
for (const project of addedCases) {
  test(`${project.name}: belegte Geschichte ohne erfundene Medien`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/${project.route}/`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(project.name);
    await expect(page.locator('.c-step')).toHaveCount(3);
    await expect(page.locator('.c-hero video, .c-play')).toHaveCount(0);
    await expect(page.locator('.c-track figure')).toHaveCount(project.gallery);
    await expect(page.getByRole('link', { name: /Originalfilm/ })).toHaveAttribute('href', `https://www.youtube.com/watch?v=${project.video}`);
    await expect(page.locator('.c-next')).toHaveAttribute('href', /\/$/);
    await expect(page.locator('.idx')).toContainText('/ 07');
    expect(errors).toEqual([]);
  });
}

test('Alle Hochzeits- und Werbekarten verlinken sprachgleiche Fallstudien', async ({ page }) => {
  for (const locale of LOCALES) {
    for (const slug of ['drohnenshow-hochzeit', 'drohnenshow-werbung']) {
      await page.goto(localizedHref(`/${slug}/`, locale));
      const cards = page.locator('#referenzen .proj');
      await expect(cards).toHaveCount(slug.endsWith('hochzeit') ? 2 : 4);
      for (const card of await cards.all()) {
        const href = await card.getAttribute('href');
        expect(href).toBeTruthy();
        expect(href).toMatch(locale === 'de' ? /^\/(?!en\/|nl\/)/ : new RegExp(`^/${locale}/`));
      }
    }
  }
});
