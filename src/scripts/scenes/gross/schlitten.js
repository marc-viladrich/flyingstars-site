// Schlitten über einer Hügelkette (Runde 11b, Kandidat FSK-006 der Motiv-Shortlist), Anlass Winter & Silvester, ab 500
// Drohnen in 3D und 3D+. Referenz „Santa's sleigh in 3D volume · 500“ (nur als Anregung). Gebaut wie Satellit und Fahrzeuge:
// ein Körper aus wenigen klaren Teilen, jede Seitenwand zweimal (links und rechts), Querstücke an den markanten Stellen,
// keine Füllung, lockere Linie. Lesbar an drei Zeichen: zwei Kufen, die vorn zur Schnecke einrollen, die Seitenwand mit
// Schwanenhals vorn und hoher Rückenlehne, die gewölbte Sitzbank quer dazwischen. Darunter zwei Schneekämme: der vordere
// trägt die beiden Spuren der Kufen, der hintere steht als Bergkette dahinter. Mehr Drohnen kaufen Teile, nicht Dichte:
// ab 700 Mondsichel und Sterne, ab 900 drei Tannen auf dem hinteren Kamm.
//
//   sleigh3d (3D, ab 500): der leere Schlitten gleitet von links über die Kämme nach rechts und kommt dort zum Stehen; er
//     neigt sich mit dem Hang, hinter ihm leuchten die beiden Spuren im Schnee auf.
//   sleighStory (3D+, ab 500): Er gleitet über die Kämme, die Spuren leuchten hinter ihm auf. Am letzten Kamm hebt er ab und
//     steigt in einem Bogen in den Himmel; die Spuren lösen sich wie ein Reißverschluss vom Schnee und ziehen als zwei
//     Lichtbahnen hinter ihm her. Oben steht er vor der Mondsichel, die Lichtbahnen funkeln aus. Dieselben Drohnen, keine Wolke.
// Wächter: scripts/schlitten.test.mjs.
import { GOLD, WARM, CYAN, DIAMOND, RED, MOON, mix, smooth, hash, yaw, pitch, drift } from '../../show-motion.js';
import { curves, assemble } from '../catalog-3d/kit.js';

const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));
/** Catmull-Rom durch Kontrollpunkte (2D oder 3D). */
function spline(ctrl, per = 10) {
  const out = [], D = ctrl[0].length;
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
    for (let k = 0; k < per; k++) { const u = k / per, u2 = u * u, u3 = u2 * u; out.push(Array.from({ length: D }, (_, q) => 0.5 * (2 * p1[q] + (p2[q] - p0[q]) * u + (2 * p0[q] - 5 * p1[q] + 4 * p2[q] - p3[q]) * u2 + (3 * p1[q] - p0[q] - 3 * p2[q] + p3[q]) * u3))); }
  }
  out.push(ctrl[ctrl.length - 1].slice());
  return out;
}
const at3 = (pts2, z) => pts2.map(([x, y]) => [x, y, z]);

