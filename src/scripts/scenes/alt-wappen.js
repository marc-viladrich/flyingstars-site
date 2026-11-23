import { t as message } from "../../i18n/ui.mjs";
import { TAU, WARM, GOLD, CYAN, RED, mix, paint, place, roll, sway, glint, sparkle, part, act } from "../show-motion.js";
import { share, shield, shield3d, crestStar3d, CREST_NUMBER, inCrestFlag, crown } from "../show-shapes.js";
import { words } from "./words.js";

/** The crest's colours: a river field, a red flag, the rest warm white. */
const crestColour = (p) => (inCrestFlag(p[0], p[1]) ? RED : p[0] < -0.05 && p[1] > 0.36 && p[1] < 0.7 ? mix(WARM, CYAN, 0.55) : WARM);
/** The flag in the crest waves in the wind (in depth for 3D, in the picture plane for 2D). */
const flutter = (b, t, o, depth) => { if (inCrestFlag(b[0], b[1])) { const k = Math.sin(t * 2.2 - b[0] * 7) * ((b[0] - 0.2) / 0.36); if (depth) o[2] += k * 0.07; else o[1] += k * 0.025; } };

function shieldScene(n, caption) {
  return { beats: [{ pts: paint(shield(n), (p) => (p[1] < 0.06 && p[1] > -0.5 && Math.abs(p[0]) < 0.28 ? GOLD : crestColour(p))), caption, live: (b, j, t, o) => flutter(b, t, o, false) }] };
}

async function shield3dScene(n, caption) {
  const [a, b] = share(n, [3, 1]), { cx, cy, halfWidth } = CREST_NUMBER;
  const pts = [...paint(shield3d(a), crestColour), ...paint(await words("125", b, halfWidth, cx, cy, 0.2), GOLD)];
  return { beats: [{ pts, caption, live: (bs, j, t, o) => { o[3] = glint(bs[0] + bs[1] * 0.5, t); if (j < a) flutter(bs, t, o, true); sway(o, t, 0.35); } }] };
}

async function shieldStoryScene(n, caption) {
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

export const builders = { shield: shieldScene, shield3d: shield3dScene, shieldStory: shieldStoryScene };
