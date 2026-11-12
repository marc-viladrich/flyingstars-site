import { filterRemoved } from './removed-mask.mjs';
// Logo raster -> drone points. See DESIGN.md for the contract and the four ideas.
import { segment } from './segment.mjs';
import { structure } from './structure.mjs';
import { figureNetwork, INSET, ROW_SEP } from './network.mjs';
import { sampleFigure, resolveConflicts, TURN_MAX } from './sample.mjs';
import { liftForSky } from './color.mjs';
import { analyseReference, predictedFidelity, coverLadder, RES, SAG } from './scale.mjs';
import { costAwareSelection, simplifyForBudget, letterRows, NAME_RING } from './select.mjs';
import { solveSpacing } from './solve.mjs';
import { findParts, lineBand } from './parts.mjs';
import { simplifyFigure } from './simplify.mjs';
import { reference, verify } from './verify.mjs';
import { fillPoints, FILL_MODES } from './fill.mjs';
import { sourceDistance, insideDistance } from './dt.mjs';
import { depictTarget, depiction, namingProbability } from './depict.mjs';
import { keepScore } from './keep.mjs';
import { noiseOf, noiseClusters, fieldFigure, PAT_SHARE, PAT_MIN } from './pattern.mjs';
import { detectContainer, withoutContainer, computeElements, elementAt, paintOut } from './elements.mjs';
import { schematicImage, crestOf, SCH_TEXT_LABEL } from './schematic.mjs';
import { outlineLoops, outlineNets, outlineBuild, solveSpacingFor, strokeWidth, strokeOf, OUTLINE_WIDTH } from './outline.mjs';

// Fidelity threshold: share of the salient fine-scale structure that must survive at the chosen spacing.
// quality scales the allowed loss: loss <= (1 - TAU) / quality.
export const TAU = 0.9;
const MIN_POINTS = 25;
// v5 (Part 3): price of one doubling of the drone count in depiction score (divided by quality), and the
// step of the spacing search
export const DEPICT_PRICE = 0.03;
export const DEPICT_STEP = 1.6;

// curve network of one figure at spacing s: simplified to scale s first (class D), then traced; slot lines
// cut into the figure are traced as their own centrelines. Node indices are offset so they stay unique.
// Class C: outline-versus-centreline is decided per group of comparable figures (similar stroke width and
// size), not per pixel. When the group's typical half-width is below the outline threshold, every member is
// drawn as a centreline throughout (the threshold is raised above its deepest point, by at most 40 %), so a
// near-threshold stroke does not flip between one and two rows along its length or between siblings.
// In the outline regime every core that reaches past the threshold is kept (a sibling slightly thinner than
// the others must not fall back to one row because its core is "only marginally" deep).
//
// v6: rows per stroke is a decision of its own. Every figure belongs to a row unit (its sibling group, joined
// with the other glyphs of its text row) and the unit is drawn either with one centre row throughout
// (F.twoRows === false: the outline threshold is raised above the unit's deepest point) or in the v5 regime
// below, where a stroke wider than the outline threshold at s gets two edge rows (F.twoRows !== false).
// Compact shapes (blobs) are outlines in both cases.
function regime(F, s) {
  const D2 = (INSET + 0.5 * ROW_SEP) * s, G = F.group;
  // v5 (P1): a compact shape is drawn by its outline at every spacing
  if (F.blob) return { blob: true };
  if (!G) return { d2: 1 };
  if (F.twoRows === false && F.unit && !F.container) return { d2: Math.max(1, 1.05 * F.unit.maxDepth / D2) };
  // v6.1: a unit given its second row by the cue (step c) or by rows 'two': every stroke wide enough for two rows
  // at s gets them, without the class-C raise (a Didone face, typically hairline-thin, keeps its stems outlined)
  if (F.forceTwo) return { d2: 1, coreMargin: TWO_MARGIN };
  // (for shapes only: in a glyph a kept marginal core turns half a stroke into two rows, see network.mjs)
  if (G.hw >= D2) return F.part && F.part.kind === 'text' ? { d2: 1 } : { d2: 1, coreMargin: 0.05 };
  // v4 (point 2): a shape with stroke contrast around a counter keeps its fat parts as two rows
  if (F.contrastCap) return { d2: 1, coreMargin: 0.05 };
  return { d2: Math.max(1, Math.min(1.4, 1.05 * G.maxDepth / D2)) };
}

// v3: two solid shapes that nearly touch (the Jira arrows, 0.45 s of ground between them) each keep a closed outline
// of their own. Their inset rows would otherwise come closer than the eye can separate and merge into one
// shared line, and the shapes read as a wireframe. Near a neighbour the row is moved inwards so that it keeps
// SEP/2 from the midline between the two shapes: depth' = min(depth, (depth + dist to neighbour)/2 - SEP/2 + d).
// Only between fat, non-text shapes in the outline regime, never for shapes that share ink (Mastercard: both
// circles are filled across the lens and are meant to overlap) or touch (Vue: one shared row is right).
const ADJ_SEP = 1.5, ADJ_WIN = 48;
// (item 5, stopped by the time box: two attempts, no visible gain on Sony, Rolex, Canon; 1.4 prunes slab serifs of one-row
// lettering, see TRAJECTORY.md "v7". Off.)
export const SERIF_W = 0;
// v6.1: a forced two-row stroke keeps a long core this deep past the row threshold (in units of s)
const TWO_MARGIN = 0.1;
// v5 (P1): stroke versus blob. A figure is a stroke when its medial axis is several times its width (E =
// area / (16 * mean depth^2) >= STROKE_E; a strip of length L and width w has E = L / w) AND its width holds
// along the axis (share of medial-axis pixels at >= half the maximum depth >= STROKE_C2; the tapering wings of a
// paper plane, a swoosh, a bird do not). Everything else is a blob: drawn by its outline, never its skeleton.
export const STROKE_E = 3, STROKE_C2 = 0.6, BLOB_INSET = 0.3, BLOB_DOTS = 8;
const isFat = (F, s) => F.group && F.group.hw >= (INSET + 0.5 * ROW_SEP) * s && !(F.part && F.part.kind === 'text');
function neighbourDistance(F) {
  if (F.nbDist !== undefined) return F.nbDist;
  F.nbDist = null;
  if (!F.nbFigs || !F.nbFigs.length) return null;
  const x0 = F.x0 - ADJ_WIN, y0 = F.y0 - ADJ_WIN, w = F.w + 2 * ADJ_WIN, h = F.h + 2 * ADJ_WIN;
  const src = new Uint8Array(w * h);
  for (const G of F.nbFigs) for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) {
    if (!G.mask[y * G.w + x]) continue;
    const X = x + G.x0 - x0, Y = y + G.y0 - y0;
    if (X >= 0 && Y >= 0 && X < w && Y < h) src[Y * w + X] = 1;
  }
  F.nbDist = { x0, y0, w, h, d: sourceDistance(src, w, h) };
  return F.nbDist;
}
function keepApart(F, P, s) {
  const nb = neighbourDistance(F);
  if (!nb) return P;
  const d = INSET * s, off = 0.5 * ADJ_SEP * s - d;
  let depth = null, mask = null;
  for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) {
    const k = y * P.w + x;
    if (!P.mask[k]) continue;
    const X = x + P.x0 - nb.x0, Y = y + P.y0 - nb.y0;
    if (X < 0 || Y < 0 || X >= nb.w || Y >= nb.h) continue;
    const v = 0.5 * (P.depth[k] + nb.d[Y * nb.w + X]) - off;
    if (v >= P.depth[k]) continue;
    if (!depth) { depth = Float32Array.from(P.depth); mask = Uint8Array.from(P.mask); }
    if (v <= 0.01) { mask[k] = 0; depth[k] = 0; } else depth[k] = v;
  }
  return depth ? { ...P, mask, depth } : P;
}

export function netOf(F, s, opt = {}) {
  const { parts } = simplifyFigure(F, s);
  const rg = regime(F, s);
  F.d2 = rg.d2;
  const out = { edges: [], points: [], nodes: [] };
  const apart = !opt.pure && rg.d2 === 1 && isFat(F, s) && F.nbFigs && F.nbFigs.some(G => isFat(G, s));
  for (const P0 of parts) {
    const P = apart && !P0.slot ? keepApart(F, P0, s) : P0;
    let o = P.slot ? { pure: true } : { ...rg, ...opt };
    // v7 (item 5): lettering drawn in one row drops its slab serifs: at the end of a stem, a pair of short spurs
    // pointing away from each other (each under SERIF_W stroke widths, divided by quality) is pruned (network.mjs)
    if (!P.slot && !opt.pure && !rg.blob && rg.d2 > 1 && F.part && F.part.kind === 'text' && !F.part.small && SERIF_W > 0) o.serifLen = SERIF_W * F.region.width / (globalThis.__v7q ?? 1);
    if (rg.blob && !P.slot && !opt.pure) {
      // v5 (P1): the outline sits close enough to the edge that the whole silhouette (wings, tips) stays inside
      // the loop; every core is kept, so the skeleton never stands in for the shape
      let mx = 0; for (let k = 0; k < P.w * P.h; k++) if (P.depth[k] > mx) mx = P.depth[k];
      const d = Math.min(INSET * s, Math.max(1.5, BLOB_INSET * mx));
      o = { insetPx: d, D2px: Math.max(d + 1, 1.25 * d), keepCores: true, spurLen: 0.35 };
    }
    const net = figureNetwork(P, s, o);
    // v5 (P1): the free end of a blob's spur (a tip) is moved out to the tip itself: the medial axis stops one
    // inscribed radius short of it, and a blob's corners belong on dots
    if (rg.blob && !P.slot && !opt.pure) {
      const deg = new Map(); for (const e of net.edges) if (!e.closed) { deg.set(e.a, (deg.get(e.a) || 0) + 1); deg.set(e.b, (deg.get(e.b) || 0) + 1); }
      const inside = (x, y) => { const X = Math.floor(x) - F.x0, Y = Math.floor(y) - F.y0; return X >= 0 && Y >= 0 && X < F.w && Y < F.h && F.mask[Y * F.w + X]; };
      for (const e of net.edges) {
        if (e.closed) continue;
        for (const [ni, end, prev] of [[e.a, 0, 1], [e.b, e.pts.length - 1, e.pts.length - 2]]) {
          if (deg.get(ni) !== 1 || e.pts.length < 2) continue;
          const q = e.pts[end], r = e.pts[Math.max(0, Math.min(e.pts.length - 1, end + (prev - end) * Math.min(6, e.pts.length - 1)))];
          let dx = q[0] - r[0], dy = q[1] - r[1]; const l = Math.hypot(dx, dy); if (l < 1e-6) continue; dx /= l; dy /= l;
          let t = 0; while (t < 4 * s && inside(q[0] + (t + 1) * dx, q[1] + (t + 1) * dy)) t++;
          const tip = [q[0] + t * dx, q[1] + t * dy];
          e.pts[end] = tip; e.len += t; if (net.nodes[ni]) net.nodes[ni] = { x: tip[0], y: tip[1] };
        }
      }
    }
    const off = out.nodes.length;
    for (const e of net.edges) out.edges.push({ ...e, a: e.a >= 0 ? e.a + off : e.a, b: e.b >= 0 ? e.b + off : e.b, slot: P.slot });
    out.points.push(...net.points);
    out.nodes.push(...net.nodes);
  }
  return out;
}

// two: Set of row-unit ids drawn in the two-row (v5) regime; null = every unit (the v5 picture)
function monoFigure(ctx, F) {
  if (F._mono !== undefined) return F._mono;
  F._mono = null;
  const kids = [];
  ctx.figs.forEach((G, j) => { if (G !== F && G.region.fillInto === F.rid && G.region.knockout) kids.push(j); });
  if (!kids.length) return null;
  const { w, h, x0, y0 } = F, mask = Uint8Array.from(F.mask);
  for (const j of kids) {
    const G = ctx.figs[j];
    for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) {
      if (!G.mask[y * G.w + x]) continue;
      const X = x + G.x0 - x0, Y = y + G.y0 - y0;
      if (X >= 0 && Y >= 0 && X < w && Y < h) mask[Y * w + X] = 0;
    }
  }
  const dt = insideDistance(mask, w, h), depth = new Float32Array(w * h);
  let area = 0;
  for (let k = 0; k < w * h; k++) if (mask[k]) { depth[k] = Math.max(0.01, dt[k] - 0.5); area++; }
  const fig = Object.create(F);
  Object.assign(fig, { mask, depth, area });
  F._mono = { fig, skip: kids };
  return F._mono;
}

// v6.1: samp = { density, adaptive } changes how the dots are spaced along each row (opts.density,
// opts.adaptive). The rows themselves (network, rows per stroke, content) stay those of spacing s. A first pass
// samples every row at s; from it every run (the stretch of a row between two anchors) gets its clearance: the
// distance to the nearest dot of another row (not its neighbours along its own row, not the rows meeting it at
// a junction). The second pass spaces the run's dots at s / density, but never so far apart that they would
// link across to the other row rather than along their own (spacing <= clearance / LINK_RATIO; a run never
// gets sparser than s on that account). Anchors (corners, ends, junctions) are always kept.
export const LINK_RATIO = 1.5, ADAPT_G = 1.8, ADAPT_GRADE = 0.12;
// v7: the density range in which the structural guarantees hold (anchors on corners, ends and junctions; closed curves
// keep 4 dots; no run gets sparser than its clearance to another row allows). Below it the user explores how the
// picture falls apart: the clearance cap is relaxed in proportion (DENSITY_SAFE / density) and a closed curve keeps
// 3 dots; anchors always stay
export const DENSITY_SAFE = 0.35;
function runClearance(pts, chains, s, reach) {
  const where = new Map();
  chains.forEach((c, ci) => {
    const n = c.closed ? c.length - 1 : c.length;
    for (let k = 0; k < n; k++) { const o = c[k]; if (!where.has(o)) where.set(o, []); where.get(o).push([ci, k, n, c.closed]); }
  });
  const ends = chains.map(c => c.closed ? [] : [c[0], c[c.length - 1]].filter(o => o.kind === 'node'));
  const cell = Math.max(2, reach / 3), grid = new Map();
  for (const p of pts) { const k = Math.floor(p.x / cell) + ',' + Math.floor(p.y / cell); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(p); }
  const cap = new Map();
  for (const q of pts) {
    if (!q.run) continue;
    const wq = where.get(q) || [];
    let best = reach;
    const cx = Math.floor(q.x / cell), cy = Math.floor(q.y / cell), R = Math.ceil(reach / cell);
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const L = grid.get((cx + dx) + ',' + (cy + dy)); if (!L) continue;
      for (const p of L) {
        if (p === q) continue;
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d >= best) continue;
        const wp = where.get(p) || [];
        let near = false;
        for (const [ci, k, n, cl] of wq) {
          for (const [cj, j] of wp) if (ci === cj) { let dd = Math.abs(k - j); if (cl) dd = Math.min(dd, n - dd); if (dd <= 3) near = true; }
          // rows meeting at a junction are joined there, not separate
          for (const N of ends[ci]) if (Math.hypot(q.x - N.x, q.y - N.y) <= 2.5 * s && Math.hypot(p.x - N.x, p.y - N.y) <= 2.5 * s && wp.some(([cj]) => ends[cj].includes(N))) near = true;
          if (near) break;
        }
        if (!near) best = d;
      }
    }
    cap.set(q.run, Math.min(cap.get(q.run) ?? Infinity, best));
  }
  for (const [k, v] of cap) cap.set(k, Math.max(s, 0.9 * v / LINK_RATIO));
  return cap;
}

// v8.5: `reuse` = an earlier build at the same s, content and rows: its traced nets are taken as they are (tracing is the
// expensive part: simplification and thinning per figure); only the dots are placed again (the resampler, see convertCore)
export function buildAt(ctx, s, active = null, two = null, samp = null, reuse = null) {
  if (globalThis.__dbgBuilds) globalThis.__dbgBuilds.push(+s.toFixed(2));
  let all = [], curves = [], collapsed = [], chains = [];
  let bad = 0;
  const badWhere = [];
  const nets = [];
  // v6: a one-row glyph whose counter is a separate knocked-out region (the R of REWE) is traced on its own ink
  // with the counter cut out, so its centre row loops around the counter; the counter figure is not drawn
  const skip = new Set();
  ctx.figs.forEach((F, fi) => {
    if (active && !active.has(fi)) return;
    F.twoRows = two === null || !F.unit || two.has(F.unit.id);
    F.forceTwo = !!(two && two.force && F.unit && two.force.has(F.unit.id));
    if (!F.twoRows && !F.blob && !F.container) { const m = monoFigure(ctx, F); if (m) for (const j of m.skip) skip.add(j); }
  });
  if (reuse && reuse.nets) nets.push(...reuse.nets);
  else ctx.figs.forEach((F, fi) => {
    if (active && !active.has(fi)) return;
    if (skip.has(fi)) return;
    if (!F.twoRows && !F.blob && !F.container && F._mono) F = F._mono.fig;
    // specks far below one drone's footprint (anti-aliasing debris, tiny marks) would only add noise
    if (F.area < 0.12 * s * s && F.region.width < 0.3 * s) return;
    let net = netOf(F, s);
    // A connected stroke can lose the return side during band thinning near its width threshold.
    // In contour mode repair disconnected open fragments from its single closed inset boundary.
    if (ctx.contour && F.twoRows && !F.blob && !F.field && net.edges.length > 1 && net.edges.every(e => !e.closed)) {
      const parent = new Map(), root = x => { if (!parent.has(x)) parent.set(x,x); const p=parent.get(x); if(p!==x)parent.set(x,root(p)); return parent.get(x); };
      for(const e of net.edges) parent.set(root(e.a),root(e.b));
      if(new Set(net.edges.map(e=>root(e.a))).size > 1 || (net.edges.some(e=>e.a===e.b) && net.edges.some(e=>e.a!==e.b))) {
        const loops=outlineLoops(F, Math.min(INSET*s, .5*F.hwThin));
        if(loops.length===1) {
          const pts=loops[0].concat([loops[0][0]]);let len=0;
          for(let i=1;i<pts.length;i++)len+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);
          net={edges:[{pts,len,closed:true,a:-1,b:-1}],nodes:[],points:[]};
        }
      }
    }
    // v5 (P1): a blob too small to carry an outline of BLOB_DOTS dots at s: one dot (when it is big enough to
    // be seen as one) or nothing; a main blob keeps its outline (the spacing is capped for it, see settle)
    if (F.blob && !F.mainBlob && !F.touching) {
      let L = 0; for (const e of net.edges) L += e.len;
      if (L < BLOB_DOTS * s) {
        let x = 0, y = 0, n = 0;
        for (let yy = 0; yy < F.h; yy++) for (let xx = 0; xx < F.w; xx++) if (F.mask[yy * F.w + xx]) { x += xx; y += yy; n++; }
        net = { edges: [], nodes: [], points: F.area >= 0.45 * s * s && n ? [[F.x0 + x / n + 0.5, F.y0 + y / n + 0.5]] : [] };
      }
    }
    nets.push([fi, F, net]);
  });
  let arcBad = 0;
  const sampleAll = (opt = {}) => {
    all = []; curves = []; collapsed = []; chains = []; bad = 0; arcBad = 0; badWhere.length = 0;
    for (const [fi, F, net] of nets) {
      const r = sampleFigure(net, s, fi, ctx.sagMax ?? Infinity, { ...opt, turnWell: ctx.turnWell });
      for (const p of r.pts) { p.fi = fi; p.sal = -(F.region.width || 0); }
      all.push(...r.pts);
      for (const c of r.curves) { c.fi = fi; curves.push(c); }
      for (const c of r.collapsed) collapsed.push({ fi, pos: c });
      for (const c of r.chains) { c.fi = fi; c.closed = c.length > 2 && c[0] === c[c.length - 1]; chains.push(c); }
      bad += r.bad * (F.weight ?? 1);
      arcBad += r.arcBad * (F.weight ?? 1);
      badWhere.push(...r.badWhere);
    }
  };
  sampleAll();
  const rawPlain = all.length;
  // v7: the plain sampling (every row at s) is kept as the build's structure: the hard checks, the keep score, noise
  // and arcs judge it (b.plain); the respaced dots are the picture (count, depiction)
  const plainSet = { all, curves, collapsed, chains, bad, arcBad, badWhere: badWhere.slice() };
  let alongMax = 1;
  if (samp && (samp.density !== 1 || samp.adaptive)) {
    const d = samp.density, G = samp.adaptive ? ADAPT_G : 1, safe = d >= DENSITY_SAFE;
    alongMax = Math.max(1, G / d);
    const cap = runClearance(all, chains, s, LINK_RATIO * s * Math.max(1, G / Math.max(d, DENSITY_SAFE)) * 1.2);
    const relax = safe ? 1 : DENSITY_SAFE / d;
    const capOf = run => (cap.get(run) ?? Infinity) * relax;
    const along = d >= 1 ? () => s / d : run => Math.min(s / d, capOf(run));
    sampleAll({ along, adapt: samp.adaptive ? { G, grade: ADAPT_GRADE, cap: capOf } : null, ringMin: safe ? 4 : 3 });
  }
  if (ctx.debugBad) ctx.debugBad.push(...badWhere);
  const finish = (all, chains) => {
    const { pts, merged } = resolveConflicts(all, s);
    // chains in terms of surviving points (merged points jump to their partner)
    const segs = [];
    for (const c of chains) {
      let prev = null;
      for (const o of c) { const t = o.to; if (!prev) { if (c.length === 1) segs.push([t, t, c.fi, c]); } else if (t !== prev) segs.push([prev, t, c.fi, c]); prev = t; }
    }
    return { pts, merged, segs };
  };
  const { pts, merged, segs } = finish(all, chains);
  const out = { pts, merged, raw: all.length, rawPlain, curves, collapsed, s, bad, arcBad, segs, chainsRaw: chains, two, samp, alongMax };
  Object.defineProperty(out, 'nets', { value: nets });
  if (plainSet.all !== all && !reuse) {
    const f = finish(plainSet.all, plainSet.chains);
    out.plain = { ...f, raw: rawPlain, rawPlain, curves: plainSet.curves, collapsed: plainSet.collapsed, s, bad: plainSet.bad, arcBad: plainSet.arcBad, chainsRaw: plainSet.chains, two, samp: null, alongMax: 1 };
  }
  return out;
}

