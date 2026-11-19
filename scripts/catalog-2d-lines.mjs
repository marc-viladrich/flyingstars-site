// Saubere Linien für die 2D-Katalogmotive (Runde 7, Marc 19.11.2026: „du solltest dich weniger exakt an der von
// FlyingStars vorgegebenen Shape orientieren, sondern primär darauf achten, dass die Shapes alle von sich aus gut und
// natürlich aussehen“). Methode wie beim Logo-Konverter (src/scripts/logo-v10/): erst die Zeichnung als Tinte, dann
// Mittellinien für Striche und Konturen für Flächen, dann gleichmäßig entlang der Linien abtasten. Ablauf je Variante:
//   1. Tinte: jede Katalogkante (Nachbarn im Abstand einer gezeichneten Linie) als Strich der Breite 2·R_INK·s0 in ein
//      Raster, kleine Löcher (Zwischenräume eines Punktrasters) gefüllt.
//   2. Flächen hohl: wo die Tinte tiefer ist als ein Strich (Blätter, Füllungen, Doppelreihen), bleibt nur ein Rand,
//      dessen Mitte durch die äußersten Punkte läuft. Die Fläche wird so zur Kontur.
//   3. Mittellinie des Rests (Zhang-Suen), daraus ein Liniengraph: Knoten an Enden und Kreuzungen, kurze Sporne weg.
//   4. Ecken als feste Ankerpunkte, dazwischen geglättet; fast gerade Stücke werden gerade, fast runde Schleifen Kreise,
//      gleichmäßige Bögen echte Bögen.
// Die Linien werden einmal je Variante vorberechnet (public/media/katalog/linien/<id>.json, dieses Skript). Zur
// Laufzeit tastet scenes/catalog-resample.js sie nur noch gleichmäßig ab (Liniendichte aus der Drohnenzahl).
// Aufruf: node scripts/catalog-2d-lines.mjs [motiv …]   (ohne Motive: alle 2D-Motive)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const R_INK = 0.62; // Strichradius in mittleren Punktabständen s0
const HOLE = 0.9; // kleinere Löcher (in s0²) werden gefüllt
const HOLLOW = 1.5, CORE = 0.6; // tiefer als HOLLOW·Strichradius ist Fläche (ab CORE·s0² Größe): sie wird hohl
const REACH = 2.1, SPAN = 1.7; // Kanten (RNG): höchstens REACH·s0 (Hinweis reach) und SPAN·eigener Nachbarabstand
const SPUR = 0.9; // kürzere Sporne an Kreuzungen fallen weg (in s0)
const CORNER = 52 * Math.PI / 180; // Knick, ab dem ein Punkt Ecke ist
const STEP = 0.2; // Abtastschritt der Rohlinie in s0

