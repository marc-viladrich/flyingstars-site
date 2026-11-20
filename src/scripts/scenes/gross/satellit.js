import { t as message } from '../../../i18n/ui.mjs';
// Der Satellit (Runde 11, große Motive, Anlass Marketing, ab 700 Drohnen). Kandidat FSK-025 der Motiv-Shortlist
// (freelance/clients/flyingstars/25-motiv-shortlist-2026-11-20), Referenz „Satellite unfolding solar panels · 700“.
// Gebaut wie die 3D-Fahrzeuge (catalog-3d/technik.js): ein mechanischer Körper aus wenigen klaren Teilen, nur Kanten und
// Linien, keine Füllung. Lesbar an drei Zeichen: der Rumpf als Kasten (zwölf Kanten, Folie in Gold), zwei lange
// Solarflügel mit Zellenraster, die Parabolantenne unter dem Rumpf. Die Flügel sind Ziehharmonikas aus Segmenten mit
// Scharnieren: eingeklappt stehen die Segmente im Zickzack neben dem Rumpf, ausgeklappt bilden sie ein flaches Band.
// Jede Drohne eines Flügels kennt ihr Segment und ihre Stelle darauf; ihre Lage folgt aus den Scharnierwinkeln (eine
// kleine Kinematik wie beim Fußballer). Das äußere Segment öffnet etwas später als das innere: Nachlauf, kein starres
// Klappen. Mehr Drohnen kaufen längere Flügel (vier statt drei Segmente), Speisehorn mit Streben, Düse und eine zweite
// Antenne, im 3D+ dazu Breitenkreise auf der Erde.
//
//   satellite3d (3D, ab 700): der Satellit fliegt eingeklappt ein, klappt beide Flügel aus und schwenkt; die Flügel
//     drehen sich zur Sonne (Drehung um ihre Längsachse, das Raster verkürzt sich sichtbar), Sonnenglanz läuft über die
//     Zellen, die Positionslampe blinkt.
//   satelliteStory (3D+, ab 700): vier Akte über der Erdkrümmung. Er steht eingeklappt im Orbit, erst klappt der linke
//     Flügel aus, dann der rechte, dann sendet die Antenne einen Lichtimpuls: drei Ringe lösen sich nacheinander aus der
//     Schüssel, fliegen weiter werdend zur Erde und liegen dort als Ausleuchtungszone (Footprint), die nachglüht.
// Steigerung von Rakete und Mondlandung (in der Motivliste direkt dahinter): die Teile heißen wie in der Mondlandung
// (rocket, trail, world, stars), so bleiben die Drohnen beim Motivwechsel in ihrem Teil: die gelandete Rakete wird der
// Satellit, die Mondoberfläche die Erdkrümmung, der Sternenhimmel bleibt, Flagge und Staub werden die Signalringe.
// Wächter: scripts/satellit.test.mjs.
import { TAU, GOLD, WARM, CYAN, BLUE, DIAMOND, RED, VIOLET, mix, smooth, yaw, roll, pitch, part, act, hash, sparkle } from '../../show-motion.js';
import { curves, spot, assemble } from '../catalog-3d/kit.js';

const lerp = (a, b, u) => a + (b - a) * u;
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => mul(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));
/** smootherstep: Anfang und Ende ohne Geschwindigkeit und ohne Beschleunigung (wie die Flüge der Engine). */
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));
const ring = (c, r, e1, e2, k = 48) => ({ pts: Array.from({ length: k }, (_, i) => { const a = (i / k) * TAU; return add(c, add(mul(e1, Math.cos(a) * r), mul(e2, Math.sin(a) * r))); }), closed: true });

