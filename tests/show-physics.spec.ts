import { test, expect, type Page } from '@playwright/test';

// Every motif version may only do what real show drones can do: fly smoothly within speed and acceleration limits,
// never jump (also not in the dark). Effects such as sparks, rain or a heartbeat must be made with light.
// Display units. The preview runs as a time-lapse at the pace of the client's Vercel prototype (a real show takes
// about three times as long); the limits guarantee smooth, bounded motion without jumps. Flight planning in
// show-flight.js aims lower (1.8 and 3); the margin covers the flow drift and staggered starts.
const LIMITS = { speed: 2.6, accel: 5.5 };
const OCCASIONS = ['hochzeit', 'jubilaeum', 'launch', 'kultur', 'silvester'];

/** Highest speed and acceleration of any drone over the recorded frames (regular frame intervals only). */
const measure = (page: Page) => page.evaluate(() => {
  const trace = (window as unknown as { __showTrace: [number, number[]][] }).__showTrace;
  let speed = 0, accel = 0;
  for (let f = 2; f < trace.length; f++) {
    const [t0, p0] = trace[f - 2], [t1, p1] = trace[f - 1], [t2, p2] = trace[f];
    const d1 = t1 - t0, d2 = t2 - t1;
    if (d1 < 0.012 || d2 < 0.012 || Math.abs(d1 - d2) > 0.002) continue;
    for (let k = 0; k < Math.min(p0.length, p1.length, p2.length); k += 3) {
      const v1 = [0, 1, 2].map((q) => (p1[k + q] - p0[k + q]) / d1), v2 = [0, 1, 2].map((q) => (p2[k + q] - p1[k + q]) / d2);
      speed = Math.max(speed, Math.hypot(...v2));
      accel = Math.max(accel, Math.hypot(v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]) / ((d1 + d2) / 2));
    }
  }
  (window as unknown as { __showTrace: unknown[] }).__showTrace = [];
  return { speed, accel };
});

for (const occasion of OCCASIONS) {
  test(`Physikalisch fliegbar: ${occasion}, die ganze Show in allen drei Paketen`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'Die Bewegung ist auf allen Geräten dieselbe.');
    test.setTimeout(420_000);
    await page.clock.install();
    await page.goto('/show-konfigurator/');
    await page.clock.runFor(1000);
    await page.locator(`label:has([name=occasion][value=${occasion}])`).click();
    // long enough for every motif of the sequence to form and play, and for the loop back to the first
    for (const [k, seconds] of [[0, 24], [1, 32], [2, 100]] as const) {
      await page.evaluate(() => { (window as unknown as { __showTrace: unknown[] }).__showTrace = []; });
      await page.locator(`label:has([name=pkg][value="${k}"])`).click();
      await page.clock.runFor(seconds * 1000);
      const { speed, accel } = await measure(page);
      expect.soft(speed, `speed, package ${k}`).toBeLessThanOrEqual(LIMITS.speed);
      expect.soft(accel, `acceleration, package ${k}`).toBeLessThanOrEqual(LIMITS.accel);
    }
  });
}
