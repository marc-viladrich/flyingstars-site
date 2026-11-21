import { t as message } from '../../../i18n/ui.mjs';
// Werkhalle wird Zukunftscampus (Runde 11b, große Motive, Anlass Jubiläum, ab 1000 Drohnen). Kandidat FSK-049 der
// Motiv-Shortlist (freelance/clients/flyingstars/25-motiv-shortlist-2026-11-20), Referenz „Abstract skyscrapers as wave
// forms · 1200“ (dort gefüllte Fassaden; hier nur Kanten).
// Das große Bild, das erst 1000 Drohnen erlauben: ein ganzes Ensemble um einen Platz, schräg von oben gesehen. Lesbar an
// vier Silhouetten: die alte Werkhalle mit Sheddach (Sägezahn, die steilen Glasflächen zum Licht) und Schornstein, ein
// gläserner Turm mit Geschossringen, ein lang geschwungener Neubau mit Wellendach, ein Würfel mit Bäumen auf dem Dach;
// dazwischen der Platz und der Weg vom alten Werktor. Nur Kanten, keine Flächen.
// Die Neubauten entstehen, wenn der Lichtstrom vom Werktor sie erreicht: der Turm liegt umgeklappt hinter dem Platz und
// klappt wie eine Pop-up-Seite um seine Bodenkante hoch (eine starre Drehung, jede Drohne fliegt einen weichen
// Viertelkreis); die beiden flachen steigen kaum sichtbar aus dem Boden auf (eine starre Verschiebung). Keine Drohne
// kommt einer anderen nahe.
//
//   factoryCampus3d (3D, ab 1000): der fertige Campus; die Fenster des Turms gehen Geschoss für Geschoss an, die
//     Sheds der alten Halle glühen, ein Licht kreist um den Platz, der Schornstein ist ein Leuchtturm, die Ansicht schwenkt.
//   factoryCampusStory (3D+, ab 1000): vier Akte. Die alte Werkhalle mit Schornstein → am Werktor beginnt ein Lichtstrom
//     und läuft über den Weg auf den Platz → die Neubauten richten sich nacheinander auf, wo das Licht ankommt → der
//     Campus leuchtet: Geschosse, Sheds, Bäume, Leuchtfeuer auf dem Schornstein, das Licht kreist um den Platz.
// Wächter: scripts/werkhalle.test.mjs.
import { TAU, GOLD, WARM, ORANGE, RED, CYAN, DIAMOND, BLUE, GREEN, VIOLET, mix, smooth, yaw, pitch, part, act, sparkle } from '../../show-motion.js';
import { curves, spot, assemble } from '../catalog-3d/kit.js';

const lerp = (a, b, u) => a + (b - a) * u;
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));
const PITCH = 0.32;

// ---------------------------------------------------------------------------------------------------------------------
// Bauplan (Boden y = 0, z zum Publikum; Platz in der Mitte)
// ---------------------------------------------------------------------------------------------------------------------
const HALL = { x0: -1.38, x1: -0.3, z0: -0.72, z1: -0.16, wall: 0.3, peak: 0.56, teeth: 4 };
const CHIMNEY = { x: -1.56, z: -0.9, h: 1.6, r0: 0.08, r1: 0.05 };
const GATE = { x: -0.84, w: 0.1, h: 0.17 };
const PLAZA = { c: [-0.12, 0.08], rx: 0.4, rz: 0.22 };
/** Neubauten: Grundriss, Höhe, Scharnier (Bodenkante, um die sie sich aufrichten) und Richtung, in die sie liegen. */
const TOWER = { x0: 0.3, x1: 0.72, z0: -0.78, z1: -0.36, h: 1.4, floors: 6, hinge: -0.78, d: -1 };
const WAVE = { x0: 0.18, x1: 1.3, z0: 0.4, z1: 0.72, h: 0.32, amp: 0.1, sink: 0.48 };
const CUBE = { x0: -1.34, x1: -0.82, z0: 0.24, z1: 0.72, h: 0.56, sink: 0.62 };
const NEW = { turm: TOWER, welle: WAVE, wuerfel: CUBE };
const rect = (x0, x1, y, z0, z1) => ({ pts: [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], closed: true });
const box = (b, h = b.h) => [rect(b.x0, b.x1, 0, b.z0, b.z1), rect(b.x0, b.x1, h, b.z0, b.z1), ...[[b.x0, b.z0], [b.x1, b.z0], [b.x1, b.z1], [b.x0, b.z1]].map(([x, z]) => [[x, 0, z], [x, h, z]])];

