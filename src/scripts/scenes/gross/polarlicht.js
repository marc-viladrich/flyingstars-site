// Polarlicht über einem Fjord (Runde 11b, Kandidat FSK-013 der Motiv-Shortlist), Anlass Winter & Silvester, ab 800 Drohnen in
// 3D und 3D+. Referenz „Large aurora borealis display · 900“ (nur als Anregung). Was erst ab 800 geht: mehrere breite
// Lichtvorhänge zugleich, gestaffelt in der Tiefe, über einer Landschaft mit Spiegelung. Gebaut aus Linien wie alle großen
// Motive: jeder Vorhang ist eine Reihe senkrechter Strahlen über einer gewellten Unterkante (wie echtes Polarlicht, das aus
// Strahlen besteht), unten hellgrün, oben violett ausgehend; keine Füllung. Der Fjord: zwei Felswände als Kantenlinien
// (Vorder- und Hinterkante, dazwischen die Grate), die Wasserlinie am Ende des Fjords, auf dem Wasser die Spiegelung als kurze
// Strahlenstümpfe. Mehr Drohnen kaufen mehr und etwas höhere Strahlen, die Felslinien bleiben locker.
//
//   aurora3d (3D, ab 800): drei Vorhänge wogen; Wellen laufen an ihnen entlang (Fuß und Spitze gegeneinander versetzt, so
//     falten sie sich in der Tiefe), Licht steigt die Strahlen hinauf, die Spiegelung zittert auf dem Wasser.
//   auroraStory (3D+, ab 800): vier Akte ohne Bildwechsel. Dunkler Fjord mit Sternen; die Vorhänge entfalten sich nacheinander
//     (das Licht steigt die Strahlen hinauf), dann wandern die Bögen seitlich über den Fjord, die Spiegelung folgt verzögert;
//     Höhepunkt: ein Lichtsturm, die Falten werden tiefer, helle Wellen jagen die Vorhänge entlang und färben sie violett;
//     danach beruhigt sich alles.
// Wächter: scripts/polarlicht.test.mjs.
import { TAU, CYAN, VIOLET, DIAMOND, WARM, mix, smooth, hash, yaw, pitch } from '../../show-motion.js';
import { curves, assemble } from '../catalog-3d/kit.js';

const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));
const AUR_G = [90, 245, 150], AUR_T = mix(CYAN, [90, 245, 150], 0.4), AUR_V = mix(VIOLET, [120, 110, 255], 0.35);
const ROCK = mix(DIAMOND, [70, 88, 125], 0.75), WATER_C = mix(DIAMOND, CYAN, 0.3);
export const SIGMA = 0.062; // Abstand der Drohnen auf einem Strahl und auf den Felslinien
export const WATER = -0.62;

