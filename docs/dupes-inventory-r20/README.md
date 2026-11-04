# Inventar der Mehrfachpflege, Runde 20

Analyse vom 4. November 2026 für Claude als Lead. Basis ist `origin/main` nach Fetch, Commit `cd1ea13981f013d323e6113e2d0e54b9614ed797` bzw. der vollständig aufgelöste SHA in [inventory.json](inventory.json). Eigenständiger Worktree `/tmp/fs-dupes-inventory-r20`, Branch `codex/dupes-inventory-r20`. Ausschließlich Bericht und Analysewerkzeuge, keine Änderung an Site, Inhalten, Editor, Tests oder Buildkonfiguration. Kein Push, Merge oder Deployment. Keine `.env`-Datei gelesen.

Der größte verbleibende Pflegeaufwand liegt bei **Fakten und ihren Sprach-/Kontextkopien**. Die UI-Konsolidierung vom 2. November hat viele Renderer vereinheitlicht; sie verhindert noch nicht, dass ein Preis, eine Person, eine Dauer oder ein Sicherheitsfakt in mehreren bearbeitbaren Feldern steht. Noch mehr universelle UI-Komponenten würden dieses Problem nur begrenzt lösen.

## Lesepfad und belastbare Zahlen

1. Dieses Dokument enthält Bewertung, Reihenfolge und Grenzen.
2. [groups.md](groups.md) enthält alle 45 bewerteten Gruppen mit Besitzer, Ableitung, AFE, Übersetzungen, Aufwand, Risiko, sichtbaren Folgen und Guard.
3. [inventory.json](inventory.json) enthält die vollständigen Datei:Zeile-Listen jeder Gruppe. Keine auf einzelne Beispiele gekürzten Fundstellenlisten. `occurrences` umfasst Besitzer, Kopien, Verbraucher und bestehende Prüfungen. Eine Zeile ist deshalb nicht automatisch ein Fehler.
4. [evidence.json](evidence.json) enthält sämtliche Rohbefunde der dokumentierten Suchregeln, AST-/Import-/CSS-Analysen und DE/EN/NL-Feldvergleiche. Für lesbare Auszüge das [Abfragewerkzeug](tools/query.mjs) verwenden.
5. [proof.json](proof.json) enthält den ausgeführten Nachweis an den echten Content-Schemas, Paketfunktionen und dem aktiven AFE-Adapter.

585 versionierte operative Textdateien untersucht, einschließlich des vom Delivery-Code gelesenen Legacy-URL-Inventars. 20.579 strukturierte Blattwerte extrahiert. Alle 198 Content-Dateien lassen sich gegen ihre tatsächlichen Zod-Schemas validieren: 33 Seiten-, 57 Projekt-, zwölf Post- und 96 FAQ-Dateien. Das sind 66 deutsche Einträge und 132 Sprachfassungen. Alle 132 `translationSourceHash`-Werte passen zur deutschen Quelldatei.

| Auftragskategorie | Bewertete Gruppen | A: vereinheitlichen | B: begründet getrennt | C: Altbestand | Fundstellenzeilen / Dateien |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1. Fakten und Daten | 13 | 10 | 3 | 0 | 4.086 / 323 |
| 2. Texte | 3 | 3 | 0 | 0 | 377 / 66 |
| 3. Navigation und Struktur | 3 | 3 | 0 | 0 | 1.291 / 140 |
| 4. Komponenten und Layouts | 10 | 6 | 2 | 2 | 3.430 / 71 |
| 5. CSS | 4 | 4 | 0 | 0 | 1.155 / 66 |
| 6. Skripte und Logik | 5 | 3 | 2 | 0 | 511 / 97 |
| 7. Schemas, Editor, Tests, Build | 5 | 2 | 2 | 1 | 4.273 / 150 |
| 8. i18n | 2 | 1 | 1 | 0 | 3.720 / 204 |
| Gesamt | 45 | 32 | 10 | 3 | Bereiche überschneiden sich |

Die letzte Spalte ist die Reichweite der Gruppenregeln, keine Zahl eigenständiger Defekte. Eine Quellzeile kann mehreren Kategorien angehören. Die teils großen Bereiche umfassen bewusst auch Tests, Fixtures und Verbraucher.

Maschinelle Rohbefunde, ebenfalls ohne Gleichsetzung mit Fehlern:

