// Frozen copy of src-v4/segment.mjs for the depiction proxy (facet merge off unless opt.facets).
// Step 1: background, colour regions (gradient-tolerant), anti-aliasing absorption, speck removal.
import { rgbToOklab, labDist } from './color.mjs';

class UF {
  constructor(n) { this.p = new Int32Array(n); for (let i = 0; i < n; i++) this.p[i] = i; }
  find(i) { const p = this.p; while (p[i] !== i) { p[i] = p[p[i]]; i = p[i]; } return i; }
  union(a, b) { a = this.find(a); b = this.find(b); if (a !== b) { if (a < b) this.p[b] = a; else this.p[a] = b; } }
}

const STEP = 0.03;          // max OKLab step between neighbouring pixels of one region (gradients pass, AA edges do not)
const BG_DIST = 0.07;       // colour distance to the background colour that still counts as background

export function segment(img, opt = {}) {
  const { width: W, height: H, data } = img;
  const N = W * H;
  // --- background mode
  let bt = 0, bn = 0;
  const borderIdx = [];
  for (let x = 0; x < W; x++) { borderIdx.push(x, (H - 1) * W + x); }
  for (let y = 1; y < H - 1; y++) { borderIdx.push(y * W, y * W + W - 1); }
  for (const i of borderIdx) { bn++; if (data[i * 4 + 3] < 128) bt++; }
  const transparent = bt > 0.5 * bn;

  const lab = new Float32Array(N * 3);
  const bgPx = new Uint8Array(N);
  const tmp = [0, 0, 0];
  for (let i = 0; i < N; i++) {
    let r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const a = data[i * 4 + 3];
    if (transparent) {
      if (a < 96) { bgPx[i] = 1; continue; }
    } else if (a < 255) { // composite over white
      const t = a / 255; r = r * t + 255 * (1 - t); g = g * t + 255 * (1 - t); b = b * t + 255 * (1 - t);
      r = Math.round(r); g = Math.round(g); b = Math.round(b);
    }
    rgbToOklab(r, g, b, tmp);
    lab[i * 3] = tmp[0]; lab[i * 3 + 1] = tmp[1]; lab[i * 3 + 2] = tmp[2];
  }
  let bgLab = null;
  if (!transparent) {
    const hist = new Map();
    for (const i of borderIdx) {
      const k = (data[i * 4] >> 4) << 8 | (data[i * 4 + 1] >> 4) << 4 | (data[i * 4 + 2] >> 4);
      const e = hist.get(k) || { n: 0, L: 0, a: 0, b: 0 };
      e.n++; e.L += lab[i * 3]; e.a += lab[i * 3 + 1]; e.b += lab[i * 3 + 2];
      hist.set(k, e);
    }
    let best = null;
    for (const e of hist.values()) if (!best || e.n > best.n) best = e;
    bgLab = [best.L / best.n, best.a / best.n, best.b / best.n];
  }
  const pd = (i, j) => {
    const a = i * 3, b = j * 3;
    return Math.hypot(lab[a] - lab[b], lab[a + 1] - lab[b + 1], lab[a + 2] - lab[b + 2]);
  };

  // --- stable pixels: colour within STEP of all 4 neighbours (flat areas and gradients, not edges)
  const stable = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (bgPx[i]) continue;
    let ok = true;
    for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
      if (j < 0) continue;
      if (bgPx[j] || pd(i, j) >= STEP) { ok = false; break; }
    }
    stable[i] = ok ? 1 : 0;
  }
  // --- union: stable with stable, unstable with unstable (edge pixels never bridge two flat regions)
  const uf = new UF(N);
  const tryU = (i, j) => {
    if (bgPx[i] || bgPx[j]) { if (bgPx[i] && bgPx[j]) uf.union(i, j); return; }
    if (stable[i] !== stable[j]) return;
    if (pd(i, j) < STEP) uf.union(i, j);
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (x + 1 < W) tryU(i, i + 1);
    if (y + 1 < H) tryU(i, i + W);
  }
  const comp = new Int32Array(N);
  const rootId = new Int32Array(N).fill(-1);
  let K = 0;
  for (let i = 0; i < N; i++) { const r = uf.find(i); if (rootId[r] < 0) rootId[r] = K++; comp[i] = rootId[r]; }
  const cnt = new Int32Array(K), sL = new Float64Array(K), sa = new Float64Array(K), sb = new Float64Array(K);
  const cBg = new Uint8Array(K), interior = new Uint8Array(K), cStable = new Uint8Array(K);
  for (let i = 0; i < N; i++) { const c = comp[i]; cnt[c]++; sL[c] += lab[i * 3]; sa[c] += lab[i * 3 + 1]; sb[c] += lab[i * 3 + 2]; if (bgPx[i]) cBg[c] = 1; if (stable[i]) cStable[c] = 1; }
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, c = comp[i];
    if (interior[c]) continue;
    if (comp[i - 1] === c && comp[i + 1] === c && comp[i - W] === c && comp[i + W] === c && comp[i - W - 1] === c && comp[i - W + 1] === c && comp[i + W - 1] === c && comp[i + W + 1] === c) interior[c] = 1;
  }
  const mean = new Float32Array(K * 3);
  for (let c = 0; c < K; c++) { mean[c * 3] = sL[c] / cnt[c]; mean[c * 3 + 1] = sa[c] / cnt[c]; mean[c * 3 + 2] = sb[c] / cnt[c]; }
  // adjacency for thin components (mixture test)
  const adj = new Map();
  const addAdj = (a, b) => { const k = a * K + b; adj.set(k, (adj.get(k) || 0) + 1); };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, a = comp[i];
    if (x + 1 < W) { const b = comp[i + 1]; if (a !== b) { if (!cStable[a]) addAdj(a, b); if (!cStable[b]) addAdj(b, a); } }
    if (y + 1 < H) { const b = comp[i + W]; if (a !== b) { if (!cStable[a]) addAdj(a, b); if (!cStable[b]) addAdj(b, a); } }
  }
  const nbrs = new Map();
  for (const [k, v] of adj) { const a = Math.floor(k / K), b = k % K; if (!nbrs.has(a)) nbrs.set(a, []); nbrs.get(a).push([b, v]); }
  const core = new Uint8Array(K);
  const mv = c => [mean[c * 3], mean[c * 3 + 1], mean[c * 3 + 2]];
  for (let c = 0; c < K; c++) {
    if (cBg[c]) { core[c] = 1; continue; }
    if (cnt[c] < 3) continue;
    if (cStable[c]) { core[c] = 1; continue; }
    if (cnt[c] < 12) continue; // short edge fragments
    // thin: is it a mix of two neighbours?
    const nb = (nbrs.get(c) || []).filter(([b]) => !cBg[b] && cStable[b] && cnt[b] > 2).sort((p, q) => q[1] - p[1] || p[0] - q[0]).slice(0, 5);
    const C = mv(c);
    let mix = false;
    const cand = nb.map(([b]) => mv(b));
    if (!transparent && bgLab) cand.push(bgLab);
    for (let i = 0; i < cand.length && !mix; i++) for (let j = i + 1; j < cand.length && !mix; j++) {
      const A = cand[i], B = cand[j];
      const AB = [A[0] - B[0], A[1] - B[1], A[2] - B[2]], l2 = AB[0] ** 2 + AB[1] ** 2 + AB[2] ** 2;
      if (l2 < 0.06 * 0.06) continue;
      const t = ((C[0] - B[0]) * AB[0] + (C[1] - B[1]) * AB[1] + (C[2] - B[2]) * AB[2]) / l2;
      if (t < 0.06 || t > 0.94) continue;
      const res = Math.hypot(C[0] - B[0] - t * AB[0], C[1] - B[1] - t * AB[1], C[2] - B[2] - t * AB[2]);
      if (res < 0.045) mix = true;
    }
    if (!mix) core[c] = 1;
  }
  // --- absorb anti-aliasing pixels into the nearest-coloured adjacent core region
  const label = new Int32Array(N).fill(-1);
  for (let i = 0; i < N; i++) if (core[comp[i]]) label[i] = comp[i];
  let frontier = [];
  const inF = new Uint8Array(N);
  const pushNb = (i, arr) => {
    const x = i % W, y = (i - x) / W;
    if (x > 0 && label[i - 1] < 0 && !inF[i - 1]) { inF[i - 1] = 1; arr.push(i - 1); }
    if (x < W - 1 && label[i + 1] < 0 && !inF[i + 1]) { inF[i + 1] = 1; arr.push(i + 1); }
    if (y > 0 && label[i - W] < 0 && !inF[i - W]) { inF[i - W] = 1; arr.push(i - W); }
    if (y < H - 1 && label[i + W] < 0 && !inF[i + W]) { inF[i + W] = 1; arr.push(i + W); }
  };
  for (let i = 0; i < N; i++) if (label[i] >= 0) {
    const x = i % W, y = (i - x) / W;
    if ((x > 0 && label[i - 1] < 0) || (x < W - 1 && label[i + 1] < 0) || (y > 0 && label[i - W] < 0) || (y < H - 1 && label[i + W] < 0)) pushNb(i, frontier);
  }
  frontier.sort((a, b) => a - b);
  while (frontier.length) {
    const assign = new Int32Array(frontier.length);
    for (let k = 0; k < frontier.length; k++) {
      const i = frontier[k], x = i % W, y = (i - x) / W;
      let best = -1, bd = Infinity;
      const P = [lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]];
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (j < 0) continue;
        const l = label[j];
        if (l < 0) continue;
        let dd;
        if (cBg[l]) dd = transparent ? 1e3 : labDist(P, mv(l));
        else dd = labDist(P, mv(l));
        if (dd < bd || (dd === bd && l < best)) { bd = dd; best = l; }
      }
      assign[k] = best;
    }
    const next = [];
    for (let k = 0; k < frontier.length; k++) { const i = frontier[k]; label[i] = assign[k]; inF[i] = 0; }
    for (let k = 0; k < frontier.length; k++) pushNb(frontier[k], next);
    next.sort((a, b) => a - b);
    frontier = next;
  }
  for (let i = 0; i < N; i++) if (label[i] < 0) label[i] = comp[i]; // islands with no core neighbour

  // --- relabel into connected regions (labels may in theory split); merge specks
  return buildRegions({ W, H, N, lab, label, mean, cBg, transparent, bgLab, core, comp, facets: !!opt.facets });
}

