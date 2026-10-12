import { test, expect } from '@playwright/test';
import { routes } from './routes';

// Datensparsamkeit: Die Site darf ohne Nutzerinteraktion keine Requests an fremde Hosts auslösen.
// Erlaubt sind nur eigene Origin und die hier gelisteten Hosts (z. B. Medienspeicher).
const allowed = new Set<string>([
  '127.0.0.1',
  ...(process.env.MEDIA_HOST ? [process.env.MEDIA_HOST] : []),
]);

for (const route of routes) {
  test(`keine Third-Party-Requests: ${route}`, async ({ page }) => {
    const offenders: string[] = [];
    const fonts = new Set<string>();
    page.on('request', (req) => {
      const url = new URL(req.url());
      const host = url.hostname;
      if (req.resourceType() === 'font') fonts.add(url.pathname);
      if (!allowed.has(host)) offenders.push(req.url());
    });
    await page.goto(route, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    expect([...fonts].sort(), 'Only display and body webfonts on every built route').toEqual(['/fonts/inter-0.woff2', '/fonts/space-grotesk-0.woff2']);
    expect(offenders, `Unerlaubte Requests:\n${offenders.join('\n')}`).toEqual([]);
  });
}
