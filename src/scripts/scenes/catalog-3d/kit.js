// Baukasten für die 3D-Fassungen der Katalogmotive (Methode: docs/katalog-3d.md). Ein Motiv ist eine Liste von Teilen
// in den Koordinaten der Katalogformation (y oben, Einheitsgröße, z zum Publikum). Körperteile sind Volumen (Ellipsoid,
// Röhre, Rotationskörper) und werden als Skelett gezeichnet, wie Drohnenshows Körper zeichnen: Umriss in der Bildebene
// (bei 0° deckt er sich mit der 2D-Formation), Querschnitt-Reifen, Kammlinie, Meridiane. Wo ein Teil in einem anderen
// steckt, fallen seine Linien weg (Vereinigung der Körper), so entsteht ein Körper statt übereinanderliegender Formen.
// Merkmale (Augen, Knöpfe, Nase) sitzen auf der Vorderfläche des Körpers und wandern beim Schwenken mit ihr.
import { TAU, mix, yaw } from '../../show-motion.js';
import { sample3d, share } from '../../show-shapes.js';

const STEP = 0.01; // Abtastschritt der Linien vor der Verdeckungsprüfung
const HIDE = 0.97; // Linien eines Teils fallen erst weg, wenn sie deutlich im anderen Körper liegen

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], (a[2] || 0) - (b[2] || 0)];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], (a[2] || 0) + (b[2] || 0)];
const mul = (a, k) => [a[0] * k, a[1] * k, (a[2] || 0) * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => mul(a, 1 / (len(a) || 1));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const ring = (k, f) => ({ pts: Array.from({ length: k }, (_, i) => f((i / k) * TAU)), closed: true });
const rot2 = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

/**
 * Ellipsoid um c mit Halbachsen r = [rx, ry, rz], in der Bildebene um roll gedreht.
 * lat: Höhen (−1…1) der Querschnitt-Reifen; mer: Drehwinkel der Meridiane (0 = Profil zum Publikum hin sichtbar als
 * Linie, π/4 = Globus-Ellipse); silhouette: Umriss in der Bildebene (Standard ja).
 */
export function ellipsoid(tag, c, r, { roll = 0, lat = [], mer = [], silhouette = true, w = 1, solid = true } = {}) {
  const P = (x, y, z) => { const [X, Y] = rot2(x, y, roll); return [c[0] + X, c[1] + Y, (c[2] || 0) + z]; }, cr = Math.cos(roll), sr = Math.sin(roll);
  const lines = [];
  if (silhouette) lines.push(ring(64, (a) => P(Math.cos(a) * r[0], Math.sin(a) * r[1], 0)));
  for (const v of lat) { const k = Math.sqrt(Math.max(0, 1 - v * v)); lines.push(ring(56, (a) => P(Math.cos(a) * r[0] * k, v * r[1], Math.sin(a) * r[2] * k))); }
  for (const m of mer) lines.push(ring(56, (a) => P(Math.cos(a) * Math.cos(m) * r[0], Math.sin(a) * r[1], Math.cos(a) * Math.sin(m) * r[2])));
  return {
    tag, lines, w, solid,
    inside: (p, s = 1) => {
      const dx = p[0] - c[0], dy = p[1] - c[1], z = (p[2] || 0) - (c[2] || 0), big = Math.max(r[0], r[1]);
      if (Math.abs(dx) > big || Math.abs(dy) > big || Math.abs(z) > r[2]) return false;
      const x = dx * cr + dy * sr, y = -dx * sr + dy * cr;
      return (x / r[0]) ** 2 + (y / r[1]) ** 2 + (z / r[2]) ** 2 < s * s;
    },
    /** Punkt auf der Vorderfläche über (x, y) der Bildebene, um lift nach außen versetzt. */
    front: (x, y, lift = 0) => { const [u, v] = rot2(x - c[0], y - c[1], -roll), q = 1 - (u / r[0]) ** 2 - (v / r[1]) ** 2; return [x, y, (c[2] || 0) + r[2] * Math.sqrt(Math.max(0, q)) + lift]; },
  };
}

/**
 * Röhre entlang einer Achse (3D-Polylinie) mit Radius r (Zahl oder Funktion s ∈ [0, 1]); depth: Tiefe relativ zur
 * Breite. Linien: zwei Seitenlinien in der Bildebene, Kammlinie vorn, hoops Querschnitt-Reifen, abgerundete Enden.
 */
export function tube(tag, axis, r, { depth = 1, hoops = 2, crest = true, caps = [true, true], w = 1, solid = true, hoopAt = null } = {}) {
  const R = typeof r === 'function' ? r : () => r;
  const seg = []; let total = 0;
  for (let i = 1; i < axis.length; i++) { const L = len(sub(axis[i], axis[i - 1])); seg.push(L); total += L; }
  const at = (s) => {
    let d = s * total, i = 0;
    while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
    const a = axis[i], b = axis[i + 1], u = seg[i] ? Math.min(1, d / seg[i]) : 0, dir = norm(sub(b, a));
    return { p: add(a, mul(sub(b, a), u)), dir };
  };
  // Querachsen: n in der Bildebene senkrecht zur Achse, b dazu senkrecht (nach vorn)
  const frame = (dir) => { let nn = norm(cross([0, 0, 1], dir)); if (!Number.isFinite(nn[0]) || len(cross([0, 0, 1], dir)) < 1e-6) nn = [1, 0, 0]; const bb = norm(cross(dir, nn)); return [nn, bb[2] < 0 ? mul(bb, -1) : bb]; };
  const K = Math.max(8, Math.ceil(total / 0.02));
  const offset = (side, front) => ({ pts: Array.from({ length: K + 1 }, (_, i) => { const s = i / K, { p, dir } = at(s), [nn, bb] = frame(dir), q = R(s); return add(p, add(mul(nn, side * q), mul(bb, front * q * depth))); }) });
  const lines = [offset(1, 0), offset(-1, 0)];
  if (crest) lines.push(offset(0, 1));
  const hs = hoopAt ?? Array.from({ length: hoops }, (_, i) => (i + 1) / (hoops + 1));
  for (const s of hs) { const { p, dir } = at(s), [nn, bb] = frame(dir), q = R(s); lines.push(ring(28, (a) => add(p, add(mul(nn, Math.cos(a) * q), mul(bb, Math.sin(a) * q * depth))))); }
  caps.forEach((on, e) => {
    if (!on) return;
    const s = e ? 1 : 0, { p, dir } = at(s), [nn, bb] = frame(dir), q = R(s), out = e ? dir : mul(dir, -1);
    lines.push({ pts: Array.from({ length: 13 }, (_, i) => { const a = (i / 12) * Math.PI; return add(p, add(mul(nn, Math.cos(a) * q), mul(out, Math.sin(a) * q))); }) });
    if (crest) lines.push({ pts: Array.from({ length: 7 }, (_, i) => { const a = (i / 6) * (Math.PI / 2); return add(p, add(mul(bb, Math.cos(a) * q * depth), mul(out, Math.sin(a) * q))); }) });
  });
  const cum = [0]; for (const L of seg) cum.push(cum[cum.length - 1] + L);
  const rMax = Math.max(...Array.from({ length: 9 }, (_, i) => R(i / 8))) * Math.max(1, depth);
  const box = [0, 1, 2].map((k) => [Math.min(...axis.map((p) => p[k] || 0)) - rMax, Math.max(...axis.map((p) => p[k] || 0)) + rMax]);
  const inside = (p, sc = 1) => {
    for (let k = 0; k < 3; k++) if ((p[k] || 0) < box[k][0] || (p[k] || 0) > box[k][1]) return false;
    let best = Infinity;
    for (let i = 1; i < axis.length; i++) {
      const a = axis[i - 1], b = axis[i], ab0 = b[0] - a[0], ab1 = b[1] - a[1], ab2 = (b[2] || 0) - (a[2] || 0), L2 = ab0 * ab0 + ab1 * ab1 + ab2 * ab2 || 1e-9;
      const u = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab0 + (p[1] - a[1]) * ab1 + ((p[2] || 0) - (a[2] || 0)) * ab2) / L2));
      const d0 = p[0] - a[0] - ab0 * u, d1 = p[1] - a[1] - ab1 * u, d2 = ((p[2] || 0) - (a[2] || 0) - ab2 * u) / depth;
      best = Math.min(best, Math.hypot(d0, d1, d2) / R((cum[i - 1] + u * seg[i - 1]) / total));
    }
    return best < sc;
  };
  return { tag, lines, w, solid, inside };
}

