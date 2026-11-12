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
