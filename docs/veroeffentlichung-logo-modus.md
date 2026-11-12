# Veröffentlichung Motivkatalog und Logo-Modus

Stand 12.11.2026. Ausgangs-HEAD `5bc87f5`, `origin/main` bei Prüfung `3a3859d`. Fetch erfolgreich. `git merge origin/main --no-edit` meldet „Already up to date“; keine Konflikte. Keine weiteren Branches gemergt.

## Branchinventar vor Veröffentlichung

„Enthalten“ bedeutet Commit-Abstammung. Patchgleiche Commits können trotz abweichender Historie bereits integriert sein. Offene PRs sind kein Beweis, dass deren Inhalt noch fehlt.

| Branch | Enthalten | Zusätzliche Patches laut git cherry |
|---|---|---|
| `claude/showreel-seamless-loop-2026-11-03` | ja | – |
| `codex/afe-030` | ja | – |
| `codex/analytics-consent` | ja | – |
| `codex/consent-library` | ja | – |
| `codex/css-tokens` | nein | 0 |
| `codex/dedupe-r20-a` | nein | 1 |
| `codex/dedupe-r20-b` | nein | 1 |
| `codex/dupes-inventory-r20` | nein | 1 |
| `codex/dupes-report` | nein | 1 |
| `codex/editor-migration` | ja | – |
| `codex/i18n-contract` | nein | 1 |
| `codex/i18n-design` | nein | 0 |
| `codex/i18n-en-nl` | ja | – |
| `codex/i18n-merge-r13` | ja | – |
| `codex/i18n-p2` | ja | – |
| `codex/i18n-p3` | ja | – |
| `codex/inhalte-fallstudien` | ja | – |
| `codex/konsolidierung` | ja | – |
| `codex/kontaktformular-dsgvo` | ja | – |
| `codex/node26` | nein | 0 |
| `codex/pages-noindex-2026-11-04` | ja | – |
| `codex/referenzen-sheet-daten` | ja | – |
| `codex/rem-sweep` | ja | – |
| `codex/rest-pflege` | ja | – |
| `codex/showreel-dynamic-ending-2026-11-03` | ja | – |
| `codex/showreel-loop-transition-2026-11-03` | ja | – |
| `codex/showreel-motifs-2026-11-03` | ja | – |
| `codex/showreel-pacing-2026-11-03` | ja | – |
| `codex/showreel-qr-transition-2026-11-03` | ja | – |
| `codex/sicherheitskonzept` | ja | – |
| `codex/site-afe-031` | nein | 0 |
| `codex/t02-shared-blocks` | nein | 0 |
| `codex/ueber-uns-usps` | ja | – |
| `codex/ui-dependency-narrow` | ja | – |
| `codex/video-diaet` | ja | – |
| `codex/video-header-budget-2026-11-03` | ja | – |
| `codex/video-vergleich-2026-11-03` | ja | – |
| `feat/designsprache-poc` | ja | – |
| `feat/elevate-2026-10-30` | nein | 8 |
| `feat/flyingstars-reference` | ja | – |
| `feat/katalog-motive` | ja | – |
| `feat/logo-modus` | ja | – |
| `feat/show-konfigurator` | ja | – |
| `fix/minimal-fonts` | ja | – |
| `fix/publication-flow` | ja | – |
| `main` | ja | – |
| `merge/designsprache-main` | ja | – |
| `review/flyingstars-opus-pass` | ja | – |
| `origin/afe/editor-package` | ja | – |
| `origin/ci/direct-deploy` | ja | – |
| `origin/ci/timeout` | ja | – |
| `origin/claude/issue-2-20261006-1509` | nein | 1 |
| `origin/claude/issue-2-20261006-1512` | nein | 1 |
| `origin/codex/afe-030` | ja | – |
| `origin/codex/consent-library` | ja | – |
| `origin/codex/editor-migration` | ja | – |
| `origin/codex/inhalte-fallstudien` | ja | – |
| `origin/codex/konsolidierung` | ja | – |
| `origin/codex/pages-noindex-2026-11-04` | ja | – |
| `origin/codex/showreel-dynamic-ending-2026-11-03` | ja | – |
| `origin/codex/showreel-loop-transition-2026-11-03` | ja | – |
| `origin/codex/showreel-motifs-2026-11-03` | ja | – |
| `origin/codex/showreel-pacing-2026-11-03` | ja | – |
| `origin/codex/showreel-qr-transition-2026-11-03` | ja | – |
| `origin/codex/video-header-budget-2026-11-03` | ja | – |
| `origin/codex/video-vergleich-2026-11-03` | ja | – |
| `origin/content/draft` | ja | – |
| `origin/content/issue-1` | ja | – |
| `origin/dependabot/github_actions/actions-824dd6882b` | nein | 1 |
| `origin/dependabot/npm_and_yarn/minor-and-patch-42d2a8f015` | nein | 1 |
| `origin/dependabot/npm_and_yarn/minor-and-patch-5fc082f472` | nein | 1 |
| `origin/dependabot/npm_and_yarn/minor-and-patch-7d15e1a3a4` | nein | 1 |
| `origin/dependabot/npm_and_yarn/typescript-7.0.2` | nein | 1 |
| `origin/deps/editor-0.2.3` | ja | – |
| `origin/feat/designsprache-poc` | ja | – |
| `origin/feat/elevate-2026-10-30` | nein | 8 |
| `origin/feat/flyingstars-reference` | nein | 0 |
| `origin/feat/show-konfigurator` | ja | – |
| `origin/fix/minimal-fonts` | ja | – |
| `origin/fix/publication-flow` | ja | – |
| `origin/fix/stale-translation` | ja | – |
| `origin/main` | ja | – |
| `origin/merge/designsprache-main` | ja | – |
| `origin/perf/css-delivery` | nein | 3 |

