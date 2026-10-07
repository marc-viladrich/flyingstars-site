// How drones get from one picture to the next, the way real drone shows fly: every drone takes the free place that
// keeps all flight paths shortest together (optimal assignment, no crossing swarms), all drones leave and arrive at
// the same moment (one flight time from the longest path at a capped speed), and on the way they drift with a
// divergence-free flow field, so neighbouring drones move together in streams like a flock instead of scattering.
// Pure functions without DOM, unit-tested in scripts/show-flight.test.mjs.

/**
 * Optimal assignment (Hungarian method, O(n³)) minimising the sum of squared distances.
 * from, to: flat Float64Arrays [x0, y0, z0, x1, …] of equal length. Returns Int32Array: drone i → target index.
 */
export function assign(from, to) {
  const n = from.length / 3, INF = Infinity;
  const u = new Float64Array(n + 1), v = new Float64Array(n + 1), minv = new Float64Array(n + 1);
  const p = new Int32Array(n + 1), way = new Int32Array(n + 1), used = new Uint8Array(n + 1);
  for (let i = 1; i <= n; i++) {
    p[0] = i; let j0 = 0;
    minv.fill(INF); used.fill(0);
    do {
      used[j0] = 1;
      const i0 = p[j0], ax = from[(i0 - 1) * 3], ay = from[(i0 - 1) * 3 + 1], az = from[(i0 - 1) * 3 + 2], ui = u[i0];
      let delta = INF, j1 = 0;
      for (let j = 1; j <= n; j++) {
        if (used[j]) continue;
        const k = (j - 1) * 3, dx = ax - to[k], dy = ay - to[k + 1], dz = az - to[k + 2];
        const cur = dx * dx + dy * dy + dz * dz - ui - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const out = new Int32Array(n);
  for (let j = 1; j <= n; j++) out[p[j] - 1] = j - 1;
  return out;
}

/** Flight time for the longest path: real drones fly at a capped speed, short hops still take a calm moment. */
export function flightTime(from, to, order, speed = 0.6, min = 2.4, max = 5) {
  let longest = 0;
  for (let i = 0; i < order.length; i++) {
    const a = i * 3, b = order[i] * 3;
    longest = Math.max(longest, Math.hypot(from[a] - to[b], from[a + 1] - to[b + 1], from[a + 2] - to[b + 2]));
  }
  return Math.min(max, Math.max(min, longest / speed));
}

/** Smootherstep: zero speed and zero acceleration at take-off and arrival. */
export const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));

/**
 * ABC flow (Arnold–Beltrami–Childress): a classic steady, divergence-free solution of the Euler equations. Nearby
 * points get nearly the same velocity, so a swarm sampling it moves in coherent swirling streams. Writes into out.
 */
export function flow(x, y, z, t, out) {
  const A = 1, B = 0.82, C = 0.62, s = 2.4, ph = t * 0.35;
  const X = x * s + ph, Y = y * s - ph * 0.7, Z = z * s + ph * 0.5;
  out[0] = A * Math.sin(Z) + C * Math.cos(Y);
  out[1] = B * Math.sin(X) + A * Math.cos(Z);
  out[2] = C * Math.sin(Y) + B * Math.cos(X);
  return out;
}

const tmp = [0, 0, 0];
/**
 * Position of one drone at flight progress u ∈ [0, 1] between a and b (arrays or offsets). The flow lifts the path
 * sideways in the middle of the flight only (sin πu), scaled with the distance, so arrival is exact.
 */
export function along(ax, ay, az, bx, by, bz, u, t, out) {
  const e = ease(u), x = ax + (bx - ax) * e, y = ay + (by - ay) * e, z = az + (bz - az) * e;
  const d = Math.hypot(bx - ax, by - ay, bz - az), amp = Math.sin(Math.PI * Math.min(1, Math.max(0, u))) * Math.min(0.28, 0.08 + d * 0.16);
  flow(x, y, z, t, tmp);
  out[0] = x + tmp[0] * amp; out[1] = y + tmp[1] * amp * 0.8; out[2] = z + tmp[2] * amp;
  return out;
}
