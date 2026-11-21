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
//   dragonRise (3D, ab 200): ein östlicher Drache schraubt sich in Windungen nach oben (Runde 11b neu, Marc: „3D Drache ist
//     noch mega whack“). Der Kopf mit Hörnern, Mähne und Barteln steht ruhig über den Windungen und schaut sich in der
//     Dreiviertelansicht um; die Windungen drehen sich stetig, so dass sie unter ihm aufzusteigen scheinen, eine Welle
//     läuft vom Hals zur Schwanzquaste. Ab 400 Beine mit Krallen, Bauchschuppen, Barteln und die Perle, der er nachjagt;
//     ab 700 vier Beine und eine reichere Mähne.
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

// =====================================================================================================================
// 3D: der aufsteigende Drache, Runde 11b neu gedacht (Marc 21.11.2026: „3D Drache ist noch mega whack“). Gebaut nach dem
// Prinzip der Krake (scenes/gross/tintenfisch.js): Körper sind Bänder um eine Mittellinie, jede Drohne sitzt fest an
// ihrer Stelle (s entlang, Seite), Bewegung ändert nur die Mittellinie; so fliegt jede Drohne eine weiche Bahn.
// =====================================================================================================================
const lerpR = (a, b, u) => a + (b - a) * u;
const crossR = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** Kubische Bézierkurve (3D) bei e ∈ [0, 1]. */
const bez3 = (a, b, c, d, e, out) => { const v = 1 - e; for (let q = 0; q < 3; q++) out[q] = v * v * v * a[q] + 3 * v * v * e * b[q] + 3 * v * e * e * c[q] + e * e * e * d[q]; return out; };
const dotR = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const share2 = (n, w) => { const s = w.reduce((a, b) => a + b, 0), raw = w.map((x) => (n * x) / s), out = raw.map(Math.floor); let r = n - out.reduce((a, b) => a + b, 0); raw.map((x, i) => [x - out[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (r > 0) { out[i]++; r--; } }); return out; };
/** Detailstufe des aufsteigenden Drachen: 0 bis 399, 1 bis 699, 2 ab 700. */
export const riseLevel = (n) => (n >= 700 ? 2 : n >= 400 ? 1 : 0);

// ---- Drachenkopf (Anleihe beim 3D+-Kopf): Profil in der Mittelebene, Auge, Braue, Nüster, Fangzahn auf beiden Seiten,
// zwei Hörner in der Tiefe auseinander. Kopfrahmen: x nach hinten (Schnauze bei −x), y oben, z zur Seite. Länge ≈ 0,62.
const HP_TOP = [[-0.5, 0.0], [-0.52, 0.055], [-0.46, 0.1], [-0.4, 0.095], [-0.36, 0.12], [-0.2, 0.14], [-0.13, 0.205], [-0.07, 0.165], [0.03, 0.19], [0.12, 0.17], [0.17, 0.1], [0.16, 0.0]];
const HP_LIP = [[0.16, 0.0], [0.04, -0.02], [-0.25, -0.02], [-0.46, -0.01], [-0.5, 0.0]];
const HP_JAW = [[0.02, -0.04], [-0.22, -0.04], [-0.44, -0.055], [-0.47, -0.09], [-0.4, -0.12], [-0.18, -0.13], [0.05, -0.11], [0.12, -0.04]];
const hw = (x) => 0.06 + 0.07 * smooth((x + 0.5) / 0.55); // halbe Kopfbreite (breit genug, dass er von vorn ein Gesicht hat)
function headLines(lv) {
  const side = (pts2, k, w = hw, lift = 0) => pts2.map(([x, y]) => [x, y, k * (w(x) + lift)]);
  const lines = [];
  lines.push({ tag: 'kopf', pts: [...HP_TOP, ...HP_LIP.slice(1)].map(([x, y]) => [x, y, 0]), closed: true });
  lines.push({ tag: 'kiefer', pts: HP_JAW.map(([x, y]) => [x, y, 0]) });
  const eye = Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * TAU; return [-0.12 + Math.cos(a) * 0.035, 0.11 + Math.sin(a) * 0.02]; });
  for (const k of [-1, 1]) {
    lines.push({ tag: 'auge', pts: side(eye, k, hw, 0.005), closed: true });
    lines.push({ tag: 'braue', pts: side(quad([-0.2, 0.135], [-0.04, 0.15], [-0.12, 0.19], 6), k, hw, 0.008) });
    lines.push({ tag: 'zahn', pts: side([[-0.42, -0.01], [-0.405, -0.075], [-0.39, -0.01]], k, (x) => hw(x) * 0.7) });
    // Horn: vom Scheitel weit nach hinten oben, in der Tiefe nach außen
    const hc = spline([[0.0, 0.18], [0.12, 0.29], [0.26, 0.36], [0.38, 0.37]], 5), hz = (i) => k * (0.05 + 0.09 * (i / (hc.length - 1)));
    if (lv >= 1) { const o = ribbon(hc, (u) => 0.03 * (1 - u) ** 0.9); lines.push({ tag: 'horn', pts: o.map(([x, y], i) => [x, y, hz(i < hc.length ? i : 2 * hc.length - 2 - i)]), closed: true }); }
    else lines.push({ tag: 'horn', pts: hc.map(([x, y], i) => [x, y, hz(i)]) });
  }
  return lines;
}

