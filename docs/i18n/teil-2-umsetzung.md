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

## Abschluss und Nachweise

Arbeitsort `/tmp/fs-i18n-p2`, Branch `codex/i18n-p2`. Nach Fetch steht `origin/main` weiterhin auf `399419f`. Der Branch baut darauf auf; ein Rebase ist nicht erforderlich. Kein Push, Merge oder Deploy. Keine `.env` gelesen. Alle AFE-Szenarien verwenden temporäre Zustandsverzeichnisse.

| Schritt | Commits |
| --- | --- |
| Teil 1 mit T02-Konfliktauflösung | `39eca9f`, `5a4cc87`, `970f2a8` |
| Fixierter T02-Bestand und Ausgabebasis | `686afa8` |
| Fünf Bestandsblocker | `569df5d` |
| Key-Migration und fünf echte Key-Tests | `2becb65` |
| Atomare Aktivierung Version 2 | `b3add29` |
| AFE-Szenarien, Ausgabe- und Bindungsprüfer | `289c0fa` |
| Rohdatei-Grenze, optionale Listen und Besitzer-Bindungen | `5767b61` |
| T02-/Klon-Erwartungen und Typdeklaration | `602e383` |
| Exakte Review-Payloads auch bei direkter Korrektur | `8baf043` |

### Policy und Migration

Nach T02 und vor technischen Metafeldern zählen die vier Sprachdatei-Collections **306 shared / 290 translatable**. Alle 17 registrierten Quellschemas zusammen zählen **570 / 2.707**. Nach Keys und Nachweisschemas sind es **440 / 290** beziehungsweise **704 / 2.707**. Die zusätzlichen gemeinsamen Blätter sind technische Identitäten und Vertragsfelder. Kein zusätzlicher Anzeigename wurde zentralisiert. Die 2.586 gleichen Blattwerte der Bestandsaufnahme sind keine Zahl eingesparter Dateien; Variante c behält vollständige Dateien.

Alle 132 Sprachdateien erfüllen Version 2. Ihre 3.054 Textnachweise sind als übernommen dokumentiert. Die historische Provenienzdatei ist gegenüber `merge/t02` bytegleich. Die Migration betrifft 138 Listen und 505 Einträge je Sprachbestand, insgesamt 1.515 explizite Elementzuordnungen. Sämtliche öffentlichen IDs bleiben erhalten.

### Was Redakteur:innen erleben

Gemeinsame Felder sind in EN/NL gesperrt. Eine Änderung in DE erzeugt beide Sprachprojektionen; eine reine URL-, Maß- oder interne Hinweisänderung öffnet keinen Textreview. Bei Textänderungen erscheinen die betroffenen Zieltexte. Vorschläge und Abbruch erzeugen keine Freigabe. Erst „Geprüft speichern“ bestätigt die konkreten Quell-/Zielfingerprints. Die serververwalteten Nachweise sind im normalen Formular verborgen.

Verschieben behält die zugehörigen Übersetzungen. Duplizieren und das Aktivieren optionaler Gruppen erzeugen neue Keys in allen neu angelegten Nachkommen. Direkte EN-/NL-Korrekturen bestätigen ausschließlich einen bereits aktuellen deutschen Feldstand. Personen- und Projektbesitzer bleiben konservative Review-Abhängigkeiten; eine fachliche Besitzeränderung kann deshalb viele Textfelder zur Prüfung bringen.

### Automatisierte Prüfung

- Astro-Check des Endstands: **0 Fehler, 0 Warnungen**. Regulärer öffentlicher und privater Build erfolgreich, jeweils 72 von Astro gebaute Seiten plus Weiterleitungen. Routing-/SEO-Guard: 32 DE-Routen, 48 lokalisierte Inhaltsrouten und 16 lokalisierte Weiterleitungen.
- Öffentlicher und privater Vorher-/Nachher-Vergleich: jeweils **96 HTML-Dateien, keine hinzugefügt, entfernt oder inhaltlich verändert**. Sowohl `compare-builds.py` als auch `tools/compare-i18n-output.py` bestehen. Der ergänzte Prüfer vergleicht geordnete Textknoten, Elemente sowie Alt-, Titel-, ARIA-, Formular-, Anker- und Medienattribute. Er normalisiert ausschließlich generierte Astro-Assetnamen und technische AFE-Markerattribute. Kein Wort musste geändert werden.
- Der Markerprüfer löst **6.567 Marker und 4.356 Inline-Bindungen** über die tatsächlichen Schemas und Datensätze auf. 14 gemeinsame Sprachdatei-Bindungen erreichen ihren DE-Besitzer; 15 leere optionale Panel-Bindungen sind ausdrücklich erlaubt. Ein bestehender Markerfehler für `totalDrones` wurde behoben: Der berechnete Gesamtwert öffnet den vorhandenen Projektfakten-Datensatz. Es gibt kein erfundenes editierbares Gesamtwert-Feld. Diese Änderung betrifft nur technische Marker.
- Dynamischer Vergleich mit gleichen Eingaben: **6 Szenarien**, DE/EN/NL in Chromium und WebKit. Jeweils Konfigurator, Zahlen/Preise, Extras, tatsächlicher Sprachwechsel mit Query/Hash, Formularfehler, Versandstatus und Menüdialog. Alle Texte und zugänglichen Namen stimmen überein. Die unterschiedlichen lokalen Server-Origins werden normalisiert.
- Layout: **396 Seiten-/Breiten-/Browserkombinationen**, 22 gecrawlte Inhaltsseiten je Sprache, Einstiege `/`, `/en/`, `/nl/`, Breiten 390/1440/2560, Chromium und WebKit. **0 Befunde**, keine Kriterien deaktiviert.
- `tests/i18n.spec.ts --project=desktop --project=webkit`: **10/10 bestanden**.
- Zusätzlicher tatsächlicher AFE-Browserdurchlauf: Chromium und WebKit, Textänderung, Vorschlag übernehmen, Speichern/Reload, Bild-Upload/-Wechsel, Sprachwahl sowie Paketänderung. Beide Engines ohne JavaScript- oder API-Netzwerkfehler. Keine Videoaufnahme.
- Reale AFE-Transaktionsmatrix: **9/9 bestanden**, einschließlich Shared-Sync ohne Review, Textreview, Abbruch, Root-Patch-Umgehung, stale Text trotz Shared-Wert, EN-Korrektur, wiederholter Section-Typ mit Reorder/Textänderung, Save/Reload, externer Quelländerung und Kandidatenfehler ohne Teilcommit. Weitere bestehende Tests prüfen Retry und konkurrierende Sprachänderungen. Der aktuelle Vertrag wird vor und nach dem Schreiben geprüft.
- Tatsächlicher CLI-Sync in einer isolierten Fixture: **4/4 CLI-Tests bestanden**. Beide Sprachprojektionen folgen in genau einem Commit. Textnachweise bleiben unverändert. Ein Kandidatenbuild gehört zum Schreibpfad.

