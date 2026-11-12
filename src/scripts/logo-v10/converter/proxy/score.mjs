// Depiction proxy: how well could a viewer see the logo in the dots? score(image, result) -> [0, 1].
// Computed from the points only (positions, colours) and the original image; pure JavaScript.
//
// Candidate (a) perceptual reconstruction (the default `score`): each dot is linked to the neighbours the eye
// links it to (within LINK_ABS times the typical dot distance and within LINK_REL times its own nearest
// distance, so two parallel rows are not cross-linked but a mesh of stipple is), giving a line drawing. It is
// compared with the target line drawing of the original (target.mjs) by a contrast-weighted boundary F-score:
//   recall    = weighted share of target boundary that a drawn line passes within tolerance of, either as
//               an outline of one of its sides or, for strokes and tiny dots only, as their centreline;
//   precision = share of drawn line length that lies on something in the target.
// (b) multi-scale blur match is in blur.mjs; (c) region reconstruction in candidates.mjs. The validated score
// is (d) = (a) x (b on the target line image): `depiction` / `score` below. See VALIDATION.md.
import { analyse } from './target.mjs';
import { blurMatch } from './blur.mjs';

export const LINK = { ABS: 1.6, REL: 1.3 };

// typical dot distance: median nearest-neighbour distance (the controls report a nominal spacing that is not
// what the eye sees)
export function linkGraph(points, opt = {}) {
  const n = points.length;
  const ABS = opt.abs ?? LINK.ABS, REL = opt.rel ?? LINK.REL;
  if (n === 0) return { links: [], sEff: 1, nn: [] };
  const cell = new Map();
  let span = 0;
  for (const p of points) span = Math.max(span, p.x, p.y);
  // nearest neighbours via a grid sized from a rough density estimate, refined
  const nn = new Float64Array(n).fill(Infinity);
  const build = c => { cell.clear(); points.forEach((p, i) => { const k = Math.floor(p.x / c) + ',' + Math.floor(p.y / c); let L = cell.get(k); if (!L) cell.set(k, L = []); L.push(i); }); };
  let c = Math.max(4, span / Math.sqrt(n));
  build(c);
  const around = (i, r, f) => {
    const p = points[i], cx = Math.floor(p.x / c), cy = Math.floor(p.y / c), R = Math.ceil(r / c);
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const L = cell.get((cx + dx) + ',' + (cy + dy)); if (!L) continue;
      for (const j of L) if (j !== i) { const d = Math.hypot(points[j].x - p.x, points[j].y - p.y); if (d <= r) f(j, d); }
    }
  };
  for (let i = 0; i < n; i++) {
    let r = c;
    while (nn[i] === Infinity && r < 4 * span + 10) { around(i, r, (j, d) => { if (d < nn[i]) nn[i] = d; }); r *= 2; }
  }
  const sorted = Float64Array.from(nn.filter(Number.isFinite)).sort();
  const sEff = sorted.length ? sorted[sorted.length >> 1] : 1;
  const links = [];
  c = Math.max(2, ABS * sEff); build(c);
  for (let i = 0; i < n; i++) around(i, ABS * sEff, (j, d) => { if (j > i && (d <= REL * nn[i] || d <= REL * nn[j])) links.push([i, j, d]); });
  return { links, sEff, nn };
}

// rasterised samples of the drawing: every ~1 px along each link, plus every dot
export function drawingSamples(points, links) {
  const out = [];
  for (const p of points) out.push(p.x, p.y);
  for (const [i, j, d] of links) {
    const a = points[i], b = points[j], m = Math.max(1, Math.round(d));
    for (let k = 1; k < m; k++) { const t = k / m; out.push(a.x + t * (b.x - a.x), a.y + t * (b.y - a.y)); }
  }
  return out;
}

// opt.dir (degrees, default 35; 0 = off): a drawn line only counts where it runs along the target line it is
// near (a boundary or a stroke's centreline). The eye reads strokes by their direction: a zig-zag or a mesh
// across a stroke lies "inside" the shape but does not draw it.
const NB = 6;
const angDiff = (a, b) => { let d = Math.abs(a - b) % Math.PI; return d > Math.PI / 2 ? Math.PI - d : d; };
const binOf = a => { const t = ((a % Math.PI) + Math.PI) % Math.PI; return Math.min(NB - 1, Math.floor(t / (Math.PI / NB))); };
const COH = 0.3;
// Only threshold queries consume drawing distances. Index occupied pixels per row
// and answer those queries exactly, without constructing full distance fields.
function sourceRows(H) { return Array.from({ length: H }, () => []); }
function nearSource(rows, W, H, x, y, radius) {
  const X = Math.min(W - 1, Math.max(0, Math.floor(x))), Y = Math.min(H - 1, Math.max(0, Math.floor(y)));
  if (radius >= 1e9) return true; // Matches the original empty-source sentinel too.
  const r = Math.min(Math.ceil(radius), Math.max(Y, H - 1 - Y));
  for (let dy = 0; dy <= r; dy++) for (let side = 0; side < (dy ? 2 : 1); side++) {
    const yy = side ? Y + dy : Y - dy;
    if (yy < 0 || yy >= H) continue;
    const row = rows[yy];
    if (!row.length) continue;
    let lo = 0, hi = row.length;
    while (lo < hi) { const m = (lo + hi) >>> 1; if (row[m] < X) lo = m + 1; else hi = m; }
    const dx = Math.min(lo < row.length ? row[lo] - X : Infinity, lo ? X - row[lo - 1] : Infinity);
    // Match both Float32 stores: vertical squared distance, then horizontal sum,
    // followed by the Float32 square root consumed by scoreWith.
    const squared = Math.fround(dx * dx + Math.fround(dy * dy));
    if (Math.fround(Math.sqrt(squared)) <= radius) return true;
  }
  return false;
}
function sortRows(rows) { for (const row of rows) row.sort((a, b) => a - b); }