| Suche | Ergebnis | Vollständige Liste in evidence.json |
| --- | ---: | --- |
| Telefon, Mail, WhatsApp, Calendly | 90 Treffer in 24 Dateien | `matches.contact`, `contactClusters` |
| Firmen-/Personenidentität und Adressen | 574 Treffer in 171 Dateien | `matches.identity` |
| Paket-/Preis-/Frist-/Mengenaussagen | 2.272 Treffer in 207 Dateien | `matches.commercial`, zusätzlich `numericFields` |
| Numerische Content-Blattwerte bzw. Texte mit Ziffern | 2.380 | `numericFields` |
| Social-/Video-/Buchungslinks | 24 Treffer in 16 Dateien | `matches.social` |
| Externe URLs | 578 Treffer in 146 Dateien | `matches.urls`, `urlClusters` |
| Tracking-Konfigurationsnamen und IDs | 48 Treffer in 15 Dateien | `matches.tracking` |
| Statische interne Pfade | 767 Treffer in 127 Dateien | `matches.routes` |
| Identische normalisierte Strings in mehreren Dateien | 2.581 Cluster | `repeatedStrings` |
| Lange gleiche Textkandidaten | 351 Cluster | `repeatedCopy` |
| Fast gleiche Textkandidaten | 47 Paare | `nearCopy` |
| Gleiche UI-Werte unter verschiedenen Schlüsseln | 12 Gruppen aus Sprache + Wert | `uiDuplicateValues` |
| Gleiche DE-/EN- bzw. DE-/NL-Blattwerte | 2.481 Feldkopien | `localeCopies` |
| Unterschiedliche DE-/EN- bzw. DE-/NL-Blattwerte | 2.319 | `localeDifferences` |
| Fehlende Vergleichsfeldpfade | 0 | `localeMissing` |
| CSS-Deklarationen | 6.068 | `cssDeclarations`, `cssRules` |
| Identische CSS-Deklarationssätze ab drei Eigenschaften | 38 Cluster | `cssDuplicates` |
| Gleiche Selektor-/Property-Namen mit möglichem Mehrfachbesitz | 140 Cluster | `cssCompetingOwners` |
| Farb-Literale | 441 Treffer in 76 Dateien | `matches.colors` |
| Dauer-/Easing-Literale | 370 Treffer in 22 Dateien | `matches.motion` |
| Statische Import-/URL-Kanten | 1.473 | `imports`, `graph` |
| Identische normalisierte Funktionskörper über Dateigrenzen | 21 Cluster | `functionClones` |
| Ähnliche Markup-Tagfolgen | 4 Paare | `markupSimilarity` |
| Assertion-/Suchaufrufe als Copy-Test-Kandidaten | 1.197 Treffer in 148 Dateien | `matches.brittleTests` |

Insbesondere CSS-Klassen mit Astro-Scope, Testfixtures, häufige Wörter, technische Syntax und zufällig gleiche Zahlen sind keine automatische Mehrfachpflege. Ein Tagfolgenvergleich schlägt etwa `IconFeature` und `SectionHead` vor; deren Aufgaben sind verschieden. Dagegen ist der Paketeditor-Nachweis unten ein tatsächlicher unabhängiger Datenweg.

## Die zehn wichtigsten Befunde