function pointColour(ctx, p) {
  const F = ctx.figs[p.fi];
  const { seg } = ctx;
  let lab = F.drawLab;
  if (F.ownColour) {
    const x = Math.round(p.x - 0.5), y = Math.round(p.y - 0.5);
    let best = null, bd = Infinity;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= seg.W || Y >= seg.H) continue;
      const i = Y * seg.W + X;
      if (seg.id[i] !== F.rid) continue;
      const dd = dx * dx + dy * dy;
      if (dd < bd) { bd = dd; best = i; }
    }
    if (best !== null) lab = [seg.pixLab[best * 3], seg.pixLab[best * 3 + 1], seg.pixLab[best * 3 + 2]];
  }
  const [r, g, b] = liftForSky(lab);
  return { r, g, b };
}

function rootOf(regions, id) { let g = regions[id]; while (g.parent > 0) g = regions[g.parent]; return g; }

// coarsest spacing s such that the predicted fidelity stays >= TAU for every scale between s0 and s.
// quality acts as one knob: the criteria are judged at s*quality.
// v6.2: the predicted fidelity is not monotone in s over single steps (the curve test, 0.915, 0.89, 0.933, 0.94 for
// Netlify between s 4.5 and 6.5); one step under tau by less than DIP between passing steps does not end the
// search (it ended v6.1's step a for Netlify at 415 dots)
const DIP = 0.05;
function searchScale(A, s0, sMax, quality, active, tau = TAU) {
  let s = s0, f = 1, dips = 0;
  for (let t = s0 * 1.05; t <= sMax; t *= 1.05) {
    const ft = predictedFidelity(A, t * quality, active);
    if (ft >= tau) { s = t; f = ft; dips = 0; continue; }
    if (ft < tau - DIP || ++dips >= 2) break;
  }
  return { s, f };
}

// share of the build's curve length that is under-sampled (sustained curvature)
const curvShare = b0 => { const b = b0.plain || b0; let L = 0; for (const sg of b.segs) L += Math.hypot(sg[1].x - sg[0].x, sg[1].y - sg[0].y); return L ? b.bad * b.s / L : 0; };
// v6.1: share of the curve length on long arcs drawn with too few dots (sample.mjs, arcAccount)
const arcShare = b0 => { const b = b0.plain || b0; let L = 0; for (const sg of b.segs) L += Math.hypot(sg[1].x - sg[0].x, sg[1].y - sg[0].y); return L ? b.arcBad * b.s / L : 0; };

export function prepWeights(ctx) {
  const st = ctx.st;
  for (const F of ctx.figs) {
    const r = rootOf(st.regions, F.rid); F.root = r.id;
    const g = F.region;
    F.partMin = Math.min(g.y1 - g.y0 + 1, g.x1 - g.x0 + 1);
    F.simplePart = g.width >= 0.45 * F.partMin; // a bar, a dot, a disc: one stroke, nothing to resolve
  }
  ctx.parts = findParts(ctx);
  // v5 (P1): stroke or blob, per figure (glyphs of a text row are governed by P4 instead)
  for (const F of ctx.figs) {
    const { w, h, depth: d, mask } = F;
    let a = 0, sd = 0, mx = 0, per = 0, nr = 0;
    const r = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = y * w + x;
      if (!mask[k]) continue;
      a++; sd += d[k] + 0.5; if (d[k] > mx) mx = d[k];
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1 || !mask[k - 1] || !mask[k + 1] || !mask[k - w] || !mask[k + w]) per++;
      if (d[k] < 1) continue;
      let ridge = true;
      for (let dy = -1; dy <= 1 && ridge; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h && d[Y * w + X] > d[k] + 1e-6) { ridge = false; break; } }
      if (ridge) r.push(d[k]);
    }
    const md = sd / Math.max(1, a);
    F.elong = a / (16 * md * md); F.maxDepth = mx; F.perim = 0.9 * per;
    F.c2 = r.length ? r.filter(v => v >= 0.5 * mx).length / r.length : 1;
    // v6.1: the half-width of the thick strokes (90th percentile of the medial-axis depth): the stems of a
    // high-contrast face, where its typical width (region.width) is set by the hairlines
    if (r.length) { r.sort((x, y) => x - y); F.hwThick = r[Math.min(r.length - 1, Math.floor(0.9 * (r.length - 1)))] + 0.5; } else F.hwThick = 0.5;
    // v10: the half-width of its thinnest strokes (20th percentile): the contour spacing that keeps every part of the
    // figure in two rows (thick-percentile spacing left curves and tapers in one row: Zendesk, Fujitsu's J, Reebok)
    F.hwThin = r.length ? r[Math.floor(CONTOUR_THIN_P * (r.length - 1))] + 0.5 : 0.5;
    const text = F.part && F.part.kind === 'text' && !F.part.small;
    F.blob = !text && mx >= 2 && !(F.elong >= STROKE_E && F.c2 >= STROKE_C2);
  }
  // v5 (P4): one regime per text row, from the row's typical stroke half-width
  for (const p of ctx.parts.all) if (p.kind === 'text') {
    const hw = ctx.figs.filter(F => F.part === p).map(F => F.region.width / 2).sort((x, y) => x - y);
    if (hw.length) p.rowHw = hw[hw.length >> 1];
  }
  // sibling groups (class C): stroke widths within 30 % and sizes within a factor 3
  {
    const figs = ctx.figs, n = figs.length, par = figs.map((_, i) => i);
    const find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
    const sz = F => Math.sqrt((F.region.x1 - F.region.x0 + 1) * (F.region.y1 - F.region.y0 + 1));
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = figs[i].region, b = figs[j].region;
      if (Math.max(a.width, b.width) > 1.3 * Math.min(a.width, b.width)) continue;
      if (Math.max(sz(figs[i]), sz(figs[j])) > 3 * Math.min(sz(figs[i]), sz(figs[j]))) continue;
      const ra = find(i), rb = find(j); if (ra !== rb) par[Math.max(ra, rb)] = Math.min(ra, rb);
    }
    const groups = new Map();
    figs.forEach((F, i) => { const g = find(i); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(F); });
    for (const list of groups.values()) {
      const hws = list.map(F => F.region.width / 2).sort((a, b) => a - b);
      const G = { hw: hws[hws.length >> 1], maxDepth: Math.max(...list.map(F => F.region.maxDepth || 0)), size: list.length };
      for (const F of list) F.group = G;
    }
  }
  // neighbours for keepApart: other figures close by that share no ink and no fill relation with F
  for (const F of ctx.figs) {
    F.nbFigs = [];
    for (const G of ctx.figs) {
      if (G === F || G.x0 > F.x0 + F.w + ADJ_WIN || G.x0 + G.w < F.x0 - ADJ_WIN || G.y0 > F.y0 + F.h + ADJ_WIN || G.y0 + G.h < F.y0 - ADJ_WIN) continue;
      if (F.region.fillers.includes(G.rid) || G.region.fillers.includes(F.rid) || F.region.parent === G.rid || G.region.parent === F.rid) continue;
      // shapes that share ink or touch (Vue: two chevrons on one boundary, drawn once by the shared row) are
      // left as they are; only shapes with ground between them (the Jira arrows) are kept apart
      let overlap = false;
      const gAt = (x, y) => x >= G.x0 && y >= G.y0 && x < G.x0 + G.w && y < G.y0 + G.h && G.mask[(y - G.y0) * G.w + x - G.x0];
      for (let y = Math.max(F.y0, G.y0 - 2); y < Math.min(F.y0 + F.h, G.y0 + G.h + 2) && !overlap; y++) for (let x = Math.max(F.x0, G.x0 - 2); x < Math.min(F.x0 + F.w, G.x0 + G.w + 2); x++) {
        if (!F.mask[(y - F.y0) * F.w + x - F.x0]) continue;
        if (gAt(x, y) || gAt(x + 1, y) || gAt(x - 1, y) || gAt(x, y + 1) || gAt(x, y - 1) || gAt(x + 2, y) || gAt(x - 2, y) || gAt(x, y + 2) || gAt(x, y - 2)) { overlap = true; break; }
      }
      if (overlap) F.touching = true; // v5 (P1): a piece of a mosaic (facets, abutting shapes), not an isolated blob
      if (!overlap && !(G.part && G.part.kind === 'text')) F.nbFigs.push(G);
    }
  }
  const maxSize = Math.max(1, ...ctx.parts.all.map(p => p.size));
  // hairlines (anti-aliased rims, thin separators) matter less than the strokes that carry the shape
  const [lx0, ly0, lx1, ly1] = st.logoBox;
  const hair = 0.008 * Math.hypot(lx1 - lx0, ly1 - ly0);
  for (const F of ctx.figs) {
    const size = F.part ? F.part.size : maxSize;
    F.weight = Math.pow(Math.max(0.1, Math.min(1, size / (0.5 * maxSize))), 1.5) * Math.max(0.15, Math.min(1, F.region.width / hair));
    if (F.part && F.part.small) F.weight *= 0.3;
  }
  // v5 (P1): a main blob (the figure inlaid in a container, or among the largest elements) must be outlined:
  // it caps the spacing at the size that still puts BLOB_DOTS dots around it
  for (const F of ctx.figs) {
    F.mainBlob = F.blob && F.weight >= 0.3 && (F.region.fillInto > 0 || F.region.glyphLike || (F.part && !F.part.small && F.part.size >= 0.5 * maxSize));
  }
  // v6: row units (class C). Siblings (one group) always get the same number of rows, and so do the glyphs of
  // one text row; the union of both relations is the unit the row policy decides for.
  {
    const figs = ctx.figs, par = figs.map((_, i) => i);
    const find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
    const uni = (a, b) => { a = find(a); b = find(b); if (a !== b) par[Math.max(a, b)] = Math.min(a, b); };
    const byGroup = new Map(), byPart = new Map();
    figs.forEach((F, i) => {
      if (byGroup.has(F.group)) uni(i, byGroup.get(F.group)); else byGroup.set(F.group, i);
      const p = F.part;
      if (p && p.kind === 'text' && !p.small) { if (byPart.has(p)) uni(i, byPart.get(p)); else byPart.set(p, i); }
    });
    const units = new Map();
    figs.forEach((F, i) => { const r = find(i); if (!units.has(r)) units.set(r, { id: units.size, figs: [] }); F.unit = units.get(r); F.unit.figs.push(i); });
    for (const U of units.values()) {
      // typical half-width, weighted by ink (anti-aliasing rims in a text row must not set it)
      const hws = U.figs.map(i => [figs[i].region.width / 2, figs[i].area]).sort((a, b) => a[0] - b[0]);
      let tot = 0; for (const [, a] of hws) tot += a;
      let acc = 0; U.hw = hws[hws.length - 1][0];
      for (const [v, a] of hws) { acc += a; if (acc >= 0.5 * tot) { U.hw = v; break; } }
      U.maxDepth = Math.max(...U.figs.map(i => Math.max(figs[i].maxDepth || 0, figs[i].region.maxDepth || 0)));
      U.allBlob = U.figs.every(i => figs[i].blob);
      // v6.1: ink-weighted typical values of the unit's strokes, for the second-row cue (stroke weight relative to
      // the glyph or shape height, and stroke contrast)
      const wmed = vals => { const v = vals.slice().sort((a, b) => a[0] - b[0]); let t = 0; for (const [, a] of v) t += a; let acc = 0; for (const [x, a] of v) { acc += a; if (acc >= 0.5 * t) return x; } return v.length ? v[v.length - 1][0] : 0; };
      const nb = U.figs.filter(i => !figs[i].blob);
      const src = nb.length ? nb : U.figs;
      U.hwThick = wmed(src.map(i => [figs[i].hwThick, figs[i].area]));
      U.height = wmed(src.map(i => { const g = figs[i].region; const p = figs[i].part; return [p && p.kind === 'text' && !p.small ? p.h : Math.min(g.y1 - g.y0 + 1, g.x1 - g.x0 + 1) , figs[i].area]; }));
      U.fat = 2 * U.hwThick / Math.max(1, U.height);
      U.contrast = U.hwThick / Math.max(0.5, U.hw);
      U.ink = src.reduce((t, i) => t + figs[i].area, 0);
    }
    ctx.units = [...units.values()];
  }
  // v6: a figure with other figures inlaid in it (the letters of OREO on their blue ground)
  // has a filled draw mask: its centre row would run through the inlay, so it is always an outline. A glyph
  // whose only inlays are knocked out of it (its counters and slots, drawn in its colour) is not a container: in
  // the one-row regime they are cut out of its mask and its centre row runs around them (monoFigure)
  // (only a glyph of a text row has counters and slots; any other shape with inlays, the IKEA oval with its
  // knocked-out letters, is a container)
  for (const F of ctx.figs) {
    const glyph = F.part && F.part.kind === 'text';
    F.container = ctx.figs.some(G => G !== F && G.region.fillInto === F.rid && (!G.region.knockout || !glyph));
  }
}

// ---- v6: the drone budget band (DESIGN.md, "v6" and its amendment) ----------------------------------------
//
// v6.2: the count is the smallest at which the picture is as good as it gets within maxDrones, within a tolerance:
//   a. essential content at the coarsest spacing that passes the hard checks (verify.mjs: glyph topology,
//      counters, free ends, corners); it decides whether the content fits the band and is the clean start;
//   references: the content solved onto the cap in each representation (one row; one row plus the cue's second
//      rows for bold or high-contrast strokes; the two-row regime); the best by the depiction proxy sets the bar
//      Jref - KEEP_EPS, and every representation whose reference clears it qualifies;
//   descent: from each qualifying reference the spacing steps coarser while nothing a viewer would notice is lost
//      (keep.mjs coverage, lettering features, corners, arcs, noise, K_TEXT, the proxy bar); the fewest dots win;
//   d. secondary content (taglines, minor shapes, elements the cost-aware selection left out) at that spacing,
//      while it fits and is drawn cleanly; how much of it is kept scales with quality.
// A crest whose reference is noise in its centre has its dense fills drawn as their field outline (pattern.mjs).
// Then the clean-or-absent pass (v3/v4), the floor (only when the picture is still under minDrones), and
// opts.density / opts.adaptive respace the dots along the rows (buildAt), solved back into the band when needed.
// When (a) does not fit maxDrones, the references that are clean at the cap against (a) (cleanVs) are descended the
// same way; else a simplified version is tried (ornaments, then every unprotected element: select.mjs,
// simplifyForBudget; the name and the main figure of a crest are protected) and laddered inside the band. When even
// that is broken at maxDrones (a lost counter or stroke of the name, speckle, lost structure) the count overshoots
// to the smallest one at which it is clean (meta.budget.over), up to opts.hardMax, above which the spacing is solved
// onto hardMax regardless.
export const MIN_DRONES = 100, MAX_DRONES = 250;
export const BAND_PRICE = 0.02;
export const CAP_LOSS = 0.15, CAP_TOL = 3, GLYPH_TOL = 0, FID_KEEP = 0.6, SEC_FID = 0.75, ROW_GAP = 0.15;
// v6.1: what "drawn well" means (step b's stopping rule, see the ladder below)
//   K_TEXT     every essential line of lettering spans at least K_TEXT spacings over its typical glyph height
//              (lineBand Hx: the cap height of capitals, about the x-height of lowercase), times quality
//   CURV_WELL  at most this share of the curve length is under-sampled (sustained turn per dot over TURN_MAX,
//              or chord sag over SAG), divided by quality
//   TAU_WELL   the share of the reference structure still represented (scale.mjs: rows that stay apart,
//              counters that stay open, parts large enough to read), at spacing * quality
// and the second-row cue (step c): a unit gets its second row when cue * quality >= 1, cue = max(fat / FAT_TWO,
// contrast / CON_TWO), fat = thick-stroke width / glyph or shape height, contrast = thick / typical half-width
export const K_TEXT = 4.5, CURV_WELL = 0.03, TAU_WELL = 0.9, FAT_TWO = 0.25, CON_TWO = 5;
export const ROWS = ['auto', 'one', 'two'];
export const SPECKLE_GROW = 0.1, SPECKLE_MAX = 0.1;
// v6.2: the descent from the reference (see refDescent)
export const KEEP_COV = 0.85, KEEP_PREC = 0.85, KEEP_EPS = 0.03, KEEP_FAILS = 2, DESC = 1.06;
export const REP_NEAR = 1.1, REP_JGAIN = 0.02, REP_JKEEP = 0.01, NOISE_GROW = 0.03, NOISE_MAX = 0.1, KEEP_CORNERS = 2, KEEP_GLYPHS = 5;
const LADDER_STEP = Math.sqrt(DEPICT_STEP), LOOK_AHEAD = 3;
const QSTEP = 1.06; // v6.1: step of the coarsening walk for quality < 1

