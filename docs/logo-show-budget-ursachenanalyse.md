# Logo-Empfehlung und Show-Budget

Stand: 12.11.2026, Ausgangspunkt `932efba`, Branch `feat/logo-modus`.

## Ursachen je Befund

Die Zeilen zum Ausgangszustand beziehen sich ausdrücklich auf `932efba`, die übrigen auf den Arbeitsstand dieser Änderung.

1. **Lamborghini steigt nach der Übernahme von 360 auf 895.** Im Ausgangszustand riefen Logo-Anlass und Show dieselbe Funktion mit `drones` auf (`src/scripts/show-configurator.js:277`, `:372`, `:389`). Der Übernahmeknopf setzte `drones` auf die Empfehlung (`:665`). Beim Zurückkehren wurde damit ein neues, größeres Konverterbudget gewählt. `auto` erlaubt dieselbe Flexibilität wie `flexible`, bis zum Dreifachen des Ankers (`src/scripts/logo-v10/converter/convert.mjs:568`). Der alte Cache `logo|id|drones|ver` verstärkte die Abhängigkeit von dieser veränderten Eingabe; er war kein unabhängiger Empfehlungsspeicher.
2. **Adidas nach einem hohen Lamborghini-Wert.** Dieselbe Budgetkopplung, auch beim Dateiaustausch. Eine neue Sitzung bekam die hohe Show-Drohnenzahl. Der jetzige Ablaufvergleich prüft Adidas nach Lamborghini gegen die direkte Auswahl in einer frisch geladenen Seite.
3. **Gleiche Detailtreue zum SPARK-Preis.** Die normale Show verwendete ebenfalls die flexible Formation ohne Prüfung `Punkte ≤ D` (`932efba:src/scripts/show-configurator.js:389`). `composeShow()` übernimmt die gelieferten Punkte direkt (`src/scripts/show-tempo.js:172`). Die Show muss deshalb bereits an dieser Übergabe ein tatsächlich begrenztes Bild bekommen.
4. **Automatikregler zeigt eine erfundene Ausgangsposition.** Der HTML-Standardwert war Stufe 8; die Berechnung schrieb die genutzte Dichte nicht zurück. Der Konverter meldet sie in `meta.density` bzw. `meta.auto.density` (`src/scripts/logo-v10/converter/convert.mjs:1792`). Die neue Rückmeldung wählt die nächste Stufe aus den vorhandenen `DENSITIES` (`src/scripts/show-configurator.js:306`). Die vorberechneten Beispiele geben diese Metadaten bisher nicht weiter (`src/scripts/logo-mode.js:179`).
5. **Cupra mit kleinem Bedarf landete in HORIZON.** Der Ausgangspunkt `932efba` enthält bereits die Korrektur in beide Richtungen (`src/scripts/show-configurator.js:724` im neuen Stand). Sie bleibt erhalten. Der Test bedient die niedrige Dichte per Tastatur und wartet auf das fertige Logo vor der Übernahme. Erwartung ist SPARK.
6. **Zwei getrennte Systeme?** Es gibt einen Konfigurator und einen Renderer. Der Anlasswechsel setzt `logoMode`; `sequence()` entscheidet damit zwischen `logoShow()` und der normalen Motivfolge (`src/scripts/show-configurator.js:435`). Getrennt werden jetzt die Rechenaufgaben Empfehlung und begrenzte Show-Fassung. Es entsteht keine zweite Bedienoberfläche.

Zusätzlich im echten Worker nachgewiesen: Eine explizite Dichte aktiviert die manuelle Konverterstrecke und umgeht dessen automatische Vereinfachung (`src/scripts/logo-v10/converter/convert.mjs:1281`). Lamborghini bei `strict`, `hardMax:100`, Dichte 0,6 ergab **1.048 Punkte**. Ohne explizite Dichte ergab derselbe strenge Aufruf **99 Punkte**, weiterhin Dichte 0,6. `strict` alleine ist damit kein ausreichender Nachweis für ein hartes Show-Budget.

