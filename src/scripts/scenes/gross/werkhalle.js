import { t as message } from '../../../i18n/ui.mjs';
// Werkhalle wird Zukunftscampus (Runde 11, große Motive, Anlass Jubiläum). Kandidat FSK-049 der Motiv-Shortlist
// (freelance/clients/flyingstars/25-motiv-shortlist-2026-11-20), Referenz „Abstract skyscrapers as wave forms · 1200“.
// Runde 11c (Marc 21.11.2026: „bei 3D+ sehr underwhelmed. Feels like very poor use of 1000 drones“): neu gedacht, nicht
// nachgebessert. Zwei Ansätze als Kontaktbogen (die alte Halle in voller Tiefe, deren Maschinen durchs Dach zu Türmen
// wachsen; Rauch wird Licht wird Campus), der zweite war deutlich stärker und ist dieser hier.
// Das Bild, das erst viele Drohnen erlauben: dieselben Hunderte Drohnen sind erst eine Rauchfahne über der alten Fabrik,
// dann ein Lichtstrom aus drei verdrillten Strängen, der aus dem Werktor über die Straße und um den Platz fließt, und
// zuletzt die Neubauten, die sich Haus für Haus aus dem Strom erheben (der Abschnitt vor einem Bauplatz steigt auf und
// wird das Haus, von unten nach oben). Lesbar an der alten Halle mit Sheddach und Schornstein, einem Glasturm mit
// Geschossen, einem Neubau mit Wellendach, einem schlanken zweiten Turm und einem Würfel mit Bäumen auf dem Dach. Nur
// Kanten. Die größte Rauchwolke bleibt am Himmel; im Höhepunkt steigt sie, wird weit und legt sich als goldener Kranz über
// den Campus, während eine Lichtwelle vom Tor aus Geschoss für Geschoss über alle Häuser läuft und der Campus im Takt
// aufblitzt.
//
//   factoryCampus3d (3D): der fertige Campus; ein kleinerer Lichtstrom kreist um den Platz, die Geschosse gehen
//     nacheinander an, der Schornstein ist ein Leuchtfeuer, die Ansicht schwenkt.
//   factoryCampusStory (3D+): vier Akte. Die alte Werkhalle raucht → der Rauch wird Licht und strömt aus dem Tor → der Strom
//     baut Haus für Haus → Höhepunkt: Kranz, Lichtwelle, Takt.
// Wächter: scripts/werkhalle.test.mjs.
import { TAU, GOLD, WARM, ORANGE, RED, CYAN, DIAMOND, BLUE, GREEN, VIOLET, mix, smooth, yaw, pitch, part, act, sparkle, share } from '../../show-motion.js';
import { curves, spot, assemble } from '../catalog-3d/kit.js';

const lerp = (a, b, u) => a + (b - a) * u;
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));
const PITCH = 0.26;

// ---------------------------------------------------------------------------------------------------------------------
// Bauplan (Boden y = 0, z zum Publikum)
// ---------------------------------------------------------------------------------------------------------------------
const HALL = { x0: -1.78, x1: -0.66, z0: -0.6, z1: 0.0, wall: 0.32, peak: 0.6, teeth: 4 };
const CH = { x: -1.98, z: -0.42, h: 1.55, r0: 0.085, r1: 0.055 };
const GATE = { x: -1.12, w: 0.1, h: 0.18 };
/** Neubauten in der Reihenfolge, in der der Strom sie baut (vom Tor weg die Straße entlang, zuletzt der Würfel im Platz). */
const BUILDINGS = [
  { id: 'turm', x0: -0.42, x1: -0.02, z0: -0.82, z1: -0.42, h: 1.55, floors: 6 },
  { id: 'welle', x0: 0.2, x1: 1.25, z0: -0.52, z1: -0.2, h: 0.34, amp: 0.1 },
  { id: 'turm2', x0: 1.34, x1: 1.66, z0: -0.66, z1: -0.34, h: 1.12, floors: 4 },
  { id: 'wuerfel', x0: 0.18, x1: 0.7, z0: 0.42, z1: 0.82, h: 0.52 },
];
/** Straße vom Werktor durch den Campus und als Schleife um den Platz mit dem Würfel. */
const PATH = [[GATE.x, 0.08], [-0.65, 0.2], [-0.1, 0.12], [0.6, 0.06], [1.3, 0.08], [1.72, 0.3], [1.55, 0.78], [1.0, 1.08], [0.3, 1.1], [-0.25, 0.92], [-0.42, 0.62]];
const rect = (x0, x1, y, z0, z1) => ({ pts: [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], closed: true });
const box = (b) => [rect(b.x0, b.x1, 0, b.z0, b.z1), rect(b.x0, b.x1, b.h, b.z0, b.z1), ...[[b.x0, b.z0], [b.x1, b.z0], [b.x1, b.z1], [b.x0, b.z1]].map(([x, z]) => [[x, 0, z], [x, b.h, z]])];

