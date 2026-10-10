// The visitor's own text as the finale of the show (round 11, Marc: "Ich kann meinen eigenen Text da reinschreiben und
// er erscheint dort direkt" – the wow effect of the client's Vercel prototype, now not a static lettering).
// Three styles: Druckschrift (FlyingStars' own text planner), Schreibschrift (single-stroke script), Initialen
// ("A & B" in script, framed). The package decides how the text lives:
//   SPARK   the text stands, light breathes over it
//   HORIZON light writes the text stroke by stroke, then the letters glow in a slow colour wave, an ornament twinkles
//           and the whole lettering floats a little (sink and return, like the sled in the Leipzig shows)
//   ODYSSEY sparks → written by light → the letters swing as a wave in 3D inside a turning ring of light → the text
//           becomes the other script or its initials, framed
import { loadTextEngine, textFormation } from "../text-formation.js";
import { scriptFormation, initials } from "../script-formation.js";
import { sampleOutline, circle, heartOutline } from "../show-geometry.js";
import { WARM, GOLD, PINK, CYAN, VIOLET, TAU, paint, mix, hash, smooth, frac, part, act, trace, sparkle, breathe, loosen, yaw, pitch, share } from "../show-motion.js";

const WIDTH = 1.25; // half width of the lettering in scene units
const HOLD = 9; // the visitor typed it: the text stays longer than a catalogue motif

/** Print lettering from FlyingStars' planner, centred, k points (planner spare drones join the lettering's line). */
async function print(value, k, halfWidth = WIDTH) {
  await loadTextEngine();
  const r = textFormation(value, k);
  if (!r) return null;
  const pts = r.pts.slice(0, k), xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const s = (halfWidth * 2) / Math.max(1e-6, Math.max(...xs) - Math.min(...xs)), mx = (Math.max(...xs) + Math.min(...xs)) / 2, my = (Math.max(...ys) + Math.min(...ys)) / 2;
  const out = pts.map(([x, y]) => [(x - mx) * s, (y - my) * s, 0]);
  // drones the planner did not need: a fine line under the lettering (a dedication's underline)
  const bottom = Math.min(...out.map((p) => p[1]));
  return out.concat(sampleOutline([{ pts: [[-halfWidth * 0.7, bottom - 0.16], [halfWidth * 0.7, bottom - 0.16]], closed: false }], k - out.length).map(([x, y]) => [x, y, 0]));
}

