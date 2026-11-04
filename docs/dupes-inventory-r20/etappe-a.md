# Etappe A des Mehrfachpflege-Inventars

Übergabe an Claude, 4. November 2026. Umsetzung im beauftragten Worktree `/tmp/fs-dupes-inventory-r20`, Branch `codex/dedupe-r20-a`, auf `e66c01c`. Kein Push, PR, Merge oder Deployment. Marcs laufender Checkout und sein Editorzustand wurden nicht verwendet. Alle Editor-/CLI-Prüfungen verwenden eigene temporäre Zustände. Keine `.env` wurde gelesen.

## Änderungssätze

| Schritt | Commit | Entfernt bzw. zentralisiert |
| --- | --- | --- |
| 0 | `f690ff2` | Inventar übernommen; F01/N01/K03/K05 an Claudes neuer Basis erneut gelesen. Veraltete feste Section-Anzahl im Schema-Test ersetzt; `contactDetails` ausdrücklich abgesichert. |
| 1 | `3465ed8` | Video, Calculator, pricing.js, dessen Heart-Capacity-Datei, ausschließlich alte Calculator-Styles und unerreichbare Editor-/Overlay-Zweige entfernt. Aktive Routing-/Preview-/Medienmodule sowie `translate-missing` bleiben. Aktueller Regler und Import-/Registrierungsgraph haben Guards. |
| 2 | `c07c565` | `contact.json` mit Zod-Schema und AFE-Datensatz „Kontakt“. CONTACT bleibt die Leseschnittstelle; Telefon-/WhatsApp-Links werden abgeleitet. Footer, ContactWays und contactDetails öffnen über Panel-Feldmarker mit leerem Pfad direkt den Datensatz. Danke und Fehlertexte sind parametrisiert. Rechtsfassungen bleiben unverändert und erhalten einen Driftbericht. |
| 3a | `5a4f52f` | Totes Paket-`dur` entfernt. `show-duration.json` besitzt Outdoor-Spanne, typische Outdoor-Dauer und Indoor-Spanne. Karten, Konfigurator, Leistungsübersicht, Anlass-Fakten, Indoor-Vergleich und FAQ projizieren dieselben Werte. |
| 3b | `1e01916` | Paket-Keys/Reihenfolge, Orb und Bezeichnungsreferenz gemeinsam. Schema-Enums, Schrittfolge, Karten, Formular und API leiten daraus ab. `preview-policy.json` besitzt ausdrücklich nicht freigegebene Vorschaugrenzen und Aufpreise; kommerzielle Grenze 150 und Vorschaugrenze 190 bleiben getrennt. Build-Guard prüft zusammenhängende Bereiche und gültige, nicht fallende Vorschaupreise. Bezeichnungstexte bleiben im bestehenden UI-Datensatz editierbar; ihre Referenzen sind geschützt. |
| 3c | `HEAD` | `show-extras.json` besitzt Film-/Schweizpreise, Indoor-Preis/-Mengen/-Deckenhöhe und Film-Inklusion. Preiszellen und inkludierte Kartenpunkte sind Projektionen. Betrag und Qualifikator werden getrennt formatiert; die Satz-Regex in LandingPrice entfällt. Gespeicherte Preis- und Textkopien wurden durch Referenzen ersetzt. |

Jeder Schritt enthält die Entfernung der abgelösten Quelle und seinen Guard. Die sechs endgültigen Commits sind die sechs Einträge von `git log --oneline e66c01c..HEAD`. Die ursprünglichen Inventarzahlen und Runde-1-Werkzeuge bleiben historische Belege für `8be0e28`; sie sind kein neu erzeugtes Inventar des bereinigten Quellbaums.

## Prüfung

Die Zeilen dokumentieren die ersten vollständigen Unit-Läufe je Schritt; die Zwischenfehler wurden vor Abschluss behoben und die betroffenen Suites wiederholt. **Abbruch** bedeutet hier ausschließlich die bereits bekannte 20-Sekunden-Zeitgrenze von GitSync. Die abschließenden Ergebnisse stehen direkt darunter.

