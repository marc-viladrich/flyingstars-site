# EN und NL für die Designsprache-Probe

Ursprüngliche Umsetzung vor der Round-13-Integration, deren aktueller Bericht am Ende dieser Datei steht. Stand: 2. November 2026. Ausgangspunkt `feat/designsprache-poc`, Commit `7bd1fbf`. Umsetzung auf `codex/i18n-en-nl`, eigener Worktree `/tmp/fs-i18n/worktree`. Nicht gepusht.

## Gefundene Quellen

Die vollständigen strukturierten Editor-Übersetzungen liegen im separaten Editor-Repository unter:

`/Users/marcviladrich/Freelance/AI & Automation/Claude Code Prep/freelance/clients/flyingstars/15-editor-ui-2026-10-13/relaunch/source/src/content/translations/`

Dort gibt es **88 JSON-Dateien**, je 44 für EN und NL. Sie enthalten Feldpfade, Quelltext-Hashes, Übersetzungen und gespeicherte `reviewed`-Flags. Abgedeckt sind die damaligen Seiten, Fallstudien, FAQ, Team, Pakete, Extras, Screens und Site-UI. Der letzte Übersetzungsformat-Commit ist `aeff790` vom 16.10.2026. Der jüngste untersuchte Quell-Snapshot ist `e36a04b27685ca360337201d200b57861f85719e` vom 24.10.2026.

Vergleich der Kandidaten:

| Quelle | Befund |
| --- | --- |
| Hauptcheckout `flyingstars/site`, Branch `main`, `494ba61` | Alte DE-Seiten, keine EN-/NL-Inhaltsdateien und kein nutzbares i18n-Routing. Der lokale Design-Branch enthält diese Editor-Dateien ebenfalls nicht. |
| Remote-Branches `origin/main`, `origin/content/draft`, `origin/fix/stale-translation` und weitere Editor-Refs | Derselbe Übersetzungsbaum wie `relaunch/source`, Git-Tree `b8f069805df6b89b32f49bea4d6b69c3fc6e8d9f`. Kein abweichender neuerer Übersetzungsstand. |
| Editor `relaunch/source` | 88 strukturierte Übersetzungsdateien, Format 2. Gewählte Quelle. |
| Editor `afe-pr11` und `afe-pipeline` | Dieselben 88 Dateien, bytegleich mit `source`. Kein neuerer Übersetzungsstand. |
| Editor `runtime/*/source/src/content/translations` | 34 Quell-Snapshots verglichen. Ältere Stände mit 1, 9 oder 76 Dateien sowie ältere 88-Dateien-Stände. Die zwölf jüngsten Format-2-Snapshots haben denselben vollständigen 88-Dateien-Stand wie `source`. |
| `runtime-public/*/site/en` und `/nl` | Veröffentlichte Build-Ergebnisse, keine verwendete Textquelle. HTML wurde nicht als Übersetzungsquelle gescrapt. |
| `08-entwicklungspiloten-2026-10/astro-pilot` | EN-/NL-Builds vorhanden, aber keine strukturierten Übersetzungsdateien in `src/content/translations`. |

Der gemeinsame SHA-256 über die nach Pfad sortierten Inhalte der 88 aktuellen Dateien lautet `9a97b4071cd06c5cb4ba84e32fa587ec737ec41700535a681c053f1c32aa2752`. Es wurden keine `.env`-Dateien, Credentials oder privaten Editor-Zustände gelesen.

