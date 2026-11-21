// Schrägansicht für die Standort- und Sicherheitszeichnung (LandingSite.astro), Runde 4 (18.11.2026).
// Marc: „isometric layer compositions that can each grow/animate into each other … much more cinematic“.
// Alles wird zur Build-Zeit projiziert (leicht perspektivische Kamera schräg von vorn links, ~30° Höhe). Die Zeichnung
// besteht aus übereinander gestaffelten Ebenen (Explosionsansicht). Jede Ebene ist eine SVG-Gruppe mit eigenem
// Versatz; beim Eintritt fahren die Ebenen aus der zusammengeschobenen Lage auseinander, danach heben die Drohnen als
// Raster ab und formen das Motiv. Die Szene ist schematisch, Maße stehen als Content in den Popovern.

type V3 = [number, number, number];
type P2 = [number, number];
export type Item =
  | { t: 'path'; d: string; cls: string }
  | { t: 'circle'; cx: number; cy: number; r: number; cls: string };
export type ZoneGroup = { zone: string | null; items: Item[] };
export type Layer = { key: string; from: number; groups: ZoneGroup[] };
export type Drone = { g: P2; l: P2; m: P2; c: string; k: number };
/** aside: Popover links neben der Nummer, damit es die eigene Zone nicht verdeckt (Publikum hüpft rechts davon) */
export type Spot = { zone: string; x: number; y: number; aside?: boolean };
export type Label = { text: string; x: number; y: number; zone: string; turn?: boolean };
/** Publikum (Runde 6): je Person Streuposition s und Platz im Publikumsbereich h, Form relativ zum eigenen Fußpunkt */
export type Person = { s: P2; h: P2; items: Item[]; k: number };
export type Crowd = { layer: string; hop: number; people: Person[] };
export type Scene = { vb: [number, number, number, number]; layers: Layer[]; drones: Drone[]; spots: Spot[]; labels: Label[]; gridZone: string; crowd: Crowd };

const r1 = (n: number) => Math.round(n * 10) / 10;
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };

/** Kamera: Azimut (Grad, negativ = von links), Höhenwinkel, Abstand. Liefert Projektion in Bildkoordinaten (y nach unten). */
function camera(target: V3, az: number, el: number, dist: number) {
  const a = az * Math.PI / 180, e = el * Math.PI / 180;
  const eye: V3 = [target[0] + dist * Math.sin(a) * Math.cos(e), target[1] - dist * Math.cos(a) * Math.cos(e), target[2] + dist * Math.sin(e)];
  const f = norm(sub(target, eye)), r = norm(cross(f, [0, 0, 1])), u = cross(r, f);
  let s = 1;
  const raw = (p: V3): P2 => { const d = sub(p, eye), z = dot(d, f); return [dot(d, r) * dist / z, -dot(d, u) * dist / z]; };
  const P = (p: V3, dy = 0): P2 => { const [x, y] = raw(p); return [x * s, y * s + dy]; };
  const depth = (p: V3) => dot(sub(p, eye), f);
  const fit = (pts: V3[], width: number) => { const xs = pts.map((p) => raw(p)[0]); s = width / (Math.max(...xs) - Math.min(...xs)); };
  return { P, depth, fit };
}

const poly = (pts: P2[]) => 'M' + pts.map((p) => `${r1(p[0])} ${r1(p[1])}`).join('L') + 'Z';
const line = (pts: P2[]) => 'M' + pts.map((p) => `${r1(p[0])} ${r1(p[1])}`).join('L');
/** Rechteck in der Ebene z (x0..x1, y0..y1) */
const rectZ = (x0: number, y0: number, x1: number, y1: number, z: number): V3[] => [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]];
/** Abgerundetes Vieleck in der Ebene z: Ecken als Bögen aus 4 Zwischenpunkten (für die weichen Zonen draußen) */
function roundedZ(pts: number[][], rad: number, z: number): V3[] {
  const out: V3[] = [];
  pts.forEach((p, i) => {
    const a = pts[(i + pts.length - 1) % pts.length], c = pts[(i + 1) % pts.length];
    const to = (q: number[]) => { const dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy), k = Math.min(rad, len / 2) / len; return [p[0] + dx * k, p[1] + dy * k]; };
    const s = to(a), e = to(c);
    for (let t = 0; t <= 4; t++) { const u = t / 4; out.push([(1 - u) ** 2 * s[0] + 2 * (1 - u) * u * p[0] + u * u * e[0], (1 - u) ** 2 * s[1] + 2 * (1 - u) * u * p[1] + u * u * e[1], z]); }
  });
  return out;
}