| Schritt | Unit gesamt | Grün / Fehler / Abbruch / Skip im ersten Lauf | Nachlauf nach Korrektur | Build + i18n | Playwright Chromium / WebKit |
| --- | ---: | --- | --- | --- | --- |
| 0 | 607 | 603 / 1 / 1 / 2 | Schema 6/6, GitSync 2/2 | grün | keine sichtbare Änderung |
| 1 | 608 | 604 / 1 / 1 / 2 | Import-/Registrierungswächter 1/1 | grün | 48 / 47 bestanden; 1 / 2 Skips |
| 2 | 611 | 604 / 4 / 1 / 2 | Kontakt/Collections/Pipeline 9/9; Marker 5/5 | grün | 11 / 11 bestanden |
| 3a | 615 | 610 / 2 / 1 / 2 | Dauer/Pipeline 7/7 | grün | 48 / 47 bestanden; 1 / 2 Skips |
| 3b | 619 | 614 / 2 / 1 / 2 | Paket/Pipeline 7/7; spätere Paket-/Panelprüfung 19/19 | grün | 54 / 53 bestanden; 1 / 2 Skips |
| 3c | 624 | 621 / 0 / 1 / 2 | finale Ergebnisse unten | grün | 54 / 53 bestanden; 1 / 2 Skips |

**Finaler Gesamtlauf:** **625/625 bestanden, 0 Fehler, 0 Abbrüche, 0 Skips** (`unit-concurrency2.log`). Der ruhige GitSync-Einzellauf besteht mit 2/2; Testzeitgrenzen und Toleranzen wurden nicht geändert. Die beiden standardmäßig übersprungenen Prüfungen benötigen ausdrücklich `FLYINGSTARS_AUDIT_DIST`; separat mit dem gebauten Artefakt sind 3/3 der Rendering-Suite grün. Der finale Gesamtlauf verwendet diese Variable ebenfalls. Nachweise für die zuletzt korrigierte Template-Bearbeitung: 2/2 tatsächliche Kontakt-/Dauer-Speicher- und Buildprüfungen. Angebots-/Inklusions-/i18n-Prüfungen: 13/13.

**Finale Browserprüfung:** Chromium 54 und WebKit 53 Fälle bestanden im vollständigen Abschlusslauf (`approved-playwright.log`); der letzte Wiederholungslauf und sein Einzelnachlauf sind unten getrennt ausgewiesen. Der letzte parallele Browserlauf hat 106 bestanden, einen Fehler und drei Skips: ein Szenenwechsel-Check sah statt der Rakete noch die Winter-Uhr. Derselbe unveränderte Test besteht unmittelbar einzeln mit 1/1 in 5,3 Sekunden; kein Produktcode und keine Testtoleranz wurden dafür verändert. Die drei Skips betreffen zwei mobile Tab-Prüfungen außerhalb der angeforderten Desktop-Projekte und einen Chromium-spezifischen Bewegungscheck. Der zusätzlich ausgeführte HTML-Sweep: 465 bestanden, sechs vorbestehende PoC-Befunde, drei Skips.

**Layout:** Nach jedem Schritt 1–3c und auf dem Abschlussstand je Engine drei Sprachläufe, jeweils 22 Seiten × fünf Breiten (390, 940, 1440, 1920, 2560). **Chromium 0 Befunde, WebKit 0 Befunde**, damit 660 Seiten-/Breitenprüfungen pro Schritt. Schritt 0 ändert ausschließlich Dokumentation und einen Test. Die Desktop-Projekte ergänzen diese responsive Prüfung; separate mobile Playwright-Projekte sind nicht Bestandteil dieses Auftrags.

**Abschlussbuild:** erfolgreich, 182 generierte Seiten plus Aliase = 206 HTML-Dateien. `astro check`: 0 Fehler, 0 Warnungen, 246 Hinweise. Sprachcheck: 32 deutsche Routen, 48 lokalisierte Inhalte und 16 lokalisierte Redirects; 110 ausdrücklich ausgenommene Prototypen.

Die npm-Läufe wurden mit angehängtem `--test-concurrency=2` aufgerufen. **Bei der Schlussprüfung nachgewiesene CLI-Falle:** npm hängt den Schalter hinter die Dateimuster; Node 22 begrenzt dann die Parallelität nicht. Ein isolierter Vier-Dateien-Probelauf misst vier gleichzeitige Tests mit dieser Schreibweise und zwei, wenn der Schalter unmittelbar hinter `--test` steht. Deshalb wurde der abschließende Gesamtlauf als `node --test --test-concurrency=2` mit denselben sechs Dateimustern wiederholt, ohne gleichzeitige Browserläufe. Der vorhergehende überlastete npm-Lauf meldete zusätzlich zu GitSync zwei CLI-/Composition-Zeitgrenzen (625 insgesamt, 622 bestanden, ein Fehler, zwei Abbrüche, keine Skips). Die anfänglichen festen Annahmen zur Section-/Datensatzanzahl und zu `site/contact` wurden an den tatsächlichen Vertrag angepasst. Die Mutation-Fixture erhält ausdrücklich ihren eigenen `content/draft`-Branch. TypeScript-Fehler an der neuen Kontaktprojektion und an der abgeleiteten Paket-ID-Menge sind behoben. Die betroffenen Pipeline-Suites wurden auf bereinigten Ständen einzeln wiederholt: Kontakt 9/9, Dauer 7/7, Paketpolicy 7/7. Kontakt-Marker zusätzlich 5/5; spätere Schema-/Paketprüfungen sind in den Belegen erfasst.