function hallParts() {
  const { x0, x1, z0, z1, wall, peak, teeth } = HALL, w = (x1 - x0) / teeth;
  // Sheddach: je Zahn eine flache Dachfläche, die zur steilen Glasfläche ansteigt
  const prof = (z) => { const p = [[x0, 0, z], [x0, wall, z]]; for (let i = 0; i < teeth; i++) { const a = x0 + i * w; p.push([a + w * 0.82, peak, z], [a + w * 0.82, wall, z]); } p.push([x1, wall, z], [x1, 0, z]); return p; };
  const ridges = [], sheds = [];
  for (let i = 0; i < teeth; i++) { const x = x0 + i * w + w * 0.82; ridges.push([[x, peak, z0], [x, peak, z1]]); sheds.push([[x, wall, z0 + 0.06], [x, wall, z1 - 0.06]]); }
  const gate = Array.from({ length: 15 }, (_, i) => { const a = Math.PI * (i / 14); return [GATE.x + GATE.w * Math.cos(a), GATE.h + GATE.w * Math.sin(a), z1]; });
  const { x, z, h, r0, r1 } = CHIMNEY, ring = (y, r, k = 16) => ({ pts: Array.from({ length: k }, (_, i) => { const a = (i / k) * TAU; return [x + r * Math.cos(a), y, z + r * Math.sin(a)]; }), closed: true });
  return [
    curves('halle', [prof(z1), prof(z0), [[x0, 0, z0], [x0, 0, z1]], [[x1, 0, z0], [x1, 0, z1]], [[x0, wall, z0], [x0, wall, z1]], [[x1, wall, z0], [x1, wall, z1]], ...ridges], { w: 1 }),
    curves('shed', sheds, { w: 0.9 }),
    curves('tor', [[[GATE.x - GATE.w, 0, z1], [GATE.x - GATE.w, GATE.h, z1], ...gate.slice(1, -1).reverse(), [GATE.x + GATE.w, GATE.h, z1], [GATE.x + GATE.w, 0, z1]].map((p, i, a) => (i ? p : p))], { w: 1.2 }),
    curves('schlot', [[[x - r0, 0, z], [x - r1, h, z]], [[x + r0, 0, z], [x + r1, h, z]], ring(h * 0.55, lerp(r0, r1, 0.55), 12)], { w: 1 }),
    curves('feuer', [ring(h, r1 + 0.012, 14)], { w: 1.4 }),
  ];
}
function newParts() {
  const T = TOWER, floors = Array.from({ length: T.floors - 1 }, (_, k) => rect(T.x0, T.x1, (T.h * (k + 1)) / T.floors, T.z0, T.z1));
  const W = WAVE, roof = (z) => Array.from({ length: 41 }, (_, i) => { const x = lerp(W.x0, W.x1, i / 40); return [x, W.h + W.amp * Math.sin(((x - W.x0) / (W.x1 - W.x0)) * TAU * 1.5), z]; });
  const wy = (x) => W.h + W.amp * Math.sin(((x - W.x0) / (W.x1 - W.x0)) * TAU * 1.5);
  const C = CUBE, trees = [[-1.2, 0.4], [-0.98, 0.6], [-0.96, 0.36]].map(([x, z], i) => spot('baum', [x, C.h + 0.07, z], 6, 0.05, [0, 1, 0.3]));
  return [
    curves('turm', box(T), { w: 1 }), curves('geschoss', floors, { w: 0.9 }),
    curves('welle', [roof(W.z1), roof(W.z0), [[W.x0, 0, W.z1], [W.x1, 0, W.z1]], [[W.x0, 0, W.z0], [W.x1, 0, W.z0]], ...[W.x0, W.x1].flatMap((x) => [[[x, 0, W.z0], [x, wy(x), W.z0]], [[x, 0, W.z1], [x, wy(x), W.z1]], [[x, wy(x), W.z0], [x, wy(x), W.z1]]])], { w: 1 }),
    curves('wuerfel', box(C), { w: 1 }), ...trees,
  ];
}
function siteParts() {
  const P = PLAZA, a0 = Math.atan2(-1, -1.4);
  // Weg vom Werktor zum Platz, dann der Platz als Ellipse (beginnt dort, wo der Weg ankommt)
  const entry = [P.c[0] + P.rx * Math.cos(a0), 0, P.c[1] + P.rz * Math.sin(a0)];
  return [
    curves('weg', [[[GATE.x, 0, HALL.z1 + 0.06], [GATE.x + 0.25, 0, HALL.z1 + 0.2], entry]], { w: 1.1 }),
    curves('platz', [{ pts: Array.from({ length: 64 }, (_, i) => { const a = a0 + (i / 64) * TAU; return [P.c[0] + P.rx * Math.cos(a), 0, P.c[1] + P.rz * Math.sin(a)]; }), closed: true }], { w: 1.1 }),
  ];
}
const ORDER = { halle: 0, shed: 0, tor: 0, schlot: 0, feuer: 0, turm: 1, geschoss: 1, welle: 1, wuerfel: 1, baum: 1, weg: 2, platz: 2 };
const BUILDING = { turm: 'turm', geschoss: 'turm', welle: 'welle', wuerfel: 'wuerfel', baum: 'wuerfel' };

