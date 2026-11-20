import { t as message } from '../../../i18n/ui.mjs';
// Runde 10b (Marc 20.11.2026: „der ganze Drachenflug sieht sehr scheiße aus … im Vergleich mit den Delfinen sieht der
// Drache mega krass 2D aus … In 3D eher diesen Dragon Flying Upward und in 3D+ sowas wie den Aztec Style Dragon Head,
// aber mehr mit einem 3D-Effekt“). Zwei neue Fassungen des Drachen, gebaut wie die Körper aus dem Baukasten (kit.js):
//
//   dragonRise (3D, 200–290): ein Drache steigt senkrecht auf. Der Rumpf ist eine Röhre (Seitenlinien, Kammlinie,
//     Querschnitt-Reifen), der Schwanz eine räumliche Spirale unter ihm, die Flügel sind nach hinten gepfeilt (Spannweite
//     in die Tiefe) und schlagen um eine schräge Achse durch die Schulter. Der Körper schwenkt langsam aus der
//     Dreiviertelansicht, damit die Tiefe zu sehen ist.
//   dragonHead (3D+, ab 300, bis 1000): ein Drachenkopf mit stufiger, aztekisch-geometrischer Linienführung als Relief:
//     Mittelprofil, eingerückte Seitenflächen auf beiden Seiten (bei mehr Drohnen eine zweite, erhabene Stufe), Reifen
//     quer durch Oberkopf und Kiefer, ein Federkranz auf einem Kegel um den Hinterkopf, Ranken als Kamm. Dahinter eine
//     Sonnenscheibe. Vier Akte: der Kopf zeichnet sich im Profil, dreht sich zum Publikum, öffnet das Maul, und die
//     Sonnenscheibe wird zum Feuerstrom aus dem Maul. Mehr Drohnen bringen mehr Teile (Stufen, Federkiele und -äste,
//     Barteln, Augenspirale, Strahlen), nicht nur dichtere Linien.
// Die alte Fassung (scenes/festival.js, dragon3d/dragonStory) bleibt im Code. Wächter: scripts/drache.test.mjs.
import { TAU, GOLD, ORANGE, RED, CYAN, BLUE, WARM, DIAMOND, mix, smooth, frac, yaw, roll, chase, trace, lightRank, part, act } from '../../show-motion.js';
import { tube, ellipsoid, curves, spot, assemble, turnAbout } from './kit.js';

const lerp = (a, b, u) => a + (b - a) * u;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const addv = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
/** Stückweise linear: Stützstellen xs (aufsteigend), Werte ys. */
const table = (xs, ys) => (x) => { if (x <= xs[0]) return ys[0]; for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return lerp(ys[i - 1], ys[i], (x - xs[i - 1]) / (xs[i] - xs[i - 1])); return ys[ys.length - 1]; };
/** Catmull-Rom durch Kontrollpunkte (3D), per Stücke je Abschnitt. */
function spline(ctrl, per = 10) {
  const out = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const u = k / per, u2 = u * u, u3 = u2 * u;
      out.push([0, 1, 2].map((q) => 0.5 * (2 * p1[q] + (p2[q] - p0[q]) * u + (2 * p0[q] - 5 * p1[q] + 4 * p2[q] - p3[q]) * u2 + (3 * p1[q] - p0[q] - 3 * p2[q] + p3[q]) * u3)));
    }
  }
  out.push(ctrl[ctrl.length - 1].slice());
  return out;
}
/** Quadratische Bézierkurve von a nach b mit Kontrollpunkt c (2D), k Stücke. */
const quad = (a, b, c, k = 8) => Array.from({ length: k + 1 }, (_, i) => { const u = i / k, v = 1 - u; return [v * v * a[0] + 2 * u * v * c[0] + u * u * b[0], v * v * a[1] + 2 * u * v * c[1] + u * u * b[1]]; });
/** Spirale um c (2D): Radius r0 → r1 über turns Umdrehungen ab Winkel a0 (Richtung dir = ±1). */
const spiral = (c, r0, r1, a0, turns, dir = 1, k = 36) => Array.from({ length: k + 1 }, (_, i) => { const u = i / k, a = a0 + dir * u * turns * TAU, r = lerp(r0, r1, u); return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]; });
/** Länge einer Polylinie (3D). */
const polyLen = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(...sub(pts[i], pts[i - 1])); return L; };

// =====================================================================================================================
// 3D: der aufsteigende Drache
// =====================================================================================================================
const SHOULDER = [-0.03, 0.3, -0.07];
const FLAP_AXIS = norm([0, 0.45, 1]); // schräg: der Flügelschlag hebt die Spitzen und schiebt sie zugleich in die Tiefe
const BEAT = 2.6; // s je Flügelschlag (Drohnengrenzen: Spitze < 0,6 Anzeigeeinheiten/s)

