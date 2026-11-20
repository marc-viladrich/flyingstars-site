// Runde 11 (Marc 20.11.2026: große Motive, „channel that level of creativity … into every one of your new drone
// formations“): Erster Tanz auf einem Parkettkreis, Anlass Hochzeit, ab 500 Drohnen in 3D und 3D+ (Kandidat FSK-071).
//
// Bauweise wie der 3D-Fußballer (scenes/catalog-3d/sport.js, docs/katalog-3d.md): Jede Figur besteht aus wenigen klaren
// Körpern (Kopf, Rumpf, Hüfte als Ellipsoide, Glieder als Röhren mit Kammlinie) und wird als Skelett aus Linien gezeichnet,
// nie als Fläche. Beide Figuren entstehen zusammen in der Tanzhaltung (kit.assemble), so fallen Linien weg, wo sich die
// Körper berühren (Hand am Rücken, Hand auf der Schulter, die gefassten Hände), und keine zwei Drohnen stehen aufeinander.
// Bewegt wird über Gelenke: Rumpf und Kopf drehen um Taille und Hals, die Beine des Bräutigams um Hüfte und Knie, die
// Arme folgen ihren Händen (zwei Glieder, Ellbogen zur Seite), so dass ein Arm ein Arm bleibt.
//
// Das Kleid ist eine Kontur aus Taillenreif, Saum und Falten (Kegel aus Linien wie der Rock der Tänzerin in
// scenes/kultur.js), kein Volumen aus Punkten. Es hängt an der Taille der Braut und schwingt mit Nachlauf: Die Drehung des
// Paares zieht den Saum nach außen und hebt ihn an, die Falten bleiben hinter der Drehung zurück; beim Anhalten holt der
// Stoff die Drehung erst nach und legt sich dann (Tiefpass zweiter Ordnung, kritisch gedämpft: kein Zurückschwingen).
// Ab 700 Drohnen trägt die Braut einen Schleier, der denselben Nachlauf hat, und der Bräutigam einen Frack mit Schößen.
//
// Darunter der Parkettkreis: ein Holzring (ab 900 mit Intarsie) und außen ein Kranz kleiner Lichter. In 3D+
// erzählen dieselben Drohnen weiter: Das Paar betritt die Tanzfläche Hand in Hand, wendet sich einander zu, nimmt
// Haltung an und tanzt Walzer auf dem Parkett, zum Schluss lehnt sich die Braut im Dip zurück, und rundherum gehen die
// Lichter an. Keine Wolke mitten im Motiv; jedes Bild beginnt dort, wo das vorige endet.
import { t as message } from '../../../i18n/ui.mjs';
import { WARM, GOLD, ORANGE, BLUE, VIOLET, mix, smooth, yaw, pitch, sparkle, wander, share, TAU } from '../../show-motion.js';
import { ellipsoid, tube, curves, assemble, rankBy } from '../catalog-3d/kit.js';
import { sample3d } from '../../show-shapes.js';

// ---------------------------------------------------------------- Farben ----------
// Kein reines Warmweiß (das färbt der Konfigurator in die Paketfarbe): Haut, Elfenbein und Gold behalten ihren Ton.
const SKIN = [255, 210, 168], HAIR_M = [214, 148, 82], HAIR_W = mix(GOLD, ORANGE, 0.2);
const SUIT = mix(BLUE, WARM, 0.3), SHIRT = [250, 230, 198], DRESS = [252, 230, 196], HEM = mix(GOLD, DRESS, 0.35);
const VEIL = mix(DRESS, VIOLET, 0.18), WOOD = mix(GOLD, ORANGE, 0.5), LAMP = mix(GOLD, WARM, 0.15);

// ---------------------------------------------------------------- Vektoren und Drehungen ----------
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => mul(a, 1 / (len(a) || 1));
const lerp = (a, b, u) => a + (b - a) * u;
const lerp3 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const clamp01 = (u) => Math.max(0, Math.min(1, u));
/** Matrizen zeilenweise [m00, m01, m02, m10, …]. */
const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const mm = (A, B) => [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]));
const mv = (A, v) => [A[0] * v[0] + A[1] * v[1] + A[2] * v[2], A[3] * v[0] + A[4] * v[1] + A[5] * v[2], A[6] * v[0] + A[7] * v[1] + A[8] * v[2]];
/** wie yaw() in show-motion.js: x' = x·c + z·s, z' = −x·s + z·c */
const rotY = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
/** wie roll() in show-motion.js (Drehung in der Bildebene der Figur) */
const rotZ = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
/** Drehung um die Achse d (Einheitsvektor) um w (Rodrigues). */
function rotAxis(d, w) {
  const c = Math.cos(w), s = Math.sin(w), k = 1 - c, [x, y, z] = d;
  return [c + x * x * k, x * y * k - z * s, x * z * k + y * s, y * x * k + z * s, c + y * y * k, y * z * k - x * s, z * x * k - y * s, z * y * k + x * s, c + z * z * k];
}
/** Kleinste Drehung, die die Richtung u auf v bringt. */
function between(u, v) {
  const a = norm(u), b = norm(v), axis = cross(a, b), s = len(axis), c = dot(a, b);
  if (s < 1e-9) return c > 0 ? I3 : rotAxis(norm(Math.abs(a[0]) < 0.9 ? cross(a, [1, 0, 0]) : cross(a, [0, 1, 0])), Math.PI);
  return rotAxis(mul(axis, 1 / s), Math.atan2(s, c));
}
/** Abbildung p → M·p + c */
const xf = (M, c) => ({ M, c });
const apply = (T, p, o) => { const q = mv(T.M, p); o[0] = q[0] + T.c[0]; o[1] = q[1] + T.c[1]; o[2] = q[2] + T.c[2]; return o; };
/** Drehung R um den Drehpunkt a, danach nach b verschoben (b = a: Drehung an Ort und Stelle). */
const pivotXf = (R, a, b = a) => xf(R, sub(b, mv(R, a)));
const compose = (A, B) => xf(mm(A.M, B.M), add(mv(A.M, B.c), A.c)); // erst B, dann A

