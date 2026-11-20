// Wahrzeichen als Körper (Runde 10, docs/katalog-wahrzeichen.md). Bauweise wie die 3D-Fassungen der Katalogmotive
// (docs/katalog-3d.md, Baukasten kit.js): Volumen als Skelett (Umriss, Meridiane, Reifen, Kanten), keine Punktwolke, keine
// zweite Ebene ohne Verbindung. Maße aus den 2D-Zeichnungen in scenes/wahrzeichen.js, damit 2D und 3D bei 0° dasselbe
// Bild zeigen. Jede Fassung ist (n, stufe) → { pts: [[x, y, z, r, g, b]], live(base, j, t, out) } mit genau n Punkten.
//   3D  (schlicht): wenige Grundkörper, der Körper schwenkt langsam, Licht läuft.
//   3D+ (aufwendig): mehr Teile und feinere Silhouette, dazu eine eigene Bewegung (die Kugel des Fernsehturms dreht sich,
//        die Lichtzeituhr des Rheinturms zählt, Licht fährt durch das Brandenburger Tor, die Schwebebahn fährt ein).
// Bewegung nur als Drehung, Hin und Zurück oder eine Fahrt, die einmal anhält; Tempo unter 0,8 × Drohnengrenze
// (Wächter scripts/wahrzeichen.test.mjs).
import { TAU, revolve, ellipsoid, tube, curves, spot, assemble, colour, turn } from './kit.js';
import { WARM, GOLD, CYAN, RED, BLUE, DIAMOND, mix, glint, chase } from '../../show-motion.js';
import { FT, RT, RT_POD, BT, KD, EP, SB, SKY, ANTENNA, SG, crownLine, SHAPES, linesOf, waveArcs, waveLight } from '../wahrzeichen.js';
import { turnAbout } from './kit.js';
import { prepareLines, lineSample } from '../catalog-resample.js';

const BRICK = [235, 130, 90], STEEL = [150, 220, 160];
/** Gebäude stehen schräg (wie die Katalog-Körper in der Dreiviertelansicht) und schwenken von dort; Türme sind rund und
 * stehen frontal; Tor und Dom nur um 0,3, weil ihre Fassade das Erkennungszeichen ist. */
const VIEW = 0.5;
const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
/** Weiche Fahrt 0 → 1 über die Dauer d (ab t0), ohne Ruck an beiden Enden (Smootherstep). */
const glide = (t, t0, d) => { const u = Math.max(0, Math.min(1, (t - t0) / d)); return u * u * u * (u * (u * 6 - 15) + 10); };
/** Warnlicht an der Spitze: ruhiges Glimmen, einmal je 1,6 s hell. */
export const warning = (t) => 0.45 + 1.0 * Math.exp(-((((t % 1.6) - 0.2) / 0.12) ** 2));
const line3 = (...pts) => ({ pts: pts.map(([x, y, z = 0]) => [x, y, z]) });
/** Eine 2D-Polylinie in der Tiefe z. */
const at = (pts, z) => ({ pts: pts.map(([x, y]) => [x, y, z]) });

