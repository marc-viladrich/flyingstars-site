// Räumliche Schneeflocke für die Show-Folge der Startseite (Runde 6, 18.11.2026; Marc: „die Schneeflocke soll räumlich
// werden, bevor sie zum Baum wird“). Kein zweiter Abzug derselben Fläche: drei Flocken-Ebenen teilen sich die senkrechte
// Achse (wie ein Weihnachtsstern aus gesteckten Flocken). Das Bild beginnt flach, deckungsgleich mit der flachen Flocke
// (snow2d), faltet die zweite und dritte Ebene auf 60° und 120° auf und dreht sich dann um die Hochachse.
import { TAU, DIAMOND, CYAN, WARM, mix, paint, yaw, pitch, smooth, frac, hash, act, part } from "../show-motion.js";
import { assignScalable } from "../show-field.js";
import { stern } from "./catalog-3d/symbole.js";
import { share } from "../show-shapes.js";
import { t as message } from "../../i18n/ui.mjs";
import { builders as winter } from "./winter.js";

export const builders = {};

/** Arme einer Flocke in der Bildebene: Hauptarm plus zwei Astpaare, wie snow2d (winter.js). vertical: auch die beiden
 *  senkrechten Arme (nur die erste Ebene trägt sie, die anderen teilen sie). slim: nur ein Astpaar je Arm (die beiden
 *  aufgefalteten Ebenen; mit vollen Ästen lief die Flocke in der Drehung zu einem Knäuel zusammen). */
function arms(vertical, slim = false) {
  const segs = [];
  for (let k = 0; k < 6; k++) {
    const a = Math.PI / 2 + (k * TAU) / 6;
    if (!vertical && (k === 0 || k === 3)) continue;
    const at = (r, ang = a) => [Math.cos(ang) * r, Math.sin(ang) * r];
    segs.push({ from: at(0.06), to: at(1), arm: k });
    for (const [r, len] of slim ? [[0.55, 0.26]] : [[0.48, 0.3], [0.74, 0.19]]) for (const side of [-1, 1]) {
      const base = at(r), e = a + side * (TAU / 6);
      segs.push({ from: base, to: [base[0] + Math.cos(e) * len, base[1] + Math.sin(e) * len], arm: k });
    }
  }
  return segs;
}

builders.snow3d = (n, caption) => {
  const planes = [arms(true), arms(false, true), arms(false, true)];
  const lens = planes.map((segs) => segs.reduce((s, q) => s + Math.hypot(q.to[0] - q.from[0], q.to[1] - q.from[1]), 0));
  const per = share(n, lens), pts = [], meta = [];
  planes.forEach((segs, p) => {
    const counts = share(per[p], segs.map((q) => Math.hypot(q.to[0] - q.from[0], q.to[1] - q.from[1])));
    segs.forEach((q, i) => { for (let c = 0; c < counts[i]; c++) { const u = (c + 1) / counts[i]; pts.push([q.from[0] + (q.to[0] - q.from[0]) * u, q.from[1] + (q.to[1] - q.from[1]) * u, 0]); meta.push({ plane: p, tip: c === counts[i] - 1, arm: q.arm }); } });
  });
  const colour = (pt, j) => (meta[j].tip ? CYAN : mix(DIAMOND, WARM, meta[j].plane * 0.25));
  return { beats: [{ pts: paint(pts, colour), caption, live: (b, j, t, o) => {
    const m = meta[j], open = smooth(t / 1.1);
    if (m.plane) yaw(o, (m.plane * TAU / 6) * open); // Ebenen 2 und 3 falten auf 60° und 120° auf
    yaw(o, 0.55 * Math.max(0, t - 0.5) ** 2 / (1 + Math.max(0, t - 0.5))); // danach Drehung um die Hochachse, sanft anlaufend
    pitch(o, 0.18 * open);
    o[3] = m.tip ? 0.95 + 0.7 * Math.exp(-(((frac(t / 2.2 - m.arm / 6 - m.plane / 3) - 0.5) / 0.09) ** 2)) * (0.7 + 0.3 * hash(j)) : 1;
  } }] };
};

