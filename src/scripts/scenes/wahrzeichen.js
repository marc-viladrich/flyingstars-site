// Wahrzeichen als 2D-Linienzeichnung (Runde 10, docs/katalog-wahrzeichen.md). Jedes Wahrzeichen ist eine Liste von
// Polylinien mit Teilnamen, je Detailstufe eine eigene Zeichnung: Bei 100 Drohnen hat die Zeichnung nur so viele Ecken,
// wie die Linien tragen, sonst stünden die Ecken dicht und die Linien dazwischen dünn. Abgetastet wird mit lineSample()
// aus catalog-resample.js (dieselbe Abtastung wie die 2D-Katalogmotive): jede Ecke, jedes Linienende und jede Kreuzung
// bekommt genau eine Drohne, dazwischen gleiche Abstände, kein Paar enger als CLEAR, genau n Drohnen. Keine Füllflächen.
// Maße nach Referenzansichten (Wikimedia Commons, nur zum Abgleich), leicht vereinfacht, wo eine Drohnenlinie sonst zu
// eng an der nächsten stünde.
import { prepareLines, stageSample, DOT_MAX } from './catalog-resample.js';
import { t as message } from '../../i18n/ui.mjs';
import { WARM, GOLD, CYAN, RED, BLUE, DIAMOND, mix, glint, chase, sway, trace, reveal, lightRank, share, part, act, sparkle } from '../show-motion.js';
import { WAHRZEICHEN_3D, warning, clockLit, CLOCK } from './catalog-3d/wahrzeichen.js';
import { textFormationAsync } from '../text-formation.js';
import { sampleOutline } from '../show-geometry.js';

const TAU = Math.PI * 2;
/** Detailstufe je Drohnenzahl: 0 bis 149, 1 bis 249, 2 ab 250. */
export const level = (n) => (n < 150 ? 0 : n < 250 ? 1 : 2);