1. **Kontakt ist der akute, bereits laufende Fall.** `F01` erfasst die Mail-/Telefon-/Adress-/Buchungswerte samt Verbrauchern. Claude erweitert gerade CONTACT und stellt Footer, ContactWays und die neue `contactDetails`-Section um. Diese Arbeit hier nicht parallel implementieren. Der entscheidende Anschluss ist AFE: Die heute im Kontakt-YAML editierbaren Fakten dürfen beim Umzug nach `people.ts` nicht ohne bewusste Entscheidung aus dem Editor verschwinden. CONTACT kann die Render-Schnittstelle bleiben, seine Speicherquelle sollte editorfähig werden.
2. **Paket-JSON und Vorschaupolicy sind unabhängig.** `F06`, `F07`: Das echte Schema akzeptiert SPARK-Basis `110` und Dauer `99 Min`. Die Vorschaugrenze ist weiterhin separat `100`; der sichtbare Dauer-Factorytext lautet weiterhin `10–25 Min Showzeit`. Im ausgeführten Nachweis wurde nur ein Objekt im Speicher verändert. Keine Inhaltsdatei wurde geändert. Ein einziges editierbares Feld ist noch kein einziger wirksamer Besitzer.
3. **Preis-/Leistungsdaten sind besser konsolidiert als die Aussagen darüber.** `F06` bis `F09`: Startpreise und Leistungsprojektionen sind bereits gemeinsam; FAQ, Anlass-Fakten, Film-/Indoor-/Schweizpreise, Anzahlung, Frühbucherrabatt und Antwortfrist werden dennoch erneut formuliert. Werte, Geltungsbereiche und kontextuelle Texte brauchen getrennte Zuständigkeiten. Vorschau-SPARK bis 190 darf nicht als kommerzielle Obergrenze bis 150 behandelt werden.
4. **Personen brauchen IDs.** `F03`, `K04`: FOUNDERS, Team-Sections und Sprachdateien wiederholen Namen/Fotos. Der Blogautor sucht Florian anhand seines Klartextnamens. Zentral gehören Name/Foto und Identität; verschiedene Rollen und Kurz-/Lang-Bios bleiben kontextuell. Ein Avatar-Renderer allein löst die Stammdatenkopien nicht.
5. **Projekte wiederholen ihre eigenen Fakten.** `F04`: `drones`, `showcase.drones`, freie Credits, Kennzahlen, Meta/Tagline sowie Landing- und Timeline-Texte führen dieselben Fakten teils mehrfach. Das braucht Referenzen auf Projektdaten und sauber benannte Messbegriffe. Historische Drohnenzahlen bleiben historische Zahlen, unabhängig von der heutigen Flotte.
6. **178 hat mehrere Besitzer und einen Zeitpunkt.** `F05`: `SHOWS_TOTAL` steuert den Footer, nicht automatisch Hero-Stats oder redaktionelle Aussagen. „Über 150“ ist eine erlaubte Rundung, kein zwingender Widerspruch zu 178. Ein Faktmodell mit Stand und Darstellungsregel verhindert Nachpflege, ohne historische Aussagen umzuschreiben. Dasselbe gilt für Umwelt-/Sicherheitsfakten.
7. **Anlässe sind mehrere verwandte Taxonomien.** `N01` bis `N03`, `L02`: Formular, Referenzen und Konfigurator verwenden verschiedene IDs und Bedeutungen. Zentralisieren heißt explizites Mapping, nicht alle Listen gleichmachen. Desktop/Mobile/Footer-Hauptnavigation und Sitemap sind bereits teilweise abgeleitet. Doppelt bleiben Routenlogik zwischen Astro/AFE/Delivery und Auswahlübergabe zwischen Karten/Extras/Konfigurator/Formular/API.
8. **2.481 gleiche Sprachfelder sind der größte strukturelle Multiplikator.** `I01`: Davon 402 URLs, 544 typisierte Werte, 532 Identitäts-/Enum-Kandidaten, 156 Referenzen/Filter, 28 gleiche Medienmetadaten und 819 Text-/Eigennamen-Kandidaten. Diese Klassifikation ist heuristisch. Alt-Texte, Datumskontext und lokal unterschiedliche Veröffentlichungszustände müssen fachlich geprüft werden. Der AFE-Sync kopiert URL-/Strukturänderungen bereits teils automatisch, verlangt dennoch beide vollständigen Sprachfassungen und deren neuen Dateihash.
9. **CSS-Dubletten liegen häufig unterhalb der Komponentenebene.** `C01` bis `C04`: Die Kanäle von `--text` stehen 60-mal als rgba-Literal im Quellbaum, die von `--ground` 32-mal, `--surface` zweimal und `--accent` neunmal. Wiederholt sind auch koordinierte Breakpoints, Kurven und Dauern. Ein benannter Token muss denselben Wert bewahren; nicht alle unterschiedlichen Raster und Bewegungen brauchen denselben Token.
10. **Altbestand hält weitere Wartung künstlich am Leben.** `A01`, `A02`, `S02` bis `S05`: Video/Calculator/pricing.js sind keine aktiven zweiten Frontendrenderer. `no-px.test.mjs` und eine historische Runtimehilfe lesen sie aber weiter. Die ältere Editorarchitektur enthält sogar Imports auf entfernte Module. Gleichzeitig sind Teile unter `editor/extensions/flyingstars/web/` weiterhin aktiv. Ein pauschaler Ordner-Purge wäre falsch. Im Testbestand sind unabhängige freigegebene Snapshots sinnvoll; Quellsyntax- und Copy-Wiederholungen benötigen dagegen einen klaren Vertragsbesitzer.

## Was von der früheren Runde offen ist

Geprüfte Ausgangspunkte: `git show bbe8153:docs/dupes-report.md`, [Konsolidierungsbericht](../konsolidierung-bericht.md), [Designregeln](../DESIGN.md), [i18n-Vertrag](../i18n/README.md) und die tatsächlichen aktuellen Verbraucher. Die alten Zeilennummern wurden nicht als aktuelle Belege übernommen.

