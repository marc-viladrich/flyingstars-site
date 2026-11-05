import { t as message } from '../i18n/ui.mjs';
// The 30 motif versions of the configurator: SPARK a still 2D picture, HORIZON one 3D object that moves on its own,
// ODYSSEY a short story in acts. Every beat uses exactly the package's drone count.
// Only what real show drones can do: drones move smoothly within speed and acceleration limits (no jumps, also not in
// the dark); effects such as a heartbeat, sparks, rain or a flame are made with light, as real shows do: drones
// dimming, flashing or a light running along drones that stay in place. tests/show-physics.spec.ts checks this.
// A scene is { beats: [{ pts, live?, hold?, caption, lift?, swirl? }] } (see show-field.js).
// Sources: FlyingStars' heart formations, the FlyingStars mark, the real Bokkenrijders show file, the text planner
// and the line drawings in show-shapes.js; motifs follow FlyingStars' published shows and Marc's references.
import logo from "../data/logo-dots.json";
import { heartPicture } from "./heart-formation.js";
import { loadHeartData } from "./heart-data.js";
import { loadTextEngine, textFormation } from "./text-formation.js";
import { TAU, DIAMOND, GREEN, WARM, GOLD, PINK, VIOLET, CYAN, BLUE, ORANGE, RED, MOON, mix, paint, place, frac, smooth, hash, yaw, roll, pitch, sway, breathe, glint, sparkle, chase, part, act, steadyClock, drift, wander, lightRank } from "./show-motion.js";
import { transitions, planClouds } from "./scenes/interludes.js";
import { TEMPO, runFits } from "./show-tempo.js";
import { star, extrude, evenSubset, sampleOutline, circle, heartOutline } from "./show-geometry.js";
import { flute2d, flute3d, bubbles, trophy2d, trophy3d, bulb2d, bulb3d, bulbGlass, filament, notes2d, clover2d, clover3d } from "./show-shapes.js";
import { solitaire, rocketSolid, globe, launchPad, moonHorizon, flagStar, starField } from "./show-shapes.js";
import { share, shield, shield3d, crestStar3d, CREST_NUMBER, inCrestFlag, crown, rocket, rocket3d, flame, maskPair, maskPair3d, mask3d, MASKS, curtain, clockRim, clockDial, hand, sparkleShell, tower, tower3d, waves, TOWER_SPHERE, gate3d, arrowPaths, inside, bottle3d, cork } from "./show-shapes.js";

let figure = null, extra = null, catalogModule = null;
const loadExtra = () => (extra ||= import("./scenes/index.js").then((m) => m.BUILDERS).catch((e) => { extra = null; throw e; }));
const loadHearts = loadHeartData;
const loadFigure = () => (figure ||= fetch("/media/projekte/bokkenrijders/formation.json").then((r) => { if (!r.ok) throw new Error(`Formation HTTP ${r.status}`); return r.json(); }).catch((e) => { figure = null; throw e; }));
/** Loads the larger formation sources ahead of need, e.g. on the first interaction with the configurator. */
export function preloadScenes() { loadExtra().catch(() => {}); loadHearts().catch(() => {}); loadFigure().catch(() => {}); loadTextEngine().catch(() => {}); }

// ---------- sources ----------
/** FlyingStars' 3D heart (honeycomb half-shell for 290 drones), unit size, thinned evenly to n. Above 290 drones
 * (Drohnenregler, zwölfte Fassung) the extra drones form a smaller heart inside it, so the count is always exactly n. */
async function heart3d(n) {
  const pic = heartPicture(await loadHearts(), 290);
  const pts = pic.hearts.filter((h) => h.slot === 0).flatMap((h) => h.pts), mx = Math.max(...pts.map((p) => Math.max(Math.abs(p[0]), Math.abs(p[1]))));
  const shell = pts.map(([x, y, z]) => [x / mx, y / mx - 0.1, z / mx]);
  if (n <= shell.length) return evenSubset(shell, n);
  return [...shell, ...place(await heart3d(n - shell.length), 0.68, 0, -0.03)];
}
const heartColour = (p) => mix(PINK, VIOLET, (p[2] + 0.3) / 0.6);
const heartLine = (n) => heartOutline(n).map(([x, y]) => [x / 16, y / 16 + 0.05, 0]);
// a single outline (heartOutline adds an inner line from 160 points on) as the area in which the arrow stays dark
const HEART_POLY = heartOutline(150).map(([x, y]) => [x / 16, y / 16 + 0.05]);
async function words(value, n, halfWidth, cx = 0, cy = 0, z = 0) {
  await loadTextEngine();
  const r = textFormation(value, n);
  if (!r) return sampleOutline([circle(cx, cy, halfWidth * 0.6, 120)], n).map(([x, y]) => [x, y, z]);
  const pts = r.pts.slice(0, n), xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const k = (halfWidth * 2) / (Math.max(...xs) - Math.min(...xs)), mx = (Math.max(...xs) + Math.min(...xs)) / 2, my = (Math.max(...ys) + Math.min(...ys)) / 2;
  const out = pts.map(([x, y]) => [(x - mx) * k + cx, (y - my) * k + cy, z]);
  return out.concat(sampleOutline([circle(cx, cy, halfWidth * 1.15, 120)], n - out.length).map(([x, y]) => [x, y, z]));
}
const mark = (z = 0) => logo.dots.map(([x, y, r, g, b]) => [x, y, z, r, g, b]);
const logo2d = (n) => [...mark(), ...paint(sampleOutline([circle(0, 0, 1.45, 180)], n - logo.dots.length), GOLD)];
function logo3d(n) { const layers = [...mark(0.22), ...mark(-0.22)]; return [...layers, ...paint(sampleOutline([circle(0, 0, 1.45, 180)], n - layers.length), GOLD)]; }
async function devil(n) {
  const data = await loadFigure(), mx = Math.max(...data.dots.map((d) => Math.max(Math.abs(d[0]), Math.abs(d[1]))));
  return evenSubset(data.dots.map(([x, y, r, g, b, , z]) => [x / mx, y / mx, (z ?? 0) / mx, ...(r + g + b === 0 ? [70, 70, 70] : [r, g, b])]), n);
}
const star3d = (n, s = 0.5, dx = 0, dy = 0) => place(paint(extrude(star(n), n, 0.35), GOLD), s, dx, dy);
/** Columns of drones (rain, rising rockets): positions stay, the light does the falling or rising. */
const columns = (n, xs, y0, y1, zs = () => 0) => Array.from({ length: n }, (_, i) => { const c = i % xs.length, k = Math.floor(i / xs.length), per = Math.ceil((n - c) / xs.length); return [xs[c], y0 + ((y1 - y0) * (k + 0.5)) / per, zs(c)]; });
/** Shell of a firework around (cx, cy) with radius R. */

const TAU2 = Math.PI * 2;
/** Volumetric torus surface (as in the client's Vercel prototype), tilted towards the audience. */
function torusSurface(n, R = 0.75, r = 0.24, tilt = 1.05) {
  const U = Math.max(8, Math.round(Math.sqrt(n * 2.6))), V = Math.ceil(n / U), out = [];
  for (let i = 0; i < U && out.length < n; i++) for (let j = 0; j < V && out.length < n; j++) {
    const u = (i / U) * TAU2, v = (j / V) * TAU2 + i * 0.37, x = (R + r * Math.cos(v)) * Math.cos(u), y = r * Math.sin(v), z = (R + r * Math.cos(v)) * Math.sin(u);
    out.push([x, y * Math.cos(tilt) - z * Math.sin(tilt), y * Math.sin(tilt) + z * Math.cos(tilt)]);
  }
  return out;
}
/** Quadratic Bézier point and unit tangent. */
const bez = (P0, P1, P2, s) => { const u = 1 - s; return [u * u * P0[0] + 2 * u * s * P1[0] + s * s * P2[0], u * u * P0[1] + 2 * u * s * P1[1] + s * s * P2[1]]; };
const bezDir = (P0, P1, P2, s) => { const dx = 2 * (1 - s) * (P1[0] - P0[0]) + 2 * s * (P2[0] - P1[0]), dy = 2 * (1 - s) * (P1[1] - P0[1]) + 2 * s * (P2[1] - P1[1]), l = Math.hypot(dx, dy); return [dx / l, dy / l]; };

