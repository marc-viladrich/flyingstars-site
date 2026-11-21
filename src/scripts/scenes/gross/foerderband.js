import { t as message } from '../../../i18n/ui.mjs';
// Das Förderband (Runde 11b, große Motive, Anlass Marketing, ab 500 Drohnen). Kandidat FSK-021 der Motiv-Shortlist
// (freelance/clients/flyingstars/25-motiv-shortlist-2026-11-20), Referenz „Factory conveyor belt sequence · 500“ (dort
// gefüllte Flächen; hier nur Kanten). Gebaut wie Satellit und Tintenfisch: wenige klare Körper als Kontur, jede Drohne
// kennt ihr Teil, Bewegung folgt einer kleinen Mechanik.
//   - Das Band ist eine geschlossene Schleife um zwei Umlenkrollen: zwei Kanten und Querleisten. Sein Lauf ist Licht,
//     wie in echten Shows: helle Streifen wandern im Bandtempo die Schleife entlang, an den Rollen laufen Lichter um die
//     Speichen; die Drohnen selbst stehen (Runde 11b: Drohnen, die um eine Rolle laufen, kehren die Richtung um, das
//     meldete der Finten-Wächter). Alles, was auf dem Band liegt, fährt genau so weit wie das Licht. Das Band läuft
//     getaktet: fahren, halten, fahren.
//   - Station 1 ist ein Portal mit Greifer (Kolben im Zylinder, Greiferbacken), Station 2 eine Presse an einem Kragarm.
//     Was eine Station einsetzt, hängt vorher sichtbar an ihr (Modul im Greifer, Deckel unter der Presse) und wird beim
//     Absetzen an das Gehäuse übergeben: Zwischenzustände sind zu sehen.
// Mehr Drohnen bringen Stützrollen, Streben und Füße, Signallampen an den Stationen, ab 900 ein Bedienpult.
//
//   conveyor3d (3D, ab 500): das Band läuft getaktet, die Rollen drehen sich, ein fertiges Produkt fährt durch beide
//     Stationen, jede Station senkt ihr Werkzeug, wenn es darunter hält; das Ganze schwenkt langsam.
//   conveyorStory (3D+, ab 500): ein leeres Gehäuse fährt aufs Band → der Greifer setzt das Modul ein → die Presse setzt
//     den Deckel auf → das fertige Produkt hebt vom Bandende ab und dreht sich groß über der Anlage (Höhepunkt).
// Steht im Marketing direkt hinter den Zahnrädern (die Mechanik dreht weiter). Wächter: scripts/foerderband.test.mjs.
import { TAU, GOLD, WARM, CYAN, BLUE, DIAMOND, ORANGE, GREEN, mix, smooth, yaw, pitch, part, act } from '../../show-motion.js';
import { curves, spot, assemble } from '../catalog-3d/kit.js';

const lerp = (a, b, u) => a + (b - a) * u;
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));
const circle = (c, r, k = 32, plane = 'xy') => ({ pts: Array.from({ length: k }, (_, i) => { const a = (i / k) * TAU; return plane === 'xy' ? [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, c[2]] : [c[0] + Math.cos(a) * r, c[1], c[2] + Math.sin(a) * r]; }), closed: true });
const rect = (x0, x1, y, z0, z1) => ({ pts: [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], closed: true });

/** Detailstufe nach Drohnen: 0 bis 699, 1 bis 899, 2 ab 900. */
export const beltLevel = (n) => (n >= 900 ? 2 : n >= 700 ? 1 : 0);

// ---------------------------------------------------------------------------------------------------------------------
// Bauplan (x längs des Bandes, y oben, z zum Publikum)
// ---------------------------------------------------------------------------------------------------------------------
const ROLL = { x: 1.0, y: -0.35, r: 0.16 }; // Umlenkrollen bei ±x
const W = 0.24; // halbe Bandbreite
const RAIL = W + 0.07; // Seitenrahmen und Rollenachsen
const FLOOR = -0.95;
const TOP = ROLL.y + ROLL.r; // Oberkante des Bandes
const LOOP = 4 * ROLL.x + TAU * ROLL.r; // Länge der Bandschleife
const S1 = -0.38, S2 = 0.42; // Stationen
const BOX = { hx: 0.19, h: 0.22, hz: 0.16, x0: -0.9, y0: TOP + 0.035 }; // Gehäuse (steht auf den Leisten), Startplatz am linken Bandende
const MOD = { r: 0.09, h: 0.06, y: TOP + 0.14 }; // Modul, Lage im Gehäuse (Mitte)
const GRIP = { top: 0.48, up: 0.36 }; // Portal-Querträger, Werkzeug oben
const PRESS = { top: 0.56, up: 0.3, col: S2 + 0.3 };

