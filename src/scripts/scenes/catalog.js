// Motive aus dem FlyingStars-Motivkatalog (Runde 24, 05.11.2026). Die Punkte sind FlyingStars' eigene Formationen
// (public/media/katalog/, übernommen mit scripts/import-catalog.mjs), Farben wie im Katalog. Die Bewegung ist abgeleitet:
// Der Katalog liefert statische Punkte, keine Flugspuren. Darum bewegen sich nur kleine Teile (Räder, Nadel, Ballons,
// Gläser) oder die ganze Form ruhig um sich selbst, und Licht läuft über die Linien. Nichts davon ist als geflogene
// Choreografie belegt (docs/show-katalog-motive.md).
//
// Drei Fassungen je Motiv, eine je Paket:
// - SPARK: die Formation mit ihrem Bewegungsprofil. Echte 3D-Formationen (Kugel, Spirale, Atom …) drehen sich schon hier;
//   FlyingStars fliegen sie mit 100–160 Drohnen.
// - HORIZON: als Körper. Flache Formationen bekommen eine zweite Ebene dahinter (wie die 3D-Logos) und schwenken, damit
//   man die Tiefe sieht; 3D-Formationen drehen sich mit der größten Variante, die passt.
// - ODYSSEY: eine kurze Geschichte in zwei Akten: Licht zeichnet die Form, dann wird sie zum Körper.
// Drohnen, die die Formation nicht braucht, bleiben dunkel in Reserve (unter dem Bild, zählen nicht für den Ausschnitt).
// Mehr Drohnen wählen die größere Katalogvariante, wo es eine gibt (Ballons 100 → 150, Atom 147 → 162 → 220).
import catalog from '../../content/catalog-motifs.json' with { type: 'json' };
import { TAU, mix, frac, hash, yaw, roll, pitch, sway, breathe, glint, sparkle, chase, trace, wander, lightRank, part, act } from '../show-motion.js';

import { catalogAction } from './catalog-actions.js';
import { analyse, resample, placeDerived, derive, prepareLines, lineSample, attach } from './catalog-resample.js';
import { CATALOG_3D, LIT_MAX } from './catalog-3d/index.js';

const cache = new Map();
/** Formation einer Variante, einmal geladen (fetch auf public/, in Node-Tests aus scripts/show-node-env.mjs). */
function load(id, dir = '') {
  const url = `/media/katalog/${dir}${id}.json`;
  if (!cache.has(url)) cache.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error(`Katalog ${dir}${id}: HTTP ${r.status}`); return r.json(); }).catch((e) => { cache.delete(url); throw e; }));
  return cache.get(url);
}
export const CATALOG = catalog.motifs;
/** Neue Drohnen einer räumlichen Variante für n Drohnen, einmal je Variante und Zahl berechnet (scenes/catalog-resample.js). */
const dense = new Map(), analysed = new Map();
function densify(id, pts, n) {
  const key = `${id}|${n}`;
  if (!analysed.has(id)) analysed.set(id, analyse(pts, { flat: false })); // Linien: einmal je Variante
  if (!dense.has(key)) { if (dense.size > 300) dense.clear(); dense.set(key, resample(pts, n, { flat: false, analysis: analysed.get(id) })); }
  return dense.get(key);
}
/**
 * Flache Variante auf n Drohnen (Runde 7): gleichmäßig auf ihren sauberen Linien (public/media/katalog/linien/, aus
 * scripts/catalog-2d-lines.mjs), Farbe und Elternpunkt vom nächsten Katalogpunkt. Einmal je Variante und Zahl.
 */
