# Restpflege vom 4. November 2026

Basis `d98c649`, Branch `codex/rest-pflege`, isolierter Worktree `/tmp/fs-rest`. Kein Push, Merge oder Deployment. Keine `.env` gelesen. `src/pages/[...slug].astro` bleibt unverändert. Claude übernimmt Review und Push.

## Zusammengeführt

- T03: Dev-only-Hilfe aus dem gemeinsamen Section-Schema berichtigt und über sämtliche Section-Typen geprüft. Preis-/Zeitbeispiele sind keine Tests kommerzieller Zusagen.
- K02: Ein Token für den identischen Spaltenabstand von Blog- und Projektkarten. Ihre unterschiedlichen Spaltenzahlen, Zeilenabstände und Breakpoints bleiben erhalten. Die Projektlisten benutzen bereits dieselbe globale `.projects`-Regel; eine zusätzliche Grid-Komponente würde keinen weiteren Besitzer entfernen.
- K03: Identische Geometrie von Slider- und Reel-Schließknopf in einer gemeinsamen Selektorregel. Eigene Hintergründe, Positionen, Hover- und Disabled-Zustände bleiben erhalten. Textbuttons und Textlinks besitzen bereits gemeinsame Basen.
- K07: Gemeinsame TeaserSection-Hülle mit SectionHead und Slot. Beide bestehenden Section-Typen und ihre fachlichen Props bleiben erhalten. Keine zusätzlichen DOM-Container oder Feldadressen. Die ursprünglichen `__afe`-Bindings und der Section-Typ werden ausdrücklich weitergereicht. Der echte Markerbuild enthält vorher und nachher exakt dieselben 6.567 Adressen auf allen 96 Routen; sämtliche Adressen sind gegen die aktiven Schemata auflösbar. Ein erster Hüllenentwurf verlor neun Section-Marker und wurde vor Abschluss korrigiert.
- K08: Gleiche Typografie, Polsterung und Rundung passiver Paketbadges gemeinsam. Auswahl-Chips, unterschiedliche Farben und Featurelisten mit anderen Rollen bleiben getrennt.
- S03: Gemeinsame Repository-/Frontmatter-Leser in fünf Tests; Sprachliste aus LOCALES. Anfrage-Tests beziehen Beschriftungen aus dem UI-Vertrag, prüfen weiter Zustand, Versanddaten und Fehler. Unabhängige historische Snapshots und gezielte redaktionelle Erwartungen bleiben erhalten.
- S04: Site und Lockfile verlangen wie AFE Node >=24.15.0. `.nvmrc` und CI bleiben auf 24. npm und Editor-CI benutzen denselben vollständigen Unit-Testvertrag mit Parallelität 2, einschließlich des zuvor im Editor-CI ausgelassenen `editor/core`. npm test umfasst nun alle Unit-Tests. Sprach-Buildprüfung im npm-Gate-Einstieg. Der interne Offline-CI-Einstieg behält seinen bestehenden Vertrag für technische einsprachige Release-Fixtures; seine Unit-Prüfungen enthalten die Content-Sprachverträge. Aktuelle Betriebsvoraussetzung im README; historische Node-22-Prüfbelege nicht rückwirkend umgeschrieben.

## Bewusst offen

T01: Drei semantisch gleiche Schlüssel konnten textgleich zusammengelegt werden. Der echte Build lehnt danach jedoch bestehende Sprachverträge ab. `tokenDependency` für `offer.indoor.ceilingWords` bindet das gesamte UI-Wörterbuch in den Fingerprint ein. Schlüsselentfernung verändert damit unabhängig vom dargestellten Text den Quellstand. Der Versuch ist vollständig zurückgenommen. Eine gesonderte, belegte Migration dieses konservativen Abhängigkeitsvertrags ist nötig; Nachweise werden nicht automatisch als geprüft markiert. Die noch deutsche Faces-Einleitung in EN/NL bleibt ebenfalls unverändert, da ihre Lokalisierung den verlangten textgleichen Vergleich verletzen würde. „Telefon“ als optionale Formularaktion und als Kontaktüberschrift bleibt semantisch getrennt.

Keine universellen Hero-/Grid-/Dialogkomponenten. Keine Änderungen an Kopfzeile, Unterstrich-Effekt, gleitender Box, Bewegungsschalter, Content-Dateien oder Sprachfreigaben. Unterschiedliche Raster-/Listen-/Medienrollen werden nicht nur wegen gleicher Werte vereinheitlicht.

## Prüfung

Node v24.21.0 aus `/Users/marcviladrich/.npm/_npx/387698761821791d/node_modules/node/bin`. Der beauftragte `/opt/homebrew/opt/node@24/bin` verweist dagegen auf ein defektes Node 24.10.0 mit fehlender `libsimdjson.27.dylib`, außerdem unterhalb der AFE-Mindestversion. Keine Systeminstallation verändert. Sämtliche Editorprüfungen verwenden temporäre AFE_STATE_DIRs.