// ---------------------------------------------------------------- Maße ----------
export const FLOOR = -1; // Höhe des Parketts (Figuren um die Taille gebaut, Kopf bei 0,8)
// Gelenke in den Figurrahmen: x = Blickrichtung, y oben, z = linke Seite der Figur
const MJ = {
  waist: [0, 0.06, 0], neck: [0.006, 0.555, 0],
  shL: [0, 0.465, 0.2], shR: [0, 0.465, -0.2],
  hipL: [0, -0.04, 0.09], kneeL: [0.016, -0.5, 0.095], ankleL: [0, -0.94, 0.095],
  hipR: [0, -0.04, -0.09], kneeR: [0.016, -0.5, -0.095], ankleR: [0, -0.94, -0.095],
};
const FJ = { waist: [0, 0.07, 0], neck: [0, 0.465, 0], shL: [0, 0.385, 0.142], shR: [0, 0.385, -0.142] };
const ARM_M = [0.28, 0.27], ARM_F = [0.255, 0.24]; // Ober- und Unterarm bis zum Handgelenk
/** Tanzhaltung (Bauhaltung): er bei (0, 0) mit Blick nach +x, sie bei W mit Blick nach −x, etwas zu seiner Rechten. */
const W = [0.39, 0, -0.14];
/** Drehpunkt des Paares in der Tanzhaltung (zwischen beiden) */
const CH = [0.195, 0, -0.07];

// ---------------------------------------------------------------- Haltungen ----------
// Je Figur: Ort (x, z) im Paarrahmen, Blickrichtung a (Drehung um die Senkrechte, Bauhaltung er 0, sie −π), Heben dy,
// Rumpfneigung lean (+ = zurück), Kopf nod (+ = zurück), beim Bräutigam die Beinwinkel. Hände: Ziele im Paarrahmen und
// die Richtung, in die der Ellbogen ausweicht.
const HOLD = {
  m: { pos: [0, 0], a: 0, dy: 0, lean: 0.02, nod: 0, hipL: 0, kneeL: 0, footL: 0, hipR: 0, kneeR: 0, footR: 0 },
  f: { pos: [W[0], W[2]], a: -Math.PI, dy: 0, lean: 0.12, nod: 0.12 },
  hands: {
    // gefasste Hände: seine Linke und ihre Rechte, seitlich auf Augenhöhe
    mL: [0.18, 0.555, 0.43], fR: [0.195, 0.585, 0.42],
    // seine Rechte an ihrem linken Schulterblatt, ihre Linke auf seinem rechten Oberarm
    mR: [0.45, 0.27, -0.3], fL: [0.075, 0.5, -0.29],
  },
  poles: { mL: [0, -0.7, 0.6], fR: [0, -0.6, 0.4], mR: [-0.15, 0.15, -1], fL: [0.2, 0.75, -1] },
};
// Ankunft: nebeneinander Hand in Hand, beide mit Blick zum Publikum (+z), er links; ihre äußere Hand rafft das Kleid
const ARRIVE0 = {
  m: { pos: [CH[0] - 0.42, CH[2]], a: -Math.PI / 2, dy: 0, lean: 0, nod: 0, hipL: 0, kneeL: 0, footL: 0, hipR: 0, kneeR: 0, footR: 0 },
  f: { pos: [CH[0] + 0.33, CH[2]], a: -Math.PI / 2, dy: 0, lean: 0.03, nod: -0.05 },
  // Hand in Hand, die äußeren Arme etwas offen (sie rafft das Kleid); kein Arm liegt am eigenen Körper an
  hands: { mR: [CH[0] - 0.035, -0.02, CH[2] + 0.15], fL: [CH[0] + 0.09, 0.01, CH[2] + 0.16], mL: [CH[0] - 0.78, -0.03, CH[2] + 0.04], fR: [CH[0] + 0.7, -0.02, CH[2] + 0.08] },
  poles: { mR: [1, -0.1, -0.25], fL: [-0.5, 0, -0.85], mL: [-1, -0.1, -0.25], fR: [0.8, 0, -0.6] },
};
// sie kommen schräg von hinten links und blicken dorthin, wohin sie gehen: das ganze Paar steht dafür um ARRIVE_TURN
// gedreht (psi); so wendet sich danach jede Figur genau um eine Vierteldrehung der anderen zu
const ARRIVE_TURN = 1.0, ARRIVE = ARRIVE0, ARRIVE_DIR = [Math.sin(ARRIVE_TURN), Math.cos(ARRIVE_TURN)];
/** Handziele der Ankunft im Rahmen der jeweiligen Figur (für die Wendung in die Tanzhaltung) */
const ARRIVE_LOCAL = Object.fromEntries(Object.entries(ARRIVE.hands).map(([k, v]) => { const F = ARRIVE[k[0]], q = mv(rotY(-F.a), [v[0] - F.pos[0], v[1] - F.dy, v[2] - F.pos[1]]); return [k, q]; }));
// Dip: sie lehnt sich weit zurück und schaut nach oben, er beugt sich über sie und geht ins vordere Knie
const DIP = {
  m: { pos: [-0.06, 0.02], a: 0, dy: -0.05, lean: -0.15, nod: -0.2, hipL: -0.2, kneeL: -0.05, footL: 0.12, hipR: 0.24, kneeR: -0.4, footR: 0.14 },
  f: { pos: [W[0] + 0.05, W[2] + 0.01], a: -Math.PI, dy: -0.09, lean: 1.05, nod: 0.5 },
  hands: { mL: [0.1, 0.38, 0.5], fR: [0.115, 0.41, 0.49], mR: null, fL: null }, // mR/fL folgen den Körpern (am Rücken, auf der Schulter)
  poles: { mL: [0, -0.7, 0.6], fR: [0, -0.7, 0.5], mR: [-0.15, 0.15, -1], fL: [0.2, 0.75, -1] },
};

/** Lage eines Punktes einer Figur (Figurrahmen) im Paarrahmen. */
const placeFig = (F, p) => { const q = mv(rotY(F.a), p); return [q[0] + F.pos[0], q[1] + F.dy, q[2] + F.pos[1]]; };
/** Zwei Glieder: Schulter S, Ziel T, Längen L, Ellbogen weicht zu pole aus → Ellbogen und Handgelenk. */
function ik(S, T, [L1, L2], pole) {
  // weich begrenzt: ein fast gestreckter Arm streckt sich nie ganz (sonst springt der Ellbogen)
  const d0 = sub(T, S), L = L1 + L2, r = len(d0), d = r < 0.86 * L ? r : 0.86 * L + 0.11 * L * Math.tanh((r - 0.86 * L) / (0.11 * L)), u = norm(d0);
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  let w = sub(pole, mul(u, dot(pole, u))); if (len(w) < 1e-6) w = Math.abs(u[1]) < 0.9 ? cross(u, [0, 1, 0]) : cross(u, [1, 0, 0]);
  w = norm(w);
  const E = add(add(S, mul(u, a)), mul(w, h));
  return [E, add(S, mul(u, d))];
}

