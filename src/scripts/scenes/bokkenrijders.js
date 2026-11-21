import { t as message } from '../../i18n/ui.mjs';
// Bokkenrijders, Höhepunkt von 3D+ (Runde 16, Marc 21.11.2026: „die Bokkenrijders-Maske als Höhepunkt von 3D+ bei 600
// Drohnen wirkt nicht stark genug … in der echten Show gibt es neben der Maske eine Figur, einen Totenkopf mit
// Zylinderhut“). Im Material liegt von der Show nur die Maske als Punkte vor (public/media/projekte/bokkenrijders/
// formation.json, ein Zeitpunkt der echten Showdatei); der Totenkopf mit Zylinder ist hier nachgebaut, als Linienkörper
// wie die 3D-Katalogfiguren (catalog-3d/kit.js): Schädel mit Umriss, Scheitelprofil und Stirnreifen, Augenhöhlen mit
// glimmendem Licht, Nase, Zahnreihen, Unterkiefer; darauf ein Zylinder aus Krempe, Kopf und Hutband.
// Die Geschichte: die Maske steht → sie zerlegt sich, der Totenkopf setzt sich von unten nach oben zusammen, der Hut
// zuletzt (scenes/umbau.js) → er dreht den Kopf, lüftet den Hut und lacht → er zerlegt sich wieder zur Maske, deren
// Augen glühen. Wächter: scripts/umbau.test.mjs.
import { TAU, WARM, GOLD, RED, VIOLET, BLUE, mix, smooth, yaw, pitch, part, act } from '../show-motion.js';
import { curves, spot, assemble, colour, turn } from './catalog-3d/kit.js';
import { reassemble } from './umbau.js';

const ring = (k, f, closed = true) => ({ pts: Array.from({ length: closed ? k : k + 1 }, (_, i) => f(i / k)), closed });
const HEAD = { c: [0, 0.12], r: 0.6, rz: 0.54 }; // Schädel: Mitte, Radius, Tiefe
const HAT = { y: 0.6, brim: [0.8, 0.5], crown: [0.42, 0.33], top: 1.42, band: 0.75, roll: -0.12 };
/** Tiefe der Vorderfläche des Schädels an (x, y): dort sitzen Augen, Nase und Zähne. */
const front = (x, y) => { const u = (x / HEAD.r) ** 2 + ((y - HEAD.c[1]) / (HEAD.r * 1.05)) ** 2; return HEAD.rz * Math.sqrt(Math.max(0.12, 1 - u)); };
const onFace = (x, y, dz = 0) => [x, y, front(x, y) + dz];
/** Teile, die mit dem Hut gehen (lüften), und der Unterkiefer (lachen). */
/** Größe gegenüber der Maske (Einheitsgröße): der Totenkopf mit Hut steht etwas größer, er ist der Höhepunkt. */
const SCALE = 1.15;
const HAT_TAGS = new Set(['krempe', 'zylinder', 'hutband']), JAW_TAGS = new Set(['kiefer', 'zaehneUnten']);

