// How drones get from one picture to the next, the way real drone shows fly: every drone takes the free place that
// keeps all flight paths shortest together (optimal assignment, no crossing swarms), all drones leave and arrive at
// the same moment (one flight time from the longest path at a capped speed), and on the way they drift with a
// divergence-free flow field, so neighbouring drones move together in streams like a flock instead of scattering.
// Pure functions without DOM, unit-tested in scripts/show-flight.test.mjs.

/**
 * Optimal assignment (Hungarian method, O(n²m)) minimising the sum of squared distances, for n rows ≤ m columns.
 * from: flat [x0, y0, z0, x1, …] with n points, to: flat with m ≥ n points. Returns Int32Array: row i → column.
 */
export function assign(from, to) {
  const n = from.length / 3, m = to.length / 3, INF = Infinity;
  if (n > m) throw new Error("assign: more rows than columns");
  const u = new Float64Array(n + 1), v = new Float64Array(m + 1), minv = new Float64Array(m + 1);
  const p = new Int32Array(m + 1), way = new Int32Array(m + 1), used = new Uint8Array(m + 1);
  for (let i = 1; i <= n; i++) {
    p[0] = i; let j0 = 0;
    minv.fill(INF); used.fill(0);
    do {
      used[j0] = 1;
      const i0 = p[j0], ax = from[(i0 - 1) * 3], ay = from[(i0 - 1) * 3 + 1], az = from[(i0 - 1) * 3 + 2], ui = u[i0];
      let delta = INF, j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue;
        const k = (j - 1) * 3, dx = ax - to[k], dy = ay - to[k + 1], dz = az - to[k + 2];
        const cur = dx * dx + dy * dy + dz * dz - ui - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const out = new Int32Array(n);
  for (let j = 1; j <= m; j++) if (p[j]) out[p[j] - 1] = j - 1;
  return out;
}

/**
 * Motion limits in display units. The preview runs as a time-lapse (Marc, 7 October 2026: transitions at the pace of
 * the client's Vercel prototype): a real show takes about three times as long for the same change. What the limits
 * guarantee is the character of real flight: smooth paths, bounded speed and acceleration, no jumps.
 * show-physics.spec.ts holds every scene to them (plus a margin for the flow drift and frame jitter).
 */
export const LIMITS = { speed: 1.8, accel: 3 };

/** Flight time for the longest path, so that no drone exceeds the speed and acceleration limits on a smootherstep
 * profile (peak speed 1.875·d/T, peak acceleration 5.77·d/T²); short hops still take a calm moment. */
export function flightTime(from, to, order, min = 1.1, max = 3.2) {
  let longest = 0;
  for (let i = 0; i < order.length; i++) {
    const a = i * 3, b = order[i] * 3;
    longest = Math.max(longest, Math.hypot(from[a] - to[b], from[a + 1] - to[b + 1], from[a + 2] - to[b + 2]));
  }
  return Math.min(max, Math.max(min, (1.875 * longest) / LIMITS.speed, Math.sqrt((5.7735 * longest) / LIMITS.accel)));
}

/** Smootherstep: zero speed and zero acceleration at take-off and arrival. */
export const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));

/**
 * ABC flow (Arnold–Beltrami–Childress): a classic steady, divergence-free solution of the Euler equations. Nearby
 * points get nearly the same velocity, so a swarm sampling it moves in coherent swirling streams. Writes into out.
 */
export function flow(x, y, z, t, out) {
  const A = 1, B = 0.82, C = 0.62, s = 1.6, ph = t * 0.12;
  const X = x * s + ph, Y = y * s - ph * 0.7, Z = z * s + ph * 0.5;
  out[0] = A * Math.sin(Z) + C * Math.cos(Y);
  out[1] = B * Math.sin(X) + A * Math.cos(Z);
  out[2] = C * Math.sin(Y) + B * Math.cos(X);
  return out;
}

const tmp = [0, 0, 0];
/**
 * Position of one drone at flight progress u ∈ [0, 1] between a and b (arrays or offsets). The flow lifts the path
 * sideways in the middle of the flight only (sin² πu: zero and flat at both ends), scaled with the distance.
 */
export function along(ax, ay, az, bx, by, bz, u, t, out, scale = 1) {
  const e = ease(u), x = ax + (bx - ax) * e, y = ay + (by - ay) * e, z = az + (bz - az) * e;
  const d = Math.hypot(bx - ax, by - ay, bz - az), amp = scale * Math.sin(Math.PI * Math.min(1, Math.max(0, u))) ** 2 * Math.min(0.14, 0.04 + d * 0.07); // sin²: no sideways kick at take-off or arrival
  flow(x, y, z, t, tmp);
  out[0] = x + tmp[0] * amp; out[1] = y + tmp[1] * amp * 0.8; out[2] = z + tmp[2] * amp;
  return out;
}