// ---------------------------------------------------------------------------------------------------------------------
// Fjord von vorn: links und rechts eine Bergflanke (Silhouette vorn, dahinter eine zweite, niedrigere und weiter innen, wie
// die Wände, die in die Tiefe laufen), ein Grat je Berg, die Wasserlinie am Ende des Fjords. (Kontaktbogen 1: Fels als
// Kantenrahmen in der Aufsicht las sich wie eine Tischplatte.)
const LEFT = [[-2.1, -0.1], [-1.85, 0.18], [-1.55, 0.4], [-1.38, 0.33], [-1.2, 0.36], [-0.98, 0.0], [-0.84, -0.32], [-0.72, -0.62]];
const RIGHT = [[0.68, -0.62], [0.82, -0.3], [1.0, -0.02], [1.22, 0.2], [1.42, 0.17], [1.62, 0.32], [1.88, 0.1], [2.1, -0.06]];
/** Höhe der vorderen Bergsilhouette bei x (−∞ in der Fjordmitte): dahinter ist Polarlicht verdeckt. */
/** Tannen an den Hängen (x, Höhe), in der Reihenfolge, in der sie mit mehr Drohnen dazukommen. */
const TREES = [[-1.02, 0.17], [0.98, 0.16], [-1.65, 0.15], [1.75, 0.14], [-0.9, 0.13], [1.12, 0.14], [-1.9, 0.12], [1.96, 0.12], [-1.4, 0.13], [1.48, 0.12], [-1.12, 0.15], [0.86, 0.14]];
const silhouette = (x) => { for (const line of [LEFT, RIGHT]) for (let i = 1; i < line.length; i++) { const [a, b] = [line[i - 1], line[i]]; if (x >= a[0] && x <= b[0]) return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]); } return -Infinity; };
function fjordParts() {
  // Silhouette vorn und je ein Grat vom Gipfel schräg zum Wasser (die Felswand); am Ende des Fjords die Wasserlinie und
  // dahinter eine niedrige, ferne Kette (Kontaktbogen 2: eine zweite Silhouette hinter der ersten las sich wie ein Zelt)
  const grat = (line, i, side) => [[line[i][0], line[i][1], 0], [line[i][0] + side * 0.42, WATER + 0.12, -0.3]];
  const far = [[-0.62, 0.08], [-0.4, 0.2], [-0.22, 0.12], [0.04, 0.25], [0.3, 0.1], [0.46, 0.15], [0.62, 0.06]].map(([x, y]) => [x, WATER + y, -2.6]);
  return [
    curves('felsL', [LEFT.map(([x, y]) => [x, y, 0]), grat(LEFT, 2, 1)], { w: 1 }),
    curves('felsR', [RIGHT.map(([x, y]) => [x, y, 0]), grat(RIGHT, 5, -1)], { w: 1 }),
    curves('wasser', [[[-0.66, WATER, -1.4], [0.64, WATER, -1.4]], far], { w: 0.85 }),
  ];
}

// ---------------------------------------------------------------------------------------------------------------------
// Vorhänge als Bänder: eine scharfe, helle Unterkante, darüber Strahlen, die nach oben violett auslaufen (Kontaktbogen 3: mit
// einer Oberkante dazu las sich jedes Band wie ein Zaun). Drei Bänder
// übereinander gestaffelt, jedes weiter hinten (in der Tiefe getrennt: keine Begegnung zwischen zwei Vorhängen).
export const CURTAINS = [
  { x: -0.2, w: 3.3, y: -0.02, z: -0.62, H: 0.42, ph: 0.3 },
  { x: 0.25, w: 3.0, y: 0.5, z: -1.58, H: 0.36, ph: 2.1 },
  { x: -0.1, w: 2.7, y: 0.94, z: -2.54, H: 0.3, ph: 4.0 },
  { x: 0.45, w: 2.1, y: 1.3, z: -3.5, H: 0.24, ph: 5.3 },
];
/** Zahl der Vorhänge: mehr Drohnen kaufen einen weiteren Vorhang (nicht dichtere Strahlen oder Felsen). */
export const curtainCount = () => 4; // vier gestaffelte Bänder, mit Luft dazwischen (Kontaktbogen 4: höhere Bänder überlappten zu einem Raster)
// Unterkante: ein flacher Bogen mit Wellen; der Bogen hängt in der Mitte durch wie echte Polarlichtbögen
const base = (c, s) => { const C = CURTAINS[c]; return [C.x + (s - 0.5) * C.w, C.y + 0.16 * Math.sin(Math.PI * s) + 0.06 * Math.sin(3.4 * s + C.ph), C.z + 0.22 * Math.sin(TAU * 1.1 * s + C.ph)]; };
const height = (c, s, hs = 1) => { const C = CURTAINS[c]; return hs * C.H * (0.55 + 0.45 * Math.sin(Math.PI * s) ** 0.6) * (0.85 + 0.15 * Math.sin(6 * s + C.ph)); };

