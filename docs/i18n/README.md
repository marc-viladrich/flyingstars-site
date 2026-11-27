# Übersetzungsvertrag Version 2

DE bleibt am Root. EN und NL bleiben vollständige Sprachdateien. Gemeinsame Werte werden aus DE erzeugt. Die Feldzuständigkeit steht am Zod-Schema in `x-afe.translatable`. Namen, Labels, SEO, Prosa und Alt-Texte bleiben übersetzbar.

## Sprache beim Besuch

Astro baut die Seiten für DE, EN und NL mit festen URLs. `src/i18n/routing.mjs` ist die Quelle für die Sprachpfade. Bei einem Einstieg über `/` wertet ein kurzes Skript vor der ersten Darstellung die Browserpräferenzen aus. Es nutzt die erste unterstützte Sprache und berücksichtigt regionale Varianten wie `en-GB` und `nl-BE`. Ohne Treffer bleibt die deutsche Startseite. Direkte Einstiege auf Unterseiten und interne Links behalten die verlinkte Sprache.

Die Sprachwahl gilt für weitere Einstiege über `/` im selben Tab. Sie liegt im Sitzungsspeicher des Browsers. Query und Sprungmarke bleiben beim Sprachwechsel erhalten. In der Editor-Vorschau bleibt die aufgerufene Sprache stehen. Die [Astro-Spracherkennung](https://docs.astro.build/en/guides/internationalization/#browser-language-detection) auf dem Server setzt eine Seite voraus, die Astro zur Anfragezeit rendert.

Das Editor-Paket kann Sprachvorschläge über [LibreTranslate oder DeepL](../editor-designsprache.md) erzeugen. Der öffentliche Sprachwechsel lädt die übersetzten Inhaltsdateien aus dem Build und ruft keinen Übersetzungsdienst auf.

Prüfung: `node --test src/scripts/home-language.test.mjs`. Im gebauten HTML sind `/`, `/en/` und `/nl/` eigene Seiten, die man auch über die Sprachwahl öffnen kann.

## Im Editor

Ändere technische Werte wie Linkziele und Bildmaße in DE. Beim Speichern folgen EN und NL automatisch. Dafür erscheint keine Sprachprüfung. Die gemeinsamen Felder sind in EN und NL gesperrt.

Ändere Texte in der jeweiligen Sprache. Bei geänderten deutschen Texten zeigt der Editor nur die betroffenen EN-/NL-Felder. Prüfe sie und wähle „Geprüft speichern“. Vorschläge verändern zunächst nur den Dialog. „Zurück zum Bearbeiten“ verwirft die Prüfung; die bisherigen Eingaben bleiben erhalten. Vorschau, Vorschläge und Shared-Sync erzeugen keine Freigabe.

Eine direkte EN-/NL-Korrektur bestätigt beim Speichern nur den aktuellen Quellstand des korrigierten Feldes. Ein veralteter deutscher Quellstand wird dadurch nicht freigegeben. Ein Bildwechsel verlangt die Prüfung des zugehörigen Alt-Textes. Eine reine Änderung der Bildmaße verlangt sie nicht.

Listen behalten ihre internen `_key`-Werte beim Verschieben. Beim Duplizieren entstehen auch in verschachtelten Einträgen neue Keys. Öffentliche `id`-Sprungmarken sind davon getrennt. Neue oder entfernte Einträge werden gemeinsam gespeichert. Textlisten haben die Form `{_key,value}`; der Editor zeigt den Text aus `value`.

Speichern ist atomar. Bei konkurrierenden Änderungen, ungültigen Nachweisen oder einem fehlgeschlagenen Kandidatenbuild bleibt der vorherige Commit erhalten.

## Bei der Entwicklung

Annotiere jedes neue Blatt ausdrücklich als `shared` oder `translatable`. Der Policy-Guard prüft auch ungenutzte Union-Zweige. Gemeinsame Anzeigenamen werden nicht aus gleicher Schreibweise abgeleitet. Verwende die bestehenden Fakten- und Personenbesitzer. Fakten-Tokens müssen in allen Sprachen dieselben Fakten referenzieren.

`src/i18n/contract.mjs` berechnet Projektion und Feldfingerprints. `transaction.mjs` bereitet Vorschläge vor und prüft sie. Browser, CLI, Server, Build und SEO-Bericht verwenden diesen Vertrag. Root-Patches umgehen die Prüfung nicht.

Jede Sprachdatei trägt `translationContractVersion: 2`, den `translationSourceHash` des übersetzbaren Quellstands und feldweise `translationEvidence`. Der Hash ist kein Byte-Hash. Byte-Revisionen bleiben der Konfliktschutz des Editors. Kommentare und reine Shared-Änderungen verlangen keinen Textreview. Die serververwalteten Marker und Nachweise nicht von Hand ändern.

Die explizite Aktion „Geprüft speichern“ sendet `translationReview` mit exakten Quell-/Zielfingerprints. Der Server verifiziert diese Einträge und entfernt den Befehl vor dem Commit. Nur betroffene Textnachweise erhalten `reviewed`. Unveränderte Nachweise bleiben erhalten.

```sh
node editor/translate-missing.mjs --locale en --dry-run
node editor/translate-missing.mjs --locale nl --dry-run
node editor/i18n-contract-audit.mjs
node --test editor/i18n-field-policy.test.mjs editor/i18n-contract.test.mjs
```

`--sync-shared --state-dir <expliziter Pfad>` synchronisiert beide Zielsprachen atomar und baut den Kandidaten vor dem Commit. Der Befehl bricht bei nötiger Textprüfung ab. Für Tests ausschließlich einen temporären `AFE_STATE_DIR` verwenden. Er erzeugt keine Maschinenübersetzung und keine Textfreigabe.

## Migration und Nachweise

Der bestehende Stand wurde ohne neue menschliche Freigabe als `adopted-existing` übernommen. Historische `editorReviewed`-Flags bleiben unverändert in [content-provenance.json](content-provenance.json). Sie sind keine neue Review-Freigabe. [key-migration.json](key-migration.json) dokumentiert die ausdrücklichen Sprachzuordnungen.

[Entwurf](umbau-entwurf.md), [Teil 1](teil-1-umsetzung.md), [Teil 2 und Prüfungen](teil-2-umsetzung.md), [frühere Übernahmeberichte](historie-bis-i01.md).

Die [mechanische UI-Abhängigkeitsmigration](ui-dependency-migration.md) dokumentiert die Eingrenzung der Token-Fingerprints und die unveränderten Bestandsnachweise.
