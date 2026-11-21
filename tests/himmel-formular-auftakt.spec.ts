// Runde 14 (Marc: man soll sofort sehen, dass der Text im Formular-Himmel variabel ist): Der Schwarm spielt im
// Himmelsfenster über dem Formular einmal je Seitenaufruf EURE SHOW → EUER TAG → heute → EURE SHOW und steht dann.
// Nicht bei reduzierter Bewegung, nicht mehr, sobald jemand etwas eingibt; das Fenster ist für Screenreader verborgen.
// Welches Bild die Bühne trägt, steht in data-himmel am Fenster (schwarm.ts → put()). Texte: src/scripts/himmel/himmel-texte.js.
import { test, expect, type Page } from '@playwright/test';

const WINDOW = '#inquiry-form .hm-own-form';
/** Nimmt über ms Millisekunden jeden Wechsel von data-himmel auf (im Browser, damit kein Wechsel zwischen zwei Abfragen fehlt). */
const record = (page: Page, ms: number) => page.evaluate(async ([sel, wait]) => {
  const el = document.querySelector<HTMLElement>(sel as string)!, seen: string[] = [];
  const note = () => { const v = el.dataset.himmel ?? ''; if (v && seen.at(-1) !== v) seen.push(v); };
  note(); const mo = new MutationObserver(note); mo.observe(el, { attributes: true, attributeFilter: ['data-himmel'] });
  await new Promise((r) => setTimeout(r, wait as number)); mo.disconnect(); return seen;
}, [WINDOW, ms] as const);
const today = (page: Page) => page.evaluate(() => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(2)}`; });
// Der Auftakt zählt erst, wenn das Fenster ganz im Blick ist (wie beim Scrollen bis zum Formular): mittig hinscrollen
const ready = async (page: Page) => { await page.locator(WINDOW).waitFor({ state: 'attached', timeout: 15_000 }); await page.locator(WINDOW).evaluate((el) => el.scrollIntoView({ block: 'center' })); };

test('Auftakt einmal: EURE SHOW → EUER TAG → heute → EURE SHOW, danach Ruhe', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/kontakt/');
  await ready(page);
  await expect(page.locator(WINDOW)).toHaveAttribute('data-himmel', 't:EURE SHOW:200', { timeout: 15_000 });
  // 1,8 s Stand + drei Wechsel (je gut 1 s Flug + 2,6 s Stand), dann noch einige Sekunden: kein zweiter Durchlauf
  const seen = await record(page, 18_000);
  expect(seen).toEqual(['t:EURE SHOW:200', 't:EUER TAG:200', `t:${await today(page)}:200`, 't:EURE SHOW:200']);
  // für Screenreader verborgen: keine Ansage je Wechsel
  await expect(page.locator(WINDOW)).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.hm-layer')).toHaveAttribute('aria-hidden', 'true');
});

test('Englisch und Niederländisch: Tag und Datum in der Sprache', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/nl/kontakt/');
  await ready(page);
  await expect(page.locator(WINDOW)).toHaveAttribute('data-himmel', 't:JULLIE SHOW:200', { timeout: 15_000 });
  const seen = await record(page, 12_000);
  expect(seen.slice(0, 3)).toEqual(['t:JULLIE SHOW:200', 't:JULLIE DAG:200', expect.stringMatching(/^t:\d{1,2} (JAN|FEB|MRT|APR|MEI|JUN|JUL|AUG|SEP|OKT|NOV|DEC) \d{4}:200$/)]);
});

test('reduzierte Bewegung: keine Rotation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/kontakt/');
  await ready(page);
  await expect(page.locator(WINDOW)).toHaveAttribute('data-himmel', 't:EURE SHOW:200', { timeout: 15_000 });
  expect(await record(page, 8_000)).toEqual(['t:EURE SHOW:200']);
});

test('eine Eingabe beendet den Auftakt; Gemeinden fliegen den Dom', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/kontakt/');
  await ready(page);
  await expect(page.locator(WINDOW)).toHaveAttribute('data-himmel', 't:EURE SHOW:200', { timeout: 15_000 });
  await page.locator('#inquiry-form input[name="anlass"][value="gemeinden"]').check({ force: true });
  const seen = await record(page, 10_000);
  expect(seen.at(-1)).toMatch(/^m:dom:\d+$/);
  expect(seen.some((v) => v.includes('EUER TAG'))).toBe(false);
});