/** Das Modell: alt (Halle, Schornstein, Tor) | neu (drei Neubauten) | Platz (Weg und Ellipse), je Drohne der Weg-Parameter. */
export function campusModel(n) {
  const { pts, tags } = assemble([...hallParts(), ...newParts(), ...siteParts()], n);
  const idx = pts.map((_, j) => j).sort((a, b) => ORDER[tags[a]] - ORDER[tags[b]] || a - b);
  const P = idx.map((j) => pts[j]), G = idx.map((j) => tags[j]);
  const counts = [0, 1, 2].map((k) => G.filter((t) => ORDER[t] === k).length);
  // Lichtweg: Abstand vom Tor über den Weg, dann um den Platz herum
  const gate = [GATE.x, HALL.z1 + 0.06], mid = [GATE.x + 0.25, HALL.z1 + 0.2], seg = Math.hypot(mid[0] - gate[0], mid[1] - gate[1]);
  const P0 = PLAZA, a0 = Math.atan2(-1, -1.4), entry = [P0.c[0] + P0.rx * Math.cos(a0), P0.c[1] + P0.rz * Math.sin(a0)], L1 = seg + Math.hypot(entry[0] - mid[0], entry[1] - mid[1]);
  const along = P.map((p, j) => {
    if (G[j] === 'weg') { const d0 = Math.hypot(p[0] - gate[0], p[2] - gate[1]); return d0 <= seg ? d0 : seg + Math.hypot(p[0] - mid[0], p[2] - mid[1]); }
    if (G[j] === 'platz') { let a = Math.atan2((p[2] - P0.c[1]) / P0.rz, (p[0] - P0.c[0]) / P0.rx) - a0; a = ((a % TAU) + TAU) % TAU; return L1 + a * 0.35; }
    return 0;
  });
  return { pts: P, tags: G, counts, along, L1 };
}

// ---------------------------------------------------------------------------------------------------------------------
// Bewegung: Neubauten richten sich um ihre Bodenkante auf (u = 0 liegend, 1 stehend); die ganze Szene schwenkt
// ---------------------------------------------------------------------------------------------------------------------
/** Drohne eines Neubaus bei Aufrichtung u. Der Turm klappt um seine Scharnierkante (parallel zu x, auf dem Boden) hoch;
 * die flachen Neubauten steigen als Ganzes aus dem Boden auf (eine Verschiebung, ihre Form bleibt). */
