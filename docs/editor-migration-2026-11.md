# AFE-Migration auf die neue FlyingStars-Site

Der aktuelle Release-Nachweis für `codex/afe-030` steht am Ende dieses Berichts. Die folgenden Abschnitte dokumentieren den davor geprüften Migrationsstand; dessen damalige Release-Lücken sind dort ausdrücklich aufgelöst.

Historischer Migrationsnachweis vor dem Release, 2. November 2026. Site-Branch `codex/editor-migration`, Ausgangspunkt `46cf22d`. Privates Produkt: Branch `codex/design-file-editor` im eigenen Repository. Die Produktquellen sind ausschließlich dort gespeichert. Die Migration ist lokal mit diesem Produktstand lauffähig; die Installation aus GitHub Packages benötigt dessen noch ausstehendes Release **0.3.0** und danach die entsprechende Versionsanhebung im Site-Manifest samt Lockfile. Es wurde kein Paket veröffentlicht und nichts nach `main` gepusht.

## Verhalten und Herkunft

Der Editor liest die 198 tatsächlichen DE-/EN-/NL-Inhaltsdateien sowie Wörterbuch, Navigation und Paketkonfiguration. Typen, Felder, optionale Werte und Listenaktionen entstehen aus den Zod-Schemas. Die 31 Abschnittstypen werden aus der aktuellen Union gewonnen. Historische Paket-, Kontakt-, Bildschirm- und Übersetzungs-Overlay-Datensätze sind nicht mehr Teil des aktiven Adapters.

Die private Produktintegration instrumentiert die tatsächliche Astro-Syntax vor der Astro-Kompilierung. CollectionEntry, Props, Aliasse, Array-Indizes, kopierte View-Objekte und deklarierte reine Transformationen tragen Herkunftsadressen zu den Render-Markern weiter. Wörterbuchtexte deklarieren ihre Adresse am tatsächlich verwendeten Übersetzer. Optimierte Bilder behalten den Eigentümer des ursprünglichen Bildobjekts. Es gibt keinen Textvergleich und keinen Selektorkatalog. Nicht auflösbare Ausdrücke bekommen keine erfundene Bindung; ihre Quelldaten bleiben im schemaerzeugten Panel bearbeitbar. Beliebige neue JavaScript-Transformationen benötigen gegebenenfalls eine Herkunftsdeklaration am Renderer.

Texte werden auf der gerenderten Seite bearbeitet. `*Akzente*` verwenden den aktuellen Verlauf, Markdown seine eigene Formatierung. Gespeicherte Änderungen landen in den Quelldateien; Astro rendert daraus die Vorschau. Die Abschnittsliste unterstützt Einfügen, Duplizieren, Verschieben und Entfernen innerhalb ihrer Schema-Grenzen. Die deutsche Struktur wird dabei in EN/NL übernommen und vorhandene Übersetzungen werden ihren Einträgen zugeordnet.

Eine deutsche Speicherung öffnet die gemeinsame EN-/NL-Prüfung. Nach Bestätigung werden die vollständigen Sprachdateien, `translationSourceHash` aus den tatsächlichen deutschen Ausgabebytes und `docs/i18n/content-provenance.json` atomar committed. Eine DE-Änderung ohne Sprachprüfung wird serverseitig abgelehnt. EN-/NL-Korrekturen verändern keine deutschen Bytes. Ungespeicherte Vorschauen passen Hashes ausschließlich in ihrer Wegwerf-Kopie an.

Die Mediathek vereinigt tatsächlich verwendete externe Bildobjekte mit normalisierten Uploads. Uploads erzeugen `public/assets/<sha256>.<ext>` und Metadaten unter `src/content/editor-media/`. Ein erneuter Upload derselben normalisierten Bytes verwendet denselben Eintrag. Beim Ersetzen bleiben kontextbezogene Alternativtexte und Bildunterschriften erhalten; Maße werden aus dem Bild übernommen. Abschnittsbilder und Fallstudienfotos verwenden dieselbe freigegebene Quellenregel. Lokale Uploads wurden zusätzlich durch den tatsächlichen produktiven Bild-Renderer gebaut.

Die Paketfakten stehen jetzt in `src/content/show-packages.json`, Links und Menüstruktur in `src/content/navigation.json`. Die bestehenden Preisformeln bleiben bestehen. Die Zod-Schemas validieren beide Dateien beim Astro-Start. Beschriftungen, die das Wörterbuch verwenden, schreiben weiterhin nach `src/i18n/ui.json`.

