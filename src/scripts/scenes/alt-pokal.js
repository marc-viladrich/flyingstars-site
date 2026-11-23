import { t as message } from "../../i18n/ui.mjs";
import { WARM, GOLD, PINK, CYAN, paint, hash, yaw, glint, sparkle, part, act } from "../show-motion.js";
import { sampleOutline, circle } from "../show-geometry.js";
import { trophy2d, trophy3d } from "../show-shapes.js";
import { share, sparkleShell } from "../show-shapes.js";
import { words } from "./words.js";

function trophy2dScene(n, caption) {
  const [a, s] = share(n, [6, 1]), stars = Array.from({ length: s }, (_, i) => { const u = (i + 0.5) / s, ang = Math.PI * (0.15 + 0.7 * u); return [Math.cos(ang) * 0.95, 0.35 + Math.sin(ang) * 0.75, 0]; });
  return { beats: [{ pts: [...paint(trophy2d(a), WARM), ...paint(stars, GOLD)], caption, live: (b, j, t, o) => { o[3] = j >= a ? sparkle(j, t, 0.85, 1.4) : glint(b[0] + b[1] * 0.4, t, 4, 0.35); } }] };
}

function trophy3dScene(n, caption) {
  return { beats: [{ pts: paint(trophy3d(n), (p) => (p[1] > 0.55 ? GOLD : WARM)), caption, live: (b, j, t, o) => { o[3] = glint(b[1], t, 4, 0.4, -1.2, 1.2); yaw(o, t * 0.3); } }] };
}

async function trophyStoryScene(n, caption) {
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

export const builders = { trophy2d: trophy2dScene, trophy3d: trophy3dScene, trophyStory: trophyStoryScene };