## Modell und Umsetzung

- `LOGO_ANCHOR_MAX = 200`, Untergrenze `DRONES_MIN`. `logoWanted` hält den ausdrücklich im Logo-Anlass gewählten Wunschwert. Die Übernahme einer Empfehlung und Paketwechsel der normalen Show schreiben diesen Wert nicht zurück. Bei der Rückkehr zeigt auch der Wunschregler wieder diesen gespeicherten Logo-Wert. Erst der erste Logoaufruf initialisiert ihn aus der aktuellen Wahl.
- Die Empfehlung wird einmal je Datei, begrenztem Anker und Options-/Entfernungsrevision gerechnet. Große Zahl, Bedarfspunkt und Paketname verwenden die leuchtenden Punkte dieser Empfehlung. Dunkle Reserve zählt dort nicht mit.
- Bei Änderung des begrenzten Ankers wird die Empfehlungssitzung neu aufgebaut, mit denselben Optionen und Entfernungen. Damit beeinflusst kein Retarget-Ergebnis eines früheren Ankers die neue Berechnung.
- `D ≥ R`: Die normale Show übernimmt exakt die empfohlenen Lichtpunkte und ergänzt höchstens dunkle Reserve.
- `D < R`: Eine getrennte, anschließend entsorgte Sitzung rechnet mit `flex:strict` und `hardMax:D`. Zuerst nutzt sie die automatische Vereinfachung. Das Ergebnis wird nur akzeptiert, wenn es höchstens D Punkte hat und die Dichte der Empfehlung nicht überschreitet. Andernfalls folgen höchstens acht Versuche mit sinkender manueller Dichte. Keine abgeschnittene Punktliste. Passt das Logo trotzdem nicht, wird es mit Fehlermeldung ausgelassen und niemals über Budget dargestellt.
- Während einer Absenkung ersetzt die lebendige Wolke das bisherige Logo. Ein begrenztes Logo trägt den Bildtext „Euer Logo, vereinfacht für {n} Drohnen“. Der Text steht in DE/EN/NL samt Herkunftseinträgen bereit und nutzt die vorhandene Bildunterschrift. Keine Layout-, Farb- oder Abstandsänderung; kein Dichteschieber in der normalen Show.
- Automatisch positioniert den Dichteschieber anhand des vom Konverter gemeldeten Werts. Der nächste manuelle Schritt beginnt dort. Die Show-Berechnung überschreibt weder diesen Wert noch den Editor oder die Empfehlung.
- Empfehlung und Show haben getrennte Cache-Namensräume; der Show-Schlüssel enthält zusätzlich D und den Empfehlungsanker. Alte asynchrone Ergebnisse dürfen den neuen Logo-/Optionszustand nicht überschreiben.

## Vorberechnung und belegte Pfade

`exampleFormation(id,n)` liefert je Drohnenstufe flexible Formationen, bisher ohne Dichte. Daher nutzt die Integration diese Daten nur, wenn `meta.density` tatsächlich vorhanden ist; andernfalls rechnet sie live im Worker. Auch nicht vorberechnete Anker funktionieren so. Strenge Fassungen unterhalb der Empfehlung werden ebenfalls live gerechnet. Die erste Beispielwahl ist dadurch langsamer als der bisherige reine JSON-Abruf.

Der parallel arbeitende Konverter-Agent hat während der Prüfung `90b0e16` committet. Seine Pfade wurden von dieser Implementierung nicht geändert. Optionaler Vorschlag für `src/scripts/logo-mode.js` zur künftigen Vorberechnung, in `exampleFormation()` die vorhandene Metadatenzuweisung erweitern:

```diff
-  pts.meta = { frame:step.frame, elements:step.elements, colourGroups:step.colourGroups, spacing:step.spacing, n, over:pts.length>n };
+  pts.meta = { frame:step.frame, elements:step.elements, colourGroups:step.colourGroups, spacing:step.spacing, density:step.density, n, over:pts.length>n };
```

