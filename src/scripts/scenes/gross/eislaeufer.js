import { t as message } from '../../../i18n/ui.mjs';
// Eisläuferpaar auf der Winterbahn (Runde 11b, große Motive, Kandidat FSK-012), Anlass Winter & Silvester, ab 700 Drohnen in
// 3D und 3D+. Bauweise wie der 3D-Fußballer und der Erste Tanz: jede Figur aus wenigen klaren Körpern (Kopf, Rumpf, Hüfte
// als Ellipsoide, Glieder als Röhren), nur Linien, locker besetzt; unter den Stiefeln die Kufen als kurze Goldlinien. Bewegt
// wird über Gelenke (Vorwärtskinematik wie beim Fußballer): Rumpf um die Taille, Arme um Schulter und Ellbogen, Beine um
// Hüfte, Knie und Knöchel. Die Läuferin trägt ein kurzes Kleid, dessen Saum in der Drehung aufschwingt.
//
// Die Spuren der Kufen sind Licht: Drohnen liegen knapp unter dem Eis entlang der Bahnen, dunkel, bis eine Kufe über sie
// hinwegzieht; dann leuchten sie auf und glimmen nach (keine Drohne fliegt hinter der Kufe her).
//
//   skaters3d (3D, ab 700): Paarpirouette. Beide fassen sich an beiden Händen, lehnen sich gegeneinander zurück, sie streckt
//     das Spielbein nach hinten; die Drehung läuft an, ihr Kleid schwingt auf, die Kufen ziehen zwei Lichtkreise ins Eis.
//   skatersStory (3D+, ab 700): Die beiden stehen an der Spitze eines Herzens, das noch niemand sieht, trennen sich und
//     ziehen jeder eine Kurve (getrennte Spuren) → die Kurven schließen sich oben, wo sie sich wieder treffen → sie fassen sich
//     an beiden Händen → und drehen sich gemeinsam (eigenes Bild, damit die Drehung von der fertigen Haltung ausgeht); der Blick hebt sich, und auf dem Eis leuchtet das ganze Herz aus ihren Spuren.
// Mehr Drohnen: ab 900 Bande um die Bahn mit Pfosten, Schal am Läufer, mehr Falten im Kleid.
// Wächter: scripts/eislaeufer.test.mjs.
import { TAU, WARM, GOLD, CYAN, BLUE, PINK, VIOLET, DIAMOND, mix, smooth, yaw, pitch, roll, sparkle, share } from '../../show-motion.js';
import { ellipsoid, tube, curves, assemble } from '../catalog-3d/kit.js';

const lerp = (a, b, u) => a + (b - a) * u;
/** smootherstep (Anfang und Ende ohne Geschwindigkeit und Beschleunigung) */
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));

// ---------------------------------------------------------------- Farben ----------
const SKIN = [255, 210, 168], HAIR_M = [214, 148, 82], HAIR_F = mix(GOLD, WARM, 0.25), SUIT = mix(BLUE, WARM, 0.32), SCARF = mix(PINK, WARM, 0.2);
const DRESS = mix(VIOLET, PINK, 0.35), DRESS_HEM = mix(DIAMOND, VIOLET, 0.3), BLADE = GOLD, ICE = mix(CYAN, DIAMOND, 0.55), TRAIL = mix(DIAMOND, CYAN, 0.25), BOARD = mix(BLUE, CYAN, 0.45);

