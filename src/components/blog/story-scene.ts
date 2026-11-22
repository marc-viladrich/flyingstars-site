// Isometrische Scroll-Szene für den Artikel „Wie programmiert man eine Drohnenshow?“ (Labor, Runde 15, 21.11.2026).
// Prototyp 2 (Marc, 21.11. abends): einspaltig, die Szene klebt oben über der Lesespalte. Jeder Schritt hat einen eigenen
// Bildausschnitt (frames), die Kamera fährt dorthin, so füllt jedes Motiv die Bühne. Höheres Abstraktionsniveau, wenige
// Annotationen; die Drohne erst zusammengesetzt, dann explodiert (asm); in der Simulation zeichnen sich Windlinien
// (streams) selbst und stoßen den Stern an (gust je Drohne).
// Marc: „interaktive, annotierte Darstellungen wie die bestehenden auf Indoor/Startseite … beim Scrollen geht die Szene zum
// nächsten Schritt; Übergänge als saubere, weiche Morphs: eine Ebene wird minimiert und expandiert zu etwas Neuem.“
//
// Dieselbe Kamera wie die Standortzeichnung (site-scene.ts, schräg von vorn links), alles zur Build-Zeit projiziert. Die
// Szene besteht aus Teilen (Piece): Gruppen mit den Schritten, in denen sie sichtbar sind. Ein Teil, das geht, schrumpft
// zu seinem Ursprung (origin) oder legt sich flach (hide: [sx, sy]); ein Teil, das kommt, wächst aus demselben Punkt.
// Gestapelte Ebenen (Drohne, Software, Showdatei) fahren je Schritt auseinander oder zusammen (shift). Die 24 Drohnen
// sind feste Punkte mit einer Lage je Schritt. Annotationen (Note) sind HTML über der Zeichnung, wie die Maß-Pillen.
//
// Runde 19 (22.11.2026, Artikel neu in Wir-Form: „Womit wir arbeiten“ + „Wie eure Show entsteht“): sieben Schritte statt
// neun. 0 Showdrohne · 1 Bodenstation (Drohnen stehen im Startraster, die Station bringt sie per Funk in den Stern) ·
// 2 Idee (3D-Modell) · 3 Flugbahnen · 4 Musik und Licht (der Abspielkopf treibt Lichtblöcke und Sternbildung) ·
// 5 Simulation (Wind, dann zwei zu nahe Bahnen) · 6 Live-Show. Upload und Feldtest entfallen.
import { camera, rectZ, pair, r1, type V3, type P2 } from '../landing/site-scene';

/** tl: Zeitbereich eines Lichtblocks auf der Zeitleiste [Anfang, Ende] (0–1) und seine Spur; der Abspielkopf (sweep) macht
 *  ihn hell, solange er darüber steht */
export type Shape =
  | { t: 'poly'; pts: P2[]; cls: string; tl?: [number, number, number] }
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
  /** Lage (y) im zusammengesetzten Zustand des ersten Schritts: die Drohne steht erst zusammen, dann fährt sie auseinander */
  asm?: number;
  /** nur im zusammengesetzten Zustand sichtbar (Gehäuse, Beine) bzw. dort verborgen (Innenteile, kommen beim Explodieren heraus) */
  asmOnly?: boolean;
  inner?: boolean;
  /** kommt im Schritt erst spät (nach der ersten Bewegung des Schritts, z. B. die Warnung nach dem Wind) */
  late?: boolean;
  shapes: Shape[];
};
/** w: Lage der Drohne entlang der Windrichtung (0 = Luv, 1 = Lee), für den Zeitpunkt, an dem die Böe sie trifft */
/** via: Zwischenhalt beim Vorwärtsschritt in diesen Schritt (alle zugleich, z. B. synchrones Abheben, Sinken über den
 *  Startpunkt), danach weiter zur Lage des Schritts */
/** track: Weg im Schritt mit Abspielkopf (motion.sweep) als Versatz zur Lage des Schritts, vom Anfang der Zeitleiste
 *  (Startreihe) bis zum Ende (Stern, Versatz 0); die Drohne folgt dem Kopf vor und zurück */
/** show: weitere Formen der Live-Show als Versatz zur Lage des Schritts (motion.show), die Drohnen wechseln reihum */
export type StoryDrone = { pos: [number, number, number][]; c: string; k: number; w: number; via?: Record<number, P2>; track?: P2[]; show?: P2[] };
/** x/y in Zeichnungseinheiten; row: Zeile einer Liste am selben Punkt (Prüfhäkchen der Live-Show) */
/** key: Übersetzungsschlüssel (ui.json, unter dem Präfix des Artikels: <prefix>.note.<key>); text: deutscher Rückfall für
 *  Szenen ohne Schlüssel */
export type Note = { key?: string; text: string; steps: number[]; x: number; y: number; side: 'l' | 'r'; target?: string; check?: boolean; row?: number; late?: boolean };
/** Bewegung je Schritt (alles optional, ohne Angabe ruht die Szene): sweep = Abspielkopf läuft, wind = Windlinien und Böen,
 *  alive = leise Eigenbewegung der Drohnen, plain = Drohnen ohne Farbe (am Boden), assemble = Schritt, in dem Teile mit
 *  asmOnly/inner erst zusammengesetzt stehen und dann explodieren */