/** Points of the text in a style; the order is the writing order (script) or left to right (print). */
async function lettering(value, style, k, halfWidth = WIDTH) {
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
    if (style === "initials") {
      const [t, f] = share(n, [3, 2]), pts = [...paint(await lettering(value, style, t), WARM), ...paint(frame(occasion, f, 0.95), occasion === "hochzeit" ? PINK : GOLD)];
      return { beats: [{ pts, caption, hold: HOLD, live: (b, j, tt, o) => { o[3] = j < t ? breathe(tt, 3.2) : sparkle(j, tt, 0.85, 1.2); } }] };
    }
    return { beats: [{ pts: paint(await lettering(value, style, n), WARM), caption, hold: HOLD, live: (b, j, tt, o) => { o[3] = breathe(tt, 3.2); } }] };
  }

  if (pkg === "HORIZON") {
    const [t, d] = share(n, [5, 1]), text = await lettering(value, style, t), h = height(text);
    const deco = style === "initials" ? frame(occasion, d, 0.95) : ornament(occasion, d, WIDTH, h / 2 + 0.08);
    const colour = (p) => mix(WARM, occasion === "hochzeit" ? PINK : GOLD, 0.15);
    const pts = [...paint(text, colour), ...paint(deco, occasion === "hochzeit" ? PINK : GOLD)];
    const write = 0.35 + 0.09 * Array.from(label).length; // a dedication takes its time: about a tenth of a second per letter
    return { beats: [{ pts, caption, hold: HOLD + 2, live: (b, j, tt, o) => {
      // the lettering floats: it sinks a little and comes back, and drifts sideways at another pace
      o[1] += -0.035 * (0.5 - 0.5 * Math.cos((tt * TAU) / 9)); o[0] += 0.03 * Math.sin((tt * TAU) / 11);
      if (j < t) {
        const written = trace(j / t, tt, write, { delay: 0.2 });
        // once written, a slow colour wave runs over the letters (the colour changes, the drones stay)
        const wave = 1 + 0.28 * Math.max(0, Math.sin(b[0] * 2.2 - tt * 1.6)) ** 2;
        o[3] = tt < write + 0.4 ? written : wave;
      } else o[3] = tt < write ? 0.15 : sparkle(j, tt, 0.8, 1.35);
    } }] };
  }

  // ODYSSEY: a short story in acts
  const R = 0.55; // ring share
  const [t, r] = share(n, [3.2, 1]), text = await lettering(value, style, t), h = height(text);
  const ringPts = (k, rad) => Array.from({ length: k }, (_, i) => { const a = (i / k) * TAU; return [Math.cos(a) * rad, Math.sin(a) * rad * 0.32, Math.sin(a) * rad]; });
  const ring = ringPts(r, WIDTH + 0.35), ringColour = (p) => mix(GOLD, occasion === "hochzeit" ? PINK : VIOLET, (p[2] + 1.6) / 3.2);
  const other = style === "initials" ? "script" : "initials";
  const second = await lettering(value, other === "initials" && !initials(value) ? "script" : other, t, other === "initials" ? WIDTH : WIDTH);
  const write = 0.35 + 0.09 * Array.from(label).length;
  const cloud = loosen(text.map(([x, y]) => [x * 1.1, y * 1.6, 0]), 0.45, 1.05);
  const end = other === "initials" ? frame(occasion, r, 0.95) : ringPts(r, WIDTH + 0.35);
  return { beats: [
    act([part("text", paint(cloud, (p) => mix(GOLD, WARM, hash(p[0] * 17)))), part("ring", paint(loosen(ring, 0.6, 1.1), GOLD))], { caption: "Funken sammeln sich", hold: 1, live: (b, j, tt, o) => { o[3] = sparkle(j, tt, 0.6, 1.4); yaw(o, tt * 0.15); } }),
    act([part("text", paint(text, WARM)), part("ring", paint(ring.map(([x, y, z]) => [x * 0.98, y, z]), ringColour))], { caption: "Licht schreibt euren Text", hold: 2.2 + write, live: (b, j, tt, o) => {
      if (j < t) o[3] = trace(j / t, tt, write, { delay: 0.1 });
      else { yaw(o, tt * 0.35); o[3] = tt < write ? 0.2 : sparkle(j, tt, 0.85, 1.35); }
    } }),
    act([part("text", paint(text, WARM)), part("ring", paint(ring, ringColour))], { caption: "die Buchstaben schwingen in 3D", hold: 5, live: (b, j, tt, o) => {
      const k = smooth(tt / 1.5);
      if (j < t) { o[2] += k * 0.16 * Math.sin(b[0] * 2.6 - tt * 1.8); o[1] += k * 0.035 * Math.sin(b[0] * 2.6 - tt * 1.8 + 1.2); o[3] = 1 + 0.3 * Math.max(0, Math.sin(b[0] * 2.6 - tt * 1.8)) ** 2; }
      else { yaw(o, tt * 0.35 + 0.35 * 1.5); pitch(o, 0.18 * k); o[3] = sparkle(j, tt, 0.85, 1.35); }
    } }),
    act([part("text", paint(second, WARM)), part("ring", paint(end, other === "initials" ? (occasion === "hochzeit" ? PINK : GOLD) : ringColour))], { caption: other === "initials" ? "…und werden zu euren Initialen" : "…und schreiben sich neu", hold: HOLD, live: (b, j, tt, o) => {
      if (j < t) o[3] = breathe(tt, 3);
      else if (other === "initials") o[3] = sparkle(j, tt, 0.85, 1.35);
      else { yaw(o, tt * 0.3); o[3] = sparkle(j, tt, 0.85, 1.35); }
    } }),
  ] };
}