// ---------------------------------------------------------------------------------------------------------------------
// Bauplan (Körperrahmen: x zu den Flügeln, y oben, z zum Publikum; Rumpfmitte im Ursprung)
// ---------------------------------------------------------------------------------------------------------------------
/** Detailstufe nach Drohnen: 0 bis 799, 1 bis 899, 2 ab 900. */
export const satLevel = (n) => (n >= 900 ? 2 : n >= 800 ? 1 : 0);
const HX = 0.18, HY = 0.21, HZ = 0.17; // halbe Kantenlängen des Rumpfs
const X0 = HX + 0.15; // inneres Scharnier jedes Flügels (am Ende des Auslegers)
const SW = 0.34, SH = 0.62; // Segment: Breite entlang des Flügels, Höhe
const segments = (lv) => (lv >= 2 ? 4 : 3);
const HINGE_GAP = 0.03; // Spalt zwischen zwei Paneelen am Klappscharnier
const CLOSED = 1.36; // Scharnierwinkel eingeklappt (rad): Zickzack mit genug Abstand zwischen den Segmenten
// Parabolantenne unter dem Rumpf, zur Erde und etwas zum Publikum geneigt
const DISH = { v: [0, -HY - 0.1, 0.02], axis: norm([0, -1, 0.42]), R: 0.25, depth: 0.075 };
const DISH_E1 = norm(cross(DISH.axis, [0, 0, 1])), DISH_E2 = norm(cross(DISH.axis, DISH_E1));
const PULSE_R = [0.8, 0.57, 0.34]; // Ringe in der Schüssel, die als Lichtimpuls fliegen (Anteil von R, von außen)
/** Punkt der Schüssel bei Radius r (Anteil von R) und Winkel a. */
const dishAt = (r, a) => { const rr = r * DISH.R, h = DISH.depth * r * r; return add(DISH.v, add(mul(DISH.axis, h), add(mul(DISH_E1, Math.cos(a) * rr), mul(DISH_E2, Math.sin(a) * rr)))); };

/** Teile des Satelliten in Ruhelage (Flügel ausgeklappt, flach, zum Publikum). */
function satParts(lv) {
  const K = segments(lv), parts = [];
  // Rumpf: zwölf Kanten
  const c = (sx, sy, sz) => [sx * HX, sy * HY, sz * HZ];
  const edges = [];
  for (const sz of [-1, 1]) edges.push({ pts: [c(-1, -1, sz), c(1, -1, sz), c(1, 1, sz), c(-1, 1, sz)], closed: true });
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) edges.push({ pts: [c(sx, sy, -1), c(sx, sy, 1)] });
  parts.push(curves('bus', edges, { w: 1.1 }));
  // Folienband vorn (eine Querlinie auf der Vorderseite), ab Stufe 1 ein Radiatorfeld
  const face = [[[-HX, 0.06, HZ], [HX, 0.06, HZ]]];
  if (lv >= 1) face.push({ pts: [[-HX * 0.55, -0.02, HZ], [HX * 0.55, -0.02, HZ], [HX * 0.55, -HY * 0.7, HZ], [-HX * 0.55, -HY * 0.7, HZ]], closed: true });
  parts.push(curves('foil', face, { w: 0.8 }));
  // Ausleger und Joch: vom Rumpf zum inneren Scharnier, ein Dreieck (mechanisch, nicht bloß eine Stange)
  for (const s of [1, -1]) parts.push(curves(s > 0 ? 'yokeR' : 'yokeL', [[[s * HX, 0, 0], [s * X0, SH * 0.32, 0]], [[s * HX, 0, 0], [s * X0, -SH * 0.32, 0]]], { w: 0.9 }));
  // Flügel: Segmentrahmen und Zellenraster (eine Senkrechte, drei bis vier Waagerechte je Segment)
  const rows = lv >= 1 ? 4 : 3;
  for (const s of [1, -1]) {
    const frame = [], grid = [];
    for (let i = 0; i < K; i++) {
      const x0 = s * (X0 + i * SW), x1 = s * (X0 + (i + 1) * SW), y = SH / 2;
      // Waagerechte enden kurz vor einem Klappscharnier (Spalt zwischen den Paneelen): eingeklappt laufen die Segmente
      // dort spitz zusammen, und zwei Drohnen kämen sich zu nahe
      const g0 = x0 + s * (i > 0 ? HINGE_GAP : 0), g1 = x1 - s * (i < K - 1 ? HINGE_GAP : 0);
      frame.push([[x0, -y, 0], [x0, y, 0]], [[g0, y, 0], [g1, y, 0]], [[g0, -y, 0], [g1, -y, 0]]);
      if (i === K - 1) frame.push([[x1, -y, 0], [x1, y, 0]]);
      grid.push([[(x0 + x1) / 2, -y, 0], [(x0 + x1) / 2, y, 0]]);
      for (let r = 1; r <= rows; r++) { const yy = -y + (r * SH) / (rows + 1); grid.push([[g0, yy, 0], [g1, yy, 0]]); }
    }
    parts.push(curves(s > 0 ? 'frameR' : 'frameL', frame, { w: 1.15 }), curves(s > 0 ? 'gridR' : 'gridL', grid, { w: 0.62 }));
  }
  // Antenne: Mast, Schüsselrand, Rippen, Impulsringe; ab Stufe 1 Speisehorn mit drei Streben
  parts.push(curves('mast', [[[0, -HY, 0], DISH.v]]));
  parts.push(curves('dish', [{ pts: Array.from({ length: 56 }, (_, i) => dishAt(1, (i / 56) * TAU)), closed: true }, ...[0, 1, 2, 3].map((k) => Array.from({ length: 9 }, (_, i) => dishAt(0.12 + (0.88 * i) / 8, (k / 4) * TAU + Math.PI / 4)))], { w: 1.1 }));
  PULSE_R.forEach((r, k) => parts.push(curves(`puls${k}`, [{ pts: Array.from({ length: 48 }, (_, i) => dishAt(r, (i / 48) * TAU)), closed: true }], { w: 1.7 - 0.25 * k }))); // dichter: sie werden auf der Erde weit
  if (lv >= 1) {
    const F = add(DISH.v, mul(DISH.axis, 0.2));
    parts.push(curves('feed', [0, 1, 2].map((k) => [dishAt(1, (k / 3) * TAU + 0.5), F]), { w: 0.75 }), spot('horn', F, 3, 0.022, DISH.axis));
  }
  // oben: Stabantenne mit Positionslampe; ab Stufe 2 zusätzlich Düse und eine kleine zweite Schüssel
  parts.push(curves('whip', [[[HX * 0.5, HY, -HZ * 0.4], [HX * 0.5, HY + 0.24, -HZ * 0.4]]]), spot('lamp', [HX * 0.5, HY + 0.27, -HZ * 0.4], 1, 0.02));
  if (lv >= 2) {
    const C = [-HX * 0.45, HY + 0.05, 0.02], ax = norm([-0.5, 1, 0.6]), e1 = norm(cross(ax, [0, 0, 1])), e2 = norm(cross(ax, e1));
    parts.push(curves('dish2', [ring(add(C, mul(ax, 0.03)), 0.075, e1, e2, 28), [[-HX * 0.45, HY, 0.02], C]]));
  }
  return parts;
}