function oldParts() {
  const { x0, x1, z0, z1, wall, peak, teeth } = HALL, w = (x1 - x0) / teeth;
  // Sheddach: je Zahn eine flache Dachfläche, die zur steilen Glasfläche ansteigt
  const prof = (z) => { const p = [[x0, 0, z], [x0, wall, z]]; for (let i = 0; i < teeth; i++) { const a = x0 + i * w; p.push([a + w * 0.82, peak, z], [a + w * 0.82, wall, z]); } p.push([x1, wall, z], [x1, 0, z]); return p; };
  const ridges = Array.from({ length: teeth }, (_, i) => { const x = x0 + i * w + w * 0.82; return [[x, peak, z0], [x, peak, z1]]; });
  const arch = Array.from({ length: 13 }, (_, i) => { const a = Math.PI * (1 - i / 12); return [GATE.x + GATE.w * Math.cos(a), GATE.h + GATE.w * Math.sin(a), z1]; });
  const { x, z, h, r0, r1 } = CH, ring = (y, r, k = 16) => ({ pts: Array.from({ length: k }, (_, i) => { const a = (i / k) * TAU; return [x + r * Math.cos(a), y, z + r * Math.sin(a)]; }), closed: true });
  return [
    curves('halle', [prof(z1), prof(z0), [[x0, 0, z0], [x0, 0, z1]], [[x1, 0, z0], [x1, 0, z1]], [[x0, wall, z0], [x0, wall, z1]], [[x1, wall, z0], [x1, wall, z1]], ...ridges], { w: 1 }),
    curves('tor', [[[GATE.x - GATE.w, 0, z1], ...arch, [GATE.x + GATE.w, 0, z1]]], { w: 1.2 }),
    curves('schlot', [[[x - r0, 0, z], [x - r1, h, z]], [[x + r0, 0, z], [x + r1, h, z]], ring(h * 0.55, lerp(r0, r1, 0.55), 12)], { w: 1 }),
    curves('feuer', [ring(h, r1 + 0.012, 14)], { w: 1.3 }),
    curves('strasse', [CURVE.pts.filter((_, i) => i % 3 === 0).map(([px, pz]) => [px, 0, pz])], { w: 0.8 }),
  ];
}
function buildingParts(b) {
  if (b.id === 'welle') {
    const wy = (x) => b.h + b.amp * Math.sin(((x - b.x0) / (b.x1 - b.x0)) * TAU * 1.5), roof = (z) => Array.from({ length: 41 }, (_, i) => { const x = lerp(b.x0, b.x1, i / 40); return [x, wy(x), z]; });
    return [curves('welle', [roof(b.z1), roof(b.z0), [[b.x0, 0, b.z1], [b.x1, 0, b.z1]], [[b.x0, 0, b.z0], [b.x1, 0, b.z0]], ...[b.x0, b.x1].flatMap((x) => [[[x, 0, b.z0], [x, wy(x), b.z0]], [[x, 0, b.z1], [x, wy(x), b.z1]], [[x, wy(x), b.z0], [x, wy(x), b.z1]]])])];
  }
  const parts = [curves(b.id, box(b))];
  if (b.floors) parts.push(curves('geschoss', Array.from({ length: b.floors - 1 }, (_, k) => rect(b.x0, b.x1, (b.h * (k + 1)) / b.floors, b.z0, b.z1)), { w: 0.9 }));
  if (b.id === 'wuerfel') for (const [x, z] of [[0.32, 0.54], [0.55, 0.7], [0.57, 0.5]]) parts.push(spot('baum', [x, b.h + 0.07, z], 6, 0.05, [0, 1, 0.3]));
  return parts;
}
const linesLen = (parts) => parts.reduce((s, q) => s + (q.lines ? q.lines.reduce((a, l) => { const p = l.closed ? [...l.pts, l.pts[0]] : l.pts; let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1], p[i][2] - p[i - 1][2]); return a + L; }, 0) * (q.w ?? 1) : 0.3), 0);

