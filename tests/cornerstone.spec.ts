import { join } from 'node:path';
import { test, expect } from '@playwright/test';

const CS = '2025-06-12-wie-programmiert-man-eine-drohnenshow';
const POSTS = [
  { id: CS, cover: 'wie-programmiert-man-eine-drohnenshow', bodyImage: 'drohnenprogrammierung-1-1024x683', photos: 4 },
  { id: '2025-01-14-wie-funktioniert-drohnenshow-drohne', cover: 'wie-funktioniert-eine-drohnenshow', bodyImage: 'drohne-in-daemmerung-e1737555383718', photos: 3 },
  { id: '2025-03-31-drohnen-feuerwerk-als-alternative', cover: 'drohnen-als-alternative-zum-feuerwerk', bodyImage: 'drohnen-feuerwerk-alternative-1024x781', photos: 3 },
];

for (const locale of ['de', 'en', 'nl']) {
  const prefix = locale === 'de' ? '' : `/${locale}`;
  for (const post of POSTS) {
    test(`Basisformat ${locale}: ${post.id}`, async ({ page }, testInfo) => {
      await page.goto(`${prefix}/blog/${post.id}/`);
      const article = page.locator('article.post');
      await expect(article).toHaveAttribute('data-blog-layout', 'basic');
      await expect(article.locator('.story, .ss, [data-ss], .cs-compare, table')).toHaveCount(0);
      await expect(article.locator('.ap img')).toHaveCount(post.photos);
      await expect(article.locator('.ap-row')).toHaveCount(1);
      await expect(article.locator(`.post-body img[src*="${post.bodyImage}"]`)).toHaveCount(1);
      await expect(article.locator('img[src*="was-kostet-eine-drohne-flyingstars-logo"]')).toHaveCount(0);
      await expect(article.locator('.post-body ~ [data-ff] ~ .post-author')).toHaveCount(1);
      await expect(article.locator('[data-ff] .ff-poster')).toHaveCount(1);
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', new RegExp(`/media/blog/${post.cover}/titel-16x9[.]jpg$`));
      await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
      const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').first().textContent() ?? '{}');
      expect(ld['@type']).toBe('BlogPosting');
      expect(ld.inLanguage).toBe(locale);
      expect(ld.image).toHaveLength(3);
      await expect(article.locator('.post-author-name span')).toHaveText(ld.author.jobTitle);
      await expect(article.locator('.post-author-name + p')).toHaveText(ld.author.description);
      expect(new URL(ld.author.url).pathname + new URL(ld.author.url).hash).toBe(`${prefix}/ueber-uns/#team`);
      await expect(article.locator('.post-author .link')).toHaveAttribute('href', `${prefix}/ueber-uns/#team`);
      const cover = page.locator('.post-cover img');
      await expect(cover).toHaveAttribute('width', '1600');
      expect((await cover.getAttribute('alt'))?.length).toBeGreaterThan(10);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);

      const shots = process.env.FS_R21_SHOTS;
      if (shots && locale === 'de' && testInfo.project.name === 'desktop') {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        for (const width of [1440, 390]) {
          await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
          for (const image of await article.locator('img').all()) {
            await image.evaluate((element: HTMLImageElement) => { element.loading = 'eager'; });
          }
          await article.locator('[data-ff]').scrollIntoViewIfNeeded();
          await expect(article.locator('[data-ff]')).toHaveClass(/is-live/);
          await page.evaluate(async () => {
            await document.fonts.ready;
            await Promise.all([...document.querySelectorAll<HTMLImageElement>('article.post img')].map((image) => image.decode()));
            scrollTo({ top: 0, behavior: 'instant' });
          });
          expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
          await article.screenshot({ path: join(shots, `${post.cover}-${width}.png`), animations: 'disabled', timeout: 15_000 });
        }
      }
    });
  }
}

