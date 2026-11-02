# Prüfung der Inhaltslücken und Fallstudien

Stand: 2. November 2026. Ausgangspunkt `68c6940`, Arbeitsbranch `codex/inhalte-fallstudien`, eigener Checkout `/tmp/fs-inhalte-fallstudien`. Node 22.22.1 aus `/opt/homebrew/opt/node@22/bin`. Die Versionen aus `package-lock.json` sind installiert; `package.json` und Lockfile bleiben unverändert. Keine `.env`-Datei wurde gelesen. Kein echter Formularversand wurde ausgelöst.

## Inhalt und Darstellung

- 43 interne `todo`-Werte auf elf Seiten, identisch in DE/EN/NL. Pro Seite: Start 10, Hochzeit 5, Werbung 5, Indoor 7, Über uns 8, Referenzen 2, Kontakt 2, FAQ 1, Impressum 1, Datenschutz 1, Danke 1.
- Drei bestehende Kurzreferenzen zu Fallstudien ausgebaut, jeweils in DE/EN/NL. Reale Quellen, Bildmaße, Originalfilm-Links und Materialgrenzen stehen in [fallstudien-quellen.md](fallstudien-quellen.md).
- Hochzeit verlinkt beide privaten Fälle, Werbung vier ausgearbeitete Fälle. Spotify bleibt im vollständigen Referenzverzeichnis. Der Gesamtbestand umfasst weiterhin 19 Referenzen, jetzt sieben Fallstudien.
- Die vier bisherigen Showcase-Inhaltsdateien und ihre Sprachfassungen sind gegenüber dem Ausgangscommit unverändert. Ihre Videos, Formationen und Galerieinhalte bleiben erhalten. Die gemeinsame Gesamtzählung zeigt jetzt sieben Fälle.
- Fehlendes Hero-Video, Formationsdaten und leere Galerien werden generisch ausgelassen. Ein Originalfilm-Link ist möglich, ohne einen externen Player zu laden. Die neuen Seiten fordern keine erfundenen Video- oder JSON-Dateien an.
- Kennzahlen mit einem oder zwei belegten Werten verteilen sich auf die vorhandene Fläche. Das Showjahr steht im Datum und wird nicht als Tausenderzahl animiert.

## Abgeschlossene Prüfungen

| Prüfung | Ergebnis | Beleg |
| --- | --- | --- |
| `npx astro check` | 0 Fehler, 0 Warnungen, 231 Hinweise | `/tmp/fs-inhalte-evidence/astro-check-final.log` |
| Produktionsbuild | erfolgreich; zusätzlich abschließender Build im Standard-`dist` | `build-production-final.log`, `build-final.log` |
| Build mit `PUBLIC_ANNOTATE=1` | erfolgreich, 129 gerenderte Hinweise | `build-annotated-final.log`, HTML unter `/tmp/fs-inhalte-annotated-final/` |
| Produktionshinweise | 0 `.todo-note`-Elemente in sämtlichen HTML-Dateien | HTML unter `/tmp/fs-inhalte-production-final/` |
| Gezielte Inhalts-/i18n-Unit-Tests | 12 bestanden, 0 fehlgeschlagen | `content-unit-final.log` |
| Vollständiger angeforderter Node-Lauf | 107 bestanden, 1 fehlgeschlagen | `unit-locked.log`; Ursache unten |
| i18n-Buildprüfung | bestanden; aktuelle Quellhashes, Struktur und Provenienzpfade zusätzlich durch die Unit-Tests geprüft | `i18n-build.log` |
| Gezielte Seiten-/Breitenprüfung | 8 Kombinationen ohne defekte Bilder, JavaScript-Seitenfehler, Überlauf oder Produktionshinweise | `visual-metrics.json` |
| `git diff --check` | bestanden | gegen den tatsächlichen Arbeitsbaum ausgeführt |

Belegdateien ohne expliziten Verzeichnispfad liegen unter `/tmp/fs-inhalte-evidence/`. Die Produktions- und Hinweis-Builds wurden zuletzt in getrennte Ausgabeverzeichnisse geschrieben, damit eine laufende Browserprüfung nicht durch ein geleertes `dist` unterbrochen wird. Die abschließende Interpunktionskorrektur an einem internen Hinweis ändert keine Produktionsausgabe; Quellhashes und der gezielte i18n-Lauf wurden danach erneuert.

## Offener Integrationsschritt außerhalb des Datei-Scopes

Der einzige fehlgeschlagene Unit-Test ist `versioned Apache rules exactly match the GA4 inventory and current published project aliases` in `scripts/production-apache.test.mjs`. Der vorhandene Generator leitet Projekt-Aliase aus den veröffentlichten Showcase-Daten ab. Für die drei neuen Fälle erwartet er deshalb neun zusätzliche Weiterleitungen, je drei für DE, EN und NL.

`public/.htaccess` wurde entsprechend dem ausdrücklich begrenzten Datei-Scope dieses Auftrags nicht verändert. Eine Ausnahme wurde angefragt. Der konkrete Vergleich ist unter `/tmp/fs-inhalte-evidence/htaccess.patch` vorbereitet; er ergänzt ausschließlich diese neun Regeln. Die fachlichen Inhaltsprüfungen sind davon unabhängig. Den fehlgeschlagenen Test nicht entfernen oder abschwächen.

Nach Freigabe beziehungsweise bei der Integration im führenden Branch:

```sh
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
node scripts/generate-public-delivery.mjs
node --test scripts/production-apache.test.mjs
```

