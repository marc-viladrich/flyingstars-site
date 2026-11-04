# Teil 3: Save-Latenz und vollständiger Unit-Lauf

Branch `codex/i18n-p3`, Worktree `/tmp/fs-i18n-p3`, Ausgangspunkt `94d9c55`.
Vergleichsbasis main ist ein eigener Worktree `/tmp/fs-i18n-p3-main` auf `399419f`.
Der parallel verwendete Worktree `/tmp/fs-i18n-p2` wurde nicht verändert.

## Gemessene Ursache und Korrektur

Die vermutete rekursive Verzeichnisabfrage läuft in `previewFiles`, nicht im regulären
NativeStore-Save ohne Kandidatenbuild. Sie wurde nicht geändert. Der CPU-Profiler
zeigt stattdessen wiederholtes YAML-Parsen beim Schreiben ganzer Records. Der AFE-Codec
reconciliert dabei auch unveränderte Mitglieder und parst für jedes Mitglied erneut
das gesamte Dokument. Die neuen Nachweislisten verstärken diesen Aufwand. Das passiert
sowohl beim Encode der Extension-Proposals als auch nochmals in `SourceTransaction.apply`
beim Commit. Nur den ersten Aufruf zu ändern genügte im Benchmark nicht.

Der Site-Adapter leitet jetzt an beiden Stellen dieselben tatsächlich geänderten
Blattpfade ab. Codecommits: `3670f17` und `16ca3fb`. Geänderte serververwaltete Nachweisblöcke werden innerhalb derselben
privaten Transaktion entfernt und vollständig wieder eingefügt. So benötigt auch eine
Owneränderung mit vielen neuen Feldfingerprints konstante Codec-Arbeit pro Block.
Kein Zwischenstand wird veröffentlicht oder als Quelle für andere Saves verfügbar.
Strukturänderungen, neue/entfallene Eigenschaften und Arraylängen werden
weiterhin durch den bestehenden Codec geschrieben. Bestehende Formatierung bleibt
unter dessen Kontrolle. Commit, atomare Dateischreibvorgänge, Git-Revision und
Konfliktchecks laufen weiter durch die vorhandene SourceRegistry. Auch explizite
No-op-Saves nehmen weiter an deren Dateikonfliktprüfung teil.

Unveränderte Quelldateien werden pro Adapter nach exakten Bytes und Schemaidentität
geparst gecacht, mit einer Kopie für jeden Aufrufer. Erfolgreiche Vertragsprüfungen
werden nach vollständigem DE-/Zielinhalt einschließlich Nachweisen und allen
Abhängigkeiten gecacht. Änderungen an irgendeinem Owner invalidieren konservativ
diese Prüfungen. Geänderte Sprachtripel laufen durch die bisherigen Projektions- und
Reviewregeln. Der SHA-256-Vergleich aller gelesenen Dateien gegen die tatsächlichen
Arbeitskopiebytes bleibt bei jedem Save aktiv, auch bei Cachetreffern.

`editor/root-write-cost.test.mjs` begrenzt die Zahl der Codec-Parse-Aufrufe für einen Titel und einen vollständig geänderten
Nachweisblock auf sieben, prüft die Blattoperationen auch an der Commit-Grenze und
prüft Cacheinvalidierung bei Quelltext-, Nachweis- und Owneränderungen. Der Test prüft
außerdem die Isolation zurückgegebener Parsewerte und die Ablehnung neuer unbekannter
Felder nach einem erfolgreichen Cachezugriff.

## Reproduzierbarer Benchmark

```sh
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
export AFE_STATE_DIR=$(mktemp -d /tmp/fs-benchmark-state.XXXXXX)
node editor/bench/save-latency.mjs
node editor/bench/save-latency.mjs --trace
```

Für die Referenzen denselben Benchmark mit absolutem Pfad ausführen, während das
Arbeitsverzeichnis der jeweilige Referenzworktree ist. Das Skript lädt dessen Adapter,
Schemas und Fixture. Die Worktrees auf `94d9c55` und `399419f` verwenden dieselben
mit `npm ci` installierten, unveränderten Dependencies. Jede Messung erstellt eine
vollständige temporäre Offline-Fixture, schließt `.env` aus und besitzt einen eigenen
Statepfad. Kein Kundeninhalt wird verändert. Der Rückgabewert des Saves wird geprüft.

Gemessen wird zuerst der kalte Editorzustand, dann eine DE-Titeländerung mit beiden
Sprachfassungen, anschließend eine reine Shared-URL-Änderung an derselben Seite.
Die Textfreigabe wird explizit im Testhelfer vorbereitet. Zeiten sind einzelne
Wallclock-Messungen in Millisekunden, keine Perzentile. Andere Prozesse des Leads
liefen zeitweise parallel. Die Skripte für Vorher/main/Nachher wurden nacheinander
ausgeführt; kein Kandidatenbuild ist Bestandteil dieses NativeStore-Mikrobenchmarks.

