// „Wo habt ihr das erste Mal von uns gehört?“ (Danke-Seite, Moritz 18.11.2026). Eine Liste für Schema, Seite und API.
// Die Antwort geht als kleine zweite Meldung über /api/contact (kind=quelle), bezogen auf die Anfrage über einen
// Zufallswert aus sessionStorage. Kein Tracking-Dienst, keine Speicherung auf der Website.
export const SOURCE_IDS = ['suchmaschine', 'google-werbung', 'ki', 'linkedin', 'instagram', 'empfehlung', 'andere'];
/** Freitext nur bei „andere“ */
export const SOURCE_OTHER = 'andere';
export const SOURCE_TEXT_MAX = 120;
/** Bezug zur Anfrage: 12 Hex-Zeichen, im Browser erzeugt, steht in beiden Meldungen */
export const INQUIRY_REF = /^[a-f0-9]{12}$/;
export const INQUIRY_REF_KEY = 'fs-anfrage-ref';
/** Erfolgszustand der Herkunftsfrage auf der Danke-Seite. Ohne JavaScript leitet /api/contact auf dieses Sprungziel
 * weiter, das Skript schaltet denselben Zustand ein. */
export const SOURCE_DONE_ID = 'danke-antwort';
