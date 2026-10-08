// The customer's own text as a drone formation (Formations-Werkzeug, Flo 25.09.2026), shared by the price calculator
// and the show configurator. Drawn in the FS Einstrich font with a drone on every corner and end, equal spacing and the
// exact drone count. From 30 drones per character the letters switch to outline when that comes out clean. Long texts
// wrap onto 2–3 lines like the FS designers do. Max 80 m high.
let FK = null, engine = null;
const cache = new Map();
export const chars = (t) => Array.from(t.replace(/\s+/g, "")).length;
export function wrap(t) { // balanced lines at word breaks: 1 line up to 14 characters, 2 up to 30, else 3
  const w = t.trim().split(/\s+/).filter(Boolean), s = w.join(" ");
  const lines = s.length <= 14 || w.length < 2 ? 1 : s.length <= 30 || w.length < 3 ? 2 : 3;
  if (lines === 1) return [s];
  let best = null;
  const len = (a, b) => w.slice(a, b).join(" ").length;
  for (let i = 1; i < w.length; i++) {
    if (lines === 2) { const m = Math.max(len(0, i), len(i, w.length)); if (!best || m < best.m) best = { m, l: [w.slice(0, i).join(" "), w.slice(i).join(" ")] }; continue; }
    for (let j = i + 1; j < w.length; j++) { const m = Math.max(len(0, i), len(i, j), len(j, w.length)); if (!best || m < best.m) best = { m, l: [w.slice(0, i).join(" "), w.slice(i, j).join(" "), w.slice(j).join(" ")] }; }
  }
  return best.l;
}
export function loadTextEngine() { // the text engine is loaded only when someone needs a text (≈ 43 KB gzip)
  if (engine) return engine;
  engine = import('./pricing-text-engine.js').then((module) => { FK = module.FK; return module; });
  return engine;
}
function draw(lines, count, style) { // one formation in metres, or null when it does not come out
  // letters spaced by their closest drones, not their boxes, so W A and E H look alike (Flo 25.09.2026: "ungleichmäßig");
  // gap = at least 2 (outline 2.5) spacings or a quarter of the letter height, word gap about 2.5 times that
  const gaps = style === "outline" ? { optical: true, letterGapD: 2.5, letterGapCap: 0.25, wordGapD: 6, wordGapCap: 0.65 } : { optical: true, letterGapD: 2.0, letterGapCap: 0.25, wordGapD: 5, wordGapCap: 0.6 };
  const lay = FK.text.build(lines.join("\n"), count, Object.assign({ style, caps: true }, gaps), { spacing: 2.0 });
  if (!lay.elements.length) return null;
  const g = FK.graph.build(lay.elements, { targetN: count }), st = Object.assign({}, FK.plan.DEFAULTS, { targetN: count, spacing: 2.0 });
  let c = FK.plan.evaluate(g, count, st, false);
  if (!c.feasible && c.parity) c = FK.plan.evaluate(g, count, Object.assign({}, st, { symmetry: false }), false);
  if (!c.feasible) return null;
  return { pts: c._layout.drones.map((d) => [d.p[0] * c.s, d.p[1] * c.s, 0]), status: c.status, low: !!c.lowDensity, d: c.d_m, unknown: lay.unknown || [] };
}
export function textFormation(value, count) { // engine must be loaded (loadTextEngine)
  const lines = wrap(value), perChar = count / Math.max(1, chars(value)), key = lines.join("/") + "|" + count;
  if (cache.has(key)) return cache.get(key);
  let r = perChar >= 30 ? draw(lines, count, "outline") : null, style = "Umriss";
  if (!r || r.low || r.status === "ungleich" || r.status === "rot") { r = draw(lines, count, "stroke"); style = "Einstrich"; }
  if (!r) return null;
  // at most 80 m high at 2 m spacing: a text that would be higher keeps the drones that fit, the rest wait dimmed in a
  // grid below (like the FS spare drones under a figure) – the offer adds motifs for them
  const box = (P) => { const xs = P.map((q) => q[0]), ys = P.map((q) => q[1]); return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; };
  let b = box(r.pts), used = count;
  const drawStyle = style === "Umriss" ? "outline" : "stroke";
  for (let it = 0; b.y1 - b.y0 > 80 && it < 5; it++) {
    used = Math.max(10 * chars(value), Math.floor((used * 80) / (b.y1 - b.y0) * 0.97));
    const r2 = draw(lines, used, drawStyle);
    if (!r2) break;
    r = r2; b = box(r.pts);
  }
  const cxm = (b.x0 + b.x1) / 2, cym = (b.y0 + b.y1) / 2, w = b.x1 - b.x0, hgt = b.y1 - b.y0;
  const pts = r.pts.map((q) => [q[0] - cxm, q[1] - cym, 0]), spare = [];
  const nSpare = count - pts.length;
  if (nSpare > 0) {
    const pitch = 3, cols = Math.max(1, Math.min(nSpare, Math.floor(w / pitch) + 1)), top = -hgt / 2 - Math.max(9, 0.15 * hgt);
    for (let k = 0; k < nSpare; k++) { const row = Math.floor(k / cols), inRow = Math.min(cols, nSpare - row * cols), col = k - row * cols; spare.push([(col - (inRow - 1) / 2) * pitch, top - row * pitch, 0]); }
  }
  const out = { n: count, used: pts.length, lines, style, perChar, unknown: r.unknown, d: r.d, size: [w, hgt, 0], pts, spare };
  if (cache.size > 60) cache.clear();
  cache.set(key, out);
  return out;
}