const flatCache = new Map(), prepared = new Map();
async function flatForm(id, source, n) {
  const key = `${id}|${n}`;
  if (!flatCache.has(key)) {
    if (!prepared.has(id)) prepared.set(id, load(id, 'linien/').then(prepareLines));
    const L = await prepared.get(id);
    if (flatCache.size > 300) flatCache.clear();
    flatCache.set(key, attach(lineSample(L, n).pts, source));
  }
  return flatCache.get(key);
}
const LINE_SOURCE = { stern: 0 };
/** Aktionen, die nur Lagen lesen (keine Katalogindizes): sie laufen direkt auf den abgetasteten Drohnen. */
const BY_PLACE = new Set(['smiley', 'handschlag']);
/** Profile, deren Motive in SPARK nur Licht bewegen, auch wenn sie räumlich sind (siehe glow, shimmer). */
const LIGHT_ONLY = new Set(['glow', 'shimmer', 'twinkle', 'breathe', 'run', 'confetti', 'rainbow', 'charge']);
const lang = () => { const l = typeof document === 'undefined' ? 'de' : document.documentElement?.lang; return ['de', 'en', 'nl'].includes(l) ? l : 'de'; };
/** Text aus catalog-motifs.json (texts) in der Seitensprache, {name} eingesetzt. */
const say = (key, name) => (catalog.texts[key][lang()] ?? catalog.texts[key].de).replace('{name}', name);
/** Größte Variante mit höchstens `budget` Punkten (null, wenn keine passt). */
export function variantFor(key, budget) {
  const list = CATALOG[key]?.variants ?? [];
  return list.filter((v) => v.points <= budget).at(-1) ?? null;
}
/** Kleinste Drohnenzahl (Zehnerschritt), mit der das Motiv in diesem Paket spielt. */
export function catalogMinDrones(key) {
  const m = CATALOG[key];
  if (!m) throw new Error(`Katalogmotiv ${key} fehlt`);
  // eine Ebene reicht immer (die zweite Ebene kommt nur dazu, wenn die Drohnen dafür reichen)
  return Math.ceil(m.variants[0].points / 10) * 10;
}

/** Dunkle Katalogfarben (Braun, Dunkelgrün) hell genug für den Bildschirm; Farbton bleibt. */
function bright([x, y, z, r, g, b]) {
  const m = Math.max(r, g, b);
  if (m >= 170 || m === 0) return [x, y, z, r, g, b];
  const k = 200 / m;
  return [x, y, z, Math.round(r * k), Math.round(g * k), Math.round(b * k)];
}
/** Reserve: k dunkle Drohnen, die hinter der Form warten (auf ihren Linien, eine Ebene tiefer). Eine Reihe unter dem Bild
 * blitzte beim Start der lebendigen Wolke als Fremdkörper auf; hinter der Form steigen sie aus dem Motiv auf. */
const reserve = (k, form, depth = 0.55) => Array.from({ length: k }, (_, i) => { const p = form[(i * 7) % form.length]; return [p[0], p[1], (p[2] || 0) - depth - 0.04 * (i % 3), 60, 60, 60]; });
/** Ganze Form: Drehung in der Bildebene, die bei t = 0 genau null ist (keine Finte, kein Sprung beim Ankommen). */
const settle = (amp, w) => (t) => amp * (1 - Math.cos(t * w)) / 2; // 0 → amp → 0, Hin- und Rückweg gleich lang

/**
 * Bewegung eines Profils für die Punkte einer Formation (Einheitskoordinaten). Gibt live(b, j, t, o) für die ersten
 * pts.length Drohnen zurück. depthShow: ganze Form drehen (HORIZON/ODYSSEY und echte 3D-Formationen).
 */