// v7: defaults of the two controls (the app reads them): see TRAJECTORY.md, "v7 (author's notes)"
// (DENSITY_MIN is only a guard against division by zero: every density from 0.03 up is honoured, see DENSITY_SAFE)
export const DEFAULT_QUALITY = 1.3, DEFAULT_DENSITY = 0.6, DENSITY_MIN = 0.002, DENSITY_MAX = 3;
// v9: contour mode. CONTOUR_DMIN: the sparsest line density a contour is drawn with; CONTOUR_INK: units with at least this
// share of the ink set the contour spacing (rows 'two' used a fifth: a word of seven letters set none)
export const CONTOUR_DMIN = 0.3, CONTOUR_INK = 0.03, CONTOUR_AREA = 0.01, CONTOUR_OVER = 2, CONTOUR_HARD = 3, CONTOUR_HAIR = 1, CONTOUR_THIN_P = 0.2;
// v10: budget flexibility on the ladder: over = the contour spacing may be chosen up to over * N, hard = the cap past which
// thin parts give way (strict / medium / flexible)
export const LADDER_FLEX = { strict: { over: 1, hard: 1.1 }, medium: { over: 1.5, hard: 1.5 }, flexible: { over: 3, hard: 3, fine: true, keepAll: true } };
// (auto = flexible: blind test 12.11. at N = 150, named of nameable: flexible 91 %, medium 80 %, strict 83 %, v9 91 %)
export const LADDER_FLEX_AUTO = 'flexible';
// (CONTOUR_HAIR: a stroke whose contour would need a spacing finer than s0, the finest the ladder starts from, is a hairline:
// an underline, the thin rings of a crest. It is drawn as a line; it has no width to outline)

