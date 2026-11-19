// Runde 9 (Marc 20.11.2026: „wenn ich das Shell-Logo von 100 Drohnen mit rüber nehme auf den Konfigurator, dann sieht es
// ganz anders aus als im Logo-Konfigurator selbst“). Gemessen: beide Ansichten zeigen dieselben Punkte (109 bei Shell),
// aber der Logo-Modus zoomte das Logo bis 80 % der Bühnenhöhe um die Bühnenmitte, und die Hinweiskarte („braucht etwa 109
// Drohnen“) lag über dem unteren Drittel. Der Sockel der Muschel verschwand darunter; bei 390 px stand vom Logo kaum die
// obere Hälfte frei. logoFrame legt das Logo darum in die freie Fläche über der Karte, so groß, wie es dort passt.
//
// Abbildung der Bühne (show-field.js, render/screenOf): Bildschirm-y = oy − (y − fy) · K · S mit S = min(0,36 W,
// 0,6 H bzw. 0,38 H unter 600 px), oy = 0,5 H (0,52 H unter 600 px); fy und k kommen aus dem Rahmen der fitPts
// (k = 1 / max(halbe Breite / 1,15, halbe Höhe / 0,75)), K = k · zoom · (0,9, wenn das Bild live-Bewegung hat).
// Ein unsichtbarer Hilfspunkt in fitPts verschiebt die Mitte des Rahmens; gezeichnet werden nur pts.

const stageScale = (W, H) => Math.min(W * 0.36, H * (W < 600 ? 0.38 : 0.6));
const stageMiddle = (W, H) => H * (W < 600 ? 0.52 : 0.5);

/**
 * lit: leuchtende Punkte [x, y, …] (y nach oben). stage: { W, H, coverTop?, live? } in CSS-Pixeln; coverTop = Oberkante
 * der Karte über dem unteren Teil der Bühne (fehlt sie, ist die ganze Höhe frei). → { fitPts, zoom }
 */
export function logoFrame(lit, { W, H, coverTop = null, live = false }) {
  if (!lit.length || !W || !H) return { fitPts: lit, zoom: 1 };
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of lit) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const w = Math.max(x1 - x0, 1e-6), h = Math.max(y1 - y0, 1e-6), S = stageScale(W, H), oy = stageMiddle(W, H), L = live ? 0.9 : 1;
  const top = 0.06 * H, bottom = Math.min(H, coverTop ?? H) - 0.04 * H;
  // so groß wie bisher erlaubt (88 % der Breite, 80 % der Höhe, höchstens 1,6-fach), aber nie höher als die freie Fläche
  const k0 = 1 / Math.max(w / 2 / 1.15, h / 2 / 0.75);
  const K = Math.min((0.88 * W) / (w * S), Math.min(0.8 * H, bottom - top) / (h * S), 1.6 * k0 * L);
  // Mitte des Logos auf die Mitte der freien Fläche (ohne Karte bleibt sie, wo sie war)
  const c = Math.min(oy, (top + bottom) / 2), my = (y0 + y1) / 2, fy = my - (oy - c) / (K * S);
  const ghost = [(x0 + x1) / 2, Math.min(y0, 2 * fy - y1), 0, 0, 0, 0];
  const hh = (y1 - ghost[1]) / 2, k = 1 / Math.max(w / 2 / 1.15, hh / 0.75);
  return { fitPts: [...lit, ghost], zoom: K / (k * L) };
}

/** Wo das Logo auf dem Bildschirm landet (Prüfung): Ober- und Unterkante in CSS-Pixeln, ohne Kippung der Bühne. */
export function logoScreenBox(lit, frame, { W, H, live = false }) {
  const all = frame.fitPts;
  let y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity, ly0 = Infinity, ly1 = -Infinity;
  for (const p of all) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); }
  for (const p of lit) { ly0 = Math.min(ly0, p[1]); ly1 = Math.max(ly1, p[1]); }
  const k = 1 / Math.max((x1 - x0) / 2 / 1.15, (y1 - y0) / 2 / 0.75), K = k * frame.zoom * (live ? 0.9 : 1), S = stageScale(W, H), oy = stageMiddle(W, H), fy = (y0 + y1) / 2;
  let lx0 = Infinity, lx1 = -Infinity; for (const p of lit) { lx0 = Math.min(lx0, p[0]); lx1 = Math.max(lx1, p[0]); }
  return { top: oy - (ly1 - fy) * K * S, bottom: oy - (ly0 - fy) * K * S, width: (lx1 - lx0) * K * S };
}
