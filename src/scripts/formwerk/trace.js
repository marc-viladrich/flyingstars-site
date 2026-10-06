import FK from "./fk.js";
// copied from formations-werkzeug/core/trace.js by tools/sync-formwerk.js – edit there, then sync
// Contour tracing (marching squares with linear interpolation) on a scalar field: the iso line field = level becomes
// closed polylines with sub-pixel accuracy (no pixel stairs). Used for outline letters now and for images later.
(function (FK) {
  "use strict";

  // field: Float32Array (w*h, row-major, y down), inside where value > level. Returns closed contours in pixel
  // coordinates [[x, y], ...]. The border is treated as outside, so every contour closes.
  function contours(field, w, h, level) {
    const W = w + 2, H = h + 2, v = new Float32Array(W * H).fill(level - 1);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) v[(y + 1) * W + x + 1] = field[y * w + x];
    const at = (x, y) => v[y * W + x];
    // crossing point on an edge, keyed by edge id: horizontal edge (x,y)-(x+1,y) = 2*(y*W+x), vertical (x,y)-(x,y+1) = 2*(y*W+x)+1
    const pt = new Map();
    const cross = (x0, y0, x1, y1, id) => {
      if (pt.has(id)) return id;
      const a = at(x0, y0), b = at(x1, y1), t = (level - a) / (b - a || 1e-12);
      pt.set(id, [x0 + (x1 - x0) * t - 1, y0 + (y1 - y0) * t - 1]);
      return id;
    };
    const next = new Map(); // edge id -> following edge id (oriented: inside on the left)
    const link = (a, b) => next.set(a, b);
    for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
      const a = at(x, y) > level, b = at(x + 1, y) > level, c = at(x + 1, y + 1) > level, d = at(x, y + 1) > level;
      const k = (a ? 1 : 0) | (b ? 2 : 0) | (c ? 4 : 0) | (d ? 8 : 0);
      if (k === 0 || k === 15) continue;
      const T = () => cross(x, y, x + 1, y, 2 * (y * W + x));            // top
      const R = () => cross(x + 1, y, x + 1, y + 1, 2 * (y * W + x + 1) + 1); // right
      const B = () => cross(x, y + 1, x + 1, y + 1, 2 * ((y + 1) * W + x)); // bottom
      const L = () => cross(x, y, x, y + 1, 2 * (y * W + x) + 1);          // left
      switch (k) {
        case 1: link(L(), T()); break;
        case 2: link(T(), R()); break;
        case 3: link(L(), R()); break;
        case 4: link(R(), B()); break;
        case 6: link(T(), B()); break;
        case 7: link(L(), B()); break;
        case 8: link(B(), L()); break;
        case 9: link(B(), T()); break;
        case 11: link(B(), R()); break;
        case 12: link(R(), L()); break;
        case 13: link(R(), T()); break;
        case 14: link(T(), L()); break;
        case 5: case 10: { // saddle: decide by the cell centre
          const centre = (at(x, y) + at(x + 1, y) + at(x + 1, y + 1) + at(x, y + 1)) / 4 > level;
          if (k === 5) { if (centre) { link(L(), B()); link(R(), T()); } else { link(L(), T()); link(R(), B()); } }
          else { if (centre) { link(T(), L()); link(B(), R()); } else { link(T(), R()); link(B(), L()); } }
          break;
        }
      }
    }
    const out = [], used = new Set();
    for (const start of next.keys()) {
      if (used.has(start)) continue;
      const loop = [];
      let e = start;
      while (e !== undefined && !used.has(e)) { used.add(e); loop.push(pt.get(e)); e = next.get(e); }
      if (loop.length >= 3) out.push(loop);
    }
    return out;
  }

  // Douglas-Peucker for a closed polyline (keeps the two farthest points as anchors)
  function simplifyClosed(P, tol) {
    const n = P.length;
    if (n < 5) return P.slice();
    let far = 0, dmax = -1;
    for (let i = 1; i < n; i++) { const d = Math.hypot(P[i][0] - P[0][0], P[i][1] - P[0][1]); if (d > dmax) { dmax = d; far = i; } }
    const dp = (pts) => {
      const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
      const stack = [[0, pts.length - 1]];
      while (stack.length) {
        const [i0, i1] = stack.pop(), a = pts[i0], b = pts[i1], vx = b[0] - a[0], vy = b[1] - a[1], ll = vx * vx + vy * vy;
        let best = -1, bd = tol;
        for (let i = i0 + 1; i < i1; i++) {
          const q = pts[i], t = ll > 0 ? Math.max(0, Math.min(1, ((q[0] - a[0]) * vx + (q[1] - a[1]) * vy) / ll)) : 0;
          const d = Math.hypot(a[0] + vx * t - q[0], a[1] + vy * t - q[1]);
          if (d > bd) { bd = d; best = i; }
        }
        if (best > 0) { keep[best] = 1; stack.push([i0, best], [best, i1]); }
      }
      return pts.filter((_, i) => keep[i]);
    };
    const A = dp(P.slice(0, far + 1)), Bp = dp(P.slice(far).concat([P[0]]));
    return A.concat(Bp.slice(1, -1));
  }

  const area = (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };

  FK.trace = { contours, simplifyClosed, area };
})(FK);
