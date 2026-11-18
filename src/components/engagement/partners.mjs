// Motive der Partnerschaften auf /nachhaltigkeit/ (#referenzen), nach dem Titel des Eintrags (Moritz' Texte bleiben im
// YAML). photo = Showfoto aus dem Galerie-Manifest, formation = Kampagnenname als Drohnenformation (formations.json).
// Für Kein Bock auf Nazis gibt es (Stand 18.11.2026) kein Showfoto im Bestand; sobald eins kommt, hier eintragen.
/** @typedef {{formation?: string, photo?: {slug: string, pos: string}}} PartnerVisual */
/** @type {Record<string, PartnerVisual | undefined>} */
const PARTNER_VISUALS = {
  'KEIN BOCK AUF NAZIS': { formation: 'KEIN BOCK AUF NAZIS' },
  '#BÖLLERCIAO': { photo: { slug: 'boellerciao-1', pos: '50% 40%' }, formation: '#BÖLLERCIAO' },
};

/** @param {string} title @returns {PartnerVisual} */
export function partnerVisual(title) {
  return PARTNER_VISUALS[title.toUpperCase()] ?? {};
}

/** „seit 2025“ → { prefix: 'seit', year: '2025' }; andere Werte bleiben ungeteilt. */
export function splitSince(value) {
  if (typeof value !== 'string') return null;
  const m = /^(.*?)\s*(\d{4})$/.exec(value.trim());
  return m ? { prefix: m[1], year: m[2] } : null;
}