/** Flügeldrohne: Seite s, Segment i, Stelle a entlang des Segments (ab seinem inneren Scharnier), Höhe b. */
function wingSlot(p, K) {
  const s = Math.sign(p[0]), d = Math.abs(p[0]) - X0, i = Math.max(0, Math.min(K - 1, Math.floor((d + 1e-9) / SW)));
  return { s, i, a: d - i * SW, b: p[1] };
}
/** Lage einer Flügeldrohne im Körperrahmen: th(i) = Scharnierwinkel des Segments i (0 = flach), beta = Drehung des
 * Flügels um seine Längsachse (Sonnennachführung). Die Segmente knicken abwechselnd zum Publikum und zurück. */
function wingPoint(w, th, beta, out) {
  let x = X0, z = 0;
  for (let k = 0; k < w.i; k++) { const al = (k % 2 ? -1 : 1) * th(k); x += SW * Math.cos(al); z += SW * Math.sin(al); }
  const al = (w.i % 2 ? -1 : 1) * th(w.i);
  x += w.a * Math.cos(al); z += w.a * Math.sin(al);
  const y = w.b, cb = Math.cos(beta), sb = Math.sin(beta);
  out[0] = w.s * x; out[1] = y * cb - z * sb; out[2] = y * sb + z * cb;
  return out;
}
const WING_TAGS = new Set(['frameR', 'frameL', 'gridR', 'gridL']);
const YOKE_TAGS = new Set(['yokeR', 'yokeL']);
const PULSE = (tag) => (tag.startsWith('puls') ? +tag.slice(4) : -1);