/**
 * Transformationen aller Teile in Haltung P (aus der Bauhaltung HOLD). Liefert je Teilname { M, c } im Paarrahmen und die
 * Lage von Taille und Kopf der Braut (für Kleid und Schleier).
 */
function rigOf(P, B) {
  const out = {}, figs = { m: P.m, f: P.f }, base = { m: HOLD.m, f: HOLD.f }, J = { m: MJ, f: FJ };
  const torso = {};
  for (const k of ['m', 'f']) {
    const F = figs[k], F0 = base[k], j = J[k];
    // Figurrahmen der Bauhaltung → Figurrahmen → Paarrahmen der Haltung
    const toLocal = xf(rotY(-F0.a), mv(rotY(-F0.a), [-F0.pos[0], 0, -F0.pos[1]]));
    const toPair = xf(rotY(F.a), [F.pos[0], F.dy, F.pos[1]]);
    const root = compose(toPair, toLocal);
    const lean = pivotXf(rotZ(F.lean - F0.lean), j.waist), nod = pivotXf(rotZ(F.nod - F0.nod), j.neck);
    torso[k] = compose(toPair, compose(lean, toLocal));
    out[`${k}.rumpf`] = torso[k]; out[`${k}.revers`] = torso[k];
    out[`${k}.kopf`] = compose(toPair, compose(lean, compose(nod, toLocal)));
    out[`${k}.hals`] = out[`${k}.kopf`];
    out[`${k}.hose`] = root;
    out[`${k}.frack`] = root;
    if (k === 'm') for (const s of ['L', 'R']) {
      const hip = pivotXf(rotZ(F[`hip${s}`] - F0[`hip${s}`]), j[`hip${s}`]);
      const knee = compose(hip, pivotXf(rotZ(F[`knee${s}`] - F0[`knee${s}`]), j[`knee${s}`]));
      const foot = compose(knee, pivotXf(rotZ(F[`foot${s}`] - F0[`foot${s}`]), j[`ankle${s}`]));
      out[`m.osch${s}`] = compose(toPair, compose(hip, toLocal));
      out[`m.usch${s}`] = compose(toPair, compose(knee, toLocal));
      out[`m.schuh${s}`] = compose(toPair, compose(foot, toLocal));
    }
  }
  // Arme: Schulter mit dem Rumpf, Hand am Ziel, Ellbogen nach der Ausweichrichtung (zwei Glieder, Längen bleiben)
  const fixed = {
    // seine Rechte bleibt an ihrem Rücken, ihre Linke auf seinem Oberarm: Ziel = Bauziel, mit dem Körper bewegt
    mR: () => apply(torso.f, HOLD.hands.mR, [0, 0, 0]),
    fL: () => apply(torso.m, HOLD.hands.fL, [0, 0, 0]),
  };
  for (const [k, side] of [['m', 'L'], ['m', 'R'], ['f', 'L'], ['f', 'R']]) {
    const key = `${k}${side}`, S0 = B.sh[key], E0 = B.el[key], W0 = B.wr[key];
    const S = apply(torso[k], S0, [0, 0, 0]);
    const h = P.hands[key], T = typeof h === 'function' ? h(S, fixed[key]) : h ?? fixed[key]();
    const [E, Wr] = ik(S, T, k === 'm' ? ARM_M : ARM_F, P.poles[key]);
    const R1 = between(sub(E0, S0), sub(E, S)), R2 = mm(between(mv(R1, sub(W0, E0)), sub(Wr, E)), R1);
    out[`${k}.oarm${side}`] = xf(R1, sub(S, mv(R1, S0)));
    out[`${k}.uarm${side}`] = xf(R2, sub(E, mv(R2, E0)));
  }
  const fw = apply(out['f.hose'], B.fWaist, [0, 0, 0]), fh = apply(out['f.kopf'], B.fBun, [0, 0, 0]);
  return { xf: out, fWaist: fw, fBun: fh, fYaw: P.f.a, fLean: P.f.lean };
}

/** Haltung zwischen zwei Haltungen (u = 0 … 1); Handziele null = folgt dem Körper. */
function blend(A, B, u) {
  const mix1 = (a, b) => { const o = {}; for (const k of Object.keys(a)) o[k] = Array.isArray(a[k]) ? a[k].map((v, i) => lerp(v, b[k][i], u)) : lerp(a[k], b[k], u); return o; };
  const hands = {}, poles = {};
  for (const k of ['mL', 'mR', 'fL', 'fR']) {
    const a = A.hands[k] ?? null, b = B.hands[k] ?? null;
    hands[k] = a && b ? lerp3(a, b, u) : u < 0.5 ? a : b;
    poles[k] = lerp3(A.poles[k], B.poles[k], u);
  }
  return { m: mix1(A.m, B.m), f: mix1(A.f, B.f), hands, poles };
}
// ---------------------------------------------------------------- Körper ----------
/** Stufe der Ausstattung: 0 bis 690 Drohnen, 1 ab 700 (Schleier, Frack, Kammlinien), 2 ab 900 (Parkett-Intarsie). */
export const level = (n) => (n >= 900 ? 2 : n >= 700 ? 1 : 0);