// ---------------------------------------------------------------------------------------------------------------------
// Schlitten (Körperrahmen: x nach vorn = rechts, y oben, z zum Publikum; Kufenunterkante bei y = 0, Mitte x = 0)
export const W = 0.3; // halbe Spurbreite
export const level = (n) => (n >= 900 ? 2 : n >= 700 ? 1 : 0);
const RUNNER = [[-0.86, 0.1], [-0.78, 0.0], [-0.4, 0], [0.3, 0], [0.56, 0.05], [0.74, 0.2], [0.8, 0.38], [0.74, 0.5], [0.64, 0.47], [0.63, 0.38]];
const PANEL = [[-0.6, 0.2], [0.34, 0.2], [0.5, 0.3], [0.58, 0.48], [0.56, 0.63], [0.47, 0.7], [0.42, 0.62], [0.33, 0.5], [-0.1, 0.46], [-0.36, 0.52], [-0.5, 0.8], [-0.62, 0.92], [-0.74, 0.88], [-0.72, 0.7], [-0.64, 0.42], [-0.6, 0.2]];
const STRUTS = [-0.42, -0.02, 0.3];
/** Querstücke über die Breite: Sitzbank (gewölbt, vorn und hinten), Lehne oben, Armaturbrett vorn. */
const CROSS = [[-0.34, 0.46, 0.06], [0.1, 0.46, 0.06], [-0.6, 0.9, 0.02], [0.52, 0.66, 0.02]];
function sleighParts() {
  const parts = [];
  for (const s of [1, -1]) {
    parts.push(curves(s > 0 ? 'kufeV' : 'kufeH', [at3(spline(RUNNER, 8), s * W)], { w: 1 }));
    parts.push(curves(s > 0 ? 'wandV' : 'wandH', [{ pts: at3(spline(PANEL, 8), s * (W - 0.04)) }], { w: 1 }));
    parts.push(curves('strebe', STRUTS.map((x) => [[x, 0.03, s * W], [x, 0.17, s * (W - 0.02)]]), { w: 0.9 }));
  }
  parts.push(curves('bank', CROSS.map(([x, y, bulge]) => Array.from({ length: 13 }, (_, i) => { const u = i / 12, z = (u - 0.5) * 2 * (W - 0.04); return [x, y + bulge * Math.sin(Math.PI * u), z]; })), { w: 1.1 }));
  return parts;
}

