# Node-26-Spot-Check, 4. November 2026

## Quellen und Support

- Node 26.13.0 ist seit 28.10.2026 Active LTS, Codename Lithium, Support bis April 2029. Linux-Binaries benötigen seit Node 25 libatomic: https://nodejs.org/en/blog/release/v26.13.0 . Dies ist bei Hetzner zusätzlich zur angebotenen Node-Version zu prüfen.
- actions/setup-node kann veröffentlichte Node-Versionen auswählen/downloaden; upstream testet 22/24/26: https://github.com/actions/setup-node und https://github.com/actions/setup-node/blob/main/.github/workflows/versions.yml . Die Projekte nutzen bereits setup-node v6, das keine feste Liste zulässiger Node-Majors voraussetzt. Keine Notwendigkeit eines Action-Major-Upgrades für Node 26.
- Cloudflare Pages Build Image unterstützt laut Tabelle beliebige Node-Versionen via NODE_VERSION, .nvmrc oder .node-version: https://developers.cloudflare.com/pages/configuration/build-image/ . Hier erfolgt der eigentliche Site-Build schon in GitHub Actions; Wrangler lädt dist hoch. Pages Functions laufen in der Cloudflare-Runtime, nicht in Node 26. Kein Deployment ausgelöst.
- Playwright nennt neueste 22.x, 24.x und 26.x ausdrücklich als Systemvoraussetzungen: https://playwright.dev/docs/intro#system-requirements . sharp benötigt eine Node-API-v9-kompatible Runtime ab 20.9: https://sharp.pixelplumbing.com/install/ . Astro verlangt aktuell >=22.23.4 und unterstützt keine ungeraden Node-Linien: https://docs.astro.build/en/install-and-setup/ . Installierte Versionen/Engine-Bereiche siehe [Engine-Auswertung](node26-engines.json); kein Engine-Ausschluss von 26.13.0. Fehlendes engines-Feld bei better-auth ist keine ausdrückliche Supportzusage; Auth-/Browserprüfungen sind hier der praktische Nachweis. Native Tests nur auf macOS arm64; Linux ist erst nach CI-Lauf belegt.
- node:sqlite ist seit 25.7 Release Candidate. Seit 26.11 heißen DatabaseSync/StatementSync Database/Statement. Die alten Namen bleiben als deprecated aliases. Keine erzwungene Umstellung nötig; named import Database würde Node 24 brechen. defensive=true gilt bereits ab 24.14. Neu in 26.8: prepare ohne Statement wirft, DB-Zugriff im Authorizer-Callback wirft. AFE verwendet weder leere SQL-Statements noch einen Authorizer-Callback. https://nodejs.org/download/release/v26.12.0/docs/api/sqlite.html und https://nodejs.org/en/blog/release/v26.11.0 . Probe beider installierter Runtimes: DatabaseSync erzeugt DB und SELECT erfolgreich; SQLite jeweils 3.54.1, keine ExperimentalWarning.
- Hetzner dokumentiert die Versionsauswahl in konsoleH, aber keine verbindliche aktuelle Liste für dieses Konto: https://docs.hetzner.com/managed/administration-on-konsoleh/nodejs/ . Konto nicht aufgerufen. Node 26 dort nicht als verfügbar behaupten.

## Vorgeschlagener Umfang

Empfehlung: Entwicklungs-/CI-Standard auf Node 26 LTS umstellen, engines.node >=24.15.0 in beiden package.json und Lockfile-Wurzeln beibehalten. Eine Anhebung auf >=26 wäre ein unnötiger Kompatibilitätsbruch für bestehende AFE-Nutzer und Hetzner-Accounts. Kein Runtime-Refactoring nötig.

