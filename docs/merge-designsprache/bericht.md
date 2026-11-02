# Zusammenführung der Designsprache mit main

Stand 2. November 2026. Arbeitsbranch `merge/designsprache-main`, eigener Worktree `/private/tmp/fs-merge-designsprache-main`. Ausgangsstände: Design `3d8fb7f`, `origin/main` `e36a04b`, Merge-Basis `0dd3582`. Die 242 zusätzlichen main-Commits sind durch einen echten Merge enthalten. Der Merge-Commit `f3e4a99` hat beide Ausgangsstände als Eltern; Anpassungen folgen in eigenen deutschen Commits.

**Empfehlung: main jetzt noch nicht auf diesen Branch vorschieben.** Technisch ist ein Fast-forward von `e36a04b` möglich. Besuchsdesign und angeforderte Websiteprüfungen sind grün, die vollständige Editorintegration und deren CI sind es nicht. Ein Push auf main würde den direkten Cloudflare-Deploy trotzdem auslösen.

## Konfliktauflösung

Die Zusammenführung hatte 57 Konfliktpfade. Komponenten, Landingpages, Layouts, Styles, Routing, Site-Konfiguration, Browser-/Effektskripte, Website-Tests und sämtliche Inhalte folgen dem Designstand. Entfernte alte Seiten, Sections und Inhaltsdatensätze wurden nicht wieder eingeführt. `src/content/**` ist gegenüber `3d8fb7f` bytegleich.

Die gehärteten Functions `functions/api/contact.ts` und `media.ts` stammen vollständig aus dem Designbranch. Die neue DE-/EN-/NL-Architektur mit vollständigen Sprachdateien bleibt erhalten.

Von main stammen `editor/**`, `.github/**` einschließlich Dependabot und sämtlicher Workflows, privates Editor-Paket, Node-/Registry-Konfiguration, Deploy-Hooks, ergänzende Deploy-/Medien-Diagnoseskripte und Editor-/Betriebsdokumentation. Die Abhängigkeiten wurden vereinigt und der Lockfile mit Node 22 und `npm install` erzeugt. Sitemap, Astro, marked, sharp, yaml, zod und das Editor-Paket liegen wie auf main in den Runtime-Abhängigkeiten; Lucide und die Design-Testskripte bleiben erhalten. `.nvmrc` bleibt bei Node 24. Der statische Besuchsbuild wurde wie beauftragt mit Node 22.22.1 geprüft; das Editor-Paket verlangt Node 24.15+, geprüft mit 24.21.0.

`astro.config.mjs` behält das Designrouting und dessen Sitemap-Verhalten. Der gemeinsame Bildcache und der Offline-Bilddienst für Editor-/Pipeline-Prüfungen wurden aus main übernommen. Die alten overlaybezogenen SEO-/Medien-Buildhooks wurden nicht als neue Besuchsregeln aufgesetzt. Private Editor-Builds sind per robots.txt und Meta-noindex gesperrt. Apache-Weiterleitungen werden aus dem bestehenden Legacy-Inventar und den aktuellen Design-Weiterleitungen erzeugt und verkettet aufgelöst; Cloudflare ignoriert `.htaccess`.

`AGENTS.md` basiert auf main und nennt jetzt die gemeinsame Schemaquelle, Landing-Komponenten und die vollständigen Sprachdateien. README und ein neuer Editor-Migrationshinweis kennzeichnen die frühere Editorarchitektur ausdrücklich als historischen Stand.

## Redaktionelle Änderungen auf main

Keine zusätzliche Faktenkorrektur wurde angewandt. Die überprüfte Auftraggeberkorrektur `a839851`, Bokkenrijders gehört zu Toneelgroep Maastricht, ist in Designinhalt und Credits bereits enthalten. Kontakt-E-Mail, Telefon, WhatsApp sowie Besuchs-/Postadressen stimmen ebenfalls mit dem Design überein. Die Preis- und Drohnenbasis der Pakete ist bereits in `show-packages.ts` enthalten; alte JSON-Paketdatensätze wurden nicht daneben reaktiviert.

Die jüngsten vier Editor-Commits `a56520c`, `a08fe30`, `76fa40b`, `e36a04b` ändern Ausrufezeichen beziehungsweise Kontur-/Fett-/Kursivmarkierungen der alten Startseitenüberschrift. Das sind keine neueren Faktenkorrekturen. Ebenso wurden die früheren Farbtoken, Großschreibungsmarkierungen und Kunden-/Medien-IDs nicht in die neue Darstellung übertragen. Der Inhaltsumbau und die späteren Runden 5–14 des Designbranches haben Vorrang.