/** Evenly covered sphere surface (golden-angle spiral), like a mirror ball or a planet. */
const fib = (n, R, cx = 0, cy = 0, cz = 0) => { const GA = Math.PI * (3 - Math.sqrt(5)); return Array.from({ length: n }, (_, i) => { const y = 1 - ((i + 0.5) / n) * 2, r = Math.sqrt(1 - y * y), a = GA * i; return [cx + Math.cos(a) * r * R, cy + y * R, cz + Math.sin(a) * r * R]; }); };
/** The crest's colours: a river field, a red flag, the rest warm white. */
const crestColour = (p) => (inCrestFlag(p[0], p[1]) ? RED : p[0] < -0.05 && p[1] > 0.36 && p[1] < 0.7 ? mix(WARM, CYAN, 0.55) : WARM);
/** The flag in the crest waves in the wind (in depth for 3D, in the picture plane for 2D). */
const flutter = (b, t, o, depth) => { if (inCrestFlag(b[0], b[1])) { const k = Math.sin(t * 2.2 - b[0] * 7) * ((b[0] - 0.2) / 0.36); if (depth) o[2] += k * 0.07; else o[1] += k * 0.025; } };
/** Gentle drapes: cloth moving in a breeze below the valance. */
const billow = (b, t, o) => { if (b[1] < 0.82) { const depth = (0.82 - b[1]) / 1.66; o[0] += Math.sin(b[1] * 3 - t * 0.9) * 0.04 * depth; o[2] += Math.cos(b[1] * 2.5 - t * 0.8) * 0.08 * depth; } };
/** The curtain opening while the audience watches: drone j of curtain(m, 0) slides to its place in curtain(m, open). */
function opening(m, begin = 0.5, duration = 2.4) {
  let at = NaN, pts = null;
  return (b, j, t, o) => {
    if (t !== at) { at = t; pts = curtain(m, smooth((t - begin) / duration)); } // one curtain per frame for all drones
    o[0] = pts[j][0]; o[1] = pts[j][1]; billow(pts[j], t, o);
  };
}
/** Rain in light: columns of drones stay in place while light falls along them. */
const RAIN_XS = Array.from({ length: 12 }, (_, i) => -0.55 + (i / 11) * 1.1);
const rain = (k, top = 0.78) => paint(columns(k, RAIN_XS, -0.8, top, (c) => Math.sin(c * 2.1) * 0.4), GOLD);
/** Fernsehturm colours, and its red warning light that blinks at the top. */
const towerPaint = (p) => (p[1] > 1.15 ? RED : p[1] > 0.25 && p[1] < 0.62 ? mix(WARM, CYAN, 0.35) : WARM);
const warning = (t) => 0.75 + 0.6 * Math.exp(-(((frac(t / 1.6) - 0.1) / 0.06) ** 2));
/** The two glasses touch rims now and then: each tips a little towards the other, around its foot. */
const clink = (o, t, side) => roll(o, side * 0.07 * Math.sin((Math.PI * t) / 3) ** 8, side * 0.47, -0.78);
const flameColour = (top) => (p) => mix(GOLD, ORANGE, (top - p[1]) / 0.42);
const lerp = (a, b, u) => a + (b - a) * u;
// Fünfzehnte Fassung: die Flamme unter einer Rakete (Start und Landung). Drohne k von m steht an der Stelle f entlang der
// Flamme (0 an der Düse, 1 an der Spitze; dichter an der Düse) und seitlich bei ihrem Anteil l der halben Breite.
const flameF = (k, m) => ((k + 0.5) / m) ** 1.25;
const flameSide = (k) => 2 * frac(k * 0.618034 + 0.31) - 1; // gleichmäßig über die Breite verteilt (goldener Schnitt)
/** Flammenform: schmal an der Düse, bauchig im oberen Drittel, spitz am Ende. */
const flameHalf = (f) => Math.sin(Math.PI * (0.16 + 0.84 * f)) ** 0.85 * (1 - 0.35 * f);
/** Wo Flammendrohne k steht: Düse (x, y), Länge len, größte halbe Breite width × 0,13. */
const flamePoint = (k, m, x, y, len, width) => { const f = flameF(k, m); return [x + flameSide(k) * flameHalf(f) * 0.13 * width, y - f * len, (hash(k + 3) - 0.5) * 0.04 * f]; };
/** Farbe: innen an der Düse weiß-gold, dann orange, die Spitze rot. */
const flameTint = (k, m) => { const f = flameF(k, m); return f < 0.45 ? mix(mix(WARM, GOLD, 0.5), ORANGE, f / 0.45) : mix(ORANGE, RED, (f - 0.45) / 0.55 * 0.7); };
/** Licht: hell an der Düse, dunkler zur Spitze, flackernd; Lichtpulse laufen nach unten (nur Licht, keine Bewegung). */
const flameLight = (k, m, t) => { const f = flameF(k, m); return (1.35 - 0.85 * f) * sparkle(k + 101, t * 1.6, 0.72, 1.12) * chase(f, t, 1.3, 0.45, 0.82, 1.18); };

const nearWhite = (r, g, b) => Math.min(r, g, b) > 190 && Math.max(r, g, b) - Math.min(r, g, b) < 45;
/**
 * The show for one occasion and package: the occasion's motifs in order, each in its version for the package, as one
 * scene that starts again after the last motif. Every beat carries its motif (segment) for the controller. Drones that
 * would light warm white take the package's colour (Marc, round 9: SPARK orange, HORIZON pink, ODYSSEY blue); motifs
 * with their own colours keep them.
 * Zwölfte Fassung: the last picture of every motif stands TEMPO.hold (3 s) in every package.
 * Dreizehnte Fassung (Marc, 30.10.2026):
 * - A motif may need a minimum drone count (`minDrones` an der Fassung, seit der sechzehnten Fassung je Paket, see
 *   LADDER in content/show-configurator.js); below it the motif is not part of the show.
 * - The light run only where it fits (runFits() in show-tempo.js: lines and outlines without their own light).
 * - The living cloud every three to four pictures, at most five (planClouds() in scenes/interludes.js); builders may
 *   ask for it inside a story, also for single parts (beat.cloud = ["star"]).
 */
export async function buildSequence(motifs, pkg, n, tint, occasion = "") {
  // a motif may skip a package or need more drones: minDrones an der Fassung des Pakets (Freischalt-Leiter, sechzehnte
  // Fassung, content/show-configurator.js)
  const beats = [], shown = motifs.map((m, segment) => [m, segment]).filter(([m]) => m.tiers[pkg] && (m.tiers[pkg].minDrones ?? 0) <= n);
  const plan = transitions(occasion, shown.length, pkg);
  const tinted = (pts) => (tint ? pts.map((p) => (nearWhite(p[3], p[4], p[5]) ? [p[0], p[1], p[2], ...mix(WARM, tint, 0.7)] : p)) : pts);
  // a transition belongs to the next motif, so a package switch never lands on a figure
  const through = (tr, [m, segment]) => { const b = tr.figure(n); beats.push({ ...b, pts: tinted(b.pts), segment, motif: m.label, cloud: true }); };
  for (const [s, [m, segment]] of shown.entries()) {
    const tr = s > 0 && plan.find((q) => q.before === s);
    if (tr?.figure) through(tr, [m, segment]);
    const scene = await buildBeats(m.tiers[pkg], n);
    scene.beats.forEach((b, i, all) => {
      b.segment = segment; b.motif = m.label;
      if (i === all.length - 1) b.hold ??= TEMPO.hold;
      b.pts = tinted(b.pts);
      beats.push(b);
    });
  }
  const loop = shown.length && plan.find((q) => q.before === shown.length); // before the round starts again
  if (loop?.figure) through(loop, shown[0]);
  steady(beats);
  for (const b of beats) b.run = runFits(b);
  planClouds(beats);
  return { beats, loopTo: 0 };
}
/** Bewegt live() die Drohnen (nicht nur ihr Licht)? Stichproben an einigen Punkten und Zeitpunkten. */
function moves(b) {
  if (!b.live) return false;
  const n = b.pts.length, o = [0, 0, 0, 1];
  for (let j = 0; j < n; j += Math.max(1, Math.floor(n / 24))) {
    const p = b.pts[j];
    for (const t of [0, 0.35, 0.9, 1.7, 2.6, 4.1, 6.3]) {
      o[0] = p[0]; o[1] = p[1]; o[2] = p[2] || 0; o[3] = 1; b.live(p, j, t, o);
      if (Math.abs(o[0] - p[0]) + Math.abs(o[1] - p[1]) + Math.abs(o[2] - (p[2] || 0)) > 1e-6) return true;
    }
  }
  return false;
}
/**
 * Vierzehnte Fassung (Marc, 30.10.2026: keine Finten): Jedes Bild, das sich selbst bewegt, läuft nach steadyClock() in
 * show-motion.js: Es steht im Anflug, läuft sanft an und kommt vor dem nächsten Bild zum Stehen. Ein Bild mit
 * `clock: "continue"` setzt die Uhr des vorigen Bildes fort (dieselbe Drehung, derselbe Flügelschlag), statt sie
 * zurückzudrehen.
 */
