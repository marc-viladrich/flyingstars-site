# Etappe B des Mehrfachpflege-Inventars

Ausgangsbasis `39b6ba7` (`origin/main` beim Start, 04.11.2026). Während der Arbeit kam Claudes Navigation-Commit hinzu; der Endstand ist konfliktfrei auf `f414aa2` rebased. Der übernommene `830ec61` heißt danach `4ba0db4`. Die einmalig erzeugte Textvergleichsbasis bleibt der gesicherte Start-Build von `39b6ba7`. Worktree `/tmp/fs-dupes-inventory-r20`, Branch `codex/dedupe-r20-b`. Keine .env, kein Push, Merge oder Deployment. Editor-/CLI-Läufe erhalten ausschließlich temporären AFE_STATE_DIR. Generierte Berichte liegen unter `/tmp/fs-dedupe-b-evidence`, nicht im Commit.

## Schritt 4

`business-facts.json` besitzt Antwortstunden, Anzahlung, Frühbucherrabatt, Haftpflicht-Bis-Betrag, Akku-Ökostromanteil, ungefähres Drohnengewicht, übliche maximale Flughöhe, bisherige Windstärke und den Show-Snapshot. Jeder Fakt führt Geltungsbereich, Stand, Quellenverweis und den Status einer bestehenden Aussage. Das ist keine neue Freigabe; insbesondere Indoor-Deckung, Wettergrenzen und Originalbelege bleiben fachlich offen.

Strukturierte Zahlenfelder verwenden `{fact, display}`. SHOWS_TOTAL, Hero, Zahlenraster, Antwortstationen und Rabatt lesen dieselbe Quelle. Prosa, Labels, Bios und die gemeinsamen Sicherheits-/Nachhaltigkeitsblöcke bleiben lesbar und unverändert. `site/business-facts` ist ein nativer AFE-Datensatz.

`node scripts/check-business-drift.mjs` prüft alle tatsächlichen Textblätter in Seiten und FAQ, DE/EN/NL. Der Bericht nennt Datei, Feldpfad, Text, Fakt, Ist und Soll. Überwacht werden Antwortfristen, Anzahlungen, Frühbucherrabatt, Haftpflicht, Ökostrom, Gewicht, übliche Flughöhe, Windstärke und Showstand. Historische Projektzahlen gehören nicht zum Organisationsstand. Die Stornostaffel ist ausdrücklich keine Anzahlung. Die Rundungen über/over/more than/ruim 150 bleiben erlaubt, solange sie unter dem datierten Gesamtstand liegen.

Mutationstests ändern jede zentrale Zahl und eine lokale Antwortfrist. Nach Marcs Freigabe vom 04.11. sind neue redaktionelle Faktenplatzhalter erlaubt. Die alte Mengen-Allowlist entfällt. `factText` und die Build-Inhaltsprüfung lehnen unbekannte Platzhalter in allen vier Sammlungen ab. Die vorhandenen Sicherheits-/Nachhaltigkeitsblöcke bleiben wegen der offenen T02-Entscheidung wortgleich und durch Driftwächter geschützt.

Schritt 4 ist im Start-Build mit sechs gezielten Tests und textgleicher Ausgabe geprüft. Anschließend wurden sechs verbliebene EN-/NL-Zahlenkopien in Rabatt und Ökostrom auf die bereits vorhandenen Faktverweise nachgezogen; die strengere i18n-Strukturprüfung ist danach grün.

## Schritt 5a

Sechs native `person/*`-Datensätze unter `src/content/people/` besitzen Name, Porträt, Gründungsstatus und Reihenfolge. Teammitglieder verwenden `personId`, alle zwölf Blogdateien `authorId`. Faces, Team, Blogkopf/-abschluss und Blogübersicht lesen dieselben Personen. Die bisherigen Klarname-/Bildkopien in sechs Teamseiten und `components/people.ts` sind entfernt. Rollen, Bios und kontextuelle Bildbeschreibungen bleiben unverändert in den Sprachdateien. Direkte AFE-Marker öffnen Name beziehungsweise Porträt am gemeinsamen Besitzer; Personenänderungen brauchen kein fingiertes Übersetzungstripel.

Gezielt 13/13 Tests einschließlich echter Inhaltsschemas, ID-Auflösung, Änderungen an Name/Foto und AFE-Quelladressen. Build und i18n-Prüfung erfolgreich. Vergleich mit dem einmaligen `origin/main`-Build: 96 HTML-Dateien, keine Text-, Link-, SEO- oder Formularabweichungen. Die Zahl bezieht sich auf das aktuelle Werkzeug und diesen Build, nicht auf Claudes früheren HTML-Zählumfang.

## Schritt 5b

