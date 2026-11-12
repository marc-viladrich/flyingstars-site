// v4 (point 4b): cost-aware content selection, applied to every logo before the spacing is chosen.
//
// A detailed emblem drawn with every element present comes out as speckle: ring text, small ornaments and
// shading need a much finer spacing than the silhouette, the rings and the main figure, and at any one spacing
// either they break up or they drive the dot count up for the whole picture. The rule: drawn cleanly or absent.
//
// The logo is split into element groups: text rows, and clusters of sibling figures (similar stroke and size,
// class C) standing together (a ring of letters, a row of stars); every other figure is its own element. From
// the fine reference every sample knows the coarsest spacing on the ladder at which it is still represented
// (scale.mjs, coverLadder), so the spacing a set of elements needs (the same criterion as searchScale) and the
// dots it costs (curve length / spacing) are cheap to evaluate for any subset.
// The most demanding droppable elements are removed while their presence costs more than DOT_RATIO times the
// dots of the picture without them and they are a minor part of the ink (area share below MINOR). Protected:
// the largest element, every element of at least PROTECT x its area (the main inner figure, the big letters),
// and the essential text rows (wordmark), which are judged for legibility instead (convert.mjs).
import { TAU } from './convert.mjs';
import { labDist } from './color.mjs';

const DOT_RATIO = 1.5;
const MINOR = 0.3;
const PROTECT = 0.15;

function bboxGap(a, b) {
  const gx = Math.max(a.x0 - b.x1, b.x0 - a.x1, 0), gy = Math.max(a.y0 - b.y1, b.y0 - a.y1, 0);
  return Math.hypot(gx, gy);
}

// element groups over the active figures
export function elementGroups(ctx, active) {
  const idx = [...active];
  const par = new Map(idx.map(i => [i, i]));
  const find = x => { while (par.get(x) !== x) { par.set(x, par.get(par.get(x))); x = par.get(x); } return x; };
  const uni = (a, b) => { a = find(a); b = find(b); if (a !== b) par.set(Math.max(a, b), Math.min(a, b)); };
  const byPart = new Map();
  for (const i of idx) {
    const F = ctx.figs[i];
    if (F.part && F.part.kind === 'text') { const k = F.part.index; if (byPart.has(k)) uni(i, byPart.get(k)); else byPart.set(k, i); }
  }
  for (let a = 0; a < idx.length; a++) for (let b = a + 1; b < idx.length; b++) {
    const A = ctx.figs[idx[a]], B = ctx.figs[idx[b]];
    if (A.group !== B.group) continue;
    if ((A.part && A.part.kind === 'text') || (B.part && B.part.kind === 'text')) continue;
    const ga = A.region, gb = B.region;
    const da = Math.hypot(ga.x1 - ga.x0 + 1, ga.y1 - ga.y0 + 1), db = Math.hypot(gb.x1 - gb.x0 + 1, gb.y1 - gb.y0 + 1);
    if (bboxGap(ga, gb) <= 0.6 * Math.max(da, db)) uni(idx[a], idx[b]);
  }
  // pieces of one letter or one shape: figures of (nearly) the same colour whose masks touch (a highlight in a
  // different colour on a gem is not a piece of the gem)
  for (let a = 0; a < idx.length; a++) for (let b = a + 1; b < idx.length; b++) {
    const A = ctx.figs[idx[a]], B = ctx.figs[idx[b]];
    if (find(idx[a]) === find(idx[b]) || bboxGap(A.region, B.region) > 1.5) continue;
    if (labDist(A.drawLab, B.drawLab) >= 0.12) continue;
    // only a fragment joins its body (the smaller at most a quarter of the larger), so big pieces that touch
    // (the rings of an emblem) do not chain into one element
    if (Math.min(A.area, B.area) > 0.25 * Math.max(A.area, B.area)) continue;
    if (touches(A, B)) uni(idx[a], idx[b]);
  }
  const groups = new Map();
  for (const i of idx) { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(i); }
  return [...groups.values()];
}