| Phase | Vorher 94d9c55 | main 399419f | Nachher 16ca3fb |
| --- | ---: | ---: | ---: |
| Kalter Zustand | 1.806 | 926 | 1.633 |
| DE-Textsave mit EN/NL | 33.674 | 6.203 | 4.088 |
| Anschließender Shared-Save | 9.207 | 1.911 | 2.709 |
| Review-Vorbereitung Text | 1.283 | <1 | 1.286 |
| Review-Vorbereitung Shared | 1.295 | <1 | 1.279 |

Die alten Helfer auf main benötigen keine V2-Feldprüfung; die Vorbereitungszeit ist
separat vom serverseitigen Save ausgewiesen. Die Hauptregression im Schreibpfad ist
behoben. Das strikte Ziel von höchstens +10 % ist für den warmen Shared-Save noch
**nicht erreicht**: 2.709 gegenüber 1.911 ms sind rund +42 %. Dieser Branch wird deshalb
nicht als vollständig mergebereit ausgegeben. Der Textsave liegt unter main.

Der Trace misst für den Shared-Save 2.709 ms, davon 998 ms für den neuen
Editorzustand und 350 ms für den Commit. Der veröffentlichte AFE-Stateaufbau beschreibt
auch verborgene Nachweislisten. Deren zusätzliche Daten und Beschreibung bleiben ein
Unterschied gegenüber main. Diese Messung belegt den verbleibenden Aufwand im
Zustandsaufbau; sie ist kein Nachweis, dass allein dort die verbleibende Differenz
entsteht. Die Browser-Reviewplanung wurde nicht umgebaut.

Logs: `/tmp/fs-p3-benchmark-{before,main,after,cached,trace,atomic}.log`.
CPU-Profile der unveränderten Ausgangsversion und der Zwischenstufe liegen unter
`/tmp/CPU.20261104.*.cpuprofile`. Der ursprüngliche Git-Sync-Nachweis reproduziert das
20-s-Timeout: 32.971 ms und 33.164 ms, Gesamtdauer 66.896 ms, ein Timeout.

## Prüfungen des Endstands

- Neue Guards: 2/2 bestanden, 0 Fehler.
- Gezielte Editor-/i18n-Suiten vor dem abschließenden Parsecache: 35/35 bestanden.
  Die neu ergänzte Parsecache-Abdeckung besteht anschließend separat. Nach dem atomaren
  Nachweiswrite bestehen Transaktionsmatrix und Guards erneut mit 11/11 Tests.
- Astro-Check: 0 Fehler, 0 Warnungen, 252 Hinweise.
- Build und `node scripts/check-i18n-build.mjs` erfolgreich. 32 DE-Routen,
  48 lokalisierte Inhaltsrouten, 16 lokalisierte Weiterleitungen.
- `python3 tools/compare-i18n-output.py /tmp/fs-i18n-p3-main/dist /tmp/fs-i18n-p3/dist`:
  96 HTML-Dateien, keine hinzugefügt, entfernt oder in Text/Attributen verändert.
- Git-Sync mit unverändertem 20-s-Timeout: 2/2 bestanden. Test 1 auf der Zwischenstufe: 17.340 ms, Test 2: 20.813 ms.
  Auf dem Endstand: 15.909 ms und 16.058 ms, Gesamtdauer 32.470 ms, 2/2 bestanden. Ein vorheriger Lauf unter paralleler
  CPU-Last überschritt das erste Limit knapp mit 20.819 ms.
- Ein erster Gesamtlauf wurde für die Ergänzung der konstanten Nachweiswrite-Kosten
  abgebrochen. Ein vollständiger neuer Lauf auf `16ca3fb` besteht mit dem unveränderten
  vorgegebenen Kommando und `--test-concurrency=2`: **706 Tests, 704 bestanden,
  2 übersprungen, 0 Fehler, 0 abgebrochen, 0 Todos, Exitcode 0**, Dauer 534.557 ms.
  Auch Git-Sync besteht innerhalb dieses Gesamtlaufs. Vollständiges Log:
  `/tmp/fs-p3-unit-final.log`.

```sh
node --test --test-concurrency=2 'editor/*.test.mjs' 'editor/core/*.test.mjs' 'editor/test/*.test.mjs' 'scripts/*.test.mjs' 'src/scripts/effects/*.test.mjs' 'src/scripts/*.test.mjs'
```

Keine CSS- oder Inhaltsänderungen. Keine `.env` gelesen, keine neuen Dependencies,
kein Push, Merge oder Deploy. Kein Browserlauf, keine Aufnahme, kein Livebetrieb,
kein echter Übersetzungsanbieter oder Mailversand. Verwendet wurde wie beauftragt
Node 22.22.1; die deklarierte AFE-Anforderung Node >=24.15.0 bleibt ungeprüft.
