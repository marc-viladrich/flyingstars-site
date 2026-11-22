import { t as message } from '../../../i18n/ui.mjs';
// Das Blütenspalier mit Lichterweg (Runde 11b, große Motive, Anlass Hochzeit, ab 500 Drohnen; Runde 11c: vorher ab 700). Kandidat FSK-075 der
// Motiv-Shortlist (freelance/clients/flyingstars/25-motiv-shortlist-2026-11-20), Referenz „Meditative landscape with
// butterflies · 400“ (dort ein flacher Weg zwischen gefüllten Blütenflächen).
// Ein Weg führt vom Publikum in die Tiefe, durch einen Tunnel aus Rosenbögen. Jeder Bogen hat zwei durchbrochene
// Spalierseiten (zwei Holme mit Zickzackstreben, nur Linien) und oben einen doppelten Rundbogen; nach hinten werden die
// Bögen kleiner und rücken zusammen, so liegen sie von vorn gesehen ineinander und der Blick fällt durch sie hindurch
// auf das Ende des Wegs. Der Weg ist eine Reihe von Lichterpaaren auf dem Boden. An den Schultern jedes Bogens sitzt
// links und rechts ein Blütencluster (ein Paar).
// Jede Blüte ist ein Kranz aus Blütenblättern: geschlossen stehen die Blätter nach vorn (eine Knospe, ein Kelch),
// geöffnet liegen sie flach und zeigen zum Publikum. Die Drohnen einer Blüte kennen Blatt und Stelle darauf, so öffnet
// sich die Blüte als Bewegung. Blüten öffnen sich paarweise, vom vordersten Bogen zum hintersten: der Blick wandert zur
// Mitte. Verworfen (Runde 11b, Iteration 2): Rankenwände als Kulissen links und rechts des Wegs; sie lasen sich als
// Kisten mit Blumen obendrauf, der Weg ging zwischen ihnen verloren.
// Mehr Drohnen bringen mehr Teile: unter 600 drei Bögen, ab 600 ein vierter, ab 800 ein fünfter Bogen und eine zweite Blüte je Cluster, ab 900 ein sechster Bogen.
//
//   spalier3d (3D, ab 500): der Bogentunnel schwenkt langsam (die Tiefe zeigt sich), die Blüten öffnen sich paarweise
//     von vorn nach hinten, danach laufen Lichter über den Weg zur Mitte, die Blütenpaare leuchten mit.
//   spalierStory (3D+, ab 500): vier Akte mit denselben Drohnen. Weg und Bögen zeichnen sich, die Blüten öffnen sich
//     paarweise, die Lichter führen zur Mitte, dann steigen die Lichter des Wegs auf und werden am Ende des Wegs zu zwei
//     ineinander verschlungenen Ringen.
// Wächter: scripts/spalier.test.mjs.
import { TAU, GOLD, WARM, PINK, VIOLET, GREEN, mix, smooth, yaw, pitch, part, act, trace } from '../../show-motion.js';
import { curves, assemble } from '../catalog-3d/kit.js';
import { assignScalable } from '../../show-field.js';

const lerp = (a, b, u) => a + (b - a) * u;
/** smootherstep: Anfang und Ende ohne Geschwindigkeit und ohne Beschleunigung (wie die Flüge der Engine). */
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));

