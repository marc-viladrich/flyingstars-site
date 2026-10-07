// Pure geometry for the show configurator: every function returns exactly the requested number of points, evenly
// spread, so the drone count of a package is the drone count in the picture. Points are [x, y] or [x, y, z] in any
// unit; the drone field fits them into view. No DOM, no randomness – unit-tested in scripts/show-geometry.test.mjs.

const TAU = Math.PI * 2;

/** Closed or open polyline paths → n points spread by length along all paths together. */
export function sampleOutline(paths, n) {
  const segs = [];
  for (const { pts, closed = true } of paths) {
    const m = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < m; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; segs.push([a, b, Math.hypot(b[0] - a[0], b[1] - a[1])]); }
  }
  const total = segs.reduce((s, g) => s + g[2], 0), step = total / n, out = [];
  let seg = 0, along = 0;
  for (let k = 0; k < n; k++) {
    let d = (k + 0.5) * step;
    while (seg < segs.length - 1 && d - along > segs[seg][2]) { along += segs[seg][2]; seg++; }
    const [a, b, len] = segs[seg], u = len ? Math.min(1, (d - along) / len) : 0;
    out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
  }
  return out;
}

const curve = (k, f) => Array.from({ length: k }, (_, i) => f((i / k) * TAU));
export const circle = (cx, cy, r, k = 96) => ({ pts: curve(k, (t) => [cx + Math.cos(t) * r, cy + Math.sin(t) * r]) });
/** The classic heart curve, point up at the bottom. */
export const heart = (k = 160) => ({ pts: curve(k, (t) => [16 * Math.sin(t) ** 3, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)]) });

/** Five-pointed star outline. */
export const star = (n) => sampleOutline([{ pts: Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * TAU, r = i % 2 ? 0.42 : 1; return [Math.sin(a) * r, Math.cos(a) * r]; }) }], n);

/** Outline heart; from 160 drones a second, inner outline makes it bolder instead of just denser. */
export function heartOutline(n) {
  if (n < 160) return sampleOutline([heart()], n);
  const inner = { pts: heart().pts.map(([x, y]) => [x * 0.82, y * 0.82 + 0.6]) };
  return sampleOutline([heart(), inner], n);
}
/** Two interlocked wedding rings. */
export const rings = (n) => sampleOutline([circle(-0.55, 0, 1), circle(0.55, 0, 1)], n);
/** Clock face at twelve: rim, twelve ticks, both hands up. */
export function clock(n) {
  const ticks = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * TAU; return { pts: [[Math.sin(a) * 0.78, Math.cos(a) * 0.78], [Math.sin(a) * 0.9, Math.cos(a) * 0.9]], closed: false }; });
  return sampleOutline([circle(0, 0, 1, 120), ...ticks, { pts: [[0, 0], [0, 0.62]], closed: false }, { pts: [[0, 0], [0.04, 0.5]], closed: false }], n);
}

/** Two layers of the same picture, front and back: the simplest volume. */
export function extrude(pts2d, n, depth) {
  const half = Math.ceil(n / 2), front = evenSubset(pts2d, half);
  const out = [];
  for (let i = 0; i < n; i++) { const p = front[i % front.length]; out.push([p[0], p[1], i < half ? depth / 2 : -depth / 2]); }
  return out;
}

/** Two interlocked rings in 3D: one in the picture plane, one turned 90° through it. */
export function torusPair(n) {
  const out = [], per = Math.floor(n / 2), tube = 0.12, strands = 3;
  for (let ring = 0; ring < 2; ring++) {
    const count = ring ? n - per : per, around = Math.ceil(count / strands);
    for (let i = 0; i < count; i++) {
      const u = (Math.floor(i / strands) / around) * TAU, v = ((i % strands) / strands) * TAU;
      const r = 1 + tube * Math.cos(v), x = r * Math.cos(u), y = r * Math.sin(u), z = tube * Math.sin(v);
      out.push(ring ? [x + 0.6, z, y] : [x - 0.6, y, z]);
    }
  }
  return out;
}

/** A firework shell: rays in every direction, drones spread along them. */
export function burstSphere(n) {
  const rays = Math.max(12, Math.round(Math.sqrt(n) * 1.6)), GA = Math.PI * (3 - Math.sqrt(5)), out = [];
  for (let i = 0; i < n; i++) {
    const ray = i % rays, y = 1 - (ray / (rays - 1)) * 2, r = Math.sqrt(1 - y * y), t = GA * ray;
    const along = 0.25 + 0.75 * ((Math.floor(i / rays) + 1) / (Math.ceil(n / rays) + 1));
    out.push([Math.cos(t) * r * along, y * along, Math.sin(t) * r * along]);
  }
  return out;
}

/** Evenly spread subset (farthest-point sampling), so a 600-drone figure keeps its whole shape at 300. */
export function evenSubset(pts, n) {
  if (pts.length <= n) return pts.slice();
  const dist = new Float64Array(pts.length).fill(Infinity), chosen = [0], d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + ((a[2] || 0) - (b[2] || 0)) ** 2;
  let last = 0;
  while (chosen.length < n) {
    let best = -1, bestD = -1;
    for (let i = 0; i < pts.length; i++) { const d = Math.min(dist[i], d2(pts[i], pts[last])); dist[i] = d; if (d > bestD) { bestD = d; best = i; } }
    chosen.push(best); last = best; dist[best] = 0;
  }
  return chosen.sort((a, b) => a - b).map((i) => pts[i]);
}