// Runde 9 (Marc: „bei der Schneeflocke, wenn wir in die 3D-Version gehen, … die gleiche 3D-Eskalierung … wie auf der
// Startseite …, dass man sieht, wie aus einer 2D-Shape eine 3D-Shape wird“): die Mechanik des Stücks „baum“ der Startseite
// (himmel/folge.js) als Motiv des Konfigurators. snow3d beginnt flach und faltet die zweite und dritte Ebene auf 60° und
// 120° auf; davor steht die Flocke kurz flach, danach wird sie zum Baum. Wiederverwendet, nicht nachgebaut: snow3d von
// oben, tree3d und treeStory aus winter.js.
// Anders als auf der Startseite steht vorn nicht snow2d, sondern snow3d in seiner flachen Ruhelage: snow2d hat eine andere
// Punktlage, und im Tempo des Konfigurators sah man den Flug dazwischen als Knäuel (Bildfolge 19.11.2026). Mit derselben
// Punktlage gibt es keinen Flug, die flache Flocke faltet sich direkt auf.
// Im Konfigurator laufen die Bilder auf seiner ruhigen Uhr (steady() in show-scenes.js): Das Auffalten beginnt, wenn die
// Flocke steht.
//   3D:  flach → räumlich → (Wolke) → Lichterbaum dreht sich (snowTree3d)
//   3D+: flach → räumlich → Licht zeichnet den Baum, ein Stern geht auf, die Lichter wechseln die Farbe (snowTreeStory)
const FLAT_HOLD = 0.9, UNFOLD_HOLD = 2.6;
function escalation(n) {
  const unfold = builders.snow3d(n, message("winter.itUnfoldsIntoSpace")).beats[0];
  // flach: dieselben Punkte, nur das Licht funkelt an den Spitzen (die cyanfarbenen Drohnen), keine Bewegung
  const flat = { pts: unfold.pts, caption: message("winter.aSnowflake"), hold: FLAT_HOLD, live: (b, j, t, o) => { o[3] = b[3] < 100 ? 0.95 + 0.6 * Math.exp(-(((frac(t / 1.6 - Math.atan2(b[1], b[0]) / TAU) - 0.5) / 0.1) ** 2)) : 0.92 + 0.08 * Math.sin(t * 1.4 + j); } };
  return [flat, { ...unfold, hold: UNFOLD_HOLD }];
}
// zum Baum über die lebendige Wolke (wie in 3D+): der direkte Flug von der räumlichen Flocke zur Spirale lief als Knäuel
builders.snowTree3d = (n, caption) => ({ beats: [...escalation(n), ...winter.tree3d(n, caption).beats.map((b) => ({ ...b, cloud: true }))] });
builders.snowTreeStory = (n, caption) => ({ beats: [...escalation(n), ...winter.treeStory(n, caption).beats.slice(1)] });

// Runde 10 (Marc, 20.11.2026: „bei 3D+ einen seamless Übergang …, bei dem der Stern auf dem Weihnachtsbaum smoothly zum
// großen 3D-Stern wird … für die Story und die morphological continuity“): die Baumgeschichte von oben, danach wächst der
// Stern auf der Spitze zum großen geschliffenen Stern (stern() aus catalog-3d/symbole.js, dieselbe 3D+-Fassung wie das
// Katalogmotiv), und die Lichterkette wird von der Spitze her in ihn eingezogen. Keine Wolke: Das letzte Bild hat
// dieselben zwei Teile wie das Baumbild ("lights", "star"), beide starr (part(…, { rigid: true })), damit die Engine
// (show-field.js) jede Drohne an ihrem Platz lässt; den Weg bestimmt live() dieses Bildes.
//   - Der Baumstern wächst und sinkt gleichmäßig zur Mitte (dieselbe Stelle des Umrisses bleibt dieselbe Drohne), jeder
//     Zwischenstand ist ein Stern.
//   - Die Baumlichter starten nacheinander, oben zuerst (die Kette wird eingezogen, der Baum bleibt bis dahin ein Baum),
//     und landen auf ihrem Platz am wachsenden Stern: erst der Umriss (der Stern wird dichter), zuletzt die Grate (er
//     wird räumlich). Erster Versuch mit allen Lichtern zugleich (Bildfolge 20.11.2026): in der Mitte des Flugs ein
//     Knäuel, in dem der Stern unterging.
//   - Danach dreht sich der große Stern wie im Katalogmotiv; nach einem kurzen Halt (SETTLE) läuft die Drehung sanft an.
// Wächter: scripts/baumstern-uebergang.test.mjs (spielt den Übergang in der echten Engine Bild für Bild ab).
export const TREE_TURN_HOLD = 3, BIG_STAR_HOLD = 5;
/** Einzug der Lichterkette: Startzeiten ab REEL_FROM über REEL s gestaffelt, jeder Flug dauert FLY s (Grenzen in
 *  show-flight.js). Der Stern wächst und sinkt über die ganze Zeit (STAR = GROW) und sinkt damit in den Platz, den der
 *  eingezogene Baum frei macht. Ein gelandetes Licht fährt mit dem Stern mit (es gehört ab dann zu ihm, wie eine Drohne
 *  eines Teils, das sich bewegt). Verworfen am 20.11.2026: erst den Stern ganz wachsen lassen, dann die Lichter holen.
 *  Ohne Überschwingen, aber der große Stern stand dann lange mit nur 50 Drohnen dünn vor der Spirale und war schlechter
 *  lesbar. */