function raise(p, b, u, o) {
  if (b.sink) { o[0] = p[0]; o[1] = p[1] - b.sink * (1 - ease(u)); o[2] = p[2]; return o; }
  const phi = b.d * (Math.PI / 2) * (1 - ease(u)), c = Math.cos(phi), s = Math.sin(phi), dz = p[2] - b.hinge;
  o[0] = p[0]; o[1] = p[1] * c - dz * s; o[2] = b.hinge + p[1] * s + dz * c;
  return o;
}
function poser(m, upOf, yawAt) {
  return (j, T, o) => {
    const p = m.pts[j], t = m.tags[j], b = BUILDING[t];
    if (b) raise(p, NEW[b], upOf(b, T), o); else { o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; }
    o[2] -= 0.05; yaw(o, yawAt(T)); pitch(o, PITCH);
    return o;
  };
}
const BRICK = mix(ORANGE, RED, 0.3);
const colourOf = (t, p) => ({
  halle: BRICK, shed: mix(GOLD, WARM, 0.4), tor: GOLD, schlot: mix(BRICK, RED, 0.2), feuer: GOLD,
  turm: mix(CYAN, DIAMOND, 0.45), geschoss: mix(CYAN, BLUE, 0.3), welle: mix(VIOLET, BLUE, 0.35), wuerfel: mix(WARM, DIAMOND, 0.3), baum: GREEN,
  weg: GOLD, platz: mix(GOLD, WARM, 0.25),
}[t]);
/** Licht, das den Lichtweg entlang läuft: Kopf bei head (Einheiten ab Tor), dahinter bleibt es hell. */
const stream = (s, head, width = 0.12) => (head <= 0 ? 0 : smooth((head - s) / 0.25) * 0.45 + 0.9 * Math.exp(-(((s - head) / width) ** 2)));
const groupsOf = (m, pts) => { let s = 0; return ['alt', 'neu', 'platz'].map((g, k) => { const q = part(g, pts.slice(s, s + m.counts[k]), { rigid: true }); s += m.counts[k]; return q; }); };
const floorOf = (p) => Math.round((p[1] / TOWER.h) * TOWER.floors);