// v7: the converter proper (v6.2's convert); `pre` = { seg, st } of this very image when already computed
export function convertCore(image, opts = {}, pre = null) {
  const quality = opts.quality ?? DEFAULT_QUALITY;
  globalThis.__v7q = quality; // (netOf reads it for the serif pruning; set per call, convert is synchronous)
  // v6.1: quality is the detail control. It no longer moves the hard checks, the clean minimum picture (step a),
  // the cost-aware selection or the overshoot test: those are judged at the reference QC = 1, so the row policy of
  // step a and the decision to go over the cap do not flip with the slider (v6: NVIDIA 103, 403, 162, 341 over
  // four steps). Quality acts on what is drawn on top of that: the second-row cue (cue * quality >= 1), how much
  // secondary content is kept (fidelity >= SEC_FID / quality), and finally the spacing of the chosen picture
  // (s / quality, see below the ladder).
  const QC = 1;
  // v6.1: line density (dots along a row, a multiplier at the same rows), rows per stroke
  // v7: density enters the budget solve. Every build of the ladder (step a, the references at the cap, the descent,
  // quality, the floor) spaces its dots along the rows at s / density (buildAt), so the counts the ladder solves and
  // compares are the counts of the final picture: at a lower density the same budget reaches a finer spacing s
  // (finer structure: second rows, small features, content kept), and the count drops only where the finer picture
  // gains nothing (the descent). v6.1 respaced the chosen picture afterwards; the saved dots went back to the floor.
  // opts.adaptive is accepted and ignored (v6.1 measured 7 % fewer dots and no visible difference).
  // v7 (amendment): every density is honoured; below DENSITY_SAFE the ladder decides content, rows and spacing at
  // DENSITY_SAFE (the floor included) and the chosen picture is then respaced at the requested density on the same
  // structure, without refilling it to minDrones (meta.budget.floorSkipped): the user's density wins over the floor
  const densityReq = +(opts.density ?? DEFAULT_DENSITY);
  const density = Number.isFinite(densityReq) && densityReq > 0 ? Math.max(DENSITY_MIN, Math.min(DENSITY_MAX, densityReq)) : DEFAULT_DENSITY;
  const ladderDensity = Math.max(density, DENSITY_SAFE);
  // v9: contour only (Marc, 12.11.2026: "Kontur mit weniger Liniendichte ist meilenweit besser als Mittellinie mit höherer
  // Liniendichte"). Every unit is drawn in two rows; the spacing never grows past the contour spacing sC (step a), and a
  // coarser spacing asked for by the ladder is bought with sparser dots along the same rows instead (see B). Below
  // CONTOUR_DMIN the rows stop reading as lines: the picture goes over N rather than thinner.
  const contour = opts.contour !== false && !opts.s;
  const flexLevel = (opts.flex ?? 'auto') === 'auto' ? LADDER_FLEX_AUTO : opts.flex;
  if (!LADDER_FLEX[flexLevel]) throw new Error('opts.flex must be one of auto, strict, medium, flexible');
  const LF = LADDER_FLEX[flexLevel];
  const rowsMode = contour ? 'two' : (opts.rows ?? 'auto');
  if (!ROWS.includes(rowsMode)) throw new Error(`opts.rows must be one of ${ROWS.join(', ')}`);
  const adaptive = false;
  const samp = ladderDensity !== 1 ? { density: ladderDensity, adaptive: false } : null;
  const sampReq = density !== 1 ? { density, adaptive: false } : null;
  const maxDrones = Math.max(1, Math.round(opts.maxDrones ?? MAX_DRONES));
  const minDrones = Math.max(0, Math.min(maxDrones, Math.round(opts.minDrones ?? MIN_DRONES)));
  const hardMax = Math.max(maxDrones, Math.round(opts.hardMax ?? 2 * maxDrones));
  const part = opts.part ?? 'auto';
  const fillMode = opts.fill ?? 'none';
  if (!(fillMode in FILL_MODES)) throw new Error(`opts.fill must be one of ${Object.keys(FILL_MODES).join(', ')}`);
  const seg = pre ? pre.seg : segment(image);
  const st = pre ? pre.st : structure(seg, { flat: !!opts._flat });
  const ctx = { seg, st, figs: st.figures, contour };
  const budget = { min: minDrones, max: maxDrones, wanted: 0, over: false, cleanAt: null };
  if (!ctx.figs.length) return { width: image.width, height: image.height, points: [], spacing: 1, meta: { n: 0, part: 'full', dropped: st.dropped, simplified: [], note: 'nothing to draw', budget } };
  const [lx0, ly0, lx1, ly1] = st.logoBox;
  const diag = Math.max(8, Math.hypot(lx1 - lx0, ly1 - ly0));
  prepWeights(ctx);
  ctx.sagMax = SAG * diag / QC;
  ctx.turnWell = TURN_MAX / QC; // v6.1: turn per dot above which a long arc counts as under-sampled
  const s0 = Math.max(3, diag / 160);
  const sMax = diag / 14; // coarsest spacing the ladder considers; only the hard limit may go coarser
  const outlineEngine = contour && opts.engine === 'outline';
  const refBuild = outlineEngine ? null : buildAt(ctx, s0);
  const A = outlineEngine ? null : analyseReference(ctx, refBuild);
  if (globalThis.__dbgA !== undefined) globalThis.__dbgA = { A, ctx, s0 };
  const parts = ctx.parts;
  const dropped = st.dropped.slice();
  const simplified = [];
  const all = new Set(ctx.figs.map((F, i) => i));
  const dropPart = (p, kind, act, log, reason) => {
    let n = 0;
    // the part itself, plus loose pieces lying inside its box (dots, accents, letters the row grouping missed)
    const m = 0.6 * p.h, my = 0.25 * p.h, keepers = new Set([...parts.mark, parts.wordmark].filter(Boolean));
    const inside = q => q !== p && !keepers.has(q) && q.x0 >= p.x0 - m && q.x1 <= p.x1 + m && q.y0 >= p.y0 - my && q.y1 <= p.y1 + my;
    const figInside = F => { const g = F.region; return g.x0 >= p.x0 - m && g.x1 <= p.x1 + m && g.y0 >= p.y0 - my && g.y1 <= p.y1 + my && g.area < 0.25 * p.w * p.h; };
    ctx.figs.forEach((F, i) => { if ((F.part === p || (F.part && inside(F.part)) || figInside(F)) && act.has(i)) { act.delete(i); n++; } });
    if (n) log.push({ kind, part: p.kind, box: [p.x0, p.y0, p.x1, p.y1], ...(reason ? { reason } : {}) });
    return n > 0;
  };
  const dropWordmark = (act, log) => { let any = false; for (const r of parts.rows) any = dropPart(r, r.small ? 'small print' : 'wordmark', act, log) || any; return any; };
  if (part === 'mark' && parts.hasMark) dropWordmark(all, dropped);
  // v10: contour only (outline.mjs). Nothing of the v5-v9 ladder runs: no rows regime, no step a, no simplification
  if (contour && opts.engine === 'outline') return outlineCore(image, ctx, all, { opts, maxDrones, minDrones, part, dropped, budget, diag, parts, densityReq: (opts.densityManual ?? opts.density != null) && opts.density != null ? density : null });

  // v6.1: lettering inlaid in a shape (IKEA in its oval, a name on a banner) is judged as lettering by the hard
  // checks, not only by its corners (the K of IKEA lost its stem in one row and no check saw it)
  {
    const lr = letterRows(ctx, new Set([...all].filter(i => !(ctx.figs[i].part && ctx.figs[i].part.kind === 'text'))));
    const mh = Math.max(0, ...lr.map(r => r.h));
    for (const r of lr) if (r.figs.length >= 3 && r.h >= 0.45 * mh) for (const i of r.figs) ctx.figs[i].inlaidLetter = true;
  }
  const REF = reference(ctx, refBuild, s0, sMax);
  if (globalThis.__dbgRef) globalThis.__dbgRef = REF;
  const others = parts.all.filter(p => !p.small);
  // essential: the Bildmarke, the wordmark and every text row of comparable size (a stacked wordmark)
  const essential = p => !p.small && (p === parts.wordmark || parts.mark.includes(p) || (!parts.wordmark && !parts.mark.length) || others.length === 1 || (p.kind === 'text' && parts.wordmark && p.h >= 0.6 * parts.wordmark.h));
  // content of step a (core): every part except small parts and minor text rows (taglines); only the essential
  // parts are held to the hard checks. Secondary content (small parts, minor rows) is spent on in step d.
  const essentialFig = fi => { const p = ctx.figs[fi].part; return !p || essential(p) || (!p.small && p.kind !== 'text'); };
  const protectedFig = fi => { const p = ctx.figs[fi].part; return !!(p && p.kind === 'text' && essential(p)); };
  // v4 (point 4b): cost-aware content selection, always; what it leaves out may come back in step d
  let selDrop = [];
  // (flexible keeps every element: the cost-aware selection left out Docusaurus' teeth, eye and nose, Marc 12.11.)
  if (opts.select !== false && !LF.keepAll) {
    const cover = coverLadder(A, s0, sMax, QC);
    const sel = costAwareSelection(ctx, A, cover, all, protectedFig, QC);
    if (sel.drop.length) { selDrop = sel.drop; dropped.push(...sel.records); }
  }
  let selSet = new Set(selDrop);
  // v6.2: a Bildmarke of many small pieces (UNICEF's globe with its laurel) that the selection would take apart, half
  // of its pieces or more, is drawn as its field: the outline of the area it covers (pattern.mjs), at the spacing
  // the full picture would need for maxDrones
  if (parts.wordmark) for (const m of parts.mark) {
    const mf = [...all].filter(fi => ctx.figs[fi].part === m);
    const gone = mf.filter(fi => selSet.has(fi));
    if (mf.length < PAT_MIN || gone.length < 0.5 * mf.length) continue;
    let nRef = 0; for (const p of refBuild.pts) if (all.has(p.fi)) nRef++;
    const sEst = Math.max(s0, s0 * nRef / maxDrones);
    const idx = ctx.figs.length, F = fieldFigure(ctx, mf, sEst);
    F.unit = { id: 1e6 + idx, figs: [idx], hw: F.group.hw, maxDepth: F.maxDepth, allBlob: true, hwThick: F.hwThick, height: F.partMin, fat: 0, contrast: 1, ink: F.area };
    ctx.figs.push(F); REF.figs[idx] = { holes: [], ends: [], ink: [] };
    for (const fi of mf) all.delete(fi);
    all.add(idx);
    selDrop = selDrop.filter(fi => !mf.includes(fi)); selSet = new Set(selDrop);
    simplified.push({ kind: 'Bildmarke drawn as its field outline', figures: mf.length, stage: 'pattern' });
  }
  let core = new Set([...all].filter(fi => essentialFig(fi) && !selSet.has(fi)));
  let secondary = [...all].filter(fi => !core.has(fi) && !selSet.has(fi));
  if (!core.size) { core = new Set([...all].filter(fi => !selSet.has(fi))); secondary = []; }
  if (!core.size) { core = new Set(all); selDrop = []; }

  // builds, cached by spacing, content and row policy (content sets are never mutated after first use)
  const keys = new WeakMap();
  const keyOf = set => { if (set === null) return 'N'; if (!keys.has(set)) keys.set(set, [...set].sort((a, b) => a - b).join(',') + (set.force ? 'f' + [...set.force].sort((a, b) => a - b).join(',') : '')); return keys.get(set); };
  const cache = new Map();
  let nBuilds = 0;
  let sC = Infinity;
  const B = (s, act, two, sp = samp) => {
    if (contour && s > sC * 1.0001) { const d = (sp ? sp.density : 1) * sC / s; sp = { density: Math.max(CONTOUR_DMIN, d), adaptive: false }; s = sC; }
    const k = s.toFixed(4) + '|' + keyOf(act) + '|' + keyOf(two) + (sp ? `|${sp.density}${sp.adaptive ? 'a' : ''}` : '');
    if (!cache.has(k)) { cache.set(k, buildAt(ctx, s, act, two, sp)); nBuilds++; }
    return cache.get(k);
  };
  const NONE = new Set(), ALL = new Set(ctx.units.map(U => U.id));
  // (rows 'two': every unit in the two-row regime, forced: no class-C raise)
  const ALLF = new Set(ALL); ALLF.force = new Set(ALL);

  // hard checks (classes A, B) per part on a build, and the failure score of the essential parts
  const CORNER_LOSS = 0.25;
  const judge = (b0, act) => {
    const b = b0.plain || b0; // (v7: structure is judged on the plain sampling)
    b._judge ??= new Map();
    const k = keyOf(act);
    if (b._judge.has(k)) return b._judge.get(k);
    const v = verify(ctx, REF, b, act);
    // v6: a figure thinner than half a spacing that has no dot of its own (an anti-aliasing rim along a letter,
    // a hairline whose dots merged into the neighbouring row) is drawn by its neighbour: its features are not
    // judged
    b._own ??= (() => { const m = new Set(); for (const p of b.pts) m.add(p.fi); return m; })();
    // v6 (class A, topology): a figure is one connected region, so drawn in one row (a centre line) its dots form
    // one chain the eye links (gaps up to 1.6 s, eval/proxy LINK). A glyph whose thin hairline vanished at this
    // spacing (the arch of a serif n: "n" read as "ll") falls apart into pieces; each extra piece of 3 or more
    // dots counts as a broken feature. Outline drawings are exempt (outer and counter loops are separate rows).
    const split = new Map();
    {
      const byFig = new Map();
      for (const p of b.pts) { if (!byFig.has(p.fi)) byFig.set(p.fi, []); byFig.get(p.fi).push(p); }
      const L = 1.6 * b.s * (b.alongMax || 1);
      for (const [fi, P] of byFig) {
        const F = ctx.figs[fi];
        if (P.length < 6 || F.blob || F.container || b.two === null || b.two.has(F.unit.id)) continue;
        const par = P.map((_, i) => i), find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
        for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) if (Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y) <= L) { const a = find(i), c = find(j); if (a !== c) par[a] = c; }
        const size = new Map(); for (let i = 0; i < P.length; i++) { const r = find(i); size.set(r, (size.get(r) || 0) + 1); }
        const pieces = [...size.values()].filter(n => n >= 3).length;
        if (pieces > 1) split.set(fi, pieces - 1);
      }
    }
    const agg = new Map();
    for (const [fi, r0] of v) {
      const F = ctx.figs[fi], p = F.part;
      if (!p) continue;
      if (!b._own.has(fi) && F.region.width < 0.5 * b.s) continue;
      const r = split.has(fi) ? { ...r0, strokes: r0.strokes + split.get(fi) } : r0;
      if (!agg.has(p)) agg.set(p, { glyph: 0, hard: 0, cLost: 0, cTot: 0, cornerFail: false });
      const a = agg.get(p);
      const glyphLike = p.kind === 'text' || F.region.glyphLike || F.inlaidLetter;
      const bad = r.holes + r.ends + r.strokes + (glyphLike && r.sLost >= 2 ? 1 : 0);
      if (glyphLike) { a.glyph += bad; a.hard += bad - r.ends - r.holes; }
      else if (bad && r.feat >= 2 && bad > (CORNER_LOSS / QC) * r.feat) a.cornerFail = true;
      a.cLost += r.cLost; a.cTot += r.cTot;
      if (!glyphLike && r.cLost >= 2 && r.cLost > (CORNER_LOSS / QC) * r.cTot) a.cornerFail = true;
    }
    const fails = [];
    for (const [p, a] of agg) {
      const corner = a.cornerFail || (p.kind === 'text' && a.cLost >= 2 && a.cLost > (CORNER_LOSS / QC) * a.cTot);
      if (a.glyph > 0 || corner) fails.push({ p, glyph: a.glyph > 0, corner, a });
    }
    const out = { fails, v };
    b._judge.set(k, out);
    return out;
  };
  const escore = (b, act) => judge(b, act).fails.filter(f => essential(f.p)).reduce((t, f) => t + f.a.glyph + (f.corner ? 1 + f.a.cLost : 0), 0);
  const gscore = (b, act) => judge(b, act).fails.filter(f => essential(f.p)).reduce((t, f) => t + f.a.glyph, 0);
  // v6.1: a lost stroke (t to l) is the letter-changing loss: one per HARD_PER glyphs of the essential lettering
  // at most, none in a word of up to four letters. A shrunken counter or a missed free end (a serif tip) reads
  // as the same letter: 1 + one per END_PER glyphs
  const hscore = (b, act) => judge(b, act).fails.filter(f => essential(f.p)).reduce((t, f) => t + f.a.hard, 0);
  const END_PER = 3, HARD_PER = 5;
  const nGlyphs = parts.rows.filter(p => !p.small && essential(p)).reduce((t, p) => t + p.members.filter(m => Math.min(m.w, m.h) > 2 && m.h >= 0.35 * p.h).length, 0)
    + ctx.figs.filter(F => F.inlaidLetter).length;
  // (a long name keeps reading when one of eight letters loses a small counter: Rossmann at the cap)
  const textOk = (b, ref, act) => hscore(b, act) <= hscore(ref, act) + Math.floor(nGlyphs / HARD_PER) && gscore(b, act) <= gscore(ref, act) + 1 + Math.floor(nGlyphs / END_PER);
  const textFails = (b, act) => judge(b, act).fails.some(f => essential(f.p) && f.p.kind === 'text' && f.glyph);
  const inlaidFails = (b, act) => [...judge(b, act).v].some(([fi, r]) => {
    const F = ctx.figs[fi];
    const c = F.region.fillInto > 0 ? st.regions[F.region.fillInto] : null;
    return F.part && F.part.kind !== 'text' && essential(F.part) && F.region.glyphLike && !F.region.inlayRow && c && F.area >= 0.1 * c.fillArea && r.holes + r.ends + r.strokes + (r.sLost >= 2 ? 1 : 0) > 0;
  });

  // the value of a picture (step b, and the gate of the clean-or-absent pass)
  let target = null;
  const useDepict = opts.depict !== false;
  const price = BAND_PRICE / QC;
  // (v7: judged on the plain sampling too: the representation and the descent are decided on the structure, the
  // density only changes what a row costs)
  const scoreOf = b0 => {
    const b = b0.plain || b0;
    if (b._score === undefined) {
      target ??= depictTarget(image);
      b._score = b.pts.length ? depiction(target, { points: b.pts.map(p => ({ x: p.x, y: p.y, ...pointColour(ctx, p) })) }).score : 0;
    }
    return b._score;
  };
  const J = b => b.pts.length ? namingProbability(scoreOf(b)) - price * Math.log2(Math.max(1, b.pts.length / Math.max(1, minDrones))) : -Infinity;

  // (v7: below density 1 the rows are sparser than s, so the structure may be traced finer: a thin line at density 0.35
  // needs s = 1.4 px for its 100 dots)
  const sFloor = ladderDensity < 1 ? Math.max(1, 0.5 * s0 * ladderDensity) : Math.max(1.5, 0.5 * s0);
  const solve = (tgt, act, two, start, sHi = sMax * 3, lo, sp = samp) => solveSpacing(s => B(s, act, two, sp), { target: tgt, lo: lo ?? Math.floor(0.97 * tgt), sMin: sFloor, sMax: sHi, start });

  // step a: coarsest spacing at which the essential parts pass the hard checks (v5 heuristics, row policy given)
  // (v7: the count limits of the search are in plain dots, so step a is the same structure at every density: at a low
  // density it would otherwise search finer, and its cleaner picture raised the bar for the over-budget path)
  const nP = b => (b.plain || b).pts.length;
  const coarsest = (act, two0) => {
    let two = two0;
    const isTwo = F => two === null || two.has(F.unit.id);
    let { s } = searchScale(A, s0, sMax, QC, act);
    let nRef = 0; for (const p of refBuild.pts) if (act.has(p.fi)) nRef++;
    s = Math.max(s, Math.min(sMax, s0 * nRef / (2 * hardMax)));
    for (const [i, F] of ctx.figs.entries()) if (act.has(i) && isTwo(F) && F.contrastCap && F.weight >= 0.3 && F.contrastCap / QC > s0 * 1.05) s = Math.min(s, F.contrastCap / QC);
    for (const [i, F] of ctx.figs.entries()) if (act.has(i) && F.mainBlob) { const cap = F.perim / BLOB_DOTS; if (cap > s0 * 1.05) s = Math.min(s, cap); }
    let b = B(s, act, two);
    for (let it = 0; it < 6 && curvShare(b) > (1 - TAU) / QC && s > s0 * 1.2; it++) { s /= 1.15; b = B(s, act, two); }
    const tried = [b];
    let sc = escore(b, act), best = { s, b, sc, two }, failS = null, stale = 0;
    let patience = inlaidFails(b, act) ? 4 : 2;
    for (let it = 0; it < 9 && sc > 0 && s > s0 * 1.1 && nP(b) * 1.25 <= hardMax && stale < patience; it++) {
      failS = s; s = Math.max(s0, s / 1.25); b = B(s, act, two); sc = escore(b, act); tried.push(b);
      if (sc === 0 || sc <= 0.6 * best.sc || (patience > 2 && sc <= best.sc)) { best = { s, b, sc, two }; stale = 0; } else stale++;
      if (patience === 2 && inlaidFails(b, act)) patience = 4;
    }
    // v3 (Unity) / v6: corners of a thick stroke drawn as a centreline are lost at every centreline spacing.
    // Give the failing shapes their second row (and, if their stroke is too thin for two rows at this spacing,
    // the spacing at which it is not).
    if (best.sc > 0) {
      const fp = new Set(judge(best.b, act).fails.filter(f => essential(f.p) && f.corner && f.p.kind !== 'text').map(f => f.p));
      const us = new Set(); let sOut = Infinity;
      for (const i of act) { const F = ctx.figs[i]; if (fp.has(F.part) && !F.blob) { us.add(F.unit.id); if (F.group && F.group.hw < (INSET + 0.5 * ROW_SEP) * best.s) sOut = Math.min(sOut, 0.85 * F.group.hw / (INSET + 0.5 * ROW_SEP)); } }
      const two2 = best.two === null ? null : new Set([...best.two, ...us]);
      const t = sOut < best.s && sOut > s0 * 1.05 ? sOut : best.s;
      if (us.size && (t !== best.s || keyOf(two2) !== keyOf(best.two)) && nP(best.b) * (best.s / t) * 1.4 <= hardMax) {
        const bo = B(t, act, two2), so = escore(bo, act);
        if (so < best.sc) best = { s: t, b: bo, sc: so, two: two2 };
      }
    }
    two = best.two;
    // v4 (point 4b): a text row is legible or dropped; take the coarsest tried spacing at which the essential
    // lettering is clean, or step on for the lettering alone
    if (best.sc > 0 && textFails(best.b, act)) {
      let ok = tried.filter(t => t.s < best.s && nP(t) <= hardMax && nP(t) <= 1.6 * nP(best.b) && !textFails(t, act) && keyOf(two) === keyOf(two0)).sort((x, y) => y.s - x.s)[0];
      if (!ok) {
        let t = Math.min(...tried.map(x => x.s));
        for (let it = 0; it < 2 && !ok && t > s0 * 1.1; it++) {
          t = Math.max(s0, t / 1.25);
          const bt = B(t, act, two);
          if (nP(bt) > hardMax || nP(bt) > 1.6 * nP(best.b)) break;
          if (!textFails(bt, act)) ok = bt;
        }
      }
      if (ok) best = { s: ok.s, b: ok, sc: escore(ok, act), two };
    }
    if (best.sc === 0 && failS && failS > best.s) {
      const bm = B(Math.min(Math.sqrt(best.s * failS), best.s * 1.12), act, two);
      if (escore(bm, act) === 0) best = { s: bm.s, b: bm, sc: 0, two };
    }
    for (let it = 0; it < 6 && nP(best.b) < MIN_POINTS && best.s > s0 * 1.05; it++) { const t = Math.max(s0, best.s * nP(best.b) / (MIN_POINTS * 1.15)); const bt = B(t, act, two); best = { s: t, b: bt, sc: escore(bt, act), two }; }
    return best;
  };

  // v6.1 (step b of v6.1, now a bound of the v6.2 descent): every essential line of lettering (and the main lettering
  // inside a shape or a crest, select.mjs letterRows) spans K_TEXT spacings over its typical glyph height
  const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
  const textNeed = act => {
    let t = Infinity, why = null;
    for (const p of parts.rows) {
      if (p.small || !essential(p) || !ctx.figs.some((F, i) => act.has(i) && F.part === p)) continue;
      const L = lineBand(p.members.filter(m => Math.min(m.w, m.h) > 2));
      const h = L ? L.Hx : med(p.members.map(m => m.h));
      if (h / (K_TEXT * QC) < t) { t = h / (K_TEXT * QC); why = 'lettering'; }
    }
    // the main lettering of a shape (a name inlaid in a container or on a crest)
    const lr = letterRows(ctx, new Set([...act].filter(i => !(ctx.figs[i].part && ctx.figs[i].part.kind === 'text'))));
    const maxH = Math.max(0, ...lr.map(r => r.h));
    for (const r of lr) if (r.h >= 0.6 * maxH && r.figs.length >= 3 && r.h / (K_TEXT * QC) < t) { t = r.h / (K_TEXT * QC); why = 'inlaid lettering'; }
    return { s: t, why };
  };
  // v6.1 (step c of v6.1, now the 'cue' representation of v6.2): a unit (sibling group or text row) gets its second
  // row when its strokes are heavy for their size (fat: a bold face, a fat M) or of strong contrast (Didone stems
  // beside hairlines), weighed by quality: cue(U) * quality >= 1; its strokes hold two rows 1.5 s apart only at
  // s <= hwThick / (INSET + ROW_SEP / 2).
  const D2F = INSET + 0.5 * ROW_SEP;
  const essentialUnit = (U, act) => U.figs.some(i => act.has(i) && essentialFig(i));
  const cue = U => U.allBlob ? 0 : Math.max(U.fat / FAT_TWO, U.contrast / CON_TWO);
  // step d: secondary content, while it fits
  const addSecondary = (cur, act) => {
    const sec = secondary.filter(fi => !act.has(fi));
    if (!sec.length) return { best: cur, act, capN: null, added: 0 };
    // drawn cleanly or absent: a secondary part that fails its hard checks at this spacing goes whole
    const clean = (act2, b) => {
      const bad = new Set(judge(b, act2).fails.filter(f => !essential(f.p) && (f.glyph || f.corner)).map(f => f.p));
      if (!bad.size) return { act: act2, b };
      const a3 = new Set([...act2].filter(i => !bad.has(ctx.figs[i].part)));
      for (const p of bad) dropped.push({ kind: p.small ? 'small print' : p.kind === 'text' ? 'illegible text' : 'illegible shape', part: p.kind, box: [p.x0, p.y0, p.x1, p.y1], reason: `broken at s=${cur.s.toFixed(1)}` });
      return { act: a3, b: B(cur.s, a3, cur.two) };
    };
    // only parts that can be drawn at this spacing: the reference structure of the part must survive (scale.mjs)
    const byP = new Map();
    for (const fi of sec) { const p = ctx.figs[fi].part; if (!byP.has(p)) byP.set(p, []); byP.get(p).push(fi); }
    const drawable = [];
    for (const [p, figs] of byP) {
      const f = predictedFidelity(A, cur.s * QC, new Set(figs));
      if (f >= Math.min(0.98, SEC_FID / quality)) drawable.push(...figs); // (v6.1: quality decides how much secondary content is kept)
      else if (p) dropped.push({ kind: p.small ? 'small print' : p.kind === 'text' ? 'illegible text' : 'illegible shape', part: p.kind, box: [p.x0, p.y0, p.x1, p.y1], reason: `not drawable at s=${cur.s.toFixed(1)} (fidelity ${f.toFixed(2)})` });
    }
    sec.splice(0, sec.length, ...drawable);
    if (!sec.length) return { best: cur, act, capN: null, added: 0 };
    const act2 = new Set([...act, ...sec]);
    const b = B(cur.s, act2, cur.two);
    // (added counts the secondary figures that actually draw dots at this spacing)
    const drawn = bb => { const m = new Set(); for (const p of bb.pts) m.add(p.fi); return sec.filter(fi => m.has(fi)).length; };
    if (b.pts.length <= maxDrones) { const c = clean(act2, b); return { best: { ...cur, b: c.b }, act: c.act, capN: null, added: drawn(c.b) }; }
    // too much at once: by part, largest first, a few tries
    const byPart = new Map();
    for (const fi of sec) { const p = ctx.figs[fi].part; if (!byPart.has(p)) byPart.set(p, []); byPart.get(p).push(fi); }
    let best = cur, cact = act, added = 0, tries = 0;
    for (const [, figs] of [...byPart].sort((x, y) => (y[0] ? y[0].size : 0) - (x[0] ? x[0].size : 0))) {
      if (tries++ >= 3) break;
      const a2 = new Set([...cact, ...figs]);
      const bt = B(cur.s, a2, cur.two);
      if (bt.pts.length <= maxDrones) { const c = clean(a2, bt); if (c.act.size > cact.size) { best = { ...best, b: c.b }; cact = c.act; } }
    }
    return { best, act: cact, capN: b.pts.length, added: drawn(best.b) };
  };
  // clean or absent (v3/v4): broken non-essential parts and broken small details go, gated by J
  const cleanParts = (b, act, log) => {
    const act2 = new Set(act); let any = false;
    for (const f of judge(b, act).fails) {
      if (essential(f.p) && f.p.kind === 'text' && f.p !== parts.wordmark && f.glyph && parts.hasMark && part !== 'full' && f.a.glyph >= Math.max(2, 0.3 * f.p.members.length) && [...act2].some(i => ctx.figs[i].part && ctx.figs[i].part !== f.p && ctx.figs[i].part.kind !== 'text')) { if (dropPart(f.p, 'illegible text', act2, log, `${f.a.glyph} broken glyph features at s=${b.s.toFixed(1)}`)) any = true; continue; }
      if (essential(f.p)) continue;
      if (!f.glyph && !f.p.small) continue;
      const rest = [...act2].filter(i => ctx.figs[i].part !== f.p).length;
      if (rest > 0 && (f.glyph || f.a.cLost > 0.5 * f.a.cTot)) any = dropPart(f.p, f.p.small ? 'small print' : f.p.kind === 'text' ? 'illegible text' : 'illegible shape', act2, log) || any;
    }
    return any ? act2 : null;
  };
  const cleanDetails = (b0, act, log) => {
    const b = b0.plain || b0, s = b.s, v = judge(b, act).v;
    const dots = new Map(); for (const p of b.pts) dots.set(p.fi, (dots.get(p.fi) || 0) + 1);
    const DETAIL_DIAG = 10, DETAIL_SHARE = 0.8;
    const small = fi => { const F = ctx.figs[fi], g = F.region; return !(F.part && F.part.kind === 'text' && !F.part.small) && Math.hypot(g.x1 - g.x0 + 1, g.y1 - g.y0 + 1) <= DETAIL_DIAG * s; };
    const broken = fi => { const r = v.get(fi), n = dots.get(fi) || 0, F = ctx.figs[fi], g = F.region; if (!r) return false; return r.holes + r.ends + r.strokes > 0 || (r.feat > 0 && n < 4 && Math.hypot(g.x1 - g.x0 + 1, g.y1 - g.y0 + 1) >= 2.5 * s); };
    const vis = [...act].filter(fi => small(fi) && dots.get(fi));
    const par = new Map(vis.map(fi => [fi, fi]));
    const find = x => { while (par.get(x) !== x) { par.set(x, par.get(par.get(x))); x = par.get(x); } return x; };
    for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) {
      const P = ctx.figs[vis[i]], Q = ctx.figs[vis[j]];
      if (P.group !== Q.group) continue;
      const a = P.region, c = Q.region, gx = Math.max(a.x0 - c.x1, c.x0 - a.x1, 0), gy = Math.max(a.y0 - c.y1, c.y0 - a.y1, 0);
      if (Math.hypot(gx, gy) <= 1.5 * s) { const ra = find(vis[i]), rb = find(vis[j]); if (ra !== rb) par.set(ra, rb); }
    }
    const groups = new Map();
    for (const fi of vis) { const G = find(fi); if (!groups.has(G)) groups.set(G, []); groups.get(G).push(fi); }
    const drop = [];
    for (const list of groups.values()) {
      const bad = list.filter(broken);
      if (list.length >= 3 ? bad.length > DETAIL_SHARE * list.length : bad.length) drop.push(...(list.length >= 3 ? list : bad));
    }
    const ds = new Set(drop);
    let kept = 0; for (const p of b.pts) if (!ds.has(p.fi)) kept++;
    if (!drop.length || kept < MIN_POINTS) return null;
    log.push({ kind: 'illegible detail', figures: drop.length });
    return new Set([...act].filter(fi => !ds.has(fi)));
  };
  const cleanup = pic => {
    let cur = pic;
    for (const step of [cleanParts, cleanDetails]) {
      const log = [];
      const act2 = step(cur.b, cur.act, log);
      if (!act2) continue;
      const b1 = B(cur.b.s, act2, cur.two);
      // (never more dots than before: a removed figure no longer absorbs its neighbours' dots in the conflict pass)
      if (b1.pts.length && b1.pts.length <= cur.b.pts.length && (!useDepict || J(b1) > J(cur.b))) { cur = { ...cur, b: b1, act: act2 }; dropped.push(...log); }
    }
    return cur;
  };

  // ---- the ladder ----
  const ladder = { steps: [] };
  const failText = (b, act) => judge(b, act).fails.filter(f => essential(f.p)).map(f => `${f.p.kind}@${f.p.x0},${f.p.y0}:g${f.a.glyph}${f.corner ? ` c${f.a.cLost}/${f.a.cTot}` : ''}`).join(' ');
  const record = (step, pic, extra = {}) => (globalThis.__dbgSteps && globalThis.__dbgSteps.push({ step, b: pic.b, colour: p => pointColour(ctx, p) }), ladder.steps.push({ step, s: +pic.b.s.toFixed(2), n: pic.b.pts.length, ...extra, ...(opts.debug && pic.act ? { fails: failText(pic.b, pic.act), fid: +predictedFidelity(A, pic.b.s * QC, pic.act).toFixed(3), J: +namingProbability(scoreOf(pic.b)).toFixed(3), sc: escore(pic.b, pic.act) } : {}) }));
  let wanted = 0;
  // clean at the cap (the over-budget path and the references there)
  // (CAP_TOL: two or three lost features (a short end, a rounded corner, a shrunken counter) do not break a picture; checked by eye on Rossmann, React, PhpStorm, Harvard)
  // (FID_KEEP: the share of the reference structure still represented (scale.mjs) must not fall below 80 % of
  // what the clean spacing keeps: a crest coarsened onto the cap loses 25-40 % of it and turns to speckle,
  // a word or a plain mark coarsened onto the cap loses under 5 % (Porsche 0.67, AC Milan 0.61, West Ham 0.75
  // against Rossmann 0.97, AdRoll 0.99; Salesforce, 0.71, looked fine at the cap and now overshoots); lost
  // glyph features (GLYPH_TOL) are held tighter than rounded corners, lettering being the strongest cue)
  const fid = (b, act) => predictedFidelity(A, b.s * QC, act);
  // v6.1: never speckle: a capped crest whose inner figures each keep only a few dots reads as noise. The
  // speckle share is the share of dots on figures drawn with at most 4 dots that are not single dots by
  // design (larger than 2.5 s); it may grow by at most SPECKLE_GROW against the clean picture
  const speckle = b0 => {
    const b = b0.plain || b0;
    if (b._speck !== undefined) return b._speck;
    const n = new Map(); for (const p of b.pts) n.set(p.fi, (n.get(p.fi) || 0) + 1);
    let sp = 0; for (const [fi, k] of n) { const g = ctx.figs[fi].region; if (k <= 4 && Math.hypot(g.x1 - g.x0 + 1, g.y1 - g.y0 + 1) > 2.5 * b.s) sp += k; }
    return (b._speck = b.pts.length ? sp / b.pts.length : 0);
  };
  // v6.1: the capped picture is broken only when that is visible: a letter of the name changes (textOk), it
  // turns to speckle, or a large part of the structure goes (strokes merging, counters closing: predicted
  // fidelity under FID_KEEP of the clean picture's), or the depiction proxy drops by more than CAP_LOSS.
  // Rounded corners and missed serif tips (v6: CAP_TOL, a fidelity ratio of 0.8, a proxy drop of 0.08) are
  // not worth an overshoot (Henkel, Salesforce, Rossmann, Angular went over the cap for them)
  const cleanVs = (c, from) => !!c && textOk(c.b, from.b, c.act) && fid(c.b, c.act) >= FID_KEEP * fid(from.b, c.act)
    && speckle(c.b) <= speckle(from.b) + SPECKLE_GROW
    // (v6.2: no noise either: dots in short pieces or crowded anchors inside a frame over NOISE_MAX of the picture,
    // pattern.mjs; a crest the cap can only draw as noise goes to the simplification and the overshoot instead)
    && framed(c.b, c.act).share <= Math.max(NOISE_MAX, framed(from.b, c.act).share + NOISE_GROW)
    && (!useDepict || namingProbability(scoreOf(c.b)) >= namingProbability(scoreOf(from.b)) - CAP_LOSS);

  let essentialPic = null; // (step a with the row fallback; set below the ladder functions)
  // ---- v6.2: dense fills of crests as their field (pattern.mjs) ---------------------------------------------
  // A crest whose inner figures the band can only draw as noise (Bayern's lozenges, Eintracht's feathers, the
  // stripes of a shield) is simplified: each noisy cluster inside the crest's frame becomes the outline of the area
  // it covers, in its colour; figures lying inside that area go with it. Only clusters enclosed by a larger figure
  // that is itself drawn cleanly (a frame, a ring, a shield) and never lettering: the striped letters of IBM are
  // short bars by design.
  const isTextFig = fi => { const F = ctx.figs[fi], p = F.part; return !!(p && p.kind === 'text' && !p.small) || !!F.inlaidLetter; };
  const noise = (b0, act) => { const b = b0.plain || b0; b._noise ??= new Map(); const k = keyOf(act); if (!b._noise.has(k)) b._noise.set(k, noiseOf(ctx, b, act, isTextFig)); return b._noise.get(k); };
  const patternCache = new Map();
  const insideShare = (G, F) => {
    let n = 0, k = 0;
    for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) {
      if (!G.mask[y * G.w + x]) continue;
      n++;
      const X = x + G.x0 - F.x0, Y = y + G.y0 - F.y0;
      if (X >= 0 && Y >= 0 && X < F.w && Y < F.h && F.mask[Y * F.w + X]) k++;
    }
    return n ? k / n : 0;
  };
  const box = cl => { const q = [Infinity, Infinity, -Infinity, -Infinity]; for (const fi of cl) { const g = ctx.figs[fi].region; q[0] = Math.min(q[0], g.x0); q[1] = Math.min(q[1], g.y0); q[2] = Math.max(q[2], g.x1); q[3] = Math.max(q[3], g.y1); } return q; };
  // noisy clusters enclosed by a larger figure that is drawn cleanly (a crest's frame), and their share of the dots
  const framed = (b0, act) => {
    const b = b0.plain || b0;
    b._framed ??= new Map(); const key = keyOf(act);
    if (b._framed.has(key)) return b._framed.get(key);
    const nz = noise(b, act), m = b.s;
    let out = { cls: [], share: 0, nz };
    if (nz.share >= Math.min(PAT_SHARE, NOISE_MAX)) {
      const enclosed = cl => { const q = box(cl); return [...act].some(fi => { if (cl.includes(fi) || nz.figs.has(fi) || isTextFig(fi)) return false; const g = ctx.figs[fi].region; return g.x0 <= q[0] + m && g.y0 <= q[1] + m && g.x1 >= q[2] - m && g.y1 >= q[3] - m && (g.x1 - g.x0) * (g.y1 - g.y0) >= 1.2 * (q[2] - q[0]) * (q[3] - q[1]); }); };
      const cls = noiseClusters(ctx, b, nz).filter(enclosed);
      let k = 0; for (const cl of cls) for (const fi of cl) k += nz.figs.get(fi) || 0;
      out = { cls, share: b.pts.length ? k / b.pts.length : 0, nz };
    }
    b._framed.set(key, out);
    return out;
  };
  const patternize = (b, act) => {
    const { cls, share, nz } = framed(b, act);
    if (share < PAT_SHARE) return null;
    const act2 = new Set(act), records = [];
    for (const cl0 of cls) {
      // the ground the noisy pieces sit on (the white disc under Bayern's lozenges) is part of the field when it is
      // not much larger than the cluster; the field keeps the colour of the pieces
      const q = box(cl0), qa = (q[2] - q[0] + 1) * (q[3] - q[1] + 1);
      const grounds = new Set(cl0.map(fi => ctx.figs[fi].region.fillInto).filter(r => r > 0));
      const cl = cl0.slice();
      for (const fi of act) { const G = ctx.figs[fi]; if (!cl.includes(fi) && grounds.has(G.rid) && !isTextFig(fi) && (G.region.x1 - G.region.x0 + 1) * (G.region.y1 - G.region.y0 + 1) <= 1.6 * qa) cl.push(fi); }
      const key = cl.slice().sort((x, y) => x - y).join(',');
      let idx = patternCache.get(key);
      if (idx === undefined) {
        idx = ctx.figs.length;
        const F = fieldFigure(ctx, cl, b.s, cl0.filter(fi => nz.figs.has(fi)));
        // (a unit of its own, outside ctx.units: a blob is an outline in every row policy)
        F.unit = { id: 1e6 + idx, figs: [idx], hw: F.group.hw, maxDepth: F.maxDepth, allBlob: true, hwThick: F.hwThick, height: F.partMin, fat: 0, contrast: 1, ink: F.area };
        ctx.figs.push(F); REF.figs[idx] = { holes: [], ends: [], ink: [] }; patternCache.set(key, idx);
      }
      const F = ctx.figs[idx];
      let gone = cl.length;
      for (const fi of cl) act2.delete(fi);
      // figures lying inside the field (knock-outs, details of the pattern) go with it
      for (const fi of [...act2]) { const G = ctx.figs[fi]; if (G.field || isTextFig(fi)) continue; if (insideShare(G, F) >= 0.8) { act2.delete(fi); gone++; } }
      act2.add(idx);
      records.push({ kind: 'dense fill drawn as its field outline', figures: gone, stage: 'pattern' });
    }
    return { act: act2, records };
  };

  // ---- v6.2: references and descent ---------------------------------------------------------------------
  // The count is the smallest one at which the picture is as good as it gets within maxDrones, within a
  // tolerance. Each representation (rows per stroke) has its reference: the content of step a solved onto the
  // cap, (1) every stroke one centre row, (2) one row plus the second rows of the cue (step c: units bold for
  // their size or of strong contrast), (3) the two-row regime (two rows wherever the stroke holds them at s).
  // The best of them by the depiction proxy sets the bar; a representation qualifies when its reference is within
  // KEEP_EPS of it. From each qualifying reference R the spacing steps coarser (a
  // fixed grid relative to the logo, DESC per step; same content, same rows) as long as nothing a viewer would
  // notice is lost (keeps): R's dots stay covered by the coarser picture's links (keep.mjs: no large share of
  // rows, no figure lost), no new lost glyph feature or corner, long arcs keep their dots, lettering keeps
  // K_TEXT spacings, and the proxy stays within KEEP_EPS of R. The descent ends after KEEP_FAILS failing steps in a
  // row (one failing step between passing ones is noise of the raster) and returns the last passing picture;
  // reaching minDrones without a loss, R's rows are solved onto the floor. Of the descended pictures the one with
  // the fewest dots is taken; one within REP_NEAR of that count wins when the proxy rates it REP_JGAIN higher.
  // So the representation is chosen by picture quality (a medium-weight wordmark that reads as well in one row,
  // Netlify, goes to one row; a bold one, HARIBO, keeps its outlines), never because one lands on the floor.
  const repsOf = act => {
    if (rowsMode === 'one') return [{ two: NONE, name: 'one' }];
    if (rowsMode === 'two') return [{ two: ALLF, name: 'two' }];
    const out = [{ two: NONE, name: 'one' }];
    const cand = ctx.units.filter(U => !U.allBlob && cue(U) * quality >= 1 && U.figs.some(i => act.has(i) && !ctx.figs[i].blob));
    if (cand.length) {
      const t = new Set(cand.map(U => U.id)); t.force = new Set(t);
      let s2 = Infinity; for (const U of cand) s2 = Math.min(s2, 0.9 * U.hwThick / (D2F + TWO_MARGIN));
      out.push({ two: t, name: 'cue', s2 });
    }
    out.push({ two: ALL, name: 'two' });
    return out;
  };
  const refsAtCap = (from, act, only = null) => {
    const out = [];
    for (const rp of repsOf(act)) {
      if (only && !only.includes(rp.name)) continue;
      const st = from.two && keyOf(rp.two) === keyOf(from.two) ? from.b : B(from.s, act, rp.two);
      const r = solve(maxDrones, act, rp.two, [st], sMax * 3);
      if (!r.b) continue;
      out.push({ ...rp, s: r.b.s, b: r.b, act, J: useDepict ? namingProbability(scoreOf(r.b)) : 0, e: escore(r.b, act) });
    }
    return out;
  };
  const keeps = (C, R, act, textS, jBar = R.J - KEEP_EPS) => {
    const k = keepScore(R.b.plain || R.b, C.plain || C);
    const why = [];
    if (k.cov < KEEP_COV) why.push('cov');
    if (k.prec < KEEP_PREC) why.push('prec');
    if (k.figs > 0) why.push('figs');
    // (lettering: no stroke of a letter lost against the reference (a t turning into an l), and at most one shrunken
    // counter or missed serif tip per KEEP_GLYPHS glyphs; corners of shapes within KEEP_CORNERS. Both checks flip
    // under half a pixel when held at zero: Ethereum 102 / 249 / 105, NVIDIA 125 / 217 at 512 px, 520 px, shifted)
    const gC = gscore(C, act), gR = gscore(R.b, act);
    if (hscore(C, act) > hscore(R.b, act) || gC > gR + Math.floor(nGlyphs / KEEP_GLYPHS) || escore(C, act) - gC > escore(R.b, act) - gR + KEEP_CORNERS) why.push('checks');
    if (arcShare(C) > Math.max(CURV_WELL, arcShare(R.b) + 0.01)) why.push('arcs');
    // (no picture turns to noise on the way down: dots in short pieces or crowded anchors, pattern.mjs)
    if (noise(C, act).share > noise(R.b, act).share + NOISE_GROW) why.push('noise');
    if (C.s > textS * 1.0001) why.push('lettering');
    if (!why.length && useDepict && namingProbability(scoreOf(C)) < jBar) why.push('depiction');
    return { ok: !why.length, why, k };
  };
  const descend = (R, act, jBar = R.J - KEEP_EPS) => {
    const textS = Math.max(textNeed(act).s, R.s);
    const tgt = Math.min(maxDrones, Math.ceil(minDrones / 0.97));
    let last = R.b, fails = 0, why = null, floorHit = null, steps = 0;
    if (opts.debug) (ladder.desc ??= []).push(R.name + ':');
    // (grid points s_k = sMax / DESC^k; while every check passes with a clear margin the walk takes two grid steps
    // at a time, and goes back to single steps from the last passing point as soon as one is close or fails)
    let k = Math.floor(Math.log(sMax / R.s) / Math.log(DESC));
    if (sMax / Math.pow(DESC, k) <= R.s * 1.001) k--;
    let comfy = true;
    while (k >= 0) {
      const stride = comfy && !fails && !opts.descAll && k >= 1 ? 2 : 1, kk = k - stride + 1;
      const s = sMax / Math.pow(DESC, kk);
      const C = B(s, act, R.two);
      steps++;
      if (C.pts.length < minDrones) {
        if (stride === 2) { comfy = false; continue; }
        floorHit = C; if (opts.debugDesc) record('dfloor', { s, b: C, act }); break;
      }
      const v = keeps(C, R, act, textS, jBar);
      if (opts.debug) ladder.desc.push(`${C.pts.length}/${v.k.cov.toFixed(2)}/${useDepict ? (namingProbability(scoreOf(C)) - R.J).toFixed(3) : ''}${v.ok ? '' : ':' + v.why.join('+')}`);
      if (opts.debugDesc) record('d' + (v.ok ? '' : 'x'), { s, b: C, act });
      if (!v.ok && stride === 2) { comfy = false; continue; }
      if (!v.ok && opts.debug && fails === 0) record('fail', { s, b: C, act }, { why: v.why.join('+'), cov: +v.k.cov.toFixed(3), prec: +v.k.prec.toFixed(3), runs: v.k.runs });
      k = kk - 1;
      if (opts.descAll) continue; // (debug: walk on to the floor, keep the reference)
      if (v.ok) { last = C; fails = 0; comfy = v.k.cov >= 0.97 && v.k.prec >= 0.97 && (!useDepict || namingProbability(scoreOf(C)) >= jBar + 0.015); }
      else if (++fails >= KEEP_FAILS) { why = v.why.join('+'); break; }
    }
    let stop = 'descent', reason = why ? 'loss:' + why : 'coarsest';
    if (last === R.b) { stop = 'reference'; reason = why ? 'loss:' + why : 'cap'; }
    if (floorHit && !fails) {
      // nothing lost down to the floor: R's rows solved onto it (when the count jumps over the floor, a row
      // that is lost there, the last passing picture stays)
      const r = solve(tgt, act, R.two, [last, floorHit], last.s, minDrones);
      const c = r.all.filter(b => b.pts.length >= minDrones && b.pts.length <= Math.max(tgt, last.pts.length) && b.s >= last.s).sort((x, y) => y.s - x.s)[0];
      if (c && c !== last && keeps(c, R, act, textS, jBar).ok) last = c;
      if (last.pts.length <= tgt) { stop = 'floor'; reason = 'floor'; } else reason = 'count jumps below the floor';
    } else if (floorHit) reason = 'loss next to the floor';
    return { b: last, stop, reason, steps };
  };
  // needClean: the references must be clean against the clean picture of step a (cleanVs: the over-budget path,
  // where step a needs more than the cap); null when none is
  const bestDescent = (a, act, needClean = false, depth = 0, cleanRef = a) => {
    // (a crest that the reference draws as noise: its dense fills as their field, then the same again; judged on the
    // first representation, one row unless the rows are fixed, before the others are built)
    let Rs = refsAtCap(a, act, depth === 0 ? [repsOf(act)[0].name] : null);
    if (!Rs.length) return null;
    if (depth === 0) {
      const Rb = Rs[0];
      const pz = patternize(Rb.b, act);
      if (pz) {
        // (the patterned content starts from the best reference's spacing and rows; a field is simpler than what it
        // replaces, so the picture there is the clean start)
        const b2 = B(Rb.s, pz.act, Rb.two), a2 = { s: Rb.s, b: b2, two: Rb.two, sc: escore(b2, pz.act) };
        record('pattern', { ...a2, act: pz.act }, { figures: pz.records.reduce((t, r) => t + r.figures, 0) });
        // (over the budget the patterned references must still be clean against the full clean picture: a name that
        // only the overshoot draws legibly, Harley-Davidson, is not given up for a cleaner centre)
        const r = bestDescent(a2, pz.act, needClean, 1, a);
        if (r) { simplified.push(...pz.records); return { ...r, pattern: true }; }
      }
      Rs = [...Rs, ...refsAtCap(a, act).filter(R => R.name !== Rs[0].name)];
    }
    if (needClean && opts.debug) (ladder.capClean ??= []).push(...Rs.map(R => `${R.name} n${R.b.pts.length} s${R.s.toFixed(2)} plain${(R.b.plain || R.b).pts.length} act${act.size}:${[...act].sort((x,y)=>x-y).join(",")} fa${fid(R.b, act).toFixed(3)}/${fid(cleanRef.b, act).toFixed(3)} text ${textOk(R.b, cleanRef.b, act)} fid ${(fid(R.b, act) / Math.max(1e-9, fid(cleanRef.b, act))).toFixed(2)} speck ${speckle(R.b).toFixed(2)}/${speckle(cleanRef.b).toFixed(2)} J ${R.J.toFixed(3)}/${useDepict ? namingProbability(scoreOf(cleanRef.b)).toFixed(3) : ''} noise ${noise(R.b, act).share.toFixed(2)}`));
    // (v7: the predicted fidelity is not monotone in s (Eintracht's patterned rings: 0.47 at s 15.8, 0.91 at s 16.8, the
    // inset rows of two rings meeting until they turn into centre lines); a reference that is not clean at the cap is
    // replaced by the first of up to three coarser grid steps that is, so the outcome does not hinge on where the solve
    // lands, which the density moves)
    if (needClean) Rs = Rs.map(R => {
      if (cleanVs(R, cleanRef)) return R;
      for (let k = 1; k <= 3; k++) {
        const b = B(R.s * Math.pow(DESC, k), act, R.two), c = { ...R, s: b.s, b, J: useDepict ? namingProbability(scoreOf(b)) : 0, e: escore(b, act) };
        if (cleanVs(c, cleanRef)) return c;
      }
      return null;
    }).filter(Boolean);
    if (!Rs.length) return null;
    // (identical pictures, a logo of blobs only: one reference)
    const sig = b => b.pts.length + ':' + b.pts.reduce((t, p) => t + p.x * 1.3 + p.y, 0).toFixed(1);
    const seen = new Set(); Rs = Rs.filter(R => { const k = sig(R.b); if (seen.has(k)) return false; seen.add(k); return true; });
    // (hard checks at the cap do not decide: a one-row picture of Tidal's diamonds fails corner checks and reads as
    // well; within a descent no check may get worse than in its own reference)
    // (without the proxy there is nothing to compare representations by: the rows the strokes call for)
    if (!useDepict) Rs = [Rs.find(R => R.name === 'cue') || Rs[0]];
    const Jref = Math.max(...Rs.map(R => R.J));
    // (a representation qualifies when its reference clears the bar its descent is held to: Jref - KEEP_EPS. One just
    // above the bar has no room to descend and keeps a high count, so the choice does not flip at a threshold)
    const elig = Rs.filter(R => R.J >= Jref - KEEP_EPS);
    const cands = [];
    for (const R of elig) {
      record('ref-' + R.name, R, { J: +R.J.toFixed(3) });
      // (the proxy may fall at most KEEP_EPS below the best reference, whichever representation descends)
      const D = descend(R, act, Jref - KEEP_EPS);
      cands.push({ R, D, n: D.b.pts.length, J: useDepict ? namingProbability(scoreOf(D.b)) : 0 });
    }
    cands.sort((x, y) => x.n - y.n || y.J - x.J);
    // (v7: a candidate that reaches minDrones beats one that cannot: at a low density a representation may not reach the
    // floor at the finest spacing, a lone line in two rows)
    if (cands.some(d => d.n >= minDrones)) for (let i = cands.length - 1; i >= 0; i--) if (cands[i].n < minDrones) cands.splice(i, 1);
    let c = cands[0];
    for (const d of cands.slice(1)) if (d.n <= REP_NEAR * c.n && d.J >= c.J + REP_JGAIN) c = d;
    // v7: below density 1 the saved dots buy rows: a representation with more rows (one < cue < two) whose descended
    // picture costs at most REP_NEAR / density times the chosen count and rates as well (within REP_JKEEP) wins
    // (Docker at density 0.5: the one-row whale at 235 against the outlined whale at 250, proxy 0.957 / 0.960)
    if (density < 1) {
      const rich = { one: 0, cue: 1, two: 2 };
      for (const d of cands) if (rich[d.R.name] > rich[c.R.name] && d.n <= (REP_NEAR / density) * c.n && d.J >= c.J - REP_JKEEP) c = d;
    }
    if (opts.debug) { ladder.reps = Rs.map(R => `${R.name} ${R.b.pts.length} J${R.J.toFixed(3)} e${R.e}${elig.includes(R) ? '' : ' out'}`); ladder.cands = cands.map(d => `${d.R.name} ${d.n} J${d.J.toFixed(3)} ${d.D.stop}`); }
    const pic = { s: c.D.b.s, b: c.D.b, two: c.R.two, act, ...(c.R.s2 ? { s2: c.R.s2 } : {}) };
    record(c.D.stop, pic, { rows: c.R.name, reason: c.D.reason });
    if (c.D.stop === 'reference') wanted = Math.max(wanted, c.R.b.pts.length);
    ladder.rows = c.R.name;
    return { pic, stop: c.D.stop, reason: c.D.reason };
  };
  const refDescent = (a, act, noA = false) => {
    if (!noA) record('a', { ...a, act }, { clean: a.sc === 0 });
    return bestDescent(a, act) || { pic: { ...a, act }, stop: 'a', reason: 'no reference' };
  };

  let pic, stop, reason, densityEff = 1, cleanAt = null, stepA = null;
  if (opts.s) {
    // fixed spacing (debugging, tests): every unit in the v5 regime, no budget
    const act = new Set([...core, ...secondary]);
    const tw = rowsMode === 'two' ? ALLF : rowsMode === 'one' ? NONE : null;
    pic = { s: opts.s, b: B(opts.s, act, tw, sampReq), two: tw, act };
    pic = cleanup(pic); stop = 'fixed'; reason = 'fixed';
  } else {
    // step a; when one row cannot pass the hard checks (script lettering, strokes with contrast) and the v5
    // regime passes more of them, the v5 regime (the budget path below deals with its count)
    // ... and when one row does not depict the logo where two rows do (letters so bold that their centre line
    // degenerates into the junctions: KICKSTARTER, IKEA), judged by the proxy on both pictures at the same spacing
    // v6.1: rows 'one' keeps every unit in one row; rows 'two' draws every unit in the two-row regime, at a
    // spacing at which the main strokes (units with at least a fifth of the ink) are wide enough for two rows
    const twoPic = act => {
      const aN = coarsest(act, ALLF);
      // v9 contour: the contour spacing is set by the figures themselves (their thick half-width), finest first; a figure
      // whose contour would take the picture past CONTOUR_OVER * N even at CONTOUR_DMIN is left out of the choice, so its
      // strokes (and every thinner one) are drawn as lines: the stripes of IBM, the hairline rings of a crest
      if (contour) {
        const k = 0.9 / (INSET + 0.5 * ROW_SEP + TWO_MARGIN), fs = [...act].map(i => ctx.figs[i]).filter(F => !F.blob && !F.field);
        const tot = fs.reduce((t, F) => t + F.area, 0);
        const cand = [...new Set(fs.filter(F => F.area >= CONTOUR_AREA * tot && k * F.hwThin >= CONTOUR_HAIR * s0 && essentialFig(ctx.figs.indexOf(F))).map(F => Math.min(aN.s, Math.max(sFloor, k * F.hwThin))))].sort((x, y) => x - y);
        const steps = []; for (const c of cand) if (!steps.length || c > 1.1 * steps.at(-1)) steps.push(c);
        // (the finest step that fits N at CONTOUR_DMIN; else the finest within CONTOUR_OVER * N; else the coarsest clean one)
        let sc = aN.s;
        const nAt = steps.map(c => B(c, act, ALLF, { density: CONTOUR_DMIN, adaptive: false }).pts.length);
        const fit = steps.findIndex((c, i) => nAt[i] <= maxDrones), near = steps.findIndex((c, i) => nAt[i] <= LF.over * maxDrones);
        // (flexible: the finest step within over * N even when a coarser one fits N: accuracy first, Marc 12.11.: Pizza Hut and
        // Tesco gave up too early)
        const pick = LF.fine ? (near >= 0 ? near : fit) : (fit >= 0 ? fit : near);
        if (pick >= 0) sc = steps[pick];
        if (opts.debug) ladder.contour = { steps: steps.map(v => +v.toFixed(2)), nAt, sC: +sc.toFixed(2), aN: +aN.s.toFixed(2) };
        if (sc >= aN.s) return aN;
        const b = B(sc, act, ALLF);
        return { s: sc, b, sc: escore(b, act), two: ALLF };
      }
      const us = ctx.units.filter(U => !U.allBlob && U.figs.some(i => act.has(i)));
      const ink = us.reduce((t, U) => t + U.ink, 0);
      let s2 = aN.s;
      for (const U of us) if (U.ink >= (contour ? CONTOUR_INK : 0.2) * ink && essentialUnit(U, act)) s2 = Math.min(s2, Math.max(sFloor, 0.9 * U.hwThick / (INSET + 0.5 * ROW_SEP + TWO_MARGIN)));
      if (s2 >= aN.s) return aN;
      const b = B(s2, act, ALLF);
      return { s: s2, b, sc: escore(b, act), two: ALLF };
    };
    essentialPic = act => {
      if (rowsMode === 'one') return coarsest(act, NONE);
      if (rowsMode === 'two') return twoPic(act);
      const a1 = coarsest(act, NONE);
      let gap = 0;
      if (useDepict && ctx.units.some(U => !U.allBlob && U.maxDepth >= (INSET + 0.5 * ROW_SEP) * a1.s && U.figs.some(i => act.has(i)))) {
        const bN = B(a1.s, act, ALL);
        gap = namingProbability(scoreOf(bN)) - namingProbability(scoreOf(a1.b));
        if (opts.debug) ladder.rowGap = +gap.toFixed(3);
      }
      if (a1.sc === 0 && gap <= ROW_GAP) return a1;
      const aN = coarsest(act, ALL);
      if (aN.sc < a1.sc || (gap > ROW_GAP && aN.sc <= a1.sc + CAP_TOL)) { ladder.twoRowFallback = gap > ROW_GAP ? 'depiction' : 'checks'; return aN; }
      return a1;
    };
    let a = essentialPic(core);
    if (contour) sC = a.s;
    // v6.2: the smallest count at which the full logo (nothing simplified) passes the hard checks, when known: step
    // a of the full content (with what the cost-aware selection left out, below)
    cleanAt = a.sc === 0 ? a.b.pts.length : null;
    // v5 (Part 3): a cost-aware drop stands only if the picture without the element is worth more (J); the
    // elements come back when they fit and the picture with them is worth at least as much
    if (selDrop.length && useDepict) {
      const withSel = new Set([...core, ...selDrop]);
      const aw = coarsest(withSel, a.two);
      cleanAt = aw.sc === 0 ? aw.b.pts.length : null;
      if (aw.b.pts.length <= maxDrones && aw.sc <= a.sc && J(aw.b) >= J(a.b)) {
        a = aw; core = withSel;
        for (let k = dropped.length - 1; k >= 0; k--) if (dropped[k].reason && /^cost:/.test(dropped[k].reason)) dropped.splice(k, 1);
      } else {
        // class C: siblings of what the selection left out (same group, detail-sized: the rest of a ring of
        // letters) go with it, so a ring is all there or all gone; they may come back together in step d
        const diagOf = F => Math.hypot(F.region.x1 - F.region.x0 + 1, F.region.y1 - F.region.y0 + 1);
        const groups = new Set(selDrop.map(fi => ctx.figs[fi].group)), big = Math.max(...selDrop.map(fi => diagOf(ctx.figs[fi])));
        const sib = [...core].filter(fi => { const F = ctx.figs[fi]; return groups.has(F.group) && !protectedFig(fi) && diagOf(F) <= 3 * big; });
        if (sib.length && sib.length < core.size) {
          const core2 = new Set([...core].filter(fi => !sib.includes(fi)));
          const a2 = coarsest(core2, a.two);
          if (a2.sc <= a.sc) { a = a2; core = core2; selDrop = [...selDrop, ...sib]; dropped.push({ kind: 'detail', figures: sib.length, reason: 'siblings of elements the cost-aware selection left out' }); }
        }
        secondary = [...secondary, ...selDrop];
      }
    } else secondary = [...secondary, ...selDrop];
    stepA = { a, act: core };
    if (a.b.pts.length <= maxDrones) {
      ({ pic, stop, reason } = refDescent(a, core));
      const d = addSecondary(pic, pic.act);
      if (d.added) {
        pic = { ...d.best, act: d.act }; record('d', pic, { figures: d.added }); stop = 'd'; reason = 'saturated';
        // elements of the cost-aware selection that came back are no longer dropped; what stays out is recorded once
        const own = new Set(pic.b.pts.map(p => p.fi));
        if (selDrop.some(fi => own.has(fi))) {
          for (let k = dropped.length - 1; k >= 0; k--) if (dropped[k].reason && /^cost:/.test(dropped[k].reason)) dropped.splice(k, 1);
          const out = selDrop.filter(fi => !own.has(fi)).length;
          if (out) dropped.push({ kind: 'detail', figures: out, reason: 'cost-aware selection; not restored in step d (over the budget or broken)' });
        }
      }
      if (d.capN) { reason = 'cap'; wanted = Math.max(wanted, d.capN); }
    } else {
      // over budget. (1) the full content solved onto the cap, when it stays clean there; (2) simplified versions
      // (ornaments, then every unprotected element), in the band when they fit cleanly; (3) the smallest count at
      // which the simplified version is clean, above the cap (meta.budget.over); (4) above hardMax: the name goes
      // when a Bildmarke carries the logo, then the spacing is solved onto hardMax regardless.
      wanted = a.b.pts.length;
      record('a', { b: a.b, act: core }, { clean: a.sc === 0 });
      // v9 contour: nothing is simplified and no row collapses. The contour at sC is solved onto N with sparser dots along
      // its rows (B); when even CONTOUR_DMIN needs more than N, the picture goes over N at CONTOUR_DMIN (meta.budget.over)
      if (contour) {
        const lo = B(sC * ladderDensity / CONTOUR_DMIN, core, a.two);
        if (lo.pts.length <= maxDrones) {
          // (the line density at sC solved onto N by bisection; counts jump where the row clearance caps the spacing, so
          // the fullest build within N wins when none lands in the band)
          const at = d => B(sC, core, a.two, { density: d, adaptive: false });
          let dLo = CONTOUR_DMIN, dHi = ladderDensity, best = lo;
          for (let it = 0; it < 8 && best.pts.length < minDrones; it++) {
            const d = 0.5 * (dLo + dHi), bd = at(d);
            if (bd.pts.length <= maxDrones) { dLo = d; if (bd.pts.length > best.pts.length) best = bd; } else dHi = d;
          }
          const b = best;
          pic = { s: b.s, b, two: a.two, act: core }; stop = 'contour-cap'; reason = 'cap';
        } else if (lo.pts.length <= LF.hard * maxDrones) { pic = { s: lo.s, b: lo, two: a.two, act: core }; stop = 'over'; reason = 'contour'; wanted = lo.pts.length; }
        else {
          // (past CONTOUR_HARD * N, a crest of hairlines: the spacing grows past sC after all, thin strokes become lines;
          // wanted keeps the count of the full contour picture)
          wanted = lo.pts.length; sC = Infinity;
          const cap = Math.round(LF.hard * maxDrones), r = solve(cap, core, a.two, [], sMax * 6);
          let hb = r.b || [...r.all].filter(b => b.pts.length <= cap).sort((x, y) => y.pts.length - x.pts.length)[0];
          for (let t = (hb || lo).s, it = 0; !hb && it < 12; it++) { t *= 1.2; const bt = B(t, core, a.two); if (bt.pts.length <= cap) hb = bt; }
          pic = { s: (hb || lo).s, b: hb || lo, two: a.two, act: core }; stop = 'over'; reason = 'contour capped';
        }
        record(stop, pic);
      }
      // clean at the cap: the hard checks no worse than at the clean spacing, and the depiction proxy loses at
      // most CAP_LOSS of expected naming (the hard checks do not see speckle: a crest of tiny figures passes them)
      const atCap1 = (from, act, two) => { const r = solve(maxDrones, act, two, two === from.two ? [from.b] : []); return r.b ? { s: r.b.s, b: r.b, two, act } : null; };
      // the picture at the cap, in the row policy of the clean picture or, when that is the two-row fallback and
      // does not hold at the cap, in one row (finer at the same count)
      // v6.1: units whose strokes call for a second row (the cue of step c: the bold letters of IKEA in their oval)
      // get it at the cap too, when the picture is clean there
      const atCap = (from, act) => {
        if (rowsMode === 'auto' && from.two !== null && keyOf(from.two) !== keyOf(ALL)) {
          const cand = ctx.units.filter(U => !from.two.has(U.id) && !U.allBlob && cue(U) * quality >= 1 && U.figs.some(i => act.has(i) && !ctx.figs[i].blob));
          if (cand.length) {
            const two = new Set([...from.two, ...cand.map(U => U.id)]); two.force = new Set([...(from.two.force || []), ...cand.map(U => U.id)]);
            const c2 = atCap1(from, act, two);
            if (c2 && cleanVs(c2, from) && c2.b.pts.length > 1.05 * B(c2.s, act, from.two).pts.length) return c2;
          }
        }
        const c = atCap1(from, act, from.two);
        if (from.two === NONE || cleanVs(c, from)) return c;
        const c1 = atCap1(from, act, NONE);
        return cleanVs(c1, from) ? c1 : c;
      };
      let cur = { a, act: core, records: [] };
      const cands = [cur];
      // (v6.2: the representations whose picture at the cap is clean are the references; the descent may take
      // the picture below the cap)
      const bd = contour ? null : bestDescent(a, core, true);
      if (contour) { /* decided above */ }
      else if (bd) { ({ pic, stop, reason } = bd); stop = 'cap-' + stop; }
      // v8: a crest that is not clean at the cap is tried as a schematic first (convert(), opts._abortOver); the simplified
      // versions and the overshoot below run only when no schematic variant is clean within the budget
      else if (opts._abortOver) return { aborted: true, points: [], meta: {} };
      else {
        // stage 2 also lets taglines go: only the wordmark and rows of comparable height stay protected
        const nameFig = fi => { const p = ctx.figs[fi].part; return !!(p && p.kind === 'text' && essential(p) && (!parts.wordmark || p === parts.wordmark || p.h >= 0.8 * parts.wordmark.h)); };
        for (const stage of [1, 2]) {
          const r = simplifyForBudget(ctx, cur.act, stage === 1 ? protectedFig : nameFig, stage);
          if (!r.act) continue;
          const a2 = essentialPic(r.act);
          cur = { a: a2, act: r.act, records: [...cur.records, ...r.records] };
          cands.push(cur);
          record('simplify' + stage, { b: a2.b }, { clean: a2.sc === 0 });
          if (a2.b.pts.length <= maxDrones) { ({ pic, stop, reason } = refDescent(a2, r.act, true)); stop = 'simplified-' + stop; break; }
          const b2 = bestDescent(a2, r.act, true);
          if (b2) { ({ pic, stop, reason } = b2); stop = 'simplified-cap-' + stop; break; }
        }
        if (pic) simplified.push(...cur.records);
        else {
          // (3) even the simplified version breaks at the cap: the smallest count at which it is clean (the
          // version with the fewest failures, then the fewest dots). Bisect between its capped picture (broken)
          // and its clean spacing, twice.
          cur = cands.slice().sort((x, y) => x.a.sc - y.a.sc || x.a.b.pts.length - y.a.b.pts.length)[0];
          const act = cur.act, ref = cur.a, capPic = atCap(ref, act);
          let over = { ...ref, act };
          if (capPic) {
            let lo = capPic.s, hi = over.s;
            for (let it = 0; it < 2 && hi < lo; it++) {
              const t = Math.sqrt(lo * hi), bt = B(t, act, over.two);
              if (cleanVs({ b: bt, act }, ref)) { over = { ...over, s: t, b: bt }; hi = t; } else lo = t;
            }
          }
          pic = over; record('over', pic); stop = 'over'; reason = 'clean';
          simplified.push(...cur.records);
          // v6.1: the name of a crest (ring lettering, protected above) that cannot be drawn cleanly even at the
          // hard limit would only be speckle there: it goes, the main figure stays (stage 3), and the rest is
          // laddered again: in the band when it fits, else the smallest clean count above the cap
          // (off with the default crest protection, which leaves ring names unprotected: NAME_RING in select.mjs)
          if (NAME_RING && pic.b.pts.length > hardMax) {
            const r3 = simplifyForBudget(ctx, pic.act, nameFig, 2, { name: false });
            if (r3.act) {
              const a3 = essentialPic(r3.act);
              record('simplify3', { b: a3.b }, { clean: a3.sc === 0 });
              let p3 = null;
              if (a3.b.pts.length <= maxDrones) { const cl = refDescent(a3, r3.act, true); p3 = cl.pic; stop = 'simplified-' + cl.stop; reason = cl.reason; }
              else {
                const c3 = atCap(a3, r3.act);
                if (cleanVs(c3, a3)) { p3 = c3; stop = 'simplified-cap'; reason = 'cap'; }
                else if (a3.b.pts.length <= hardMax) { p3 = { ...a3, act: r3.act }; stop = 'over'; reason = 'clean'; }
              }
              if (p3) { pic = p3; simplified.push(...r3.records.map(r => ({ ...r, stage: 3 }))); record(stop, pic); }
            }
          }
          if (pic.b.pts.length > hardMax) {
            const markSize = Math.max(0, ...parts.mark.map(m => m.size));
            const act2 = new Set(pic.act), log = [];
            // (v6.1: only when the Bildmarke is clearly the larger part; a small shield beside a long name, Harvard,
            // does not carry the logo)
            if (part !== 'full' && parts.hasMark && markSize >= 1.2 * parts.wordmark.size && dropWordmark(act2, log)) {
              const a3 = coarsest(act2, NONE);
              if (a3.b.pts.length <= hardMax && a3.sc <= escore(pic.b, pic.act)) { pic = { ...a3, act: act2 }; simplified.push(...log.map(r => ({ ...r, stage: 3 }))); record('mark', pic); }
            }
            if (pic.b.pts.length > hardMax) {
              const h = solve(hardMax, pic.act, pic.two, [pic.b], sMax * 6);
              let hb = h.b || [...h.all].filter(b => b.pts.length <= hardMax).sort((x, y) => y.pts.length - x.pts.length)[0];
              // the hard limit holds: coarsen on until it does
              for (let t = (hb || pic.b).s, it = 0; !hb && it < 12; it++) { t *= 1.2; const bt = B(t, pic.act, pic.two); if (bt.pts.length <= hardMax) hb = bt; }
              if (hb) pic = { s: hb.s, b: hb, two: pic.two, act: pic.act };
              record('hardMax', pic); stop = 'hardMax'; reason = 'coarsened';
            }
          }
        }
      }
    }
    // v6.1: quality scales the spacing of the picture the ladder chose (its content and rows stay): finer up to
    // the cap (an overshoot keeps its count at most), coarser only as long as no letter of the name changes
    // (textOk) and the second rows the cue gave stay possible
    if (quality !== 1 && pic.b) {
      const s1 = pic.b.s, act = pic.act, two = pic.two, top = Math.max(maxDrones, pic.b.pts.length);
      let q = null;
      if (quality > 1) {
        let b = B(Math.max(sFloor, s1 / quality), act, two);
        if (b.pts.length > top) { const r = solve(top, act, two, [pic.b, b], s1); b = r.b && r.b.pts.length >= pic.b.pts.length ? r.b : pic.b; }
        if (b !== pic.b) q = b;
      } else {
        let hi = s1 / quality;
        if (pic.s2) hi = Math.min(hi, Math.max(s1, pic.s2));
        // (a walk in fixed steps of 6 % from s1, stopping at the first step that changes a letter: the same walk
        // for every quality, so a lower quality never ends on a finer spacing than a higher one)
        for (let t = s1 * QSTEP; t <= hi * 1.0001; t *= QSTEP) { const bt = B(t, act, two); if (!textOk(bt, pic.b, act)) break; q = bt; }
        if (q && hi > q.s * 1.001 && hi < q.s * QSTEP) { const bt = B(hi, act, two); if (textOk(bt, pic.b, act)) q = bt; }
      }
      if (q) { pic = { ...pic, s: q.s, b: q }; record('quality', pic, { quality }); }
    }
    pic = cleanup(pic);
    // dots below minDrones are free: a finer v5 picture (every unit two-row where its stroke allows)
    if (pic.b.pts.length < minDrones) {
      const tgt = Math.min(maxDrones, Math.ceil(minDrones / 0.97));
      // the smallest count of at least minDrones (within maxDrones) among the tried builds; the two-row count may
      // jump over the window, then the current rows are solved instead
      // (v6.1) no glyph feature may be lost on the way (a finer spacing can break a hairline join, the A of Zara),
      // and the two-row regime is taken only when it lands near the floor: where outlines would cost far more than
      // the floor (a fat M at 144), the current rows are solved onto it
      const okB = b => b.pts.length >= minDrones && b.pts.length <= maxDrones && textOk(b, pic.b, pic.act);
      const pick = list => list.filter(okB).sort((x, y) => x.pts.length - y.pts.length || y.s - x.s)[0] || null;
      // (v6.1: rows 'one' fills the floor in one row)
      const FT = rowsMode === 'one' ? NONE : rowsMode === 'two' ? ALLF : ALL;
      const r = solve(tgt, pic.act, FT, [B(pic.b.s, pic.act, FT)], pic.b.s, minDrones);
      let cand = pick(r.all), two = FT;
      // (the two-row regime at a coarse spacing can crowd the rows of a small shape into speckle, Sauce Labs,
      // Trello: at the floor both are built, and the outlines are kept only when the depiction proxy rates them
      // higher and the hard checks are no worse)
      if (keyOf(pic.two) !== keyOf(FT)) {
        const r1 = solve(tgt, pic.act, pic.two, [pic.b], pic.b.s, minDrones);
        const c1 = pick(r1.all);
        const twoBetter = cand && (!useDepict || (J(cand) > J(c1 || cand) + 0.01)) && escore(cand, pic.act) <= escore(c1 || cand, pic.act);
        if (c1 && (!cand || cand.pts.length > 1.25 * minDrones || !twoBetter)) { cand = c1; two = pic.two; }
        if (!cand) r.all.push(...r1.all);
      }
      // the floor holds even when every candidate loses a feature: the one that loses fewest, then the fewest dots
      if (!cand) { const c = [...r.all].filter(b => b.pts.length >= minDrones && b.pts.length <= maxDrones).sort((x, y) => gscore(x, pic.act) - gscore(y, pic.act) || x.pts.length - y.pts.length)[0]; if (c) { cand = c; two = c.two; } }
      if (!cand) { const best = [...r.all].filter(b => b.pts.length <= maxDrones).sort((x, y) => y.pts.length - x.pts.length)[0]; if (best) { cand = best; two = best.two; } }
      if (cand && cand.pts.length > pic.b.pts.length) { pic = { ...pic, s: cand.s, b: cand, two }; record('fill', pic); stop = 'fill'; reason = 'floor'; }
    }
    // v7 (amendment): below DENSITY_SAFE the chosen picture is respaced at the requested density (same content, rows
    // and spacing); nothing refills it to the floor
    if (density < DENSITY_SAFE) {
      const bd = B(pic.b.s, pic.act, pic.two, sampReq);
      if (bd.pts.length) { pic = { ...pic, b: bd }; record('density', pic, { density }); }
    }
  }
  // Manual risk range: keep the chosen contour, but let the user thin its rows.
  // B() enforces the automatic contour floor, so sample the retained nets directly.
  if (contour && (opts.densityManual ?? opts.density != null) && density < DENSITY_SAFE) {
    const b = buildAt(ctx, pic.b.s, pic.act, pic.two, sampReq, pic.b);
    pic = { ...pic, b };
    record('density', pic, { density });
  }
  const build = pic.b, s = build.s, active = pic.act;
  // v8: over the budget, the count the same structure would have at sparser rows (opts.densityProbe), so the caller
  // re-solves at a lower density only when that can fit (a dense crest's rows are capped by their clearance and do not
  // get cheaper: FC Barcelona 234 / 233 / 233 at 0.6 / 0.48 / 0.38)
  // (v8, 2nd form: the count of step a's clean picture at the sparser rows, whenever the result is not clean or over
  // the cap: a picture the cap broke may fit cleanly at a lower density, Sony at 120)
  const cleanNow = hscore(build, active) === 0 && gscore(build, active) <= Math.floor(nGlyphs / KEEP_GLYPHS) && speckle(build) <= SPECKLE_MAX && framed(build, active).share <= NOISE_MAX;
  // (only when the budget is the reason: step a's clean picture itself does not fit at this density; a picture that is not
  // clean for other reasons (a hairline join lost at a finer spacing, Sony at 120 with a clean minimum of 60) is left alone)
  if (Array.isArray(opts.densityProbe) && stepA && stepA.a.sc === 0 && stepA.a.b.pts.length > maxDrones && (build.pts.length > maxDrones || !cleanNow)) {
    budget.atDensity = { [density]: stepA.a.b.pts.length };
    for (const d of opts.densityProbe) if (d < density) budget.atDensity[d] = B(stepA.a.s, stepA.act, stepA.a.two, { density: d, adaptive: false }).pts.length;
  }
  wanted = Math.max(wanted, build.pts.length);
  budget.wanted = wanted;
  budget.over = build.pts.length > maxDrones;
  budget.cleanAt = cleanAt;
  // (v7: below DENSITY_SAFE the floor is not applied after the respacing)
  budget.floorSkipped = density < DENSITY_SAFE && build.pts.length < minDrones;
  // what the density achieved: dots of the picture against the same rows sampled at density 1
  if (build.plain) densityEff = +(build.pts.length / Math.max(1, build.plain.pts.length)).toFixed(3);
  // v6.2: what the cost-aware selection left out for good (ring names that need 800+ dots, ornament rows) is a
  // simplification of the logo and is reported there too
  for (const r of dropped) if (r.reason && (/^cost:/.test(r.reason) || /^cost-aware/.test(r.reason) || /cost-aware selection left out/.test(r.reason))) simplified.push({ kind: r.kind, figures: r.figures, stage: 'cost', reason: r.reason });
  // v6.2: clean = no letter of the essential lettering changed (no lost stroke), at most one shrunken counter or
  // missed serif tip per KEEP_GLYPHS glyphs, no speckle (small shapes reduced to a few dots: at most SPECKLE_MAX of
  // the dots) and no noise inside a frame (at most NOISE_MAX). Rounded corners do not count (v6.1's clean, every
  // hard check at zero, was false for 174 of 410 logos, Wix and Tidal among them)
  const isClean = hscore(build, active) === 0 && gscore(build, active) <= Math.floor(nGlyphs / KEEP_GLYPHS) && speckle(build) <= SPECKLE_MAX && framed(build, active).share <= NOISE_MAX;
  const partOut = parts.wordmark && parts.hasMark && !ctx.figs.some((F, i) => active.has(i) && F.part === parts.wordmark) ? 'mark' : 'full';
  if (globalThis.__dbgFinal !== undefined) globalThis.__dbgFinal = { ctx, build, REF, active, s, verify: b => verify(ctx, REF, b, active) };
  const points = build.pts.map(p => ({ x: +p.x.toFixed(2), y: +p.y.toFixed(2), ...pointColour(ctx, p) }));
  const fis = build.pts.map(p => p.fi);
  let fillMeta = null;
  if (fillMode !== 'none') {
    // (opt-in interior rows sit on top of the edge picture; their budget is the hard limit)
    // (v7: interior rows follow the dot spacing along the rows, s / density, not the finer structure spacing)
    const f = fillPoints(ctx, build.pts, density < 1 ? s / density : s, active, fillMode, hardMax), dim = FILL_MODES[fillMode].dim;
    for (const p of f.pts) {
      const c = pointColour(ctx, p);
      points.push({ x: +p.x.toFixed(2), y: +p.y.toFixed(2), r: Math.round(c.r * dim), g: Math.round(c.g * dim), b: Math.round(c.b * dim) }); fis.push(p.fi);
    }
    fillMeta = { mode: fillMode, n: f.pts.length, figures: f.figures, rowGap: +(f.g || 0).toFixed(2), ...(f.overBudget ? { overBudget: true } : {}) };
  }
  const twoUnits = pic.two === null ? ctx.units.length : [...pic.two].length;
  ladder.stop = stop; ladder.reason = reason;
  const result = {
    width: image.width, height: image.height, points, spacing: +s.toFixed(3),
    meta: {
      n: points.length, part: partOut, dropped, simplified, quality, maxDrones, minDrones, hardMax, partRequested: part,
      budget, ladder, rows: { units: ctx.units.length, two: twoUnits, mode: rowsMode },
      density: Number.isFinite(densityReq) && densityReq > 0 ? densityReq : DEFAULT_DENSITY, densityEffective: densityEff, lineDensity: +(build.samp ? build.samp.density : 1).toFixed(3), contour, flex: flexLevel, adaptive,
      defaults: { quality: DEFAULT_QUALITY, density: DEFAULT_DENSITY },
      s0: +s0.toFixed(2), fidelity: +predictedFidelity(A, s * QC, active).toFixed(3), curvLoss: +curvShare(build).toFixed(3),
      clean: isClean, builds: nBuilds, noise: +noise(build, active).share.toFixed(3),
      ...(fillMeta ? { fill: fillMeta } : {}),
    },
  };
  // (for the wrapper: the figure of every dot, and the figures, to name each dot's element)
  Object.defineProperty(result, '_map', { value: { fis, figs: ctx.figs, seg }, enumerable: false });
  // v8.5: the resampler. The picture's structure (content, rows, spacing s) stays; only the spacing of the dots along the
  // rows (the density) is solved so that the count is the largest at or below n. Cheap: the traced nets are reused.
  if (!fillMeta) Object.defineProperty(result, '_resampleCore', { enumerable: false, value: n => resampleAt(ctx, pic, n, density) });
  return result;
}