| Alter Bereich | Stand auf cd1ea13 | Weiterer Pflegebedarf |
| --- | --- | --- |
| 1. Section-Köpfe | SectionHead gemeinsam, Guard besteht | `T03`, keine zweite SectionHead-Runde |
| 2. Kennzahlenrenderer | FactList gemeinsam | Datenbesitzer `F04/F05` |
| 3. Prozesse | ProcessList/MetroLine gemeinsam | Geschäftsfristen `F08`, Motion `L03` |
| 4. Medienkarten/Raster | MediaCard gemeinsam | Raster `K02`, Medienfakten `F10` |
| 5. Paketkarten/Leistungsprojektionen | PackageCard und Service-IDs gemeinsam | Wirksamkeit der Paketfelder und Prosa `F06–F09` |
| 6. Icon-Features | IconFeature gemeinsam | Nur gemeinsame Fakten/CSS-Tokens |
| 7. Medienrahmen | MediaFrame gemeinsam | Kein erneuter Rahmenumbau |
| 8. Heroes | Fachadapter bewusst getrennt | `K01` begründet beibehalten |
| 9. Videosteuerung | Aktive Renderer verwenden Controller | Alter Video-Renderer `A01`, übrige Motion `L03` |
| 10. Standort/Zuständigkeiten | Gemeinsamer LandingSite-Renderer und strukturierte Aufgaben | Kopierte Sicherheitsinhalte `F05/F08/T02`, keine Universal-Disclosure |
| 11. Feature-Listen | Teilweise gemeinsame Fachrenderer | `K08` niedrig priorisiert |
| 12. Vergleiche | ComparisonMatrix/Cell und MobileTabs gemeinsam | Daten/Labels, keine weitere Tabelle bauen |
| 13. Preisdarstellung | Noch mehrere Formatter, Satz-Regex in LandingPrice | `L01`, `F06–F09` |
| 14. Links/Kontakt | ContactWays vorhanden | `F01` bei Claude, `K03` später |
| 15. Badges/Metazeilen | MediaCard besitzt Medien-Badges | `K08`, Rollen nicht vermischen |
| 16. Buttons | .btn gemeinsam, weitere Geometrie lokal | `K03`; Header bei Claude |
| 17. Formularbasis | chips/native-select gemeinsam | Auswahlvertrag/Limits `L02` |
| 18. Reveals/Hover | REVEAL_MARGIN und dotImage gemeinsam | Rollen/Tokens `C04`, Policy `L03` |
| 19. Slider | SliderNav inzwischen gemeinsam, dynamischer Gap vorhanden | Nur verbleibendes Edge/Fading `K06` |
| 20. Motion/Lifecycle | Video-Policy und whenNear vorhanden | Weitere Effekte `L03` |
| 21. Count-up/Mathe/Attribute | Story-Step-Abgrenzung korrigiert | Count-up `L03`, lokale Mathematik `L04` bewusst abwägen |
| 22. Auswahl-Query/Saison | Weiter mehrere Builder und Saisonabläufe | `L02/N02` |
| 23. CTA/Tabs/Teaser/Alt | CTA und Tabs gemeinsam, alte PackageDetails entfernt | Zwei kleine Teaseradapter `K07`, übriger Altbestand `A01` |
| 24. Avatare/Dialoge/Sprache | Faces vorhanden, Autor lokal; Consent inzwischen Bibliothek | `K04/K05`; Sprache/Header bei Claude |

Die früher bewusst zurückgestellten P2/P3-Punkte werden damit nicht pauschal erneut empfohlen. Hero/Consent/Bildadapter und einige Kleinsthelfer bleiben begründet getrennt. Für Slider ist nur noch der tatsächlich offene Rest erfasst.

## Zielmodell und Grenzen der Vereinheitlichung

Die vier angewandten Engineering-Skills führen hier zu einer konkreten Regel: **Fachliche Identität gemeinsam führen, Darstellung und Freigabe bewusst trennen.** Ein zusätzlicher Getter, der lediglich dieselben Kopien versteckt, wäre kein tieferes Modul. Ein `personId` oder `factRef` bringt dagegen mehrere Verbraucher hinter eine kleine Schnittstelle. Die Umstellung muss im selben Schritt die alte Pflegequelle entfernen oder zu einem ausdrücklich unabhängigen, überprüften Dokument machen.

Die hier vorgeschlagenen Begriffe sind Arbeitsbegriffe für die zweite Runde, kein neues globales CONTEXT.md und keine Änderung am Repositoryvertrag:

| Begriff | Bedeutung | Darf unabhängig bleiben |
| --- | --- | --- |
| Organisationsfakt | Aktuelle operative Firma/Kontakt/Profil | Rechtsfassung als freigegebenes Dokument |
| Person | Stabile Identität mit Name/Foto | Rollen/Bio/Alt im jeweiligen Kontext |
| Projektfakt | Aussage über eine konkrete Show, mit Zeitpunkt/Einheit | Story und abweichender Messbegriff |
| Geschäftsfakt | Preis, Frist, Rabatt, Haftpflicht, Dauer mit Geltungsbereich | AGB-Fassung und fachlich anderes Sonderangebot |
| Vorschaupolicy | Nicht freigegebene Konfiguratorbereiche und Simulation | Kommerzielle Paketgrenzen |
| Anlass | Zielgruppe, Referenzkategorie oder Showsequenz mit expliziter Beziehung | Unterschiedliche ID-Mengen und Reihenfolgen |
| Medienidentität | Original und bestätigte Quellmaße | Crop, Ausgabemaße, kontextueller Alt-Text |
| Übersetzungsstand | Geprüfter Stand lokalisierter Inhalte | Technische Quelle ohne neuen Übersetzungsbedarf |

