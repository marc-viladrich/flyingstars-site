import { t as message } from "../../i18n/ui.mjs";
import { TAU, DIAMOND, WARM, GOLD, PINK, VIOLET, mix, paint, place, yaw, roll, pitch, sway, breathe, glint, sparkle, chase, part, act, wander, lightRank } from "../show-motion.js";
import { evenSubset, sampleOutline, heartOutline } from "../show-geometry.js";
import { flute2d, flute3d, bubbles } from "../show-shapes.js";
import { solitaire } from "../show-shapes.js";
import { share, arrowPaths, inside } from "../show-shapes.js";

/** FlyingStars' 3D heart (honeycomb half-shell for 290 drones), unit size, thinned evenly to n. Above 290 drones
 * (Drohnenregler, zwölfte Fassung) the extra drones form a smaller heart inside it, so the count is always exactly n. */
async function heart3d(n) {
  const [{ heartPicture }, data] = await Promise.all([import("../heart-formation.js"), import("../heart-data.js").then((module) => module.loadHeartData())]);
  const pic = heartPicture(data, 290);
  const pts = pic.hearts.filter((h) => h.slot === 0).flatMap((h) => h.pts), mx = Math.max(...pts.map((p) => Math.max(Math.abs(p[0]), Math.abs(p[1]))));
  const shell = pts.map(([x, y, z]) => [x / mx, y / mx - 0.1, z / mx]);
  if (n <= shell.length) return evenSubset(shell, n);
  return [...shell, ...place(await heart3d(n - shell.length), 0.68, 0, -0.03)];
}
const heartColour = (p) => mix(PINK, VIOLET, (p[2] + 0.3) / 0.6);
const heartLine = (n) => heartOutline(n).map(([x, y]) => [x / 16, y / 16 + 0.05, 0]);
/** The two glasses touch rims now and then: each tips a little towards the other, around its foot. */
const clink = (o, t, side) => roll(o, side * 0.07 * Math.sin((Math.PI * t) / 3) ** 8, side * 0.47, -0.78);

function rings3dScene(n, caption) {
  // a solitaire as a body: torus band and a brilliant-cut stone; it turns about the vertical axis, so the band
  // foreshortens to a line and opens again, and tips a little towards the audience
  const [ringBand, stone] = solitaire(n, 0.8), k = ringBand.length;
  const pts = [...paint(ringBand, (p) => mix(GOLD, WARM, (p[1] + 0.8) / 3.2)), ...paint(stone, DIAMOND)];
  return { beats: [{ pts, caption, live: (b, j, t, o) => {
    if (j >= k) o[3] = sparkle(j, t, 0.95, 1.55); else o[3] = glint(Math.atan2(b[1], b[0]), t, 5, 0.45, -Math.PI, Math.PI);
    yaw(o, t * 0.32); pitch(o, 0.35 + 0.12 * Math.sin(t * 0.4));
  } }] };
}

function heart2dScene(n, caption) { const pts = paint(heartLine(n), PINK), rank = lightRank(pts); return { beats: [{ pts, caption, live: (b, j, t, o) => { o[3] = wander(rank[j], t, 4.4, 0.4, 0.08); roll(o, 0.03 * Math.sin((t * TAU) / 7), 0, -0.2); } }] };
}

async function heartsStoryScene(n, caption) {
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

function flutes2dScene(n, caption) {
  // vierzehnte Fassung: dazu ein feiner Schein, der über die Gläser wandert (wie beim Schmetterling)
  const per = Math.floor(n / 2), glass = (k, side) => place(flute2d(k), 1, side * 0.3, 0, 0, side * 0.22), pts = paint([...glass(per, -1), ...glass(n - per, 1)], WARM), rank = lightRank(pts);
  return { beats: [{ pts, caption, live: (b, j, t, o) => { clink(o, t, j < per ? -1 : 1); o[3] = wander(rank[j], t, 4.8, 0.4, 0.08); } }] };
}

function flutes3dScene(n, caption) {
  // each glass: its wireframe, then the bubbles inside; the light rises along the bubbles
  const per = Math.floor(n / 2), glasses = [[per, -1], [n - per, 1]].map(([k, side]) => { const [g, q] = share(k, [4, 1]); return { g, pts: place([...paint(flute3d(g), WARM), ...paint(bubbles(q), GOLD)], 1, side * 0.3, 0, 0, side * 0.22) }; });
  const isBubble = (j) => (j < per ? j >= glasses[0].g : j - per >= glasses[1].g);
  return { beats: [{ pts: [...glasses[0].pts, ...glasses[1].pts], caption, live: (b, j, t, o) => { if (isBubble(j)) o[3] = chase(b[1], t, 0.35, 0.22, 0.7, 1.4); clink(o, t, j < per ? -1 : 1); sway(o, t, 0.3); } }] };
}

function flutesStoryScene(n, caption) {
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

export const builders = { rings3d: rings3dScene, heart2d: heart2dScene, heartsStory: heartsStoryScene, flutes2d: flutes2dScene, flutes3d: flutes3dScene, flutesStory: flutesStoryScene };
