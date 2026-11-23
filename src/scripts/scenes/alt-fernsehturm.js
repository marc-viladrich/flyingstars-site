import { t as message } from "../../i18n/ui.mjs";
import { TAU, WARM, GOLD, CYAN, RED, mix, paint, frac, yaw, sway, glint } from "../show-motion.js";
import { share, tower, tower3d, waves, TOWER_SPHERE, gate3d } from "../show-shapes.js";

/** Fernsehturm colours, and its red warning light that blinks at the top. */
const towerPaint = (p) => (p[1] > 1.15 ? RED : p[1] > 0.25 && p[1] < 0.62 ? mix(WARM, CYAN, 0.35) : WARM);
const warning = (t) => 0.75 + 0.6 * Math.exp(-(((frac(t / 1.6) - 0.1) / 0.06) ** 2));

function towerScene(n, caption) {
  return { beats: [{ pts: paint(tower(n), (p) => (p[1] > 1.15 ? RED : WARM)), caption, live: (b, j, t, o) => { if (b[1] > 1.15) o[3] = warning(t); } }] };
}

function tower3dScene(n, caption) {
  return { beats: [{ pts: paint(tower3d(n), towerPaint), caption, live: (b, j, t, o) => {
  if (b[1] > 0.25 && b[1] < 0.62) o[3] = glint(Math.atan2(b[2], b[0]), t, 4, 0.45, -Math.PI, Math.PI); // light runs around the sphere
  else if (b[1] > 1.15) o[3] = warning(t);
  yaw(o, t * 0.2);
} }] };
}

function towerStoryScene(n, caption) {
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

export const builders = { tower: towerScene, tower3d: tower3dScene, towerStory: towerStoryScene };
