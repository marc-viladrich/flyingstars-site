import { t as message } from '../../../i18n/ui.mjs';
// Fest auf dem Marktplatz (Runde 11b, große Motive, Kandidat FSK-010 „Silvesterfeier auf dem Marktplatz“), ab 700 Drohnen in 3D
// und 3D+, geteilt in Winter & Silvester und im Stadtfest. Eine Szene statt einer Figur: hinten eine Häuserzeile aus fünf
// Giebelhäusern (Spitzgiebel, Treppengiebel, Rundgiebel, in der Mitte das Rathaus mit Uhr), vorn der Brunnen mit Becken,
// Säule und Wasserbögen, rundherum Laternen auf Pfählen, am Boden der Rand des Platzes. Keine Menschenmenge aus Einzelpunkten:
// das Fest erzählen Licht und der Lichtkreis. Alles nur Linien, locker besetzt; die Häuser haben Tiefe (Giebel vorn und
// hinten, First dazwischen), so liest sich der Platz aus jedem Blickwinkel als Modell.
//
//   marketSquare3d (3D, ab 700): das Platzmodell schwenkt langsam, die Fenster glimmen, das Wasser läuft als Licht die Bögen
//     hinab, die Laternen leuchten.
//   marketSquareStory (3D+, ab 700): Nacht auf dem Platz, alles dunkel → die Laternen gehen vom Rand zur Mitte an, danach die
//     Fenster, der Brunnen beginnt zu laufen → der Lichtkreis im Pflaster um den Brunnen hebt sich, steigt über die Dächer,
//     weitet sich → und öffnet sich zu einem Feuerwerksstern über dem Platz.
// Mehr Drohnen: ab 900 Lichterketten zwischen den Häusern und eine zweite Brunnenschale.
// Wächter: scripts/marktplatz.test.mjs.
import { TAU, WARM, GOLD, ORANGE, CYAN, BLUE, PINK, VIOLET, DIAMOND, mix, smooth, yaw, pitch, sparkle, chase, share, hash } from '../../show-motion.js';
import { curves, assemble } from '../catalog-3d/kit.js';

const lerp = (a, b, u) => a + (b - a) * u;
/** smootherstep (Anfang und Ende ohne Geschwindigkeit und Beschleunigung) */
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));

// ---------------------------------------------------------------- Farben ----------
const HOUSE = mix(BLUE, DIAMOND, 0.45), ROOF = mix(VIOLET, BLUE, 0.4), WINDOW = mix(GOLD, WARM, 0.35), CLOCK = GOLD;
const STONE = mix(BLUE, WARM, 0.5), WATER = mix(CYAN, DIAMOND, 0.4), POST = mix(BLUE, WARM, 0.35), LANTERN = mix(GOLD, ORANGE, 0.2), CHAIN = mix(PINK, GOLD, 0.4);

