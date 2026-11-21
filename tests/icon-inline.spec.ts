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

// Marc, 21.11.2026 (Komplettpaket, Haltung, Inklusive, Extras, Bento-Kacheln am iPhone): Icon-Zellen haben auf dem Handy
// keinen seitlichen Innenabstand; Icon bzw. Logo steht exakt an der Inhaltskante, also bündig mit der Abschnittsüberschrift.
// Zellflächen laufen bis an den Bildschirmrand, ohne seitliches Scrollen.
for (const path of PAGES) {
  test(`Handy: Icon-Zellen bündig mit der Inhaltskante (${path})`, async ({ page, isMobile }) => {
    test.skip(!isMobile, 'nur Handy');
    await page.goto(path);
    // Ausnahme (Marc, 21.11.2026, zweite Rückmeldung): Zellen, die am Handy Karten mit sichtbarem Rand bleiben (Bento-Kacheln),
    // stehen mit dem Rand an der Inhaltskante; ihr Icon ist um Rand + Innenabstand eingerückt.
    const off = await page.evaluate(() => [...document.querySelectorAll('.icon-feature')].flatMap((cell) => {
      const mark = cell.querySelector(':scope > .ico, :scope > .q-logo, :scope > .ic-h'), h = cell.closest('section')?.querySelector('h1, h2');
      if (!mark || !h || !(cell as HTMLElement).offsetParent) return [];
      const cs = getComputedStyle(cell), card = parseFloat(cs.borderLeftWidth) > 0 && parseFloat(cs.borderTopLeftRadius) > 0;
      const left = h.getBoundingClientRect().left, inset = card ? parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft) : 0;
      return [{ title: cell.textContent!.trim().slice(0, 40), card, edge: Math.round(cell.getBoundingClientRect().left - left), dx: Math.round(mark.getBoundingClientRect().left - left - inset) }];
    }));
    expect(off.length, 'Icon-Zellen gefunden').toBeGreaterThan(0);
    for (const c of off) {
      expect(c.dx, `${c.title}: Abstand zur Inhaltskante`).toBe(0);
      if (c.card) expect(c.edge, `${c.title}: Kartenrand an der Inhaltskante`).toBe(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 'kein seitliches Scrollen').toBe(0);
  });
}
