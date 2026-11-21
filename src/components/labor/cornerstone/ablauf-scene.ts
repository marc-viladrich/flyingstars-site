// Isometrische Scroll-Szene für den Artikel „Wie funktioniert eine Drohnenshow?“ (Labor, Runde 18, 22.11.2026).
// Nach dem Muster von blog/story-scene.ts („Wie programmiert man eine Drohnenshow?“), aber nur für den Abschnitt „Ablauf
// einer Drohnenshow“ mit seinen vier Schlüsselschritten. Bewusst KEINE Drohne in Explosionsansicht, Software oder
// Simulation: das zeigt schon der Programmier-Artikel. Hier geht es um das, was das Publikum erlebt, als ein Bogen:
//   0 Vorbereitung     die Flotte steht im Animationsraster auf dem Feld
//   1 Start            alle heben gleichzeitig ab (ohne Versatz) und fliegen in eine erste Formation (Kreis)
//   2 Animation        der Kreis wird zum Herz, das leise schlägt (Bild aus Lichtpunkten, Bewegung als Animation)
//   3 Rückkehr         jede Drohne sinkt über ihren eigenen Startpunkt und landet dort
// Dieselbe Kamera und dasselbe Feld wie der Prototyp, wenige Annotationen (eine je Schritt), Vibe der Startseiten-Grafiken.
import { camera, rectZ, pair, r1, type V3, type P2 } from '../../landing/site-scene';
import type { Piece, Shape } from '../../blog/story-scene';

/** pos: Lage je Schritt [x, y, sichtbar]; via: Zwischenhalt beim Vorwärtsschritt in diesen Schritt (synchrones Abheben,
 *  Sinken über den Startpunkt); c: Farbe in der Animation; k: Reihenfolge für den Versatz */
export type FlowDrone = { pos: [number, number, number][]; via: Record<number, [number, number]>; c: string; k: number };
export type FlowNote = { text: string; steps: number[]; x: number; y: number; side: 'l' | 'r' };
/** beat: Mittelpunkt des Herzens, um den der Herzschlag skaliert */
export type FlowStory = { vb: [number, number, number, number]; pieces: Piece[]; drones: FlowDrone[]; notes: FlowNote[]; steps: number; frames: [number, number, number, number][]; beat: P2 };

export const STEPS = 4;
const ALL = [0, 1, 2, 3];

/** geschlossene Kurve gleichmäßig nach Bogenlänge abtasten, Start oben (größtes v), gegen den Uhrzeigersinn */
function resample(dense: [number, number][], n: number): [number, number][] {
  const seg = dense.map((p, i) => Math.hypot(dense[(i + 1) % dense.length][0] - p[0], dense[(i + 1) % dense.length][1] - p[1]));
  const total = seg.reduce((a, b) => a + b, 0), out: [number, number][] = [];
  let acc = 0, j = 0;
  for (let i = 0; i < n; i++) {
    const goal = (i / n) * total;
    while (acc + seg[j] < goal) acc += seg[j++];
    const a = dense[j], b = dense[(j + 1) % dense.length], u = (goal - acc) / (seg[j] || 1);
    out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
  }
  return out;
}
/** Kreis und Herz mit gleicher Laufrichtung und gleichem Anfang (oben Mitte): Punkt i des Kreises wird Punkt i des Herzens,
 *  so kreuzen sich beim Formationswechsel keine Wege */
const circleUV = (n: number, r: number) => resample(Array.from({ length: 720 }, (_, i) => { const a = Math.PI / 2 + (i / 720) * Math.PI * 2; return [Math.cos(a) * r, Math.sin(a) * r] as [number, number]; }), n);
const heartUV = (n: number, w: number, h: number) => {
  // Herzkurve, Start an der oberen Einkerbung (t = 0), gleiche Laufrichtung wie der Kreis
  const dense = Array.from({ length: 720 }, (_, i) => { const t = -(i / 720) * Math.PI * 2; return [(16 * Math.sin(t) ** 3) / 32 * w, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 29 * h] as [number, number]; });
  return resample(dense, n);
};