// ---------- Fernsehturm ----------
// Runde 10b: Proportionen und Funkwellen wie die 2D-Fassung (scenes/wahrzeichen.js, FT, FT_WAVES); die Kugel als Globus
// (Breitenkreise und zwei Meridiane, wie der ältere Jubiläums-Turm), in 3D+ dreht sie sich. Die Wellen liegen in der
// Bildebene und schwenken nicht mit, sie sind ein Zeichen, kein Körper.
export function fernsehturm(n, stufe = '3D') {
  const plus = stufe === '3D+', [cx, cy, r] = FT.sphere, bottom = cy - r * 0.97, top = cy + r, y0 = FT.ground;
  const parts = [
    revolve('shaft', [0, 0, 0], [[0.15, y0], [0.105, y0 + 0.1], [FT.shaftBottom, y0 + 0.22], [FT.shaftTop, bottom]], { meridians: plus ? 6 : 4, phase: Math.PI / 4, rings: plus ? [y0 + 0.22] : [] }),
    ellipsoid('sphere', [cx, cy, 0], [r, r, r], { lat: [-0.5, 0.15, 0.6], mer: plus ? [Math.PI / 6, Math.PI / 2, (5 * Math.PI) / 6] : [Math.PI / 4, (3 * Math.PI) / 4] }),
    revolve('korb', [0, 0, 0], [[0.035, top - 0.005], [0.035, FT.korb]], { meridians: 4, phase: Math.PI / 4, rings: [FT.korb] }),
    curves('antenna', [line3([0, FT.korb], [0, FT.tip - 0.04]), ...(plus ? FT.bars.flatMap((y) => [line3([-0.03, y], [0.03, y]), line3([0, y, -0.03], [0, y, 0.03])]) : [])]),
    curves('wave', waveArcs(3).map((pts) => ({ pts: pts.map(([x, y]) => [x, y, 0]) })), { w: 0.8 }),
    spot('tip', [0, FT.tip, 0], 1),
  ];
  const shape = assemble(parts, n), pts = colour(shape, { shaft: WARM, sphere: DIAMOND, korb: WARM, antenna: WARM, wave: CYAN, tip: RED }, WARM);
  const tags = shape.tags, SPIN = 0.35;
  return { pts, tags, live: (b, j, t, o) => {
    const tag = tags[j];
    if (tag === 'wave') { o[3] = waveLight(Math.hypot(b[0] - cx, b[1] - cy), t); return; }
    if (tag === 'tip') o[3] = warning(t);
    else if (tag === 'sphere') {
      // 3D+: die Kugel dreht sich um den Schaft (Meridiane wandern); das Fensterband glänzt rundum
      if (plus) { const a = t * SPIN, x = o[0] - cx, z = o[2]; o[0] = cx + x * Math.cos(a) + z * Math.sin(a); o[2] = -x * Math.sin(a) + z * Math.cos(a); }
      o[3] = Math.abs(b[1] - cy - 0.15 * r) < 0.02 ? glint(Math.atan2(b[2], b[0] - cx), t, 3.2, 0.7, -Math.PI, Math.PI) : 1;
    }
    turn(o, t, 0, plus ? 0.3 : 0.4, 14);
  } };
}

// ---------- Rheinturm ----------
/** Lichtzeituhr (Ziffern von unten: Sekunden-Einer, -Zehner, Minuten-Einer, -Zehner, Stunden-Einer, -Zehner). */
// Start 23:58:47 (Runde 10b): dann leuchtet der größte Teil der Punktreihe, um 20:15 waren es nur ein paar verstreute Punkte
export const CLOCK = { from: -0.82, to: 0.36, groups: [9, 5, 9, 5, 9, 2], start: 23 * 3600 + 58 * 60 + 47 };
/** Leuchtet die Drohne an Stelle u (0 unten … 1 oben) der Lichtzeituhr zur Zeit t? null = Trenner zwischen den Ziffern. */
export function clockLit(u, t) {
  const total = CLOCK.groups.reduce((a, b) => a + b + 1, -1), s = Math.floor(CLOCK.start + Math.max(0, t)), k = Math.min(total - 1, Math.floor(u * total));
  const digits = [s % 10, Math.floor(s / 10) % 6, Math.floor(s / 60) % 10, Math.floor(s / 600) % 6, Math.floor(s / 3600) % 24 % 10, Math.floor(Math.floor(s / 3600) % 24 / 10)];
  let at0 = 0;
  for (let g = 0; g < CLOCK.groups.length; g++) {
    if (k < at0 + CLOCK.groups[g]) return k - at0 < digits[g];
    if (k === at0 + CLOCK.groups[g]) return null;
    at0 += CLOCK.groups[g] + 1;
  }
  return null;
}
/** Licht einer Drohne der Lichtzeituhr: leuchtende Ziffer hell, nicht leuchtende kaum, Trenner dunkel (eine Punktreihe). */
export const clockLight = (u, t) => { const lit = clockLit(u, t); return lit === null ? 0 : lit ? 1.4 : 0.14; };
export function rheinturm(n, stufe = '3D') {
  // Runde 10b: Kanzel nach dem Foto (RT_POD in scenes/wahrzeichen.js), Reifen an den drei Rändern machen aus ihnen Teller
  const plus = stufe === '3D+', y0 = RT.ground, rAt = (y) => 0.1 + (0.07 - 0.1) * ((y - y0) / (RT.shaftTop[1] - y0));
  const parts = [
    revolve('shaft', [0, 0, 0], [[0.1, y0], RT.shaftTop], { meridians: 4, phase: Math.PI / 4, rings: plus ? [y0 + 0.002] : [] }),
    revolve('pod', [0, 0, 0], RT_POD, { meridians: plus ? 8 : 6, phase: Math.PI / 8, rings: plus ? [...RT.rims, ...RT.tops].map((q) => q[1]) : RT.rims.map((q) => q[1]) }),
    curves('antenna', [line3([0, RT.antenna], [0, RT.tip - 0.04])]),
    // die Lichtzeituhr: eine Reihe Lichter vorn auf dem Schaft
    curves('clock', [{ pts: Array.from({ length: 13 }, (_, i) => { const y = CLOCK.from + ((CLOCK.to - CLOCK.from) * i) / 12; return [0, y, rAt(y) + 0.012]; }) }], { w: plus ? 1.2 : 1 }),
    spot('tip', [0, RT.tip, 0], 1),
  ];
  const shape = assemble(parts, n), pts = colour(shape, { shaft: WARM, pod: WARM, antenna: WARM, clock: GOLD, tip: RED }, WARM), tags = shape.tags;
  return { pts, tags, live: (b, j, t, o) => {
    const tag = tags[j];
    if (tag === 'tip') o[3] = warning(t);
    else if (tag === 'clock') o[3] = clockLight((b[1] - CLOCK.from) / (CLOCK.to - CLOCK.from), plus ? t : 0);
    else if (tag === 'pod' && Math.abs(b[1] - RT.rims[0][1]) < 0.012) o[3] = glint(Math.atan2(b[2], b[0]), t, 3.6, 0.6, -Math.PI, Math.PI);
    turn(o, t, 0, plus ? 0.3 : 0.4, 14);
  } };
}

