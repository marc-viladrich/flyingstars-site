// Depiction proxy, part 1: the target line drawing of the original logo (independent of any converter).
//
// The logo is cut into colour regions (frozen v4 segmentation without the facet merge, so two flat shapes of
// similar hue stay separate). Every boundary between two regions is a target element, weighted by its colour
// contrast. Each side of a boundary has a local half-width h (steepest ascent on the distance-to-boundary field
// to the side's medial axis). A side may be drawn in two ways:
//   outline:    dots within tol = clamp(C_B * h, T_MIN, T_MAX) of the boundary (the converter's inset row);
//   centreline: dots within clamp(C_M * h, ...) of the side's medial point, accepted only where the side is a
//               STROKE (its medial axis continues for >= ELONG half-widths on two sides) or tiny (a dot).
// A compact blob (paper plane, disc, triangle) therefore can only be drawn by its outline: its skeleton is
// not its shape. Ground (background and background-coloured counters) only counts as a drawn side where it is
// the narrower side of the boundary (a knock-out line), as in the converter's idea 1.
// All tolerances follow the logo's own local feature size, not the dot spacing.
import { segment } from './seg.mjs';
import { sourceDistance } from './dt.mjs';
import { labDist } from './color.mjs';

export const PARAMS = {
  C_B: 0.6,       // outline tolerance per half-width of the drawn side
  C_M: 0.6,       // centreline tolerance per half-width
  T_MIN: 1.5,     // px: placement precision floor
  T_MAX: 0.03,    // share of the logo diagonal: tolerance cap
  ELONG: 2.5,     // a side is a stroke where its medial axis continues >= ELONG*h on two sides ...
  E_MIN: 3.5,     // ... or on one side (a stroke end) in a region whose elongation is >= E_MIN
  SMALL: 0.012,   // share of the diagonal: half-width below which a compact blob may be a single dot
  CONTRAST: [0.02, 0.12], // OKLab distance -> weight 0..1 (ramp)
};

const DX8 = [1, 1, 0, -1, -1, -1, 0, 1], DY8 = [0, -1, -1, -1, 0, 1, 1, 1];