`site/project-facts` besitzt die historischen Drohnenzahlen, Daten, Kunden und Orte aller 19 Referenzen. Alle 57 Projektdateien verweisen strukturiert auf diesen Besitzer; Fallstudien-Credits, Drohnenkennzahlen und ausdrückliche Drohnenangaben in Prosa folgen ihm ebenfalls. Übersetzte Kunden-/Ortsnamen stehen als vorhandene DE/EN/NL-Werte beim Fakt, samt migrierter Provenienz. Die bisher getrennten Stammwerte und Showcase-Kopien entfallen. Karten, Referenzfilter und Fallstudien lösen dieselben Referenzen auf; die bereits ID-basierten LandingRefs benötigen keinen zweiten Katalog.

Die Timeline verknüpft fünf belegte Ereignisse mit Datum/Jahr beziehungsweise Drohnenzahl. `{{project.<id>.<field>[.<display>]}}` ergänzt explizite Prosa-Verweise, darunter datumsgenaue Credits und Timeline-Texte. Historische Pressetitel bleiben zitierte Originale. Der Musical-Monat Juni 2026 ist ein eigenes Ereignis neben dem Teaser vom 04.09.2025; 12.000 Drohneneinsätze ergeben sich dort aus 20 × 600. Für VW bleibt die Drohnenzahl bewusst leer. Die noch nicht zugeordneten Indoor-/E.ON-Ereignisse werden nicht aus ähnlich benannten Referenzen abgeleitet.

Guards prüfen sämtliche 57 Dateien, reale Schemas, unbekannte Referenzen, Mutationen von Zahl/Datum/Kunde/Ort und die native AFE-Adresse. Direkte Panelmarker an Karten-Drohnenzahl und Fallstudien-Credits/-Kennzahlen führen zum Faktenbesitzer. Gezielt 20/20 Tests bestanden; Build und i18n grün. Wieder 96 HTML-Dateien ohne Text- oder Vertragsabweichung zur Vergleichsbasis.

## Schritt 6a

`content/occasions.mjs` besitzt die getrennten Formular- und Referenztaxonomien sowie das ausdrückliche Konfigurator→Formular- und Referenz→Formular-Mapping. ContactForm, Referenzfilter, Projektschema, Konfigurator und API verwenden diese Quelle. Die alten Listen und sechs eingestreuten `anlass`-Werte sind entfernt. Die bisherige Zuordnung von Jubiläum und Kultur zu `sonstiges` bleibt erhalten. Unbekannte Konfigurator-IDs schlagen fehl; die Kategorien werden nicht aufgrund gleicher Beschriftungen zusammengelegt.

24/24 betroffene Tests grün, darunter sämtliche Formularanlässe am tatsächlichen API-Validator in DE/EN/NL. Build/i18n grün und 96 HTML-Dateien text- und vertragsgleich.

## Schritt 6b

`content/inquiry.mjs` besitzt Anfrage-Paket-/Extra-IDs, unveränderte Feld-/Body-/Mengenlimits und den URL-Builder/Parser. Paketkarten, Showkonfigurator und Extras verwenden denselben Builder; ContactForm und der tatsächliche API-Handler lesen dieselben Grenzen. Der alte clientseitige Vorbelegungsparser und die getrennten URL-Konstruktionen sind entfernt. Extra-Präsentation und Reihenfolge werden aus denselben IDs abgeleitet. Freitext bleibt eine begrenzte Plain-Text-Vorbelegung und verschwindet nach Übernahme aus der Browser-URL.

Die API behält Body-Streaminggrenze, Origin-Prüfung, Datei-/Mehrfachfeld-Abweisung, Zeitfalle, Kontrollzeichen-, Datums- und Turnstile-Prüfung, Timeouts, minimierte Metadaten sowie ihre bisherige syntaktische Extra-Abweisung. Insbesondere wird ihre akzeptierte Extra-Menge nicht still auf den UI-Katalog eingeschränkt.

29/29 gezielte Tests bestanden, einschließlich Sonderzeichen-/Extras-Roundtrips in DE/EN/NL und des tatsächlichen No-JS-303-Handlers. Build/i18n grün; alle 96 HTML-Dateien weiterhin text- und vertragsgleich. Die neue Playwright-Spec für echte Klicks und native Formularabgabe läuft einmal mit den übrigen betroffenen Specs am Endstand. Eine statische Site kann ohne JavaScript keine Query-Vorbelegung ausführen; der bestehende No-JS-Weg bleibt eine vollständig manuell ausfüllbare native Anfrage mit sprachgleicher Danke-Seite.

## Schritt 6c