/** Rauch: Kringel, die vom Schornstein nach rechts treiben, in drei Tiefen (gleich tiefe Kringel berühren sich nicht). */
const PUFFS = Array.from({ length: 11 }, (_, i) => ({ c: [CH.x + 0.16 + 0.33 * i, CH.h + 0.14 + 0.07 * i - 0.002 * i * i, CH.z + [-0.24, 0.08, 0.4][i % 3]], r: 0.075 + 0.036 * i }));
const KRANZ = PUFFS.length - 1; // die letzte, größte Wolke wird im Höhepunkt der Kranz

// Lichtstrom: drei Stränge als Wendel um die Straße. Die Straße wird als glatte Kurve (Catmull-Rom) abgetastet: an einem
// Knick sprängen die Stränge um, und Nachbarn fielen aufeinander.
const CURVE = (() => {
  const out = [];
  for (let i = 0; i < PATH.length - 1; i++) {
    const p0 = PATH[Math.max(0, i - 1)], p1 = PATH[i], p2 = PATH[i + 1], p3 = PATH[Math.min(PATH.length - 1, i + 2)];
    for (let q = 0; q < 24; q++) { const u = q / 24, u2 = u * u, u3 = u2 * u; out.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * u + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * u2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * u3))); }
  }
  out.push(PATH[PATH.length - 1]);
  const cum = [0]; for (let i = 1; i < out.length; i++) cum.push(cum[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
  return { pts: out, cum, L: cum[cum.length - 1] };
})();
const pathLen = CURVE.L;
function pathAt(u) {
  const d = Math.max(0, Math.min(1, u)) * CURVE.L, { pts, cum } = CURVE;
  let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= d) lo = mid; else hi = mid; }
  const a = pts[lo], b = pts[hi], L = cum[hi] - cum[lo] || 1, w = (d - cum[lo]) / L;
  return [lerp(a[0], b[0], w), lerp(a[1], b[1], w), (b[0] - a[0]) / L, (b[1] - a[1]) / L];
}
const STREAM = { strands: 3, y: 0.2, r: 0.1, twist: 34 };
const LOOP3D = 0.5; // in 3D fließt der Strom nur auf der Schleife um den Platz (dichter, ein klarer Ring aus Licht)
function streamAt(k, u, phi, out) {
  const [px, pz, tx, tz] = pathAt(u), a = phi + (k / STREAM.strands) * TAU + u * STREAM.twist;
  out[0] = px - tz * STREAM.r * Math.cos(a); out[1] = STREAM.y + STREAM.r * Math.sin(a); out[2] = pz + tx * STREAM.r * Math.cos(a);
  return out;
}

/** Zuordnung mit kleinster Summe der quadrierten Wege (ungarische Methode, O(n³)): bei gleichzeitigen geraden Flügen
 * kreuzen sich die Bahnen dann nicht (zyklische Monotonie). Liefert für jede Quelle i das Ziel. */