/** Der Drache in Ruhelage: Teile für assemble() und das Rückgrat (Schwanzspitze → Kopf) für den Lichtlauf. */
function riseParts(n) {
  const L1 = n >= 250; // ab 250: Rückenstacheln, Daumenkralle, mehr Reifen, Doppelspitze am Schwanz
  const L2 = n >= 300; // 3D+ (Drachenflug ab 400): Beine mit Krallen, Bauchschuppen, Flughautrippen, noch mehr Reifen
  // Schwanz: eine Spirale unter dem Körper, um eine gekippte Ebene (vorn tiefer, zum Publikum hin), endet vorn
  const TURNS = 1.2, A0 = Math.PI / 2 - TURNS * TAU, C = [-0.04, -0.86];
  const coil = Array.from({ length: 73 }, (_, i) => { const u = i / 72, a = A0 + u * TURNS * TAU, r = 0.1 + 0.52 * u; return [C[0] + r * Math.cos(a), C[1] + 0.55 * r * Math.sin(a) + 0.06 * u, 0.62 * r * Math.sin(a)]; });
  const bodyCtrl = [coil[66], coil[72], [-0.26, -0.42, 0.36], [-0.2, -0.16, 0.2], [-0.1, 0.06, 0.1], [-0.03, 0.28, 0.04], [0.03, 0.54, 0.03], [0.1, 0.78, 0.05], [0.2, 0.95, 0.08], [0.32, 1.02, 0.1]];
  const axis = spline(bodyCtrl, 10).slice(10); // ab dem Ende der Spirale
  const R = table([0, 0.18, 0.45, 0.72, 0.88, 1], [0.03, 0.07, 0.105, 0.085, 0.065, 0.06]);
  const body = tube('body', axis, R, { hoopAt: L2 ? [0.14, 0.26, 0.38, 0.5, 0.62, 0.74, 0.86] : L1 ? [0.2, 0.36, 0.52, 0.68, 0.84] : [0.28, 0.52, 0.76], crest: true, caps: [false, false] });
  const tailTip = coil[0], d = norm(sub(coil[0], coil[2]));
  const side = norm([d[2], 0, -d[0]]), up = [0, 1, 0];
  const spade = (o) => ({ pts: [tailTip, addv(addv(tailTip, scale(d, 0.06)), scale(o, 0.055)), addv(tailTip, scale(d, 0.15)), addv(addv(tailTip, scale(d, 0.06)), scale(o, -0.055))], closed: true });
  const parts = [body, curves('tail', [coil, spade(up), ...(L1 ? [spade(side)] : [])])];
  // Rückenstacheln (zeigen nach hinten, weg vom Publikum): beim Schwenken stehen sie seitlich ab
  const cum = [0]; for (let i = 1; i < axis.length; i++) cum.push(cum[i - 1] + Math.hypot(...sub(axis[i], axis[i - 1])));
  const atS = (s) => { const L = s * cum.at(-1); let i = 1; while (i < cum.length - 1 && cum[i] < L) i++; return i; };
  if (L1) parts.push(curves('spike', [0.3, 0.44, 0.58, 0.72, 0.84].map((s) => { const p = axis[atS(s)], r = R(s), b = [0, 0, -1]; return [addv(addv(p, [0, -0.04, 0]), scale(b, r)), addv(addv(p, [0, 0.03, 0]), scale(b, r + 0.075)), addv(addv(p, [0, 0.04, 0]), scale(b, r))]; })));
  if (L2) {
    // Bauchschuppen: halbe Reifen über die Vorderseite (zum Publikum), dicht zwischen den Querschnitt-Reifen
    const plates = [0.2, 0.32, 0.44, 0.56, 0.68, 0.8].map((s) => {
      const i = atS(s), p = axis[i], dir = norm(sub(axis[Math.min(axis.length - 1, i + 1)], axis[Math.max(0, i - 1)])), nn = norm([dir[1], -dir[0], 0]), r = R(s) * 1.04;
      return Array.from({ length: 11 }, (_, k) => { const a = (k / 10) * Math.PI; return addv(p, addv(scale(nn, Math.cos(a) * r), [0, 0, Math.sin(a) * r])); });
    });
    // Vorder- und Hinterbeine mit je drei Krallen, leicht nach vorn angezogen
    const leg = (k, pts3) => { const f = pts3.at(-1); return [pts3, ...[-1, 0, 1].map((c) => [f, addv(f, [k * 0.035 + c * 0.03, -0.07, 0.03])])]; };
    const legs = [-1, 1].flatMap((k) => [
      ...leg(k, [[-0.06 + k * 0.08, 0.14, 0.1], [-0.04 + k * 0.2, 0.02, 0.2], [-0.04 + k * 0.17, -0.1, 0.27]]),
      ...leg(k, [[-0.16 + k * 0.1, -0.3, 0.2], [-0.16 + k * 0.25, -0.38, 0.32], [-0.16 + k * 0.22, -0.56, 0.28]]),
    ]);
    parts.push(curves('belly', plates, { w: 0.9 }), curves('leg', legs));
  }
  // Flügel: Arm (Schulter → Ellbogen → Handgelenk → Spitze), Finger vom Handgelenk, Hinterkante als Bögen zwischen den
  // Fingerspitzen. In der Tiefe nach hinten gepfeilt (−0,42 je Einheit Spannweite), die Flughaut wölbt sich nach hinten.
  for (const s of [1, -1]) {
    const P = (u, v, cam = 0) => [SHOULDER[0] + s * (0.06 + u), SHOULDER[1] + v, SHOULDER[2] - 0.42 * u - cam];
    const arm = spline([[0, 0], [0.36, 0.3], [0.6, 0.52], [1.02, 0.76]].map(([u, v]) => P(u, v)), 8);
    const wrist = [0.6, 0.52], tips = [[1.02, 0.76], [1.0, 0.24], [0.8, -0.1], [0.46, -0.34], [0.04, -0.18]];
    const trailing = [];
    for (let i = 1; i < tips.length; i++) {
      const a = tips[i - 1], b = tips[i], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], c = [m[0] + 0.22 * (wrist[0] - m[0]), m[1] + 0.22 * (wrist[1] - m[1])];
      quad(a, b, c, 10).forEach(([u, v], k) => { if (i === 1 || k) trailing.push(P(u, v, 0.07 * Math.sin((Math.PI * k) / 10))); });
    }
    const fingers = tips.slice(1, 4).map(([u, v]) => [P(...wrist), P(u, v)]);
    // 3D+: eine Rippe in jedem Flughautfeld, vom Ellbogen zur Mitte der Hinterkante (gewölbt)
    if (L2) for (let i = 1; i < tips.length; i++) { const m = trailing[Math.round(((i - 0.5) / (tips.length - 1)) * (trailing.length - 1))], e = P(0.36, 0.3); fingers.push(Array.from({ length: 6 }, (_, k) => { const u = k / 5; return addv(addv(scale(e, 1 - u), scale(m, u)), [0, 0, -0.03 * Math.sin(Math.PI * u)]); })); }
    const thumb = L1 ? [[P(...wrist), P(wrist[0] + 0.03, wrist[1] + 0.08), P(wrist[0] - 0.01, wrist[1] + 0.13)]] : [];
    parts.push(curves(s > 0 ? 'boneR' : 'boneL', [arm, ...fingers, ...thumb], { w: 1.05 }), curves(s > 0 ? 'wingR' : 'wingL', [trailing]));
  }
  // Kopf: Schädel als Ellipsoid, Schnauze als Röhre, Unterkiefer, zwei Hörner, Augen auf beiden Seiten
  // (Kopf nach rechts, leicht nach oben; das Maul steht ein wenig offen, die Hörner schwingen weit nach hinten)
  const H = [0.4, 1.06, 0.1];
  parts.push(
    ellipsoid('head', H, [0.12, 0.085, 0.09], { lat: [0], mer: L1 ? [Math.PI / 2] : [] }),
    tube('head', [[0.47, 1.08, 0.1], [0.62, 1.09, 0.1], [0.76, 1.08, 0.1]], (u) => 0.055 - 0.025 * u, { hoops: 1, crest: true, caps: [false, true] }),
    curves('jaw', [[[0.36, 0.99, 0.1], [0.5, 0.95, 0.1], [0.66, 0.93, 0.1], [0.74, 0.95, 0.1]]]),
    curves('horn', [-1, 1].map((k) => spline([[0.36, 1.13, 0.1 + k * 0.05], [0.25, 1.22, 0.1 + k * 0.09], [0.1, 1.25, 0.1 + k * 0.12], [0.0, 1.21, 0.1 + k * 0.13]], 6))),
    ...[-1, 1].map((k) => spot('eye', [0.47, 1.1, 0.1 + k * 0.066], 3, 0.017, [0, 0, k])),
  );
  return { parts, spine: [...coil, ...axis] };
}

