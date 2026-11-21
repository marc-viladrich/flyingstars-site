// Runde 14 (Marc 21.11.2026: „Wir haben ja schon diese sehr gut funktionierende Variante des Bremer Schlüssels im Stadtfest
// drin. Lass uns das doch einfach nehmen.“): Beispiel-Logos, die ein Wahrzeichen aus scenes/wahrzeichen.js sind, laufen im
// Logo-Modus nicht durch den Logo-Konverter, sondern zeigen genau die Punkte des Katalogmotivs. Regel: das Beispiel bei m
// Drohnen = flat(Wahrzeichen, m), dieselben Punkte, Teile und Farben wie im Konfigurator-Anlass (Stadtfest, 2D).
// Der Konverter tastete eine eigene Nachzeichnung als Kontur ab (zwei Punktreihen je Strich, Punkte auf der Pixeltreppe):
// daher die verwackelten Bartquadrate. Es gibt keine zweite Zeichnung mehr; auch das Bild der Minimap entsteht aus
// denselben Linien (landmarkSvg).
// Wie ein Konverter-Logo bedienbar (logo-mode.js hängt die Sitzung über die Beispiel-Datei ein):
// - Drohnenregler: die gewünschte Zahl ist die Zahl des Motivs (bis LANDMARK_EXAMPLES[id].max, darüber trägt die Zeichnung
//   keine neuen Teile mehr, nur Dichte).
// - Liniendichte: eine Stufe ist eine feste Punktdichte entlang der Linien, wie beim Konverter. Stufe 8 (0,6) = 200 Drohnen,
//   linear; die Zeichnung ist dann die des Wahrzeichens bei dieser Zahl.
// - Teile entfernen: Teile sind die Teilnamen des Wahrzeichens (Schaft, Bart, Kreise, Bögen, Ornament); die übrigen Linien
//   werden im selben Punktabstand neu abgetastet, die Formation braucht dann weniger Drohnen.
import { flat, SHAPES, LEVELS, level as defaultLevel, linesOf, COLOURS } from './scenes/wahrzeichen.js';
import { prepareLines, stageSample } from './scenes/catalog-resample.js';
import { WARM } from './show-motion.js';
import { LANDMARK_EXAMPLES } from './logo-examples.mjs';
import { DENSITIES, densityIndexFromCounts } from './logo-density.mjs';

export { LANDMARK_EXAMPLES };
export const isLandmark = (id) => Object.hasOwn(LANDMARK_EXAMPLES, id ?? '');

/** Liniendichte → Drohnenzahl: Stufe 8 (0,6) = 200 Drohnen; die Länge der Linien ist fest, der Abstand folgt der Zahl. */
const PER_DENSITY = 200 / 0.6;
export const landmarkCount = (density) => Math.max(1, Math.round(density * PER_DENSITY));

const lengthOf = (L) => L.curves.reduce((t, c) => t + c.len, 0) + L.loops.reduce((t, l) => t + l.len, 0);

/**
 * Punkte des Wahrzeichens id bei m Drohnen, ohne die Teile in drop (Teilnamen). n: das Budget der Anfrage (für meta.over).
 * Punkte wie beim Konverter: { x, y (nach unten), c: [r, g, b], e: Element, cg: Teil, wt }, meta wie exampleFormation.
 */