// ---------------------------------------------------------------------------------------------------------------------
// Bauplan (x quer, y oben, z zum Publikum; der Weg läuft von Z_NEAR vorn nach Z_FAR hinten)
// ---------------------------------------------------------------------------------------------------------------------
/** Detailstufe: 0 bis 799, 1 bis 899, 2 ab 900. */
export const level = (n) => (n >= 900 ? 2 : n >= 800 ? 1 : 0);
const Z_NEAR = 2.0, Z_FAR = -2.6;
/** Bögen vorn nach hinten: z, halbe lichte Weite a, Höhe der Holme p, Breite der Spalierseite b. */
/** Zahl der Bögen: unter 600 drei (weniger Bögen statt dünnerer Linien), dann 4, 5, 6 je Detailstufe. */
export const archCount = (n) => (n < 600 ? 3 : [4, 5, 6][level(n)]);
function arches(lv, n) {
  const k = archCount(n), out = [];
  for (let i = 0; i < k; i++) {
    const u = i / (k - 1), s = lerp(1, 0.5, u);
    out.push({ i, z: lerp(1.45, -2.05, u), a: 1.15 * s, p: 1.15 * s, b: 0.17 * s, s });
  }
  return out;
}
/** Linien eines Bogens: je Seite zwei Holme mit Zickzackstreben (die durchbrochene Spalierseite), oben zwei Rundbögen. */
function archLines(A) {
  const { a, p, b, z } = A, lines = [];
  for (const sg of [-1, 1]) {
    const xi = sg * a, xo = sg * (a + b);
    lines.push({ pts: [[xi, 0, z], [xi, p, z]] }, { pts: [[xo, 0, z], [xo, p, z]] });
    const k = Math.max(3, Math.round(p / (1.6 * b))), zig = [];
    for (let q = 0; q <= k; q++) zig.push([q % 2 ? xo : xi, 0.04 + ((p - 0.08) * q) / k, z]);
    lines.push({ pts: zig });
  }
  const arc = (r) => Array.from({ length: 41 }, (_, i) => { const t = Math.PI - (i / 40) * Math.PI; return [r * Math.cos(t), p + r * Math.sin(t), z]; });
  lines.push({ pts: arc(a) }, { pts: arc(a + b) });
  return lines;
}
/** Blüten: je Bogen an beiden Schultern ein Cluster (ab 800 zwei Blüten). Paar = Bogen. */
function flowers(lv, n) {
  const out = [];
  for (const A of arches(lv, n)) {
    const rr = A.a + A.b / 2, at = (ang, r, dz = 0.1) => [rr * Math.cos(ang), A.p + rr * Math.sin(ang), A.z + dz];
    for (const sg of [-1, 1]) {
      const base = sg > 0 ? 0 : Math.PI, dir = sg > 0 ? 1 : -1;
      out.push({ c: at(base + dir * 0.55, 0), r: 0.32 * A.s + 0.05, pair: A.i, sg });
      if (lv >= 1) out.push({ c: [sg * rr, A.p * 0.42, A.z + 0.1], r: 0.24 * A.s + 0.04, pair: A.i, sg });
    }
  }
  return out;
}
const PETAL_R0 = 0.32; // Blätter beginnen bei 32 % des Radius: in der Mitte treffen sich keine Drohnen
/** Punkt auf einer Blüte: Blatt k von K, Stelle s ∈ [0, 1) auf dem Blatt (offenes U mit breitem Ansatz: liefe die
 * Schlaufe an ihren Anfang zurück, stünden dort zwei Drohnen fast aufeinander), Öffnung open ∈ [0, 1]. */
function petalPoint(f, K, k, s, open, out) {
  const phi = (TAU * k) / K + Math.PI / 2, r0 = PETAL_R0 * f.r, len = f.r - r0, a = 0.5 * len * (1 - Math.cos(TAU * s));
  let b = 0.34 * len * Math.sin(TAU * s) * (1 - 0.35 * Math.cos(TAU * s)) + 0.09 * f.r * (1 - 2 * s);
  // geschlossen: die Blätter stehen fast senkrecht nach vorn (ein Kelch) und sind schmaler, damit sich Nachbarn nicht treffen
  const th = (1 - open) * 1.25; b *= 0.55 + 0.45 * open;
  const radial = r0 + a * Math.cos(th), fwd = a * Math.sin(th), tx = -Math.sin(phi), ty = Math.cos(phi);
  out[0] = f.c[0] + Math.cos(phi) * radial + tx * b; out[1] = f.c[1] + Math.sin(phi) * radial + ty * b; out[2] = f.c[2] + fwd; return out;
}

/** Lichterweg: Paare auf dem Boden, nach hinten enger (der Weg läuft in die Tiefe), Abstand der Paare gleich. */
function pathLights(count) {
  const pairs = Math.floor(count / 2), out = [];
  for (let i = 0; i < pairs; i++) {
    const u = i / Math.max(1, pairs - 1), z = lerp(Z_NEAR, Z_FAR, u), half = lerp(0.55, 0.22, u);
    out.push([-half, 0, z, i], [half, 0, z, i]);
  }
  if (count % 2) out.push([0, 0, Z_FAR - 0.2, pairs]);
  return out;
}

/** Modell: Bögen (statisch) | Blüten | Lichterweg; je Drohne die Stelle im eigenen Teil. */
export function model(n) {
  const lv = level(n), A = arches(lv, n), F = flowers(lv, n), K = 5;
  const al = A.flatMap(archLines);
  const nl = (n < 600 ? 56 : Math.max(40, Math.round(n * 0.08))) & ~1, perFlower = (f) => Math.max(K * 3, Math.round((f.r / 0.2) * K * 2.7));
  const nf = Math.min(F.reduce((a, f) => a + perFlower(f), 0), Math.round(n * 0.45)), nw = n - nl - nf;
  const walls = assemble([curves('bogen', al)], nw);
  // Blüten: je Blüte Drohnen nach Größe, gleichmäßig auf die Blätter verteilt
  const share = F.map(perFlower), tot = share.reduce((a, b) => a + b, 0), cnt = share.map((x) => Math.floor((nf * x) / tot));
  let rest = nf - cnt.reduce((a, b) => a + b, 0); for (let i = 0; rest > 0; i = (i + 1) % cnt.length, rest--) cnt[i]++;
  const slot = [];
  F.forEach((f, fi) => { const per = Math.ceil(cnt[fi] / K); for (let q = 0; q < cnt[fi]; q++) { const k = q % K, s = (Math.floor(q / K) + 0.5) / per; slot.push({ fi, k, s: 0.1 + 0.8 * ((s + k * 0.13) % 1) }); } }); // der Blattansatz bleibt frei (dort träfen sich Nachbarblätter)
  return { lv, K, A, F, walls: walls.pts, slot, lights: pathLights(nl), nw, nf, nl };
}