/** Höchstens so viele Drohnen tragen den aufsteigenden Drachen; darüber werden seine Linien nur dichter, der Rest wartet. */
export const RISE_MAX = 640;
export function riseModel(n) {
  const { parts, spine } = riseParts(n), { pts, tags } = assemble(parts, Math.min(n, RISE_MAX));
  // Stelle jeder Rumpf- und Schwanzdrohne auf dem Rückgrat (0 Schwanzspitze … 1 Kopf), für den Lichtlauf
  const cum = [0]; for (let i = 1; i < spine.length; i++) cum.push(cum[i - 1] + Math.hypot(...sub(spine[i], spine[i - 1])));
  const along = pts.map((p) => { let best = Infinity, k = 0; for (let i = 0; i < spine.length; i += 2) { const d = Math.hypot(...sub(p, spine[i])); if (d < best) { best = d; k = i; } } return cum[k] / cum.at(-1); });
  return { pts, tags, along, spine };
}

const riseColour = (tag, s, p) => {
  if (tag === 'eye') return CYAN;
  if (tag === 'horn' || tag === 'spike') return GOLD;
  if (tag.startsWith('bone')) return GOLD;
  if (tag.startsWith('wing')) return mix(GOLD, WARM, 0.25 + 0.3 * Math.min(1, Math.abs(p[0]) / 1.1));
  if (tag === 'head' || tag === 'jaw') return mix(ORANGE, GOLD, 0.25);
  if (tag === 'belly') return mix(GOLD, WARM, 0.2);
  if (tag === 'leg') return mix(ORANGE, GOLD, 0.4);
  return mix(mix(RED, ORANGE, 0.35), ORANGE, s);
};
const wingSide = (tag) => (tag === 'wingR' || tag === 'boneR' ? 1 : tag === 'wingL' || tag === 'boneL' ? -1 : 0);