Die Editor-Linie verwendet DE am Root, EN unter `/en/`, NL unter `/nl/` und gemeinsame Slugs. Auch die Sprachlinks der [bestehenden Live-Seite](https://flyingstars.art/) zeigen auf `/en/` und `/nl/`. Dieses Schema bleibt erhalten. Deutsche Slugs sind damit auch in englischen und niederländischen URLs bewusst unverändert.

## Übernahme und neue Übersetzungen

Übernommen wurden nur passende Inhalte. Der Abgleich nutzt den tatsächlichen deutschen Quelltext und den gespeicherten Feld-Hash, sodass ein alter Array-Index keinen inzwischen anderen Abschnitt übersetzt. Preisangaben, Zeiträume und Fakten stammen immer aus der aktuellen deutschen Fassung.

Der alte Editor-Stand enthält erhebliche Sprachfehler, auch bei gesetzten `reviewed`-Flags. Beispiele: „Essen“ wurde zu „Food“, „Termine“ zu „Dadels“, „Kein Müll“ zu „Geen onzin“; „1–2 Wochen“ wurde im Niederländischen zu „12 weken“. Auch Kampagnennamen wie STRONGER und TOGETHER waren teilweise übersetzt oder beschädigt. Diese Stellen wurden korrigiert. Die Flags werden im Herkunftsnachweis dokumentiert, aber nicht als unabhängige Qualitätsfreigabe behandelt.

Neue Texte folgen der aktuellen Designsprache. NL verwendet bei der Ansprache „jullie“. SPARK, HORIZON, ODYSSEY, Marken, Personennamen, Adressen und tatsächliche Schriftzüge der Shows bleiben erhalten. Die drei neu importierten Blogartikel wurden vollständig übersetzt und sprachlich gestrafft.

Historische Zahlen vor Round 13, jeweils EN und NL zusammen:

- **382 unverändert aus dem Editor übernommen** (`editor-carried`).
- **433 vorhandene Übersetzungen korrigiert oder angepasst** (`editor-revised`).
- **1.341 neu maschinell übersetzt** (`machine-new`).

Die gemeinsame UI-Datei enthält **651 Texte**, einschließlich Formular-, Preis- und Motivbeschreibungen. Über beide Sprachen sind das 137 unveränderte Übernahmen, 325 Korrekturen vorhandener Übersetzungen und 840 neue Übersetzungen.

Jede Zuordnung ist einzeln nachvollziehbar:

- [content-provenance.json](content-provenance.json): Quelldatei, Feldpfad, Sprache, Herkunft, gegebenenfalls Editor-Datei und gespeichertes Review-Flag. Der übersetzte Wert steht im entsprechenden EN-/NL-Inhaltseintrag.
- [ui-provenance.json](ui-provenance.json): Wörterbuchschlüssel, Sprache, Herkunft und betroffene Komponenten.
- [ui.json](../../src/i18n/ui.json): Die tatsächlichen deutschen, englischen und niederländischen UI-Texte.

## Abdeckung pro Inhaltseintrag

Die Zahlen zählen Textfelder, keine Wörter. Je Sprachspalte bedeutet **übernommen / korrigiert / neu**. „Weiterhin Deutsch“ zählt sichtbare deutsche Prosa. Unveränderte Marken, Eigennamen, Adressen, technische Werte und nicht gerenderte Quellkommentare sind davon ausgenommen. Auch FAQ und Referenzkarten ohne eigene Detailseite sind übersetzt, damit sie auf den lokalisierten Seiten korrekt erscheinen.

| Deutscher Quell-Eintrag | EN: übernommen / korrigiert / neu | NL: übernommen / korrigiert / neu | Weiterhin Deutsch |
| --- | ---: | ---: | ---: |
| `faq/ablauf.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `faq/absturz.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `faq/ausland.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `faq/bezahlung.md` | 1 / 0 / 1 | 1 / 0 / 1 | 0 |
| `faq/dauer.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `faq/drohnenzahl.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `faq/fruehbucher.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `faq/funktion.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `faq/genehmigung.md` | 0 / 1 / 1 | 0 / 1 / 1 | 0 |
| `faq/groesser.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `faq/hochzeit-kosten.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `faq/hochzeit-motive.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `faq/hochzeit-ueberraschung.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `faq/indoor-kosten.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `faq/indoor-moeglich.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `faq/indoor-raum.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `faq/indoor-sicherheit.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `faq/kosten.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `faq/logo.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `faq/musik.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `faq/platz.md` | 1 / 0 / 1 | 1 / 0 / 1 | 0 |
| `faq/sicherheit.md` | 1 / 0 / 1 | 1 / 0 / 1 | 0 |
| `faq/spark-mehr.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `faq/stadt-flughafen.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `faq/startzeit.md` | 0 / 1 / 1 | 1 / 0 / 1 | 0 |
| `faq/umwelt.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `faq/vorlauf.md` | 0 / 1 / 1 | 0 / 1 / 1 | 0 |
| `faq/was-braucht-ihr.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `faq/was-ist-enthalten.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `faq/welches-paket.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `faq/wetter.md` | 1 / 0 / 1 | 1 / 0 / 1 | 0 |
| `faq/winter-tag.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `pages/danke.yaml` | 0 / 0 / 4 | 0 / 0 / 4 | 0 |
| `pages/datenschutz.yaml` | 0 / 2 / 2 | 0 / 2 / 2 | 0 |
| `pages/drohnenshow-hochzeit.yaml` | 5 / 11 / 83 | 5 / 11 / 83 | 0 |
| `pages/drohnenshow-indoor.yaml` | 4 / 8 / 94 | 5 / 7 / 94 | 0 |
| `pages/drohnenshow-werbung.yaml` | 6 / 12 / 70 | 4 / 14 / 70 | 0 |
| `pages/faq.yaml` | 2 / 2 / 10 | 0 / 4 / 10 | 0 |
| `pages/impressum.yaml` | 0 / 2 / 2 | 0 / 2 / 2 | 0 |
| `pages/index.yaml` | 60 / 34 / 127 | 45 / 49 / 127 | 0 |
| `pages/kontakt.yaml` | 1 / 3 / 14 | 0 / 4 / 14 | 0 |
| `pages/referenzen.yaml` | 2 / 3 / 14 | 2 / 3 / 14 | 0 |
| `pages/ueber-uns.yaml` | 13 / 5 / 98 | 9 / 9 / 98 | 0 |
| `posts/2025-01-14-wie-funktioniert-drohnenshow-drohne.md` | 0 / 0 / 4 | 0 / 0 / 4 | 0 |
| `posts/2025-03-31-drohnen-feuerwerk-als-alternative.md` | 0 / 0 / 4 | 0 / 0 / 4 | 0 |
| `posts/2025-06-12-wie-programmiert-man-eine-drohnenshow.md` | 0 / 0 / 4 | 0 / 0 / 4 | 0 |
| `posts/2026-10-06-testflug-wie-eine-drohnenshow-entsteht.md` | 0 / 3 / 0 | 0 / 2 / 1 | 0 |
| `projects/airpower24.md` | 0 / 0 / 3 | 0 / 0 / 3 | 0 |
| `projects/boellerciao.md` | 0 / 0 / 3 | 0 / 0 / 3 | 0 |
| `projects/eisenhuettenstadt-75.md` | 0 / 0 / 4 | 0 / 0 / 4 | 0 |
| `projects/exploring-reinvented-der-neue-ford-explorer.md` | 23 / 32 / 6 | 18 / 37 / 6 | 0 |
| `projects/extraschicht-duisburg.md` | 0 / 0 / 3 | 0 / 0 / 3 | 0 |
| `projects/fruehlingsfest-essen.md` | 0 / 1 / 3 | 0 / 1 / 3 | 0 |
| `projects/heiratsantrag-hugenpoet.md` | 0 / 0 / 4 | 0 / 0 / 4 | 0 |
| `projects/hochzeit-recklinghausen.md` | 0 / 0 / 4 | 0 / 0 / 4 | 0 |
| `projects/loreal-prada-rheinturm.md` | 0 / 0 / 4 | 0 / 0 / 4 | 0 |
| `projects/movie-park-germany.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `projects/musikalischer-teaser-bokkenrijders.md` | 29 / 30 / 14 | 29 / 30 / 14 | 0 |
| `projects/nfl-berlin-game.md` | 35 / 24 / 8 | 32 / 27 / 8 | 0 |
| `projects/nfl-muenchen.md` | 0 / 0 / 4 | 0 / 0 / 4 | 0 |
| `projects/puma-bundesliga.md` | 21 / 28 / 9 | 23 / 26 / 9 | 0 |
| `projects/siemens-mobility.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `projects/sonnemondsterne.md` | 0 / 0 / 1 | 0 / 0 / 1 | 0 |
| `projects/spotify-luciano-apache.md` | 0 / 0 / 2 | 0 / 0 / 2 | 0 |
| `projects/vw-50-golf.md` | 0 / 0 / 4 | 0 / 0 / 4 | 0 |
| `projects/westfalen-100.md` | 0 / 0 / 3 | 0 / 0 / 3 | 0 |
Die Preisseite, Blog-Übersicht, 404-Seiten und gemeinsame Navigation/Formulare beziehen ihre Texte aus dem UI-Wörterbuch. Alle ihre sichtbaren Beschriftungen sind EN/NL verfügbar. Die vier ausführlichen Fallstudien behalten ihre Root-Slugs. Es gibt je Sprache 21 Inhaltsrouten inklusive 404 sowie acht alte Routen als sprachgleiche Weiterleitungen.

## Architektur

- `astro.config.mjs` aktiviert Astro-i18n mit DE ohne Präfix. Die bestehenden Weiterleitungen werden aus denselben Paaren für alle Sprachen abgeleitet.
- `src/pages/[...slug].astro` erzeugt sämtliche Inhalts-, Preis-, Blog- und Fallstudienrouten aus den Sammlungen und der gemeinsamen Locale-Liste. Die bisherigen Seitenimplementierungen sind gemeinsame Templates unter `src/templates/`.
- `src/content/pages/en|nl/*.yaml`, `projects/en|nl/*.md`, `posts/en|nl/*.md` und `faq/en|nl/*.md` verwenden dieselben Zod-Schemas wie DE. Es gibt 132 neue Einträge zu 66 deutschen Quellen.
- `src/i18n/routing.mjs` besitzt Sprach- und URL-Identität. `localizedHref()` setzt den Sprachpräfix, lässt externe URLs, Assets, API-Pfade, Query-Werte und Anker intakt und ist idempotent.
- `localizedCollection()` in `src/i18n/content.ts` ist der gemeinsame Zugriff für Karten, FAQ, Footer und verwandte Inhalte. Jede Abfrage bleibt in der aktuellen Sprache.
- `forPath()` liefert `t`, `localHref` und das Zahlenformat für serverseitige Komponenten. `ui.mjs` liefert dieselben Texte für Browsermodule. Fehlende Schlüssel oder Platzhalter werden nicht still auf Deutsch ersetzt. Sichtbare Standardtexte werden ebenfalls erst im Renderer aus dem Wörterbuch bezogen, nicht als sprachgebundene Zod-Defaults gesetzt.
- Navigation und Paket-/Konfiguratortexte werden über Locale-Factories erzeugt. Drohnenzahlen, Preise, Motiv-Builds und IDs bleiben gemeinsame Daten.
- `Base.astro` setzt `lang`, Canonical, DE/EN/NL-Alternates und `x-default` für indexierbare Seiten. `noindex`-Seiten erhalten einen eigenen Canonical und keine indexierbaren Alternates.
- `LanguageSwitch.astro` nutzt normale Links mit vollständigem Sprachnamen, `hreflang` und `aria-current="page"`. Er ist auf Desktop und Mobil bedienbar. Query-Parameter und aktuelle Sprungmarke werden beim Wechsel übernommen.
- Das Formular sendet zusätzlich den validierten Locale-Wert. Alle bisherigen Feldnamen und Werte bleiben unverändert, auch `quelle=Empfehlung`, Paket-, Anlass- und Extra-IDs. Der API-Endpunkt lokalisiert Fehler und leitet ohne JavaScript zur passenden Danke-Seite weiter.
- Konfigurator-Zusammenfassungen, Dateifehler, Motivtexte, Freischaltmeldungen, Pausenschalter, Referenzfilter und Extras sind übersetzt. Anfrage-Links bleiben in der gewählten Sprache und nehmen die Auswahl mit.

### Schutz gegen fehlende und veraltete Übersetzungen

Jeder EN-/NL-Eintrag enthält `translationSourceHash`, den SHA-256 seiner deutschen Quelldatei. Der Build bricht ab, wenn ein Eintrag fehlt, verwaist ist oder sich die deutsche Quelle seit der Übersetzung geändert hat. Das ist insbesondere beim Zusammenführen der parallelen Copy-Branches relevant: geänderte DE-Texte müssen in beiden Übersetzungen geprüft werden. Den Hash erst nach dieser Anpassung erneuern.

`scripts/i18n.test.mjs` prüft die tatsächlichen Inhaltsdateien, Struktur- und ID-Gleichheit, Wörterbuch-Platzhalter, URL-Regeln, Konfigurator-/Extra-Identitäten sowie API-Fehler und Weiterleitungen. `scripts/check-i18n-build.mjs` kontrolliert den tatsächlich erzeugten Build, einschließlich aller Alias-Routen und Sprachalternates.

## Eine neue Seite oder Section ergänzen

1. Die deutsche Seite wie bisher unter `src/content/pages/<slug>.yaml` aus den gemeinsamen Section-Typen anlegen.
2. Unter `pages/en/<slug>.yaml` und `pages/nl/<slug>.yaml` dieselbe Struktur anlegen. Sichtbare Texte, Alternativtexte und gegebenenfalls sichtbare Tags übersetzen. IDs, Filter-Tags, technische Werte und Referenzen unverändert lassen. Keine neue Route und keine sprachabhängige Komponente anlegen.
3. In beiden Übersetzungen `translationSourceHash` der aktuellen deutschen Datei setzen. Ermittlung zum Beispiel mit `shasum -a 256 src/content/pages/<slug>.yaml`.
4. Allgemeine Komponentenbeschriftungen mit einem stabilen Schlüssel in `src/i18n/ui.json` für alle drei Sprachen ergänzen. Serverseitig `forPath(Astro.url.pathname)`, browserseitig `t()` verwenden. Komponenten-Linkziele durch `localHref()` beziehungsweise `localizedHref()` führen. In übersetzten Markdown-Inhalten interne Links auf die entsprechende EN-/NL-Route setzen.
5. Neue FAQ, Projekte und Posts entsprechend in ihren Locale-Unterordnern ergänzen. Listen, Fallstudien und Blogrouten werden automatisch erzeugt. Bei einer neuen Section bleibt der übliche Weg über das gemeinsame Schema und `SectionRenderer` bestehen.
6. Herkunft für neue oder geänderte Felder in den beiden Provenienzdateien fortschreiben und die folgenden Prüfungen ausführen.

Nach einer Schemaänderung den Dev-Server stoppen und `.astro/data-store.json` löschen, dann neu starten. Astro 7 startet den Dev-Server im Hintergrund; `npx astro dev stop` beendet ihn in diesem Worktree.

## Prüfungen und Belege

Mit Node 22 im PATH:

```sh
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
npx astro check
SITE_URL=https://flyingstars.art npm run build
node scripts/check-i18n-build.mjs
node --test 'scripts/*.test.mjs' 'src/scripts/effects/*.test.mjs'
```

Ergebnisse und Belegpfade stehen im Abschlussabschnitt. Die volle Playwright-Suite wurde nicht gestartet. Die gezielten Playwright-Skripte liegen außerhalb des Repositories in `/tmp/fs-i18n/`.

## Bewusste Grenzen und offene Punkte

- Die beiden internen, nicht indexierbaren Designexperimente `/poc/designsprache/` und `/poc/konfigurator-teaser/` bleiben deutsch. Dort werden keine falschen Sprachlinks angeboten. Die regulären 21 Inhaltsrouten haben jeweils DE, EN und NL. Auch ungenutzte Altkomponenten `pricing/Calculator.astro`, `pricing/PackageDetails.astro`, `src/scripts/pricing.js` sowie interne PoC-Skripte enthalten noch deutsche Texte; keine reguläre EN-/NL-Seite lädt sie.
- Eigennamen wie „Deutsche Umwelthilfe“, „Kein Bock auf Nazis“, Anschriften, Kampagnen und externe Originalquellen bleiben in ihrer Originalsprache. Nicht auf die neue Site importierte Blog-/Quellenlinks können weiterhin auf deutsche Originalartikel führen. Interne Links auf bereits vorhandene neue Artikel wurden auf die passenden Locale-Routen gesetzt.
- Die neuen und korrigierten Übersetzungen sind maschinelle Entwürfe und brauchen FlyingStars/Moritz' redaktionelle Freigabe. Insbesondere fachliche Aussagen aus den älteren Blogartikeln und die bestehenden Preis-/Konfigurator-Platzhalter bleiben inhaltlich zu prüfen. Es wurden keine neuen kommerziellen Leistungszusagen ergänzt.
- Der echte E-Mail-Versand wurde nicht ausgelöst. Formularprüfungen verwenden den tatsächlichen API-Handler ohne Versandkonfiguration und prüfen die ehrliche `not-configured`-Rückmeldung. Der bestehende Prototyptext auf der Danke-Seite bleibt entsprechend erhalten.
- `SITE_URL` muss beim späteren Deployment die endgültige Domain enthalten. Die Prüfung verwendet explizit `https://flyingstars.art`. Der Host muss die statisch erzeugten Alias-Seiten bei Bedarf zusätzlich als echte HTTP-Weiterleitungen konfigurieren.
- Es wurden keine Accounts, Editor-Credentials oder externen Versanddienste verwendet. Kein Push, kein PR und kein Deployment.

## Abschlussergebnis der ursprünglichen Umsetzung

- `npx astro check`: **0 Fehler**, 0 Warnungen, 228 Hinweise aus der bestehenden Codebasis.
- `SITE_URL=https://flyingstars.art npm run build`: erfolgreich, **65 Inhaltsseiten einschließlich der zwei internen PoCs**. Zusätzlich werden die Alias-Weiterleitungen ausgegeben.
- `node scripts/check-i18n-build.mjs`: **29 deutsche Routen geprüft**; dafür **42 EN-/NL-Inhaltsrouten** und **16 EN-/NL-Weiterleitungen** nachgewiesen. Zwei interne PoCs sind ausdrücklich ausgenommen. Canonical und hreflang passen zur jeweiligen Seite.
- Vollständiger angeforderter Node-Testbefehl: **77/77 Tests bestanden**, keine Fehler oder übersprungenen Tests, letzter Lauf ca. 107 Sekunden. Darunter sechs neue i18n-Tests einschließlich der Schema-Defaults.
- Chromium: **12/12 geforderte Ansichten** für Startseite, Preisseite und PUMA-Fallstudie, jeweils EN/NL bei 1440 × 900 und 390 × 900. Keine JavaScript-Fehler; `scrollWidth` entspricht in allen Fällen exakt der Viewportbreite. Alle zwölf oberen Ansichten wurden visuell geprüft, vollständige Seitenscreenshots sind zusätzlich gespeichert.
- Zusätzlich wurden die lokalisierten Standardüberschriften für Presse und Qualität im tatsächlichen Build und in zwei gezielten Screenshots geprüft.
- **Vier Anfrage-/Tastaturszenarien bestanden:** EN und NL vom Konfigurator mit ODYSSEY, 600 Drohnen, eigenem Text, Express und Film ins Formular, dann Validierung und tatsächlicher API-Handler mit `env: {}`. Paket, Drohnenzahl, Anlass, Extras, `locale` und ursprünglicher `quelle`-Wert kommen unverändert an. Sprachwechsel per Tab/Enter bei beiden Breiten; mobiles Menü öffnet und schließt. Zusätzlich der Wechsel EN → NL mit erhaltenem `?paket=HORIZON#case-h`.
- Referenzfilter auf NL zusätzlich direkt geprüft. Alle Beschriftungen und Mengenbereiche erscheinen übersetzt.
- Kein echter Mailversand, keine volle Playwright-Suite, kein WebKit-Lauf und keine Videoaufzeichnung. Die angeforderten gezielten Chromium-Screenshots und Interaktionen wurden ausgeführt.

Lokale Belege:

- `/tmp/fs-i18n/screenshots/{en,nl}-{home,pricing,case}-{1440,390}.png`: vollständige Seiten. `-top.png`: visuell geprüfte erste Ansicht ohne Dev-Toolbar.
- `/tmp/fs-i18n/screenshots/en-press-1440.png` und `nl-press-390.png`: zusätzliche Kontrolle der Standardüberschriften.
- `/tmp/fs-i18n/visual-report.json`, `flows-report.json`, `build-coverage.json`.
- `/tmp/fs-i18n/check-final.log`, `build-final.log`, `unit-final.log`.
- `/tmp/fs-i18n/verify.mjs`, `flows.mjs`: gezielte, nicht eingecheckte Playwright-Skripte.

Für die Integration: Nach Copy-Änderungen aus parallelen Branches werden die Quell-Hashes absichtlich anschlagen. Die jeweils betroffenen EN-/NL-Felder inhaltlich nachziehen und anschließend ihre Hashes aktualisieren. Die drei umgezogenen Seitenarten sind unter `src/templates/` zu bearbeiten; keine zweite Sprachvariante einer Astro-Komponente anlegen.

## Integration auf Round 13

Stand 2. November 2026. `codex/i18n-en-nl` (`7dee95a`) wird auf `b745898` in `codex/i18n-merge-r13` zusammengeführt. Der unabhängige Worktree liegt unter `/private/tmp/fs-i18n-r13/worktree`. Kein Push und kein PR.

Die aktuellen deutschen YAML-Dateien bleiben unverändert. EN und NL wurden bei Datenschutz, Über uns, Hochzeit und Indoor aus ihrer aktuellen Struktur neu abgeleitet. Bestehende passende Übersetzungen bleiben erhalten. Neu übersetzt sind sämtliche Sicherheitszonen, SVG-Beschriftungen, Schutzmaßnahmen, Zuständigkeiten, Planungs- und Versicherungsangaben, die Zusammenarbeit-Kacheln und die geänderten Team-/Historientexte. Der Datenschutzentwurf wurde vollständig in beide Sprachen übertragen, einschließlich seiner offenen Prüf- und Ergänzungspunkte. Diese neuen Texte und UI-Ergänzungen sind maschinelle Entwürfe ohne redaktionelle oder rechtliche Freigabe. Neue Provenienzeinträge tragen `revision: round-13`; die Quell-Hashes entsprechen den tatsächlich abgeglichenen deutschen Dateien.

Konfliktauflösung:

- `functions/api/contact.ts`: Die Round-13-Härtung bleibt vollständig erhalten, einschließlich begrenztem Body-Stream, Origin-Prüfung, Datei-/Mehrfachfeld-Abweisung, Zeitfalle, Kontrollzeichenprüfung, Timeout, Turnstile-Hostprüfung, minimierten Metadaten und Sicherheitsheadern. Fehlertexte kommen aus dem Wörterbuch. No-JS leitet in die passende Sprache weiter. Frühe Fehler verwenden bei vorhandenem gleichursprünglichem Referrer dessen Sprache. Der Validator akzeptiert zusätzlich den bereits im Round-13-Formular verwendeten Wert `offen`; andere unbekannte Paketwerte bleiben abgewiesen.
- `ShowConfigurator.astro`: Paketfarben, `data-bleed`, `Euer Logo` und `.cfg-own-wrap` bleiben erhalten. Der übersetzte Tooltip steht einmalig außerhalb des Fieldsets. `placeLegal()` bleibt im Browsermodul erhalten.
- `LandingSite.astro`: Die vollständig überarbeitete Round-13-Geometrie, fünf Zonen, Diagrammtexte, Safeguards, Zuständigkeiten und Planung bleiben erhalten. Nur gemeinsame Beschriftungen und Download-Links werden lokalisiert.
- `Extras.astro`: Das gemeinsame Raster `.ig/.ic` bleibt erhalten; Texte und Links verwenden die bestehende Locale-Factory.
- `Comparison.astro`: Die gemeinsame MobileTabs-Komponente und `data-mtab` bleiben erhalten. Gruppennamen, Tabellenbeschriftung und Tabellen-Sprache folgen der Locale.
- `ContactForm.astro`: Einheitliche `.chips`, `paket=offen`, der aktuelle Verarbeitungshinweis nach den Buttons und alle bestehenden Feldwerte bleiben erhalten. `locale` wird als verstecktes Feld übertragen; Quellenwerte wie `Empfehlung` bleiben sprachunabhängig.
- `package-details.ts`: Die Locale-Factory enthält weiterhin die vier INCLUDED-Icons aus Round 13 und dieselben Preise, IDs und Leistungsangaben.
- `src/scripts/contact.ts`: Längenfehler, Zeitmessung und Timer-Reset, URL-Bereinigung sowie der aktuelle ehrliche Versandstatus bleiben erhalten und sind übersetzt.
- `templates/PricingPage.astro`: Der umgezogene deutsche Seitenaufbau behält `Included`, MobileTabs in `#leistungen`, „Enthalten“/„Nicht enthalten“ und den Abschlusslink mit `paket=offen`. Keine Rückkehr zu Metrics für INCLUDED.

Auch die automatisch zusammengeführten LandingHero-/CaseStudy-/Packages-/Schema-Änderungen wurden gegen Round 13 geprüft. Die entfernte Genehmigungen-Section kommt in keiner Sprache zurück. Die deutsche Referenzfilter-Beschriftung wurde auf „151–300“ zurückgesetzt, um den deutschen Rendertext zu bewahren.

`scripts/layout-audit.mjs` akzeptiert zusätzlich `--start=/en/` oder jeden anderen lokalen Pfadpräfix. Der Crawl startet dort und bleibt innerhalb dieses Bereichs. Das Limit liegt bei 200 Pfaden. Ohne Option beginnt er weiterhin bei `/`. Die vorhandenen Prüfkriterien bleiben unverändert. Die Sprachlinks werden browserseitig zu vollständigen URLs, deshalb werden die drei Sprachbereiche ausdrücklich einzeln geprüft.

### Prüfungen der Round-13-Integration

- Vollständiger angeforderter Node-Befehl einschließlich `src/scripts/*.test.mjs`: 92/92 bestanden, keine Fehler oder Skips, Laufzeit ca. 108 Sekunden.
- `npx astro check`: 0 Fehler, 0 Warnungen, 229 Hinweise.
- `npm run build`: erfolgreich, 65 Inhaltsseiten. `node scripts/check-i18n-build.mjs`: 29 deutsche Routen, 42 EN-/NL-Inhaltsrouten, 16 EN-/NL-Weiterleitungen und zwei ausgenommene interne PoCs bestätigt.
- Gezielte Playwright-Suite mit `--workers=3`: 463 bestanden, 0 fehlgeschlagen, drei bestehende Viewport-Skips. Ausgeführt wurden ausschließlich `pricing`, `projects`, `reference-pass`, `inquiry`, `a11y`, `html`, `network-allowlist` und die neue `i18n.spec.ts`. Laufzeit ca. 1,9 Minuten. Die Weiterleitungsprüfung umfasst jetzt alle 24 DE-/EN-/NL-Aliasse; der Referenztest spricht die Hauptnavigation gezielt an, weil die Sprachwahl ein eigenes `nav` hinzufügt. Die neue i18n-Spec prüft beide Sprachen, mobile Tabs, Included, Sicherheitsabschnitte, die Tooltip-Position, Query-/Hash-Erhalt, Formularwerte und Status ohne echten Versand.
- Layout: jeweils 19 gecrawlte Inhaltsseiten pro Sprache. Chromium bei 390, 940, 1440, 1920 und 2560 px; WebKit bei 390 und 1440 px. Alle sechs Läufe mit 0 Befunden, insgesamt 399 Seiten-/Breiten-/Browserkombinationen. Einstieg jeweils `/`, `/en/` und `/nl/`. Es wurden keine Kriterien deaktiviert und keine Ausnahmen für Übersetzungen ergänzt.
- Die no-orphans-Middleware bleibt unverändert. Zusätzliche EN-/NL-Unit-Beispiele prüfen das Verbinden kurzer Schlusswörter und die Längenausnahme. Die Layoutläufe bestätigen, dass die übersetzten Seiten damit nicht überlaufen.
- Deutscher Rendertext: alle 21 deutschen Inhaltsrouten einschließlich 404, verglichen mit einem separaten Preview des unveränderten `b745898`. Nach Entfernen von Script-/Style-Inhalten und Vereinheitlichung von Leerraum 0 Abweichungen im `main`-Text. Die deutschen YAML-Dateien sind gegenüber `b745898` unverändert.
- Sichtprüfung: 44 PNG-Dateien. EN/NL, jeweils Home, Pricing, Über uns und Kontakt bei 1440 × 900 und 390 × 900, dazu vollständige Seiten, eigene Aufnahmen von `#sicherheit`, Schutzmaßnahmen, Preis-Tabs und Formularschritt 2. Die 16 Seiten-/Breitenkombinationen melden keine JavaScript-Fehler; `scrollWidth` entspricht überall exakt der Viewportbreite. Die oberen Ansichten und die zusätzlichen Diagramm-/Tab-Ansichten wurden geöffnet und visuell geprüft.
- Der Herkunftsnachweis enthält 240 neue Round-13-Inhaltsdatensätze und 48 Round-13-UI-Datensätze über beide Sprachen. Bestehende Editor-Herkunft wird nur fortgeschrieben, wenn deutscher Quelltext und tatsächliche Übersetzung übereinstimmen. Ein zusätzlicher Guard prüft Struktur und gültige Quellpfade aller Herkunftsdatensätze.

Belege unter `/private/tmp/fs-i18n-r13/`:

- `screenshots/{en,nl}-{home,pricing,about,contact}-{1440,390}.png`: geprüfte Ansichten. `about` zeigt den Anfang von `#sicherheit`, `about-safeguards` dessen Schutzmaßnahmen. `-full.png` enthält die ganze Seite.
- `screenshots/{en,nl}-pricing-tabs-{1440,390}.png` und `screenshots/{en,nl}-contact-step2-{1440,390}.png`: zusätzliche Interaktionszustände.
- `screenshot-report.json`, `layout-summary.json`, `build-coverage.json`, `german-render-diff.json`.
- `logs/check.log`, `logs/build.log`, `logs/unit-final.log`, `logs/playwright.log`, `logs/layout-{chromium,webkit}.log`, `logs/layout-{en,nl}-{chromium,webkit}.log`.

Keine technischen Restpunkte aus dem Merge. Redaktionelle Prüfung der maschinellen Übersetzungen sowie rechtliche Freigabe des Datenschutzentwurfs bleiben offen. Die zwei internen PoCs bleiben wie zuvor deutsch. Ein echter Mailversand wurde nicht ausgelöst. `.env`-Dateien wurden nicht gelesen; es gab keinen Push und kein Deployment.

## Inhaltslücken und zusätzliche Fallstudien, 02.11.2026

Branch `codex/inhalte-fallstudien`, Ausgangspunkt `68c6940`. Drei vorhandene Kurzreferenzen wurden zu vollständigen Fallstudien ausgebaut: Hochzeit Recklinghausen, Heiratsantrag Hugenpoet und L’Oréal × Prada Paradoxe. Alle neuen Showcase-Texte sind in EN/NL als `machine-new` dokumentiert. Quelle, Bilder und Originalfilm-Links stehen in [fallstudien-quellen.md](../fallstudien-quellen.md).

Die Hochzeit-Section `sections[1]` verwendet jetzt `landingRefs`; ihre alten `landingStories.items`-Pfade entfallen aus der Provenienz. Die folgenden Section-Indizes bleiben unverändert. Auf Werbung ersetzt die vorhandene Ford-Fallstudie die unverlinkte Spotify-Kurzreferenz. Der Gesamtbestand von 19 Referenzen bleibt erhalten; sieben davon haben nun eine eigene Fallstudie.

43 interne Hinweise stehen identisch auf elf DE-/EN-/NL-Seiten. Sie bleiben absichtlich auf Deutsch und sind keine unübersetzte öffentliche Prosa. Sie benötigen keinen `machine-new`-Record, da sie nicht übersetzt wurden. Alle betroffenen Quellhashes sind aktualisiert. Die neu formulierte Referenz-Einleitung ist als `machine-new` erfasst. Lücken und tatsächliche Prüfergebnisse: [Inventar](../inhalte-luecken.md), [Prüfprotokoll](../inhalte-pruefung.md).
