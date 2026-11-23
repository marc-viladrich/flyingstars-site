import catalog from '../../content/catalog-motifs.json' with { type: 'json' };

export const lang = () => { const l = typeof document === 'undefined' ? 'de' : document.documentElement?.lang; return ['de', 'en', 'nl'].includes(l) ? l : 'de'; };
/** Text aus catalog-motifs.json (texts) in der Seitensprache, {name} eingesetzt. */
export const say = (key, name) => (catalog.texts[key][lang()] ?? catalog.texts[key].de).replace('{name}', name);

export const reserve = (k, form, depth = 0.55) => Array.from({ length: k }, (_, i) => { const p = form[(i * 7) % form.length]; return [p[0], p[1], (p[2] || 0) - depth - 0.04 * (i % 3), 60, 60, 60]; });
/** Ganze Form: Drehung in der Bildebene, die bei t = 0 genau null ist (keine Finte, kein Sprung beim Ankommen). */
/** Ende des Nadelwegs (wie NEEDLE_PEAK in catalog-3d/technik.js): rechts oben, kurz vor dem roten Bereich. */
