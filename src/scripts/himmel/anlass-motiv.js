// Anlass → Motiv des Schwarms (docs/himmel.md → Bühnenplan): auf der Startseite beim Zeigen auf eine Anlass-Karte,
// im Formular bei der Wahl des Anlasses. Eigenes Modul, damit der Wächter scripts/himmel-anlass-motiv.test.mjs die
// Zuordnung ohne Browser prüft.

/**
 * Anlass → Motiv, über Wörter in Kartenkicker, Link-Ziel oder Formularwert (nie über die Position der Karte).
 * Reihenfolge zählt: Die Agenturen-Karte verlinkt auf die Werbeseite (#agenturen), Silvester auf die Stadt-Anfrage.
 * Gemeinden: Kölner Dom statt Förderturm (Runde 14, Marc: eine Kirche hat jede Gemeinde, damit identifiziert man sich eher).
 * @type {Array<[RegExp, string]>}
 */
export const OCCASION = [
  [/agentur|agenc|bureau/i, 'handschlag'],
  [/silvester|weihnacht|new year|oud en nieuw/i, 'sektflasche'],
  [/hochzeit|privat|wedding|private|bruiloft|prive/i, 'doppelherz'],
  [/konzert|festival|musical|kultur|concert|cultu/i, 'mikrofon'],
  [/indoor|halle/i, 'diskokugel'],
  [/gemeind|st[aä]dt|anlass=stadt|\bstadt\b|cit(y|ies)|town|municipal|gemeente|\bstad\b/i, 'dom'],
  [/unternehm|firma|firmen|marke|werbung|corporate|compan|business|brand|bedrijf|merk|reclame/i, 'sportwagen'],
];

/** Erster Treffer in den Texten nach Vorrang, sonst null. @param {...string} texts */
export const occasionMotif = (...texts) => {
  for (const text of texts) { const hit = OCCASION.find(([re]) => re.test(text)); if (hit) return hit[1]; }
  return null;
};

/**
 * Formularwerte des Felds `anlass` (ContactForm.astro, Schlüssel aus src/content/occasions.json) → Motiv. Runde 14: auf
 * die heutigen Schlüssel umgestellt; die alten (firma, stadt …) gab es im Formular nicht mehr, das Motiv kam nur über die
 * Bezeichnung, und die traf „Bedrijven“ und „Privé“ nicht (Stern statt Sportwagen und Herz).
 * @type {Record<string, string>}
 */
export const FORM_OCCASION = {
  unternehmen: 'sportwagen', agenturen: 'handschlag', gemeinden: 'dom', 'konzerte-festivals': 'mikrofon',
  privat: 'doppelherz', indoor: 'diskokugel', sonstiges: 'stern',
};

/**
 * Motive außerhalb des Katalogs, im Katalogformat vorberechnet unter /media/himmel/<id>.json
 * (tools/himmel/motive-vorberechnen.mjs). Der Kölner Dom ist die Linienzeichnung aus dem Konfigurator
 * (scenes/wahrzeichen.js), abgetastet für 100 Drohnen: so dicht wie die Nachbarmotive (die Abstandsregel lässt 99 stehen).
 * points: Punkte in der Datei (wie im Katalog), drones: Drohnenzahl der Abtastung.
 */
export const HIMMEL_MOTIFS = {
  dom: { dimension: '2D', base: '/media/himmel/', variants: [{ id: 'dom-100', points: 99, drones: 100 }] },
};