export function scoreWith(T, result, opt = {}) {
  if (T.empty) return { score: 0, P: 0, R: 0 };
  const pts = result.points;
  if (!pts.length) return { score: 0, P: 0, R: 0, n: 0 };
  const { W, H } = T, N = W * H;
  const dirTol = (opt.dir ?? 35) * Math.PI / 180, useDir = dirTol > 0;
  const G = linkGraph(pts, opt.link);
  // samples: [x, y, angle or NaN (no direction: a lone dot)]
  const S = [];
  const deg = new Int32Array(pts.length);
  for (const [i, j] of G.links) { deg[i]++; deg[j]++; }
  pts.forEach((p, i) => { if (!deg[i]) S.push(p.x, p.y, NaN); });
  for (const [i, j, d] of G.links) {
    const a = pts[i], b = pts[j], m = Math.max(1, Math.round(d)), ang = Math.atan2(b.y - a.y, b.x - a.x);
    for (let k = 0; k <= m; k++) { const t = k / m; S.push(a.x + t * (b.x - a.x), a.y + t * (b.y - a.y), ang); }
  }
  const Dall = sourceRows(H), Db = useDir ? Array.from({ length: NB }, () => sourceRows(H)) : null;
  let acc = 0, ns = 0;
  for (let k = 0; k < S.length; k += 3) {
    const X = Math.floor(S[k]), Y = Math.floor(S[k + 1]), ang = S[k + 2];
    ns++;
    if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
    const q = Y * W + X;
    Dall[Y].push(X);
    if (useDir) {
      if (Number.isNaN(ang)) for (const D of Db) D[Y].push(X);
      else {
        const t = ((ang % Math.PI) + Math.PI) % Math.PI, b0 = binOf(t), f = t / (Math.PI / NB) - b0;
        Db[b0][Y].push(X); Db[(b0 + (f < 0.5 ? NB - 1 : 1)) % NB][Y].push(X);
      }
    }
    if (T.accept[q] && (!useDir || Number.isNaN(ang) || T.coh[q] < COH || angDiff(ang, T.tang[q]) <= dirTol)) acc++;
  }
  sortRows(Dall); if (Db) for (const rows of Db) sortRows(rows);
  const band = (opt.band ?? 0) * G.sEff;
  const near = (f, x, y, r) => nearSource(f, W, H, x, y, r);
  const field = (th, coh) => (!useDir || coh < COH ? Dall : Db[binOf(th)]);
  // importance: each element group (a drawn region) counts with (its boundary weight)^(1 - norm), so with
  // norm > 0 a small figure is not outweighed by a long outer contour
  const norm = opt.norm ?? 0;
  const wts = elementWeights(T, norm);
  let rec = 0, tot = 0;
  const hit = opt.hits ? new Uint8Array(T.el.length) : null;
  // opt.fat (0..1, default 1 = off): credit for a centreline standing in for a stroke that is fat at the dot
  // spacing (half-width > 1.15 s, where the converter would draw two rows): the stroke's weight is lost
  const fat = opt.fat ?? 1, hFat = 1.15 * G.sEff;
  T.el.forEach((e, k) => {
    let ok = e.tol > 0 && near(field(e.th, e.coh), e.x, e.y, e.tol + band + 0.5) ? 1 : 0;
    if (!ok) for (const [mx, my, t, th, coh, h] of e.med) if (near(field(th, coh), mx, my, t + band + 0.5)) { ok = Math.max(ok, h > hFat ? fat : 1); if (ok === 1) break; }
    tot += wts[k];
    if (ok) { rec += ok * wts[k]; if (hit) hit[k] = 1; }
  });
  const R = tot ? rec / tot : 0, P = ns ? acc / ns : 0;
  const beta = opt.beta ?? 1, b2 = beta * beta;
  const F = P + R > 0 ? (1 + b2) * P * R / (b2 * P + R) : 0;
  return { score: F, P, R, sEff: G.sEff, links: G.links.length, n: pts.length, hit, samples: S };
}

export function elementWeights(T, norm) {
  T._wts ??= new Map();
  if (T._wts.has(norm)) return T._wts.get(norm);
  const G = new Map();
  for (const e of T.el) G.set(e.g, (G.get(e.g) || 0) + e.w);
  const w = Float64Array.from(T.el, e => e.w * Math.pow(Math.max(1, G.get(e.g)), -norm));
  T._wts.set(norm, w);
  return w;
}

// (d), the validated proxy: (a) x (b on the line image). Both are needed: (a) judges whether each line of the
// logo is drawn and drawn along its direction, (b) judges the picture's coarse layout and colour.
export function depiction(T, result, opt = {}) {
  const A = scoreWith(T, result, opt);
  if (T.empty || !result.points.length) return { score: 0, a: 0, b: 0, P: 0, R: 0 };
  const B = blurMatch(T, result, 'line', A.sEff);
  return { score: A.score * B.score, a: A.score, b: B.score, P: A.P, R: A.R, sEff: A.sEff, n: A.n };
}

export function score(image, result, opt = {}) {
  return depiction(analyse(image, opt.target), result, opt).score;
}
export { analyse };