## Testmigration

Ausgangslauf: **334 Tests, 250 bestanden, 84 fehlgeschlagen, keine Skips**. Die neuen Tests prüfen das heutige Dateimodell; sie konservieren keine entfernten Overlay-Verträge.

| Frühere Annahme | Aktueller Nachweis |
| --- | --- |
| JSON-Pakete, `site/contact`, separate Screens | `collections`, `metadata`, `design-schema`, `content-navigator`: tatsächliche 201 Eigentümer und aktuelle Schema-Union |
| Overlay-Namen, Feldhashes, Format-1/2-Migration | `i18n-values`, `i18n-e2e`, `translation-core`, `translation-format`: vollständige Dateien, exakte Byte-Hashes, atomare Provenienz, keine schreibbaren Frischefelder |
| Alte Listen-/Abschnittsformen | `native-operations`, `prepare-cloned-section`, `browser-extensions`: alle fünf Listenaktionen, Übersetzungseigentum und gemeinsames Undo |
| Alte Kontur-/Versalien-Tokens | `inline-format`, `outline-content`: aktueller Sternchen-Akzent, HTML-Escaping, getrennte Markdown-Regeln |
| `assetId` und Schattenwerte im Inhaltsobjekt | `image-schema`, `media-usage`, `media-pipeline`: tatsächliche Quellen, Verwendung, Metadaten, Upload-Deduplizierung und produktiver Renderer |
| Alte Besitzer-/Canvas-Selektoren | `canvas-runtime`, `view-state`, Produkt-Instrumentierungstests und echter Browserlauf: kanonische Render-Marker und aktueller Codec |
| Externe Bäckerei-/Physio-Dateien im Codec-Test | Lokale versionierte Dateien unter `editor/test/fixtures/`; keine externe Site nötig |
| Historische Pipeline-Inhalte | Echte isolierte Git-Repositories mit aktueller Site, Installation des lokalen privaten Produkts, CI, Deploy, Freigabe, Rebase, Konflikt und Buildfehler |

Die Pipeline-Fixture kopiert ausschließlich deklarierte Paketdateien des privaten Produkts in ein separates temporäres Verzeichnis außerhalb ihres Site-Gits. Nur ihr temporäres Manifest/Lockfile bekommt einen lokalen Paketbezug. Sie entfernt die alte Registry-Integrität vor der Lockfile-Auflösung: npm würde sonst trotz geändertem `resolved` weiterhin die alten Paketbytes aus dem Cache installieren. Im öffentlichen Site-Manifest bleibt der veröffentlichte Versionsbezug erhalten.

Die normalen Site-Fixtures ersetzen externe Bildmaßabfragen durch ausdrücklich deklarierte Offline-Maße. Der Upload-Renderer-Test verwendet dagegen den unveränderten produktiven Resolver. Browserprüfungen sind damit ein Nachweis für Bedienung, Dateispeicherung, lokale Rasterbilder und Astro-Neurendering; sie ersetzen keine Prüfung externer Medienanbieter oder eines produktiven Hosts.

## Produktänderungen für 0.3.0

Privates Repository: `/private/tmp/afe-editor-migration`, Branch `codex/design-file-editor` (Hauptänderung `e6e3589`, View-Provenienz `1efb7b7`, Speicher-Vorschau `c2fb020`). Benötigt werden:

- Exporte `./astro/markers` und `./markers/scoped`, direkte Laufzeitabhängigkeit `@astrojs/compiler-rs`.
- AST-basierte Render-Provenienz einschließlich asynchron aufgebauter View-Objekte und deklarierter Bildtransformationen.
- Explizite Feldformate und Codec-Fähigkeit `baseButtons`; normale Markdown-Werkzeuge bleiben erhalten.
- Asynchrones `beforeSave` und `selectedMedia` im Browser; korrekte Anwendung gespeicherter Vorschauen, wenn schnelles Speichern die laufende Vorschau überholt.
- Serverseitige `transactionArtifacts` und `previewFiles` für atomare Nachweise bzw. private Vorschau-Dateien.
- Auflösung gewöhnlicher Union-Knoten sowie effizientere Schema-/Template-Berechnung und gebündelte Lesezugriffe ausschließlich auf registrierte Quellen.
- Bedienbare Medienmarker, Diagnoseursache bei fehlgeschlagener Deployment-Installation und Schutz versteckter schreibgeschützter Felder.