// ---- v10: the outline converter -----------------------------------------------------------------------------------
// The drawing is the outline of every active figure; the dot spacing a along the outlines is the only lever.
// a_ref = min(typical stroke width, diag / OUTLINE_SHAPE) is "line density 1"; density d means a = a_ref / d.
// Budget flexibility (opts.flex) sets the sparsest density the picture may take before it goes over N, and how far over:
// strict stays near N (sparse outlines), flexible keeps the outlines dense and shows what the logo needs. Within N the
// whole budget is used (denser than the floor). A manual density (opts.density with opts.densityManual) is honoured as it
// is: the count follows from it. wanted = the count at FLEX.flexible's density (what a good picture needs).
export const FLEX = {
  strict: { cap: 1.1, d: 1.2, lines: 1.1 },
  medium: { cap: 1.5, d: 1.2, lines: 1.5 },
  flexible: { cap: 3, d: 1.2, lines: Infinity },
};
// A contour is never drawn sparser than it reads (d: line density 1.2 of a_ref; strokes at 0.7 of their width, outline.mjs):
// measured 12.11. on the blind set at N = 150, thinner contours turn into an even grid of dots (Zendesk, Spotify, SEAT,
// Energizer illegible). The levels differ in what gives way when the readable contour does not fit:
// flexible: nothing, the picture goes over N (up to cap); medium / strict: past lines * N, the thinnest row units (a whole
// word or mark at a time, never part of a letter) are drawn as one line each (Marc 12.11.: fine lettering like SEAT's reads
// well as a line); only when even that does not fit cap * N, everything thins out in proportion (dense crests).
export const FLEX_LEVELS = ['auto', 'strict', 'medium', 'flexible'], FLEX_AUTO = 'medium', OUTLINE_SHAPE = 22;
function outlineCore(image, ctx, active, { opts, maxDrones, minDrones, part, dropped, budget, diag, parts, densityReq }) {
  const flexReq = opts.flex ?? 'auto';
  if (!FLEX_LEVELS.includes(flexReq)) throw new Error(`opts.flex must be one of ${FLEX_LEVELS.join(', ')}`);
  const level = flexReq === 'auto' ? FLEX_AUTO : flexReq, F = FLEX[level];
  const nets = outlineNets(ctx, active);
  const w = strokeWidth(ctx, active), aRef = Math.max(1, Math.min(w, diag / OUTLINE_SHAPE));
  const cache = new Map();
  const aFloorOf = Lv => aRef / Lv.d;
  // row units, thinnest first: the order in which strokes give up their contour when a level allows lines
  const unitW = new Map();
  for (const fi of active) { const G = ctx.figs[fi]; if (G.blob || G.field) continue; const u = G.unit ? G.unit.id : 'f' + fi; unitW.set(u, Math.min(unitW.get(u) ?? Infinity, strokeOf(G))); }
  const unitsThin = [...unitW].sort((x, y) => x[1] - y[1]).map(x => x[0]);
  const lineNet = new Map(), netOfLine = fi => { if (!lineNet.has(fi)) { const G = ctx.figs[fi]; lineNet.set(fi, netOf(G, Math.max(2, 0.5 * strokeOf(G)), { pure: true })); } return lineNet.get(fi); };
  const linesFor = k => { if (!k) return null; const us = new Set(unitsThin.slice(0, k)); return { figs: new Set([...active].filter(fi => { const G = ctx.figs[fi]; return !G.blob && !G.field && us.has(G.unit ? G.unit.id : 'f' + fi); })), netOf: netOfLine }; };
  const count = (a, Lv = F, k = 0) => { const key = a.toFixed(4) + '|' + k; if (!cache.has(key)) cache.set(key, outlineBuild(ctx, nets, a, { kW: 1 / OUTLINE_WIDTH, aFloor: aFloorOf(Lv), lines: linesFor(k) })); return cache.get(key); };
  const aMin = Math.max(0.6, aRef / 4), aMax = diag / 3;
  const plan = n => {
    const nGood = count(aFloorOf(FLEX.flexible), FLEX.flexible).pts.length;
    if (densityReq) { const b = count(aRef / densityReq); return { b, wanted: nGood, manual: true }; }
    const aFloor = aFloorOf(F);
    let k = 0, nFloor = count(aFloor, F, 0).pts.length;
    // (the thinnest units give up their contour one at a time while the contour picture would go past lines * N)
    while (nFloor > F.lines * n && k < unitsThin.length) { k++; nFloor = count(aFloor, F, k).pts.length; }
    const cnt = a => count(a, F, k);
    if (nFloor <= n) return { b: solveSpacingFor(cnt, n, aMin, aFloor), wanted: nGood, lines: k };
    const target = Math.min(nFloor, Math.floor(F.cap * n));
    return { b: target >= nFloor ? cnt(aFloor) : solveSpacingFor(cnt, target, aFloor, aMax), wanted: nGood, lines: k };
  };
  const t = plan(maxDrones), build = t.b, a = build.a;
  const points = build.pts.map(p => ({ x: +p.x.toFixed(2), y: +p.y.toFixed(2), ...pointColour(ctx, p) }));
  const fis = build.pts.map(p => p.fi);
  budget.wanted = Math.max(t.wanted, points.length); budget.over = points.length > maxDrones; budget.cleanAt = null;
  const partOut = parts.wordmark && parts.hasMark && !ctx.figs.some((G, i) => active.has(i) && G.part === parts.wordmark) ? 'mark' : 'full';
  const lineDensity = +(aRef / a).toFixed(3);
  const result = {
    width: image.width, height: image.height, points, spacing: +(0.6 * build.along).toFixed(3),
    meta: {
      n: points.length, part: partOut, partRequested: part, dropped, simplified: [], maxDrones, minDrones, budget,
      ladder: { stop: 'outline', reason: t.manual ? 'manual density' : budget.over ? 'over' : 'fit' }, contour: true, outline: true,
      flex: level, flexRequested: flexReq, lineUnits: t.lines || 0, density: lineDensity, lineDensity, densityManual: !!t.manual, along: +a.toFixed(3), strokeWidth: Number.isFinite(w) ? +w.toFixed(2) : null,
      clean: true, quality: null, defaults: { flex: FLEX_AUTO },
    },
  };
  Object.defineProperty(result, '_map', { value: { fis, figs: ctx.figs, seg: ctx.seg }, enumerable: false });
  // retarget: the same plan for another count on the same outlines (nothing else depends on n): the exact answer
  Object.defineProperty(result, '_resampleCore', { enumerable: false, value: n => {
    const q = plan(n);
    return { pts: q.b.pts, density: +(aRef / q.b.a).toFixed(3), s: 0.6 * q.b.along, placements: cache.size, fits: q.b.pts.length <= n, exact: true, over: q.b.pts.length > n, wanted: Math.max(q.wanted, q.b.pts.length), colour: p => pointColour(ctx, p) };
  } });
  return result;
}