Der reproduzierbare Vergleich `python3 scripts/compare-rendered-text.py <Design-dist> dist` prüft Text einschließlich Seitentitel, ohne Script-/Style-Inhalte und mit normalisierten Leerzeichen. Referenz ist ein eigenständiger Build von `3d8fb7f` mit derselben SITE_URL. Ergebnis: 31 deutsche HTML-Dateien einschließlich Weiterleitungen und zweier PoCs; 0 fehlende, 0 zusätzliche, 0 abweichende Dateien. Es gibt keine bewusst abweichenden deutschen Texte.

## Editorstatus

Die tatsächlichen Zod-Definitionen liegen jetzt in `src/schemas/content-schema.mjs` und `project-showcase.mjs`; `src/content.config.ts` registriert sie für Astro. Der aktive Editoradapter importiert dieselben Instanzen. Alle 31 Section-Typen und deren verschachtelte Felder werden aus der Union abgeleitet, ohne zweite Feld-/Section-Liste.

Der Adapter liest 198 vorhandene DE-/EN-/NL-Records aus den vier tatsächlichen Collections. Er bietet keine nicht mehr gerenderten `package`, `screen`, `client`, `team`, `media`, `site` oder `translation`-Records an. Im ausdrücklich aktivierten Dateimodus sind bestehende Felder und Markdown bearbeitbar. EN-/NL-Korrekturen allein sind möglich. DE-Änderungen verlangen beide mitgeprüften Sprachrecords in derselben Speicherung; deren Quellhashes berechnet der Adapter aus den echten Codec-Ausgabebytes. Ein freies Ändern des Hashfeldes ist gesperrt.

Sechs neue Tests in `editor/design-schema.test.mjs` bestehen. Sie prüfen das echte Inventar und Schema, eine atomar abgelehnte alleinige DE-Speicherung, gemeinsame DE-/EN-/NL-Dateischreibung samt Hashes, wiederholbare Speicherung, einen anschließenden tatsächlichen Astro-Build mit den neuen deutschen und englischen HTML-Titeln, EN-Korrekturen ohne Änderung deutscher Bytes, Schreibgrenzen, Browserregistry und Startsperre.

Zusätzlicher Browsernachweis in einem neu angelegten Wegwerf-Klon: Die Seiteneinstellungen lassen sich nach vollständigem Laden öffnen. Eine echte alleinige Änderung am deutschen Title-Feld führt beim Speichern zur Meldung mit `page/en/index` und `page/nl/index`; die Quelldatei bleibt bytegleich. Es wurde kein bestehender Editorzustand verwendet und kein echter Inhalt veröffentlicht.

Nicht fertig migriert sind Canvas-/Inline-Marker und direkte Vorschauänderungen, Mediathek/Uploads, automatische Overlay-Übersetzung und Review, redaktionelle Paket-/UI-/Navigationsdaten sowie Anlage/Löschung und strukturelle Bearbeitung von Sprachtripeln. Der normale Editorstart stoppt deshalb mit einer deutschen Erklärung. Nur der bewusste Testmodus `AFE_DESIGN_EDITOR=source npm run editor` startet den eingeschränkten Dateieditor. Vollständige Betriebsanleitung: [editor-designsprache.md](../editor-designsprache.md).

Der vollständige Editorlauf auf Commit `93508be` mit Node 24.21.0 ergab **334 Tests, 250 bestanden, 84 fehlgeschlagen, 0 übersprungen, 0 abgebrochen**. Aufruf:

```sh
node --test --test-reporter=tap --test-concurrency=3 --test-timeout=180000 \
  'editor/*.test.mjs' 'editor/core/*.test.mjs' 'editor/test/*.test.mjs'
```

Die Fehler betreffen vor allem alte JSON-/Overlay-Datensätze, entfernte Schema-/Library-Imports, alte Ownership-/Canvas-/Inline-Verträge und Pipelinefixtures. Die Core-Codec-Suite erwartet außerdem externe Bakery-/Physio-Testsites, die in diesem Checkout fehlen. Ein Runtime-Test verwendet den bisherigen lokalen main-Ref `494ba61`, der auftragsgemäß nicht verändert wurde. Die komplette Liste der 83 fehlgeschlagenen Top-Level-Einträge steht in [editor-failures.json](editor-failures.json); ein Core-Eintrag enthält zusätzlich einen fehlgeschlagenen Untertest. Die alten Tests wurden nicht entfernt, übersprungen oder in Erfolg umgedeutet.

## Websiteprüfungen und Deployment