Ein überlappender Prüfversuch im selben Prüf-Worktree erzeugte ENOENT-Fehler durch wechselnde Playwright-Artefakte. Dieser Lauf ist verworfen und separat dokumentiert; seine Fehler wurden nicht durch geänderte Toleranzen verdeckt. Der Abschlusslauf verwendet stabile Quellen und einen externen Playwright-Ausgabeordner. Alle temporären Worktrees/Zustände sind unter `/tmp` angelegt; produktive Editorzustände wurden nicht benutzt.

### Textgleichheit und sichtbare Folgen

Alle **206 HTML-Dateien** gegen den Build der unveränderten Basis verglichen. **Keine hinzugefügten/entfernten HTML-Dateien, keine Abweichung** bei normalisiertem Text, Linkzielen, SEO-Metadaten, Canonical/hreflang und Formularwerten/-grenzen. Die ausführbare Prüfung ist `tools/compare-builds.py`.

Die öffentliche Website enthält keine beabsichtigte sichtbare Änderung. „10–25 Min Showzeit“, typisch 13 Minuten und Indoor 5–8 Minuten bleiben erhalten. „900 €“ in Vergleich und Hochzeit bleibt auch in EN/NL in seiner vorhandenen Suffix-Schreibweise; die anderen Preiszeilen behalten ihre jeweilige Währungsposition. Netto-, Anfahrts- und „ab ca.“-/„ab etwa“-Aussagen sind erhalten.

Im Editor sind vier neue globale Datensätze sichtbar. Die Paketbezeichnungsreferenz ist geschützt; Texte werden weiter im vorhandenen Datensatz „Website-Texte“ geändert. Die neuen Auswahlbeschriftungen sind deutsch und das Paketfeld der Vorschau-Erweiterung ist als eigene Gruppe angeordnet. EN/NL-Quellhashes und Herkunftsnachweise wurden fortgeschrieben, ohne eine redaktionelle Freigabe zu erfinden.

### Mutations- und Browsernachweise

- Kontakt über NativeStore gespeichert: Nummern, Mail und Anschriften ändern Footer, Kontakt-Section und ContactWays; Nummer/Mail ändern Danke. DE/EN/NL gebaut. Rechtsdateien bleiben bytegleich; der Guard meldet die absichtlich erzeugte Abweichung.
- Dauer über den Editor-Datensatz gespeichert: Outdoor 11–24, typisch 14 und Indoor 6–9 ändern die gebauten Karten, den Konfigurator, FAQ und Indoor-Fakten in allen drei Sprachen.
- Paketbasis, Farbe und Orb sowie ein UI-Bezeichnungstext gespeichert; sämtliche Projektionen folgen. Eine separate Vorschauänderung überschreibt keinen kommerziellen Preis. Zu kleine kommerzielle Grenze und fallende Vorschau-Preisfolge werden im echten Modell abgewiesen.
- Film-/Schweiz-/Indoorpreise und Indoor-Mengen gespeichert; Vergleich, Extras, Anlass-Preiszeilen und FAQ folgen in DE/EN/NL. Die Film-Inklusion steuert Zellen, Kartenpunkte, die explizite Paketangabe auf Werbung und den Rohmaterial-Bestandteil der ODYSSEY-Betreuung aus demselben Modell.
- Echter Editor in Chromium und WebKit: je sieben Szenarien, insgesamt **14/14**. Footer-Kontakt per Maus bzw. Enter, Kontakt-Section, ContactWays, Showzeiten, Vorschaupolicy, Extras/Sonderangebote und Show-Pakete. Screenshots der tatsächlichen Ansichten geprüft; keine JavaScript-Ausnahme. Die Vorschau-Paketauswahl hat zusätzlich einen Geometriewächter gegen senkrecht zerfallende Beschriftungen. `tools/editor-bindings-proof.mjs` kann das an einer ausdrücklich gestarteten lokalen Prüf-Instanz wiederholen.

## Ausnahmen und Grenzen

