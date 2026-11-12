# Vorschau bis 1000 Drohnen: Folgekorrekturen

Stand: 12.11.2026. Uncommittete Korrekturen auf `feat/logo-modus`; keine Änderungen an den parallel bearbeiteten Konfigurator-, Field- oder Logo-Dateien.

## Verhalten und Ursachen

- Die zweite Freischaltschwelle ist eine inhaltliche Entscheidung, kein Mittelwert des Reglers. `SECOND_UNLOCK` hält SPARK bei 150, HORIZON bei 250 und ODYSSEY bei 450. `show-unlock.test.mjs` prüft die konkreten Werte.
- Die Bokkenrijders-Quelldatei enthält 600 Originalpunkte. `evenSubset` soll diese ausdünnen, nicht neue Punkte erfinden. `devilBeat` weist zusätzliche Drohnen als `offstageDrones` aus. Die Engine lässt Drohnen außerhalb des aktuellen Motivbudgets dunkel ausfliegen. Der Zählvertrag lautet Motivpunkte plus explizite Offstage-Reserve gleich angeforderte Drohnenzahl. Ein eigener Wächter prüft bei 650/800/1000 die 600 verschiedenen Originalpunkte und die Reserve.
- Der Herzrahmen eigener Texte war auf 159 Punkte begrenzt. Er verwendet jetzt `heartOutline(k)`, einschließlich der zweiten Kontur bei großen Budgets. Der bestehende Text-Wächter prüft alle Schriften an den Paketgrenzen.
- Die bisherige Bewegungserkennung übersprang durch 24 Punktstichproben bei 1000 Drohnen sämtliche Radpunkte des Golfcaddys. Ohne `steadyClock` drehten sich die Räder schon während des Anflugs; ihre Restgeschwindigkeit wirkte bis in den nächsten Wechsel zur Planierraupe. `moves` prüft jetzt jeden Punkt. Ein zusätzlicher Wächter prüft den ruhenden Anflug der kleinen bewegten Teile bei 600/800/1000.
- Die Torus-Schlauchdrehung überlagerte sich mit Gesamtdrehung und Kippen. Die Schlauchdrehung bleibt bei fester Neigung erhalten. Ein Zoom von 0,85 für das Spiral-Motiv gibt den perspektivisch vergrößerten Punkten Raum, damit der untere Rand nicht angeschnitten wird. Die unveränderten Finten-Grenzen prüfen die tatsächliche Engine.
- Die Startseiten-Vorschauangabe liegt in diesem Checkout in `src/content/pages/{,en/,nl/}index.yaml`, nicht im UI-Wörterbuch. Ausschließlich dieser Satz wurde von 600 auf 1000 geändert. Angaben zu tatsächlich geflogenen Shows bleiben erhalten. `ui.json` und `ui-provenance.json` wurden von dieser Korrektur nicht bearbeitet.

## Nachweise

- Gezielter Lauf von Zähl-, Freischalt- und Motiv-15-Tests: 16/16 grün vor dem zusätzlichen Golfcaddy-Wächter. Protokoll `/tmp/flyingstars-followup-targeted.log`.
- Gezielte Finten-Simulationen `jubilaeum/ODYSSEY/1000` und `launch/ODYSSEY/1000`: jeweils null Treffer. Protokolle `/tmp/flyingstars-finte-jubilaeum.log` und `/tmp/flyingstars-finte-launch.log`.
- Vollständiger Unit-Lauf: `/tmp/flyingstars-followup-unit.log`.
- Angesehene Screenshots: `/tmp/flyingstars-followup-proof-top.png` und `/tmp/flyingstars-followup-proof-bottom.png`. Je 800/1000 für Teufel, Text mit Initialen/Herz, Torus, Golfcaddy und Planierraupe.

Die normale Seite antwortete bei der Prüfung mit HTTP 500 (`Missing or stale en translation contract`). Die Screenshots stammen daher aus einer temporären statischen Prüfseite am bestehenden Dev-Server mit den echten Motivbauern und der echten Canvas-Engine. Kopie der Prüfseite: `/tmp/flyingstars-range-proof.html`. Die öffentliche temporäre Datei und der eigene Browser-Tab wurden anschließend entfernt. Kein vollständiger Konfigurator-/Browser-Physiknachweis und keine Aufnahme in dieser Runde. Die Editor-Nachprüfung enthält echte private Astro-Test-Builds; ein separater Produktionsbuild wurde nicht gestartet. Die von Marc ausdrücklich beauftragte reine Zahlkorrektur wurde anschließend über `localeTransactions.prepareTransaction` mit exakten Quell-/Zielfingerprints bestätigt. Nur das betroffene Teaser-Feld und die daraus berechneten Sprachdatei-Hashes wurden mit dem bestehenden YAML-Codec aktualisiert. Andere Feldnachweise blieben erhalten.


## Abschließendes Testergebnis

Der beauftragte Gesamtlauf `PATH=/opt/homebrew/bin:$PATH nice node scripts/run-unit.mjs` lief vollständig durch: 751 Tests, 731 bestanden, 18 fehlgeschlagen, 2 übersprungen, 829,1 Sekunden. Zähl-, Finten-, Raketen- und Antragstests sind grün. Die unveränderte vollständige Finten-Prüfung deckt alle Anlässe und Paketgrenzen ab.

Elf Fehler dieses Laufs entstanden vor der Aktualisierung des Teaser-Feldnachweises. Die betroffenen sechs Editor-Testdateien wurden danach mit `--test-concurrency=1` erneut geprüft: 26/26 grün, einschließlich aller elf zuvor fehlgeschlagenen Fälle. Protokoll: `/tmp/flyingstars-followup-editor-recheck.log`. Es wurde kein zweiter vollständiger Gesamtlauf gestartet.

Verbleibende Fehler aus dem Gesamtlauf:

- `All 132 full locale files carry current version 2 field evidence`: bekannter Test erwartet für jedes Feld ausschließlich `adopted-existing`; vorhandene regulär geprüfte Felder verletzen diese veraltete Erwartung.
- `Freischalten: auch ein Paketwechsel meldet alle neuen Motive, in der Reihenfolge des Anlasses`: bekannt, erwartet `falter`, aktuelle Motivdaten liefern `amor` und `lotusblume`.
- `canonical example rasters match their source hashes and RGBA dimensions`: Logo-Quellhash stimmt nicht mit Rasterhash überein.
- `prepared logo duolingo`: gzip größer als 110 KB.
- `prepared logo lamborghini`: fehlende `lamborghini.json`.
- `prepared logo shell` und `prepared logo target`: Formatversion 1 statt 2.

Die fünf Logo-Fehler gehören den parallel arbeitenden Agenten. Ihr Stand wurde nicht verändert oder separat nachgetestet. `git diff --check` ist sauber. Kein Commit, kein Zurücksetzen und kein Eingriff in die gesperrten Dateien. Der bestehende Dev-Server bleibt aktiv.

## Von dieser Korrektur bearbeitete Dateien

- `src/content/show-configurator.js`
- `src/scripts/show-scenes.js`
- `src/scripts/scenes/text.js`
- `src/scripts/scenes/launch.js`
- `scripts/show-counts.test.mjs`
- `scripts/show-unlock.test.mjs`
- `src/content/pages/index.yaml`
- `src/content/pages/en/index.yaml`
- `src/content/pages/nl/index.yaml`
- `docs/show-range-1000-followup.md`