/** Herz als Umriss, gleichmäßig nach Bogenlänge abgetastet (Ebene x/z, Blick des Publikums von vorn) */
function heart(n: number, cx: number, y: number, cz: number, w: number, h: number, turn = 0): V3[] {
  const a = turn * Math.PI / 180;
  const dense = Array.from({ length: 600 }, (_, i) => { const t = i / 600 * Math.PI * 2; return [16 * Math.sin(t) ** 3, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)]; });
  const seg = dense.map((p, i) => Math.hypot(p[0] - dense[(i + 1) % 600][0], p[1] - dense[(i + 1) % 600][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  const out: V3[] = []; let acc = 0, j = 0;
  for (let i = 0; i < n; i++) { const goal = i / n * total; while (acc + seg[j] < goal) acc += seg[j++]; const p = dense[j]; const dx = p[0] / 32 * w; out.push([cx + dx * Math.cos(a), y + dx * Math.sin(a), cz + p[1] / 29 * h]); }
  return out;
}

/** Drohnen den Motivpunkten zuordnen: beide Mengen nach x sortiert, damit sich Bahnen kaum kreuzen */
function pair(start: V3[], motif: V3[]) {
  const s = start.map((p, i) => ({ p, i })).sort((a, b) => a.p[0] - b.p[0] || a.p[1] - b.p[1]);
  const m = [...motif].sort((a, b) => a[0] - b[0] || b[2] - a[2]);
  return s.map(({ p }, k) => ({ start: p, motif: m[k] }));
}

/** Wiederholbarer Zufall, damit Build und Screenshots stabil bleiben */
function random(seed: number) { return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const inside = (p: P2, poly2: P2[]) => { let c = false; for (let i = 0, j = poly2.length - 1; i < poly2.length; j = i++) { const [xi, yi] = poly2[i], [xj, yj] = poly2[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) c = !c; } return c; };
/** Streupositionen: Kandidaten im Gelände, die weder auf Sperrflächen liegen noch im Bild von höheren Ebenen verdeckt sind */
function scatter(n: number, seed: number, area: { x0: number; x1: number; y0: number; y1: number }, blocked: (q: V3) => boolean, toScreen: (q: V3) => P2, covered: P2[][]) {
  const rnd = random(seed), out: P2[] = [];
  for (let tries = 0; out.length < n && tries < 4000; tries++) {
    const q: V3 = [area.x0 + rnd() * (area.x1 - area.x0), area.y0 + rnd() * (area.y1 - area.y0), 0];
    const sp = toScreen(q);
    if (blocked(q) || covered.some((c) => inside(sp, c)) || out.some((o) => Math.hypot(o[0] - sp[0], o[1] - sp[1]) < 7)) continue;
    out.push([r1(sp[0]), r1(sp[1])]);
  }
  return out;
}

const pct = (p: P2, vb: number[]) => [r1((p[0] - vb[0]) / vb[2] * 1000) / 10, r1((p[1] - vb[1]) / vb[3] * 1000) / 10] as const;

function finish(layers: Layer[], drones: Drone[], spots: { zone: string; p: P2 }[], labels: { text: string; p: P2; zone: string; turn?: boolean }[], extra: P2[], gridZone: string, crowd: Crowd): Scene {
  // Bildausschnitt aus allen Punkten (inklusive Drohnen in allen Phasen), knapp gerahmt: so endet die Zeichnung an der
  // rechten Kante der Spalte und damit an der Content-Kante.
  const pts: P2[] = [...extra];
  layers.forEach((L) => L.groups.forEach((g) => g.items.forEach((it) => {
    if (it.t === 'circle') { pts.push([it.cx - it.r, it.cy - it.r], [it.cx + it.r, it.cy + it.r]); return; }
    if (/[AVh]/.test(it.d)) return; // Figuren und Maßlinien: Punktpaare nicht eindeutig, liegen ohnehin im Bild
    const nums = it.d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
  })));
  drones.forEach((d) => pts.push(d.g, d.l, d.m));
  crowd.people.forEach((q) => pts.push(q.s, q.h));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const pad = 6, x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad;
  const vb = [r1(x0), r1(y0), r1(Math.max(...xs) + pad - x0), r1(Math.max(...ys) + pad - y0)] as [number, number, number, number];
  return {
    vb, layers, drones, gridZone, crowd,
    spots: spots.map((s) => { const [x, y] = pct(s.p, vb); return { zone: s.zone, x, y, aside: s.zone === 'guests' }; }),
    labels: labels.map((l) => { const [x, y] = pct(l.p, vb); return { text: l.text, zone: l.zone, x, y, turn: l.turn }; }),
  };
}

/** Innenraum: Boden mit Startraster und Publikum, Flugvolumen als Glasquader, Decke darüber. */
export function indoorScene(o: { colors: string[]; vertical: string; horizontal: string }): Scene {
  const cam = camera([0, -1, 1.6], -36, 29, 52);
  const room = { x0: -8, x1: 8, y0: -9.5, y1: 7 }, fl = { x0: -5, x1: 5, y0: -4, y1: 6 }, H = 4.8, C = 5.6;
  cam.fit([...rectZ(room.x0, room.y0, room.x1, room.y1, 0), ...rectZ(room.x0, room.y0, room.x1, room.y1, C)], 400);
  // Explosionsabstände (Bildeinheiten): Boden sinkt, Decke steigt; das Flugvolumen bleibt stehen
  const F = 40, D = -64;
  const P = cam.P;
  const face = (pts: V3[], dy: number, cls: string): Item => ({ t: 'path', d: poly(pts.map((p) => P(p, dy))), cls });
  const edge = (a: V3, b: V3, dy: number, cls: string): Item => ({ t: 'path', d: line([P(a, dy), P(b, dy)]), cls });

  // Boden: Platte mit sichtbarer Vorder- und linker Kante, feines 2-m-Raster
  const T = 0.45;
  const floor: ZoneGroup = { zone: null, items: [
    face([[room.x0, room.y0, -T], [room.x1, room.y0, -T], [room.x1, room.y0, 0], [room.x0, room.y0, 0]], F, 'slab-side'),
    face([[room.x0, room.y0, -T], [room.x0, room.y1, -T], [room.x0, room.y1, 0], [room.x0, room.y0, 0]], F, 'slab-side'),
    face(rectZ(room.x0, room.y0, room.x1, room.y1, 0), F, 'slab'),
    ...Array.from({ length: 7 }, (_, i) => edge([room.x0 + 2 + i * 2, room.y0, 0], [room.x0 + 2 + i * 2, room.y1, 0], F, 'floor-line')),
    ...Array.from({ length: 7 }, (_, i) => edge([room.x0, room.y0 + 2.5 + i * 2, 0], [room.x1, room.y0 + 2.5 + i * 2, 0], F, 'floor-line')),
  ] };
  const footprint: ZoneGroup = { zone: 'drones', items: [face(rectZ(fl.x0, fl.y0, fl.x1, fl.y1, 0), F, 'footprint')] };
  const pad = { x0: -2.6, x1: 2.6, y0: -0.6, y1: 3.6 };
  const seeds: V3[] = Array.from({ length: 20 }, (_, i) => [-2 + (i % 5), 0 + Math.floor(i / 5), 0]);
  const start: ZoneGroup = { zone: 'floor', items: [
    face(rectZ(pad.x0, pad.y0, pad.x1, pad.y1, 0), F, 'pad'),
    ...seeds.map((s) => { const [x, y] = P(s, F); return { t: 'circle', cx: r1(x), cy: r1(y), r: 2.6, cls: 'seed-ring' } as Item; }),
  ] };
  const corners: V3[] = [[fl.x0, fl.y1, 0], [fl.x1, fl.y1, 0], [fl.x0, fl.y0, 0], [fl.x1, fl.y0, 0]];
  const antenna = (c: V3): Item[] => { const [bx, by] = P(c, F), [tx, ty] = P([c[0], c[1], 1.9], F); return [
    { t: 'path', d: line([[bx, by], [tx, ty]]), cls: 'mast' }, { t: 'circle', cx: r1(tx), cy: r1(ty), r: 5, cls: 'mast-glow' }, { t: 'circle', cx: r1(tx), cy: r1(ty), r: 2.2, cls: 'mast-tip' }]; };
  const kitBack: ZoneGroup = { zone: 'kit', items: corners.slice(0, 2).flatMap(antenna) };
  const kitFront: ZoneGroup = { zone: 'kit', items: corners.slice(2).flatMap(antenna) };
  // Publikum vorn, hinter einer gestrichelten Abstandslinie. Die Figuren stehen zuerst verstreut im Raum und laufen beim
  // Abheben der Drohnen zu ihren Plätzen; Form relativ zum Fußpunkt, damit eine Verschiebung die ganze Figur bewegt.
  const homes: { x: number; y: number }[] = [];
  for (const [row, y] of [[1, -7.7], [0, -6.3]] as const) for (let i = 0; i < 8; i++) homes.push({ x: -4.2 + i * 1.2 + (row ? 0.6 : 0), y });
  const figure = (x: number, y: number): { h: P2; items: Item[] } => {
    const [bx, by] = P([x, y, 0], F), [, ty] = P([x, y, 1.25], F), [hx, hy] = P([x, y, 1.6], F);
    const w = Math.hypot(...(([a, b]) => [a - bx, b - by])(P([x + 0.5, y, 0], F))), top = ty - by + w / 2;
    return { h: [r1(bx), r1(by)], items: [
      { t: 'path', d: `M${r1(-w / 2)} 0V${r1(top)}A${r1(w / 2)} ${r1(w / 2)} 0 0 1 ${r1(w / 2)} ${r1(top)}V0Z`, cls: 'person' },
      { t: 'circle', cx: r1(hx - bx), cy: r1(hy - by), r: r1(w * 0.36), cls: 'person-head' }] };
  };
  const strewn = scatter(homes.length, 7, { x0: room.x0 + 0.6, x1: room.x1 - 0.6, y0: room.y0 + 0.5, y1: room.y1 - 0.8 },
    ([x, y]) => (x > fl.x0 - 0.8 && x < fl.x1 + 0.8 && y > fl.y0 - 0.8) || y > fl.y1 - 1, (q) => P(q, F), []);
  const crowd: Crowd = { layer: 'floor', hop: 3, people: homes.map(({ x, y }, i) => ({ ...figure(x, y), s: strewn[i], k: (i * 7) % homes.length })) };
  const guests: ZoneGroup = { zone: 'guests', items: [edge([fl.x0 - 0.5, -5, 0], [fl.x1 + 0.5, -5, 0], F, 'keepout')] };

  // Flugvolumen: hintere Flächen und Kanten gedämpft, vordere als Glas
  const box = (x0: number, y0: number, x1: number, y1: number, z0: number, z1: number) => ({
    bottom: rectZ(x0, y0, x1, y1, z0), top: rectZ(x0, y0, x1, y1, z1),
    back: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]] as V3[], right: [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]] as V3[],
    front: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]] as V3[], left: [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]] as V3[],
  });
  const v = box(fl.x0, fl.y0, fl.x1, fl.y1, 0, H);
  const hidden: [V3, V3][] = [[[fl.x1, fl.y1, 0], [fl.x0, fl.y1, 0]], [[fl.x1, fl.y1, 0], [fl.x1, fl.y0, 0]], [[fl.x1, fl.y1, 0], [fl.x1, fl.y1, H]]];
  const shown: [V3, V3][] = [
    [[fl.x0, fl.y0, 0], [fl.x1, fl.y0, 0]], [[fl.x0, fl.y0, 0], [fl.x0, fl.y1, 0]], [[fl.x0, fl.y0, 0], [fl.x0, fl.y0, H]], [[fl.x1, fl.y0, 0], [fl.x1, fl.y0, H]], [[fl.x0, fl.y1, 0], [fl.x0, fl.y1, H]],
    [[fl.x0, fl.y0, H], [fl.x1, fl.y0, H]], [[fl.x1, fl.y0, H], [fl.x1, fl.y1, H]], [[fl.x1, fl.y1, H], [fl.x0, fl.y1, H]], [[fl.x0, fl.y1, H], [fl.x0, fl.y0, H]]];
  const volBack: ZoneGroup = { zone: 'drones', items: [face(v.bottom, 0, 'glass-floor'), face(v.back, 0, 'glass-back'), face(v.right, 0, 'glass-back'), ...hidden.map(([a, b]) => edge(a, b, 0, 'glass-hidden'))] };
  const volFront: ZoneGroup = { zone: 'drones', items: [face(v.front, 0, 'glass'), face(v.left, 0, 'glass'), face(v.top, 0, 'glass-top'), ...shown.map(([a, b]) => edge(a, b, 0, 'glass-edge'))] };
  // Führungslinien der Explosionsansicht: von den Antennen hoch zu den Ecken des Volumens
  const guides: ZoneGroup = { zone: null, items: corners.map((c) => ({ t: 'path', d: line([P([c[0], c[1], 1.9], F), P(c, 0)]), cls: 'guide' }) as Item) };

  // Decke: dünne Platte über dem Flugvolumen (etwas größer), schraffierte Kanten. Raumgroß würde sie das Motiv verdecken.
  const CT = 0.35, ce = { x0: fl.x0 - 1.5, x1: fl.x1 + 1.5, y0: fl.y0 - 1.5, y1: fl.y1 + 1 };
  const ceil: ZoneGroup = { zone: 'ceiling', items: [
    face([[ce.x0, ce.y0, C], [ce.x1, ce.y0, C], [ce.x1, ce.y0, C + CT], [ce.x0, ce.y0, C + CT]], D, 'ceil-side'),
    face([[ce.x0, ce.y0, C], [ce.x0, ce.y1, C], [ce.x0, ce.y1, C + CT], [ce.x0, ce.y0, C + CT]], D, 'ceil-side'),
    face(rectZ(ce.x0, ce.y0, ce.x1, ce.y1, C + CT), D, 'ceil'),
    ...Array.from({ length: 19 }, (_, i) => { const x = ce.x0 + 0.35 + i * 0.7; return edge([x, ce.y0, C + CT], [x - 0.35, ce.y0, C], D, 'hatch'); }),
    ...Array.from({ length: 18 }, (_, i) => { const y = ce.y0 + 0.35 + i * 0.72; return edge([ce.x0, y, C + CT], [ce.x0, y - 0.35, C], D, 'hatch'); }),
  ] };
  // Raumhöhe: Maßlinie hinten links vom Boden bis unter die Decke (mit beiden Versätzen)
  const dimA = P([ce.x0, ce.y1, 0], F), dimB = P([ce.x0, ce.y1, C], D);
  const dims: ZoneGroup = { zone: 'ceiling', items: [{ t: 'path', d: `${line([dimA, dimB])}M${r1(dimA[0] - 5)} ${r1(dimA[1])}h10M${r1(dimB[0] - 5)} ${r1(dimB[1])}h10`, cls: 'dim' }] };

  const motif = heart(20, 0, 1, 2.55, 6.6, 4.1, -24); // zur Kamera gedreht, damit das Herz lesbar bleibt
  const drones: Drone[] = pair(seeds, motif).map(({ start, motif: m }, k) => ({
    g: P([start[0], start[1], 0.15], F), l: P([start[0], start[1], 1.9], 0), m: P(m, 0),
    c: o.colors[Math.max(0, Math.min(o.colors.length - 1, Math.round((m[0] + 3) / 6 * (o.colors.length - 1))))], k,
  })).map((d) => ({ ...d, g: [r1(d.g[0]), r1(d.g[1])] as P2, l: [r1(d.l[0]), r1(d.l[1])] as P2, m: [r1(d.m[0]), r1(d.m[1])] as P2 }));

  const layers: Layer[] = [
    { key: 'floor', from: -F, groups: [floor, footprint, start, kitBack, guests] },
    { key: 'vol-back', from: 0, groups: [volBack] },
    { key: 'guides', from: 0, groups: [guides] },
    { key: 'drones', from: 0, groups: [] },
    { key: 'vol-front', from: 0, groups: [volFront] },
    { key: 'kit-front', from: -F, groups: [kitFront] },
    { key: 'ceiling', from: -D, groups: [ceil] },
    { key: 'dims', from: 0, groups: [dims] },
  ];
  const spots = [
    { zone: 'ceiling', p: P([ce.x1, ce.y0, C + CT], D) },
    { zone: 'drones', p: P([fl.x1, fl.y0, H], 0) },
    { zone: 'floor', p: P([pad.x1 + 0.3, pad.y0, 0], F) },
    { zone: 'kit', p: P([fl.x1, fl.y0, 1.9], F) },
    { zone: 'guests', p: P([-6.2, -6.6, 1.7], F) },
  ].map((s) => ({ zone: s.zone, p: [s.p[0], s.p[1]] as P2 }));
  const mid = (a: P2, b: P2): P2 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const labels = [
    { text: o.vertical, zone: 'ceiling', p: mid(dimA, dimB), turn: true },
    { text: o.horizontal, zone: 'floor', p: (([x, y]) => [x, y + 12] as P2)(mid(P([pad.x0, pad.y0, 0], F), P([pad.x1, pad.y0, 0], F))) },
  ];
  return finish(layers, drones, spots, labels, [], 'floor', crowd);
}