function steady(beats) {
  let prev = null;
  for (const b of beats) {
    if (!moves(b)) { prev = null; continue; }
    const own = b.live, from = b.clock === "continue" && prev && prev.segment === b.segment ? prev.clockEnd : 0;
    const clock = steadyClock(b.hold ?? 2.2, { from });
    b.live = (p, j, t, o) => own(p, j, clock(t), o);
    b.hold = clock.hold;
    b.clockEnd = clock.end;
    b.steady = { raw: own, from, end: clock.end }; // für den Finten-Wächter (scripts/show-finte.test.mjs)
    prev = b;
  }
}
async function buildBeats(version, n) {
  const caption = version.caption;
  // Vierzehnte Fassung: drei lange Geschichten sind geteilt, ihr Schluss ist ein eigenes Motiv ab ODYSSEY (minDrones).
  // Die Rakete endet im Orbit, die Mondlandung beginnt dort; die Masken enden beim Theaterzeichen, der Bokkenrijders-
  // Teufel steht für sich; die Uhr endet mit dem neuen Jahr, der Sektkorken knallt im eigenen Motiv.
  const slice = async (build, from, to) => { const all = await buildBeats({ ...version, build }, n); return { ...all, beats: all.beats.slice(from, to) }; };
  // Sechzehnte Fassung (Freischalt-Leiter): drei weitere lange Geschichten aus scenes/ sind geteilt, ihr Schluss ist ein
  // eigenes Motiv ab ODYSSEY 450. Kopfsprung endet bei den Ringen, daraus wird die Medaille mit eurer Zahl; das Feuerwerk endet nach den
  // Wellen, das Finale (alle Sterne, Goldregen) steht für sich; die Reise endet bei der Route, der Papierflieger fliegt
  // sie ab und kreist um den Kompass. Die Teile stehen in der Motivliste direkt hintereinander, ab 450 läuft also wieder
  // die ganze Geschichte.
  const sliceExtra = async (build, from, to, first = null) => {
    const all = await (await loadExtra())[build](n, caption, version), beats = all.beats.slice(from, to);
    if (first) beats[0] = { ...beats[0], caption: first }; // ein Motiv, das mitten in einer Geschichte beginnt, bekommt einen eigenen ersten Satz
    return { ...all, beats };
  };
  // Runde 24: Motive aus dem FlyingStars-Katalog (scenes/catalog.js, erst bei Bedarf geladen); Bauname catalog:<Motiv>:<Paket>:<Anlass>
  if (version.build.startsWith("catalog:")) { const [, key, tier] = version.build.split(":"); const { catalogScene } = await (catalogModule ||= import("./scenes/catalog.js")); return catalogScene(key, tier, n, caption); }
  switch (version.build) {
    case "diveStory": if (!version.whole) return sliceExtra("diveStory", 0, 4); break;
    case "medalStory": return sliceExtra("diveStory", 4, 5, "Die Ringe im Wasser werden zu eurer Zahl");
    case "fireworkStory": if (!version.whole) return sliceExtra("fireworkStory", 0, 3); break;
    case "fireworkFinale": return sliceExtra("fireworkStory", 3, 5);
    case "travelStory": if (!version.whole) return sliceExtra("travelStory", 0, 4); break;
    case "planeStory": return sliceExtra("travelStory", 4, 6, "Ein Papierflieger fliegt die Route ab");
    case "rocketLaunch": return slice("rocketStory", 0, 3);
    case "moonStory": return slice("rocketStory", 2, 4);
    case "maskStory": if (!version.whole) return slice("maskStoryAll", 0, 3); break;
    case "devilStory": return { beats: [{ pts: await devil(n), caption: message('showScenes.theDevilFromOurBokkenrijdersShow'), hold: 4, live: (b, j, t, o) => { if (b[3] > 200 && b[4] > 100) o[3] = 0.8 + 0.5 * Math.abs(Math.sin(t * 1.5)); sway(o, t, 0.35); } }] };
    case "clockStory": if (!version.whole) return slice("clockStoryAll", 0, 4); break;
    case "champagneStory": { const all = await buildBeats({ ...version, build: "clockStoryAll" }, n); const pop = all.beats[all.beats.length - 1]; return { beats: [{ ...pop, caption: message('showScenes.aChampagneBottleTheCorkPops'), hold: 4.5 }] }; }
  }
  switch (version.build === "maskStoryAll" ? "maskStory" : version.build === "clockStoryAll" ? "clockStory" : version.build) {
    // ---- Hochzeit · Ring ----
    case "rings3d": {
      // a solitaire as a body: torus band and a brilliant-cut stone; it turns about the vertical axis, so the band
      // foreshortens to a line and opens again, and tips a little towards the audience
      const [ringBand, stone] = solitaire(n, 0.8), k = ringBand.length;
      const pts = [...paint(ringBand, (p) => mix(GOLD, WARM, (p[1] + 0.8) / 3.2)), ...paint(stone, DIAMOND)];
      return { beats: [{ pts, caption, live: (b, j, t, o) => {
        if (j >= k) o[3] = sparkle(j, t, 0.95, 1.55); else o[3] = glint(Math.atan2(b[1], b[0]), t, 5, 0.45, -Math.PI, Math.PI);
        yaw(o, t * 0.32); pitch(o, 0.35 + 0.12 * Math.sin(t * 0.4));
      } }] };
    }
    // ---- Hochzeit · Herz ----
    // Vierzehnte Fassung (Marc: der wandernde Schein des Schmetterlings ist „magisch, premium“, bitte auf weitere Formen):
    // ein feiner Schein läuft die Linie entlang (lightRank), das Herz wiegt sich kaum merklich. Schwach, nur aufhellend.
    case "heart2d": { const pts = paint(heartLine(n), PINK), rank = lightRank(pts); return { beats: [{ pts, caption, live: (b, j, t, o) => { o[3] = wander(rank[j], t, 4.4, 0.4, 0.08); roll(o, 0.03 * Math.sin((t * TAU) / 7), 0, -0.2); } }] }; }
    case "heartsStory": {
      // Vierzehnte Fassung (Marc: ODYSSEY-Herzen sahen nicht hochwertiger aus als in den kleineren Paketen; Vorbild
      // Kolibri: SPARK 2D, HORIZON 3D, ODYSSEY 3D mit Geschichte): Die Geschichte spielt durchgehend mit FlyingStars'
      // 3D-Herz. Amors Pfeil fliegt hinein und bleibt stecken, wie bei FlyingStars (der Pfeil steht im Herz); vorher flog
      // er hindurch und hinaus, und seine Drohnen kamen als Funkenring zurück (eine Gegenbewegung).
      const [h, a] = share(n, [5, 1]);
      const arrow = (hx, hy) => part("arrow", paint(sampleOutline(arrowPaths(hx, hy, hx + 1.13, hy + 0.65), a).map(([x, y]) => [x, y, 0.32]), GOLD), { rigid: true });
      const full = await heart3d(h), half = await heart3d(Math.ceil(h / 2)), yOf = (p) => (p[1] + 1.1) / 2.2;
      const couple = [...place(half.slice(0, Math.floor(h / 2)), 0.62, -0.58, 0, 0), ...place(half.slice(0, Math.ceil(h / 2)), 0.62, 0.58, 0, 0)];
      const orbitRing = Array.from({ length: a }, (_, i) => { const q = (i / a) * TAU; return [Math.cos(q) * 1.45, -0.05 + Math.sin(q) * 0.3, Math.sin(q) * 0.9]; }), orbitU = orbitRing.map((_, i) => i / a);
      const heartLight = (b, t) => breathe(t, 2.8) * wander(yOf(b), t, 5, 0.25, 0.12);
      return { beats: [
        act([part("heart", paint(full, heartColour)), arrow(0.95, 0.6)], { caption: message('showScenes.a3dHeartCupidTakesAim'), hold: 1.6, frame: "aim", live: (b, j, t, o) => { if (j < h) { o[3] = heartLight(b, t); sway(o, t, 0.2); } } }),
        act([part("heart", paint(full, heartColour)), arrow(-0.4, -0.22)], { caption: message('showScenes.theArrowStrikesAndStaysInTheHeart'), hold: 1.6, frame: "aim", live: (b, j, t, o) => { if (j < h) { o[3] = heartLight(b, t); sway(o, t, 0.2); } else o[3] = 1 + 0.5 * Math.exp(-t / 0.6); } }),
        act([part("heart", paint(couple, heartColour)), part("arrow", paint(orbitRing, GOLD))], { caption: message('showScenes.andBecomesTwoHeartsOrbitingEachOther'), frame: "aim", live: (b, j, t, o) => { if (j < h) o[3] = heartLight(b, t); else o[3] = wander(orbitU[j - h], t, 4, 0.5, 0.06); yaw(o, t * 0.3); } }),
      ] };
    }
    // ---- Hochzeit · Sektgläser ----
    case "flutes2d": {
      // vierzehnte Fassung: dazu ein feiner Schein, der über die Gläser wandert (wie beim Schmetterling)
      const per = Math.floor(n / 2), glass = (k, side) => place(flute2d(k), 1, side * 0.3, 0, 0, side * 0.22), pts = paint([...glass(per, -1), ...glass(n - per, 1)], WARM), rank = lightRank(pts);
      return { beats: [{ pts, caption, live: (b, j, t, o) => { clink(o, t, j < per ? -1 : 1); o[3] = wander(rank[j], t, 4.8, 0.4, 0.08); } }] };
    }
    case "flutes3d": {
      // each glass: its wireframe, then the bubbles inside; the light rises along the bubbles
      const per = Math.floor(n / 2), glasses = [[per, -1], [n - per, 1]].map(([k, side]) => { const [g, q] = share(k, [4, 1]); return { g, pts: place([...paint(flute3d(g), WARM), ...paint(bubbles(q), GOLD)], 1, side * 0.3, 0, 0, side * 0.22) }; });
      const isBubble = (j) => (j < per ? j >= glasses[0].g : j - per >= glasses[1].g);
      return { beats: [{ pts: [...glasses[0].pts, ...glasses[1].pts], caption, live: (b, j, t, o) => { if (isBubble(j)) o[3] = chase(b[1], t, 0.35, 0.22, 0.7, 1.4); clink(o, t, j < per ? -1 : 1); sway(o, t, 0.3); } }] };
    }
    case "flutesStory": {
      const [gl, gr, q] = share(n, [2, 2, 1.1]), glass = (k, side, apart) => paint(place(flute3d(k), 1, side * (apart ? 0.75 : 0.3), 0, 0, apart ? 0 : side * 0.22), WARM);
      const inside = (k, apart) => [-1, 1].flatMap((side, i) => place(bubbles(share(k, [1, 1])[i]), 1, side * (apart ? 0.75 : 0.3), 0, 0, apart ? 0 : side * 0.22));
      const rising = place(heartLine(q), 0.42, 0, 1.0);
      const fizz = (b, j, t, o) => { if (j >= gl + gr) o[3] = chase(b[1], t, 0.35, 0.22, 0.7, 1.4); };
      return { beats: [
        act([part("left", glass(gl, -1, true), { rigid: true }), part("right", glass(gr, 1, true), { rigid: true }), part("bubbles", paint(inside(q, true), GOLD))], { caption: message('showScenes.twoGlasses'), hold: 1, live: fizz }),
        act([part("left", glass(gl, -1, false), { rigid: true }), part("right", glass(gr, 1, false), { rigid: true }), part("bubbles", paint(inside(q, false), GOLD))], { caption: message('showScenes.theyClink'), hold: 1.4, live: (b, j, t, o) => { fizz(b, j, t, o); if (j < gl + gr) clink(o, t, j < gl ? -1 : 1); } }),
        act([part("left", glass(gl, -1, false), { rigid: true }), part("right", glass(gr, 1, false), { rigid: true }), part("bubbles", paint(rising, PINK))], { caption: message('showScenes.andTheBubblesRiseAsAHeart'), live: (b, j, t, o) => { if (j >= gl + gr) o[3] = breathe(t); else clink(o, t, j < gl ? -1 : 1); sway(o, t, 0.2); } }),
      ] };
    }
    // ---- Jubiläum · Pokal ----
    case "trophy2d": {
      const [a, s] = share(n, [6, 1]), stars = Array.from({ length: s }, (_, i) => { const u = (i + 0.5) / s, ang = Math.PI * (0.15 + 0.7 * u); return [Math.cos(ang) * 0.95, 0.35 + Math.sin(ang) * 0.75, 0]; });
      return { beats: [{ pts: [...paint(trophy2d(a), WARM), ...paint(stars, GOLD)], caption, live: (b, j, t, o) => { o[3] = j >= a ? sparkle(j, t, 0.85, 1.4) : glint(b[0] + b[1] * 0.4, t, 4, 0.35); } }] };
    }
    case "trophy3d": return { beats: [{ pts: paint(trophy3d(n), (p) => (p[1] > 0.55 ? GOLD : WARM)), caption, live: (b, j, t, o) => { o[3] = glint(b[1], t, 4, 0.4, -1.2, 1.2); yaw(o, t * 0.3); } }] };
    case "trophyStory": {
      // Dreizehnte Fassung: keine Funkenkugel mehr, die über dem Sockel steht. Die übrigen Drohnen warten gedimmt als
      // schmaler Lichtkranz über dem Pokal; Zahl und Konfetti entstehen daraus in der lebendigen Wolke, der Pokal bleibt.
      const [a, b, s] = share(n, [5, 1.4, 1.2]), number = await words("125", b, 0.42, 0, 1.05, 0);
      const halo = paint(sampleOutline([circle(0, 1.05, 0.42, 120)], n - a).map(([x, y], i) => [x, y, (hash(i) - 0.5) * 0.06]), GOLD);
      const confetti = (k) => paint(sparkleShell(k, 1.25).map(([x, y, z]) => [x, y + 0.15, z]), (p) => [GOLD, PINK, CYAN][Math.floor(hash(p[0] * 31) * 3)]);
      const waiting = (j, t, o) => { o[3] = 0.16; yaw(o, t * 0.2, 0, 0); };
      return { beats: [
        act([part("trophy", paint(trophy3d(a, 0.2), WARM)), part("sparks", halo)], { caption: message('showScenes.theBase'), hold: 1, live: (bs, j, t, o) => { if (j >= a) waiting(j, t, o); } }),
        act([part("trophy", paint(trophy3d(a), (p) => (p[1] > 0.55 ? GOLD : WARM))), part("sparks", halo)], { caption: message('showScenes.theTrophyGrows'), hold: 1.4, live: (bs, j, t, o) => { if (j >= a) waiting(j, t, o); else yaw(o, t * 0.25); } }),
        act([part("trophy", paint(trophy3d(a), (p) => (p[1] > 0.55 ? GOLD : WARM))), part("number", paint(number, GOLD)), part("sparks", confetti(s))], { caption: message('showScenes.andYourNumberRisesOutOfItConfettiSparkles'), live: (bs, j, t, o) => {
          if (j >= a + b) { yaw(o, t * 0.15); o[3] = sparkle(j, t, 0.85, 1.4); } else if (j < a) yaw(o, t * 0.25); else o[3] = glint(bs[0], t, 3, 0.4);
        } }),
      ] };
    }
    // ---- Launch · Glühbirne ----
    case "bulb2d": {
      const [g] = share(n, [4, 1.2]); // the filament glows, light runs over the glass
      return { beats: [{ pts: paint(bulb2d(n), (p) => (Math.abs(p[0]) < 0.09 && p[1] > -0.43 && p[1] < 0.12 ? GOLD : WARM)), caption, live: (b, j, t, o) => { o[3] = j >= g ? breathe(t, 1.8) + 0.15 : glint(b[0] - b[1] * 0.3, t, 4, 0.3); } }] };
    }
    case "bulb3d": {
      const [glass, fil] = bulb3d(n);
      return { beats: [{ pts: [...paint(glass, WARM), ...paint(fil, GOLD)], caption, live: (b, j, t, o) => { yaw(o, t * 0.3); if (j >= glass.length) o[3] = breathe(t, 1.8) + 0.2; } }] };
    }
    case "bulbStory": {
      // Dreizehnte Fassung: kein Funkenball mehr; der Glühfaden glimmt allein, die Drohnen des Glases warten dunkel um
      // ihn und bilden das Glas in der lebendigen Wolke (nur das Glas, der Faden bleibt stehen).
      const [g, f, r] = share(n, [3.4, 0.8, 1.6]), glassAll = bulbGlass(g + r), glass = bulbGlass(g);
      const wire = paint(filament(f), GOLD), waiting = paint(fib(g + r, 0.45, 0, -0.15), GOLD);
      const RAYS = 12, rays = Array.from({ length: r }, (_, i) => { const k = i % RAYS, u = Math.floor(i / RAYS) / Math.max(1, Math.ceil(r / RAYS) - 1), a = (k / RAYS) * TAU + 0.13; return [Math.cos(a) * (0.62 + 0.38 * u), 0.15 + Math.sin(a) * (0.62 + 0.38 * u), 0]; });
      return { beats: [
        act([part("filament", wire), part("glass", waiting)], { caption: message('showScenes.aFilamentGlows'), hold: 1.4, live: (b, j, t, o) => { if (j >= f) o[3] = 0; else o[3] = breathe(t, 1.6) + 0.2; } }),
        act([part("filament", wire), part("glass", paint(glassAll, WARM))], { caption: message('showScenes.aLightBulbFormsAroundIt'), hold: 1, cloud: ["glass"], live: (b, j, t, o) => { if (j < f) o[3] = breathe(t, 1.6) + 0.2; yaw(o, t * 0.25); } }),
        act([part("filament", wire), part("glass", paint(glass, WARM)), part("rays", paint(rays, GOLD))], { caption: message('showScenes.andItShines'), live: (b, j, t, o) => {
          if (j < f) o[3] = 1.35;
          else if (j >= f + g) { const k = 1 + 0.1 * Math.sin(t * 1.3 - Math.hypot(b[0], b[1] - 0.15) * 4); o[0] = b[0] * k; o[1] = 0.15 + (b[1] - 0.15) * k; o[3] = 1.1; } // the rays reach out and back
        } }),
      ] };
    }
    // ---- Kultur · Noten ----
    case "notes2d": return { beats: [{ pts: paint(notes2d(n), GOLD), caption, live: (b, j, t, o) => roll(o, Math.sin((t * TAU) / 2.4) * 0.07, 0.17, 0.1) }] };
    // ---- Silvester · Kleeblatt ----
    case "clover2d": return { beats: [{ pts: paint(clover2d(n), GREEN), caption, live: (b, j, t, o) => { roll(o, t * 0.12); o[3] = glint(b[0] + b[1], t, 4, 0.3); } }] };
    case "clover3d": return { beats: [{ pts: paint(clover3d(n), GREEN), caption, live: (b, j, t, o) => { yaw(o, t * 0.35); o[3] = glint(b[1], t, 3.6, 0.35); } }] };
    case "cloverStory": {
      const [a, r] = share(n, [4, 1]);
      return { beats: [
        act([part("clover", paint(clover3d(n, 3), GREEN))], { caption: message('showScenes.aThreeLeafClover'), hold: 1, live: (b, j, t, o) => sway(o, t, 0.35) }),
        act([part("clover", paint(clover3d(n), GREEN))], { caption: message('showScenes.aFourthLeafAppearsForLuck'), hold: 1.2, live: (b, j, t, o) => sway(o, t, 0.35) }),
        act([part("clover", paint(clover3d(a), GREEN)), part("rain", paint(sparkleShell(r, 1.35), GOLD))], { caption: message('showScenes.forTheNewYearSurroundedBySparks'), live: (b, j, t, o) => { if (j < a) yaw(o, t * 0.35); else { yaw(o, -t * 0.12); o[3] = sparkle(j, t, 0.85, 1.4); } } }),
      ] };
    }
    // ---- Jubiläum · Wappen ----
    case "shield": return { beats: [{ pts: paint(shield(n), (p) => (p[1] < 0.06 && p[1] > -0.5 && Math.abs(p[0]) < 0.28 ? GOLD : crestColour(p))), caption, live: (b, j, t, o) => flutter(b, t, o, false) }] };
    case "shield3d": {
      const [a, b] = share(n, [3, 1]), { cx, cy, halfWidth } = CREST_NUMBER;
      const pts = [...paint(shield3d(a), crestColour), ...paint(await words("125", b, halfWidth, cx, cy, 0.2), GOLD)];
      return { beats: [{ pts, caption, live: (bs, j, t, o) => { o[3] = glint(bs[0] + bs[1] * 0.5, t); if (j < a) flutter(bs, t, o, true); sway(o, t, 0.35); } }] };
    }
    case "shieldStory": {
      const [a, b, c, d] = share(n, [5, 2.2, 1.2, 1.6]), { cx, cy, halfWidth } = CREST_NUMBER;
      const number = await words("125", b, halfWidth, cx, cy, 0.2);
      const wreath = Array.from({ length: d }, (_, i) => { const ang = (i / d) * TAU; return [Math.cos(ang) * 1.25, 0.02 + Math.sin(ang) * 1.12, 0]; });
      const crest = (k) => part("crest", paint(shield3d(k), crestColour));
      const waving = (bs, j, t, o, k) => { if (j < k) flutter(bs, t, o, true); sway(o, t, 0.25); };
      return { beats: [
        act([crest(n - b), part("emblem", paint(crestStar3d(b), GOLD))], { caption: message('showScenes.theCoatOfArms'), hold: 1.2, live: (bs, j, t, o) => waving(bs, j, t, o, n - b) }),
        act([crest(n - b), part("emblem", paint(place(number, 1, 0, 0, 0.25), GOLD))], { caption: message('showScenes.theStarBecomesYourNumber'), hold: 1.4, live: (bs, j, t, o) => waving(bs, j, t, o, n - b) }),
        act([crest(a), part("emblem", paint(place(number, 1, 0, 0, 0.1), GOLD)), part("crown", paint(crown(c, 1.0), GOLD)), part("wreath", paint(wreath, GOLD))], { caption: message('showScenes.withACrownAndACirclingWreathOfStars'), live: (bs, j, t, o) => {
          if (j >= a + b + c) { roll(o, t * 0.12, 0, 0.02); o[3] = sparkle(j, t); } // the wreath turns slowly around the crest
          else if (j >= a + b) o[3] = glint(bs[0], t, 3, 0.4);
          waving(bs, j, t, o, a);
        } }),
      ] };
    }
    // ---- Jubiläum · Wahrzeichen (Berliner Fernsehturm) ----
    case "tower": return { beats: [{ pts: paint(tower(n), (p) => (p[1] > 1.15 ? RED : WARM)), caption, live: (b, j, t, o) => { if (b[1] > 1.15) o[3] = warning(t); } }] };
    case "tower3d": return { beats: [{ pts: paint(tower3d(n), towerPaint), caption, live: (b, j, t, o) => {
      if (b[1] > 0.25 && b[1] < 0.62) o[3] = glint(Math.atan2(b[2], b[0]), t, 4, 0.45, -Math.PI, Math.PI); // light runs around the sphere
      else if (b[1] > 1.15) o[3] = warning(t);
      yaw(o, t * 0.2);
    } }] };
    case "towerStory": {
      const [a, w] = share(n, [2, 1]);
      return { beats: [
        { pts: paint(tower3d(n), towerPaint), caption: message('showScenes.theTvTower'), hold: 1.4, live: (b, j, t, o) => { if (b[1] > 1.15) o[3] = warning(t); sway(o, t, 0.3); } },
        { pts: [...paint(tower3d(a), towerPaint), ...paint(waves(w), CYAN)], caption: message('showScenes.broadcastsAcrossTheCity'), hold: 4.5, live: (b, j, t, o) => {
          if (j >= a) { // each wave arc moves slowly outward and back again, one after the other
            const dx = b[0] - TOWER_SPHERE[0], dy = b[1] - TOWER_SPHERE[1], r0 = Math.hypot(dx, dy), k = 1 + 0.2 * Math.sin((t * TAU) / 4.5 - r0 * 5);
            o[0] = TOWER_SPHERE[0] + dx * k; o[1] = TOWER_SPHERE[1] + dy * k;
          } else if (b[1] > 1.15) o[3] = warning(t);
          sway(o, t, 0.25);
        } },
        { pts: paint(gate3d(n), (p) => (p[1] > 0.56 ? GOLD : WARM)), caption: message('showScenes.andBecomesTheBrandenburgGate'), live: (b, j, t, o) => { o[3] = glint(b[0], t, 4, 0.35); sway(o, t, 0.3); } },
      ] };
    }
    // ---- Launch · Rakete ----
    case "rocket": {
      const [r, f] = share(n, [5, 1]), pts = [...paint(rocket(r), WARM), ...paint(flame(f, -0.6), flameColour(-0.6))];
      return { beats: [{ pts, caption, live: (b, j, t, o) => { o[1] += Math.sin(t * 0.6) * 0.03; if (j >= r) o[3] = chase(-b[1], t, 0.9, 0.2, 0.75, 1.4); } }] };
    }
    case "rocket3d": {
      // the rocket as a body (silhouette in two planes, hoops, fins) hovers, turns slowly about its axis and tips a
      // little; the flame is a cone of drones whose light runs downwards
      const [r, f] = share(n, [3, 1]), pts = [...paint(rocketSolid(r), (p) => mix(WARM, CYAN, (p[2] + 0.2) / 0.4)), ...paint(flame(f, -0.62, 0.12), flameColour(-0.62))];
      return { beats: [{ pts, caption, live: (b, j, t, o) => {
        if (j >= r) o[3] = chase(-b[1], t, 0.9, 0.2, 0.7, 1.45); else o[3] = glint(b[1], t, 4.5, 0.35, -0.8, 1.1);
        o[1] += Math.sin(t * 0.55) * 0.04; yaw(o, t * 0.3); pitch(o, 0.12 * Math.sin(t * 0.33));
      } }] };
    }
    case "rocketStory": {
      // Startklar auf der Rampe → Zündung, die Rampe fällt weg, die Spur wächst → im Orbit um einen Planeten → Landung
      // auf dem Mond, Flagge gehisst. The rocket is one rigid body in every act; the plume drones stay the plume (then
      // comet tail, then dust and flag); the pad drones become the planet and then the moon.
      // Dreizehnte Fassung: das Budget wächst mit der Drohnenzahl (bei 600 standen sonst 335 Drohnen als Sternenhimmel,
      // und die Geschichte sah bei 300 und 600 gleich aus); bei 300 bleibt es 120/60/85/35
      const q3 = n / 300, RK = Math.round(120 * q3), TR = Math.round(60 * q3), WD = Math.round(85 * q3), ST = n - RK - TR - WD;
      const body = rocketSolid(RK, 1), stars = starField(ST, -1.25, 1.25, 0.05, 1.0, 7);
      const at = (s, cx, cy, heading = 0) => body.map(([x, y, z]) => { const [X, Y] = heading ? [x * Math.cos(heading) - y * Math.sin(heading), x * Math.sin(heading) + y * Math.cos(heading)] : [x, y]; return [X * s + cx, Y * s + cy, z * s]; });
      const bodyColour = (p) => mix(WARM, CYAN, (p[2] + 0.3) / 0.6), plumeColour = (q) => mix(GOLD, ORANGE, hash(q[0] * 97 + q[1] * 13)), flameColour4 = (q, i) => flameTint(i, TR);
      // act 1 + 2: the rocket on the pad, then rising; the pad drops out of the picture (the world falls away)
      const S1 = 0.9, X1 = -0.2, Y0 = -0.72 + 0.62 * S1 + 0.02, RISE = 0.55, DROP = 0.95, T2 = 6;
      const pad = launchPad(WD, -0.72, 0.62, 0.4).map(([x, y, z]) => [Math.max(-0.8, Math.min(0.8, x)) + X1, y, z]);
      const spread = (k) => (hash(k) - 0.5) * (0.14 + 0.3 * (k / TR));
      // Fünfzehnte Fassung (Marc: der Abgasstrahl sah seit der vierzehnten „awkward“ aus, eine Säule von der Düse bis zum
      // Boden). Jetzt eine echte Flamme an der Düse: schmal an der Düse, bauchig, zur Spitze hin spitz, innen weiß-gold,
      // außen orange, an der Spitze rot und dunkler; ihr Licht flackert und läuft nach unten. Beim Start steigt die Düse und
      // die Flamme wird länger, beides mit derselben weichen Kurve: Jede Flammendrohne fliegt dabei auf einer Geraden in
      // eine Richtung (keine Finte), bewegt wird nur das Licht.
      const nozzleY = (t) => Y0 + RISE * smooth(Math.max(0, t) / T2) - 0.62 * S1 - 0.04;
      const plumeAt = (k, t) => { const g = smooth(Math.max(0, t) / T2); return flamePoint(k, TR, X1, nozzleY(t), (0.16 + 0.5 * g) * S1, (0.85 + 0.35 * g) * S1); };
      const idle = Array.from({ length: TR }, (_, k) => plumeAt(k, 0));
      const plumeEnd = Array.from({ length: TR }, (_, k) => plumeAt(k, 99));
      // act 3: the planet and an orbit around it, the rocket smaller and heading along the orbit, the plume as its tail
      const G = [0.12, 0.05], GR = 0.52, A = 0.9, H = 0.3, W = TAU / 9, S3 = 0.46;
      const orbit = (ph) => [G[0] + A * Math.cos(ph), G[1] + H * Math.sin(ph), A * Math.sin(ph) * 0.9];
      // the rocket follows the orbit the way a picture does: it turns in the picture plane along the projected path,
      // the depth of the orbit (behind and in front of the planet) comes from the orbit itself
      const inOrbit = (p, ph) => { const c = orbit(ph), a = Math.atan2(H * Math.cos(ph), -A * Math.sin(ph)) - Math.PI / 2, [x, y, z] = p, X = x * Math.cos(a) - y * Math.sin(a), Y = x * Math.sin(a) + y * Math.cos(a); return [c[0] + X * S3, c[1] + Y * S3, c[2] + z * S3]; };
      const tailAt = (k, ph) => { const c = orbit(ph - 0.08 - 1.1 * (k / TR)); return [c[0] + spread(k) * 0.6, c[1] + (hash(k + 5) - 0.5) * 0.06, c[2]]; };
      const PH0 = 0.3;
      // the planet as real shows draw a sphere: its outline, the equator and two meridians that turn inside the outline
      const planet = globe(WD, GR, G[0], G[1]), planetTurns = (j) => j >= RK + TR + planet.length - 0.5 * WD; // the second half of the points are the meridians
      // act 4: the moon as a horizon, the rocket lands upright, the plume becomes dust and a flag
      const S4 = 0.66, XL = -0.05, YTOP = 0.95, YL = -0.45 + 0.62 * S4 + 0.03, T4 = 5;
      const moon = moonHorizon(WD, -2.35, 1.9), [pole, cloth] = flagStar(40, XL + 0.45, -0.46, 0.85, 0.46); // the crater rims use the fewer pad drones
      const dust = Array.from({ length: TR - 40 }, (_, k) => { const u = (k + 0.5) / (TR - 40), side = k % 2 ? 1 : -1; return [XL + side * (0.22 + 0.55 * u), -0.44 + 0.03 * Math.sin(u * 9) + 0.015 * (k % 3), (hash(k + 9) - 0.5) * 0.2]; });
      const trailRest4 = [...pole, ...cloth, ...dust];
      const descent = (t) => smooth(Math.max(0, t) / T4);
      // fünfzehnte Fassung: beim Landen dieselbe Flamme an der Düse aus den Spurdrohnen ohne die 40 der Flagge, sie wird zum
      // Aufsetzen hin kürzer (Schub nimmt ab); Düse und Länge mit derselben Kurve, jede Flammendrohne fliegt auf einer Geraden
      const FL = TR - 40, under = (k, t) => { const u = descent(t); return flamePoint(k - 40, FL, XL, YTOP + (YL - YTOP) * u - 0.62 * S4 - 0.04, (0.42 - 0.3 * u) * S4, 0.9 * S4); };
      return { beats: [
        act([part("rocket", paint(at(S1, X1, Y0), bodyColour), { rigid: true }), part("trail", paint(idle, flameColour4)), part("world", paint(pad, WARM)), part("stars", paint(stars, WARM))], { caption: message('showScenes.readyForLaunch'), hold: 1.8, frame: "start", live: (b, j, t, o) => {
          if (j >= RK && j < RK + TR) o[3] = 0.45 * flameLight(j - RK, TR, t) + 0.1; else if (j >= RK + TR + WD) { o[3] = sparkle(j, t, 0.6, 1.3); drift(o, j, t, 0.035); } // die Sterne treiben sanft
        } }),
        act([part("rocket", paint(at(S1, X1, Y0 + RISE), bodyColour), { rigid: true }), part("trail", paint(plumeEnd, flameColour4)), part("world", paint(pad.map(([x, y, z]) => [x, y - DROP, z]), WARM), { offstage: true }), part("stars", paint(stars.map(([x, y, z]) => [x, y - 0.25, z]), WARM))], { caption: message('showScenes.ignitionTheRocketLiftsOffTheLaunchPadFallsAway'), hold: 8, frame: "start", live: (b, j, t, o) => {
          const u = smooth(Math.max(0, t) / T2);
          if (j < RK) { o[1] = b[1] - RISE * (1 - u); o[3] = glint(b[1] - Y0, t, 4, 0.3, -0.8, 0.9); }
          else if (j < RK + TR) { const [x, y, z] = plumeAt(j - RK, t); o[0] = x; o[1] = y; o[2] = z; o[3] = (0.45 + 0.55 * smooth(Math.max(0, t) / 0.8)) * flameLight(j - RK, TR, t); } // die Zündung: die Flamme wird hell
          else if (j < RK + TR + WD) o[1] = b[1] + DROP * (1 - u);
          else { o[1] = b[1] + 0.25 * (1 - smooth(Math.max(0, t) / 8)); o[3] = sparkle(j, t, 0.6, 1.3); }
        } }),
        act([part("rocket", paint(at(S3, 0, 0).map((p, j) => inOrbit(body[j], PH0)), bodyColour), { rigid: true }), part("trail", paint(Array.from({ length: TR }, (_, k) => tailAt(k, PH0)), plumeColour)), part("world", paint(planet, (p) => mix(CYAN, BLUE, (p[1] - G[1] + GR) / (2 * GR)))), part("stars", paint(stars, WARM))], { caption: message('showScenes.inOrbitAroundAPlanet'), hold: 9.5, live: (b, j, t, o) => {
          const tt = Math.max(0, t), ph = PH0 + W * (tt < 2 ? (tt * tt) / 4 : tt - 1); // the orbit speeds up gently
          if (j < RK) { const [x, y, z] = inOrbit(body[j], ph); o[0] = x; o[1] = y; o[2] = z; }
          else if (j < RK + TR) { const k = j - RK, [x, y, z] = tailAt(k, ph); o[0] = x; o[1] = y; o[2] = z; o[3] = (0.45 + 0.9 * (1 - k / TR)) * sparkle(j, t, 0.8, 1.2); }
          else if (j < RK + TR + WD) { if (planetTurns(j)) yaw(o, t * 0.3, G[0], 0); o[3] = 0.85 + 0.35 * Math.max(0, (o[2] + GR) / (2 * GR)); }
          else { o[3] = sparkle(j, t, 0.6, 1.3); drift(o, j, t, 0.045); } // die Sterne um den Planeten treiben sanft
        } }),
        act([part("rocket", paint(at(S4, XL, YL), bodyColour), { rigid: true }), part("trail", paint(trailRest4, (q, i) => (i < 40 ? WARM : flameTint(i - 40, FL)))), part("world", paint(moon, MOON)), part("stars", paint(stars, WARM))], { caption: message('showScenes.andLandsOnTheMoonFlagRaised'), hold: 7.5, live: (b, j, t, o) => {
          const u = descent(t), tt = Math.max(0, t);
          if (j < RK) { o[1] = b[1] + (YTOP - YL) * (1 - u); o[3] = glint(b[1] - YL, t, 4, 0.3, -0.7, 0.8); }
          else if (j < RK + TR) {
            const k = j - RK, w = smooth((tt - T4 + 0.3) / 2.4); // after touchdown the plume settles into flag and dust
            // vierzehnte Fassung: die 40 Drohnen der Flagge warten dunkel an ihrem Platz und leuchten nach dem Aufsetzen auf;
            // vorher sanken sie mit der Flamme hinab und stiegen danach wieder zur Flagge hinauf
            if (w < 1 && k >= 40) { const [x, y, z] = under(k, t); o[0] = x + (b[0] - x) * w; o[1] = y + (b[1] - y) * w; o[2] = z + (b[2] - z) * w; }
            if (k >= 40) o[3] = w < 1 ? lerp(flameLight(k - 40, FL, t), 0.6 * sparkle(j, t, 0.7, 1.2), w) : 0.6 * sparkle(j, t, 0.7, 1.2);
            else if (k >= 12) { const dx = b[0] - (XL + 0.42); o[2] += w * Math.sin(t * 2.4 - dx * 9) * 0.05 * dx; o[1] += w * Math.sin(t * 2.0 - dx * 9) * 0.015 * dx; o[3] = w < 1 ? sparkle(j, t, 0.8, 1.2) : glint(b[0], t, 3.5, 0.35, XL + 0.3, XL + 0.95); }
            if (k < 40) o[3] *= smooth(w * 1.4); // die Flagge leuchtet erst nach dem Aufsetzen
          }
          else if (j >= RK + TR + WD) o[3] = sparkle(j, t, 0.6, 1.3);
        } }),
      ] };
    }
    // ---- Launch · Logo ----
    case "logo": {
      const dots = logo.dots.length; // a light runs around the ring of the logo
      return { beats: [{ pts: logo2d(n), caption, live: (b, j, t, o) => { if (j >= dots) o[3] = 0.85 + 0.5 * Math.max(0, Math.cos(Math.atan2(b[1], b[0]) - t * 0.8)) ** 4; } }] };
    }
    case "logo3d": return { beats: [{ pts: logo3d(n), caption, live: (b, j, t, o) => { o[3] = glint(b[0] + b[1] * 0.4, t); sway(o, t, 0.35); } }] };
    case "logoStory": {
      // Dreizehnte Fassung: die Funkenwirbel als stehende Bilder sind entfallen. Das Logo wird in der lebendigen Wolke
      // zum Ring aus Licht; vor dem Logo liegt die Wolke zwischen den Motiven (planClouds).
      const ring = paint(torusSurface(n, 0.95, 0.3), (p) => mix(CYAN, VIOLET, (p[1] + 0.6) / 1.2));
      return { beats: [
        { pts: logo3d(n), caption: message('showConfigurator.yourLogo'), hold: 3.4, live: (b, j, t, o) => sway(o, t, 0.3) },
        { pts: ring, caption: message('showScenes.becomesARingOfLightIn3d'), hold: 3.4, cloud: true, live: (b, j, t, o) => yaw(o, t * 0.3) },
      ] };
    }
    // ---- Kultur · Maske ----
    case "masks": {
      const [trag, com] = maskPair(n);
      // the two masks sway against each other, like two actors on stage
      return { beats: [{ pts: [...paint(trag, RED), ...paint(com, GOLD)], caption, live: (b, j, t, o) => {
        const side = j < trag.length ? -1 : 1, [cx, cy] = side < 0 ? MASKS.tragedy : MASKS.comedy, ph = (t * TAU) / 7;
        roll(o, Math.sin(ph) * 0.07 * side, cx, cy); o[0] += Math.sin(ph) * 0.025 * side; o[1] += Math.cos(ph * 0.8) * 0.02 * side;
      } }] };
    }
    case "masks3d": { const [trag, com] = maskPair3d(n); return { beats: [{ pts: [...paint(trag, RED), ...paint(com, GOLD)], caption, live: (b, j, t, o) => sway(o, t, 0.35) }] }; }
    case "maskStory": {
      const [trag, com] = maskPair3d(n), pair = (t, c) => [part("tragedy", paint(t, RED), { rigid: true }), part("comedy", paint(c, GOLD), { rigid: true })];
      const apart = [trag.map(([x, y, z]) => [x - 0.62, y - 0.05, z + 0.25]), com.map(([x, y, z]) => [x + 0.55, y + 0.05, z - 0.15])];
      return { beats: [
        act([part("comedy", paint(mask3d(n, false), GOLD))], { caption: message('showScenes.comedy'), hold: 1.2, live: (b, j, t, o) => sway(o, t, 0.3) }),
        act(pair(...apart), { caption: message('showScenes.tragedyJoinsIn'), hold: 1, live: (b, j, t, o) => sway(o, t, 0.3) }),
        act(pair(trag, com), { caption: message('showScenes.theyFormTheTheatreSymbol'), hold: 1.6, live: (b, j, t, o) => { sway(o, t, 0.3); o[3] = glint(b[0], t, 3.4, 0.35); } }),
        { pts: await devil(n), caption: message('showScenes.andBecomeTheDevilFromOurBokkenrijdersShow'), live: (b, j, t, o) => { if (b[3] > 200 && b[4] > 100) o[3] = 0.8 + 0.5 * Math.abs(Math.sin(t * 1.5)); sway(o, t, 0.35); } },
      ] };
    }
    // ---- Kultur · Vorhang ----
    case "curtain": return { beats: [{ pts: paint(curtain(n, 0), RED), caption, live: (b, j, t, o) => billow(b, t, o) }] };
    case "curtainStar": {
      const [a, b] = share(n, [2, 1]);
      return { beats: [
        act([part("curtain", paint(curtain(n, 0), RED))], { caption: message('showScenes.curtainUp'), hold: 3, live: opening(n) }),
        act([part("curtain", paint(curtain(a, 1), RED)), part("star", star3d(b))], { caption: message('showScenes.a3dStarEmergesFromTheCurtain'), cloud: ["star"], live: (bs, j, t, o) => { if (j < a) billow(bs, t, o); else { sway(o, t, 0.5, 8); o[3] = sparkle(j, t, 0.9, 1.3); } } }),
      ] };
    }
    case "curtainStory": {
      const [a, r, s] = share(n, [2, 0.9, 1.2]);
      return { beats: [
        act([part("curtain", paint(curtain(n, 0), RED))], { caption: message('showScenes.curtainUp'), hold: 3, live: opening(n) }),
        act([part("curtain", paint(curtain(a, 1), RED)), part("rain", rain(r + s))], { caption: message('showScenes.goldenRainFallsFromTheCurtain'), hold: 3, live: (b, j, t, o) => { if (j < a) billow(b, t, o); else o[3] = chase(-b[1], t, 0.45, 0.55); } }),
        act([part("curtain", paint(curtain(a, 1), RED)), part("rain", rain(r, -0.2)), part("star", star3d(s, 0.4, 0, 0.3))], { caption: message('showScenes.andAStarRisesFromIt'), cloud: ["star"], live: (b, j, t, o) => {
          if (j < a) billow(b, t, o);
          else if (j < a + r) o[3] = chase(-b[1], t, 0.45, 0.55);
          else { yaw(o, t * 0.3); o[1] += Math.sin(t * 0.7) * 0.03; o[3] = sparkle(j, t, 0.9, 1.3); }
        } }),
      ] };
    }
        // ---- Silvester · Uhr ----
    case "clock": {
      const [rim, mh, hh] = share(n, [7, 1.4, 0.9]), pts = [...paint(clockDial(rim), WARM), ...paint(hand(mh, 0.72), GOLD), ...paint(hand(hh, 0.46), GOLD)];
      // the hands run from five to twelve up to midnight
      return { beats: [{ pts, caption, live: (b, j, t, o) => { if (j >= rim) roll(o, (1 - smooth(t / 8)) * (j < rim + mh ? 5 / 60 : 5 / 720) * TAU); } }] };
    }
    case "clock3d": {
      const [rim, mh, hh] = share(n, [7, 1.4, 0.9]), pts = [...paint(clockRim(rim, 0.3), WARM), ...paint(hand(mh, 0.72, 0.18), GOLD), ...paint(hand(hh, 0.46, 0.18), GOLD)];
      // the minute hand sweeps once in 20 s, the hour hand a twelfth of that
      return { beats: [{ pts, caption, live: (b, j, t, o) => { if (j >= rim) roll(o, -(j < rim + mh ? t / 20 : t / 240) * TAU); sway(o, t, 0.3); } }] };
    }
    case "clockStory": {
      const [rim, mh, hh, sp] = share(n, [4, 1, 0.7, 4]), C = [0, 0.3], K = 0.6, face = rim + mh + hh;
      const at = (pts) => place(pts, K, C[0], C[1]);
      const clock = part("clock", [...paint(at(clockRim(rim, 0.3)), WARM), ...paint(at(hand(mh, 0.72, 0.18)), GOLD), ...paint(at(hand(hh, 0.46, 0.18)), GOLD)]);
      const hands = (j, t, o, k) => { if (j >= rim && j < face) roll(o, (1 - smooth(t / k)) * (j < rim + mh ? 5 / 60 : 5 / 720) * TAU, C[0], C[1]); };
      const sparks = (pts, colour = GOLD) => part("sparks", paint(pts, colour));
      const glowRing = sampleOutline([circle(C[0], C[1], 1.12 * K, 120)], sp).map(([x, y]) => [x, y, 0]);
      const swarm = fib(sp, 1.5 * K, C[0], C[1]).map(([x, y, z], i) => [x + (hash(i) - 0.5) * 0.12, y, z]);
      const year = await words(String(new Date().getFullYear() + 1), sp, 0.62, 0, -0.62, 0.1);
      // two tilted rings crossing around the clock, like an atom; the sparks run along them
      const atom = (i, t) => { const q = i % 2, a = (Math.floor(i / 2) / Math.ceil(sp / 2)) * TAU + t * 0.5 * (q ? -1 : 1), tilt = q ? 0.5 : -0.5, x = Math.cos(a) * 1.0, y = Math.sin(a) * 0.32; return [C[0] + x * Math.cos(tilt) - y * Math.sin(tilt), C[1] + x * Math.sin(tilt) + y * Math.cos(tilt), Math.sin(a) * 0.9]; };
      // the champagne bottle, tilted towards the upper right; the cork pops and flies like the rocket, foam behind it
      const tilt = -0.55, B = [-0.4, -0.32], BK = 1.15, cn = 16;
      const bottle = place(paint(bottle3d(face), (p) => (p[1] > 0.3 ? GOLD : mix(WARM, [140, 230, 170], 0.5))), BK, B[0], B[1], 0, tilt);
      const corkLocal = cork(cn).map(([x, y, z]) => [x * 1.8, y * 1.8, z * 1.8]);
      const P0 = place([[0, 0.62, 0]], BK, B[0], B[1], 0, tilt)[0], dir = [-Math.sin(tilt), Math.cos(tilt)];
      const Q1 = [P0[0] + dir[0] * 0.8, P0[1] + dir[1] * 0.8], Q2 = [1.0, 0.78];
      const flight = (t) => smooth(Math.max(0, t - 0.9) / 2.6); // a short wait, then the pop
      const corkAt = (p, s) => { const [x, y] = place([p], BK, 0, 0, 0, tilt + s * TAU)[0], [cx, cy] = bez(P0, Q1, Q2, s); return [cx + x, cy + y, (p[2] || 0) * BK]; };
      const foamN = sp - cn, lagOf = (k) => 0.04 + 0.5 * (k / foamN), sideOf = (k) => (hash(k) - 0.5) * 0.12;
      const softC = (x) => (x + Math.sqrt(x * x + 0.0036)) / 2, fadeC = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
      const [e0x, e0y] = bezDir(P0, Q1, Q2, 0);
      const foamAt = (k, s) => { const l = lagOf(k), q = Math.max(0, softC(s - l) - softC(-l)), [x, y] = bez(P0, Q1, Q2, q), [dx, dy] = bezDir(P0, Q1, Q2, q), back = l * 0.45 * (1 - fadeC(s / l)); return [x - dy * sideOf(k) - e0x * back, y + dx * sideOf(k) - e0y * back, (hash(k + 4) - 0.5) * 0.1]; };
      const champagne = [part("clock", bottle), part("cork", paint(corkLocal.map((p) => corkAt(p, 0)), WARM), { rigid: true }), part("sparks", paint(Array.from({ length: foamN }, (_, k) => foamAt(k, 0)), (q) => mix(GOLD, WARM, hash(q[0] * 53))))];
      return { beats: [
        act([clock, sparks(glowRing)], { caption: message('showScenes.fiveToMidnight'), hold: 4.2, live: (b, j, t, o) => { hands(j, t, o, 4); if (j >= face) o[3] = breathe(t); } }),
        act([clock, sparks(swarm, (p) => mix(GOLD, ORANGE, hash(p[0] * 31)))], { caption: message('showScenes.midnightSparksSwirlOut'), hold: 2.6, live: (b, j, t, o) => {
          if (j >= face) { yaw(o, t * 0.35, C[0], 0); o[3] = sparkle(j, t); } else if (j < rim) o[3] = breathe(t, 1.6);
        } }),
        act([clock, sparks(year)], { caption: message('showScenes.theyWriteTheNewYear'), hold: 2.6, live: (b, j, t, o) => { if (j >= face) o[3] = sparkle(j, t, 0.95, 1.3); } }),
        act([clock, sparks(Array.from({ length: sp }, (_, i) => atom(i, 0)), (p) => mix(GOLD, PINK, (p[2] + 0.9) / 1.8))], { caption: message('showScenes.swirlAroundTheClockAgain'), hold: 3, live: (b, j, t, o) => {
          if (j >= face) { const [x, y, z] = atom(j - face, t); o[0] = x; o[1] = y; o[2] = z; o[3] = sparkle(j, t); }
        } }),
        act(champagne, { caption: message('showScenes.andTheCorkPops'), live: (b, j, t, o) => {
          const s = flight(t);
          if (j >= face && j < face + cn) { const [x, y, z] = corkAt(corkLocal[j - face], s); o[0] = x; o[1] = y + (s >= 1 ? Math.sin((t - 3.5) * 0.9) * 0.02 : 0); o[2] = z; }
          else if (j >= face + cn) { const [x, y, z] = foamAt(j - face - cn, s); o[0] = x; o[1] = y; o[2] = z; o[3] = sparkle(j, t, 0.85, 1.3); }
        } }),
      ] };
    }
    default: {
      // newer motifs live in one module per occasion (src/scripts/scenes/)
      const build = (await loadExtra())[version.build];
      return build ? build(n, caption, version) : { beats: [{ pts: [], caption: "" }] };
    }
  }
}