function bodies(lv) {
  const crest = lv >= 1;
  const M = (p) => p; // er steht in der Bauhaltung im Ursprung, Blick +x
  const F = (p) => [W[0] - p[0], p[1], W[2] - p[2]]; // sie: um π gedreht, nach W versetzt
  const limb = (tag, a, b, r0, r1, opts = {}) => tube(tag, [a, b], (s) => r0 + (r1 - r0) * s, { depth: 0.95, hoops: 0, crest, caps: [false, true], ...opts });
  // Arme in der Tanzhaltung: Schulter, Ellbogen, Handgelenk
  const sh = { mL: MJ.shL, mR: MJ.shR, fL: F(FJ.shL), fR: F(FJ.shR) }, el = {}, wr = {};
  for (const [key, L] of [['mL', ARM_M], ['mR', ARM_M], ['fL', ARM_F], ['fR', ARM_F]]) [el[key], wr[key]] = ik(sh[key], HOLD.hands[key], L, HOLD.poles[key]);
  const handAt = (key, k = 0.055) => add(wr[key], mul(norm(sub(wr[key], el[key])), k));
  const parts = [
    // Bräutigam: Kopf mit Haaransatz und Seitenumriss, Hals mit Kragen, Rumpf im Frack, Hüfte, Beine, Schuhe
    ellipsoid('m.kopf', M([0.016, 0.685, 0]), [0.094, 0.114, 0.09], { lat: [0.3], mer: [Math.PI / 2], roll: -0.35, w: 1.3 }),
    tube('m.hals', [M([0.006, 0.53, 0]), M([0.012, 0.61, 0])], 0.046, { hoops: 0, crest: false, caps: [false, false] }),
    ellipsoid('m.rumpf', M([0, 0.3, 0]), [0.135, 0.255, 0.215], { lat: [0.62, -0.56], mer: [Math.PI / 2] }),
    ellipsoid('m.hose', M([0, 0.0, 0]), [0.12, 0.125, 0.19], { mer: crest ? [Math.PI / 2] : [] }),
    limb('m.oschL', MJ.hipL, MJ.kneeL, 0.088, 0.066), limb('m.oschR', MJ.hipR, MJ.kneeR, 0.088, 0.066),
    limb('m.uschL', add(MJ.kneeL, [0, -0.04, 0]), MJ.ankleL, 0.062, 0.046, { caps: [false, false] }), limb('m.uschR', add(MJ.kneeR, [0, -0.04, 0]), MJ.ankleR, 0.062, 0.046, { caps: [false, false] }),
    ellipsoid('m.schuhL', [0.04, -0.962, MJ.ankleL[2]], [0.1, 0.036, 0.05]), ellipsoid('m.schuhR', [0.04, -0.962, MJ.ankleR[2]], [0.1, 0.036, 0.05]),
    // Braut: Kopf mit Haar und Knoten, Hals, Mieder (die Taille ist der Reif des Kleides)
    ellipsoid('f.kopf', F([0, 0.575, 0]), [0.082, 0.1, 0.078], { lat: [0.2], mer: [Math.PI / 2], roll: 0.3, w: 1.3 }),
    ellipsoid('f.kopf', F([-0.078, 0.615, 0.02]), [0.042, 0.042, 0.045], { w: 1.2 }),
    tube('f.hals', [F([0, 0.43, 0]), F([0, 0.505, 0])], 0.034, { hoops: 0, crest: false, caps: [false, false] }),
    ellipsoid('f.rumpf', F([0, 0.255, 0]), [0.09, 0.18, 0.13], { lat: [0.56], mer: [Math.PI / 2] }),
    // Arme beider Figuren, Hände als kleine Körper am Ende des Unterarms
    ...[['m', 'L', 0.054, 0.046, 0.045, 0.037], ['m', 'R', 0.054, 0.046, 0.045, 0.037], ['f', 'L', 0.038, 0.032, 0.031, 0.026], ['f', 'R', 0.038, 0.032, 0.031, 0.026]].flatMap(([k, s, a, b, c, d]) => {
      const key = k + s, h = handAt(key, k === 'm' ? 0.055 : 0.048), hr = k === 'm' ? 0.042 : 0.034;
      return [limb(`${k}.oarm${s}`, sh[key], el[key], a, b, { caps: [false, false], crest: false }), limb(`${k}.uarm${s}`, add(el[key], mul(norm(sub(wr[key], el[key])), 0.035)), wr[key], c, d, { caps: [false, false], crest: false }), ellipsoid(`${k}.uarm${s}`, h, [hr, hr * 0.8, hr * 0.8], { w: 1.2 })];
    }),
  ];
  // Schultergelenke: eine unsichtbare Kugel um jedes Gelenk, in der keine Linie liegt (weder Arm noch Rumpf). Ein Arm dreht
  // um sein Schultergelenk; seine Drohnen halten dabei ihren Abstand zum Gelenk, so streifen sie keine Rumpfdrohne nahe
  // der Schulter, wenn der Arm aus der Tanzhaltung sinkt oder sich hebt
  for (const key of ['mL', 'mR', 'fL', 'fR']) parts.push(ellipsoid('gelenk', sh[key], key[0] === 'm' ? [0.1, 0.1, 0.1] : [0.08, 0.08, 0.08], { silhouette: false }));
  // dasselbe kleiner an Ellbogen und Knien (beim Beugen klappen sonst Ober- und Unterarm aufeinander)
  for (const key of ['mL', 'mR', 'fL', 'fR']) parts.push(ellipsoid('gelenk', el[key], key[0] === 'm' ? [0.05, 0.05, 0.05] : [0.042, 0.042, 0.042], { silhouette: false }));
  for (const k of [MJ.kneeL, MJ.kneeR]) parts.push(ellipsoid('gelenk', k, [0.055, 0.055, 0.055], { silhouette: false }));
  if (lv >= 1) {
    // Frack: zwei spitze Schöße hinten bis zum Knie; Revers als V auf der Brust
    const tail = (z0, z1) => [[-0.118, 0.07, z0], [-0.165, -0.42, (z0 + z1) / 2 + 0.01], [-0.118, 0.07, z1]];
    parts.push(curves('m.frack', [tail(0.13, 0.025), tail(-0.13, -0.025)]));
    const front = (y, z) => [Math.sqrt(Math.max(0, 1 - ((y - 0.3) / 0.255) ** 2 - (z / 0.215) ** 2)) * 0.135 + 0.012, y, z];
    parts.push(curves('m.revers', [[front(0.52, 0.075), front(0.42, 0.04), front(0.3, 0)], [front(0.52, -0.075), front(0.42, -0.04), front(0.3, 0)]]));
  }
  const hands = Object.fromEntries(['mL', 'mR', 'fL', 'fR'].map((k) => [k, handAt(k, k[0] === 'm' ? 0.055 : 0.048)]));
  return { parts, sh, el, wr, hands };
}
const BODY_COLOUR = {
  'm.kopf': (p) => (p[1] > 0.705 || (p[0] < -0.02 && p[1] > 0.64) ? HAIR_M : SKIN), 'm.hals': (p) => (p[1] < 0.56 ? SHIRT : SKIN), 'm.rumpf': SUIT, 'm.hose': SUIT,
  'm.oschL': SUIT, 'm.oschR': SUIT, 'm.uschL': SUIT, 'm.uschR': SUIT, 'm.schuhL': GOLD, 'm.schuhR': GOLD, 'm.frack': SUIT, 'm.revers': SHIRT,
  'f.kopf': (p) => (p[1] > 0.6 || p[0] > W[0] + 0.035 ? HAIR_W : SKIN), 'f.hals': SKIN, 'f.rumpf': DRESS,
};
const armColour = (tag, p, hand) => (tag[0] === 'w' ? SKIN : hand ? SKIN : SUIT);