// ---------------------------------------------------------------------------------------------------------------------
// Landschaft (Szenenrahmen): vorderer Kamm trägt die Spuren, hinterer Kamm als Bergkette, ab 700 Mond und Sterne
export const SCALE = 0.9; // Schlitten in der Landschaft
/** Linienabstand (Szeneneinheiten), den das Motiv bei jeder Drohnenzahl hält; was darüber hinaus bleibt, wird Schneefall. */
export const SIGMA = 0.06;
/** Höhe des vorderen Kamms bei x: zwei Kuppen (x ≈ −1,2 und +1,1), dazwischen eine Senke. */
export const ground = (x) => -0.62 + 0.22 * Math.exp(-(((x + 1.0) / 0.5) ** 2)) + 0.26 * Math.exp(-(((x - 0.95) / 0.55) ** 2)) - 0.06 * Math.exp(-((x / 0.45) ** 2));
const slope = (x) => (ground(x + 0.01) - ground(x - 0.01)) / 0.02;
const back = (x) => -0.3 + 0.36 * Math.exp(-(((x + 0.45) / 0.5) ** 2)) + 0.22 * Math.exp(-(((x - 0.85) / 0.42) ** 2)) + 0.14 * Math.exp(-(((x + 1.5) / 0.38) ** 2));
const far = (x) => -0.05 + 0.2 * Math.exp(-(((x - 0.2) / 0.7) ** 2)) + 0.12 * Math.exp(-(((x + 1.2) / 0.5) ** 2));
export const X0 = -1.0, X1 = 0.95, SPAN = [-1.9, 1.9], ZB = -1.0, ZF = -1.6;
/** Die Spuren liegen knapp unter den Kufen (eine Drohne steht nicht auf einer anderen). */
const GAP = 0.09, LIFTOFF = 0.05; // Spur unter der Kufe, Kufe knapp über dem Schnee
const FLAKES = 36; // höchstens so viele Sterne zusätzlich: verstreut, keine Punktfläche (Kontaktbogen 2: 80 Flocken in einem Feld lasen sich als Rechteck)
const TRACK = (s) => Array.from({ length: 121 }, (_, i) => { const x = SPAN[0] + ((SPAN[1] - SPAN[0]) * i) / 120; return [x, ground(x) - GAP, s * W * SCALE]; });
const MOON_C = [1.55, 1.2, -1.2];
function sceneParts(lv) {
  const parts = [curves('spurV', [TRACK(1)], { w: 1 }), curves('spurH', [TRACK(-1)], { w: 1 }), curves('kamm', [Array.from({ length: 121 }, (_, i) => { const x = SPAN[0] + ((SPAN[1] - SPAN[0]) * i) / 120; return [x, back(x), ZB]; })], { w: 0.9 })];
  if (lv >= 1) {
    // vorn eine Schneewehe (flacher Bogen vor den Spuren): gibt der Landschaft Tiefe nach vorn
    parts.push(curves('wehe', [Array.from({ length: 81 }, (_, i) => { const x = -1.6 + (3.2 * i) / 80; return [x, -1.02 + 0.08 * Math.sin(x * 1.9 + 0.5) + 0.05 * Math.cos(x * 4.1), 0.75]; })], { w: 0.9 }));
    parts.push(curves('fern', [Array.from({ length: 121 }, (_, i) => { const x = SPAN[0] + 0.3 + ((SPAN[1] - SPAN[0] - 0.6) * i) / 120; return [x, far(x), ZF]; })], { w: 0.8 }));
    // Mondsichel: zwei Kreisbögen, deren Enden sich treffen
    const outer = Array.from({ length: 41 }, (_, i) => { const a = -2.3 + (4.6 * i) / 40; return [MOON_C[0] + Math.cos(a) * 0.22, MOON_C[1] + Math.sin(a) * 0.22, MOON_C[2]]; });
    const inner = Array.from({ length: 41 }, (_, i) => { const a = -1.75 + (3.5 * i) / 40, c = [MOON_C[0] + 0.11, MOON_C[1] + 0.02]; return [c[0] + Math.cos(a) * 0.19, c[1] + Math.sin(a) * 0.19, MOON_C[2]]; }).filter((p) => Math.hypot(p[0] - MOON_C[0], p[1] - MOON_C[1]) < 0.215);
    parts.push(curves('mond', [outer, inner], { w: 1 }));
    // Sterne: einzelne Drohnen am Himmel (feste Punkte, gleichmäßig verstreut)
    const stars = Array.from({ length: 14 }, (_, i) => [-1.9 + 3.4 * hash(i * 3.1 + 0.2), 0.6 + 0.75 * hash(i * 1.7 + 0.9), -1.4]).filter((p) => Math.hypot(p[0] - MOON_C[0], p[1] - MOON_C[1]) > 0.45);
    parts.push({ tag: 'stern', solid: false, fixed: stars });
  }
  if (lv >= 2) for (const [x, h] of [[-1.6, 0.26], [-1.4, 0.32], [-0.75, 0.3], [-0.5, 0.42], [-0.27, 0.3], [0.55, 0.26], [0.78, 0.32], [1.0, 0.38], [1.5, 0.28]]) {
    const y = back(x), tri = [[x - h * 0.4, y], [x - h * 0.12, y + h * 0.45], [x - h * 0.28, y + h * 0.45], [x, y + h], [x + h * 0.28, y + h * 0.45], [x + h * 0.12, y + h * 0.45], [x + h * 0.4, y]];
    parts.push(curves('tanne', [at3(tri, ZB + 0.05)], { w: 0.9 }));
  }
  return parts;
}

