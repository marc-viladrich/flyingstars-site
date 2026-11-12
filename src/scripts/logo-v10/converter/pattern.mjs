// v6.2: dense fills that the band cannot resolve (the lozenges of Bayern, the feathers of an eagle, a field of
// small stars) are simplified as a pattern instead of being sampled into speckle.
//
// speckleClusters finds them on a build: figures (not lettering) that the build draws with at most PAT_DOTS dots,
// standing together (bounding boxes within PAT_GAP spacings), at least PAT_MIN of them. fieldFigure replaces such a
// cluster by one synthetic figure: the area the pattern covers (the union of its figures, gaps up to PAT_CLOSE
// spacings bridged, holes filled), drawn as an outline in the colour of the cluster's largest ink. The crest keeps
// its silhouette and the place and shape of the field; what is lost is the inner texture, which the band could
// only draw as noise.
import { insideDistance, sourceDistance } from './dt.mjs';

export const PAT_DOTS = 4, PAT_MIN = 5, PAT_GAP = 1.5, PAT_CLOSE = 0.35, PAT_SHARE = 0.08;

const diagOf = g => Math.hypot(g.x1 - g.x0 + 1, g.y1 - g.y0 + 1);

// b: a build (convert.mjs buildAt); act: the active figure indices; skip(fi): figures never treated as pattern
// (lettering). Returns [{ figs: [fi], dots, box: [x0, y0, x1, y1] }], largest first; only clusters holding at least
// PAT_SHARE of the build's dots count (a few tiny stars on a big mark are not speckle)
export function speckleClusters(ctx, b, act, skip = () => false) {
  const s = b.s, n = new Map();
  for (const p of b.pts) n.set(p.fi, (n.get(p.fi) || 0) + 1);
  const cand = [...act].filter(fi => !skip(fi) && (n.get(fi) || 0) <= PAT_DOTS && !ctx.figs[fi].field && diagOf(ctx.figs[fi].region) <= 6 * s);
  const par = new Map(cand.map(i => [i, i]));
  const find = x => { while (par.get(x) !== x) { par.set(x, par.get(par.get(x))); x = par.get(x); } return x; };
  for (let i = 0; i < cand.length; i++) for (let j = i + 1; j < cand.length; j++) {
    const a = ctx.figs[cand[i]].region, c = ctx.figs[cand[j]].region;
    const gx = Math.max(a.x0 - c.x1, c.x0 - a.x1, 0), gy = Math.max(a.y0 - c.y1, c.y0 - a.y1, 0);
    if (Math.hypot(gx, gy) <= PAT_GAP * s) { const ra = find(cand[i]), rb = find(cand[j]); if (ra !== rb) par.set(ra, rb); }
  }
  const groups = new Map();
  for (const fi of cand) { const r = find(fi); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(fi); }
  const out = [];
  for (const figs of groups.values()) {
    if (figs.length < PAT_MIN) continue;
    let dots = 0; const box = [Infinity, Infinity, -Infinity, -Infinity];
    for (const fi of figs) { dots += n.get(fi) || 0; const g = ctx.figs[fi].region; box[0] = Math.min(box[0], g.x0); box[1] = Math.min(box[1], g.y0); box[2] = Math.max(box[2], g.x1); box[3] = Math.max(box[3], g.y1); }
    if (dots < PAT_SHARE * b.pts.length && figs.length < 3 * PAT_MIN) continue;
    out.push({ figs, dots, box });
  }
  return out.sort((x, y) => y.dots - x.dots || y.figs.length - x.figs.length);
}

// the share of a build's dots that stand in speckle clusters
export function speckleShare(ctx, b, act, skip) {
  let d = 0; for (const c of speckleClusters(ctx, b, act, skip)) d += c.dots;
  return b.pts.length ? d / b.pts.length : 0;
}