/** Punkt der Bandschleife an Stelle u (0 … LOOP): oben von links nach rechts, um die rechte Rolle, unten zurück, um die linke. */
function loopAt(u, z, out) {
  const L = 2 * ROLL.x, half = Math.PI * ROLL.r;
  u = ((u % LOOP) + LOOP) % LOOP;
  if (u < L) { out[0] = -ROLL.x + u; out[1] = TOP; }
  else if (u < L + half) { const a = Math.PI / 2 - (u - L) / ROLL.r; out[0] = ROLL.x + Math.cos(a) * ROLL.r; out[1] = ROLL.y + Math.sin(a) * ROLL.r; }
  else if (u < 2 * L + half) { out[0] = ROLL.x - (u - L - half); out[1] = ROLL.y - ROLL.r; }
  else { const a = -Math.PI / 2 - (u - 2 * L - half) / ROLL.r; out[0] = -ROLL.x + Math.cos(a) * ROLL.r; out[1] = ROLL.y + Math.sin(a) * ROLL.r; }
  out[2] = z;
  return out;
}

/** Feste und bewegte Teile in Ruhelage (das Band selbst wird eigens verteilt). */
function parts(lv) {
  const P = [];
  // Rahmen: Seitenholme, Rollenachsen-Lager, Beine, Füße
  P.push(curves('gestell', [-1, 1].flatMap((s) => [[[-ROLL.x + ROLL.r * 0.95, ROLL.y, s * RAIL], [ROLL.x - ROLL.r * 0.95, ROLL.y, s * RAIL]], ...[-0.7, 0.7].map((x) => [[x, ROLL.y, s * RAIL], [x, FLOOR, s * RAIL]])]), { w: 0.85 }));
  if (lv >= 1) P.push(curves('gestell', [...[-0.7, 0.7].map((x) => [[x, FLOOR + 0.12, -RAIL], [x, FLOOR + 0.12, RAIL]]), ...[-1, 1].map((s) => [[-0.7, FLOOR + 0.12, s * RAIL], [-0.3, ROLL.y, s * RAIL]])], { w: 0.7 }));
  // Rollen: Stirnkreise mit drei Speichen auf beiden Seiten (drehen sich)
  for (const sx of [-1, 1]) for (const s of [-1, 1]) {
    const c = [sx * ROLL.x, ROLL.y, s * RAIL];
    P.push(curves(sx < 0 ? 'rolleL' : 'rolleR', [circle(c, ROLL.r * 0.8, 24), ...[0, 1, 2].map((k) => { const a = (k / 3) * TAU; return [c, [c[0] + Math.cos(a) * ROLL.r * 0.72, c[1] + Math.sin(a) * ROLL.r * 0.72, c[2]]]; })], { w: 0.9 }));
  }
  if (lv >= 1) for (const x of [-0.35, 0.35]) P.push(curves('stuetzrolle', [-1, 1].map((s) => circle([x, TOP - 0.07, s * RAIL], 0.05, 12)), { w: 0.7 })); // tragen das obere Band, über dem Holm
  // Station 1: Portal (zwei Pfosten, Querträger, Zylinder), Kolben mit Greiferbalken und Backen (bewegt)
  P.push(curves('portal', [...[-1, 1].map((s) => [[S1, FLOOR, s * 0.37], [S1, GRIP.top, s * 0.37]]), [[S1, GRIP.top, -0.37], [S1, GRIP.top, 0.37]], [[S1 - 0.035, GRIP.top, 0], [S1 - 0.035, GRIP.top - 0.14, 0]], [[S1 + 0.035, GRIP.top, 0], [S1 + 0.035, GRIP.top - 0.14, 0]]], { w: 1 }));
  P.push(curves('greifer', [[[S1, GRIP.top - 0.06, 0], [S1, GRIP.up, 0]], [[S1 - 0.13, GRIP.up, 0], [S1 + 0.13, GRIP.up, 0]]], { w: 1 }));
  P.push(curves('backeL', [[[S1 - 0.13, GRIP.up, 0], [S1 - 0.13, GRIP.up - 0.09, 0], [S1 - 0.117, GRIP.up - 0.115, 0]]]), curves('backeR', [[[S1 + 0.13, GRIP.up, 0], [S1 + 0.13, GRIP.up - 0.09, 0], [S1 + 0.117, GRIP.up - 0.115, 0]]]));
  // Station 2: Säule hinten rechts, Kragarm schräg nach vorn, Zylinder; Kolben mit Pressplatte (bewegt)
  P.push(curves('presse', [[[PRESS.col, FLOOR, -0.37], [PRESS.col, PRESS.top, -0.37]], [[PRESS.col, PRESS.top, -0.37], [S2, PRESS.top, 0]], [[S2 - 0.035, PRESS.top, 0], [S2 - 0.035, PRESS.top - 0.14, 0]], [[S2 + 0.035, PRESS.top, 0], [S2 + 0.035, PRESS.top - 0.14, 0]]], { w: 1 }));
  P.push(curves('stempel', [[[S2, PRESS.top - 0.06, 0], [S2, PRESS.up, 0]], rect(S2 - 0.15, S2 + 0.15, PRESS.up, -0.12, 0.12)], { w: 1 }));
  if (lv >= 1) P.push(spot('lampe1', [S1, GRIP.top + 0.05, 0.37], 1), spot('lampe2', [PRESS.col, PRESS.top + 0.05, -0.37], 1));
  if (lv >= 2) P.push(curves('pult', [[[-1.45, FLOOR, 0.42], [-1.45, -0.5, 0.42]], { pts: [[-1.58, -0.5, 0.42], [-1.32, -0.5, 0.42], [-1.29, -0.36, 0.34], [-1.55, -0.36, 0.34]], closed: true }], { w: 0.8 }), ...[0, 1, 2].map((k) => spot('pultlicht', [-1.52 + 0.08 * k, -0.43, 0.39], 1)));
  // Gehäuse (offener Kasten, unten auf dem Band), Modul im Greifer, Deckel unter der Presse
  const bx = BOX.x0, y0 = BOX.y0, y1 = y0 + BOX.h, c = (sx, y, sz) => [bx + sx * BOX.hx, y, sz * BOX.hz];
  P.push(curves('gehaeuse', [{ pts: [c(-1, y0, -1), c(1, y0, -1), c(1, y0, 1), c(-1, y0, 1)], closed: true }, { pts: [c(-1, y1, -1), c(1, y1, -1), c(1, y1, 1), c(-1, y1, 1)], closed: true }, ...[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [c(a, y0, b), c(a, y1, b)])], { w: 1.1 }));
  const mc = [S1, GRIP.up - 0.07, 0];
  P.push(curves('modul', [circle([mc[0], mc[1] + MOD.h / 2, 0], MOD.r, 20, 'xz'), circle([mc[0], mc[1] - MOD.h / 2, 0], MOD.r, 20, 'xz')], { w: 1.2 }), spot('chip', [mc[0], mc[1] + MOD.h / 2 + 0.005, 0], 4, 0.025, [0, 1, 0]));
  const ly = PRESS.up - 0.03, star = Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * TAU, r = i % 2 ? 0.038 : 0.09; return [S2 + Math.sin(a) * r, ly + 0.005, Math.cos(a) * r]; });
  P.push(curves('deckel', [rect(S2 - BOX.hx - 0.01, S2 + BOX.hx + 0.01, ly, -BOX.hz - 0.01, BOX.hz + 0.01)], { w: 1.15 }), curves('logo', [{ pts: star, closed: true }], { w: 1.3 }));
  return P;
}
const lineLen = (l) => { const p = l.closed ? [...l.pts, l.pts[0]] : l.pts; let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1], p[i][2] - p[i - 1][2]); return L; };