Der Generator muss dazu für jede Empfehlung `step.density = pts.meta.density` aus derselben Berechnung speichern, außerdem Konverterversion und vollständige Eingaben. Für sofortige Show-Vorschauen zusätzlich strenge Fassungen je D unter R, mit Dichteobergrenze und passenden Entfernungen als Eingaben. Für beliebig entfernte Teile bleibt der Worker erforderlich. Keine Metadaten rückwirkend schätzen und nicht nur den Arraykopf auf D kürzen.

## Prüfen

`tests/logo-show-budget.spec.ts` prüft die drei Abläufe einzeln mit einem Worker, jeweils in Chromium und WebKit bei frisch angelegten 1440 × 1000-Kontexten. Reduzierte Bewegung macht die fertige Formation deterministisch sichtbar. Die Tests prüfen Lamborghini → Übernahme → zurück, Adidas danach gegen direkte Wahl, strenges SPARK mit höchstens 100 tatsächlichen Lichtpunkten und sichtbarem Hinweis, die zur genutzten Dichte nächste Reglerstufe und Cupra → niedrige Dichte → SPARK.

Für den beauftragten Dev-Server wurde eine externe Konfiguration `/tmp/flyingstars-logo-budget.config.mjs` ohne eigenen Serverstart verwendet. Der Server auf Port 4391 wurde nicht beendet. Screenshots liegen unter `/tmp/logo-budget-{chromium,webkit}-{adidas,spark,cupra}.png`.

Abschließender Browserlauf: **6/6 bestanden**, drei je Engine, 30,8 Sekunden, ein Worker. Die Screenshots der fertigen Formationen und des sichtbaren Vereinfachungstextes wurden angesehen. JS-Syntaxprüfung, JSON-Parsing und `git diff --check` bestanden. Die Browserprüfungen liefen gegen den gemeinsamen Checkout einschließlich der Konverterarbeit, die inzwischen als `90b0e16` vorliegt. Nicht geprüft: eigenständiger Produktionsbuild/Astro-Check, durchgängige Monotonie aller manuellen Dichtestufen, vollständige bestehende Konfigurator-Browsersuite, mobile Breiten, Marcs Safari, EN-/NL-Browseransicht und beliebige Uploads/Entfernungskombinationen. Die Grenze der acht manuellen Budgetversuche ist bewusst endlich; ein nicht passendes Logo wird ausgelassen und als Konvertierungsfehler gemeldet.


Der beauftragte Unit-Lauf `PATH=/opt/homebrew/bin:$PATH nice node scripts/run-unit.mjs` lief vollständig durch, Exit 1 nach 875,9 Sekunden. Ergebnis: **752 Tests, 746 bestanden, 3 fehlgeschlagen, 1 abgebrochen, 2 übersprungen**. Log: `/tmp/flyingstars-logo-unit.log`.

- Bekannt rot: „All 132 full locale files carry current version 2 field evidence“ und „Freischalten: auch ein Paketwechsel meldet alle neuen Motive, in der Reihenfolge des Anlasses“.
- Zusätzlich im Gesamtlauf rot: der Masken-CSS-Wächter. Während des Laufs wurde die betroffene CSS-Stelle separat in `96a8972` korrigiert. Der gezielte Wiederholungstest `node --test --test-name-pattern='Masken enthalten keine Variablen' scripts/css-tokens.test.mjs` besteht jetzt, 1/1. Die CSS-Datei wurde von mir nicht geändert.
- Zusätzlich abgebrochen: „A slow remote push never holds the save lock; later content is pushed in the next round“, Timeout nach 20 Sekunden. Auch isoliert erneut Timeout, ohne Änderungen an diesem Mechanismus. Kein bestandener Baseline-Nachweis, deshalb ausdrücklich nicht als bestehender Fehler eingestuft. Wiederholungslog: `/tmp/flyingstars-logo-git-sync-recheck.log`.