Ein zentraler Datensatz allein genügt nicht. Jede Änderung braucht einen belegten Weg vom AFE-Feld zum Verbraucher. [proof.json](proof.json) zeigt, warum diese Prüfung nötig ist: Die Paketdauer existiert als editierbares JSON-Feld, wird vom sichtbaren Dauertext aber nicht verwendet.

Für freie Prosa ist eine automatische Platzhalterersetzung über alle Markdown-/YAML-Dateien keine geeignete Migration. Zuerst strukturierte Fakten/Referenzen verwenden. Für bewusst freie Sätze einen Abweichungsbericht anbieten. Wiederverwendbare Textbausteine nur für tatsächlich gemeinsam verantwortete Abschnitte anlegen, mit eigenem Übersetzungstriplett und gut erkennbarem Bearbeitungsweg. Texte dürfen nicht versehentlich über eine globale Suche mitgeändert werden.

## Umsetzungsreihenfolge in kleinen prüfbaren Schritten

Priorität bewertet Änderungswahrscheinlichkeit, Zahl unabhängiger Pflegeorte und Folgekosten. S/M/L bezeichnet relative Größe, keine Zeit- oder Preiszusage. Risiko S/M/H bedeutet gering/mittel/hoch. Jeder Schritt ist ein eigener reviewbarer Änderungssatz und entfernt seine abgelöste Pflegequelle im selben Zug.

| Schritt | Umfang und Besitzer | Aufwand / Risiko | Abnahme und Stoppgrenze |
| --- | --- | --- | --- |
| 0 | Claudes Header-/Sprach-/Kontakt-Patch übernehmen und auf neue Basis inventarisieren. F01/N01/K03/K05 betroffene Zeilen erneut lesen. | S / S | Keine Änderungen aus seinem uncommitted Checkout kopieren. Keine konkurrierende CONTACT- oder contactDetails-Lösung. |
| 1 | In unabhängigen Löschschritten A01/S02 bereinigen. Erst Datei-Leser/Tests umziehen, dann jeweils Renderer, Skript und ausschließlich eigene Styles entfernen. PoC separat entscheiden. | M / M | Import-/Registrierungs-/Testgraph und aktueller Feature-Nachweis. Kein Ordner-Purge, keine produktiven Video-/Herzdaten entfernen. |
| 2 | Claudes Kontaktquelle vollständig an AFE anschließen, Fehlertexte mit Mail-Platzhalter. F01, F02 als reiner Abweichungswächter. | M / M | Eine editorseitige Nummer-/Adressänderung erscheint in allen operativen Ausgaben; Rechtstext bleibt gleich und wird als abweichend gemeldet. |
| 3a | Dauerpolicy samt wirksamen AFE-Feldern und textgleichen Ausgabeprojektionen. F07. | M / M | Mutationsnachweis für Outdoor und Indoor in DE/EN/NL, typische Dauer getrennt von Spanne. |
| 3b | Paket-ID/Orb/Label-Projektionen und getrennte validierte Vorschaupolicy. F06. | M / H | Aktuelle Preise, Grenzen, Übergänge und Freigabestatus unverändert. Kein Demo-Preis wird Angebotspreis. |
| 3c | Film-/Indoor-/Schweizdaten strukturieren, Preisanzeige ohne Satz-Regex. F09/L01. | M / M | Alle bestehenden Preiszeilen inklusive Qualifikator/netto/Anfahrt in drei Sprachen textgleich. |
| 4 | Antwortfrist, Anzahlung, Rabatt und belegte Sicherheits-/Umweltfakten mit Geltungsbereich. F05/F08. Zunächst strukturierte Ausgaben, danach Prosa-Driftbericht. | M / H | Keine neue Leistungszusage. Historische und aktuelle Werte bleiben unterscheidbar. |
| 5a | Personen-IDs und bestehende Bilder/Autor verknüpfen. F03/K04. | M / M | Bild/Name einmal ändern, Faces/Team/Autor folgen; kurze/lange Bios bleiben erhalten. |
| 5b | Projekt-FactRefs für Drohnenzahl/Ort/Datum/Kunde. F04. Je Projekt migrieren, dann Landing-/Timeline-Verweise. | L / M | Aktuelle sichtbare Ausgaben textgleich; abweichende Messbegriffe ausdrücklich modelliert. |
| 6a | Anlass-Taxonomien und Mapping gemeinsam führen. N02. | M / M | Jeder Konfiguratoranlass erreicht gültige Formular-ID, Referenzfilter bleiben fachlich vollständig. |
| 6b | Inquiry-Builder/Parser und gemeinsame IDs/Limits. L02. | M / H | Echte Klick-/No-JS-Roundtrips mit Sonderzeichen und Extras in DE/EN/NL; API-Sicherheitsprüfungen unverändert. |
| 6c | Öffentliche Route/AFE/Delivery-Ableitung und Redirect-Konfliktprüfung. N03/F11. | M / H | Gebaute Routen, Canonical, Sprachlinks und Weiterleitungen identisch; kein Map-last-wins-Konflikt. |
| 7 | Erst danach I01 als eigener Architekturentwurf. Schema-Feldpolicy und stabile IDs, Full-file-Materialisierung als möglicher Übergang. | L / H | Alle Texte/Marker/Routen unverändert; kein DE-Fallback. docs/i18n/README.md bewusst ändern, Provenienz und tatsächliche Review-Aktion mitmigrieren. |
| 8 | C01/C03/C04 und K06, jeweils ohne Werteänderung. L03 für übrige Effekte als getrennte Verhaltensarbeit. | M / M bis H | Computed Styles, Reflow und Motion-Zustände. Ein korrigiertes Verhalten ausdrücklich benennen. |
| 9 | Kleine Restpflege T01/T03, K02/K03/K07/K08 und echte gemeinsame Textbausteine T02. S03/S04 nach betroffenen Verträgen bündeln. | S bis L / M | Kein Universal-Hero/Grid/Dialog. Testorakel unabhängig halten, alle Gate-Teilmengen dokumentieren. |