/** Modell: Fjord (assemble), je Vorhang Unterkante, Oberkante und Strahlen, Spiegelung, Sterne. Rollen je Drohne in `kind`. */
export function auroraModel(n) {
  const fjord = fjordParts(), STARS = Math.round(16 + 0.025 * n);
  const fjordLen = fjord.reduce((a, q) => a + q.lines.reduce((b, l) => { let L = 0; const p = l.pts ?? l; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1], p[i][2] - p[i - 1][2]); return b + L; }, 0), 0);
  const fjordN = Math.round(fjordLen / SIGMA);
  const edgeN = (c, k) => Math.round((CURTAINS[c].w * 1.08) / (SIGMA * k));
  // Strahlen: Zahl je Vorhang so, dass die Drohnen aufgehen (mehr Drohnen: mehr Strahlen, die Linien bleiben gleich locker)
  let hs = 1;
  const rayN = (c, s) => Math.max(2, Math.round(height(c, s, hs) / (SIGMA * 1.15)));
  const raysS = (c, r) => Array.from({ length: r }, (_, i) => (i + 0.5) / r);
  const visible = (c, s) => Math.abs(base(c, s)[0]) < 0.55;
  const CS = CURTAINS.slice(0, curtainCount(n));
  const cost = (rays) => CS.reduce((a, _, c) => a + edgeN(c, 1) + raysS(c, rays[c]).reduce((b, s) => b + rayN(c, s) + (visible(c, s) ? 3 : 0), 0), 0);
  // Strahlen mindestens 0,19 auseinander (Kontaktbogen 2: dichter las sich als Leiter, als Punktfläche); was die Vorhänge
  // dann nicht brauchen, bekommen Sterne und Fels
  let k = 2.5;
  while (cost(CS.map((C) => Math.round((k + 0.25) * C.w))) <= n - fjordN - STARS && k < 1 / 0.16) k += 0.25;
  const rays = CS.map((C) => Math.round(k * C.w));
  // was dann noch frei ist, machen die Vorhänge höher (bis 1,25-fach), statt Felsen und Sterne zu verdichten
  while (hs < 1.25 && cost(rays) < n - fjordN - STARS - 6) hs += 0.02;
  if (cost(rays) > n - fjordN - STARS) hs -= 0.02;
  const auroraN = cost(rays), spare = Math.max(0, n - auroraN - STARS - fjordN);
  // ab etwa 900 Drohnen: Tannen an den Berghängen (je ein schlankes Dreieck; Kerben gaben bei kleinen Tannen Drohnen zu nah
  // beieinander), so viele, wie die freien Drohnen tragen
  const trees = Math.min(TREES.length, Math.floor(spare / 14));
  for (let q = 0; q < trees; q++) { const [x, h] = TREES[q], y = silhouette(x) - 0.01; fjord.push(curves('tanne', [[[x - h * 0.36, y], [x, y + h], [x + h * 0.36, y]].map((p) => [p[0], p[1], 0.04])], { w: 1 })); }
  const moreStars = Math.max(0, Math.min(40, spare - trees * 14)), { pts: fp, tags: ft } = assemble(fjord, n - auroraN - STARS - moreStars);
  const pts = [], kind = [], meta = [];
  fp.forEach((p, j) => { pts.push(p); kind.push(ft[j]); meta.push(null); });
  CS.forEach((C, c) => {
    for (const [k2, f, tag] of [[1, 0, 'strahl']]) { const m = edgeN(c, k2); for (let i = 0; i < m; i++) { const s = (i + 0.5) / m, b = base(c, s), h = height(c, s); pts.push([b[0], b[1] + f * h, b[2]]); kind.push(tag); meta.push({ c, s, f, edge: f ? 'oben' : 'unten' }); } }
    for (const s of raysS(c, rays[c])) {
      const m = rayN(c, s), b = base(c, s), h = height(c, s, hs);
      for (let i = 1; i <= m; i++) { const f = i / m; pts.push([b[0], b[1] + f * h, b[2]]); kind.push('strahl'); meta.push({ c, s, f }); }
      if (visible(c, s)) for (let i = 0; i < 3; i++) { const f = (i + 1) / 4; pts.push([b[0], WATER - 0.05 - (i + 1) * 0.068, b[2]]); kind.push('spiegel'); meta.push({ c, s, f }); }
    }
  });
  // Sterne hinter den Vorhängen, mit Abstand zueinander; genau n: was fehlt oder zu viel ist, gleichen die Sterne aus
  const sky = [];
  for (let q = 0; sky.length < STARS + 100 && q < 6000; q++) { const p = [-2.1 + 4.2 * hash(q * 1.37 + 0.11), 0.3 + 1.45 * hash(q * 2.71 + 0.53), -4.4]; if (sky.every((r) => Math.hypot(p[0] - r[0], p[1] - r[1]) > 0.2)) sky.push(p); }
  for (let q = 0; pts.length < n; q++) { pts.push(sky[q] ?? [-2.1 + 4.2 * hash(q + 0.5), 1.8 + 0.1 * (q % 3), -4.4 - 0.2 * Math.floor(q / 3)]); kind.push('stern'); meta.push(null); }
  while (pts.length > n) { const i = kind.lastIndexOf('stern'); pts.splice(i, 1); kind.splice(i, 1); meta.splice(i, 1); }
  return { pts, kind, meta, rays };
}
const colourOf = (kind, m) => (kind === 'tanne' ? mix([60, 150, 110], DIAMOND, 0.25) : kind === 'strahl' ? (m.f < 0.45 ? mix(AUR_G, AUR_T, m.f / 0.45) : mix(AUR_T, AUR_V, (m.f - 0.45) / 0.55)) : kind === 'spiegel' ? mix(AUR_G, WATER_C, 0.35) : kind === 'stern' ? WARM : kind === 'wasser' ? WATER_C : ROCK);