- `npx astro check`: 190 Dateien, 0 Fehler, 0 Warnungen, 231 Hinweise.
- `npm run build`: erfolgreich, 65 statische Seiten plus Weiterleitungsdateien.
- Exakt die verlangten Unit-Globs mit Node 22: 98 bestanden, 0 fehlgeschlagen, 0 übersprungen.
- Exakt die verlangten acht Playwright-Specs mit `--workers=3`: 463 bestanden, 3 regulär übersprungen, 0 fehlgeschlagen. Die drei übersprungenen Fälle sind im bestehenden Testcode abhängig vom jeweiligen Viewport freigegeben.
- Layout-Audit mit `--start=/ --widths=390,1440,1920`: 19 erreichbare Seiten × 3 Breiten, 0 Befunde. Der eigene Previewserver wurde nach dem Browserlauf neu gestartet.
- Build-i18n-Prüfer: 29 deutsche Routen, 42 lokalisierte Inhaltsrouten, 16 lokalisierte Weiterleitungen; 2 interne PoCs ausgenommen.
- `wrangler pages functions build functions`: Worker erfolgreich gebündelt, ohne Upload.
- Native Apache-/SEO-Unitprüfungen: 4 bestanden. Die generelle Unit-Gesamtzahl oben enthält sie.
- Angepasste Auslieferungsprüfung `node scripts/check-production-delivery.mjs`: erfolgreich, 89 Produktions-HTML-Dateien, 65 aufgelöste 301-Zuordnungen, 0 SEO-Fallbacks; separater privater Build mit robots-Sperre und Meta-noindex.

Ein erster Browserlauf traf durch einen konkurrierenden Hintergrundserver denselben Port im Designcheckout. Er wurde verworfen. Der gültige Lauf nutzte nachweislich `/private/tmp/fs-merge-designsprache-main`; der anschließend neu gestartete Auditserver lieferte `dist/index.html` bytegleich aus. Die Prüfprotokolle und der Referenzbuild liegen unter `/private/tmp/fs-merge-proof/`.

`ci.yml` bleibt ein PR-/manueller Workflow und verwendet `npm run ci`. Die aktuelle Editor-Suite verhindert weiterhin grüne Gates. Der CI-Einstieg berücksichtigt die neuen Effekttests und entfernt den Verweis auf einen nicht mehr vorhandenen alten Architekturtest. Die Core-Suite bleibt wie im bisherigen CI-Einstieg außerhalb dieses Schritts; sie wurde für diesen Bericht dennoch vollständig mit ausgeführt. Eine GitHub-CI wurde nicht ausgelöst.

`deploy-cloudflare.yml` startet weiterhin auf jeden Push nach main, ohne vorgeschaltete CI. Er installiert das private Paket, baut die aktuelle statische Site und lädt einschließlich Functions in den Produktionsbranch main. Die lokale Installation, der Websitebuild und das Functions-Bündeln funktionieren. Das beweist keinen tatsächlichen Cloudflare-Upload; es wurde keiner ausgelöst. Bei einem Buildfehler lädt der Workflow nicht hoch. `CLOUDFLARE_DEPLOY=off` würde den Job deaktivieren.

Nur Namen wurden über die GitHub-API geprüft. Für den Cloudflare-Deploy sind `PACKAGES_READ_TOKEN`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` und die Variable `CF_PAGES_PROJECT` nötig; diese Namen sind vorhanden. `SITE_URL` und `PREVIEW_URL` sind ebenfalls vorhanden. Optional sind `MEDIA_HOST`, `PUBLIC_FORM_ENDPOINT` und `CLOUDFLARE_DEPLOY`. Die Brevo-Mailfunktion benötigt zusätzlich die Cloudflare-Runtime-Secrets `BREVO_API_KEY`, `CONTACT_TO`, `CONTACT_FROM`; deren Vorhandensein wurde nicht geprüft. `TURNSTILE_SECRET` nur gemeinsam mit tatsächlich eingerichtetem Widget aktivieren. Der Medienproxy braucht kein neues Secret.

Hetzner bleibt optional und ohne `HETZNER_DEPLOY=on` aus. Für diesen späteren Weg braucht es `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`, `DEPLOY_PATH` sowie die in `docs/deployment.md` beschriebenen AFE-Pfad-/Origin-Einstellungen und `DEPLOY_RESTART_CMD`. Ein produktiver Neustart des vollständigen Editors ist mit diesem Migrationsstand ausdrücklich noch nicht freigegeben. Der bestehende manuelle Cloudflare-Previewworkflow und die Inhalts-/Agent-PR-Workflows bleiben erhalten.

Es gab keinen Push auf main, keinen PR-Merge und keinen Force-Push. Keine bestehenden `.env`-, Credential- oder privaten Editor-State-Dateien wurden gelesen. Der Editor-Nachweis verwendete ausschließlich einen neu erzeugten, lokalen Testzustand mit abgeschalteter Anmeldung und abgeschaltetem Git-Remote.
