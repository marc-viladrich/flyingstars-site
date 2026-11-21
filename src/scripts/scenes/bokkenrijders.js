import { t as message } from '../../i18n/ui.mjs';
// Bokkenrijders, Höhepunkt von 3D+ (Runde 16, Marc 21.11.2026: „in der echten Show gibt es neben der Maske eine Figur, einen
// Totenkopf mit Zylinderhut“; Runde 17: „krass 2D und schlecht … muss genau die räumliche Tiefe der echten
// Bokkenrijders-3D-Maske haben“). Die Maske ist die echte Showformation (public/media/projekte/bokkenrijders/
// formation.json, 600 Drohnen); der Totenkopf mit Zylinder ist nach dem Musical 2026 als Körper gebaut, in derselben
// Punktsprache (scenes/totenkopf.js). Abläufe wie in der Show (Aufnahmen Juni 2026, docs/show-konfigurator.md, Runde 17):
//   1. Die Maske: erst steht nur ihr Grinsen im Dunkeln (Zähne, glühende Augen), dann leuchtet das Gesicht von der Stirn
//      abwärts auf und die Hörner wachsen aus dem Kopf.
//   2. Sie zerlegt sich, der Totenkopf setzt sich von unten nach oben zusammen, der Hut zuletzt (scenes/umbau.js); jede
//      Drohne wechselt unterwegs von Rot zu Eisweiß.
//   3. Der Totenkopf schwenkt den Kopf, lüftet den Zylinder (darunter die Schädeldecke), weint Blut, dann glüht er wie in
//      der Show von unten nach oben auf: Eisweiß → Gold → Orange → Glut, die Drohnen flackern.
//   4. Glühend zerlegt er sich, die Maske setzt sich von den Hörnern abwärts zusammen (Rot bleibt Rot).
//   5. Die Maske, ihre Augen glühen; zum Schluss verlöschen Hörner und Gesicht, nur das Grinsen bleibt (wie in der Show).
// Wächter: scripts/umbau.test.mjs (Anschlüsse, gerade Bahnen), scripts/totenkopf.test.mjs (Körper, Farben, Geschichte),
// scripts/show-counts.test.mjs (600 Originalpunkte, Reserve offstage).
import { TAU, DIAMOND, GOLD, ORANGE, smooth, hash, sway, act, part, reveal, sparkle } from '../show-motion.js';
import { skullHatBody, HAT_PARTS, HAT_PIVOT, BRIM, LIFT } from './totenkopf.js';
import { reassemble } from './umbau.js';

// ---------- Totenkopf ----------
/** Das Publikum sieht ihn von unten, wie die Maske (ihre Showdaten sind „von unten, 53°“ gespeichert): Kippung zum Betrachter. */
const VIEW = -0.5, CV = Math.cos(VIEW), SV = Math.sin(VIEW);
/** Größe gegenüber der Maske: ein wenig größer, er ist der Höhepunkt. */
const HEIGHT = 2.1;
// Farben wie in der Show: eisig weiß-blau, Blut, Glut. Eisweiß ist nicht „fast weiß“ (show-scenes.js, nearWhite), behält also
// in jedem Paket seine Farbe; eigene Farben aus live bekommen nie eine Paketfarbe, darum endet das Bild in Glut, nicht in Weiß
// (dort übernimmt der Umbau die Farben, Anfang und Ende jedes Übergangs haben dieselbe Farbe).
const ICE = DIAMOND, BLOOD = [255, 28, 48], EMBER = [255, 50, 16];
// Zeitplan auf der Uhr des Bildes (s): Hut lüften, Tränen, Glühen
const HAT_T = [0.6, 2.8], TEARS_T = [3.4, 2.0], BURN_T = 5.4, BURN_SPAN = 1.7, BURN_ONE = 1.0, HOLD = 8.6;
const SWAY = 0.27, SWAY_PERIOD = 11;

/** Farbverlauf beim Glühen (g ∈ [0, 1]) von der Farbe c an: → Gold → Orange → Glut. Schreibt in o[4..6]. */
function burn(o, g, c) {
  const [a, b, u] = g < 0.3 ? [c, GOLD, g / 0.3] : g < 0.65 ? [GOLD, ORANGE, (g - 0.3) / 0.35] : [ORANGE, EMBER, (g - 0.65) / 0.35];
  const k = smooth(u);
  for (let d = 0; d < 3; d++) o[4 + d] = a[d] + (b[d] - a[d]) * k;
}

