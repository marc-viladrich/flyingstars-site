// Texte am Himmel des Formulars (docs/himmel.md → Bühnenplan, Formular). Entwürfe, nicht mit FlyingStars abgestimmt.
// Eigenes Modul, damit tools/himmel/texte-vorberechnen.mjs und der Wächter scripts/himmel-formular-auftakt.test.mjs
// dieselben Worte nutzen wie der Schwarm (schwarm.ts).

/** @typedef {'de' | 'en' | 'nl'} Lang */

export const SKY = {
  de: { start: 'EURE SHOW', day: 'EUER TAG', days: (/** @type {number} */ n) => `NOCH ${n} TAGE`, thanks: 'DANKE' },
  en: { start: 'YOUR SHOW', day: 'YOUR DAY', days: (/** @type {number} */ n) => `${n} DAYS TO GO`, thanks: 'THANK YOU' },
  nl: { start: 'JULLIE SHOW', day: 'JULLIE DAG', days: (/** @type {number} */ n) => `NOG ${n} DAGEN`, thanks: 'BEDANKT' },
};

/** Drohnenzahl der festen Worte (vorberechnet in public/media/himmel/texte-*.json). */
export const START_COUNT = 200;

const MONTHS = {
  en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
  nl: ['JAN', 'FEB', 'MRT', 'APR', 'MEI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEC'],
};

/**
 * Ein Datum am Himmel, so geschrieben, wie man es in der Sprache liest: deutsch 21.11.26, englisch 21 NOV 2026,
 * niederländisch 21 NOV 2026 (Monatskürzel nach Taalunie: MRT, MEI, OKT). Monat 1–12.
 * @param {Lang} lang @param {number} y @param {number} mo @param {number} d
 */
export function skyDate(lang, y, mo, d) {
  if (lang === 'de') return `${String(d).padStart(2, '0')}.${String(mo).padStart(2, '0')}.${String(y).slice(2)}`;
  return `${d} ${MONTHS[lang][mo - 1]} ${y}`;
}

/**
 * Auftakt des Formular-Himmels (Runde 14, Marc: man soll sofort sehen, dass der Text variabel ist): einmal je
 * Seitenaufruf EURE SHOW → EUER TAG → das heutige Datum → EURE SHOW, danach steht der Start. Der Schwarm spielt die Folge
 * erst, wenn das Himmelsfenster ganz im Blick ist; jede Eingabe ersetzt sie, reduzierte Bewegung zeigt nur den Start.
 * @param {Lang} lang @param {Date} [today]
 */
export function introTexts(lang, today = new Date()) {
  const t = SKY[lang];
  return [t.start, t.day, skyDate(lang, today.getFullYear(), today.getMonth() + 1, today.getDate()), t.start];
}

/** Haltezeiten des Auftakts in ms: wie lange der Start ganz im Blick steht, bevor er wechselt, danach je Bild. */
export const INTRO_HOLD = { first: 1800, next: 2600 };
