// v3, opts.fill: interior support rows for solid shapes (theory T1, to be judged by blind reviewers).
//
// A compact solid drawn only as a hollow outline can lose its identity: figure and ground become ambiguous,
// and touching or overlapping solids read as a wireframe. 'support' adds a few interior rows, sparser and
// dimmer than the edge row, so the edge still reads as the edge; 'solid' is the expensive upper bound.
//
// The interior rows are further clamped insets of the region's OWN ink (knock-outs and neighbouring colour
// regions are not ink of this region, so the rows keep their distance from them): level k sits at depth
// d + k*g from the edge; where the region is too thin for another full ring, the level is its centreline,
// so the rows end in the medial axis. Each level reuses the edge-row machinery (figureNetwork) on the
// region eroded to that level.
import { figureNetwork, INSET } from './network.mjs';
import { insideDistance } from './dt.mjs';
import { simplifyFigure } from './simplify.mjs';
import { sampleFigure } from './sample.mjs';

// g: distance between rows, tc: minimum distance of a closing centreline from the row outside it,
// dim: brightness of the interior dots relative to the edge colour (all in units of s)
export const FILL_MODES = {
  none: null,
  support: { g: 1.7, tc: 1.05, dim: 0.55 },
  solid: { g: 1.15, tc: 0.85, dim: 1 },
};
const MIN_SEP = 0.75;   // no interior dot closer than this to any other dot (units of s)
const FAT = 2.9;        // a shape is solid enough for interior rows when its (group's) stroke is >= FAT*s thick

const PRIO = { node: 4, corner: 2, dot: 1.5, reg: 1 };

// a container holds other things: a row of inlaid glyphs (lettering in a tile) or a large painted picture
// (a badge, a frame around a symbol). A single glyph inside a solid, knocked out or painted white (the P of
// Product Hunt), reads as a hole in the solid, not as content.
function isContainer(regions, g) {
  let painted = 0, inlays = 0;
  for (const c of regions) {
    if (!c.id || c === g || c.role !== 'figure') continue;
    if (c.parent !== g.id && c.fillInto !== g.id) continue;
    if (c.inlay) inlays++;
    if (!c.knockout) painted += c.fillArea || c.area;
  }
  return inlays >= 2 || painted > 0.25 * (g.fillArea || g.area);
}

export function fillEligible(ctx, F, s) {
  const g = F.region;
  if (F.tile || g.inlay) return false;
  if (F.part && F.part.kind === 'text') return false;           // lettering stays as it is
  if (isContainer(ctx.st.regions, g)) return false;
  const hw = F.group ? F.group.hw : g.width / 2;               // siblings decide together (class C)
  return 2 * hw >= FAT * s;
}

// interior rows of one figure at spacing s: [{ x, y, kind, level }]
function figureRows(ctx, F, fi, s, cfg) {
  const { seg } = ctx;
  const out = [];
  const g = cfg.g * s, tc = cfg.tc * s, d0 = INSET * s;
  for (const P of simplifyFigure(F, s).parts) {
    if (P.slot) continue;
    const { w, h, x0, y0 } = P;
    // own ink only: the knock-outs and painted children filled into the draw mask are not part of the solid
    const O = new Uint8Array(w * h);
    let any = false;
    for (let y = 0; y < h; y++) {
      const gy = y + y0;
      if (gy < 0 || gy >= seg.H) continue;
      for (let x = 0; x < w; x++) {
        const gx = x + x0, k = y * w + x;
        if (gx < 0 || gx >= seg.W || !P.mask[k]) continue;
        if (seg.id[gy * seg.W + gx] === F.rid) { O[k] = 1; any = true; }
      }
    }
    if (!any) continue;
    const dt = insideDistance(O, w, h);
    const depth = new Float32Array(w * h);
    let maxD = 0;
    for (let k = 0; k < w * h; k++) if (O[k]) { depth[k] = Math.max(0.01, dt[k] - 0.5); if (depth[k] > maxD) maxD = depth[k]; }
    // the first centreline may sit a little closer than tc, so a member of a fat sibling group that is
    // slightly thinner than the others still gets its medial row (Elasticsearch: three bars, one look)
    const tc1 = Math.max(MIN_SEP * s + 0.5, Math.min(tc, maxD - d0 - 0.05 * s));
    let c = d0;
    for (let k = 1; k < 64; k++) {
      const t = k === 1 ? tc1 : tc;
      const o = c + t;
      if (maxD <= o + 0.25) break;
      const M = new Uint8Array(w * h), D = new Float32Array(w * h);
      for (let q = 0; q < w * h; q++) if (depth[q] > o) { M[q] = 1; D[q] = Math.max(0.01, depth[q] - o); }
      // loop row at depth c + g; centreline where the level cannot hold a loop that keeps g/2 to the middle
      const net = figureNetwork({ x0, y0, w, h, mask: M, depth: D }, s, { insetPx: g - t, D2px: 1.5 * g - t });
      const r = sampleFigure(net, s, `f${fi}L${k}`);
      for (const p of r.pts) out.push({ x: p.x, y: p.y, kind: p.kind, level: k, fi });
      c += g;
    }
  }
  return out;
}

// interior points for all eligible active figures, after the edge build is final. Interior dots never come
// closer than MIN_SEP*s to any dot (edge or interior); they are added outer level first.
export function fillPoints(ctx, edgePts, s, active, mode, budget) {
  const cfg0 = FILL_MODES[mode];
  if (!cfg0) return { pts: [], figures: 0, g: 0 };
  const elig = [];
  ctx.figs.forEach((F, fi) => { if (active.has(fi) && fillEligible(ctx, F, s)) elig.push(fi); });
  if (!elig.length) return { pts: [], figures: 0, g: 0 };
  // the budget (maxDrones) is never exceeded: rows become a little sparser (at most 1.56 times the nominal
  // gap, beyond that it is no longer the support being tested), else the fill is left out
  for (let it = 0; it < 3; it++) {
    const cfg = { ...cfg0, g: cfg0.g * Math.pow(1.25, it) };
    let cand = [];
    for (const fi of elig) cand.push(...figureRows(ctx, ctx.figs[fi], fi, s, cfg));
    cand = cand.map((p, i) => ({ p, i })).sort((a, b) => a.p.level - b.p.level || PRIO[b.p.kind] - PRIO[a.p.kind] || a.i - b.i).map(o => o.p);
    const cell = s, grid = new Map(), r = MIN_SEP * s;
    const put = p => { const k = Math.floor(p.x / cell) + ',' + Math.floor(p.y / cell); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(p); };
    const free = p => {
      const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const L = grid.get((cx + dx) + ',' + (cy + dy));
        if (L) for (const q of L) if (Math.hypot(p.x - q.x, p.y - q.y) < r) return false;
      }
      return true;
    };
    for (const p of edgePts) put(p);
    const kept = [];
    for (const p of cand) if (free(p)) { put(p); kept.push(p); }
    if (edgePts.length + kept.length <= budget) return { pts: kept, figures: new Set(kept.map(p => p.fi)).size, g: cfg.g };
  }
  return { pts: [], figures: 0, g: 0, overBudget: true };
}
