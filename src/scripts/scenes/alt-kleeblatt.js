import { t as message } from "../../i18n/ui.mjs";
import { GREEN, GOLD, paint, yaw, roll, sway, glint, sparkle, part, act } from "../show-motion.js";
import { clover2d, clover3d } from "../show-shapes.js";
import { share, sparkleShell } from "../show-shapes.js";

function clover2dScene(n, caption) {
  return { beats: [{ pts: paint(clover2d(n), GREEN), caption, live: (b, j, t, o) => { roll(o, t * 0.12); o[3] = glint(b[0] + b[1], t, 4, 0.3); } }] };
}

function clover3dScene(n, caption) {
  return { beats: [{ pts: paint(clover3d(n), GREEN), caption, live: (b, j, t, o) => { yaw(o, t * 0.35); o[3] = glint(b[1], t, 3.6, 0.35); } }] };
}

function cloverStoryScene(n, caption) {
  const [a, r] = share(n, [4, 1]);
  return { beats: [
    act([part("clover", paint(clover3d(n, 3), GREEN))], { caption: message('showScenes.aThreeLeafClover'), hold: 1, live: (b, j, t, o) => sway(o, t, 0.35) }),
    act([part("clover", paint(clover3d(n), GREEN))], { caption: message('showScenes.aFourthLeafAppearsForLuck'), hold: 1.2, live: (b, j, t, o) => sway(o, t, 0.35) }),
    act([part("clover", paint(clover3d(a), GREEN)), part("rain", paint(sparkleShell(r, 1.35), GOLD))], { caption: message('showScenes.forTheNewYearSurroundedBySparks'), live: (b, j, t, o) => { if (j < a) yaw(o, t * 0.35); else { yaw(o, -t * 0.12); o[3] = sparkle(j, t, 0.85, 1.4); } } }),
  ] };
}

export const builders = { clover2d: clover2dScene, clover3d: clover3dScene, cloverStory: cloverStoryScene };
