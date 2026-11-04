# I01 Teil 1: Feldpolicy und vorbereiteter Vertrag

Arbeitsbranch `codex/i18n-contract`, Worktree `/tmp/fs-i18n-impl`. Basis ist `origin/main` bei `3e42814`, Entwurf übernommen aus `5a1c616`. Freigegeben sind ausschließlich Schritte 1 und 3 und Variante c. Die Entscheidungen vom 04.11. stehen im [Entwurf](umbau-entwurf.md#entscheidungen-0411).

## Gelieferter Umfang

`src/i18n/field-policy.mjs` bietet einen einzigen Annotation-Helper `fieldPolicy(schema, 'shared' | 'translatable')`. Er erhält die bestehenden Metadaten und setzt ausdrücklich `x-afe.translatable`. Diese vorhandene AFE-Metadatenstruktur wird bereits vollständig zum Browser transportiert. Ein zusätzliches, bei der Serialisierung verlorenes `x-i18n`-Objekt wird nicht eingeführt.

`policyTree()` normalisiert echte Zod-Schemas und AFE-Browserschemas gleich. Der Durchlauf prüft sämtliche möglichen Union-Zweige, auch ohne bestehende Beispieldatei. Unannotierte Blätter und unbekannte Schemaarten brechen ab. Bei echten Daten lehnt der Vertrag unbekannte Felder ab, bevor Zod sie still entfernen könnte. Das vorhandene `vorab: null` ist deshalb ein dokumentierter Bestandsfehler, keine erlaubte Ausnahme.

Alle Änderungen an `src/schemas/*` sind Annotationen und deren Import. Der Adapter annotiert zusätzlich seine bestehenden Markdown-Bodies, die Mediathek und das generierte UI-Schema. Validierungsregeln, Feldformen, AFE-Transaktionen, Browserdialog, Inhaltsdateien und Provenienzdateien bleiben unverändert.

Die Prüfungen zählen mögliche Blattadressen, einschließlich aller Union-Optionen. Wiederverwendete Schemas werden an jedem ihrer Einbauorte gezählt:

| Bereich | shared | translatable |
| --- | ---: | ---: |
| pages | 240 | 252 |
| posts einschließlich Body | 11 | 4 |
| projects einschließlich Body | 47 | 35 |
| faq einschließlich Body | 5 | 2 |
| Vier Sprachdatei-Collections zusammen | 303 | 293 |
| Alle 15 registrierten Quellschemas einschließlich UI-Dictionary | 546 | 2.659 |

Die große letzte Zahl enthält 2.148 einzelne DE/EN/NL-Dictionary-Blätter. Es gibt keine Policy-Whitelist und keinen Fallback auf Feldnamen, URL-Syntax oder gleiche Inhalte. `todo`, Filter, Steuerfelder, Linkziele und Referenzen sind ausdrücklich shared. Namen, Labels, Alt-Texte, Bildunterschriften, SEO und Prosa in Sprachdateien sind ausdrücklich translatable. Bereits bestehende zentrale Besitzer bleiben erhalten, etwa Personenname im Personendatensatz und Navigationsschlüssel im Navigationsdatensatz. Es entstehen keine weiteren zentralen Anzeigenamen.

## Vertrag und Schnittstellen

`src/i18n/contract.mjs` exportiert:

- `project(schema, source, target, locale, dependencies)`: vollständige Projektion mit DE-gesteuerten shared Werten, `sharedDifferences`, `requiredTranslations`, Feldadressen, Quell-/Zielfingerprints und Review-Abhängigkeiten. Fehlende Übersetzungen, unbekannte Felder, unbekannte Referenzen und widersprüchliche Fakten-Tokens brechen ab. Kein deutscher Ersatztext.
- `canonical(value)` und `fingerprint(value)`: nach Objektschlüsseln sortierte Darstellung und SHA-256. Text-Whitespace, vorhandene/fehlende optionale Textfelder und Pflicht-/Optionalstatus der Felder bleiben relevant. Adressen sind JSON-Pointer mit Escaping.
- `adoptionEvidence(result, legacy)`: versionierter Nachweis mit `status: 'adopted-existing'` pro Feld. Historische Angaben werden unter `legacy` unverändert erhalten. Auch `editorReviewed: true` erzeugt keinen neuen Status `reviewed`.
- `reviewRequired(result, evidence)`: fehlende, ungeprüfte oder veränderte Quell-/Zielstände ermitteln. Doppelte oder verwaiste Nachweise und inkompatible Versionen brechen ab. Direkte EN-/NL-Korrekturen ändern den Zielfingerprint, ohne einen veralteten Quellstand zu bestätigen.
- `checkParallel({...})`: zuerst den bisherigen `translationSourceHash` gegen die exakten DE-Bytes prüfen, danach den neuen Vertrag ausführen. Auch ein Kommentar mit unverändertem Textfingerprint scheitert weiterhin am alten Raw-Hash.

`dependencies` ist ein expliziter Snapshot mit `contact`, `people`, `projects`, `projectFacts`, `businessFacts`, `showDuration`, `showExtras` und `ui`, soweit tatsächlich benötigt. Die Test-/Audit-Ladung liest vorhandene Datensätze und löst Personen-/Projekt-IDs über den vorhandenen Site-Adapter zu aktuellen Dateipfaden auf. Die Vertragslogik liest keine Dateien und schreibt nichts. `contract-dependencies.mjs` nutzt die vorhandenen Resolver für Kontakt-, Dauer-, Projekt- und Angebotstokens. Beliebige gleichlautende Zahlen oder Namen erzeugen keine Abhängigkeit.

Fakten-Tokens erhalten konservative Review-Abhängigkeiten. Bei Projektfakten darf eine Sprache `date.long` statt `date.numeric` verwenden. Die fachliche Identität bleibt dieselbe; beide Formate werden geprüft. Fehlende Tokens oder zusätzliche Faktenidentitäten werden abgelehnt. Strukturierte Geschäfts-/Projektfakten und Personen-/Projektreferenzen werden konservativ als Abhängigkeiten aller Textfelder des Datensatzes behandelt. Dadurch kann der Vertrag mehr Reviews verlangen als später nötig, er übersieht aber keinen erkannten Besitzerwechsel. Reine Umordnung einer shared Referenzliste ändert den Fingerprint nicht.

Bei Bildern hängen übersetzbare Felder im Medienobjekt an dessen Quelladresse aus den bestehenden Medienmetadaten. Bildwechsel invalidiert damit Alt-Text und gegebenenfalls Caption; Breite und Höhe tun das nicht. Reine CTA-Linkänderungen werden als shared projiziert und erzeugen keinen Textreview. Eine semantische Änderung der Beschriftung bleibt eine eigene Textänderung.

Einzige parametrische Ausnahme ist der Betrag in `offer.*.price`, `priceSuffix`, `priceLine` oder `priceGuide`. Er wird bereits durch `priceLine` sprachbewusst formatiert. Währung, Qualifikator, Netto-/Anfahrtsbedeutung und die bestehenden Wörterbuchtexte bleiben Review-Abhängigkeiten. Andere Zahlenänderungen werden konservativ geprüft.

### Absichtlich noch nicht aktivierungsfähig

Der Formatmarker ist Version 2 mit `addressing: 'positional-pre-keys'`. Ohne Schritt 2 existieren für lokalisierte Listen noch keine belastbaren Identitäten. Numerische Adressen sind ausdrücklich eine Vorbereitung, kein dauerhaftes Identitätsmodell. Fünf `test.todo`-Fälle benennen die noch offenen Keys-Szenarien: Reorder plus Textänderung, verschachtelte/primitive Textlisten, Insert/Delete mit Nachweisen, Duplizieren und fehlende/doppelte Keys sowie reine Reihenfolge mit stabilen Textadressen. Rein gemeinsame Referenzlisten funktionieren bereits ohne Text-Keys.

Es werden keine Nachweise persistiert und kein neuer Hash in Sprachdateien geschrieben. Build, CLI, SEO-Bericht, Vorschau und Speichertransaktionen verwenden weiterhin ihre unveränderte Raw-SHA-Prüfung. `checkParallel` wird zusätzlich im Test und im lesenden Audit ausgeführt. Die Freigabe-/Save-Integration gehört zu Schritten 4/5.

## Parallelvergleich aller 132 Sprachdateien

Ausführbar mit Node 22:

```sh
node editor/i18n-contract-audit.mjs
node --test editor/i18n-field-policy.test.mjs editor/i18n-contract.test.mjs
```

Ergebnis auf unverändertem Inhalt der Basis: **132/132 alte Raw-Hashes aktuell, 127/132 neue Vertragsprüfungen bestanden, keine shared Abweichung in diesen 127**. Ein neuer Hash ist nicht numerisch mit dem Raw-Hash vergleichbar. Verglichen werden die Entscheidungen über denselben Inhalt und gezielte Mutationen.

Die fünf abweichenden Entscheidungen:

| Sprachdatei | Neuer Guard und Ursache |
| --- | --- |
| `pages/en/drohnenshow-indoor.yaml` | `/sections/2/diagram/description`: EN nutzt zusätzlich `offer.indoor.drones.min`; DE/NL enthalten an dieser Stelle die feste Beispielzahl 20. Der alte Hash erkennt diese unterschiedliche Faktenabhängigkeit nicht. |
| `pages/en/drohnenshow-werbung.yaml` | `/sections/8/facts/0/vorab`: unbekanntes Feld `vorab: null`, schon in DE und den Sprachfassungen vorhanden. Zod entfernt es bisher still. |
| `pages/nl/drohnenshow-werbung.yaml` | Derselbe unbekannte `vorab`-Eintrag. |
| `projects/en/nfl-muenchen.md` | `/summary`: EN enthält fest `250`, DE referenziert `project.nfl-muenchen.drones`. |
| `projects/en/sonnemondsterne.md` | `/summary`: EN enthält fest `100`, DE referenziert `project.sonnemondsterne.drones`. |

Diese Dateien wurden nicht geändert. Der Bestandstest erwartet genau diese Befunde und keine weiteren. Das ist eine Inventarassertion, keine Ausnahme in der Vertragslogik. Vor Aktivierung müssen die Abweichungen im freigegebenen Inhaltsstand fachlich aufgelöst werden. Die zwei legitimen Datumsformatwechsel bei Bokkenrijders und PUMA werden dagegen akzeptiert.

Für alle 127 streng prüfbaren Sprachdateien führt das Audit zusätzlich jeweils drei Mutationen ohne Dateischreibzugriff aus. Ein YAML-/Frontmatter-Kommentar macht den Raw-Hash veraltet, lässt den neuen Fingerprint aber unverändert. Ein geändertes shared `noindex`/`draft` macht ebenfalls den Raw-Hash veraltet und lässt Textfingerprint und Reviews unverändert. Zusätzliches Whitespace in einem übersetzbaren Feld ändert beide Quellstände. Ergebnis jeweils 127/127. Die alten Raw-Gates bleiben in allen Fällen verbindlich.

## Offene Folgeschritte

- Schritt 0: Nach Merge der parallelen Inhaltsarbeit den freigegebenen Stand neu sichern und zählen. Die neuen T02-Schemafelder annotieren und den Policy-Guard erneut ausführen. Die fünf Bestandsbefunde auf dem neuen Stand prüfen.
- Schritt 2: Stabile Keys einschließlich primitiver Textlisten migrieren; Adressen und Nachweise auf das freigegebene Identitätsmodell umstellen und die fünf Todos ausführen. Keine Index-Fallbacks für die aktivierte Variante.
- Schritt 4: Variante c atomar in allen Raw-Hash-Verbrauchern aktivieren, gemeinsame Werte serverseitig synchronisieren, alle Lese-/Schreibrevisionen prüfen und den neuen Formatmarker in einem gemeinsamen Änderungssatz einführen.
- Schritt 5: Explizite Review-Aktion, Vorschlag/Abbruch/Sync ohne neue Freigabe, echte Save-/Reload-/Retry-/Konflikt- und Buildfehler-Szenarien mit temporärem `AFE_STATE_DIR`. Vollständiger privater/öffentlicher Ausgabevergleich auf dem fixierten Inhaltsstand. Keine Aufnahme erforderlich.

## Abschlussprüfungen

- Gezielte Tests: 17 bestanden, 5 ausdrücklich als Schritt-2-Todos markiert, keine Fehler.
- `npm run check`: 0 Fehler, 0 Warnungen, 246 Hinweise.
- `npm run build`: erfolgreich mit der unveränderten regulären Bildoptimierung, 72 gebaute Seiten.
- `node scripts/check-i18n-build.mjs`: 32 DE-Routen, 48 lokalisierte Inhaltsrouten, 16 lokalisierte Weiterleitungen.
- Separater regulärer Build von `origin/main` bei `3e42814`, gleicher Inhaltsstand und gleicher Node-/Dependency-Stand. `python3 docs/dupes-inventory-r20/tools/compare-builds.py /tmp/fs-i18n-baseline/dist /tmp/fs-i18n-impl/dist`: 96 HTML-Dateien, keine hinzugefügt/entfernt/verändert. Zusätzlich sind alle 96 HTML-Dateien bytegleich, also auch Alt-/ARIA-/Medienattribute unverändert.
- `git diff 3e42814 HEAD -- src/content docs/i18n/content-provenance.json src/i18n/ui.json`: leer. Keine Inhalts-, Provenienz- oder Sprachdatei geändert. Kein Push, Merge oder Deploy.
- Gesamte vorgegebene Unit-Suite einmal mit `--test-concurrency=2` und eigenem temporären `AFE_STATE_DIR`: 675 Tests, 667 bestanden, 0 regulär fehlgeschlagen, 1 wegen Timeout abgebrochen, 2 übersprungen, 5 Todos. Exitcode 1. Der bestehende Test `A slow remote push never holds the save lock` in `editor/git-sync.test.mjs:9` überschritt sein festes 20-Sekunden-Limit mit 20.445 ms. Das Limit und der Test wurden nicht geändert. Gezielter isolierter Wiederholungslauf mit `node --test --test-concurrency=1 editor/git-sync.test.mjs` und eigenem temporären `AFE_STATE_DIR`: 2/2 bestanden, Exitcode 0. Der zuvor abgebrochene Test bestand in 19.036 ms; der zweite in 14.023 ms. Der Gesamtlauf wird deshalb ausdrücklich nicht als vollständig grün ausgegeben.

Die Läufe verwenden den beauftragten Node 22.22.1. `npm ci` war erfolgreich und meldet weiterhin die vorhandene AFE-Paketanforderung Node >=24.15.0. Der Zielruntime-Nachweis bleibt ein späterer Betriebsschritt; in diesem Auftrag werden keine Paket- oder Engine-Angaben geändert.


Während des Abschlusslaufs rückte die gemeinsame Remote-Tracking-Referenz `origin/main` durch T02 auf `86ebbaa` vor. Dieser Auftrag bleibt absichtlich auf seiner Startbasis `3e42814`; die 96 bytegleichen HTML-Dateien und der 132-Dateien-Parallelcheck beziehen sich auf diesen fixierten Stand. Kein Rebase oder Einmischen der parallelen Inhaltsmigration. Nach Integration von T02 müssen dessen neue Felder annotiert und die Bestandsbefunde erneut geprüft werden, wie im Auftrag vorgesehen.