/** Das Modell: Banddrohnen (Stelle auf der Schleife, Tiefe) + alle übrigen Teile aus assemble(). */
export function beltModel(n) {
  const lv = beltLevel(n), P = parts(lv);
  const other = P.reduce((s, p) => s + (p.lines ? p.lines.reduce((a, l) => a + lineLen(l) * (p.w ?? 1), 0) : 0), 0);
  const SL = lv >= 2 ? 16 : 12, beltLen = 2 * LOOP + SL * 2 * W; // zwei Kanten + Querleisten
  const nb = Math.round((n * beltLen * 0.92) / (beltLen * 0.92 + other)), gap = beltLen / nb;
  const per = Math.max(2, Math.round((2 * W) / gap) - 1), edges = nb - SL * per, E = [Math.floor(edges / 2), Math.ceil(edges / 2)];
  const belt = [];
  E.forEach((cnt, e) => { for (let i = 0; i < cnt; i++) belt.push({ u: ((i + 0.5 * e) / cnt) * LOOP, z: e ? W : -W, edge: true }); });
  for (let k = 0; k < SL; k++) for (let i = 0; i < per; i++) belt.push({ u: (k / SL) * LOOP + 0.37 * (LOOP / SL), z: -W + ((i + 1) * 2 * W) / (per + 1), edge: false });
  const rest = assemble(P, n - belt.length);
  return { lv, belt, B: belt.length, pts: rest.pts, tags: rest.tags };
}