/** Der Satellit als Drohnenmodell: Punkte in Ruhelage, Teilnamen, Flügelstellen, Winkel der Impulsringe. */
export function satModel(n, lv = satLevel(n)) {
  const K = segments(lv), { pts, tags } = assemble(satParts(lv), n);
  const wing = pts.map((p, j) => (WING_TAGS.has(tags[j]) ? wingSlot(p, K) : null));
  // Winkel jeder Ringdrohne in der Schüssel (für die Zuordnung zum Footprint ohne Kreuzungen)
  const ang = pts.map((p, j) => { if (PULSE(tags[j]) < 0) return 0; const q = sub(p, DISH.v); return Math.atan2(dot(q, DISH_E2), dot(q, DISH_E1)); });
  return { lv, K, pts, tags, wing, ang };
}

// ---------------------------------------------------------------------------------------------------------------------
// Bewegung
// ---------------------------------------------------------------------------------------------------------------------
/** Scharnierwinkel eines Flügels, der zur Zeit t0 über dur Sekunden aufklappt; das äußere Segment folgt mit lag s je
 * Segment (Nachlauf). Vorher eingeklappt (CLOSED), danach flach. */
const unfold = (t, t0, dur, lag = 0.35) => (i) => CLOSED * (1 - ease((t - t0 - lag * i) / dur));

/** Körperhaltung: Schwenk (yaw), Diagonale in der Bildebene (roll), leichte Aufsicht; Mitte bei (cx, cy). */
function placeBody(o, ya, ro, cx, cy, sc = 1) { yaw(o, ya); roll(o, ro); pitch(o, 0.1); o[0] = o[0] * sc + cx; o[1] = o[1] * sc + cy; o[2] *= sc; return o; }

/** Drohne j des Satelliten im Körperrahmen zur Zeit t: Flügel nach th/beta je Seite, alles andere starr. */
function bodyPoint(m, j, thR, thL, beR, beL, out) {
  const p = m.pts[j], tag = m.tags[j], w = m.wing[j];
  if (w) return wingPoint(w, w.s > 0 ? thR : thL, w.s > 0 ? beR : beL, out);
  out[0] = p[0]; out[1] = p[1]; out[2] = p[2];
  if (YOKE_TAGS.has(tag)) { const be = p[0] > 0 ? beR : beL, y = out[1], z = out[2]; out[1] = y * Math.cos(be) - z * Math.sin(be); out[2] = y * Math.sin(be) + z * Math.cos(be); }
  return out;
}

const satColour = (tag, p) => {
  if (tag === 'bus') return mix(GOLD, WARM, 0.25);
  if (tag === 'foil') return GOLD;
  if (tag.startsWith('frame')) return mix(CYAN, DIAMOND, 0.45);
  if (tag.startsWith('grid')) return mix(mix(BLUE, CYAN, 0.35), VIOLET, 0.15 + 0.3 * Math.min(1, Math.abs(p[1]) / (SH / 2)));
  if (tag.startsWith('yoke') || tag === 'mast' || tag === 'whip' || tag === 'feed') return WARM;
  if (tag === 'lamp') return RED;
  if (tag === 'horn') return GOLD;
  if (tag.startsWith('puls')) return mix(CYAN, DIAMOND, 0.3);
  return DIAMOND; // Schüssel
};
/** Licht der Flügel: Sonnenglanz läuft über die Zellen, stärker, je mehr der Flügel zur Sonne steht. */
const panelLight = (tag, p, t, k = 1) => (tag.startsWith('grid') || tag.startsWith('frame') ? 1 + 0.42 * k * Math.exp(-((((Math.abs(p[0]) - X0) / (SW * 4) - ((t / 5.5) % 1.4 - 0.2)) / 0.09) ** 2)) : 1);
/** Positionslampe: kurzer Doppelblitz alle 2,4 s. */
const blink = (t) => { const u = ((t % 2.4) + 2.4) % 2.4; return 0.7 + 0.9 * (Math.exp(-(((u - 0.1) / 0.06) ** 2)) + Math.exp(-(((u - 0.4) / 0.06) ** 2))); };

// ---------------------------------------------------------------------------------------------------------------------
// 3D: der Satellit klappt aus und schwenkt
// ---------------------------------------------------------------------------------------------------------------------
const H3 = { open: 0.8, dur: 3.2, hold: 13, yaw0: 0.42, roll: 0.3 };
function pose3d(m, j, t, out) {
  const th = unfold(t, H3.open, H3.dur), on = smooth((t - H3.open - H3.dur) / 2), be = 0.5 * on * Math.sin(((t - 4) * TAU) / 10);
  bodyPoint(m, j, th, th, be, be, out);
  // er schwenkt aus der Dreiviertelansicht hin und her und schwebt
  return placeBody(out, H3.yaw0 + 0.38 * smooth(t / 3) * Math.sin((t * TAU) / 14), H3.roll, 0, 0.025 * Math.sin((t * TAU) / 6));
}