Version und Veröffentlichungsmanifest des Produkts müssen beim regulären privaten Release von 0.2.4 auf **0.3.0** angehoben werden. Anschließend in der Site die Alias-Abhängigkeit auf `npm:@marc-viladrich/astro-frontend-editor@0.3.0` aktualisieren und das Lockfile mit der veröffentlichten Paketintegrität neu erzeugen. Bis dahin funktioniert der normale Editorstart mit lokal verlinktem Produkt. Der Launcher nennt die Voraussetzung, falls noch das alte Paket installiert ist.

## Sicherer lokaler Start

Node 24.15+ im PATH verwenden; `.nvmrc` verlangt Node 24. Der lokale Homebrew-Link war defekt. Für die Nachweise wurde Node **24.21.0** aus dem npm-Node-Paket verwendet. Die Site-Gates wurden mit Homebrew-Node **22.22.1** ausgeführt.

In dieser Arbeitsumgebung lässt sich der bereits geprüfte Node-24-Download unmittelbar aktivieren:

```sh
export PATH=/Users/marcviladrich/.npm/_npx/387698761821791d/node_modules/.bin:/opt/homebrew/opt/node@22/bin:$PATH
node --version # v24.21.0
```

Für einen lokalen Probelauf empfiehlt sich eine unabhängige Kopie, weil der Editor echte Inhaltscommits erzeugt:

```sh
# Mit funktionsfähigem Node 24.15+:
cd /private/tmp/afe-editor-migration
npm link

git clone --single-branch --branch codex/editor-migration \
  /private/tmp/fs-editor-migration /tmp/flyingstars-editor-demo
cd /tmp/flyingstars-editor-demo
git switch -c content/draft
git branch main HEAD
npm ci
npm link astro-frontend-editor --no-save --package-lock=false

node editor/manage-accounts.mjs add editor --name 'Lokaler Test' \
  --email editor@example.invalid --state-dir /tmp/flyingstars-editor-demo-state
AFE_STATE_DIR=/tmp/flyingstars-editor-demo-state AFE_GIT_REMOTE=off npm run editor
```

Das Account-Werkzeug fragt das Passwort interaktiv ab. Den ausgegebenen lokalen Editor-Link öffnen und mit diesem Testkonto anmelden. Keine bestehenden State-Verzeichnisse übernehmen. Beim späteren regulären Betrieb sind Branch- und Remote-Einstellungen gemäß Deployment-Dokumentation bewusst einzurichten; der obige Probelauf schiebt keine Inhaltscommits zu GitHub.

Reproduzierbarer Browsernachweis, mit lokalen Testkonten und ausdrücklich temporärem State:

```sh
AFE_EVIDENCE_DIR=/tmp/flyingstars-browser-proof node editor/design.browser.mjs
```

Der Lauf erstellt selbst eine unabhängige Site-Fixture, verwendet Chromium und WebKit, meldet sich über die Oberfläche an, tippt die Headline mit der Tastatur, prüft EN/NL, lädt ein PNG hoch, wählt es aus und liest die gespeicherten Dateien sowie den gerenderten Build zurück. Cookies werden nur mit Namen und Sicherheitsattributen protokolliert, ohne Werte. Ports 4763/4764 müssen frei sein.

Die frühere `translate-missing`-CLI ist jetzt ein Audit vollständiger Sprachdateien:

```sh
node editor/translate-missing.mjs --locale en --dry-run --state-dir /tmp/flyingstars-i18n-audit
```

Automatische Übersetzungsvorschläge aus dem historischen Overlay-Dienst sind nicht migriert. Die bestätigte Funktion ist die manuelle gemeinsame DE-/EN-/NL-Prüfung. Externe Übersetzungsdienste, echte Host-Anmeldung, TLS, GitHub-Deploy und die realen privaten Konten wurden nicht verwendet.

## Externe Produkt-Fixtures

Die Codec-Suite der Site ist vollständig lokal und hat keine Skips. Die **21 vorhandenen Skips im privaten Produkt** sind davon getrennt: `test/helpers.mjs` erwartet relativ zum übergeordneten Produktordner drei historische Astro-Sites, jeweils mit auflösbarem `astro/package.json` und lauffähigem Astro-CLI:

