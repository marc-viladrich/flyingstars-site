import FK from "./fk.js";
// copied from formations-werkzeug/core/typing.js by tools/sync-formwerk.js – edit there, then sync
// Corner typing at drone scale (SPEC §6.1, adapted): the turn at arc position s is the angle between the chords
// P(s-h)->P(s) and P(s)->P(s+h) with h = 0.5 * d_ref. At drone scale a small rounding still reads as a corner and a
// tiny wiggle does not. Peaks of the turn profile are candidate nodes; they snap to exact source vertices (anchors).
(function (FK) {
  "use strict";
  const DEG = 180 / Math.PI;

  function turnAt(P, cum, closed, s, h) {
    const L = cum[cum.length - 1];
    let hh = h;
    if (!closed) { hh = Math.min(h, s, L - s); if (hh < 0.2 * h) return null; }
    const a = FK.geom.pointAt(P, cum, s - hh, closed), b = FK.geom.pointAt(P, cum, s, closed), c = FK.geom.pointAt(P, cum, s + hh, closed);
    const ux = b[0] - a[0], uy = b[1] - a[1], vx = c[0] - b[0], vy = c[1] - b[1];
    const nu = Math.hypot(ux, uy), nv = Math.hypot(vx, vy);
    if (nu < 1e-12 || nv < 1e-12) return 0;
    return Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (nu * nv)))) * DEG;
  }

  // path: { P, cum, closed, anchorS: [arc positions of exact source vertices] }
  // returns peaks [{ s, tau }] with tau >= minTau, at least h apart
  function detect(path, h, minTau = 20) {
    const { P, cum, closed } = path, L = cum[cum.length - 1];
    if (L <= 0) return [];
    const step = Math.max(Math.min(h / 6, L / 24), L / 20000);
    const n = closed ? Math.max(3, Math.round(L / step)) : Math.max(2, Math.floor(L / step) + 1);
    const ds = closed ? L / n : L / (n - 1);
    const tau = new Array(n);
    for (let i = 0; i < n; i++) tau[i] = turnAt(P, cum, closed, i * ds, h);
    const win = Math.max(1, Math.round(h / ds));
    const at = (i) => (closed ? tau[((i % n) + n) % n] : i < 0 || i >= n ? null : tau[i]);
    const isPeak = new Array(n).fill(false);
    for (let i = 0; i < n; i++) {
      const t = tau[i];
      if (t === null || t < minTau) continue;
      let ok = true;
      for (let k = -win; k <= win && ok; k++) { if (!k) continue; const v = at(i + k); if (v !== null && v > t + 1e-9) ok = false; }
      isPeak[i] = ok;
    }
    // plateaus: runs of peak samples with (almost) the same value -> middle of the run
    const raw = [];
    const seen = new Array(n).fill(false);
    for (let i = 0; i < n; i++) {
      if (!isPeak[i] || seen[i]) continue;
      let j = i;
      const t0 = tau[i];
      seen[i] = true;
      while (true) {
        const nj = closed ? (j + 1) % n : j + 1;
        if (nj === i || (!closed && nj >= n) || !isPeak[nj] || Math.abs(tau[nj] - t0) > 0.5) break;
        seen[nj] = true; j = nj;
      }
      let len = j - i; if (len < 0) len += n;
      if (closed && len >= n - 1) continue; // the whole loop is one plateau (circle): no peak
      let mid = i + len / 2; if (closed) mid %= n;
      raw.push({ s: mid * ds, tau: t0 });
    }
    // parabolic refinement is not needed: peaks snap to anchors or keep the sample position
    raw.sort((a, b) => b.tau - a.tau || a.s - b.s);
    const out = [];
    const sep = (a, b) => { let d = Math.abs(a - b); if (closed) d = Math.min(d, L - d); return d; };
    for (const r of raw) if (!out.some((o) => sep(o.s, r.s) < h)) out.push(r);
    // snap to exact source vertices
    const anchors = path.anchorS || [];
    for (const o of out) {
      let best = null;
      for (const s of anchors) { const d = sep(s, o.s); if (d <= h / 2 && (!best || d < best.d)) best = { s, d }; }
      if (best) { o.s = best.s; o.tau = turnAt(P, cum, closed, o.s, h) ?? o.tau; o.anchor = true; }
    }
    out.sort((a, b) => a.s - b.s);
    return out;
  }

  // 5° histogram of candidate turns, the threshold and the widest empty gap touching it
  function histogram(taus, thresholdDeg) {
    const bins = new Array(36).fill(0);
    for (const t of taus) bins[Math.min(35, Math.floor(t / 5))]++;
    let gap = null;
    const sorted = taus.slice().sort((a, b) => a - b);
    const edges = [20].concat(sorted, [180]);
    for (let i = 0; i + 1 < edges.length; i++) {
      const lo = edges[i], hi = edges[i + 1];
      if (hi - lo < 5) continue;
      if (thresholdDeg >= lo - 1e-9 && thresholdDeg <= hi + 1e-9 && (!gap || hi - lo > gap[1] - gap[0])) gap = [lo, hi];
    }
    const bin = Math.min(35, Math.floor(thresholdDeg / 5));
    const splitsSimilar = sorted.some((t) => t < thresholdDeg && t > thresholdDeg - 5) && sorted.some((t) => t >= thresholdDeg && t < thresholdDeg + 5);
    return { bins, gap, bin, splitsSimilar };
  }

  FK.typing = { turnAt, detect, histogram };
})(FK);