- Site: .nvmrc auf 26; alle sechs setup-node-Stellen übernehmen dies automatisch. scripts/unit-contract.test.mjs muss den neuen Standard erwarten, engines-Vertrag zum Registry-AFE bleibt gültig. scripts/check-production-delivery.mjs muss 24 und 26 akzeptieren. README und aktive deployment/production-delivery-Dokumentation aktualisieren. Historische Prüfberichte nicht umschreiben.
- AFE: .nvmrc auf 26; Verify-Matrix 24/26 und tatsächlich matrix.node an setup-node übergeben. Bisherige Matrixbeschriftung 24 hatte keinen Einfluss, da setup-node nur .nvmrc las. Publish- und Browser-Jobs übernehmen .nvmrc. README um Standard und weiterhin unterstützte 24-Linie ergänzen.
- Engines/Lockfile: keine Änderung nötig. >=24.15.0 erlaubt 26 schon heute.
- Launcher: bin/afe.mjs verwendet env node; FlyingStars editor/server.mjs und übergeordneter relaunch/server.mjs enthalten keine Node-24-Binary. Host-Hook startet Kandidaten mit process.execPath und npm mit dazu passendem PATH. Keine Quelländerung nötig.
- Hetzner: App-Auswahl und privaten deploy-config.sh-PATH gemeinsam auf 26 setzen, falls angeboten; node -v, npm ci, hosting-probe und Auth-/Build-Smoke dort prüfen. Private Konfiguration wurde nicht gelesen. Bis dahin 24 beibehalten.
- Aufwand: Quelländerungen etwa 30–60 Minuten einschließlich Review, CI-Lauf zusätzlich. Hetzner etwa 15–30 Minuten bei vorhandener 26-Runtime, andernfalls später. Kein größeres Refactoring.

## Durchführung und Grenzen

Worktrees /tmp/node26-site aus origin/main 8c9b268 und /tmp/node26-afe aus github/main 56874c3. Site a97b6f5 war beim Auschecken nicht in origin/main, daher nicht Bestandteil des Vergleichs. Die Produkt-Hauptarbeitskopie stand bereits auf 1ed5350, wurde nicht angefasst. Keine .env-/Token-Dateien gelesen, kein Push/Publish/Merge.

Node 26.13.0 vs. 24.22.2, beide Homebrew, dieselben unveränderten Lockfiles. Pro Runtime npm ci; 26-Installationen meldeten 4 s Site, 3 s AFE. Unit-Parallelität jeweils 2. Läufe beider Repos parallel auf derselben Maschine, deshalb Laufzeiten nur Beobachtungen, kein belastbarer Performancevergleich. AFE_FIXTURE_ROOT zeigt auf temporäre, um .env und privaten State bereinigte historische Fixture-Kopien; node_modules sind Links auf die vorhandenen Dependencies, generierte Collection-Schemas wurden für Shadow-Tests ergänzt. AFE_STATE_DIR ist für jedes Repo/jede Runtime separat unter /tmp/node26-evidence.

Erster AFE-26-Lauf: 301 Tests, 299 bestanden, 2 fehlgeschlagen, keine Skips, 178.12 s. Ursache waren beim Kopieren ausgelassene generierte Collection-Schemas für Bakery/Physio. Fixture-Kopie korrigiert; dieser Lauf ist kein Runtimefehler und wird separat vom abschließenden Lauf ausgewiesen. Keine Testassertions geändert.

## AFE-Ergebnis

- Node 24.22.2: Produktsuite 301/301 bestanden, 0 Fehler/Skips/Abbrüche, 165.30 s. Browser 11/11 bestanden, 22.36 s. npm ci 5.07 s, pack 0.95 s, beide Exit 0.
- Node 26.13.0, korrigierte identische Fixtures: Produktsuite 301/301 bestanden, 0 Fehler/Skips/Abbrüche, 257.74 s. Browser 11/11 bestanden, 33.06 s. npm ci laut npm 3 s, pack 0.88 s, beide Exit 0.
- Keine neuen Node-Deprecations/ExperimentalWarnings in diesen Läufen. Die Laufzeitdifferenz ist wegen wechselnder Last kein belastbarer Performancebefund.

## Site: Node-26-Baseline

Vollständige Unit-Suite: 715 Tests, 711 bestanden, 0 fehlgeschlagene Assertions, 1 wegen 20-s-Timeout abgebrochen, 3 übersprungen, Exit 1, 815.16 s. Abbruch in editor/git-sync.test.mjs, Szenario langsamer Push. Der Gesamtlauf ist damit nicht grün. Zwei DEP0205-Warnungen module.register() stammen aus scripts/show-node-env.mjs. Umstellung dieses reinen Testhelfers auf synchrone registerHooks ist eine kleine, auch mit Node 24 kompatible Änderung. Skips sind bestehende optionale Build-/Runtime-Gates; tatsächliche Namen im Log. Während der Prüfung wurde origin/main auf a97b6f5 aktualisiert, der Vergleich bleibt auf dem ursprünglichen 8c9b268, damit beide Runtimes denselben Code prüfen.