function touches(F, G) {
  const at = (H, x, y) => x >= H.x0 && y >= H.y0 && x < H.x0 + H.w && y < H.y0 + H.h && H.mask[(y - H.y0) * H.w + x - H.x0];
  const x0 = Math.max(F.x0, G.x0 - 1), x1 = Math.min(F.x0 + F.w, G.x0 + G.w + 1), y0 = Math.max(F.y0, G.y0 - 1), y1 = Math.min(F.y0 + F.h, G.y0 + G.h + 1);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (!at(F, x, y)) continue;
    if (at(G, x, y) || at(G, x + 1, y) || at(G, x - 1, y) || at(G, x, y + 1) || at(G, x, y - 1)) return true;
  }
  return false;
}

// a straight row of glyph-sized figures (lettering not caught as a text part: DANONE inlaid in its banner,
// EDEKA under the E, Lua in its disc). Ring text and arcs of ornaments are not straight.
function straightRow(ctx, figs) {
  if (figs.length < 3) return null;
  const c = figs.map(i => { const g = ctx.figs[i].region; return [(g.x0 + g.x1) / 2, (g.y0 + g.y1) / 2, g.y1 - g.y0 + 1, g.y1]; });
  const hs = c.map(q => q[2]).sort((a, b) => a - b), h = hs[hs.length >> 1];
  const xs = c.map(q => q[0]);
  const ext = Math.max(...xs) - Math.min(...xs);
  if (ext < 1.5 * h) return null;
  // baseline: bottoms of most glyphs within 0.25 h of the median bottom
  const bs = c.map(q => q[3]).sort((a, b) => a - b), mb = bs[bs.length >> 1];
  if (c.filter(q => Math.abs(q[3] - mb) <= 0.25 * h).length < 0.7 * c.length) return null;
  return { h };
}

function kindOf(ctx, figs, areaShare) {
  const F = ctx.figs[figs[0]];
  if (F.part && F.part.kind === 'text') return F.part.small ? 'small print' : 'text row';
  if (figs.length >= 3) return 'lettering or ornament row';
  const g = F.region;
  if (g.lab[0] > 0.85 && Math.hypot(g.lab[1], g.lab[2]) < 0.06 && g.width < 0.03 * Math.hypot(...ctx.st.logoBox.slice(2).map((v, k) => v - ctx.st.logoBox[k]))) return 'shading or highlight';
  return areaShare < 0.01 ? 'ornament' : 'detail';
}

