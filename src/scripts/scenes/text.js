import { t as message } from '../../i18n/ui.mjs';
// The visitor's own text as the finale of the show (round 11, Marc: "Ich kann meinen eigenen Text da reinschreiben und
// er erscheint dort direkt" – the wow effect of the client's Vercel prototype, now not a static lettering).
// Three styles: Druckschrift (FlyingStars' own text planner), Schreibschrift (single-stroke script), Initialen
// ("A & B" in script, framed). The package decides how the text lives:
//   SPARK   the text stands, light breathes over it
//   HORIZON light writes the text stroke by stroke, then the letters glow in a slow colour wave, an ornament twinkles
//           and the whole lettering floats a little (sink and return, like the sled in the Leipzig shows)
//   ODYSSEY the living cloud → written by light → the letters swing as a wave in 3D inside a turning ring of light → the text
//           becomes the other script or its initials, framed
import { loadTextEngine, textFormation } from "../text-formation.js";
import { scriptFormation, initials } from "../script-formation.js";
import { sampleOutline, circle, heartOutline } from "../show-geometry.js";
import { WARM, GOLD, PINK, CYAN, VIOLET, TAU, paint, mix, hash, smooth, frac, part, act, sparkle, breathe, yaw, pitch, share, reveal, wander, lightRank } from "../show-motion.js";

const WIDTH = 1.25; // half width of the lettering in scene units
// Vierzehnte Fassung (Marc, 30.10.2026): Der Text zeichnet sich aus dem Nichts. Alle Drohnen stehen dunkel, dann leuchten
// sie nacheinander in Schreibreihenfolge auf (lightRank: ein Weg von Punkt zu nächstem Nachbarn; die Hilbert-Reihenfolge
// ließ den Schein quadrantenweise springen), danach wandert ein sanfter Schein über die Buchstaben. Die Haltezeit ist
// kürzer (vorher 9 s): Der Text-Durchlauf zeigt drei Schriften nacheinander, mit 9 s dauerte er in SPARK rund 30 s.
const HOLD = 3.2; // nach dem Schreiben
const writeTime = (label) => 0.8 + 0.12 * Array.from(label).length; // etwa eine Zehntelsekunde je Zeichen
/** Licht des Textes: erst aus dem Nichts geschrieben, danach ein wandernder Schein. */
const textLight = (u, tt, write, delay = 0.3) => (tt < delay + write + 0.6 ? reveal(u, tt, write, { delay }) : wander(u, tt - delay - write - 0.6, 5.5, 0.3));

/** Fünfzehnte Fassung (Marc): Der Schriftzug FLYINGSTARS steht wie im Logo ohne Querstrich im A. Der Textplaner hat
 * dafür die Glyphe „Λ“ (U+039B, formwerk/font.js); wer „FlyingStars“ tippt, bekommt sie in der Druckschrift. */
export const brandText = (value) => String(value).replace(/flying\s*stars/gi, "FLYINGST\u039BRS");

/** Print lettering from FlyingStars' planner, centred, k points (planner spare drones join the lettering's line). */
async function print(value, k, halfWidth = WIDTH) {
  await loadTextEngine();
  const r = textFormation(brandText(value), k);
  if (!r) return null;
  const pts = r.pts.slice(0, k), xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const s = (halfWidth * 2) / Math.max(1e-6, Math.max(...xs) - Math.min(...xs)), mx = (Math.max(...xs) + Math.min(...xs)) / 2, my = (Math.max(...ys) + Math.min(...ys)) / 2;
  const out = pts.map(([x, y]) => [(x - mx) * s, (y - my) * s, 0]);
  // drones the planner did not need: a fine line under the lettering (a dedication's underline)
  const bottom = Math.min(...out.map((p) => p[1]));
  return out.concat(sampleOutline([{ pts: [[-halfWidth * 0.7, bottom - 0.16], [halfWidth * 0.7, bottom - 0.16]], closed: false }], k - out.length).map(([x, y]) => [x, y, 0]));
}

/** Points of the text in a style; the order is the writing order (script) or left to right (print). Exportiert für das
 * Startseiten-Showreel (Logo mit Schriftzug, show-teaser.js). */
export async function lettering(value, style, k, halfWidth = WIDTH) {
  if (style === "initials") return scriptFormation(initials(value) || value, k, halfWidth * 0.62);
  if (style === "script") return scriptFormation(value, k, halfWidth);
  const p = await print(value, k, halfWidth);
  return p ? p.sort((a, b) => a[0] - b[0]) : scriptFormation(value, k, halfWidth);
}

/** The ornament that goes with an occasion: hearts for a wedding, stars otherwise; two small ones flank the text. */
function ornament(occasion, k, halfWidth, top) {
  const small = (cx, cy, s, m) => (occasion === "hochzeit"
    ? heartOutline(Math.max(12, m)).slice(0, m).map(([x, y]) => [cx + (x / 16) * s, cy + (y / 16) * s, 0])
    : sampleOutline([{ pts: Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * TAU, r = i % 2 ? 0.42 : 1; return [cx + Math.sin(a) * r * s, cy + Math.cos(a) * r * s]; }) }], m).map(([x, y]) => [x, y, 0]));
  const [a, b] = share(k, [1, 1]);
  return [...small(-halfWidth - 0.28, top, 0.2, a), ...small(halfWidth + 0.28, top, 0.2, b)];
}
/** The frame of the initials: a heart for a wedding, a circle otherwise. */
const frame = (occasion, k, r) => (occasion === "hochzeit"
  ? heartOutline(k < 160 ? k : 159).concat([]).slice(0, k).map(([x, y]) => [(x / 16) * r * 1.15, (y / 16) * r * 1.15 + 0.08, 0])
  : sampleOutline([circle(0, 0, r, 160)], k).map(([x, y]) => [x, y, 0]));

