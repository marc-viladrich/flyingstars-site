import { t as message } from "../../i18n/ui.mjs";
import { TAU, WARM, GOLD, paint, yaw, breathe, glint, part, act } from "../show-motion.js";
import { bulb2d, bulb3d, bulbGlass, filament } from "../show-shapes.js";
import { share } from "../show-shapes.js";

/** Evenly covered sphere surface (golden-angle spiral), like a mirror ball or a planet. */
const fib = (n, R, cx = 0, cy = 0, cz = 0) => { const GA = Math.PI * (3 - Math.sqrt(5)); return Array.from({ length: n }, (_, i) => { const y = 1 - ((i + 0.5) / n) * 2, r = Math.sqrt(1 - y * y), a = GA * i; return [cx + Math.cos(a) * r * R, cy + y * R, cz + Math.sin(a) * r * R]; }); };

function bulb2dScene(n, caption) {
  const [g] = share(n, [4, 1.2]); // the filament glows, light runs over the glass
  return { beats: [{ pts: paint(bulb2d(n), (p) => (Math.abs(p[0]) < 0.09 && p[1] > -0.43 && p[1] < 0.12 ? GOLD : WARM)), caption, live: (b, j, t, o) => { o[3] = j >= g ? breathe(t, 1.8) + 0.15 : glint(b[0] - b[1] * 0.3, t, 4, 0.3); } }] };
}

function bulb3dScene(n, caption) {
  const [glass, fil] = bulb3d(n);
  return { beats: [{ pts: [...paint(glass, WARM), ...paint(fil, GOLD)], caption, live: (b, j, t, o) => { yaw(o, t * 0.3); if (j >= glass.length) o[3] = breathe(t, 1.8) + 0.2; } }] };
}

function bulbStoryScene(n, caption) {
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

export const builders = { bulb2d: bulb2dScene, bulb3d: bulb3dScene, bulbStory: bulbStoryScene };