/** Lage einer Drohne des aufsteigenden Drachen zur Zeit t (aus ihrer Ruhelage p). */
function risePose(model, j, t, out) {
  const p = model.pts[j], tag = model.tags[j], s = wingSide(tag), on = smooth(t / 1.3);
  out[0] = p[0]; out[1] = p[1]; out[2] = p[2];
  if (s) turnAbout(out, [SHOULDER[0] + s * 0.06, SHOULDER[1], SHOULDER[2]], FLAP_AXIS, s * 0.3 * on * Math.sin((t * TAU) / BEAT));
  out[1] += 0.03 * on * Math.sin((t * TAU) / BEAT + 1.2); // er steigt mit jedem Schlag ein wenig
  yaw(out, 0.16 + 0.34 * smooth(t / 2) * Math.sin((t * TAU) / 12)); // aus der Dreiviertelansicht hin und her
  return out;
}

// =====================================================================================================================
// 3D+: der Drachenkopf (aztekisch-stufig), vier Akte
// =====================================================================================================================
// Profil nach links (Schnauze bei −x), y oben, z zur Seite (im Profil zum Publikum). Stufen statt Rundungen.
const TOP = [[-0.88, -0.02], [-0.94, 0.1], [-0.86, 0.18], [-0.72, 0.18], [-0.72, 0.26], [-0.5, 0.26], [-0.5, 0.36], [-0.3, 0.36], [-0.3, 0.5], [-0.02, 0.5], [0.16, 0.56], [0.36, 0.5], [0.5, 0.34], [0.55, 0.12], [0.46, -0.06]];
const LIP = [[0.46, -0.06], [0.14, -0.05], [-0.4, -0.04], [-0.78, -0.03]];
const JAW = [[0.18, -0.14], [-0.74, -0.15], [-0.8, -0.24], [-0.68, -0.32], [-0.46, -0.32], [-0.46, -0.4], [-0.16, -0.4], [-0.16, -0.47], [0.1, -0.47], [0.24, -0.32]];
const HINGE = [0.2, -0.1];
const HW = (x) => 0.12 + 0.2 * smooth((x + 0.9) / 1.3); // halbe Kopfbreite
const yTop = table(TOP.slice(0, 13).map((p) => p[0]).map((x, i, a) => (i && x <= a[i - 1] ? a[i - 1] + 1e-4 : x)), TOP.slice(0, 13).map((p) => p[1]));
const yLip = (x) => lerp(-0.03, -0.06, smooth((x + 0.8) / 1.3));
const yJaw = (x) => table([-0.8, -0.68, -0.46, -0.16, 0.1, 0.24], [-0.24, -0.32, -0.4, -0.47, -0.47, -0.32])(x);
/** Polygon um c in x und y gestaucht (eingerückte Fläche einer Stufe). */
const inset = (poly, c, sx, sy) => poly.map(([x, y]) => [c[0] + (x - c[0]) * sx, c[1] + (y - c[1]) * sy]);
/** 2D-Linie auf die Seitenfläche k (±1) gelegt, um lift nach außen versetzt; w(x) = halbe Breite dort. */
const onSide = (pts2, k, w = HW, lift = 0) => pts2.map(([x, y]) => [x, y, k * (w(x) + lift)]);
const flat0 = (pts2) => pts2.map(([x, y]) => [x, y, 0]);
/** Zickzack (Zähne) von x0 nach x1 zwischen yBase(x) und yBase(x) + h. */
const zigzag = (x0, x1, teeth, yBase, h) => Array.from({ length: 2 * teeth + 1 }, (_, i) => { const x = lerp(x0, x1, i / (2 * teeth)); return [x, yBase(x) + (i % 2 ? h : 0)]; });
/** Detailstufe nach Drohnen: 0 bis 399, 1 bis 699, 2 ab 700. */
export const headLevel = (n) => (n >= 700 ? 2 : n >= 400 ? 1 : 0);
const BC = [0.38, 0.16, 0]; // Mitte des Federkranzes (Hinterkopf)

