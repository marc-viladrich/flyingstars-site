import { evenSubset } from "../show-geometry.js";
import { sway } from "../show-motion.js";

let figure;
export const loadFigure = () => (figure ||= fetch("/media/projekte/bokkenrijders/formation.json").then((r) => { if (!r.ok) throw new Error(`Formation HTTP ${r.status}`); return r.json(); }).catch((e) => { figure = null; throw e; }));

async function devil(n) {
  const data = await loadFigure(), mx = Math.max(...data.dots.map((d) => Math.max(Math.abs(d[0]), Math.abs(d[1]))));
  return evenSubset(data.dots.map(([x, y, r, g, b, , z]) => [x / mx, y / mx, (z ?? 0) / mx, ...(r + g + b === 0 ? [70, 70, 70] : [r, g, b])]), n);
}
/** Fixed customer formation: keep its source resolution; unused drones wait offstage, never duplicate dots. */
export async function devilBeat(n, caption, hold) {
  const pts = await devil(n);
  return { pts, offstageDrones: n - pts.length, caption, ...(hold ? { hold } : {}), live: (b, j, t, o) => {
    if (b[3] > 200 && b[4] > 100) o[3] = 0.8 + 0.5 * Math.abs(Math.sin(t * 1.5));
    sway(o, t, 0.35);
  } };
}