// ---------------------------------------------------------------- Bauplan (Platzrahmen: x quer, y oben, z zum Publikum) ----------
export const GROUND = -0.85;
/** Detailstufe: 0 von 700 bis 890, 1 ab 900 (Lichterketten zwischen den Häusern, zweite Brunnenschale). */
export const level = (n) => (n >= 900 ? 1 : 0);
const Z_FRONT = -0.95, DEPTH = 0.42; // Fassaden der Häuserzeile, Tiefe der Häuser
// fünf Häuser: Breite, Traufhöhe über dem Boden, Giebelhöhe, Giebelart, Versatz nach vorn
const HOUSES = [
  { w: 0.68, h: 0.78, g: 0.42, kind: 'spitz', dz: 0.05 },
  { w: 0.72, h: 0.92, g: 0.4, kind: 'treppe', dz: -0.04 },
  { w: 0.84, h: 1.02, g: 0.5, kind: 'rathaus', dz: 0.08 },
  { w: 0.72, h: 0.88, g: 0.36, kind: 'rund', dz: -0.02 },
  { w: 0.66, h: 0.8, g: 0.44, kind: 'spitz', dz: 0.04 },
];
/** Giebelumriss (vorn) eines Hauses als Linie in der Fassadenebene: von der linken Traufe über den Giebel zur rechten. */
function gable(x0, x1, y, g, kind) {
  const xm = (x0 + x1) / 2, w = x1 - x0;
  if (kind === 'treppe') { const st = 3, out = [[x0, y]]; for (let i = 0; i < st; i++) { const xl = x0 + (w / 2) * (i / st) + w * 0.04, yy = y + (g * (i + 1)) / st; out.push([xl, y + (g * i) / st], [xl, yy]); } const left = out.slice(); const right = left.map(([x, yy]) => [2 * xm - x, yy]).reverse(); return [...left, [xm - w * 0.06, y + g], [xm + w * 0.06, y + g], ...right.slice(0, -1), [x1, y]]; }
  if (kind === 'rund') return [[x0, y], [x0 + w * 0.08, y + g * 0.35], ...Array.from({ length: 13 }, (_, i) => { const a = Math.PI - (i / 12) * Math.PI; return [xm + Math.cos(a) * w * 0.42, y + g * 0.35 + Math.sin(a) * g * 0.65]; }), [x1 - w * 0.08, y + g * 0.35], [x1, y]];
  return [[x0, y], [xm, y + g], [x1, y]];
}
/** Häuserzeile: Fassaden (Umriss mit Giebel), Giebel hinten, First und Traufkanten, Fenster; dazu die Uhr am Rathaus. */
function houseLines(lv) {
  const total = HOUSES.reduce((s, h) => s + h.w, 0), body = [], wins = [], deco = [];
  let x = -total / 2;
  for (const h of HOUSES) {
    const x0 = x + 0.015, x1 = x + h.w - 0.015, zf = Z_FRONT + h.dz, zb = zf - DEPTH, top = GROUND + h.h, gz = gable(x0, x1, top, h.g, h.kind);
    // vorn: Seitenkanten, Giebel; hinten: nur der Giebel; dazwischen First und Traufen (Tiefe)
    body.push({ pts: [[x0, GROUND, zf], ...gz.map(([gx, gy]) => [gx, gy, zf]), [x1, GROUND, zf]] });
    body.push({ pts: gz.map(([gx, gy]) => [gx, gy, zb]) });
    const peak = gz.reduce((a, p) => (p[1] > a[1] ? p : a));
    body.push({ pts: [[peak[0], peak[1], zf], [peak[0], peak[1], zb]] }, { pts: [[x0, top, zf], [x0, top, zb]] }, { pts: [[x1, top, zf], [x1, top, zb]] });
    // Fenster: zwei Reihen, je zwei (das Rathaus drei), Tür unten in der Mitte des Rathauses
    const cols = h.kind === 'rathaus' ? 3 : 2, rows = h.h > 0.85 ? 2 : 1;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (h.kind === 'rathaus' && r === 0 && c === 1) continue;
      const cx = x0 + ((x1 - x0) * (c + 0.5)) / cols, cy = GROUND + 0.3 + r * 0.32, ww = 0.075, wh = 0.095;
      wins.push({ pts: [[cx - ww, cy - wh, zf + 0.01], [cx + ww, cy - wh, zf + 0.01], [cx + ww, cy + wh, zf + 0.01], [cx - ww, cy + wh, zf + 0.01]], closed: true });
    }
    if (h.kind === 'rathaus') {
      const cx = (x0 + x1) / 2, cy = top + h.g * 0.42, r = 0.1;
      deco.push({ pts: Array.from({ length: 20 }, (_, i) => { const a = (i / 20) * TAU; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, zf + 0.01]; }), closed: true, tag: 'uhr' });
      deco.push({ pts: [[cx, cy, zf + 0.012], [cx, cy + r * 0.7, zf + 0.012]], tag: 'uhr' }, { pts: [[cx, cy, zf + 0.012], [cx + r * 0.08, cy + r * 0.55, zf + 0.012]], tag: 'uhr' }); // fünf vor zwölf
      deco.push({ pts: [[cx - 0.09, GROUND, zf + 0.01], [cx - 0.09, GROUND + 0.26, zf + 0.01], [cx, GROUND + 0.32, zf + 0.01], [cx + 0.09, GROUND + 0.26, zf + 0.01], [cx + 0.09, GROUND, zf + 0.01]], tag: 'tuer' });
    }
    x += h.w;
  }
  if (lv >= 1) {
    // Lichterketten: durchhängende Bögen von Traufe zu Traufe, etwas vor den Fassaden
    let xx = -total / 2;
    for (let i = 0; i < HOUSES.length - 1; i++) {
      const a = HOUSES[i], b = HOUSES[i + 1], xa = xx + a.w * 0.5, xb = xx + a.w + b.w * 0.5, ya = GROUND + a.h - 0.05, yb = GROUND + b.h - 0.05, z = Z_FRONT + 0.25;
      deco.push({ pts: Array.from({ length: 13 }, (_, k) => { const u = k / 12; return [lerp(xa, xb, u), lerp(ya, yb, u) - 0.16 * Math.sin(Math.PI * u), z]; }), tag: 'kette' });
      xx += a.w;
    }
  }
  return { body, wins, deco };
}
// Brunnen vorn in der Mitte: Becken (zwei Ringe: Rand und Fuß), Säule, Schale; Wasserbögen aus der Schale ins Becken
const FOUNTAIN = { c: [0, 0.25], r: 0.42, wall: 0.13, col: 0.55, bowl: 0.13 };
const ringAt = (cx, cz, y, r, k = 48) => ({ pts: Array.from({ length: k }, (_, i) => { const a = (i / k) * TAU; return [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r]; }), closed: true });
function fountainLines(lv) {
  const { c, r, wall, col, bowl } = FOUNTAIN, lines = [ringAt(c[0], c[1], GROUND + wall, r), ringAt(c[0], c[1], GROUND + 0.005, r * 1.04), { pts: [[c[0], GROUND + wall + 0.06, c[1]], [c[0], GROUND + col - 0.03, c[1]]] }, ringAt(c[0], c[1], GROUND + col, bowl, 20)];
  if (lv >= 1) lines.push(ringAt(c[0], c[1], GROUND + col + 0.17, bowl * 0.6, 14), { pts: [[c[0], GROUND + col + 0.03, c[1]], [c[0], GROUND + col + 0.14, c[1]]] });
  return lines;
}
/** Wasserbogen k von n: aus dem Schalenrand nach außen und hinab ins Becken; u ∈ [0, 1] entlang des Bogens. */
function waterAt(k, nArcs, u) {
  const { c, col, bowl, r, wall } = FOUNTAIN, a = (k / nArcs) * TAU + 0.3, R0 = bowl + 0.02, R1 = r * 0.92, y0 = GROUND + col + 0.01, y1 = GROUND + wall + 0.03;
  const R = lerp(R0, R1, u), y = y0 + 0.16 * Math.sin(Math.PI * u * 0.9) - (y0 - y1) * u * u;
  return [c[0] + Math.cos(a) * R, y, c[1] + Math.sin(a) * R];
}
// Laternen auf einem Halbrund um den Platz (Seiten und vordere Ecken, die Mitte vor dem Brunnen bleibt frei)
const PLAZA = { rx: 2.0, rz: 1.15, cz: -0.05 };
const LAMP_ANGLES = [-12, 22, 52, 128, 158, 192].map((d) => (d * Math.PI) / 180);
const LAMP_H = 0.62;
function lampLines() {
  return LAMP_ANGLES.map((a) => {
    const x = Math.cos(a) * PLAZA.rx * 0.9, z = PLAZA.cz + Math.sin(a) * PLAZA.rz * 0.9;
    return { a, x, z, post: { pts: [[x, GROUND, z], [x, GROUND + LAMP_H, z]] }, head: { pts: [[x - 0.05, GROUND + LAMP_H + 0.02, z], [x, GROUND + LAMP_H + 0.1, z], [x + 0.05, GROUND + LAMP_H + 0.02, z], [x, GROUND + LAMP_H - 0.04, z]], closed: true } };
  });
}
// Rand des Platzes (Pflasterkante) und der Lichtkreis im Pflaster um den Brunnen
const RING = { r0: 0.75, y1: 1.95, r1: 0.95, rays: 16 };