// returns { drop: [fig indices], records: [meta.dropped entries] }
export function costAwareSelection(ctx, A, cover, active, isProtectedFig, quality) {
  const { ladder, fail } = cover;
  const K = ladder.length;
  const groups = elementGroups(ctx, active);
  const figEl = new Map();
  groups.forEach((g, e) => { for (const i of g) figEl.set(i, e); });
  const E = groups.length;
  // per element: covered weight per ladder index (suffix sums of failure indices), total weight, curve length
  const cw = Array.from({ length: E }, () => new Float64Array(K + 1)), tot = new Float64Array(E), len = new Float64Array(E);
  A.samples.forEach((p, i) => {
    const e = figEl.get(p.fi);
    if (e === undefined) return;
    tot[e] += p.w; len[e] += 2;
    cw[e][fail[i]] += p.w; // covered at every index < fail
  });
  for (let e = 0; e < E; e++) for (let k = K - 1; k >= 0; k--) cw[e][k] += cw[e][k + 1];
  // cw[e][k] now = weight covered at ladder index k-1 or beyond... shift: covered at index k <=> fail > k
  const covAt = (e, k) => cw[e][k + 1];
  const area = groups.map(g => g.reduce((t, i) => t + ctx.figs[i].area, 0));
  const scaleOf = set => {
    let T = 0; for (const e of set) T += tot[e];
    if (!T) return ladder[K - 1];
    let k = 0;
    for (let j = 1; j < K; j++) { let c = 0; for (const e of set) c += covAt(e, j); if (c / T < TAU) break; k = j; }
    return ladder[k] / quality;
  };
  const dots = set => { let L = 0; for (const e of set) L += len[e]; return L / scaleOf(set); };
  const need = groups.map((_, e) => scaleOf([e]));
  const maxArea = Math.max(...area);
  // protected: the largest element and every element of comparable area; the essential text rows; the main
  // lettering (straight rows, unless much smaller than the biggest row: a tagline); the main inner figure (the
  // largest figure drawn inside a container, and those of comparable size: the S on the Shopify bag)
  const rows = groups.map(g => {
    const p = ctx.figs[g[0]].part;
    if (p && p.kind === 'text') return p.small ? null : { h: p.h };
    return straightRow(ctx, g);
  });
  const maxRow = Math.max(0, ...rows.map(r => (r ? r.h : 0)));
  const inner = groups.map(g => Math.max(0, ...g.map(i => (ctx.figs[i].region.glyphLike ? ctx.figs[i].area : 0))));
  const maxInner = Math.max(0, ...inner);
  const crest = crestKeepers(ctx, active, groups, area);
  const prot = groups.map((g, e) => area[e] === maxArea || area[e] >= PROTECT * maxArea || g.some(isProtectedFig) || crest.has(e)
    || (rows[e] && rows[e].h >= 0.45 * maxRow) || (inner[e] > 0 && inner[e] >= 0.5 * maxInner));
  if (globalThis.__dbgSelect) groups.forEach((g, e) => { const F = ctx.figs[g[0]]; console.log('el', e, 'figs', g.length, 'need', need[e].toFixed(1), 'area', area[e], 'len', len[e], prot[e] ? 'PROT' : '', 'box', F.region.x0, F.region.y0, F.part && F.part.kind); });
  let cur = groups.map((_, e) => e);
  const drop = [], records = [];
  for (let round = 0; round < 6; round++) {
    const n0 = dots(cur), s0 = scaleOf(cur);
    let A0 = 0; for (const e of cur) A0 += area[e];
    const cand = cur.filter(e => !prot[e] && tot[e] > 0).sort((a, b) => need[a] - need[b] || a - b);
    let hit = null;
    for (let k = 1; k <= cand.length; k++) {
      const D = cand.slice(0, k), Ds = new Set(D);
      const rest = cur.filter(e => !Ds.has(e));
      if (!rest.length) break;
      let Ad = 0; for (const e of D) Ad += area[e];
      if (Ad >= MINOR * A0) break;
      const n1 = dots(rest), s1 = scaleOf(rest);
      // the element must force the spacing: dropping it only to save its own dots is not the rule
      if (n0 > DOT_RATIO * n1 && s1 >= 1.25 * s0) { hit = { D, rest, n1, s1, Ad }; break; }
    }
    if (!hit) break;
    // one record per kind and round: what went, how much ink it was, and what it would have cost
    const byKind = new Map();
    for (const e of hit.D) {
      drop.push(...groups[e]);
      const k = kindOf(ctx, groups[e], area[e] / A0);
      if (!byKind.has(k)) byKind.set(k, { elements: 0, figures: 0, area: 0, need: Infinity });
      const r = byKind.get(k); r.elements++; r.figures += groups[e].length; r.area += area[e]; r.need = Math.min(r.need, need[e]);
    }
    for (const [k, r] of byKind) records.push({ kind: k, elements: r.elements, figures: r.figures, reason: `cost: needs s=${r.need.toFixed(1)}; with it ~${Math.round(n0)} dots at s=${s0.toFixed(1)}, without ~${Math.round(hit.n1)} at s=${hit.s1.toFixed(1)}; ${(100 * r.area / A0).toFixed(1)} % of the ink` });
    cur = hit.rest;
  }
  return { drop, records };
}