// ---------------------------------------------------------------- Figur (Figurrahmen: x Blickrichtung, y oben, z links) ----------
export const ICE_Y = -0.95; // Unterkante der Kufen
const J = {
  waist: [0, 0.08, 0], neck: [0.005, 0.55, 0],
  shL: [0, 0.46, 0.19], shR: [0, 0.46, -0.19], elL: [0, 0.46, 0.44], elR: [0, 0.46, -0.44],
  hipL: [0, -0.04, 0.085], hipR: [0, -0.04, -0.085], kneeL: [0.012, -0.47, 0.09], kneeR: [0.012, -0.47, -0.09], ankL: [0, -0.84, 0.09], ankR: [0, -0.84, -0.09],
};
// Bauhaltung: Arme waagerecht zur Seite (Ellbogen bei z ±0,44, Handgelenk bei ±0,68), Beine gestreckt
const WR = { L: [0, 0.46, 0.68], R: [0, 0.46, -0.68] };
const Z = 'z', X = 'x', Y = 'y';
const SEG = {
  hose: { parent: null, joints: [] },
  rumpf: { parent: 'hose', joints: [['lean', J.waist, Z, -1]] },
  kopf: { parent: 'rumpf', joints: [['nod', J.neck, Z, -1]] },
  // Arme liegen in der Bauhaltung waagerecht zur Seite: Senken um die x-Achse, nach vorn und Ellbogen um die Senkrechte
  oarmL: { parent: 'rumpf', joints: [['abdL', J.shL, X, 1], ['flexL', J.shL, Y, 1]] },
  uarmL: { parent: 'oarmL', joints: [['elbL', J.elL, Y, 1]] },
  oarmR: { parent: 'rumpf', joints: [['abdR', J.shR, X, -1], ['flexR', J.shR, Y, -1]] },
  uarmR: { parent: 'oarmR', joints: [['elbR', J.elR, Y, -1]] },
  oschL: { parent: 'hose', joints: [['hipL', J.hipL, Z, 1]] },
  uschL: { parent: 'oschL', joints: [['kneeL', J.kneeL, Z, 1]] },
  fussL: { parent: 'uschL', joints: [['ankL', J.ankL, Z, 1]] },
  oschR: { parent: 'hose', joints: [['hipR', J.hipR, Z, 1]] },
  uschR: { parent: 'oschR', joints: [['kneeR', J.kneeR, Z, 1]] },
  fussR: { parent: 'uschR', joints: [['ankR', J.ankR, Z, 1]] },
};
// Teile, die einem Segment folgen (Kufe am Fuß, Schal am Rumpf, Revers usw.)
const FOLLOW = { kufeL: 'fussL', kufeR: 'fussR', schal: 'rumpf', haar: 'kopf' };
const CHAIN = Object.fromEntries(Object.keys(SEG).map((s) => { const c = []; for (let q = s; q; q = SEG[q].parent) c.push(...SEG[q].joints); return [s, c]; }));
/** Lage eines Punktes von Segment seg in Haltung A (Winkel relativ zur Bauhaltung): Gelenke von innen nach außen. */
function fk(seg, A, o) {
  for (const [name, p, axis, sign] of CHAIN[FOLLOW[seg] ?? seg] ?? []) {
    const a = (A[name] ?? 0) * sign;
    if (!a) continue;
    if (axis === Z) roll(o, a, p[0], p[1]); else if (axis === Y) yaw(o, a, p[0], p[2]); else pitch(o, a, p[1], p[2]);
  }
}

// Haltungen (rad, relativ zur Bauhaltung; Arme in der Bauhaltung waagerecht zur Seite).
// abd > 0 senkt den Arm (zur Hüfte), flex > 0 nimmt ihn nach vorn; Knie < 0 beugt; Hüfte < 0 = Bein nach hinten.
export const POSES = {
  // Gleiten auf dem linken Bein: Oberkörper leicht vor, Arme seitlich etwas gesenkt und zurück, Spielbein lang nach hinten
  gleiten: { lean: 0.22, nod: -0.1, abdL: 0.3, abdR: 0.3, flexL: -0.25, flexR: -0.25, elbL: 0.15, elbR: 0.15, hipL: 0.14, kneeL: -0.3, ankL: 0.12, hipR: -0.62, kneeR: -0.05, ankR: 0.32 },
  // Paarpirouette: beide Arme nach vorn zum Partner, Oberkörper zurück, er auf beiden Beinen, sie mit Spielbein hinten
  paarM: { lean: -0.18, nod: 0.1, abdL: 0.25, abdR: 0.25, flexL: 1.25, flexR: 1.25, elbL: 0.1, elbR: 0.1, hipL: 0.08, kneeL: -0.2, ankL: 0.1, hipR: 0.05, kneeR: -0.2, ankR: 0.1 },
  paarF: { lean: -0.12, nod: 0.18, abdL: 0.2, abdR: 0.2, flexL: 1.3, flexR: 1.3, elbL: 0.08, elbR: 0.08, hipL: 0.12, kneeL: -0.22, ankL: 0.1, hipR: -0.6, kneeR: -0.05, ankR: 0.35 },
  // Stand: Arme etwas gesenkt
  stand: { lean: 0.04, nod: 0, abdL: 0.9, abdR: 0.9, flexL: 0.1, flexR: 0.1, elbL: 0.25, elbR: 0.25, hipL: 0.03, kneeL: -0.1, ankL: 0.05, hipR: -0.03, kneeR: -0.1, ankR: 0.05 },
};
const ANGLES = [...new Set(Object.values(SEG).flatMap((s) => s.joints.map((j) => j[0])))];
const blendPose = (A, B, u) => Object.fromEntries(ANGLES.map((k) => [k, lerp(A[k] ?? 0, B[k] ?? 0, u)]));