export function analyse(image, params = {}) {
  const P = { ...PARAMS, ...params };
  const seg = segment(image);
  const { W, H, id, regions } = seg;
  const N = W * H;
  const ground = r => r === 0 || regions[r].isBg;
  // logo box (non-ground pixels)
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!ground(id[y * W + x])) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return { W, H, empty: true };
  const diag = Math.hypot(x1 - x0 + 1, y1 - y0 + 1);
  const tMax = Math.max(P.T_MIN, P.T_MAX * diag), hSmall = P.SMALL * diag;
  // boundary pixels and distance-to-boundary field
  const B = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (x + 1 < W && id[i] !== id[i + 1]) { B[i] = 1; B[i + 1] = 1; }
    if (y + 1 < H && id[i] !== id[i + W]) { B[i] = 1; B[i + W] = 1; }
  }
  const fB = sourceDistance(B, W, H);
  // steepest ascent within the label, memoised in order of decreasing depth: ridge pixel per pixel
  // (exact counting sort on the integer squared distance, descending; ties by index as before)
  const sq = new Int32Array(N); let mxq = 0;
  for (let i = 0; i < N; i++) { sq[i] = Math.round(fB[i] * fB[i]); if (sq[i] > mxq) mxq = sq[i]; }
  const cnt = new Int32Array(mxq + 2);
  for (let i = 0; i < N; i++) cnt[mxq - sq[i] + 1]++;
  for (let k = 1; k < cnt.length; k++) cnt[k] += cnt[k - 1];
  const order = new Uint32Array(N);
  for (let i = 0; i < N; i++) order[cnt[mxq - sq[i]]++] = i;
  const ridge = new Int32Array(N).fill(-1);
  for (let t = 0; t < N; t++) {
    const i = order[t], x = i % W, y = (i - x) / W, l = id[i];
    let best = -1, bv = fB[i];
    for (let k = 0; k < 8; k++) {
      const X = x + DX8[k], Y = y + DY8[k];
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const j = Y * W + X;
      if (id[j] !== l) continue;
      if (fB[j] > bv + 1e-6) { bv = fB[j]; best = j; }
    }
    ridge[i] = best < 0 ? i : ridge[best];
  }
  const hOf = i => fB[ridge[i]] + 1;
  // region elongation (P1): length of the medial axis per width, E = area / (16 * mean depth^2); a strip of
  // length L and width w has E = L / w, a disc 1.8, a square 2.3, a triangle 2.9
  const K = regions.length, rA = new Float64Array(K), rD = new Float64Array(K);
  for (let i = 0; i < N; i++) { rA[id[i]]++; rD[id[i]] += fB[i] + 0.5; }
  const regionE = Float64Array.from(rA, (a, k) => a ? a / (16 * (rD[k] / a) ** 2) : 0);
  // orientation field: structure tensor of the distance field's gradient (doubled angles), smoothed. Along a
  // boundary and along a medial axis the tangent is perpendicular to the dominant gradient axis.
  const jxx = new Float32Array(N), jxy = new Float32Array(N), jyy = new Float32Array(N);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, gx = (fB[i + 1] - fB[i - 1]) / 2, gy = (fB[i + W] - fB[i - W]) / 2;
    jxx[i] = gx * gx; jxy[i] = gx * gy; jyy[i] = gy * gy;
  }
  const box = (f, r) => { const t = new Float32Array(N), o = new Float32Array(N);
    for (let y = 0; y < H; y++) { let acc = 0; for (let x = -r; x < W + r; x++) { if (x + r < W && x + r >= 0) acc += f[y * W + x + r]; if (x - r - 1 >= 0 && x - r - 1 < W) acc -= f[y * W + x - r - 1]; if (x >= 0 && x < W) t[y * W + x] = acc; } }
    for (let x = 0; x < W; x++) { let acc = 0; for (let y = -r; y < H + r; y++) { if (y + r < H && y + r >= 0) acc += t[(y + r) * W + x]; if (y - r - 1 >= 0 && y - r - 1 < H) acc -= t[(y - r - 1) * W + x]; if (y >= 0 && y < H) o[y * W + x] = acc; } }
    return o; };
  const Sxx = box(jxx, 2), Sxy = box(jxy, 2), Syy = box(jyy, 2);
  const tang = new Float32Array(N), coh = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = Sxx[i], b = Sxy[i], c = Syy[i], tr = a + c;
    tang[i] = 0.5 * Math.atan2(2 * b, a - c) + Math.PI / 2; // gradient axis + 90 degrees
    coh[i] = tr > 1e-9 ? Math.sqrt((a - c) ** 2 + 4 * b * b) / tr : 0;
  }
  // elongation of a ridge pixel (cached): the side continues as a stroke of similar width on >= 2 sides
  const elongCache = new Map();
  const elongated = m => {
    let v = elongCache.get(m);
    if (v !== undefined) return v;
    const mx = m % W, my = (m - mx) / W, h = fB[m] + 1, l = id[m], L = Math.max(3, P.ELONG * h);
    const A = 48, hit = new Uint8Array(A);
    for (let a = 0; a < A; a++) {
      const th = 2 * Math.PI * a / A, cx = mx + L * Math.cos(th), cy = my + L * Math.sin(th);
      const X = Math.round(cx), Y = Math.round(cy);
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const j = Y * W + X;
      if (id[j] === l && fB[j] + 1 >= 0.45 * h) hit[a] = 1;
    }
    // arcs of hits; elongated when two arcs are at least 80 degrees apart
    const arcs = [];
    for (let a = 0; a < A; a++) if (hit[a] && !hit[(a - 1 + A) % A]) { let b = a; while (hit[(b + 1) % A] && b - a < A) b++; arcs.push((a + b) / 2); }
    if (arcs.length === 0 && hit[0]) v = true; // full circle (inside a big region): not a blob edge case here
    else {
      v = false;
      for (let p = 0; p < arcs.length && !v; p++) for (let q = p + 1; q < arcs.length; q++) {
        let d = Math.abs(arcs[p] - arcs[q]) * 360 / A; if (d > 180) d = 360 - d;
        if (d >= 80) { v = true; break; }
      }
      // the end of a stroke continues on one side only: enough when the region as a whole is elongated
      if (!v && arcs.length >= 1 && regionE[l] >= P.E_MIN) v = true;
    }
    elongCache.set(m, v);
    return v;
  };
  const clampT = t => Math.max(P.T_MIN, Math.min(tMax, t));
  const [c0, c1] = P.CONTRAST;
  const contrast = (a, b) => {
    // transparent ground has no colour of its own (its region mean is meaningless): full contrast to ink
    if (seg.transparent && (ground(a) || ground(b))) return 1;
    const d = labDist(regions[a].lab, regions[b].lab);
    return Math.max(0, Math.min(1, (d - c0) / (c1 - c0)));
  };
  // boundary elements: one per 4-neighbour pair of different labels
  const el = []; // {x, y, w, region pair, outline tol, medial alternatives}
  const pair = (i, j, px, py) => {
    const la = id[i], lb = id[j];
    if (ground(la) && ground(lb)) return;
    const w = contrast(la, lb);
    if (w <= 0) return;
    const ha = hOf(i), hb = hOf(j);
    // element group: the drawn ink side (the narrower one when both sides are ink), for importance weighting
    const g = ground(la) ? lb : ground(lb) ? la : (ha <= hb ? la : lb);
    const k0 = Math.min(N - 1, Math.floor(py) * W + Math.floor(px));
    const e = { x: px, y: py, w, ra: la, rb: lb, g, tol: 0, med: [], th: tang[k0], coh: coh[k0] };
    for (const [pix, l, h, ho] of [[i, la, ha, hb], [j, lb, hb, ha]]) {
      if (ground(l) && h > ho) continue; // open ground is not drawn
      e.tol = Math.max(e.tol, clampT(P.C_B * h));
      const m = ridge[pix];
      if (h <= hSmall || elongated(m)) e.med.push([m % W + 0.5, Math.floor(m / W) + 0.5, clampT(P.C_M * h), tang[m], coh[m], h]);
    }
    if (e.tol > 0 || e.med.length) el.push(e);
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (x + 1 < W && id[i] !== id[i + 1]) pair(i, i + 1, x + 1, y + 0.5);
    if (y + 1 < H && id[i] !== id[i + W]) pair(i, i + W, x + 0.5, y + 1);
  }
  // acceptance map for precision: union of discs (outline tolerance around boundary elements, centreline
  // tolerance around accepted medial points), by radius buckets
  const buckets = [1.5, 2.5, 4, 6, 9, 13, 18, 26, 36].filter(r => r <= tMax + 1e-6);
  if (!buckets.length || buckets[buckets.length - 1] < tMax) buckets.push(tMax);
  const src = buckets.map(() => new Uint8Array(N));
  const put = (x, y, t) => {
    let k = 0; while (k + 1 < buckets.length && buckets[k + 1] <= t + 1e-6) k++;
    const X = Math.min(W - 1, Math.max(0, Math.floor(x))), Y = Math.min(H - 1, Math.max(0, Math.floor(y)));
    src[k][Y * W + X] = 1;
  };
  for (const e of el) { if (e.tol > 0) put(e.x, e.y, e.tol); for (const [mx, my, t] of e.med) put(mx, my, t); }
  const accept = new Uint8Array(N);
  buckets.forEach((r, k) => {
    let any = false; for (let i = 0; i < N; i++) if (src[k][i]) { any = true; break; }
    if (!any) return;
    const d = sourceDistance(src[k], W, H);
    for (let i = 0; i < N; i++) if (d[i] <= r + 0.5) accept[i] = 1;
  });
  // ink mask (non-ground) for region-based candidates
  const ink = new Uint8Array(N);
  for (let i = 0; i < N; i++) ink[i] = ground(id[i]) ? 0 : 1;
  let wTot = 0; for (const e of el) wTot += e.w;
  return { W, H, seg, id, ground, el, wTot, accept, ink, fB, ridge, diag, box: [x0, y0, x1, y1], params: P, elongated, hOf, tang, coh, regionE };
}