// ——— Hinweise je Motiv, wo die allgemeine Regel nicht reicht ———
// keep: Flächen- und Rastermotive (Fahnen, Regenbogenbänder, Sonnenspirale …), deren Bild gerade aus dem Raster besteht,
//   oder Zeichnungen, die als Linien nicht sauber werden: Sie behalten FlyingStars' Punkte, weitere Drohnen warten dunkel.
// shape: von Hand idealisierte Form (Kreis bleibt Kreis, Gerade bleibt gerade, symmetrisch), gemessen an den Katalogpunkten.
const arc = (cx, cy, rx, ry, a0, a1, k = 64) => Array.from({ length: k + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / k; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });
/** Herzkurve (klassische Parameterform), Breite 2·sx, Höhe von bot bis top, Mitte cx. */
const heart = (cx, bot, top, sx, k = 120) => Array.from({ length: k }, (_, i) => {
  const t = (2 * Math.PI * i) / k, x = Math.sin(t) ** 3, y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16;
  return [cx + sx * x, bot + ((y + 17 / 16) / (12 / 16 + 17 / 16)) * (top - bot)];
});
function builder() {
  const nodes = [], curves = [], loops = [], dots = [];
  const node = (q) => { const i = nodes.findIndex((n) => Math.hypot(n[0] - q[0], n[1] - q[1]) < 1e-6); if (i >= 0) return i; nodes.push(q); return nodes.length - 1; };
  return { nodes, curves, loops, dots, path(p, ci) { curves.push({ a: node(p[0]), b: node(p.at(-1)), p, ci }); }, loop(p, ci) { loops.push({ p, ci }); } };
}
const bbox = (P) => { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const [x, y] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 }; };
/** Ellipse (achsparallel) aus Punkten auf ihrem Umfang: Mitte und Halbachsen aus den zweiten Momenten. */
const ellipseOf = (P) => { const n = P.length, mx = P.reduce((s, p) => s + p[0], 0) / n, my = P.reduce((s, p) => s + p[1], 0) / n; return [mx, my, Math.sqrt((2 * P.reduce((s, p) => s + (p[0] - mx) ** 2, 0)) / n), Math.sqrt((2 * P.reduce((s, p) => s + (p[1] - my) ** 2, 0)) / n)]; };
const smoothOpen = (p, n = 3) => { let q = p; for (let k = 0; k < n; k++) { const r = [q[0]]; for (let i = 0; i < q.length - 1; i++) r.push([0.75 * q[i][0] + 0.25 * q[i + 1][0], 0.75 * q[i][1] + 0.25 * q[i + 1][1]], [0.25 * q[i][0] + 0.75 * q[i + 1][0], 0.25 * q[i][1] + 0.75 * q[i + 1][1]]); r.push(q.at(-1)); q = r; } return q; };
const KEEP = { keep: true };
export const HINTS = {
  fahnen: KEEP, sektflasche: KEEP, batterie: KEEP, zuckerstange: KEEP, blume: KEEP, sonne: KEEP, jubilaeum30: KEEP, leuchtturm: KEEP,
  foerderturm: KEEP, schiff: KEEP, drehzahl: KEEP, golfer: KEEP, flugzeug: KEEP, golfcaddy: KEEP, palme: KEEP, regenbogen: KEEP,
  // Nachrunde (Marc, 19.11.2026: „Kein Motiv darf nach dem Umbau schlechter aussehen als seine Katalogpunkte“): jedes Motiv auf
  // den Bögen 01–10 einzeln angesehen; diese wurden als Linien unförmiger, zerschnitten oder unruhiger als der Katalog
  anstossen: KEEP, blueten: KEEP, kuhufo: KEEP, lebensbaum: KEEP, traktor: KEEP, tor: KEEP, golfplatz: KEEP, planierraupe: KEEP,
  berge: KEEP, hubschrauber: KEEP, elefant: KEEP, glocke: KEEP, schneemann: KEEP, lebkuchen: KEEP, diskokugel: KEEP, biene: KEEP,
  marienkaefer: KEEP, schluessel: KEEP, bagger: KEEP, feuerwehr: KEEP, basketball: KEEP, amor: KEEP, kind: KEEP, heldin: KEEP,
  geburtstag: KEEP, anker: KEEP, mikrofon: KEEP, konfetti: KEEP, lkw: KEEP,
  smiley: { shape(P) {
    // lachendes Gesicht: Kreis, zwei Augenbögen auf gleicher Höhe, lachender Mund (gerade Oberkante, runder Unterbogen).
    // Das rechte Auge liegt im Zwinkerbereich von catalog-actions.js (x 0,12–0,55, y 0,02–0,36)
    const b = bbox(P), far = P.filter((p) => Math.hypot(p[0] - b.cx, p[1] - b.cy) > 0.4 * Math.max(b.w, b.h));
    // Kreis im Rahmen des Katalogbilds (die Ausgleichsrechnung über die lückige Kontur geht sonst darüber hinaus)
    const f = circleFit(far), R = Math.min(f[2], b.w / 2, b.h / 2), cx = b.cx, cy = b.cy, B = builder(), u = R / 0.944;
    B.loop(arc(cx, cy, R, R, Math.PI / 2, Math.PI / 2 + 2 * Math.PI, 128).slice(0, -1));
    for (const side of [-1, 1]) B.path(arc(cx + side * 0.31 * u, cy + 0.13 * u, 0.16 * u, 0.21 * u, Math.PI, 0, 32));
    const L = [cx - 0.62 * u, cy - 0.1 * u], Rr = [cx + 0.62 * u, cy - 0.1 * u];
    B.path([L, Rr]);
    const low = arc(cx, cy - 0.1 * u, 0.62 * u, 0.58 * u, Math.PI, 2 * Math.PI, 64); low[0] = L; low[low.length - 1] = Rr; B.path(low);
    return B;
  } },
  doppelherz: { shape(P) {
    // zwei ineinanderliegende Herzen: das äußere aus dem Rahmen des Bilds, das innere aus den Punkten, die nicht am äußeren liegen
    const b = bbox(P), B = builder(), outer = heart(b.cx, b.y0, b.y1, b.w / 2, 160);
    // je Winkel (24 Sektoren um die Bildmitte) ist der äußerste Punkt am äußeren Herz; deutlich weiter innen = inneres Herz
    const ang = (p) => Math.floor(((Math.atan2(p[1] - b.cy, p[0] - b.cx) + Math.PI) / (2 * Math.PI)) * 24) % 24, rad = (p) => Math.hypot(p[0] - b.cx, p[1] - b.cy);
    const max = new Array(24).fill(0); for (const p of P) max[ang(p)] = Math.max(max[ang(p)], rad(p));
    const i = bbox(P.filter((p) => rad(p) < 0.82 * max[ang(p)]));
    // das innere Herz etwas kleiner als seine Katalogpunkte, damit es an der Kerbe oben nicht ans äußere stößt
    B.loop(outer); B.loop(heart(b.cx, i.y0 + 0.02 * b.h, i.y1 - 0.07 * b.h, 0.94 * i.w / 2, 120));
    return B;
  } },
  peace: { shape(P) {
    // Kreis aus den äußeren Punkten, senkrechter Durchmesser, zwei Speichen bei 225° und 315° (das Friedenszeichen)
    const b = bbox(P), far = P.filter((p) => Math.hypot(p[0] - b.cx, p[1] - b.cy) > 0.35 * Math.max(b.w, b.h));
    const [cx, cy, R] = circleFit(far), at = (a) => [cx + R * Math.cos(a), cy + R * Math.sin(a)], g = (d) => (d * Math.PI) / 180;
    const B = builder(), C = [cx, cy];
    B.path([at(g(90)), C]); B.path([C, at(g(270))]); B.path([C, at(g(225))]); B.path([C, at(g(315))]);
    for (const [a0, a1] of [[90, 225], [225, 270], [270, 315], [315, 450]]) { const p = arc(cx, cy, R, R, g(a0), g(a1)); p[0] = at(g(a0)); p[p.length - 1] = at(g(a1 % 360)); B.path(p); }
    return B;
  } },
  eheringe: { shape(P) {
    // zwei verschlungene Ringe: Punkte den beiden Ellipsen zuordnen (links/rechts, dann nach Abstand), je eine Ellipse
    const b = bbox(P); let E = [ellipseOf(P.filter((p) => p[0] < b.cx)), ellipseOf(P.filter((p) => p[0] >= b.cx))];
    for (let it = 0; it < 8; it++) {
      const d = (e, p) => Math.abs(Math.hypot((p[0] - e[0]) / e[2], (p[1] - e[1]) / e[3]) - 1);
      const sides = [[], []]; for (const p of P) sides[d(E[0], p) <= d(E[1], p) ? 0 : 1].push(p);
      E = sides.map((S, i) => (S.length > 8 ? ellipseOf(S) : E[i]));
    }
    // gleich groß (Eheringe sind ein Paar), gleiche Höhe
    const rx = (E[0][2] + E[1][2]) / 2, ry = (E[0][3] + E[1][3]) / 2, cy = (E[0][1] + E[1][1]) / 2;
    const B = builder(); for (const e of E) B.loop(arc(e[0], cy, rx, ry, Math.PI / 2, Math.PI / 2 + 2 * Math.PI, 96).slice(0, -1));
    return B;
  } },
  torte: { shape(P) {
    // dreistöckige Hochzeitstorte in leichter Aufsicht, ein kleines Herz obenauf
    const b = bbox(P), cx = b.cx, Y = (u) => b.y0 + u * b.h, rx = [0.49, 0.355, 0.23].map((k) => k * b.w), ry = rx.map((r) => 0.24 * r);
    const ybot = [b.y0 + ry[0] + 0.02 * b.h, Y(0.37), Y(0.58)], ytop = [Y(0.37), Y(0.58), Y(0.77)];
    const B = builder();
    for (let i = 0; i < 3; i++) {
      const L = [cx - rx[i], ybot[i]], R = [cx + rx[i], ybot[i]], LT = [cx - rx[i], ytop[i]], RT = [cx + rx[i], ytop[i]];
      B.path([LT, L]); B.path([R, RT]);
      const front = arc(cx, ybot[i], rx[i], ry[i], Math.PI, 2 * Math.PI); front[0] = L; front[front.length - 1] = R; B.path(front);
      const topFront = arc(cx, ytop[i], rx[i], ry[i], Math.PI, 2 * Math.PI); topFront[0] = LT; topFront[topFront.length - 1] = RT; B.path(topFront);
      if (i === 2) { const back = arc(cx, ytop[i], rx[i], ry[i], 0, Math.PI); back[0] = RT; back[back.length - 1] = LT; B.path(back); continue; }
      // hintere Kante nur, wo der Stock darüber sie nicht verdeckt
      const cut = Math.acos(rx[i + 1] / rx[i]);
      const r1 = arc(cx, ytop[i], rx[i], ry[i], 0, cut, 16); r1[0] = RT; B.path(r1);
      const l1 = arc(cx, ytop[i], rx[i], ry[i], Math.PI - cut, Math.PI, 16); l1[l1.length - 1] = LT; B.path(l1);
    }
    B.loop(heart(cx, Y(0.81), Y(0.985), 0.12 * b.w));
    return B;
  } },
  unendlich: { shape(P) {
    // Lemniskate in der Größe des Katalogbilds (eine Linie statt des doppelten Bands)
    const b = bbox(P), a = b.w / 2, k = 160, pts = [];
    for (let i = 0; i < k; i++) { const t = (2 * Math.PI * i) / k, d = 1 + Math.sin(t) ** 2; pts.push([b.cx + (a * Math.cos(t)) / d, b.cy + ((0.9 * b.h) / 2 / 0.3536) * ((Math.sin(t) * Math.cos(t)) / d)]); }
    const B = builder(); B.loop(pts); return B;
  } },
  initialen: { shape(P, pts) {
    // Herz um das ganze Bild, darin A & T an den Plätzen der Katalogbuchstaben (Farben folgen den Katalogpunkten)
    const b = bbox(P), B = builder(), hue = (p) => (p[3] > 60 && p[4] > 60 && p[5] < 60 ? 'gelb' : p[5] > p[3] && p[3] < 50 ? 'blau' : p[3] < 110 && p[5] >= 100 ? 'lila' : 'rot');
    const of = (name) => pts.map((p, i) => [p, i]).filter(([p]) => hue(p) === name), box = (name) => bbox(of(name).map(([p]) => [p[0], p[1]]));
    // Farbe je Linie: der hellste Katalogpunkt der jeweiligen Farbe (Herz, A, &, T bleiben einfarbig)
    const colour = (name) => of(name).sort(([p], [q]) => q[3] + q[4] + q[5] - p[3] - p[4] - p[5])[0][1];
    B.loop(heart(b.cx, b.y0, b.y1, b.w / 2), colour('rot'));
    const A = box('lila'), T = box('blau'), U = box('gelb'), cA = colour('lila'), cT = colour('blau'), cU = colour('gelb');
    // Buchstaben auf gemeinsame Grundlinie und Höhe
    const base = Math.min(A.y0, T.y0, U.y0), top = Math.max(A.y1, T.y1, U.y1), H = top - base;
    const ax = A.cx, aw = Math.max(A.w, 0.55 * H) / 2;
    B.path([[ax - aw, base], [ax, top]], cA); B.path([[ax, top], [ax + aw, base]], cA);
    B.path([[ax - aw * 0.55, base + 0.38 * H], [ax + aw * 0.55, base + 0.38 * H]], cA);
    const tx = T.cx, tw = Math.max(T.w, 0.55 * H) / 2;
    B.path([[tx - tw, top], [tx, top]], cT); B.path([[tx, top], [tx + tw, top]], cT); B.path([[tx, top], [tx, base]], cT);
    const amp = [[1, 0], [0.62, 0.36], [0.25, 0.68], [0.22, 0.88], [0.38, 1], [0.56, 0.9], [0.55, 0.74], [0.3, 0.52], [0.06, 0.3], [0.12, 0.05], [0.42, -0.02], [0.72, 0.18], [0.86, 0.4]];
    const uw = 0.62 * H, ux = U.cx - uw / 2;
    B.path(smoothOpen(amp.map(([x, y]) => [ux + x * uw, base + y * H])), cU);
    return B;
  } },
};

