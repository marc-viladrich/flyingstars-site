import { test } from '@playwright/test';
import { layoutCases } from '../scripts/fixtures/layout-audit-cases.mjs';

// The browser lanes run the same fixtures as node --test even when the earlier
// unit-build runner has no browser installed.
for (const [title, run] of layoutCases) {
  test(title, async ({ page }, info) => {
    test.skip(!['desktop', 'webkit'].includes(info.project.name), 'Die Fixtures setzen ihre eigenen Viewportgrößen.');
    await run(page);
  });
}