// v6 (amendment 11.11.2026): the simplified version of a logo that does not fit the drone budget. Ornaments go,
// the protected elements stay (the silhouette and every element of comparable area, the main lettering, the
// main inner figure, the essential text rows: the same protection as above).
//   stage 1: ornaments only: small print, ring text and ornament rows, shading and highlights, ornaments
//            (under 1 % of the ink);
//   stage 2: every unprotected element (a crest becomes its silhouette plus its main figure and lettering).
// Returns { act: Set of the figures kept, records: entries for meta.simplified } (act === null: nothing to drop).
// straight rows of letter-like figures among the active ones, whatever their sibling group (a word of glyphs
// of mixed stroke and size, inlaid in a container: Nintendo). Returns [{ figs, h, box }].
export function letterRows(ctx, active) {
  const idx = [...active].filter(i => { const g = ctx.figs[i].region, w = g.x1 - g.x0 + 1, h = g.y1 - g.y0 + 1; return h >= 6 && w <= 2.6 * h; });
  const par = new Map(idx.map(i => [i, i]));
  const find = x => { while (par.get(x) !== x) { par.set(x, par.get(par.get(x))); x = par.get(x); } return x; };
  for (let a = 0; a < idx.length; a++) for (let b = a + 1; b < idx.length; b++) {
    const A = ctx.figs[idx[a]].region, B = ctx.figs[idx[b]].region;
    const ha = A.y1 - A.y0 + 1, hb = B.y1 - B.y0 + 1;
    if (Math.max(ha, hb) > 2.3 * Math.min(ha, hb)) continue;
    if (Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0) < 0.5 * Math.min(ha, hb)) continue;
    const gap = Math.max(A.x0, B.x0) - Math.min(A.x1, B.x1);
    if (gap > 1.2 * Math.max(ha, hb) || -gap > 0.3 * Math.min(A.x1 - A.x0 + 1, B.x1 - B.x0 + 1)) continue;
    const ra = find(idx[a]), rb = find(idx[b]); if (ra !== rb) par.set(ra, rb);
  }
  const cl = new Map();
  for (const i of idx) { const r = find(i); if (!cl.has(r)) cl.set(r, []); cl.get(r).push(i); }
  const out = [];
  // a row of letters on a common baseline, straight or gently arched (the name over a crest: PORSCHE): the
  // glyph bottoms fit a parabola within 0.25 h for 70 % of the glyphs, and the arch sags by at most one letter
  // height over the row (ring text around a badge bends far more and is not a row)
  const archRow = figs => {
    if (figs.length < 3) return null;
    const c = figs.map(i => { const g = ctx.figs[i].region; return [(g.x0 + g.x1) / 2, g.y1, g.y1 - g.y0 + 1]; });
    const h = c.map(q => q[2]).sort((a, b) => a - b)[c.length >> 1];
    const xs = c.map(q => q[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
    if (x1 - x0 < 1.5 * h) return null;
    const xm = (x0 + x1) / 2, sc = Math.max(1, (x1 - x0) / 2);
    // least squares y = a + b u + c u^2, u = (x - xm) / sc
    let S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], T = [0, 0, 0];
    for (const [x, y] of c) { const u = (x - xm) / sc, v = [1, u, u * u]; for (let r = 0; r < 3; r++) { T[r] += v[r] * y; for (let k = 0; k < 3; k++) S[r][k] += v[r] * v[k]; } }
    const det = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const D = det(S); if (Math.abs(D) < 1e-9) return straightRow(ctx, figs);
    const sol = [0, 1, 2].map(k => det(S.map((row, r) => row.map((v, j) => (j === k ? T[r] : v)))) / D);
    if (Math.abs(sol[2]) > h) return null;
    const ok = c.filter(([x, y]) => { const u = (x - xm) / sc; return Math.abs(y - (sol[0] + sol[1] * u + sol[2] * u * u)) <= 0.25 * h; }).length;
    return ok >= 0.7 * c.length ? { h } : null;
  };
  for (const all of cl.values()) {
    // the row is judged on its typical members: pieces of other shapes chained in by proximity (a band of the
    // crest beside the name) are left out by size
    const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
    const hs = all.map(i => ctx.figs[i].region.y1 - ctx.figs[i].region.y0 + 1), ws = all.map(i => ctx.figs[i].region.x1 - ctx.figs[i].region.x0 + 1);
    const mh = med(hs), mw = med(ws);
    const figs = all.filter((i, k) => hs[k] >= 0.6 * mh && hs[k] <= 1.6 * mh && ws[k] <= 2 * mw && ws[k] >= Math.max(2, 0.12 * mh));
    const row = archRow(figs);
    if (!row) continue;
    const box = [Infinity, Infinity, -Infinity, -Infinity];
    for (const i of figs) { const g = ctx.figs[i].region; box[0] = Math.min(box[0], g.x0); box[1] = Math.min(box[1], g.y0); box[2] = Math.max(box[2], g.x1); box[3] = Math.max(box[3], g.y1); }
    out.push({ figs, h: row.h, box });
  }
  return out;
}

