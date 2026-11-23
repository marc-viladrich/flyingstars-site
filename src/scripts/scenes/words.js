import { sampleOutline, circle } from "../show-geometry.js";

export async function words(value, n, halfWidth, cx = 0, cy = 0, z = 0) {
  // vorberechnete Zahl (Wappen „125“) sofort, sonst rechnet der Textplaner im Worker (Runde 6: bis 513 ms am Stück)
  const { textFormationAsync } = await import("../text-formation.js");
  const r = await textFormationAsync(value, n);
  if (!r) return sampleOutline([circle(cx, cy, halfWidth * 0.6, 120)], n).map(([x, y]) => [x, y, z]);
  const pts = r.pts.slice(0, n), xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const k = (halfWidth * 2) / (Math.max(...xs) - Math.min(...xs)), mx = (Math.max(...xs) + Math.min(...xs)) / 2, my = (Math.max(...ys) + Math.min(...ys)) / 2;
  const out = pts.map(([x, y]) => [(x - mx) * k + cx, (y - my) * k + cy, z]);
  return out.concat(sampleOutline([circle(cx, cy, halfWidth * 1.15, 120)], n - out.length).map(([x, y]) => [x, y, z]));
}