/**
 * Rotationskörper um die senkrechte Achse durch c aus einem Profil [[r, y], …] (y relativ zu c). meridians: Zahl der
 * Profillinien rundum (die beiden in der Bildebene bilden den Umriss), rings: Höhen der Reifen.
 */
export function revolve(tag, c, profile, { meridians = 6, rings = [], phase = 0, w = 1, solid = true } = {}) {
  const rAt = (y) => { if (y < profile[0][1] || y > profile[profile.length - 1][1]) return -1; for (let i = 1; i < profile.length; i++) if (y <= profile[i][1]) { const [r0, y0] = profile[i - 1], [r1, y1] = profile[i]; return r0 + (r1 - r0) * ((y - y0) / (y1 - y0 || 1)); } return -1; };
  const lines = [];
  for (let k = 0; k < meridians; k++) { const a = phase + (k / meridians) * TAU; lines.push({ pts: profile.map(([r, y]) => [c[0] + Math.cos(a) * r, c[1] + y, (c[2] || 0) + Math.sin(a) * r]) }); }
  for (const y of rings) { const r = rAt(y); if (r > 0) lines.push(ring(48, (a) => [c[0] + Math.cos(a) * r, c[1] + y, (c[2] || 0) + Math.sin(a) * r])); }
  return { tag, lines, w, solid, rAt, inside: (p, s = 1) => { const r = rAt(p[1] - c[1]); return r > 0 && Math.hypot(p[0] - c[0], (p[2] || 0) - (c[2] || 0)) < r * s; } };
}