/** Mittlerer Punktabstand und RNG-Kanten (nur direkte Nachbarn). */
function graph(P, reach = REACH) {
  const m = P.length, d = (i, j) => Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]);
  const nn = new Float64Array(m).fill(Infinity);
  for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) if (i !== j) { const q = d(i, j); if (q > 1e-9 && q < nn[i]) nn[i] = q; }
  const s0 = Array.from(nn).filter(Number.isFinite).sort((a, b) => a - b)[Math.floor(m / 2)] || 0.05;
  const near = P.map((_, i) => { const l = []; for (let j = 0; j < m; j++) if (j !== i && d(i, j) <= reach * s0) l.push(j); return l; });
  const edges = [];
  for (let i = 0; i < m; i++) for (const j of near[i]) {
    if (j <= i) continue;
    const q = d(i, j);
    if (q < 1e-9 || q > SPAN * Math.max(nn[i], nn[j])) continue;
    if (!near[i].some((k) => k !== j && Math.max(d(i, k), d(j, k)) < q)) edges.push([i, j]);
  }
  return { s0, edges };
}

/** Euklidische Distanz zur nächsten Nicht-Tinte (Fasenmaß 1/√2, in Zellen). */
function depthOf(ink, W, H) {
  const D = new Float32Array(W * H), INF = 1e9;
  for (let i = 0; i < W * H; i++) D[i] = ink[i] ? INF : 0;
  const r2 = Math.SQRT2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!D[i]) continue;
    let v = D[i];
    if (x > 0) v = Math.min(v, D[i - 1] + 1); else v = Math.min(v, 1);
    if (y > 0) { v = Math.min(v, D[i - W] + 1); if (x > 0) v = Math.min(v, D[i - W - 1] + r2); if (x < W - 1) v = Math.min(v, D[i - W + 1] + r2); } else v = Math.min(v, 1);
    D[i] = v;
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x; if (!D[i]) continue;
    let v = D[i];
    if (x < W - 1) v = Math.min(v, D[i + 1] + 1); else v = Math.min(v, 1);
    if (y < H - 1) { v = Math.min(v, D[i + W] + 1); if (x < W - 1) v = Math.min(v, D[i + W + 1] + r2); if (x > 0) v = Math.min(v, D[i + W - 1] + r2); } else v = Math.min(v, 1);
    D[i] = v;
  }
  return D;
}

