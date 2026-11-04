# I01 Teil 2

Fixierte Basis `merge/t02` bei `399419f`, T02 und CSS-Tokens einschließlich Maskenkorrektur. Die drei Teil-1-Commits sind mit Erhalt aller T02-Felder integriert. Keine CSS-Änderung.

## Schritt 0

132 Sprachdateien, alle bisherigen Raw-Hashes aktuell. Die fünf bekannten Vertragsblocker bestehen unverändert. 2.586 gleiche Blattwerte, 2.020 unterschiedliche und keine fehlenden. Der maschinenlesbare Stand mit Policy-Zahlen steht in [teil-2-basis.json](teil-2-basis.json). Die Policy prüft jetzt auch beide T02-Baustein-Datensätze. Rolle, Bio und Porträtbeschreibung sind übersetzbar; Referenzen und technische Werte sind gemeinsam. Keine neuen gemeinsamen Anzeigenamen.

Öffentliche und private Vergleichsausgabe sind unter `/tmp/fs-i18n-p2-before-public` und `/tmp/fs-i18n-p2-before-editor` gesichert. Beide regulären Builds erfolgreich. Der Policy-Guard besteht.

## Bestandsblocker

Indoor-EN verwendet im Beschreibungsfeld wieder die feste Beispielzahl 20 wie DE/NL. In Werbung wurde das unbekannte, ungenutzte `vorab: null` aus allen drei Fassungen entfernt. NFL-EN und SonneMondSterne-EN referenzieren nun die Drohnenzahl aus den bestehenden Projektfakten. Alle fünf Befunde sind beseitigt. Die sichtbaren Wörter und Zahlen bleiben gleich.

## Stabile Listenidentitäten

138 Listen mit 505 Einträgen je Sprachbestand migriert. DE, EN und NL haben dieselben internen Keys, insgesamt 1.515 Zuordnungen. [key-migration.json](key-migration.json) hält für jeden Eintrag die ausdrückliche DE/EN/NL-Zuordnung und Fingerprints der vorherigen Werte fest. Textlisten verwenden `{_key,value}`. Die Renderkomponenten lesen `value`; IDs und Sprungmarken sind unverändert. Die Schemaableitung erhält Limits, Refinements und Metadaten. Kopierte Sections erhalten auch in allen Nachkommen neue Keys. Das genannte site-spezifische `prepare-cloned-section.mjs` existierte nicht; die Datenkopie läuft über den vorhandenen `uniqueSection`-Hook. Der DOM-Clone-Hook des AFE-Pakets kopiert lediglich die Vorschau.

Die fünf Todos sind echte Tests einschließlich Reorder mit Textänderung bei wiederholten Typen, verschachtelter Textlisten, Insert/Delete und fehlender/doppelter Keys. 23 gezielte Tests bestanden, keine Todos. Astro-Check ohne Fehler.

## Aktivierung Version 2

Alle 132 Sprachdateien tragen jetzt den Formatmarker Version 2 und 3.054 übernommene Feldnachweise. Der Quellfingerprint enthält übersetzbare Werte und ihre Abhängigkeiten. Die weiterhin verwendeten Byte-Revisionen schützen AFE vor konkurrierenden Schreibzugriffen. Gemeinsame Werte werden schemaabhängig im Browser und CLI erzeugt. Der Server prüft den ganzen Kandidaten einschließlich Root-Patches, Besitzerdaten und Zielnachweisen. Die Vorschau verwendet dieselbe Projektion und behält ungeprüfte Textnachweise unverändert.

Die Freigabe sendet ausschließlich betroffene Feldfingerprints als kurzlebigen `translationReview`-Befehl. Er wird vor dem Commit entfernt. Direkte EN-/NL-Korrekturen bestätigen nur einen bereits aktuellen deutschen Feldstand. Reiner Shared-Sync verändert weder Review-Status noch historische Provenienz. Die CLI kann beide Sprachprojektionen gemeinsam synchronisieren, baut den Kandidaten und bricht bei Textreview-Bedarf ab.

Der Policy-Guard, 29 Vertrags-/Format-/Inhaltstests und acht Policy-/Transaktionskerntests bestehen. Der reguläre Build ist erfolgreich. Ein erster öffentlicher Vergleich meldet für alle 96 HTML-Dateien keine Abweichung. Vollständige Abschlussprüfung folgt im nächsten Abschnitt.
