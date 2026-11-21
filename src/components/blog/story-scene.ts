// Isometrische Scroll-Szene für den Artikel „Wie programmiert man eine Drohnenshow?“ (Labor, Runde 15, 21.11.2026).
// Marc: „interaktive, annotierte Darstellungen wie die bestehenden auf Indoor/Startseite … beim Scrollen geht die Szene zum
// nächsten Schritt; Übergänge als saubere, weiche Morphs: eine Ebene wird minimiert und expandiert zu etwas Neuem.“
//
// Dieselbe Kamera wie die Standortzeichnung (site-scene.ts, schräg von vorn links), alles zur Build-Zeit projiziert. Die
// Szene besteht aus Teilen (Piece): Gruppen mit den Schritten, in denen sie sichtbar sind. Ein Teil, das geht, schrumpft
// zu seinem Ursprung (origin) oder legt sich flach (hide: [sx, sy]); ein Teil, das kommt, wächst aus demselben Punkt.
// Gestapelte Ebenen (Drohne, Software, Showdatei) fahren je Schritt auseinander oder zusammen (shift). Die 24 Drohnen
// sind feste Punkte mit einer Lage je Schritt. Annotationen (Note) sind HTML über der Zeichnung, wie die Maß-Pillen.
import { camera, rectZ, pair, r1, type V3, type P2 } from '../landing/site-scene';

export type Shape =
  | { t: 'poly'; pts: P2[]; cls: string }
  | { t: 'line'; pts: P2[]; cls: string }
  | { t: 'circle'; c: P2; r: number; cls: string };
export type Piece = {
  key: string; zc: string; steps: number[]; dim?: number[]; origin: P2;
  /** Verschiebung (Bildeinheiten, y) je Schritt; fehlt der Schritt, steht das Teil an seinem gezeichneten Platz */
  shift?: Record<number, number>;
  /** Lage, wenn unsichtbar: Maßstab x/y um origin und Verschiebung y. after: Lage nach dem letzten sichtbaren Schritt,
   *  wenn sie sich von der davor unterscheidet (der Software-Stapel kommt aus der Drohne und legt sich danach auf den
   *  Boden des Glasquaders) */
  hide?: { s: [number, number]; dy?: number };
  after?: { s: [number, number]; dy?: number };
  shapes: Shape[];
};
export type StoryDrone = { pos: [number, number, number][]; c: string; k: number };
export type Note = { text: string; steps: number[]; x: number; y: number; side: 'l' | 'r'; target?: string; check?: boolean; minor?: boolean };
export type Story = { vb: [number, number, number, number]; pieces: Piece[]; drones: StoryDrone[]; notes: Note[]; steps: number };

const STEPS = 9;
const ALL = Array.from({ length: STEPS }, (_, i) => i);
const from = (a: number, b = STEPS - 1) => ALL.filter((s) => s >= a && s <= b);

/** Stern als Umriss (10 Ecken), Punkte gleichmäßig nach Bogenlänge; u/v in der Sternebene */
function starOutline(n: number, R: number, r: number): [number, number][] {
  const corners = Array.from({ length: 10 }, (_, i) => { const a = Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r : R; return [Math.cos(a) * q, Math.sin(a) * q]; });
  const seg = corners.map((p, i) => Math.hypot(corners[(i + 1) % 10][0] - p[0], corners[(i + 1) % 10][1] - p[1]));
  const total = seg.reduce((a, b) => a + b, 0), out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    let goal = (i / n) * total, j = 0;
    while (goal > seg[j]) goal -= seg[j++];
    const a = corners[j], b = corners[(j + 1) % 10], u = goal / seg[j];
    out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
  }
  return out;
}
const starCorners = (R: number, r: number) => Array.from({ length: 10 }, (_, i) => { const a = Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r : R; return [Math.cos(a) * q, Math.sin(a) * q] as [number, number]; });