Site-Nachprüfung des langsamen Git-Push-Szenarios mit unverändertem Code und unverändertem 20-s-Limit: Node 26 ebenfalls Timeout, Exit 1 nach 21.44 s; Node 24 ebenfalls Timeout, Exit 1 nach 22.07 s. Somit auf beiden Runtimes reproduziert, nicht als neue Node-26-Inkompatibilität gewertet. Ursache nicht abschließend untersucht; weder Timeout noch Assertions gelockert.
Site Node 26: Astro-Check Exit 0, 21.13 s; Build Exit 0, 10.30 s; i18n-Buildprüfung Exit 0, 0.10 s. npm ci unter Node 24 Exit 0, 5.47 s. Vor dessen Unit-Lauf wurde dist aus dem 26-Build nach /tmp/node26-evidence/site-dist26 gesichert, damit die optionalen Build-Gates denselben Ausgangszustand erhalten.

Wrangler 4.147.0, wie im Cloudflare-Workflow verwendet: npm-Registry-Metadaten (`npm view wrangler@4.147.0 engines --registry=https://registry.npmjs.org`) deklarieren node >=22.0.0; ebenfalls kein Node-26-Ausschluss. Site-Node-24-Gesamtlauf reproduziert denselben Git-Sync-Timeout nach 20 s wie Node 26.

## Site: Node-24-Vergleich und Vorbereitung

Node 24: vollständige Unit-Suite 715 Tests, 710 bestanden, 1 fehlgeschlagen, 1 abgebrochen, 3 Skips, Exit 1, 671.81 s. Derselbe Git-Sync-Timeout plus T02-Speichern gemeinsamer Bausteine: `Inhalt gespeichert, Astro-Aufbau fehlgeschlagen. Der vorherige Seitenstand bleibt aktiv.` Node 26 hatte T02 bestanden. Keine neue Runtime-Deprecation unter 24. Astro-Check Exit 0, 13.76 s; Build Exit 0, 8.64 s; i18n-Prüfung Exit 0, 0.06 s. Gebündeltes npm 11.19.1 unter 24, npm 11.20.0 unter 26. Lockfiles blieben unverändert.

Nach dem unveränderten Vergleich: .nvmrc, Site-Vertragstest, Produktionstest-Majorguard und aktuelle Betriebsdoku angepasst; reinen Konfigurator-Testhelfer von module.register auf registerHooks umgestellt. Node 24 und 26 bestehen jeweils den Vertragstest und den echten Textformations-/JSON-Import-Test (`FLYINGSTARS`, scripts/show-motive15.test.mjs). Keine Deprecation in diesen Nachprüfungen. Kein vollständiger Site-Gesamtlauf nach den Änderungen wiederholt; beide Baseline-Gesamtläufe sind ausdrücklich rot. AFE-Gesamtläufe ebenfalls vor den reinen CI-/Dokuänderungen.

T02-Nachlauf unter Node 24: 1/1 bestanden, unveränderte Assertions, 42.86 s. Damit ist der zusätzliche Kandidatenbuild-Fehler im Nachlauf nicht reproduziert; keine gesicherte Root Cause. Zusätzliche Produktionstest-Prüfung unter Node 26: neuer Majorguard passiert, Check/Build laufen, anschließend ENOENT beim erwarteten Alias `production/projekte/heiratsantrag-hugenpoet/index.html`, Exit 1 nach 37.03 s. Die betreffende Prüfung liest diesen physischen Alias zusätzlich zur Kurzroute; keine Node-API-Fehlermeldung. Vergleich mit Node 24 siehe abschließende Ergänzung.

## Übergabe

Vorbereitete Änderungen sind nur lokal auf codex/node26 je Repository. Kein main-Commit, kein Push, kein Publish, kein Merge. Site-Branch basiert auf 8c9b268; vor Integration auf den nun vorhandenen a97b6f5 aktualisieren und dessen zusätzliche Guards berücksichtigen. Gesamtlaufzeiten sind keine Freigabeaussage für Performance. Linux-CI und Hetzner-Runtime nicht ausgeführt. Rohlogs, Fixture-Kopien, Engine-JSON und Zeitmessungen liegen unter /tmp/node26-evidence.

Abschließender Produktionstest-Vergleich: Node 24 scheitert ebenfalls mit identischem ENOENT für den Projekt-Alias, Exit 1 nach 40.86 s. Damit kein neuer Node-26-Befund. Dieser bestehende Routentestfehler wurde nicht repariert. Neue Majorguard- und JSON-Hook-Prüfungen sind separat grün.