- `npm ci`: erfolgreich.
- Astro-Check: 0 Fehler, 0 Warnungen, 253 Hinweise.
- Produktionsbuild mit echten optimierten Bildern: erfolgreich.
- `check-i18n-build`: 32 deutsche Routen, 48 lokalisierte Inhaltsrouten und 16 lokalisierte Redirects.
- Beide Buildvergleicher: alle 96 HTML-Dateien ohne Text-/Vertragsunterschiede, keine hinzugefügten/entfernten Routen.
- Layout: Chromium und WebKit je 22 gecrawlte Seiten × 390/1440/2560 px, jeweils 0 Befunde.
- Geänderte Anfrage-Browserspec: 12/12 in Chromium und WebKit.

Pixelvergleich: **36/36 Paare bestanden**, sechs Seiten × drei Breiten × Chromium/WebKit. Identische PNG-Maße, maximal eine Farbstufe Differenz, kein Kanal über der erlaubten Schwelle von zwei. [Maschinenbericht](pixelvergleich.json), PNG-Paare unter `/tmp/fs-rest-pixels-final/`. Der vollständige Unit-Lauf unter Node 24.21.0 ergibt **711 Tests: 707 bestanden, 2 fehlgeschlagen, 2 übersprungen**, 0 abgebrochen, 745.423 ms. [Maschinenbericht](unit-ergebnis.json), vollständiges Log `/tmp/fs-rest-unit-verified.log`. Die Kontakt- und Personen-/Projektfakten-Integrationen melden einen fehlgeschlagenen Astro-Kandidatenbuild. Der Kontakt-Test besteht isoliert unmittelbar danach mit unverändertem Code. Beide fehlgeschlagenen Tests bestehen im anschließenden gemeinsamen Nachlauf mit Parallelität 2 und unverändertem Code: **2/2 bestanden**, 111.312 ms. [Nachlauf](kandidatenbuild-nachlauf.txt). Dabei werden Buildlogs vor der Fixture-Bereinigung unter `/tmp/fs-rest-captured-buildlogs/` gesichert. Der Zusatzimport verändert keine Assertions oder Produktdateien. Die Fehler des Gesamtlaufs sind damit nicht reproduziert und ihre Ursache ist nicht belegt. Ein grüner Gesamtlauf ist weiterhin nicht belegt. Die neue gemeinsame CI-Auswahl samt Offline-Pipeline besteht im selben Gesamtlauf. `tools/compare-rest-pixels.mjs` prüft sechs beauftragte Seiten bei drei Breiten in beiden Engines. Canvasflächen sind auf beiden Seiten unsichtbar, Videos angehalten und ihre Netzabrufe blockiert; Poster, Text, Geometrie und Bedienelemente werden verglichen. Dies ist ein statischer Pixelnachweis, kein erneuter Bewegungsnachweis. Bilder werden vollständig dekodiert, Fonts geladen und CSS-Animationen/Übergänge ausgeschaltet. Zwei Animation-Frames und eine verworfene Fullpage-Voraufnahme stabilisieren WebKits erstmaliges Malen außerhalb des Viewports. Ohne diese Voraufnahme zeigte WebKit auf der mobilen Referenzseite Unterschiede trotz gleicher Geometrie und berechneter Stile; derselbe neue CSS-Stand war bei abgefangenem CSS-Laden exakt gleich. Der endgültige Vergleich verwendet ausschließlich die unveränderten Builds und die dokumentierte Voraufnahme. Abweichungen über zwei Farbstufen lassen das Werkzeug fehlschlagen.

## Commits für das Review

| Gruppe | Commits |
|---|---|
| T03 | `a5b40bb` |
| K02 | `e211fbd` |
| K03 | `d5a5733` |
| K07 | `c711c66`, `e56b352` |
| K08 | `940ee14` |
| S03 | `e29203d`, `3b66079` |
| S04 | `90f7a44`, `a2adb8c` |
| Gemeinsame CSS-/Pixel-Guards | `2d1001b`, `829123a` |
| T01, Versuch vollständig zurückgenommen | `13aae7d`, `5e3df68` |

Die T01-Commits heben sich vollständig auf. Keine UI-Schlüsseländerung im Enddiff.

Endstand der Implementierung: `e56b352`. Der abschließende Produktionsbuild und beide Text-/Vertragsvergleiche enthalten bereits die AFE-Weitergabe. Die beiden CSS-Assets bleiben identisch zu denen des bestandenen 36-Paare-Pixelvergleichs. Gezielter Nachlauf: `node --import /tmp/fs-rest-capture-buildlogs.mjs --test --test-concurrency=2 editor/contact-record.test.mjs editor/facts-records.test.mjs`.

Für das Lead-Review bleiben zwei Punkte: T01 erfordert eine gesonderte Abhängigkeitsmigration; der vollständige Node-24-Lauf ist trotz bestandener Nachprüfung nicht vollständig grün. Kein Push erfolgt.
