# AFE-Migration auf die neue FlyingStars-Site

Stand: 2. November 2026. Site-Branch `codex/editor-migration`, Ausgangspunkt `46cf22d`. Privates Produkt: Branch `codex/design-file-editor` im eigenen Repository. Die Produktquellen sind ausschließlich dort gespeichert. Die Migration ist lokal mit diesem Produktstand lauffähig; die Installation aus GitHub Packages benötigt dessen noch ausstehendes Release **0.3.0** und danach die entsprechende Versionsanhebung im Site-Manifest samt Lockfile. Es wurde kein Paket veröffentlicht und nichts nach `main` gepusht.

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
| Editorsuite nachher | **401/401 bestanden, 0 Fehler, 0 Skips** |
| Site-Node-Gates, alle drei angeforderten Globs | **104/104 bestanden** |
| `npx astro check`, Node 22 | **0 Fehler, 0 Warnungen**; bestehende Hinweise bleiben |
| `npm run build`, Node 22 | **65 Seiten**, erfolgreich |
| Acht angeforderte Playwright-Specs, `--workers=3` | **925 bestanden, 7 vorhandene Skips**, alle vier konfigurierten Browser-/Geräteprojekte |
| Private Produktsuite | 270 bestanden, 21 oben beschriebene externe Lab-Prüfungen ausgelassen |
| Zusätzliche aktuelle Produktprüfungen für Instrumentierung, Schema, Registry, Speicher, Vorschau und Paket | **59/59 bestanden** |
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
