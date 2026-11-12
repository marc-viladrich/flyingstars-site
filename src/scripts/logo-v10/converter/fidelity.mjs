// Geometry helpers for the scale analysis (scale.mjs): depth climbing and hole keys.

function localDepth(F, x, y) {
  const lx = x - F.x0 - 0.5, ly = y - F.y0 - 0.5;
  const X = Math.max(0, Math.min(F.w - 2, Math.floor(lx))), Y = Math.max(0, Math.min(F.h - 2, Math.floor(ly)));
  const fx = Math.max(0, Math.min(1, lx - X)), fy = Math.max(0, Math.min(1, ly - Y));
  const d = F.depth, w = F.w;
  return d[Y * w + X] * (1 - fx) * (1 - fy) + d[Y * w + X + 1] * fx * (1 - fy) + d[(Y + 1) * w + X] * (1 - fx) * fy + d[(Y + 1) * w + X + 1] * fx * fy;
}

// climb the depth field from (x,y) to its ridge; returns the path (positions with depths)
function climb(F, x, y) {
  const path = [[x, y, localDepth(F, x, y)]];
  for (let it = 0; it < 400; it++) {
    const gx = localDepth(F, x + 0.7, y) - localDepth(F, x - 0.7, y), gy = localDepth(F, x, y + 0.7) - localDepth(F, x, y - 0.7);
    const gl = Math.hypot(gx, gy);
    if (gl < 1e-3) break;
    const nx = x + gx / gl, ny = y + gy / gl;
    const v = localDepth(F, nx, ny);
    if (v <= path[path.length - 1][2] + 0.05) break;
    x = nx; y = ny; path.push([x, y, v]);
  }
  return path;
}

// depth at (x,y) and half-width of the stroke there
export function climbDepth(F, x, y) { const p = climb(F, x, y); return [p[0][2], p[p.length - 1][2]]; }

// key of the hole a loop surrounds (null if the loop surrounds solid ink)
export function holeKey(ctx, F, c) {
  const x = Math.floor(c[0]), y = Math.floor(c[1]);
  const lx = x - F.x0, ly = y - F.y0;
  if (lx >= 0 && ly >= 0 && lx < F.w && ly < F.h && F.mask[ly * F.w + lx]) return null;
  if (x < 0 || y < 0 || x >= ctx.seg.W || y >= ctx.seg.H) return null;
  return F.rid + ':' + ctx.seg.id[y * ctx.seg.W + x];
}

// reference = the fine-scale dot polylines that survive the conflict pass (a boundary shared by two colour
// regions is one row at every scale, so it counts once)

export const centroid = P => { let x = 0, y = 0; for (const q of P) { x += q[0]; y += q[1]; } return [x / P.length, y / P.length]; };