### Unit-Gesamtlauf und Nachläufe

Der vorgegebene Lauf mit `--test-concurrency=2` endete mit **701 Tests: 683 bestanden, 15 fehlgeschlagen, 1 wegen Timeout abgebrochen, 2 übersprungen, 0 Todos**, Exitcode 1. Während dieses Laufs wurden alte Formatannahmen korrigiert. Dieser Lauf ist kein konsistent grüner Gesamtnachweis des Endstands.

Die regulären Befunde waren alte Fixture-/Review-Erwartungen, der VM-Browserloader ohne JSON-Modulsupport sowie die zunächst fehlende TypeScript-Deklaration des neuen Marker-Helfers. Alle betroffenen Suiten wurden gezielt erneut ausgeführt: **27/27**, Bild-/Panel-Suiten **13/13**, Klon **2/2**, T02 **1/1**, Offline-Pipeline einschließlich ihrer CI-Prüfung **6/6**. Der letzte Transaktionskern besteht **10/10**, einschließlich ungültiger direkter Review-Payloads und der tatsächlich installierten Rohdatei-Grenze. Die Limits der Tests wurden im Repository nicht erhöht. Ein zweiter vollständiger Gesamtlauf wurde nicht ausgeführt.

Der bekannte Git-Sync-Test überschreitet auch isoliert sein unverändertes **20-Sekunden-Limit**: 26.975 ms für den ersten Test, der zweite besteht. Ergebnis des isolierten Zweierlaufs: 1 bestanden, 1 wegen Timeout abgebrochen. Der zusätzliche Aufwand mit Feldnachweisen muss bei einem künftigen Laufzeitbudget betrachtet werden; dieser Befund wird nicht als erledigt ausgegeben.

Eine ausdrücklich getrennte Diagnose mit einer temporären Testkopie und 60 Sekunden Budget besteht **2/2**: 33.966 ms beziehungsweise 34.469 ms. Der Repositorytest behält seine 20 Sekunden. Die Prüfung bestätigt das asynchrone Push-/Speicherverhalten; das ursprüngliche Zeitbudget bleibt rot. Eine getrennte Warmlatenz-Messung wurde nicht durchgeführt.

Maschinenlesbare Ergebnisse, genaue Logpfade und ergänzende Diagnose: [teil-2-pruefung.json](teil-2-pruefung.json). Die vollständigen Logs und Builds liegen unter `/tmp/fs-p2-*`, `/tmp/fs-i18n-p2-before-{public,editor}`, `/tmp/fs-i18n-p2-final-{public,editor}`. Der zusätzliche Browserbeleg liegt unter `/tmp/fs-editor-browser-proof/`.

### Grenzen und offene Punkte

Keine neue menschliche Sprachfreigabe, kein Live-Betrieb, kein echter Mailversand und kein echter Übersetzungsanbieter geprüft. Die Provider-Szenarien verwenden die vorhandene Fake-Übersetzung. Keine Videoaufnahme gemäß Auftrag. Die Builds und Tests liefen mit Node 22.22.1; das veröffentlichte AFE-Paket verlangt weiterhin Node >=24.15.0. Ein Node-24-Betriebsnachweis gehört nicht zu diesem Lauf.

Keine offene fachliche Entscheidung. Technisch offen bleibt das Zeitbudget des kalten Git-Sync-/Speicher-Fixture-Tests. Die serverseitigen atomaren Schreib-, Review-, Konflikt- und Buildfehler-Szenarien bestehen. CSS-Dateien und Styleblöcke sind unverändert.