Der zusätzliche HTML-Sweep mit `html.spec.ts` über seine konfigurierten Routen meldet auf `/poc/video-lab/`, `/poc/video-lab/gross/` und `/poc/video-lab/inter/` fehlende Meta-Beschreibungen, jeweils in Chromium und WebKit. Der unveränderte Ausgangsbuild hat dort ebenfalls jeweils null Description-Tags. Diese **sechs bestehenden Befunde** liegen im ausdrücklich ausgenommenen A02-Umfang. Keine PoC-Datei oder URL wurde geändert und keine Erwartung gelockert.

AFE 0.3.0 enthält für generische formatierte Feld-Popover den fest codierten Hilfstext „Gilt für alle Preisangaben dieses Pakets.“ Dieser passt bei Showzeiten und Sonderangeboten nicht immer. Die Kontaktlinks öffnen deshalb unmittelbar den vollständigen Kontakt-Datensatz. Der fremde Paketcode wurde nicht im Site-Repository überschrieben; der allgemeine Hilfstext gehört in eine folgende AFE-Produktversion. Die vollständigen Datensatzansichten sind nutzbar und geprüft.

Die Prüf-Editoren liefen ausschließlich temporär und ohne produktive Authentifizierung oder Veröffentlichung. Ihre nicht aktivierte Live-Preview-Lease liefert erwartungsgemäß 503; für die Feld-/Datensatzprüfung wird die tatsächlich gebaute statische Editoransicht verwendet. Daraus folgt keine Prüfung eines produktiven Live-Preview-/Hostingbetriebs. Die Datenspeicherung und Buildwirkung sind separat über NativeStore/NativeBuilder belegt.

Nicht ausgeführt: Push, Merge, Deploy, echter E-Mail-Versand, Veröffentlichung von Vorschaupreisen oder eine neue rechtliche/redaktionelle Freigabe. Kein Video aufgenommen, da keine Aufnahme beauftragt war. Die übrigen Playwright-Specs außerhalb des betroffenen Bereichs wurden nicht als vollständige Gesamtsuite ausgeführt. Node 24 und der bestehende Engine-Konflikt des AFE-Pakets gehören weiterhin zu S04, nicht zu Etappe A.

## Offen für Marc und Claude

Keine neue Inhalts- oder Geschmacksfrage blockiert Etappe A. Die Entscheidungen zu öffentlich erreichbaren PoC-/Labor-URLs und die fachliche Freigabe der ausdrücklich vorläufigen Vorschaupreise bleiben offen. Etappe B und Schritte 4–9 sind nicht umgesetzt. Keine Änderung an Header-/Sprach-/Hover-CSS, CSS-Tokens oder der i18n-Architektur.

## Belege

Lokaler Belegordner: `/tmp/fs-dedupe-a-evidence/`. Die Schlussbelege heißen `delivery-*` und `unit-concurrency2.log`; der Editor-Nachweis liegt in `editor-bindings-delivery/`, der ruhige GitSync-Nachlauf in `git-sync-quiet-final.log` und der Szenenwechsel-Nachlauf in `delivery-scene-retry.log`. Alle eigenen Prüf-Editoren und Browser wurden anschließend beendet. Finale Logs, JSON-Ausgabevergleich, i18n-Abdeckung, Layoutberichte je Sprache/Engine, Playwright-Berichte und Editor-Screenshots liegen dort. Reproduzierbare Werkzeuge und Entscheidungen sind im Repository enthalten; große Build-/Browserartefakte bleiben außerhalb des Quellbaums.

Reproduzierbare Prüfungen (Node 22, eigener temporärer Zustand):

```sh
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
export AFE_STATE_DIR=/tmp/fs-dedupe-a-review-state
npm run -s build
export FLYINGSTARS_AUDIT_DIST="$PWD/dist"
# Entspricht test:unit mit wirksamer Parallelitätsbegrenzung:
node --test --test-concurrency=2 'editor/*.test.mjs' 'editor/core/*.test.mjs' 'editor/test/*.test.mjs' 'scripts/*.test.mjs' 'src/scripts/effects/*.test.mjs' 'src/scripts/*.test.mjs'
node scripts/check-i18n-build.mjs
node scripts/check-contact-drift.mjs
python3 docs/dupes-inventory-r20/tools/compare-builds.py /tmp/fs-dedupe-a-evidence/baseline-dist-initial dist
```

Die Browserbefehle entsprechen dem Auftrag. `tools/editor-bindings-proof.mjs` erwartet URL und Belegordner einer selbst gestarteten, ausschließlich temporären Editorinstanz. Er startet oder verwendet keinen produktiven Zustand. Die gespeicherten Mutationen in `editor/*-record.test.mjs` verwenden temporäre Git-Klone, NativeStore und NativeBuilder.