// ---------------------------------------------------------------------------------------------------------------------
// Bewegung: ein Zeitplan liefert Bandweg, Werkzeughübe und Übergaben
// ---------------------------------------------------------------------------------------------------------------------
/** Bandweg (Strecke, die das Band seit Beginn gelaufen ist) aus getakteten Fahrten [Start, Dauer, Strecke]. */
const travel = (moves) => (T) => moves.reduce((s, [t0, d, len]) => s + len * ease((T - t0) / d), 0);
/** Werkzeughub: senkt sich ab t0 über d Sekunden um depth, bleibt hold, hebt sich über d wieder. */
const stroke = (t0, d, hold, depth) => (T) => depth * (ease((T - t0) / d) - ease((T - t0 - d - hold) / d));
const BOX_DOWN = { grip: GRIP.up - (MOD.y + 0.07), press: PRESS.up - 0.03 - (BOX.y0 + BOX.h + 0.035) }; // Hub bis zum Gehäuse (Deckel liegt knapp über dem Rand)

/** Lage aller Drohnen zur Zeit T für einen Zeitplan plan(T) = { s, g1, jaw, g2, mod, lid, hero, spin }. */
function poseAll(m, plan, T, j, o) {
  const st = plan(T);
  // Runde 11b (Finten-Wächter): Band und Rollen stehen, ihr Lauf ist Licht (siehe lightOf). Drohnen, die um eine
  // Umlenkrolle laufen, kehren dort die Richtung um, das ist für eine Drohne Ausholen bzw. Überschwingen.
  if (j < m.B) { const b = m.belt[j]; return loopAt(b.u, b.z, o); }
  const k = j - m.B, p = m.pts[k], tag = m.tags[k];
  o[0] = p[0]; o[1] = p[1]; o[2] = p[2];
  if (tag === 'greifer') { if (p[1] < GRIP.top - 0.061) o[1] -= st.g1; else o[1] -= st.g1 * Math.max(0, (GRIP.top - 0.06 - p[1]) / (GRIP.top - 0.06 - GRIP.up)); }
  else if (tag === 'backeL' || tag === 'backeR') { o[1] -= st.g1; o[0] += (tag === 'backeL' ? -1 : 1) * 0.035 * st.jaw * ((GRIP.up - p[1]) / 0.115); }
  else if (tag === 'stempel') { if (p[1] < PRESS.top - 0.061) o[1] -= st.g2; else o[1] -= st.g2 * Math.max(0, (PRESS.top - 0.06 - p[1]) / (PRESS.top - 0.06 - PRESS.up)); }
  else if (tag === 'gehaeuse' || tag === 'modul' || tag === 'chip' || tag === 'deckel' || tag === 'logo') {
    // Teile des Produkts: vorher am Werkzeug, nach der Übergabe am Gehäuse (das mit dem Band fährt)
    if (tag === 'modul' || tag === 'chip') { if (st.mod < 1) { o[1] -= st.g1; } else { o[0] += BOX.x0 - S1 + st.s; o[1] += MOD.y - (GRIP.up - 0.07); } }
    else if (tag === 'deckel' || tag === 'logo') { if (st.lid < 1) { o[1] -= st.g2; } else { o[0] += BOX.x0 - S2 + st.s; o[1] -= BOX_DOWN.press; } }
    else o[0] += st.s;
    if (st.hero) hero(o, st, tag);
  }
  return o;
}
/** Höhepunkt: das fertige Produkt hebt am Bandende ab, steigt über die Anlage, wird größer und dreht sich. */
function hero(o, st, tag) {
  const cx = BOX.x0 + st.sEnd, cy = BOX.y0 + BOX.h / 2, h = st.hero;
  const k = lerp(1, 2.1, ease(h.grow)), x = (o[0] - cx) * k, y = (o[1] - cy) * k, z = o[2] * k;
  const a = h.spin, X = x * Math.cos(a) + z * Math.sin(a), Z = -x * Math.sin(a) + z * Math.cos(a);
  o[0] = lerp(cx, 0, ease(h.x)) + X; o[1] = lerp(cy, 0.86, ease(h.y)) + y; o[2] = Z;
}