const cache = new Map();
/** Das Platzmodell, genau m Drohnen: Häuser, Fenster, Uhr/Tür/Ketten, Brunnen, Wasser, Laternen (Pfahl, Kopf), Platzrand. */
export function squareModel(m, lv) {
  const key = `${m}|${lv}`;
  if (cache.has(key)) return cache.get(key);
  const { body, wins, deco } = houseLines(lv), lamps = lampLines();
  const [nh, nw, nd, nf, nwa, nlp, nlh, np] = share(m, [0.38, 0.12, lv >= 1 ? 0.07 : 0.035, 0.1, 0.04, 0.07, 0.06, lv >= 1 ? 0.085 : 0.1]);
  const houses = assemble([curves('haus', body, { w: 1 })], nh);
  const windows = assemble([curves('fenster', wins, { w: 1 })], nw);
  const decoA = assemble([curves('uhr', deco.filter((d) => d.tag === 'uhr'), { w: 1.4 }), curves('tuer', deco.filter((d) => d.tag === 'tuer')), ...(lv >= 1 ? [curves('kette', deco.filter((d) => d.tag === 'kette'), { w: 1 })] : [])], nd);
  const fountain = assemble([curves('brunnen', fountainLines(lv), { w: 1 })], nf);
  // Wasser: je Bogen gleich viele Drohnen, gleichmäßig entlang
  const arcs = lv >= 1 ? 8 : 6, perArc = share(nwa, Array(arcs).fill(1)), water = [];
  perArc.forEach((q, k) => { for (let i = 0; i < q; i++) water.push({ k, u: 0.14 + 0.8 * ((i + 0.5) / q) }); });
  // Laternen: Pfähle und Köpfe, je Laterne gleich viele
  const postPer = share(nlp, Array(lamps.length).fill(1)), headPer = share(nlh, Array(lamps.length).fill(1)), lampPts = [];
  lamps.forEach((L, i) => {
    for (let q = 0; q < postPer[i]; q++) { const u = (q + 0.5) / postPer[i]; lampPts.push({ i, head: false, p: [L.x, GROUND + 0.04 + (LAMP_H - 0.12) * u, L.z] }); }
    const ring = Array.from({ length: headPer[i] }, (_, q) => { const a = (q / headPer[i]) * TAU; return [L.x + Math.cos(a) * 0.055, GROUND + LAMP_H + 0.04 + Math.sin(a) * 0.055, L.z + Math.sin(a) * 0.02]; });
    for (const p of ring) lampPts.push({ i, head: true, p });
  });
  // Platzrand: eine Ellipse vorn (hinten schließen die Häuser den Platz)
  const plaza = Array.from({ length: np }, (_, q) => { const a = -0.22 + (Math.PI + 0.44) * ((q + 0.5) / np); return [Math.cos(a) * PLAZA.rx, GROUND - 0.02, PLAZA.cz + Math.sin(a) * PLAZA.rz]; });
  const res = { houses, windows, deco: decoA, fountain, water, arcs, lamps, lampPts, plaza, lv };
  cache.set(key, res);
  return res;
}