test.describe('Interaktionen im aktivierten Cornerstone-Format', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/blog/${CS}/`);
    test.skip(await page.locator('article.post').getAttribute('data-blog-layout') === 'basic', 'Szenen nach dem Launch wieder aktivierbar');
  });

  test('Szene folgt dem Lesen und ruht bei reduzierter Bewegung', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const stage = page.locator('[data-stage]');
    for (const step of [0, 4, 8]) {
      await page.locator('.ss-step').nth(step).scrollIntoViewIfNeeded();
      await page.evaluate((i) => { const m = document.querySelectorAll('.ss-step')[i]; scrollBy({ top: m.getBoundingClientRect().top - innerHeight * 0.3, behavior: 'instant' }); }, step);
      await expect(stage).toHaveAttribute('data-step', String(step));
    }
    // reduzierte Bewegung: keine Eigenbewegung der Drohnen
    expect(await page.locator('.sd .sw').evaluateAll((els) => els.filter((e) => (e as SVGElement).style.transform).length)).toBe(0);
  });

  test('Musik und Licht: der Abspielkopf treibt Lichtblöcke und Sternbildung, reduziert steht der Endzustand', async ({ page }) => {
    const stage = page.locator('[data-stage]');
    await page.evaluate(() => { const m = document.querySelectorAll('.ss-step')[5]; scrollBy({ top: m.getBoundingClientRect().top - innerHeight * 0.3, behavior: 'instant' }); });
    await expect(stage).toHaveAttribute('data-step', '5');
    await expect(stage).toHaveClass(/is-sweeping/);
    // ein Block je Spur höchstens hell, die Drohnen folgen dem Kopf über ihren Versatz
    await expect.poll(() => page.locator('.bar.lit').count()).toBeGreaterThan(0);
    expect(await page.locator('.bar.lit').count()).toBeLessThanOrEqual(5);
    await expect.poll(() => page.locator('.sd .sw').evaluateAll((els) => els.filter((e) => (e as SVGElement).style.getPropertyValue('--wx')).length)).toBeGreaterThan(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(stage).not.toHaveClass(/is-sweeping/);
    expect(await page.locator('.bar.lit').count()).toBe(0);
  });

  // Runde 20 (Marc, 22.11.2026): zwei Spalten auf jedem Querformat (auch am hohen Monitor); Zuordnung über die Fläche am
  // aktiven Schritt (wie Icon-Karten) und Nummern wie in der Schrittleiste. Die Fläche verändert keine Zeilenumbrüche.
  for (const vp of [{ width: 2560, height: 1440 }, { width: 1280, height: 720 }]) {
    test(`Zwei Spalten ${vp.width}×${vp.height}: Szene neben dem Text, Fläche am aktiven Schritt, Nummern`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.evaluate(() => { const u = document.querySelectorAll('.ss-unit')[4]; scrollBy({ top: u.getBoundingClientRect().top - innerHeight * 0.3, behavior: 'instant' }); });
      await expect(page.locator('[data-stage]')).toHaveAttribute('data-step', '4');
      const geo = await page.evaluate(() => {
        const fig = document.querySelector('.ss-fig')!.getBoundingClientRect(), text = document.querySelector('.ss-text')!;
        const units = [...document.querySelectorAll<HTMLElement>('.ss-unit')];
        const steps = units.map((u) => u.querySelector<HTMLElement>('.ss-step')!);
        const inner = (el: HTMLElement) => { const cs = getComputedStyle(el); return el.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); };
        return { beside: fig.left > text.getBoundingClientRect().right, figH: fig.height, textW: text.getBoundingClientRect().width, stepW: steps.map(inner),
          mark: steps.map((st) => Number(getComputedStyle(st, '::before').opacity)), nums: steps.map((st) => getComputedStyle(st.firstElementChild!, '::before').content) };
      });
      expect(geo.beside).toBe(true);
      expect(geo.figH).toBeLessThanOrEqual(vp.height);
      for (const w of geo.stepW) expect(Math.abs(w - geo.textW)).toBeLessThan(1); // Textbreite wie ohne Fläche
      await expect.poll(() => page.locator('.ss-step').evaluateAll((els) => els.map((e) => Number(getComputedStyle(e, '::before').opacity)))).toEqual([0, 0, 0, 0, 1, 0, 0, 0, 0]);
      expect(geo.nums).toEqual(['"01"', '"02"', '"03"', '"04"', '"01"', '"02"', '"03"', '"04"', '"05"']);
    });
  }

  test('Drohne zerlegt sich nur auf Wunsch: Hover mit der Maus, Tippen am Handy, Knopf mit Tastatur', async ({ page, isMobile }) => {
    await page.evaluate(() => { const u = document.querySelector('.ss-unit')!; scrollBy({ top: u.getBoundingClientRect().top - innerHeight * 0.45, behavior: 'instant' }); });
    const stage = page.locator('[data-stage]'), btn = page.locator('[data-explode]');
    await expect(stage).toHaveAttribute('data-step', '0');
    await page.waitForTimeout(3000); // früher zerfiel sie nach 2,6 s von selbst
    await expect(page.locator('.sn.on')).toHaveCount(0);
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    const box = (await stage.boundingBox())!;
    if (isMobile) {
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      await expect(page.locator('.sn.on')).toHaveCount(3);
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      await expect(page.locator('.sn.on')).toHaveCount(0);
      return;
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator('.sn.on')).toHaveCount(3);
    await page.mouse.move(2, box.y + box.height / 2);
    await expect(page.locator('.sn.on')).toHaveCount(0);
    await btn.focus(); await page.keyboard.press('Enter');
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.sn.on')).toHaveCount(3);
  });

  test('Showabend: Startraster, Funk, dann Stern → Herz → Kreis mit Signalen vor jedem Wechsel; reduziert ruht der Stern', async ({ page }) => {
    const stage = page.locator('[data-stage]');
    await page.evaluate(() => { const u = document.querySelectorAll('.ss-unit')[6]; scrollBy({ top: u.getBoundingClientRect().top - innerHeight * 0.3, behavior: 'instant' }); });
    await expect(stage).toHaveAttribute('data-step', '6');
    await page.evaluate(() => { const u = document.querySelectorAll('.ss-unit')[8]; scrollBy({ top: u.getBoundingClientRect().top - innerHeight * 0.3, behavior: 'instant' }); });
    await expect(stage).toHaveAttribute('data-step', '8');
    await expect(stage).toHaveClass(/is-signal/); // erst am Boden, Funk
    await expect(stage).toHaveAttribute('data-pulse', /[0-2]/, { timeout: 12_000 }); // Signal vor dem ersten Wechsel
    await expect.poll(() => page.locator('.sd .sw').evaluateAll((els) => els.filter((e) => Math.abs(parseFloat((e as SVGElement).style.getPropertyValue('--wx') || '0')) > 3).length), { timeout: 8_000 }).toBeGreaterThan(10);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => document.dispatchEvent(new Event('flyingstars:motion-change')));
    await expect(stage).not.toHaveAttribute('data-pulse', /.*/);
  });
});
