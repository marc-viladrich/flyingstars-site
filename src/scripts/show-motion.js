// Shared motion and light vocabulary of the show configurator. Motif builders (show-scenes.js and the occasion modules
// in src/scripts/scenes/) describe a picture as points and a live(base, j, t, out) function; everything here writes
// into out = [x, y, z, alpha] and stays within what real show drones can do: smooth motion with bounded speed and
// acceleration (tests/show-physics.spec.ts), effects made with light on drones that stay in place.
// Calibrated on FlyingStars' own shows (freelance/clients/flyingstars/06-show-animationen-2026-10, rounds 1 and 2).

import { share } from "./show-shapes.js";
import { lightOrder } from "./formation/index.js";

export { share };
export const TAU = Math.PI * 2;
export const DIAMOND = [200, 235, 255], GREEN = [90, 222, 120];
export const WARM = [246, 241, 232], GOLD = [255, 196, 92], PINK = [255, 92, 138], VIOLET = [219, 100, 232], CYAN = [51, 237, 242], BLUE = [90, 120, 255], ORANGE = [255, 140, 50], RED = [220, 60, 70], MOON = [235, 232, 210];
export const mix = (a, b, u) => { const k = Math.max(0, Math.min(1, u)); return a.map((v, i) => Math.round(v + (b[i] - v) * k)); };
export const paint = (pts, color) => pts.map((p, i) => [p[0], p[1], p[2] || 0, ...(typeof color === "function" ? color(p, i) : color)]);
export const place = (pts, s, dx = 0, dy = 0, dz = 0, a = 0) => pts.map(([x, y, z = 0, ...c]) => [(x * Math.cos(a) - y * Math.sin(a)) * s + dx, (x * Math.sin(a) + y * Math.cos(a)) * s + dy, z * s + dz, ...c]);
export const frac = (x) => x - Math.floor(x);
export const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
export const hash = (j) => frac(Math.sin(j * 12.9898) * 43758.5453);

// ---------- motion ----------
/** Turn about the vertical axis through (cx, cz). */
export function yaw(out, a, cx = 0, cz = 0) { const x = out[0] - cx, z = out[2] - cz, c = Math.cos(a), s = Math.sin(a); out[0] = cx + x * c + z * s; out[2] = cz - x * s + z * c; }
/** Turn in the picture plane about (cx, cy). */
export function roll(out, a, cx = 0, cy = 0) { const x = out[0] - cx, y = out[1] - cy, c = Math.cos(a), s = Math.sin(a); out[0] = cx + x * c - y * s; out[1] = cy + x * s + y * c; }
/** Turn about the horizontal axis through (cy, cz): tips the object towards or away from the audience. */
export function pitch(out, a, cy = 0, cz = 0) { const y = out[1] - cy, z = out[2] - cz, c = Math.cos(a), s = Math.sin(a); out[1] = cy + y * c - z * s; out[2] = cz + y * s + z * c; }
/** Vierzehnte Fassung (Marc: „wo ein Teil steht, darf er leben“): Sterne und kleine Teile treiben sanft um ihren Platz,
 * jede Drohne in eigenem, langsamem Takt (Perioden 9–16 s), ohne Richtung, also ohne Finte. amp in Szeneneinheiten. */
export const drift = (o, j, t, amp = 0.03) => { const p = hash(j + 0.37) * TAU, q = hash(j + 0.71) * TAU, f = 0.4 + 0.3 * hash(j + 0.13); o[0] += amp * Math.sin(t * f + p); o[1] += amp * 0.8 * Math.sin(t * f * 0.83 + q); };
/** Slow sway: the object turns a little to each side, which shows its depth. */
export const sway = (out, t, amp = 0.3, period = 10) => yaw(out, Math.sin((t * TAU) / period) * amp);
/** Ease in and out between two poses over a cycle: 0 → 1 → 0, resting a moment at each end (for kicks, waves). */
export const swing = (t, period, rest = 0.3) => {
  const u = frac(t / period), k = (1 - rest) / 2, h = rest / 2;
  return u < k ? smooth(u / k) : u < k + h ? 1 : u < 2 * k + h ? 1 - smooth((u - k - h) / k) : 0;
};

// ---------- light (drones stay in place) ----------
// Light effects brighten or rest near full light (Marc, round 8): above 1 a drone's glow grows and its core whitens.
/** Calm breathing light, never below 0.9. */
export const breathe = (t, period = 2.6, phase = 0) => 0.9 + 0.3 * (0.5 + 0.5 * Math.sin(((t + phase) * TAU) / period));
/** A band of light travelling across a coordinate; it brightens by up to strength. */
export const glint = (x, t, period = 3.6, strength = 0.4, from = -1.4, to = 1.4) => 1 + strength * Math.exp(-(((x - (from + (to - from) * frac(t / period))) / 0.2) ** 2));
/** Sparkle: every drone flickers at its own pace between low and high. */
export const sparkle = (j, t, low = 0.8, high = 1.25) => low + (high - low) * (0.5 + 0.5 * Math.sin(t * (2.5 + 4 * hash(j)) + hash(j + 7) * 20));
/** Light running along a coordinate in one direction (rain falling, waves spreading, a flame flickering). */
export const chase = (x, t, speed, spacing = 0.5, low = 0.6, high = 1.4) => low + (high - low) * Math.exp(-((((frac((x - t * speed) / spacing) - 0.5) * spacing) / 0.07) ** 2));