// ---------------------------------------------------------------------------------------------------------------------
// 3D+: über der Erde, Flügel nacheinander, Lichtimpuls
// ---------------------------------------------------------------------------------------------------------------------
// Akte auf einer gemeinsamen Zeitachse; jedes Bild beginnt dort, wo das vorige endet (starre Teile, keine Wolke).
const ACT = [0, 2.5, 7.5, 12.5, 21];
const STORY = { roll: 0.3, yaw0: 0.5, cx: 0.04, cy: 0.5, sc: 1.32, openL: 2.7, openR: 7.7, dur: 3.4, emit: [13.3, 14.1, 14.9], fly: 2.8 };
// Erde: Kugel weit unten und etwas hinten; S = Punkt unter dem Satelliten (dort landet der Impuls)
const EARTH = { c: [0, -4.35, -1.3], r: 3.5 };
const SUB = { g: 0.24, ps: Math.PI / 2 + 0.08 }; // Lage von S auf der Kugel: Polabstand, Länge (π/2 = vorn)
const NS = [Math.sin(SUB.g) * Math.cos(SUB.ps), Math.cos(SUB.g), Math.sin(SUB.g) * Math.sin(SUB.ps)], S_PT = add(EARTH.c, mul(NS, EARTH.r));
const FOOT = [0.74, 0.5, 0.28]; // Radien der Ausleuchtungszone je Ring (von außen; Tangentialebene)
/** Erdkrümmung als Kugelkappe: Horizont (Umriss von vorn), Atmosphäre darüber, ein Gradnetz auf der vorderen Kappe
 * (Breitenkreise und Meridiane vom Pol am Horizont nach vorn), auf dem der Footprint liegt. Mehr Drohnen: dichteres Netz. */
function earthParts(lv) {
  const { c, r } = EARTH, span = 0.62, arc = (R, k = 90) => Array.from({ length: k + 1 }, (_, i) => { const a = Math.PI / 2 - span + (2 * span * i) / k; return [c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R, c[2]]; });
  const sph = (g, ps) => [c[0] + r * Math.sin(g) * Math.cos(ps), c[1] + r * Math.cos(g), c[2] + r * Math.sin(g) * Math.sin(ps)];
  const lats = lv >= 1 ? [0.17, 0.31, 0.45] : [0.2, 0.4], mers = lv >= 2 ? [-1.05, -0.5, 0.5, 1.05] : [-0.8, 0.8];
  const G = 0.5; // das Netz endet unten weich (die Kappe ist größer als das Bild)
  return [
    curves('horizon', [arc(r)], { w: 1.25 }),
    curves('atmo', [arc(r + 0.1, 70).slice(5, -5)], { w: 0.7 }),
    curves('lat', lats.map((g) => Array.from({ length: 61 }, (_, i) => sph(g, 0.08 * Math.PI + (0.84 * Math.PI * i) / 60))), { w: 0.55 }),
    curves('lat', mers.map((m) => Array.from({ length: 25 }, (_, i) => sph(0.04 + (G * i) / 24, Math.PI / 2 + m))), { w: 0.55 }),
  ];
}
/** Footprint: Ring k auf der Kugel um S, Winkel a (Achsen wie die Schüssel, auf die Tangentialebene gelegt). */
function footAt(k, a, f1, f2) {
  const q = add(NS, add(mul(f1, (Math.cos(a) * FOOT[k]) / EARTH.r), mul(f2, (Math.sin(a) * FOOT[k]) / EARTH.r)));
  return add(EARTH.c, mul(norm(q), EARTH.r + 0.05)); // knapp über dem Gradnetz: Licht über der Erde, keine Drohne auf einer Netzlinie
}
/** Sterne: feste Punkte im Himmel, nicht auf dem Satelliten oder der Erde. */
function starField(count, avoid) {
  const out = [];
  // Mindestabstand schrittweise kleiner, bis alle Sterne Platz haben (bei 1000 Drohnen ist der Himmel voller)
  for (let gap = 0.22, i = 0; out.length < count && gap > 0.05; gap *= 0.85) for (let tries = 0; out.length < count && tries < count * 30; tries++, i++) {
    const p = [-1.8 + 3.6 * hash(i * 3 + 1), -0.6 + 1.85 * hash(i * 3 + 2), -0.5 - 0.3 * hash(i * 3 + 3)];
    if (avoid.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 0.15)) continue;
    if (out.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < gap)) continue;
    out.push(p);
  }
  return out;
}