export const REEL_FROM = 0.3, REEL = 4, FLY = 1.8, GROW = REEL_FROM + REEL + FLY, STAR = GROW;
/** Ruhe nach der letzten Landung, bevor sich der große Stern dreht (keine Richtungsumkehr ohne Halt). */
export const SETTLE = 0.4;
// Baumstern in winter.js: topStar(50, STAR_Y = 1, 0.24, 1), innerer Umriss bei 55 %, Innenecken bei 45 %.
export const CROWN = { S: 50, cx: 0, cy: 1, scale: 0.24, inner: 0.55, ratio: 0.45 };
// großer Stern wie stern(): Mitte [0, −0,02], Zacken 0,93, Innenecken 0,4, Grate zur Spitze vorn bei z = 0,32
const BIG = { cx: 0, cy: -0.02, R: 0.93, ratio: 0.4 / 0.93, D: 0.32 };
/** Punkt an Stelle u ∈ [0, 10) eines fünfzackigen Umrisses (oben beginnend im Uhrzeigersinn, wie topStar in winter.js). */
export function starOutline(u, cx, cy, s, ratio) {
  const i = Math.floor(u) % 10, f = u - Math.floor(u), corner = (k) => { const a = ((k % 10) / 10) * TAU, r = k % 2 ? ratio : 1; return [Math.sin(a) * r * s + cx, cy + Math.cos(a) * r * s]; };
  const a = corner(i), b = corner(i + 1);
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}
/** Sanfter Anlauf einer Bewegung, die danach gleichmäßig weiterläuft (Geschwindigkeit 0 → 1 über ramp). */
const runIn = (t, ramp = 1.5) => (t <= 0 ? 0 : t < ramp ? (t * t) / (2 * ramp) : t - ramp / 2);

