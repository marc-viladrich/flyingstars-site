// v7: the schematic picture of a dense emblem (DESIGN.md, feedback on v6.2, row 2).
//
// A crest is recognised by its outer shape and its few large colour fields, not by its internals. The schematic picture
// redraws the crest as flat colour fields: every pixel of the crest's silhouette takes the colour class of its
// neighbourhood (a majority filter over the crest's colour classes, radius SCH_R of the crest's diagonal), and every
// field holding less than SCH_MIN of the crest's area is merged into the neighbour it shares the longest border with.
// The converter then draws that image like any other: each field by its outline in its own colour, a boundary between two
// fields once (the narrower field owns it, or the two rows merge in the conflict pass), the silhouette as the outer
// edge of the outer fields. The main charge (the inlaid element nearest the centre, by area and centrality) can be
// pasted back in its original detail (variant 'detailed charge'); the caller keeps that variant only when it is drawn
// cleanly. Lettering outside the crest stays as it is.
import { findParts } from './parts.mjs';
import { letterRows } from './select.mjs';
import { labDist } from './color.mjs';
import { sourceDistance } from './dt.mjs';

// SCH_TEXT: lettering of the crest at least this share of its height keeps its own letterforms (Everton's name, the
// letters of American Express): the majority filter would melt them
// (keepText false: a label under SCH_TEXT_LABEL of the crest's ink may go like any other detail, when the picture with it
// is not clean: the name arched over Lamborghini's shield; the caller decides)
export const SCH_TEXT = 0.1, SCH_TEXT_LABEL = 0.09, SCH_R = 0.012, SCH_MIN = 0.02, SCH_THIN = 0.6, SCH_CLASS = 0.13, SCH_DENSE = 6, SCH_INK = 0.5;

function rootOf(regions, id) { let g = regions[id]; while (g.parent > 0) g = regions[g.parent]; return g; }

// the crest of a logo: the largest shape part, when it is dense (SCH_DENSE figures or more) and holds SCH_INK of the
// ink. force: the largest shape part whatever it holds (opts.style 'schematic'), else the whole logo
export function crestOf(seg, st, force = false) {
  const figs = st.figures;
  if (!figs.length) return null;
  for (const F of figs) F.root = rootOf(seg.regions, F.rid).id;
  const parts = findParts({ seg, st, figs });
  let ink = 0; for (const F of figs) ink += F.area;
  const shapes = parts.all.filter(p => p.kind === 'shape').sort((a, b) => b.w * b.h - a.w * a.h);
  let P = shapes[0] || null;
  const members = p => new Set(p.members.map(m => m.id));
  const figsOf = p => { const m = members(p); return figs.filter(F => m.has(F.root)); };
  if (P) {
    const fp = figsOf(P), a = fp.reduce((t, F) => t + F.area, 0);
    if (!force && (fp.length < SCH_DENSE || a < SCH_INK * ink)) return null;
    return { roots: members(P), box: [P.x0, P.y0, P.x1, P.y1], figs: fp };
  }
  if (!force) return null;
  const roots = new Set(figs.map(F => F.root));
  const [x0, y0, x1, y1] = st.logoBox;
  return { roots, box: [x0, y0, x1, y1], figs };
}

// the main charge of a crest: the inlaid figure with the largest area x centrality (as select.mjs crestKeepers)
// (a charge is a figure on the crest, not one of its fields: its filled outline holds SCH_CHARGE of the crest's area)
export const SCH_CHARGE = [0.05, 0.35];
function mainCharge(st, crest, crestArea) {
  const [x0, y0, x1, y1] = crest.box, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = 0.5 * Math.hypot(x1 - x0, y1 - y0);
  let best = null, bw = 0, area = 0;
  for (const F of crest.figs) area += F.area;
  for (const F of crest.figs) {
    const g = F.region;
    if (!(g.fillInto > 0 || g.parent > 0) || g.parent === 0) continue;
    if (g.fillArea < SCH_CHARGE[0] * crestArea || g.fillArea > SCH_CHARGE[1] * crestArea) continue;
    const d = Math.hypot((g.x0 + g.x1) / 2 - cx, (g.y0 + g.y1) / 2 - cy) / R;
    const w = F.area * Math.max(0.1, 1 - d);
    if (w > bw) { bw = w; best = F; }
  }
  return best;
}