/** Der Totenkopf mit Zylinder aus k Drohnen: Punkte (zum Publikum gekippt), Teilnamen, Bewegung, Licht und Farbe. */
export function skullHat(k) {
  const body = skullHatBody(k), tags = body.tags, base = body.pts;
  // Größe und Lage: gekippt, auf HEIGHT gebracht, mittig
  const tilt = (p) => [p[0], p[1] * CV - p[2] * SV, p[1] * SV + p[2] * CV];
  const tilted = base.map(tilt), ys = tilted.map((p) => p[1]), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const S = HEIGHT / (y1 - y0), DY = -(y0 + y1) / 2 * S;
  const hat = tags.map((t) => HAT_PARTS.has(t));
  // Stelle jeder Drohne: Höhe im Kopf (0 Kinn … 1 Hutoberkante) fürs Glühen, Stelle auf der Träne (0 oben … 1 unten)
  const by = base.map((p) => p[1]), b0 = Math.min(...by), b1 = Math.max(...by);
  const height = base.map((p) => (p[1] - b0) / (b1 - b0));
  const tearYs = base.filter((_, j) => tags[j] === 'traene').map((p) => p[1]), t0 = Math.max(...tearYs), t1 = Math.min(...tearYs);
  const tearAt = base.map((p, j) => (tags[j] === 'traene' ? (t0 - p[1]) / (t0 - t1) : -1));
  const burnAt = base.map((p, j) => BURN_T + BURN_SPAN * height[j] + 0.45 * hash(j * 1.7 + 0.3));
  const [P0, P1, P2] = HAT_PIVOT, CZ = -0.05;
  const pts = tilted.map(([x, y, z]) => [x * S, y * S + DY, z * S, ...ICE]);
  /** Hut: 0 → 1 → 0 über das Lüften. */
  const doff = (t) => Math.sin(Math.PI * smooth((t - HAT_T[0]) / HAT_T[1]));
  const live = (b, j, t, o) => {
    let [x, y, z] = base[j];
    const h = doff(t);
    if (hat[j] && h > 0) {
      // lüften: anheben, nach vorn kippen (der Deckel zum Publikum), ein wenig zur Seite
      const a = 0.15 * h, r = 0.035 * h, dy = y - P1, dz = z - P2, dx = x - P0;
      const y2 = dy * Math.cos(a) - dz * Math.sin(a), z2 = dy * Math.sin(a) + dz * Math.cos(a);
      x = P0 + dx * Math.cos(r) - y2 * Math.sin(r); y = P1 + dx * Math.sin(r) + y2 * Math.cos(r) + LIFT * h; z = P2 + z2;
    }
    // den Kopf schwenken (um die senkrechte Achse des Kopfes), dann gekippt wie vom Publikum aus
    const w = SWAY * Math.sin((TAU * t) / SWAY_PERIOD), c = Math.cos(w), s = Math.sin(w), X = x * c + (z - CZ) * s, Z = CZ - x * s + (z - CZ) * c;
    o[0] = X * S; o[1] = (y * CV - Z * SV) * S + DY; o[2] = (y * SV + Z * CV) * S;
    // Licht und Farbe
    const tag = tags[j];
    let a = 1;
    if (tag === 'decke') a = smooth((LIFT * h - (base[j][1] - BRIM) - 0.015) / 0.05); // sichtbar, sobald die Krempe darüber steht
    else if (tag === 'glut') a = 1.45 + 0.2 * Math.sin(t * 2.1 + j);
    let painted = false;
    if (tearAt[j] >= 0) {
      const f = 1.3 * smooth((t - TEARS_T[0]) / TEARS_T[1]) - tearAt[j];
      // Blut leuchtet etwas heller als der Schädel (Rot wirkt am Himmel sonst dunkler als Eisweiß); vorn ein heller Tropfen
      if (f > -0.2) { const k2 = smooth(f / 0.18); for (let d = 0; d < 3; d++) o[4 + d] = ICE[d] + (BLOOD[d] - ICE[d]) * k2; painted = true; a *= 1 + 0.25 * k2 + 0.55 * Math.exp(-((f / 0.09) ** 2)); }
    }
    const g = (t - burnAt[j]) / BURN_ONE;
    if (g > 0 && tag !== 'decke') {
      burn(o, Math.min(1, g), painted ? [o[4], o[5], o[6]] : ICE);
      painted = true;
      // flackernde Glut, zum Ende des Bildes wieder ruhig (der Umbau übernimmt gleichmäßiges Licht)
      const f = smooth(g) * (1 - smooth((t - HOLD + 0.7) / 0.6));
      a *= 1 + (sparkle(j, t, 0.68, 1.32) - 1) * f;
    }
    o[3] = a;
    if (!painted) o[4] = NaN;
  };
  return { pts, tags, live };
}