const COLOURS = {
  gestell: mix(DIAMOND, BLUE, 0.35), rolleL: GOLD, rolleR: GOLD, stuetzrolle: mix(GOLD, WARM, 0.4),
  portal: mix(CYAN, DIAMOND, 0.3), greifer: CYAN, backeL: CYAN, backeR: CYAN,
  presse: mix(CYAN, DIAMOND, 0.3), stempel: CYAN, lampe1: ORANGE, lampe2: ORANGE, pult: mix(DIAMOND, BLUE, 0.35), pultlicht: GREEN,
  gehaeuse: ORANGE, modul: GREEN, chip: mix(GREEN, WARM, 0.4), deckel: GOLD, logo: WARM,
};
const beltColour = (b) => (b.edge ? mix(WARM, DIAMOND, 0.4) : mix(DIAMOND, BLUE, 0.45));

// Zeitpläne -----------------------------------------------------------------------------------------------------------
// 3D: das fertige Produkt fährt durch; jede Station senkt ihr Werkzeug, wenn es darunter hält (ohne Übergabe)
const P3 = { moves: [[0.6, 2.4, S1 - BOX.x0], [5.2, 2.8, S2 - S1], [9.4, 2.4, 0.95 - S2]], hold: 13 };
const plan3d = (() => { const s = travel(P3.moves), g1 = stroke(3.1, 0.8, 0.4, 0.16), g2 = stroke(8.1, 0.7, 0.3, 0.14); return (T) => ({ s: s(T), g1: g1(T), g2: g2(T), jaw: 0, mod: 1, lid: 1 }); })();
// 3D+: Akte auf einer Zeitachse
const ACT = [0, 3.4, 9.6, 15.8, 23];
const PS = {
  moves: [[0.4, 2.6, S1 - BOX.x0], [9.9, 2.8, S2 - S1], [16.0, 2.4, 0.95 - S2]],
  g1: [4.0, 1.4, 1.3], jaw: [5.5, 0.5], g2: [12.9, 1.2, 0.9], hero: 18.4,
};
const planStory = (() => {
  const s = travel(PS.moves), g1 = stroke(PS.g1[0], PS.g1[1], PS.g1[2], BOX_DOWN.grip), g2 = stroke(PS.g2[0], PS.g2[1], PS.g2[2], BOX_DOWN.press);
  const sEnd = PS.moves.reduce((a, m) => a + m[2], 0);
  return (T) => {
    const h = T - PS.hero;
    return {
      s: s(T), g1: g1(T), g2: g2(T), jaw: ease((T - PS.jaw[0]) / PS.jaw[1]), sEnd,
      mod: T >= PS.g1[0] + PS.g1[1] + 0.2 ? 1 : 0, lid: T >= PS.g2[0] + PS.g2[1] + 0.2 ? 1 : 0,
      hero: h > 0 ? { y: h / 1.8, x: (h - 0.6) / 2.2, grow: (h - 0.4) / 2.4, spin: h > 1 ? 0.55 * Math.sin(((h - 1) * TAU) / 8) * smooth((h - 1) / 1.5) : 0 } : null,
    };
  };
})();