// ---------------------------------------------------------------- Kleid ----------
// Drohnen als Parameter [θ, v, Art]: θ Richtung um die Taille im Figurrahmen der Braut (0 = vorn zum Bräutigam),
// v 0 an der Taille … 1 am Saum. Arten: 0 Taillenreif, 1 Saum, 2 Falte.
const DRESS_HEM = FLOOR + 0.035;
/** Saumweite ohne Drehung: vorn knapp (dort stehen seine Füße), hinten weit. */
const hemR = (th) => 0.35 - 0.15 * Math.cos(th);
function dressParams(m, lv) {
  // Kontur: Taillenreif, Saum, Falten (ab 700 zehn statt acht); Faltenlänge gut 0,95, Saum im Mittel 0,35 Halbmesser
  const folds = lv >= 1 ? 10 : 8, [nw, nh, nf] = share(m, [TAU * 0.1 * 0.55, TAU * 0.5, folds * 0.95]), per = share(nf, Array(folds).fill(1)), out = [];
  for (let i = 0; i < nw; i++) out.push([((i + 0.5) / nw) * TAU, 0, 0]);
  for (let i = 0; i < nh; i++) out.push([(i / nh) * TAU, 1, 1]);
  per.forEach((k, f) => { const th = ((f + 0.5) / folds) * TAU; for (let i = 0; i < k; i++) out.push([th, 0.14 + 0.82 * ((i + 0.5) / k), 2]); });
  return out;
}
/**
 * Lage einer Kleiddrohne im Figurrahmen der Braut (Taille im Ursprung). S = Schwung: flare 0 … 1 (Saum nach außen und
 * oben), dir Richtung des Schwungs (im Figurrahmen), twist Nachlauf der Falten (rad am Saum), wave Wellen im Saum.
 */
function dressAt([th0, v, kind], S, waistY) {
  // die Falten laufen der Drehung nach (twist), die Form des Saums bleibt dabei im Raum stehen: vorn knapp, außen weit
  const th = th0 + S.twist * v ** 1.4, bulge = (0.5 + 0.5 * Math.cos(th - S.dir)) ** 1.2; // nach außen weit, vorn (zu ihm) knapp
  const hem = hemR(th) + S.flare * 0.38 * bulge;
  const rw = kind === 0 ? 0.105 : 0.1, R = rw + (hem - rw) * v ** 0.7;
  const ripple = (0.02 + 0.015 * S.flare) * Math.sin(6 * th0 - S.wave);
  const hemY = DRESS_HEM + S.flare * 0.2 * bulge + (kind === 2 ? 0 : ripple);
  const y = waistY + (hemY - waistY) * v + (kind === 2 ? ripple * v ** 3 : 0);
  return [R * Math.cos(th), y, R * Math.sin(th)];
}

// ---------------------------------------------------------------- Schleier (ab 700) ----------
/** Drohnen als Weg um den Schleier: links hinab, unten herum, rechts hinauf (u 0 … 1). */
function veilAt(u, S, lean) {
  // im Figurrahmen der Braut (Blick +x, Knoten im Ursprung): ein Tüll, der vom Knoten nach hinten unten fällt und sich
  // nach unten weitet, als halbe Tüte um den Rücken gelegt (zwei Kanten, ein Grat hinten, unten ein Saum); mit dem
  // Schwung wird er nach außen getragen und hebt sich etwas (wie der Saum, gleicher Nachlauf)
  const Lv = 0.62, fl = S.flare;
  // Weg: linke Kante hinab (0–0,28), Saum (0,28–0,5), rechte Kante hinauf (0,5–0,78), Grat hinab (0,78–1)
  let s, side;
  if (u < 0.28) { s = u / 0.28; side = -1; } else if (u < 0.5) { s = 1; side = -1 + 2 * ((u - 0.28) / 0.22); } else if (u < 0.78) { s = 1 - (u - 0.5) / 0.28; side = 1; } else { s = 0.12 + 0.86 * ((u - 0.78) / 0.22); side = 0; }
  const out = [Math.cos(S.dir), 0, Math.sin(S.dir)], sideDir = [-out[2], 0, out[0]];
  const drop = norm([-0.22 - 0.6 * Math.min(1, lean), -1, 0]), sw = s * s;
  const c = add(add(mul(drop, Lv * s * (1 - 0.18 * fl)), mul(out, fl * 0.22 * Lv * sw)), [0, fl * 0.06 * sw, 0]);
  const width = 0.05 + 0.19 * s ** 0.7 * (1 + 0.2 * fl), bulge = 0.75 * width * (1 - side * side);
  const sag = u >= 0.28 && u < 0.5 ? 0.03 * (1 - side * side) : 0;
  return [c[0] + sideDir[0] * side * width + out[0] * bulge, c[1] - sag, c[2] + sideDir[2] * side * width + out[2] * bulge];
}

// ---------------------------------------------------------------- Parkett und Lichter ----------
const FLOOR_R = { lights: 1.42, outer: 1.26, inlay: 0.94 };
/** Parkettkreis: Lichterkranz außen, Holzring, ab 900 eine Zickzack-Intarsie. Liefert Punkte und Art je Drohne. */
function floorRing(m, lv) {
  // zwei Ringe: außen der Lichterkranz, innen der Holzrand des Parketts (Fugen als einzelne Punkte wirkten wie Streulicht);
  // ab 900 innen ein Zickzackband als Intarsie (Fischgrät angedeutet)
  const [nl, no, nz = 0] = share(m, lv >= 2 ? [0.3, 0.38, 0.32] : [0.38, 0.62]), pts = [], kind = [];
  const ringPts = (k, R, ph = 0) => Array.from({ length: k }, (_, i) => { const a = ((i + ph) / k) * TAU; return [Math.cos(a) * R, FLOOR, Math.sin(a) * R]; });
  for (const p of ringPts(nl, FLOOR_R.lights, 0.5)) { pts.push(p); kind.push('licht'); }
  for (const p of ringPts(no, FLOOR_R.outer)) { pts.push(p); kind.push('holz'); }
  if (nz) {
    const teeth = 30, zig = Array.from({ length: 2 * teeth }, (_, i) => { const a = (i / (2 * teeth)) * TAU, r = FLOOR_R.inlay + (i % 2 ? 0.05 : -0.05); return [Math.cos(a) * r, FLOOR, Math.sin(a) * r]; });
    for (const p of sample3d([{ pts: zig, closed: true }], nz)) { pts.push(p); kind.push('intarsie'); }
  }
  return { pts, kind, lights: nl };
}

// ---------------------------------------------------------------- Modell ----------
const cache = new Map();
/**
 * Das Paar mit Kleid, Schleier und Parkett, genau n Drohnen, in der Bauhaltung (Tanzhaltung) im Paarrahmen.
 * Reihenfolge: Körper (nb), Kleid (nd), Schleier (nv), Parkett (nf). tags je Drohne.
 */