// ---------- Maske ----------
/** Teile der echten Maske, einmal aus den ungetönten Farben bestimmt: Hörner, Grinsen (Zähne und Augen), Gesicht. */
function maskParts(pts) {
  const horn = pts.map((p) => p[1] > 0.36 || (Math.abs(p[0]) > 0.56 && p[1] > 0.1));
  const grin = pts.map((p) => p[3] > 200 && p[4] > 100);
  const face = pts.map((p, j) => !horn[j] && !grin[j]);
  const fy = pts.filter((_, j) => face[j]).map((p) => p[1]), top = Math.max(...fy), bottom = Math.min(...fy);
  const down = pts.map((p) => (top - p[1]) / (top - bottom)); // 0 Stirn … 1 Kinn
  // Hörner wachsen aus der Wurzel an der Seite der Stirn; Stelle entlang des Horns 0 (Wurzel) … 1 (Spitze)
  const root = (p) => [Math.sign(p[0]) * 0.6, 0.2, -0.05];
  const along = pts.map((p) => { const r = root(p); return Math.min(1, Math.hypot(p[0] - r[0], p[1] - r[1]) / 0.85); });
  return { horn, grin, face, down, along, root };
}

/**
 * Die Maske aus der Show (Bild aus show-scenes.js, devilBeat), mit eigener Bewegung: mode 'enter' (Grinsen, Gesicht von
 * oben, Hörner wachsen) oder 'leave' (am Ende bleibt nur das Grinsen). Augen und Zähne glühen, sie schwenkt leicht.
 */
function maskBeat(mask, parts, mode, extra) {
  const { horn, grin, face, down, along, root } = parts, hold = extra.hold;
  return { ...mask, ...extra, live: (b, j, t, o) => {
    let a = grin[j] ? 0.8 + 0.5 * Math.abs(Math.sin(t * 1.5)) : 1;
    if (mode === 'enter') {
      if (face[j]) a *= reveal(down[j], t, 1.7, { delay: 0.5, soft: 0.45 });
      if (horn[j]) {
        // die Hörner wachsen aus dem Kopf: von 80 % ihrer Länge auf ganz, die Spitze leuchtet zuletzt auf
        const g = 0.8 + 0.2 * smooth((t - 1.4) / 2), r = root(b);
        o[0] = r[0] + (b[0] - r[0]) * g; o[1] = r[1] + (b[1] - r[1]) * g; o[2] = r[2] + ((b[2] || 0) - r[2]) * g;
        a *= reveal(along[j], t, 1.5, { delay: 1.4, soft: 0.4 });
      }
    } else if (mode === 'leave') {
      // erst die Hörner (Spitzen zuerst), dann das Gesicht von der Stirn abwärts; das Grinsen bleibt
      if (horn[j]) a *= 1 - smooth((t - (hold - 1.9) - 0.5 * (1 - along[j])) / 0.4);
      if (face[j]) a *= 1 - smooth((t - (hold - 1.3) - 0.7 * down[j]) / 0.4);
    }
    o[3] = a;
    sway(o, t, 0.35);
  } };
}

/**
 * Die Geschichte aus der Maske (Bild aus show-scenes.js, devilBeat) und dem Totenkopf: Maske → Totenkopf → Maske. n
 * Drohnen; der Totenkopf nutzt so viele wie die Maske, die übrigen warten in Reserve wie bei der Maske.
 */
export function maskSkullStory(mask, n) {
  const k = mask.pts.length, skull = skullHat(k), parts = maskParts(mask.pts);
  const off = n > k ? { offstageDrones: n - k } : {};
  const first = maskBeat(mask, parts, 'enter', { hold: 4, caption: message('bokkenrijders.mask'), frame: 'bokkenrijders' });
  // seamless: Umbau und Bild danach beginnen ohne Pause, die Drohnen stehen schon an ihren Plätzen (show-field.js)
  const head = { ...act([part('totenkopf', skull.pts)]), caption: message('bokkenrijders.skullTipsHat'), hold: HOLD, live: skull.live, frame: 'bokkenrijders', seamless: true, ...off };
  const last = maskBeat(mask, parts, 'leave', { hold: 5, caption: message('bokkenrijders.maskAgain'), frame: 'bokkenrijders', seamless: true });
  // ein Bildausschnitt für alle Bilder: die Maske und der Totenkopf zu mehreren Zeitpunkten ihrer Bewegung
  const at = (b, t) => b.pts.map((p, j) => { const o = [p[0], p[1], p[2] || 0, 1, NaN, 0, 0]; b.live?.(p, j, t, o); return o.slice(0, 3); });
  const fitPts = [...[0, 1.5, 3, 4].flatMap((t) => at(first, t)), ...[0, 1.7, 3.6, 6, HOLD].flatMap((t) => at(head, t))];
  for (const b of [first, head, last]) b.fitPts = fitPts;
  const opts = { frame: 'bokkenrijders', spread: 2.8, fly: 2.3, seamless: true };
  // hin: der Totenkopf von unten nach oben, der Hut zuletzt; zurück: die Maske von den Hörnern abwärts
  const there = reassemble(first, head, { ...opts, caption: message('bokkenrijders.maskBecomesSkull') });
  const back = reassemble(head, last, { ...opts, caption: message('bokkenrijders.skullBecomesMask'), order: (p) => -p[1], leaveOrder: (p) => -p[1] });
  return { beats: [first, { ...there, fitPts }, head, { ...back, fitPts }, last] };
}