Der Gesamtlauf startete vor den letzten kleinen Integrationskorrekturen und den parallelen Commits; die sechs abschließenden Browserprüfungen prüfen den fertigen Integrationsstand. Keine erneute Gesamtausführung der langen Physik-/Editorprüfungen. Kein eigener Konverter-Patch erforderlich; die oben vorgeschlagene Dichtemetadaten-Ergänzung ist eine optionale Beschleunigung der Vorberechnung, der Live-Fallback funktioniert bereits ohne sie.

## Ergänzung: vorberechnete Beispiele und Mindestbedarf (12.11.2026)

Diese Ergänzung ersetzt die oben beschriebenen Einschränkungen der Vorberechnung und das Auslassen nicht passender Logos.

- `tools/v10/configurator-examples.mjs` im Konverter-Projekt erzeugt Schema 3: elf automatische Empfehlungen für die Anker 100 bis 200, einschließlich tatsächlich gemeldeter Dichte, Teilwahl und Automatikmetadaten. Je Anker werden alle Show-Stufen von 100 bis unter die tatsächliche Empfehlung abgedeckt. Die alten Empfehlungen für 210 bis 1000 entfallen.
- Identische Formationen werden über Inhaltsreferenzen gemeinsam gespeichert. Strenge Rechnungen mit identischem Budget und identischer Dichteobergrenze werden nur einmal durchgeführt. Quelldatei- und Konverterhash, Optionen und Anker-/Schrittparameter stehen in jeder Datei. Farben, Teile, Bearbeitungsanker und die verlustfrei gepackten, auf 0,001 normalisierten Koordinaten bleiben erhalten.
- `exampleFormation(id, anchor, showBudget?)` liefert Empfehlung oder strenge Show-Fassung. Automatische, unveränderte Beispiele nutzen beide Pfade ohne Konverter-Worker. Eigene Dateien, manuelle Dichte und entfernte Teile bleiben live.
- `integration/budget-formation.mjs` im Konverter-Projekt ist der gemeinsame Mechanismus für Vorberechnung und Live-Pfad und wird durch `integration/vendor.mjs` kopiert. Er prüft die automatische strenge Fassung, senkt gegebenenfalls die Dichte und prüft zuletzt explizit die Untergrenze 0,03. Die Dichteobergrenze bleibt diejenige der Empfehlung. Es werden ausschließlich vollständige Formationen verwendet.
- Passt keine geprüfte Fassung, wird die kleinste vollständige Fassung gezeigt. Der Bildtext nennt ihren tatsächlichen Mindestbedarf über `logoMode.minimum` in DE/EN/NL. Eine Budgetunterschreitung erzeugt keinen Konvertierungsfehler im Panel. Tatsächliche Datei-/Konverterfehler bleiben Fehler.
- Der Datenwächter in `src/scripts/logo-budget.test.mjs` prüft alle 16 Beispiele und alle Anker-/Budgetreferenzen. Die Budgettests prüfen sinkende Dichte und den Mindestbedarfsfall. Die Browsersuite prüft zusätzlich, dass Beispiele keinen Logo-Worker starten und dass ein deterministisch nicht passendes Beispiel vollständig mit Mindestbedarf, ohne Panel-Fehler erscheint.
- Der frühere Git-Sync-Timeout entstand durch die Vorbereitung: `i18nFixture()` kopiert und initialisiert die gesamte Site. Ein isolierter Messlauf brauchte dafür bereits 18,8 Sekunden. Die 20-Sekunden-Grenze gilt jetzt im Untertest ausschließlich für das eigentliche Lock-/Push-/Save-Szenario; dessen Vorbereitung liegt davor. Der gezielte Wiederholungslauf besteht, das Szenario selbst benötigt rund 7 Sekunden.

Die Änderungen an Generator und Paritätswerkzeug liegen absichtlich uncommittet im Hub-Konverter-Projekt. Dort wurde wegen des vorhandenen Merge-Konflikts kein Commit erzeugt. Die Site enthält die erzeugten Daten und den vendorten Budgetmechanismus. `show-field.js` und dessen neue Testdatei gehören zum parallelen Auftrag und wurden hier nicht bearbeitet.