// ---------------------------------------------------------------------------------------------------------------------
// Bewegung: eine Welle läuft an jedem Vorhang entlang; die Spitze schwingt weiter und später als der Fuß (die Falte).
// amp: Stärke der Falten, drift: seitlicher Versatz des Vorhangs (3D+), lag: Verzögerung der Spiegelung.
function wave(m, t, amp, drift, o) {
  const C = CURTAINS[m.c], k = m.f * m.f;
  // seitlich nur leicht (die Falte zeigt sich in der Tiefe); stärkere Seitenwellen auf der Wanderung las der Finten-Wächter als Überschwingen
  o[0] += drift + amp * (0.032 * Math.sin(1.1 * t - 5 * m.s + C.ph) + 0.028 * k * Math.sin(0.8 * t - 3.4 * m.s + C.ph + 1));
  o[2] += amp * (0.12 * Math.sin(0.9 * t - 6 * m.s + C.ph) + 0.08 * k * Math.sin(0.7 * t - 4 * m.s + C.ph + 2));
  o[1] += amp * 0.03 * k * Math.sin(1.3 * t - 2 * m.s);
}
const VIEW = { yaw: 0.16, pitch: 0.04 };
/** Licht hinter den Bergen ist verdeckt: unterhalb der Silhouette bleibt eine Vorhangdrohne dunkel (weich am Rand). */
const rock = (o) => smooth((o[1] - silhouette(o[0]) - 0.02) / 0.07);
const view = (o) => { yaw(o, VIEW.yaw, 0, -0.8); pitch(o, VIEW.pitch); };

function aurora3dBeat(n, caption) {
  const model = auroraModel(n), hold = 9;
  const live = (b, j, t, o) => {
    const p = model.pts[j], k = model.kind[j], m = model.meta[j];
    o[0] = p[0]; o[1] = p[1]; o[2] = p[2];
    // die Bewegung läuft sanft an (Wellen, die aus dem Stand entstehen)
    const on = smooth(t / 2.5);
    if (k === 'strahl') { wave(m, t, on, 0, o); o[3] = rock(o) * (0.32 + 0.9 * (1 - m.f) ** 1.2) * (0.9 + 0.35 * Math.exp(-((((m.f - ((t * 0.45 + m.s * 1.7) % 1.4) + 0.2)) / 0.12) ** 2))); }
    else if (k === 'spiegel') { const q = { ...m, f: 0 }, d = [0, 0, 0, 1]; wave(q, t - 0.6, on, 0, d); o[0] += d[0]; o[2] += d[2]; o[3] = 0.45 + 0.25 * Math.sin(t * 3 + j); }
    else if (k === 'stern') o[3] = 0.85 + 0.3 * Math.sin(t * (1.3 + hash(j)) + hash(j + 1) * 9);
    else o[3] = 1;
    view(o);
    return o;
  };
  const pts = model.pts.map((p, j) => { const o = [0, 0, 0, 1]; live(null, j, 0, o); return [o[0], o[1], o[2], ...colourOf(model.kind[j], model.meta[j])]; });
  return { pts, caption, hold, live, shimmer: false, model };
}