Der bestehende Generator bleibt die einzige Quelle für die Regeln. Es wird kein zweiter Redirect-Mechanismus eingeführt.

## Sichtprüfung

Alle acht angeforderten Ansichten des aktuellen Stands wurden geöffnet und betrachtet:

- `hochzeit-recklinghausen-{1440,390}.png`
- `heiratsantrag-hugenpoet-{1440,390}.png`
- `loreal-prada-rheinturm-{1440,390}.png`
- `hochzeit-referenzen-{1440,390}.png`

Zusätzlich sind vollständige Hochzeits-Landingpages bei beiden Breiten vorhanden. Quellenbilder wurden vor Verwendung in einer separaten Kontaktübersicht visuell geprüft. Die Fotografie des Prada-Produkts ist ausdrücklich als Produktvorlage beschriftet. Bei den privaten Fällen wird das einzige vorhandene Originalfoto für die Textabschnitte wiederverwendet; keine Galerie wird mit fremden Fotos aufgefüllt.

Der erste T3-Browser konnte navigieren, lieferte jedoch zweimal `Preview automation snapshot timed out after 15000ms.`. Die Sichtprüfung erfolgte deshalb mit einer eigenen Playwright-CLI-Sitzung. Die fünf dort über ältere Aufrufe angesammelten Konsoleneinträge stammen ausschließlich von zwischenzeitlich ersetzten Asset-Dateien auf Port 4409. Der aktuelle Stand auf Port 4419 wurde separat mit frischen Fehler-Listenern geprüft; alle acht Einträge in `visual-metrics.json` enthalten leere Fehler- und Bildfehlerlisten.

## Browserläufe und Portisolation

Der angeforderte Sechs-Dateien-Lauf wurde mit drei Workern auf Port 4399 gestartet. Währenddessen erschien dort ein Preview aus dem parallelen Checkout `/Users/marcviladrich/Freelance/zzdev/flyingstars-poc`: Der Port lieferte zwischenzeitlich `ERR_CONNECTION_REFUSED`, danach einen anderen Komponentenstand. Diese Ergebnisse sind kein gültiger Nachweis für diesen Branch und wurden verworfen.

Der erneute Lauf verwendet Port 4429 und den eigenen Checkout. Er endete nach 590 bestandenen und zwei absichtlich übersprungenen Szenarien mit Exit 143. Bis dahin gab es keine fehlgeschlagene Assertion. Ursache der Prozessbeendigung ist nicht abschließend belegt. Der Preview blieb erreichbar. Die noch offenen Profile und Testdateien werden separat mit denselben drei Workern geprüft, damit die tatsächliche Abdeckung nachvollziehbar bleibt. Die zusammengeführten Abschlusszahlen stehen im folgenden Abschlussabschnitt.

## Abschlussergebnisse

Alle 1.008 eindeutigen Browser-Szenarien des angeforderten Sechs-Dateien-Umfangs sind abgedeckt: **1.003 bestanden, fünf absichtlich übersprungen, null fehlgeschlagen**. Es wurden keine Erwartungen gelockert oder Tests deaktiviert. Die Überspringbedingungen sind die vorhandenen Beschränkungen des Scrollstory-Tests auf Desktop und des Video-Klick-Tests auf Geräte ohne mobile Bedienung.

| Profil | Bestanden | Übersprungen | Fehlgeschlagen |
| --- | ---: | ---: | ---: |
| Desktop Chromium | 252 | 0 | 0 |
| Mobil Chromium | 250 | 2 | 0 |
| Desktop WebKit | 251 | 1 | 0 |
| Mobil WebKit | 250 | 2 | 0 |

Der nach der Unterbrechung vollständig wiederholte WebKit-Restlauf meldet 176 bestanden, einen übersprungen und null fehlgeschlagen. Das iPhone-Profil wurde vollständig abgeschlossen. `browser-coverage.json` führt die eindeutigen Testidentitäten aus dem isolierten Teillauf und den beiden vollständigen JSON-Fortsetzungsberichten zusammen; bereits wiederholte HTML-Szenarien werden nicht doppelt gezählt. Quellen: `playwright-isolated.log`, `remaining-webkit.json`, `mobile-webkit.json`. Sämtliche Browserläufe verwenden drei Worker.

Die Layout-Audits auf dem eigenen finalen Produktionspreview `http://127.0.0.1:4419` melden für DE, EN und NL jeweils **22 Seiten × zwei Breiten, null Befunde**, insgesamt 132 Seiten-/Breitenkombinationen. Breiten: 390 und 1440 Pixel. Belege: `layout-current.log`, `layout-en.log`, `layout-nl.log`. Die nicht verlinkten Status-/Fehlerseiten werden zusätzlich von den routebasierten Browser-Gates erfasst.

Die Produktions- und Hinweis-Builds wurden nach der letzten internen Textkorrektur erneut erfolgreich erzeugt. Ein erneuter direkter HTML-Abgleich bestätigt 129 Hinweise im annotierten und null im normalen Build. Die Screenshots zeigen dieselbe Produktionsausgabe; die Korrektur verändert ausschließlich die ausgeblendete interne Notiz.

Der verbleibende Node-Fehler ist der oben dokumentierte generierte Redirect-Abgleich. **Der Branch hat damit keinen vollständig grünen Node-Gesamtlauf.** Vor Integration beziehungsweise produktiver Veröffentlichung müssen die neun generierten Projekt-Aliase nach Freigabe des zusätzlichen Dateipfads übernommen und der bestehende Apache-Test erneut ausgeführt werden.
