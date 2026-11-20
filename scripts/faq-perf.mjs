// Run against a production build. Pass "webkit" to use Playwright WebKit.
import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';

const [base = 'http://127.0.0.1:4873', engine = 'chromium'] = process.argv.slice(2);
assert.ok(engine === 'chromium' || engine === 'webkit', 'Use chromium or webkit');
const browser = await { chromium, webkit }[engine].launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    const rect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      if (window.faqSample && this.matches('#warum-drohnen h2, #inquiry-form .hm-own-form')) {
        window.faqSample.stageReads++;
      }
      return rect.call(this);
    };
  });

  await page.goto(base);
  await page.evaluate(async () => { await document.fonts.ready; });
  const summary = page.locator('.faq details:not([open]) > summary').first();
  await summary.scrollIntoViewIfNeeded();
  await page.locator('.hm-own-form').waitFor({ state: 'attached' });
  const question = await summary.textContent();
  const trigger = page.locator('.faq summary').filter({ hasText: question });
  const details = trigger.locator('..');
  await page.evaluate(() => { window.faqSample = { stageReads: 0 }; });

  await trigger.click();
  await page.waitForFunction((text) => {
    const row = [...document.querySelectorAll('.faq details')].find(
      (details) => details.querySelector('summary').textContent === text,
    );
    return row.open && row.getAnimations({ subtree: true }).every((animation) => animation.playState !== 'running');
  }, question);
  await trigger.press('Enter');
  await page.waitForFunction((text) => {
    const row = [...document.querySelectorAll('.faq details')].find(
      (details) => details.querySelector('summary').textContent === text,
    );
    return !row.open && row.getAnimations({ subtree: true }).every((animation) => animation.playState !== 'running');
  }, question);
  assert.equal(await details.evaluate((row) => row.open), false);

  // Include trailing observer work. FAQ sits below every stage on the home page.
  await page.waitForTimeout(200);
  const { stageReads } = await page.evaluate(() => window.faqSample);
  assert.ok(stageReads <= 2, `FAQ below the swarm remeasured stage content ${stageReads} times`);
  console.log(`${engine}: FAQ opens by click, closes by keyboard, ${stageReads} stage content measurements`);
} finally {
  await browser.close();
}
