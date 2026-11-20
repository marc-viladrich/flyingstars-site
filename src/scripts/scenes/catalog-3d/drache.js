import { t as message } from '../../../i18n/ui.mjs';
// Der Drache (Runde 10b, neu gebaut in Runde 11). Marc 20.11.2026: „im Vergleich mit den Delfinen sieht der Drache mega
// krass 2D aus … In 3D eher diesen Dragon Flying Upward und in 3D+ sowas wie den Aztec Style Dragon Head“, nach der ersten
// Fassung: „Bei den ganzen Drachenmotiven … musst du dir echt mal mehr Mühe machen“ (Kopf bei 300 zu dicht und fischartig,
// Sonnenscheibe raus). Maßstab: Fußballer, Fahrzeuge und Baumstern (catalog-3d/sport.js, technik.js, scenes/schnee.js).
//
// Gebaut wie die Fahrzeuge: jede Form ist eine Seitenkontur auf BEIDEN Seiten (im Profil eine saubere Linie, im Schwenk
// sichtbares Volumen) mit wenigen Querkanten an den markanten Ecken; der Hals als Röhre mit Kammlinie, Reifen erst bei
// mehr Drohnen. Keine Füllung, keine Linie, die nichts sagt.
//
//   dragonRise (3D, 200–290): ein Drache steigt auf. Lesbar an vier Zeichen: Profilkopf mit offenem Maul und
//     zurückgeschwungenen Hörnern, große Fledermausflügel mit Fingern und Bogenkante, S-förmiger Rumpf mit Stachelkamm in
//     der Bildebene, eingerollter Schwanz mit Spitze. Bewegung: Flügelschlag mit Nachlauf zur Spitze (die Flughaut
//     schwingt nach), eine Welle läuft durch Rumpf und Schwanz, er steigt mit jedem Schlag, der Körper schwenkt langsam.
//   dragonHead (3D+, 300–1000): ein aztekischer Drachenkopf auf dem Hals, im Profil nach links. Lesbar an Silhouette
//     (lange Schnauze, kantige Braue, offenes Maul mit Fangzähnen, zwei weit zurückgeschwungene Hörner, Federmähne am
//     Nacken) statt an Binnenlinien. Aus Maul und Nase steigen Atem-Voluten (die aztekischen Sprechrollen); sie sind die
//     Drohnen des späteren Feuers. Vier Akte ohne Wolke dazwischen: der Kopf zeichnet sich, er dreht sich zu euch, holt
//     Luft (die Voluten ziehen ins Maul, der Kopf hebt sich, das Maul öffnet sich) und speit Feuer (dieselben Drohnen
//     fliegen als Flammenstrom aus dem Maul). Mehr Drohnen bringen mehr Teile (Zahnreihen, Wangenspirale, Stufenband,
//     Federkiele und -äste, zweite Reliefstufe, Barteln, Halsschuppen, weitere Voluten), nicht nur dichtere Linien.
// Die alten Fassungen (scenes/festival.js dragon3d/dragonStory) bleiben ungespielt im Code. Wächter: scripts/drache.test.mjs.
import { TAU, GOLD, ORANGE, RED, CYAN, BLUE, WARM, DIAMOND, mix, smooth, frac, yaw, roll, pitch, chase, trace, reveal, lightRank, part, act } from '../../show-motion.js';
import { tube, curves, spot, assemble, turnAbout } from './kit.js';

