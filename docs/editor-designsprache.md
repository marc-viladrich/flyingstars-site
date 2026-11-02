# Editor nach der Designzusammenführung

Der Designstand verwendet vollständige Sprachdateien und eingebettete Section-Daten. Das bisherige AFE-Modell mit eigenständigen Paket-, Team-, Kunden-, Medien-, UI- und Übersetzungs-Records würde Änderungen an inzwischen ungenutzten Daten anbieten. Diese Datensätze werden deshalb im aktiven Adapter nicht mehr registriert. Ihre bisherigen Erweiterungen und Tests bleiben als Migrationsmaterial erhalten.

`editor/flyingstars-adapter.mjs` importiert die tatsächlichen vier Collection-Schemas und die Section-Union aus `src/schemas/content-schema.mjs`. Es gibt keine zweite Section-/Feldliste. `project-showcase.mjs` ist ebenfalls die gemeinsame Quelle für Astro und Editor.

Der reguläre Start verweigert den Betrieb mit einer deutschen Fehlermeldung. Ein ausdrücklich eingeschränkter Testbetrieb ist mit `AFE_DESIGN_EDITOR=source npm run editor` möglich, Node 24.15+ erforderlich. Er zeigt bestehende DE-, EN- und NL-Dateien als getrennte Records und ihre Schemafelder. Er unterstützt Feldänderungen und Markdown. Neue Records, Löschen und strukturelles Einfügen/Umsortieren sind nicht freigegeben.

Eine DE-Änderung muss zusammen mit den beiden geprüften EN-/NL-Records gespeichert werden. Andernfalls antwortet die Schreibgrenze mit HTTP 409 und benennt die fehlenden Records. Der Adapter berechnet die beiden `translationSourceHash`-Werte aus den tatsächlichen deutschen Codec-Ausgabebytes. Der Hash ist kein frei editierbares Feld. Der bestehende Build prüft die Sprachdateien erneut. Änderungen an EN/NL allein bleiben möglich.

Noch nicht migriert und im aktiven Adapter nicht angeboten:

- Inline-/Canvas-Bearbeitung und Vorschau-DOM-Marker des neuen Designs.
- Mediathek-Uploads und die bisherigen verknüpften Medienrecords. Bild-URLs und Alt-Texte sind gewöhnliche Schemafelder.
- Automatische Übersetzung, Overlay-Review und Übersetzungsspeicher. Die bestehenden EN-/NL-Dateien sind die gültigen Übersetzungen.
- Redaktionelle Bearbeitung der TS-/JS-Paketdaten, UI-Wörterbücher und Navigation.
- Anlage/Löschung von Sprachtripeln, Strukturänderungen und automatische Übertragung von DE-Strukturänderungen.

Die bisherigen Integrationstests prüfen teilweise entfernte Datensätze und Imports. Sie bleiben ausführbar und werden nicht übersprungen, um eine grüne CI vorzutäuschen. Der neue Test `editor/design-schema.test.mjs` prüft das aktuelle Modell einschließlich realer Git-Speichertransaktionen. Solange die alte Suite und der vollständige Editorpfad nicht migriert sind, ist dieser Branch nicht zur Produktionsfreigabe empfohlen. Ergebnisse stehen im Mergebericht.

Die CI und Deploy-Workflows von main bleiben erhalten. `npm run ci` darf bei Editorfehlern weiterhin fehlschlagen. Ein Push nach main würde unabhängig davon den Cloudflare-Deploy starten. Deshalb den Branch erst nach Behebung der offenen Editor-/CI-Punkte freigeben.