// ---- Band entlang einer Mittellinie: Lage zur Zeit aus C (Punkte), T (Tangenten), N (Bandnormale), W (halbe Breite)
/** Rahmen entlang einer Mittellinie: T Tangente, N möglichst „oben“ (Rücken), B = T × N. */
function frames(C) {
  const m = C.length, T = [], N = [], B = [];
  for (let i = 0; i < m; i++) {
    const a = C[Math.max(0, i - 1)], b = C[Math.min(m - 1, i + 1)], t = norm(sub(b, a)), up = [0, 1, 0], d = dotR(up, t);
    let nn = norm([up[0] - d * t[0], up[1] - d * t[1], up[2] - d * t[2]]); if (!Number.isFinite(nn[0])) nn = [1, 0, 0];
    T.push(t); N.push(nn); B.push(crossR(t, nn));
  }
  return { T, N, B };
}
/** Punkt auf dem Band: Stelle s ∈ [0, 1] (Index-Interpolation), Querlage q (Vielfaches der halben Breite entlang N), r entlang B. */
function onBand(C, F, W, s, q, r, out) {
  const f = s * (C.length - 1), i = Math.min(C.length - 2, Math.floor(f)), w = f - i;
  for (let k = 0; k < 3; k++) {
    const c = lerpR(C[i][k], C[i + 1][k], w), n = lerpR(F.N[i][k], F.N[i + 1][k], w), b = lerpR(F.B[i][k], F.B[i + 1][k], w), h = lerpR(W[i], W[i + 1], w);
    out[k] = c + n * q * h + b * r * h;
  }
  return out;
}

// ---- Der östliche Drache, der sich als Spirale nach oben schraubt. Verglichen mit einem westlichen Drachen mit großen
// Flügelflächen (Runde 11b, Kontaktbogen): der las sich wie ein Kolibri, die Flächen wirkten steif; die Spirale trägt Raum
// und Bewegung.
const EAST = { RX: 1.25, RZ: 0.85, H: 1.85, top: 0.5, turns: 1.55, M: 240, S0: 0.14 };
/** Kopf: ruhig oben über den Windungen, Dreiviertelansicht zum Publikum; schaut sich langsam um. k = Kopfgröße. */
const eastHead = (t, on, lv) => {
  const a = 0.62 + on * 0.22 * Math.sin((t * TAU) / 13), fwd = norm([-Math.cos(a), 0.22 + on * 0.05 * Math.sin((t * TAU) / 7), Math.sin(a)]);
  const up = norm(sub([0, 1, 0], scale(fwd, fwd[1]))), sd = crossR(fwd, up), k = [1.6, 1.7, 1.8][lv];
  return { o: [-0.42, EAST.top + 0.78 + on * 0.04 * Math.sin((t * TAU) / 6.5), 0.2], fwd, up, sd, k };
};
/** Mittellinie zur Zeit t (Kopf bei s = 0 oben, Schwanz unten). Die Windungen drehen sich stetig um die Hochachse, so dass
 * sie unter dem ruhigen Kopf aufzusteigen scheinen; eine Welle läuft vom Hals zum Schwanz (Nachlauf). Der Hals führt als
 * Bogen vom Hinterkopf in die erste Windung. */
