import FK from "./fk.js";
// copied from formations-werkzeug/core/allocate.js by tools/sync-formwerk.js – edit there, then sync
// Exact minimax allocation (SPEC §6.4). Edges e with arc lengths L[e]; find integers m_e >= 1, equal inside each
// group (mirror partners), with sum m_e = T, minimising max(L_e/m_e) / min(L_e/m_e). null = impossible (parity, T < E).
// Port of formation-research\kernel-inventory\proto_allocate.js (two-pointer sweep over candidate spacings) with an
// inlined reachability DP instead of the require() fallback, the [R9] k-range restriction and a feasibility-checked fill.
(function (FK) {
  "use strict";

  function buildGroups(E, groups) {
    const inG = new Array(E).fill(-1), G = [];
    for (const g of groups || []) {
      const gg = g.filter((e) => e >= 0 && e < E && inG[e] < 0);
      if (!gg.length) continue;
      gg.forEach((e) => (inG[e] = G.length));
      G.push(gg);
    }
    for (let e = 0; e < E; e++) if (inG[e] < 0) { inG[e] = G.length; G.push([e]); }
    return G;
  }

  // can sum_g w_g * k_g == T with k_g in [lo_g, hi_g] ?
  function reachable(r, w, T) {
    let sLo = 0, sHi = 0;
    for (let g = 0; g < r.length; g++) { sLo += w[g] * r[g][0]; sHi += w[g] * r[g][1]; }
    if (T < sLo || T > sHi) return false;
    let small = true;
    for (const x of w) if (x > 2) { small = false; break; }
    if (small) {
      // weights 1 and 2: every offset in range is reachable if a weight-1 group has slack, else only even offsets
      for (let g = 0; g < r.length; g++) if (w[g] === 1 && r[g][1] > r[g][0]) return true;
      return (T - sLo) % 2 === 0;
    }
    const D = T - sLo;
    let reach = new Uint8Array(D + 1);
    reach[0] = 1;
    for (let g = 0; g < r.length; g++) {
      const span = r[g][1] - r[g][0];
      if (!span) continue;
      const nx = new Uint8Array(D + 1);
      for (let s = 0; s <= D; s++) if (reach[s]) for (let k = 0; k <= span && s + w[g] * k <= D; k++) nx[s + w[g] * k] = 1;
      reach = nx;
    }
    return reach[D] === 1;
  }

  function solve(L, T, G, w, kMin, kMax) {
    const ranges = (t, u) => {
      const r = [];
      for (let g = 0; g < G.length; g++) {
        let lo = kMin[g], hi = kMax[g];
        for (const e of G[g]) { lo = Math.max(lo, Math.ceil(L[e] / u - 1e-9)); hi = Math.min(hi, Math.floor(L[e] / t + 1e-9)); }
        if (lo > hi) return null;
        r.push([lo, hi]);
      }
      return r;
    };
    const C = [];
    for (let g = 0; g < G.length; g++) for (const e of G[g]) for (let k = kMin[g]; k <= kMax[g]; k++) C.push(L[e] / k);
    C.sort((a, b) => a - b);
    const U = C.filter((v, i) => i === 0 || v - C[i - 1] > 1e-12);
    if (!U.length) return null;
    let best = null, j = U.length - 1;
    for (let i = U.length - 1; i >= 0; i--) {
      const t = U[i];
      if (j < i) j = i;
      const rTop = ranges(t, U[U.length - 1]);
      if (!rTop || !reachable(rTop, w, T)) continue;
      while (j > i) { const r = ranges(t, U[j - 1]); if (r && reachable(r, w, T)) j--; else break; }
      const r = ranges(t, U[j]);
      if (!r || !reachable(r, w, T)) continue;
      const ratio = U[j] / t;
      if (!best || ratio < best.ratio - 1e-12) best = { ratio, r };
      if (best.ratio < 1 + 1e-12) break;
    }
    if (!best) return null;
    // fill inside the optimal band: start at lo, always add to the group with the largest spacing that keeps T reachable
    const r = best.r, k = r.map((x) => x[0]);
    let s = k.reduce((a, v, g) => a + w[g] * v, 0);
    const order = () => G.map((_, g) => g).sort((a, b) => L[G[b][0]] / k[b] - L[G[a][0]] / k[a] || a - b);
    while (s < T) {
      let done = false;
      for (const g of order()) {
        if (k[g] >= r[g][1] || s + w[g] > T) continue;
        const test = r.map((x, h) => [h === g ? k[h] + 1 : k[h], x[1]]);
        if (!reachable(test, w, T)) continue;
        k[g]++; s += w[g]; done = true; break;
      }
      if (!done) return null; // cannot happen when the band was reachable
    }
    const m = new Array(L.length);
    G.forEach((g, gi) => g.forEach((e) => (m[e] = k[gi])));
    const sp = m.map((v, e) => L[e] / v);
    return { m, ratio: Math.max(...sp) / Math.min(...sp) };
  }

  // Second pass: the minimax band is set by the worst edges (often a fixed short link between two Pflichtpunkte);
  // inside it, move single drones between groups of equal weight while the sum of squared log deviations from the
  // mean spacing drops and the spread stays within `slack` of the optimum. Keeps the count exact.
  function refine(L, T, G, w, m0, ratio, slack) {
    const k = G.map((g) => m0[g[0]]), Lg = G.map((g) => L[g[0]]);
    const c = L.reduce((a, b) => a + b, 0) / T, cap = ratio * slack + 1e-12;
    const cost = (g, kk) => w[g] * kk * Math.log(Lg[g] / kk / c) ** 2;
    const spreadWith = (a, b) => {
      let lo = Infinity, hi = 0;
      for (let g = 0; g < G.length; g++) { const kk = k[g] + (g === a ? -1 : 0) + (g === b ? 1 : 0); for (const e of G[g]) { const v = L[e] / kk; if (v < lo) lo = v; if (v > hi) hi = v; } }
      return hi / lo;
    };
    for (let it = 0; it < 400; it++) {
      let best = null;
      for (let a = 0; a < G.length; a++) {
        if (k[a] <= 1) continue;
        const da = cost(a, k[a] - 1) - cost(a, k[a]);
        for (let b = 0; b < G.length; b++) {
          if (a === b || w[a] !== w[b]) continue;
          const gain = da + cost(b, k[b] + 1) - cost(b, k[b]);
          if (gain < -1e-12 && (!best || gain < best.gain) && spreadWith(a, b) <= cap) best = { a, b, gain };
        }
      }
      if (!best) break;
      k[best.a]--; k[best.b]++;
    }
    const m = new Array(L.length);
    G.forEach((g, gi) => g.forEach((e) => (m[e] = k[gi])));
    const sp = m.map((v, e) => L[e] / v);
    return { m, ratio: Math.max(...sp) / Math.min(...sp) };
  }

  function allocate(L, T, groups, opts) {
    // edges fixed to one interval (bridges across stroke ends) are taken out of the optimisation
    if (opts && opts.fixedOne && opts.fixedOne.length) {
      const fx = new Set(opts.fixedOne), keep = L.map((_, i) => i).filter((i) => !fx.has(i));
      if (!keep.length) return T === L.length ? { m: L.map(() => 1), ratio: 1 } : null;
      const idx = new Map(keep.map((e, i) => [e, i]));
      const g2 = (groups || []).map((grp) => grp.filter((e) => idx.has(e)).map((e) => idx.get(e))).filter((grp) => grp.length > 1);
      const r = allocate(keep.map((i) => L[i]), T - fx.size, g2, Object.assign({}, opts, { fixedOne: null }));
      if (!r) return null;
      const m = L.map(() => 1);
      keep.forEach((e, i) => (m[e] = r.m[i]));
      return { m, ratio: r.ratio };
    }
    const E = L.length;
    if (!E) return T === 0 ? { m: [], ratio: 1 } : null;
    const G = buildGroups(E, groups), w = G.map((g) => g.length);
    if (w.reduce((a, b) => a + b, 0) > T) return null;
    const cbar = L.reduce((a, b) => a + b, 0) / T;
    const full = () => solve(L, T, G, w, G.map(() => 1), G.map(() => T));
    // [R9] restricted k ranges [L/(3c), 3L/c] first; exact whenever the optimum spread is < 3
    const kMin = G.map((g) => Math.max(1, ...g.map((e) => Math.floor(L[e] / (3 * cbar)))));
    const kMax = G.map((g, gi) => Math.max(kMin[gi], Math.min(T, ...g.map((e) => Math.ceil((3 * L[e]) / cbar)))));
    let res = solve(L, T, G, w, kMin, kMax);
    if (!res || res.ratio >= 3) { const f = full(); if (f && (!res || f.ratio < res.ratio - 1e-12)) res = f; }
    if (res && !(opts && opts.refine === false)) res = refine(L, T, G, w, res.m, res.ratio, (opts && opts.slack) || 1.02);
    return res;
  }

  // reference: exhaustive DP over (t, U) pairs, identical optimum; used by the tests as oracle
  function allocateDP(L, T, groups) {
    const E = L.length, G = buildGroups(E, groups), w = G.map((g) => g.length);
    if (w.reduce((a, b) => a + b, 0) > T) return null;
    const cand = [];
    for (let e = 0; e < E; e++) for (let k = 1; k <= T; k++) cand.push(L[e] / k);
    cand.sort((a, b) => a - b);
    const uniq = cand.filter((v, i) => i === 0 || v - cand[i - 1] > 1e-12);
    const feasible = (t, U) => {
      const ranges = [];
      for (const g of G) {
        let lo = 1, hi = Infinity;
        for (const e of g) { lo = Math.max(lo, Math.ceil(L[e] / U - 1e-9)); hi = Math.min(hi, Math.floor(L[e] / t + 1e-9)); }
        if (lo > hi) return null;
        ranges.push([lo, hi, g.length]);
      }
      let reach = new Map([[0, []]]);
      for (const [lo, hi, wg] of ranges) {
        const nx = new Map();
        for (const [s, ks] of reach) for (let k = lo; k <= hi && s + wg * k <= T; k++) if (!nx.has(s + wg * k)) nx.set(s + wg * k, ks.concat(k));
        reach = nx;
        if (!reach.size) return null;
      }
      return reach.get(T) || null;
    };
    let best = null;
    for (let i = uniq.length - 1; i >= 0; i--) {
      const t = uniq[i];
      let lo = i, hi = uniq.length - 1;
      if (!feasible(t, uniq[hi])) continue;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (feasible(t, uniq[mid])) hi = mid; else lo = mid + 1; }
      const ratio = uniq[lo] / t;
      if (!best || ratio < best.ratio - 1e-12) best = { ratio, ks: feasible(t, uniq[lo]) };
      if (best.ratio < 1 + 1e-9) break;
    }
    if (!best) return null;
    const m = new Array(E);
    G.forEach((g, gi) => g.forEach((e) => (m[e] = best.ks[gi])));
    return { m, ratio: best.ratio };
  }

  FK.allocate = { allocate, allocateDP, reachable };
})(FK);
