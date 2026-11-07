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

const cache = new Map();
/** Formation einer Variante, einmal geladen (fetch auf public/, in Node-Tests aus scripts/show-node-env.mjs). */
function load(id) {
  if (!cache.has(id)) cache.set(id, fetch(`/media/katalog/${id}.json`).then((r) => { if (!r.ok) throw new Error(`Katalog ${id}: HTTP ${r.status}`); return r.json(); }).catch((e) => { cache.delete(id); throw e; }));
  return cache.get(id);
}
export const CATALOG = catalog.motifs;
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
    case 'clink': {
      // Zwei Gläser kippen um ihren Fuß zueinander und stoßen an, dazu ein feiner Schein (wie die eigenen Sektgläser).
      const left = new Set(g.glasses?.[0]?.idx ?? []), base = Math.min(...pts.map((p) => p[1]));
      return (b, j, t, o) => { const side = left.has(j) ? -1 : 1; roll(o, side * 0.07 * Math.sin((Math.PI * t) / 3) ** 8, side * 0.5, base); o[3] = lift(j, t); if (body) swayAll(o, t); };
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
 * Runde 25 (Marc, 07.11.2026: die verdoppelte Ebene wirkt „uncanny“, lieber eine schönere 3D-Darstellung oder ein
 * anderes Motiv): Flache Formationen spielen nur in SPARK. HORIZON und ODYSSEY zeigen nur Formationen, die im Katalog
 * selbst räumlich sind (Kugel, Spirale, Atom …), mit der größten passenden Variante; ODYSSEY zeichnet sie zuerst mit Licht.
 */
export async function catalogScene(key, tier, n, caption) {
  const m = CATALOG[key];
  if (!m) throw new Error(`Katalogmotiv ${key} fehlt`);
  const deep = m.dimension === '3D', name = m.name[lang()] ?? m.name.de;
  if (tier !== 'SPARK' && !deep) throw new Error(`Katalogmotiv ${key} ist flach und spielt nur in SPARK`);
  const v = variantFor(key, n);
  if (!v) throw new Error(`Katalogmotiv ${key}: keine Variante für ${n} Drohnen`);
  const f = await load(v.id), front = prepare(f, !deep);
  const live = profile(m.motion, f, front, { body: tier !== 'SPARK' || (deep && !LIGHT_ONLY.has(m.motion)) });
  const rest = reserve(n - front.length, front), k = front.length;
  const run = (b, j, t, o) => { if (j >= k) { o[3] = 0; return; } live(b, j, t, o); };
  if (tier !== 'ODYSSEY') return { beats: [{ pts: [...front, ...rest], fitPts: front, caption, live: run, shimmer: false }] };
  const order = lightRank(front);
  return { beats: [
    act([part('form', front), part('reserve', rest, { offstage: true })], { caption: say('lightDraws', name), hold: 1.6, live: (b, j, t, o) => { if (j >= k) { o[3] = 0; return; } o[3] = trace(order[j], t, 2.2); } }),
    act([part('form', front), part('reserve', rest, { offstage: true })], { caption: say('comesAlive', name), clock: 'continue', live: run }),
  ] };
}