/** Der Totenkopf mit Zylinder aus k Drohnen: Punkte, Teilnamen, Bewegung. */
export function skullHat(k) {
  const [cx, cy] = HEAD.c, R = HEAD.r;
  // Umriss in der Bildebene: Schädelbogen bis unter den Hut, Wangenknochen, schmaler Kiefer
  const arc = (a0, a1, m) => Array.from({ length: m + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / m; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R, 0]; });
  const hatA = Math.asin((HAT.y - cy) / R); // dort verschwindet der Schädel unter der Krempe
  const outline = curves('schaedel', [
    { pts: arc(hatA, -0.5, 18).concat([[0.44, -0.44, 0.08], [0.33, -0.56, 0.14]]) },
    { pts: arc(Math.PI - hatA, Math.PI + 0.5, 18).concat([[-0.44, -0.44, 0.08], [-0.33, -0.56, 0.14]]) },
  ]);
  // Kein Scheitelprofil und kein Stirnreifen: am Himmel lasen sie sich als Fadenkreuz auf der Stirn (Kontaktbogen 21.11.);
  // die Tiefe kommt aus Augen, Nase und Zähnen auf der Vorderfläche, die beim Drehen vor dem Umriss wandern
  // Augenhöhlen (leicht schräge Tropfen), darin glimmendes Licht; Nase als umgekehrtes Herz
  const socket = (sx) => ring(22, (u) => { const a = u * TAU, x = sx * 0.22 + Math.cos(a) * 0.15 - sx * 0.03 * Math.sin(a), y = -0.01 + Math.sin(a) * 0.13 * (Math.sin(a) < 0 ? 1.15 : 1); return onFace(x, y, 0.01); });
  const eyes = curves('auge', [socket(-1), socket(1)], { w: 1.1 });
  const glow = [-1, 1].map((sx) => spot('glut', onFace(sx * 0.21, -0.02, 0.02), 3, 0.04));
  const nose = curves('nase', [{ pts: [onFace(0, -0.13), onFace(-0.075, -0.27), onFace(0, -0.235), onFace(0.075, -0.27)], closed: true }], { w: 1 });
  // Zähne: obere und untere Reihe mit Trennstrichen; der Kiefer schließt unten
  const row = (y) => Array.from({ length: 9 }, (_, i) => onFace(-0.26 + (0.52 * i) / 8, y));
  const upper = curves('zaehne', [row(-0.43), ...[-0.13, -0.04, 0.05, 0.14].map((x) => [onFace(x - 0.005, -0.43), onFace(x - 0.005, -0.51)])], { w: 0.9 });
  const lower = curves('zaehneUnten', [row(-0.6), ...[-0.13, -0.04, 0.05, 0.14].map((x) => [onFace(x - 0.005, -0.52), onFace(x - 0.005, -0.6)])], { w: 0.9 });
  const jaw = curves('kiefer', [[[-0.33, -0.56, 0.14], [-0.3, -0.7, 0.2], [-0.14, -0.78, 0.3], [0.14, -0.78, 0.3], [0.3, -0.7, 0.2], [0.33, -0.56, 0.14]]], { w: 1 });
  // Zylinder: Krempe (Ellipse um den Kopf), Kopf mit Seitenkanten, Deckel, Hutband; leicht schräg aufgesetzt
  const brim = curves('krempe', [ring(48, (u) => { const a = u * TAU; return [Math.cos(a) * HAT.brim[0], HAT.y + 0.03 * Math.sin(a) ** 2, Math.sin(a) * HAT.brim[1]]; })], { w: 1.1 });
  const crown = curves('zylinder', [
    ring(36, (u) => { const a = u * TAU; return [Math.cos(a) * HAT.crown[0] * 1.06, HAT.top, Math.sin(a) * HAT.crown[1] * 1.06]; }),
    ...[-1, 1].map((s) => [[s * HAT.crown[0], HAT.y + 0.03, 0], [s * HAT.crown[0] * 1.06, HAT.top, 0]]),
  ], { w: 1 });
  const band = curves('hutband', [ring(36, (u) => { const a = u * TAU, g = 1.012; return [Math.cos(a) * HAT.crown[0] * g, HAT.band, Math.sin(a) * HAT.crown[1] * g]; }), ring(36, (u) => { const a = u * TAU, g = 1.02; return [Math.cos(a) * HAT.crown[0] * g, HAT.band + 0.07, Math.sin(a) * HAT.crown[1] * g]; })], { w: 0.9 });
  const shape = assemble([outline, eyes, ...glow, nose, upper, lower, jaw, brim, crown, band], k);
  // der Hut sitzt schräg: um den Punkt über dem Scheitel in der Bildebene gedreht
  const tilt = (p) => { const x = p[0], y = p[1] - HAT.y, c = Math.cos(HAT.roll), s = Math.sin(HAT.roll); return [x * c - y * s, HAT.y + x * s + y * c, p[2]]; };
  shape.pts = shape.pts.map((p, j) => (HAT_TAGS.has(shape.tags[j]) ? tilt(p) : p)).map(([x, y, z]) => [x * SCALE, (y - 0.3) * SCALE + 0.3, z * SCALE]);
  // Elfenbein statt Weiß: fast weiße Drohnen nähmen in der Show die Paketfarbe an (show-scenes.js, nearWhite)
  const bone = mix(WARM, GOLD, 0.35), hat = mix(VIOLET, BLUE, 0.45);
  const pts = colour(shape, { auge: mix(WARM, RED, 0.25), glut: RED, nase: bone, zaehne: bone, zaehneUnten: bone, kiefer: bone, krempe: hat, zylinder: hat, hutband: RED }, bone);
  const tags = shape.tags;
  return { pts, tags, live: (b, j, t, o) => {
    const tag = tags[j];
    // Hut lüften (hin und zurück gleich lang): heben, ein wenig zur Seite kippen, wieder aufsetzen
    if (HAT_TAGS.has(tag)) { const u = Math.sin(Math.PI * smooth((t - 1.2) / 2.6)); o[1] += 0.22 * u; o[0] += 0.05 * u; }
    // lachen: der Unterkiefer klappt zweimal auf und zu
    if (JAW_TAGS.has(tag)) { const u = t > 3.6 && t < 5.6 ? Math.sin(((t - 3.6) / 2) * TAU * 1) ** 2 : 0; o[1] -= 0.06 * u; }
    o[3] = tag === 'glut' ? 1.1 + 0.5 * Math.abs(Math.sin(t * 1.7)) : tag === 'auge' ? 0.9 + 0.3 * Math.abs(Math.sin(t * 1.7)) : 1;
    turn(o, t, 0, 0.38, 12);
    pitch(o, -0.06);
  } };
}

/**
 * Die Geschichte aus der Maske (Bild aus show-scenes.js, devilBeat) und dem Totenkopf: Maske → Totenkopf → Maske. n
 * Drohnen; der Totenkopf nutzt so viele wie die Maske, die übrigen warten in Reserve wie bei der Maske.
 */
export function maskSkullStory(mask, n) {
  const k = mask.pts.length, skull = skullHat(k), H = 6.4;
  const head = { ...act([part('totenkopf', skull.pts)]), caption: message('bokkenrijders.skullTipsHat'), hold: H, live: skull.live, ...(n > k ? { offstageDrones: n - k } : {}) };
  const at = (b, t) => b.pts.map((p, j) => { const o = [p[0], p[1], p[2] || 0, 1]; b.live?.(p, j, t, o); return o.slice(0, 3); });
  const fitPts = [...[0, 1.5, 3, 4.5, 6].flatMap((t) => at(mask, t)), ...[0, 2.4, 4.4, 6.4].flatMap((t) => at(head, t))];
  const first = { ...mask, hold: 3.2, caption: message('bokkenrijders.mask'), frame: 'bokkenrijders', fitPts };
  const last = { ...mask, hold: 4, caption: message('bokkenrijders.maskAgain'), frame: 'bokkenrijders', fitPts };
  const opts = { frame: 'bokkenrijders', spread: 2.8, fly: 2.3 };
  const there = reassemble(first, head, { ...opts, caption: message('bokkenrijders.maskBecomesSkull') });
  const back = reassemble(head, last, { ...opts, caption: message('bokkenrijders.skullBecomesMask'), order: (p) => -p[1] });
  return { beats: [first, { ...there, fitPts }, { ...head, frame: 'bokkenrijders', fitPts }, { ...back, fitPts }, last] };
}