// a synthetic figure for the field of a cluster at spacing s (appended by the caller to ctx.figs)
// colourFigs: the figures whose colour the field takes (default: all of figs; the largest by area)
export function fieldFigure(ctx, figs, s, colourFigs = figs) {
  const F0 = colourFigs.map(i => ctx.figs[i]).sort((a, b) => b.area - a.area)[0];
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const i of figs) { const F = ctx.figs[i]; bx0 = Math.min(bx0, F.x0); by0 = Math.min(by0, F.y0); bx1 = Math.max(bx1, F.x0 + F.w); by1 = Math.max(by1, F.y0 + F.h); }
  const r = PAT_CLOSE * s, pad = Math.ceil(r) + 2;
  const x0 = bx0 - pad, y0 = by0 - pad, w = bx1 - bx0 + 2 * pad, h = by1 - by0 + 2 * pad, N = w * h;
  const M = new Uint8Array(N);
  for (const i of figs) {
    const F = ctx.figs[i];
    for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) if (F.mask[y * F.w + x]) M[(y + F.y0 - y0) * w + x + F.x0 - x0] = 1;
  }
  // closing: gaps up to 2r bridged
  const dOut = sourceDistance(M, w, h);
  const D = new Uint8Array(N); for (let k = 0; k < N; k++) D[k] = dOut[k] <= r ? 1 : 0;
  const dIn = insideDistance(D, w, h);
  const M1 = new Uint8Array(N); for (let k = 0; k < N; k++) M1[k] = M[k] || dIn[k] > r ? 1 : 0;
  // holes filled: what the border cannot reach is inside
  const out = new Uint8Array(N), st = [];
  const seed = k => { if (!out[k] && !M1[k]) { out[k] = 1; st.push(k); } };
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
  while (st.length) { const k = st.pop(), x = k % w, y = (k - x) / w; if (x > 0) seed(k - 1); if (x < w - 1) seed(k + 1); if (y > 0) seed(k - w); if (y < h - 1) seed(k + w); }
  const mask = new Uint8Array(N); let area = 0;
  for (let k = 0; k < N; k++) if (!out[k]) { mask[k] = 1; area++; }
  // the largest connected piece only (the field is one shape)
  const dt = insideDistance(mask, w, h), depth = new Float32Array(N);
  let mx = 0, sd = 0, per = 0, mxk = 0;
  for (let k = 0; k < N; k++) if (mask[k]) { depth[k] = Math.max(0.01, dt[k] - 0.5); sd += depth[k] + 0.5; if (depth[k] > mx) { mx = depth[k]; mxk = k; } const x = k % w; if (x === 0 || x === w - 1 || k < w || k >= N - w || !mask[k - 1] || !mask[k + 1] || !mask[k - w] || !mask[k + w]) per++; }
  let fx0 = Infinity, fy0 = Infinity, fx1 = -Infinity, fy1 = -Infinity;
  for (let k = 0; k < N; k++) if (mask[k]) { const x = k % w, y = (k - x) / w; fx0 = Math.min(fx0, x + x0); fy0 = Math.min(fy0, y + y0); fx1 = Math.max(fx1, x + x0); fy1 = Math.max(fy1, y + y0); }
  const md = sd / Math.max(1, area);
  const g0 = F0.region;
  const region = { ...g0, x0: fx0, y0: fy0, x1: fx1, y1: fy1, width: 2 * md, maxDepth: mx, area, fillArea: area, glyphLike: false, knockout: false, inlay: false, inlayRow: false, fillers: g0.fillInto > 0 ? [g0.fillInto] : [], field: true };
  const F = {
    ...F0, rid: -1, x0, y0, w, h, mask, depth, area, drawLab: F0.drawLab, ownColour: false, region,
    blob: true, mainBlob: true, touching: false, nbFigs: [], nbDist: undefined, container: false, inlaidLetter: false, _mono: undefined,
    elong: area / (16 * md * md), maxDepth: mx, perim: 0.9 * per, c2: 1, hwThick: mx + 0.5, partMin: Math.min(fx1 - fx0 + 1, fy1 - fy0 + 1), simplePart: true,
    weight: Math.max(...figs.map(i => ctx.figs[i].weight ?? 1)), group: { hw: md, maxDepth: mx, size: 1 }, unit: undefined,
    field: { figs: figs.slice() },
  };
  return F;
}