export function model(n) {
  if (cache.has(n)) return cache.get(n);
  const lv = level(n), { parts, sh, el, wr, hands } = bodies(lv);
  // Anteile: das Paar trägt das Bild, das Kleid ein Fünftel, das Parkett ist nur angedeutet
  const [nb, nd, nv, nf] = share(n, lv >= 2 ? [0.53, 0.18, 0.05, 0.24] : lv >= 1 ? [0.57, 0.19, 0.055, 0.185] : [0.59, 0.21, 0, 0.2]);
  const body = assemble(parts, nb);
  const pts = body.pts.map((p, j) => { const tag = body.tags[j], c = BODY_COLOUR[tag] ?? armColour(tag, p, isHand(tag, p, hands)); return [p[0], p[1], p[2], ...(typeof c === 'function' ? c(p) : c)]; });
  const dress = dressParams(nd, lv), floor = floorRing(nf, lv);
  const B = { sh, el, wr, fWaist: [W[0], 0.03, W[2]], fBun: [W[0] + 0.085, 0.615, W[2] - 0.02] };
  const res = { n, lv, nb, nd, nv, nf, tags: body.tags, body: pts, dress, floor, B };
  cache.set(n, res);
  return res;
}
const isHand = (tag, p, hands) => tag.includes('uarm') && len(sub(p, hands[tag[0] + tag.slice(-1)])) < 0.06;

// ---------------------------------------------------------------- Bewegung ----------
/** Ansicht: das Paar von etwas oben (die Bühne kippt zusätzlich um 0,14), langsam hin und her. */
const VIEW = { pitch: 0.24, yaw: 0.0 };
const Y0 = -0.1; // Drehpunkt der Kippung
function view(o, vy) { yaw(o, vy); pitch(o, VIEW.pitch, Y0, 0); return o; }

/**
 * Nachlauf: ein Tiefpass zweiter Ordnung (kritisch gedämpft, kein Überschwingen) über einer Zielgröße x(u), als Tabelle
 * über die Motivzeit; tau Zeitkonstante.
 */
function lagTable(x, T, tau, dt = 0.01) {
  const N = Math.ceil(T / dt) + 2, out = new Float64Array(N), w = 1 / tau;
  let y = x(0), v = 0;
  for (let i = 0; i < N; i++) { out[i] = y; for (let s = 0; s < 4; s++) { const h = dt / 4, a = w * w * (x(i * dt + s * h) - y) - 2 * w * v; v += a * h; y += v * h; } }
  return (u) => { const f = Math.max(0, Math.min(N - 1.001, u / dt)), i = Math.floor(f); return out[i] + (out[i + 1] - out[i]) * (f - i); };
}
/** Weg einer Bewegung, die bei u0 sanft anläuft, gleichmäßig läuft und bis u1 sanft zum Stehen kommt (Fläche = 1). */
function cruise(u0, u1, ramp) {
  const body = u1 - u0 - ramp, total = body; // Rampen je ramp, Geschwindigkeit 1/total in der Mitte
  const up = (x) => x * x * x - (x * x * x * x) / 2; // ∫ smooth
  return (u) => {
    if (u <= u0) return 0;
    if (u >= u1) return 1;
    const t = u - u0;
    if (t < ramp) return (ramp * up(t / ramp)) / total;
    if (t < u1 - u0 - ramp) return (ramp / 2 + (t - ramp)) / total;
    const w = (t - (u1 - u0 - ramp)) / ramp;
    return (ramp / 2 + (u1 - u0 - 2 * ramp) + ramp * (w - up(w))) / total;
  };
}
const speedOf = (f, u, h = 0.01) => (f(u + h) - f(u - h)) / (2 * h);

/**
 * Ein Bild des Paares: state(u) → { pose, pc (Mitte des Paares auf dem Parkett), psi (Drehung des Paares), S (Schwung
 * des Kleides im Figurrahmen der Braut), vy (Ansicht), light(j, kind) }. Liefert pts, live, fitPts.
 */
function scene(M, state, hold, extraLight, floorLift) {
  const n = M.n, { nb, nd, nv } = M, dressStart = nb, veilStart = nb + nd, floorStart = nb + nd + nv;
  const rank = rankBy(M.body, (p) => -p[1]);
  let at = NaN, st = null, rig = null, Mf = null, toWorld = null;
  const frame = (u) => {
    if (u === at) return;
    at = u; st = state(u); rig = rigOf(st.pose, M.B);
    const c = Math.cos(st.psi), s = Math.sin(st.psi);
    toWorld = (p, o) => { const x = p[0] - CH[0], z = p[2] - CH[2]; o[0] = st.pc[0] + x * c + z * s; o[1] = p[1]; o[2] = st.pc[1] - x * s + z * c; return o; };
    Mf = rotY(rig.fYaw);
  };
  const tmp = [0, 0, 0];
  const live = (b, j, u, o) => {
    frame(u);
    if (j < nb) {
      const T = rig.xf[M.tags[j]], p = M.body[j];
      apply(T, p, tmp); toWorld(tmp, o);
      o[3] = extraLight?.(j, 'body', u, st) ?? wander(rank[j], u, 7, 0.18, 0.1);
    } else if (j < veilStart) {
      const q = dressAt(M.dress[j - dressStart], st.S, rig.fWaist[1]), r = mv(Mf, q); // Saum bleibt am Boden, auch wenn sie tiefer geht
      tmp[0] = r[0] + rig.fWaist[0]; tmp[1] = r[1]; tmp[2] = r[2] + rig.fWaist[2];
      toWorld(tmp, o);
      const k = M.dress[j - dressStart][2];
      o[3] = extraLight?.(j, 'dress', u, st) ?? (k === 1 ? 1 + 0.25 * st.S.flare * (0.5 + 0.5 * Math.sin(6 * M.dress[j - dressStart][0] - st.S.wave)) : 1);
    } else if (j < floorStart) {
      const k = (j - veilStart + 0.5) / nv, q = veilAt(k, st.S, st.pose.f.lean), r = mv(Mf, q);
      tmp[0] = r[0] + rig.fBun[0]; tmp[1] = r[1] + rig.fBun[1]; tmp[2] = r[2] + rig.fBun[2];
      toWorld(tmp, o);
      o[3] = extraLight?.(j, 'veil', u, st) ?? 0.85;
    } else {
      const p = M.floor.pts[j - floorStart]; o[0] = p[0]; o[1] = p[1] + (floorLift?.(j, M.floor.kind[j - floorStart], u) ?? 0); o[2] = p[2];
      o[3] = extraLight?.(j, M.floor.kind[j - floorStart], u, st) ?? (M.floor.kind[j - floorStart] === 'licht' ? 1.05 : 0.9);
    }
    view(o, st.vy);
  };
  const colours = [...M.body.map((p) => p.slice(3)), ...M.dress.map(([, , k]) => (k === 1 ? HEM : DRESS)), ...Array.from({ length: nv }, () => VEIL), ...M.floor.kind.map((k) => (k === 'licht' ? LAMP : k === 'intarsie' ? mix(WOOD, GOLD, 0.4) : WOOD))];
  const posAt = (u) => colours.map((c, j) => { const o = [0, 0, 0, 1]; live(null, j, u, o); return [o[0], o[1], o[2], ...c]; });
  const pts = posAt(0);
  const fitPts = [0, 0.2, 0.4, 0.6, 0.8, 1].flatMap((f) => posAt(f * hold).map((p) => p.slice(0, 3)));
  return { pts, live, fitPts, hold };
}
const groupsOf = (M) => [{ name: 'paar', count: M.nb, rigid: false }, { name: 'kleid', count: M.nd, rigid: false }, ...(M.nv ? [{ name: 'schleier', count: M.nv, rigid: false }] : []), { name: 'parkett', count: M.nf, rigid: false }];

