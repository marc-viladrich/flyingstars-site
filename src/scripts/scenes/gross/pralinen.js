import { t as message } from '../../../i18n/ui.mjs';
// Die geöffnete Pralinenschachtel (Runde 11b, große Motive, Anlass Hochzeit, ab 600 Drohnen). Kandidat FSK-074 der
// Motiv-Shortlist (freelance/clients/flyingstars/25-motiv-shortlist-2026-11-20), Referenz „Chocolate box opening to reveal
// treats · 400“ (dort zwei flache, gefüllte Herzen).
// Eine herzförmige Schachtel als räumlicher Körper aus Kanten, nichts gefüllt: der Boden und der obere Rand als
// Herzlinien mit wenigen senkrechten Kanten, ein Deckel mit eigenem Rand, der etwas über die Schachtel greift. Innen
// stehen Fächer (runde Papiermanschetten) im Raster, in jedem eine Praline, und die Pralinen unterscheiden sich an der
// Form: Trüffel (zwei gekreuzte Ringe, eine Kugel), Herzpraline (aufrechtes kleines Herz), Würfel (Deckfläche und
// Kanten), Kegel (Grundring und Spitze). So bleibt jede Praline neben Rahmen, Deckel und Fach unterscheidbar.
// Jede Drohne kennt ihr Teil (Schachtel, Deckel, Fach, Praline i) und ihre Stelle darin; Deckel und Pralinen bewegen
// sich als starre Körper (Scharnier hinten oben, Flugbahn jeder Praline), die Engine lässt jede Drohne an ihrem Platz.
// Mehr Drohnen bringen mehr Pralinen (ein dichteres Fachraster, nicht dichtere Linien), ab 750 eine Schleife auf dem
// Deckel, ab 900 eine Spitzenborte (Bögen) am Innenrand.
//
//   pralinen3d (3D, ab 600): die Schachtel steht offen, der Deckel lehnt hinten am Scharnier und atmet kaum merklich mit,
//     die Schachtel schwenkt langsam; eine Lichtreihe läuft Fachreihe für Fachreihe von der Spitze nach hinten über die
//     gefüllten Fächer.
//   pralinenStory (3D+, ab 600): vier Akte mit denselben Drohnen. Die geschlossene Schachtel mit Band schwenkt herein,
//     der Deckel hebt sich und klappt nach hinten, eine Lichtreihe läuft über die Fächer, dann steigen die Pralinen
//     nacheinander aus ihren Fächern auf und reihen sich über der Schachtel zu einem großen Herzen, das pulsiert. Die
//     leeren Fächer bleiben zurück und glühen nach.
// Wächter: scripts/pralinen.test.mjs.
import { TAU, GOLD, WARM, ORANGE, RED, PINK, mix, smooth, yaw, pitch, part, act } from '../../show-motion.js';
import { curves, assemble } from '../catalog-3d/kit.js';
import { assignScalable } from '../../show-field.js';

const lerp = (a, b, u) => a + (b - a) * u;
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
/** smootherstep: Anfang und Ende ohne Geschwindigkeit und ohne Beschleunigung (wie die Flüge der Engine). */
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));
const ring = (c, r, e1, e2, k = 24) => ({ pts: Array.from({ length: k }, (_, i) => { const a = (i / k) * TAU; return add(c, add(mul(e1, Math.cos(a) * r), mul(e2, Math.sin(a) * r))); }), closed: true });

