// FS heart formations from the Formations-Werkzeug (pricing-formations.js), shared by the price calculator and the show
// configurator. One step per 10 drones from 100 to 1000; each step places one or more hearts (main heart + small ones).

/** The step for about `m` drones: [drone count, step data] or null while the data is missing. */
export function heartStep(data, m) {
  const k = Math.max(100, Math.min(1000, Math.round(m / 10) * 10));
  return data && data.steps[k] ? [k, data.steps[k]] : null;
}

/** Hearts in metres, each with its slot and drones in a fixed order (x right, y up, z toward the audience). */
export function heartPicture(data, m) {
  const st = heartStep(data, m); if (!st) return null;
  const sc = st[1].scale || 1, hearts = [];
  for (const [key, x, y, turn, dz, slot] of st[1].refs) {
    const Q = data.parts[key], a = (turn * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a), pts = [];
    for (let i = 0; i < Q.length; i += 3) pts.push([((Q[i] * c - Q[i + 1] * sn + x) / 10) * sc, ((Q[i] * sn + Q[i + 1] * c + y) / 10) * sc, ((Q[i + 2] + dz) / 10) * sc]);
    hearts.push({ slot: slot || 0, pts, pivot: [(x / 10) * sc, (y / 10) * sc] });
  }
  return { n: st[0], step: st[1], hearts };
}