export const builders = {
  factoryCampus3d: (n, caption) => {
    const m = campusModel(n), col = m.pts.map((p, j) => colourOf(m.tags[j], p)), H = 16;
    const pose = poser(m, () => 1, (T) => 0.48 * Math.sin((T * TAU) / 18) * ease(T / 3));
    const at = (T) => m.pts.map((_, j) => [...pose(j, T, [0, 0, 0]), ...col[j]]);
    const fitPts = [0, 4.5, 9, 13.5].flatMap((T) => at(T)).filter((_, i) => i % 3 === 0);
    const loop = m.L1 + TAU * 0.35;
    return { beats: [{ ...act(groupsOf(m, at(0)), { caption, hold: H, live: (p, j, t, o) => {
      pose(j, t, o);
      const tag = m.tags[j], q = m.pts[j];
      if (tag === 'geschoss' || tag === 'turm') { const f = floorOf(q), on = smooth((t - 1 - f * 0.9) / 0.6) * (1 - smooth((t - 9 - f * 0.5) / 0.8)) + smooth((t - 11.5 - f * 0.5) / 0.6); o[3] = 0.75 + (tag === 'geschoss' ? 0.75 : 0.35) * Math.min(1, on); }
      else if (tag === 'platz' || tag === 'weg') o[3] = 0.7 + 0.9 * Math.exp(-((((m.along[j] - ((t * 0.55) % loop) + loop) % loop - 0.0) / 0.14) ** 2)) + (tag === 'weg' ? 0.1 : 0);
      else if (tag === 'feuer') o[3] = 1.2 + 0.5 * Math.sin(t * 2.4);
      else if (tag === 'shed') o[3] = 1.15 + 0.25 * Math.sin(t * 1.3 + q[0] * 4);
      else if (tag === 'baum') o[3] = sparkle(j, t, 0.9, 1.4);
      else o[3] = 1;
    } }), fitPts }] };
  },

  factoryCampusStory: (n) => {
    const m = campusModel(n), col = m.pts.map((p, j) => colourOf(m.tags[j], p));
    const ACT = [0, 3, 8, 14, 21];
    // Lichtstrom: startet am Tor (Akt 2), läuft über den Weg und um den Platz; die Neubauten richten sich auf, wenn er
    // ihre Seite des Platzes erreicht
    const SPEED = 0.42, START = 3.6, head = (T) => (T - START) * SPEED;
    const RISE = { wuerfel: 8.4, turm: 9.7, welle: 11.0 }, DUR = 2.6;
    const upOf = (b, T) => (T - RISE[b]) / DUR;
    const pose = poser(m, upOf, (T) => 0.22 * Math.sin((T * TAU) / 24) * ease(T / 3) + 0.3 * ease((T - 14.5) / 4));
    const at = (T) => m.pts.map((_, j) => [...pose(j, T, [0, 0, 0]), ...col[j]]);
    const fitPts = [0, 8, 9.5, 11, 12.5, 14, 17, 21].flatMap((T) => at(T)).filter((_, i) => i % 3 === 0);
    // Akt 1 und 2 näher an der alten Halle (eigener Bildausschnitt), zum Aufbau zieht die Kamera auf den ganzen Campus zurück
    const near = [0, 4, 8].flatMap((T) => at(T).filter((_, j) => !BUILDING[m.tags[j]])).filter((_, i) => i % 3 === 0);
    const loop = m.L1 + TAU * 0.35;
    const light = (j, T) => {
      const tag = m.tags[j], q = m.pts[j], b = BUILDING[tag];
      if (b) { // liegend nur als Ahnung, beim Aufrichten hell, im letzten Akt die Fenster
        const u = upOf(b, T), base = (b === 'turm' ? 0.13 : 0.05) + (b === 'turm' ? 0.87 : 0.95) * smooth(u * 1.4 + 0.2) + 0.45 * Math.exp(-(((u - 0.55) / 0.3) ** 2));
        if (tag === 'geschoss') return base + 0.75 * smooth((T - 14.6 - floorOf(q) * 0.45) / 0.6);
        if (tag === 'baum') return base * (T > 14.5 ? sparkle(j, T, 0.9, 1.45) : 1);
        return base + 0.2 * smooth((T - 15) / 1);
      }
      if (tag === 'weg' || tag === 'platz') return 0.55 + stream(m.along[j], head(T)) + (T > 14 ? 0.8 * Math.exp(-((((m.along[j] - ((T - 14) * 0.6 % loop) + loop) % loop) / 0.14) ** 2)) : 0);
      if (tag === 'tor') return 0.9 + 0.9 * Math.exp(-(((T - START) / 0.6) ** 2)) + 0.3 * smooth((T - 3) / 0.5);
      if (tag === 'feuer') return 0.8 + smooth((T - 14.8) / 1.2) * (0.8 + 0.5 * Math.sin(T * 2.4));
      if (tag === 'shed') return 0.85 + 0.6 * smooth((T - 15.4) / 1.2);
      return 1;
    };
    const caps = ['werkhalle.hall', 'werkhalle.gate', 'werkhalle.rise', 'werkhalle.campus'];
    return { beats: caps.map((key, a) => ({ ...act(groupsOf(m, at(ACT[a])), { caption: message(key), hold: ACT[a + 1] - ACT[a], live: (p, j, t, o) => {
      const T = ACT[a] + t; pose(j, T, o); o[3] = light(j, T);
    } }), ...(a < 2 ? { frame: 'werk', fitPts: near } : { frame: 'campus', fitPts }) })) };
  },
};