// ---- v8.5: resampling a finished picture to any drone count ---------------------------------------------------
// Count(d) of a fixed structure rises with the density d (dots along the rows at s / d); it is close to proportional, so a
// secant search from the picture's own density lands in a few placements. Returns the largest count <= n that was found
// (or the smallest placement, when even RESAMPLE_MIN cannot get under n).
export const RESAMPLE_MIN = 0.12, RESAMPLE_MAX = 3, RESAMPLE_STEPS = 7;
function resampleAt(ctx, pic, n, d0) {
  const base = pic.b, place = d => buildAt(ctx, base.s, pic.act, pic.two, { density: d, adaptive: false }, base);
  const tried = new Map();
  const at = d => { d = Math.min(RESAMPLE_MAX, Math.max(RESAMPLE_MIN, +d.toFixed(4))); if (!tried.has(d)) tried.set(d, place(d)); return [d, tried.get(d)]; };
  let [d, b] = at(d0 * n / Math.max(1, base.pts.length));
  for (let it = 0; it < RESAMPLE_STEPS && b.pts.length !== n; it++) {
    const next = d * n / Math.max(1, b.pts.length) * (b.pts.length > n ? 0.995 : 1.005);
    if (Math.abs(next - d) < 1e-4) break;
    [d, b] = at(next);
  }
  // (the count is not strictly monotone in d (merged dots, clearance caps): when nothing so far is at or below n, step down)
  for (let it = 0; it < 12 && ![...tried.values()].some(x => x.pts.length <= n) && d > RESAMPLE_MIN; it++) [d, b] = at(d * 0.93);
  const all = [...tried].map(([dd, bb]) => ({ d: dd, b: bb }));
  const under = all.filter(x => x.b.pts.length <= n).sort((x, y) => y.b.pts.length - x.b.pts.length || y.d - x.d)[0];
  const pick = under || all.sort((x, y) => x.b.pts.length - y.b.pts.length)[0];
  // (fits = false: even the sparsest placement of this structure needs more than n dots; the caller converts anew at n)
  return { pts: pick.b.pts, density: pick.d, s: base.s, placements: tried.size, fits: !!under, colour: p => pointColour(ctx, p) };
}