/** Draußen: Lageplan als Grund (Häuser, Park, Straße), darüber die Zonen als gestaffelte Platten, Drohnenlinie am Himmel. */
/** motif (additiv, Labor Blogbilder 21.11.2026): 'heart' formt am Himmel ein Herz statt der Drohnenlinie; ohne Angabe wie bisher. */
export function outdoorScene(o: { colors: string[]; horizontal: string; detail: string; motif?: 'line' | 'heart' }): Scene {
  const cam = camera([0, -4, 8], -36, 29, 560);
  // Lageplan-Koordinaten der bisherigen Draufsicht (0–400) in Meter umgerechnet: 0,5 m je Einheit, Mitte bei (204, 172)
  const W = (pts: number[][]) => pts.map(([x, y]) => [(x - 204) * 0.5, (172 - y) * 0.5]);
  const outer = W([[70, 86], [146, 50], [264, 54], [330, 104], [338, 214], [288, 286], [146, 294], [78, 240]]);
  const operative = W([[92, 100], [152, 72], [258, 76], [312, 116], [318, 206], [276, 266], [154, 272], [98, 228]]);
  const flight = W([[114, 116], [160, 94], [250, 98], [292, 130], [296, 198], [262, 246], [162, 252], [118, 212]]);
  const ground = { x0: -94, x1: 90, y0: -101, y1: 80 };
  cam.fit(rectZ(ground.x0, ground.y0, ground.x1, ground.y1, 0), 400);
  const P = cam.P;
  // Explosionsabstände je Platte (Bildeinheiten)
  const S = [0, -20, -40, -60];
  const face = (pts: V3[], dy: number, cls: string): Item => ({ t: 'path', d: poly(pts.map((p) => P(p, dy))), cls });
  const edge = (a: V3, b: V3, dy: number, cls: string): Item => ({ t: 'path', d: line([P(a, dy), P(b, dy)]), cls });
  const plate = (pts: number[][], rad: number, dy: number, cls: string, thick: number): Item[] => {
    const top = roundedZ(pts, rad, 0);
    // Plattenkante: die zur Kamera gewandte Hälfte als Band, als Silhouette aus Ober- und Unterkante
    const bottom = top.map((p) => P(p, dy + thick)), up = top.map((p) => P(p, dy));
    return [{ t: 'path', d: poly(bottom), cls: cls + '-edge' }, { t: 'path', d: poly(up), cls }];
  };
  // Grund: Straße, Häuser als Blöcke, Park mit Bäumen
  const g = 0.9; // Umgebung etwas näher an die Zonen, damit die Platten das Bild tragen
  const blocks0 = [[-104, 66, -78, 84, 9], [-66, 68, -32, 86, 12], [-24, 72, 2, 86, 7], [44, 66, 70, 84, 14], [80, 30, 96, 60, 10], [80, -6, 96, 30, 8], [80, -42, 96, -14, 11], [80, -84, 96, -50, 9],
    [-100, -106, -74, -88, 8], [52, -108, 76, -92, 10], [-30, -110, 4, -96, 7], [10, -110, 40, -96, 9]];
  const blocks = blocks0.map(([x0, y0, x1, y1, h]) => [x0 * g, y0 * g, x1 * g, y1 * g, h]);
  const blockItems = (b: number[]) => { const [x0, y0, x1, y1, h] = b; return [
    face([[x0, y0, 0], [x1, y0, 0], [x1, y0, h], [x0, y0, h]], 0, 'house-front'),
    face([[x0, y0, 0], [x0, y1, 0], [x0, y1, h], [x0, y0, h]], 0, 'house-side'),
    face(rectZ(x0, y0, x1, y1, h), 0, 'house-top')]; };
  const houses = [...blocks].sort((a, b) => cam.depth([(b[0] + b[2]) / 2, (b[1] + b[3]) / 2, 0]) - cam.depth([(a[0] + a[2]) / 2, (a[1] + a[3]) / 2, 0]));
  const trees = [[-94, 30], [-86, 14], [-96, -2], [-86, -18], [-95, -34], [-87, -50]].map(([x, y]) => [x * g, y * g]);
  const base: ZoneGroup = { zone: null, items: [
    face(rectZ(ground.x0, ground.y0, ground.x1, ground.y1, 0), 0, 'ground'),
    face(rectZ(74 * g, ground.y0, 78 * g, ground.y1, 0), 0, 'road'), face(rectZ(ground.x0, -90 * g, 74 * g, -86 * g, 0), 0, 'road'),
    face(rectZ(-102 * g, -60 * g, -78 * g, 40 * g, 0), 0, 'park'),
    ...houses.filter((b) => b[1] > -80 * g).flatMap(blockItems),
    ...trees.flatMap(([x, y]) => { const [cx, cy] = P([x, y, 4]); return [{ t: 'circle', cx: r1(cx), cy: r1(cy), r: 5.5, cls: 'tree' } as Item]; }),
  ] };
  const frontHouses: ZoneGroup = { zone: null, items: houses.filter((b) => b[1] <= -80 * g).flatMap(blockItems) };
  // Publikum vor dem äußeren Bereich, Blickpfeil zur Show
  const gq = { x0: -32, x1: 35, y0: -81, y1: -68 };
  const guests: ZoneGroup = { zone: 'guests', items: [...plate([[gq.x0, gq.y0], [gq.x1, gq.y0], [gq.x1, gq.y1], [gq.x0, gq.y1]], 3, 0, 'zplate', 3), edge([2, -66, 0], [2, -56, 0], 0, 'view')] };
  const safety: ZoneGroup = { zone: 'safety', items: plate(outer, 15, S[1], 'zplate', 4) };
  // Publikum: Punkte stehen zuerst verstreut in der Stadt (nicht auf Häusern, nicht unter den höheren Platten) und sammeln
  // sich beim Abheben der Drohnen auf der Publikumsfläche; Plätze leicht versetzt wie eine echte Menge.
  const rnd = random(11), cols = 12, rows = 2;
  const homesOut: P2[] = Array.from({ length: cols * rows }, (_, i) => { const c = i % cols, r = Math.floor(i / cols); const p = P([gq.x0 + 4 + c * (gq.x1 - gq.x0 - 8) / (cols - 1) + (rnd() - 0.5) * 2.4, gq.y0 + 3.6 + r * 5.4 + (rnd() - 0.5) * 2, 1.5]); return [r1(p[0]), r1(p[1])]; });
  const projected = (pts: number[][], rad: number, dy: number) => roundedZ(pts, rad, 0).map((q) => P(q, dy));
  const coverOut = [projected(outer, 15, S[1]), projected(operative, 12, S[2]), projected(flight, 9, S[3]),
    ...blocks.filter((b) => b[1] <= -80 * g).map(([x0, y0, x1, y1, h]) => [P([x0, y0, 0]), P([x1, y0, 0]), P([x1, y0, h]), P([x1, y1, h]), P([x0, y1, h]), P([x0, y0, h])])];
  const onHouse = ([x, y]: V3) => blocks.some(([x0, y0, x1, y1]) => x > x0 - 2 && x < x1 + 2 && y > y0 - 2 && y < y1 + 2);
  const onGuests = ([x, y]: V3) => x > gq.x0 - 4 && x < gq.x1 + 4 && y > gq.y0 - 4 && y < gq.y1 + 4;
  const strewnOut = scatter(homesOut.length, 5, { x0: ground.x0 + 4, x1: ground.x1 - 4, y0: ground.y0 + 4, y1: ground.y1 - 4 }, (q) => onHouse(q) || onGuests(q), (q) => P([q[0], q[1], 1.5]), coverOut);
  const crowd: Crowd = { layer: 'ground', hop: 2.2, people: homesOut.map((h, i) => ({ h, s: strewnOut[i], k: (i * 7) % homesOut.length, items: [{ t: 'circle', cx: 0, cy: 0, r: 1.5, cls: 'guest-dot' }] })) };
  const oper: ZoneGroup = { zone: 'operative', items: plate(operative, 12, S[2], 'zplate', 4) };
  const fly: ZoneGroup = { zone: 'drones', items: plate(flight, 9, S[3], 'zplate', 4) };
  // Startfläche auf der Flugplatte; Drohnenlinie quer zur Blickrichtung am Himmel
  const sp = { x0: -36, x1: -16, y0: 18.5, y1: 27 };
  const seeds: V3[] = Array.from({ length: 21 }, (_, i) => [sp.x0 + 2.4 + (i % 7) * 2.5, sp.y0 + 1.8 + Math.floor(i / 7) * 2.4, 0]);
  const start: ZoneGroup = { zone: 'start', items: [...plate([[sp.x0, sp.y0], [sp.x1, sp.y0], [sp.x1, sp.y1], [sp.x0, sp.y1]], 2, S[3], 'pad', 2)] };
  const line60 = Array.from({ length: 21 }, (_, i): V3 => { const u = i / 20; return [-30 + u * 60, 2, 22 + Math.sin(u * Math.PI) * 7]; });
  const sky = o.motif === 'heart' ? heart(seeds.length, 0, 2, 25, 46, 24, -24) : line60;
  const drones: Drone[] = pair(seeds, sky).map(({ start: s, motif: m }, k) => ({
    g: P([s[0], s[1], 0.6], S[3]), l: P([s[0], s[1], 14], S[3]), m: P(m, S[3]),
    c: o.colors[Math.round((m[0] + 30) / 60 * (o.colors.length - 1))], k,
  })).map((d) => ({ ...d, g: [r1(d.g[0]), r1(d.g[1])] as P2, l: [r1(d.l[0]), r1(d.l[1])] as P2, m: [r1(d.m[0]), r1(d.m[1])] as P2 }));
  // Führungslinien zwischen den Platten (Explosionsansicht)
  const gp: V3[] = [[outer[0][0], outer[0][1], 0], [outer[3][0], outer[3][1], 0], [outer[6][0], outer[6][1], 0]];
  const guides: ZoneGroup = { zone: null, items: gp.map((p) => ({ t: 'path', d: line([P(p, 0), P(p, S[1])]), cls: 'guide' }) as Item) };
  const altitude: ZoneGroup = { zone: null, items: [{ t: 'path', d: line([P([0, 2, 0], S[3]), P([0, 2, 26], S[3])]), cls: 'guide' }] };
  const layers: Layer[] = [
    { key: 'ground', from: 0, groups: [base, guests] },
    { key: 'guides', from: 0, groups: [guides] },
    { key: 'p1', from: -S[1], groups: [safety] },
    { key: 'p2', from: -S[2], groups: [oper] },
    { key: 'p3', from: -S[3], groups: [fly, start, altitude] },
    { key: 'drones', from: 0, groups: [] },
    { key: 'front', from: 0, groups: [frontHouses] },
  ];
  const at = (pts: number[][], i: number, dy: number, dz = 0): P2 => P([pts[i][0], pts[i][1], dz], dy);
  const spots = [
    { zone: 'safety', p: at(outer, 5, S[1]) },
    { zone: 'operative', p: at(operative, 4, S[2]) },
    { zone: 'drones', p: (([x, y]) => [x + 12, y] as P2)(P([30, 2, 22], S[3])) },
    { zone: 'start', p: P([sp.x1 + 3, sp.y0, 0], S[3]) },
    { zone: 'guests', p: P([gq.x0 - 11, gq.y1, 0], 0) },
  ];
  const labels = [
    { text: o.horizontal, zone: 'safety', p: (([x, y]) => [x - 8, y + 12] as P2)(P([(outer[6][0] + outer[7][0]) / 2, (outer[6][1] + outer[7][1]) / 2, 0], S[1])) },
    { text: o.detail, zone: 'drones', p: (([x, y]) => [x, y - 16] as P2)(P([0, 2, 29], S[3])) },
  ];
  return finish(layers, drones, spots, labels, [], 'start', crowd);
}