Schritt 1 kommt früh, weil er weitere Scheinkopien und überholte Testabhängigkeiten entfernt. Er soll die dringende Kontaktarbeit nicht blockieren. Schritte 3 bis 6 können in jeweils kleinen unabhängigen PRs erfolgen, sobald ihre Besitzer feststehen. Schritt 7 ist keine Voraussetzung dafür.

Jede spätere Umsetzung braucht die realen Auswirkungen jenseits der Imports: AFE-Quelladressen und Transformationen, Übersetzungsprüfung/Provenienz, statische Ausgabe, Browser-Queryvertrag, Cloudflare-Handler und Apache-Delivery. Die jeweiligen Risiken und Guards stehen vollständig pro Gruppe in [groups.md](groups.md). Für UI-/Interaktionsänderungen sind tatsächliche Browsernachweise in Chromium und WebKit nötig; dieses Analyseergebnis behauptet keine schon bewiesene Migration.

## Offene Inhaltsentscheidungen für Marc und Moritz

Keine der folgenden Fragen blockiert diesen Bericht. Technische Besitzer, IDs, Modulgrenzen und Guards sind Vorschläge des Berichts und müssen nicht als Geschmacksfrage an Marc zurückgegeben werden.

- Soll die Showzählung weiterhin mit unterschiedlichen zulässigen Darstellungen erscheinen, etwa „über 150“ in SEO und „178“ im Hero, oder künftig überall mit genauer Zahl und sichtbarem Stand? Der bestehende Mix lässt sich technisch konsistent abbilden.
- Welche Bio-/Sicherheits-/Nachhaltigkeitstexte sollen redaktionell wirklich gemeinsam geändert werden, welche bleiben bewusst eigenständige Kurzfassungen für Startseite, Über uns, Anlass und FAQ? Gleiche Fakten können unabhängig von dieser Textentscheidung schon vereinheitlicht werden.
- Sollen die öffentlich erreichbaren PoC-/Video-Laborseiten als Referenz erhalten bleiben oder aus dem Produktionsangebot verschwinden? Ihre Entfernung ändert URLs und muss entsprechend benannt werden. Die produktiven Medienvarianten bleiben in beiden Fällen.
- Bestehende offene Fakten wie VW-Drohnenzahl, Showstand, bestätigte Kontakt-/Calendly-Wege und vorläufige Vorschaupreise bleiben bei FlyingStars zu bestätigen. Dieser Bericht entscheidet diese Inhalte nicht anhand der Zahl ihrer Kopien.

## Reproduktion und Nachweis

Nur im isolierten Worktree ausführen:

```sh
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
npm ci
node docs/dupes-inventory-r20/tools/scan.mjs
node docs/dupes-inventory-r20/tools/build-inventory.mjs
node docs/dupes-inventory-r20/tools/proof.mjs
node docs/dupes-inventory-r20/tools/verify.mjs
```

Die Werkzeuge verändern nur die Dateien dieses Berichtsordners. Scanner und Inventar verwenden `git ls-files`, ausdrücklich ohne `.env*`, Lockfile, Binärdaten, Symlinks und generierte Geometrie-/Fremdassets. Historische/prozedurale Dokumentation und erzeugte Übersetzungsprovenienz sind kein zweiter operativer Textbesitzer und nicht in den Rohclustern. Das von der Auslieferung gelesene `docs/legacy-url-inventory.json` ist dagegen aufgenommen. Die komplette Ausschlussliste mit Grund steht unter `scope.excluded`. Provenienz und deren Verbraucher sind fachlich in I02 bewertet und durch die vorhandenen i18n-Tests mitgeprüft.

Beispielabfragen, ohne die Fundstellenliste zu kürzen:

