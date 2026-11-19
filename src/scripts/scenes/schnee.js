// Räumliche Schneeflocke für die Show-Folge der Startseite (Runde 6, 18.11.2026; Marc: „die Schneeflocke soll räumlich
// werden, bevor sie zum Baum wird“). Kein zweiter Abzug derselben Fläche: drei Flocken-Ebenen teilen sich die senkrechte
// Achse (wie ein Weihnachtsstern aus gesteckten Flocken). Das Bild beginnt flach, deckungsgleich mit der flachen Flocke
// (snow2d), faltet die zweite und dritte Ebene auf 60° und 120° auf und dreht sich dann um die Hochachse.
import { TAU, DIAMOND, CYAN, WARM, mix, paint, yaw, pitch, smooth, frac, hash } from "../show-motion.js";
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