/** Zusammenhängende Stücke (4er-Nachbarschaft) der Zellen mit pred(i). */
function pieces(W, H, pred) {
  const seen = new Uint8Array(W * H), out = [];
  for (let i0 = 0; i0 < W * H; i0++) {
    if (seen[i0] || !pred(i0)) continue;
    const list = [i0]; seen[i0] = 1;
    for (let q = 0; q < list.length; q++) {
      const i = list[q], x = i % W;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < W * H && !seen[j] && pred(j)) { seen[j] = 1; list.push(j); }
    }
    out.push(list);
  }
  return out;
}

/** Zhang-Suen-Verdünnung (in place). */
function thin(B, W, H) {
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : B[y * W + x]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const step of [0, 1]) {
      const del = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!B[y * W + x]) continue;
        const p = [at(x, y - 1), at(x + 1, y - 1), at(x + 1, y), at(x + 1, y + 1), at(x, y + 1), at(x - 1, y + 1), at(x - 1, y), at(x - 1, y - 1)];
        const b = p.reduce((s, v) => s + v, 0);
        if (b < 2 || b > 6) continue;
        let a = 0; for (let k = 0; k < 8; k++) if (!p[k] && p[(k + 1) % 8]) a++;
        if (a !== 1) continue;
        if (step === 0 ? (p[0] && p[2] && p[4]) || (p[2] && p[4] && p[6]) : (p[0] && p[2] && p[6]) || (p[0] && p[4] && p[6])) continue;
        del.push(y * W + x);
      }
      for (const i of del) B[i] = 0;
      if (del.length) changed = true;
    }
  }
}