/** Detailstufe: 0 von 700 bis 890, 1 ab 900 (Bande mit Pfosten, Schal, mehr Falten). */
export const level = (n) => (n >= 900 ? 1 : 0);

/** Eine Figur in der Bauhaltung als Linienteile; she: Läuferin (kleiner, mit Kleid statt Hose, Haarknoten). */
function figureParts(she, lv) {
  const limb = (tag, a, b, r0, r1, opts = {}) => tube(tag, [a, b], (s) => r0 + (r1 - r0) * s, { depth: 0.9, hoops: 0, crest: false, caps: [false, false], ...opts });
  const gap = (a, b, d) => { const v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(...v); return a.map((q, i) => q + (v[i] / l) * d); };
  const k = she ? 0.82 : 1; // Glieder schlanker
  const parts = [
    ellipsoid('kopf', [0.012, 0.68, 0], she ? [0.083, 0.1, 0.08] : [0.092, 0.112, 0.088], { lat: [0.3], mer: [Math.PI / 2], roll: -0.3, w: 1.25 }),
    tube('kopf', [[0.005, 0.53, 0], [0.01, 0.6, 0]], she ? 0.034 : 0.044, { hoops: 0, crest: false, caps: [false, false] }),
    ellipsoid('rumpf', [0, 0.3, 0], she ? [0.1, 0.22, 0.15] : [0.13, 0.25, 0.2], { lat: [-0.55], mer: [Math.PI / 2] }),
    // ihre Hüfte steckt im Kleid: nur als Körper (verdeckt die Oberschenkel), ohne eigene Linie neben dem Taillenreif
    ellipsoid('hose', [0, 0.0, 0], she ? [0.1, 0.1, 0.14] : [0.115, 0.12, 0.18], { mer: [], silhouette: !she }),
  ];
  if (she) parts.push(ellipsoid('haar', [-0.075, 0.72, 0], [0.04, 0.04, 0.042], { w: 1.2 }));
  for (const [s, sz] of [['L', 1], ['R', -1]]) {
    parts.push(limb(`oarm${s}`, gap(J[`sh${s}`], J[`el${s}`], 0.07), gap(J[`el${s}`], J[`sh${s}`], 0.03), 0.047 * k, 0.04 * k), limb(`uarm${s}`, gap(J[`el${s}`], WR[s], 0.05), WR[s], 0.038 * k, 0.03 * k));
    parts.push(ellipsoid(`uarm${s}`, [0, 0.46, sz * 0.73], [0.035 * k, 0.03, 0.04], { w: 1.1 }));
    // ihr Oberschenkel beginnt erst unter dem Kleid (das Kleid deckt ihn, auch wenn das Spielbein nach hinten geht)
    parts.push(limb(`osch${s}`, gap(J[`hip${s}`], J[`knee${s}`], she ? 0.33 : 0.05), gap(J[`knee${s}`], J[`hip${s}`], 0.03), 0.075 * k, 0.055 * k), limb(`usch${s}`, gap(J[`knee${s}`], J[`ank${s}`], 0.06), gap(J[`ank${s}`], J[`knee${s}`], 0.04), 0.05 * k, 0.04 * k));
    // Stiefel und Kufe (die Kufe vorn leicht aufgebogen)
    parts.push(ellipsoid(`fuss${s}`, [0.04, -0.89, sz * 0.09], [0.085, 0.034, 0.04], { w: 1.1 }));
    parts.push(curves(`kufe${s}`, [[[-0.08, ICE_Y + 0.012, sz * 0.09], [0.06, ICE_Y + 0.012, sz * 0.09], [0.12, ICE_Y + 0.03, sz * 0.09], [0.13, ICE_Y + 0.06, sz * 0.09]]], { w: 1.3 }));
  }
  if (!she && lv >= 1) parts.push(curves('schal', [[[0.06, 0.55, 0.06], [0.09, 0.5, 0.11], [0.04, 0.4, 0.13], [-0.05, 0.36, 0.1], [-0.18, 0.4, 0.05]]], { w: 1 }));
  // unsichtbare Gelenkkugeln: keine Linie nahe Schulter, Ellbogen, Knie (die Glieder drehen dort)
  const hide = (c, r) => ellipsoid('gelenk', c, [r, r, r], { silhouette: false });
  for (const s of ['L', 'R']) parts.push(hide(J[`sh${s}`], 0.085), hide(J[`el${s}`], 0.04), hide(J[`knee${s}`], 0.055), hide(J[`hip${s}`], 0.05), hide(J[`ank${s}`], 0.045));
  // eine flache Scheibe um die Taille: dort laufen Rumpf und Hüfte zusammen, der Rumpf neigt sich darüber
  parts.push(ellipsoid('gelenk', [0, 0.07, 0], [0.17, 0.04, 0.23], { silhouette: false }));
  return parts;
}
const colourOf = (she, tag, p) => {
  if (tag === 'kopf') return p[1] > 0.71 || p[0] < -0.03 ? (she ? HAIR_F : HAIR_M) : SKIN;
  if (tag === 'haar') return HAIR_F;
  if (tag.startsWith('kufe')) return BLADE;
  if (tag.startsWith('fuss')) return WARM;
  if (tag === 'schal') return SCARF;
  if (tag.startsWith('uarm')) return Math.abs(p[2]) > 0.66 ? SKIN : she ? SKIN : SUIT;
  if (she) return tag.startsWith('osch') || tag.startsWith('usch') ? SKIN : DRESS;
  return SUIT;
};

