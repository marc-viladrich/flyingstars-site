// Class D (sampling theorem): before a figure is traced at spacing s, it is simplified to scale s.
//   closing (radius R*s): gaps and holes narrower than ~s are filled. A filled gap that is long (a slot cut
//     into a letter, npm) is not lost: it becomes a line of its own, drawn in the figure's colour (idea 1).
//   opening (radius R*s): protrusions narrower than ~s go (teeth, serifs, jaggies); long thin strokes
//     (hairlines, thin letters) are added back whole, so they are drawn as centrelines.
//   components that cannot carry a few dots are removed, unless they are a compact, visible dot.
// The result is traced as usual; a curve is either drawn cleanly at s or absent.
import { insideDistance, sourceDistance } from './dt.mjs';

// Radii in units of s. A gap is only detail when the rows on its two sides would merge (closer than 1.2 s):
// rows sit 0.4 s inside fat ink, so only gaps below ~0.4 s go (closing radius 0.2 s). A protrusion
// thinner than s cannot carry a row of its own unless it is long (opening radius 0.5 s, long ones kept).
export const RC = 0.2, RO = 0.5;
const MIN_LINE = 2.0;          // a line needs length >= MIN_LINE*s (3 dots)
const MIN_DOTS = 4;            // a shape needs >= MIN_DOTS dots of outline / centreline
const DOT_AREA = 0.45;         // a compact blob of area >= DOT_AREA*s^2 stays as a single dot

// connected components (8-conn) of a binary mask; returns {lab: Int32Array, comps:[{px:[...]}]}
function components(m, w, h) {
  const lab = new Int32Array(w * h).fill(-1);
  const comps = [];
  for (let k0 = 0; k0 < w * h; k0++) {
    if (!m[k0] || lab[k0] >= 0) continue;
    const id = comps.length, px = [k0];
    lab[k0] = id;
    for (let t = 0; t < px.length; t++) {
      const k = px[t], x = k % w, y = (k - x) / w;
      if (x > 0 && y > 0 && x + 1 < w && y + 1 < h) {
        // Same BFS neighbour order; one bounds check for all eight neighbours.
        for (let dy = -1; dy <= 1; dy++) {
          const row = k + dy * w;
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const j = row + dx;
            if (m[j] && lab[j] < 0) { lab[j] = id; px.push(j); }
          }
        }
      } else {
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const X = x + dx, Y = y + dy;
          if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
          const j = Y * w + X;
          if (m[j] && lab[j] < 0) { lab[j] = id; px.push(j); }
        }
      }
    }
    comps.push({ px });
  }
  return { lab, comps };
}

// length of a stroke-like component: area / width, width = 4 * mean inside distance (a strip's mean depth is w/4)
function strokeLength(px, dt) {
  let sd = 0; for (const k of px) sd += dt[k];
  const w = Math.max(1, 4 * sd / px.length);
  return { L: px.length / w, w };
}

// number of separate places where a residue piece touches the body: connected groups of its pixels that
// have a body pixel among their 8 neighbours
function contacts(px, body, w, h) {
  const touch = new Set();
  for (const k of px) {
    const x = k % w, y = (k - x) / w;
    let t = false;
    for (let dy = -1; dy <= 1 && !t; dy++) for (let dx = -1; dx <= 1; dx++) {
      const X = x + dx, Y = y + dy;
      if (X >= 0 && Y >= 0 && X < w && Y < h && body[Y * w + X]) { t = true; break; }
    }
    if (t) touch.add(k);
  }
  let groups = 0;
  const seen = new Set();
  for (const k0 of touch) {
    if (seen.has(k0)) continue;
    groups++;
    const st = [k0]; seen.add(k0);
    while (st.length) {
      const k = st.pop(), x = k % w, y = (k - x) / w;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const j = (y + dy) * w + x + dx;
        if (touch.has(j) && !seen.has(j)) { seen.add(j); st.push(j); }
      }
    }
    if (groups >= 2) return groups;
  }
  return groups;
}

