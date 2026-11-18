// Kugel für die Show-Folge der Startseite (Runde 4, 18.11.2026). Die Katalog-Kugel hat höchstens 150 Punkte und las
// sich auf der großen Bühne schwach (Marc, Runde 3: „Riesenrad und Kugel lesen sich bei 200 Drohnen schwächer“). Hier
// eine Kugel, wie Drohnenshows sie zeichnen: vier Längenkreise und fünf Breitenkreise mit allen 300 Drohnen, leicht zum
// Publikum gekippt, die sich gleichmäßig um ihre Achse dreht; Licht läuft die Breitenkreise entlang.
import { TAU, WARM, GOLD, CYAN, mix, paint, yaw, pitch, glint } from "../show-motion.js";
import { sample3d, share } from "../show-shapes.js";

export const builders = {};

const R = 0.9, TILT = 0.32;
/** Breitenkreis bei Breite lat (rad), als geschlossene 3D-Linie. */
const parallel = (lat, k = 48) => ({ pts: Array.from({ length: k }, (_, i) => { const a = (i / k) * TAU; return [Math.cos(a) * Math.cos(lat) * R, Math.sin(lat) * R, Math.sin(a) * Math.cos(lat) * R]; }), closed: true });
/** Längenkreis durch beide Pole bei Länge lon, ohne die Pole selbst (dort stünden sonst alle Längenkreise übereinander). */
const meridian = (lon, k = 40) => ({ pts: Array.from({ length: k + 1 }, (_, i) => { const b = -Math.PI / 2 + 0.2 + ((Math.PI - 0.4) * i) / k; return [Math.cos(lon) * Math.cos(b) * R, Math.sin(b) * R, Math.sin(lon) * Math.cos(b) * R]; }), closed: false });

builders.sphere3d = (n, caption) => {
  const lats = [-1.05, -0.52, 0, 0.52, 1.05], lons = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (i / 8) * TAU);
  const [np, nm] = share(n, [lats.reduce((s, l) => s + Math.cos(l), 0), lons.length * (Math.PI - 0.4) / TAU]);
  const rings = sample3d(lats.map((l) => parallel(l)), np), arcs = sample3d(lons.map((l) => meridian(l)), nm);
  const pts = [...paint(rings, (p) => mix(GOLD, WARM, Math.abs(p[1]) / R)), ...paint(arcs, mix(WARM, CYAN, 0.25))];
  return { beats: [{ pts, caption, live: (b, j, t, o) => {
    yaw(o, t * 0.55);
    pitch(o, TILT);
    if (j < np) o[3] = glint(Math.atan2(b[2], b[0]), t, 2.6, 0.45, -Math.PI, Math.PI);
  } }] };
};
