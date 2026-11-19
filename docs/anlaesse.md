# Anlässe: eine zentrale Liste

Stand 19.11.2026 (Marc: „Wir sollten überall die gleichen Kategorien wählen … centrally defined“).

## Quelle

`src/content/occasions.json`, Schema `src/schemas/occasions.mjs`, Zugriff nur über `src/content/occasions.mjs`.
Im Editor als Sammlung „Anlässe“ (`site/occasions`) registriert.

| Schlüssel | DE (Karten, Filter, Formular) | Menü/Footer (`menuLabel`) | `page` / `href` |
|---|---|---|---|
| `unternehmen` | Unternehmen | Marken & Werbung | page /drohnenshow-werbung/ |
| `agenturen` | Agenturen | – | page /drohnenshow-werbung/#agenturen (nur Menü, nicht Footer) |
| `gemeinden` | Gemeinden | – | – → /kontakt/?anlass=gemeinden |
| `konzerte-festivals` | Konzerte & Festivals | – | href /musikalischer-teaser-bokkenrijders/ |
| `privat` | Privat | Hochzeit | page /drohnenshow-hochzeit/ |
| `indoor` | Indoor | – | page /drohnenshow-indoor/ |
| `sonstiges` | Sonstiges | – | – (Sammelanlass, z. B. Protest-/Aktivismus-Shows wie Böllerciao; keine Startseiten-Karte) |

**Menü-Regel (Marc, 19.11.2026):** Ein Anlass steht automatisch im Menü „Anlässe“, sobald `page` gesetzt ist, in der
Reihenfolge der Liste, mit `menuLabel` (falls gesetzt) statt der Anlass-Bezeichnung. Der Footer zeigt dieselben Einträge
ohne #Abschnitt, alphabetisch. Bekommen Gemeinden oder Konzerte & Festivals eine eigene Seite: `page` setzen (und `href`
entfernen), fertig. `page` und `href` schließen sich aus.

## Wer liest die Liste

- Menü „Anlässe“: `navigation.json` trägt nur `"occasions": true`, `site.config.ts` füllt die Unterpunkte (`menuOccasions`).
- Footer „Anlässe“: `Base.astro` (`footerOccasions`). Das frühere `navLabel` der Anlass-Seiten ist entfernt.
- Startseiten-Karten: `occasion: <schlüssel>` an der Karte; Kicker und Linkziel kommen aus der Liste (`Occasions.astro`).
- Referenzen: `occasion` (Hauptanlass, Pflicht) und optional `moreOccasions` an jeder Referenz, in DE/EN/NL gleich.
  Der Filter (`References.astro`) zeigt eine Show unter jedem ihrer Anlässe; Anlässe ohne Referenz erscheinen nicht.
- Fallstudien-CTA: `/?anlass=<hauptanlass>#anfrage` (`CaseStudy.astro`).
- Anfrageformular (`ContactForm.astro`): Optionen = die Liste (inkl. Sonstiges). Auf einer Anlass-Seite ist ihr Anlass schon im
  HTML gewählt (auch ohne JS). `?anlass=` in der Adresse gewinnt (`src/scripts/contact.ts`), ändern bleibt frei.
- Formular-Function (`functions/api/contact.ts`): prüft die Schlüssel, Mail zeigt `anlass: Gemeinden (gemeinden)`.
- Konfigurator: eigene Motivfolgen, abgebildet über `CONFIGURATOR_FORM_MAP` in `occasions.mjs`.
- Referenzfilter und Formular teilen die Schlüssel: `/referenzen/?anlass=agenturen` filtert, `/kontakt/?anlass=agenturen` wählt vor.

## Neuer Anlass

Eintrag in `occasions.json` (Schlüssel, drei Bezeichnungen, `page` oder `href`, optional `menuLabel`), eine Karte auf der Startseite mit
`occasion: <schlüssel>`, Referenzen zuordnen. Sonst nichts. Wächter: `node --test scripts/occasions.test.mjs`.

## Grenze ohne JavaScript

Statische Seite: der Query-Parameter einer Fallstudie (`/?anlass=…#anfrage`) wird nur mit JS ausgewertet. Ohne JS
funktioniert das Formular, die Vorauswahl fehlt dann. Anlass-Seiten wählen ohne JS vor.

## Übersetzungsnachweis

Seiten mit Projektverweisen (Startseite, Werbung) hängen im Sprachvertrag am ganzen Projektdatensatz. Die Umschlüsselung
der Projekte hat deshalb dort alle Feld-Fingerprints verschoben. Sie wurden am 19.11.2026 per Skript neu verankert, nachdem
bewiesen war: alter Stand gültig, Texte unverändert, Abhängigkeiten nur in `occasion`/`moreOccasions` verschieden.
Status (`adopted-existing`/`reviewed`) blieb unverändert. Zweite Runde (Böllerciao → sonstiges, AirPower24 → unternehmen,
`navLabel` der drei Anlass-Seiten entfernt) genauso: Startseite und Anlass-Seiten EN/NL neu verankert.