## Korrektur der bekannten Unit-Fehler

- Locale-Test: `auditContracts` validiert weiterhin alle 132 vollständigen Locale-Dateien inklusive Version, Hash, Feldbelegen und Review-Frische. Zulässig sind sowohl initial übernommene als auch später geprüfte Felder. Der alte Test verlangte irrtümlich ausschließlich den einmaligen Migrationsstatus.
- Freischalt-Test: Die generische Prüfung über alle Anlässe bleibt unverändert. Die konkreten Hochzeits-Erwartungen berücksichtigen die Katalogmotive ab 150 und 200 Drohnen; die alten Erwartungen stammten aus der Zeit vor dem Katalog. Keine Änderung der Produktlogik.

## Geltungsgrenzen

Die fachlich noch offenen Arbeiten stehen in [der Übergabe](uebergabe-naechste-runde.md). Sie werden mit dieser Veröffentlichung nicht als erledigt erklärt.

## Nachtrag von Marc

Die zusätzliche Logo-Hinweisbox auf der Bühne ist vollständig aus Markup und Controller entfernt, in allen Sprachen und bei allen Show-Budgets. Die unsichtbare Bildbeschreibung `cfg-scene` bleibt für assistive Technik erhalten. Der schnelle Unit-Wächter `src/scripts/logo-caption.test.mjs` und die Logo-Browserspec verhindern die Rückkehr der Box.

## Lokale Vorprüfung

- Unit-Gesamtlauf: 765 Tests, 763 bestanden, zwei übersprungen, keine Fehler; 763,5 Sekunden. Der anschließend hinzugefügte Box-Wächter besteht separat.
- Astro check: null Fehler, null Warnungen, 312 Hinweise. Produktionsbuild erfolgreich.
- Logo-Budget-Browserspec: 16/16 auf Desktop/Mobil in Chromium und WebKit gegen den Produktionsbuild.
- Die alten Regler-Mausprüfungen verwenden jetzt die nativen Inputgrenzen statt einer hartcodierten 600er-Skala. Der Upload-Test prüft das neue Budget-/Mindestbedarfsmodell ausdrücklich, einschließlich konsistenter Bildbeschreibung.

