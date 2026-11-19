// „Wo habt ihr das erste Mal von uns gehört?“ (Danke-Seite, Moritz 18.11.2026). Eine Liste für Schema, Seite und API.
// Die Antwort geht als kleine zweite Meldung über /api/contact (kind=quelle), bezogen auf die Anfrage über einen
// Zufallswert aus sessionStorage. Ohne Bezug (direkter Aufruf, ohne JavaScript, neue Sitzung) geht sie ohne `ref`.
// Die Danke-Seite zeigt Dank und Frage immer, auch direkt aufgerufen (Marc, 19.11.2026). Kein Tracking-Dienst, keine
// Speicherung auf der Website.
export const SOURCE_IDS = ['suchmaschine', 'google-werbung', 'ki', 'linkedin', 'instagram', 'empfehlung', 'andere'];
/** Freitext nur bei „andere“ */
export const SOURCE_OTHER = 'andere';
export const SOURCE_TEXT_MAX = 120;
/** Bezug zur Anfrage: 12 Hex-Zeichen, im Browser erzeugt, steht in beiden Meldungen */
export const INQUIRY_REF = /^[a-f0-9]{12}$/;
/** sessionStorage-Schlüssel des Bezugs (nur Korrelation der Herkunftsantwort). Das Anfrageformular schreibt ihn erst
 * nach einem vom Endpoint bestätigten `sent`. */
export const INQUIRY_REF_KEY = 'fs-anfrage-ref';
/** Rückmeldung nach bestätigter Herkunftsantwort, nur per Skript. Ohne JavaScript antwortet /api/contact selbst mit
 * einer Bestätigungsseite; ein frei aufrufbares Sprungziel zeigt nie einen Versand an. */
export const SOURCE_DONE_ID = 'danke-antwort';
