# UI-Abhängigkeiten eingegrenzt

Stand 05.11.2026, Basis `origin/main` bei `3a3859d`, Worktree `/tmp/fs-ui-dep`, Branch `codex/ui-dependency-narrow`.

## Ursache und Prüfung

`offer.indoor.ceilingWords` nahm bisher das gesamte UI-Wörterbuch in seine fachliche Bedeutung auf. Deshalb machte jeder neue UI-Schlüssel die beiden Startseitenverträge ungültig. Die gemeinsame Vertragsprüfung konnte dadurch jede Seite mit HTTP 500 abbrechen.

`src/content/offer-core.mjs` liest bei ganzzahliger Deckenhöhe von 0 bis 12 genau `quantity.number${ceilingMin}`. Außerhalb dieses Bereichs gibt der Renderer die Zahl aus und liest keinen Wörterbucheintrag. `contract-dependencies.mjs` bildet nun dieselbe Bedingung ab. Beim aktuellen Wert 3 hängt der Token nur von `quantity.number3` ab. Der ausgewählte Eintrag bleibt mit allen Sprachwerten eine konservative Review-Abhängigkeit.

Die Prüfung der Fingerprint-/Meaning-Erzeugung in `src/i18n/` und ihrer Verwendung im Editor ergab genau eine vollständige UI-Abhängigkeit, diese Stelle. Die Preis-Tokens wählen bereits `price.from`, `price.fromApprox` und `price.fromApproxGuide` aus. `dependenciesFromRecords()` liefert zwar den vollständigen Snapshot, nimmt ihn aber nicht selbst in einen Fingerprint auf. Die Übergabe an `translatorFor()` dient der Auflösung. Die übrigen Token-, Referenz- und strukturierten Faktenabhängigkeiten übernehmen kein vollständiges UI-Wörterbuch. Keine weitere Korrektur war nötig.

## Mechanische Migration

Der Ausgangsstand wurde mit `readContractRecords()` und `auditContracts()` geprüft und in `/tmp/fs-ui-dep-contract-before.json` gesichert: 132 aktuelle Verträge mit 3.054 Feldnachweisen. Nach der Eingrenzung wurden dieselben Datensätze mit `project()` neu berechnet und mit dem bestehenden `stamp()`-Mechanismus sowie `verifyCurrent()` geprüft.

Geändert sind ausschließlich diese Metadaten in `src/content/pages/en/index.yaml` und `src/content/pages/nl/index.yaml`:

- `translationSourceHash` und `translationEvidence.sourceFingerprint` des Datensatzes.
- Der Quellfingerprint des Feldes `/sections/@k_a953dd6748c619e1514d/cards/@k_b52ddd7e74db16f54f73/text`.

Die Migration hat vor dem Schreiben identische Projektionen, Zielfingerprints und Inhalte ohne Vertragsmetadaten geprüft. Sie hat nur die berechneten Quellhashes im vorhandenen Rohtext ersetzt und das Ergebnis erneut gegen den gestempelten Datensatz geprüft. YAML-Formatierung, sämtliche Texte, `status: adopted-existing`, historische `legacy`-Angaben und alle übrigen Nachweise bleiben erhalten. Es wurde keine neue menschliche Übersetzungsprüfung erzeugt. Dieses Vorgehen führt die in Teil 1 und Teil 2 dokumentierte Bestandsübernahme fort; `adoptionEvidence()` wurde nicht erneut aufgerufen, damit vorhandene Nachweisstatus erhalten bleiben.

Das einmalige Migrationsprogramm und sein Bericht liegen unter `/tmp/fs-ui-dep-migrate.mjs` und `/tmp/fs-ui-dep-migration-report.json`. Es ist kein allgemeiner Befehl zum Freigeben veralteter Übersetzungen.

## Regressionstest

`scripts/i18n-ui-dependencies.test.mjs` verwendet alle 132 echten Sprachpaare. Ein neuer ungenutzter UI-Schlüssel darf weder Datensatz- noch Feldfingerprints ändern. Änderungen an `quantity.number3` und `price.from` müssen genau die tokenabhängigen Datensätze invalidieren. Zusätzlich werden andere Zahlwörter sowie die Grenzen 0 und 12, negative, größere und gebrochene Zahlen geprüft. Vor der Korrektur schlug der Test fehl, danach bestehen alle vier Fälle.

## Verifikation

Node `v26.13.0`, Installation mit `npm ci`. Alle Befehle liefen im eigenen Worktree. Der Hauptcheckout blieb unberührt.

- Regression vor der Korrektur: 1 bestanden, 3 fehlgeschlagen. Danach: 4 bestanden, 0 fehlgeschlagen.
- Relevante Unit-Suiten werden mit denselben Node-Testoptionen wie `scripts/run-unit.mjs` gezielt ausgeführt: `node --test --test-concurrency=2 'editor/i18n*.test.mjs' 'scripts/i18n*.test.mjs' 'scripts/*contract*.test.mjs' scripts/fact-references.test.mjs`. Ergebnis: 63 Tests bestanden, 0 fehlgeschlagen, 0 übersprungen. Der bestehende Runner akzeptiert keine Dateiauswahl und würde alle Unit-Suiten starten.
- `npx astro check`: 0 Fehler, 0 Warnungen, 247 Hinweise.
- `npx astro build`: 72 Seiten, erfolgreich.
- `node scripts/check-i18n-build.mjs`: 32 deutsche Routen, 48 lokalisierte Inhaltsrouten, 16 lokalisierte Weiterleitungen.
- `node editor/i18n-contract-audit.mjs`: 132 aktuelle Sprachverträge, 3.054 Feldnachweise.
- `npx playwright test 'tests/i18n*' --workers=2`: 20 bestanden. Kein vollständiger Playwright-Lauf.
- `python3 tools/compare-i18n-output.py /tmp/fs-ui-dep-before-html dist`: 96 HTML-Dateien, keine hinzugefügt oder entfernt, keine Änderungen der geordneten Textknoten und geprüften HTML-Attribute. Gerenderter HTML-Text unverändert.

Logs: `/tmp/fs-ui-dep-{unit,check,build,build-guard,playwright}.log`, Vergleich `/tmp/fs-ui-dep-html-comparison.json`.