// ---------- Brandenburger Tor ----------
export function tor(n, stufe = '3D') {
  const plus = stufe === '3D+', { ground: g, colTop: c, beamTop: bt, atticTop: a, steps: s, cols } = BT, W = 1.05, m = 0.5, D = 0.2;
  const lines = [];
  // vorn die Säulen, das Gebälk und die Attika; hinten der Umriss (3D) bzw. auch die Säulen (3D+)
  const outline = [[-W, c], [-W, a], [-m, a], [-m, s], [m, s], [m, a], [W, a], [W, c], [-W, c]];
  for (const x of cols) lines.push(line3([x, g, D], [x, c, D]));
  lines.push(at(outline, D), at([[-W, bt], [W, bt]], D), at(outline, -D));
  if (plus) for (const x of cols) lines.push(line3([x, g, -D], [x, c, -D]));
  // Tiefenkanten an den Ecken des Gebälks und der Attikastufe: daraus wird ein Körper
  // (nur oben: unten stauchten sich die Kanten in der Schrägansicht zu hellen Strichen neben den Ecksäulen)
  for (const [x, y] of [[-W, a], [W, a], [-m, s], [m, s]]) lines.push(line3([x, y, D], [x, y, -D]));
  // 3D+: die Durchgänge, je Säulenpaar eine Wand in die Tiefe (Kante unter dem Gebälk)
  if (plus) for (const x of cols) lines.push(line3([x, c, D], [x, c, -D]));
  const parts = [curves('gate', lines)];
  // Quadriga: vorn vier Pferdeköpfe, dahinter Viktoria mit dem Stab; in 3D+ stehen die Pferde paarweise in der Tiefe
  const heads = [-0.3, -0.12, 0.12, 0.3], h = 0.16;
  const horses = heads.map((x, i) => { const z = plus ? (i % 3 === 0 ? 0.06 : -0.02) : 0; return line3([x - 0.05, s, z], [x - 0.05, s + h * 0.7, z], [x, s + h, z], [x + 0.05, s + h * 0.7, z], [x + 0.05, s, z]); });
  parts.push(curves('quadriga', horses), curves('staff', [line3([0, s + 0.09, -0.08], [0, s + 0.38, -0.08])]), spot('wreath', [0, s + 0.42, -0.08], plus ? 8 : 5, 0.04));
  const shape = assemble(parts, n), pts = colour(shape, { gate: WARM, quadriga: GOLD, staff: GOLD, wreath: GOLD }, WARM), tags = shape.tags;
  return { pts, tags, live: (b, j, t, o) => {
    // 3D: Glanz gleitet über die Front; 3D+: Licht fährt von hinten nach vorn durch die Durchgänge
    if (tags[j] === 'gate') o[3] = plus ? chase(b[2], -t, 0.22, 0.8, 0.75, 1.45) : glint(b[0], t, 4, 0.45, -1.2, 1.2);
    turn(o, t, 0.3, 0.28, 14);
  } };
}