export function landmarkFormation(id, m, { drop = new Set(), n = m } = {}) {
  const def = LANDMARK_EXAMPLES[id], key = def.shape, full = flat(key, m);
  const polys = SHAPES[key](full.level), tags = [...new Set(polys.map((p) => p.tag))];
  let pts = full.pts, tagOf = full.tag, spacing = full.spacing;
  const gone = tags.filter((t) => drop.has(t));
  if (gone.length && gone.length < tags.length) {
    // dieselbe Abtastung wie flat() über die übrigen Linien, im Punktabstand des ganzen Motivs (Zahl nach Linienlänge)
    const keep = polys.filter((p) => !drop.has(p.tag)), all = prepareLines(linesOf(polys, tags)), rest = prepareLines(linesOf(keep, tags));
    const s = stageSample(rest, Math.max(1, Math.round(full.pts.length * (lengthOf(rest) / lengthOf(all)))));
    pts = s.pts; tagOf = s.pts.map((q) => tags[q[2]] ?? tags[0]); spacing = s.spacing;
  }
  const present = tags.filter((t) => tagOf.includes(t)), apart = new Set(def.apart ?? []);
  const elementOf = (t) => (apart.has(t) ? 1 : 0), cgOf = (t) => present.indexOf(t);
  const out = pts.map((p, j) => ({ x: p[0], y: -p[1], c: COLOURS[tagOf[j]] ?? WARM, e: elementOf(tagOf[j]), cg: cgOf(tagOf[j]), wt: 1 }));
  const centre = (list) => ({ x: list.reduce((t, q) => t + q.x, 0) / list.length, y: list.reduce((t, q) => t + q.y, 0) / list.length });
  const colourGroups = present.map((t) => { const own = out.filter((q, j) => tagOf[j] === t); return { id: cgOf(t), n: own.length, e: elementOf(t), anchor: { ...centre(own), part: t }, rgb: own[0].c }; });
  const elements = [...new Set(present.map(elementOf))].map((e) => { const parts = present.filter((t) => elementOf(t) === e), own = out.filter((q) => q.e === e); return { id: e, kind: 'figure', n: own.length, anchor: { ...centre(own), parts } }; });
  const density = m / PER_DENSITY;
  out.meta = { frame: { sx: 1, sy: 1, ox: 0, oy: 0 }, elements, colourGroups, spacing, density, part: 'full', auto: { drones: n, density }, n, over: out.length > n, landmark: { shape: key, level: full.level, drones: m } };
  return out;
}

/** Teilnamen, die eine Liste von Entfernungen (stageEditor: { anchors }) trifft. */
const dropOf = (removed) => new Set(removed.flatMap((r) => r.anchors.flatMap((a) => a.parts ?? (a.part ? [a.part] : []))));

/** Reglerstufe des automatischen Bilds bei n Drohnen (Regel wie beim Konverter, logo-density.mjs), ohne Messung im Worker. */
export function landmarkDensity(id, n, removed = []) {
  const drop = dropOf(removed), auto = landmarkFormation(id, n, { drop }).length, counts = {};
  DENSITIES.forEach((d, i) => { counts[i] = landmarkFormation(id, landmarkCount(d), { drop }).length; });
  return densityIndexFromCounts(counts, auto) ?? 0;
}

/** Sitzung mit derselben Schnittstelle wie logoSession() in logo-mode.js (formation, setOptions, options, removed, …). */
export function landmarkSession(id, init = {}) {
  let opts = { flex: 'auto', part: 'auto', ...init }, removed = [];
  if (opts.density == null) delete opts.density;
  return {
    formation: async (n) => landmarkFormation(id, opts.density == null ? n : landmarkCount(opts.density), { drop: dropOf(removed), n }),
    setOptions(next) { const o = { ...opts, ...next }; if (o.density == null) delete o.density; if (JSON.stringify(o) === JSON.stringify(opts)) return false; opts = o; return true; },
    get options() { return { ...opts }; },
    get removed() { return removed; },
    setRemoved(list) { removed = list; },
    dispose() {},
  };
}

/** Bild der Minimap: die Linien des Wahrzeichens in der höchsten Stufe des Beispiels, dunkel auf hellem Grund. */
export function landmarkSvg(id) {
  const def = LANDMARK_EXAMPLES[id], lv = (LEVELS[def.shape] ?? defaultLevel)(def.max), polys = SHAPES[def.shape](lv);
  const S = 300, W = 11, xy = ([x, y]) => [x * S, -y * S], all = polys.flatMap((p) => p.pts.map(xy));
  const x0 = Math.min(...all.map((p) => p[0])) - W * 2, y0 = Math.min(...all.map((p) => p[1])) - W * 2;
  const w = Math.max(...all.map((p) => p[0])) - x0 + W * 2, h = Math.max(...all.map((p) => p[1])) - y0 + W * 2;
  const ink = (tag) => (def.ink?.[tag] ?? def.ink?.default ?? '#2f3a44');
  const path = (p) => `<path d="M${p.pts.map(xy).map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}${p.closed ? 'Z' : ''}" stroke="${ink(p.tag)}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0.toFixed(1)} ${y0.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}"><title>${def.title}</title>`
    + `<g fill="none" stroke-width="${W}" stroke-linecap="round" stroke-linejoin="round">${polys.map(path).join('')}</g></svg>`;
}