// ---------------------------------------------------------------------------------------------------------------------
// Modell: Schlitten (Körperrahmen) und Landschaft (Szenenrahmen) zusammen gesampelt, damit beide denselben Linienabstand haben
export function sleighModel(n) {
  const lv = level(n), sp = sleighParts(), scene = sceneParts(lv);
  // Schlitten in die Landschaft gesetzt (am Ursprung), nur für die gemeinsame Abtastung; danach zurück in den Körperrahmen
  const toScene = (p) => [p[0] * SCALE, p[1] * SCALE, p[2] * SCALE];
  const scaled = sp.map((q) => ({ ...q, lines: q.lines.map((l) => ({ ...l, pts: l.pts.map(toScene) })) }));
  const parts = [...scaled, ...scene];
  // Runde 11b (Marc: mehr Drohnen kaufen Teile, nicht Dichte): die Linien bekommen so viele Drohnen, wie der Abstand SIGMA
  // verlangt; der Rest fällt als leichter Schnee über die Landschaft (erst ab 700, darunter tragen die Linien alles)
  const len = parts.reduce((a, q) => a + (q.lines ?? []).reduce((b, l) => { let L = 0; for (let i = 1; i < l.pts.length; i++) L += Math.hypot(l.pts[i][0] - l.pts[i - 1][0], l.pts[i][1] - l.pts[i - 1][1], l.pts[i][2] - l.pts[i - 1][2]); return b + L; }, 0), 0);
  const fixed = parts.reduce((a, q) => a + (q.fixed?.length ?? 0), 0), want = lv >= 1 ? Math.max(0, Math.min(FLAKES, n - Math.round(len / SIGMA) - fixed)) : 0;
  // weitere Sterne verstreut über den Himmel, außerhalb der Bahn des Schlittens und mit Abstand zueinander; was keinen Platz
  // findet, geht an die Linien zurück
  const keep = [...(parts.find((q) => q.tag === 'stern')?.fixed ?? []), MOON_C], extra = [];
  for (let tries = 0; extra.length < want && tries < 4000; tries++) {
    const p = [-1.85 + 3.7 * hash(tries * 1.37 + 0.11), 0.3 + 1.0 * hash(tries * 2.71 + 0.53), -1.3 + 0.4 * hash(tries * 0.77 + 0.29)];
    if (flight().some((c) => Math.hypot(p[0] - c[0], p[1] - c[1]) < 0.95) || keep.some((c) => Math.hypot(p[0] - c[0], p[1] - c[1]) < 0.24)) continue;
    keep.push(p); extra.push(p);
  }
  const { pts, tags } = assemble(parts, n - extra.length);
  for (const p of extra) { pts.push(p); tags.push('stern'); }
  // Reihenfolge: erst der Schlitten, dann die Spuren, dann die Landschaft (je ein Teil im Bild; so ist die Fahrt und die Wende
  // die gemeinsame Bewegung des Schlittens und keine Eigenbewegung einzelner Drohnen gegen die stehende Landschaft)
  const isBody = (tg) => /^(kufe|wand|strebe|bank)/.test(tg), isTrack = (tg) => tg === 'spurV' || tg === 'spurH';
  const order = [...tags.keys()].sort((a, b) => (isBody(tags[a]) ? 0 : isTrack(tags[a]) ? 1 : 2) - (isBody(tags[b]) ? 0 : isTrack(tags[b]) ? 1 : 2) || a - b);
  const tagsO = order.map((j) => tags[j]), body = Uint8Array.from(tagsO, (tg) => (isBody(tg) ? 1 : 0));
  const local = order.map((j) => { const p = pts[j]; return isBody(tags[j]) ? [p[0] / SCALE, p[1] / SCALE, p[2] / SCALE] : p; });
  const nb = body.reduce((a, b) => a + b, 0), ns = tagsO.filter(isTrack).length;
  return { lv, pts: local, tags: tagsO, body, extraStars: extra.length, groups: [{ name: 'schlitten', count: nb }, { name: 'spur', count: ns }, { name: 'landschaft', count: n - nb - ns }] };
}
const COLOUR = { kufeV: GOLD, kufeH: GOLD, wandV: RED, wandH: RED, strebe: mix(GOLD, WARM, 0.4), bank: mix(RED, WARM, 0.35), spurV: mix(DIAMOND, WARM, 0.3), spurH: mix(DIAMOND, WARM, 0.3), kamm: mix(DIAMOND, CYAN, 0.25), mond: MOON, stern: WARM, schnee: mix(DIAMOND, WARM, 0.5), fern: mix(DIAMOND, CYAN, 0.5), wehe: mix(DIAMOND, WARM, 0.2), tanne: mix([60, 170, 110], DIAMOND, 0.3) };