const len = (p) => { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; };
/** Polylinie gleichmäßig neu abtasten (Schritt h, Enden bleiben). */
function even(p, h, closed = false) {
  const q = closed ? [...p, p[0]] : p, L = len(q), k = Math.max(closed ? 3 : 1, Math.round(L / h)), out = [];
  let seg = 0, acc = 0;
  for (let i = 0; i <= k; i++) {
    if (closed && i === k) break;
    const want = (L * i) / k;
    while (seg < q.length - 2 && acc + Math.hypot(q[seg + 1][0] - q[seg][0], q[seg + 1][1] - q[seg][1]) < want) { acc += Math.hypot(q[seg + 1][0] - q[seg][0], q[seg + 1][1] - q[seg][1]); seg++; }
    const A = q[seg], B = q[seg + 1] ?? A, l = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, u = Math.min(1, Math.max(0, (want - acc) / l));
    out.push([A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u]);
  }
  return out;
}
/** Glätten: wiederholtes (1,2,1)/4, Enden fest (offen) oder zyklisch (geschlossen). */
function smooth(p, iters, closed) {
  let q = p.map((v) => [...v]);
  const n = q.length;
  if (n < 3) return q;
  for (let it = 0; it < iters; it++) {
    const r = q.map((v) => [...v]);
    for (let i = closed ? 0 : 1; i < (closed ? n : n - 1); i++) {
      const a = q[(i - 1 + n) % n], b = q[(i + 1) % n];
      r[i] = [(a[0] + 2 * q[i][0] + b[0]) / 4, (a[1] + 2 * q[i][1] + b[1]) / 4];
    }
    q = r;
  }
  return q;
}
/** Kreis durch Punkte (algebraisch, Kåsa): [cx, cy, r, rms, max]. */
function circleFit(p) {
  const n = p.length; let mx = 0, my = 0; for (const [x, y] of p) { mx += x; my += y; } mx /= n; my /= n;
  let suu = 0, svv = 0, suv = 0, suuu = 0, svvv = 0, suvv = 0, svuu = 0;
  for (const [x, y] of p) { const u = x - mx, v = y - my; suu += u * u; svv += v * v; suv += u * v; suuu += u * u * u; svvv += v * v * v; suvv += u * v * v; svuu += v * u * u; }
  const det = suu * svv - suv * suv;
  if (Math.abs(det) < 1e-12) return null;
  const a = 0.5 * (suuu + suvv), b = 0.5 * (svvv + svuu);
  const uc = (a * svv - b * suv) / det, vc = (b * suu - a * suv) / det, cx = mx + uc, cy = my + vc, r = Math.sqrt(uc * uc + vc * vc + (suu + svv) / n);
  let rms = 0, max = 0; for (const [x, y] of p) { const e = Math.abs(Math.hypot(x - cx, y - cy) - r); rms += e * e; max = Math.max(max, e); }
  return [cx, cy, r, Math.sqrt(rms / n), max];
}
/** Douglas-Peucker (geschlossene Linien: in zwei Hälften). */
function simplify(p, tol) {
  if (p.length < 3) return p;
  if (Math.hypot(p[0][0] - p.at(-1)[0], p[0][1] - p.at(-1)[1]) < tol) { const h = p.length >> 1; return [...simplify(p.slice(0, h + 1), tol).slice(0, -1), ...simplify(p.slice(h), tol)]; }
  const keep = new Uint8Array(p.length); keep[0] = keep[p.length - 1] = 1;
  const stack = [[0, p.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let best = -1, bd = tol;
    const [ax, ay] = p[a], [bx, by] = p[b], L = Math.hypot(bx - ax, by - ay) || 1e-9;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((bx - ax) * (ay - p[i][1]) - (ax - p[i][0]) * (by - ay)) / L; if (d > bd) { bd = d; best = i; } }
    if (best > 0) { keep[best] = 1; stack.push([a, best], [best, b]); }
  }
  return p.filter((_, i) => keep[i]);
}

/**
 * Linien einer Katalogvariante. pts: [[x, y, …], …]. Rückgabe { s0, nodes: [[x, y]], curves: [{ a, b, p }],
 * loops: [{ p } | { circle: [cx, cy, r] }], dots: [[x, y]] }; p sind Polylinien (offen von Knoten a nach b).
 */