- `clients/flyingstars/15-editor-ui-2026-10-13/relaunch/source`
- `editor-lab/site-a-baeckerei`
- `editor-lab/site-b-physio`

Im hier verwendeten Produkt-Worktree lösen sie nach `/private/tmp/...` auf und fehlen. Betroffen sind `checker-sites` (3), `integration` (3), `loaders` (5), `metadata` (2), `setup-apply-sites` (2), `setup-sites` (3) und `shadow` (3). Diese Tests vergleichen die eingefrorenen Ausgangssites mit den versionierten Dateien unter `test/snapshots/*-checker.json`, `*-setup.json`, `pilot-shadow.json` sowie den Lab-Descriptor-Snapshots. Für ihre Ausführung müssen genau diese historischen Site-Fixtures einschließlich ihrer ursprünglichen Loader und Schemas wiederhergestellt und ihre Abhängigkeiten installiert werden. Die neue FlyingStars-Site an den alten Pfad zu verlinken würde die Erwartung verfälschen. Keine dieser Prüfungen wurde für diese Migration zusätzlich übersprungen oder abgeschwächt.

## Umfang des Merge

Die dauerhaften Site-Änderungen betreffen Adapter, Launcher, Editorerweiterungen, Tests und Dokumentation. Die kleinen Renderänderungen liegen in `astro.config.mjs`, `Accent`, `SectionRenderer`, `TextMedia` und `BlogPost`; zusätzlich deklarieren Wörterbuch, Navigation und Bild-Renderer ihre Herkunft. Inhaltliche Designtexte wurden nicht umgeschrieben. Paket- und Navigationsdaten sind aus dem bestehenden Code in validierte JSON-Dateien verschoben. Die Metadaten an den gemeinsamen Schemas müssen beim Merge mit parallel ergänzten Feldern/Abschnittstypen erhalten bleiben.

## Ausgeführte Prüfungen

| Prüfung | Ergebnis |
| --- | --- |
| Editorsuite vorher | 250/334 bestanden, 84 Fehler, 0 Skips |
| Editorsuite nachher | **402/402 bestanden, 0 Fehler, 0 Skips** |
| Site-Node-Gates, alle drei angeforderten Globs | **104/104 bestanden** |
| `npx astro check`, Node 22 | **0 Fehler, 0 Warnungen**; bestehende Hinweise bleiben |
| `npm run build`, Node 22 | **65 Seiten**, erfolgreich |
| Acht angeforderte Playwright-Specs, `--workers=3` | **925 bestanden, 7 vorhandene Skips**, alle vier konfigurierten Browser-/Geräteprojekte |
| Private Produktsuite | 270 bestanden, 21 oben beschriebene externe Lab-Prüfungen ausgelassen |
| Zusätzliche aktuelle Produktprüfungen für Instrumentierung, Schema, Registry, Speicher, Vorschau und Paket | **59/59 bestanden** |
| Zusätzliche Vorschau-/Speicherprüfungen nach Korrektur des schnellen Speicherns | **25/25 bestanden** |
| NativeStore-/Listen-/Hash-Integration mit kanonischer Kandidatenrevision | **20/20 bestanden** |
| Produktiver Upload-Renderer mit echten normalisierten PNG-Bytes und erneutem Upload | **1/1 bestanden** |
| Visitor-Check und -Build mit installiertem veröffentlichtem AFE 0.2.4 statt lokalem Link | **0 Typfehler, 65 Seiten gebaut** |

Die sieben Playwright-Skips stammen aus den vorhandenen Geräte-/Browserbedingungen: Preisreiter auf Desktop/desktop-WebKit, Scrollstory auf Mobile/WebKit/mobile-WebKit sowie Video-Klick auf Mobile/mobile-WebKit. Es wurden keine zusätzlichen Skips eingeführt.

Editorsuite reproduzieren (Node 24.15+ und lokaler Produkt-Link):

```sh
AFE_STATE_DIR=/tmp/flyingstars-editor-suite AFE_GIT_REMOTE=off \
  node --test --test-concurrency=3 --test-timeout=600000 \
  'editor/*.test.mjs' 'editor/core/*.test.mjs' 'editor/test/*.test.mjs'
```