function eastLine(t, on, lv) {
  const { RX, RZ, H, top, turns, M, S0 } = EAST, C = [], W = [], wide = [0.1, 0.12, 0.13][lv];
  const P = (s) => {
    const wave = on * Math.sin(TAU * (1.4 * s - t / 3.2)), th = -0.2 - s * turns * TAU - (t * TAU) / 18, r = (1 - 0.3 * s) * (1 + 0.12 * wave * s);
    return [RX * r * Math.cos(th), top - s * H + 0.16 * wave * Math.min(1, s * 2.5), RZ * r * Math.sin(th)];
  };
  const h = eastHead(t, on, lv), A = addv(h.o, scale(h.fwd, -0.17 * h.k)), D = P(S0), D2 = P(S0 + 0.01), dD = norm(sub(D, D2));
  // der Hals als S: vom Hinterkopf erst nach hinten und zur Seite, dann in einem Bogen in die erste Windung
  const B1 = addv(addv(addv(A, scale(h.fwd, -0.55)), scale(h.sd, -0.35)), [0, -0.05, 0]), B2 = addv(D, scale(dD, 0.9));
  for (let i = 0; i <= M; i++) {
    const s = i / M;
    if (s < S0) C.push(bez3(A, B1, B2, D, s / S0, [0, 0, 0])); else C.push(P(s));
    W.push(wide * (0.55 + 0.45 * smooth(s / 0.12)) * (1 - 0.8 * smooth((s - 0.35) / 0.65)));
  }
  return { C, W };
}
/** Teile als Stellen auf dem Band (Körper) und im Kopfrahmen (Kopf). */
function eastModel(n) {
  const lv = riseLevel(n);
  // Kopf: Linien im Kopfrahmen, gleichmäßig verteilt (assemble)
  const head = headLines(lv), headParts = [...new Set(head.map((l) => l.tag))].map((tag) => curves(tag, head.filter((l) => l.tag === tag).map((l) => (l.closed ? { pts: l.pts, closed: true } : l.pts)), { w: 1.15 }));
  // Längen der Körperteile (Ruhelage) für die Verteilung
  const { C } = eastLine(0, 0, lv), bodyLen = (() => { let L = 0; for (let i = 1; i < C.length; i++) L += Math.hypot(...sub(C[i], C[i - 1])); return L; })();
  const headLen = head.reduce((a, l) => a + (() => { let L = 0; const p = l.closed ? [...l.pts, l.pts[0]] : l.pts; for (let i = 1; i < p.length; i++) L += Math.hypot(...sub(p[i], p[i - 1])); return L; })(), 0) * 1.15;
  const spikes = lv >= 1 ? 18 : 12, spikeLen = spikes * 0.16, scales = lv >= 1 ? 26 : 0, scaleLen = scales * 0.11, legs = lv >= 2 ? 4 : lv >= 1 ? 2 : 0, legLen = legs * 0.62;
  const K = eastHead(0, 0, lv).k, mane = [2, 4, 6][lv], maneLen = mane * 0.5 * K;
  const whisk = lv >= 1 ? 2 : 0, whiskLen = whisk * 0.55 * K, tuft = 3, tuftLen = tuft * 0.22, pearl = lv >= 1 ? 1 : 0, pearlLen = pearl * 0.45 * K;
  const [nBody, nHead, nSpike, nScale, nLeg, nWhisk, nTuft, nPearl, nMane] = share2(n, [2 * bodyLen, headLen * K, spikeLen, scaleLen, legLen, whiskLen, tuftLen, pearlLen, maneLen]);
  const slots = [];
  // Körper: zwei Kanten (Rücken q = +1, Bauch q = −1), gleichmäßig in s; zum Kopf hin beginnt er am Hinterkopf
  const [nb0, nb1] = share2(nBody, [1, 1]);
  for (const [cnt, q] of [[nb0, 1], [nb1, -1]]) for (let i = 0; i < cnt; i++) slots.push({ kind: 'body', s: 0.02 + 0.98 * ((i + (q > 0 ? 0.25 : 0.75)) / cnt), q });
  // Rückenkamm: Zacken über der Rückenkante (zwei Drohnen je Zacke: Spitze und Flanke)
  // mindestens drei Drohnen je Zacke (Flanke, Spitze, Flanke), sonst liegen einzelne Zackenpunkte auf der Rückenkante
  const zk = Math.max(1, Math.min(spikes, Math.floor(nSpike / 3)));
  for (let i = 0; i < nSpike; i++) { const z = Math.floor((i * zk) / nSpike), f = (((i * zk) / nSpike) % 1) + (0.5 * zk) / nSpike; slots.push({ kind: 'spike', s: 0.2 + (0.52 * (z + 0.5)) / zk, f, w: 0.52 / zk }); }
  for (let i = 0; i < nScale; i++) { const z = Math.floor((i * scales) / nScale), f = ((i * scales) / nScale) % 1; slots.push({ kind: 'scale', s: 0.08 + (0.55 * (z + 0.5)) / scales, f }); }
  for (let i = 0; i < nLeg; i++) { const g = Math.floor((i * legs) / nLeg), f = ((i * legs) / nLeg) % 1; slots.push({ kind: 'leg', g, f }); }
  for (let i = 0; i < nWhisk; i++) { const g = Math.floor((i * whisk) / nWhisk), f = ((i * whisk) / nWhisk) % 1; slots.push({ kind: 'whisk', g, f }); }
  for (let i = 0; i < nTuft; i++) { const g = Math.floor((i * tuft) / nTuft), f = ((i * tuft) / nTuft) % 1; slots.push({ kind: 'tuft', g, f }); }
  for (let i = 0; i < nPearl; i++) slots.push({ kind: 'pearl', f: i / nPearl });
  for (let i = 0; i < nMane; i++) { const g = Math.floor((i * mane) / nMane), f = ((i * mane) / nMane) % 1; slots.push({ kind: 'mane', g, f, m: mane }); }
  const hd = assemble(headParts, nHead);
  hd.pts.forEach((p, i) => slots.push({ kind: 'head', p, tag: hd.tags[i] }));
  return { lv, slots };
}
const EAST_LEGS = [0.16, 0.48, 0.3, 0.62];
/** Lage aller Drohnen zur Zeit t. */
function eastScene(model) {
  let at = NaN, C, W, F, H = null;
  const ready = (t) => {
    if (t === at) return; at = t;
    const on = smooth(t / 2); ({ C, W } = eastLine(t, on, model.lv)); F = frames(C); H = eastHead(t, on, model.lv);
  };
  const tmp = [0, 0, 0];
  return (q, t, out) => {
    ready(t);
    if (q.kind === 'body') return onBand(C, F, W, q.s, q.q, 0, out);
    if (q.kind === 'spike') { // Zacke: von der Rückenkante nach oben hinten und zurück
      const a = 0.5 + 0.5 * (q.f < 0.5 ? q.f * 2 : 2 - q.f * 2), ds = 0.7 * q.w * (q.f - 0.5); onBand(C, F, W, Math.min(1, q.s + ds), 1, 0, out);
      const i = Math.round(q.s * (C.length - 1)), h = 0.08 * (1 - 0.5 * q.s) * a; for (let k = 0; k < 3; k++) out[k] += F.N[i][k] * h; return out;
    }
    if (q.kind === 'scale') { const a = Math.PI * (0.18 + 0.64 * q.f); return onBand(C, F, W, q.s + 0.008 * Math.cos(a), -Math.cos(a) * 0.9, Math.sin(a) * 1.1, out); } // Bauchschuppe: Bogen über die Vorderseite
    if (q.kind === 'leg') { // Bein: Oberschenkel vom Bauch nach außen unten, Unterschenkel nach vorn, drei gespreizte Krallen
      const s = EAST_LEGS[q.g], i = Math.round(s * (C.length - 1)), side = q.g % 2 ? 1 : -1, dirO = scale(F.B[i], side), dn = scale(F.N[i], -1), fw = scale(F.T[i], -1);
      const base = onBand(C, F, W, s, -0.5, side * 0.8, tmp).slice(), sw = 0.03 * Math.sin((t * TAU) / 3 + q.g * 1.7);
      const knee = addv(base, addv(scale(dn, 0.13), scale(dirO, 0.12 + sw))), ankle = addv(knee, addv(scale(dn, 0.1), scale(fw, 0.1)));
      const claw = (a) => addv(ankle, addv(scale(fw, 0.07 * Math.cos(a)), addv(scale(dirO, 0.07 * Math.sin(a)), scale(dn, 0.03))));
      if (q.f < 0.55) { const pts = [base, knee, ankle], u = (q.f / 0.55) * 2, k0 = Math.min(1, Math.floor(u)), w = u - k0; for (let k = 0; k < 3; k++) out[k] = lerpR(pts[k0][k], pts[k0 + 1][k], w); return out; }
      const c = Math.min(2, Math.floor(((q.f - 0.55) / 0.45) * 3)), v = ((q.f - 0.55) / 0.45) * 3 - c, tip = claw((c - 1) * 0.75);
      for (let k = 0; k < 3; k++) out[k] = lerpR(ankle[k], tip[k], 0.45 + 0.55 * v); return out;
    }
    if (q.kind === 'tuft') { // Schwanzquaste: drei Flammenblätter an der Schwanzspitze
      const i = C.length - 1, tip = C[i], a = (q.g - 1) * 0.6, d = norm(addv(scale(F.T[i], Math.cos(a)), scale(F.N[i], Math.sin(a)))), L = 0.2, u = q.f, side = u < 0.5 ? 1 : -1, v = 0.25 + 0.75 * (1 - Math.abs(1 - 2 * u));
      for (let k = 0; k < 3; k++) out[k] = tip[k] + d[k] * L * v + F.B[i][k] * 0.04 * side * Math.sin(Math.PI * v) + F.N[i][k] * 0.03 * Math.sin(TAU * v + t);
      return out;
    }
    const h = H;
    if (q.kind === 'head') { const p = q.p, m = h.k; for (let k = 0; k < 3; k++) out[k] = h.o[k] - h.fwd[k] * p[0] * m + h.up[k] * p[1] * m + h.sd[k] * p[2] * m; return out; }
    if (q.kind === 'whisk') { // Bartel: von der Nüster in einer langen Welle nach hinten unten, weht
      const k1 = q.g ? 1 : -1, u = q.f, x = -0.45 + 0.95 * u, y = 0.0 - 0.18 * u - 0.1 * Math.sin(Math.PI * u) + 0.05 * u * Math.sin(TAU * (u - t / 2.2)), z = k1 * (0.06 + 0.16 * u);
      for (let k = 0; k < 3; k++) out[k] = h.o[k] + h.k * (-h.fwd[k] * x + h.up[k] * y + h.sd[k] * z); return out;
    }
    if (q.kind === 'mane') { // Mähne: Strähnen vom Hinterkopf nach hinten, abwechselnd links und rechts, wehen mit Nachlauf
      const sg = q.g % 2 ? 1 : -1, row = Math.floor(q.g / 2) / Math.max(1, q.m / 2 - 1), u = q.f, w = Math.sin(TAU * (1.1 * u - t / 2.4) + q.g * 0.9);
      const x = 0.06 + 0.06 * row + 0.5 * u, y = 0.16 - 0.1 * row + 0.1 * u * (1 - row) + 0.05 * u * w, z = sg * (0.05 + 0.12 * u + 0.04 * u * w);
      for (let k = 0; k < 3; k++) out[k] = h.o[k] + h.k * (-h.fwd[k] * x + h.up[k] * y + h.sd[k] * z); return out;
    }
    if (q.kind === 'pearl') { // die Perle vor dem Kopf: ein Ring, dem er nachjagt
      const a = q.f * TAU, c = addv(h.o, addv(scale(h.fwd, 0.62 * h.k), scale(h.up, 0.05 * h.k))), r = 0.07 * h.k, e1 = h.sd, e2 = norm(addv(h.up, scale(h.fwd, 0.3)));
      for (let k = 0; k < 3; k++) out[k] = c[k] + (e1[k] * Math.cos(a) + e2[k] * Math.sin(a)) * r; return out;
    }
    return out;
  };
}
const eastColour = (q) => {
  if (q.kind === 'head') return { auge: CYAN, zahn: WARM, horn: mix(WARM, GOLD, 0.4), braue: GOLD }[q.tag] ?? mix(GOLD, ORANGE, 0.25);
  if (q.kind === 'body') return q.q > 0 ? mix(ORANGE, RED, 0.25 + 0.45 * q.s) : mix(GOLD, ORANGE, 0.2 + 0.5 * q.s);
  if (q.kind === 'spike') return mix(GOLD, ORANGE, 0.3 * q.s);
  if (q.kind === 'scale') return mix(GOLD, WARM, 0.3);
  if (q.kind === 'whisk' || q.kind === 'tuft') return mix(GOLD, ORANGE, 0.5);
  if (q.kind === 'mane') return mix(WARM, GOLD, 0.3 + 0.5 * q.f);
  if (q.kind === 'pearl') return WARM;
  return mix(ORANGE, GOLD, 0.4);
};
/** Modell des aufsteigenden Drachen (für den Wächter): Detailstufe und Stellen je Drohne. */
export const riseModel = (n) => eastModel(n);
/** Lage aller Drohnen des aufsteigenden Drachen zur Zeit t (ohne Ansicht), für den Wächter. */
export const risePoseAt = (n, t) => { const m = eastModel(n), pose = eastScene(m); return m.slots.map((q) => pose(q, t, [0, 0, 0])); };
function eastBuilder(n, caption) {
  const model = eastModel(n), pose = eastScene(model), col = model.slots.map(eastColour);
  const view = (t, o) => { yaw(o, 0.25 * smooth(t / 3) * Math.sin((t * TAU) / 18), 0, 0); pitch(o, 0.3); return o; };
  const at = (t) => model.slots.map((q, j) => [...view(t, pose(q, t, [0, 0, 0])), ...col[j]]);
  const fitPts = [0, 4, 8, 12, 16].flatMap((t) => at(t)).filter((_, i) => i % 3 === 0);
  return { beats: [{ pts: at(0), caption, hold: 16, fitPts, live: (b, j, t, o) => {
    const q = model.slots[j]; view(t, pose(q, t, o));
    // Licht läuft den Körper vom Kopf zum Schwanz entlang, Augen und Perle glühen
    o[3] = q.kind === 'body' || q.kind === 'spike' ? 1 + 0.35 * Math.exp(-(((((t / 4) % 1.4) - q.s - 0.1) / 0.07) ** 2)) : q.tag === 'auge' ? 1.4 : q.kind === 'pearl' ? 1.25 + 0.25 * Math.sin(t * 2.4 + q.f * TAU) : 1;
  } }] };
}

export const builders = {
  dragonRise: (n, caption) => eastBuilder(n, caption),

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