export function storyModel(n) {
  const lv = satLevel(n), ST = Math.round(n * 0.035);
  const earth = assemble(earthParts(lv), Math.round(n * (lv >= 1 ? 0.24 : 0.21)));
  const sat = satModel(n - earth.pts.length - ST, lv);
  return { lv, sat, earth, ST };
}

export const builders = {
  satellite3d: (n, caption) => {
    const m = satModel(n), col = m.pts.map((p, j) => satColour(m.tags[j], p));
    const at = (t) => m.pts.map((_, j) => [...pose3d(m, j, t, [0, 0, 0]), ...col[j]]);
    // Bildausschnitt: alle Lagen (eingeklappt, offen, gedreht), damit nichts aus dem Bild schwenkt
    const fitPts = [0, 4.5, 7, 9.5, 12, 13].flatMap((t) => at(t)).filter((_, i) => i % 3 === 0);
    return { beats: [{ pts: at(0), caption, hold: H3.hold, fitPts, live: (b, j, t, o) => {
      pose3d(m, j, t, o);
      const tag = m.tags[j];
      o[3] = tag === 'lamp' ? blink(t) : panelLight(tag, m.pts[j], t, smooth((t - 3) / 2));
    } }] };
  },

  satelliteStory: (n) => {
    const { lv, sat: m, earth, ST } = storyModel(n), B = m.pts.length;
    const PU = m.pts.map((_, j) => PULSE(m.tags[j]));
    // Drohnenreihenfolge: Satellit ohne Impulsringe | Impulsringe | Erde | Sterne (Teile wie in der Mondlandung)
    const body = m.pts.map((_, j) => j).filter((j) => PU[j] < 0), ring = m.pts.map((_, j) => j).filter((j) => PU[j] >= 0);
    const order = [...body, ...ring], R0 = body.length, E0 = B, S0 = B + earth.pts.length;
    const satCol = order.map((j) => satColour(m.tags[j], m.pts[j]));
    const earthCol = earth.pts.map((p, k) => (earth.tags[k] === 'atmo' ? mix(CYAN, DIAMOND, 0.3) : earth.tags[k] === 'lat' ? mix(BLUE, CYAN, 0.4) : mix(BLUE, CYAN, 0.25)));
    const stars = starField(ST, [...earth.pts, ...m.pts.map((p) => { const o = [...p]; placeBody(o, STORY.yaw0, STORY.roll, STORY.cx, STORY.cy, STORY.sc); return o; })]);
    if (stars.length < ST) throw new Error(`Satellit ${n}: nur ${stars.length} von ${ST} Sternen`);
    // Haltung über die ganze Geschichte: er schwenkt langsam, zum Impuls hin dreht er die Schüssel zur Erde
    // Akt 1: er dreht sich aus dem Profil in die Dreiviertelansicht (kommt ins Bild), Akt 4: Schüssel zur Erde
    const yawAt = (T) => STORY.yaw0 + 0.75 * (1 - ease(T / ACT[1])) + 0.16 * Math.sin((T * TAU) / 18) - 0.22 * smooth((T - 11.3) / 2.2);
    const bob = (T) => 0.02 * Math.sin((T * TAU) / 7);
    const thL = (T) => unfold(T, STORY.openL, STORY.dur), thR = (T) => unfold(T, STORY.openR, STORY.dur);
    const beta = (T) => 0.35 * smooth((T - STORY.openR - STORY.dur) / 2.5); // beide Flügel neigen sich danach zur Sonne
    // Footprint-Achsen: die Schüsselachsen der Haltung beim ersten Impuls, auf die Tangentialebene in S gelegt
    const Te = STORY.emit[0], world = (v) => { const o = [...v]; yaw(o, yawAt(Te)); roll(o, STORY.roll); pitch(o, 0.1); return o; };
    const f1 = norm(sub(world(DISH_E1), mul(NS, dot(world(DISH_E1), NS)))), f2 = norm(cross(NS, f1));
    const satPoint = (j, T, o) => { const th = thR(T), tl = thL(T), be = beta(T); bodyPoint(m, j, th, tl, be, be, o); return placeBody(o, yawAt(T), STORY.roll, STORY.cx, STORY.cy + bob(T), STORY.sc); };
    const pose = (k, T, o) => {
      if (k < B) {
        const j = order[k], pk = PU[j];
        satPoint(j, T, o);
        if (pk >= 0) { // Impulsring: löst sich zur Zeit emit[pk] und fliegt zur Erde, auf dem Weg weiter werdend
          const u = ease((T - STORY.emit[pk]) / STORY.fly);
          if (u > 0) { const g = footAt(pk, m.ang[j], f1, f2); for (let c = 0; c < 3; c++) o[c] += (g[c] - o[c]) * u; }
        }
        return o;
      }
      const p = k < S0 ? earth.pts[k - E0] : stars[k - S0];
      o[0] = p[0]; o[1] = p[1]; o[2] = p[2];
      if (k >= S0) { const h = hash(k + 0.37) * TAU; o[0] += 0.02 * Math.sin(T * 0.45 + h); o[1] += 0.016 * Math.sin(T * 0.37 + 2 * h); } // Sterne treiben kaum merklich
      return o;
    };
    const light = (k, T) => {
      if (k >= S0) return sparkle(k, T, 0.55, 1.25);
      if (k >= E0) { // die Erde: ruhig, nach dem Impuls läuft Licht vom Footprint aus über den Horizont
        const p = earth.pts[k - E0], since = T - STORY.emit[0] - STORY.fly, d = Math.abs(p[0] - S_PT[0]);
        return 0.85 + (since > 0 ? 0.5 * Math.exp(-(((d - 0.55 * since) / 0.18) ** 2)) : 0);
      }
      const j = order[k], tag = m.tags[j], pk = PU[j];
      if (tag === 'lamp') return blink(T);
      if (pk >= 0) { // ein Ring leuchtet auf, wenn er sich löst, fliegt hell und glüht auf der Erde nach
        const s = T - STORY.emit[pk];
        if (s < -0.6) return 1;
        return 1 + 0.9 * Math.exp(-(((s - 0.1) / 0.35) ** 2)) + 0.35 * smooth(s / 0.4) * (s > STORY.fly ? 0.6 + 0.4 * Math.sin((T - STORY.emit[pk]) * 2.2) : 1);
      }
      if (tag === 'dish' || tag === 'horn') return 1 + 0.7 * STORY.emit.reduce((a, e) => a + Math.exp(-(((T - e + 0.25) / 0.22) ** 2)), 0); // die Schüssel blitzt bei jedem Impuls
      // Sonnenglanz auf den Zellen, sobald ein Flügel offen ist
      const w = m.wing[j]; if (!w) return 1;
      const open = smooth((T - (w.s < 0 ? STORY.openL : STORY.openR) - STORY.dur * 0.7) / 1.5);
      return panelLight(tag, m.pts[j], T - 6, open);
    };
    const col = [...satCol, ...earthCol, ...stars.map(() => WARM)];
    const at = (T) => Array.from({ length: n }, (_, k) => [...pose(k, T, [0, 0, 0]), ...col[k]]);
    const parts = (pts) => [part('rocket', pts.slice(0, R0), { rigid: true }), part('trail', pts.slice(R0, B), { rigid: true }), part('world', pts.slice(E0, S0), { rigid: true }), part('stars', pts.slice(S0), { rigid: true })];
    const fitPts = [0, 6, 11, 14, 17, ACT[4]].flatMap((T) => at(T).slice(0, S0)).filter((_, i) => i % 3 === 0);
    const caps = ['satellit.inOrbit', 'satellit.firstPanel', 'satellit.secondPanel', 'satellit.pulse'];
    return { beats: caps.map((key, a) => ({ ...act(parts(at(ACT[a])), { caption: message(key), hold: ACT[a + 1] - ACT[a], live: (b, k, t, o) => {
      const T = ACT[a] + t; pose(k, T, o); o[3] = light(k, T);
    } }), fitPts })) };
  },
};