const cache = new WeakMap();

// F: figure from structure.mjs. Returns a list of masks to trace: [{x0,y0,w,h,mask,depth,area,slot}]
export function simplifyFigure(F, s) {
  let c = cache.get(F);
  if (!c) { c = new Map(); cache.set(F, c); }
  const key = s.toFixed(3);
  if (c.has(key)) return c.get(key);
  let r = RC * s, ro = RO * s;
  // v5 (P4): lettering. A part as wide as the glyph's own stroke is not detail: the opening never reaches
  // the stroke (the bar of a T, the arms of an E in a bold face at a coarse spacing); and where the glyph is
  // drawn as a centreline, a counter only closes when the centrelines around it would merge (gap + stroke
  // width < 1.2 s), not at 0.4 s as between two outline rows
  const glyph = (F.part && F.part.kind === 'text' && !F.part.small) || F.region.glyphLike;
  // v5 (P1): a blob keeps its silhouette, tips included (the opening would cut a paper plane's points)
  if (F.blob && !glyph) ro = Math.min(ro, Math.max(2, 0.12 * (F.maxDepth || 0)));
  if (glyph) {
    const hw = F.region.width / 2;
    ro = Math.min(ro, Math.max(2, 0.8 * hw));
    if (hw < (0.4 + 0.75) * s) r = Math.min(r, Math.max(0, 0.6 * s - hw));
  }
  if (ro < 2) { // the fine reference: nothing to simplify at pixel scale
    const res = { parts: [{ x0: F.x0, y0: F.y0, w: F.w, h: F.h, mask: F.mask, depth: F.depth, area: F.area, slot: false }], droppedAreas: [], lost: 0 };
    c.set(key, res);
    return res;
  }
  const pad = Math.ceil(ro) + 2;
  const w = F.w + 2 * pad, h = F.h + 2 * pad, x0 = F.x0 - pad, y0 = F.y0 - pad;
  const M = new Uint8Array(w * h);
  for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) if (F.mask[y * F.w + x]) M[(y + pad) * w + x + pad] = 1;
  const N = w * h;
  // closing
  const dOut = sourceDistance(M, w, h);
  const D = new Uint8Array(N);
  for (let k = 0; k < N; k++) D[k] = dOut[k] <= r ? 1 : 0;
  const dIn = insideDistance(D, w, h);
  const M1 = new Uint8Array(N);
  for (let k = 0; k < N; k++) M1[k] = M[k] || dIn[k] > r ? 1 : 0;
  // closing residue -> long ones become slot lines
  const slots = [];
  let closed = false;
  {
    const res = new Uint8Array(N);
    let any = false;
    for (let k = 0; k < N; k++) if (M1[k] && !M[k]) { res[k] = 1; any = true; }
    closed = any;
    if (any) {
      const dr = insideDistance(res, w, h);
      for (const cp of components(res, w, h).comps) {
        if (cp.px.length < 4) continue;
        const { L } = strokeLength(cp.px, dr);
        if (L < MIN_LINE * s) continue;
        // a slot has parallel sides (mean depth ~ half the max, as in a strip); the wedge that closing
        // fills into an acute corner (the notches of an N) tapers (~ a third) and is not a slot
        let md = 0, sd = 0; for (const k of cp.px) { sd += dr[k]; if (dr[k] > md) md = dr[k]; }
        if (sd / cp.px.length < 0.42 * md) continue;
        slots.push(cp.px);
      }
    }
  }
  // opening of the closed mask, long thin residue added back
  // (closing changed nothing: the figure's own depth field is the distance field, shifted by the padding)
  let d1;
  if (closed) d1 = insideDistance(M1, w, h);
  else {
    d1 = new Float32Array(N);
    for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) { const v = F.depth[y * F.w + x]; if (v) d1[(y + pad) * w + x + pad] = v + 0.5; }
  }
  const E = new Uint8Array(N);
  for (let k = 0; k < N; k++) E[k] = d1[k] > ro ? 1 : 0;
  const dE = sourceDistance(E, w, h);
  const M2 = new Uint8Array(N);
  for (let k = 0; k < N; k++) M2[k] = M1[k] && dE[k] <= ro ? 1 : 0;
  let opened = false;
  {
    const res = new Uint8Array(N);
    let any = false;
    for (let k = 0; k < N; k++) if (M1[k] && !M2[k]) { res[k] = 1; any = true; }
    if (any) {
      for (const cp of components(res, w, h).comps) {
        const { L } = strokeLength(cp.px, d1);
        // a thin piece that joins the body in two places (the hairline of a serif e, a bridge between two
        // stems) carries topology: opening must not cut it, whatever its length
        if (L >= MIN_LINE * s || (L >= 0.75 * s && contacts(cp.px, M2, w, h) >= 2)) for (const k of cp.px) M2[k] = 1; else opened = true;
      }
    }
  }
  // components that cannot carry MIN_DOTS dots go, unless they are a visible compact dot
  const dt = opened ? insideDistance(M2, w, h) : d1;
  const D2 = (0.4 + 0.75) * s; // outline/centreline boundary (network.mjs)
  const { comps } = components(M2, w, h);
  const dropped = [];
  for (const cp of comps) {
    let md = 0, sd = 0, per = 0;
    for (const k of cp.px) {
      const v = dt[k]; sd += v; if (v > md) md = v;
      if (v < 1.5) per++;
    }
    const A = cp.px.length;
    let cap;
    if (md <= D2) cap = A / Math.max(1, 4 * sd / A) / s + 1;    // centreline: length / s
    else cap = Math.max(1, per - 2 * Math.PI * 0.4 * s) / s;     // outline at the inset
    if (cap >= MIN_DOTS) continue;
    if (A >= DOT_AREA * s * s && cap >= 1) continue; // a dot of an i, a pupil: one or two dots
    for (const k of cp.px) M2[k] = 0;
    dropped.push(A);
  }
  const out = [];
  let area = 0;
  for (let k = 0; k < N; k++) area += M2[k];
  if (area) {
    const dd = dt; // dropping whole components does not change the depths of the others

    const depth = new Float32Array(N);
    for (let k = 0; k < N; k++) depth[k] = M2[k] ? Math.max(0.01, dd[k] - 0.5) : 0;
    out.push({ x0, y0, w, h, mask: M2, depth, area, slot: false });
  }
  for (const px of slots) {
    // slot lines: their own small box
    let bx0 = w, by0 = h, bx1 = 0, by1 = 0;
    for (const k of px) { const x = k % w, y = (k - x) / w; if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
    bx0 = Math.max(0, bx0 - 1); by0 = Math.max(0, by0 - 1); bx1 = Math.min(w - 1, bx1 + 1); by1 = Math.min(h - 1, by1 + 1);
    const sw = bx1 - bx0 + 1, sh = by1 - by0 + 1;
    const m = new Uint8Array(sw * sh);
    for (const k of px) { const x = k % w, y = (k - x) / w; m[(y - by0) * sw + x - bx0] = 1; }
    const dd = insideDistance(m, sw, sh);
    const depth = new Float32Array(sw * sh);
    for (let k = 0; k < sw * sh; k++) depth[k] = m[k] ? Math.max(0.01, dd[k] - 0.5) : 0;
    out.push({ x0: x0 + bx0, y0: y0 + by0, w: sw, h: sh, mask: m, depth, area: px.length, slot: true });
  }
  // share of the figure's own ink that the simplification removed (protrusions, tips, dropped pieces)
  let lostPx = 0;
  for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) if (F.mask[y * F.w + x] && !M2[(y + pad) * w + x + pad]) lostPx++;
  const res = { parts: out, droppedAreas: dropped, lost: lostPx / Math.max(1, F.area) };
  c.set(key, res);
  return res;
}