/**
 * Drawing with light (round 2, NFL and the FlyingStars light tracings): the drones already stand on the outline,
 * dimmed; a bright head travels along the drawing order and leaves the line lit behind it. u ∈ [0, 1] is the drone's
 * place in the drawing order, the head reaches the end after `duration` seconds. Before the head arrives a drone
 * glows faintly (so the picture is never made of drones that appear from nothing), afterwards it stays lit.
 */
// Zwölfte Fassung (Marc, 30.10.2026): Ein Lichtlauf ist zusätzliche Helligkeit und dimmt die Form nie ab. Darum steht
// die Linie vor dem Kopf schon in voller Helligkeit (lit); `dim` bleibt als Parameter erhalten, wird aber nicht mehr
// unter lit gesetzt. Bewusst dunkle Drohnen setzen ihre Motive weiterhin selbst (siehe lift() in show-tempo.js).
export function trace(u, t, duration = 2.4, { delay = 0, dim = 0.12, head = 0.06, lit = 1 } = {}) {
  // Vierzehnte Fassung (Marc: „weich, ohne harten Rand“): der Kopf ist eine Glocke ohne Kante, die vorn sanft ansteigt
  // und hinten länger ausläuft; davor und danach steht die Linie in voller Helligkeit.
  const d = (t - delay) / duration - u;
  return Math.max(dim, lit) + 0.6 * Math.exp(-((d / (d < 0 ? head : head * 2.5)) ** 2));
}

/**
 * Vierzehnte Fassung (Marc, 30.10.2026, eigener Text): Eine Form zeichnet sich aus dem Nichts. Alle Drohnen stehen
 * dunkel, dann leuchten sie nacheinander in Schreibreihenfolge auf (u ∈ [0, 1], z. B. lightRank()), jede weich über
 * `soft` s; danach bleibt sie an. Ein leichter Schein am Kopf, ohne harte Kante.
 */
export function reveal(u, t, duration = 2.4, { delay = 0, soft = 0.35, lit = 1 } = {}) {
  const since = t - delay - u * duration;
  if (since <= 0) return 0;
  const on = smooth(since / soft);
  return on * lit + 0.45 * on * Math.exp(-since / 0.5);
}

/**
 * Vierzehnte Fassung: ein sanfter Schein, der in Schreib- bzw. Linienreihenfolge über die Form wandert (u ∈ [0, 1]),
 * wie beim Schmetterling: Glocke ohne Kante, langer Schweif, nur aufhellend.
 */
export function wander(u, t, period = 5.5, strength = 0.35, width = 0.09) {
  const head = -0.25 + 1.5 * frac(t / period), d = u - head;
  return 1 + strength * Math.exp(-((d / (d > 0 ? width : width * 2.2)) ** 2));
}

/** Stelle jedes Punktes auf einem Weg von Nachbar zu Nachbar entlang der Linien (lightOrder aus formation/), 0..1. */
export function lightRank(pts) {
  return lightOrder(pts.map((p) => ({ x: p[0], y: -p[1] })));
}

/**
 * A firework the way FlyingStars fly it (round 2, Frühlingsnacht 2:10–2:25): the drones barely move; the burst is
 * light. From the core a bright front runs outward along the rays, the colour cools from white-gold to the shell's
 * colour, then the shell glows out. r ∈ [0, 1] is the drone's distance from the core (fraction of the radius); the
 * cycle repeats every period. Returns [alpha, warmth] — warmth 1 = white-hot, 0 = shell colour.
 */
export function burstLight(r, t, period = 4.5, delay = 0) {
  const u = frac((t - delay) / period), front = u / 0.28; // the front reaches the rim after 28 % of the cycle
  if (front < r) return [0.18, 1]; // not lit yet: a faint ember on the ray, like a drone waiting dimmed
  const since = (u - (r * 0.28)) * period, fade = Math.exp(-since / 1.25);
  return [0.25 + 1.25 * fade + 0.15 * Math.max(0, 1 - since / 0.25), Math.exp(-since / 0.45)];
}

// Dreizehnte Fassung (Marc, 30.10.2026): `loosen` (ein Bild als stehende, gelockerte Funkenwolke) ist entfernt. Jeder
// Übergang über eine Wolke ist die lebendige Wolke in show-field.js (beat.cloud, auch für einzelne Teile).