- Layout-Audit gegen Produktionspreview: Chromium und WebKit jeweils 22 Seiten × fünf Breiten (390, 940, 1440, 1920, 2560), null Befunde.
- Erster Konfiguratorlauf: 26 bestanden, drei veraltete Erwartungen, ein Timeout; 134 nicht ausgeführt. Timeout-Ursache: Der Upload öffnet seit Runde 27 den Logo-Anlass; der Test versuchte dort das verborgene Textfeld zu füllen. Upload- und Physiktest übernehmen das Logo nun ausdrücklich über den Button in die Show. Ein vollständiger Wiederholungslauf folgt. Die ersten drei korrigierten Desktop-Mausfälle bestanden gezielt.

## Abschluss und Blocker

- Vollständiger Konfigurator-Wiederholungslauf: 164 Fälle, 140 bestanden, zwölf übersprungen, zwölf fehlgeschlagen; 11,8 Minuten. Acht Fehler betrafen die inzwischen korrigierte Anlassliste; ein Fehler den Touch-Hover-Marker; drei Fehler die Behandlung von mobilem WebKit als Desktop.
- Gezielte Wiederholung der Anlasslisten und des vollständigen Upload-/Drop-Ablaufs: 12/12 grün auf allen vier Profilen.
- Gerätezuordnung jetzt aus Playwrights `isMobile` statt aus dem einzelnen Profilnamen. Gezielter Lauf aller sieben betroffenen Fälle: 21 bestanden, sechs passende Mausfälle auf Touch übersprungen, ein echter Layoutfehler auf mobilem WebKit.
- Verbleibender Layoutfehler: `Auf den ersten Blick: Anlass, Aufwand, Preis und Anfrage`, mobiles WebKit. Nach Navigation zu `#konfigurator` sind die Paketknöpfe nur zu 54,8 Prozent statt vollständig im Viewport. Der ursprüngliche Sichtbarkeitsvertrag bleibt unverändert. Kein Merge nach main.
- Der zuvor hängende Physiktest besteht mit dem expliziten Logo-Übernahmeschritt in 2,7 Minuten. Grenzwerte blieben unverändert.
- GitHub-CI für `ac82594`: fehlgeschlagen im vollständigen Unit-Schritt nach dessen 600-Sekunden-Prozesslimit. Der lokal grüne Lauf dauert 763,5 Sekunden. Nur der vollständige Unit-Schritt erhält deshalb 1200 Sekunden; Check und Build behalten 600 Sekunden, der Workflow seinen bisherigen Gesamtumfang und sein Gesamtlimit. Neuer Pipeline-Lauf nach Push erforderlich; kein grüner Pipeline-Nachweis behauptet.
- Cloudflare-Preview erfolgreich: https://7f5840f5.flyingstars-site.pages.dev . Logo-Anlass und Adidas per Browser geklickt, Zustand `ready`, 200 Punkte, keine sichtbare Fehleranzeige, keine zusätzliche Logo-Hinweisbox oder Dev-Markierungen auf der geprüften Seite. Prüftab geschlossen.
- Produktion https://flyingstars-site.pages.dev unverändert, kein Merge-Commit, Produktionsprüfung daher nicht durchgeführt. Kein Nachweis für Marcs Safari 18.6 oder reale Mobilgeräte. Die noch fachlich offenen Aufgaben aus der Übergabe bleiben offen.
- Der T3-PR-Watcher ist in dieser Sitzung nicht verfügbar. Der Feature-PR bleibt wegen des belegten lokalen Layoutfehlers ausdrücklich ungemergt.

### Korrektur des lokalen Audit-Ziels

Der erste Audit auf Port 4398 verwendete einen bereits vorhandenen Server; der eigene Preview war auf 4399 ausgewichen. Der bestehende Server auf 4398 wurde beim Aufräumen versehentlich beendet. Port 4391 blieb unberührt. Deshalb wurde der Audit vollständig gegen einen vorher geprüft freien, ausdrücklich mit `/opt/homebrew/bin/node` gestarteten Produktionspreview auf 44781 wiederholt: Chromium und WebKit jeweils 22 Seiten × fünf Breiten, null Befunde. Maßgebliche Logs: `/tmp/fs-publish-layout-final-chromium.log` und `/tmp/fs-publish-layout-final-webkit.log`; der eigene Prozess auf 44781 ist beendet.