// ---------- Kölner Dom ----------
export function dom(n, stufe = '3D') {
  // Umriss der Westfassade vorn und hinten (wie das Wappen), Tiefenkanten an den Ecken, die Helme als Pyramiden (3D) bzw.
  // achteckig mit Kranz (3D+); dazu in 3D+ Fenster und Portal auf der Front
  const plus = stufe === '3D+', { ground: g, half: H, inner: I, shoulder: S, helm: Hm, tip: T, gable: G, gableFoot: F } = KD;
  const cx = (H + I) / 2, hw = 0.13, hd = 0.18, lines = [];
  for (const sx of [-1, 1]) {
    const o = sx * H, i = sx * I, x = sx * cx;
    const body = [[o, g], [o, S], [o - sx * 0.05, Hm], [i + sx * 0.05, Hm], [i, S], [i, F]];
    lines.push(at(body, hd), at(body.slice(0, 5), -hd));
    for (const [px, py] of [[o, g], [o, S], [o - sx * 0.05, Hm], [i + sx * 0.05, Hm]]) lines.push(line3([px, py, hd], [px, py, -hd]));
    const k = plus ? 8 : 4, R = plus ? hw * 1.08 : hw, ring = Array.from({ length: k }, (_, q) => { const w = (q / k) * TAU + (plus ? TAU / 16 : 0); return [x + Math.cos(w) * R, Hm, Math.sin(w) * R * (plus ? 1 : 1.2)]; });
    for (const p of ring) lines.push(line3(p, [x, T - 0.04, 0]));
    if (plus) { const ym = Hm + (T - Hm) * 0.45, f = 0.55; lines.push({ pts: ring.map((p) => [x + (p[0] - x) * f, ym, p[2] * f]), closed: true }); }
    if (plus) lines.push(at([[x - 0.06, -0.3], [x - 0.06, 0.02], [x, 0.12], [x + 0.06, 0.02], [x + 0.06, -0.3]], hd + 0.004));
  }
  // Mittelteil: der Giebel vorn (ein First nach hinten las sich im Schwenk als schräger Strich)
  lines.push(at([[-I, F], [0, G], [I, F]], hd));
  if (plus) lines.push(at([[-0.12, g], [-0.12, -0.78], [-0.096, -0.68], [-0.054, -0.6], [0, -0.55], [0.054, -0.6], [0.096, -0.68], [0.12, -0.78], [0.12, g]], hd + 0.004));
  const parts = [curves('dom', lines), spot('finial', [-cx, T, 0], 1), spot('finial', [cx, T, 0], 1)];
  const shape = assemble(parts, n), pts = colour(shape, { dom: WARM, finial: GOLD }, WARM), tags = shape.tags;
  return { pts, tags, live: (b, j, t, o) => {
    // Licht steigt an den Türmen hinauf (3D+ in Wellen)
    o[3] = tags[j] === 'finial' ? 1.3 : plus ? chase(b[1], t, 0.35, 1.1, 0.8, 1.4) : glint(b[1], t, 4.5, 0.4, -1.2, 1.2);
    turn(o, t, 0.3, 0.3, 14);
  } };
}