// ---------------------------------------------------------------------------------------------------------------------
// Bauplan (Schachtelrahmen: x quer, y oben, z zum Publikum; die Herzspitze zeigt zum Publikum, Bodenmitte im Ursprung)
// ---------------------------------------------------------------------------------------------------------------------
/** Detailstufe: 0 bis 749, 1 bis 899, 2 ab 900. */
export const level = (n) => (n >= 900 ? 2 : n >= 750 ? 1 : 0);
const R = 1.5, H = 0.34, LID_H = 0.14, LID_OFF = 0.1;
// der Deckel sitzt knapp über dem Schachtelrand (nicht darüber gestülpt): beim Heben kreuzt kein Deckelrand den Schachtelrand
const LID_Y0 = H + 0.06, LID_TOP = LID_Y0 + LID_H;
/** Herzlinie (Einheitsherz, Spitze bei u = π): [x, y] mit y nach oben, Kerbe oben in der Mitte. */
const heart2 = (u) => [Math.sin(u) ** 3, (13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u)) / 16];
/** Herz flach in der Ebene y = h, um d nach außen versetzt (entlang der Normalen der Kurve). */
function flatHeart(h, d = 0, k = 120) {
  const P = Array.from({ length: k }, (_, i) => { const [x, y] = heart2((i / k) * TAU); return [R * x, -R * y]; });
  return P.map((p, i) => {
    const a = P[(i + k - 1) % k], b = P[(i + 1) % k], tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1;
    // Laufrichtung im Uhrzeigersinn von oben gesehen: die Normale nach außen ist (tz, −tx)
    return [p[0] + (d * tz) / l, h, p[1] - (d * tx) / l];
  });
}
const OUTLINE = flatHeart(0, 0, 240).map((p) => [p[0], p[2]]);
function inside(x, z) {
  let c = false;
  for (let i = 0, j = OUTLINE.length - 1; i < OUTLINE.length; j = i++) {
    const [xi, zi] = OUTLINE[i], [xj, zj] = OUTLINE[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
const distToEdge = (x, z) => Math.min(...OUTLINE.map(([a, b]) => Math.hypot(a - x, b - z)));
/** Fächer: Raster versetzter Reihen im Herz, mit Abstand zum Rand. */
function cells(lv) {
  const g = GRID[lv], out = [];
  for (let r = -8; r <= 8; r++) for (let c = -8; c <= 8; c++) {
    const x = (c + (r % 2 ? 0.5 : 0)) * g, z = r * g * 0.88 + 0.12;
    if (inside(x, z) && distToEdge(x, z) > 0.62 * g) out.push([x, z]);
  }
  return out;
}
const GRID = [0.46, 0.41, 0.395]; // 18, 20, 22 Pralinen: so viele passen im Höhepunkt mit Abstand ins Deckelherz
const KINDS = ['trueffel', 'herz', 'wuerfel', 'kegel'];
/** Eine Praline als Linien um ihren Mittelpunkt (Grundfläche bei y = 0), Größe s. */
function pralineLines(kind, s) {
  const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];
  if (kind === 'trueffel') return [ring([0, s * 0.95, 0], s * 0.85, X, Z, 20), ring([0, s * 0.95, 0], s * 0.85, X, Y, 20)];
  // Herz offen an der Kerbe: an der Spitze der Kerbe lägen sonst zwei Drohnen fast aufeinander
  if (kind === 'herz') return [{ pts: Array.from({ length: 29 }, (_, i) => { const [x, y] = heart2(0.35 + (i / 28) * (TAU - 0.7)); return [x * s * 1.05, s * (1.05 + y * 0.95), 0]; }) }];
  if (kind === 'wuerfel') { const a = s * 0.78, top = s * 1.45; return [{ pts: [[-a, top, -a], [a, top, -a], [a, top, a], [-a, top, a]], closed: true }, { pts: [[-a, top, a], [-a, 0.12 * s, a], [a, 0.12 * s, a], [a, top, a]] }]; }
  return [ring([0, 0.15 * s, 0], s * 0.85, X, Z, 20), { pts: [[-s * 0.85, 0.15 * s, 0], [0, s * 1.9, 0], [s * 0.85, 0.15 * s, 0]] }]; // Kegel
}
const KIND_COLOUR = { trueffel: mix(GOLD, ORANGE, 0.35), herz: mix(RED, PINK, 0.35), wuerfel: mix(WARM, GOLD, 0.45), kegel: mix(ORANGE, RED, 0.3) };

/** Modell: Drohnen in vier Gruppen (Schachtel | Deckel | Fächer | Pralinen), je Drohne die Stelle im eigenen Rahmen. */
export function model(n) {
  const lv = level(n), C = cells(lv), g = GRID[lv], s = 0.3 * g;
  // Schachtel: Boden, oberer Rand, senkrechte Kanten an Spitze, Bauch und Schultern (Kanten im Profil sichtbar)
  const top = flatHeart(H), bottom = flatHeart(0), K = top.length, vAt = [0, 0.18, 0.32, 0.5, 0.68, 0.82].map((u) => Math.round(u * K) % K);
  const boxLines = [{ pts: bottom, closed: true }, { pts: top, closed: true }, ...vAt.map((i) => ({ pts: [bottom[i], top[i]] }))];
  if (lv >= 2) { // Spitzenborte: kleine Bögen innen am oberen Rand
    const inner = flatHeart(H - 0.04, -0.07, 96); boxLines.push({ pts: inner.map((p, i) => [p[0], p[1] - 0.05 * Math.abs(Math.sin((i / 96) * TAU * 12)), p[2]]), closed: true });
  }
  // Deckel (geschlossen auf der Schachtel): unterer Rand etwas außen, obere Fläche als Herzlinie, Band kreuzweise
  const lb = flatHeart(LID_Y0, LID_OFF), lt = flatHeart(LID_TOP, LID_OFF), lidLines = [{ pts: lb, closed: true }, { pts: lt, closed: true }, ...vAt.map((i) => ({ pts: [lb[i], lt[i]] }))];
  const yT = LID_TOP;
  lidLines.push({ pts: [[-R * 1.02, yT, -0.25], [R * 1.02, yT, -0.25]] }, { pts: [[0, yT, -R * 0.4], [0, yT, R * 1.12]] });
  if (lv >= 1) { // Schleife: zwei Schlaufen und zwei Enden über der Bandkreuzung
    const c = [0, yT + 0.02, -0.25], loop = (sg) => ({ pts: Array.from({ length: 20 }, (_, i) => { const a = (i / 20) * TAU; return [c[0] + sg * (0.32 + 0.3 * Math.cos(a)), c[1] + 0.2 + 0.16 * Math.sin(a), c[2] + 0.06 * Math.sin(a)]; }), closed: true });
    lidLines.push(loop(1), loop(-1), { pts: [[0, yT + 0.18, -0.25], [-0.18, yT + 0.02, 0.12], [-0.3, yT, 0.32]] }, { pts: [[0, yT + 0.18, -0.25], [0.18, yT + 0.02, 0.12], [0.3, yT, 0.32]] });
  }
  // Fächer: runde Manschetten am Boden
  const cupLines = C.map(([x, z]) => ring([x, 0.05, z], 0.4 * g, [1, 0, 0], [0, 0, 1], 18));
  const prl = C.map(([x, z], i) => ({ c: [x, 0.07, z], kind: KINDS[(i * 3 + Math.abs(Math.round(x * 7))) % 4] }));
  // Anteile je Gruppe nach Linienlänge (Schachtel und Deckel dürfen etwas dünner, die Pralinen brauchen ihre Form)
  const len = (lines) => lines.reduce((a, l) => { const p = l.closed ? [...l.pts, l.pts[0]] : l.pts; let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(...sub(p[i], p[i - 1])); return a + L; }, 0);
  const prLines = prl.map((p) => pralineLines(p.kind, s).map((l) => ({ ...l, pts: l.pts.map((q) => add(q, p.c)) }))), w = [len(boxLines) * 0.55, len(lidLines) * 0.5, len(cupLines) * 0.8, prLines.reduce((a, l) => a + len(l), 0) * 1.3];
  const tot = w.reduce((a, b) => a + b, 0), cnt = w.map((x) => Math.floor((n * x) / tot)); cnt[3] += n - cnt.reduce((a, b) => a + b, 0);
  const box = assemble([curves('box', boxLines)], cnt[0]), lid = assemble([curves('lid', lidLines)], cnt[1]), cups = assemble([curves('cup', cupLines)], cnt[2]);
  // Pralinen: jede Praline bekommt Drohnen nach ihrer Linienlänge (mindestens 8), aufgebaut um ihren eigenen Mittelpunkt
  const pl = prLines.map(len), pt = pl.reduce((a, b) => a + b, 0), pc = pl.map((x) => Math.max(8, Math.floor((cnt[3] * x) / pt)));
  let rest = cnt[3] - pc.reduce((a, b) => a + b, 0); for (let i = 0; rest !== 0; i = (i + 1) % pc.length) { const d = Math.sign(rest); if (pc[i] + d >= 8) { pc[i] += d; rest -= d; } }
  const pts = [...box.pts, ...lid.pts, ...cups.pts], tags = [...box.tags, ...lid.tags, ...cups.tags], owner = pts.map(() => -1);
  prLines.forEach((lines, i) => { const a = assemble([curves(prl[i].kind, lines)], pc[i]); a.pts.forEach((p) => { pts.push(p); tags.push(prl[i].kind); owner.push(i); }); });
  const nb = box.pts.length, nl = lid.pts.length, nc = cups.pts.length;
  return { lv, pts, tags, owner, prl, nb, nl, nc, np: n - nb - nl - nc, g };
}

// ---------------------------------------------------------------------------------------------------------------------
// Bewegung
// ---------------------------------------------------------------------------------------------------------------------
// Geöffnet lehnt der Deckel aufrecht rechts neben der Schachtel, die Herzseite schräg zum Publikum (Spitze unten), wie
// beim Auspacken: er hebt sich, kippt um seine Querachse, dreht sich zum Publikum und gleitet zur Seite. So füllt das Bild
// die Breite der Bühne. Mittelpunkt geschlossen und geöffnet, Drehung zum Publikum und Anlehnen:
const LID_C = [0, LID_Y0 + LID_H / 2, 0.15], LID_UP = [R * 2.05, 0.55 + 0.98 * R, -0.35], LID_YAW = -0.22, LID_LEAN = 0.07;
/** Deckel: um open ∈ [0, 1] geöffnet, dazu eine kleine Zusatzneigung tilt. */
function lidPose(p, open, tilt, out) {
  // heben, zur Seite gleiten und kippen mit einer Rampe (getrennte Rampen ließen den Schwerpunkt in der Ansicht
  // überschwingen); der Deckel sitzt über dem Schachtelrand, seine Spitze schwenkt vor der Schachtel vorbei
  const e = ease(open), em = e, a = (Math.PI / 2) * e + tilt;
  let x = p[0] - LID_C[0], y = p[1] - LID_C[1], z = p[2] - LID_C[2];
  const c = Math.cos(a), s = Math.sin(a), y1 = y * c - z * s, z1 = y * s + z * c; y = y1; z = z1;
  const ya = LID_YAW * e, cy = Math.cos(ya), sy = Math.sin(ya), x2 = x * cy + z * sy, z2 = -x * sy + z * cy; x = x2; z = z2;
  const ro = (LID_LEAN + tilt * 0.5) * e, cr = Math.cos(ro), sr = Math.sin(ro), x3 = x * cr - y * sr, y3 = x * sr + y * cr;
    out[0] = lerp(LID_C[0], LID_UP[0], em) + x3; out[1] = lerp(LID_C[1], LID_UP[1], em) + y3; out[2] = lerp(LID_C[2], LID_UP[2], em) + z; return out;
}
/** Punkt der Herzlinie (Einheitsherz u) im geöffneten Deckel, um k skaliert und dz vor die Deckelfläche gerückt. */
const lidHeart = (u, k, dz = 0) => { const [x, y] = heart2(u); return lidPose([R * k * x, LID_C[1] + dz, LID_C[2] - R * k * y], 1, 0, [0, 0, 0]); };
/** Ansicht: die Schachtel steht leicht von oben gesehen, Spitze zum Publikum, um die Hochachse geschwenkt. */
const VIEW_PITCH = 0.5;
// Drehpunkt in der Bildmitte zwischen Schachtel und Deckel: drehte das Bild um die Schachtel, zöge der Schwenk den
// weit rechts stehenden Deckel in der Ansicht auf und ab (Finten-Wächter)
const PIVOT = [R * 1.0, -0.3];
const place = (o, ya) => { yaw(o, ya, PIVOT[0], PIVOT[1]); pitch(o, VIEW_PITCH, 0, 0); return o; };
const colourOf = (m, j) => (j < m.nb ? mix(GOLD, PINK, 0.25) : j < m.nb + m.nl ? mix(RED, PINK, 0.3) : j < m.nb + m.nl + m.nc ? mix(WARM, GOLD, 0.2) : KIND_COLOUR[m.tags[j]]);
// Ribbon und Schleife am Deckel in Gold statt Rot, damit das Band vom Deckelrand absticht
const lidColour = (p) => (Math.abs(p[1] - LID_TOP) < 0.01 && (Math.abs(p[0]) < 0.02 || Math.abs(p[2] + 0.25) < 0.02) ? GOLD : p[1] > LID_TOP + 0.015 ? GOLD : mix(RED, PINK, 0.3));
/** Lichtreihe: läuft Fachreihe für Fachreihe von der Spitze (vorn) nach hinten über die Fächer. */
const rowLight = (z, t, period) => 1 + 0.75 * Math.exp(-((((R * 1.15 - z) - (((t / period) % 1) * R * 2.6 - 0.2)) / 0.22) ** 2));

function baseColours(m) { return m.pts.map((p, j) => (j >= m.nb && j < m.nb + m.nl ? lidColour(p) : colourOf(m, j))); }

function pralinen3d(n, caption) {
  const m = model(n), col = baseColours(m), L0 = m.nb, L1 = m.nb + m.nl, P0 = L1 + m.nc;
  const yawAt = (t) => 0.32 * Math.sin((t * TAU) / 15) * smooth(t / 2);
  const tiltAt = (t) => 0.05 * Math.sin((t * TAU) / 5.5) * smooth(t / 2);
  const pose = (j, t, o) => {
    const p = m.pts[j];
    if (j >= L0 && j < L1) lidPose(p, 1, tiltAt(t), o); else { o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; }
    if (j >= P0) o[1] += 0.025 * Math.sin((t * TAU) / 3.2 + m.owner[j] * 1.3) * smooth(t / 2); // die Pralinen sitzen locker
    return place(o, yawAt(t));
  };
  const at = (t) => m.pts.map((_, j) => [...pose(j, t, [0, 0, 0]), ...col[j]]);
  const fitPts = [0, 3.75, 7.5, 11.25].flatMap((t) => at(t)).filter((_, i) => i % 2 === 0);
  const groups = [{ name: 'schachtel', count: m.nb, rigid: true }, { name: 'deckel', count: m.nl, rigid: true }, { name: 'faecher', count: m.nc, rigid: true }, { name: 'pralinen', count: m.np, rigid: true }];
  return { beats: [{ pts: at(0), caption, hold: 15, fitPts, groups, live: (b, j, t, o) => {
    pose(j, t, o);
    const p = m.pts[j];
    o[3] = j >= L1 ? rowLight(j >= P0 ? m.prl[m.owner[j]].c[2] : p[2], t, 4.5) * (j >= P0 ? 1.05 : 0.85) : 1;
  } }] };
}

// Geschichte: Zeiten der Akte
const ACT0 = [0, 5, 10.4, 15.4];
const OPEN = { at: 5.2, dur: 4.7 }, RISE = { at: 15.8, dur: 4.2, stagger: 0.5 };
function pralinenStory(n) {
  const m = model(n), col = baseColours(m), L0 = m.nb, L1 = m.nb + m.nl, P0 = L1 + m.nc, NP = m.prl.length;
  // der letzte Akt dauert, bis die letzte Praline im Herzen sitzt und das Herz zweimal pulsiert hat (Pralinen fliegen
  // einzeln nacheinander, damit sich ihre Bahnen nicht kreuzen)
  const ACT = [...ACT0, RISE.at + (NP - 1) * RISE.stagger + RISE.dur + 3];
  // Ziel der Pralinen: innen im aufrechten Deckel, eine Kette aus Pralinen entlang seiner Herzlinie; reicht der Platz
  // nicht (Pralinen brauchen gut 0,36 Abstand), kommt ein zweites, inneres Herz dazu. Die Kerbe oben bleibt frei: dort
  // liegen beide Herzbögen eng beieinander (am inneren Herzen ein breiterer Bereich, sonst rückt es an die Kerbe
  // des äußeren).
  const chain = (k, gap) => {
    const big = Array.from({ length: 600 }, (_, i) => lidHeart((i / 600) * TAU, k, 0.5)), cum = [0];
    for (let i = 1; i <= big.length; i++) cum.push(cum[i - 1] + Math.hypot(...sub(big[i % big.length], big[i - 1])));
    return { cap: Math.floor(((1 - 2 * gap) * cum[big.length]) / (0.8 * m.g)), at: (f) => { const want = (gap + (1 - 2 * gap) * f) * cum[big.length]; let i = 0; while (cum[i + 1] < want) i++; return big[i]; } };
  };
  // außen eine ungerade Zahl: eine Praline sitzt genau in der Herzspitze, sonst lägen zwei eng links und rechts davon
  const outer = chain(0.8, 0.05), inner = chain(0.36, 0.22), n1 = Math.min(NP, outer.cap) - (Math.min(NP, outer.cap) % 2 ? 0 : 1), n2 = NP - n1, tf = [];
  const targets = [...Array.from({ length: n1 }, (_, r) => { const f = (r + 0.5) / n1; tf.push(f <= 0.5 ? f : 1.5 - f); return outer.at(f); }),
    ...Array.from({ length: n2 }, (_, r) => { tf.push(2 + r); return inner.at((r + 0.5) / n2); })];
  const flat = (list) => Float64Array.from(list.flatMap((q) => [q[0], q[1], q[2]]));
  const toP = assignScalable(flat(targets), flat(m.prl.map((p) => p.c))), goal = new Array(NP);
  targets.forEach((q, r) => { goal[toP[r]] = q; });
  // Reihenfolge: die Fächer nahe am Deckel zuerst. Die Zuordnung Fach → Platz ist die kürzeste insgesamt, ihre geraden
  // Bahnen kreuzen sich nicht; so fliegen auch gleichzeitig startende Pralinen nebeneinander her, ohne sich zu treffen.
  const rank = new Array(NP); m.prl.map((p, i) => [-p.c[0] + 0.3 * p.c[2], i]).sort((a, b) => a[0] - b[0]).forEach(([, i], k) => { rank[i] = k; });
  // die Schachtel dreht sich herein und steht dann ruhig (ein Schwenk danach zöge die fliegenden Pralinen in der Ansicht
  // auf und ab: Finten-Wächter)
  const yawAt = (T) => 0.62 * (1 - ease(T / 4.5));
  const openAt = (T) => ease((T - OPEN.at) / OPEN.dur);
  const pose = (j, T, o) => {
    const p = m.pts[j];
    if (j >= L0 && j < L1) lidPose(p, openAt(T), 0, o);
    else if (j >= P0) {
      // Flug ohne Umweg (kein Ausholen, kein Überschwingen, Wächter scripts/show-finte.test.mjs): erst senkrecht aus dem
      // Fach über den Schachtelrand, dann auf gerader Linie mit einer gemeinsamen Rampe zum Platz. Der Anstieg ist so
      // klein, dass die Praline auch in der Ansicht von oben danach weiter steigt (hintere Fächer stehen dort schon höher).
      // Oben ein langsames Wiegen um die eigene Hochachse.
      const i = m.owner[j], c = m.prl[i].c, tau = (T - RISE.at - rank[i] * RISE.stagger) / RISE.dur, d = sub(goal[i], c);
      const ea = ease(tau / 0.32), eb = ease((tau - 0.22) / 0.78), UP = Math.max(0, Math.min(0.4, d[1] - 0.75 * d[2] - 0.05));
      const spin = 0.14 * Math.sin((T * TAU) / 4 + i) * smooth((tau - 1.15) / 0.5), dx = p[0] - c[0], dz = p[2] - c[2], cs = Math.cos(spin), sn = Math.sin(spin);
      o[0] = c[0] + d[0] * eb + dx * cs + dz * sn; o[1] = p[1] + UP * ea + (d[1] - UP) * eb; o[2] = c[2] + d[2] * eb - dx * sn + dz * cs;
    } else { o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; }
    return place(o, yawAt(T));
  };
  const light = (j, T) => {
    if (j < L1) return T > ACT[3] ? 0.85 : 1;
    const zc = j >= P0 ? m.prl[m.owner[j]].c[2] : m.pts[j][2];
    if (T < ACT[2]) return 0.14 + (j >= P0 ? 0.91 : 0.66) * smooth((T - OPEN.at - 0.8) / 2); // im geschlossenen Deckel kaum sichtbar
    if (T < ACT[3]) return rowLight(zc, T - ACT[2], 2.5) * (j >= P0 ? 1.05 : 0.85);
    if (j < P0) return 0.6 + 0.15 * Math.sin((T * TAU) / 3 - zc); // leere Fächer glühen nach
    const i = m.owner[j], arrived = smooth((T - RISE.at - rank[i] * RISE.stagger - RISE.dur) / 0.6);
    return 1.05 + arrived * 0.4 * (0.5 + 0.5 * Math.sin((T * TAU) / 1.6 - (rank[i] / NP) * TAU)); // das Herz pulsiert ringsum
  };
  const at = (T) => m.pts.map((_, j) => [...pose(j, T, [0, 0, 0]), ...col[j]]);
  // jede Praline ein eigenes Teil: sie fliegen einzeln, nicht als gemeinsamer Körper
  const prSpans = m.prl.map((_, i) => { const js = m.owner.map((o, j) => (o === i ? j : -1)).filter((j) => j >= 0); return [js[0], js[js.length - 1] + 1]; });
  const parts = (pts) => [part('schachtel', pts.slice(0, L0), { rigid: true }), part('deckel', pts.slice(L0, L1), { rigid: true }), part('faecher', pts.slice(L1, P0), { rigid: true }), ...prSpans.map(([a, b], i) => part(`praline${i}`, pts.slice(a, b), { rigid: true }))];
  const fitPts = [0, 3, 6, 9.5, 14, 17, 20, ACT[4] - 2, ACT[4]].flatMap((T) => at(T)).filter((_, i) => i % 2 === 0);
  const caps = ['pralinen.aBoxWithARibbon', 'pralinen.theLidOpens', 'pralinen.lightRunsOverTheTreats', 'pralinen.theTreatsRiseIntoAHeart'];
  return { beats: caps.map((key, a) => ({ ...act(parts(at(ACT[a])), { caption: message(key), hold: ACT[a + 1] - ACT[a], live: (b, j, t, o) => {
    const T = ACT[a] + t; pose(j, T, o); o[3] = light(j, T);
  } }), fitPts })) };
}

export const builders = {
  pralinen3d: (n, caption) => pralinen3d(n, caption),
  pralinenStory: (n) => pralinenStory(n),
};
