import FK from "./fk.js";
// copied from formations-werkzeug/core/place.js by tools/sync-formwerk.js – edit there, then sync
// Equal-chord placement inside one edge (SPEC §6.5). Port of kernel_proto.equalChord: bisection over the chord c;
// walk(c) takes m-1 steps, each to the first point further along the polyline that leaves the disc of radius c around
// the current point (larger root of the circle/segment intersection). Node drones stay exactly on the node coordinates.
(function (FK) {
  "use strict";
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  function walk(Q, m, c) {
    const pts = [];
    let j = 0, cur = Q[0];
    for (let step = 1; step < m; step++) {
      let found = -1, ft = 0;
      for (let q = j; q < Q.length - 1; q++) {
        const b = Q[q + 1];
        if (dist(b, cur) < c) continue;
        const a = Q[q], dx = b[0] - a[0], dy = b[1] - a[1], fx = a[0] - cur[0], fy = a[1] - cur[1];
        const A = dx * dx + dy * dy, B = 2 * (fx * dx + fy * dy), C = fx * fx + fy * fy - c * c;
        if (A < 1e-30) continue;
        const t = (-B + Math.sqrt(Math.max(0, B * B - 4 * A * C))) / (2 * A);
        found = q; ft = Math.min(1, Math.max(0, t));
        break;
      }
      if (found < 0) return { pts, res: -Infinity };
      j = found;
      cur = [Q[j][0] + (Q[j + 1][0] - Q[j][0]) * ft, Q[j][1] + (Q[j + 1][1] - Q[j][1]) * ft];
      pts.push(cur);
    }
    return { pts, res: dist(Q[Q.length - 1], cur) };
  }

  // Q: open polyline from node a to node b (a loop edge has Q[0] == Q[last]); m intervals -> m-1 inner points
  function equalChord(Q, m, L) {
    if (m <= 1) return { pts: [], chord: dist(Q[0], Q[Q.length - 1]) };
    if (L === undefined) { L = 0; for (let i = 1; i < Q.length; i++) L += dist(Q[i], Q[i - 1]); }
    let lo = 0, hi = (L / m) * 1.0000001, best = null;
    for (let it = 0; it < 56; it++) {
      const c = (lo + hi) / 2, w = walk(Q, m, c);
      if (w.res > c) lo = c; else hi = c;
      if (w.pts.length === m - 1) best = { c, pts: w.pts };
    }
    if (!best) { // degenerate edge: fall back to arc-length steps
      const cum = FK.geom.cumLen(Q, false), pts = [];
      for (let k = 1; k < m; k++) pts.push(FK.geom.pointAt(Q, cum, (L * k) / m, false));
      return { pts, chord: L / m };
    }
    return { pts: best.pts, chord: best.c };
  }

  FK.place = { equalChord };
})(FK);