// Kleid der Läuferin: Taillenreif, Saum, Falten als Parameter [θ, v, Art] (0 Reif, 1 Saum, 2 Falte); schwingt mit der Drehung
function skirtParams(m, lv) {
  const folds = lv >= 1 ? 8 : 6, [nw, nh, nf] = share(m, [0.5, 1.6, folds * 0.2]), per = share(nf, Array(folds).fill(1)), out = [];
  for (let i = 0; i < nw; i++) out.push([((i + 0.5) / nw) * TAU, 0, 0]);
  for (let i = 0; i < nh; i++) out.push([(i / nh) * TAU, 1, 1]);
  per.forEach((k, f) => { const th = ((f + 0.5) / folds) * TAU; for (let i = 0; i < k; i++) out.push([th, 0.25 + 0.6 * ((i + 0.5) / k), 2]); });
  return out;
}
/** Kleidpunkt im Figurrahmen: Taille bei y = −0,02, Saum bei −0,26; fl 0 … 1 hebt und weitet den Saum (Drehung), tw Nachlauf. */
const skirtAt = ([th0, v], fl, tw, wave) => {
  const th = th0 + tw * v, R = 0.105 + (0.13 + 0.2 * fl) * v ** 0.8, y = -0.02 - (0.33 - 0.2 * fl) * v + 0.015 * Math.sin(5 * th0 - wave) * v;
  return [R * Math.cos(th), y, R * Math.sin(th)];
};

const cache = new Map();
/** Beide Figuren: Läufer (er) und Läuferin (sie), je genau m bzw. f Drohnen; das Kleid zählt zur Läuferin. */
export function pairModel(m, f, lv) {
  const key = `${m}|${f}|${lv}`;
  if (cache.has(key)) return cache.get(key);
  const he = assemble(figureParts(false, lv), m);
  const [fb, fs] = share(f, [1, 0.3]);
  const sheBody = assemble(figureParts(true, lv), fb), skirt = skirtParams(fs, lv);
  const res = { he, she: sheBody, skirt, m, f, fb, fs, lv };
  cache.set(key, res);
  return res;
}