/** Feder k von K auf dem Kegel um die Kopfachse (nach hinten geöffnet): Umriss, Kiel, Äste je nach Stufe. */
function feather(k, K, lv) {
  const beta = lerp(-2.2, 2.2, K > 1 ? k / (K - 1) : 0.5), alpha = 1.12; // β = 0 oben, ±π/2 zur Seite
  const dir = [Math.cos(alpha), Math.sin(alpha) * Math.cos(beta), Math.sin(alpha) * Math.sin(beta)];
  const wide = [0, -Math.sin(beta), Math.cos(beta)]; // quer zur Feder, tangential am Kegel: die Feder zeigt ihre Fläche nach außen
  const base = addv(BC, [0, 0.26 * Math.cos(beta), 0.26 * Math.sin(beta)]), len = 0.78 + (lv ? 0.08 : 0) + 0.08 * Math.cos(beta * 1.2), wmax = 0.12;
  const P = (u, w) => addv(addv(base, scale(dir, u * len)), addv(scale(wide, w), [0.05 * u * u, -0.05 * u * u, 0]));
  const M = 14, half = (sgn) => Array.from({ length: M + 1 }, (_, i) => { const u = i / M; return P(u, sgn * wmax * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.08)), 0.75)); });
  const lines = [{ pts: [...half(1), ...half(-1).reverse().slice(1, -1)], closed: true }];
  if (lv >= 1) lines.push(Array.from({ length: 9 }, (_, i) => P(0.12 + (0.8 * i) / 8, 0)));
  if (lv >= 2) for (const u of [0.38, 0.58, 0.76]) for (const sg of [1, -1]) lines.push([P(u, 0), P(u + 0.09, sg * wmax * 0.72)]);
  return lines;
}