// v6.2: noise of a build, per figure. A figure is drawn as noise when most of its dots are not on a row the eye
// can follow: dots in pieces of at most NOISE_PIECE linked dots (a lozenge drawn as 2 dots, a feather as 3), or
// anchors (corners, junctions, ends) crowded within NOISE_ANCHOR spacings of another anchor of the same figure (a
// jagged outline drawn corner to corner). Single dots by design (tiny figures, the dot of an i) and lettering do
// not count. Returns { share, figs: Map(fi -> noisy dots), missing: [fi] } where missing are the figures of act
// large enough to show (area >= s^2) that the build does not draw at all (cleaned away as illegible).
export const NOISE_PIECE = 4, NOISE_ANCHOR = 1.8, NOISE_FIG = 0.4;
export function noiseOf(ctx, b, act, skip = () => false) {
  const s = b.s, byFig = new Map();
  for (const p of b.pts) { if (!byFig.has(p.fi)) byFig.set(p.fi, []); byFig.get(p.fi).push(p); }
  // pieces: dots linked by the eye along their rows
  const par = new Map(b.pts.map(p => [p, p]));
  const find = x => { while (par.get(x) !== x) { par.set(x, par.get(par.get(x))); x = par.get(x); } return x; };
  for (const sg of b.segs) { const a = sg[0], c = sg[1]; if (a === c || Math.hypot(c.x - a.x, c.y - a.y) > 2.2 * s * (b.alongMax || 1)) continue; const ra = find(a), rc = find(c); if (ra !== rc) par.set(ra, rc); }
  const size = new Map(); for (const p of b.pts) { const r = find(p); size.set(r, (size.get(r) || 0) + 1); }
  const figs = new Map(); let noisy = 0;
  for (const [fi, P] of byFig) {
    const F = ctx.figs[fi], g = F.region;
    if (skip(fi) || F.field || P.length < 3 || Math.hypot(g.x1 - g.x0 + 1, g.y1 - g.y0 + 1) <= 2.5 * s) continue;
    const anchors = P.filter(p => p.kind === 'corner' || p.kind === 'node');
    let k = 0;
    for (const p of P) {
      if (size.get(find(p)) <= NOISE_PIECE) { k++; continue; }
      if ((p.kind === 'corner' || p.kind === 'node') && anchors.some(q => q !== p && Math.hypot(q.x - p.x, q.y - p.y) <= NOISE_ANCHOR * s)) k++;
    }
    if (k >= NOISE_FIG * P.length) { figs.set(fi, k); noisy += k; }
  }
  const missing = [...act].filter(fi => !byFig.has(fi) && !skip(fi) && !ctx.figs[fi].field && ctx.figs[fi].area >= s * s);
  return { share: b.pts.length ? noisy / b.pts.length : 0, figs, missing };
}

// the noisy figures of a build grouped with the undrawn figures among them (bounding boxes within PAT_GAP
// spacings); each group becomes one field. Returns [[fi, ...], ...]
export function noiseClusters(ctx, b, noise) {
  const s = b.s, list = [...noise.figs.keys(), ...noise.missing];
  const par = new Map(list.map(i => [i, i]));
  const find = x => { while (par.get(x) !== x) { par.set(x, par.get(par.get(x))); x = par.get(x); } return x; };
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = ctx.figs[list[i]].region, c = ctx.figs[list[j]].region;
    const gx = Math.max(a.x0 - c.x1, c.x0 - a.x1, 0), gy = Math.max(a.y0 - c.y1, c.y0 - a.y1, 0);
    if (Math.hypot(gx, gy) <= PAT_GAP * s) { const ra = find(list[i]), rb = find(list[j]); if (ra !== rb) par.set(ra, rb); }
  }
  const groups = new Map();
  for (const fi of list) { const r = find(fi); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(fi); }
  // a group needs at least one noisy figure (undrawn figures alone are handled by the clean-or-absent pass)
  return [...groups.values()].filter(g => g.some(fi => noise.figs.has(fi)));
}