// ---------------------------------------------------------------------------------------------------------------------
// Bewegung
// ---------------------------------------------------------------------------------------------------------------------
const VIEW_PITCH = 0.22;
const place = (o, ya) => { yaw(o, ya, 0, -0.3); pitch(o, VIEW_PITCH, 0, 0); return o; };
const FLOWER_COL = [mix(PINK, WARM, 0.35), mix(VIOLET, PINK, 0.4), mix(WARM, GOLD, 0.3)];
const WALL_COL = mix(GREEN, WARM, 0.45), LIGHT_COL = mix(GOLD, WARM, 0.4);
/** Paarweise öffnen: Paar p beginnt bei at + p · step und braucht dur. */
const openOf = (pair, T, at, step, dur) => ease((T - at - pair * step) / dur);

function colours(m) {
  return [...m.walls.map(() => WALL_COL), ...m.slot.map((q) => FLOWER_COL[(m.F[q.fi].pair + (m.F[q.fi].sg === 0 ? 1 : 0)) % 3]), ...m.lights.map(() => LIGHT_COL)];
}
/** Lage einer Drohne: Bogen fest, Blüte nach Öffnung, Licht auf dem Weg. */
function basePose(m, j, open, out) {
  if (j < m.nw) { const p = m.walls[j]; out[0] = p[0]; out[1] = p[1]; out[2] = p[2]; return out; }
  if (j < m.nw + m.nf) { const q = m.slot[j - m.nw]; return petalPoint(m.F[q.fi], m.K, q.k, q.s, open(m.F[q.fi].pair), out); }
  const p = m.lights[j - m.nw - m.nf]; out[0] = p[0]; out[1] = p[1]; out[2] = p[2]; return out;
}
const groupsOf = (m) => [{ name: 'boegen', count: m.nw, rigid: true }, { name: 'blueten', count: m.nf, rigid: true }, { name: 'lichter', count: m.nl, rigid: true }];
const depth = (z) => (Z_NEAR - z) / (Z_NEAR - Z_FAR);
/** Licht läuft über den Weg zur Mitte: Welle nach hinten, Paar für Paar. */
const runLight = (z, T, period) => 1 + 0.8 * Math.exp(-(((depth(z) - ((T / period) % 1) * 1.25 + 0.1) / 0.08) ** 2));

function spalier3d(n, caption) {
  const m = model(n), col = colours(m), pairs = m.A.length;
  const OPEN = { at: 0.8, step: 0.6, dur: 1.6 }, open = (T) => (p) => openOf(p, T, OPEN.at, OPEN.step, OPEN.dur);
  const done = OPEN.at + (pairs - 1) * OPEN.step + OPEN.dur;
  const yawAt = (t) => 0.32 * Math.sin((t * TAU) / 16) * smooth(t / 2);
  const pose = (j, t, o) => { basePose(m, j, open(t), o); return place(o, yawAt(t)); };
  const at = (t) => col.map((c, j) => [...pose(j, t, [0, 0, 0]), ...c]);
  const fitPts = [0, 4, 8, 12, 16].flatMap((t) => at(t)).filter((_, i) => i % 2 === 0);
  return { beats: [{ pts: at(0), caption, hold: 16, fitPts, groups: groupsOf(m), live: (b, j, t, o) => {
    pose(j, t, o);
    if (j < m.nw) { o[3] = 0.9; return; }
    if (j < m.nw + m.nf) { const f = m.F[m.slot[j - m.nw].fi], u = open(t)(f.pair); o[3] = 0.55 + 0.6 * u + (t > done ? 0.45 * Math.exp(-(((depth(f.c[2]) - (((t - done) / 4) % 1) * 1.25 + 0.1) / 0.1) ** 2)) : 0); return; }
    o[3] = t > done - 1 ? runLight(m.lights[j - m.nw - m.nf][2], t - done + 1, 4) : 0.9;
  } }] };
}