// ---------- Elbphilharmonie ----------
export function elphi(n, stufe = '3D') {
  const plus = stufe === '3D+', { ground: g, brick: k, half: H, crown } = EP, D = 0.32, roof = crownLine();
  const lines = [at([[-H, k], ...roof, [crown.at(-1)[0], k]], D), at(roof, -D)];
  // Grate: von den Spitzen vorn zu den Spitzen hinten (3D: die drei höchsten, 3D+: alle)
  for (const i of plus ? [0, 1, 2, 3, 4, 5, 6] : [0, 3, 6]) lines.push(line3([...crown[i], D], [...crown[i], -D]));
  lines.push(line3([-H, k, -D], [-H, crown[0][1], -D]), line3([crown.at(-1)[0], k, -D], [crown.at(-1)[0], crown.at(-1)[1], -D]));
  // Sockel: vorn ganz, oben rundum, hinten die Kanten
  lines.push(at([[-H, k], [-H, g], [H, g], [H, k]], D), { pts: [[-H, k, D], [H, k, D], [H, k, -D], [-H, k, -D]], closed: true }, line3([-H, k, -D], [-H, g, -D]), line3([H, k, -D], [H, g, -D]));
  if (plus) lines.push(line3([-H, g, D], [-H, g, -D]), line3([H, g, D], [H, g, -D]));
  const parts = [curves('house', lines)];
  // 3D+: die Elbe davor, drei Reihen Wasser
  if (plus) parts.push(curves('water', [-0.25, 0, 0.25].map((d, i) => ({ pts: Array.from({ length: 30 }, (_, q) => [-1.2 + (2.4 * q) / 29, g - 0.12 - 0.05 * i, D + 0.35 + d]) }))), { w: 0.8 });
  const shape = assemble(parts, n), tags = shape.tags;
  const pts = colour(shape, { house: (p) => (p[1] > k + 0.01 ? CYAN : BRICK), water: mix(CYAN, BLUE, 0.5) }, WARM);
  return { pts, tags, live: (b, j, t, o) => {
    if (tags[j] === 'water') { o[1] += 0.015 * Math.sin(b[0] * 3 - t * 1.2 + b[2] * 6); o[3] = 0.75 + 0.2 * Math.sin(b[0] * 4 - t * 0.9); }
    else if (b[1] > k + 0.01) o[3] = plus ? chase(b[0] - 0.4 * b[1], t, 0.3, 1.2, 0.85, 1.4) : glint(b[0], t, 4, 0.45, -1.2, 1.2);
    turn(o, t, VIEW, 0.28, 14);
  } };
}

// ---------- Schwebebahn ----------
export function schwebebahn(n, stufe = '3D') {
  // 3D+: die Böcke stehen weiter auseinander (±1,15 statt ±0,85), damit der Wagen links neben der Mitte warten und zur
  // Mitte einfahren kann, ohne dass er beim Start im Bock steht; vier Beine quer zur Fahrt, der Wagen fährt zwischen ihnen
  const plus = stufe === '3D+', { top: T, bottom: B, ground: g, car: [x0, x1, y0, y1], hang } = SB, X = plus ? 1.5 : 1.2, FX = plus ? 1.15 : 0.85, Z = 0.12;
  const rail = [line3([-X, T, Z], [X, T, Z]), line3([-X, T, -Z], [X, T, -Z]), line3([-X, B, 0], [X, B, 0])];
  if (plus) { const k = 12; for (let i = 0; i < k; i++) { const xa = -X + (2 * X * i) / k, xb = -X + (2 * X * (i + 1)) / k; rail.push(line3([xa, T, (i % 2 ? -1 : 1) * Z], [xb, B, 0])); } }
  const frames = [-FX, FX].flatMap((cx) => (plus ? [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([u, v]) => line3([cx, B, 0], [cx + u * 0.3, g, v * 0.42])) : [line3([cx - 0.3, g, 0.2], [cx, B, 0], [cx + 0.3, g, -0.2])]));
  const yc = (y0 + y1) / 2, rc = (y1 - y0) / 2;
  const parts = [curves('rail', rail), curves('frame', frames), tube('car', [[x0 + rc, yc, 0], [x1 - rc, yc, 0]], rc, { depth: 0.7, hoops: plus ? 3 : 1 }), curves('hanger', hang.map((x) => line3([x, y1, 0], [x + 0.06, (y1 + B) / 2, 0], [x, B, 0])))];
  if (plus) parts.push(curves('window', [line3([x0 + 0.1, y1 - 0.09, rc * 0.7], [x1 - 0.1, y1 - 0.09, rc * 0.7])]));
  const shape = assemble(parts, n), tags = shape.tags;
  const pts = colour(shape, { rail: WARM, frame: STEEL, car: CYAN, hanger: WARM, window: GOLD }, WARM);
  const moves = (tag) => tag === 'car' || tag === 'hanger' || tag === 'window';
  return { pts, tags, live: (b, j, t, o) => {
    // 3D+: der Wagen fährt von links zur Mitte und hält; 3D: er steht, Licht läuft über ihn
    if (moves(tags[j])) { if (plus) { o[0] -= 0.5 * (1 - glide(t, 0.5, 4.5)); o[3] = glint(b[0], t, 3.5, 0.5, -0.6, 0.6); } else o[3] = glint(b[0], t, 3.5, 0.5, -0.6, 0.6); }
    turn(o, t, VIEW, 0.28, 14);
  } };
}