// ---------------------------------------------------------------- Platzieren ----------
/** Figurpunkt → Eisrahmen: Haltung A, dann gedreht auf Kurs a (Blickrichtung) und an (x, z) gestellt. */
function place(o, A, seg, x, z, a, dy = 0) {
  fk(seg, A, o);
  yaw(o, a);
  o[0] += x; o[1] += dy; o[2] += z;
  return o;
}

// ---------------------------------------------------------------- 3D: Paarpirouette ----------
const VIEW3D = { pitch: 0.34 };
const HOLD3D = 11;
const SEP = 0.53; // halber Abstand der beiden (Drehachse in der Mitte)
/** Drehwinkel der Pirouette: läuft weich an, dreht gleichmäßig, wird langsamer und hält (Fläche: turns Umdrehungen). */
function spinOf(t0, t1, turns, ramp = 2.2) {
  const up = (x) => x * x * x - (x * x * x * x) / 2, total = t1 - t0 - ramp;
  const f = (t) => {
    if (t <= t0) return 0; if (t >= t1) return 1;
    const u = t - t0;
    if (u < ramp) return (ramp * up(u / ramp)) / total;
    if (u < t1 - t0 - ramp) return (ramp / 2 + (u - ramp)) / total;
    const w = (u - (t1 - t0 - ramp)) / ramp; return (ramp / 2 + (t1 - t0 - 2 * ramp) + ramp * (w - up(w))) / total;
  };
  const peak = (TAU * turns) / total;
  return { angle: (t) => TAU * turns * f(t), speed: (t) => (f(t + 0.01) - f(t - 0.01)) / 0.02 * TAU * turns, flare: (t) => Math.min(1, (f(t + 0.01) - f(t - 0.01)) / 0.02 * TAU * turns / peak) };
}
/**
 * Paar in Pirouette um den Punkt (cx, cz) mit Drehwinkel psi: er bei −x, sie bei +x, sich ansehend. Liefert für Drohne j des
 * Paars (erst er, dann ihr Körper, dann ihr Kleid) die Lage im Eisrahmen. fl: Schwung des Kleides.
 */
function pairPoint(P, j, psi, fl, tw, wave, cx, cz, o, poses = POSES) {
  if (j < P.m) { const p = P.he.pts[j]; o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; place(o, poses.paarM, P.he.tags[j], -SEP, 0, 0); }
  else if (j < P.m + P.fb) { const k = j - P.m, p = P.she.pts[k]; o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; place(o, poses.paarF, P.she.tags[k], SEP, 0, Math.PI); }
  else { const q = skirtAt(P.skirt[j - P.m - P.fb], fl, tw, wave); o[0] = q[0]; o[1] = q[1]; o[2] = q[2]; yaw(o, Math.PI); o[0] += SEP; }
  yaw(o, psi); o[0] += cx; o[2] += cz;
  return o;
}
const colours = (P) => [...P.he.pts.map((p, j) => colourOf(false, P.he.tags[j], p)), ...P.she.pts.map((p, j) => colourOf(true, P.she.tags[j], p)), ...P.skirt.map(([, , k]) => (k === 1 ? DRESS_HEM : DRESS))];

