import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { chromium, webkit } from 'playwright';
import { layoutCases } from './fixtures/layout-audit-cases.mjs';

for (const [name, engine] of Object.entries({ chromium, webkit })) {
  // Der gemeinsame Unit-Build läuft auch auf Hosts ohne installierte Playwright-Browser.
  const skip = !existsSync(engine.executablePath()) && 'Playwright-Browser fehlt';
  test(`Layoutwächter in ${name}`, { skip }, async (t) => {
    const browser = await engine.launch();
    t.after(() => browser.close());
    const page = await browser.newPage();
    for (const [title, run] of layoutCases) await t.test(title, () => run(page));
  });
}