/** Freie Linien (Fühler, Stöcke, Zickzack); kein Volumen. */
export const curves = (tag, lines, { w = 1 } = {}) => ({ tag, lines: lines.map((l) => (Array.isArray(l) ? { pts: l } : l)), w, solid: false });
/** Punktmerkmal: kleiner Lichtring aus bis zu k Drohnen um p, in der Ebene mit Normale nrm (Standard: zum Publikum).
 * Bei wenigen Drohnen (weite Linienabstände) schrumpft der Ring auf so viele Drohnen, wie mit Abstand hineinpassen,
 * zuletzt auf eine einzelne Drohne in der Mitte. */
export function spot(tag, p, k, rad = 0.028, nrm = [0, 0, 1]) {
  const nn = norm(nrm), u = norm(Math.abs(nn[1]) < 0.9 ? cross([0, 1, 0], nn) : cross([1, 0, 0], nn)), v = cross(nn, u);
  const ring = (m) => (m <= 1 ? [p] : Array.from({ length: m }, (_, i) => { const a = (i / m) * TAU + 0.3; return add(p, add(mul(u, Math.cos(a) * rad), mul(v, Math.sin(a) * rad))); }));
  return { tag, solid: false, spot: { k, rad, ring } };
}

/** Feste Punktgruppe (Konfetti, Funken): genau diese Punkte, ohne Ausdünnung. */
export const cluster = (tag, pts) => ({ tag, solid: false, fixed: pts.map((p) => [p[0], p[1], p[2] || 0]) });
/** Drehung von o um die Achse durch a mit Richtung d (Einheitsvektor) um den Winkel w (Rodrigues). */
export function turnAbout(o, a, d, w) {
  const x = o[0] - a[0], y = o[1] - a[1], z = o[2] - (a[2] || 0), c = Math.cos(w), s = Math.sin(w), k = (d[0] * x + d[1] * y + d[2] * z) * (1 - c);
  o[0] = a[0] + x * c + (d[1] * z - d[2] * y) * s + d[0] * k;
  o[1] = a[1] + y * c + (d[2] * x - d[0] * z) * s + d[1] * k;
  o[2] = (a[2] || 0) + z * c + (d[0] * y - d[1] * x) * s + d[2] * k;
}
/** Ein Teil, im eigenen Rahmen gebaut (Achse = y), in die Bildebene gekippt und verschoben. */
export const posed = (p, r, c) => { const x = p[0] * Math.cos(r) - p[1] * Math.sin(r), y = p[0] * Math.sin(r) + p[1] * Math.cos(r); return [c[0] + x, c[1] + y, (c[2] || 0) + (p[2] || 0)]; };
export const poseLine = (l, r, c) => ({ ...l, pts: l.pts.map((p) => posed(p, r, c)) });
export const posePart = (part, r, c) => ({ ...part, lines: part.lines.map((l) => poseLine(l, r, c)), inside: part.inside && ((p, s) => { const x = p[0] - c[0], y = p[1] - c[1]; return part.inside([x * Math.cos(-r) - y * Math.sin(-r), x * Math.sin(-r) + y * Math.cos(-r), (p[2] || 0) - (c[2] || 0)], s); }) });