### Prüfergebnisse dieser Ergänzung

- Vorberechnung vollständig: 16 Dateien, jeweils elf Empfehlungsanker. Gzip je Datei 3.680 bis 44.454 Bytes; alle Einzelmessungen stehen in `public/media/logo-modus/beispiele/sizes.json`. Die bestehende Obergrenze von 110.000 Bytes im Datenwächter wurde nicht gelockert.
- Chromium-Parität: 212/212 exakt, davon 176 Empfehlungen, 32 strenge Fassungen und vier manuelle Referenzen. Verglichen werden die auf 0,001 normalisierten Koordinaten samt Farben, Element-/Farbgruppen-IDs und bei vorberechneten Fassungen zusätzlich Dichte und Teilwahl. JavaScripts negative Null wird wie im bisherigen JSON-basierten Vergleich als Null behandelt.
- Unit-Gesamtlauf: 760 Tests, 739 bestanden, 19 fehlgeschlagen, null abgebrochen, zwei übersprungen; 1.035,2 Sekunden. Davon waren 17 Datenprüfungen noch auf Schema 2 und die alten Anker bis 1000 eingestellt. Sie sind auf Schema 3 und die tatsächlichen elf Empfehlungsanker umgestellt; der Nachweis der gelöschten Adidas-Schrift und der erhaltenen gelben IKEA-Kontur bleibt erhalten. Gezielter Abschlusslauf `node --test src/scripts/logo-mode-examples.test.mjs src/scripts/logo-budget.test.mjs`: **22/22 bestanden**. Kein erneuter vollständiger Physik-/Editorlauf nach dieser Testanpassung.
- Die beiden bekannten Fehler sind weiterhin „All 132 full locale files carry current version 2 field evidence“ und „Freischalten: auch ein Paketwechsel meldet alle neuen Motive, in der Reihenfolge des Anlasses“. Der Masken-CSS-Wächter besteht sowohl gezielt als auch im Gesamtlauf. Der bisher wegen Timeout abgebrochene Git-Sync-Test besteht jetzt ebenfalls im Gesamtlauf; der separate Git-Sync-Lauf ist 3/3 grün.
- Logs: `/tmp/flyingstars-logo-unit-new.log`, `/tmp/flyingstars-logo-git-sync-fixed.log`, `/tmp/logo-new-unit-targeted.log`, `/tmp/logo-new-parity-chromium.log`. Der Dev-Server auf 4391 wurde weiterverwendet und nicht beendet. Keine Änderungen an Layout, Farben oder Abständen.
- WebKit-Parität ebenfalls **212/212 exakt**, gleicher Umfang wie Chromium. Ergebnisdateien im Konverter-Projekt: `screens/v10-fourth-round-followup/parity-{chromium,webkit}.json`; Log `/tmp/logo-new-parity-webkit.log`.
- Abschließende `tests/logo-show-budget.spec.ts`, einzeln je Engine mit einem Worker gegen Port 4391: **Chromium 4/4**, **WebKit 4/4**. Einschließlich Beispielwahl ohne gestarteten Logo-Worker, strenger SPARK-Fassung ohne Logo-Worker und sichtbarer vollständiger Mindestfassung ohne Panel-Fehler. Logs `/tmp/logo-new-browser-{chromium,webkit}.log`. Syntaxprüfungen, beide UI-JSON-Parser und `git diff --check` bestanden.
- Nicht geprüft: Produktionsbuild/Astro-Check, vollständige Konfigurator-Browsersuite, mobile Breiten, Marcs Safari, EN-/NL-Browseransicht, beliebige Upload-/Entfernungskombinationen und alle strengen Budgets live. Die Paritätsprüfung deckt alle elf Empfehlungsanker sowie je Logo zwei strenge Budgets am Anker 200 ab; der Datenwächter prüft sämtliche gespeicherten Anker-/Budgetreferenzen.