// ---------------------------------------------------------------------------------------------------------------------
// 3D+: entfalten, wandern, Sturm, Ruhe
export const ACTS = { dark: 1.2, unfold: 3.2, wander: 4.5, storm: 3.0, calm: 2.6 };
function auroraStoryBeat(n, caption) {
  const model = auroraModel(n), A = ACTS, T1 = A.dark, T2 = T1 + A.unfold, T3 = T2 + A.wander, T4 = T3 + A.storm, end = T4 + A.calm;
  // seitliche Wanderung je Vorhang über den Fjord, verzögert für die Spiegelung
  const DRIFT = [0.55, -0.45, 0.35, -0.3];
  // nur in eine Richtung (eine Umkehr im Sturm ohne Halt las der Finten-Wächter als Überschwingen)
  const drift = (c, t) => DRIFT[c] * ease((t - T2) / (A.wander + A.storm));
  // Wellen von Anfang an in voller Stärke (sanft anlaufend), im Sturm etwas tiefer; eine erst kleine, dann größere Welle las der
  // Finten-Wächter als Ausholen
  const amp = (t) => 1 + 0.3 * Math.sin(Math.PI * Math.min(1, Math.max(0, (t - T3) / A.storm))) ** 2;
  const live = (b, j, t, o) => {
    const p = model.pts[j], k = model.kind[j], m = model.meta[j];
    o[0] = p[0]; o[1] = p[1]; o[2] = p[2];
    if (k === 'strahl') {
      wave(m, t, amp(t) * smooth(t / 2.5), drift(m.c, t), o);
      // Entfalten: Vorhang c leuchtet von der Unterkante her auf, einer nach dem anderen
      const open = smooth((t - T1 - m.c * 0.7 - m.f * 1.3) / 0.6);
      const storm = Math.sin(Math.PI * Math.min(1, Math.max(0, (t - T3) / A.storm)));
      const run = Math.exp(-((((m.s - ((t * (0.35 + 0.9 * storm)) % 1.6) + 0.3)) / 0.1) ** 2));
      o[3] = rock(o) * open * ((0.32 + 0.9 * (1 - m.f) ** 1.2) * (0.9 + 0.3 * Math.exp(-((((m.f - ((t * 0.45 + m.s * 1.7) % 1.4) + 0.2)) / 0.12) ** 2))) + (0.4 + 0.9 * storm) * run);
    } else if (k === 'spiegel') {
      const q = { ...m, f: 0 }, d = [0, 0, 0, 1], lag = 0.7;
      wave(q, t - lag, amp(t - lag) * smooth((t - lag) / 2.5), drift(m.c, t - lag), d); o[0] += d[0]; o[2] += d[2];
      // auf dem Wasser nur, solange der Strahl darüber zwischen den Felsen steht
      const open = smooth((t - lag - T1 - m.c * 0.7) / 0.8), visible = smooth((0.66 - Math.abs(o[0])) / 0.08);
      o[3] = open * visible * (0.42 + 0.2 * Math.sin(t * 3 + j) + 0.35 * Math.sin(Math.PI * Math.min(1, Math.max(0, (t - lag - T3) / A.storm))));
    } else if (k === 'stern') o[3] = 0.85 + 0.3 * Math.sin(t * (1.3 + hash(j)) + hash(j + 1) * 9);
    else o[3] = 1;
    view(o);
    return o;
  };
  const pts = model.pts.map((p, j) => { const o = [0, 0, 0, 1]; live(null, j, 0, o); return [o[0], o[1], o[2], ...colourOf(model.kind[j], model.meta[j])]; });
  const fitPts = model.pts.map((p) => { const o = [p[0], p[1], p[2], 1]; view(o); return o; });
  return { pts, caption, hold: end, live, shimmer: false, fitPts, model };
}

export const builders = {
  aurora3d: (n, caption) => { const b = aurora3dBeat(n, caption); return { beats: [{ pts: b.pts, caption, hold: b.hold, live: b.live, shimmer: false }] }; },
  auroraStory: (n, caption) => { const b = auroraStoryBeat(n, caption); return { beats: [{ pts: b.pts, caption, hold: b.hold, live: b.live, shimmer: false, fitPts: b.fitPts }] }; },
};