export type Motion = { sweep?: number[]; wind?: number[]; alive?: number[]; plain?: number[]; assemble?: number;
  /** LEDs aus (am Boden) bzw. warmweiß statt Farbe */
  off?: number[]; warm?: number[];
  /** Herzschlag: zwei weiche Schläge je 1,8 s um center (Formation schlägt leise) */
  beat?: { steps: number[]; center: P2 };
  /** Funk: im Zwischenhalt (via) stehen die Drohnen ohne Farbe am Boden, gestrichelte Signallinien laufen von der Station
   *  zu ihnen; danach steigen alle zugleich (ohne Versatz) und leuchten auf */
  signal?: number[];
  /** Live-Show (Runde 20, Marc): die Drohnen wechseln reihum zwischen Stern und den Formen in drone.show; kurz vor jedem
   *  Wechsel sendet die Station Signale zu den Drohnen der nächsten Form (Teile mit Klasse pulse-<Form>) */
  show?: number[] };
/** frames: Bildausschnitt je Schritt [x, y, b, h]; wind: Windrichtung auf dem Bildschirm (Einheitsvektor); sweep: Weg des
 *  Abspielkopfs der Zeitleiste (Verschiebung vom gezeichneten Platz zum Anfang und zum Ende) */
/** poster: Schritt, der im HTML steht (Suche, Vorschau, ohne JavaScript); ohne Angabe der letzte */
export type Story = { vb: [number, number, number, number]; pieces: Piece[]; drones: StoryDrone[]; notes: Note[]; steps: number; frames: [number, number, number, number][]; wind?: P2; sweep?: [P2, P2]; motion?: Motion; poster?: number };

/** Kamera einer Bühne W × H für einen Ausschnitt: Maßstab und Verschiebung (gleiche Rechnung im Skript der Komponente) */
export const frameCam = ([x, y, w, h]: [number, number, number, number], W: number, H: number) => {
  const k = Math.min(W / w, H / h);
  return { k: r1(k * 1000) / 1000, tx: r1(W / 2 - (x + w / 2) * k), ty: r1(H / 2 - (y + h / 2) * k) };
};

const STEPS = 7;

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
/** Herz als Umriss, Punkte gleichmäßig nach Bogenlänge, oben in der Mitte beginnend und gegen den Uhrzeigersinn wie der
 *  Stern (so wandert jede Drohne am Umriss entlang zur nächsten Form); size = halbe Höhe */