export function ablaufScene(o: { colors: string[]; zone: Record<string, string> }): FlowStory {
  const cam = camera([0, 0, 8], -36, 26, 200);
  const field = { x0: -20, x1: 20, y0: -13, y1: 13 };
  cam.fit([...rectZ(field.x0, field.y0, field.x1, field.y1, 0), [0, 1, 23], [-9.5, -4, 23], [9.5, 6, 23]], 400);
  const P = (p: V3): P2 => cam.P(p);
  const pieces: Piece[] = [];
  const add = (p: Piece) => { pieces.push(p); return p; };
  const face = (pts: V3[], cls: string): Shape => ({ t: 'poly', pts: pts.map(P), cls });
  const seg = (pts: V3[], cls: string): Shape => ({ t: 'line', pts: pts.map(P), cls });
  const ring = (cx: number, cy: number, z: number, rad: number, n = 16): V3[] => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * rad, cy + Math.sin((i / n) * Math.PI * 2) * rad, z]);

  // ---------- Feld (alle Schritte) ----------
  const fieldCenter = P([0, 0, 0]);
  add({ key: 'field', zc: o.zone.field, steps: ALL, origin: fieldCenter, hide: { s: [0.04, 0.04] }, shapes: [
    face([[field.x0, field.y0, -0.6], [field.x1, field.y0, -0.6], [field.x1, field.y0, 0], [field.x0, field.y0, 0]], 'slab-side'),
    face([[field.x0, field.y0, -0.6], [field.x0, field.y1, -0.6], [field.x0, field.y1, 0], [field.x0, field.y0, 0]], 'slab-side'),
    face(rectZ(field.x0, field.y0, field.x1, field.y1, 0), 'slab'),
    ...Array.from({ length: 9 }, (_, i) => seg([[field.x0 + 4 + i * 4, field.y0, 0], [field.x0 + 4 + i * 4, field.y1, 0]], 'floor-line')),
    ...Array.from({ length: 6 }, (_, i) => seg([[field.x0, field.y0 + 3.7 + i * 3.7, 0], [field.x1, field.y0 + 3.7 + i * 3.7, 0]], 'floor-line')),
  ] });

  // ---------- Animationsraster: 10 × 5 Startpunkte im 2,2-m-Abstand ----------
  const COLS = 10, ROWS = 5, GAP = 2.2, N = COLS * ROWS;
  const gx0 = -((COLS - 1) * GAP) / 2, gy0 = -((ROWS - 1) * GAP) / 2;
  const seeds: V3[] = Array.from({ length: N }, (_, i) => [gx0 + (i % COLS) * GAP, gy0 + Math.floor(i / COLS) * GAP, 0]);
  // Startunterlagen bleiben die ganze Show über stehen (dort landen die Drohnen wieder)
  add({ key: 'pads', zc: o.zone.field, steps: ALL, dim: [1, 2], origin: fieldCenter, hide: { s: [0.04, 0.04] }, shapes: seeds.map((s) => ({ t: 'poly', pts: ring(s[0], s[1], 0, 0.62).map(P), cls: 'pad' }) as Shape) });
  // Das Raster selbst: feine Linien durch die Startpunkte, nur in der Vorbereitung
  const gx1 = gx0 + (COLS - 1) * GAP, gy1 = gy0 + (ROWS - 1) * GAP, m = 1.1;
  add({ key: 'raster', zc: o.zone.field, steps: [0], origin: fieldCenter, hide: { s: [0.04, 0.04] }, shapes: [
    face(rectZ(gx0 - m, gy0 - m, gx1 + m, gy1 + m, 0), 'raster-area'),
    ...Array.from({ length: COLS }, (_, i) => seg([[gx0 + i * GAP, gy0 - m, 0], [gx0 + i * GAP, gy1 + m, 0]], 'raster')),
    ...Array.from({ length: ROWS }, (_, i) => seg([[gx0 - m, gy0 + i * GAP, 0], [gx1 + m, gy0 + i * GAP, 0]], 'raster')),
  ] });

  // ---------- Himmel: senkrechte Ebene zum Publikum (wie die Sternebene des Prototyps) ----------
  const turn = (-24 * Math.PI) / 180, SC: V3 = [0, 1, 14.5];
  const inSky = ([u, v]: [number, number], d = 0): V3 => [SC[0] + u * Math.cos(turn) - d * Math.sin(turn), SC[1] + u * Math.sin(turn) + d * Math.cos(turn), SC[2] + v];
  const circle = circleUV(N, 5.6).map((p) => inSky(p));
  const heart = heartUV(N, 15, 12.4).map(([u, v]) => inSky([u, v + 2.6]));
  // Startpunkt → Kreis nach x geordnet (Bahnen kreuzen sich kaum); Kreis → Herz über denselben Index
  const pairs = pair(seeds, circle).map(({ start, motif }) => { const i = circle.indexOf(motif); return { start, ring: motif, heart: heart[i], i }; });
  const LIFT = 6.5;

  // 1 · Abheben: senkrechte Linien aus jedem zweiten Startpunkt (Schachbrett), alle gleich lang; die Bewegung selbst zeigt
  // das gleichzeitige Abheben, die Linien halten es im Standbild fest. Zeichnen sich beim Eintreten.
  const checker = seeds.filter((_, i) => (i % COLS + Math.floor(i / COLS)) % 2 === 0);
  add({ key: 'lift', zc: o.zone.sky, steps: [1], origin: fieldCenter, hide: { s: [1, 0.02] }, shapes: checker.map((s) => seg([[s[0], s[1], 0.5], [s[0], s[1], LIFT]], 'lift')) });
  // 2 · Formationswechsel: der Kreis bleibt als leiser Umriss im Herz stehen (woher die Punkte kamen). Geprüft und
  // verworfen: Spuren je Drohne vom Kreis zum Herz, sie stehen wie Borsten im Bild.
  add({ key: 'ghost', zc: o.zone.sky, steps: [2], origin: P(SC), hide: { s: [0.04, 0.04] }, shapes: [{ t: 'poly', pts: circleUV(72, 5.6).map((q) => P(inSky(q))), cls: 'ghost' }] });
  // 3 · Rückkehr: wie das Abheben, nur abwärts (dieselben Linien, kürzer), jede Drohne sinkt über ihren Startpunkt
  add({ key: 'return', zc: o.zone.sky, steps: [3], origin: fieldCenter, hide: { s: [1, 0.02] }, shapes: checker.map((s) => seg([[s[0], s[1], 5], [s[0], s[1], 0.5]], 'lift')) });

  // ---------- Drohnen: eine Lage je Schritt ----------
  const colorAt = (u: number) => o.colors[Math.max(0, Math.min(o.colors.length - 1, Math.round(u * (o.colors.length - 1))))];
  const hx = heart.map((h) => P(h)[0]), hx0 = Math.min(...hx), hx1 = Math.max(...hx);
  const drones: FlowDrone[] = pairs.map(({ start, ring: r, heart: h }, k) => {
    const at = (p: V3, a = 1): [number, number, number] => { const q = P(p); return [r1(q[0]), r1(q[1]), a]; };
    const v = (p: V3): [number, number] => { const q = P(p); return [r1(q[0]), r1(q[1])]; };
    const ground: V3 = [start[0], start[1], 0.35];
    return {
      pos: [at(ground), at(r), at(h), at(ground)],
      via: { 1: v([start[0], start[1], LIFT]), 3: v([start[0], start[1], 5]) },
      c: colorAt((P(h)[0] - hx0) / (hx1 - hx0 || 1)), k,
    };
  });

  // ---------- Annotationen: eine je Schritt ----------
  const notes: { text: string; steps: number[]; p: P2; side: 'l' | 'r' }[] = [
    { text: 'Animationsraster', steps: [0], p: P([gx0 - m, gy0 + GAP, 0]), side: 'l' },
    { text: 'Synchroner Start', steps: [1], p: P([gx0, gy0, LIFT * 0.6]), side: 'l' },
    { text: 'Formationswechsel', steps: [2], p: P(inSky([7.7, 4.3])), side: 'r' },
    { text: 'Landung am Startpunkt', steps: [3], p: P([gx0, gy0, 0.35]), side: 'l' },
  ];

  // ---------- auf (0, 0) verschieben ----------
  const pts: P2[] = [];
  pieces.forEach((pc) => pc.shapes.forEach((s) => { if (s.t === 'circle') pts.push([s.c[0] - s.r, s.c[1] - s.r], [s.c[0] + s.r, s.c[1] + s.r]); else pts.push(...s.pts); }));
  drones.forEach((d) => d.pos.forEach(([x, y]) => pts.push([x, y])));
  const pad = 8, X0 = Math.min(...pts.map((p) => p[0])) - pad, Y0 = Math.min(...pts.map((p) => p[1])) - pad;
  const W = Math.max(...pts.map((p) => p[0])) + pad - X0, H = Math.max(...pts.map((p) => p[1])) + pad - Y0;
  const sh = (p: P2): P2 => [r1(p[0] - X0), r1(p[1] - Y0)];
  pieces.forEach((pc) => {
    pc.origin = sh(pc.origin);
    pc.shapes = pc.shapes.map((s) => s.t === 'circle' ? { ...s, c: sh(s.c) } : { ...s, pts: s.pts.map(sh) });
  });
  drones.forEach((d) => {
    d.pos = d.pos.map(([x, y, a]) => [r1(x - X0), r1(y - Y0), a]);
    d.via = Object.fromEntries(Object.entries(d.via).map(([s, p]) => [s, sh(p)]));
  });
  const outNotes = notes.map((n) => { const [x, y] = sh(n.p); return { text: n.text, steps: n.steps, side: n.side, x, y }; });
  const hc = P(inSky([0, 0])), beat = sh(hc);

  // ---------- Bildausschnitt je Schritt: sichtbare Teile (ohne Feld und Startunterlagen, die dürfen über den Rand laufen),
  // Drohnen samt Zwischenhalt und Annotationen; Rand 18 %, Mindestgröße wie im Prototyp ----------
  const frames = ALL.map((st): [number, number, number, number] => {
    const q: P2[] = [];
    pieces.forEach((pc) => {
      if (!pc.steps.includes(st) || pc.dim?.includes(st) || pc.key === 'field' || pc.key === 'pads') return;
      pc.shapes.forEach((s) => { if (s.t === 'circle') q.push([s.c[0] - s.r, s.c[1] - s.r], [s.c[0] + s.r, s.c[1] + s.r]); else q.push(...s.pts); });
    });
    drones.forEach((d) => { const [x, y, a] = d.pos[st]; if (a > 0) q.push([x, y]); if (d.via[st]) q.push(d.via[st]); });
    outNotes.forEach((n) => { if (n.steps.includes(st)) q.push([n.x, n.y]); });
    const fx0 = Math.min(...q.map((p) => p[0])), fx1 = Math.max(...q.map((p) => p[0])), fy0 = Math.min(...q.map((p) => p[1])), fy1 = Math.max(...q.map((p) => p[1]));
    let w = fx1 - fx0, h = fy1 - fy0;
    const minW = W * 0.42; if (w < minW) w = minW; if (h < minW * 0.6) h = minW * 0.6;
    const cx = (fx0 + fx1) / 2, cy = (fy0 + fy1) / 2;
    w *= 1.18; h *= 1.18;
    return [r1(cx - w / 2), r1(cy - h / 2), r1(w), r1(h)];
  });
  return { vb: [0, 0, r1(W), r1(H)], pieces, drones, notes: outNotes, steps: STEPS, frames, beat };
}