function assign(src, dst) {
  const n = src.length, INF = 1e18, u = new Float64Array(n + 1), v = new Float64Array(n + 1), p = new Int32Array(n + 1), way = new Int32Array(n + 1);
  const cost = (i, j) => { const a = src[i], b = dst[j]; return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2; };
  for (let i = 1; i <= n; i++) {
    p[0] = i; let j0 = 0; const minv = new Float64Array(n + 1).fill(INF), used = new Uint8Array(n + 1);
    do {
      used[j0] = 1; const i0 = p[j0]; let delta = INF, j1 = 0;
      for (let j = 1; j <= n; j++) if (!used[j]) { const cur = cost(i0 - 1, j - 1) - u[i0] - v[j]; if (cur < minv[j]) { minv[j] = cur; way[j] = j0; } if (minv[j] < delta) { delta = minv[j]; j1 = j; } }
      for (let j = 0; j <= n; j++) if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const out = new Int32Array(n); for (let j = 1; j <= n; j++) out[p[j] - 1] = j - 1;
  return out;
}

/**
 * Das Modell: alt (Halle, Tor, Schornstein, Straße) | neu (Drohnen der Neubauten, je mit Endlage, Höhe, Stromstelle und
 * Rauchstelle) | Kranz (die letzte Wolke). Ohne story kein Kranz, dafür ein kleiner Strom, der in 3D um den Platz kreist.
 */
export function campusModel(n, story = true) {
  const old = oldParts(), bParts = BUILDINGS.map(buildingParts);
  const extra = story ? TAU * PUFFS[KRANZ].r * 0.9 : (1 - LOOP3D) * pathLen * STREAM.strands * 0.85; // Kranz oder Strom um den Platz
  const [nf, nb, nk] = share(n, [linesLen(old), bParts.reduce((s, p) => s + linesLen(p), 0) * 1.05, extra]);
  const F = assemble(old, nf), bc = share(nb, bParts.map(linesLen)), BB = bParts.map((p, i) => assemble(p, bc[i]));
  // Neubau-Drohnen: jedes Haus bekommt einen Abschnitt des Stroms (in Baureihenfolge, vorn im Strom = erstes Haus); jeder
  // Strang trägt einen Winkelsektor des Hauses
  const slots = [];
  const counts = BB.map((g) => g.pts.length), NB = counts.reduce((a, b) => a + b, 0);
  let acc = 0;
  BB.forEach((g, bi) => {
    const b = BUILDINGS[bi], cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, u0 = 0.03 + (0.95 * acc) / NB, u1 = 0.03 + (0.95 * (acc + counts[bi])) / NB;
    const lanes = Array.from({ length: STREAM.strands }, () => []);
    g.pts.forEach((p, j) => { const th = (Math.atan2(p[2] - cz, p[0] - cx) + TAU) % TAU, k = Math.min(STREAM.strands - 1, Math.floor((th / TAU) * STREAM.strands)); lanes[k].push({ bi, p, tag: g.tags[j], h: p[1] / b.h, th }); });
    lanes.forEach((L, k) => L.forEach((s, q) => { s.k = k; s.u = lerp(u0, u1, (q + 0.5) / Math.max(1, L.length)); }));
    // welche Stromstelle welches Hausteil wird: kleinste Wege von der Lage im Strom (zur Bauzeit) zum Platz im Haus
    const mine = lanes.flat(), at = mine.map((s) => streamAt(s.k, s.u, 0, [0, 0, 0])), goal = mine.map((s) => [s.p, s.tag, s.h]);
    const to = assign(at, goal.map((g) => g[0]));
    mine.forEach((s, i) => { [s.p, s.tag, s.h] = goal[to[i]]; slots.push(s); });
    acc += counts[bi];
  });
  // Rauch: dieselben Drohnen in den Kringeln, nahe am Schornstein = vorn im Strom; der Platz im Kringel nach kleinsten Wegen
  const byU = [...slots].sort((a, c) => a.u - c.u), pc = share(NB, PUFFS.slice(0, KRANZ).map((q) => q.r));
  let i0 = 0;
  pc.forEach((c, pi) => {
    const chunk = byU.slice(i0, i0 + c); i0 += c;
    const P = PUFFS[pi], ring = Array.from({ length: c }, (_, q) => { const a = (q / c) * TAU + pi; return [P.c[0] + P.r * Math.cos(a), P.c[1] + P.r * Math.sin(a), P.c[2], a]; });
    const to = assign(chunk.map((s) => streamAt(s.k, s.u, 0, [0, 0, 0])), ring);
    chunk.forEach((s, i) => { s.puff = [pi, ring[to[i]][3]]; });
  });
  const extraSlots = Array.from({ length: nk }, (_, q) => (story ? { a: (q / nk) * TAU } : { k: q % STREAM.strands, u: LOOP3D + (0.995 - LOOP3D) * (Math.floor(q / STREAM.strands) / Math.max(1, Math.ceil(nk / STREAM.strands) - 1)) }));
  return { F, slots, extra: extraSlots, NF: F.pts.length, NB, story };
}

// ---------------------------------------------------------------------------------------------------------------------
// Farben und Licht
// ---------------------------------------------------------------------------------------------------------------------
const OLD = { halle: mix(ORANGE, RED, 0.3), tor: GOLD, schlot: mix(ORANGE, RED, 0.45), feuer: GOLD, strasse: mix(GOLD, WARM, 0.5) };
const SMOKE = mix(DIAMOND, VIOLET, 0.3), STREAMC = mix(GOLD, WARM, 0.35);
const houseColour = (s) => (s.tag === 'baum' ? GREEN : s.bi === 1 ? mix(VIOLET, BLUE, 0.3) : s.bi === 3 ? mix(WARM, DIAMOND, 0.3) : mix(CYAN, DIAMOND, 0.4));
const floorOf = (s) => Math.round(s.h * (BUILDINGS[s.bi].floors ?? 2));
/** Teile: die alte Fabrik, je Neubau ein Teil (in 3D+ hebt sich Haus für Haus; ein gemeinsamer Teil ließe die stehenden
 * Häuser gegen den Schwerpunkt zurücklaufen), Kranz bzw. Strom. Die Drohnen eines Hauses liegen zusammenhängend. */
function groupsOf(m, pts) {
  const out = [part('alt', pts.slice(0, m.NF), { rigid: true })];
  let at = m.NF;
  BUILDINGS.forEach((b, bi) => { const c = m.slots.filter((s) => s.bi === bi).length; out.push(part(`neu:${b.id}`, pts.slice(at, at + c))); at += c; });
  out.push(part(m.story ? 'kranz' : 'strom', pts.slice(m.NF + m.NB)));
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// 3D+: Rauch → Strom → Haus für Haus → Kranz
// ---------------------------------------------------------------------------------------------------------------------
const ACT = [0, 3.5, 8.5, 15.5, 22];
const POUR = { t: 3.8, dur: 2.2, spread: 0.25 }; // der Rauch sinkt Kringel für Kringel in den Strom, der nächste am Schornstein zuerst
const pourAt = (pi) => POUR.t + POUR.spread * pi;
const RISE = { t: [8.9, 10.3, 11.6, 12.9], dur: 2.3 }; // Haus für Haus: der Stromabschnitt vor dem Bauplatz hebt sich als Ganzes
const SPIN = 1.6; // Drehung der Wendel in 3D (rad/s); in 3D+ ruht sie (sonst holte jede Drohne beim Abflug kurz aus, Finte),
// dort zeigt allein das Licht das Fließen
const PEAK = 15.8; // Höhepunkt

function storyPose(m) {
  const { F, slots, extra, NF, NB } = m, tmp = [0, 0, 0];
  // die Ansicht schwenkt nur in Akt 1–2 leicht und im Höhepunkt weit; während die Häuser aufsteigen steht sie (ein
  // Schwenk gegen die Flugrichtung sähe nach der Landung wie Überschwingen aus)
  const yawAt = (T) => 0.14 * Math.sin((T * TAU) / 16) * ease(T / 3) * (1 - ease((T - 6.5) / 1.8)) + 0.42 * ease((T - PEAK) / 5);
  return (j, T, o) => {
    if (j < NF) { const p = F.pts[j]; o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; }
    else if (j < NF + NB) {
      const s = slots[j - NF], [pi, a] = s.puff, P = PUFFS[pi];
      // Rauch steht (seine Bewegung ist Licht): ein Treiben vor dem Hinabsinken wäre ein Ausholen
      const sx = P.c[0] + P.r * Math.cos(a), sy = P.c[1] + P.r * Math.sin(a), sz = P.c[2];
      // gleichzeitige gerade Flüge je Haus und je Kringel (die Zuordnung nach kleinsten Wegen hält sie kreuzungsfrei)
      const g = ease((T - pourAt(s.puff[0])) / POUR.dur), r = ease((T - RISE.t[s.bi]) / RISE.dur);
      streamAt(s.k, s.u, 0, tmp);
      o[0] = lerp(lerp(sx, tmp[0], g), s.p[0], r); o[1] = lerp(lerp(sy, tmp[1], g), s.p[1], r); o[2] = lerp(lerp(sz, tmp[2], g), s.p[2], r);
    } else {
      // Kranz: steigt, wird weit und legt sich schräg über den Campus
      const a = extra[j - NF - NB].a, P = PUFFS[KRANZ], u = ease((T - PEAK) / 3.2), r = lerp(P.r, 1.6, u), tilt = lerp(0, 1.08, u);
      const cx = lerp(P.c[0], 0.05, u), cy = lerp(P.c[1], 2.0, u), cz = lerp(P.c[2], -0.15, u), ly = r * Math.sin(a);
      o[0] = cx + r * Math.cos(a); o[1] = cy + ly * Math.cos(tilt); o[2] = cz + ly * Math.sin(tilt) * 0.6;
    }
    yaw(o, yawAt(T)); pitch(o, PITCH);
    return o;
  };
}
function storyLight(m) {
  const { F, slots, NF, NB } = m;
  return (j, T) => {
    if (j < NF) {
      const t = F.tags[j];
      if (t === 'feuer') return 0.9 + smooth((T - PEAK) / 1) * (0.6 + 0.5 * Math.sin(T * 3));
      if (t === 'strasse') return 0.45 + 0.55 * smooth((T - 4.5) / 2);
      if (t === 'tor') return 1 + 0.8 * Math.exp(-(((T - 4.6) / 0.8) ** 2));
      return 1;
    }
    if (j < NF + NB) {
      const s = slots[j - NF], g = ease((T - pourAt(s.puff[0])) / POUR.dur), r = ease((T - RISE.t[s.bi]) / RISE.dur);
      const smoke = 0.55 + 0.25 * Math.max(0, Math.sin(T * 1.3 - s.puff[1] * 2 + s.puff[0])); // Rauch wallt im Licht
      const ph = ((((s.u - (T - 6) * 0.22) % 0.5) + 0.5) % 0.5) - 0.25, flow = 1 + 0.9 * Math.exp(-((ph / 0.05) ** 2)); // Lichtpulse fließen den Strom entlang
      const built = 1 + 0.7 * Math.exp(-(((r - 0.9) / 0.15) ** 2)); // ein Haus leuchtet auf, wenn es steht
      // Höhepunkt: eine Lichtwelle läuft vom Tor über alle Häuser, Geschoss für Geschoss, dann blitzt der Campus im Takt
      const wave = T > PEAK ? 1.1 * Math.exp(-(((T - PEAK - 0.6 - (s.p[0] + 1.2) * 0.45 - s.h * 0.7) / 0.25) ** 2)) + 0.4 * Math.max(0, Math.sin(((T - PEAK - 2.8) * TAU) / 0.9)) * smooth((T - PEAK - 2.8) / 0.3) : 0;
      return lerp(lerp(smoke, flow, g), built, r) + wave + (s.tag === 'baum' && T > PEAK ? sparkle(j, T, 0, 0.5) : 0);
    }
    // die letzte Wolke bleibt als leiser Rest am Himmel, bis sie im Höhepunkt der Kranz wird
    return 0.55 - 0.3 * smooth((T - 5) / 2) + 1.3 * ease((T - PEAK) / 2.5) + 0.3 * Math.sin(T * 4 + j) * smooth((T - PEAK) / 1.5);
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// 3D: der fertige Campus, ein kleiner Strom kreist um den Platz
// ---------------------------------------------------------------------------------------------------------------------
function pose3d(m) {
  const { F, slots, extra, NF, NB } = m;
  // der Strom zieht die Straße entlang (Stellen wandern weiter, hinten fehlt nichts: die Stellen laufen in einem Fenster
  // mit, das sich mit ihnen bewegt, und die Wendel dreht sich)
  return (j, T, o) => {
    if (j < NF) { const p = F.pts[j]; o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; }
    else if (j < NF + NB) { const p = slots[j - NF].p; o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; }
    else { const q = extra[j - NF - NB]; streamAt(q.k, q.u, SPIN * T, o); }
    yaw(o, 0.48 * Math.sin((T * TAU) / 18) * ease(T / 3)); pitch(o, PITCH);
    return o;
  };
}
function light3d(m) {
  const { F, slots, extra, NF, NB } = m;
  return (j, T) => {
    if (j < NF) { const t = F.tags[j]; return t === 'feuer' ? 1.2 + 0.5 * Math.sin(T * 2.4) : t === 'strasse' ? 0.75 : 1; }
    if (j < NF + NB) {
      const s = slots[j - NF], f = floorOf(s), on = smooth((T - 1 - f * 0.8 - s.bi * 0.4) / 0.6) * (1 - smooth((T - 9.5 - f * 0.4) / 0.8)) + smooth((T - 11.5 - f * 0.4) / 0.6);
      return 0.8 + 0.6 * Math.min(1, on) + (s.tag === 'baum' ? sparkle(j, T, 0, 0.4) : 0);
    }
    const q = extra[j - NF - NB], ph = ((((q.u - T * 0.06) % 0.17) + 0.17) % 0.17) - 0.085;
    return 0.85 + 0.9 * Math.exp(-((ph / 0.025) ** 2));
  };
}

const colours = (m, phase) => [
  ...m.F.tags.map((t) => OLD[t]),
  ...m.slots.map((s) => (phase === 0 ? SMOKE : phase === 1 ? STREAMC : houseColour(s))),
  ...m.extra.map(() => (m.story ? (phase === 0 ? SMOKE : GOLD) : STREAMC)),
];
const fitOf = (at, times) => times.flatMap((T) => at(T)).filter((_, i) => i % 3 === 0);

export const builders = {
  factoryCampus3d: (n, caption) => {
    const m = campusModel(n, false), pose = pose3d(m), light = light3d(m), col = colours(m, 2), H = 16;
    const at = (T) => Array.from({ length: n }, (_, j) => [...pose(j, T, [0, 0, 0]), ...col[j]]);
    return { beats: [{ ...act(groupsOf(m, at(0)), { caption, hold: H, live: (p, j, t, o) => { pose(j, t, o); o[3] = light(j, t); } }), fitPts: fitOf(at, [0, 4.5, 9, 13.5]) }] };
  },

  factoryCampusStory: (n) => {
    const m = campusModel(n, true), pose = storyPose(m), light = storyLight(m);
    const cols = [0, 1, 2, 2].map((ph) => colours(m, ph));
    const at = (T, a = 2) => Array.from({ length: n }, (_, j) => [...pose(j, T, [0, 0, 0]), ...cols[a][j]]);
    // eigener Bildausschnitt: erst Fabrik mit Rauchfahne, ab dem Bau der Campus (die Kamera zieht mit)
    const sky = fitOf(at, [0, 2, 4, 6, 8.5]), campus = fitOf(at, [8.5, 11, 13, 15.5, 17, 19, 22]);
    const caps = ['werkhalle.hall', 'werkhalle.gate', 'werkhalle.rise', 'werkhalle.campus'];
    return { beats: caps.map((key, a) => ({ ...act(groupsOf(m, at(ACT[a], a)), { caption: message(key), hold: ACT[a + 1] - ACT[a], live: (p, j, t, o) => {
      const T = ACT[a] + t; pose(j, T, o); o[3] = light(j, T);
    } }), ...(a < 2 ? { frame: 'rauch', fitPts: sky } : { frame: 'campus', fitPts: campus }) })) };
  },
};
