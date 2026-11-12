// v10: contour only, for real (Marc, 12.11.2026: "Mittellinie ist tabu"; v9 still mixed contour and centre line inside one
// letter, because its rows came from the stroke-width regime of network.mjs). Every figure is drawn by the outline of its
// ink: the iso-line just inside its edge (marching squares on the figure's inside distance), outer edge and holes alike.
// The only budget lever is the spacing of the dots along those outlines. Corners, straight runs and small closed features
// come from sample.mjs (sampleFigure), conflicts between neighbouring dots from resolveConflicts.
import { sampleFigure } from './sample.mjs';

export const OUTLINE_LEVEL = 0.5; // iso level on the inside distance: halfway between the edge pixels and the background

// closed iso-lines of the figure's inside distance at `level`, in image coordinates (pixel centres at +0.5)
export function outlineLoops(F, level = OUTLINE_LEVEL) {
  const { w, h, depth, x0, y0 } = F;
  const W = w + 2, H = h + 2; // padded by one cell of background on every side
  const val = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : depth[y * w + x];
  const pos = new Map(), nb = new Map();
  const at = (k, p) => { if (!pos.has(k)) pos.set(k, p); };
  const link = (a, b) => { if (!nb.has(a)) nb.set(a, []); if (!nb.has(b)) nb.set(b, []); nb.get(a).push(b); nb.get(b).push(a); };
  // edge points: horizontal edge (x, y)-(x+1, y) is 'h', vertical (x, y)-(x, y+1) is 'v'
  const eh = (x, y) => { const k = `h${x},${y}`; const a = val(x, y), b = val(x + 1, y); at(k, [x + (level - a) / (b - a), y]); return k; };
  const ev = (x, y) => { const k = `v${x},${y}`; const a = val(x, y), b = val(x, y + 1); at(k, [x, y + (level - a) / (b - a)]); return k; };
  for (let y = -1; y < H - 2; y++) for (let x = -1; x < W - 2; x++) {
    const a = val(x, y), b = val(x + 1, y), c = val(x + 1, y + 1), d = val(x, y + 1);
    const code = (a > level ? 1 : 0) | (b > level ? 2 : 0) | (c > level ? 4 : 0) | (d > level ? 8 : 0);
    if (code === 0 || code === 15) continue;
    const T = () => eh(x, y), R = () => ev(x + 1, y), Bo = () => eh(x, y + 1), L = () => ev(x, y);
    switch (code) {
      case 1: case 14: link(L(), T()); break;
      case 2: case 13: link(T(), R()); break;
      case 3: case 12: link(L(), R()); break;
      case 4: case 11: link(R(), Bo()); break;
      case 6: case 9: link(T(), Bo()); break;
      case 7: case 8: link(L(), Bo()); break;
      case 5: case 10: {
        // saddle: the centre decides whether the two inked corners are joined (ink stays connected, as in the figure)
        const centre = (a + b + c + d) / 4 > level;
        if ((code === 5) === centre) { link(L(), Bo()); link(T(), R()); } else { link(L(), T()); link(R(), Bo()); }
        break;
      }
    }
  }
  const loops = [], seen = new Set();
  for (const start of nb.keys()) {
    if (seen.has(start)) continue;
    const loop = [];
    let prev = null, cur = start;
    for (let guard = 0; guard < 1e6; guard++) {
      seen.add(cur); loop.push(pos.get(cur));
      const n = nb.get(cur), next = n[0] !== prev ? n[0] : n[1];
      if (next === undefined || next === start || seen.has(next)) break;
      prev = cur; cur = next;
    }
    if (loop.length >= 3) loops.push(loop.map(([px, py]) => [x0 + px + 0.5, y0 + py + 0.5]));
  }
  return loops;
}

const lenOf = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };

// the outline nets of the active figures (cached by the caller: they do not depend on the dot spacing)
export function outlineNets(ctx, active) {
  const nets = [];
  ctx.figs.forEach((F, fi) => {
    if (active && !active.has(fi)) return;
    const edges = [];
    for (const loop of outlineLoops(F)) { const pts = loop.concat([loop[0]]); edges.push({ closed: true, pts, len: lenOf(pts) }); }
    if (edges.length) nets.push([fi, F, { edges, nodes: [], points: [] }]);
  });
  return nets;
}