function buildRegions(S) {
  const { W, H, N, label, mean, cBg, transparent, bgLab, core, comp } = S;
  // connected components of label
  const uf = new UF(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (x + 1 < W && label[i] === label[i + 1]) uf.union(i, i + 1);
    if (y + 1 < H && label[i] === label[i + W]) uf.union(i, i + W);
  }
  let reg = new Int32Array(N);
  const rid = new Int32Array(N).fill(-1);
  let R = 0;
  for (let i = 0; i < N; i++) { const r = uf.find(i); if (rid[r] < 0) rid[r] = R++; reg[i] = rid[r]; }
  const area = new Int32Array(R), srcLabel = new Int32Array(R);
  for (let i = 0; i < N; i++) { area[reg[i]]++; srcLabel[reg[i]] = label[i]; }
  // speck merge
  const minArea = Math.max(6, Math.round(N * 3e-5));
  const shared = new Map();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, a = reg[i];
    const nbs = [];
    if (x + 1 < W) nbs.push(reg[i + 1]);
    if (y + 1 < H) nbs.push(reg[i + W]);
    for (const b of nbs) if (a !== b) {
      if (area[a] < minArea) { const k = a * R + b; shared.set(k, (shared.get(k) || 0) + 1); }
      if (area[b] < minArea) { const k = b * R + a; shared.set(k, (shared.get(k) || 0) + 1); }
    }
  }
  const into = new Int32Array(R).fill(-1);
  const bestN = new Map();
  for (const [k, v] of shared) {
    const a = Math.floor(k / R), b = k % R;
    if (area[b] < minArea) continue;
    const cur = bestN.get(a);
    if (!cur || v > cur[1] || (v === cur[1] && b < cur[0])) bestN.set(a, [b, v]);
  }
  for (const [a, [b]] of bestN) into[a] = b;
  for (let i = 0; i < N; i++) if (into[reg[i]] >= 0) reg[i] = into[reg[i]];
  // merge adjacent regions of near-identical colour (a gradient split at a sharper step)
  {
    const ufr = new UF(R);
    const colOf = r => { const l = srcLabel[r]; return [mean[l * 3], mean[l * 3 + 1], mean[l * 3 + 2]]; };
    const seen = new Set();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, a = reg[i];
      for (const j of [x + 1 < W ? i + 1 : -1, y + 1 < H ? i + W : -1]) {
        if (j < 0) continue;
        const b = reg[j];
        if (a === b) continue;
        const k = a < b ? a * R + b : b * R + a;
        if (seen.has(k)) continue;
        seen.add(k);
        const la = srcLabel[a], lb = srcLabel[b];
        if (cBg[la] || cBg[lb]) { if (cBg[la] && cBg[lb]) ufr.union(a, b); continue; }
        const ca = colOf(a), cb = colOf(b), dd = labDist(ca, cb);
        const ink = c => c[0] < 0.42 && Math.hypot(c[1], c[2]) < 0.05;
        if (dd < 0.06 || (dd < 0.2 && ink(ca) && ink(cb))) ufr.union(a, b);
      }
    }
    for (let i = 0; i < N; i++) reg[i] = ufr.find(reg[i]);
  }
  // v4 (point 3): shaded and faceted marks (gradient facets of a gem, 3D shading of a stack) are one silhouette.
  // Adjacent regions of one colour family (similar hue, or both near-neutral and close in lightness) merge,
  // except across an internal edge that is both strong in contrast and long (the few facet lines that define
  // the shape). The merged region is drawn in its dominant colour (the member with the largest area).
  const facetRoot = S.facets ? facetMerge(W, H, N, reg, R, srcLabel, mean, cBg, bgLab) : new Map(); // proxy: no facet merge by default

  // final stats
  const isBgReg = r => {
    const l = srcLabel[r];
    if (cBg[l]) return true;
    if (!transparent && bgLab) return labDist([mean[l * 3], mean[l * 3 + 1], mean[l * 3 + 2]], bgLab) < BG_DIST;
    return false;
  };
  const touch = new Uint8Array(R);
  for (let x = 0; x < W; x++) { touch[reg[x]] = 1; touch[reg[(H - 1) * W + x]] = 1; }
  for (let y = 0; y < H; y++) { touch[reg[y * W]] = 1; touch[reg[y * W + W - 1]] = 1; }
  // compact ids: sky = 0
  const newId = new Int32Array(R).fill(-1);
  let K = 1;
  const alive = new Uint8Array(R);
  for (let i = 0; i < N; i++) alive[reg[i]] = 1;
  for (let r = 0; r < R; r++) if (alive[r]) { if (touch[r] && isBgReg(r)) newId[r] = 0; else newId[r] = K++; }
  const id = new Int32Array(N);
  for (let i = 0; i < N; i++) id[i] = newId[reg[i]];
  const regions = [];
  const facetLab = new Map(); // new id -> dominant colour of a merged facet group
  for (const [r, l] of facetRoot) if (alive[r] && newId[r] > 0) facetLab.set(newId[r], [mean[l * 3], mean[l * 3 + 1], mean[l * 3 + 2]]);
  for (let k = 0; k < K; k++) regions.push({ id: k, area: 0, x0: W, y0: H, x1: -1, y1: -1, isBg: k === 0, lab: [0, 0, 0], core: 0 });
  for (let r = 0; r < R; r++) if (alive[r] && newId[r] > 0) regions[newId[r]].isBg = isBgReg(r);
  const lab = S.lab;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, g = regions[id[i]];
    g.area++;
    if (x < g.x0) g.x0 = x; if (x > g.x1) g.x1 = x; if (y < g.y0) g.y0 = y; if (y > g.y1) g.y1 = y;
    if (core[comp[i]] && !S.cBg[comp[i]]) { g.lab[0] += lab[i * 3]; g.lab[1] += lab[i * 3 + 1]; g.lab[2] += lab[i * 3 + 2]; g.core++; }
  }
  for (const g of regions) {
    if (facetLab.has(g.id)) { g.lab = facetLab.get(g.id); g.facets = true; continue; }
    if (g.core) { g.lab = g.lab.map(v => v / g.core); }
    else if (g.isBg && bgLab) g.lab = bgLab.slice();
    else {
      // fallback: plain mean over all pixels
      let s = [0, 0, 0], n = 0;
      for (let y = g.y0; y <= g.y1; y++) for (let x = g.x0; x <= g.x1; x++) { const i = y * W + x; if (id[i] === g.id && !S.cBg[comp[i]]) { s[0] += lab[i * 3]; s[1] += lab[i * 3 + 1]; s[2] += lab[i * 3 + 2]; n++; } }
      g.lab = n ? s.map(v => v / n) : [1, 0, 0];
    }
  }
  return { W, H, id, regions, transparent, bgLab, pixLab: lab, bgPx: S.cBg };
}