function profile(motion, f, pts, { body = false } = {}) {
  const rank = lightRank(pts), g = f.groups ?? {};
  const lift = (j, t) => wander(rank[j], t, 5, 0.35, 0.09);
  const turnAll = (o, t) => { yaw(o, t * 0.32); pitch(o, 0.12 * Math.sin(t * 0.35)); };
  const swayAll = (o, t) => sway(o, t, body ? 0.55 : 0.22, 9);
  switch (motion) {
    case 'drive': {
      // Räder drehen sich um ihre Mitte, die Fahrtlinien hinter dem Wagen leuchten nach hinten ab; der Wagen steht.
      const wheelOf = new Map(); (g.wheels ?? []).forEach((w, k) => w.idx.forEach((j) => wheelOf.set(j, w)));
      const xs = pts.map((p) => p[0]), right = Math.max(...xs);
      return (b, j, t, o) => {
        const w = wheelOf.get(j);
        if (w) roll(o, -t * 2.4, w.cx, w.cy);
        else if (b[0] > right - 0.32 && b[1] > 0.1) o[3] = chase(-b[0], t, 0.9, 0.35, 0.55, 1.45); // Fahrtwind
        else o[3] = glint(b[0], t, 4.2, 0.3);
        if (body) swayAll(o, t);
      };
    }
    case 'needle': {
      // Die Nadel schwingt über die Skala (Gas geben, zurücknehmen), die Skala leuchtet unter der Nadel auf.
      const idx = new Set(g.needle?.idx ?? []), cx = g.needle?.cx ?? 0, cy = g.needle?.cy ?? 0, a = settle(0.9, 0.9);
      return (b, j, t, o) => { if (idx.has(j)) { roll(o, -a(t), cx, cy); o[3] = 1.2; } else o[3] = lift(j, t); if (body) swayAll(o, t); };
    }
    case 'bob': {
      // Jeder Ballon schwebt in eigenem Takt ein wenig auf und ab und pendelt um seine Schnur.
      const of = new Map(); (g.balloons ?? []).forEach((q, k) => q.idx.forEach((j) => of.set(j, [q, k])));
      return (b, j, t, o) => {
        const hit = of.get(j);
        if (hit) { const [q, k] = hit, p = hash(k + 3) * TAU, w = 0.9 + 0.25 * hash(k + 11); o[1] += 0.045 * (Math.sin(t * w + p) - Math.sin(p)); roll(o, 0.05 * (Math.sin(t * w * 0.8 + p) - Math.sin(p)), q.cx, q.base); }
        o[3] = lift(j, t);
        if (body) swayAll(o, t);
      };
    }
    case 'wave': {
      // Fahnen wehen: eine Welle läuft vom Mast nach außen, je weiter vom Mast, desto mehr.
      const x0 = Math.min(...pts.map((p) => p[0]));
      return (b, j, t, o) => { const k = (b[0] - x0) / 2; o[1] += 0.05 * k * (Math.sin(t * 2.2 - b[0] * 5) - Math.sin(-b[0] * 5)); if (body) o[2] += 0.08 * k * Math.sin(t * 1.6 - b[0] * 4); if (body) swayAll(o, t); };
    }
    case 'blossoms': {
      // die Blüten drehen ihre Blätter langsam um die eigene Mitte, gegenläufig (Katalogclip „Zwei Blüten“)
      const of = new Map(); (g.blossoms ?? []).forEach((q, k) => q.idx.forEach((j) => of.set(j, [q, k])));
      return (b, j, t, o) => { const hit = of.get(j); if (hit) roll(o, (hit[1] ? -1 : 1) * t * 0.22, hit[0].cx, hit[0].cy); o[3] = lift(j, t); if (body) pitch(o, 0.4); };
    }
    case 'palm': {
      // die Wedel wiegen sich leicht um die Krone (Katalogclip „Palmeninsel“), dazu läuft Licht über die Wellen
      const idx = new Set(g.fronds?.idx ?? []), cx = g.fronds?.cx ?? 0, cy = g.fronds?.cy ?? 0, a = settle(0.08, 1.1);
      return (b, j, t, o) => { if (idx.has(j)) roll(o, a(t), cx, cy); o[3] = lift(j, t); if (body) swayAll(o, t); };
    }
    case 'sail': {
      // das ganze Schiff wiegt sich auf und ab und ein wenig vor und zurück (Katalogclip „Das Schiff“)
      const a = settle(0.05, 0.9), c = settle(0.025, 0.6);
      return (b, j, t, o) => { o[1] += a(t); o[0] -= c(t); roll(o, 0.02 * Math.sin((t * TAU) / 7)); o[3] = lift(j, t); if (body) swayAll(o, t); };
    }
    // räumliche Muster, die in FlyingStars' Clips vom Licht leben (Atom, Möbius-Schleife, Pyramide): Licht läuft über die
    // Bahnen; erst als Körper (HORIZON, ODYSSEY) dreht sich die Form
    case 'glow': return (b, j, t, o) => { o[3] = wander(rank[j], t, 4.4, 0.45, 0.09) * glint(b[1], t, 5, 0.2, -1.2, 1.2); if (body) turnAll(o, t * 0.8); };
    // Runde 24b, Showformationen: die Batterie lädt (Licht füllt sie von links nach rechts), die Glocke schwingt um ihre Aufhängung
    case 'charge': { const xs = pts.map((p) => p[0]), x0 = Math.min(...xs), w = Math.max(...xs) - x0 || 1; return (b, j, t, o) => { const u = (b[0] - x0) / w, level = (t / 3.2) % 1.25; o[3] = u <= level ? 1.2 : 0.85; if (body) swayAll(o, t); }; }
    case 'bell': { const top = Math.max(...pts.map((p) => p[1])), a = settle(0.12, 1.6); return (b, j, t, o) => { roll(o, a(t) - 0.06 * (1 - Math.cos(t * 0.8)), 0, top); o[3] = lift(j, t); if (body) swayAll(o, t); }; }
    case 'gate': {
      // die Flügel schwingen um ihre Angel nach hinten auf und wieder zu (Katalogclip „Tor“)
      const of = new Map(), a = settle(1.15, 0.55); (g.wings ?? []).forEach((w, k) => w.idx.forEach((j) => of.set(j, [w, k])));
      return (b, j, t, o) => { const hit = of.get(j); if (hit) yaw(o, (hit[1] ? 1 : -1) * a(t), hit[0].hinge, 0); o[3] = lift(j, t); if (body) swayAll(o, t); };
    }
    case 'swirl': return (b, j, t, o) => { roll(o, t * 0.18); o[3] = lift(j, t); if (body) pitch(o, 0.5); };
    // als Körper nur gekippt (feste Neigung zeigt die zweite Ebene), Drehen und Schwenken zugleich ergäben ungleiche Wege
    case 'spin': return (b, j, t, o) => { roll(o, t * 0.12); o[3] = lift(j, t); if (body) pitch(o, 0.45); };
    // kein Dauerfunkeln (Wächter show-clouds: ein funkelnder Stern liest sich als ruhende Wolke): Licht läuft die Zacken entlang
    case 'twinkle': return (b, j, t, o) => { o[3] = wander(rank[j], t, 3.6, 0.5, 0.08); if (body) swayAll(o, t); else roll(o, 0.05 * Math.sin((t * TAU) / 8)); };
    case 'breathe': return (b, j, t, o) => { o[3] = breathe(t, 2.8) * lift(j, t); roll(o, 0.03 * Math.sin((t * TAU) / 7)); if (body) swayAll(o, t); };
    case 'confetti': {
      // Die Kanone steht, das Konfetti glitzert und das Licht schießt aus der Mündung nach oben.
      return (b, j, t, o) => { if (b[1] > 0.1) o[3] = sparkle(j, t, 0.75, 1.45) * chase(-b[1], t, 0.7, 0.6, 0.85, 1.3); else o[3] = lift(j, t); if (body) swayAll(o, t); };
    }
    case 'rainbow': return (b, j, t, o) => { o[3] = chase(b[0], t, 0.45, 0.8, 0.85, 1.35); if (body) swayAll(o, t); };
    case 'glide': return (b, j, t, o) => { o[1] += 0.04 * Math.sin((t * TAU) / 6); roll(o, 0.04 * Math.sin((t * TAU) / 6)); o[3] = lift(j, t); if (body) swayAll(o, t); };
    case 'surf': return (b, j, t, o) => { o[1] += 0.06 * (Math.sin(t * 1.4 - b[0] * 3) - Math.sin(-b[0] * 3)); o[3] = glint(b[0], t, 4, 0.35); if (body) swayAll(o, t); };
    case 'run': return (b, j, t, o) => { o[3] = wander(rank[j], t, 4, 0.5, 0.08); if (body) turnAll(o, t * 0.6); };
    case 'turn': return (b, j, t, o) => { turnAll(o, t); o[3] = glint(b[1], t, 4.4, 0.3, -1.2, 1.2); };
    default: return (b, j, t, o) => { o[3] = lift(j, t); roll(o, 0.025 * Math.sin((t * TAU) / 8)); if (body) swayAll(o, t); };
  }
}