/** Lage des Schlittens auf dem Kamm bei x: auf dem Boden, mit dem Hang geneigt. */
// Neigung als Sehne über die Kufenlänge, Höhe so, dass keine Stelle der Kufe in den Schnee sinkt (in einer Senke lägen
// sonst die Kufenenden in den Spuren)
const onGround = (x) => {
  const h = 0.5 * SCALE, a = Math.atan((ground(x + h) - ground(x - h)) / (2 * h)), c = Math.cos(a), s = Math.sin(a);
  // weiches Maximum (log-sum-exp): ein hartes Maximum knickt, wenn die Auflage von einem Kufenpunkt zum nächsten springt
  const T = 0.012, v = Array.from({ length: 17 }, (_, q) => { const u = (-0.8 + (1.4 * q) / 16) * SCALE; return ground(x + u * c) - u * s; }), m = Math.max(...v);
  return { x, y: m + T * Math.log(v.reduce((acc, w) => acc + Math.exp((w - m) / T), 0)) + LIFTOFF, a };
};
/** Drohne j des Schlittens in Pose (x, y, Neigung a) in die Szene setzen. */
function poseBody(p, pose, o) {
  // Wende (psi) um die eigene Hochachse durch die Schlittenmitte, dann Neigung mit dem Hang, dann an seinen Platz
  let X = p[0] * SCALE, Z = p[2] * SCALE;
  if (pose.psi) { const cx = -0.05 * SCALE, cp = Math.cos(pose.psi), sp = Math.sin(pose.psi), x = X - cx; X = cx + x * cp + Z * sp; Z = -x * sp + Z * cp; }
  const c = Math.cos(pose.a), s = Math.sin(pose.a), Y = p[1] * SCALE;
  o[0] = pose.x + X * c - Y * s; o[1] = pose.y + X * s + Y * c; o[2] = Z;
}
const VIEW = { yaw: 0.42, pitch: 0.12 };
const view = (o) => { yaw(o, VIEW.yaw); pitch(o, VIEW.pitch); };

// ---------------------------------------------------------------------------------------------------------------------
// 3D: der Schlitten gleitet über die Kämme
export const GLIDE = { wait: 0.6, dur: 6.2, rest: 1.6 };
const glideX = (t) => X0 + (X1 - X0) * ease((t - GLIDE.wait) / GLIDE.dur);
/** Licht einer Spurdrohne: leuchtet auf, wenn der Schlitten über sie hinweggeglitten ist. */
const trackLight = (x, sx) => (x <= sx - 0.1 ? 1.15 + 0.35 * Math.exp(-(sx - x) / 0.35) : 0.32 + 0.6 * smooth((sx - x + 0.2) / 0.1));

function glideBeat(n, caption) {
  const m = sleighModel(n), hold = GLIDE.wait + GLIDE.dur + GLIDE.rest;
  const live = (b, j, t, o) => {
    const p = m.pts[j], tag = m.tags[j], sx = glideX(t);
    if (m.body[j]) poseBody(p, onGround(sx), o);
    else { o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; }
    if (tag === 'spurV' || tag === 'spurH') o[3] = trackLight(p[0], sx);
    else if (tag.startsWith('kufe')) o[3] = 1.05 + 0.3 * Math.exp(-(((p[1] - 0.0) / 0.05) ** 2)) * (0.6 + 0.4 * Math.sin(t * 5 + p[0] * 9)); // Glanz an der Kufe
    else if (tag === 'stern') o[3] = 0.9 + 0.35 * Math.sin(t * (1.5 + hash(j)) + hash(j + 2) * 9);
    else if (tag === 'schnee') { drift(o, j, t, 0.035); o[3] = 0.75; } // Schnee schwebt um seinen Platz
    else o[3] = 1;
    view(o);
    return o;
  };
  const pts = m.pts.map((p, j) => { const o = [0, 0, 0, 1]; live(null, j, 0, o); return [o[0], o[1], o[2], ...(COLOUR[m.tags[j]] ?? WARM)]; });
  return { pts, caption, hold, live, shimmer: false, model: m };
}