export function deriveLines(pts, hint = {}) {
  const P = pts.map((p) => [p[0], p[1]]);
  const { s0, edges } = graph(P, hint.reach);
  const r4 = (v) => Math.round(v * 1e4) / 1e4, R = (q) => [r4(q[0]), r4(q[1])];
  if (hint.keep) return { s0: r4(s0), keep: true, nodes: [], curves: [], loops: [], dots: P.map(R) };
  if (hint.shape) {
    const B = hint.shape(P, pts);
    return { s0: r4(s0), shape: true, nodes: B.nodes.map(R), curves: B.curves.map((c) => ({ a: c.a, b: c.b, p: simplify(c.p, 0.005 * s0).map(R), ...(c.ci != null ? { ci: c.ci } : {}) })), loops: B.loops.map((l) => ({ p: simplify([...l.p, l.p[0]], 0.005 * s0).slice(0, -1).map(R), ...(l.ci != null ? { ci: l.ci } : {}) })), dots: B.dots.map(R) };
  }
  const r = (hint.ink ?? R_INK) * s0, cell = s0 / 5;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  x0 -= 3 * s0; y0 -= 3 * s0; x1 += 3 * s0; y1 += 3 * s0;
  const W = Math.ceil((x1 - x0) / cell) + 1, H = Math.ceil((y1 - y0) / cell) + 1;
  const X = (gx) => x0 + gx * cell, Y = (gy) => y0 + gy * cell;
  // 1. Tinte
  const ink = new Uint8Array(W * H);
  const capsule = (A, B) => {
    const gx0 = Math.max(0, Math.floor((Math.min(A[0], B[0]) - r - x0) / cell)), gx1 = Math.min(W - 1, Math.ceil((Math.max(A[0], B[0]) + r - x0) / cell));
    const gy0 = Math.max(0, Math.floor((Math.min(A[1], B[1]) - r - y0) / cell)), gy1 = Math.min(H - 1, Math.ceil((Math.max(A[1], B[1]) + r - y0) / cell));
    const dx = B[0] - A[0], dy = B[1] - A[1], L2 = dx * dx + dy * dy || 1e-12;
    for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
      const px = X(gx), py = Y(gy), u = Math.max(0, Math.min(1, ((px - A[0]) * dx + (py - A[1]) * dy) / L2));
      if (Math.hypot(px - A[0] - u * dx, py - A[1] - u * dy) <= r) ink[gy * W + gx] = 1;
    }
  };
  for (const p of P) capsule(p, p);
  for (const [i, j] of edges) capsule(P[i], P[j]);
  // kleine Löcher füllen (Außenraum = Stück, das den Rand berührt)
  for (const piece of pieces(W, H, (i) => !ink[i])) {
    const border = piece.some((i) => { const x = i % W, y = (i - x) / W; return x === 0 || y === 0 || x === W - 1 || y === H - 1; });
    if (!border && piece.length * cell * cell < (hint.hole ?? HOLE) * s0 * s0) for (const i of piece) ink[i] = 1;
  }
  // 2. Flächen hohl: tiefer als ein Strich (2r) wird ausgeschnitten, der Rand (Breite 2r) bleibt
  const depth = depthOf(ink, W, H), hollowAt = (hint.hollow ?? HOLLOW) * r / cell;
  if (hint.hollow !== false) for (const piece of pieces(W, H, (i) => depth[i] > hollowAt)) {
    if (piece.length * cell * cell >= CORE * s0 * s0) for (const i of piece) ink[i] = 0;
  }
  // 3. Mittellinie und Graph
  thin(ink, W, H);
  const nb = (i) => { const x = i % W, out = []; for (const dy of [-1, 0, 1]) for (const dx of [-1, 0, 1]) { if (!dx && !dy) continue; const xx = x + dx, j = i + dy * W + dx; if (xx >= 0 && xx < W && j >= 0 && j < W * H && ink[j]) out.push(j); } return out; };
  const deg = new Map(); for (let i = 0; i < W * H; i++) if (ink[i]) deg.set(i, nb(i).length);
  // Knotenpixel (Ende, Kreuzung, Einzelpixel) zu Clustern
  const cl = new Map(); let nc = 0;
  for (const [i, d] of deg) {
    if (d === 2 || cl.has(i)) continue;
    const stack = [i]; cl.set(i, nc);
    while (stack.length) { const q = stack.pop(); for (const j of nb(q)) if (deg.get(j) !== 2 && !cl.has(j)) { cl.set(j, nc); stack.push(j); } }
    nc++;
  }
  const pos = (i) => [X(i % W), Y(Math.floor(i / W))];
  const chains = [], used = new Set(), key = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);
  for (const [i0] of cl) for (const j0 of nb(i0)) {
    if (cl.has(j0) && cl.get(j0) === cl.get(i0)) continue;
    if (used.has(key(i0, j0))) continue;
    const path = [i0, j0]; used.add(key(i0, j0));
    let prev = i0, cur = j0;
    while (!cl.has(cur)) {
      const nx = nb(cur).filter((j) => j !== prev && !used.has(key(cur, j)));
      if (!nx.length) break;
      // bevorzugt geradeaus (4er-Nachbar vor Diagonale), damit Treppenstufen nicht abzweigen
      nx.sort((a, b) => (Math.abs((a % W) - (cur % W)) + Math.abs(Math.floor(a / W) - Math.floor(cur / W))) - (Math.abs((b % W) - (cur % W)) + Math.abs(Math.floor(b / W) - Math.floor(cur / W))));
      used.add(key(cur, nx[0])); prev = cur; cur = nx[0]; path.push(cur);
    }
    chains.push({ a: cl.get(i0), b: cl.has(cur) ? cl.get(cur) : -1, p: path.map(pos) });
  }
  // reine Schleifen ohne Knoten
  const onChain = new Set(); for (const [k] of used.entries()) for (const v of k.split(',')) onChain.add(+v);
  for (const [i] of deg) {
    if (onChain.has(i) || cl.has(i)) continue;
    const path = [i]; onChain.add(i); let prev = -1, cur = i;
    for (;;) { const nx = nb(cur).filter((j) => j !== prev && !onChain.has(j)); if (!nx.length) break; prev = cur; cur = nx[0]; onChain.add(cur); path.push(cur); }
    if (path.length > 3) chains.push({ a: -2, b: -2, p: path.map(pos), closed: true });
  }
  // Knoten = Mitte des Clusters; verbunden durch sehr kurze Stücke → ein Knoten (Union-Find)
  const parent = Array.from({ length: nc }, (_, i) => i), find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (const c of chains) if (c.a >= 0 && c.b >= 0 && c.a !== c.b && len(c.p) < 0.45 * s0) parent[find(c.a)] = find(c.b);
  const acc = new Map();
  for (const [i, c] of cl) { const k = find(c), q = pos(i), a = acc.get(k) ?? [0, 0, 0]; a[0] += q[0]; a[1] += q[1]; a[2]++; acc.set(k, a); }
  const node = new Map([...acc].map(([k, a]) => [k, [a[0] / a[2], a[1] / a[2]]]));
  let list = [];
  for (const c of chains) {
    if (c.closed) { list.push(c); continue; }
    const a = find(c.a), b = c.b >= 0 ? find(c.b) : -1;
    if (b < 0) continue; // abgebrochener Pfad (kommt bei sauberer Verdünnung nicht vor)
    if (a === b && len(c.p) < 1.2 * s0) continue; // Mini-Schleife an einer Kreuzung
    if (a !== b && c.a !== c.b && find(c.a) === find(c.b) && len(c.p) < 0.45 * s0) continue;
    list.push({ a, b, p: [node.get(a), ...c.p.slice(1, -1), node.get(b)] });
  }
  const dots = [];
  for (const [k, q] of node) if (!list.some((c) => c.a === k || c.b === k)) dots.push(q); // Einzelpunkte
  // Aufräumen: Sporne weg, Knoten mit Grad 2 verbinden, winzige Einzelstriche zu Punkten
  for (let round = 0; round < 6; round++) {
    const dg = new Map(); for (const c of list) if (!c.closed) { dg.set(c.a, (dg.get(c.a) ?? 0) + 1); dg.set(c.b, (dg.get(c.b) ?? 0) + 1); }
    let changed = false;
    const spur = (hint.spur ?? SPUR) * s0;
    list = list.filter((c) => {
      if (c.closed) return true;
      const L = len(c.p), da = dg.get(c.a), db = dg.get(c.b);
      if (da === 1 && db === 1 && L < 0.5 * s0) { dots.push(c.p[Math.floor(c.p.length / 2)]); changed = true; return false; }
      if ((da === 1 && db >= 3) || (db === 1 && da >= 3)) if (L < spur) { changed = true; return false; }
      return true;
    });
    // Grad-2-Knoten auflösen
    const dg2 = new Map(); for (const c of list) if (!c.closed) { dg2.set(c.a, (dg2.get(c.a) ?? 0) + 1); dg2.set(c.b, (dg2.get(c.b) ?? 0) + 1); }
    for (const [k, d] of dg2) {
      if (d !== 2) continue;
      const two = list.filter((c) => !c.closed && (c.a === k || c.b === k));
      if (two.length === 1) { // Schleife, die an diesem Knoten beginnt und endet
        const c = two[0]; c.closed = true; c.p = c.p.slice(0, -1); delete c.a; delete c.b; changed = true; continue;
      }
      if (two.length !== 2) continue;
      const [c1, c2] = two;
      const p1 = c1.b === k ? c1.p : [...c1.p].reverse(), s1 = c1.b === k ? c1.a : c1.b;
      const p2 = c2.a === k ? c2.p : [...c2.p].reverse(), s2 = c2.a === k ? c2.b : c2.a;
      list = list.filter((c) => c !== c1 && c !== c2);
      if (s1 === k && s2 === k) list.push({ closed: true, p: p1.slice(0, -1) });
      else list.push({ a: s1, b: s2, p: [...p1, ...p2.slice(1)] });
      changed = true;
    }
    if (!changed) break;
  }
  // freie Enden auf den letzten Katalogpunkt ziehen (die Mittellinie endet sonst einen Strichradius zu früh)
  const dgE = new Map(); for (const c of list) if (!c.closed) { dgE.set(c.a, (dgE.get(c.a) ?? 0) + 1); dgE.set(c.b, (dgE.get(c.b) ?? 0) + 1); }
  for (const [k, d] of dgE) {
    if (d !== 1) continue;
    const q = node.get(k); let best = null, bd = 0.9 * s0;
    for (const p of P) { const dd = Math.hypot(p[0] - q[0], p[1] - q[1]); if (dd < bd) { bd = dd; best = p; } }
    if (best) node.set(k, [best[0], best[1]]);
  }
  // 4. Ecken, Glätten, Idealisieren
  const nodesOut = [], idOf = new Map();
  const nid = (k) => { if (!idOf.has(k)) { idOf.set(k, nodesOut.length); nodesOut.push(node.get(k)); } return idOf.get(k); };
  const curves = [], loops = [];
  const h = STEP * s0, win = Math.max(2, Math.round(0.8 / STEP)), iters = hint.smooth ?? 10;
  // Kreuzungszonen verbiegen die Mittellinie: für die Formprüfung zählt die Linie ohne ihre Enden (je END·s0)
  const END = 0.9;
  const inner = (p) => { const L = len(p), out = []; let acc = 0; for (let i = 0; i < p.length; i++) { if (i) acc += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); if (acc >= Math.min(END * s0, 0.25 * L) && acc <= L - Math.min(END * s0, 0.25 * L)) out.push(p[i]); } return out.length >= 3 ? out : p; };
  const tidyOpen = (p) => {
    const L = len(p), mid = inner(p);
    // gerade? (Ausgleichsgerade durch die Mitte, Enden bleiben die Knoten)
    const [A, B] = [p[0], p.at(-1)], dl = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1e-9;
    let dev = 0; for (const q of mid) dev = Math.max(dev, Math.abs((B[0] - A[0]) * (A[1] - q[1]) - (A[0] - q[0]) * (B[1] - A[1])) / dl);
    if (dev < 0.2 * s0 + 0.02 * L && dl > 0.75 * L) return { p: [A, B], straight: true };
    const sm = smooth(p, iters, false);
    // gleichmäßiger Bogen?
    const c = sm.length > 6 ? circleFit(inner(sm)) : null;
    if (c && c[2] > 1.2 * s0 && c[2] < 12 * L && c[3] < 0.05 * s0 + 0.015 * c[2] && c[4] < 0.16 * s0 + 0.035 * c[2]) {
      return { p: sm.map((q, i) => { if (i === 0 || i === sm.length - 1) return q; const a = Math.atan2(q[1] - c[1], q[0] - c[0]); return [c[0] + c[2] * Math.cos(a), c[1] + c[2] * Math.sin(a)]; }), circle: c };
    }
    return { p: sm };
  };
  const corners = (p) => { // Indizes der Ecken einer gleichmäßig abgetasteten Linie
    const out = [], turn = (i) => {
      const a = p[i - win], b = p[i], c = p[i + win];
      const t1 = Math.atan2(b[1] - a[1], b[0] - a[0]), t2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
      let d = Math.abs(t2 - t1); if (d > Math.PI) d = 2 * Math.PI - d; return d;
    };
    for (let i = win; i < p.length - win; i++) {
      const t = turn(i);
      if (t < CORNER) continue;
      let local = true; for (let k = Math.max(win, i - win); k <= Math.min(p.length - win - 1, i + win); k++) if (k !== i && turn(k) > t) local = false;
      if (local && (!out.length || i - out.at(-1) > win)) out.push(i);
    }
    return out;
  };
  for (const c of list) {
    if (c.closed) {
      let p = even(c.p, h, true);
      const cut = corners([...p.slice(-win), ...p, ...p.slice(0, win)]).map((i) => i - win).filter((i) => i >= 0 && i < p.length);
      if (!cut.length) {
        const sm = smooth(p, iters, true), f = circleFit(sm);
        if (f && f[3] < 0.04 * f[2] && f[4] < 0.1 * f[2] + 0.05 * s0) loops.push({ circle: [f[0], f[1], f[2]] });
        else loops.push({ p: sm });
        continue;
      }
      // Schleife mit Ecken: an den Ecken auftrennen, die Ecken werden Knoten
      const q = [...p.slice(cut[0]), ...p.slice(0, cut[0])]; q.push(q[0]);
      const at = [...cut.map((i) => i - cut[0]), q.length - 1];
      const ids = cut.map((i) => { nodesOut.push(p[i]); return nodesOut.length - 1; });
      for (let s = 0; s < cut.length; s++) {
        const seg = q.slice(at[s], at[s + 1] + 1), A = ids[s], B = ids[(s + 1) % cut.length];
        const t = tidyOpen(seg); t.a = A; t.b = B; curves.push(t);
      }
      continue;
    }
    const a = nid(c.a), b = nid(c.b);
    let p = even([nodesOut[a], ...c.p.slice(1, -1), nodesOut[b]], h);
    const cut = corners(p).filter((i) => i * h > 0.9 * s0 && (p.length - 1 - i) * h > 0.9 * s0);
    const at = [0, ...cut, p.length - 1], ids = [a, ...cut.map((i) => { nodesOut.push(p[i]); return nodesOut.length - 1; }), b];
    for (let s = 0; s < at.length - 1; s++) {
      const t = tidyOpen(p.slice(at[s], at[s + 1] + 1)); t.a = ids[s]; t.b = ids[s + 1]; curves.push(t);
    }
  }
  // 5. Gemeinsame Formen: Bögen auf demselben Kreis werden ein Kreis (Peace-Zeichen, Räder), Knoten liegen dann darauf
  const arcs = curves.filter((c) => c.circle), done = new Set();
  for (const c of arcs) {
    if (done.has(c)) continue;
    const group = arcs.filter((d) => !done.has(d) && Math.hypot(d.circle[0] - c.circle[0], d.circle[1] - c.circle[1]) < 0.18 * c.circle[2] && Math.abs(d.circle[2] - c.circle[2]) < 0.12 * c.circle[2]);
    if (group.length < 2) continue;
    group.forEach((d) => done.add(d));
    const f = circleFit(group.flatMap((d) => d.p));
    if (!f) continue;
    const on = (q) => { const a = Math.atan2(q[1] - f[1], q[0] - f[0]); return [f[0] + f[2] * Math.cos(a), f[1] + f[2] * Math.sin(a)]; };
    for (const d of group) { d.p = d.p.map(on); nodesOut[d.a] = d.p[0]; nodesOut[d.b] = d.p.at(-1); }
  }
  // Geraden, die sich an einem Knoten gerade fortsetzen, werden eine Gerade (Knoten auf die Verbindung der Außenenden)
  for (let k = 0; k < nodesOut.length; k++) {
    const st = curves.filter((c) => c.straight && (c.a === k || c.b === k));
    for (let i = 0; i < st.length; i++) for (let j = i + 1; j < st.length; j++) {
      const A = nodesOut[st[i].a === k ? st[i].b : st[i].a], B = nodesOut[st[j].a === k ? st[j].b : st[j].a], K = nodesOut[k];
      const u1 = [K[0] - A[0], K[1] - A[1]], u2 = [B[0] - K[0], B[1] - K[1]];
      const cos = (u1[0] * u2[0] + u1[1] * u2[1]) / (Math.hypot(...u1) * Math.hypot(...u2) || 1);
      if (cos < Math.cos(14 * Math.PI / 180)) continue;
      const dx = B[0] - A[0], dy = B[1] - A[1], t = ((K[0] - A[0]) * dx + (K[1] - A[1]) * dy) / (dx * dx + dy * dy);
      nodesOut[k] = [A[0] + dx * t, A[1] + dy * t];
    }
  }
  for (const c of curves) { c.p[0] = nodesOut[c.a]; c.p[c.p.length - 1] = nodesOut[c.b]; }
  return {
    s0: r4(s0),
    nodes: nodesOut.map(R),
    curves: curves.map((c) => ({ a: c.a, b: c.b, p: simplify(c.p, 0.012 * s0).map(R) })),
    loops: loops.map((l) => (l.circle ? { circle: l.circle.map(r4) } : { p: simplify(l.p, 0.012 * s0).map(R) })),
    dots: dots.map(R),
  };
}

// Aufruf als Skript: Linien aller (oder der genannten) 2D-Motive schreiben
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = new URL('../', import.meta.url);
  const catalog = JSON.parse(readFileSync(new URL('src/content/catalog-motifs.json', root), 'utf8'));
  const keys = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(catalog.motifs).filter((k) => catalog.motifs[k].dimension !== '3D');
  const dir = new URL('public/media/katalog/linien/', root);
  mkdirSync(dir, { recursive: true });
  for (const key of keys) for (const v of catalog.motifs[key].variants) {
    const f = JSON.parse(readFileSync(new URL(`public/media/katalog/${v.id}.json`, root), 'utf8'));
    const t = performance.now(), lines = deriveLines(f.points, HINTS[key]);
    writeFileSync(new URL(`${v.id}.json`, dir), JSON.stringify(lines) + '\n');
    console.log(`${key} ${v.id}: ${lines.curves.length} Linien, ${lines.loops.length} Schleifen, ${lines.dots.length} Punkte, ${(performance.now() - t).toFixed(0)} ms`);
  }
}