function skaters3d(n, caption) {
  const lv = level(n), [np, nt, nr] = share(n, [0.66, 0.2, 0.14]), [m, f] = share(np, [1, 0.97]), P = pairModel(m, f, lv);
  // Lichtkreise: wo die Kufen kreisen (sein Standbein, ihr Standbein, ihr Spielbein ganz außen); Ring der Bahn außen
  const footR = (x, z) => Math.hypot(x, z);
  const rings = [footR(SEP + 0.04, 0), footR(SEP + 0.7, 0)], trail = [], [t1, t2] = share(nt, [rings[0], rings[1]]);
  for (const [c, r] of [[t1, rings[0]], [t2, rings[1]]]) for (let i = 0; i < c; i++) trail.push([r, (i / c) * TAU]);
  const rink = Array.from({ length: nr }, (_, i) => { const a = (i / nr) * TAU; return [Math.cos(a) * 1.85, ICE_Y - 0.07, Math.sin(a) * 1.45]; });
  const spin = spinOf(0.5, HOLD3D - 0.3, 1.6);
  const pose = (j, t, o) => {
    if (j < np) { const fl = spin.flare(t), tw = -0.5 * fl; pairPoint(P, j, spin.angle(t), fl, tw, 2 * t, 0, 0, o); }
    else if (j < np + nt) { const [r, a] = trail[j - np]; o[0] = Math.cos(a) * r; o[1] = ICE_Y - 0.07; o[2] = Math.sin(a) * r; }
    else { const p = rink[j - np - nt]; o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; }
    pitch(o, VIEW3D.pitch, -0.2, 0);
    return o;
  };
  // Spurlicht: eine Kufe zieht vorbei (Winkel der Kufe = Drehwinkel plus ihre Lage), dahinter glimmt die Spur nach
  const lightTrail = (k, t) => {
    const [r, a] = trail[k], psi = spin.angle(t);
    const phase = r > 1 ? 0 : Math.PI; // ihr Spielbein außen bei +x, die Standbeine innen
    const behind = ((-(a - (psi + phase)) % TAU) + TAU) % TAU; // wie weit die Kufe schon vorbei ist (rad)
    const passed = psi / TAU >= 0.08 ? 1 : smooth(psi / (TAU * 0.08));
    return 0.12 + passed * (0.55 * Math.exp(-behind / 2.6) + 0.45 * smooth((psi - (TAU - behind)) / 0.4 + 1) * 0.6 + 0.7 * Math.exp(-((behind / 0.25) ** 2)));
  };
  const cols = [...colours(P), ...trail.map(() => TRAIL), ...rink.map(() => ICE)];
  const at = (t) => cols.map((c, j) => [...pose(j, t, [0, 0, 0]), ...c]);
  const fitPts = [0, 3, 5, 7, 9, HOLD3D].flatMap((t) => at(t).map((p) => p.slice(0, 3)));
  return { beats: [{ pts: at(0), caption, hold: HOLD3D, fitPts, groups: [{ name: 'paar', count: np, rigid: false }, { name: 'spur', count: nt, rigid: false }, { name: 'bahn', count: nr, rigid: false }], live: (b, j, t, o) => {
    pose(j, t, o);
    o[3] = j < np ? 1 : j < np + nt ? lightTrail(j - np, t) : 0.8 + 0.25 * Math.exp(-((((j * 0.618) % 1) * 6 - (t % 6)) ** 2));
  } }] };
}

// ---------------------------------------------------------------- 3D+: das Herz auf dem Eis ----------
// Herz im Eisrahmen (x quer, z zum Publikum): Spitze vorn bei z = +HZ0, die beiden Bögen öffnen sich nach hinten. Jede Figur
// läuft einen Bogen von der Spitze bis kurz vor die Kerbe; dort treffen sie sich, fassen sich und drehen sich.
const HEART = { s: 0.105, zt: -0.45 };
/** Herzkurve (klassisch), u ∈ [0, 1] von der Spitze (0) über den linken Bogen zur Kerbe (1); side = ±1 spiegelt. */
function heartAt(u, side) {
  const t = Math.PI * (1 - u); // t = π Spitze … 0 Kerbe (die klassische Kurve läuft dort durch)
  const x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return [side * x * HEART.s, -y * HEART.s + HEART.zt]; // y der Kurve nach hinten (−z): die Kerbe hinten, die Spitze vorn
}
/** Weglänge der Herzkurve (Tabelle), damit die Läufer gleichmäßig fahren. */
const HEART_LEN = (() => { const N = 400, cum = [0]; let prev = heartAt(0, 1); for (let i = 1; i <= N; i++) { const p = heartAt(i / N, 1); cum.push(cum[i - 1] + Math.hypot(p[0] - prev[0], p[1] - prev[1])); prev = p; } return { N, cum, total: cum[N] }; })();
const uAtLen = (s) => { const { N, cum, total } = HEART_LEN, d = Math.max(0, Math.min(total, s)); let lo = 0, hi = N; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < d) lo = m; else hi = m; } return (lo + (d - cum[lo]) / Math.max(1e-9, cum[hi] - cum[lo])) / N; };
const STORY = { start: 0.17, stop: 0.8, t0: 0.4, t1: 9.6, tilt0: 0.3, tilt1: 0.95 };
const ACT = [0, 4.8, 10.2, 13.0, 20.2];

