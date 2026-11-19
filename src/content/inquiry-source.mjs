// „Wo habt ihr das erste Mal von uns gehört?“ (Danke-Seite, Moritz 18.11.2026). Eine Liste für Schema, Seite und API.
// Die Antwort geht als kleine zweite Meldung über /api/contact (kind=quelle), bezogen auf die Anfrage über einen
// Zufallswert aus sessionStorage. Kein Tracking-Dienst, keine Speicherung auf der Website.
export const SOURCE_IDS = ['suchmaschine', 'google-werbung', 'ki', 'linkedin', 'instagram', 'empfehlung', 'andere'];
/** Freitext nur bei „andere“ */
export const SOURCE_OTHER = 'andere';
export const SOURCE_TEXT_MAX = 120;
/** Bezug zur Anfrage: 12 Hex-Zeichen, im Browser erzeugt, steht in beiden Meldungen */
export const INQUIRY_REF = /^[a-f0-9]{12}$/;
/** sessionStorage-Schlüssel des Bezugs (nur Korrelation der Herkunftsantwort). Das Anfrageformular schreibt ihn erst
 * nach einem vom Endpoint bestätigten `sent`. */
export const INQUIRY_REF_KEY = 'fs-anfrage-ref';
/** Einmal-Merkmal für den Übergang Anfrage → Danke-Seite (Zeitstempel, ms), getrennt vom Bezug: das Anfrageformular
 * setzt es nach bestätigtem `sent`, die Danke-Seite verbraucht es beim Anzeigen. Nur dann zeigt sie Eingang und
 * Herkunftsfrage; ein späterer oder direkter Aufruf (neuer Tab, Lesezeichen, Neuladen) ist neutral. */
export const INQUIRY_SENT_KEY = 'fs-anfrage-gesendet';
/** So lange nach dem bestätigten Versand gilt das Merkmal (die Weiterleitung folgt nach 2,4 s) */
export const INQUIRY_SENT_TTL = 120_000;
/** Merkmal der Danke-Section im ausgelieferten HTML. Ohne JavaScript setzt /api/contact daneben `data-sent`, wenn es
 * die Seite nach bestätigtem Versand selbst ausliefert. */
export const THANKS_STATE_ATTR = 'data-thanks';
/** Rückmeldung nach bestätigter Herkunftsantwort, nur per Skript. Ohne JavaScript antwortet /api/contact selbst mit
 * einer Bestätigungsseite; ein frei aufrufbares Sprungziel zeigt nie einen Versand an. */
export const SOURCE_DONE_ID = 'danke-antwort';