```sh
node docs/dupes-inventory-r20/tools/query.mjs group F01
node docs/dupes-inventory-r20/tools/query.mjs pattern contact
node docs/dupes-inventory-r20/tools/query.mjs copies url
node docs/dupes-inventory-r20/tools/query.mjs copy
node docs/dupes-inventory-r20/tools/query.mjs graph pricing.js
node docs/dupes-inventory-r20/tools/query.mjs clones
node docs/dupes-inventory-r20/tools/query.mjs css
```

Normalisierung für Textkandidaten: NFC, Whitespace vereinheitlicht, Markdown-Linkziel/Markup entfernt. Exakte Cluster ab vier Zeichen und zwei Dateien; lange Textkandidaten ab 32 Zeichen mit Whitespace. Nahe Kandidaten verwenden mindestens sieben unterschiedliche Worttokens und Jaccard ≥ 0,78. Technische Strings können darunter sein. Funktionskörper werden über TypeScript-AST extrahiert und mit normalisierten Bezeichnern, aber erhaltenen Literalen verglichen, ab 80 Zeichen. Markup verwendet Tag-Trigramme, mindestens fünf Tags und Jaccard ≥ 0,35. CSS wird mit PostCSS einschließlich Astro-style-Blöcken, Kontext und Deklarationswerten ausgewertet. Alle Parser liefen ohne gemeldeten Parsefehler. Telefonlabel, tel:- und WhatsApp-Links werden zusätzlich über die normalisierte internationale Nummer geclustert; E-Mail-/Calendly- und URL-Cluster stehen ebenfalls vollständig im Rohinventar.

Importauflösung berücksichtigt relative Imports/Exports, dynamische Literal-Imports, CSS-Importe mit `?url/?inline` und `new URL(..., import.meta.url)` für Worker. Statische Regex-Erfassung kann in Testquellstrings scheinhafte Imports finden; dynamisch zusammengesetzte Pfade und AFE-Registrierungsstrings brauchen zusätzliche manuelle Prüfung. Das ist insbesondere für S02/A01 dokumentiert. Der aktive AFE-Launcher und seine Registrierungen wurden gelesen; ein fehlender statischer Import ist allein keine Freigabe zur Löschung.

Ausgeführt mit Node 22.22.1:

- `npm ci` erfolgreich; Paketdateien unverändert. AFE 0.3.0 meldet die Engine-Anforderung `>=24.15.0`, während das Site-Paket `>=22.12.0` nennt. `.nvmrc` und damit CI verwenden bereits Node 24. Der Betriebskonflikt ist S04; aus einem erfolgreichen begrenzten Lauf folgt keine volle Node22-Runtimefreigabe.
- Scanner, Inventaraufbau und echter Schema-/AFE-/Locale-Nachweis erfolgreich. 67.590 Referenzobjekte einschließlich der normalisierten Faktcluster auf gültige Datei/Zeile geprüft. Der Inventar-Vergleichswächter meldet für denselben Stand null neue Cluster.
- Gezielte bestehende Node-Suite **44/44 bestanden, null Fehler, null Skips**: `scripts/consolidation.test.mjs`, `scripts/i18n.test.mjs`, `scripts/package-model.test.mjs`, `scripts/show-price.test.mjs`, `scripts/round18-guards.test.mjs`, `scripts/round19-guards.test.mjs`, `editor/native-schema.test.mjs`, `editor/design-adapter.test.mjs`, `editor/design-locales.test.mjs`. Befehl mit `--test-concurrency=2`, Lauf ca. fünf Sekunden.
- Alle 198 Content-Dateien gegen die echten Schemas geprüft; alle 132 Rohdatei-Hashes aktuell. Die bestätigten aktiven AFE-Dateibesitzer sind Navigation-JSON, Paket-JSON und UI-JSON. Kein alter Overlay-Katalog wird dafür benötigt.

Der optionale [Vergleichswächter](tools/compare.mjs) vergleicht einen gesicherten Rohbefund mit einem neuen Scan. Er meldet neue bzw. um weitere Dateien gewachsene Kontakt-/URL-/Text-/UI-Cluster. `--fail-new` kann später ein Review-Gate bilden; vor CI-Einsatz braucht es gruppenspezifische, begründete Ausnahmen. Es ist kein Verbot wiederkehrender Wörter und ersetzt keinen fachlichen Guard.

## Was diese Runde nicht beweist

Kein Build, Dev-Server, AFE-Server, Browserlauf, Video, externer Linkcheck oder Mailversand. Für ein rein statisches Inventar ohne Produktänderung liefern diese keine zusätzliche Vollständigkeit der Pflegeorte; sie sind für die spätere Migration erforderlich. Nicht geprüft sind Live-Konfiguration/Trackingwerte, externe Privatpaket-Interna, unversionierter Editorzustand und Claudes laufender uncommitted Stand. Das private AFE-Paket wurde regulär installiert und über seine öffentliche Schnittstelle verwendet, nicht verändert.