const P = (tag, pts, closed = false) => ({ tag, pts, closed });
/** Bogen um (cx, cy) mit Halbachsen rx, ry von a0 nach a1, k Stücke (fein genug, dass keine Ecke entsteht). */
export const arc = (cx, cy, rx, ry, a0, a1, k = 24) => Array.from({ length: k + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / k; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
/** Spiegelt eine Liste von Punkten an x = 0. */
const mirror = (pts) => pts.map(([x, y]) => [-x, y]);
/** Profil [[r, y], …] (von unten nach oben) als geschlossener Umriss eines Rotationskörpers in der Ansicht. */
const silhouette = (profile) => [...profile.map(([r, y]) => [r, y]), ...profile.slice().reverse().map(([r, y]) => [-r, y])];

// ---------- Berliner Fernsehturm ----------
// Maße nach der Kontur auf Commons (Kontur-BerlinerFernsehturm.svg): Höhe 2,3 Einheiten = 368 m, Kugel r 0,107 (hier
// 0,13, sonst verschwindet sie bei 100 Drohnen neben dem Schaft), Kugelmitte 0,20 über der Mitte, Schaft oben 0,029, unten
// 0,046 halbe Breite (hier 0,04 und 0,065, damit die beiden Schaftlinien mehr als einen Drohnenabstand trennt).
export const FT = { ground: -1.15, sphere: [0, 0.2, 0.13], shaftTop: 0.04, shaftBottom: 0.065, korb: 0.47, tip: 1.15 };
function fernsehturm(lv) {
  const [cx, cy, r] = FT.sphere, y0 = FT.ground, top = cy - r * Math.cos(Math.asin(FT.shaftTop / r)), out = [];
  // Schaft: zwei Linien vom Fuß bis an die Kugel; ab Stufe 1 mit dem breiteren Fuß (Fußbau)
  const foot = lv ? [[0.13, y0], [0.075, y0 + 0.1], [FT.shaftBottom, y0 + 0.2]] : [[FT.shaftBottom, y0]];
  out.push(P('shaft', [...foot, [FT.shaftTop, top]]), P('shaft', mirror([...foot, [FT.shaftTop, top]])));
  if (lv) out.push(P('base', [[-0.13, y0], [0.13, y0]]));
  out.push(P('sphere', arc(cx, cy, r, r, 0, TAU, 72).slice(0, 72), true));
  if (lv) out.push(P('band', [[-r * 0.97, cy + 0.02], [r * 0.97, cy + 0.02]]));
  if (lv === 2) out.push(P('band', [[-r * 0.97, cy - 0.025], [r * 0.97, cy - 0.025]]));
  const sTop = cy + r;
  if (lv) {
    // Turmkorb über der Kugel: ein schmaler Hals, oben ein Kragen, dann die Antenne
    const k = FT.korb, w = 0.03;
    out.push(P('korb', [[w, sTop + 0.002], [w, k]]), P('korb', [[-w, sTop + 0.002], [-w, k]]), P('korb', [[-w - 0.02, k], [w + 0.02, k]]));
    out.push(P('antenna', [[0, k], [0, FT.tip]]));
    if (lv === 2) for (const y of [0.68, 0.88]) out.push(P('antenna', [[-0.025, y], [0.025, y]]));
  } else out.push(P('antenna', [[0, sTop], [0, FT.tip]]));
  return out;
}

// ---------- Rheinturm Düsseldorf ----------
// Maße nach „Rheinturm - Gesamtansicht vom Medienhafen“ (Commons): 2,3 Einheiten = 240,5 m. Schaft halbe Breite unten
// 0,1, oben 0,07; Kanzel: Glaskegel bis 0,17 bei y 0,59, darüber zwei Scheiben, Antenne ab 0,75.
export const RT = { ground: -1.15, shaftTop: [0.07, 0.466], tip: 1.15 };
const RT_POD = [[0.07, 0.466], [0.17, 0.594], [0.17, 0.615], [0.15, 0.628], [0.15, 0.665], [0.128, 0.7], [0.128, 0.735], [0.04, 0.754]];
const RT_POD_SIMPLE = [[0.07, 0.466], [0.17, 0.594], [0.15, 0.64], [0.128, 0.7], [0.04, 0.754]];
function rheinturm(lv) {
  const y0 = RT.ground, pod = lv ? RT_POD : RT_POD_SIMPLE, out = [];
  out.push(P('shaft', [[0.1, y0], RT.shaftTop]), P('shaft', mirror([[0.1, y0], RT.shaftTop])));
  out.push(P('pod', pod), P('pod', mirror(pod)));
  // die Kanzel: unter dem Glas eine Linie quer (der Kegel sitzt auf dem Schaft), darüber die Scheiben
  out.push(P('pod', [[-0.07, 0.466], [0.07, 0.466]]));
  out.push(P('glass', [[-0.17, 0.594], [0.17, 0.594]]));
  if (lv === 2) out.push(P('pod', [[-0.15, 0.665], [0.15, 0.665]]));
  out.push(P('antenna', [[0, 0.754], [0, RT.tip]]));
  if (lv) out.push(P('base', [[-0.18, y0], [0.18, y0]]));
  // ab Stufe 1 die Lichtzeituhr: eine Reihe Lichter in der Mitte des Schafts (CLOCK in catalog-3d/wahrzeichen.js)
  if (lv) out.push(P('clock', [[0, CLOCK.from], [0, CLOCK.to]]));
  return out;
}

// ---------- Brandenburger Tor ----------
// Säulenhalle mit sechs Säulen (Mitte breiter), Gebälk, Attika mit Stufe in der Mitte, Quadriga. Breite 2,1; die Säulen
// sind gegenüber dem Original (15 m auf 31 m Breite) etwas gestaucht, damit die Linien bei 100 Drohnen nicht zu lang werden.
export const BT = { ground: -0.6, colTop: 0.08, beamTop: 0.26, atticTop: 0.4, steps: 0.5, cols: [-0.95, -0.6, -0.22, 0.22, 0.6, 0.95] };
function tor(lv) {
  const { ground: g, colTop: c, beamTop: b, atticTop: a, steps: s, cols } = BT, W = 1.05, m = 0.5, out = [];
  // Säulen: bis Stufe 1 eine Linie je Säule, in Stufe 2 zwei (Säulenschaft); zwei Linien wären bei weniger Drohnen eine Leiter
  const d = lv === 2 ? 0.035 : 0;
  for (const x of cols) {
    if (d) out.push(P('column', [[x - d, g], [x - d, c]]), P('column', [[x + d, g], [x + d, c]]));
    else out.push(P('column', [[x, g], [x, c]]));
  }
  // Gebälk und Attika: in Stufe 0 nur der Umriss (die Unterkante des Gebälks und die obere Kontur mit der Stufe in der
  // Mitte), ab Stufe 1 trennt eine Linie Gebälk und Attika
  out.push(P('beam', [[-W, c], [W, c]]));
  const top = [[-W, c], [-W, lv ? b : a], ...(lv ? [[-0.98, b]] : []), [-0.98, a], [-m, a], [-m, s], [m, s], [m, a], [0.98, a], ...(lv ? [[0.98, b]] : []), [W, lv ? b : a], [W, c]];
  out.push(P('attic', lv ? top : [[-W, c], [-W, a], [-m, a], [-m, s], [m, s], [m, a], [W, a], [W, c]]));
  if (lv) out.push(P('beam', [[-W, b], [W, b]]));
  if (lv === 2) out.push(P('ground', [[-1.12, g], [1.12, g]]));
  out.push(...quadriga(lv, s));
  return out;
}
/** Die Quadriga auf der Stufe (Basis y = s): Wagen mit Viktoria und Stab, davor die Pferde. */
function quadriga(lv, s) {
  // von vorn: vier Pferdeköpfe nebeneinander, dahinter die Viktoria mit dem Stab (oben Kranz bzw. Adler)
  const heads = lv ? [-0.3, -0.12, 0.12, 0.3] : [-0.24, 0.24], h = 0.16, out = [];
  const line = [[-0.38, s]];
  for (const x of heads) line.push([x - 0.05, s + h * 0.7], [x, s + h], [x + 0.05, s + h * 0.7]);
  line.push([0.38, s]);
  out.push(P('quadriga', line.sort((p, q) => p[0] - q[0])));
  out.push(P('staff', [[0, s + h * 0.55], [0, s + (lv ? 0.38 : 0.34)]]));
  if (lv) out.push(P('staff', arc(0, s + 0.42, 0.04, 0.04, -Math.PI / 2, (3 * Math.PI) / 2, 16).slice(0, 16), true));
  return out;
}

// ---------- Kölner Dom ----------
// Westfassade nach „Kölner Dom - Westfassade 2022 ohne Gerüst“ (Commons): Höhe 2,3 Einheiten = 157 m, Breite 1,03; zwei
// Türme (je 0,43 breit) mit Turmhelmen ab y 0,43, dazwischen der niedrigere Mittelteil mit Giebel bis y −0,08.
export const KD = { ground: -1.15, half: 0.52, inner: 0.09, shoulder: 0.25, helm: 0.42, tip: 1.15, gable: -0.08, gableFoot: -0.36 };
function dom(lv) {
  const { ground: g, half: H, inner: I, shoulder: S, helm: Hm, tip: T, gable: G, gableFoot: F } = KD, out = [];
  // ein Turm (rechts, gespiegelt für links): Außenkante, Schulter, Helm bis zur Spitze, innen wieder herunter zum Mittelteil
  const cx = (H + I) / 2, hw = 0.13;
  const tower = [[H, g], [H, S], [H - 0.05, Hm], [cx + hw, Hm], [cx, T], [cx - hw, Hm], [I + 0.05, Hm], [I, S], [I, F]];
  out.push(P('tower', tower), P('tower', mirror(tower)));
  // Mittelteil: Giebel zwischen den Türmen
  out.push(P('gable', [[-I, F], [0, G], [I, F]]));
  if (lv) {
    out.push(P('ground', [[-H, g], [H, g]]));
    // Hauptportal als Spitzbogen
    const w = 0.12, ys = -0.78, half = [[w, g], [w, ys], [w * 0.8, ys + 0.1], [w * 0.45, ys + 0.18], [0, ys + 0.23]];
    out.push(P('portal', [...mirror(half), ...half.slice(0, -1).reverse()]));
    // Kreuzblumen auf den Spitzen
    for (const s of [-1, 1]) out.push(P('finial', [[s * cx - 0.035, T - 0.05], [s * cx + 0.035, T - 0.05]]));
  }
  if (lv === 2) {
    // je Turm ein hohes Spitzbogenfenster und das Gesims unter dem Helm
    for (const s of [-1, 1]) {
      const x = s * cx;
      out.push(P('window', [[x - 0.06, -0.3], [x - 0.06, 0.02], [x, 0.12], [x + 0.06, 0.02], [x + 0.06, -0.3]]));
      out.push(P('window', [[x - 0.06, -0.85], [x - 0.06, -0.55], [x, -0.46], [x + 0.06, -0.55], [x + 0.06, -0.85]]));
    }
  }
  return out;
}

// ---------- Elbphilharmonie ----------
// Ansicht von der Elbe auf die Westspitze nach „Hamburg 20260815 Elbphilharmonie“ (Commons): Breite 2,0, Backsteinsockel
// bis y −0,25, darüber der Glasbau mit der Wellenkrone aus fünf Spitzen (die höchste bei 1,63, links der Mitte). Zwischen
// den Spitzen hängen die Dachlinien konkav durch; jede Spitze ist eine Ecke (eine Drohne genau auf der Spitze).
export const EP = { ground: -1.0, brick: -0.25, half: 1.0, crown: [[-1.0, 0.795], [-0.923, 0.945], [-0.709, 1.329], [-0.081, 1.629], [0.274, 1.308], [0.688, 0.953], [0.992, 0.765]] };
/** Durchhängende Dachlinie von a nach b: quadratischer Bogen, dessen tiefste Stelle etwa dip unter der niedrigeren Spitze
 * liegt (Kontrollpunkt 2 · dip darunter), so bleibt jede Spitze eine Spitze. */
export const sweep = (a, b, dip = 0.12, k = 10) => Array.from({ length: k + 1 }, (_, i) => { const u = i / k, c = [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 2 * dip]; return [(1 - u) ** 2 * a[0] + 2 * (1 - u) * u * c[0] + u * u * b[0], (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * c[1] + u * u * b[1]]; });
/** Die Krone als eine Linie: Spitzen als Ecken, dazwischen durchhängende Bögen (Durchhang nach dem Foto). */
export const DIPS = [0.04, 0.1, 0.13, 0.12, 0.1, 0.05];
export const crownLine = () => { const c = EP.crown, out = [c[0]]; for (let i = 1; i < c.length; i++) out.push(...sweep(c[i - 1], c[i], DIPS[i - 1], 12).slice(1)); return out; };
function elphi(lv) {
  const { ground: g, brick: k, half: H, crown } = EP, out = [];
  out.push(P('roof', [[-H, k], ...crownLine(), [crown.at(-1)[0], k]]));
  // Backsteinsockel: Umriss unten, die Fuge zum Glas oben
  out.push(P('brick', [[-H, k], [-H, g], [H, g], [H, k]]));
  out.push(P('glassline', [[-H, k], [H, k]]));
  // ab Stufe 1: die senkrechten Fensterbänder im Backstein
  if (lv) for (const x of lv === 2 ? [-0.38, 0.12, 0.45, 0.7] : [0.12, 0.7]) out.push(P('brickline', [[x, k], [x, g]]));
  return out;
}

// ---------- Wuppertaler Schwebebahn ----------
// Seitenansicht: das Fahrgerüst als Träger, zwei Stützen als schräge Böcke, darunter der hängende Wagen mit zwei
// Gehängen. Ab Stufe 1 hat der Träger Pfosten zwischen den Gurten, der Wagen eine Fensterreihe.
export const SB = { top: 0.42, bottom: 0.3, ground: -0.75, car: [-0.5, 0.5, -0.32, 0.04], hang: [-0.3, 0.3] };
function schwebebahn(lv) {
  const { top: T, bottom: B, ground: g, car: [x0, x1, y0, y1], hang } = SB, out = [], X = 1.2;
  out.push(P('rail', [[-X, T], [X, T]]), P('rail', [[-X, B], [X, B]]));
  // ab Stufe 1 Pfosten zwischen den Gurten (rechte Winkel: Diagonalen trafen die Gurte so spitz, dass Drohnen eng standen)
  if (lv) { const k = lv === 2 ? 12 : 8; for (let i = 1; i < k; i++) { const x = -X + (2 * X * i) / k; out.push(P('truss', [[x, B], [x, T]])); } }
  // Böcke: je zwei Beine vom Träger schräg auseinander zum Boden
  for (const cx of [-0.85, 0.85]) out.push(P('frame', [[cx - 0.3, g], [cx, B], [cx + 0.3, g]]));
  // Wagen: abgerundeter Kasten, an zwei Gehängen
  const r = 0.07, body = [...arc(x1 - r, y1 - r, r, r, 0, Math.PI / 2, 4), ...arc(x0 + r, y1 - r, r, r, Math.PI / 2, Math.PI, 4), ...arc(x0 + r, y0 + r, r, r, Math.PI, 1.5 * Math.PI, 4), ...arc(x1 - r, y0 + r, r, r, 1.5 * Math.PI, 2 * Math.PI, 4)];
  out.push(P('car', body, true));
  for (const x of hang) out.push(P('hanger', [[x, y1], [x + 0.06, (y1 + B) / 2], [x, B]]));
  if (lv) out.push(P('window', [[x0 + 0.08, y1 - 0.1], [x1 - 0.08, y1 - 0.1]]));
  if (lv === 2) out.push(P('window', [[x0 + 0.08, y1 - 0.2], [x1 - 0.08, y1 - 0.2]]));
  return out;
}

// ---------- Bremer Schlüssel ----------
// Nach dem Wappenbild „Bremen_Key_mark.svg“ (Wikimedia Commons, gemeinfrei; Kopie zum Abgleich in docs/katalog-wahrzeichen/bremen-key-mark.svg): diagonaler
// Schaft, der Bart ein 2×2-Raster aus Rauten mit eingerollten Mäanderhaken, die Reide ein Quadrat mit leicht nach innen
// gewölbten Seiten und Kreisen an den Ecken, in der Mitte ein Ornament. Maße in Pixeln des SVG (auf 800 px), dann in
// Einheiten (x = (px − 400) / 300, y = (400 − py) / 300). Eigene Linienzeichnung statt der Abtastung des Logo-Modus: Die
// legte Punkte doppelt, wo Konturen des SVG eng nebeneinanderlaufen (die hellen Klumpen in Marcs Screenshot bei 214).
const KEY_TIP = [120, 178], KEY_A = [Math.SQRT1_2, Math.SQRT1_2], KEY_N = [Math.SQRT1_2, -Math.SQRT1_2];
const px = ([x, y]) => [(x - 400) / 300, (400 - y) / 300];
/** Punkt auf dem Schlüssel: s entlang des Schafts von der Spitze, v quer dazu zur Bartseite (SVG-Pixel). */
const sv = (s, v) => px([KEY_TIP[0] + KEY_A[0] * s + KEY_N[0] * v, KEY_TIP[1] + KEY_A[1] * s + KEY_N[1] * v]);
export const KEY = { bit: [45, 285, 0, 235], shaftEnd: 457.7, ring: [[465, 527], [667, 527], [465, 719], [667, 719]], r: 33, centre: [566, 623] };
/** Detailstufe des Schlüssels: Bart erst als Raster (bis 199), dann mit Haken (bis 279), ab 280 als Mäander. */
const keyLevel = (n) => (n < 200 ? 0 : n < 280 ? 1 : 2);
function schluessel(lv) {
  const out = [], [s0, s1, v0, v1] = KEY.bit, sm = (s0 + s1) / 2, vm = (v0 + v1) / 2;
  // Schaft: eine Linie von der Spitze bis an den Kreis der Reide, mit Knoten, wo das Raster des Barts ansetzt
  out.push(P('shaft', [sv(0, 0), sv(s0, 0), sv(sm, 0), sv(s1, 0), sv(KEY.shaftEnd, 0)]));
  // Bart: Umriss (die Schaftseite ist der Schaft selbst) und das Kreuz in der Mitte
  out.push(P('bit', [sv(s0, 0), sv(s0, v1), sv(s1, v1), sv(s1, 0)]), P('bit', [sv(sm, 0), sv(sm, v1)]), P('bit', [sv(s0, vm), sv(s1, vm)]));
  if (lv) {
    // je Zelle ein Haken, im Windrad um die Mitte des Barts gedreht (wie im Wappenbild)
    const hook = lv === 2 ? [[0.28, 0.72], [0.28, 0.28], [0.72, 0.28], [0.72, 0.6], [0.48, 0.6]] : [[0.3, 0.7], [0.3, 0.3], [0.7, 0.3]];
    [[0, 0, 0], [1, 0, 1], [1, 1, 2], [0, 1, 3]].forEach(([i, j, k]) => {
      const rot = ([p, q]) => { let a = p - 0.5, b = q - 0.5; for (let r = 0; r < k; r++) [a, b] = [-b, a]; return [a + 0.5, b + 0.5]; };
      out.push(P('bit', hook.map((h) => { const [p, q] = rot(h); return sv(s0 + (i + p) * (sm - s0), v0 + (j + q) * (vm - v0)); })));
    });
  }
  // Reide: vier Kreise, dazwischen nach innen gewölbte Seiten; der Schaft setzt am oberen linken Kreis an
  const [c1, c2, c3, c4] = KEY.ring, r = KEY.r, at = (c, a) => [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r];
  const ringPts = (c) => Array.from({ length: 24 }, (_, i) => px(at(c, (i / 24) * TAU)));
  for (const c of KEY.ring) out.push(P('ring', ringPts(c), true));
  const side = (a, b, inward) => { const m = [(a[0] + b[0]) / 2 + inward[0], (a[1] + b[1]) / 2 + inward[1]]; return Array.from({ length: 9 }, (_, i) => { const u = i / 8; return px([(1 - u) ** 2 * a[0] + 2 * (1 - u) * u * m[0] + u * u * b[0], (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * m[1] + u * u * b[1]]); }); };
  // Seiten setzen an den Kreispunkten an, die zum Nachbarkreis zeigen (Winkel in 15°-Schritten, also Knoten der Kreise)
  out.push(P('bow', side(at(c1, 0), at(c2, Math.PI), [0, 20])), P('bow', side(at(c3, 0), at(c4, Math.PI), [0, -20])));
  out.push(P('bow', side(at(c1, Math.PI / 2), at(c3, -Math.PI / 2), [20, 0])), P('bow', side(at(c2, Math.PI / 2), at(c4, -Math.PI / 2), [-20, 0])));
  const [cx, cy] = KEY.centre;
  if (lv === 1) out.push(P('ornament', [px([cx - 34, cy - 34]), px([cx + 34, cy + 34])]), P('ornament', [px([cx + 34, cy - 34]), px([cx - 34, cy + 34])]));
  if (lv === 2) for (const w of [Math.PI / 4, -Math.PI / 4]) out.push(P('ornament', Array.from({ length: 28 }, (_, i) => { const a = (i / 28) * TAU, x = Math.cos(a) * 52, y = Math.sin(a) * 17; return px([cx + x * Math.cos(w) - y * Math.sin(w), cy + x * Math.sin(w) + y * Math.cos(w)]); }), true));
  return out;
}

// ---------- Frankfurter Skyline ----------
// Eine durchgehende Silhouette (wie Skyline-Zeichen gezeichnet werden), keine Einzeltürme mit eigenen Seitenlinien: die
// stünden bei 150 Drohnen enger als ein Drohnenabstand nebeneinander. Erkennungszeichen: Messeturm mit Pyramidenspitze,
// Westendturm mit Krone, Commerzbank mit Stufendach und Antenne (die höchste), Main Tower rund mit Mast, Trianon mit
// Dreieck, die EZB mit schräger Kante. Stilisiert, nicht maßstäblich vermessen.
export const SKY = { ground: -0.55, towers: [
  { key: 'messe', x: [-1.1, -0.88], h: 0.72, z: -0.25 }, { key: 'westend', x: [-0.78, -0.56], h: 0.6, z: 0.15 },
  { key: 'commerz', x: [-0.46, -0.18], h: 1.0, z: -0.05 }, { key: 'main', x: [-0.08, 0.16], h: 0.8, z: 0.25 },
  { key: 'trianon', x: [0.26, 0.48], h: 0.62, z: -0.2 }, { key: 'ezb', x: [0.6, 0.85], h: 0.5, z: 0.05 },
] };
/** Dachform je Turm (von links nach rechts, von der linken zur rechten Kante). */
const ROOF = {
  messe: ([a, b], h) => [[a, h], [(a + b) / 2, h + 0.36], [b, h]],
  westend: ([a, b], h) => [[a, h], [a + 0.02, h + 0.12], [(a + b) / 2, h + 0.04], [b - 0.02, h + 0.12], [b, h]],
  commerz: ([a, b], h) => [[a, h], [a + 0.06, h], [a + 0.06, h + 0.08], [(a + b) / 2, h + 0.08], [b - 0.06, h + 0.08], [b - 0.06, h], [b, h]],
  main: ([a, b], h) => [[a, h - 0.04], [a + 0.04, h], [(a + b) / 2, h], [b - 0.04, h], [b, h - 0.04]],
  trianon: ([a, b], h) => [[a, h], [(a + b) / 2, h + 0.17], [b, h]],
  ezb: ([a, b], h) => [[a, h], [b, h - 0.1]],
};
export const ANTENNA = { commerz: [-0.32, 1.08, 1.36], main: [0.04, 0.8, 1.06] };
/** Höhe der niedrigen Bebauung zwischen den Türmen (vor dem ersten und nach dem letzten: −0,25). */
const LOWS = [0.05, 0.0, 0.05, 0.0, 0.05];
function skyline(lv) {
  const { ground: g, towers } = SKY, line = [[-1.25, g], [-1.25, -0.25]];
  towers.forEach((tw, i) => {
    const [a, b] = tw.x;
    line.push([a, i ? LOWS[i - 1] : -0.25], ...ROOF[tw.key](tw.x, tw.h), [b, i < towers.length - 1 ? LOWS[i] : -0.25]);
  });
  line.push([1.25, -0.25], [1.25, g]);
  const out = [P('skyline', line), P('ground', [[-1.25, g], [1.25, g]])];
  for (const [x, y0, y1] of Object.values(ANTENNA)) out.push(P('antenna', [[x, y0], [x, y1]]));
  // ab 150: die Pyramide des Messeturms und das Dreieck des Trianon sitzen sichtbar auf ihrem Quader
  if (lv) for (const k of ['messe', 'trianon']) { const { x: [a, b], h } = SKY.towers.find((q) => q.key === k); out.push(P('skyline', [[a, h], [b, h]])); }
  // ab 250: die Spiegelung im Main, zwei kurze Linien unter dem Ufer
  if (lv === 2) out.push(P('river', [[-1.0, g - 0.14], [0.9, g - 0.14]]), P('river', [[-0.6, g - 0.26], [0.5, g - 0.26]]));
  return out;
}

// ---------- Siegessäule (Großer Stern) ----------
// Sockel mit Säulenhalle, die Säule mit drei vergoldeten Ringen, Kapitell, darauf die Viktoria mit Flügeln und Kranz.
// Stilisiert nach bekannten Maßen (66,9 m, Viktoria 8,3 m; Figur leicht vergrößert, sonst trägt sie keine Drohnen).
export const SG = { ground: -1.15, base: [0.42, -0.95], hall: [0.34, -0.62], plinth: [0.22, -0.5], col: [0.085, 0.065], top: 0.6, bands: [-0.22, 0.06, 0.34] };
function siegessaeule(lv) {
  const { ground: g, base: [bw, bh], hall: [hw, hh], plinth: [pw, ph], col: [c0, c1], top: T, bands } = SG, out = [];
  const half = [[bw, g], [bw, bh], [hw, bh], [hw, hh], [pw, hh], [pw, ph], [c0, ph], [c1, T]];
  out.push(P('base', half.slice(0, 7)), P('base', mirror(half.slice(0, 7))));
  // Säulenlinien mit Knoten an den Ringen: jede Kreuzung ist ein gemeinsamer Punkt (eine Drohne), sonst stehen dort zwei eng
  const cw = (y) => c0 + (c1 - c0) * ((y - ph) / (T - ph)), colLine = (sx) => [[sx * c0, ph], ...bands.map((y) => [sx * cw(y), y]), [sx * c1, T]];
  out.push(P('column', colLine(1)), P('column', colLine(-1)));
  if (lv) out.push(P('base', [[-bw, g], [bw, g]]));
  // Säulenhalle: Pfeiler im Sockel
  if (lv === 2) for (const x of [-0.2, 0, 0.2]) out.push(P('base', [[x, bh], [x, hh]]));
  // die drei Ringe aus Kanonenrohren, etwas breiter als die Säule
  for (const y of bands) { const w = cw(y) + 0.05; out.push(P('band', [[-w, y], [-cw(y), y], [cw(y), y], [w, y]])); }
  // Kapitell und Plattform
  out.push(P('column', [[-c1, T], [-0.13, T + 0.05], [-0.06, T + 0.05], [0.06, T + 0.05], [0.13, T + 0.05], [c1, T]])); // ±0,06: Fußpunkte der Viktoria
  // Viktoria: Körper als schlankes Dreieck, zwei Flügel, Kranz in der erhobenen Rechten; wenige Ecken, sonst stehen die
  // Drohnen der kleinen Figur enger als auf der Säule
  const y0 = T + 0.05;
  out.push(P('victoria', [[-0.06, y0], [0, y0 + 0.36], [0.06, y0]]));
  out.push(P('victoria', [[-0.02, y0 + 0.27], [-0.2, y0 + 0.46], [-0.12, y0 + 0.18]]), P('victoria', [[0.02, y0 + 0.27], [0.18, y0 + 0.42], [0.11, y0 + 0.16]]));
  out.push(P('victoria', arc(0.14, y0 + 0.5, 0.05, 0.05, 0, TAU, 24).slice(0, 24), true)); // 15°-Schritte: keine Ecken
  if (lv === 2) out.push(P('victoria', [[-0.1, y0 + 0.02], [-0.1, y0 + 0.54]]));
  return out;
}

export const SHAPES = { fernsehturm, rheinturm, tor, dom, elphi, schwebebahn, schluessel, skyline, siegessaeule };
/** Detailstufe je Wahrzeichen (Standard level()); der Schlüssel hat eigene Schwellen. */
export const LEVELS = { schluessel: keyLevel };

/**
 * Polylinien → Linien für lineSample(): Knoten sind Linienenden, Ecken (Knick über 25°) und Punkte, die mehrere Linien
 * teilen (Kreuzungen, Anschlüsse); dazwischen Kurven. Geschlossene Linien ohne Ecke sind Schleifen.
 */
export function linesOf(polys, tags) {
  const key = (p) => `${Math.round(p[0] * 1e4)},${Math.round(p[1] * 1e4)}`, shared = new Map();
  for (const pl of polys) for (const k of new Set(pl.pts.map(key))) shared.set(k, (shared.get(k) ?? 0) + 1);
  const nodes = [], index = new Map(), curves = [], loops = [];
  const nodeOf = (p) => { const k = key(p); if (!index.has(k)) { index.set(k, nodes.length); nodes.push([p[0], p[1]]); } return index.get(k); };
  for (const pl of polys) {
    const ci = tags.indexOf(pl.tag), p = pl.pts, m = p.length;
    const corner = (i) => {
      if (!pl.closed && (i === 0 || i === m - 1)) return true;
      if (shared.get(key(p[i])) > 1) return true;
      const a = p[(i - 1 + m) % m], b = p[i], c = p[(i + 1) % m], u = Math.atan2(b[1] - a[1], b[0] - a[0]), v = Math.atan2(c[1] - b[1], c[0] - b[0]);
      return Math.abs(((v - u + 3 * Math.PI) % TAU) - Math.PI) > 0.44;
    };
    const at = p.map((_, i) => i).filter(corner);
    if (pl.closed && !at.length) { loops.push({ p: p.map(([x, y]) => [x, y]), ci }); continue; }
    const seq = pl.closed ? [...p.slice(at[0]), ...p.slice(0, at[0]), p[at[0]]] : p, idx = pl.closed ? [...at.map((i) => (i - at[0] + m) % m), m] : at;
    for (let q = 1; q < idx.length; q++) curves.push({ a: nodeOf(seq[idx[q - 1]]), b: nodeOf(seq[idx[q]]), p: seq.slice(idx[q - 1], idx[q] + 1).map(([x, y]) => [x, y]), ci });
  }
  return { nodes, curves, loops, dots: [], shape: true, s0: 0.05 };
}

const cache = new Map();
/**
 * Wahrzeichen bei n Drohnen: { pts: [[x, y, 0]], tag: [Teilname je Punkt], dots, spacing, level }. Die Zeichnung der
 * Detailstufe wird gleichmäßig abgetastet; zwischengespeichert je Wahrzeichen und Zahl. capped: Die Linien tragen nicht
 * alle Drohnen, ohne dass die Lichter verschmelzen (stageSample(), wie bei Blume und Zuckerstange); der Rest wartet offstage.
 */
export function flat(key, n) {
  const id = `${key}|${n}`;
  if (!cache.has(id)) {
    if (cache.size > 120) cache.clear();
    const lv = (LEVELS[key] ?? level)(n), polys = SHAPES[key](lv), tags = [...new Set(polys.map((p) => p.tag))];
    const s = stageSample(prepareLines(linesOf(polys, tags)), n);
    cache.set(id, { pts: s.pts.map(([x, y]) => [x, y, 0]), tag: s.pts.map((q) => tags[q[2]] ?? tags[0]), dots: s.dots, spacing: s.spacing, level: lv, capped: s.dots >= 0.98 * DOT_MAX && s.pts.length < n });
  }
  return cache.get(id);
}

// ---------- Szenen ----------

const BRICK = [235, 130, 90], STEEL = [150, 220, 160];
const COLOURS = { shaft: WARM, base: WARM, sphere: DIAMOND, band: GOLD, korb: WARM, antenna: WARM, pod: WARM, glass: CYAN, clock: GOLD, column: WARM, beam: WARM, attic: WARM, ground: WARM, quadriga: GOLD, staff: GOLD, tower: WARM, gable: WARM, portal: GOLD, finial: GOLD, window: GOLD, roof: CYAN, brick: BRICK, glassline: WARM, brickline: BRICK, rail: WARM, truss: WARM, frame: STEEL, car: CYAN, hanger: WARM, bit: WARM, ring: WARM, bow: WARM, ornament: GOLD, skyline: WARM, river: CYAN, victoria: GOLD };
/** Licht der 2D-Fassungen: dasselbe wie beim Körper, nur ohne Bewegung (Warnlicht, Lichtzeituhr, Glanz). */
const LIGHT_2D = {
  fernsehturm: (f, b, j, t, o) => { if (f.tag[j] === 'antenna' && b[1] > FT.tip - 0.02) o[3] = warning(t); else if (f.tag[j] === 'band') o[3] = glint(b[0], t, 3.2, 0.6, -0.15, 0.15); },
  rheinturm: (f, b, j, t, o) => { if (f.tag[j] === 'antenna' && b[1] > RT.tip - 0.02) o[3] = warning(t); else if (f.tag[j] === 'clock') { const lit = clockLit((b[1] - CLOCK.from) / (CLOCK.to - CLOCK.from), t); o[3] = lit === null ? 0.2 : lit ? 1.35 : 0.3; } },
  tor: (f, b, j, t, o) => { o[3] = glint(b[0], t, 4, 0.4, -1.2, 1.2); },
  dom: (f, b, j, t, o) => { o[3] = f.tag[j] === 'finial' ? 1.3 : glint(b[1], t, 4.5, 0.4, -1.2, 1.2); },
  elphi: (f, b, j, t, o) => { if (f.tag[j] === 'roof') o[3] = glint(b[0], t, 4, 0.5, -1.1, 1.1); },
  schwebebahn: (f, b, j, t, o) => { if (f.tag[j] === 'car' || f.tag[j] === 'window') o[3] = glint(b[0], t, 3.5, 0.5, -0.6, 0.6); },
  schluessel: (f, b, j, t, o) => { o[3] = glint(b[0] - b[1], t, 4, 0.45, -2.2, 2.2); },
  skyline: (f, b, j, t, o) => { if (f.tag[j] === 'antenna' && (Math.abs(b[1] - 1.36) < 0.02 || Math.abs(b[1] - 1.06) < 0.02)) o[3] = warning(t); else if (f.tag[j] === 'skyline') o[3] = glint(b[0], t, 4.5, 0.4, -1.3, 1.3); },
  siegessaeule: (f, b, j, t, o) => { if (f.tag[j] === 'victoria' || f.tag[j] === 'band') o[3] = glint(b[1], t, 3.6, 0.6, -0.4, 1.3); },
};
/** Ein 2D-Bild: die Zeichnung bei n Drohnen, Farben je Teil; fehlen ein, zwei Drohnen (Abstandsregel), warten sie offstage. */
function flatBeat(key, n, caption) {
  const f = flat(key, n), pts = f.pts.map((p, j) => [p[0], p[1], 0, ...(COLOURS[f.tag[j]] ?? WARM)]), light = LIGHT_2D[key];
  return { pts, caption, ...(f.pts.length < n ? { offstageDrones: n - f.pts.length } : {}), ...(f.dots > f.pts.length ? { drones: f.dots } : {}), live: (b, j, t, o) => light(f, b, j, t, o) };
}
/** So viele Drohnen tragen höchstens den Körper (wie LIT_MAX der Katalog-Körper); die übrigen warten offstage. */
export const BODY_MAX = 480;
const bodies = new Map();
/** Körper in Ruhelage (t = 0), zwischengespeichert je Wahrzeichen, Zahl und Stufe. */
function body(key, k, stufe) {
  const id = `${key}|${k}|${stufe}`;
  if (!bodies.has(id)) {
    if (bodies.size > 60) bodies.clear();
    const { pts: built, live } = WAHRZEICHEN_3D[key](k, stufe);
    const pts = built.map((p, j) => { const o = [p[0], p[1], p[2], 1]; live(p, j, 0, o); return [o[0], o[1], o[2], p[3], p[4], p[5]]; });
    const fit = [0, 2, 4, 6, 8, 10].flatMap((t) => built.map((p, j) => { const o = [p[0], p[1], p[2], 1]; live(p, j, t, o); return o.slice(0, 3); }));
    bodies.set(id, { pts, fit, live: (b, j, t, o) => { const q = built[j]; o[0] = q[0]; o[1] = q[1]; o[2] = q[2]; live(q, j, t, o); } });
  }
  return bodies.get(id);
}
/** 3D: ein Bild, der Körper schwenkt. 3D+: Licht zeichnet den Körper (von oben), dann seine eigene Bewegung. */
function bodyScene(key, n, stufe, caption, drawCaption) {
  // über BODY_MAX warten die übrigen offstage, beim flachen Schlüssel auch die ein, zwei, die die Abstandsregel herausnimmt
  const k = Math.min(n, BODY_MAX), { pts, fit, live } = body(key, k, stufe), off = n > pts.length ? { offstageDrones: n - pts.length } : {};
  const beat = { pts, fitPts: fit, live, ...off };
  if (stufe !== '3D+') return { beats: [{ ...beat, caption }] };
  const order = lightRank(pts);
  return { beats: [
    { ...beat, caption: drawCaption, hold: 2.4, live: (b, j, t, o) => { live(b, j, 0, o); o[3] *= trace(order[j], t, 2.2); } },
    { ...beat, caption },
  ] };
}
const DRAW = { schluessel: 'wahrzeichen.lightDrawsTheKey', skyline: 'wahrzeichen.lightDrawsTheSkyline', siegessaeule: 'wahrzeichen.lightDrawsTheVictoryColumn', fernsehturm: 'wahrzeichen.lightDrawsTheTvTower', rheinturm: 'wahrzeichen.lightDrawsTheRheinturm', tor: 'wahrzeichen.lightDrawsTheGate', dom: 'wahrzeichen.lightDrawsTheCathedral', elphi: 'wahrzeichen.lightDrawsTheElbphilharmonie', schwebebahn: 'wahrzeichen.lightDrawsTheSchwebebahn' };

// ---------- Jahreszahl ----------
// „30 Jahre“, „125 Jahre“: die Zahl in FlyingStars' Schrift (text-formation.js, dieselbe wie Wappen, Pokal, Medaille und
// eigener Text), darunter JAHRE ab 150 Drohnen. Der Wert kommt aus der Fassung (version.value), sonst JAHRE_STANDARD.
export const JAHRE_STANDARD = '125';
/** Ein Schriftzug, zentriert auf (cx, cy) mit halber Breite hw; übrige Drohnen des Planers unterstreichen ihn. */
async function lettering(value, k, hw, cx, cy) {
  const r = await textFormationAsync(value, k), pts = r ? r.pts.slice(0, k) : [];
  if (!pts.length) return sampleOutline([{ pts: [[cx - hw, cy], [cx + hw, cy]], closed: false }], k).map(([x, y]) => [x, y, 0]);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), s = (hw * 2) / Math.max(1e-6, Math.max(...xs) - Math.min(...xs)), mx = (Math.max(...xs) + Math.min(...xs)) / 2, my = (Math.max(...ys) + Math.min(...ys)) / 2;
  const out = pts.map(([x, y]) => [(x - mx) * s + cx, (y - my) * s + cy, 0]), bottom = Math.min(...out.map((p) => p[1]));
  return out.concat(sampleOutline([{ pts: [[cx - hw * 0.7, bottom - 0.1], [cx + hw * 0.7, bottom - 0.1]], closed: false }], k - out.length).map(([x, y]) => [x, y, 0]));
}
/** Zahl und Wort: k Drohnen; ab 150 steht JAHRE unter der Zahl (bei weniger Drohnen trüge das Wort keine lesbaren Buchstaben). */
async function jahreFormation(value, k) {
  const word = k >= 150 ? Math.round(k * 0.36) : 0, digits = String(value).replace(/\s+/g, '').length;
  const num = await lettering(value, k - word, Math.min(1.0, 0.36 * digits), 0, word ? 0.2 : 0);
  const low = Math.min(...num.map((p) => p[1]));
  return word ? [...paintAll(num, GOLD), ...paintAll(await lettering(message('wahrzeichen.years'), word, 0.62, 0, low - 0.3), WARM)] : paintAll(num, GOLD);
}
const paintAll = (pts, c) => pts.map(([x, y, z]) => [x, y, z, ...c]);
/** Lichtkranz in 3D: ein gekippter Ring um die Zahl, die Drohnen laufen auf ihm um. */
const ringAt = (k, R, tilt, phase = 0) => Array.from({ length: k }, (_, i) => { const a = (i / k) * TAU + phase; return [Math.cos(a) * R, Math.sin(a) * R * Math.sin(tilt), Math.sin(a) * R * Math.cos(tilt)]; });
function ringTurn(o, b, R, tilt, w) {
  // Punkt auf dem Ring um w weiterdrehen (in der Ringebene)
  const st = Math.sin(tilt), ct = Math.cos(tilt), a = Math.atan2(b[1] / st, b[0]) + w;
  o[0] = Math.cos(a) * R; o[1] = Math.sin(a) * R * st; o[2] = Math.sin(a) * R * ct;
}
async function jahre2d(n, caption, version) {
  const pts = await jahreFormation(version?.value ?? JAHRE_STANDARD, n);
  return { beats: [{ pts, caption, live: (b, j, t, o) => { o[3] = glint(b[0], t, 3.6, 0.5, -1.2, 1.2); } }] };
}
async function jahre3d(n, caption, version) {
  const R = 1.4, TILT = 0.28, k = Math.min(n, BODY_MAX), [nk, rk] = share(k, [3, 1]), num = await jahreFormation(version?.value ?? JAHRE_STANDARD, nk), ring = paintAll(ringAt(rk, R, TILT), CYAN);
  return { beats: [{ pts: [...num, ...ring], caption, ...(n > k ? { offstageDrones: n - k } : {}), live: (b, j, t, o) => {
    if (j >= nk) { ringTurn(o, b, R, TILT, t * 0.25); o[3] = 1; } else { o[3] = glint(b[0], t, 3.6, 0.5, -1.2, 1.2); sway(o, t, 0.35, 12); }
  } }] };
}
async function jahrePlus(n, caption, version) {
  // Licht schreibt die Zahl, dann umkreisen sie zwei Lichtkränze in entgegengesetzter Richtung (wie eine Armillarsphäre)
  const R = 1.35, k = Math.min(n, BODY_MAX), [nk, ra, rb] = share(k, [3.2, 1, 1]), num = await jahreFormation(version?.value ?? JAHRE_STANDARD, nk);
  const A = paintAll(ringAt(ra, R, 0.35), CYAN), B = paintAll(ringAt(rb, R * 0.92, -0.35, 0.3), GOLD), order = num.map((p) => (p[0] + 1.2) / 2.4);
  const off = n > k ? { offstageDrones: n - k } : {};
  return { beats: [
    // die Kränze warten dunkel hinter der Zahl (offstage: nicht im Bildausschnitt)
    { ...act([part('number', num), part('ring', [...A, ...B].map(([x, y, z, ...c]) => [x * 0.3, y * 0.3, z - 0.6, ...c]), { offstage: true })]), ...off, caption: message('wahrzeichen.lightWritesYourNumber'), hold: 2.6, live: (b, j, t, o) => { o[3] = j < nk ? reveal(order[j], t, 2.0) : 0; } },
    { ...act([part('number', num), part('ring', [...A, ...B])]), ...off, caption, live: (b, j, t, o) => {
      if (j >= nk + ra) { ringTurn(o, b, R * 0.92, -0.35, -t * 0.22); o[3] = sparkle(j, t, 0.9, 1.2); }
      else if (j >= nk) { ringTurn(o, b, R, 0.35, t * 0.22); o[3] = 1; }
      else { o[3] = glint(b[0], t, 3.6, 0.5, -1.2, 1.2); sway(o, t, 0.3, 12); }
    } },
  ] };
}

const scenes = (key) => ({
  [`${key}2d`]: (n, caption) => ({ beats: [flatBeat(key, n, caption)] }),
  [`${key}3d`]: (n, caption) => bodyScene(key, n, '3D', caption),
  [`${key}Plus`]: (n, caption) => bodyScene(key, n, '3D+', caption, message(DRAW[key])),
});
export const builders = { ...Object.assign({}, ...Object.keys(SHAPES).map(scenes)), jahre2d, jahre3d, jahrePlus };
/** Baunamen je Wahrzeichen und Show-Art (für den Kontaktbogen und die Tests). */
export const LANDMARKS = {
  ...Object.fromEntries(Object.keys(SHAPES).map((key) => [key, { '2d': `${key}2d`, '3d': `${key}3d`, plus: `${key}Plus` }])),
  jahre: { '2d': 'jahre2d', '3d': 'jahre3d', plus: 'jahrePlus' },
};