// ---------------------------------------------------------------------------------------------------------------------
// 3D+: über die Kämme, Abheben, Lichtbahnen am Himmel
export const STORY = { wait: 0.6, glide: 5.2, lift: 4.6, zip: 2.4, rest: 2.6 };
const ZIPFLY = 2.4; // Flugzeit einer Spurdrohne in die Lichtbahn
/** Flugbahn nach dem Abheben (Szenenrahmen): vom rechten Kamm in einem Bogen hoch und nach links vor den Mond. */
const END = onGround(X1), LIFT = [[X1, END.y], [X1 + 0.55, END.y + 0.4], [X1 + 0.15, 0.85], [-0.3, 0.82]];
/** Mitte des Schlittens entlang seiner ganzen Bahn (Gleiten und Flug): dort stehen keine Sterne. */
let FLIGHT_CACHE = null;
const flight = () => (FLIGHT_CACHE ||= [...Array.from({ length: 30 }, (_, i) => { const g = onGround(X0 + ((X1 - X0) * i) / 29); return [g.x, g.y + 0.4 * SCALE]; }), ...Array.from({ length: 30 }, (_, i) => { const [x, y] = bez(i / 29); return [x, y + 0.4 * SCALE]; })]);
const bez = (u) => { const v = 1 - u; return [0, 1].map((k) => v * v * v * LIFT[0][k] + 3 * v * v * u * LIFT[1][k] + 3 * v * u * u * LIFT[2][k] + u * u * u * LIFT[3][k]); };
/** Parameter u der Flugbahn zu einem Anteil f ihrer Bogenlänge (die Bézierkurve läuft ungleich schnell). */
const ARC = (() => { const K = 200, cum = [0]; let prev = bez(0); for (let i = 1; i <= K; i++) { const p = bez(i / K); cum.push(cum[i - 1] + Math.hypot(p[0] - prev[0], p[1] - prev[1])); prev = p; } return cum; })();
const arcU = (f) => { const L = f * ARC[ARC.length - 1]; let i = 1; while (i < ARC.length - 1 && ARC[i] < L) i++; return (i - 1 + (L - ARC[i - 1]) / Math.max(1e-9, ARC[i] - ARC[i - 1])) / (ARC.length - 1); };
const bezT = (u) => { const a = bez(Math.max(0, u - 0.01)), b = bez(Math.min(1, u + 0.01)); return Math.atan2(b[1] - a[1], b[0] - a[0]); };