const height = (pts) => { const ys = pts.map((p) => p[1]); return Math.max(...ys) - Math.min(...ys); };

/** The text motif for one package. version: { value, style, occasion }. */
export async function textScene(n, caption, version, pkg) {
  const { value, style = "script", occasion = "" } = version;
  const label = style === "initials" ? initials(value) : value;
  if (pkg === "SPARK") {
    const write = writeTime(label);
    if (style === "initials") {
      const [t, f] = share(n, [3, 2]), letters = await lettering(value, style, t), rank = lightRank(letters), pts = [...paint(letters, WARM), ...paint(frame(occasion, f, 0.95), occasion === "hochzeit" ? PINK : GOLD)];
      const frameRank = lightRank(pts.slice(t));
      return { beats: [{ pts, caption, hold: write + HOLD, live: (b, j, tt, o) => { o[3] = j < t ? textLight(rank[j], tt, write) : textLight(frameRank[j - t], tt, write * 0.8, 0.3 + write * 0.5); } }] };
    }
    const letters = await lettering(value, style, n), rank = lightRank(letters);
    return { beats: [{ pts: paint(letters, WARM), caption, hold: write + HOLD, live: (b, j, tt, o) => { o[3] = textLight(rank[j], tt, write); } }] };
  }

  if (pkg === "HORIZON") {
    const [t, d] = share(n, [5, 1]), text = await lettering(value, style, t), h = height(text), rank = lightRank(text);
    const deco = style === "initials" ? frame(occasion, d, 0.95) : ornament(occasion, d, WIDTH, h / 2 + 0.08);
    const colour = (p) => mix(WARM, occasion === "hochzeit" ? PINK : GOLD, 0.15);
    const pts = [...paint(text, colour), ...paint(deco, occasion === "hochzeit" ? PINK : GOLD)];
    const write = writeTime(label);
    return { beats: [{ pts, caption, hold: write + HOLD + 1, live: (b, j, tt, o) => {
      // the lettering floats: it sinks a little and comes back, and drifts sideways at another pace
      o[1] += -0.035 * (0.5 - 0.5 * Math.cos((tt * TAU) / 9)); o[0] += 0.03 * Math.sin((tt * TAU) / 11);
      if (j < t) o[3] = textLight(rank[j], tt, write);
      else o[3] = tt < write + 0.3 ? reveal(0, tt, 1, { delay: write + 0.3 - 0.4 }) : sparkle(j, tt, 0.8, 1.35); // the ornament lights up once the text is written
    } }] };
  }

  // ODYSSEY: a short story in acts
  const R = 0.55; // ring share
  const [t, r] = share(n, [3.2, 1]), text = await lettering(value, style, t), h = height(text);
  const ringPts = (k, rad) => Array.from({ length: k }, (_, i) => { const a = (i / k) * TAU; return [Math.cos(a) * rad, Math.sin(a) * rad * 0.32, Math.sin(a) * rad]; });
  const ring = ringPts(r, WIDTH + 0.35), ringColour = (p) => mix(GOLD, occasion === "hochzeit" ? PINK : VIOLET, (p[2] + 1.6) / 3.2);
  const other = style === "initials" ? "script" : "initials";
  const second = await lettering(value, other === "initials" && !initials(value) ? "script" : other, t, other === "initials" ? WIDTH : WIDTH);
  const write = writeTime(label), rank = lightRank(text), rank2 = lightRank(second);
  const end = other === "initials" ? frame(occasion, r, 0.95) : ringPts(r, WIDTH + 0.35);
  return { beats: [
    act([part("text", paint(text, WARM)), part("ring", paint(ring.map(([x, y, z]) => [x * 0.98, y, z]), ringColour))], { caption: message('showConfigurator.lightWritesYourText'), hold: 1.6 + write, cloud: true, live: (b, j, tt, o) => {
      if (j < t) o[3] = reveal(rank[j], tt, write, { delay: 0.2 });
      else { yaw(o, tt * 0.35); o[3] = tt < write ? reveal(0, tt, 1, { delay: write - 0.6 }) : sparkle(j, tt, 0.85, 1.35); }
    } }),
    act([part("text", paint(text, WARM)), part("ring", paint(ring, ringColour))], { caption: message('text.theLettersSwayIn3d'), hold: 5, live: (b, j, tt, o) => {
      const k = smooth(tt / 1.5);
      if (j < t) { o[2] += k * 0.16 * Math.sin(b[0] * 2.6 - tt * 1.8); o[1] += k * 0.035 * Math.sin(b[0] * 2.6 - tt * 1.8 + 1.2); o[3] = wander(rank[j], tt, 5.5, 0.3); }
      else { yaw(o, tt * 0.35 + 0.35 * (1.6 + write)); pitch(o, 0.18 * k); o[3] = sparkle(j, tt, 0.85, 1.35); } // der Ring dreht dort weiter, wo er im ersten Bild stand
    } }),
    // im Text-Durchlauf (drei Schriften nacheinander) entfällt der Wechsel in die andere Schrift: der Durchlauf zeigt sie ohnehin
    act([part("text", paint(second, WARM)), part("ring", paint(end, other === "initials" ? (occasion === "hochzeit" ? PINK : GOLD) : ringColour))], { caption: other === "initials" ? message('text.andBecomeYourInitials') : message('text.andWriteThemselvesAnew'), hold: HOLD + 1, tour: false, live: (b, j, tt, o) => {
      if (j < t) o[3] = wander(rank2[j], tt, 5.5, 0.3);
      else if (other === "initials") o[3] = sparkle(j, tt, 0.85, 1.35);
      else { yaw(o, tt * 0.3); o[3] = sparkle(j, tt, 0.85, 1.35); }
    } }),
  ] };
}