/** Drohnen des Platzmodells als Liste [{ p, kind, ... }] in fester Reihenfolge. */
function squareList(S) {
  const out = [];
  S.houses.pts.forEach((p) => out.push({ p, kind: 'haus' }));
  S.windows.pts.forEach((p, i) => out.push({ p, kind: 'fenster', r: hash(i * 1.7) }));
  S.deco.pts.forEach((p, i) => out.push({ p, kind: S.deco.tags[i] }));
  S.fountain.pts.forEach((p) => out.push({ p, kind: 'brunnen' }));
  S.water.forEach((w) => out.push({ p: waterAt(w.k, S.arcs, w.u), kind: 'wasser', w }));
  S.lampPts.forEach((l) => out.push({ p: l.p, kind: l.head ? 'laterne' : 'pfahl', lamp: l.i }));
  S.plaza.forEach((p) => out.push({ p, kind: 'platz' }));
  return out;
}
const colourOf = (k) => ({ haus: HOUSE, fenster: WINDOW, uhr: CLOCK, tuer: WINDOW, kette: CHAIN, brunnen: STONE, wasser: WATER, laterne: LANTERN, pfahl: POST, platz: STONE, ring: GOLD })[k] ?? WARM;

// ---------------------------------------------------------------- 3D ----------
const HOLD3D = 11;
function marketSquare3d(n, caption) {
  const lv = level(n), S = squareModel(n, lv), list = squareList(S);
  const view = (o, t) => { yaw(o, -0.34 + 0.68 * ease(t / HOLD3D * 1.05) + 0.05 * Math.sin((t * TAU) / 11)); pitch(o, 0.32, 0, 0); return o; };
  const pose = (j, t, o) => { const p = list[j].p; o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; return view(o, t); };
  const light = (j, t) => {
    const d = list[j];
    if (d.kind === 'wasser') return chase(d.w.u, t, 0.55, 0.33, 0.55, 1.35); // das Wasser läuft die Bögen hinab
    if (d.kind === 'fenster') return 0.85 + 0.3 * Math.sin(t * (0.7 + d.r) + d.r * 9); // Fenster glimmen, jedes in eigenem Takt
    if (d.kind === 'laterne') return sparkle(j, t, 1.05, 1.4);
    if (d.kind === 'kette') return 0.75 + 0.5 * chase(d.p[0], t, 0.4, 0.3, 0, 1);
    return 1;
  };
  const cols = list.map((d) => colourOf(d.kind));
  const at = (t) => cols.map((c, j) => [...pose(j, t, [0, 0, 0]), ...c]);
  const fitPts = [0, 3, 6, 9, HOLD3D].flatMap((t) => at(t).map((p) => p.slice(0, 3)));
  return { beats: [{ pts: at(0), caption, hold: HOLD3D, fitPts, groups: [{ name: 'platz', count: n, rigid: false }], live: (b, j, t, o) => { pose(j, t, o); o[3] = light(j, t); } }] };
}