function storyBeat(n, caption) {
  const m = sleighModel(n), T1 = STORY.wait + STORY.glide, T2 = T1 + STORY.lift, end = T2 + STORY.rest;
  const gx = (t) => X0 + (X1 - X0) * ease((t - STORY.wait) / STORY.glide);
  // Pose des Schlittens: auf dem Kamm bis T1, danach entlang der Flugbahn; die Neigung geht weich in die Bahnrichtung über
  // (die Bahn beginnt mit der Hangneigung des rechten Kamms, ihre erste Tangente steigt sanft)
  const pose = (t) => {
    if (t <= T1) return onGround(gx(t));
    // Neigung: vom Hang weich zur Waagerechten, unterwegs hebt sich die Nase leicht (der Bahn folgen hieße eine halbe Drehung)
    const u = ease((t - T1) / STORY.lift), [x, y] = bez(u), a0 = END.a;
    // im Steigflug wendet er (eine halbe Drehung um die Hochachse) und fliegt mit der Nase voran zurück über die Kämme
    return { x, y, a: a0 * (1 - u) + 0.22 * Math.sin(Math.PI * u), psi: Math.PI * ease((t - T1 - 0.3) / (STORY.lift - 0.3)) }; // über die ganze Flugzeit, sonst zu schnell
  };
  // Spuren: jede Drohne kennt ihre Stelle von rechts (Abhebepunkt) nach links; sie löst sich vom Schnee, wenn der Reißverschluss
  // sie erreicht, und fliegt auf ihren Platz in der Lichtbahn (dieselbe Reihenfolge, so kreuzen sich keine Wege)
  const tracks = { spurV: [], spurH: [] };
  m.pts.forEach((p, j) => { if (tracks[m.tags[j]]) tracks[m.tags[j]].push(j); });
  const slot = new Map();
  for (const [tag, ids] of Object.entries(tracks)) {
    const side = tag === 'spurV' ? 1 : -1, sorted = [...ids].sort((a, b) => m.pts[b][0] - m.pts[a][0]);
    // nur so viel Spur steigt auf, wie die Lichtbahn mit lockerer Linie trägt; der Rest bleibt im Schnee
    const take = Math.min(sorted.length, Math.round((0.92 * ARC[ARC.length - 1]) / (SIGMA * 1.15)));
    sorted.slice(0, take).forEach((j, q) => {
      const u = arcU(1 - (q / Math.max(1, take - 1)) * 0.92), [x, y] = bez(u), a = bezT(u), off = 0.13 * side; // gleichmäßig nach Bogenlänge
      slot.set(j, { to: [x - Math.sin(a) * off * 0.4, y + Math.cos(a) * off - 0.06, side * W * SCALE * 1.6], start: T1 + 0.4 + (q / take) * STORY.zip, rank: q / take });
    });
  }
  const live = (b, j, t, o) => {
    const p = m.pts[j], tag = m.tags[j];
    if (m.body[j]) { poseBody(p, pose(t), o); o[3] = 1.05; }
    else if (slot.has(j)) {
      const s = slot.get(j), w = ease((t - s.start) / ZIPFLY);
      o[0] = p[0] + (s.to[0] - p[0]) * w; o[1] = p[1] + (s.to[1] - p[1]) * w; o[2] = p[2] + (s.to[2] - p[2]) * w;
      const lit = trackLight(p[0], Math.min(gx(t), X1 + 0.2));
      o[3] = w > 0 ? 1.2 + 0.4 * Math.sin(Math.PI * w) + (w >= 1 ? 0.25 * Math.sin(t * 6 + j) * Math.exp(-(t - s.start - ZIPFLY) / 1.5) : 0) : lit;
    } else {
      o[0] = p[0]; o[1] = p[1]; o[2] = p[2];
      if (tag === 'schnee') drift(o, j, t, 0.035);
      o[3] = tag === 'stern' ? 0.9 + 0.35 * Math.sin(t * (1.5 + hash(j)) + hash(j + 2) * 9) : tag === 'mond' ? 1 + 0.25 * smooth((t - T1) / 2) : tag === 'schnee' ? 0.75 : 1;
    }
    view(o);
    return o;
  };
  const pts = m.pts.map((p, j) => { const o = [0, 0, 0, 1]; live(null, j, 0, o); return [o[0], o[1], o[2], ...(COLOUR[m.tags[j]] ?? WARM)]; });
  // Bildausschnitt: Landschaft und Himmel bis zur Flughöhe
  // Bildausschnitt: Landschaft und der Schlitten am Ende seines Flugs
  const last = pose(end), fitPts = [...m.pts.filter((_, j) => !m.body[j]), ...m.pts.filter((_, j) => m.body[j]).map((p) => { const o = [0, 0, 0, 1]; poseBody(p, last, o); return o; })].map((p) => { const o = [p[0], p[1], p[2], 1]; view(o); return o; });
  return { pts, caption, hold: end, live, shimmer: false, fitPts, model: m };
}

export const builders = {
  sleigh3d: (n, caption) => { const b = glideBeat(n, caption); return { beats: [{ pts: b.pts, groups: b.model.groups, caption, hold: b.hold, live: b.live, shimmer: false }] }; },
  // writes (wie die Schreibfeder und der Baumstern): die Spuren steigen nacheinander wie ein Reißverschluss auf und ziehen die
  // Lichtbahn; jede Drohne fliegt eine gerade Bahn aus dem Stand in den Stand (geprüft in scripts/schlitten.test.mjs), die
  // Gruppenrechnung des Finten-Wächters sieht dagegen halb stehende, halb fliegende Drohnen und meldet Überschwingen
  sleighStory: (n, caption) => { const b = storyBeat(n, caption); return { beats: [{ pts: b.pts, groups: b.model.groups, writes: ['spur'], caption, hold: b.hold, live: b.live, shimmer: false, fitPts: b.fitPts }] }; },
};