/** Formation auf die Bühne: Farben aufgehellt; flach = alle z auf eine dünne Ebene (die Katalogpunkte sind teils gewölbt). */
function prepare(f, flatten) {
  return f.points.map((p) => bright(flatten ? [p[0], p[1], p[2] * 0.25, p[3], p[4], p[5]] : p));
}

/**
 * Szene eines Katalogmotivs für ein Paket mit n Drohnen. tier: SPARK | HORIZON | ODYSSEY.
 * Jedes Bild hat genau n Drohnen; was die Formation nicht braucht, wartet dunkel hinter der Form.
 * Runde 25 (Marc, 07.11.2026: die verdoppelte Ebene wirkt „uncanny“): keine zweite Ebene mehr. 3D-Formationen aus dem
 * Katalog (Kugel, Spirale, Atom …) drehen sich ab HORIZON; flache Formationen spielen ab Runde 25b auch in HORIZON und
 * ODYSSEY, als Formation mit der größten passenden Variante, nach den 3D-Motiven. ODYSSEY zeichnet jede zuerst mit Licht.
 */
export async function catalogScene(key, tier, n, caption) {
  const m = CATALOG[key];
  if (!m) throw new Error(`Katalogmotiv ${key} fehlt`);
  if (tier !== 'SPARK' && CATALOG_3D[key]) return bodyScene(key, tier, n, m.name[lang()] ?? m.name.de);
  const deep = m.dimension === '3D', name = m.name[lang()] ?? m.name.de;
  // Runde 7: einzelne flache Motive zeichnen ihre Linien immer aus der klarsten Variante (Stern: die größere Variante hat
  // doppelte Binnenlinien), die Drohnenzahl bestimmt nur die Liniendichte
  const v = LINE_SOURCE[key] != null && !deep && n >= m.variants[LINE_SOURCE[key]].points ? m.variants[LINE_SOURCE[key]] : variantFor(key, n);
  if (!v) throw new Error(`Katalogmotiv ${key}: keine Variante für ${n} Drohnen`);
  const f = await load(v.id), source = prepare(f, !deep);
  let front, fit, live, drawLive, hold, parents;
  if (deep) {
    // räumliche Formationen: Katalogpunkte behalten Platz und Index, neue Drohnen zeichnen die Linien nach (derive())
    const derived = densify(v.id, source, n), order = lightRank(source);
    front = derived.length ? [...source, ...placeDerived(source, derived)] : source;
    fit = front;
    live = derive(profile(m.motion, f, source, { body: tier !== 'SPARK' || !LIGHT_ONLY.has(m.motion) }), source, derived);
    drawLive = derive((b, j, t, o) => { o[3] *= trace(order[j], t, 2.2); }, source, derived);
  } else {
    // Runde 7 (Marc, 19.11.2026): flache Motive gleichmäßig auf sauberen Linien, Liniendichte aus der Drohnenzahl. Jede
    // Drohne bewegt sich wie ihr nächster Katalogpunkt: Profile rechnen mit der eigenen Lage und der Gruppe des Elternpunkts
    // (Räder, Nadel, Flügel drehen exakt), Aktionen mit Katalogindizes verschieben die Drohne wie ihren Elternpunkt.
    const { pts: sampled, parent } = await flatForm(v.id, source, n);
    const byPlace = BY_PLACE.has(key) ? catalogAction(key, f, sampled) : null;
    const action = byPlace ?? catalogAction(key, f, source);
    let base;
    if (byPlace) { base = byPlace.pts ?? sampled; live = byPlace.live; }
    else if (action) {
      const start = action.pts ?? source, tmp = [0, 0, 0, 1];
      base = sampled.map((p, j) => { const q = start[parent[j]], r = source[parent[j]]; return [p[0] + q[0] - r[0], p[1] + q[1] - r[1], p[2] + (q[2] || 0) - (r[2] || 0), p[3], p[4], p[5]]; });
      live = (b, j, t, o) => {
        const a = parent[j], q = start[a];
        tmp[0] = q[0]; tmp[1] = q[1]; tmp[2] = q[2] || 0; tmp[3] = 1;
        action.live(q, a, t, tmp);
        o[0] += tmp[0] - q[0]; o[1] += tmp[1] - q[1]; o[2] += tmp[2] - (q[2] || 0); o[3] *= tmp[3];
      };
    } else {
      base = sampled;
      const own = profile(m.motion, f, source, { body: false });
      live = (b, j, t, o) => own(b, parent[j], t, o);
    }
    front = base;
    fit = action ? [...base, ...base.map((p, j) => { const o = [...p.slice(0, 3), 1]; live(p, j, action.duration, o); return o.slice(0, 3); })] : base;
    const order = lightRank(base);
    drawLive = (b, j, t, o) => { if (action) live(b, j, 0, o); o[3] *= trace(order[j], t, 2.2); };
    hold = action?.duration;
    parents = parent;
  }
  const rest = reserve(n - front.length, front), k = front.length;
  const run = (b, j, t, o) => { if (j >= k) { o[3] = 0; return; } live(b, j, t, o); };
  const extra = { ...(hold ? { hold } : {}), ...(parents ? { parents } : {}) };
  if (tier !== 'ODYSSEY') return { beats: [{ pts: [...front, ...rest], fitPts: fit, caption, live: run, shimmer: false, ...extra }] };
  return { beats: [
    act([part('form', front), part('reserve', rest, { offstage: true })], { caption: say('lightDraws', name), hold: 1.6, live: (b, j, t, o) => { if (j >= k) { o[3] = 0; return; } drawLive(b, j, t, o); } }),
    act([part('form', front), part('reserve', rest, { offstage: true })], { caption: say('comesAlive', name), clock: hold ? undefined : 'continue', fitPts: fit, ...extra, live: run }),
  ] };
}