// returns { image, records, fields, charge } or null when there is no crest. withCharge: 'detailed' pastes the main
// charge back in its original detail, 'silhouette' keeps it as a field of its own (its filled outline in its colour,
// whatever its size), false lets it go like any other detail
export function schematicImage(image, seg, st, { force = false, withCharge = false, keepText = true } = {}) {
  const crest = crestOf(seg, st, force);
  if (!crest) return null;
  const { W, H, id, regions } = seg, N = W * H, { data } = image;
  // the silhouette: the crest's root regions with everything inside them
  const S = new Uint8Array(N);
  const rootId = new Int32Array(regions.length).fill(-1);
  for (const g of regions) if (g.id) rootId[g.id] = rootOf(regions, g.id).id;
  for (let i = 0; i < N; i++) { const r = id[i]; if (r && crest.roots.has(rootId[r])) S[i] = 1; }
  // (holes of the silhouette that are background are inside the crest too)
  {
    const out = new Uint8Array(N), stck = [];
    const seed = i => { if (!out[i] && !S[i]) { out[i] = 1; stck.push(i); } };
    for (let x = 0; x < W; x++) { seed(x); seed((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1); }
    while (stck.length) { const i = stck.pop(), x = i % W, y = (i - x) / W; if (x > 0) seed(i - 1); if (x < W - 1) seed(i + 1); if (y > 0) seed(i - W); if (y < H - 1) seed(i + W); }
    for (let i = 0; i < N; i++) if (!out[i]) S[i] = 1;
  }
  let crestArea = 0; for (let i = 0; i < N; i++) crestArea += S[i];
  if (!crestArea) return null;
  // colour classes: regions by colour (largest first); transparent / background pixels are the ground class 0
  const cls = new Int32Array(N).fill(-1);
  const classes = [{ lab: null, rgb: [0, 0, 0], ground: true, n: 0 }];
  const regCls = new Int32Array(regions.length).fill(-1);
  const order = regions.filter(g => g.id).sort((a, b) => b.area - a.area);
  for (const g of order) {
    if (g.isBg && seg.transparent) { regCls[g.id] = 0; continue; }
    let k = classes.findIndex((c, j) => j > 0 && labDist(c.lab, g.lab) < SCH_CLASS);
    if (k < 0) { k = classes.length; classes.push({ lab: g.lab, sum: [0, 0, 0], n: 0 }); }
    regCls[g.id] = k;
  }
  for (let i = 0; i < N; i++) {
    if (!S[i]) continue;
    const k = data[i * 4 + 3] < 96 ? 0 : Math.max(0, regCls[id[i]]);
    cls[i] = k;
    const c = classes[k]; c.n++;
    if (k) { c.sum[0] += data[i * 4]; c.sum[1] += data[i * 4 + 1]; c.sum[2] += data[i * 4 + 2]; }
  }
  for (const c of classes) if (c.sum && c.n) c.rgb = c.sum.map(v => Math.round(v / c.n));
  const K = classes.length;
  // majority filter inside the silhouette (box window, summed-area table per class)
  const [bx0, by0, bx1, by1] = crest.box;
  const r = Math.max(2, Math.round(SCH_R * Math.hypot(bx1 - bx0, by1 - by0)));
  const sat = [];
  for (let k = 0; k < K; k++) {
    const t = new Int32Array((W + 1) * (H + 1));
    for (let y = 0; y < H; y++) { let row = 0; for (let x = 0; x < W; x++) { row += cls[y * W + x] === k ? 1 : 0; t[(y + 1) * (W + 1) + x + 1] = t[y * (W + 1) + x + 1] + row; } }
    sat.push(t);
  }
  const box = (t, x0, y0, x1, y1) => t[(y1 + 1) * (W + 1) + x1 + 1] - t[y0 * (W + 1) + x1 + 1] - t[(y1 + 1) * (W + 1) + x0] + t[y0 * (W + 1) + x0];
  const lab2 = new Int32Array(N).fill(-1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!S[i]) continue;
    const x0 = Math.max(0, x - r), x1 = Math.min(W - 1, x + r), y0 = Math.max(0, y - r), y1 = Math.min(H - 1, y + r);
    let best = cls[i], bn = -1;
    for (let k = 0; k < K; k++) { const v = box(sat[k], x0, y0, x1, y1); if (v > bn || (v === bn && k === cls[i])) { bn = v; best = k; } }
    lab2[i] = best;
  }
  // opening per class: the parts of a field thinner than 2 r (a trim along the silhouette, a hairline, a thin stalk)
  // go to the field next to them; the silhouette itself does not change
  {
    const edge = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (lab2[i] < 0) continue;
      const x = i % W, y = (i - x) / W;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) if (j < 0 || lab2[j] !== lab2[i]) { edge[i] = 1; break; }
    }
    const dIn = sourceDistance(edge, W, H);
    const keep = new Uint8Array(N);
    for (let k = 0; k < K; k++) {
      const src = new Uint8Array(N); let any = false;
      for (let i = 0; i < N; i++) if (lab2[i] === k && dIn[i] > SCH_THIN * r) { src[i] = 1; any = true; }
      if (!any) continue;
      const d = sourceDistance(src, W, H);
      for (let i = 0; i < N; i++) if (lab2[i] === k && d[i] <= SCH_THIN * r + 1) keep[i] = 1;
    }
    // removed pixels take the class of the nearest kept pixel (breadth first from the kept ones)
    let front = []; for (let i = 0; i < N; i++) if (keep[i]) front.push(i);
    const lab3 = Int32Array.from(lab2); for (let i = 0; i < N; i++) if (lab2[i] >= 0 && !keep[i]) lab3[i] = -2;
    while (front.length) {
      const next = [];
      for (const i of front) { const x = i % W, y = (i - x) / W; for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) if (j >= 0 && lab3[j] === -2) { lab3[j] = lab3[i]; next.push(j); } }
      front = next;
    }
    let lost = 0; for (let i = 0; i < N; i++) if (lab3[i] === -2) lost++;
    if (lost < N) for (let i = 0; i < N; i++) lab2[i] = lab3[i] === -2 ? lab2[i] : lab3[i];
  }
  // fields: connected pieces of one class; the small ones go to the neighbour with the longest common border
  const records = [];
  for (let round = 0; round < 40; round++) {
    const comp = new Int32Array(N).fill(-1), sizes = [], ks = [];
    for (let s0 = 0; s0 < N; s0++) {
      if (lab2[s0] < 0 || comp[s0] >= 0) continue;
      const c = sizes.length, k = lab2[s0], st2 = [s0]; comp[s0] = c; let n = 0;
      while (st2.length) { const i = st2.pop(); n++; const x = i % W, y = (i - x) / W; for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) if (j >= 0 && comp[j] < 0 && lab2[j] === k) { comp[j] = c; st2.push(j); } }
      sizes.push(n); ks.push(k);
    }
    // fields too small (under SCH_MIN of the crest) or too thin (no point deeper than SCH_THIN r from another field or
    // the outside: a trim along the silhouette, which the majority filter keeps because the outside has no vote)
    const edge = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (comp[i] < 0) continue;
      const x = i % W, y = (i - x) / W;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) if (j < 0 || comp[j] !== comp[i]) { edge[i] = 1; break; }
    }
    const dEdge = sourceDistance(edge, W, H), thick = new Float32Array(sizes.length);
    for (let i = 0; i < N; i++) if (comp[i] >= 0 && dEdge[i] > thick[comp[i]]) thick[comp[i]] = dEdge[i];
    const isSmall = j => sizes[j] < SCH_MIN * crestArea || thick[j] < SCH_THIN * r;
    // all such fields of this round, smallest first, each merged into its longest-border neighbour
    const small = sizes.map((n, j) => j).filter(isSmall).sort((a, b) => sizes[a] - sizes[b]);
    if (!small.length || small.length === sizes.length) break;
    const border = new Map();
    for (let i = 0; i < N; i++) {
      const a = comp[i]; if (a < 0 || !isSmall(a)) continue;
      const x = i % W, y = (i - x) / W;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (j < 0) continue; const b = comp[j]; if (b < 0 || b === a) continue;
        let m = border.get(a); if (!m) border.set(a, m = new Map()); m.set(b, (m.get(b) || 0) + 1);
      }
    }
    const into = new Map();
    for (const a of small) {
      const m = border.get(a); if (!m) continue;
      // (into a field that stays, when there is one)
      let b = -1, bn = 0; for (const [q, v] of m) if (v > bn || (v === bn && !isSmall(q) && isSmall(b))) { bn = v; b = q; }
      { let b2 = -1, n2 = 0; for (const [q, v] of m) if (!isSmall(q) && v > n2) { n2 = v; b2 = q; } if (b2 >= 0) b = b2; }
      if (b < 0) continue;
      let t = b; while (into.has(t)) t = into.get(t);
      if (t === a) continue;
      into.set(a, t);
      if (classes[ks[a]] && ks[a] !== ks[t]) records.push({ k: ks[a], share: sizes[a] / crestArea });
    }
    if (!into.size) break;
    for (let i = 0; i < N; i++) { const a = comp[i]; if (a >= 0 && into.has(a)) { let t = into.get(a); while (into.has(t)) t = into.get(t); lab2[i] = ks[t]; } }
  }
  const ch = withCharge ? mainCharge(st, crest, crestArea) : null;
  // (the main charge as a field of its own: its filled outline in its own colour)
  const chFill = ch ? (() => {
    const g = ch.region, inCh = new Uint8Array(N);
    for (let y = g.y0; y <= g.y1; y++) for (let x = g.x0; x <= g.x1; x++) { const i = y * W + x; if (id[i] === g.id) inCh[i] = 1; }
    const o2 = new Uint8Array(N), st3 = [];
    const seed = i => { if (!o2[i] && !inCh[i]) { o2[i] = 1; st3.push(i); } };
    for (let x = 0; x < W; x++) { seed(x); seed((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1); }
    while (st3.length) { const i = st3.pop(), x = i % W, y = (i - x) / W; if (x > 0) seed(i - 1); if (x < W - 1) seed(i + 1); if (y > 0) seed(i - W); if (y < H - 1) seed(i + W); }
    for (let i = 0; i < N; i++) o2[i] = o2[i] ? 0 : 1;
    return o2;
  })() : null;
  if (ch && withCharge === 'silhouette') { const k = Math.max(1, regCls[ch.rid]); for (let i = 0; i < N; i++) if (chFill[i] && S[i]) lab2[i] = k; }
  // the picture: fields in their class colour, ground transparent, everything outside the crest as it was
  const out = new Uint8ClampedArray(N * 4);
  for (let i = 0; i < N; i++) {
    if (S[i]) { const k = lab2[i]; if (k > 0) out.set([...classes[k].rgb, 255], i * 4); continue; }
    const g = regions[id[i]];
    if (id[i] === 0 || g.isBg || (bx0 <= i % W && i % W <= bx1 && by0 <= Math.floor(i / W) && Math.floor(i / W) <= by1 && rootId[id[i]] >= 0 && crest.roots.has(rootId[id[i]]))) continue;
    out.set(data.subarray(i * 4, i * 4 + 4), i * 4);
  }
  let charge = 'none';
  if (ch && withCharge === 'silhouette') charge = 'silhouette';
  if (ch && withCharge === 'detailed') {
    // the charge in its original detail: its own pixels and everything inside its outline
    for (let i = 0; i < N; i++) if (chFill[i]) { if (data[i * 4 + 3] < 96 || regions[id[i]].isBg) out.set([0, 0, 0, 0], i * 4); else out.set(data.subarray(i * 4, i * 4 + 4), i * 4); }
    charge = 'detailed';
  }
  // the crest's main lettering in its original pixels (each letter with everything inside its outline)
  let lettering = 0, textShare = 0;
  {
    const ctxL = { seg, st, figs: st.figures };
    const idx = new Set(crest.figs.map(F => st.figures.indexOf(F)));
    const crestH = by1 - by0 + 1;
    const rows = letterRows(ctxL, idx).filter(r => r.figs.length >= 3 && r.h >= SCH_TEXT * crestH);
    const textParts = (st.figures[0] && st.figures.some(F => F.part)) ? st.figures.filter(F => idx.has(st.figures.indexOf(F)) && F.part && F.part.kind === 'text' && !F.part.small && F.part.h >= SCH_TEXT * crestH) : [];
    let letters = new Set([...rows.flatMap(r => r.figs.map(i => st.figures[i])), ...textParts]);
    let la = 0, ca = 0; for (const F of letters) la += F.area; for (const F of crest.figs) ca += F.area;
    textShare = la / Math.max(1, ca);
    if (!keepText) letters = new Set();
    for (const F of letters) {
      const g = F.region;
      const inL = new Uint8Array((g.x1 - g.x0 + 3) * (g.y1 - g.y0 + 3)), w = g.x1 - g.x0 + 3, h = g.y1 - g.y0 + 3;
      // filled outline of the letter within its box (one pixel of margin)
      const o = new Uint8Array(w * h), stk = [];
      const own = (x, y) => { const X = x + g.x0 - 1, Y = y + g.y0 - 1; return X >= 0 && Y >= 0 && X < W && Y < H && id[Y * W + X] === g.id; };
      const seed = k => { const x = k % w, y = (k - x) / w; if (!o[k] && !own(x, y)) { o[k] = 1; stk.push(k); } };
      for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
      for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
      while (stk.length) { const k = stk.pop(), x = k % w, y = (k - x) / w; if (x > 0) seed(k - 1); if (x < w - 1) seed(k + 1); if (y > 0) seed(k - w); if (y < h - 1) seed(k + w); }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (o[y * w + x]) continue;
        const X = x + g.x0 - 1, Y = y + g.y0 - 1, i = Y * W + X;
        if (data[i * 4 + 3] < 96 || regions[id[i]].isBg) out.set([0, 0, 0, 0], i * 4); else out.set(data.subarray(i * 4, i * 4 + 4), i * 4);
      }
      lettering++;
    }
  }
  // what the schematic left out, by colour (one record per colour)
  const byK = new Map(); for (const e of records) byK.set(e.k, (byK.get(e.k) || 0) + e.share);
  const fieldsLeft = new Set(); for (let i = 0; i < N; i++) if (S[i] && lab2[i] > 0) fieldsLeft.add(lab2[i]);
  const recs = [{ kind: 'schematic: outline and large colour fields', fields: fieldsLeft.size, charge, lettering, stage: 'schematic' }];
  for (const [k, sh] of byK) if (k > 0) recs.push({ kind: 'detail below the field size', colour: classes[k].rgb, share: +sh.toFixed(3), stage: 'schematic' });
  return { image: { width: image.width, height: image.height, data: out }, records: recs, charge, crestBox: crest.box, lettering, textShare };
}