Die vorhandenen kommerziellen, rechtlichen und redaktionellen Aussagen wurden auf Mehrfachführung geprüft, nicht extern fachlich freigegeben. Unterschiedliche Zahlen/Sätze sind daher als Klärung oder Kontextvariante behandelt, nicht automatisch als falscher Inhalt. Eine semantische Vollständigkeitsgarantie für beliebige sinngleiche Freitexte kann ein Scanner nicht geben. Vollständig sind die Fundstellen innerhalb des angegebenen Quellumfangs und der expliziten Regeln; die 45 Gruppen sind die daraus und aus manueller Quellenprüfung abgeleiteten Zuständigkeiten. Rohkandidaten bleiben sichtbar, damit die zweite Runde diese Bewertung nachvollziehen und erweitern kann.

Die Worktree-Isolation verhindert Konflikte mit Claudes Arbeit. `Base.astro`-Header, `LanguageSwitch.astro`, der Nav-Block in global.css, CONTACT/people.ts, ContactWays und Kontakt-YAML sind im Inventar zusätzlich als **in Arbeit bei Claude** markiert. Diese Kennzeichnung beschreibt den Auftrag, nicht eine bereits geprüfte neue Implementierung.

## Etappe A umgesetzt

### Schritt 0: neue Basis

Umsetzung auf `e66c01c` in `/tmp/fs-dupes-inventory-r20`, Branch `codex/dedupe-r20-a`. Das ursprüngliche Inventar bleibt als historischer Befund erhalten. F01/N01/K03/K05 wurden erneut an `people.ts`, `ContactDetails`, `ContactWays`, `Base`, `LanguageSwitch` und `round20-guards` geprüft. CONTACT besitzt bereits Mobilnummer, Besuchs- und Postanschrift. Header und Sprachwahl bleiben bei Claudes Implementierung. Die veraltete feste Section-Anzahl im Editor-Test wurde durch den Nachweis des neuen Schema-Typs ersetzt; der vollständige Schemaabgleich bleibt bestehen.

Etappe A umfasst nur A01/S02, Kontakt, Dauer, Paketidentität/Vorschaupolicy und Sonderangebote. PoC-Routen, I01, CSS-Tokens und Schritte 4–9 bleiben ausgenommen.

### Schritt 1: Altbestand

A01: Video, Calculator, pricing.js und dessen Heart-Capacity-Ableitung entfernt. Die alten Calculator-Styles sind entfernt; aktive Paketkarten-, Formular- und PoC-Styles bleiben bestehen. S02: ausschließlich unerreichbare Overlay-/Creation-/Translation-Zweige und die defekte i18n-Runtimehilfe entfernt. `translate-missing.mjs` gehört zum aktiven Full-file-Vertrag und bleibt. Guard: lokaler Importgraph, Browserregistrierung und aktueller Reglergeometrie-Test.

Die unveränderlichen Commit-Stände werden für längere Prüfungen in getrennten temporären Verifikations-Worktrees gebaut. Jeder Lauf erhält eigenes AFE_STATE_DIR. So konkurrieren Build-Ausgaben und Astro-Zwischenspeicher nicht mit dem nächsten Umsetzungsschritt.

### Schritt 2: editorfähiger Kontakt

Kontaktwerte nach `contact.json` mit gemeinsamem Zod-Schema verschoben. CONTACT bleibt die Leseschnittstelle. `site/contact` ist registriert und heißt „Kontakt“; Record-Marker an Footer, ContactWays und contactDetails öffnen diesen Besitzer. Danke und Fehlermeldungen enthalten Platzhalter. Rechtstexte bleiben eigenständig, der separate Driftwächter meldet Änderungen. Die Ausnahme für Danke entfällt aus dem Literale-Guard. Bestehende EN-/NL-Copy wurde ausschließlich parametrisiert, Quellhashes und Provenienz sind fortgeschrieben.

### Schritt 3a: wirksame Dauerpolicy

Die drei toten Paketfelder `dur` sind entfernt. `show-duration.json` besitzt Outdoor 10–25, typisch 13 und Indoor 5–8 als getrennte Fakten. Paketkarten, Konfigurator, Leistungsübersicht, FAQ und Indoor-Ausgaben projizieren diese Werte mit den vorhandenen Sprachfassungen. Die Showzeiten sind im Editor erreichbar und werden tatsächlich gespeichert. Typische FAQ-Aussagen bleiben textgleich.

### Schritt 3b: Paketprojektionen und unabhängige Vorschau

Paket-IDs/Reihenfolge, Orb-Formen und Bezeichnungen aus dem Paket-JSON abgeleitet. Zweite Arrays, Orb-Maps und zwei unbenutzte UI-Labelkopien entfernt. Die bisher in TS stehende Vorschaupolicy liegt separat schema-validiert im JSON und ist im Editor ausdrücklich als nicht freigegeben bezeichnet. Preise, Übergänge, kommerzielle SPARK-Grenze 150 und Vorschaugrenze 190 bleiben erhalten.