// v6.1: lettering versus an ornament row. A group of at least four glyph-sized sibling figures is lettering
// when its pieces differ in ink area as letters do (an I beside an M; coefficient of variation >= LETTER_CV);
// a ring of stars, a frieze of rhombi or a row of identical dots does not.
export const LETTER_CV = 0.25;
// v6.1: protect ring names of crests (crestKeepers opt.name) and drop them only when the hard limit cannot draw
// them (stage 3 in convert.mjs). Off: see crestKeepers.
export const NAME_RING = false;
export function isLettering(ctx, g) {
  if (g.length < 4) return false;
  const a = g.map(i => ctx.figs[i].area), m = a.reduce((t, v) => t + v, 0) / a.length;
  const sd = Math.sqrt(a.reduce((t, v) => t + (v - m) * (v - m), 0) / a.length);
  return m > 0 && sd / m >= LETTER_CV;
}
// v6.1: what of a crest must survive its simplification: the main figure: the inlaid element nearest the centre, by area weighted with centrality (the Porsche horse,
// the Bayern centre disc), and every inlaid element of at least half its weight. With opt.name === true also
// the lettering that carries the name when the logo has no wordmark (the largest lettering group, and lettering
// of comparable glyph height). Not used by default: ring names of the crests in the released sets need 800-1900
// dots to be legible (Bayern, Chelsea, Aston Villa) and turn to speckle at the hard limit instead.
export function crestKeepers(ctx, active, groups, area, opt = {}) {
  const keep = new Set();
  const [lx0, ly0, lx1, ly1] = ctx.st.logoBox, cx = (lx0 + lx1) / 2, cy = (ly0 + ly1) / 2, R = 0.5 * Math.hypot(lx1 - lx0, ly1 - ly0);
  const hasWord = [...active].some(i => { const p = ctx.figs[i].part; return p && p.kind === 'text' && !p.small; }) && ctx.parts && ctx.parts.wordmark;
  if (!hasWord && opt.name === true) {
    const let_ = groups.map((g, e) => isLettering(ctx, g) ? e : -1).filter(e => e >= 0);
    const gh = e => { const h = groups[e].map(i => ctx.figs[i].region.y1 - ctx.figs[i].region.y0 + 1).sort((a, b) => a - b); return h[h.length >> 1]; };
    const top = let_.sort((x, y) => groups[y].length - groups[x].length || area[y] - area[x])[0];
    if (top !== undefined) for (const e of let_) if (e === top || gh(e) >= 0.7 * gh(top)) keep.add(e);
  }
  const w = groups.map((g, e) => {
    if (!g.some(i => ctx.figs[i].region.fillInto > 0)) return 0;
    let x = 0, y = 0, t = 0; for (const i of g) { const r = ctx.figs[i].region, a = ctx.figs[i].area; x += a * (r.x0 + r.x1) / 2; y += a * (r.y0 + r.y1) / 2; t += a; }
    const d = t ? Math.hypot(x / t - cx, y / t - cy) / R : 1;
    return area[e] * Math.max(0.1, 1 - d);
  });
  const mw = Math.max(0, ...w);
  if (mw > 0) w.forEach((v, e) => { if (v >= 0.5 * mw) keep.add(e); });
  return keep;
}