/**
 * A figure with joints (round 2: the footballer kicking in Eisenhüttenstadt, the NFL catch, the faces of the
 * short animations). Limbs are polylines hung on a parent limb at a pivot; every limb turns by angle(t) about its
 * pivot, children turn with their parent (forward kinematics). Drones keep their place on their limb, so a kick is
 * drones flying a smooth arc, never light jumping between two poses.
 * rig(limbs, n) → { pts, live(base, j, t, out) }. limbs: [{ name, paths, pivot: [x, y], parent?, angle: (t) => rad,
 * weight? }]. Paths are polylines like in show-shapes (pts, closed).
 */
export function rig(limbs, n, sample) {
  const counts = share(n, limbs.map((l) => l.weight ?? pathLength(l.paths))), owner = [], pts = [];
  limbs.forEach((l, k) => { for (const p of sample(l.paths, counts[k])) { pts.push([p[0], p[1], p[2] || 0]); owner.push(k); } });
  const byName = new Map(limbs.map((l, k) => [l.name, k]));
  const chain = limbs.map((l) => { const c = []; let q = l; while (q) { c.push(byName.get(q.name)); q = q.parent ? limbs[byName.get(q.parent)] : null; } return c; });
  let at = NaN; const ang = new Float64Array(limbs.length);
  const live = (b, j, t, o) => {
    if (t !== at) { at = t; limbs.forEach((l, k) => { ang[k] = l.angle ? l.angle(t) : 0; }); }
    // innermost limb first: the point turns about its own joint, then about every parent joint outward
    for (const k of chain[owner[j]]) { if (ang[k]) roll(o, ang[k], limbs[k].pivot[0], limbs[k].pivot[1]); }
  };
  return { pts, owner, live };
}
const pathLength = (paths) => paths.reduce((s, { pts, closed = true }) => { let L = 0; for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; L += Math.hypot(b[0] - a[0], b[1] - a[1]); } return s + L; }, 0);

/**
 * Vierzehnte Fassung (Marc, 30.10.2026: „Finten … bitte überall raus“): die Uhr, nach der sich ein Bild bewegt. Im
 * Anflug steht das Bild (die Drohnen fliegen in eine ruhende Form), danach läuft die Bewegung sanft an (Geschwindigkeit
 * 0 → 1 über `ramp`) und kommt vor dem Bildwechsel sanft zum Stehen (1 → 0 über `brake`). So nimmt keine Drohne Schwung
 * aus einem Flügelschlag, Sprung oder einer Drehung in den nächsten Flug mit; vorher flog sie mit diesem Schwung erst
 * ein Stück weiter und dann zurück (Drache nach dem Delfin, Pokal nach dem Kopfsprung).
 * `hold` ist die Dauer der Handlung, wie das Motiv sie plant; die Uhr erreicht genau diesen Stand, das Bild steht dafür
 * um das An- und Abbremsen länger (clock.hold). `from`: Stand der Uhr am Anfang (eine Geschichte setzt die Bewegung des
 * vorigen Bildes fort, statt sie zurückzudrehen).
 */
export function steadyClock(hold, { ramp = 0.8, brake = 1, from = 0 } = {}) {
  // echte Haltezeit H: R/2 + (H − R − B) + B/2 = hold, mit R, B höchstens 40 % von H
  let H = hold + (ramp + brake) / 2;
  if (Math.min(ramp, H * 0.4) < ramp || Math.min(brake, H * 0.4) < brake) H = Math.max(hold + ramp / 2 + brake / 2 - Math.max(0, ramp - H * 0.4) / 2 - Math.max(0, brake - H * 0.4) / 2, hold / 0.6);
  const R = Math.min(ramp, H * 0.4), B = Math.min(brake, H * 0.4);
  H = hold + (R + B) / 2;
  const mid = H - B, up = (u) => u * u * u - (u * u * u * u) / 2; // ∫ smooth: Geschwindigkeit steigt sanft von 0 auf 1
  const clock = (t) => {
    if (t <= 0) return from;
    if (t < R) return from + R * up(t / R);
    if (t < mid) return from + R / 2 + (t - R);
    const w = Math.min(1, (t - mid) / B);
    return from + R / 2 + (mid - R) + B * (w - up(w));
  };
  clock.end = from + hold;
  clock.hold = H;
  return clock;
}

// ---------- beats ----------
/** A beat from named parts: part(name, pts, { rigid }) keeps its drones from beat to beat (object permanence). */
export const part = (name, pts, opts = {}) => ({ name, pts, ...opts });
/** A part marked offstage (it leaves the picture during the act) does not count for the picture's framing. */
export const act = (parts, extra = {}) => ({ pts: parts.flatMap((q) => q.pts), groups: parts.map((q) => ({ name: q.name, count: q.pts.length, rigid: Boolean(q.rigid) })), ...(parts.some((q) => q.offstage) ? { fitPts: parts.filter((q) => !q.offstage).flatMap((q) => q.pts) } : {}), ...extra });