const lerp = (a, b, u) => a + (b - a) * u;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const addv = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
/** Stückweise linear: Stützstellen xs (aufsteigend), Werte ys. */
const table = (xs, ys) => (x) => { if (x <= xs[0]) return ys[0]; for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return lerp(ys[i - 1], ys[i], (x - xs[i - 1]) / (xs[i] - xs[i - 1])); return ys[ys.length - 1]; };
/** Catmull-Rom durch Kontrollpunkte (2D oder 3D), per Stücke je Abschnitt. */
function spline(ctrl, per = 10) {
  const out = [], D = ctrl[0].length;
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const u = k / per, u2 = u * u, u3 = u2 * u;
      out.push(Array.from({ length: D }, (_, q) => 0.5 * (2 * p1[q] + (p2[q] - p0[q]) * u + (2 * p0[q] - 5 * p1[q] + 4 * p2[q] - p3[q]) * u2 + (3 * p1[q] - p0[q] - 3 * p2[q] + p3[q]) * u3)));
    }
  }
  out.push(ctrl[ctrl.length - 1].slice());
  return out;
}
/** Quadratische Bézierkurve von a nach b mit Kontrollpunkt c (2D), k Stücke. */
const quad = (a, b, c, k = 8) => Array.from({ length: k + 1 }, (_, i) => { const u = i / k, v = 1 - u; return [v * v * a[0] + 2 * u * v * c[0] + u * u * b[0], v * v * a[1] + 2 * u * v * c[1] + u * u * b[1]]; });
/** Spirale um c (2D): Radius r0 → r1 über turns Umdrehungen ab Winkel a0 (Richtung dir = ±1). */
const spiral = (c, r0, r1, a0, turns, dir = 1, k = 36) => Array.from({ length: k + 1 }, (_, i) => { const u = i / k, a = a0 + dir * u * turns * TAU, r = lerp(r0, r1, u); return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]; });
/** Umriss eines Bandes um eine 2D-Mittellinie mit halber Breite w(u) (u = 0 … 1): Horn, Feder, Stachel. */
function ribbon(c, w) {
  const L = [], R = [], m = c.length;
  for (let i = 0; i < m; i++) {
    const a = c[Math.max(0, i - 1)], b = c[Math.min(m - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, h = w(i / (m - 1));
    L.push([c[i][0] - (dy / l) * h, c[i][1] + (dx / l) * h]); R.push([c[i][0] + (dy / l) * h, c[i][1] - (dx / l) * h]);
  }
  return [...L, ...R.reverse().slice(1)];
}
const at3 = (pts2, z) => pts2.map(([x, y]) => [x, y, typeof z === 'function' ? z(x, y) : z]);

// =====================================================================================================================
// 3D: der aufsteigende Drache
// =====================================================================================================================
const SHOULDER = [0.02, 0.26, -0.06];
const FLAP_AXIS = norm([0, 0.45, 1]); // schräg: der Schlag hebt die Spitzen und schiebt sie zugleich in die Tiefe
const BEAT = 2.6; // s je Flügelschlag (Drohnengrenzen: Spitze < 0,6 Anzeigeeinheiten/s)
const HEAD_AT = [0.15, 1.05], HEAD_TILT = 0.55, HEAD_S = 1.25; // Kopfansatz; ein aufsteigender Drache schaut nach oben

/** Der Drache in Ruhelage: Teile für assemble() und das Rückgrat (Schwanzspitze → Kopf) für Welle und Lichtlauf. */
function riseParts(n) {
  const L1 = n >= 250; // ab 250: mehr Stacheln, Daumenkralle, Kieferseiten, Doppelspitze am Schwanz
  // Schwanz: eine Spirale unter dem Körper in einer gekippten Ebene (vorn tiefer), sie endet vorn und geht in den Rumpf über
  const TURNS = 1.15, A0 = Math.PI / 2 - TURNS * TAU, C = [0.0, -0.86];
  const coil = Array.from({ length: 73 }, (_, i) => { const u = i / 72, a = A0 + u * TURNS * TAU, r = 0.08 + 0.56 * u; return [C[0] + r * Math.cos(a), C[1] + 0.6 * r * Math.sin(a) + 0.04 * u, 0.5 * r * Math.sin(a)]; });
  // Rumpf als S: Bauch nach links, Brust rechts, Hals wieder links, der Kopf schaut nach rechts
  const bodyCtrl = [coil[66], coil[72], [-0.26, -0.4, 0.26], [-0.3, -0.14, 0.12], [-0.12, 0.12, 0.03], [0.08, 0.36, 0], [0.08, 0.6, 0], [-0.08, 0.8, 0], [-0.02, 0.97, 0], [0.15, 1.05, 0]];
  const axis = spline(bodyCtrl, 10).slice(10);
  // Doppelkontur mit Reifen (wie Fußballer und Fahrzeuge unter 300: keine Kammlinie, sonst wird der Rumpf eine Leiter)
  // Rumpf als EINE kräftige Linie wie in der Referenz (Runde 11, Kontaktbogen v5): die Doppelkontur einer Röhre zerfiel bei
  // 200–290 Drohnen und 0,1 Linienabstand in Punktrauschen, die eine Linie zeigt das S. Räumlich wird er durch das S in der
  // Tiefe, die Schwanzschlaufe, die gepfeilten Flügel und die Welle, die als Schraube durch ihn läuft.
  const body = curves('body', [axis], { w: 1.6 });
  const cum = [0]; for (let i = 1; i < axis.length; i++) cum.push(cum[i - 1] + Math.hypot(...sub(axis[i], axis[i - 1])));
  const frameAt = (s) => { const L = s * cum.at(-1); let i = 1; while (i < cum.length - 1 && cum[i] < L) i++; const dir = norm(sub(axis[Math.min(axis.length - 1, i + 1)], axis[i - 1])); return { p: axis[i], dir, side: norm([-dir[1], dir[0], 0]) }; };
  // Stachelkamm auf dem Rücken (links am S, in der Bildebene: aus jeder Richtung zu sehen), nach hinten geneigt
  const spikeAt = (L1 ? [0.16, 0.26, 0.36, 0.46, 0.56, 0.66, 0.76, 0.86] : [0.2, 0.34, 0.48, 0.62, 0.76, 0.88]);
  // (die Stacheln sitzen auf der Rumpflinie)
  const spikes = spikeAt.map((s) => { const { p, dir, side } = frameAt(s), h = 0.11 * (1 - 0.35 * Math.abs(s - 0.5)); return [addv(p, scale(dir, 0.04)), addv(addv(p, scale(side, h)), scale(dir, -0.035)), addv(p, scale(dir, -0.04))]; });
  const tip = coil[0], d = norm(sub(coil[0], coil[3])), up = [0, 1, 0], across = norm([d[2], 0, -d[0]]);
  const spade = (o) => ({ pts: [tip, addv(addv(tip, scale(d, 0.07)), scale(o, 0.06)), addv(tip, scale(d, 0.17)), addv(addv(tip, scale(d, 0.07)), scale(o, -0.06))], closed: true });
  const parts = [body, curves('tail', [coil, spade(up), ...(L1 ? [spade(across)] : [])]), curves('spike', spikes, { w: 0.9 })];
  // Flügel: Arm (Schulter → Ellbogen → Handgelenk → Spitze), Finger, Hinterkante als Bögen zwischen den Fingerspitzen.
  // In der Tiefe nach hinten gepfeilt (−0,4 je Einheit Spannweite), die Flughaut wölbt sich nach hinten.
  for (const s of [1, -1]) {
    const P = (u, v, cam = 0) => [SHOULDER[0] + s * (0.08 + u), SHOULDER[1] + v, SHOULDER[2] - 0.4 * u - cam];
    const arm = spline([[0, 0], [0.34, 0.3], [0.58, 0.52], [1.05, 0.8]].map(([u, v]) => P(u, v)), 8);
    const wrist = [0.58, 0.52], tips = [[1.05, 0.8], [1.06, 0.28], [0.86, -0.08], [0.52, -0.3], [0.08, -0.18]];
    const trailing = [];
    for (let i = 1; i < tips.length; i++) {
      const a = tips[i - 1], b = tips[i], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], c = [m[0] + 0.24 * (wrist[0] - m[0]), m[1] + 0.24 * (wrist[1] - m[1])];
      quad(a, b, c, 10).forEach(([u, v], k) => { if (i === 1 || k) trailing.push(P(u, v, 0.07 * Math.sin((Math.PI * k) / 10))); });
    }
    const bones = [arm, ...tips.slice(1, 4).map(([u, v]) => [P(...wrist), P(u, v)])];
    if (L1) bones.push([P(...wrist), P(wrist[0] + 0.03, wrist[1] + 0.09), P(wrist[0] - 0.02, wrist[1] + 0.14)]);
    parts.push(curves(s > 0 ? 'boneR' : 'boneL', bones, { w: 1.05 }), curves(s > 0 ? 'wingR' : 'wingL', [trailing]));
  }
  // Kopf im Profil nach rechts: Schädel mit kantiger Braue, lange Schnauze, offener Unterkiefer, zwei Hörner nach hinten.
  // Seitenkontur auf beiden Seiten (halbe Breite hw), wie ein Fahrzeug; Augen als Lichtpunkte auf beiden Seiten.
  const place = ([x, y]) => [HEAD_AT[0] + HEAD_S * (x * Math.cos(HEAD_TILT) - y * Math.sin(HEAD_TILT)), HEAD_AT[1] + HEAD_S * (x * Math.sin(HEAD_TILT) + y * Math.cos(HEAD_TILT))];
  const hw = (x) => 0.06 - 0.025 * Math.max(0, x / 0.45);
  const skull = [[-0.05, 0.0], [0.0, 0.09], [0.1, 0.11], [0.17, 0.09], [0.21, 0.13], [0.25, 0.075], [0.37, 0.06], [0.44, 0.035], [0.46, 0.0], [0.34, -0.015], [0.14, -0.02], [0.03, -0.05]].map(place);
  const jaw = [[0.03, -0.06], [0.18, -0.085], [0.38, -0.155], [0.41, -0.12], [0.17, -0.05]].map(place);
  const lx = (q) => ((q[0] - HEAD_AT[0]) * Math.cos(HEAD_TILT) + (q[1] - HEAD_AT[1]) * Math.sin(HEAD_TILT)) / HEAD_S; // Stelle entlang der Schnauze
  const sides = (poly, k = 1) => [-1, 1].map((sg) => ({ pts: poly.map((q) => [q[0], q[1], sg * hw(lx(q)) * k]), closed: true }));
  const hornC = spline([[0.02, 0.09], [-0.04, 0.24], [-0.12, 0.36], [-0.23, 0.45]], 5), hornO = ribbon(hornC, (u) => 0.035 * (1 - u) ** 0.9).map(place);
  const horn = (sg) => ({ pts: hornO.map(([x, y], i) => { const u = Math.min(i, hornO.length - 1 - i) / ((hornO.length - 1) / 2); return [x, y, sg * (0.045 + 0.09 * u)]; }), closed: true });
  parts.push(
    curves('head', [...sides(skull), ...(L1 ? [[[...place([0.46, 0]), -hw(0.46)], [...place([0.46, 0]), hw(0.46)]]] : [])], { w: 1.1 }),
    curves('jaw', L1 ? sides(jaw, 0.8) : [{ pts: jaw.map(([x, y]) => [x, y, 0]), closed: true }]),
    curves('horn', [horn(1), horn(-1)], { w: 1.1 }),
    ...[-1, 1].map((k) => spot('eye', [...place([0.15, 0.05]), k * 0.06], 2, 0.016, [0, 0, k])),
  );
  return { parts, spine: [...coil, ...axis] };
}

export function riseModel(n) {
  const { parts, spine } = riseParts(n), { pts, tags } = assemble(parts, n);
  // Stelle jeder Drohne auf dem Rückgrat (0 Schwanzspitze … 1 Kopf): Welle und Lichtlauf
  const cum = [0]; for (let i = 1; i < spine.length; i++) cum.push(cum[i - 1] + Math.hypot(...sub(spine[i], spine[i - 1])));
  const along = pts.map((p) => { let best = Infinity, k = 0; for (let i = 0; i < spine.length; i += 2) { const d = Math.hypot(...sub(p, spine[i])); if (d < best) { best = d; k = i; } } return cum[k] / cum.at(-1); });
  return { pts, tags, along, spine };
}

const riseColour = (tag, s, p) => {
  if (tag === 'eye') return CYAN;
  if (tag === 'horn' || tag === 'spike') return GOLD;
  if (tag.startsWith('bone')) return GOLD;
  if (tag.startsWith('wing')) return mix(GOLD, WARM, 0.3 + 0.3 * Math.min(1, Math.abs(p[0]) / 1.1));
  if (tag === 'head') return mix(ORANGE, GOLD, 0.35);
  if (tag === 'jaw') return mix(ORANGE, RED, 0.2);
  return mix(mix(RED, ORANGE, 0.3), ORANGE, s);
};
const wingSide = (tag) => (tag === 'wingR' || tag === 'boneR' ? 1 : tag === 'wingL' || tag === 'boneL' ? -1 : 0);
const WAVED = new Set(['body', 'tail', 'spike']);

/** Lage einer Drohne des aufsteigenden Drachen zur Zeit t (aus ihrer Ruhelage). */
function risePose(model, j, t, out) {
  const p = model.pts[j], tag = model.tags[j], s = wingSide(tag), on = smooth(t / 1.3), ph = (t * TAU) / BEAT;
  out[0] = p[0]; out[1] = p[1]; out[2] = p[2];
  if (s) {
    // Flügelschlag mit Nachlauf: weiter außen schlägt die Flughaut etwas später (sie schwingt nach, statt starr zu klappen)
    const pivot = [SHOULDER[0] + s * 0.08, SHOULDER[1], SHOULDER[2]], d = Math.hypot(...sub(p, pivot));
    turnAbout(out, pivot, FLAP_AXIS, s * 0.3 * on * Math.sin(ph - 0.55 * d));
  } else if (WAVED.has(tag)) {
    // eine Welle läuft vom Hals zur Schwanzspitze, zum Schwanz hin weiter ausschwingend; der Hals bleibt ruhig
    const a = model.along[j], amp = 0.045 * on * smooth((0.82 - a) / 0.6), w = 0.5 * ph - 7 * a;
    out[0] += amp * Math.sin(w); out[2] += 0.6 * amp * Math.cos(w);
  }
  out[1] += 0.03 * on * Math.sin(ph + 1.2); // er steigt mit jedem Schlag ein wenig
  yaw(out, 0.22 + 0.3 * smooth(t / 2) * Math.sin((t * TAU) / 12)); // aus der Dreiviertelansicht hin und her
  pitch(out, 0.08); // etwas von oben: die Schwanzspirale zeigt sich als Schlaufe
  return out;
}

// =====================================================================================================================
// 3D+: der Drachenkopf (Runde 11b)
// =====================================================================================================================
// Profil nach links (Schnauze bei −x), y oben, z zur Seite. Eine Silhouette in der Mittelebene trägt die Form; Auge mit
// Brauenbogen, Nüster und Fangzähne liegen auf beiden Kopfseiten (halbe Breite HW) und rücken in der Dreiviertelansicht
// gegen die Silhouette, so entsteht Relief ohne Parallelstriche. Die Hörner laufen in der Tiefe auseinander.
/** Detailstufe nach Drohnen: 0 bis 399, 1 bis 699, 2 ab 700. */
export const headLevel = (n) => (n >= 700 ? 2 : n >= 400 ? 1 : 0);
// Oberlinie vom Nacken (unten offen) über Hinterkopf, Scheitel, Brauenwulst und Nasenrücken zur Schnauzenspitze, dann die
// Oberlippe zurück zum Mundwinkel. Unterlinie vom Mundwinkel über Unterlippe, Kinn und Kieferwinkel in die Kehle.
const TOPLINE = [[0.6, -0.72], [0.55, -0.32], [0.48, -0.02], [0.41, 0.2], [0.31, 0.33], [0.16, 0.4], [0.02, 0.38], [-0.13, 0.35], [-0.22, 0.42], [-0.32, 0.39], [-0.44, 0.27], [-0.62, 0.21], [-0.86, 0.15], [-0.96, 0.17], [-1.03, 0.1], [-1.0, 0.02]];
const UPLIP = [[-1.0, 0.02], [-0.85, 0.0], [-0.55, -0.02], [-0.12, -0.04]];
const JAWLINE = [[-0.12, -0.05], [-0.3, -0.06], [-0.6, -0.065], [-0.9, -0.07], [-0.89, -0.12], [-0.8, -0.18], [-0.55, -0.24], [-0.2, -0.29], [0.08, -0.33]];
const THROAT = [[0.08, -0.33], [0.16, -0.5], [0.2, -0.72]];
const CORNER = [-0.12, -0.045]; // der Unterkiefer dreht um den Mundwinkel; die Kehle biegt sich mit (Gewicht 1 → 0 nach unten)
const NECK_BASE = [0.4, -0.72];
const HW = (x) => 0.1 + 0.14 * smooth((x + 1.0) / 1.1); // halbe Kopfbreite
/** Anteil, mit dem ein Punkt der Unterlinie den Kiefer mitdreht: Kiefer ganz, die Kehle nach unten auslaufend. */
const jawWeight = (p) => (p[1] >= -0.33 ? 1 : smooth((p[1] + 0.72) / 0.39));
const flat = (pts2, z = 0) => pts2.map(([x, y]) => [x, y, z]);
const sideLine = (pts2, k, lift = 0, w = HW) => pts2.map(([x, y]) => [x, y, k * (w(x) + lift)]);
/** Bogen mit Höckern (Schuppen, Stacheln) entlang einer Polylinie: n Höcker der Höhe h nach außen (Seite sg). */
function scalloped(line, bumps, h, sg = 1) {
  const dense = spline(line, 12), out = [];
  for (let i = 0; i < dense.length; i++) {
    const a = dense[Math.max(0, i - 1)], b = dense[Math.min(dense.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, u = i / (dense.length - 1);
    const k = Math.abs(Math.sin(Math.PI * bumps * u)) ** 0.7 * h;
    out.push([dense[i][0] - sg * (dy / l) * k, dense[i][1] + sg * (dx / l) * k]);
  }
  return out;
}

/** Hornpfad (3D-Mittellinie) als Band mit nach außen wachsender Tiefe; rings: Rillen quer über das Horn. */
function hornLines(path, width, k, rings = 0) {
  const c = spline(path.map(([x, y]) => [x, y]), 6), zc = spline(path.map((p) => [p[2], 0]), 6).map((p) => p[0]), m = c.length;
  const out = ribbon(c, (u) => width * (1 - u) ** 0.85), half = m;
  const lines = [{ pts: out.map(([x, y], i) => [x, y, k * zc[i < half ? i : 2 * m - 2 - i]]), closed: true }];
  for (let r = 0; r < rings; r++) { const i = Math.round(((r + 1) / (rings + 1.5)) * (m - 1)), w = width * (1 - i / (m - 1)) ** 0.85; lines.push(Array.from({ length: 9 }, (_, a) => { const t = (a / 8) * TAU; return [c[i][0], c[i][1] + Math.cos(t) * w, k * zc[i] + Math.sin(t) * w * 0.8]; })); }
  return lines;
}

/** Wehende Linien (Mähne, Barteln): Mittellinien in Ruhelage, je Strähne eine Liste [x, y, z]. */
function flameStrands(lv) {
  // Flammenmähne: Strähnen vom Hinterkopf und Nacken nach hinten unten, abwechselnd aus der Mittelebene
  const K = [4, 6, 8][lv], mane = Array.from({ length: K }, (_, k) => {
    const u0 = K > 1 ? k / (K - 1) : 0.5, base = [lerp(0.32, 0.6, u0), lerp(0.32, -0.55, u0)], len = lerp(0.62, 0.48, u0) * [1, 1.15, 1.35][lv], side = (k % 2 ? 1 : -1) * lerp(0.06, 0.2, u0);
    return Array.from({ length: 12 }, (_, i) => { const u = i / 11; return [base[0] + len * (0.85 * u + 0.12 * Math.sin(Math.PI * u)), base[1] + len * (0.35 * u - 0.55 * u * u) + 0.03, side * (0.4 + 0.6 * u)]; });
  });
  // Barteln: von der Nüster als wehende Ranken senkrecht vor dem Kinn nach unten (Runde 11b: als Bogen unter dem Kiefer
  // zurück lagen sie parallel zur Kieferlinie und lasen sich wie ein Kehlsack); mehr Drohnen machen sie länger
  const L = [1, 1.2, 1.35][lv];
  const whisker = (k) => spline([[-0.95, 0.06], [-1.04, -0.1], [-1.0, -0.3], [-1.08, -0.5], [-0.98, -0.7], [-1.06, -0.88]].map(([x, y], i) => [x, 0.06 + (y - 0.06) * (i > 1 ? L : 1), k * (0.1 + 0.035 * i)]), 6);
  const whiskers = [whisker(1), whisker(-1)];
  return { mane, whiskers };
}

/** Der Kopf in Ruhelage (Maul geschlossen). Teile für assemble(); Mähne und Barteln sind die späteren Feuerdrohnen. */
function headParts(lv) {
  const parts = [];
  // Silhouette: Oberlinie (mit Nackenstacheln ab Stufe 1) und Unterlinie (mit Kehlschuppen ab Stufe 2)
  const top = lv >= 1 ? [...scalloped(TOPLINE.slice(0, 4), 4, 0.07, 1), ...TOPLINE.slice(4)] : TOPLINE;
  parts.push(curves('kopf', [flat([...top, ...UPLIP.slice(1)])], { w: 1.15 }));
  const throat = lv >= 2 ? scalloped(THROAT, 4, 0.035, 1) : THROAT;
  parts.push(curves('kiefer', [flat([...JAWLINE, ...throat.slice(1)])], { w: 1.15 }));
  // Hörner: ein langes Paar, ab Stufe 1 ein kurzes dahinter, ab Stufe 2 mit Rillen
  const big = [[-0.06, 0.37, 0.15], [0.14, 0.58, 0.22], [0.42, 0.74, 0.31], [0.68, 0.8, 0.39], [0.86, 0.93, 0.45]];
  const small = [[0.22, 0.37, 0.19], [0.4, 0.5, 0.25], [0.56, 0.53, 0.3]];
  parts.push(curves('horn', [-1, 1].flatMap((k) => [...hornLines(big, 0.075, k, lv >= 2 ? 5 : 0), ...(lv >= 1 ? hornLines(small, 0.045, k) : [])]), { w: 1.05 }));
  // Auge (mandelförmig) mit Brauenbogen, Nüster: auf beiden Seiten
  const E = [-0.2, 0.25], eye = Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * TAU; return [E[0] + Math.cos(a) * 0.075, E[1] + Math.sin(a) * 0.042 * (1 - 0.25 * Math.cos(a))]; });
  const brow = quad([-0.36, 0.29], [-0.04, 0.31], [-0.22, 0.4], 10);
  parts.push(curves('auge', [-1, 1].map((k) => ({ pts: sideLine(eye, k, 0.01), closed: true })), { w: 1.2 }), ...[-1, 1].map((k) => spot('pupille', [E[0] + 0.01, E[1], k * (HW(E[0]) + 0.02)], lv ? 3 : 1, 0.016, [0, 0, k])));
  parts.push(curves('braue', [-1, 1].map((k) => sideLine(brow, k, 0.015)), { w: 1.1 }));
  parts.push(curves('nuester', [-1, 1].map((k) => sideLine(spiral([-0.9, 0.1], 0.012, 0.035, 0, 1.15, 1, 14), k, 0.0, () => 0.09))));
  // Fangzähne: oben ein langer (ab Stufe 1 ein zweiter), unten einer (ab Stufe 1 zwei); der untere dreht mit dem Kiefer
  const fang = (x, y, h, w = 0.028) => [[x - w, y], [x + 0.01, y + h], [x + w, y]], tz = (x) => HW(x) * 0.7;
  parts.push(curves('zahn', [-1, 1].flatMap((k) => [sideLine(fang(-0.82, 0.0, -0.15), k, 0, tz), ...(lv >= 1 ? [sideLine(fang(-0.56, -0.02, -0.1), k, 0, tz)] : [])]), { w: 1.1 }));
  parts.push(curves('kieferzahn', [-1, 1].flatMap((k) => [sideLine(fang(-0.72, -0.068, 0.1), k, 0, (x) => HW(x) * 0.55), ...(lv >= 1 ? [sideLine(fang(-0.44, -0.065, 0.07), k, 0, (x) => HW(x) * 0.55)] : [])]), { w: 1.1 }));
  // Bart am Kinn (Stufe 2): zwei Strähnen, die mit dem Kiefer gehen und wehen
  if (lv >= 2) parts.push(curves('bart', [-1, 1].map((k) => spline([[-0.84, -0.17, k * 0.05], [-0.9, -0.36, k * 0.07], [-0.8, -0.52, k * 0.09], [-0.88, -0.68, k * 0.1]], 8))));
  // Flammenmähne und Barteln: die Drohnen des Feuers
  const { mane, whiskers } = flameStrands(lv);
  parts.push(curves('maehne', mane, { w: 1.25 }), curves('barteln', whiskers, { w: 1.25 })); // etwas dichter: sie tragen das Feuer
  return parts;
}
const FIRE_TAGS = new Set(['maehne', 'barteln']);
const JAWED = new Set(['kiefer', 'kieferzahn', 'bart']);

/** Kopf und Feuerdrohnen in EINEM assemble (eine Abstandsregel für alles); die Feuerdrohnen stehen danach am Ende. Für
 * jede wehende Drohne: Strähne und Stelle u entlang (0 = Ansatz), für die Welle und die Zuordnung im Feuer. */
/** Zahl der Linien und Merkmale je Detailstufe (Wächter: mehr Drohnen bringen mehr Teile). */
export const headLineCount = (n) => headParts(headLevel(n)).reduce((s, p) => s + (p.lines?.length ?? 0) + (p.spot ? 1 : 0), 0);
export function headModel(n) {
  const lv = headLevel(n), parts = headParts(lv), all = assemble(parts, n);
  const order = all.pts.map((_, j) => j).sort((a, b) => FIRE_TAGS.has(all.tags[a]) - FIRE_TAGS.has(all.tags[b]) || a - b);
  const pts = order.map((j) => all.pts[j]), tags = order.map((j) => all.tags[j]), B = tags.findIndex((t) => FIRE_TAGS.has(t));
  const { mane, whiskers } = flameStrands(lv), strands = [...mane.map((l) => ['maehne', spline(l, 4)]), ...whiskers.map((l) => ['barteln', l]), ['bart', null]];
  const bart = lv >= 2 ? [-1, 1].map((k) => spline([[-0.84, -0.17, k * 0.05], [-0.9, -0.36, k * 0.07], [-0.8, -0.52, k * 0.09], [-0.88, -0.68, k * 0.1]], 8)) : [];
  const wave = pts.map((p, j) => {
    const list = tags[j] === 'bart' ? bart.map((l) => ['bart', l]) : strands.filter(([t, l]) => t === tags[j] && l);
    if (!list.length) return null;
    let best = { d: Infinity };
    list.forEach(([, l], s) => l.forEach((q, i) => { const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); if (d < best.d) { const a = l[Math.max(0, i - 1)], b = l[Math.min(l.length - 1, i + 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; best = { d, s, u: i / (l.length - 1), nx: -(b[1] - a[1]) / L, ny: (b[0] - a[0]) / L }; } }));
    return { s: best.s + (tags[j] === 'barteln' ? 20 : 0), u: best.u, nx: best.nx, ny: best.ny };
  });
  return { lv, B: B < 0 ? n : B, F: B < 0 ? 0 : n - B, pts, tags, wave };
}

const headColour = (tag, p) => ({
  kopf: mix(GOLD, ORANGE, 0.15 + 0.35 * smooth((p[0] + 0.4) / 1.0)), kiefer: mix(GOLD, ORANGE, 0.45), horn: mix(WARM, GOLD, 0.3 + 0.3 * smooth((p[0] - 0.1) / 0.7)),
  auge: CYAN, pupille: DIAMOND, braue: GOLD, nuester: GOLD, zahn: WARM, kieferzahn: WARM, bart: ORANGE,
  maehne: mix(ORANGE, RED, 0.15 + 0.3 * smooth((p[0] - 0.4) / 0.6)), barteln: mix(GOLD, ORANGE, 0.3 + 0.5 * smooth((-p[1] - 0.05) / 0.7)),
}[tag] ?? GOLD);
const PITCH = 0.06; // etwas von oben, wie die Fahrzeuge
/** Kopf in Pose: um lift gehoben (um den Halsansatz), Drehung ya zum Publikum, leichte Aufsicht. */
function placeHead(o, ya, lift) { roll(o, -lift, NECK_BASE[0], NECK_BASE[1]); yaw(o, ya, -0.2, 0); pitch(o, PITCH); return o; }
/** Die abgewandte Kopfseite leuchtet schwächer (Tiefe als Licht); das ferne Auge fast aus, sonst wirkt es wie eine Brille. */
const near = (z, tag) => { const k = smooth((z + 0.1) / 0.18); return tag === 'auge' || tag === 'pupille' ? 0.25 + 0.75 * k : 0.62 + 0.38 * k; };
/** Wehen: eine Welle läuft die Strähne entlang, am Ansatz ruhig, außen am weitesten (amp: Stärke, 0 … 1). Immer QUER
 * zur Strähne an dieser Stelle (Normale nx, ny in der Bildebene, dazu z): längs geschoben würden sich die Drohnen stauchen
 * wie eine Ziehharmonika (Runde 11b: Bart bei 700 auf 0,006, Mähnenspitzen bei 1000 auf 0,008 zusammengeschoben). */
function sway(w, t, amp, out) {
  if (!w) return out;
  const a = amp * w.u * (0.05 + 0.03 * (w.s % 3) / 2), ph = (t * TAU) / 3.2 - 5 * w.u + w.s * 1.3;
  out[0] += w.nx * a * Math.sin(ph); out[1] += w.ny * a * Math.sin(ph); out[2] += 0.7 * a * Math.cos(ph);
  return out;
}
/** Drohne j in Pose: Kiefer offen um jaw (Unterlinie mit Gewicht), Wehen, dann Kopfhaltung. */
function headPose(model, j, t, ya, jaw, lift, amp, out) {
  const p = model.pts[j], tag = model.tags[j]; out[0] = p[0]; out[1] = p[1]; out[2] = p[2];
  if (jaw && JAWED.has(tag)) roll(out, jaw * (tag === 'kiefer' ? jawWeight(p) : 1), CORNER[0], CORNER[1]);
  sway(model.wave[j], t, amp, out);
  return placeHead(out, ya, lift);
}

/** Der Feuerstoß, der Höhepunkt: aus dem Maul schießt ein enger, weißglühender Strahl; dann bläht er sich zu einem großen
 * Flammenkörper auf, der den halben Himmel füllt (eine Hülle, in der Mitte am breitesten, nach oben gebogen, weil Feuer
 * steigt), darin wogen S Zungen mit versetzten Spitzen; zuletzt lösen sich Funken von den Spitzen und steigen auf.
 * Jede Drohne bleibt auf ihrer Zunge an ihrer Stelle u (0 = Maul); die Flamme wächst, wogt und steigt mit ihr. */
const FIRE = { jet: 0.5, bloom: 2.6, sparks: 4.3, hold: 6.8 };
function fireModel(F, lv, ya, jaw, lift) {
  const S = [4, 6, 7][lv], L0 = 0.95, L1 = [1.8, 2.2, 2.5][lv], W1 = [0.62, 0.72, 0.85][lv];
  const counts = Array.from({ length: S }, (_, k) => Math.floor(F / S) + (k < F % S ? 1 : 0));
  const M = placeHead([-0.98, -0.06, 0], ya, lift), ahead = placeHead([-1.98, 0.12, 0], ya, lift);
  const D = norm(sub(ahead, M)), U = norm([-D[1], D[0], 0]), Z = [D[1] * U[2] - D[2] * U[1], D[2] * U[0] - D[0] * U[2], D[0] * U[1] - D[1] * U[0]];
  // Zunge k: Lage quer in der Hülle (f ∈ −1 … 1, abwechselnd vorn und hinten), eigene Länge (versetzte Spitzen)
  const lane = (k) => lerp(-0.45, 1, S > 1 ? k / (S - 1) : 0.5), depth = (k) => (k % 2 ? 1 : -1) * (0.35 + 0.3 * ((k >> 1) % 2)), reach = (k) => 0.68 + 0.32 * ((Math.sin(k * 2.3 + 0.4) + 1) / 2); // versetzte Spitzen: die Front franst aus
  const spec = []; counts.forEach((c, k) => { for (let i = 0; i < c; i++) spec.push({ k, u: (i + 0.3 + 0.4 * ((k * 0.618) % 1)) / c }); });
  const at = (s, t, out) => {
    const g = smooth((t - FIRE.jet) / FIRE.bloom), L = lerp(L0, L1, g) * lerp(1, reach(s.k), g), u = s.u, d = u * L;
    // Hülle: ein Kegel, der sich bis nach vorn weitet und erst ganz vorn etwas einzieht (kein Blatt mit einer Spitze);
    // im Strahl (g = 0) ein enges Bündel
    const w = W1 * g * u ** 0.6 * (1 - 0.3 * u ** 3);
    const wav = (0.02 + 0.15 * g) * u * Math.sin(TAU * (1.2 * u - 0.42 * t) + s.k * 1.9); // langsam genug für Drohnen (Beschleunigung)
    const x = Math.max(0, t - FIRE.sparks), rise = 0.5 * g * (u * L) * u, spark = u > 0.72 ? 0.35 * (x < 1 ? (x * x) / 2 : x - 0.5) * smooth((u - 0.72) / 0.28) : 0; // Funken steigen mit Anlauf
    // im Strahl liegen die Zungen auf einer Wendel mit festem Abstand (Bündel), die Lage im Fächer kommt mit dem Aufblähen
    const f = lane(s.k), th = (s.k / S) * TAU + 2.2 * u, root = (0.045 + 0.05 * u) * (1 - g);
    for (let q = 0; q < 3; q++) out[q] = M[q] + D[q] * d + U[q] * (f * w + wav + Math.cos(th) * root) + Z[q] * (depth(s.k) * w * 0.6 + Math.sin(th) * root) + [0, 1, 0][q] * (rise + spark);
    return out;
  };
  // die Funken verlöschen ganz (sie laufen aus, statt als Streupunkte stehen zu bleiben)
  const light = (s, t) => { const fade = t > FIRE.sparks && s.u > 0.72 ? 1 - smooth((t - FIRE.sparks) / 2.3) : 1; return fade * (1.2 - 0.35 * s.u) * chase(s.u + 0.11 * s.k, t, 0.8, 0.3, 0.6, 1.5); };
  return { spec, at, light, S };
}
const fireColour = (u) => (u < 0.25 ? mix(WARM, GOLD, u / 0.25) : u < 0.6 ? mix(GOLD, ORANGE, (u - 0.25) / 0.35) : mix(ORANGE, RED, (u - 0.6) / 0.4));

// Haltungen: Dreiviertelansicht als Grundpose, Drehung weiter zum Publikum, zum Feuer zurück ins Halbprofil (das Feuer geht nach links)
const YAW0 = 0.5, YAW1 = 0.92, YAW2 = 0.55, YAW3 = 0.38, JAW0 = 0.18, JAW1 = 0.48, LIFT = 0.1, TURN = 3.4, INHALE = 2.4;

export const builders = {
  dragonRise: (n, caption) => {
    const model = riseModel(n), col = model.pts.map((p, j) => riseColour(model.tags[j], model.along[j], p));
    const pts = model.pts.map((_, j) => [...risePose(model, j, 0, [0, 0, 0]), ...col[j]]);
    return { beats: [{ pts, caption, live: (b, j, t, o) => {
      risePose(model, j, t, o);
      const tag = model.tags[j];
      if (tag === 'eye') o[3] = 1.4;
      else if (WAVED.has(tag)) o[3] = 1 + 0.4 * Math.exp(-((((1.2 - 1.5 * frac(t / 3.6)) - model.along[j]) / 0.08) ** 2)); // Licht läuft vom Hals zur Schwanzspitze
      else if (wingSide(tag)) o[3] = tag.startsWith('bone') ? 1.12 : 0.95 + 0.22 * (0.5 + 0.5 * Math.sin((t * TAU) / BEAT - Math.abs(model.pts[j][0]) * 2));
    } }] };
  },

  dragonHead: (n) => {
    const model = headModel(n), { B, F, lv } = model;
    const col = model.pts.map((p, j) => headColour(model.tags[j], p));
    const rank = lightRank(model.pts.slice(0, B)), fireU = model.wave.map((w) => w?.u ?? 0);
    const fire = fireModel(F, lv, YAW3, JAW1, LIFT), fireCol = fire.spec.map((s) => fireColour(s.u));
    const at = (t, ya, jaw, lift, amp) => model.pts.map((_, j) => [...headPose(model, j, t, ya, jaw, lift, amp, [0, 0, 0]), ...col[j]]);
    const fireAt = (t) => fire.spec.map((s, k) => [...fire.at(s, t, [0, 0, 0]), ...fireCol[k]]);
    // der Kopf ist ein starrer Teil: die Engine lässt jede Drohne an ihrem Platz, auch beim Zurückziehen zum Feuer
    const parts = (pts, flame = null) => [part('kopf', pts.slice(0, B), { rigid: true }), part('feuer', flame ?? pts.slice(B))];
    const breath = (t) => 0.02 * smooth(t / 1.5) * Math.sin((t * TAU) / 4.2); // Atem: der Kopf hebt und senkt sich kaum merklich
    const glow = (tag, g) => (tag === 'auge' || tag === 'pupille' ? 1 + g : 1);
    const headView = [...at(0, YAW0, JAW0, 0, 1), ...at(0, YAW1, JAW0, 0, 1), ...at(0, YAW2, JAW1, LIFT, 1.8)].filter((_, i) => i % 2 === 0);
    const fireView = [...at(0, YAW3, JAW1, LIFT, 1).slice(0, B), ...[0.5, 2.9, 4.2, 6.8].flatMap((t) => fireAt(t))].filter((_, i) => i % 2 === 0);
    const ember = (j, t, base) => base * (0.9 + 0.25 * Math.sin((t * TAU) / 1.6 - 6 * fireU[j] + (model.wave[j]?.s ?? 0))); // Glut läuft die Strähnen entlang
    return { beats: [
      { ...act(parts(at(0, YAW0, JAW0, 0, 0)), { caption: message('drache.aHeadAppears'), hold: 4, cloud: true, live: (b, j, t, o) => {
        headPose(model, j, t, YAW0, JAW0, breath(t), smooth(t / 1.5), o);
        o[3] = j >= B ? reveal(fireU[j], t, 1.2, { delay: 2.2 }) * ember(j, t, 0.95) : trace(rank[j], t, 2.6) * near(model.pts[j][2], model.tags[j]);
      } }), fitPts: headView },
      { ...act(parts(at(4, YAW0, JAW0, breath(4), 1)), { caption: message('drache.itTurnsToYou'), hold: TURN + 0.6, live: (b, j, t, o) => {
        headPose(model, j, t + 4, lerp(YAW0, YAW1, smooth(t / TURN)), JAW0, breath(t + 4), 1, o);
        o[3] = j >= B ? ember(j, t, 0.95) : glow(model.tags[j], 0.25 * smooth(t / TURN)) * near(model.pts[j][2], model.tags[j]);
      } }), fitPts: headView },
      { ...act(parts(at(8, YAW1, JAW0, breath(8), 1)), { caption: message('drache.opensItsMaw'), hold: INHALE + 0.7, live: (b, j, t, o) => {
        const u = smooth(t / INHALE); headPose(model, j, t + 8, lerp(YAW1, YAW2, u), lerp(JAW0, JAW1, u), lerp(breath(t + 8), LIFT, u), 1 + 0.8 * u, o);
        o[3] = j >= B ? ember(j, t, 0.95 + 0.4 * u) : glow(model.tags[j], 0.25 + 0.45 * u) * near(model.pts[j][2], model.tags[j]);
      } }), fitPts: headView },
      // eigener Bildausschnitt: die Kamera zieht zurück, der Kopf rückt nach rechts, die Flamme füllt den halben Himmel
      { ...act(parts(at(0, YAW3, JAW1, LIFT, 1), fireAt(0)), { caption: message('drache.andBreathesFire'), hold: FIRE.hold, frame: 'feuer', live: (b, j, t, o) => {
        if (j < B) { headPose(model, j, t, YAW3, JAW1, LIFT + breath(t), 1, o); o[3] = glow(model.tags[j], 0.7) * near(model.pts[j][2], model.tags[j]); return; }
        const s = fire.spec[j - B]; fire.at(s, t, o); o[3] = fire.light(s, t);
      } }), fitPts: fireView },
    ] };
  },
};
