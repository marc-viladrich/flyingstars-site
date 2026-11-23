import { t as message } from "../../i18n/ui.mjs";
import logo from "../../data/logo-dots.json" with { type: "json" };
import { GOLD, VIOLET, CYAN, mix, paint, yaw, sway, glint } from "../show-motion.js";
import { sampleOutline, circle } from "../show-geometry.js";

const mark = (z = 0) => logo.dots.map(([x, y, r, g, b]) => [x, y, z, r, g, b]);
const logo2d = (n) => [...mark(), ...paint(sampleOutline([circle(0, 0, 1.45, 180)], n - logo.dots.length), GOLD)];
function logo3d(n) { const layers = [...mark(0.22), ...mark(-0.22)]; return [...layers, ...paint(sampleOutline([circle(0, 0, 1.45, 180)], n - layers.length), GOLD)]; }
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

function logo2dScene(n, caption) {
  const dots = logo.dots.length; // a light runs around the ring of the logo
  return { beats: [{ pts: logo2d(n), caption, live: (b, j, t, o) => { if (j >= dots) o[3] = 0.85 + 0.5 * Math.max(0, Math.cos(Math.atan2(b[1], b[0]) - t * 0.8)) ** 4; } }] };
}

function logo3dScene(n, caption) {
  return { beats: [{ pts: logo3d(n), caption, live: (b, j, t, o) => { o[3] = glint(b[0] + b[1] * 0.4, t); sway(o, t, 0.35); } }] };
}

function logoStoryScene(n, caption) {
  // Dreizehnte Fassung: die Funkenwirbel als stehende Bilder sind entfallen. Das Logo wird in der lebendigen Wolke
  // zum Ring aus Licht; vor dem Logo liegt die Wolke zwischen den Motiven (planClouds).
  const ring = paint(torusSurface(n, 0.95, 0.3), (p) => mix(CYAN, VIOLET, (p[1] + 0.6) / 1.2));
  return { beats: [
    { pts: logo3d(n), caption: message('showConfigurator.yourLogo'), hold: 3.4, live: (b, j, t, o) => sway(o, t, 0.3) },
    { pts: ring, caption: message('showScenes.becomesARingOfLightIn3d'), hold: 3.4, cloud: true, live: (b, j, t, o) => yaw(o, t * 0.3) },
  ] };
}

export const builders = { logo: logo2dScene, logo3d: logo3dScene, logoStory: logoStoryScene };