// Geschichte: Zeiten der Akte
const ACT = [0, 5, 11, 16, 25];
const S_OPEN = { at: 5.3, step: 0.6, dur: 1.5 }, RINGS = { at: 16.4, dur: 3.8, spread: 2.4 };
function spalierStory(n) {
  const m = model(n), col = colours(m), L0 = m.nw + m.nf;
  // zwei verschlungene Ringe hinten im Tunnel, über dem Weg: einer aufrecht zum Publikum, einer um 60° gedreht
  const R = 0.44, cy = 0.82, zc = -1.45, ringPts = [];
  const half = Math.floor(m.nl / 2);
  for (let r = 0; r < m.nl; r++) {
    const second = r >= half, k = second ? r - half : r, cnt = second ? m.nl - half : half, a = (k / cnt) * TAU, c = Math.cos(a) * R, s = Math.sin(a) * R;
    ringPts.push(second ? [0.25 + c * Math.cos(1.05), cy + s, zc + c * Math.sin(1.05)] : [-0.25 + c, cy + s, zc]);
  }
  const flat = (list) => Float64Array.from(list.flatMap((q) => [q[0], q[1], q[2]]));
  const toL = assignScalable(flat(ringPts), flat(m.lights)), goal = new Array(m.nl); ringPts.forEach((q, r) => { goal[toL[r]] = q; });
  // hinten zuerst: die Lichter nahe am Ende steigen zuerst auf, die vorderen folgen über den Weg, in einem Bogen
  const LIFT = 0.3;
  const lightPose = (k, T, o) => {
    const p = m.lights[k], g = goal[k], u = ease((T - RINGS.at - (1 - depth(p[2])) * RINGS.spread) / RINGS.dur), lift = LIFT * Math.sin(Math.PI * u);
    o[0] = lerp(p[0], g[0], u); o[1] = lerp(p[1], g[1], u) + lift; o[2] = lerp(p[2], g[2], u); return o;
  };
  const open = (T) => (p) => openOf(p, T, S_OPEN.at, S_OPEN.step, S_OPEN.dur);
  // Ein einziger ruhiger Schwenk über die ganze Geschichte, ohne Umkehr (Runde 20f, Marc: „komischer Kameraschwenk“):
  // vorher drehte der Tunnel in 5 s von 26° auf frontal und pendelte danach zurück, das las sich als Ruck mit Umkehr
  const yawAt = (T) => 0.3 - 0.5 * ease(T / ACT[4]);
  const pose = (j, T, o) => { if (j >= L0) lightPose(j - L0, T, o); else basePose(m, j, open(T), o); return place(o, yawAt(T)); };
  const drawRank = m.walls.map((p) => depth(p[2]) * 0.6 + (p[1] / 2.4) * 0.4);
  const ringsOn = RINGS.at + RINGS.spread + RINGS.dur;
  const light = (j, T) => {
    if (j < m.nw) return T < ACT[1] ? trace(drawRank[j], T, 3.6, { dim: 0.25 }) * 0.9 : 0.9;
    if (j < L0) { const f = m.F[m.slot[j - m.nw].fi], u = open(T)(f.pair); return (T < ACT[1] ? 0.3 + 0.2 * smooth((T - 2) / 2) : 0.5) + 0.65 * u + (T > ACT[3] ? 0.3 * (0.5 + 0.5 * Math.sin((T * TAU) / 2.2 - f.pair * 0.6)) : 0); }
    const p = m.lights[j - L0];
    if (T < ACT[1]) return trace(depth(p[2]), T, 3, { delay: 1.2, dim: 0.15 });
    if (T < ACT[2]) return 0.9;
    if (T < ACT[3]) return runLight(p[2], T - ACT[2], 2.5);
    return 1 + 0.45 * smooth((T - ringsOn) / 0.8) * (0.6 + 0.4 * Math.sin((T * TAU) / 1.8 + (j - L0) * 0.2));
  };
  const at = (T) => col.map((c, j) => [...pose(j, T, [0, 0, 0]), ...c]);
  const parts = (pts) => [part('boegen', pts.slice(0, m.nw), { rigid: true }), part('blueten', pts.slice(m.nw, L0), { rigid: true }), part('lichter', pts.slice(L0), { rigid: true })];
  const fitPts = [0, 4, 8, 12, 16, 19, 22, ACT[4]].flatMap((T) => at(T)).filter((_, i) => i % 2 === 0);
  const caps = ['spalier.aPathBetweenVines', 'spalier.flowersOpenInPairs', 'spalier.lightsLeadToTheMiddle', 'spalier.twoRingsAtTheEnd'];
  return { beats: caps.map((key, a) => ({ ...act(parts(at(ACT[a])), { caption: message(key), hold: ACT[a + 1] - ACT[a], live: (b, j, t, o) => {
    const T = ACT[a] + t; pose(j, T, o); o[3] = light(j, T);
  } }), fitPts })) };
}

export const builders = {
  spalier3d: (n, caption) => spalier3d(n, caption),
  spalierStory: (n) => spalierStory(n),
};
