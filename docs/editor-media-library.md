# Medienbibliothek im Editor

Stand 15.10.2026. Gilt für den Bildwähler („Bild wählen“) und für „Inhalte verwalten → Medien“.

## Entscheidungen

- **Ein Resolver für Verwendungen**: `editor/web/media-usage.mjs`. Server (`GET /editor/api/media`, Löschschutz in `NativeStore.references`) und Browser nutzen dieselbe Funktion. Der Browser rechnet aus `draft.records()`, deshalb zählen ungespeicherte Bildwechsel sofort. Der Endpunkt liefert denselben Blick auf den gespeicherten Entwurf (`basis: 'saved-draft'`).
- **Was als Verwendung zählt**: ein Bildobjekt mit `assetId` (voll `media/x` oder kurz `x`), sonst mit identischer `src`; ein Markdown-Bild `![…](src)` in einem Textfeld. Ein Bildobjekt ist eine Verwendung, auch wenn `assetId` und `src` beide passen. Medien-Datensätze zählen nie als Verwender. Eine `.src` ohne passenden Medien-Datensatz (Formations-JSON, Video) ist kein Medium.
- **Sammlungen** folgen dem Typ des Datensatzes, der das Bild direkt verwendet. Ein Kundenlogo bleibt in „Kunden“, auch wenn eine Seite den Kunden zeigt. Ein Bild in mehreren Typen steht in mehreren Sammlungen. Eine Sprachfassung zählt zum Typ ihrer Quelle. Gezeigt werden nur Sammlungen mit Inhalt, flach, plus „Alle“ und „Nicht verwendet“.
- **Bezeichnungen** kommen aus `editor/web/record-kinds.mjs` (Einzahl, Icon, Mehrzahl). Die Datei ist die einzige Typ-Bezeichnungsliste für Editor und Server.
- **Bildwähler** startet in der Sammlung des bearbeiteten Datensatzes (Teamporträt → „Team“), falls vorhanden, sonst „Alle“. Das aktuell gewählte Bild ist markiert und im Blick.
- **Hochgeladene Bilder** bekommen einen lesbaren Titel aus dem Dateinamen (`mediaTitle` in `editor/media-upload.mjs`) und erscheinen unter „Nicht verwendet“, bis sie verwendet werden.

## Prüfen

- `node --test editor/media-usage.test.mjs`: Resolver-Fälle, API-Form gegen den echten Bestand, Sweep „jedes Medium landet in einer Sammlung“, Löschschutz.
- Im Browser (Chromium und WebKit): Medien öffnen, Sammlungen und Zahlen prüfen, Kachel öffnen → „Verwendet in“ springt zum Datensatz, Bild ersetzen per Tastatur (Pfeiltasten, Enter), Rückgängig, Hochladen.
