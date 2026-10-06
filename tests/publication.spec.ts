import { test, expect } from '@playwright/test';

test('freigegebener Intake-Beitrag ist im Blog verlinkt und lesbar', async ({ page }) => {
  await page.goto('/blog/');
  const post = page.getByRole('link', { name: 'Testflug: Wie eine Drohnenshow entsteht' });
  await expect(post).toBeVisible();
  await post.click();
  await expect(page).toHaveURL(/\/blog\/2026-10-06-testflug-wie-eine-drohnenshow-entsteht\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Testflug: Wie eine Drohnenshow entsteht');
  await expect(page.getByText('Aus diesem Issue entsteht automatisch eine Datei, ein Branch und ein Pull Request.')).toBeVisible();
});