// v4 (point 3) facet merge on the region map reg (values are region ids < R). Returns Map(root -> label of the
// dominant member) for the groups that merged.
const FACET_HUE = 25 * Math.PI / 180;   // hue difference within one colour family
const FACET_NEUTRAL_L = 0.3;            // near-neutral facets: lightness difference within one family
// an internal edge stays a facet line when it is strong and long (OKLab distance, share of the logo's diagonal):
// the two-tone facets of Ethereum (0.28, 0.23), the layers of the Redis stack (0.12, 0.75); the shading
// facets of a gold bull (0.13, short) merge
const FACET_EDGES = [[0.18, 0.15], [0.1, 0.4]];
function facetMerge(W, H, N, reg, R, srcLabel, mean, cBg, bgLab) {
  const area = new Map(), shared = new Map();
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, a = reg[i];
    area.set(a, (area.get(a) || 0) + 1);
    if (!cBg[srcLabel[a]]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    for (const j of [x + 1 < W ? i + 1 : -1, y + 1 < H ? i + W : -1]) {
      if (j < 0) continue;
      const b = reg[j];
      if (a === b) continue;
      const k = a < b ? a * R + b : b * R + a;
      shared.set(k, (shared.get(k) || 0) + 1);
    }
  }
  const diag = Math.hypot(x1 - x0 + 1, y1 - y0 + 1);
  const col = r => { const l = srcLabel[r]; return [mean[l * 3], mean[l * 3 + 1], mean[l * 3 + 2]]; };
  const uf = new UF(R);
  let any = false;
  for (const [k, v] of shared) {
    const a = Math.floor(k / R), b = k % R;
    if (cBg[srcLabel[a]] || cBg[srcLabel[b]]) continue;
    if ((area.get(a) || 0) < 12 || (area.get(b) || 0) < 12) continue;
    const ca = col(a), cb = col(b), dd = labDist(ca, cb);
    // never through the background colour or paper white (grey text -> anti-aliasing grey -> white counter
    // would chain into one region that then reads as background)
    const paper = c => (bgLab && labDist(c, bgLab) < 0.12) || (c[0] > 0.92 && Math.hypot(c[1], c[2]) < 0.04);
    if (paper(ca) || paper(cb)) continue;
    const Ca = Math.hypot(ca[1], ca[2]), Cb = Math.hypot(cb[1], cb[2]);
    let family = false;
    if (Ca >= 0.05 && Cb >= 0.05) {
      let dh = Math.abs(Math.atan2(ca[2], ca[1]) - Math.atan2(cb[2], cb[1])); if (dh > Math.PI) dh = 2 * Math.PI - dh;
      family = dh <= FACET_HUE && Math.max(Ca, Cb) <= 2.5 * Math.min(Ca, Cb);
    } else if (Ca < 0.05 && Cb < 0.05) family = Math.abs(ca[0] - cb[0]) <= FACET_NEUTRAL_L;
    if (!family) continue;
    if (FACET_EDGES.some(([c, l]) => dd >= c && v >= l * diag)) continue;
    uf.union(a, b); any = true;
  }
  const out = new Map();
  if (!any) return out;
  const best = new Map(), size = new Map();
  for (const [r, n] of area) { const g = uf.find(r); size.set(g, (size.get(g) || 0) + 1); if (!best.has(g) || n > area.get(best.get(g))) best.set(g, r); }
  for (let i = 0; i < N; i++) reg[i] = uf.find(reg[i]);
  for (const [g, n] of size) if (n > 1) out.set(g, srcLabel[best.get(g)]);
  return out;
}