/** Polylinie fein abtasten und in sichtbare Stücke teilen (ohne die Stellen in einem anderen Körper). */
function visibleRuns(line, others) {
  const src = line.closed ? [...line.pts, line.pts[0]] : line.pts, dense = [];
  for (let i = 1; i < src.length; i++) {
    const a = src[i - 1], b = src[i], L = len(sub(b, a)), k = Math.max(1, Math.ceil(L / STEP));
    for (let j = i === 1 ? 0 : 1; j <= k; j++) dense.push(add(a, mul(sub(b, a), j / k)));
  }
  const runs = []; let cur = [];
  for (const p of dense) {
    if (others.some((o) => o.inside(p, HIDE))) { if (cur.length > 1) runs.push(cur); cur = []; } else cur.push(p);
  }
  if (cur.length > 1) runs.push(cur);
  // ein geschlossener Ring, der ganz sichtbar ist, bleibt geschlossen (gleichmäßige Abstände über die Naht)
  if (line.closed && runs.length === 1 && runs[0].length === dense.length) return [{ pts: dense.slice(0, -1), closed: true }];
  return runs.map((pts) => ({ pts, closed: false }));
}
const runLength = (runs) => runs.reduce((s, { pts, closed }) => { let L = 0; for (let i = 1; i < pts.length; i++) L += len(sub(pts[i], pts[i - 1])); if (closed) L += len(sub(pts[0], pts[pts.length - 1])); return s + L; }, 0);

/**
 * Teile → genau n Punkte [x, y, z] mit Teilnamen. Feste Merkmale (spot) zählen genau; die übrigen Drohnen verteilen
 * sich nach sichtbarer Linienlänge × Gewicht w, gleichmäßig entlang jeder Linie. Wo Linien sich kreuzen oder an einem
 * Punkt zusammenlaufen (Flügelansatz, Meridiane), fällt die jüngere Drohne weg, und ihr Platz geht an die Linien zurück:
 * keine Drohne steht näher als GAP × Linienabstand an einer anderen.
 */