`i18n/public-routes.mjs` leitet Inhaltsrouten, feste Systemseiten und Projekt-Aliasse für Astro, AFE und Delivery ab. Die bisherige AFE-Routenfallunterscheidung, die Frontend-URL-Konstruktion und die locale-lokalen Aliaslisten entfallen. Die Editor-Vorschau benutzt jetzt dieselben Locale-/Pfadfunktionen wie die öffentliche Site. Historisch vorhandene statische Astro-Aliasse bleiben als solche erhalten; Apache deckt wie bisher alle aktuellen Fallstudien-Aliasse ab.

`resolveRedirects` prüft widersprüchliche Ziele vor dem Aufbau der Map, erkennt Zyklen und löst eindeutige Ketten auf. Eine zweite Prüfung verhindert, dass ein Redirect eine veröffentlichte Inhaltsroute überschreibt. Gleichlautende Deklarationen dürfen zusammenfallen. Unicode bleibt im Apache-Regelausdruck erhalten. Die tatsächlichen 74 Apache-Zuordnungen und `public/.htaccess` sind bytegleich geblieben.

`site-policy.mjs` trennt produktiven Besucher-Origin, absichtlich ungültigen Build-Default und Legacy-Medienidentität. Astro/Bildoptimierung und AFE beziehen ihre bisherigen, bewusst unterschiedlichen Hostprojektionen daraus. Es wird kein zusätzlicher Bildhost als Browser-Trackingziel freigegeben.

17/17 gezielte Tests bestanden, dazu die abschließenden Redirect-Negativtests. Build/i18n grün, 96 HTML-Dateien einschließlich SEO/Links/Formularvertrag unverändert. Ein zusätzlicher nativer AFE-Mutationstest für Personen und Projektfakten ist für den einmaligen vollständigen Endlauf aufgenommen.

## Abschlussprüfung und Reparaturen

Die vollständige angeforderte Unit-Suite wurde einmal mit `--test-concurrency=2` ausgeführt: 649 Tests, zunächst 641 bestanden, sechs Fehler und zwei bestehende Skips. Die sechs Fehler betreffen zwei veraltete Typ-/Datensatz-Snapshots, den neuen Porträt-Nachweis, fehlende Feldbeschriftungen im Projektfakten-Panel und zwei echte Editor-Starts aus fremdem Arbeitsverzeichnis. Der Personenlader verwendet danach relative JSON-Imports; ein Guard gleicht seine IDs mit den tatsächlichen Dateien ab. Panel-Felder haben explizite deutsche Beschriftungen. Die Porträtprüfung wertet die konkrete Teamkarte aus und sichert das tatsächliche HTML im temporären AFE_STATE_DIR. Nur die betroffenen Prüfungen werden nach diesen Reparaturen wiederholt.

Zusätzliche Randprüfungen verhindern, dass geerbte Objekteigenschaften als Kontakt-/Projektplatzhalter akzeptiert werden. Unbekannte Faktenformate, ungültige Kalendertage und eine erfundene Tagesanzeige bei nur monatsgenauen historischen Daten sind Fehler. Personenpicker beziehen ihre Bezeichnungen aus dem nativen Referenzdatensatz, ohne eine zweite statische Namensliste.


## Verifizierter Endstand

- Vollständiger verlangter Node-Befehl einmal ausgeführt, 649 Tests erfasst. Die sechs anfänglichen Fehler sind in betroffenen Nachprüfungen behoben; damit 647 erfolgreiche Fälle und zwei unveränderte Opt-in-Skips. Die Reparaturgruppe umfasst 47 Fälle; die zuletzt betroffenen sieben Panel-/Faktenprüfungen sind separat vollständig grün. Hinzu kommen acht bestandene i18n-Identitäts-/Provenienztests und 23 bestandene Anlass-/Anfrage-/Preis-/Locale-Tests nach der letzten Browserkorrektur. Kein zweiter vollständiger Unit-Lauf.
- `astro check`: null Fehler, null Warnungen. Finaler Build erfolgreich. i18n-Buildprüfung: 32 deutsche Routen, 48 lokalisierte Inhaltsrouten und 16 lokalisierte Weiterleitungen. Alle 96 HTML-Dateien sind gegenüber dem gesicherten Start-Build textgleich; auch Links, SEO und Formularverträge sind gleich. Es gibt keine hinzugefügten oder entfernten HTML-Dateien.
- Betroffene Playwright-Specs einmal vollständig mit beiden angeforderten Projekten ausgeführt: 628 Fälle. Nur fehlgeschlagene Fälle wurden nach Reparaturen wiederholt. Zusammengeführt **Chromium 313 bestanden, ein Skip; WebKit 311 bestanden, drei Skips**, keine offenen Fehler. Enthalten sind Pricing, Projects, Reference-pass, Inquiry, der neue DE/EN/NL-Roundtrip, i18n, Show-configurator, Show-teaser, Publication, HTML, Network-allowlist und axe.
- Layout-Prüfer in Chromium und WebKit, jeweils DE/EN/NL bei 390, 1440 und 2560 px: 22 erreichbare Seiten je Sprache, insgesamt 396 Kombinationen, **null Befunde**. Nach der Initialisierungskorrektur zusätzlich zwölf tatsächlich gestartete EN-/NL-Konfiguratoransichten über beide Engines und alle drei Breiten: kein horizontaler Überlauf, keine leere Überschrift, kein JavaScript-Fehler.
- Ein echtes natives AFE-Speichern von Personenname/-bild sowie Projektzahl/-datum/-kunde/-ort erreicht die gebauten DE-/EN-/NL-Ausgaben und korrekten Besitzer-Marker. Team-YAML und Bios bleiben dabei bytegleich. Zusätzlich wurden die konkreten neuen Datumsanzeigen in Fallstudie und Timeline aus allen drei gebauten HTML-Dateien geprüft.