// ---------------------------------------------------------------- 3D+ ----------
const ACT = [0, 3.4, 9.0, 14.2, 20.5];
/** Drohnen im Lichtkreis: ein Fünftel, höchstens 150 (sonst steht er dichter als der Platz) */
const ringCount = (n) => Math.min(150, Math.round(n * 0.2));
const T_LAMPS = [3.6, 7.0], T_WIN = [5.6, 8.4], T_RISE = [9.4, 13.6], T_BURST = 14.6;
function marketSquareStory(n) {
  const lv = level(n), nRing = ringCount(n), S = squareModel(n - nRing, lv), list = squareList(S), nS = list.length;
  // Lichtkreis: liegt im Pflaster um den Brunnen; je Drohne Winkel und Schale des späteren Sterns
  // im Stern liegt jede Drohne auf einem von RING.rays Strahlen (der nächste zu ihrem Winkel), auf ihm nach Reihenfolge außen
  const ring = Array.from({ length: nRing }, (_, i) => { const a = (i / nRing) * TAU, k = Math.round((a / TAU) * RING.rays) % RING.rays; return { a, k, shell: 0, ray: (k / RING.rays) * TAU }; });
  for (let k = 0; k < RING.rays; k++) { const on = ring.filter((r) => r.k === k).sort((p, q) => Math.abs(p.a - p.ray) - Math.abs(q.a - q.ray)); on.forEach((r, j) => { r.shell = j; r.len = on.length; }); }
  // Laternen gehen vom Rand zur Mitte an: Reihenfolge nach Abstand von der Mitte (außen zuerst)
  const lampOrder = S.lamps.map((L, i) => [Math.abs(L.x), i]).sort((a, b) => b[0] - a[0]).map(([, i]) => i);
  const lampOn = (i) => T_LAMPS[0] + (T_LAMPS[1] - T_LAMPS[0]) * (lampOrder.indexOf(i) / Math.max(1, S.lamps.length - 1));
  const winOn = (d) => T_WIN[0] + (T_WIN[1] - T_WIN[0]) * (1 - Math.abs(d.p[0]) / 1.9); // Fenster: ebenfalls von außen nach innen
  const viewYaw = (T) => -0.22 + 0.3 * ease((T - 2) / 16);
  const view = (o, T) => { yaw(o, viewYaw(T)); pitch(o, 0.3, 0, 0); return o; };
  const ringPoint = (i, T, o) => {
    const { a, shell } = ring[i], u = ease((T - T_RISE[0]) / (T_RISE[1] - T_RISE[0])), c = FOUNTAIN.c;
    // der Kreis richtet sich beim Steigen auf und steht über den Dächern zum Publikum hin (ein voller Kreis statt eines Strichs)
    const r = lerp(RING.r0, RING.r1, u), y = lerp(GROUND - 0.01, RING.y1, u), tilt = 1.12 * u;
    let x = c[0] + Math.cos(a) * r, z = c[1] * (1 - u) + Math.sin(a) * r * Math.cos(tilt), yy = y + Math.sin(a) * r * Math.sin(tilt);
    // Feuerwerksstern: der Kreis öffnet sich in seiner Ebene, jede Drohne fliegt auf ihrem Strahl nach außen (drei Schalen,
    // die innere bleibt näher), dazu leicht nach vorn
    const b = ease((T - T_BURST) / 2.6);
    if (b > 0) {
      const { ray, len } = ring[i], down = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(ray)); // Strahlen nach unten bleiben kurz (über den Dächern)
      const R = r + (0.14 + 1.15 * (shell / Math.max(1, len - 1))) * down; // Endlage auf dem Strahl
      const dx = Math.cos(ray) * R - Math.cos(a) * r, ds = Math.sin(ray) * R - Math.sin(a) * r;
      x += dx * b; yy += ds * Math.sin(tilt) * b; z += ds * Math.cos(tilt) * b;
    }
    o[0] = x; o[1] = yy; o[2] = z;
    return o;
  };
  const pose = (j, T, o) => { if (j < nS) { const p = list[j].p; o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; } else ringPoint(j - nS, T, o); return view(o, T); };
  const light = (j, T) => {
    if (j >= nS) { // Lichtkreis: glimmt im Pflaster, leuchtet beim Steigen auf, blüht als Stern und verglimmt funkelnd
      const i = j - nS, glow = 0.45 + 0.6 * smooth((T - T_RISE[0] + 0.5) / 1.2), b = T - T_BURST;
      return b < 0 ? glow * (1 + 0.25 * Math.sin(ring[i].a * 3 - T * 2)) : 1.05 + 0.75 * Math.exp(-b / 0.8) + 0.25 * sparkle(j, T, 0, 1) * smooth(b / 1.5);
    }
    const d = list[j], night = 0.32 + 0.68 * smooth((T - T_WIN[1]) / 2); // die Häuser treten aus der Nacht, wenn die Fenster leuchten
    if (d.kind === 'laterne') { const s = T - lampOn(d.lamp); return s < 0 ? 0.04 : 1.05 + 0.6 * Math.exp(-s / 0.35) + 0.15 * sparkle(j, T, 0, 1); }
    if (d.kind === 'pfahl') return 0.3 + 0.5 * smooth((T - lampOn(d.lamp)) / 0.6);
    if (d.kind === 'fenster' || d.kind === 'tuer') { const s = T - winOn(d); return s < 0 ? 0.04 : 0.9 + 0.5 * Math.exp(-s / 0.5) + 0.12 * Math.sin(T * (0.7 + (d.r ?? 0.3))); }
    if (d.kind === 'wasser') { const on = smooth((T - T_WIN[1] + 0.5) / 1); return on < 0.01 ? 0.04 : on * chase(d.w.u, T, 0.55, 0.33, 0.55, 1.35); }
    if (d.kind === 'uhr') return 0.5 + 0.8 * smooth((T - T_WIN[0]) / 1.5) + 0.6 * Math.exp(-(((T - T_BURST + 0.3) / 0.3) ** 2)); // die Uhr blitzt kurz vor dem Stern
    if (d.kind === 'kette') return 0.04 + 1.1 * smooth((T - T_WIN[1]) / 1.5);
    return night;
  };
  const cols = [...list.map((d) => colourOf(d.kind)), ...ring.map((r) => mix(GOLD, PINK, r.shell / Math.max(1, r.len - 1) * 0.7))];
  const atT = (T) => cols.map((c, j) => [...pose(j, T, [0, 0, 0]), ...c]);
  const fitPts = [0, 5, 10, 13, 15, 17, ACT[4]].flatMap((T) => atT(T).map((p) => p.slice(0, 3)));
  const groups = [{ name: 'platz', count: nS, rigid: false }, { name: 'lichtkreis', count: nRing, rigid: false }];
  const caps = ['marktplatz.nightOnTheSquare', 'marktplatz.lanternsComeOnFromTheEdge', 'marktplatz.aRingOfLightRises', 'marktplatz.andOpensIntoAStar'];
  return { beats: caps.map((key, a) => ({ pts: atT(ACT[a]), groups, caption: message(key), hold: ACT[a + 1] - ACT[a], fitPts, live: (b, j, t, o) => { const T = ACT[a] + Math.min(Math.max(t, 0), ACT[a + 1] - ACT[a]); /* jedes Bild nur in seinem Abschnitt der Zeitachse */ pose(j, T, o); o[3] = light(j, T); } })), meta: { nS, nRing } };
}

export const builders = {
  marketSquare3d: (n, caption) => marketSquare3d(n, caption),
  marketSquareStory: (n) => marketSquareStory(n),
};
export const _internal = { ACT, T_LAMPS, T_WIN, T_RISE, T_BURST, squareList, model: squareModel };
/** Für die Werkzeuge: Art einer Drohne. */
export const _tagOf = (name, n, j) => { const lv = level(n), nRing = name === 'marketSquareStory' ? ringCount(n) : 0, list = squareList(squareModel(n - nRing, lv)); return j < list.length ? list[j].kind : 'ring'; };