function heartOutline(n: number, size: number): [number, number][] {
  const raw = Array.from({ length: 720 }, (_, i): [number, number] => { const t = -(i / 720) * Math.PI * 2; return [16 * Math.sin(t) ** 3, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)]; });
  const ys = raw.map((p) => p[1]), k = (2 * size) / (Math.max(...ys) - Math.min(...ys)), cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const pts = raw.map(([x, y]): [number, number] => [x * k, (y - cy) * k]);
  const len = pts.map((p, i) => Math.hypot(pts[(i + 1) % pts.length][0] - p[0], pts[(i + 1) % pts.length][1] - p[1]));
  const total = len.reduce((a, b) => a + b, 0), out: [number, number][] = [];
  for (let i = 0; i < n; i++) { let goal = (i / n) * total, j = 0; while (goal > len[j]) goal -= len[j++]; const a = pts[j], b = pts[(j + 1) % pts.length], u = goal / len[j]; out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); }
  return out;
}
const circleOutline = (n: number, r: number) => Array.from({ length: n }, (_, i): [number, number] => { const a = Math.PI / 2 + (i / n) * Math.PI * 2; return [Math.cos(a) * r, Math.sin(a) * r]; });
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
  const starUV = starOutline(N, R, Ri), starSky = starUV.map((p) => inSky(p));
  // Startraster 8 × 5 im 2,4-m-Abstand
  const seeds: V3[] = Array.from({ length: N }, (_, i) => [-8.4 + (i % 8) * 2.4, -3.8 + Math.floor(i / 8) * 2.4, 0]);
  const pairs = pair(seeds, starSky); // nach x sortiert: Bahnen kreuzen sich kaum
  const colorAt = (x: number) => o.colors[Math.max(0, Math.min(o.colors.length - 1, Math.round(((x + R) / (2 * R)) * (o.colors.length - 1))))];

  // ---------- 0 · Showdrohne als Explosionsansicht ----------
  // schematisch vergrößert (K), damit die Drohne die Bühne trägt; Ebenen weit auseinander, zusammengesetzt um z ≈ 10
  const K = 1.75, dz = { bat: 2.5, frame: 7, board: 11.5, gps: 15.5, led: 19.5 }, az = { bat: 8.4, frame: 9.2, board: 9.9, gps: 10.5, led: 11.1 };
  const DC: V3 = [0, K, 0];
  const droneCenter = P([DC[0], DC[1], 10]);
  const layer = (key: string, z: number, shapes: Shape[]) => { const asm = dyBetween([DC[0], DC[1], z], [DC[0], DC[1], az[key as keyof typeof az]]); return add({ key, zc: o.zone.drone, steps: [0], origin: P([DC[0], DC[1], z]), shift: { 0: 0 }, asm, hide: { s: [0.04, 0.04], dy: asm }, shapes }); };
  // Prototyp 3 (Marc: „zuerst klar als Drohne erkennbar“): zusammengesetzt sieht man Gehäuse, vier Arme mit Motoren und
  // Propellern, Beine und die LED oben; Akku, Platine und GPS liegen im Gehäuse und kommen erst beim Explodieren heraus
  const inner = (p: Piece) => { p.inner = true; return p; };
  inner(layer('bat', dz.bat, [
    face([[-1.6 * K, 0 * K, dz.bat - 1], [1.6 * K, 0 * K, dz.bat - 1], [1.6 * K, 0 * K, dz.bat], [-1.6 * K, 0 * K, dz.bat]], 'part-side'),
    face([[-1.6 * K, 0 * K, dz.bat - 1], [-1.6 * K, 2 * K, dz.bat - 1], [-1.6 * K, 2 * K, dz.bat], [-1.6 * K, 0 * K, dz.bat]], 'part-side'),
    face(rectZ(-1.6 * K, 0 * K, 1.6 * K, 2 * K, dz.bat), 'part'),
  ]));
  {
    const z = dz.frame, arms: V3[] = [[-4.2 * K, -3.2 * K, z], [4.2 * K, 5.2 * K, z], [-4.2 * K, 5.2 * K, z], [4.2 * K, -3.2 * K, z]];
    const rotorsBack = [arms[1], arms[2]], rotorsFront = [arms[0], arms[3]];
    // Motor als kurzer Zylinder, darüber der Propeller: Rotorkreis und zwei Blätter
    const motor = (a: V3): Shape[] => [face(ring(a[0], a[1], z - 0.3, 0.42 * K, 14), 'motor-side'), face(ring(a[0], a[1], z + 0.7, 0.42 * K, 14), 'motor')];
    const prop = (a: V3, i: number): Shape[] => {
      const pz = z + 1, th = 0.5 + i * 0.9, c = Math.cos(th) * 1.95 * K, sn = Math.sin(th) * 1.95 * K, w = 0.22 * K, nx = -Math.sin(th) * w, ny = Math.cos(th) * w;
      return [face(ring(a[0], a[1], pz, 2.1 * K), 'rotor'), face([[a[0] - c, a[1] - sn, pz], [a[0] + nx, a[1] + ny, pz], [a[0] + c, a[1] + sn, pz], [a[0] - nx, a[1] - ny, pz]], 'blade')];
    };
    layer('frame', z, [
      ...rotorsBack.flatMap((a, i) => [...motor(a), ...prop(a, i)]),
      seg([arms[0], arms[1]], 'arm'), seg([arms[2], arms[3]], 'arm'),
      face(rectZ(-1.4 * K, -0.4 * K, 1.4 * K, 2.4 * K, z), 'part'),
      ...rotorsFront.flatMap((a, i) => [...motor(a), ...prop(a, i + 2)]),
    ]);
  }
  inner(layer('board', dz.board, [
    ...plate(-2.4 * K, -1.4 * K, 2.4 * K, 3.4 * K, dz.board, 0.25, 'part'),
    face(rectZ(-0.8 * K, 0.2 * K, 0.8 * K, 1.8 * K, dz.board), 'chip'),
    ...[-1.7, 1.7].flatMap((x) => [seg([[x * K, -0.9 * K, dz.board], [x * K, 2.9 * K, dz.board]], 'trace')]),
  ]));
  inner(layer('gps', dz.gps, [
    ...plate(-1.3 * K, 0 * K, 1.3 * K, 2.6 * K, dz.gps, 0.35, 'part'),
    face(rectZ(-0.7 * K, 0.6 * K, 0.7 * K, 2 * K, dz.gps), 'chip'),
  ]));
  // Gehäuse mit Beinen: nur zusammengesetzt; beim Explodieren weitet es sich leicht und verblasst
  {
    const x0 = -1.75 * K, x1 = 1.75 * K, y0 = -0.75 * K, y1 = 2.75 * K, zb = 7.9, zt = 10.7, leg = 2.2;
    const legs: V3[] = [[x0 + 0.5, y0 + 0.5, zb], [x1 - 0.5, y0 + 0.5, zb], [x0 + 0.5, y1 - 0.5, zb], [x1 - 0.5, y1 - 0.5, zb]];
    add({ key: 'shell', zc: o.zone.drone, steps: [0], asmOnly: true, origin: P([0, K, 9.3]), hide: { s: [1.08, 1.08] }, shapes: [
      ...legs.slice(2).map((l) => seg([l, [l[0], l[1], zb - leg]], 'leg')),
      face([[x0, y0, zb], [x1, y0, zb], [x1, y0, zt], [x0, y0, zt]], 'shell-side'),
      face([[x0, y0, zb], [x0, y1, zb], [x0, y1, zt], [x0, y0, zt]], 'shell-side'),
      face(rectZ(x0, y0, x1, y1, zt), 'shell'),
      ...legs.slice(0, 2).map((l) => seg([l, [l[0], l[1], zb - leg]], 'leg')),
      ...legs.map((l) => seg([[l[0] - 0.6, l[1], zb - leg], [l[0] + 0.6, l[1], zb - leg]], 'leg')),
    ] });
  }
  layer('led', dz.led, [
    { t: 'circle', c: P([0 * K, 1.3 * K, dz.led + 0.4]), r: 30, cls: 'led-halo' },
    face(ring(0, 1.3 * K, dz.led, 1.7 * K), 'led-base'),
    { t: 'circle', c: P([0 * K, 1.3 * K, dz.led + 0.4]), r: 16, cls: 'led-glow' },
    { t: 'circle', c: P([0 * K, 1.3 * K, dz.led + 0.4]), r: 6, cls: 'led-core' },
  ]);
  add({ key: 'drone-axis', zc: o.zone.drone, steps: [0], origin: droneCenter, asm: 0, hide: { s: [1, 0.02] }, shapes: [seg([[0, 1.3 * K, dz.bat - 1.5], [0, 1.3 * K, dz.led + 2.4]], 'guide')] });

  // ---------- Bodenstation und Feld (Schritte 1–3 und Live-Show; Musik und Licht und die Simulation schweben ohne Boden) ----------
  const fieldCenter = P([0, 0, 0]);
  add({ key: 'field', zc: o.zone.field, steps: [1, 2, 3, 6], origin: fieldCenter, hide: { s: [0.04, 0.04] }, shapes: [
    ...plate(field.x0, field.y0, field.x1, field.y1, 0, 0.6, 'slab'),
    ...Array.from({ length: 9 }, (_, i) => seg([[field.x0 + 4 + i * 4, field.y0, 0], [field.x0 + 4 + i * 4, field.y1, 0]], 'floor-line')),
    ...Array.from({ length: 6 }, (_, i) => seg([[field.x0, field.y0 + 3.7 + i * 3.7, 0], [field.x1, field.y0 + 3.7 + i * 3.7, 0]], 'floor-line')),
  ] });
  const ST: V3 = [-15, -8, 0], mastTop: V3 = [ST[0] + 0.5, ST[1] + 0.5, 6.2];
  add({ key: 'station', zc: o.zone.station, steps: [1, 2, 3, 6], dim: [2, 3], origin: P(ST), hide: { s: [0.04, 0.04] }, shapes: [
    face([[ST[0] - 1.6, ST[1] - 1, 0], [ST[0] + 1.6, ST[1] - 1, 0], [ST[0] + 1.6, ST[1] - 1, 1.8], [ST[0] - 1.6, ST[1] - 1, 1.8]], 'zplate-edge'),
    face([[ST[0] - 1.6, ST[1] - 1, 0], [ST[0] - 1.6, ST[1] + 1.4, 0], [ST[0] - 1.6, ST[1] + 1.4, 1.8], [ST[0] - 1.6, ST[1] - 1, 1.8]], 'zplate-edge'),
    face(rectZ(ST[0] - 1.6, ST[1] - 1, ST[0] + 1.6, ST[1] + 1.4, 1.8), 'zplate'),
    seg([[mastTop[0], mastTop[1], 1.8], mastTop], 'mast'),
    { t: 'circle', c: P(mastTop), r: 6, cls: 'mast-glow' }, { t: 'circle', c: P(mastTop), r: 2.4, cls: 'mast-tip' },
  ] });
  // Startraster am Boden: von hier steigen die Drohnen auf (Bodenstation, Flugbahnen, Live-Show)
  add({ key: 'seeds', zc: o.zone.field, steps: [1, 2, 3, 6], origin: fieldCenter, hide: { s: [0.04, 0.04] }, shapes: seeds.map((s) => ({ t: 'poly', pts: ring(s[0], s[1], 0, 0.55, 14).map(P), cls: 'seed' }) as Shape) });
  // 1 · Funk (Marc, Runde 19: „die Kontrollstation bringt die Drohnen mit gestrichelten Linien, die die Signale darstellen, in
  // ihre Formation“): wenige Signallinien, erst zu den Drohnen im Startraster, nach dem Aufstieg zu denselben im Stern
  const mt = P(mastTop);
  const linked = [3, 11, 19, 27, 35];
  add({ key: 'radio', zc: o.zone.station, steps: [1, 6], origin: mt, hide: { s: [0.1, 0.1] }, shapes: [
    ...[9, 15, 21].map((rad) => ({ t: 'circle', c: mt, r: rad, cls: 'wave' }) as Shape),
    ...linked.map((i) => ({ t: 'line', pts: [mt, P(pairs[i].start)], cls: 'signal signal-ground' }) as Shape),
    ...linked.map((i) => ({ t: 'line', pts: [mt, P(pairs[i].motif)], cls: 'signal signal-sky' }) as Shape),
  ] });

  // Live-Show (Marc, Runde 20): Stern → Herz → Kreis im Wechsel; vor jedem Wechsel Signale zu denselben Drohnen in der
  // nächsten Form. showSky[f][m] = Punkt der Form f für die Drohne, die im Stern an Punkt m steht
  const showSky: V3[][] = [starSky, heartOutline(N, R * 0.95).map((p) => inSky(p)), circleOutline(N, R * 0.82).map((p) => inSky(p))];
  const linkedSky = linked.map((i) => starSky.indexOf(pairs[i].motif));
  showSky.forEach((form, f) => add({ key: `pulse-${f}`, zc: o.zone.station, steps: [6], origin: mt, hide: { s: [0.1, 0.1] }, shapes: linkedSky.map((m) => ({ t: 'line', pts: [mt, P(form[m])], cls: `signal pulse pulse-${f}` }) as Shape) }));

  // ---------- 2 · Idee: Stern als 3D-Modell (Drahtgitter, extrudiert) ----------
  const corners = starCorners(R, Ri), skyCenter = P(SC);
  add({ key: 'mesh', zc: o.zone.idea, steps: [2, 3], dim: [3], origin: skyCenter, hide: { s: [0.04, 0.04] }, shapes: [
    { t: 'poly', pts: corners.map((c) => P(inSky(c, 1))), cls: 'mesh-back' },
    ...corners.map((c) => ({ t: 'line', pts: [P(inSky(c, 1)), P(inSky(c, -1))], cls: 'mesh-edge' }) as Shape),
    ...corners.filter((_, i) => i % 2 === 0).map((c) => ({ t: 'line', pts: [P(inSky([0, 0], -1)), P(inSky(c, -1))], cls: 'mesh-edge' }) as Shape),
    { t: 'poly', pts: corners.map((c) => P(inSky(c, -1))), cls: 'mesh-front' },
  ] });

  // ---------- 3 · Flugbahnen: vom Startraster zu den Punkten ----------
  const pathOf = (a: V3, b: V3): V3[] => Array.from({ length: 18 }, (_, i) => {
    const t = i / 17, c1: V3 = [a[0], a[1], 7], c2: V3 = [b[0], b[1], b[2] - 5], m = 1 - t;
    return [0, 1, 2].map((k) => m ** 3 * a[k] + 3 * m * m * t * c1[k] + 3 * m * t * t * c2[k] + t ** 3 * b[k]) as V3;
  });
  const paths = pairs.map(({ start, motif }) => pathOf(start, motif));
  add({ key: 'paths', zc: o.zone.idea, steps: [3], origin: fieldCenter, hide: { s: [1, 0.02] }, shapes: paths.map((p) => seg(p, 'path')) });

  // ---------- 4 · Musik und Licht: drei gestapelte Ebenen, der Abspielkopf der Zeitleiste ist der Taktgeber ----------
  // Marc (Runde 19): „Der Timing-Balken bewegt sich vor und zurück; das hat eine Entsprechung darunter und darüber: die
  // Lichtstreifen gehen an und aus, die Sternformation oben bildet sich und löst sich wieder auf.“
  const sw = { x0: -8, x1: 8, y0: -4.5, y1: 6.5 };
  const swz = { light: 6, time: 10, route: 14 };
  const tA = sw.x0 + 1, tB = sw.x1 - 1, tAt = (x: number) => r1(((x - tA) / (tB - tA)) * 1000) / 1000;
  const swPlate = (key: string, z: number, extra: Shape[]) => add({ key, zc: o.zone.software, steps: [4], origin: P([0, 1, swz.time]), shift: { 4: 0 }, hide: { s: [0.04, 0.04], dy: 0 }, shapes: [...plate(sw.x0, sw.y0, sw.x1, sw.y1, z, 0.3, 'zplate'), ...extra] });
  // Licht: fünf Spuren mit Farbblöcken im Logoverlauf; jeder Block kennt seinen Zeitbereich (tl)
  const ROWS = 5;
  swPlate('sw-light', swz.light, Array.from({ length: ROWS }, (_, i) => {
    const y = sw.y0 + 1.6 + i * 2.1; return Array.from({ length: 6 }, (_, j): Shape => { const x = sw.x0 + 1.2 + j * 2.4 + (i % 2) * 0.8; return { ...face(rectZ(x, y - 0.35, x + 1.7, y + 0.35, swz.light), `bar bar-${(i + j) % o.colors.length}`), tl: [tAt(x), tAt(x + 1.7), i] } as Shape; });
  }).flat());
  // Musik und Timing: Wellenform der Musik in der vorderen Spur, darüber die Spuren, Takte und der Abspielkopf
  const audio: V3[] = Array.from({ length: 113 }, (_, i) => { const x = tA + (i / 112) * (tB - tA), a = 0.12 + 0.55 * Math.abs(Math.sin(x * 1.7) * Math.sin(x * 0.43 + 1.2)); return [x, sw.y0 + 1.6 + (i % 2 ? a : -a), swz.time]; });
  swPlate('sw-time', swz.time, [
    seg(audio, 'audio'),
    ...Array.from({ length: ROWS - 1 }, (_, i) => seg([[tA, sw.y0 + 3.7 + i * 2.1, swz.time], [tB, sw.y0 + 3.7 + i * 2.1, swz.time]], 'track')),
    ...Array.from({ length: 13 }, (_, i) => seg([[tA + i * 1.165, sw.y0 + 0.8, swz.time], [tA + i * 1.165, sw.y1 - 0.8, swz.time]], 'tick')),
    seg([[1.2, sw.y0 + 0.4, swz.time], [1.2, sw.y1 - 0.4, swz.time]], 'playhead'),
  ]);
  const ph0 = P([1.2, sw.y0 + 0.4, swz.time]), phA = P([tA, sw.y0 + 0.4, swz.time]), phB = P([tB, sw.y0 + 0.4, swz.time]);
  const sweep: [P2, P2] = [[r1(phA[0] - ph0[0]), r1(phA[1] - ph0[1])], [r1(phB[0] - ph0[0]), r1(phB[1] - ph0[1])]];
  // Flugrouten: von einer Startreihe vorn zu den Punkten eines Sterns in der Draufsicht
  const planStar = starOutline(N, 4.4, 1.85).map(([u, v]): V3 => [u, 1.6 + v * 0.95, swz.route]);
  const planStart: V3[] = Array.from({ length: N }, (_, i) => [sw.x0 + 1 + (i * (sw.x1 - sw.x0 - 2)) / (N - 1), sw.y0 + 0.7, swz.route]);
  const routes = pair(planStart, planStar);
  const routeAt = ({ start, motif }: { start: V3; motif: V3 }, t: number): V3 => { const m: V3 = [start[0], (start[1] + motif[1]) / 2, swz.route]; return [(1 - t) ** 2 * start[0] + 2 * (1 - t) * t * m[0] + t * t * motif[0], (1 - t) ** 2 * start[1] + 2 * (1 - t) * t * m[1] + t * t * motif[1], swz.route]; };
  swPlate('sw-route', swz.route, routes.filter((_, i) => i % 2 === 0).map((r) => seg(Array.from({ length: 12 }, (_, i) => routeAt(r, i / 11)), 'route')));
  add({ key: 'sw-guides', zc: o.zone.software, steps: [4], origin: P([0, 1, swz.time]), hide: { s: [0.04, 0.04] }, shapes: [[sw.x0, sw.y0], [sw.x1, sw.y0], [sw.x0, sw.y1]].map(([x, y]) => seg([[x, y, swz.light], [x, y, swz.route]], 'guide')) });

  // ---------- 5 · Simulation: der Stapel legt sich auf den Boden des Glasquaders, der Quader wächst aus ihm ----------
  const bx = { x0: -9.5, x1: 9.5, y0: -4, y1: 6, z0: 4, z1: 23 };
  pieces.filter((p) => p.key.startsWith('sw-')).forEach((p) => { p.after = { s: [1, 1], dy: dyBetween([0, 1, p.key === 'sw-light' ? swz.light : p.key === 'sw-time' ? swz.time : p.key === 'sw-route' ? swz.route : swz.light], [0, 1, bx.z0]) }; });
  const boxFloor = P([(bx.x0 + bx.x1) / 2, (bx.y0 + bx.y1) / 2, bx.z0]);
  const corner = (x: number, y: number, z: number): V3 => [x, y, z];
  const { x0, x1, y0, y1, z0, z1 } = bx;
  add({ key: 'box-back', zc: o.zone.sim, steps: [5], origin: boxFloor, hide: { s: [1, 0.02] }, shapes: [
    face(rectZ(x0, y0, x1, y1, z0), 'glass-floor'),
    face([corner(x0, y1, z0), corner(x1, y1, z0), corner(x1, y1, z1), corner(x0, y1, z1)], 'glass-back'),
    face([corner(x1, y0, z0), corner(x1, y1, z0), corner(x1, y1, z1), corner(x1, y0, z1)], 'glass-back'),
    seg([corner(x1, y1, z0), corner(x0, y1, z0)], 'glass-hidden'), seg([corner(x1, y1, z0), corner(x1, y0, z0)], 'glass-hidden'), seg([corner(x1, y1, z0), corner(x1, y1, z1)], 'glass-hidden'),
  ] });
  const boxFront = add({ key: 'box', zc: o.zone.sim, steps: [5], origin: boxFloor, hide: { s: [1, 0.02] }, shapes: [
    face([corner(x0, y0, z0), corner(x1, y0, z0), corner(x1, y0, z1), corner(x0, y0, z1)], 'glass'),
    face([corner(x0, y0, z0), corner(x0, y1, z0), corner(x0, y1, z1), corner(x0, y0, z1)], 'glass'),
    ...([
      [[x0, y0, z0], [x1, y0, z0]], [[x0, y0, z0], [x0, y1, z0]], [[x0, y0, z0], [x0, y0, z1]], [[x1, y0, z0], [x1, y0, z1]], [[x0, y1, z0], [x0, y1, z1]],
      [[x0, y0, z1], [x1, y0, z1]], [[x1, y0, z1], [x1, y1, z1]], [[x1, y1, z1], [x0, y1, z1]], [[x0, y1, z1], [x0, y0, z1]],
    ] as [V3, V3][]).map(([a, b]) => seg([a, b], 'glass-edge')),
  ] });
  // Wind als Stromlinien wie aus einer Windsimulation (Marc: „durchgehende, sich selbst zeichnende Windlinien“): Umströmung
  // eines Zylinders um die Sternmitte (Stromfunktion ψ = v · (1 − a² / r²)), in Ebenen knapp vor, in und hinter dem Stern,
  // leicht gewellt. Das Skript lässt sie von Luv nach Lee zeichnen und wieder auslaufen.
  const U0 = -13, U1 = 13, A2 = 2.6 * 2.6;
  const streamV = (u: number, psi: number) => { let v = psi + Math.sign(psi || 1) * 2.6; for (let i = 0; i < 40; i++) { const r2 = u * u + v * v, f = v * (1 - A2 / r2) - psi, df = 1 - A2 / r2 + (2 * A2 * v * v) / (r2 * r2); v -= f / df; } return v; };
  const streams = ([[-8.6, 1.4], [-6.1, -1.2], [-3.9, 0.8], [-1.6, -0.6], [1.6, 0.6], [3.9, -0.8], [6.1, 1.2], [8.4, -1.4]] as [number, number][]).map(([psi, d], i): Shape => ({ t: 'line', cls: 'stream', pts: Array.from({ length: 48 }, (_, j) => {
    const u = U0 + ((U1 - U0) * j) / 47; return P(inSky([u, streamV(u, psi) + Math.sin(u * 0.45 + i) * 0.35], d));
  }) }));
  add({ key: 'wind', zc: o.zone.sim, steps: [5], origin: P(inSky([U0, 0])), hide: { s: [0.04, 1] }, shapes: [...streams.map((st) => ({ ...st, cls: 'stream-base' })), ...streams] });
  const w0 = P(inSky([0, 0])), w1 = P(inSky([1, 0])), wl = Math.hypot(w1[0] - w0[0], w1[1] - w0[1]);
  const wind: P2 = [r1(((w1[0] - w0[0]) / wl) * 1000) / 1000, r1(((w1[1] - w0[1]) / wl) * 1000) / 1000];
  // … und zwei Bahnen kommen sich zu nahe: erst nach dem Wind (late), damit der Schritt nicht auf einmal voll ist
  // Runde 20 (Marc): Ring und Hinweis unten am Anfang der beiden orangen Bahnen, der Stern steht frei
  const nearLow = (i: number) => P(paths[i].find((q) => q[2] >= bx.z0)!);
  const near = (() => { let best = { i: 0, d: Infinity, at: [0, 0] as P2 }; for (let i = 0; i < paths.length - 1; i++) { for (let t = 5; t < 14; t++) { const a = P(paths[i][t]), b = P(paths[i + 1][t]), d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d < best.d) best = { i, d, at: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }; } } return best; })();
  const warnAt: P2 = (() => { const a = nearLow(near.i), b = nearLow(near.i + 1); return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 7]; })();
  add({ key: 'warn', zc: o.zone.warn, steps: [5], late: true, origin: warnAt, hide: { s: [0.1, 0.1] }, shapes: [
    // nur im Quader (die Bahnen beginnen am Boden, der in der Simulation fehlt)
    seg(paths[near.i].filter((q) => q[2] >= bx.z0), 'path-hot'), seg(paths[near.i + 1].filter((q) => q[2] >= bx.z0), 'path-hot'),
    { t: 'circle', c: warnAt, r: 9, cls: 'warn-ring' },
  ] });

  // ---------- 6 · Live-Show: Publikum vorn ----------
  const crowd: V3[] = Array.from({ length: 28 }, (_, i) => [-12 + (i % 14) * 1.85 + (Math.floor(i / 14) ? 0.9 : 0), -10.6 - Math.floor(i / 14) * 1.3, 0.5]);
  add({ key: 'crowd', zc: o.zone.crowd, steps: [6], origin: P([0, -11, 0]), hide: { s: [0.04, 0.04] }, shapes: crowd.map((c) => ({ t: 'circle', c: P(c), r: 1.7, cls: 'guest' }) as Shape) });
  add({ key: 'keepout', zc: o.zone.crowd, steps: [6], origin: P([0, -9, 0]), hide: { s: [0.04, 1] }, shapes: [seg([[-13, -9, 0], [13, -9, 0]], 'keepout')] });

  // ---------- Drohnen: eine Lage je Schritt ----------
  const drones: StoryDrone[] = pairs.map(({ start, motif }, k) => {
    const route = routes[k];
    const at = (p: V3, a = 1): [number, number, number] => { const q = P(p); return [r1(q[0]), r1(q[1]), a]; };
    const plan = P(route.motif);
    const pos: [number, number, number][] = [
      at(start, 0), // 0: unsichtbar im Startraster (die große Drohne steht allein)
      at(motif), // 1: im Stern am Himmel; Zwischenhalt im Startraster, die Station bringt sie hoch
      at(motif, 0), // 2: unsichtbar an ihrem Punkt im Modell
      at(motif), // 3: Flugbahnen
      at(route.motif), // 4: Draufsicht auf der Routenebene, folgt dem Abspielkopf (track)
      at(motif), at(motif), // 5: Simulation, 6: Live-Show
    ];
    const m = starSky.indexOf(motif), u = m >= 0 ? starUV[m][0] : 0;
    const track = Array.from({ length: 10 }, (_, i): P2 => { const q = P(routeAt(route, i / 9)); return [r1(q[0] - plan[0]), r1(q[1] - plan[1])]; });
    // Live-Show: wie an der Bodenstation erst ins Startraster, die Station bringt sie hoch; dann die weiteren Formen
    const sky = P(motif), show = showSky.slice(1).map((form): P2 => { const q = P(form[m]); return [r1(q[0] - sky[0]), r1(q[1] - sky[1])]; });
    return { pos, c: colorAt(motif[0] - SC[0]), k, w: r1(((u + R) / (2 * R)) * 100) / 100, via: { 1: P(start), 6: P(start) }, track, show };
  });

  // ---------- Annotationen (wenige: Marc „höheres Abstraktionsniveau, weniger Annotationen“) ----------
  const notes: { key: string; text: string; steps: number[]; p: P2; side: 'l' | 'r'; target?: string; check?: boolean; row?: number; late?: boolean }[] = [
    { key: 'led', text: 'Leuchtstarke LED', steps: [0], p: P([1.7 * K, 1.3 * K, dz.led]), side: 'r', target: 'led' },
    { key: 'gps', text: 'GPS und Gyroskop', steps: [0], p: P([-1.3 * K, 1.3 * K, dz.gps]), side: 'l', target: 'gps' },
    { key: 'frame', text: 'Leichter Rahmen', steps: [0], p: P([4.2 * K, -3.2 * K, dz.frame]), side: 'r', target: 'frame' },
    { key: 'station', text: 'Bodenstation', steps: [1], p: P([ST[0] - 1.6, ST[1], 1]), side: 'l', target: 'station' },
    { key: 'model', text: '3D-Modell', steps: [2], p: P(inSky(corners[2], -1)), side: 'l', target: 'mesh' },
    { key: 'point', text: 'Ein Punkt, eine Drohne', steps: [3], p: P(starSky[Math.round(N * 0.15)]), side: 'r' },
    { key: 'route', text: 'Flugroute', steps: [4], p: P([sw.x1, 1, swz.route]), side: 'r', target: 'sw-route' },
    { key: 'timing', text: 'Musik und Timing', steps: [4], p: P([sw.x1, 1, swz.time]), side: 'r', target: 'sw-time' }, // rechts zwischen den beiden anderen: links kollidierte die längere Pille schmal mit „Lichtsequenz“
    { key: 'light', text: 'Lichtsequenz', steps: [4], p: P([sw.x1, 1, swz.light]), side: 'r', target: 'sw-light' },
    { key: 'wind', text: 'Wind', steps: [5], p: P(inSky([U0 + 1.5, -6.1 + Math.sin((U0 + 1.5) * 0.45 + 7) * 0.35], 1.2)), side: 'l', target: 'wind' },
    // Runde 20 (Marc): unten am Anfang der beiden orangen Bahnen, damit der Stern frei steht
    { key: 'near', text: 'Zu nah: korrigieren', steps: [5], p: [warnAt[0] + 10, warnAt[1]], side: 'r', target: 'warn', late: true },
    { key: 'gpsSignal', text: 'GPS-Signal', steps: [6], p: P([15, 3, 7]), side: 'r', check: true, row: 0 },
    { key: 'weather', text: 'Wetter', steps: [6], p: P([15, 3, 7]), side: 'r', check: true, row: 1 },
    { key: 'noFly', text: 'Flugverbotszonen', steps: [6], p: P([15, 3, 7]), side: 'r', check: true, row: 2 },
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
  drones.forEach((d) => {
    d.pos = d.pos.map(([x, y, a]) => [r1(x - X0), r1(y - Y0), a]);
    if (d.via) d.via = Object.fromEntries(Object.entries(d.via).map(([s, p]) => [s, sh(p)]));
  });
  void boxFront;
  const outNotes = notes.map((n) => { const [x, y] = sh(n.p); return { key: n.key, text: n.text, steps: n.steps, side: n.side, target: n.target, check: n.check, row: n.row, late: n.late, x, y }; });

  // ---------- Bildausschnitt je Schritt: was in dem Schritt sichtbar und nicht gedämpft ist, ohne das Feld (Boden darf
  // über den Rand laufen), mit den Ankern der Annotationen; Rand 9 %, mindestens so breit, dass nichts zu groß wird ----------
  const frames = Array.from({ length: STEPS }, (_, st): [number, number, number, number] => {
    const q: P2[] = [];
    pieces.forEach((pc) => {
      if (!pc.steps.includes(st) || pc.dim?.includes(st) || pc.key === 'field') return;
      const dy = pc.shift?.[st] ?? 0;
      pc.shapes.forEach((s) => { if (s.t === 'circle') q.push([s.c[0] - s.r, s.c[1] - s.r + dy], [s.c[0] + s.r, s.c[1] + s.r + dy]); else s.pts.forEach((p) => q.push([p[0], p[1] + dy])); });
    });
    drones.forEach((d) => { const [x, y, a] = d.pos[st]; if (a > 0) q.push([x, y]); if (a > 0 && st === 6) d.show?.forEach(([ox, oy]) => q.push([x + ox, y + oy])); });
    outNotes.forEach((n) => { if (n.steps.includes(st)) q.push([n.x, n.y]); });
    const fx0 = Math.min(...q.map((p) => p[0])), fx1 = Math.max(...q.map((p) => p[0])), fy0 = Math.min(...q.map((p) => p[1])), fy1 = Math.max(...q.map((p) => p[1]));
    let w = fx1 - fx0, h = fy1 - fy0;
    const minW = W * 0.42; if (w < minW) w = minW; if (h < minW * 0.6) h = minW * 0.6;
    const cx = (fx0 + fx1) / 2, cy = (fy0 + fy1) / 2;
    w *= 1.18; h *= 1.18;
    return [r1(cx - w / 2), r1(cy - h / 2), r1(w), r1(h)];
  });
  // Bewegung: Funk und Aufstieg an der Bodenstation, Abspielkopf in Musik und Licht, Wind und Böen in der Simulation,
  // Eigenbewegung überall, wo der Stern am Himmel steht; die Drohne steht im ersten Schritt erst zusammen
  const motion: Motion = { signal: [1, 6], sweep: [4], wind: [5], alive: [1, 3, 5, 6], assemble: 0, show: [6] };
  return { vb: [0, 0, r1(W), r1(H)], pieces, drones, steps: STEPS, notes: outNotes, frames, wind, sweep, motion };
}

/** Pfad eines Teils als SVG-d */
export const pathD = (s: Exclude<Shape, { t: 'circle' }>) => 'M' + s.pts.map((p) => `${p[0]} ${p[1]}`).join('L') + (s.t === 'poly' ? 'Z' : '');
