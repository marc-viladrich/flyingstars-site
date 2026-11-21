// Das FlyingStars-Logo wie in der Designsprache-Probe (ohne Ring), selbst ein Raster aus 88 Lichtpunkten. Geteilt von
// Teaser (Schärfe-Effekt 100 → 600 Drohnen, show-teaser.js) und QR-Geschichte (scenes/launch.js, Runde 16: aus dem Logo
// wird Handy mit QR-Code). Mit mehr Drohnen kommen Lichter auf die Verbindungen zwischen benachbarten Punkten
// (stufenlos): bei 100 Drohnen das Raster, bei 600 durchgehende, scharfe Linien. Farben aus den beiden Endpunkten gemischt.
import logoDots from "../../data/logo-dots.json";
import { liftColor } from "../formation/shape-core.js";

const DOTS = logoDots.dots.map(([x, y, r, g, b]) => [x, y, r, g, b]);
const EDGES = (() => {
  let d0 = Infinity;
  for (let i = 0; i < DOTS.length; i++) for (let j = i + 1; j < DOTS.length; j++) d0 = Math.min(d0, Math.hypot(DOTS[i][0] - DOTS[j][0], DOTS[i][1] - DOTS[j][1]));
  const out = [];
  for (let i = 0; i < DOTS.length; i++) for (let j = i + 1; j < DOTS.length; j++) if (Math.hypot(DOTS[i][0] - DOTS[j][0], DOTS[i][1] - DOTS[j][1]) < d0 * 1.2) out.push([i, j]);
  return out;
})();
/** Das Logo aus genau n Drohnen: [x, y, 0, r, g, b]. */
export function logoPoints(n) {
  const pts = DOTS.slice(0, n).map(([x, y, r, g, b]) => [x, y, 0, ...liftColor([r, g, b])]);
  const extra = Math.max(0, n - DOTS.length), per = Math.floor(extra / EDGES.length), more = extra - per * EDGES.length;
  EDGES.forEach(([i, j], e) => {
    // gleichmäßig verteilt: jede Kante bekommt per Lichter, die ersten `more` Kanten (über das Logo gestreut) eines mehr
    const k = per + (((e * 37) % EDGES.length) < more ? 1 : 0), a = DOTS[i], b = DOTS[j];
    for (let q = 1; q <= k; q++) { const u = q / (k + 1); pts.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, 0, ...liftColor(a.slice(2).map((v, c) => Math.round(v + (b[2 + c] - v) * u)))]); }
  });
  return pts;
}
