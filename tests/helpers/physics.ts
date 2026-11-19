import { expect, test, type Page } from '@playwright/test';

type Trace = [number, number[]][];
type Point = [number, number, number];

// Display units for the time-lapse preview. The margin above flight planning (1.8 / 3)
// covers the flow drift and staggered starts.
const LIMITS = { speed: 2.6, accel: 5.5 };
const MIN_TRIPLES_PER_SECOND = 30; // At least half the requested duration at 60 Hz.

/** Runs in the browser to avoid transferring the full trace. Unit tests supply their own frames. */
export function measureTrace(trace?: Trace) {
  if (trace === undefined) {
    const source = globalThis as typeof globalThis & { __showTrace?: Trace };
    trace = source.__showTrace ?? [];
    source.__showTrace = [];
  }

  let speed = 0, accel = 0, triples = 0, drones = 0;
  const velocity = (from: number[], to: number[], k: number, dt: number): Point => [
    (to[k] - from[k]) / dt,
    (to[k + 1] - from[k + 1]) / dt,
    (to[k + 2] - from[k + 2]) / dt,
  ];
  for (let f = 2; f < trace.length; f++) {
    const [t0, p0] = trace[f - 2], [t1, p1] = trace[f - 1], [t2, p2] = trace[f];
    const d1 = t1 - t0, d2 = t2 - t1;
    if (d1 < 0.012 || d2 < 0.012 || Math.abs(d1 - d2) > 0.002) continue;
    const count = Math.floor(Math.min(p0.length, p1.length, p2.length) / 3);
    if (!count) continue;
    triples++;
    drones = Math.max(drones, count);
    for (let k = 0; k < count * 3; k += 3) {
      const a = velocity(p0, p1, k, d1), b = velocity(p1, p2, k, d2);
      speed = Math.max(speed, Math.hypot(...b));
      accel = Math.max(accel, Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / ((d1 + d2) / 2));
    }
  }
  return { speed, accel, triples, drones };
}

export const measure = (page: Page) => page.evaluate(measureTrace, undefined);

export function expectFlyable(result: ReturnType<typeof measureTrace>, label: string, drones: number, seconds: number) {
  test.info().annotations.push({ type: 'measure', description: `${label}: ${JSON.stringify(result)}` });
  expect(result.triples, `${label}: auswertbare Frame-Tripel`).toBeGreaterThanOrEqual(seconds * MIN_TRIPLES_PER_SECOND);
  expect(result.drones, `${label}: Drohnen in der Luft`).toBeGreaterThanOrEqual(drones);
  expect.soft(result.speed, `${label}: speed`).toBeLessThanOrEqual(LIMITS.speed);
  expect.soft(result.accel, `${label}: acceleration`).toBeLessThanOrEqual(LIMITS.accel);
}
