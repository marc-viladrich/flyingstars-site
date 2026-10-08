import FK from "./fk.js";
// copied from formations-werkzeug/core/geom.js by tools/sync-formwerk.js – edit there, then sync
// Geometry helpers: 2D points [x, y], polylines, arc length, projections, intersections.
(function (FK) {
  "use strict";
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  // cumulative arc length; closed adds the closing segment (cum has P.length + 1 entries then)
  function cumLen(P, closed) {
    const c = [0];
    for (let i = 1; i < P.length; i++) c.push(c[i - 1] + dist(P[i], P[i - 1]));
    if (closed && P.length > 1) c.push(c[c.length - 1] + dist(P[0], P[P.length - 1]));
    return c;
  }

  // point at arc length s (closed curves wrap around)
  function pointAt(P, cum, s, closed) {
    const L = cum[cum.length - 1];
    if (closed) s = ((s % L) + L) % L; else s = Math.max(0, Math.min(L, s));
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    const a = P[lo], b = P[(lo + 1) % P.length], seg = cum[lo + 1] - cum[lo];
    return seg > 0 ? lerp(a, b, (s - cum[lo]) / seg) : a.slice();
  }

  // re-sample a polyline to (almost) uniform arc-length steps <= step; keeps the first point
  function resample(P, closed, step) {
    const cum = cumLen(P, closed), L = cum[cum.length - 1];
    if (L === 0) return { P: [P[0].slice()], cum: [0], L: 0 };
    const n = Math.max(closed ? 3 : 1, Math.ceil(L / step));
    const out = [];
    for (let i = 0; i < (closed ? n : n + 1); i++) out.push(pointAt(P, cum, (L * i) / n, closed));
    return { P: out, cum: cumLen(out, closed), L };
  }

  // sub-polyline between arc positions s0 < s1 (closed: s1 may exceed L, wraps)
  function slice(P, cum, s0, s1, closed) {
    const L = cum[cum.length - 1], out = [pointAt(P, cum, s0, closed)];
    const n = P.length;
    // walk the original vertices strictly between s0 and s1
    for (let lap = 0; lap < 2; lap++) {
      for (let i = 0; i < cum.length - 1; i++) {
        const s = cum[i] + lap * L;
        if (s > s0 + 1e-12 && s < s1 - 1e-12) out.push(P[i % n].slice());
      }
      if (!closed) break;
    }
    out.push(pointAt(P, cum, s1, closed));
    return out;
  }

  function bbox(pts) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[0] > x1) x1 = p[0]; if (p[1] > y1) y1 = p[1]; }
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, diag: Math.hypot(x1 - x0, y1 - y0) };
  }

  // closest point on a polyline: returns { s, d, p }
  function project(P, cum, q, closed) {
    let best = { s: 0, d: Infinity, p: P[0] };
    const m = closed ? P.length : P.length - 1;
    for (let i = 0; i < m; i++) {
      const a = P[i], b = P[(i + 1) % P.length], vx = b[0] - a[0], vy = b[1] - a[1], ll = vx * vx + vy * vy;
      const t = ll > 0 ? Math.max(0, Math.min(1, ((q[0] - a[0]) * vx + (q[1] - a[1]) * vy) / ll)) : 0;
      const p = [a[0] + vx * t, a[1] + vy * t], d = dist(p, q);
      if (d < best.d) best = { s: cum[i] + t * (cum[i + 1] - cum[i]), d, p };
    }
    return best;
  }

  // proper segment intersection (excluding touching at shared endpoints handled by callers)
  function segIntersect(a, b, c, d) {
    const rx = b[0] - a[0], ry = b[1] - a[1], sx = d[0] - c[0], sy = d[1] - c[1];
    const den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-15) return null;
    const qx = c[0] - a[0], qy = c[1] - a[1];
    const t = (qx * sy - qy * sx) / den, u = (qx * ry - qy * rx) / den;
    if (t < 0 || t > 1 || u < 0 || u > 1) return null;
    return { t, u, p: [a[0] + rx * t, a[1] + ry * t] };
  }

  // closest pair in a point set, grid hash, O(n) expected; returns { d, i, j }. Exact: a pair is only guaranteed to
  // be seen when it lies in neighbouring cells, so if the best pair is longer than a cell, search again with that size.
  function closestPair(pts, cellSize) {
    const n = pts.length;
    if (n < 2) return { d: Infinity, i: -1, j: -1 };
    const b = bbox(pts), cell = Math.max(cellSize || b.diag / Math.sqrt(n), 1e-9);
    const res = closestInGrid(pts, b, cell);
    return res.d > cell && Number.isFinite(res.d) ? closestInGrid(pts, b, res.d * 1.000001) : res;
  }
  function closestInGrid(pts, b, cell) {
    const n = pts.length;
    const grid = new Map(), key = (x, y) => x + "," + y;
    pts.forEach((p, i) => {
      const gx = Math.floor((p[0] - b.x0) / cell), gy = Math.floor((p[1] - b.y0) / cell), k = key(gx, gy);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(i);
    });
    let best = { d: Infinity, i: -1, j: -1 };
    pts.forEach((p, i) => {
      const gx = Math.floor((p[0] - b.x0) / cell), gy = Math.floor((p[1] - b.y0) / cell);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const list = grid.get(key(gx + dx, gy + dy)); if (!list) continue;
        for (const j of list) if (j > i) { const d = dist(p, pts[j]); if (d < best.d) best = { d, i, j }; }
      }
    });
    if (best.i < 0) { // sparse grid fallback
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = dist(pts[i], pts[j]); if (d < best.d) best = { d, i, j }; }
    }
    return best;
  }

  // all pairs closer than r (grid hash)
  function pairsWithin(pts, r) {
    const out = [], grid = new Map(), key = (x, y) => x + "," + y;
    pts.forEach((p, i) => { const k = key(Math.floor(p[0] / r), Math.floor(p[1] / r)); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
    pts.forEach((p, i) => {
      const gx = Math.floor(p[0] / r), gy = Math.floor(p[1] / r);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const list = grid.get(key(gx + dx, gy + dy)); if (!list) continue;
        for (const j of list) if (j > i) { const d = dist(p, pts[j]); if (d < r) out.push([i, j, d]); }
      }
    });
    return out;
  }

  FK.geom = { dist, lerp, cumLen, pointAt, resample, slice, bbox, project, segIntersect, closestPair, pairsWithin };
})(FK);