Die Browsernachweise fanden zwei tatsächliche Randfehler: Anfrage-Links aus DOM-`href` sind absolute URLs derselben Origin; der Builder akzeptiert diese jetzt bei ausdrücklich mitgegebener, identischer Origin und weist fremde Origins weiterhin ab. Außerdem erzeugten eager Konfigurator-Exporte bisher deutsche Beschriftungen im Browser, dessen Wörterbuch nur die Seitensprache enthält. Sie verwenden nun diese Seitensprache. Das behebt den EN-/NL-Start ohne Änderung der i18n-Architektur. No-JS wird über echten lokalen HTTP-Verkehr mit dem tatsächlichen API-Handler und nativer 303-Weiterleitung geprüft, einschließlich Tastaturabgabe. Es gibt keinen echten Mailversand.

Zwei überholte Browserorakel wurden an den bereits vor Etappe B vorhandenen Buildvertrag angepasst: der versionierte Inter-Fontname und die bereits optimierten WebP-Vorschaubilder. Host-/Request-Abweisung und die übrigen Metadatenprüfungen bleiben streng. Zwölf unveränderte übersetzte Alt-Texte haben ihre Provenienz vom alten `members.image.alt`-Pfad auf `members.imageAlt` mitgenommen. Personen-/Autoren-IDs und Projekt-Faktenreferenzen werden zusätzlich sprachübergreifend als technische Identität geprüft.

### Sichtbarkeit, Grenzen und offene Entscheidungen

Die statischen Texte, URLs, SEO-Angaben und Formularwerte bleiben gleich. Der Editor erhält Personen und historische Projektfakten als native Besitzer, direkte Faktenmarker und beschriftete Felder. Rollen, Bios, kontextuelle Alt-Texte und offene gemeinsame Textblöcke bleiben redaktionell unverändert. Die einzige beabsichtigte Verhaltenskorrektur betrifft den zuvor fehlerhaften EN-/NL-Konfiguratorstart und die Übernahme ausgewählter Extras beim Klick.

Nicht ausgeführt: vollständige Playwright-Suite außerhalb der genannten Specs, eigene Mobile-/Mobile-WebKit-Projekte, Pixelvergleich, Videoaufzeichnung, Live-Deployment, echter Versand oder echte Turnstile-/Brevo-Dienste. Die zwei Unit-Skips sind die Opt-in-Buildprüfungen für Bildabmessungen und bedarfsgeladenes Konfigurator-CSS. Browser-Skips betreffen die mobilen Preis-Reiter in beiden Desktop-Projekten sowie WebKits bestehende Scrollstory-/Logo-Physik-Ausnahmen. Historische Daten und kommerzielle/rechtliche Aussagen wurden technisch erhalten, nicht extern fachlich freigegeben.

Für Marc offen bleiben gemeinsame Bios, Sicherheitskonzept und Nachhaltigkeitspunkte (T02), die historische VW-Drohnenzahl und die noch unzugeordneten beziehungsweise uneindeutigen E.ON-/Indoor-Ereignisse. Der Kontextmix „über 150“/„178“ bleibt erhalten. Keine Schritte 7–9 und keine eigene Änderung an Header, Navigation, LanguageSwitch oder dem Nav-CSS-Block.

Belege liegen ausschließlich unter `/tmp/fs-dedupe-b-evidence/`: `final-summary.json`, `final-unit.log`, `final-repair-unit.log`, `final-proof-unit.log`, `final-i18n-unit.log`, `final-locale-unit.log`, `final-check.log`, `final-locale-build.log`, `final-locale-i18n.log`, `final-locale-compare.json`, `playwright*.json`, `final-playwright*.log`, `layout-{chromium,webkit}-{de,en,nl}.log`, `configurator-layout.json` und `native-date-proof.json`. Das tatsächliche mutierte Editor-HTML liegt unter `final-proof-state/facts-proof/`. Große generierte Artefakte sind nicht versioniert. Kein Push, Merge oder Deployment; keine .env gelesen.