// dots along the outlines. a is the drawing's spacing; a stroke narrower than OUTLINE_WIDTH * a gets its own, finer
// spacing (down to a / OUTLINE_DENSE), so that its two edges read as two rows and not as an even grid of dots (the small
// lettering under SEAT's mark at the spacing of the mark). The width is the row unit's (a word decides once, letters do
// not differ). Specks far below one dot's footprint are left out; a closed outline shorter than 2.4 of its spacing becomes
// one dot (sampleFigure). Conflicts: dots of one figure closer than OUTLINE_SAME of its spacing are merged (a stroke too
// thin even for the finest spacing reads as one line: a hairline), dots of different figures closer than OUTLINE_MERGE.
export const OUTLINE_MERGE = 0.5, OUTLINE_SAME = 0.45, OUTLINE_WIDTH = 1.4, OUTLINE_DENSE = 2.5;
const PRIO = { node: 4, corner: 2, dot: 1.5, reg: 1 };
export const strokeOf = F => 2 * ((F.unit && !F.unit.allBlob ? F.unit.hwThick : F.hwThick) || 1);
export function figureSpacing(F, a, kW = 1 / OUTLINE_WIDTH, aFloor = Infinity) {
  if (F.blob || F.field) return a;
  const w = strokeOf(F);
  // (past the sparsest spacing the budget level allows, aFloor, strokes thin out in proportion, so a hard cap can be met)
  return Math.max(a / OUTLINE_DENSE, Math.min(a, w * kW * Math.max(1, a / aFloor)));
}
// lines: figures drawn as one line along their middle instead (a whole row unit at a time, never part of a letter; only
// at the budget levels that allow it, when the contour of the unit does not fit, see FLEX in convert.mjs)
export function outlineBuild(ctx, nets, a, { kW = 1 / OUTLINE_WIDTH, aFloor = Infinity, lines = null } = {}) {
  const all = [];
  for (const [fi, F, net0] of nets) {
    if (F.area < 0.08 * a * a && F.region.width < 0.25 * a) continue;
    const asLine = lines && lines.figs.has(fi);
    const net = asLine ? lines.netOf(fi) : net0;
    const af = asLine ? a : figureSpacing(F, a, kW, aFloor);
    const r = sampleFigure(net, af, fi, Infinity, { along: () => af, turnWell: ctx.turnWell, ringMin: 3 });
    for (const p of r.pts) { p.fi = fi; p.af = af; p.sal = -(F.region.width || 0); }
    all.push(...r.pts);
  }
  const pts = resolveOutline(all, a), afs = pts.map(p => p.af).sort((x, y) => x - y);
  return { pts, a, s: a, along: afs.length ? afs[afs.length >> 1] : a };
}
function resolveOutline(pts, a) {
  const order = pts.map((p, i) => i).sort((i, j) => (PRIO[pts[j].kind] - PRIO[pts[i].kind]) || ((pts[j].sal || 0) - (pts[i].sal || 0)) || i - j);
  const cell = OUTLINE_MERGE * a, grid = new Map(), kept = [];
  const R = Math.ceil(OUTLINE_MERGE * a / cell) + 1;
  for (const i of order) {
    const p = pts[i], cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell);
    let hit = false;
    for (let dy = -R; dy <= R && !hit; dy++) for (let dx = -R; dx <= R && !hit; dx++) {
      const L = grid.get((cx + dx) + ',' + (cy + dy)); if (!L) continue;
      for (const q of L) {
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        const lim = q.fi === p.fi ? OUTLINE_SAME * Math.min(p.af, q.af) : OUTLINE_MERGE * Math.min(p.af, q.af);
        if (d < lim) { hit = true; break; }
      }
    }
    if (hit) continue;
    kept.push(p);
    const k = cx + ',' + cy; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(p);
  }
  return kept;
}

// the largest count at or below n (and the spacing that gives it), by bisection on log a; counts fall with a
export function solveSpacingFor(count, n, aLo, aHi, steps = 18) {
  let lo = Math.log(aLo), hi = Math.log(aHi), best = null;
  const tryA = a => { const b = count(a); if (b.pts.length <= n && (!best || b.pts.length > best.pts.length)) best = b; return b; };
  if (tryA(aLo).pts.length <= n) return best;
  for (let i = 0; i < steps; i++) {
    const mid = 0.5 * (lo + hi), b = tryA(Math.exp(mid));
    if (b.pts.length > n) lo = mid; else hi = mid;
    if (best && best.pts.length >= 0.985 * n) break;
  }
  return best || count(aHi);
}

// typical stroke width of the drawing (area-weighted median of 2 * hwThick over the stroke figures; blobs only: none)
export function strokeWidth(ctx, active) {
  const xs = [];
  ctx.figs.forEach((F, fi) => { if ((!active || active.has(fi)) && !F.blob && !F.field) xs.push([2 * (F.hwThick || 1), F.area]); });
  if (!xs.length) return Infinity;
  xs.sort((p, q) => p[0] - q[0]);
  const tot = xs.reduce((t, x) => t + x[1], 0);
  let acc = 0; for (const [v, w] of xs) { acc += w; if (acc >= 0.5 * tot) return v; }
  return xs.at(-1)[0];
}

