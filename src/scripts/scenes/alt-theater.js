import { t as message } from "../../i18n/ui.mjs";
import { TAU, GOLD, RED, paint, place, smooth, yaw, roll, sway, glint, sparkle, chase, part, act } from "../show-motion.js";
import { star, extrude } from "../show-geometry.js";
import { notes2d } from "../show-shapes.js";
import { share, maskPair, maskPair3d, mask3d, MASKS, curtain } from "../show-shapes.js";
import { devilBeat } from "./bokkenrijders-quelle.js";

const star3d = (n, s = 0.5, dx = 0, dy = 0) => place(paint(extrude(star(n), n, 0.35), GOLD), s, dx, dy);
/** Columns of drones (rain, rising rockets): positions stay, the light does the falling or rising. */
const columns = (n, xs, y0, y1, zs = () => 0) => Array.from({ length: n }, (_, i) => { const c = i % xs.length, k = Math.floor(i / xs.length), per = Math.ceil((n - c) / xs.length); return [xs[c], y0 + ((y1 - y0) * (k + 0.5)) / per, zs(c)]; });
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

function notes2dScene(n, caption) {
  return { beats: [{ pts: paint(notes2d(n), GOLD), caption, live: (b, j, t, o) => roll(o, Math.sin((t * TAU) / 2.4) * 0.07, 0.17, 0.1) }] };
}

function masksScene(n, caption) {
  const [trag, com] = maskPair(n);
  // the two masks sway against each other, like two actors on stage
  return { beats: [{ pts: [...paint(trag, RED), ...paint(com, GOLD)], caption, live: (b, j, t, o) => {
    const side = j < trag.length ? -1 : 1, [cx, cy] = side < 0 ? MASKS.tragedy : MASKS.comedy, ph = (t * TAU) / 7;
    roll(o, Math.sin(ph) * 0.07 * side, cx, cy); o[0] += Math.sin(ph) * 0.025 * side; o[1] += Math.cos(ph * 0.8) * 0.02 * side;
  } }] };
}

function masks3dScene(n, caption) { const [trag, com] = maskPair3d(n); return { beats: [{ pts: [...paint(trag, RED), ...paint(com, GOLD)], caption, live: (b, j, t, o) => sway(o, t, 0.35) }] };
}

async function maskStoryScene(n, caption, version) {
  const [trag, com] = maskPair3d(n), pair = (t, c) => [part("tragedy", paint(t, RED), { rigid: true }), part("comedy", paint(c, GOLD), { rigid: true })];
  const apart = [trag.map(([x, y, z]) => [x - 0.62, y - 0.05, z + 0.25]), com.map(([x, y, z]) => [x + 0.55, y + 0.05, z - 0.15])];
  return { beats: [
    act([part("comedy", paint(mask3d(n, false), GOLD))], { caption: message('showScenes.comedy'), hold: 1.2, live: (b, j, t, o) => sway(o, t, 0.3) }),
    act(pair(...apart), { caption: message('showScenes.tragedyJoinsIn'), hold: 1, live: (b, j, t, o) => sway(o, t, 0.3) }),
    act(pair(trag, com), { caption: message('showScenes.theyFormTheTheatreSymbol'), hold: 1.6, live: (b, j, t, o) => { sway(o, t, 0.3); o[3] = glint(b[0], t, 3.4, 0.35); } }),
    ...(version.omitDevil ? [] : [await devilBeat(n, message('showScenes.andBecomeTheDevilFromOurBokkenrijdersShow'))]),
  ] };
}

function curtainScene(n, caption) {
  return { beats: [{ pts: paint(curtain(n, 0), RED), caption, live: (b, j, t, o) => billow(b, t, o) }] };
}

function curtainStarScene(n, caption) {
  const [a, b] = share(n, [2, 1]);
  return { beats: [
    act([part("curtain", paint(curtain(n, 0), RED))], { caption: message('showScenes.curtainUp'), hold: 3, live: opening(n) }),
    act([part("curtain", paint(curtain(a, 1), RED)), part("star", star3d(b))], { caption: message('showScenes.a3dStarEmergesFromTheCurtain'), cloud: ["star"], live: (bs, j, t, o) => { if (j < a) billow(bs, t, o); else { sway(o, t, 0.5, 8); o[3] = sparkle(j, t, 0.9, 1.3); } } }),
  ] };
}

function curtainStoryScene(n, caption) {
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

export const builders = { notes2d: notes2dScene, masks: masksScene, masks3d: masks3dScene, maskStory: maskStoryScene, curtain: curtainScene, curtainStar: curtainStarScene, curtainStory: curtainStoryScene };