// Runde 6 (Marc, 18.11.2026: „proper 3D versions of each motif … not just adding a second plane“): eigene 3D-Fassungen
// (scenes/catalog-3d/, Methode in docs/katalog-3d.md) für die Show-Arten 3D und Storytelling. Die Figur wird einmal je
// Drohnenzahl gebaut und zwischengespeichert; Drohnen über LIT_MAX warten dunkel hinter der Form.
const bodies = new Map();
function body3d(key, k) {
  const id = `${key}|${k}`;
  if (!bodies.has(id)) {
    if (bodies.size > 40) bodies.clear();
    // Die Punkte sind die Ruhelage bei t = 0 (Dreiviertelansicht, Hut auf dem Kopf …), damit jede Drohne genau auf ihrem
    // Platz startet; die Bewegung rechnet weiter vom Bauzustand aus.
    const { pts: built, live } = CATALOG_3D[key](k);
    const pts = built.map((p, j) => { const o = [p[0], p[1], p[2], 1]; live(p, j, 0, o); return [o[0], o[1], o[2], p[3], p[4], p[5]]; });
    bodies.set(id, { pts, live: (b, j, t, o) => { const q = built[j]; o[0] = q[0]; o[1] = q[1]; o[2] = q[2]; live(q, j, t, o); } });
  }
  return bodies.get(id);
}
function bodyScene(key, tier, n, name) {
  const k = Math.min(n, LIT_MAX), { pts: front, live } = body3d(key, k), rest = reserve(n - k, front);
  const run = (b, j, t, o) => { if (j >= k) { o[3] = 0; return; } live(b, j, t, o); };
  // im Bild bleibt, was der Körper beim Schwenken überstreicht
  const fit = [0, 2, 4, 6, 8, 10].flatMap((t) => front.map((p, j) => { const o = [p[0], p[1], p[2], 1]; live(p, j, t, o); return o.slice(0, 3); }));
  const beat = { pts: [...front, ...rest], fitPts: fit, live: run, shimmer: false, catalog3d: true };
  if (tier !== 'ODYSSEY') return { beats: [{ ...beat, caption: say('body', name) }] };
  const order = lightRank(front);
  return { beats: [
    { ...beat, caption: say('lightDraws', name), hold: 1.6, live: (b, j, t, o) => { if (j >= k) { o[3] = 0; return; } live(b, j, 0, o); o[3] *= trace(order[j], t, 2.2); } },
    { ...beat, caption: say('comesAlive', name) },
  ] };
}