// ---------- Bremer Schlüssel ----------
// Der Schlüssel ist flach; als Körper dreht er sich um seinen Schaft wie im Schloss (Hin und Zurück, nie hochkant, sonst
// fielen alle Drohnen auf eine Linie). Gezeichnet in der feinsten Stufe der 2D-Zeichnung, gleichmäßig abgetastet.
export function schluessel(n, stufe = '3D') {
  // lineSample trifft n bis auf wenige Drohnen (Abstandsregel an Kreuzungen); die fehlenden warten offstage (bodyScene)
  const plus = stufe === '3D+', polys = SHAPES.schluessel(2), tags0 = [...new Set(polys.map((q) => q.tag))];
  const raw = lineSample(prepareLines(linesOf(polys, tags0)), n).pts.slice(0, n);
  const tags = raw.map((q) => tags0[q[2]] ?? 'shaft');
  const pts = raw.map(([x, y], j) => [x, y, 0, ...(tags[j] === 'ornament' ? GOLD : WARM)]);
  // Drehachse: der Schaft, von der Spitze zur Reide
  const A = [(120 - 400) / 300, (400 - 178) / 300, 0], D = [Math.SQRT1_2, -Math.SQRT1_2, 0];
  return { pts, tags, live: (b, j, t, o) => {
    turnAbout(o, A, D, (plus ? 0.9 : 0.55) * Math.sin((t * TAU) / (plus ? 7 : 9)));
    o[3] = glint(b[0] - b[1], t, 4, 0.45, -2.2, 2.2);
  } };
}

// ---------- Frankfurter Skyline ----------
// Gestaffelte Einzelquader überdeckten sich in der Schrägansicht zu Punktsalat. Darum: die Silhouette der 2D-Zeichnung
// vorn, die Dächer nach hinten gezogen (Dachkante hinten, Tiefenkanten an den Dachecken), Antennen mit Warnlicht. So
// bleibt die Skyline lesbar, und im Schwenk zeigt jedes Dach seine Tiefe. 3D+: tiefere Dächer, die Pyramide des
// Messeturms als Körper, der Main Tower mit rundem Dach, Licht steigt Etage für Etage.
export function skyline(n, stufe = '3D') {
  const plus = stufe === '3D+', d = plus ? 0.16 : 0.11, polys = SHAPES.skyline(1), lines = [];
  for (const pl of polys) if (pl.tag === 'skyline') lines.push(at(pl.pts, d));
  for (const tw of SKY.towers) {
    const [a, b] = tw.x, h = tw.h, key = tw.key;
    if (key === 'main' && plus) { lines.push({ pts: Array.from({ length: 20 }, (_, i) => { const w = (i / 20) * TAU; return [(a + b) / 2 + Math.cos(w) * (b - a) / 2, h - 0.02, Math.sin(w) * d]; }), closed: true }); continue; }
    if (key === 'messe' && plus) { for (const [x, z] of [[a, d], [b, d], [b, -d], [a, -d]]) lines.push(line3([x, h, z], [(a + b) / 2, h + 0.36, 0])); lines.push(line3([a, h, -d], [b, h, -d]), line3([a, h, d], [a, h, -d]), line3([b, h, d], [b, h, -d])); continue; }
    const roof = SKY_ROOF(key, a, b, h);
    lines.push(at(roof, -d), line3([...roof[0], d], [...roof[0], -d]), line3([...roof.at(-1), d], [...roof.at(-1), -d]));
  }
  const parts = [curves('tower', lines), curves('antenna', Object.values(ANTENNA).map(([x, y0, y1]) => line3([x, y0, 0], [x, y1 - 0.03, 0])))];
  parts.push(spot('tip', [ANTENNA.commerz[0], ANTENNA.commerz[2], 0], 1), spot('tip', [ANTENNA.main[0], ANTENNA.main[2], 0], 1));
  const shape = assemble(parts, n), pts = colour(shape, { tower: WARM, antenna: WARM, tip: RED }, WARM), tags = shape.tags;
  return { pts, tags, live: (b, j, t, o) => {
    if (tags[j] === 'tip') o[3] = warning(t);
    else o[3] = plus ? chase(b[1], t, 0.3, 1.2, 0.8, 1.35) : glint(b[0], t, 4.5, 0.4, -1.3, 1.3);
    turn(o, t, 0.35, 0.28, 14);
  } };
}
/** Dachlinie eines Turms ohne die Kanten nach unten (wie ROOF in scenes/wahrzeichen.js, Pyramide/Dreieck als Firstlinie). */
const SKY_ROOF = (key, a, b, h) => ({ messe: [[a, h], [(a + b) / 2, h + 0.36], [b, h]], westend: [[a, h], [a + 0.02, h + 0.12], [(a + b) / 2, h + 0.04], [b - 0.02, h + 0.12], [b, h]], commerz: [[a, h], [a + 0.06, h], [a + 0.06, h + 0.08], [b - 0.06, h + 0.08], [b - 0.06, h], [b, h]], main: [[a, h - 0.04], [a + 0.04, h], [b - 0.04, h], [b, h - 0.04]], trianon: [[a, h], [(a + b) / 2, h + 0.17], [b, h]], ezb: [[a, h], [b, h - 0.1]] })[key];

