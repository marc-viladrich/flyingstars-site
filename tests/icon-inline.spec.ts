import { test, expect } from '@playwright/test';

// Marc, 21.11.2026 (Preisseite „Im Preis enthalten“ am iPhone): „on mobile sollten solche Icons in line mit dem Text sein,
// sonst isses awkward.“ Gilt für jede Icon-Zelle (IconFeature mit Icon): auf dem Handy steht das Icon links neben der
// Überschrift, ihre senkrechten Mitten liegen auf einer Zeile (bei zweizeiligen Überschriften innerhalb der Überschrift).
const PAGES = ['/', '/drohnenshow-preise/', '/drohnenshow-werbung/', '/drohnenshow-hochzeit/', '/drohnenshow-indoor/', '/kontakt/', '/ueber-uns/'];

for (const path of PAGES) {
  test(`Handy: Icons stehen neben der Überschrift (${path})`, async ({ page, isMobile }) => {
    test.skip(!isMobile, 'nur Handy');
    await page.goto(path);
    const cells = await page.evaluate(() => [...document.querySelectorAll('.icon-feature:not(.icon-feature-compact)')]
      .map((cell) => ({ icon: cell.querySelector(':scope > .ico'), head: cell.querySelector(':scope > .ic-h') }))
      .filter((c) => c.icon && c.head && (c.head as HTMLElement).offsetParent)
      .map(({ icon, head }) => {
        const i = icon!.getBoundingClientRect(), h = head!.getBoundingClientRect();
        return { title: head!.textContent!.trim().slice(0, 40), iconRight: i.right, headLeft: h.left, iconMid: i.top + i.height / 2, headTop: h.top, headBottom: h.bottom };
      }));
    expect(cells.length, 'Icon-Zellen gefunden').toBeGreaterThan(0);
    for (const c of cells) {
      expect(c.iconRight, `${c.title}: Icon links neben der Überschrift`).toBeLessThanOrEqual(c.headLeft);
      expect(c.iconMid, `${c.title}: Icon auf Höhe der Überschrift`).toBeGreaterThanOrEqual(c.headTop);
      expect(c.iconMid, `${c.title}: Icon auf Höhe der Überschrift`).toBeLessThanOrEqual(c.headBottom);
    }
  });
}