// ---- v7: containers, elements, exclusion (elements.mjs) -------------------------------------------------------
// convert(image, opts): the container is found on the logo as given; its elements are computed on the logo without the
// container (when there is one), so that every anchor names the same element whatever is dropped. A dropped container
// or an excluded element is removed from the image and the converter runs on the edited image (the ladder re-solves;
// the freed drones go to the rest, or the count drops). Every dot names its element (points[i].e).
export const CONTAINER_MODES = ['keep', 'drop'], STYLES = ['auto', 'detailed', 'schematic'], SCH_NOISE = 0.05;

// ---- v8: the drone count is the user's constant -----------------------------------------------------------------
// opts.drones = N: the picture is solved onto N (band [DRONES_FLOOR * N, N]); detail (quality) and line density are
// chosen by the converter unless the caller sets them. Line density is the lever: when the clean picture does not fit
// N at AUTO_DENSITIES[0] (Marc's preferred 0.6), the same structure is tried with sparser rows (0.48, then 0.38) before
// the crest schematic and before going over N. Over N stays allowed (meta.budget.over) when even the sparsest rows do
// not hold a clean picture. Without opts.drones the v7 band (minDrones / maxDrones) works as before.
// opts.probe: a cheap first look (no density retries, no schematic trials), used by the app's first raster pass.
export const DRONES_DEFAULT = 200, DRONES_FLOOR = 0.97, AUTO_DENSITIES = [0.6, 0.48, 0.38];
export const RETARGET_BAND = [0.3, 0.75];
export const ERASE_JOIN = 0.12, ERASE_RIM = 0.25; // OKLab distance under which a touching piece goes with an erased one;
// a smaller touching piece (an anti-aliased rim, blended with the background) up to ERASE_RIM
export function budgetPlan(opts = {}) {
  if (opts.drones == null) return { opts, auto: null };
  const N = Math.max(10, Math.round(+opts.drones) || DRONES_DEFAULT);
  const auto = { drones: N, quality: opts.quality == null, density: opts.density == null };
  return { opts: { ...opts, maxDrones: N, minDrones: Math.round(DRONES_FLOOR * N), quality: opts.quality ?? DEFAULT_QUALITY, density: opts.density ?? AUTO_DENSITIES[0], densityManual: opts.density != null }, auto };
}
// one detailed conversion under the plan: the first density whose picture stays within N, else the one closest to N
function coreUnderPlan(image, o, pre, auto) {
  const lower = auto && auto.density && o.contour === false ? AUTO_DENSITIES.filter(d => d < o.density) : [];
  let r = convertCore(image, lower.length ? { ...o, densityProbe: lower } : o, pre);
  if (r.aborted) return r;
  const tried = [{ density: o.density, n: r.points.length, over: !!r.meta.budget.over, clean: !!r.meta.clean }];
  // the densest of the lower densities at which the same structure is predicted to fit N is solved again in full (the
  // ladder may then buy finer structure with the saved dots); when none fits, the picture at the preferred density
  // stays (going over N with denser rows reads better than going over N with sparse ones)
  const at = r.meta.budget.atDensity;
  const d2 = at ? lower.find(d => at[d] <= r.meta.budget.max) : undefined;
  if (d2 !== undefined) {
    r.meta.autoWouldRetry = true;
    if (!o.probe) {
      // (a fresh segmentation: convertCore adds field figures to st.figures and marks figures)
      const t = convertCore(image, { ...o, density: d2 }, null);
      tried.push({ density: d2, n: t.points.length, over: !!t.meta.budget.over, clean: !!t.meta.clean, predicted: at[d2] });
      // (clean within N beats in N but not clean beats over N; at equal rank the denser picture stays)
      const rank = x => x.meta.budget.over ? 0 : x.meta.clean ? 2 : 1;
      if (rank(t) > rank(r)) r = t;
    }
  }
  if (at) r.meta.budget.atDensity = at;
  if (auto) r.meta.auto = { drones: auto.drones, quality: r.meta.quality, density: r.meta.density, chose: { quality: auto.quality, density: auto.density }, tried };
  return r;
}
export function convert(image, opts0 = {}) {
  const { opts, auto } = budgetPlan(opts0);
  const contMode = opts.container ?? 'keep';
  if (!CONTAINER_MODES.includes(contMode)) throw new Error(`opts.container must be one of ${CONTAINER_MODES.join(', ')}`);
  // v9: no automatic schematic (Marc: no half-baked pictures); 'schematic' only when asked for
  const style = (opts.style ?? 'auto') === 'auto' ? 'detailed' : opts.style;
  if (!STYLES.includes(style)) throw new Error(`opts.style must be one of ${STYLES.join(', ')}`);
  const seg0 = segment(image), st0 = structure(seg0, { flat: !!opts._flat });
  const W = seg0.W, H = seg0.H;
  if (!st0.figures.length) {
    const r = convertCore(image, opts, { seg: seg0, st: st0 });
    r.meta.container = { found: false, dropped: false, box: null }; r.meta.elements = []; r.meta.style = 'detailed';
    return r;
  }
  const cont = detectContainer(image, seg0, st0);
  // (the elements get a structure of their own: computeElements leaves state on the figures, findParts among it, which
  // must not reach the conversion of the same image)
  let imgE = image, segE = seg0, stE = null;
  const extra = [];
  if (cont.found && cont.regions) {
    imgE = withoutContainer(image, seg0, st0, cont); segE = segment(imgE); stE = structure(segE);
    const px = []; for (let i = 0; i < W * H; i++) if (cont.regions.has(seg0.id[i])) px.push(i);
    extra.push({ kind: 'container', box: cont.box, pixels: px });
  }
  stE ??= structure(seg0);
  const E = computeElements(segE, stE, extra);
  const ex = new Set();
  for (const p of opts.exclude || []) { if (!p || !Number.isFinite(+p.x) || !Number.isFinite(+p.y)) continue; const e = elementAt(E, W, H, +p.x, +p.y); if (e >= 0) ex.add(e); }
  const contId = extra.length ? 0 : -1;
  const drop = contId === 0 && (contMode === 'drop' || ex.has(contId));
  const excludedContainer = ex.has(contId);
  ex.delete(contId);
  let base = drop ? imgE : image, pre = drop ? { seg: segE, st: stE } : { seg: seg0, st: st0 };
  if (ex.size) { base = paintOut(base, E.pix, ex); pre = null; }
  // v9: colour groups. Every dot names the colour region of the source it lies on (points[i].cg, a region of seg0); a
  // group is erased by an anchor inside it (opts.erase, like opts.exclude): its pixels are painted out before the
  // conversion, so the ladder re-solves without it (the coloured bars of Energizer, which share one element)
  // v10 (Marc 12.11.: DigitalOcean's i-dots took the symbol's squares with them): a colour group is a connected piece of a
  // colour region, not the region (segment.mjs joins pieces of one colour across the logo). compsOf labels the pieces.
  const compCache = new Map();
  const compsOf = sg => {
    if (compCache.has(sg)) return compCache.get(sg);
    const Wd = sg.W, Hd = sg.H, lab = new Int32Array(Wd * Hd).fill(-1), area = [], rids = [];
    let n = 0;
    for (let i0 = 0; i0 < Wd * Hd; i0++) {
      if (lab[i0] >= 0 || sg.regions[sg.id[i0]].isBg) continue;
      const rid = sg.id[i0], stack = [i0]; lab[i0] = n; let a = 0;
      while (stack.length) {
        const i = stack.pop(), x = i % Wd, y = (i - x) / Wd; a++;
        for (const j of [x > 0 ? i - 1 : -1, x < Wd - 1 ? i + 1 : -1, y > 0 ? i - Wd : -1, y < Hd - 1 ? i + Wd : -1]) if (j >= 0 && lab[j] < 0 && sg.id[j] === rid) { lab[j] = n; stack.push(j); }
      }
      area.push(a); rids.push(sg.id[i0]); n++;
    }
    const out = { lab, area, rid: rids };
    compCache.set(sg, out); return out;
  };
  const regionAt = (sg, x, y) => {
    const X = Math.floor(x), Y = Math.floor(y), Wd = sg.W, Hd = sg.H, R = Math.max(3, Math.round(0.012 * Math.max(Wd, Hd)));
    let best = -1, bd = Infinity;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const u = X + dx, v = Y + dy; if (u < 0 || v < 0 || u >= Wd || v >= Hd) continue;
      const k = sg.id[v * Wd + u]; if (sg.regions[k].isBg) continue;
      const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = k; }
    }
    return best;
  };
  // the connected piece under (x, y) (or the nearest ink pixel's piece)
  const compAt = (sg, x, y) => {
    const X = Math.floor(x), Y = Math.floor(y), Wd = sg.W, Hd = sg.H, R = Math.max(3, Math.round(0.012 * Math.max(Wd, Hd))), { lab } = compsOf(sg);
    let best = -1, bd = Infinity;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const u = X + dx, v = Y + dy; if (u < 0 || v < 0 || u >= Wd || v >= Hd) continue;
      const k = lab[v * Wd + u]; if (k < 0) continue;
      const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = k; }
    }
    return best;
  };
  const erased = new Set(), removedPixels = new Uint8Array(W * H);
  if (ex.size || excludedContainer) for (let i = 0; i < W * H; i++) if (ex.has(E.pix[i]) || (excludedContainer && E.pix[i] === contId)) removedPixels[i] = 1;
  if ((opts.erase || []).length) {
    const sgB = drop ? segE : seg0, ids = new Set();
    for (const p of opts.erase) { if (!p || !Number.isFinite(+p.x) || !Number.isFinite(+p.y)) continue; const k = compAt(sgB, +p.x, +p.y); if (k >= 0) ids.add(k); }
    for (const k of ids) erased.add(k);
    // (pieces of nearly the same colour that touch an erased piece go with it: the anti-aliased rim of a bar is a piece of
    // its own, and painting out only the inside fills it back in with the rim's colour)
    if (ids.size) {
      const C = compsOf(sgB), Wd = sgB.W, N = Wd * sgB.H, near = (a, b) => { const A = sgB.regions[C.rid[a]].lab, B2 = sgB.regions[C.rid[b]].lab, d = Math.hypot(A[0] - B2[0], A[1] - B2[1], A[2] - B2[2]); return d < ERASE_JOIN || (d < ERASE_RIM && C.area[b] <= 0.5 * C.area[a]); };
      for (let pass = 0, grew = true; grew && pass < 4; pass++) {
        grew = false;
        for (let i = 0; i < N; i++) {
          const k = C.lab[i]; if (k < 0 || !ids.has(k)) continue;
          const x = i % Wd;
          for (const j of [x > 0 ? i - 1 : -1, x < Wd - 1 ? i + 1 : -1, i - Wd, i + Wd]) { if (j < 0 || j >= N) continue; const q = C.lab[j]; if (q >= 0 && !ids.has(q) && near(k, q)) { ids.add(q); grew = true; } }
        }
      }
      for (let i = 0; i < W * H; i++) if (ids.has(C.lab[i])) removedPixels[i] = 1;
      base = paintOut(base, C.lab, ids); pre = null;
    }
  }
  const timing = [], t0 = performance.now(); let tl = t0;
  const lap = what => { const t = performance.now(); timing.push({ what, ms: Math.round(t - tl) }); tl = t; };
  lap('prepare');
  // v8: crest first. The detailed over-budget ladder of a crest (10-13 s: Southampton, Arsenal) was computed and then thrown
  // away for the schematic (2-3 s). When the logo is a crest, the detailed conversion stops where the over-budget path
  // would begin; the schematic variants are tried; the detailed path runs in full only when none of them is clean
  let segB = null, stB = null;
  const schemPrep = () => { if (!segB) { segB = segment(base); stB = structure(segB); } };
  let crest = false;
  if (style === 'auto' && !opts.probe && opts.crestFirst !== false) { schemPrep(); crest = !!crestOf(segB, stB, false); }
  let r = coreUnderPlan(base, crest ? { ...opts, _abortOver: true } : opts, pre, auto), styleOut = 'detailed';
  if (r.aborted) r = null;
  lap(r ? 'detailed' + (r.meta.auto?.tried?.length > 1 ? ' x' + r.meta.auto.tried.length : '') : 'detailed (stopped: crest over budget)');
  // v7: the schematic picture of a crest (schematic.mjs): forced, or in auto mode when the detailed picture is not
  // clean within maxDrones (noise, speckle, a changed letter, or over the cap). The variant with the main charge in its
  // original detail is tried first and kept only when it is clean; then the charge as a field like the rest. In auto
  // mode the schematic picture is taken only when it is clean within maxDrones; else the detailed one stays (and may
  // overshoot)
  if (opts.probe) {
    // (would the full conversion do more than this probe? density retry, or a schematic candidate for a crest)
    const wants = style === 'schematic' || (style === 'auto' && !(r.meta.clean && !r.meta.budget.over));
    let sch = false;
    if (wants) { const segB = segment(base), stB = structure(segB); sch = !!schematicImage(base, segB, stB, { force: style === 'schematic', withCharge: false, keepText: true }); }
    r.meta.probeWouldChange = !!r.meta.autoWouldRetry || sch || ((opts.part ?? 'auto') === 'auto' && !!r.meta.budget?.over && r.meta.part === 'full'); // (v10: the mark-only retry below)
  }
  if (style === 'schematic' || (style === 'auto' && !opts.probe && !(r && r.meta.clean && !r.meta.budget.over))) {
    schemPrep();
    // (the crest's main lettering keeps its letterforms in every variant; only a label, SCH_TEXT_LABEL of the crest's ink,
    // may go in a last variant when none with it is clean)
    let label = false;
    for (const [withCharge, keepText] of [['detailed', true], ['silhouette', true], [false, true], ['detailed', false], [false, false]]) {
      if (!keepText && !label) break;
      const sc = schematicImage(base, segB, stB, { force: style === 'schematic', withCharge, keepText });
      if (!sc) break;
      if (keepText) label = sc.lettering > 0 && sc.textShare < SCH_TEXT_LABEL;
      if (withCharge && sc.charge === 'none') continue;
      lap('schematic image');
      const rs = convertCore(sc.image, { ...opts, _flat: true });
      lap(`schematic ${withCharge || 'plain'}${keepText ? '' : ' no label'}`);
      rs.meta.simplified.push(...sc.records);
      // (the charge in its detail only when it is drawn without noise: SCH_NOISE of the dots at most)
      const ok = rs.meta.clean && !rs.meta.budget.over && (withCharge !== 'detailed' || rs.meta.noise <= SCH_NOISE);
      if (auto) rs.meta.auto = { ...(r?.meta.auto || { drones: auto.drones, quality: rs.meta.quality, chose: { quality: auto.quality, density: auto.density } }), density: rs.meta.density, schematic: true };
      if (ok || (style === 'schematic' && !withCharge)) { r = rs; styleOut = 'schematic'; break; }
      if (style === 'schematic' && !keepText && !withCharge) { r = rs; styleOut = 'schematic'; break; }
    }
  }
  // (crest first, and no schematic variant is clean within the budget: the detailed over-budget path after all, on a fresh
  // segmentation, since the stopped conversion has marked the figures of pre)
  if (!r) { r = coreUnderPlan(base, opts, null, auto); lap('detailed'); }
  // v10 (Marc 12.11.: Puma at 100 drew cat and lettering, needed 204): part 'auto' takes the Bildmarke alone when the whole
  // logo does not fit N and the mark alone does (or needs clearly fewer drones). v8/v9 did this only past hardMax.
  if ((opts.part ?? 'auto') === 'auto' && !opts.probe && r && r.meta.budget?.over && r.meta.part === 'full' && r._map) {
    const m = coreUnderPlan(base, { ...opts, part: 'mark' }, null, auto);
    lap('mark only');
    if (m && m._map && m.meta.part === 'mark' && m.points.length && (!m.meta.budget.over || m.points.length <= 0.7 * r.points.length)) { m.meta.partRequested = 'auto'; m.meta.markInstead = r.points.length; r = m; }
  }
  // (everything excluded or erased: nothing to draw, an empty picture rather than an error)
  if (!r._map) { Object.assign(r.meta, { style: styleOut, elements: [], colourGroups: [], container: { found: !!cont.found, dropped: drop, box: cont.box || null } }); return r; }
  // the element of every dot: the element most of its figure's own pixels belong to
  const { fis, figs, seg } = r._map;
  const elemOf = new Map();
  const figElem = fi => {
    if (elemOf.has(fi)) return elemOf.get(fi);
    const F = figs[fi], votes = new Map();
    const own = F.field ? null : F.rid;
    for (let pass = 0; pass < 2 && !votes.size; pass++) for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) {
      if (!F.mask[y * F.w + x]) continue;
      const X = x + F.x0, Y = y + F.y0; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      if (pass === 0 && own !== null && seg.id[Y * W + X] !== own) continue;
      const e = E.pix[Y * W + X]; if (e >= 0) votes.set(e, (votes.get(e) || 0) + 1);
    }
    let best = -1, bn = 0; for (const [e, v] of votes) if (v > bn || (v === bn && e < best)) { bn = v; best = e; }
    if (best < 0) best = elementAt(E, W, H, F.x0 + F.w / 2, F.y0 + F.h / 2);
    elemOf.set(fi, best);
    return best;
  };
  r.points.forEach((p, i) => { p.e = figElem(fis[i]); });
  const cgOf = p => compAt(seg0, p.x, p.y);
  for (const p of r.points) p.cg = cgOf(p);
  // v8.5: result.resample(n) -> { points (with colours and elements), density, placements }: the same picture with n drones
  // or fewer, in milliseconds. Not serialisable (a worker keeps the result and answers resample requests itself).
  const core = r._resampleCore;
  if (core) Object.defineProperty(r, 'resample', { enumerable: false, value: n => {
    const q = core(Math.max(1, Math.round(n)));
    const points = q.pts.map(p => ({ x: +p.x.toFixed(2), y: +p.y.toFixed(2), ...q.colour(p), e: figElem(p.fi), cg: cgOf(p) }));
    const kept = filterRemoved(points, removedPixels, W, H);
    return { points: kept, density: q.density, spacing: q.exact ? +q.s.toFixed(3) : r.spacing, placements: q.placements, fits: kept.length <= n, ...(q.exact ? { exact: true, over: kept.length > n, wanted: q.wanted } : {}) };
  } });
  // v9: result.retarget(n) -> { points, density, fits, final }: the picture for another drone count on the same structure.
  // final = true when the line density it needs stays within RETARGET_BAND: then this IS the answer for n (shown as the
  // result, never replaced); otherwise the caller converts anew at n (and shows the living cloud meanwhile)
  if (core) Object.defineProperty(r, 'retarget', { enumerable: false, value: n => {
    // Retarget solves density onto n. A manual density must instead be recomputed unchanged.
    if (opts.densityManual ?? opts.density != null) return { final: false };
    const q = r.resample(n);
    // (v10 outline: the plan for n on the same outlines is the conversion's own answer, over N included)
    if (q.exact) return { ...q, final: true };
    return { ...q, final: q.fits && q.density >= RETARGET_BAND[0] && q.density <= RETARGET_BAND[1] && q.points.length >= DRONES_FLOOR * n - 1 };
  } });
  r.points = filterRemoved(r.points, removedPixels, W, H);
  const nOf = new Map(); for (const p of r.points) nOf.set(p.e, (nOf.get(p.e) || 0) + 1);
  lap('elements');
  r.meta.timing = timing;
  r.meta.style = styleOut;
  r.meta.container = { found: !!cont.found, dropped: !!cont.dropped || drop, box: cont.box || null, ...(cont.kind ? { kind: cont.kind } : {}) };
  r.meta.elements = E.list.map(e => ({ id: e.id, kind: e.kind, box: e.box, n: nOf.get(e.id) || 0, anchor: e.anchor, ...(ex.has(e.id) || (e.id === contId && drop) ? { excluded: true } : {}) }));
  // v9: the colour groups the dots lie on: { id, anchor (a pixel of the region next to its first dot), rgb, n, e }
  const cgs = new Map();
  for (const p of r.points) { if (p.cg < 0) continue; let g = cgs.get(p.cg); if (!g) { g = { id: p.cg, n: 0, e: p.e, at: p }; cgs.set(p.cg, g); } g.n++; }
  r.meta.colourGroups = [...cgs.values()].map(g => {
    const { lab } = compsOf(seg0), W0 = seg0.W, H0 = seg0.H, r = Math.ceil(0.05 * Math.max(W0, H0));
    let best = null, bd = Infinity;
    const cx = Math.floor(g.at.x), cy = Math.floor(g.at.y);
    for (let y = Math.max(0, cy - r); y <= Math.min(H0 - 1, cy + r); y++) for (let x = Math.max(0, cx - r); x <= Math.min(W0 - 1, cx + r); x++) { if (lab[y * W0 + x] !== g.id) continue; const d = (x + 0.5 - g.at.x) ** 2 + (y + 0.5 - g.at.y) ** 2; if (d < bd) { bd = d; best = { x: x + 0.5, y: y + 0.5 }; } }
    return { id: g.id, n: g.n, e: g.e, anchor: best, rgb: [g.at.r, g.at.g, g.at.b] };
  });
  r.meta.n = r.points.length; r.meta.budget.over = r.points.length > r.meta.budget.max;
  if (erased.size) r.meta.erased = erased.size;
  return r;
}