// ---------------------------------------------------------------- Walzer ----------
/**
 * Der Walzer über die Motivzeit u: Drehung des Paares (psi), Heben und
 * Senken im Dreivierteltakt, Schritte, Schwung des Kleides mit Nachlauf.
 * from/to: Beginn und Ende der Drehung; turns: Umdrehungen. Das Paar dreht sich an Ort und Stelle (ein Kreis über das Parkett
 * hin und zurück wäre eine Gegenbewegung, scripts/show-finte.test.mjs).
 */
const BAR = 2.1; // ein Takt (drei Schläge) in s
function waltz({ from, to, ramp = 1.6, turns, psi0 = 0, tauFlare = 0.55, tauTwist = 0.42, wave0 = 0 }) {
  const go = cruise(from, to, ramp), psi = (u) => psi0 - TAU * turns * go(u);
  const T = to + 6;
  const omega = (u) => -speedOf(psi, u); // > 0: Drehung, die yaw() positiv dreht
  const peak = Math.max(1e-6, (TAU * turns) / (to - from - ramp));
  const flare = lagTable((u) => Math.min(1, omega(u) / peak), T, tauFlare), twist = lagTable((u) => Math.min(1, omega(u) / peak), T, tauTwist);
  const on = (u) => smooth((u - from) / ramp) * (1 - smooth((u - to + ramp * 0.4) / (ramp * 0.9)));
  return {
    psi, go,
    bob: (u) => 0.022 * on(u) * (0.5 - 0.5 * Math.cos((TAU * (u - from)) / BAR)),
    step: (u) => on(u) * Math.sin((TAU * (u - from)) / BAR),
    // Schwung im Figurrahmen der Braut: nach außen (ihr Rücken, −x) und hinter der Drehung zurück
    S: (u) => { const f = flare(u), tw = twist(u); return { flare: f, dir: Math.PI - 0.55 * f, twist: 0.4 * tw, wave: wave0 + 1.4 * u + 0.8 * go(u) * (to - from) }; },
  };
}
/** Handziele mit dem Heben und Senken des Paares */
const lifted = (hands, dy) => Object.fromEntries(Object.entries(hands).map(([k, v]) => [k, typeof v === 'function' || !v ? v : [v[0], v[1] + dy, v[2]]]));
const legs = (step, bend) => ({ hipL: 0.11 * step, kneeL: -0.1 * bend - 0.09 * ((1 + step) / 2) ** 2, footL: 0.04 * step, hipR: -0.08 * step - 0.02 * step * step, kneeR: -0.1 * bend - 0.09 * ((1 - step) / 2) ** 2, footR: -0.04 * step });

// ---------------------------------------------------------------- Fassungen ----------
/** 3D (HORIZON): das Paar dreht sich im Walzer über den Parkettkreis, das Kleid schwingt mit Nachlauf. */
const HOLD3D = 11;
function firstDance3d(n, caption) {
  const M = model(n), wz = waltz({ from: 0.4, to: 9.2, turns: 2, psi0: PSI_W });
  const state = (u) => {
    const bob = wz.bob(u), step = wz.step(u), pose = { ...HOLD, hands: lifted(HOLD.hands, bob), m: { ...HOLD.m, dy: bob, ...legs(step, bob / 0.022) }, f: { ...HOLD.f, dy: bob } };
    return { pose, pc: [0, 0], psi: wz.psi(u), S: wz.S(u), vy: 0 };
  };
  const lamp = (j, kind, u) => (kind === 'licht' ? sparkle(j, u, 0.9, 1.3) : undefined);
  const s = scene(M, state, HOLD3D, lamp);
  return { beats: [{ ...s, caption, groups: groupsOf(M) }] };
}

/** 3D+ (ODYSSEY): Ankunft Hand in Hand, Tanzhaltung und Walzer, Dip, rundherum gehen die Lichter an. */
const ARRIVE_HOLD = 5.2, TAKE_HOLD = 4.3, WALTZ_HOLD = 10.8, DIP_HOLD = 7.5;
/** Drehung des Paares im Walzer und im Dip: die Braut steht genau seitlich, die Figuren quer zum Publikum (dann laufen
 * Kleid und Schleier beim Drehen gleichmäßig hin und her, ohne angeschnittenen ersten Bogen) */