/** Der Kopf in Ruhelage (geschlossenes Maul, Profil): Teile für assemble(). */
function headParts(lv) {
  const upper = [...TOP, ...LIP], C = [-0.18, 0.2], CJ = [-0.28, -0.3];
  const parts = [];
  // Oberkopf: Mittelprofil, eingerückte Seitenflächen beider Seiten, Querschnitt-Reifen
  const sideUp = inset(upper, C, 0.84, 0.64), sideUp2 = inset(upper, C, 0.66, 0.36);
  const hoopsX = [[-0.5, 0.2], [-0.62, -0.06, 0.34], [-0.7, -0.4, -0.06, 0.2, 0.4]][lv];
  const hoop = (x, yt, yb, w) => ({ pts: Array.from({ length: 28 }, (_, i) => { const a = (i / 28) * TAU; return [x, (yt + yb) / 2 + Math.cos(a) * (yt - yb) / 2, Math.sin(a) * w]; }), closed: true });
  // Stufe 0: Mittelprofil und Reifen (wenige starke Linien), Stufe 1: eingerückte Seitenflächen, Stufe 2: zweite, erhabene Stufe
  parts.push(curves('kopf', [{ pts: flat0(upper), closed: true }, ...hoopsX.map((x) => hoop(x, yTop(x), yLip(x), HW(x)))]));
  if (lv >= 1) parts.push(curves('seite', [-1, 1].map((k) => ({ pts: onSide(sideUp, k), closed: true }))));
  if (lv >= 2) parts.push(curves('stufe', [-1, 1].map((k) => ({ pts: onSide(sideUp2, k, HW, 0.05), closed: true }))));
  // Auge: Stufenquadrat und Kreis auf beiden Seiten, erhaben; ab Stufe 2 eine Spirale darin
  const E = [-0.14, 0.25], h = 0.11, st = 0.04;
  const stepSquare = [[-h, -h + st], [-h + st, -h + st], [-h + st, -h], [h - st, -h], [h - st, -h + st], [h, -h + st], [h, h - st], [h - st, h - st], [h - st, h], [-h + st, h], [-h + st, h - st], [-h, h - st]].map(([x, y]) => [E[0] + x, E[1] + y]);
  const eyeLines = [-1, 1].flatMap((k) => [{ pts: onSide(stepSquare, k, HW, 0.04), closed: true }, { pts: onSide(spiral(E, 0.055, 0.055, 0, 1, 1, 24).slice(0, -1), k, HW, 0.05), closed: true }, ...(lv >= 2 ? [onSide(spiral(E, 0.012, 0.035, 0, 1.2, k), k, HW, 0.06)] : [])]);
  parts.push(curves('auge', eyeLines, { w: 1.2 }), ...[-1, 1].map((k) => spot('pupille', [E[0], E[1], k * (HW(E[0]) + 0.06)], lv ? 4 : 1, 0.022, [0, 0, k])));
  // Ranke auf der Wange und (ab Stufe 1) am Nasenloch, Stufenband auf der Schnauze (Stufe 2)
  const cheek = spiral([0.26, 0.12], 0.03, 0.15, Math.PI * 0.6, 1.5, -1);
  const deco = [-1, 1].flatMap((k) => [onSide(cheek, k, HW, 0.03), ...(lv >= 1 ? [onSide(spiral([-0.8, 0.08], 0.012, 0.05, 0, 1.2, 1, 20), k, HW, 0.02)] : []), ...(lv >= 2 ? [onSide([[-0.66, 0.03], [-0.66, 0.12], [-0.56, 0.12], [-0.56, 0.03], [-0.46, 0.03], [-0.46, 0.18], [-0.36, 0.18], [-0.36, 0.03]], k, HW, 0.02)] : [])]);
  parts.push(curves('ranke', deco));
  // Zähne oben (an den Seiten, leicht eingerückt), Fangzahn vorn
  parts.push(curves('zahn', [flat0(zigzag(-0.8, 0.06, [6, 8, 9][lv], yLip, -0.075))]));
  // Unterkiefer: Mittelprofil, Seiten (ab Stufe 1), Reifen, Zähne
  const jawLines = [{ pts: flat0(JAW), closed: true }];
  if (lv >= 1) jawLines.push(...[-1, 1].map((k) => ({ pts: onSide(inset(JAW, CJ, 0.88, 0.62), k, (x) => HW(x) * 0.88), closed: true })));
  for (const x of lv ? [-0.5, -0.1] : [-0.3]) jawLines.push(hoop(x, -0.15, yJaw(x), HW(x) * 0.88));
  parts.push(curves('kiefer', jawLines));
  const lowTeeth = () => zigzag(-0.72, 0.04, lv ? 7 : 5, () => -0.15, 0.07);
  parts.push(curves('kieferzahn', [flat0(lowTeeth())]));
  // Barteln am Kinn (Stufe 2): zwei geschwungene Fäden, die nach unten und zur Seite hängen
  if (lv >= 2) parts.push(curves('kiefer', [-1, 1].map((k) => spline([[-0.74, -0.27, k * 0.1], [-0.82, -0.44, k * 0.22], [-0.7, -0.6, k * 0.3], [-0.78, -0.72, k * 0.34]], 8))));
  // Kamm: Ranken auf dem Scheitel, jede aus der Mittelebene heraus gedreht (sie fächern beim Drehen auf)
  const crestAt = [[-0.16, -0.3, 0.9], [0.08, 0, 1.1], [0.3, 0.3, 1]].slice(0, lv >= 2 ? 3 : 3);
  const scroll = ([x0, psi, sz]) => {
    const b = [x0, yTop(x0) + 0.01], tip = [x0 + 0.1 * sz, b[1] + 0.3 * sz], c = [tip[0] + 0.03 * sz, tip[1] - 0.13 * sz];
    const curl = [b, [x0 + 0.02 * sz, b[1] + 0.17 * sz], tip, ...spiral(c, 0.13 * sz, 0.03, Math.PI / 2, 0.9, -1, 22).slice(1)];
    return curl.map(([x, y]) => { const dx = x - x0; return [x0 + dx * Math.cos(psi), y, -dx * Math.sin(psi)]; });
  };
  // eingerollter Nasenhaken (aztekische Schlangenköpfe): aus der Schnauze nach oben, in der Mittelebene
  const nose = flat0([[-0.8, 0.18], [-0.86, 0.3], [-0.8, 0.4], ...spiral([-0.72, 0.35], 0.09, 0.025, Math.PI * 0.85, 0.85, -1, 18).slice(1)]);
  parts.push(curves('kamm', [...crestAt.map(scroll), nose, ...(lv >= 2 ? crestAt.map(([x0, psi, sz]) => scroll([x0 + 0.04, psi, sz * 0.7])) : [])], { w: 1.1 }));
  // Federkranz
  const K = [5, 7, 9][lv];
  parts.push(curves('feder', Array.from({ length: K }, (_, k) => feather(k, K, lv)).flat(), { w: 0.95 }));
  return parts;
}