// ---------- Siegessäule ----------
export function siegessaeule(n, stufe = '3D') {
  const plus = stufe === '3D+', { ground: g, base: [bw, bh], hall: [hw, hh], plinth: [pw, ph], col: [c0, c1], top: T, bands } = SG;
  const box = (w, y0, y1, dd) => [{ pts: [[-w, y1, dd], [w, y1, dd], [w, y1, -dd], [-w, y1, -dd]], closed: true }, ...[[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([u, v]) => line3([u * w, y0, v * dd], [u * w, y1, v * dd]))];
  const lines = [...box(bw, g, bh, bw), ...box(hw, bh, hh, hw), ...box(pw, hh, ph, pw)];
  if (plus) lines.push({ pts: [[-bw, g, bw], [bw, g, bw], [bw, g, -bw], [-bw, g, -bw]], closed: true });
  const y0 = T + 0.05;
  const vic = [line3([-0.06, y0], [0, y0 + 0.36], [0.06, y0]),
    line3([-0.02, y0 + 0.27, 0], [-0.2, y0 + 0.46, -0.06], [-0.12, y0 + 0.18, -0.03]), line3([0.02, y0 + 0.27, 0], [0.18, y0 + 0.42, -0.06], [0.11, y0 + 0.16, -0.03])];
  const parts = [
    curves('base', lines),
    revolve('column', [0, 0, 0], [[c0, ph], [c1, T], [0.13, T + 0.05]], { meridians: plus ? 6 : 4, phase: Math.PI / 4, rings: plus ? [T + 0.05] : [] }),
    // die drei Ringe als Reifen um die Säule
    curves('band', bands.map((y) => { const w = c0 + (c1 - c0) * ((y - ph) / (T - ph)) + 0.05; return { pts: Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * TAU; return [Math.cos(a) * w, y, Math.sin(a) * w]; }), closed: true }; })),
    curves('victoria', vic), spot('wreath', [0.14, y0 + 0.5, 0], plus ? 8 : 6, 0.05),
  ];
  const shape = assemble(parts, n), tags = shape.tags;
  const pts = colour(shape, { base: WARM, column: WARM, band: GOLD, victoria: GOLD, wreath: GOLD }, WARM);
  return { pts, tags, live: (b, j, t, o) => {
    const gold = tags[j] === 'band' || tags[j] === 'victoria' || tags[j] === 'wreath';
    o[3] = gold ? glint(b[1], t, 3.6, 0.6, -0.4, 1.3) : plus ? chase(b[1], t, 0.3, 1.2, 0.85, 1.3) : 1;
    turn(o, t, 0, plus ? 0.35 : 0.4, 14);
  } };
}

export const WAHRZEICHEN_3D = { fernsehturm, rheinturm, tor, dom, elphi, schwebebahn, schluessel, skyline, siegessaeule };