function skatersStory(n) {
  const lv = level(n), [np, nt, nr] = share(n, [0.6, 0.29, 0.11]), [m, f] = share(np, [1, 0.97]), P = pairModel(m, f, lv), L = HEART_LEN.total;
  // Spurdrohnen gleichmäßig entlang beider Bögen (von der Spitze bis zur Kerbe), knapp unter dem Eis
  const trail = []; const [tl, tr] = share(nt, [1, 1]);
  // an Spitze und Kerbe laufen beide Bögen zusammen: dort beginnt bzw. endet jede Spur, wo die Bögen 0,07 auseinander sind
  const edge = (from, dir) => { let q = from; while (Math.abs(heartAt(uAtLen(q * L), 1)[0]) < 0.035) q += dir * 0.001; return q; };
  const sa = edge(0, 1), sb = edge(1, -1);
  for (const [c, side] of [[tl, 1], [tr, -1]]) for (let i = 0; i < c; i++) { const q = sa + (sb - sa) * ((i + 0.5) / c), u = uAtLen(q * L), [x, z] = heartAt(u, side); trail.push({ x, z, s: q, side }); }
  // Bahn: Oval um das Herz, ab 900 mit Pfosten (die Bande)
  const rink = []; const [ro, rp] = lv >= 1 ? share(nr, [3, 1]) : [nr, 0];
  for (let i = 0; i < ro; i++) { const a = (i / ro) * TAU; rink.push([Math.cos(a) * 2.0, ICE_Y - 0.07, Math.sin(a) * 1.85 - 0.3]); }
  for (let i = 0; i < rp; i++) { const k = Math.floor(i / 3), q = i % 3, a = ((k + 0.5) / Math.ceil(rp / 3)) * TAU; rink.push([Math.cos(a) * 2.0, ICE_Y - 0.07 + 0.09 * (q + 1), Math.sin(a) * 1.85 - 0.3]); }
  // Fahrt entlang der Bögen: Anteil der Kurve über die Zeit (weich an, gleichmäßig, weich bis kurz vor die Kerbe)
  const prog = (T) => lerp(STORY.start, STORY.stop, ease((T - STORY.t0) / (STORY.t1 - STORY.t0)));
  const course = (T, side) => { const s = prog(T) * L, u = uAtLen(s), [x, z] = heartAt(u, side), [x2, z2] = heartAt(uAtLen(s + 0.02), side); return { x, z, a: Math.atan2(-(z2 - z), x2 - x) }; };
  // Ende der Fahrt: beide stehen sich an der Kerbe gegenüber; Paarpirouette um die Mitte zwischen ihnen
  const endL = course(STORY.t1, 1), endR = course(STORY.t1, -1), mid = [(endL.x + endR.x) / 2, (endL.z + endR.z) / 2];
  const joinT = [ACT[2] + 0.1, ACT[3] - 0.1], spin = spinOf(ACT[3] + 0.2, ACT[4] - 0.2, 1.4);
  // Haltung während der Fahrt: gleiten, die Arme heben sich erst, wenn die beiden auseinander sind
  const glide = (T) => blendPose(POSES.stand, POSES.gleiten, smooth((T - 1.4) / 2.2));
  let memo = NaN, ST = null;
  const state = (T) => {
    if (T === memo) return ST;
    memo = T;
    const g = smooth((T - joinT[0]) / (joinT[1] - joinT[0])); // vom Gleiten in die Pirouettenhaltung
    const cl = course(T, 1), cr = course(T, -1);
    // er: Bogen bei +x (side 1), sie: Bogen bei −x; am Ende stehen sie sich an der Kerbe gegenüber
    const he = { x: lerp(cl.x, mid[0] + SEP, g), z: lerp(cl.z, mid[1], g), a: lerpAngle(cl.a, Math.PI, g), A: blendPose(glide(T), POSES.paarM, g) };
    const she = { x: lerp(cr.x, mid[0] - SEP, g), z: lerp(cr.z, mid[1], g), a: lerpAngle(cr.a, 0, g), A: blendPose(glide(T), POSES.paarF, g) };
    ST = { he, she, psi: spin.angle(T), fl: spin.flare(T), tilt: lerp(STORY.tilt0, STORY.tilt1, ease((T - 7.5) / 7)) };
    return ST;
  };
  const pose = (j, T, o) => {
    const S = state(T);
    if (j < np) {
      if (j < P.m) { const p = P.he.pts[j]; o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; place(o, S.he.A, P.he.tags[j], 0, 0, S.he.a); o[0] += S.he.x; o[2] += S.he.z; }
      else if (j < P.m + P.fb) { const k = j - P.m, p = P.she.pts[k]; o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; place(o, S.she.A, P.she.tags[k], 0, 0, S.she.a); o[0] += S.she.x; o[2] += S.she.z; }
      else { const q = skirtAt(P.skirt[j - P.m - P.fb], S.fl, -0.5 * S.fl, 2 * T); o[0] = q[0]; o[1] = q[1]; o[2] = q[2]; yaw(o, S.she.a); o[0] += S.she.x; o[2] += S.she.z; }
      if (S.psi) yaw(o, S.psi, mid[0], mid[1]); // die Pirouette dreht beide um die Mitte (vorher 0)
    } else if (j < np + nt) { const q = trail[j - np]; o[0] = q.x; o[1] = ICE_Y - 0.07; o[2] = q.z; }
    else { const p = rink[j - np - nt]; o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; }
    pitch(o, S.tilt, -0.3, 0);
    return o;
  };
  // Spurlicht: dunkel, bis die Kufe vorbeizieht; dann hell und glimmend; im letzten Akt leuchtet das ganze Herz und funkelt
  const light = (j, T) => {
    if (j < np) return 1;
    if (j < np + nt) {
      const q = trail[j - np], p = prog(T), behind = (p - q.s) * L;
      const drawn = q.s < STORY.start ? smooth((T - 0.3) / 0.8) : behind < 0 ? 0 : 1; // vor der Startstelle: zu Beginn sacht
      const glow = drawn * (0.55 + 0.75 * Math.exp(-Math.max(0, behind) / 0.35));
      const heart = smooth((T - ACT[2] - 1.5) / 1.5); // das ganze Herz leuchtet auf (auch das letzte Stück bis zur Kerbe)
      return Math.max(0.03, Math.max(glow, heart * sparkle(j, T, 1.0, 1.45)));
    }
    return 0.75;
  };
  const cols = [...colours(P), ...trail.map(() => TRAIL), ...rink.map((p) => (p[1] > ICE_Y - 0.06 ? BOARD : ICE))];
  const atT = (T) => cols.map((c, j) => [...pose(j, T, [0, 0, 0]), ...c]);
  const fitPts = [0, 3, 6, 9, 12, 15, 18, ACT[4]].flatMap((T) => atT(T).map((p) => p.slice(0, 3)));
  const groups = [{ name: 'paar', count: np, rigid: false }, { name: 'spur', count: nt, rigid: false }, { name: 'bahn', count: nr, rigid: false }];
  const caps = ['eislaeufer.theyPartAtTheTip', 'eislaeufer.eachDrawsACurve', 'eislaeufer.theyJoinHands', 'eislaeufer.togetherTheySpinTheHeartShines'];
  return { beats: caps.map((key, a) => ({ pts: atT(ACT[a]), groups, caption: message(key), hold: ACT[a + 1] - ACT[a], fitPts, live: (b, j, t, o) => { const T = ACT[a] + Math.min(Math.max(t, 0), ACT[a + 1] - ACT[a]); /* jedes Bild nur in seinem Abschnitt der Zeitachse */ pose(j, T, o); o[3] = light(j, T); } })), meta: { np, nt, nr, m, f } };
}
/** Winkel weich überblenden (kürzester Weg). */
const lerpAngle = (a, b, u) => { let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * u; };

export const builders = {
  skaters3d: (n, caption) => skaters3d(n, caption),
  skatersStory: (n) => skatersStory(n),
};
export const _internal = { ACT, heartAt, POSES, place };
/** Für die Werkzeuge: Teilname einer Drohne. */
export const _tagOf = (name, n, j) => {
  const lv = level(n), np = share(n, name === 'skaters3d' ? [0.66, 0.2, 0.14] : [0.6, 0.29, 0.11])[0], [m, f] = share(np, [1, 0.97]), P = pairModel(m, f, lv);
  return j < P.m ? 'er:' + P.he.tags[j] : j < P.m + P.fb ? 'sie:' + P.she.tags[j - P.m] : j < np ? 'kleid' : '';
};
