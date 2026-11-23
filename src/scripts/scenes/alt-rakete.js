import { t as message } from "../../i18n/ui.mjs";
import { TAU, WARM, GOLD, CYAN, BLUE, ORANGE, RED, MOON, mix, paint, frac, smooth, hash, yaw, pitch, glint, sparkle, chase, part, act, drift } from "../show-motion.js";
import { rocketSolid, globe, launchPad, moonHorizon, flagStar, starField } from "../show-shapes.js";
import { share, rocket, flame } from "../show-shapes.js";

const flameColour = (top) => (p) => mix(GOLD, ORANGE, (top - p[1]) / 0.42);
const lerp = (a, b, u) => a + (b - a) * u;
// Fünfzehnte Fassung: die Flamme unter einer Rakete (Start und Landung). Drohne k von m steht an der Stelle f entlang der
// Flamme (0 an der Düse, 1 an der Spitze; dichter an der Düse) und seitlich bei ihrem Anteil l der halben Breite.
const flameF = (k, m) => ((k + 0.5) / m) ** 1.25;
const flameSide = (k) => 2 * frac(k * 0.618034 + 0.31) - 1;
// gleichmäßig über die Breite verteilt (goldener Schnitt)
/** Flammenform: schmal an der Düse, bauchig im oberen Drittel, spitz am Ende. */
const flameHalf = (f) => Math.sin(Math.PI * (0.16 + 0.84 * f)) ** 0.85 * (1 - 0.35 * f);
/** Wo Flammendrohne k steht: Düse (x, y), Länge len, größte halbe Breite width × 0,13. */
const flamePoint = (k, m, x, y, len, width) => { const f = flameF(k, m); return [x + flameSide(k) * flameHalf(f) * 0.13 * width, y - f * len, (hash(k + 3) - 0.5) * 0.04 * f]; };
/** Farbe: innen an der Düse weiß-gold, dann orange, die Spitze rot. */
const flameTint = (k, m) => { const f = flameF(k, m); return f < 0.45 ? mix(mix(WARM, GOLD, 0.5), ORANGE, f / 0.45) : mix(ORANGE, RED, (f - 0.45) / 0.55 * 0.7); };
/** Licht: hell an der Düse, dunkler zur Spitze, flackernd; Lichtpulse laufen nach unten (nur Licht, keine Bewegung). */
const flameLight = (k, m, t) => { const f = flameF(k, m); return (1.35 - 0.85 * f) * sparkle(k + 101, t * 1.6, 0.72, 1.12) * chase(f, t, 1.3, 0.45, 0.82, 1.18); };

function rocketScene(n, caption) {
  const [r, f] = share(n, [5, 1]), pts = [...paint(rocket(r), WARM), ...paint(flame(f, -0.6), flameColour(-0.6))];
  return { beats: [{ pts, caption, live: (b, j, t, o) => { o[1] += Math.sin(t * 0.6) * 0.03; if (j >= r) o[3] = chase(-b[1], t, 0.9, 0.2, 0.75, 1.4); } }] };
}

function rocket3dScene(n, caption) {
  // the rocket as a body (silhouette in two planes, hoops, fins) hovers, turns slowly about its axis and tips a
  // little; the flame is a cone of drones whose light runs downwards
  const [r, f] = share(n, [3, 1]), pts = [...paint(rocketSolid(r), (p) => mix(WARM, CYAN, (p[2] + 0.2) / 0.4)), ...paint(flame(f, -0.62, 0.12), flameColour(-0.62))];
  return { beats: [{ pts, caption, live: (b, j, t, o) => {
    if (j >= r) o[3] = chase(-b[1], t, 0.9, 0.2, 0.7, 1.45); else o[3] = glint(b[1], t, 4.5, 0.35, -0.8, 1.1);
    o[1] += Math.sin(t * 0.55) * 0.04; yaw(o, t * 0.3); pitch(o, 0.12 * Math.sin(t * 0.33));
  } }] };
}

function rocketStoryScene(n, caption) {
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

export const builders = { rocket: rocketScene, rocket3d: rocket3dScene, rocketStory: rocketStoryScene };