const GAP = 0.45;
export function assemble(parts, n) {
  const solids = parts.filter((p) => p.solid !== false && p.inside);
  // ganz verdeckte Teile (Klöppel in der Glocke) fallen weg, sonst bekämen sie beim Aufrunden Drohnen ohne Linie
  let seen = parts.filter((p) => p.lines).map((p) => [p, p.lines.flatMap((l) => visibleRuns(l, solids.filter((o) => o !== p)))]);
  // Linienstücke, die kürzer als anderthalb Linienabstände sind, trügen nur eine einzelne, verloren wirkende Drohne
  const est = seen.reduce((s, [p, runs]) => s + runLength(runs) * (p.w ?? 1), 0) / Math.max(1, n);
  seen = seen.map(([p, runs]) => [p, runs.filter((r) => r.closed || runLength([r]) >= 1.5 * est)]).filter(([, runs]) => runLength(runs) > 0);
  const lined = seen.map(([p]) => p), vis = seen.map(([, runs]) => runs);
  const lens = lined.map((p, i) => runLength(vis[i]) * (p.w ?? 1));
  // Merkmale nur so dicht, wie die Linien es sind: Ringpunkte mindestens eine Lücke voneinander entfernt
  const spots = parts.filter((p) => p.spot), want = spots.reduce((s, p) => s + p.spot.k, 0) + parts.reduce((s, p) => s + (p.spot ? 0 : p.fixed?.length ?? 0), 0);
  const gap = GAP * (lens.reduce((a, b) => a + b, 0) / Math.max(1, n - want));
  for (const p of spots) { const { k, rad, ring } = p.spot, fit = Math.floor((2 * Math.PI * rad) / (gap * 1.15)); p.fixed = ring(Math.max(1, Math.min(k, fit < 3 ? 1 : fit))); }
  const fixed = parts.reduce((s, p) => s + (p.fixed?.length ?? 0), 0);
  let budget = n - fixed, best = null;
  for (let round = 0; round < 10; round++) {
    best = thin(parts, lined, vis, share(budget, lens), gap);
    if (best.pts.length >= n) break;
    budget += Math.ceil((n - best.pts.length) * 1.3);
  }
  // sehr selten (fast nur Kreuzungen): die noch fehlenden Drohnen an die freiesten der verworfenen Stellen
  for (const [q, tag] of best.rejected.sort((a, b) => b[2] - a[2]).slice(0, Math.max(0, n - best.pts.length))) { best.pts.push(q); best.tags.push(tag); best.fixedMask.push(false); }
  return trim(best, n);
}
/** Raster für Nachbarschaftsfragen: Zellen der Kantenlänge cell, Zahlenschlüssel statt Zeichenketten. */
function grid(cell) {
  const cells = new Map(), at = (x) => Math.floor(x / cell) + 512, code = (x, y, z) => (x * 1024 + y) * 1024 + z;
  return {
    add(p, i) { const k = code(at(p[0]), at(p[1]), at(p[2])); const c = cells.get(k); if (c) c.push(i); else cells.set(k, [i]); },
    /** nächster Abstand zu einem eingetragenen Punkt (nur Nachbarzellen; weiter weg = Infinity) */
    near(p, list, skip = -1) {
      const gx = at(p[0]), gy = at(p[1]), gz = at(p[2]); let m = Infinity;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        const c = cells.get(code(gx + dx, gy + dy, gz + dz)); if (!c) continue;
        for (const j of c) { if (j === skip) continue; const q = list[j], d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); if (d < m) m = d; }
      }
      return m;
    },
  };
}
function thin(parts, lined, vis, counts, gap) {
  const g = grid(gap || 1), pts = [], tags = [], fixedMask = [], rejected = [];
  const put = (p, tag, fix) => { const q = [p[0], p[1], p[2] || 0]; g.add(q, pts.length); pts.push(q); tags.push(tag); fixedMask.push(fix); };
  // Merkmale zuerst (sie stehen immer), dann die Teile in ihrer Reihenfolge
  for (const p of parts) if (p.fixed) for (const q of p.fixed) put(q, p.tag, true);
  lined.forEach((p, i) => { for (const q of sample3d(vis[i], counts[i])) { q[2] ||= 0; const d = g.near(q, pts); if (d >= gap) put(q, p.tag, false); else rejected.push([q, p.tag, d]); } });
  return { pts, tags, fixedMask, gap, rejected };
}
/** Überzählige Drohnen weg, jeweils die mit dem knappsten Nachbarn (Merkmale bleiben). */
function trim({ pts, tags, fixedMask, gap }, n) {
  const extra = pts.length - n;
  if (extra <= 0) return { pts, tags };
  const g = grid(gap * 2.5); pts.forEach((p, i) => g.add(p, i));
  const near = pts.map((p, i) => g.near(p, pts, i));
  const drop = new Set(pts.map((_, i) => i).filter((i) => !fixedMask[i]).sort((a, b) => near[a] - near[b] || a - b).slice(0, extra));
  return { pts: pts.filter((_, i) => !drop.has(i)), tags: tags.filter((_, i) => !drop.has(i)) };
}

/** Stelle jeder Drohne (0…1) in einem Lichtlauf entlang f (z. B. von oben nach unten); billiger als lightRank. */
export function rankBy(pts, f) {
  const order = pts.map((p, j) => [f(p), j]).sort((a, b) => a[0] - b[0]), rank = new Float64Array(pts.length);
  order.forEach(([, j], k) => { rank[j] = k / Math.max(1, pts.length - 1); });
  return rank;
}
/** Farben je Teilname (Farbe oder Funktion des Punkts). */
export const colour = ({ pts, tags }, map, fallback) => pts.map((p, j) => { const c = map[tags[j]] ?? fallback; return [p[0], p[1], p[2], ...(typeof c === 'function' ? c(p) : c)]; });
/** Schwenk des ganzen Körpers: aus der Dreiviertelansicht base um amp hin und her (Periode in s, Achse durch cx, cz). */
export const turn = (o, t, base, amp, period = 12, cx = 0, cz = 0) => yaw(o, base + amp * Math.sin((t * TAU) / period), cx, cz);
/** Weicher Hin- und Rückweg 0 → 1 → 0 über eine Periode, Start und Ende ohne Geschwindigkeit. */
export const ease = (t, period) => 0.5 - 0.5 * Math.cos((t * TAU) / period);
export { mix, TAU };
/**
 * Runde 9 (Marc: „3D+ offensichtlich komplexer und refinter und more polished“): Stufe einer Fassung. Einfache Motive
 * bauen für '3D' eine schlichte Fassung (Grundkörper, wenig Detail, ruhige Bewegung) und für '3D+' eine aufwendigere
 * (mehr Teile, feinere Silhouette, Story-Bewegung). Ohne Angabe gilt '3D'. Ab 300 Drohnen trägt 3D+ alle Details.
 */
export const isPlus = (stufe, n, min = 300) => stufe === '3D+' && n >= min;