Die längere Datei-Zeitgrenze erlaubt der Pipeline ihren vollständigen verschachtelten CI-Lauf; Assertions und Negativfälle bleiben aktiv. Deren normale Testausführung wird auf drei Prozesse begrenzt, damit CPU-Zeitprüfungen nicht durch eine unbeschränkte Zahl paralleler Builds verfälscht werden.

Die lokale Evidenz liegt unter `/tmp/fs-editor-final-evidence/`: vollständige Testlogs, `browser-report.json` und geprüfte Screenshots beider Browser. Die Browserläufe bestätigten ohne JavaScript-Seitenfehler die Anmeldung mit `HttpOnly`/`SameSite=Strict`-Cookie, Tastatureingabe, DE-/EN-/NL-Rücklesen, Quellhash und Provenienz sowie PNG-Upload, Mediatheksauswahl, gespeicherte Bildadresse und den Build des zugehörigen Speichercommits. Die zusätzliche Vorschauprüfung kontrolliert die tatsächliche `src` im offenen Canvas und den Menüwechsel DE → EN → NL → DE. `secure:false` gehört hier zum ausdrücklich lokalen HTTP-Test; produktives HTTPS wurde nicht geprüft. Testinhalte und Konten liegen ausschließlich in den erzeugten temporären Fixtures.

Der Sprachadapter verwendet für den Quellhash die vom NativeStore gelieferte Revision des bereits codierten Kandidaten. Er enthält keine zweite Serialisierung des Speicherauftrags. Ein zusätzlicher Guard prüft ausdrücklich diese Abhängigkeit; die Integration liest weiterhin die tatsächlich gespeicherten Bytes zurück.

Vor dem Merge nach `main` müssen das private Produktrelease 0.3.0 und die Site-Abhängigkeit einschließlich Lockfile aufeinander abgestimmt sein. Das noch eingetragene veröffentlichte 0.2.4 enthält die neuen Editor-Hooks nicht; der verlinkte lokale Produktstand ist die Voraussetzung der erfolgreichen Editorsuite.

## Release 0.3.0 auf aktuellem Main, 02.11.2026

Dieser Abschnitt ersetzt die oben beschriebenen damaligen Release-Lücken. Site-Worktree `/tmp/fs-afe030`, Branch `codex/afe-030`, Basis `origin/main` bei `24675f4`. Der bestehende Site-Checkout auf `feat/designsprache-poc` wurde nicht gewechselt oder bearbeitet. Die beiden Migrations- und Main-Stände sind über einen echten Merge verbunden.

### Ein Paketmodell

`src/content/show-packages.json` besitzt die drei Preis-/Mengen-/Farbsätze und die 18 konsolidierten Leistungen mit ihren bisherigen stabilen IDs. `package-details.ts` löst Wörterbuchverweise und berechnete Preis-/Drohnenzellen auf und erzeugt daraus weiterhin Kernpunkte, ausführliche Karten, „Immer inklusive“ und Vergleichsmatrix. Die Wörterbuchtexte bleiben einmalig unter `src/i18n/ui.json`; eigene neue Leistungstexte müssen Deutsch, Englisch und Niederländisch enthalten. Preisformeln und sichtbare Texte wurden nicht geändert. Das gemeinsame Schema validiert Wörterbuchschlüssel und Grenzen; IDs bleiben schreibgeschützt. Leistungszuordnungen, Reihenfolge, Kartenprojektionen sowie Preise und RGB-Kanäle sind im schemaerzeugten Panel erreichbar. `false` ist beim Rendern wie der bisherige nicht enthaltene Status `null`.

Ein Vergleich gegen die tatsächliche Funktion aus Main bestätigt alle serialisierbaren Paketprojektionen in DE/EN/NL. Der dauerhafte Guard `scripts/package-model.test.mjs` hält die dabei aus `24675f4` erfasste Referenz und die Modellgrenzen fest. Die übrigen Konsolidierungs-Guards bleiben aktiv. Neue optionale Fallstudienfelder (`heroVideo`, `formation`, leere Galerie und `videoLink`) bleiben erhalten und tragen die Editor-Metadaten.

### Privates Produkt und Installation