builders.snowTreeStarStory = (n, caption) => {
  const story = builders.snowTreeStory(n, caption).beats;
  const turnBeat = story[story.length - 1];
  const S = CROWN.S, L = n - S;
  // Wo jede Drohne am Ende des Baumbilds steht (seine Uhr endet bei TREE_TURN_HOLD; der Baum hat sich gedreht)
  const end = turnBeat.pts.map((p, j) => { const o = [p[0], p[1], p[2] || 0, 1]; turnBeat.live(p, j, TREE_TURN_HOLD, o); return o; });
  // der große Stern in seiner Ruhelage bei t = 0 (wie body3d in scenes/catalog.js)
  const big = stern(n, "3D+"), rest = big.pts.map((p, j) => { const o = [p[0], p[1], p[2], 1]; big.live(p, j, 0, o); return [o[0], o[1], o[2], p[3], p[4], p[5]]; });
  const atRest = (x, y, z = 0) => { const o = [x, y, z, 1]; big.live([x, y, z], 0, 0, o); return o; }; // gleiche Neigung wie die Ruhelage
  const centre = atRest(BIG.cx, BIG.cy);
  const rim = big.pts.map((p, j) => j).filter((j) => Math.abs(big.pts[j][2]) < 1e-9);
  const [outer, inner] = share(S, [1, CROWN.inner]); // dieselbe Teilung wie topStar(…, inner = 1)
  const used = new Uint8Array(n), slotOf = new Int32Array(n);
  const flat = (list) => Float64Array.from(list.flatMap((q) => [q[0], q[1], q[2] || 0]));
  const take = (drones, want, slots) => { const m = assignScalable(flat(want), flat(slots.map((j) => rest[j]))); drones.forEach((d, k) => { slotOf[d] = slots[m[k]]; used[slots[m[k]]] = 1; }); };
  // Baumstern: äußerer Umriss → Umriss des großen Sterns an derselben Stelle, innerer Umriss → die Grate bei 55 %
  take(Array.from({ length: outer }, (_, k) => L + k), Array.from({ length: outer }, (_, k) => atRest(...starOutline((k / outer) * 10, BIG.cx, BIG.cy, BIG.R, BIG.ratio))), rim);
  take(Array.from({ length: inner }, (_, k) => L + outer + k), Array.from({ length: inner }, (_, k) => atRest(...starOutline((k / inner) * 10, BIG.cx, BIG.cy, BIG.R * CROWN.inner, BIG.ratio), BIG.D * (1 - CROWN.inner))), rest.map((p, j) => j).filter((j) => !used[j]));
  // Baumlichter: Reihenfolge des Einzugs von der Spitze der Kette abwärts (Höhe auf dem Baum)
  const reel = Array.from({ length: L }, (_, j) => j).sort((a, b) => end[b][1] - end[a][1]);
  const leave = new Float64Array(L); reel.forEach((j, r) => { leave[j] = REEL_FROM + (r / Math.max(1, L - 1)) * REEL; });
  // die zuerst eingezogenen Lichter füllen den Umriss, die späteren die Grate; je Gruppe die kürzesten Wege
  const freeRim = rim.filter((j) => !used[j]), firstN = Math.min(freeRim.length, L);
  take(reel.slice(0, firstN), reel.slice(0, firstN).map((j) => end[j]), freeRim);
  take(reel.slice(firstN), reel.slice(firstN).map((j) => end[j]), rest.map((p, j) => j).filter((j) => !used[j]));
  // Lage auf dem wachsenden Stern: g = 0 Größe und Ort des Baumsterns, g = 1 der große Stern
  const scaleAt = (g) => (CROWN.scale + (BIG.R - CROWN.scale) * g) / BIG.R;
  const onStar = (k, g, o) => { const e = rest[k], s = scaleAt(g); o[0] = CROWN.cx + (centre[0] - CROWN.cx) * g + (e[0] - centre[0]) * s; o[1] = CROWN.cy + (centre[1] - CROWN.cy) * g + (e[1] - centre[1]) * s; o[2] = centre[2] * g + (e[2] - centre[2]) * s; };
  // Abweichung des Baumsterns vom ideal verkleinerten großen Stern: läuft mit dem Wachsen aus, so beginnt jede Drohne genau dort, wo sie stand
  const offset = Array.from({ length: S }, (_, k) => { const o = [0, 0, 0]; onStar(slotOf[L + k], 0, o); const p = turnBeat.pts[L + k]; return [p[0] - o[0], p[1] - o[1], (p[2] || 0) - o[2]]; });
  const pts = Array.from({ length: n }, (_, j) => rest[slotOf[j]]);
  const ramp = (t) => t * t * t * (t * (t * 6 - 15) + 10); // smootherstep wie die Flüge der Engine (ease in show-flight.js)
  const grown = act([part("lights", pts.slice(0, L), { rigid: true }), part("star", pts.slice(L), { rigid: true })], {
    caption: message("winter.theStarOnTheTopGrowsIntoAGreatStar"), hold: GROW + SETTLE + BIG_STAR_HOLD, shimmer: false, starGrow: true,
    // Die Lichter fliegen einzeln nacheinander; der Teil hat keine gemeinsame Bewegung, von der die Finten-Prüfung je Teil
    // (scripts/show-finte.test.mjs, Abschnitt 2 und 3) ausgehen könnte. Wie bei der Schreibfeder ist die Bewegung der
    // Inhalt; jede einzelne Bahn prüft scripts/baumstern-uebergang.test.mjs absolut auf Ausholen und Überschwingen.
    writes: ["lights"],
    live: (b, j, t, o) => {
      const k = slotOf[j];
      if (t >= GROW) { // der große Stern dreht sich wie im Katalogmotiv, Drehung und Licht laufen sanft an
        const q = big.pts[k], tau = t - GROW - SETTLE; o[0] = q[0]; o[1] = q[1]; o[2] = q[2]; big.live(q, k, runIn(tau), o); o[3] = 1 + (o[3] - 1) * smooth(tau); return; // smooth(≤ 0) = 0: in der Ruhe ruhiges Licht
      }
      const g = smooth(Math.max(0, t) / STAR); // kubisch: der Stern beginnt gleich zu wachsen (smootherstep zögerte sichtbar)
      if (j >= L) { onStar(k, g, o); const d = offset[j - L], f = 1 - g; o[0] += d[0] * f; o[1] += d[1] * f; o[2] += d[2] * f; o[3] = 1.1 - 0.1 * g; return; }
      const u = ramp(Math.min(1, Math.max(0, (t - leave[j]) / FLY))), e = end[j];
      onStar(k, g, o);
      o[0] = e[0] + (o[0] - e[0]) * u; o[1] = e[1] + (o[1] - e[1]) * u; o[2] = e[2] + (o[2] - e[2]) * u;
      o[3] = 1 - 0.35 * Math.sin(Math.PI * u); // im Flug etwas leiser, damit der Stern vorn bleibt
    },
  });
  return { beats: [...story.slice(0, -1), { ...turnBeat, hold: TREE_TURN_HOLD }, grown] };
};
