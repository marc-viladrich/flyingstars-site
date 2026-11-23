import catalog from '../../content/catalog-motifs.json' with { type: 'json' };
import { bodyBuilder } from './catalog-3d/load.js';
import { lang } from './catalog-beat.js';
import { once } from './load-once.js';

const cache = new Map();
/** Formation einer Variante, einmal geladen (fetch auf public/, in Node-Tests aus scripts/show-node-env.mjs). */
function load(id, dir = '') {
  const url = `/media/katalog/${dir}${id}.json`;
  if (!cache.has(url)) cache.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error(`Katalog ${dir}${id}: HTTP ${r.status}`); return r.json(); }).catch((e) => { cache.delete(url); throw e; }));
  return cache.get(url);
}
export const CATALOG = catalog.motifs;
const LINE_SOURCE = { stern: 0 };
/** Variante, die ein Motiv bei n Drohnen zeichnet (flache Motive mit LINE_SOURCE immer aus derselben). */
export function flatVariant(key, n) {
  const m = CATALOG[key];
  if (LINE_SOURCE[key] != null && m.dimension !== '3D' && n >= m.variants[LINE_SOURCE[key]].points) return m.variants[LINE_SOURCE[key]];
  // Runde 10 (Marc: „einige von den 110er/120er Motiven auf die 100-Drohnen-Kategorie runterbringen“): flache Motive zeichnen
  // ihre Linien mit jeder Drohnenzahl, auch unter der Punktzahl der kleinsten Variante (Freigabe je Motiv: SPARK_AB in content/show-configurator.js)
  return variantFor(key, n) ?? (m.dimension !== '3D' ? m.variants[0] : null);
}
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

const loadBody = once(() => import('./catalog-body.js'));
const loadPoints = once(() => import('./catalog-points.js'));
const loadActions = once(() => import('./catalog-actions.js'));
const flatActions = new Set(['smiley', 'handschlag', 'zahnraeder', 'anstossen', 'konfetti']);
const noAction = () => null;

/** Lädt Geometrie und Renderer parallel. Die Szene entsteht erst beim Aufruf. */
export async function prepareCatalogScene(key, tier, n) {
  const m = CATALOG[key];
  if (!m) throw new Error(`Katalogmotiv ${key} fehlt`);
  const name = m.name[lang()] ?? m.name.de;
  const body = tier !== 'SPARK' && bodyBuilder(key);
  if (body) {
    const [{ bodyScene }, builder] = await Promise.all([loadBody(), body()]);
    return () => bodyScene(builder, key, tier, n, name);
  }
  const v = flatVariant(key, n);
  if (!v) throw new Error(`Katalogmotiv ${key}: keine Variante für ${n} Drohnen`);
  const flat = m.dimension !== '3D';
  const [{ pointScene }, f, lines, actions] = await Promise.all([
    loadPoints(), load(v.id), flat ? load(v.id, 'linien/') : null,
    flat && flatActions.has(key) ? loadActions() : null,
  ]);
  return (caption) => pointScene({ key, tier, n, caption, m, name, id: v.id, f, lines, catalogAction: actions?.catalogAction ?? noAction });
}

export async function catalogScene(key, tier, n, caption) {
  return (await prepareCatalogScene(key, tier, n))(caption);
}