export function simplifyForBudget(ctx, active, isProtectedFig, stage, opt = {}) {
  // the main lettering is never an ornament: rows of letters at least 0.45 times the tallest row, and every
  // figure inside them (counters, dots), whatever element group they fell into
  const lrows = letterRows(ctx, active);
  const maxH = Math.max(0, ...lrows.map(r => r.h), ...[...active].map(i => { const p = ctx.figs[i].part; return p && p.kind === 'text' && !p.small ? p.h : 0; }));
  const letter = new Set();
  for (const r of lrows) if (r.h >= (stage < 2 ? 0.45 : 0.8) * maxH) {
    const m = 0.15 * r.h;
    for (const i of active) { const g = ctx.figs[i].region; if (g.x0 >= r.box[0] - m && g.x1 <= r.box[2] + m && g.y0 >= r.box[1] - m && g.y1 <= r.box[3] + m) letter.add(i); }
  }
  const isProt = i => isProtectedFig(i) || letter.has(i);
  const groups = elementGroups(ctx, active);
  const area = groups.map(g => g.reduce((t, i) => t + ctx.figs[i].area, 0));
  const maxArea = Math.max(...area);
  let A0 = 0; for (const a of area) A0 += a;
  const rows = groups.map(g => {
    const p = ctx.figs[g[0]].part;
    if (p && p.kind === 'text') return p.small ? null : { h: p.h };
    return straightRow(ctx, g);
  });
  const maxRow = Math.max(0, ...rows.map(r => (r ? r.h : 0)));
  const inner = groups.map(g => Math.max(0, ...g.map(i => (ctx.figs[i].region.glyphLike ? ctx.figs[i].area : 0))));
  const maxInner = Math.max(0, ...inner);
  const crest = crestKeepers(ctx, active, groups, area, opt);
  // (stage 3, opt.name === false: ring lettering that cannot be drawn within the hard limit goes, whatever else
  // would protect it as an inlay)
  const prot = groups.map((g, e) => !(opt.name === false && isLettering(ctx, g) && !g.some(isProt) && !(rows[e] && rows[e].h >= 0.45 * maxRow)) && (area[e] === maxArea || area[e] >= PROTECT * maxArea || g.some(isProt) || crest.has(e)
    || (rows[e] && rows[e].h >= 0.45 * maxRow) || (inner[e] > 0 && inner[e] >= 0.5 * maxInner)));
  const ORNAMENT = new Set(['small print', 'lettering or ornament row', 'shading or highlight', 'ornament']);
  const keep = new Set(active), byKind = new Map();
  groups.forEach((g, e) => {
    if (prot[e]) return;
    let k = kindOf(ctx, g, area[e] / A0);
    if (opt.name === false && isLettering(ctx, g)) k = 'name lettering (not drawable within the hard limit)';
    // an inlaid glyph-like figure is not a highlight (the white letters of OREO)
    if (k === 'shading or highlight' && g.some(i => ctx.figs[i].region.glyphLike)) k = 'detail';
    if (stage < 2 && !ORNAMENT.has(k)) return;
    if (opt.name === false && !/^name lettering/.test(k) && !ORNAMENT.has(k)) return; // stage 3 lets only the lettering and ornaments go
    for (const i of g) keep.delete(i);
    if (!byKind.has(k)) byKind.set(k, { elements: 0, figures: 0, area: 0 });
    const r = byKind.get(k); r.elements++; r.figures += g.length; r.area += area[e];
  });
  if (keep.size === active.size || !keep.size) return { act: null, records: [] };
  const records = [...byKind].map(([k, r]) => ({ kind: k, elements: r.elements, figures: r.figures, share: +(r.area / A0).toFixed(3), stage }));
  return { act: keep, records };
}