const PSI_W = Math.atan2(W[2] - CH[2], W[0] - CH[0]);
function firstDanceStory(n) {
  const M = model(n), F = M.floor;
  // Lichter: in den ersten Bildern ein schwacher Kranz, im Dip laufen sie von vorn aus nach hinten an
  const lampAngle = (j) => { const p = F.pts[j - (M.nb + M.nd + M.nv)]; return Math.atan2(p[0], p[2]); }; // 0 = vorn (zum Publikum)
  // Akt 1: sie kommen von hinten über das Parkett nach vorn in die Mitte; der Parkettkreis zeichnet sich
  const walk = cruise(0.3, 4.4, 1.1), start = [-0.74 * ARRIVE_DIR[0], -0.74 * ARRIVE_DIR[1]];
  const s1 = scene(M, (u) => {
    const w = walk(u), walking = smooth((u - 0.3) / 1.3) * (1 - smooth((u - 3.3) / 1.3)), stride = Math.sin(TAU * (u - 0.3) / 2.2) * walking;
    const pose = { ...ARRIVE, m: { ...ARRIVE.m, hipL: 0.17 * stride, kneeL: -0.13 * ((1 - stride) / 2) ** 2 * walking, hipR: -0.17 * stride, kneeR: -0.13 * ((1 + stride) / 2) ** 2 * walking, footL: 0.06 * stride, footR: -0.06 * stride } };
    return { pose, pc: [start[0] * (1 - w), start[1] * (1 - w)], psi: ARRIVE_TURN, S: { flare: 0, dir: Math.PI, twist: 0, wave: 1.4 * u }, vy: 0 };
  }, ARRIVE_HOLD, (j, kind, u) => {
    if (kind === 'holz' || kind === 'intarsie') { const a = (lampAngle(j) / TAU + 1) % 1; return 0.35 + 0.65 * smooth((u - 0.2 - 2.2 * a) / 0.5); }
    if (kind === 'licht') return 0.3;
    return undefined;
  });
  // Akt 2a: erst lösen sich die gefassten Hände (jede geht zur eigenen Seite zurück), dann wenden sich beide einander zu und
  // nehmen Haltung an; das Paar dreht sich dabei so, dass es danach quer vor euch steht
  const LET = 1.0, TURN = 3.1;
  const RELEASED = { mR: add(ARRIVE_LOCAL.mR, [0.06, -0.05, 0.02]), fL: add(ARRIVE_LOCAL.fL, [0.06, -0.05, -0.05]) }; // im Rahmen der Figur
  const s2 = scene(M, (u) => {
    const g = smooth((u - LET) / TURN), r = smooth(u / LET);
    const base = blend(ARRIVE, HOLD, g), hands = { ...base.hands };
    if (g < 1) {
      // in der Wendung gehen die Hände mit dem Körper mit (Ziel im Rahmen der Figur), dann zum Ziel der Tanzhaltung
      const from = (k) => placeFig(base[k[0]], k === 'mR' || k === 'fL' ? lerp3(ARRIVE_LOCAL[k], RELEASED[k], r) : ARRIVE_LOCAL[k]);
      const kf = smooth((g - 0.05) / 0.7), km = smooth((g - 0.3) / 0.7), ko = smooth(g), bump = (k, F, v, w) => add(lerp3(from(k), HOLD.hands[k], w), mul(mv(rotY(F.a), v), Math.sin(Math.PI * w)));
      // ihre Linke hebt sich zuerst im Bogen auf seinen Oberarm, seine Rechte geht danach unten herum an ihren Rücken; die
      // äußeren Arme gehen zur Seite hinaus in die gefassten Hände
      hands.fL = add(lerp3(from('fL'), HOLD.hands.fL, kf), mul([0.06, 0.08, -0.22], Math.sin(Math.PI * kf)));
      hands.mR = bump('mR', base.m, [0.04, -0.06, -0.18], km);
      hands.mL = bump('mL', base.m, [0.06, 0.04, 0.16], ko);
      hands.fR = bump('fR', base.f, [0.06, 0.04, -0.16], ko);
    }
    return { pose: { ...base, hands }, pc: [0, 0], psi: lerp(ARRIVE_TURN, PSI_W, smooth((u - LET) / (TURN + 0.3))), S: { flare: 0, dir: Math.PI, twist: 0, wave: 1.4 * (ARRIVE_HOLD + u) }, vy: 0 };
  }, TAKE_HOLD, (j, kind) => (kind === 'licht' ? 0.3 : undefined));
  // Akt 2b: Walzer, zwei Umdrehungen auf dem Parkett, das Kleid schwingt mit Nachlauf
  const wz = waltz({ from: 0.2, to: 9.1, turns: 2, psi0: PSI_W, wave0: 1.4 * (ARRIVE_HOLD + TAKE_HOLD) });
  const s2b = scene(M, (u) => {
    const bob = wz.bob(u), step = wz.step(u);
    const pose = { ...HOLD, hands: lifted(HOLD.hands, bob), m: { ...HOLD.m, dy: bob, ...legs(step, bob / 0.022) }, f: { ...HOLD.f, dy: bob } };
    return { pose, pc: [0, 0], psi: wz.psi(u), S: wz.S(u), vy: 0 };
  }, WALTZ_HOLD, (j, kind) => (kind === 'licht' ? 0.3 : undefined));
  // Akt 3: Dip; dann laufen die Lichter an (von vorn nach beiden Seiten bis hinten) und funkeln
  const DIPT = 2.4, lampOn = (j) => DIPT + 0.2 + 2.2 * (Math.abs(lampAngle(j)) / Math.PI);
  const s3 = scene(M, (u) => {
    const g = smooth(u / DIPT), pose = blend(HOLD, DIP, g), k = smooth((u - 0.5) / (DIPT + 0.6));
    // seine Rechte gleitet vom Schulterblatt an ihre Taille und stützt sie dort; ihre Linke öffnet sich weit zur Seite
    pose.hands.mR = (S, onBack) => lerp3(onBack(), [DIP.f.pos[0] + 0.1, 0.12, W[2] - 0.2], k);
    pose.hands.fL = (S, onArm) => lerp3(onArm(), add(S, [0.12, -0.2, -0.44]), k);
    return { pose, pc: [0, 0], psi: PSI_W, S: wz.S(WALTZ_HOLD + u), vy: 0.1 * smooth((u - 1) / 5) };
  }, DIP_HOLD, (j, kind, u) => {
    if (kind !== 'licht') return undefined;
    const t0 = lampOn(j), on = smooth((u - t0) / 0.45);
    return 0.3 + on * (sparkle(j, u, 0.95, 1.4) - 0.3) + 0.55 * Math.exp(-(((u - t0 - 0.5) / 0.35) ** 2));
  }, (j, kind, u) => (kind === 'licht' ? 0.17 * smooth((u - lampOn(j) + 0.15) / 0.9) : 0));
  const g = groupsOf(M);
  return { beats: [
    { ...s1, groups: g, caption: message('ersterTanz.theyStepOntoTheFloor') },
    { ...s2, groups: g, caption: message('ersterTanz.theyTakeHold') },
    { ...s2b, groups: g, caption: message('ersterTanz.andWaltz') },
    { ...s3, groups: g, caption: message('ersterTanz.aDipAndTheLightsComeOn') },
  ] };
}
const add3 = ([x, z], [a, b]) => [x + a, z + b];

export const builders = {
  firstDance3d: (n, caption) => firstDance3d(n, caption),
  firstDanceStory: (n) => firstDanceStory(n),
};
