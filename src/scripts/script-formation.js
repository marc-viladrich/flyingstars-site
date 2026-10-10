// The visitor's text in a script font, as drone formation (round 11, Marc: "Druckschrift und Schreibschrift, wie in
// den Hochzeits- und Weihnachtsvideos"). Drones fly single lines, so the font is a single-stroke script: EMS Allure
// (SIL OFL 1.1, derived from Allura; see src/data/script-allure.LICENSE.txt). The points come in writing order, so a
// light can write the text stroke by stroke (u = index / n). Print lettering stays with FlyingStars' own text planner
// (text-formation.js). Pure functions, no DOM.
import font from "../data/script-allure.json";
import { sampleOutline } from "./show-geometry.js";
import { wrap } from "./text-formation.js";

const UMLAUT = { "ä": "a", "ö": "o", "ü": "u", "Ä": "A", "Ö": "O", "Ü": "U" };
const LINE = 1150; // line distance in font units

/** Catmull-Rom through the glyph's corner points: the font stores polylines, drones should draw curves. */
function soften(flat, steps = 4) {
  const p = []; for (let i = 0; i < flat.length; i += 2) p.push([flat[i], flat[i + 1]]);
  if (p.length < 3) return p;
  const out = [p[0]];
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], d = p[Math.min(p.length - 1, i + 2)];
    for (let s = 1; s <= steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((k) => 0.5 * (2 * b[k] + (-a[k] + c[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t3)));
    }
  }
  return out;
}

/** Writes one line; returns strokes in font units (y up) and the line's advance width. */
function setLine(text, y0) {
  const strokes = [];
  let x = 0;
  for (const raw of text.replace(/ß/g, "ss").replace(/[’‘]/g, "'")) {
    const ch = UMLAUT[raw] ?? raw, g = font.glyphs[ch] ?? (ch === " " ? null : font.glyphs["-"]);
    if (!g) { x += 260; continue; }
    const [adv, list] = g;
    for (const flat of list) strokes.push(soften(flat).map(([px, py]) => [x + px, y0 + py]));
    if (UMLAUT[raw]) { // two dots above the letter, drawn as tiny strokes so they are part of the writing order
      const top = raw === raw.toUpperCase() ? 760 : 470, mid = x + adv * 0.55;
      for (const dx of [-55, 55]) strokes.push([[mid + dx - 12, y0 + top], [mid + dx + 12, y0 + top + 8]]);
    }
    x += adv;
  }
  return { strokes, width: x };
}

/**
 * The text as script: n points in writing order, centred and scaled to halfWidth. Long texts wrap like the print
 * planner (1 line up to 14 characters, 2 up to 30, else 3).
 */
export function scriptFormation(value, n, halfWidth = 1) {
  const lines = wrap(value.trim() || " ").map((l, i) => setLine(l, -i * LINE));
  const widest = Math.max(...lines.map((l) => l.width), 1);
  // centre every line on its own, like a hand-set dedication
  const paths = lines.flatMap((l) => l.strokes.map((s) => ({ pts: s.map(([x, y]) => [x - l.width / 2, y]), closed: false })));
  if (!paths.length) return [];
  const pts = sampleOutline(paths, n), ys = pts.map((p) => p[1]), my = (Math.max(...ys) + Math.min(...ys)) / 2, k = (halfWidth * 2) / widest;
  return pts.map(([x, y]) => [x * k, (y - my) * k, 0]);
}

/** Initials of a text, joined with "&" (Marc: "egal ob es Namen sind oder nicht"): "Anna und Ben" → "A & B". */
export function initials(value) {
  const words = value.trim().split(/\s+|[&+,/]/).filter((w) => w && !/^(und|and|et|y|e)$/i.test(w));
  const first = words.map((w) => Array.from(w)[0].toUpperCase()).filter((c) => /\p{L}|\d/u.test(c));
  if (!first.length) return "";
  return first.length === 1 ? first[0] : `${first[0]} & ${first[1]}`;
}