Produkt-Worktree `/tmp/afe-release030`. Releasecommit `265a25db957c8b20d1006cba198dbbc4749bd40e`, Tag `v0.3.0`; Produkt-Main einschließlich Veröffentlichungsdoku `c76654de00ecace6f84b544adfbd4723c82dc146`. Der [Veröffentlichungsworkflow](https://github.com/marc-viladrich/astro-frontend-editor/actions/runs/41479568864) ist erfolgreich. Kein anderes Kundenmanifest wurde verändert.

Site-Alias: `npm:@marc-viladrich/astro-frontend-editor@0.3.0`.

Registry-Integrität:

```text
sha512-5ivcTZiRijzoc1HkAJxoRIq1BMF3QA1ouS6OBzZkja6m8lu2z0FVvWNtmjsEmx5E4LmVfM6ptTEyVdYxaraFgg==
```

Das Lockfile wurde mit dem veröffentlichten Registry-Artefakt neu aufgelöst. Nach `npm ci` ist `node_modules/astro-frontend-editor` ein installiertes Paket mit gescoptem Namen und Version 0.3.0, kein Symlink. Alle **124 Dateien** unter `src`, `web`, `bin` stimmen bytegenau mit dem Produktrelease überein (`/tmp/fs-afe030-installed.json`). Der überprüfte finale Dependency-Stand verwendet Astro 7.3.6 und Playwright 1.63.0 aus dem Site-Lockfile. Die vorherige lokale Verlinkung hatte neuere kompatible Unterabhängigkeiten aufgelöst; die Abschlussprüfungen wurden deshalb mit dem sauberen Lockfile-Stand erneut ausgeführt. Es gibt keinen Produktquellcode, Tarball oder lokalen Paketpfad im Site-Git.

### Vorschläge und Freigabe

Der historische Anbieter-/Segment-/Memory-Code ist im privaten Produkt erhalten (`86046cf` und die dortige `translation-providers.mjs`/`translation-core.mjs`). Der Dateimodus nutzt ihn nun über `/editor/api/translate`. Die gemeinsame EN-/NL-Prüfung zeigt pro Textfeld getrennte Aktionen zum Anfordern und Übernehmen. Der Abruf ersetzt keine menschliche Eingabe. Ein Vorschlag bleibt ungeprüft, bis er übernommen und die gesamte Sprachprüfung ausdrücklich gespeichert wird. Die bestehende Transaktion schreibt danach die vollständigen Dateien, den Hash der tatsächlichen deutschen Ausgabebytes und `docs/i18n/content-provenance.json` zusammen. Interne `todo`-Notizen, strukturelle IDs und URLs gehen nicht an den Übersetzungsdienst.

`translation-memory.json` liegt ausschließlich im konfigurierten State-Ordner und verwendet die historischen Locale-/Segment-Hashes. Markdown, Code und Platzhalter bleiben geschützt; verlorene Token erzeugen keinen Vorschlag. EN-/NL-Anfragen teilen sich eine serialisierte Memory-Schreibfolge. Das Zeichenbudget bleibt wirksam.

Ohne Konfiguration ist die Funktion mit einer sichtbaren Erklärung deaktiviert; manuelles Prüfen bleibt möglich. Für die bestehende selbst betriebene LibreTranslate-Architektur sind `AFE_TRANSLATION_PROVIDER=libretranslate` und eine bewusst konfigurierte EU-Instanz über `AFE_TRANSLATION_URL` erforderlich, gegebenenfalls `AFE_TRANSLATION_KEY`. Alternativ unterstützt der vorhandene DeepL-Adapter `AFE_TRANSLATION_PROVIDER=deepl` plus `AFE_DEEPL_API_KEY`; ein fehlender Schlüssel deaktiviert ihn ausdrücklich. Keine `.env`-Datei und kein realer Schlüssel wurden gelesen, geändert oder gespeichert. Ein echter Anbieterruf und die Eignung einer konkreten Hostinstanz sind nicht Teil dieses Nachweises. Die Tests verwenden den Offline-Anbieter `fake`.

### Produktprüfungen und historische Fixtures

Lokal: **297/297** im vollständigen Produktlauf, **0 Skips**, danach der ergänzte gemeinsame Tupel-Guard **1/1**; Produkt-Browserprüfungen **11/11**, einschließlich Chromium und WebKit. Alle **21 zuvor ausgelassenen** historischen Fixture-Tests liefen mit `AFE_FIXTURE_ROOT` auf den tatsächlichen Hub-Ordner `freelance/`; deren Astro-Abhängigkeiten waren bereits vorhanden. Keine Fixture wurde durch die neue Site ersetzt. Die Release-CI bestätigt **298 Tests, 277 bestanden, 0 Fehler**, die 21 privaten Nachbarfixtures fehlen dort weiterhin und bleiben ausdrücklich ausgewiesen.

Ein historischer Checker-Snapshot wurde nach Gegenprüfung angepasst: AFE303-Warnungen 2522 → 2520, alle anderen Werte unverändert. Sowohl der unveränderte Produkt-Main 0.2.4 (`a1c5835`) als auch der Releasekandidat liefern auf der heutigen historischen FlyingStars-Fixture `e36a04b` dieselben 2520 Warnungen. Die Checkerlogik wurde nicht geändert; die Abweichung stammt aus dem fortgeschriebenen Fixture-Inhaltsstand. Fingerprint-Guards prüfen weiterhin Pfade, Bytes, Rechte und Zeitstempel. Die vollständige Begründung steht in den privaten Release-Notizen.

### Layout und Sichtprüfung

Mit dem finalen Lockfile-Stand: DE, EN und NL, Chromium und WebKit, jeweils **22 Seiten × 5 Breiten** (390/940/1440/1920/2560), zusammen **660 Kombinationen, 0 Befunde**. Logs `/tmp/fs-afe030-layout-final-<locale>-<browser>.log`.

Visueller Vergleich gegen den separat mit denselben Lockfile-Abhängigkeiten gebauten Main: Home, Preise, PUMA, Hochzeit und Über uns sowie die englische und niederländische Preisseite, jeweils 390/1440 px und beide Engines. **28 vollständige Seitenpaare, identische Seitengrößen und 0 abweichende Pixel** bei einer Kanalabweichung über 10. Zeitabhängige Canvas-/Video-/Wechseltextbereiche sind maskiert; Karussells werden in beiden Fassungen auf denselben Anfangszustand gesetzt und Scroll-Snapping während der Aufnahme ausgeschaltet. Die Masken erhalten die Geometrie. Ein Zwischenlauf zeigte ausschließlich unterschiedlichen horizontalen Karussell-Scrollstand; die synchronisierte Wiederholung bestätigt die Gleichheit ohne Änderung der Site. Belege `/tmp/fs-afe030-visual-installed-stable-20261102/report.json` und die zugehörigen Aufnahmen. Die Kontaktübersicht und Editoraufnahmen wurden geöffnet und geprüft.

### Korrekturen an den Prüfungen

Der alte Publikationstest erwartete den weiterhin absichtlich als `draft: true` gespeicherten Testflug-Beitrag öffentlich. Er folgt jetzt den tatsächlichen Quelldateien und prüft alle drei veröffentlichten Beiträge einschließlich ihrer Texte sowie die Unsichtbarkeit und 404-Antwort des Entwurfs. **16/16 Browserfälle** bestehen; kein Inhalt wurde dafür veröffentlicht.

Ein gemeinsamer großer Node-24-Lauf endete nach 371 bestandenen Fällen mit „Promise resolution is still pending but the event loop has already resolved“ und ließ weitere Dateien unvollständig. Der abschließende isolierte Lauf gegen das installierte Registry-Paket bestätigt **404/404 Editor-Tests, 0 Skips, 0 Abbrüche**, einschließlich der kompletten Pipeline. Die Site-Suite bestätigt **123/123, 0 Skips**. Assertions und Zeitlimits wurden nicht gelockert. Der zusätzliche 404. Fall schützt Kontaktlinks und interne Notizen gemeinsam vor Übersetzung und lässt Markdown-Überschriften als Prosa zu. Die Quelldateien wurden dabei außerhalb der temporären Fixtures nicht geändert.

Kein Push oder Merge nach Site-Main und kein Deployment. Lokale Pipeline-Tests verwenden isolierte Git-Remotes, Hostkopien und temporären State; sie belegen keinen echten Hosting-Deploy, TLS oder produktive Konten.

### Abschließendes Prüfprotokoll

- `npx astro check`: 0 Fehler, 0 Warnungen. `npm run build`: 74 Seiten. Registry-Installation und 124 Produktdateien nachgeprüft.
- Editorsuite mit Node 24.21.0, begrenzte Parallelität 2, ausdrücklich temporärer State: **404/404 bestanden**, `/tmp/fs-afe030-isolated-editor-final.log`. Die fünf Pipeline-Szenarien einschließlich Code-CI, Inhaltsfreigabe, Erhalt offener Inhalte, Buildfehler und Git-Konflikt sind darin vollständig grün.
- Site-Unit-Suite mit dem finalen Lockfile: **123/123 bestanden**, 0 Skips, `/tmp/fs-afe030-installed-site-unit.log`. Der zusätzliche Simulationslauf wurde zugunsten der Browserprüfungen zeitweise angehalten und anschließend vollständig beendet; kein Testfall wurde daraus entfernt.
- Editor-Klicknachweise: **Chromium und WebKit bestanden**. Beide Engines bearbeiten den sichtbaren Seitentext per Tastatur, holen und übernehmen EN-/NL-Vorschläge, speichern und lesen Dateien/Quellhash/Provenienz, laden ein PNG hoch und wählen es aus, ändern Preis und Leistungsstatus anhand der stabilen ID `safety-plan` und lesen das gespeicherte JSON zurück. Alle neun RGB-Kanäle sind erreichbar. Eine anschließende UI-Aktion stellt die temporäre Leistungszuordnung für den nächsten Browser wieder her. Zusammengeführter Bericht `/tmp/fs-afe030-final-editor-browser-report.json`; geprüfte Screenshots unter `/tmp/fs-afe030-registry-proof3-20261102/` für Chromium und `/tmp/fs-afe030-webkit-phase-proof/` für WebKit. Der WebKit-Abschlusslauf meldet 0 JavaScript-Fehler und eine ausdrücklich als beim Neuladen abgebrochen protokollierte Vorschauanfrage. Ein vorheriger gelegentlicher Statusabruf-Fehler ließ sich im Abschlusslauf und einem verkleinerten Reload-Vergleich nicht erneut auslösen; er wurde nicht durch Unterdrücken von Fehlern „behoben“. Die Fehlerprüfung bleibt aktiv und benennt jetzt die Prüfphase.
- Site-Browserbereiche einzeln, eigene Ports, höchstens zwei Worker, vier konfigurierte Browser-/Geräteprojekte: **1.233 bestanden, 107 bestehende Skips, 4 Fehler**. Verteilung: HTML 296, i18n 20, Projekte 52, Preise 26 (2 Skips), Netzwerk 296, Consent 4 (84 Skips im regulären OFF-Build), Kontakt 24, Accessibility 300, Publikation 16, Referenzen 39 (5 Skips), Konfigurator 132 (12 Skips, 4 Fehler), Teaser 28 (4 Skips). Logs `/tmp/fs-afe030-playwright-20261102/`, neue Publikationsprüfung `/tmp/fs-afe030-publication-current.log`, Zusammenfassung `/tmp/fs-afe030-browser-summary.json`.
- Die vier Konfiguratorfehler betreffen ausschließlich `mobile-webkit`: erster sichtbarer Anfragebereich, Mausziehen über Paketgrenzen, Meldung eines freigeschalteten Motivs und Hover des Paketrahmens. Derselbe gezielte Lauf mit einem Worker gegen den separat gebauten **unveränderten Main** schlägt in allen vier identischen Fällen fehl (`/tmp/fs-afe030-configurator-baseline.log`). Kein Skip und keine Toleranz wurde dafür ergänzt. Die zugehörigen Frontenddateien bleiben im Scope des Leads.
- Layout: **660 Kombinationen, 0 Befunde**. Visuelle Gleichheit: **28 Seitenpaare, 0 abweichende Pixel** unter den oben dokumentierten Zustandskontrollen. Die finale Evidenz verwendet die tatsächlichen Lockfile-Versionen.

Nicht ausgeführt: die unveränderte Langzeitsuite `tests/show-physics.spec.ts` (kein Eingriff in Flugphysik; Preis-/Mengen-/Motiv-Guards und Konfigurator-/Teaserbereiche sind geprüft), ein echter Übersetzungsdienst mit produktivem Schlüssel, produktives TLS/Hosting und ein echtes Deployment. Es wurde kein Kunden- oder Live-State verwendet. Andere Kundenseiten bleiben auf ihren bisherigen Paketversionen.

Die vollständige Standard-Editorprüfung bleibt ohne Browserfilter reproduzierbar. Für getrennte Engine-Nachweise unterstützt `editor/design.browser.mjs` zusätzlich `AFE_PROOF_ENGINES=chromium` bzw. `webkit`; ungültige Namen brechen ausdrücklich ab. Screenshots immer in ein neues `AFE_EVIDENCE_DIR` schreiben.