/** Licht: Lampen blinken, wenn eine Station arbeitet; ein Lichtlauf über das Band zeigt die Laufrichtung; das Logo glänzt. */
function lightOf(m, plan, j, T) {
  const st = plan(T);
  // Bandlauf als Licht: helle Streifen wandern mit dem Bandweg st.s die Schleife entlang (oben nach rechts, unten zurück)
  if (j < m.B) { const b = m.belt[j], u = ((b.u - st.s) % 0.5 + 0.5) % 0.5; return 0.7 + 0.65 * Math.exp(-(((u - 0.25) / 0.07) ** 2)); }
  const tag0 = m.tags[j - m.B];
  // Rollen: ein Lichtpunkt läuft im Bandtempo um jede Rolle (drei Speichen, drei Lichter)
  if (tag0 === 'rolleL' || tag0 === 'rolleR' || tag0 === 'stuetzrolle') {
    const p = m.pts[j - m.B], cx = tag0 === 'rolleL' ? -ROLL.x : tag0 === 'rolleR' ? ROLL.x : p[0] < 0 ? -0.35 : 0.35, cy = tag0 === 'stuetzrolle' ? TOP - 0.07 : ROLL.y;
    const a = Math.atan2(p[1] - cy, p[0] - cx) + st.s / ROLL.r, d = (((a % (TAU / 3)) + TAU / 3) % (TAU / 3)) - TAU / 6;
    return 0.75 + 0.6 * Math.exp(-((d / 0.35) ** 2));
  }
  const tag = m.tags[j - m.B];
  if (tag === 'lampe1') return st.g1 > 0.01 ? 0.8 + 0.8 * (0.5 + 0.5 * Math.sin(T * 9)) : 0.6;
  if (tag === 'lampe2') return st.g2 > 0.01 ? 0.8 + 0.8 * (0.5 + 0.5 * Math.sin(T * 9)) : 0.6;
  if (tag === 'pultlicht') return 0.7 + 0.5 * (0.5 + 0.5 * Math.sin(T * 2 + m.pts[j - m.B][0] * 20));
  if (tag === 'chip') return 1 + 0.6 * st.mod * Math.exp(-(((T - PS.g1[0] - PS.g1[1] - 0.3) / 0.4) ** 2)) + (st.hero ? 0.3 : 0);
  if (tag === 'logo' || tag === 'deckel') return 1 + 0.7 * st.lid * Math.exp(-(((T - PS.g2[0] - PS.g2[1] - 0.3) / 0.4) ** 2)) + (st.hero ? 0.35 * (0.5 + 0.5 * Math.sin(T * 2.2)) : 0);
  if (tag === 'gehaeuse' && st.hero) return 1.15;
  return 1;
}

/** Bühnenlage: leichte Aufsicht und Dreiviertelansicht, im 3D langsam schwenkend. */
const view = (o, ya) => { yaw(o, ya); pitch(o, 0.16); return o; };

export const builders = {
  conveyor3d: (n, caption) => {
    const m = beltModel(n), col = [...m.belt.map(beltColour), ...m.tags.map((t) => COLOURS[t] ?? WARM)];
    const ya = (T) => 0.42 + 0.22 * smooth(T / 3) * Math.sin((T * TAU) / 16);
    const at = (T) => Array.from({ length: n }, (_, j) => [...view(poseAll(m, plan3d, T, j, [0, 0, 0]), ya(T)), ...col[j]]);
    const fitPts = [0, 4, 8, 12, P3.hold].flatMap((T) => at(T)).filter((_, i) => i % 3 === 0);
    return { beats: [{ ...act([part('band', at(0).slice(0, m.B), { rigid: true }), part('anlage', at(0).slice(m.B), { rigid: true })], { caption, hold: P3.hold, live: (b, j, t, o) => {
      view(poseAll(m, plan3d, t, j, o), ya(t)); o[3] = lightOf(m, plan3d, j, t);
    } }), fitPts }] };
  },
  conveyorStory: (n) => {
    const m = beltModel(n), col = [...m.belt.map(beltColour), ...m.tags.map((t) => COLOURS[t] ?? WARM)];
    const ya = (T) => 0.4 + 0.08 * Math.sin((T * TAU) / 20) - 0.25 * smooth((T - PS.hero - 0.5) / 2.5);
    const at = (T) => Array.from({ length: n }, (_, j) => [...view(poseAll(m, planStory, T, j, [0, 0, 0]), ya(T)), ...col[j]]);
    const fitPts = [0, 3.4, 6, 9.6, 13, 15.8, 19, 21, 23].flatMap((T) => at(T)).filter((_, i) => i % 3 === 0);
    const caps = ['foerderband.housingArrives', 'foerderband.moduleIn', 'foerderband.lidOn', 'foerderband.finished'];
    return { beats: caps.map((key, a) => ({ ...act([part('band', at(ACT[a]).slice(0, m.B), { rigid: true }), part('anlage', at(ACT[a]).slice(m.B), { rigid: true })], { caption: message(key), hold: ACT[a + 1] - ACT[a], live: (b, j, t, o) => {
      const T = ACT[a] + t; view(poseAll(m, planStory, T, j, o), ya(T)); o[3] = lightOf(m, planStory, j, T);
    } }), fitPts })) };
  },
};
/** Für Wächter und Werkzeuge: Teilname jeder Drohne (Band oder Teil der Anlage). */
export const labelOf = (name, n, j) => { const m = beltModel(n); return j < m.B ? (m.belt[j].edge ? 'bandkante' : 'leiste') : m.tags[j - m.B]; };