export function storyScene(o: { colors: string[]; zone: Record<string, string> }): Story {
  const cam = camera([0, 0, 8], -36, 26, 200);
  const field = { x0: -20, x1: 20, y0: -13, y1: 13 };
  cam.fit([...rectZ(field.x0, field.y0, field.x1, field.y1, 0), [0, 1, 23], [-9.5, -4, 23], [9.5, 6, 23]], 400);
  const P = (p: V3): P2 => cam.P(p);
  const pieces: Piece[] = [];
  const add = (p: Piece) => { pieces.push(p); return p; };
  const face = (pts: V3[], cls: string): Shape => ({ t: 'poly', pts: pts.map(P), cls });
  const seg = (pts: V3[], cls: string): Shape => ({ t: 'line', pts: pts.map(P), cls });
  const ring = (cx: number, cy: number, z: number, rad: number, n = 28): V3[] => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * rad, cy + Math.sin((i / n) * Math.PI * 2) * rad, z]);
  /** waagerechte Platte mit sichtbarer Vorder- und linker Kante */
  const plate = (x0: number, y0: number, x1: number, y1: number, z: number, th: number, cls: string): Shape[] => [
    face([[x0, y0, z - th], [x1, y0, z - th], [x1, y0, z], [x0, y0, z]], `${cls}-side`),
    face([[x0, y0, z - th], [x0, y1, z - th], [x0, y1, z], [x0, y0, z]], `${cls}-side`),
    face(rectZ(x0, y0, x1, y1, z), cls),
  ];
  const dyBetween = (a: V3, b: V3) => r1(P(b)[1] - P(a)[1]);

  // ---------- Sternebene am Himmel (Ablauf: Motiv, Flugbahnen, Live-Show) ----------
  const turn = (-24 * Math.PI) / 180, SC: V3 = [0, 1, 14], R = 7.5, Ri = 3.1;
  const inSky = ([u, v]: [number, number], d = 0): V3 => [SC[0] + u * Math.cos(turn) - d * Math.sin(turn), SC[1] + u * Math.sin(turn) + d * Math.cos(turn), SC[2] + v];
  const N = 40;
  const starSky = starOutline(N, R, Ri).map((p) => inSky(p));
  // Startraster 8 × 5 im 2,4-m-Abstand
  const seeds: V3[] = Array.from({ length: N }, (_, i) => [-8.4 + (i % 8) * 2.4, -3.8 + Math.floor(i / 8) * 2.4, 0]);
  const pairs = pair(seeds, starSky); // nach x sortiert: Bahnen kreuzen sich kaum
  const colorAt = (x: number) => o.colors[Math.max(0, Math.min(o.colors.length - 1, Math.round(((x + R) / (2 * R)) * (o.colors.length - 1))))];

  // ---------- 0 · Showdrohne als Explosionsansicht ----------
  // schematisch vergrößert (K), damit die Drohne die Bühne trägt; Ebenen weit auseinander, zusammengesetzt um z ≈ 10
  const K = 1.75, dz = { bat: 2.5, frame: 7, board: 11.5, gps: 15.5, led: 19.5 }, az = { bat: 8.4, frame: 9.2, board: 9.9, gps: 10.5, led: 11.1 };
  const DC: V3 = [0, K, 0];
  const droneCenter = P([DC[0], DC[1], 10]);
  const layer = (key: string, z: number, shapes: Shape[]) => add({ key, zc: o.zone.drone, steps: [0], origin: P([DC[0], DC[1], z]), shift: { 0: 0 }, hide: { s: [0.04, 0.04], dy: dyBetween([DC[0], DC[1], z], [DC[0], DC[1], az[key as keyof typeof az]]) }, shapes });
  layer('bat', dz.bat, [
    face([[-1.6 * K, 0 * K, dz.bat - 1], [1.6 * K, 0 * K, dz.bat - 1], [1.6 * K, 0 * K, dz.bat], [-1.6 * K, 0 * K, dz.bat]], 'part-side'),
    face([[-1.6 * K, 0 * K, dz.bat - 1], [-1.6 * K, 2 * K, dz.bat - 1], [-1.6 * K, 2 * K, dz.bat], [-1.6 * K, 0 * K, dz.bat]], 'part-side'),
    face(rectZ(-1.6 * K, 0 * K, 1.6 * K, 2 * K, dz.bat), 'part'),
  ]);
  {
    const z = dz.frame, arms: V3[] = [[-4.2 * K, -3.2 * K, z], [4.2 * K, 5.2 * K, z], [-4.2 * K, 5.2 * K, z], [4.2 * K, -3.2 * K, z]];
    const rotorsBack = [arms[1], arms[2]], rotorsFront = [arms[0], arms[3]];
    layer('frame', z, [
      ...rotorsBack.map((a) => face(ring(a[0], a[1], z, 2.1 * K), 'rotor')),
      seg([arms[0], arms[1]], 'arm'), seg([arms[2], arms[3]], 'arm'),
      face(rectZ(-1.4 * K, -0.4 * K, 1.4 * K, 2.4 * K, z), 'part'),
      ...rotorsFront.map((a) => face(ring(a[0], a[1], z, 2.1 * K), 'rotor')),
      ...arms.map((a) => ({ t: 'circle', c: P(a), r: 2.2, cls: 'hub' }) as Shape),
    ]);
  }
  layer('board', dz.board, [
    ...plate(-2.4 * K, -1.4 * K, 2.4 * K, 3.4 * K, dz.board, 0.25, 'part'),
    face(rectZ(-0.8 * K, 0.2 * K, 0.8 * K, 1.8 * K, dz.board), 'chip'),
    ...[-1.7, 1.7].flatMap((x) => [seg([[x * K, -0.9 * K, dz.board], [x * K, 2.9 * K, dz.board]], 'trace')]),
  ]);
  layer('gps', dz.gps, [
    ...plate(-1.3 * K, 0 * K, 1.3 * K, 2.6 * K, dz.gps, 0.35, 'part'),
    face(rectZ(-0.7 * K, 0.6 * K, 0.7 * K, 2 * K, dz.gps), 'chip'),
  ]);
  layer('led', dz.led, [
    face(ring(0, 1.3 * K, dz.led, 1.7 * K), 'led-base'),
    { t: 'circle', c: P([0 * K, 1.3 * K, dz.led + 0.4]), r: 22, cls: 'led-glow' },
    { t: 'circle', c: P([0 * K, 1.3 * K, dz.led + 0.4]), r: 7, cls: 'led-core' },
  ]);
  add({ key: 'drone-axis', zc: o.zone.drone, steps: [0], origin: droneCenter, hide: { s: [1, 0.02] }, shapes: [seg([[0, 1.3 * K, dz.bat - 1.5], [0, 1.3 * K, dz.led + 2.4]], 'guide')] });

  // ---------- 1 · Software als drei gestapelte Ebenen ----------
  const sw = { x0: -8, x1: 8, y0: -4.5, y1: 6.5 };
  const swz = { light: 6, time: 10, route: 14 };
  const swPlate = (key: string, z: number, extra: Shape[]) => add({ key, zc: o.zone.software, steps: [1], origin: droneCenter, shift: { 1: 0 }, hide: { s: [0.04, 0.04], dy: 0 }, shapes: [...plate(sw.x0, sw.y0, sw.x1, sw.y1, z, 0.3, 'zplate'), ...extra] });
  // Licht: Spuren mit Farbblöcken im Logoverlauf
  swPlate('sw-light', swz.light, Array.from({ length: 5 }, (_, i) => {
    const y = sw.y0 + 1.6 + i * 2.1; return Array.from({ length: 6 }, (_, j) => { const x = sw.x0 + 1.2 + j * 2.4 + (i % 2) * 0.8; return face(rectZ(x, y - 0.35, x + 1.7, y + 0.35, swz.light), `bar bar-${(i + j) % o.colors.length}`); });
  }).flat());
  // Timing: Zeitleiste mit Takten und Abspielkopf
  swPlate('sw-time', swz.time, [
    ...Array.from({ length: 5 }, (_, i) => seg([[sw.x0 + 1, sw.y0 + 1.6 + i * 2.1, swz.time], [sw.x1 - 1, sw.y0 + 1.6 + i * 2.1, swz.time]], 'track')),
    ...Array.from({ length: 13 }, (_, i) => seg([[sw.x0 + 1 + i * 1.165, sw.y0 + 0.8, swz.time], [sw.x0 + 1 + i * 1.165, sw.y1 - 0.8, swz.time]], 'tick')),
    seg([[1.2, sw.y0 + 0.4, swz.time], [1.2, sw.y1 - 0.4, swz.time]], 'playhead'),
  ]);
  // Flugrouten: von einer Startreihe vorn zu den Punkten eines Sterns in der Draufsicht
  const planStar = starOutline(N, 4.4, 1.85).map(([u, v]): V3 => [u, 1.6 + v * 0.95, swz.route]);
  const planStart: V3[] = Array.from({ length: N }, (_, i) => [sw.x0 + 1 + (i * (sw.x1 - sw.x0 - 2)) / (N - 1), sw.y0 + 0.7, swz.route]);
  const routes = pair(planStart, planStar);
  swPlate('sw-route', swz.route, routes.filter((_, i) => i % 2 === 0).map(({ start, motif }) => {
    const pts: V3[] = Array.from({ length: 12 }, (_, i) => { const t = i / 11, m: V3 = [start[0], (start[1] + motif[1]) / 2, swz.route]; return [(1 - t) ** 2 * start[0] + 2 * (1 - t) * t * m[0] + t * t * motif[0], (1 - t) ** 2 * start[1] + 2 * (1 - t) * t * m[1] + t * t * motif[1], swz.route]; });
    return seg(pts, 'route');
  }));
  add({ key: 'sw-guides', zc: o.zone.software, steps: [1], origin: droneCenter, hide: { s: [0.04, 0.04] }, shapes: [[sw.x0, sw.y0], [sw.x1, sw.y0], [sw.x0, sw.y1]].map(([x, y]) => seg([[x, y, swz.light], [x, y, swz.route]], 'guide')) });

  // ---------- 2 · Simulation: der Stapel legt sich auf den Boden des Glasquaders, der Quader wächst aus ihm ----------
  const bx = { x0: -9.5, x1: 9.5, y0: -4, y1: 6, z0: 4, z1: 23 };
  pieces.filter((p) => p.key.startsWith('sw-')).forEach((p) => { p.after = { s: [1, 1], dy: dyBetween([0, 1, p.key === 'sw-light' ? swz.light : p.key === 'sw-time' ? swz.time : p.key === 'sw-route' ? swz.route : swz.light], [0, 1, bx.z0]) }; });
  const boxFloor = P([(bx.x0 + bx.x1) / 2, (bx.y0 + bx.y1) / 2, bx.z0]);
  const corner = (x: number, y: number, z: number): V3 => [x, y, z];
  const { x0, x1, y0, y1, z0, z1 } = bx;
  add({ key: 'box-back', zc: o.zone.sim, steps: [2, 6], origin: boxFloor, hide: { s: [1, 0.02] }, shapes: [
    face(rectZ(x0, y0, x1, y1, z0), 'glass-floor'),
    face([corner(x0, y1, z0), corner(x1, y1, z0), corner(x1, y1, z1), corner(x0, y1, z1)], 'glass-back'),
    face([corner(x1, y0, z0), corner(x1, y1, z0), corner(x1, y1, z1), corner(x1, y0, z1)], 'glass-back'),
    seg([corner(x1, y1, z0), corner(x0, y1, z0)], 'glass-hidden'), seg([corner(x1, y1, z0), corner(x1, y0, z0)], 'glass-hidden'), seg([corner(x1, y1, z0), corner(x1, y1, z1)], 'glass-hidden'),
  ] });
  const boxFront = add({ key: 'box', zc: o.zone.sim, steps: [2, 6], origin: boxFloor, hide: { s: [1, 0.02] }, shapes: [
    face([corner(x0, y0, z0), corner(x1, y0, z0), corner(x1, y0, z1), corner(x0, y0, z1)], 'glass'),
    face([corner(x0, y0, z0), corner(x0, y1, z0), corner(x0, y1, z1), corner(x0, y0, z1)], 'glass'),
    ...([
      [[x0, y0, z0], [x1, y0, z0]], [[x0, y0, z0], [x0, y1, z0]], [[x0, y0, z0], [x0, y0, z1]], [[x1, y0, z0], [x1, y0, z1]], [[x0, y1, z0], [x0, y1, z1]],
      [[x0, y0, z1], [x1, y0, z1]], [[x1, y0, z1], [x1, y1, z1]], [[x1, y1, z1], [x0, y1, z1]], [[x0, y1, z1], [x0, y0, z1]],
    ] as [V3, V3][]).map(([a, b]) => seg([a, b], 'glass-edge')),
  ] });
  // Wind von links
  add({ key: 'wind', zc: o.zone.sim, steps: [2], origin: P([x0 - 3, 1, 13]), hide: { s: [0.2, 0.2] }, shapes: [8, 13, 18].flatMap((z, i) => {
    const a: V3 = [x0 - 8 + i, 1, z], b: V3 = [x0 - 2.5, 1, z + 0.6], pb = P(b), pa = P(a), ang = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]), h = 5;
    return [{ t: 'line', pts: [pa, pb], cls: 'wind' } as Shape, { t: 'line', pts: [[pb[0] - h * Math.cos(ang - 0.5), pb[1] - h * Math.sin(ang - 0.5)], pb, [pb[0] - h * Math.cos(ang + 0.5), pb[1] - h * Math.sin(ang + 0.5)]], cls: 'wind' } as Shape];
  }) });

  // ---------- 3 · Bodenstation: das Feld breitet sich aus, die Station funkt zum Schwarm ----------
  const fieldCenter = P([0, 0, 0]);
  add({ key: 'field', zc: o.zone.field, steps: from(3), origin: fieldCenter, hide: { s: [0.04, 0.04] }, shapes: [
    ...plate(field.x0, field.y0, field.x1, field.y1, 0, 0.6, 'slab'),
    ...Array.from({ length: 9 }, (_, i) => seg([[field.x0 + 4 + i * 4, field.y0, 0], [field.x0 + 4 + i * 4, field.y1, 0]], 'floor-line')),
    ...Array.from({ length: 6 }, (_, i) => seg([[field.x0, field.y0 + 3.7 + i * 3.7, 0], [field.x1, field.y0 + 3.7 + i * 3.7, 0]], 'floor-line')),
  ] });
  const ST: V3 = [-15, -8, 0], mastTop: V3 = [ST[0] + 0.5, ST[1] + 0.5, 6.2];
  add({ key: 'station', zc: o.zone.station, steps: from(3), dim: [4, 5, 6], origin: P(ST), hide: { s: [0.04, 0.04] }, shapes: [
    face([[ST[0] - 1.6, ST[1] - 1, 0], [ST[0] + 1.6, ST[1] - 1, 0], [ST[0] + 1.6, ST[1] - 1, 1.8], [ST[0] - 1.6, ST[1] - 1, 1.8]], 'zplate-edge'),
    face([[ST[0] - 1.6, ST[1] - 1, 0], [ST[0] - 1.6, ST[1] + 1.4, 0], [ST[0] - 1.6, ST[1] + 1.4, 1.8], [ST[0] - 1.6, ST[1] - 1, 1.8]], 'zplate-edge'),
    face(rectZ(ST[0] - 1.6, ST[1] - 1, ST[0] + 1.6, ST[1] + 1.4, 1.8), 'zplate'),
    seg([[mastTop[0], mastTop[1], 1.8], mastTop], 'mast'),
    { t: 'circle', c: P(mastTop), r: 6, cls: 'mast-glow' }, { t: 'circle', c: P(mastTop), r: 2.4, cls: 'mast-tip' },
  ] });
  const sky3: V3[] = Array.from({ length: N }, (_, i) => { const u = i / (N - 1); return [-12 + u * 24, 2, 14 + Math.sin(u * Math.PI) * 4]; });
  const mt = P(mastTop);
  add({ key: 'radio', zc: o.zone.station, steps: [3], origin: mt, hide: { s: [0.1, 0.1] }, shapes: [
    ...[9, 15, 21].map((rad) => ({ t: 'circle', c: mt, r: rad, cls: 'wave' }) as Shape),
    ...[0, 10, 20, 30, N - 1].map((i) => ({ t: 'line', pts: [mt, P(sky3[i])], cls: 'link' }) as Shape),
  ] });

  // ---------- 4 · Idee: Stern als 3D-Modell (Drahtgitter, extrudiert) ----------
  const corners = starCorners(R, Ri), skyCenter = P(SC);
  add({ key: 'mesh', zc: o.zone.idea, steps: [4, 5], dim: [5], origin: skyCenter, hide: { s: [0.04, 0.04] }, shapes: [
    { t: 'poly', pts: corners.map((c) => P(inSky(c, 1))), cls: 'mesh-back' },
    ...corners.map((c) => ({ t: 'line', pts: [P(inSky(c, 1)), P(inSky(c, -1))], cls: 'mesh-edge' }) as Shape),
    ...corners.filter((_, i) => i % 2 === 0).map((c) => ({ t: 'line', pts: [P(inSky([0, 0], -1)), P(inSky(c, -1))], cls: 'mesh-edge' }) as Shape),
    { t: 'poly', pts: corners.map((c) => P(inSky(c, -1))), cls: 'mesh-front' },
  ] });

  // ---------- 5 · Flugbahnen: vom Startraster zu den Punkten ----------
  add({ key: 'seeds', zc: o.zone.field, steps: from(5), origin: fieldCenter, hide: { s: [0.04, 0.04] }, shapes: seeds.map((s) => ({ t: 'poly', pts: ring(s[0], s[1], 0, 0.55, 14).map(P), cls: 'seed' }) as Shape) });
  const pathOf = (a: V3, b: V3): V3[] => Array.from({ length: 18 }, (_, i) => {
    const t = i / 17, c1: V3 = [a[0], a[1], 7], c2: V3 = [b[0], b[1], b[2] - 5], m = 1 - t;
    return [0, 1, 2].map((k) => m ** 3 * a[k] + 3 * m * m * t * c1[k] + 3 * m * t * t * c2[k] + t ** 3 * b[k]) as V3;
  });
  const paths = pairs.map(({ start, motif }) => pathOf(start, motif));
  add({ key: 'paths', zc: o.zone.idea, steps: [5, 6], origin: fieldCenter, hide: { s: [1, 0.02] }, shapes: paths.map((p) => seg(p, 'path')) });
  // 6 · Simulation: zwei Bahnen kommen sich nahe
  const near = (() => { let best = { i: 0, d: Infinity, at: [0, 0] as P2 }; for (let i = 0; i < paths.length - 1; i++) { for (let t = 5; t < 14; t++) { const a = P(paths[i][t]), b = P(paths[i + 1][t]), d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d < best.d) best = { i, d, at: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }; } } return best; })();
  add({ key: 'warn', zc: o.zone.warn, steps: [6], origin: near.at, hide: { s: [0.1, 0.1] }, shapes: [
    seg(paths[near.i], 'path-hot'), seg(paths[near.i + 1], 'path-hot'),
    { t: 'circle', c: near.at, r: 9, cls: 'warn-ring' },
  ] });

  // ---------- 7 · Upload und Feldtest: Showdatei als Stapel über der Station, Funk zum Raster ----------
  const fileZ = [11, 13.2, 15.4];
  fileZ.forEach((z, i) => add({ key: `file-${i}`, zc: o.zone.station, steps: [7], origin: P([ST[0], ST[1] + 0.2, 1.8]), shift: { 7: 0 }, hide: { s: [0.04, 0.04], dy: dyBetween([ST[0], ST[1], z], [ST[0], ST[1], 1.8]) }, shapes: plate(ST[0] - 2.2, ST[1] - 1.4, ST[0] + 2.2, ST[1] + 1.8, z, 0.25, 'file') }));
  add({ key: 'upload', zc: o.zone.station, steps: [7], origin: mt, hide: { s: [0.1, 0.1] }, shapes: [0, 7, 32, N - 1].map((i) => ({ t: 'line', pts: [mt, P(seeds[i])], cls: 'link' }) as Shape) });

  // ---------- 8 · Live-Show: Publikum vorn ----------
  const crowd: V3[] = Array.from({ length: 28 }, (_, i) => [-12 + (i % 14) * 1.85 + (Math.floor(i / 14) ? 0.9 : 0), -10.6 - Math.floor(i / 14) * 1.3, 0.5]);
  add({ key: 'crowd', zc: o.zone.crowd, steps: [8], origin: P([0, -11, 0]), hide: { s: [0.04, 0.04] }, shapes: crowd.map((c) => ({ t: 'circle', c: P(c), r: 1.7, cls: 'guest' }) as Shape) });
  add({ key: 'keepout', zc: o.zone.crowd, steps: [8], origin: P([0, -9, 0]), hide: { s: [0.04, 1] }, shapes: [seg([[-13, -9, 0], [13, -9, 0]], 'keepout')] });

  // ---------- Drohnen: eine Lage je Schritt ----------
  const big = droneCenter;
  const testLift = new Set([10, 11, 12, 13]);
  const drones: StoryDrone[] = pairs.map(({ start, motif }, k) => {
    const route = routes[k];
    const at = (p: V3, a = 1): [number, number, number] => { const q = P(p); return [r1(q[0]), r1(q[1]), a]; };
    const pos: [number, number, number][] = [
      [r1(big[0]), r1(big[1]), 0], // 0: in der großen Drohne
      at(route.motif), // 1: Draufsicht auf der Routenebene
      at(motif), // 2: im Glasquader
      at(sky3[k]), // 3: Linie am Himmel, verbunden mit der Station
      at(motif, 0), // 4: unsichtbar an ihrem Punkt im Modell
      at(motif), at(motif), // 5, 6
      at([start[0], start[1], testLift.has(k) ? 4.5 : 0.35]), // 7: am Boden, vier im Testflug
      at(motif), // 8: Live-Show
    ];
    return { pos, c: colorAt(motif[0] - SC[0]), k };
  });

  // ---------- Annotationen ----------
  const notes: { text: string; steps: number[]; p: P2; side: 'l' | 'r'; target?: string; check?: boolean; minor?: boolean }[] = [
    { text: 'Leuchtstarke LEDs', steps: [0], p: P([1.7 * K, 1.3 * K, dz.led]), side: 'r', target: 'led' },
    { text: 'GPS und RTK', steps: [0], p: P([-1.3 * K, 1.3 * K, dz.gps]), side: 'l', target: 'gps' },
    { text: 'Gyroskop und Höhenmesser', steps: [0], p: P([2.4 * K, 1 * K, dz.board]), side: 'r', target: 'board' },
    { text: 'Kleiner und leichter', steps: [0], p: P([-4.2 * K, -3.2 * K, dz.frame]), side: 'l', target: 'frame' },
    { text: 'Flugroute', steps: [1], p: P([sw.x1, 1, swz.route]), side: 'r', target: 'sw-route' },
    { text: 'Timing', steps: [1], p: P([sw.x0, 3, swz.time]), side: 'l', target: 'sw-time' },
    { text: 'Lichtsequenz', steps: [1], p: P([sw.x1, 1, swz.light]), side: 'r', target: 'sw-light' },
    { text: 'Wind', steps: [2], p: P([x0 - 8, 1, 18]), side: 'l', target: 'wind', check: true },
    { text: 'Fluggeschwindigkeit', steps: [2], p: P([x1, y0, 17]), side: 'r', target: 'box', check: true },
    { text: 'Startpunkte', steps: [2], p: P([x1, y0, z0]), side: 'r', target: 'box-back', check: true },
    { text: 'Bodenstation', steps: [3, 7], p: P([ST[0] - 1.6, ST[1], 1]), side: 'l', target: 'station' },
    { text: 'Verbindung zu jeder Drohne', steps: [3], p: P(sky3[N - 1]), side: 'r', target: 'radio' },
    { text: '3D-Modell', steps: [4], p: P(inSky(corners[2], -1)), side: 'l', target: 'mesh' },
    { text: 'Ein Punkt, eine Drohne', steps: [5], p: P(starSky[Math.round(N * 0.15)]), side: 'r' },
    { text: 'Flugbahn', steps: [5], p: P(paths[2][9]), side: 'l', target: 'paths' },
    { text: 'Zu nah? Hier korrigieren', steps: [6], p: [near.at[0] + 9, near.at[1]], side: 'r', target: 'warn' },
    { text: 'Showdatei', steps: [7], p: P([ST[0] - 2.2, ST[1], fileZ[1]]), side: 'l', target: 'file-1' },
    { text: 'Testflug', steps: [7], p: P([seeds[13][0], seeds[13][1], 4.5]), side: 'r' },
    { text: 'GPS-Signal', steps: [8], p: P([ST[0] - 1.6, ST[1], 4]), side: 'l', target: 'station', check: true },
    { text: 'Wetter', steps: [8], p: P([ST[0] - 1.6, ST[1], 1.4]), side: 'l', target: 'station', check: true },
    { text: 'Flugverbotszonen', steps: [8], p: P([ST[0] - 1.6, ST[1], -1.2]), side: 'l', target: 'field', check: true },
  ];

  // ---------- Bildausschnitt aus allem, auf (0, 0) verschoben ----------
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
  drones.forEach((d) => { d.pos = d.pos.map(([x, y, a]) => [r1(x - X0), r1(y - Y0), a]); });
  void boxFront;
  return {
    vb: [0, 0, r1(W), r1(H)], pieces, drones, steps: STEPS,
    notes: notes.map((n) => { const [x, y] = sh(n.p); return { text: n.text, steps: n.steps, side: n.side, target: n.target, check: n.check, minor: n.minor, x: r1((x / W) * 1000) / 10, y: r1((y / H) * 1000) / 10 }; }),
  };
}

/** Pfad eines Teils als SVG-d */
export const pathD = (s: Exclude<Shape, { t: 'circle' }>) => 'M' + s.pts.map((p) => `${p[0]} ${p[1]}`).join('L') + (s.t === 'poly' ? 'Z' : '');