/** Sonnenscheibe hinter dem Kopf (die Drohnen des späteren Feuers): Ring, ab Stufe 1 Strahlen, ab Stufe 2 zweiter Ring. */
const SUN = [-0.2, 0.1, -1.45]; // weit genug hinten, dass die Federn sie auch nach der Drehung nicht kreuzen
function sunLines(lv) {
  const R = 1.05, ring = (r, k = 120) => ({ pts: Array.from({ length: k }, (_, i) => { const a = (i / k) * TAU; return [SUN[0] + Math.cos(a) * r, SUN[1] + Math.sin(a) * r, SUN[2]]; }), closed: true });
  const lines = [ring(R)];
  if (lv >= 2) lines.push(ring(R - 0.12));
  const rays = [0, 12, 16][lv];
  for (let i = 0; i < rays; i++) { const a = (i / rays) * TAU + 0.13; lines.push([[SUN[0] + Math.cos(a) * (R + 0.05), SUN[1] + Math.sin(a) * (R + 0.05), SUN[2]], [SUN[0] + Math.cos(a) * (R + 0.2), SUN[1] + Math.sin(a) * (R + 0.2), SUN[2]]]); }
  return lines;
}
/** Feuerdrohnen je Stufe (Anteil an n). */
export const fireShare = (n) => Math.round(n * [0.18, 0.18, 0.2][headLevel(n)]);

export function headModel(n) {
  const lv = headLevel(n), F = fireShare(n), B = n - F;
  const head = assemble(headParts(lv), B), sun = assemble([curves('sonne', sunLines(lv))], F);
  return { lv, B, F, pts: [...head.pts, ...sun.pts], tags: [...head.tags, ...sun.tags] };
}
const headColour = (tag, p) => ({
  kopf: mix(GOLD, ORANGE, 0.3 + 0.4 * smooth((p[0] + 1) / 1.5)), seite: mix(GOLD, ORANGE, 0.5), stufe: GOLD, auge: GOLD, pupille: DIAMOND, ranke: mix(GOLD, WARM, 0.3),
  zahn: WARM, kieferzahn: WARM, kiefer: mix(ORANGE, RED, 0.25), kamm: GOLD, sonne: mix(RED, ORANGE, 0.35),
  feder: mix(CYAN, BLUE, 0.55 * Math.min(1, Math.hypot(p[0] - BC[0], p[1] - BC[1], p[2]) / 1.0)),
}[tag] ?? GOLD);
const JAWED = new Set(['kiefer', 'kieferzahn']);

/** Kopfdrohne j in Pose (Drehung ya zum Publikum, Maul offen um jaw rad), ohne Sonne/Feuer. */
function headPose(model, j, ya, jaw, out) {
  const p = model.pts[j]; out[0] = p[0]; out[1] = p[1]; out[2] = p[2];
  if (jaw && JAWED.has(model.tags[j])) roll(out, jaw, HINGE[0], HINGE[1]);
  yaw(out, ya, -0.2, 0);
  return out;
}
/** Die abgewandte Seite leuchtet schwächer (Tiefe als Licht, wie der Delfin unter Wasser): sonst scheint das ferne Auge
 * durch den Kopf, und aus dem Profil wird ein Gesicht mit zwei Augen. */
const near = (z) => 0.4 + 0.6 * smooth((z + 0.3) / 0.45);
const MOUTH = [-0.84, -0.1, 0], SNOUT = norm([-1, 0.18, 0]);

/** Feuerstrom: S Strähnen, die sich als Spiralen um eine leicht steigende Bahn aus dem Maul aufweiten. */
function fireModel(F, lv, ya) {
  const S = [4, 6, 8][lv], LF = [1.05, 1.2, 1.3][lv], counts = Array.from({ length: S }, (_, k) => Math.floor(F / S) + (k < F % S ? 1 : 0));
  const m = [...MOUTH], d = [...SNOUT]; yaw(m, ya, -0.2, 0); yaw(d, ya, -0.2, 0);
  const D = norm(addv(d, [-0.15, 0.12, 0])), U = norm([-D[1], D[0], 0]), V = [D[1] * U[2] - D[2] * U[1], D[2] * U[0] - D[0] * U[2], D[0] * U[1] - D[1] * U[0]];
  const spec = [];
  counts.forEach((c, k) => { for (let i = 0; i < c; i++) spec.push({ k, u: (i + 0.5 + 0.5 * (k % 2)) / (c + 0.5) }); });
  const at = (s, t, out) => {
    const dd = 0.08 + s.u * LF, rho = 0.03 + 0.36 * s.u * s.u + 0.06 * s.u, a = (s.k / S) * TAU + 3.2 * s.u + 0.7 * t;
    const c = addv(addv(m, scale(D, dd)), [0, 0.18 * s.u * s.u, 0]);
    const q = addv(c, addv(scale(U, Math.cos(a) * rho), scale(V, Math.sin(a) * rho)));
    out[0] = q[0]; out[1] = q[1]; out[2] = q[2]; return out;
  };
  return { spec, at, S };
}
const fireColour = (u) => (u < 0.35 ? mix(WARM, GOLD, u / 0.35) : u < 0.7 ? mix(GOLD, ORANGE, (u - 0.35) / 0.35) : mix(ORANGE, RED, (u - 0.7) / 0.3));

const YAW0 = 0.12, YAW1 = 0.62, JAW_OPEN = 0.3, TURN = 3.2, OPEN = 2.2;

export const builders = {
  dragonRise: (n, caption) => {
    const model = riseModel(n), col = model.pts.map((p, j) => riseColour(model.tags[j], model.along[j], p));
    const pts = model.pts.map((_, j) => [...risePose(model, j, 0, [0, 0, 0]), ...col[j]]);
    return { beats: [{ pts, caption, ...(n > pts.length ? { offstageDrones: n - pts.length } : {}), live: (b, j, t, o) => {
      risePose(model, j, t, o);
      const tag = model.tags[j];
      if (tag === 'eye') o[3] = 1.35;
      else if (tag === 'body' || tag === 'tail') o[3] = 1 + 0.45 * Math.exp(-((((1.25 - 1.5 * frac(t / 3.4)) - model.along[j]) / 0.09) ** 2)); // Licht läuft vom Kopf zur Schwanzspitze
      else if (wingSide(tag)) o[3] = tag.startsWith('bone') ? 1.12 : 0.95 + 0.25 * (0.5 + 0.5 * Math.sin((t * TAU) / BEAT - Math.abs(model.pts[j][0]) * 2));
    } }] };
  },

  dragonHead: (n) => {
    const model = headModel(n), { B, F, lv } = model;
    const col = model.pts.map((p, j) => headColour(model.tags[j], p));
    const rank = lightRank(model.pts.slice(0, B));
    const fire = fireModel(F, lv, YAW1), fireCol = fire.spec.map((s) => fireColour(s.u));
    const at = (ya, jaw) => model.pts.map((p, j) => (j < B ? [...headPose(model, j, ya, jaw, [0, 0, 0]), ...col[j]] : [...p, ...col[j]]));
    const fireAt = (t) => fire.spec.map((s, k) => [...fire.at(s, t, [0, 0, 0]), ...fireCol[k]]);
    const parts = (pts, flame = null) => [part('kopf', pts.slice(0, B)), part(flame ? 'feuer' : 'sonne', flame ?? pts.slice(B))];
    // derselbe Bildausschnitt in allen Akten: Kopf in allen Drehungen, Sonne, Feuer
    const view = [...at(YAW0, 0), ...at(YAW1, JAW_OPEN), ...fireAt(0)].filter((_, i) => i % 2 === 0);
    const sway = (t) => 0.06 * smooth(t / 1.5) * Math.sin((t * TAU) / 9);
    const sunLight = (j, t, base = 0.62) => base * (1 + 0.35 * chase((j - B) / F, t, 0.08, 0.25, 0, 1));
    const eye = (tag, glow) => (tag === 'auge' || tag === 'pupille' ? 1 + glow : 1);
    return { beats: [
      { ...act(parts(at(YAW0, 0)), { caption: message('drache.aHeadAppears'), hold: 3.6, cloud: true, live: (b, j, t, o) => {
        if (j >= B) { o[3] = sunLight(j, t) * smooth((t - 1.6) / 1.2); return; }
        headPose(model, j, YAW0 + sway(t), 0, o); o[3] = trace(rank[j], t, 2.8) * near(o[2]);
      } }), fitPts: view },
      { ...act(parts(at(YAW0, 0)), { caption: message('drache.itTurnsToYou'), hold: TURN + 0.6, live: (b, j, t, o) => {
        if (j >= B) { o[3] = sunLight(j, t); return; }
        headPose(model, j, lerp(YAW0, YAW1, smooth(t / TURN)), 0, o); o[3] = eye(model.tags[j], 0.3 * smooth(t / TURN)) * near(o[2]);
      } }), fitPts: view },
      { ...act(parts(at(YAW1, 0)), { caption: message('drache.opensItsMaw'), hold: OPEN + 0.8, live: (b, j, t, o) => {
        if (j >= B) { o[3] = sunLight(j, t, 0.62 + 0.4 * smooth(t / OPEN)); return; }
        const u = smooth(t / OPEN); headPose(model, j, YAW1 + sway(t), JAW_OPEN * u, o); o[3] = eye(model.tags[j], 0.3 + 0.4 * u) * (JAWED.has(model.tags[j]) || model.tags[j] === 'zahn' ? 1 + 0.25 * u : 1) * near(o[2]);
      } }), fitPts: view },
      { ...act(parts(at(YAW1, JAW_OPEN), fireAt(0)), { caption: message('drache.andBreathesFire'), live: (b, j, t, o) => {
        if (j < B) { headPose(model, j, YAW1 + sway(t), JAW_OPEN, o); o[3] = eye(model.tags[j], 0.7) * near(o[2]); return; }
        const s = fire.spec[j - B]; fire.at(s, t, o);
        o[3] = (1.05 - 0.4 * s.u) * chase(s.u, t, 0.55, 0.3, 0.55, 1.5); // Flammenzungen laufen nach außen
      } }), fitPts: view },
    ] };
  },
};
