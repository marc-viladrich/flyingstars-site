# Bewertete Gruppen

A = echte Mehrfachpflege vereinheitlichen. B = begründet getrennt. C = Altbestand nach Abhängigkeitsprüfung entfernen. Fundstellen umfassen Quelle, Kopien, Verbraucher und Guards. Die vollständigen Datei:Zeile-Listen stehen in inventory.json; sie sind hier bewusst nicht auf Beispiele gekürzt.

## F01: Operative Kontaktfakten und Firmenidentität

A, Priorität 1, Aufwand M, Risiko M. 96 Zeilen in 30 Dateien. In Arbeit bei Claude bzw. von seinem laufenden Umbau berührt.

Telefon, Mobil/WhatsApp, Mail, Besuch und Post stehen in people.ts, Kontakt-Markdown, Base-Footer, Danke-, Rechtsseiten und UI-Fehlertexten. Claude ersetzt gerade Footer/ContactWays/Kontakt durch CONTACT und contactDetails. Die Rechtsfassungen sind F02.

**Einziger Besitzer:** Claudes CONTACT als lesende Schnittstelle beibehalten; die Daten perspektivisch aus einem editorfähigen Organisationsdatensatz laden, nicht erneut ein zweites Kontaktobjekt anlegen.

**Ableitung:** Footer, ContactWays, contactDetails, Danke und Fehlermeldungen projizieren Telefonnummern/Adressen; Links aus strukturiertem Wert erzeugen. UI-Sätze verwenden {email} statt eingeschriebener Adresse.

**AFE:** Kontakt heute im YAML editierbar. Ein reines Verschieben nach people.ts entfernt diese Fähigkeit. Den laufenden Umbau nach Review um denselben AFE-Dateibesitzer samt Markern ergänzen oder diese Einschränkung ausdrücklich entscheiden.

**Übersetzungen:** Kontaktwerte sprachneutral; Feldbezeichnungen und Besuchshinweis lokalisieren. EN/NL dürfen keine eigenen Nummern und URLs erhalten.

**Guard:** Alle operativen Telefon-/Mail-/Adressliterale außerhalb des Besitzers verbieten; Rechts-Snapshots ausnehmen und separat auf Abweichung melden; Änderung im AFE bis Footer, Kontakt und Fehlermeldung nachweisen.

**Sichtbare Wirkung:** Keine neue Copy. Adresse/Telefon in bestehenden Ausgaben byte- bzw. normalisiert textgleich halten. Claudes laufenden Patch erst nach dessen Abschluss vergleichen.

## F02: Impressum und Datenschutz als freigegebene Fassungen

B, Priorität 2, Aufwand S, Risiko M. 158 Zeilen in 6 Dateien.

Vollständige Rechtstexte einschließlich Gesellschaft, Anschrift, Register, Vertretung und Kontakt werden dreisprachig gepflegt. Sie sind fachlich verantwortete Dokumente, keine Footer-Ansicht.

**Einziger Besitzer:** Je Rechtstext eine redaktionell freigegebene Fassung mit Stand und überprüfbaren Identitätsfeldern.

**Ableitung:** Rechtstexte bleiben vollständig; ein Prüfer extrahiert Firmen-/Kontaktidentität und vergleicht sie mit F01.

**AFE:** Rechtstext und Freigabestand bleiben im AFE pflegbar. Keine stillen Textänderungen bei Organisationsupdates.

**Übersetzungen:** Freigabe und Abgleich pro Sprache; Übersetzung bleibt eigenständig zu prüfen.

**Guard:** Abweichungsbericht für Rechtsidentität mit explizit bestätigter Ausnahme und Begründung, ohne automatische Ersetzung.

**Sichtbare Wirkung:** Nur melden; jede Änderung benötigt redaktionelle/rechtliche Prüfung.

## F03: Personenstammdaten, Teamtexte und Blogautor

A, Priorität 3, Aufwand M, Risiko M. 124 Zeilen in 24 Dateien.

FOUNDERS enthält Namen und Fotos erneut neben Team-Sections in index/ueber-uns und deren EN/NL-Dateien. AUTHOR sucht Florian über den Klartextnamen; Team-Bios sind bewusst unterschiedlich kurz.

**Einziger Besitzer:** Editorfähige Personen mit stabilen IDs; Gründerreihenfolge, Team-Auswahl und Autor verweisen auf diese IDs.

**Ableitung:** Faces, Team und post-meta erhalten Name/Foto aus der Person, Kontext-Bio und Rolle bleiben optionale übersetzte Felder.

**AFE:** Person zentral bearbeiten; auf Seiten Auswahl und zulässige Kurztexte bearbeiten. Bildertausch muss alle Referenzen zeigen.

**Übersetzungen:** Name, Fotoquelle und Maße gemeinsam; Rolle/Bio und kontextabhängiger Alt-Text je Sprache.

**Guard:** Kein Personenname als Look-up-Schlüssel; keine unabhängigen Foto-URL-/Maßkopien. Referenz- und Autorenauflösung für alle Sprachen prüfen.

**Sichtbare Wirkung:** Bestehende Rollen und Bio-Varianten erhalten; nur tatsächliche Stammdaten ableiten.

## F04: Referenzfakten innerhalb und außerhalb der Fallstudien

A, Priorität 3, Aufwand L, Risiko M. 1513 Zeilen in 94 Dateien.

Projekt-Stammdaten wiederholen sich in showcase.drones, freien Credits, Kennzahlen, Meta/Tagline und historischen Timeline-/Landing-Zeilen. Die Sprachkopien vervielfachen jede dieser Stellen.

**Einziger Besitzer:** Projekt-ID und typisierte Fakten am bestehenden Projektdatensatz; Credits/KPIs verwenden factRef plus redaktionelles Label, historische Ereignisse verweisen bei passender Identität auf das Projekt.

**Ableitung:** refs.ts, CaseStudy, LandingStories/Spotlight und Timeline lösen dieselben Fakten auf. Unterschiedliche Zahlen wie Showanzahl/Motive/Publikum als verschiedene Fakten modellieren.

**AFE:** Zahl/Datum/Ort im Projekt bearbeiten, kontextuelle Beschriftung und Erzählung weiter auf der Seite. Keine Rohplatzhalter als Editor-Text einführen.

**Übersetzungen:** Messwerte und Referenzen gemeinsam, Labels und Fließtext separat. Historische Zahlen niemals durch aktuelle Flottengröße ersetzen.

**Guard:** FactRef-Auflösung und Gleichheit strukturierter Credit/KPI-Werte; explizite Abweichungen für abweichenden Zeitpunkt oder Messbegriff; Copy-Bericht für eingebettete Zahlen.

**Sichtbare Wirkung:** Datenmigration textgleich; vorhandene Konflikte wie VW 350/400 nur als Entscheidungsbedarf markieren.

## F05: Showstand, Gründung und Umwelt-/Sicherheitskennzahlen

A, Priorität 3, Aufwand M, Risiko M. 367 Zeilen in 81 Dateien.

SHOWS_TOTAL=178 ist nur der Footer-Besitzer. Hero-Stats und andere Fakten stehen redaktionell separat; Titel mit „über 150“ sind eine andere Rundung. Umwelt- und Sicherheitsfakten werden auf mehreren Seiten und in FAQ wiederholt.

**Einziger Besitzer:** Editorfähige belegte Fakten mit ID, Wert, Einheit, Stand/Quelle und erlaubter Darstellung. Showstand ist ein Snapshot, keine automatisch mitlaufende Zahl.

**Ableitung:** Footer/Hero/Über-uns/FAQ referenzieren Fakten; historische Aussagen erhalten ihren eigenen Zeitpunkt. Freie Copy wird zunächst auf Drift geprüft.

**AFE:** Faktwert und Quellenstand zentral, kontextuelle Erläuterung lokal editierbar.

**Übersetzungen:** Zahl/Stand gemeinsam, Rundungsregel und Lokalisierung im Formatter; Übersetzungen der Behauptung separat prüfen.

**Guard:** Keine ungebundenen Live-Kennzahlen; zulässige Rundung von 178 zu „über 150“ als Darstellung testen. Stand muss bei Showzählung mitgeführt sein.

**Sichtbare Wirkung:** Zusätzliche sichtbare Standangabe wäre eine gekennzeichnete Inhaltsänderung; nicht still hinzufügen.

## F06: Paketidentität, Basisdaten und unabhängiges Vorschau-Preismodell

A, Priorität 2, Aufwand M, Risiko H. 156 Zeilen in 43 Dateien.

show-packages.json ist bereits editorfähig und besitzt Preis/Farbe. Namenslisten, Orb-Zuordnung und Enums stehen erneut in Komponenten/Schema/API. DRONE_RANGES/SPARK_EXTRA sind ein eigener, als Platzhalter markierter Vorschauvertrag: SPARK kommerziell bis 150, Vorschau bis 190.

**Einziger Besitzer:** Bestehender Paketdatensatz für Identität/Preis/Farbe und abgeleitete Metadaten; ausdrücklich separater validierter previewPolicy-Datensatz für die nicht freigegebene Demo.

**Ableitung:** PACKAGE_ORDER, Schema-Enum und Orb-Form aus stabilen Paket-IDs; Preis-FAQ und Anlass-Preisverweise aus Fakt-IDs. Kommerzielle priceFor- und configuratorPrice-Regeln nicht fachlich gleichsetzen.

**AFE:** Bestehenden Paket-Editor erhalten; Vorschaugrenzen nur in klar beschriftetem separatem Bereich. Kein Umzug der JSON-Fakten zurück nach TS.

**Übersetzungen:** Paket-IDs unverändert, Preise numerisch; Beschriftungen im UI-Wörterbuch bzw. bestehenden mehrsprachigen Feldern.

**Guard:** Schema-validierte Paketänderung bis alle Projektionen prüfen; Grenzen/Preisfunktion getrennt testen, keine Lücke und keine stille Übernahme des Platzhalterpreises in ein Angebot.

**Sichtbare Wirkung:** Keine Preise oder Paketversprechen in dieser Runde ändern. proof.json zeigt akzeptierbare Basisänderung ohne Mitnahme der Vorschaugrenze.

## F07: Showzeiten in editierbarem Modell und Copy

A, Priorität 2, Aufwand M, Risiko M. 228 Zeilen in 53 Dateien.

Alle drei JSON-Pakete enthalten dur, der sichtbare showtimeLine-Text kommt unabhängig aus ui.json. FAQ nennt typische 13 Minuten und Maximum 25, Indoor 5–8. Das sind teilweise verschiedene Aussagen, kein zulässiger pauschaler Textersatz.

**Einziger Besitzer:** Eine gemeinsame typisierte Outdoor-Dauerpolicy plus eigener Indoor-Wert; typische Dauer und mögliche Spanne als getrennte Fakten.

**Ableitung:** Karten/Konfigurator und FAQ formatieren dieselben Fakten mit ihren jeweiligen Satzmustern. Ungenutzte dur-Felder migrieren oder entfernen, nicht editierbar ohne Wirkung belassen.

**AFE:** Dauer zentral editierbar, Sätze bleiben lokalisierbar. Das gegenwärtig editierbare dur darf nicht weiter ein wirkungsloses Parallelfeld sein.

**Übersetzungen:** Werte und Einheitenschlüssel gemeinsam, Satzmuster und geschützte Abstände sprachabhängig.

**Guard:** Mutation eines gültigen Dauerwerts muss jede betroffene Ausgabe ändern; typische Dauer liegt innerhalb der Spanne; Outdoor/Indoor getrennt.

**Sichtbare Wirkung:** 13 Minuten und 10–25 Minuten nicht zu einer neuen Aussage umschreiben. Bestehende Varianten müssen fachlich geprüft werden.

## F08: Fristen, Anzahlung, Rabatt und Leistungsbedingungen

A, Priorität 3, Aufwand M, Risiko H. 426 Zeilen in 101 Dateien.

Anfragefrist, 40 % Anzahlung, 10 % Frühbucherrabatt, Express-Vorlauf, Haftpflicht und Netto/Anfahrt werden in Kontakt, Startseite, Landings, FAQ und Paket-UI formuliert.

**Einziger Besitzer:** Editorfähige Geschäftsbedingungen/Fakten mit Geltungsbereich, Freigabestand und Quelle; AGB-/Rechtstext bleibt F02.

**Ableitung:** Strukturierte Preis-/Prozessangaben ableiten, eingebettete Prosa zunächst driftprüfen. Fristen für Antwort, Vorlauf, Design und Genehmigung unterscheiden.

**AFE:** Fakten und kontextuelle Texte bleiben erreichbar; freigegebene Bedingung referenzieren statt aus Code übernehmen.

**Übersetzungen:** Prozentwerte/Zeiträume gemeinsam, Aussagen je Sprache. Änderungen erfordern fachliche Prüfung der betroffenen Texte.

**Guard:** Fakt-Referenzen plus Extraktionsbericht über alle kommerziellen Zahlen/Einheiten; Änderungen an Bedingungen erzeugen eine Liste aller betroffenen Aussagen.

**Sichtbare Wirkung:** Jede Änderung einer Frist/Leistungszusage ist sichtbar und muss ausdrücklich benannt werden.

## F09: Extras und individuelle Indoor-/Schweiz-Preise

A, Priorität 3, Aufwand M, Risiko M. 152 Zeilen in 55 Dateien.

Film +900 steht in Servicezellen und Extra-Texten. Schweiz/Indoor-Preise und Indoor-Größen/-Dauer existieren in EXTRAS, UI, Landing und FAQ. Es sind keine weiteren normalen Pakete.

**Einziger Besitzer:** Editorfähiger Extras-/Sonderangebot-Datensatz mit stabilen IDs, numerischem Betrag/Qualifikator und Paket-Inklusion.

**Ableitung:** Service-Footage-Zelle, Extra-Karte, Anfragechip und Indoor-Preiszeile lösen dieselbe Extra-ID auf. Sonderangebote bleiben fachlich separat.

**AFE:** Preis und Beschreibung heute teils UI-/YAML-änderbar; neue Quelle muss mindestens dieselbe Editorfähigkeit und einen direkten Bearbeitungsweg bieten.

**Übersetzungen:** IDs und Beträge gemeinsam, Kurz-/Langtexte sowie Preisqualifikatoren lokalisiert.

**Guard:** Film-Inklusion in ODYSSEY und Aufpreis in SPARK/HORIZON aus demselben Modell; alle Extra-IDs im Anfrage-Roundtrip.

**Sichtbare Wirkung:** Keine Preisänderung und kein stilles Inkludieren einer Zusatzleistung.

## F10: Medienidentität, Remote-URLs und Metadaten

A, Priorität 4, Aufwand L, Risiko M. 1242 Zeilen in 169 Dateien.

Dieselben Bilder und ihre Maße werden in Content, Team/FOUNDERS, Landing-Stories und Sprachfassungen kopiert. Videos sind für Proxy/Preview bereits registriert; Content trägt dennoch vollständige heroVideo-URLs. AFE-Uploads haben einen Katalog, bestehende Remote-Bilder werden aus Verwendungen rekonstruiert.

**Einziger Besitzer:** Vorhandenen AFE-Medienkatalog um bestätigte bestehende Medienidentitäten erweitern; videos.ts bleibt Besitzer der freigegebenen Videoquellen.

**Ableitung:** Verwendungen referenzieren Asset-ID und optional eigenen Crop/Alt-Text. Quellmaße und Original-URL nicht je Verwendung kopieren. Rendition-Metadaten in video-lab.json sind technische Ableitungen.

**AFE:** Mediathek, Auswahl und Nutzungsnachweise weiterverwenden; kein Parallel-Asset-System anlegen. Lokaler Alt-Text muss erhalten bleiben.

**Übersetzungen:** Quelle, Maße und ID gemeinsam; Alt/Captions sind kontext- und sprachabhängig und dürfen nicht allein wegen gleicher URL überschrieben werden.

**Guard:** Asset-Auflösung und bestätigte Maße, gleicher Bildinhalt bei Foto/Punktbild; keine neuen WP-URL-Literale außerhalb Katalog/Import; registrierte Videos vollständig.

**Sichtbare Wirkung:** Crop, Alt-Text und Ladeverhalten unverändert migrieren; Quelle und Maße sind nicht austauschbar mit Ausgabemaßen.

## F11: Domain, Origins und Medienfreigaben

A, Priorität 4, Aufwand M, Risiko H. 513 Zeilen in 140 Dateien.

Domain/Medienhosts stehen in Astro, media.ts, Editor-Adapter, Delivery-Rewrite und Tests. Öffentlicher Origin ist teilweise SITE_URL, teilweise wörtlich flyingstars.art. Das kann bei einem Hostwechsel auseinanderlaufen.

**Einziger Besitzer:** Kleine portable öffentliche Origin-/Medienpolicy mit getrennten Einträgen für Besucher-Origin, Legacy-Medienhost und Editor-Origin.

**Ableitung:** Astro, Bildoptimierung, AFE und Delivery bekommen explizite Projektionen. Tests prüfen erlaubte/verbotene Hosts unabhängig; nicht automatisch alle freigegebenen Bildhosts auch als Browser-Trackinghost erlauben.

**AFE:** Technische Hostpolicy bleibt Konfiguration. Redaktionelle Linkziele bleiben editierbar und werden gegen die passende Policy validiert.

**Übersetzungen:** Origins sprachneutral; Routenlokalisierung bleibt routing.mjs.

**Guard:** Build mit abweichendem Test-Origin; Canonical/Robots/Rewrites konsistent; Negativtests gegen fremde Hosts. Keine .env-Lektüre nötig.

**Sichtbare Wirkung:** Keine Domainumstellung. Legacy-Medienhost ist keine Kopie des gewünschten öffentlichen Origins.

## F12: Tracking-IDs und Consent

B, Priorität 5, Aufwand S, Risiko H. 54 Zeilen in 17 Dateien.

Öffentliche Tag-IDs kommen aus Build-Konfiguration und werden zentral in consent.mjs validiert. Wörtliche G-/AW-Werte in Tests/CI sind Test-IDs, keine bestätigten doppelten Produktions-IDs.

**Einziger Besitzer:** Bestehende trackingConfig/Consent-Revision behalten.

**Ableitung:** Consent erhält die validierte Config; CI-Dummy-Werte bleiben getrennte Fixtures.

**AFE:** Keine Kundendaten oder Secrets in Content verschieben. Der Auftrag hat keine aktuellen Umgebungswerte geprüft.

**Übersetzungen:** Nur Consent-Copy lokalisiert.

**Guard:** Vor Zustimmung keine Fremdanfrage, Revision an Tag-Ziele gebunden; keine produktiven Tag-Literale im Quelltext.

**Sichtbare Wirkung:** Kein neuer Tracker, keine geänderte Einwilligung.

## F13: Social-Profile und externe Videolinks

B, Priorität 5, Aufwand S, Risiko S. 10 Zeilen in 10 Dateien.

Die vier Social-Profile stehen einmal im gemeinsamen Footer; sie sind keine unabhängigen Sprachkopien. YouTube-/Videolinks an Projekten bezeichnen konkrete Shows, keine zusätzlichen Firmenprofile. Calendly/WhatsApp gehören zu F01.

**Einziger Besitzer:** Social-Profile am Organisationsdatensatz, Projektfilme am Projekt belassen.

**Ableitung:** Footer iteriert Profile, ohne externe Projektlinks als dieselbe Tatsache zu behandeln.

**AFE:** Profile sind heute Code; zentrale Organisation darf deren Pflege im AFE eröffnen, nicht bestehende Projektlinks entziehen.

**Übersetzungen:** Profil-URLs sprachneutral, Linklabels nur bei tatsächlicher Übersetzung lokalisieren.

**Guard:** Pro Social-Kanal genau eine aktive Organisationsprofil-ID; Projektvideolinks nicht global ersetzen.

**Sichtbare Wirkung:** Keine Profil-/Linkänderung.

## T01: Gleiche UI-Begriffe und doppelte Wörterbuchschlüssel

A, Priorität 4, Aufwand S, Risiko S. 48 Zeilen in 10 Dateien.

Einige ui.json-Schlüssel repräsentieren dieselbe Navigation oder Medienaktion. Andere gleiche Wörter wie „Next“ stehen in verschiedenen Kontexten. Faces hat zudem eine feste deutsche aria-label-Einleitung.

**Einziger Besitzer:** Semantische UI-Schlüssel für dieselbe Aktion/Navigation, Paketlabels am Paketmodell. Kein globales Zusammenwerfen allein nach identischem String.

**Ableitung:** Alle Fundstellen derselben Rolle auf den gemeinsamen Schlüssel migrieren; die komplette Maschinenliste steht in uiDuplicateValues.

**AFE:** site/ui bleibt AFE-Besitzer. Alias-Migration ohne zweiten bearbeitbaren Text; Kontext für Übersetzende benennen.

**Übersetzungen:** Nur identische Bedeutung teilen; Faces-Einleitung bekommt einen Schlüssel mit Namen-Platzhalter.

**Guard:** Semantische Aliasliste und fehlende Schlüssel/Platzhalter prüfen; gleiche Übersetzung allein erzeugt keinen Fehler.

**Sichtbare Wirkung:** Schlüsselwechsel textgleich. Lokalisierung der bisher deutschen aria-label in EN/NL ist eine gekennzeichnete Korrektur.

## T02: Wiederverwendete redaktionelle Abschnitte und fast gleiche Prosa

A, Priorität 4, Aufwand L, Risiko M. 214 Zeilen in 46 Dateien.

Umwelt-Scrollstory und Teile von Sicherheitskonzept/Zuständigkeiten werden auf mehreren DE-Seiten und in FAQ gepflegt. Landing-Kurztexte und personenspezifische Bios sind zum Teil bewusst unterschiedlich. repeatedCopy/nearCopy enthalten alle nach den dokumentierten Schwellen gefundenen Kandidaten.

**Einziger Besitzer:** Nur tatsächlich gemeinsam verantwortete Textbausteine als editorfähige Datensätze mit Varianten und stabilen IDs; Fakten separat F05/F08. FAQ-Collection als vorhandenen gemeinsamen Besitzer beibehalten.

**Ableitung:** Seiten wählen Baustein und Variante, keine vollständigen Textkopien. Sichtbar gleiche, aber unabhängig verantwortete Aussagen bleiben getrennt und erhalten Drift-Hinweise.

**AFE:** Echten Baustein direkt von jeder Verwendung bearbeiten und alle Auswirkungen anzeigen; kein undurchsichtiges Macro im freien Markdown.

**Übersetzungen:** Baustein hat eigenes DE/EN/NL-Triplett und eigenen Übersetzungsstand; Seiten dürfen nicht unnötig alle Sprachen neu bestätigen müssen.

**Guard:** Verwendungsgraph plus textgleiche Migrationsprüfung; keine automatischen Merge-Entscheidungen aus Ähnlichkeitsscores.

**Sichtbare Wirkung:** Unterschiede wie „Gäste“/„Publikum“ oder Kurz-/Lang-Bio erhalten. Redaktionelle Vereinheitlichung separat kennzeichnen.

## T03: Defaults, Schema-Hilfetexte und Editor-Anweisungen

A, Priorität 5, Aufwand S, Risiko S. 115 Zeilen in 12 Dateien.

Zod beschreibt Inhalte und erzeugt AFE-Felder. Einige Hilfetexte nennen sichtbare Beispiele/Fakten, die separat altern; todo wird im Schema als „nur in der Vorschau sichtbar“ erklärt, tatsächlich nur im Dev-Server gerendert.

**Einziger Besitzer:** Feld-Metadaten am gemeinsamen Zod-Schema. Beispielwerte aus bewusst markierten Fixtures oder zentralen Fakten statt als zweites Leistungsversprechen.

**Ableitung:** AFE-Templates weiterhin aus sectionSchema ableiten. Redaktionelle sichtbare Defaults erst im Renderer lokalisieren.

**AFE:** Hilfetext von Feldlabel und sichtbarem Standardtext unterscheiden; irreführende todo-Beschreibung an aktuellen Vertrag anpassen.

**Übersetzungen:** Editor-Hilfe ist kein sichtbarer EN/NL-Site-Text. Keine deutschen sichtbaren Defaults im Schema einführen.

**Guard:** Gemeinsamer Schema-/Editor-Deskriptor-Test und Dev-only-todo-Guard; Faktbeispiele nicht als kommerzielle Wahrheit testen.

**Sichtbare Wirkung:** Nur Hilfetexte, keine neue Besucher-Copy.

## N01: Navigation und Anlass-Zielseiten

A, Priorität 2, Aufwand M, Risiko M. 252 Zeilen in 42 Dateien. In Arbeit bei Claude bzw. von seinem laufenden Umbau berührt.

Desktop und Mobile erzeugen Links bereits aus site.nav; Footer-Hauptseiten ebenfalls. Footer-Anlässe kommen aus children plus eigenem Zielseitenfilter. Startseitenkarten sind redaktionell andere Ansichten derselben Zielgruppen. Sitemap ist bereits generiert, keine dritte manuelle Menüliste.

**Einziger Besitzer:** navigation.json als editierbare Menüauswahl; gemeinsames Zielgruppen-/Routenmodell nur für Identität und verfügbare Ziele. Menüreihenfolge und redaktionelle Kartenauswahl bewusst getrennt.

**Ableitung:** Header/Footer/Mobile filtern denselben Navigationsbaum; Cards referenzieren Ziel-ID, behalten ihre eigenen Titel/CTAs. Claudes Header-Patch zuerst abwarten.

**AFE:** Bestehende Navigation im AFE erhalten; keine Headerstruktur in einen zweiten TS-Katalog migrieren.

**Übersetzungen:** Labels aus ui.json oder explizitem mehrsprachigem Text, Ziele einmal lokalisiert.

**Guard:** Alle Menüziele/Anker gegen erzeugte Routen; Desktop/Mobile/Footer-Auflösung aus demselben Baum. Keine erneute feste Erwartung an vier konkrete Labels.

**Sichtbare Wirkung:** Keine Menü- oder Reihenfolgeänderung ohne Kennzeichnung.

## N02: Anlass-Taxonomien in Formular, Referenzen und Konfigurator

A, Priorität 2, Aufwand M, Risiko M. 280 Zeilen in 108 Dateien.

Formular hat firma/stadt/agentur/privat/indoor/sonstiges, Referenzen zusätzlich kultur, Konfigurator launch/jubilaeum/festival/hochzeit/kultur/silvester mit eigener anlass-Zuordnung. Diese Listen sind verwandt, aber nicht identisch.

**Einziger Besitzer:** Gemeinsames Taxonomie-Modul mit expliziten getrennten ID-Mengen und Mapping. Saison- und Zielgruppenbeziehungen am editierbaren Anlassdatensatz.

**Ableitung:** Formularoptionen/API-Enum, Referenzfilter und Konfigurator-Mapping aus den jeweiligen Teilmengen ableiten; bySeason für beide Ansichten nutzen.

**AFE:** Redaktionelle Anlasskarte und zulässiges Ziel pflegbar; technische IDs stabil und read-only, Labels übersetzbar.

**Übersetzungen:** Keine Übersetzung von Query-/Formular-IDs; Labels je Kontext zulassen.

**Guard:** Jeder Konfiguratoranlass roundtript zu gültigem Formularwert; Referenz-kultur nicht blind als Formular-ID übernehmen; Saisonsortierung mit allen Monaten.

**Sichtbare Wirkung:** Keine zusätzliche Anlassoption oder neue Route als Nebeneffekt.

## N03: Routenableitung, Redirects und Locale-Listen

A, Priorität 3, Aufwand M, Risiko H. 840 Zeilen in 24 Dateien.

Öffentliche getStaticPaths, AFE recordRoute, Browser localizedPath und Delivery-Weiterleitungen bilden dieselben Routenregeln erneut ab. deliveryRedirects kombiniert Legacy-Inventar, Projekt-Aliase und Astro-Redirects und überschreibt doppelte Quellen per Map. tests/routes.ts und Sitemap leiten bereits aus dem Build ab.

**Einziger Besitzer:** Kleines portables Routenmodul für Identität, Sprachpräfixe und Redirect-Auflösung; Legacy-Mappingdatei bleibt Quelle für historische Eingänge.

**Ableitung:** Astro/AFE/Delivery erhalten Projektionen derselben Route-Definitionen; Browser-Preview-Präfix ist ein expliziter Adapter, nicht Teil der öffentlichen Route.

**AFE:** Routen/Slugs unverändert editierbar, Reservierungen gegen denselben Resolver prüfen.

**Übersetzungen:** LOCALES und URL-Regeln einmal; Editor-Record-ID und öffentliche Source-ID benötigen unterschiedliche Adapter, nicht bloße Regex-Ersetzung.

**Guard:** Konflikt bei doppeltem Redirect mit anderem Ziel statt Map-last-wins; Roundtrip öffentlich/AFE/Preview, Locale-Idempotenz, Query/Hash und Canonical testen.

**Sichtbare Wirkung:** Keine URL-Änderung. Bestehende Alias-Ziele und Root-Slugs erhalten.

## K01: Hero-Varianten und Artikelkopf

B, Priorität 6, Aufwand S, Risiko M. 328 Zeilen in 5 Dateien.

Vier fachliche Hero-Adapter plus Artikelkopf haben unterschiedliche Anordnung, Breadcrumbs, Video und Semantik. SectionHead, MediaFrame und Video-Controller sind bereits geteilt. Markup-Ähnlichkeit allein rechtfertigt keinen Universal-Hero.

**Einziger Besitzer:** Fachadapter behalten; bestehende gemeinsame Text-/Medienbesitzer verwenden. Ein HeroCopy-Modul nur dann, wenn eine konkrete identische Textmechanik mehrfach geändert werden muss.

**Ableitung:** Keine neue Variante mit dutzenden Layoutschaltern; gemeinsame Heading-/Action-Verträge nutzen.

**AFE:** Bestehende Section-Typen und Marker erhalten.

**Übersetzungen:** Keine neuen Sprachvarianten von Komponenten.

**Guard:** Je Adapter genau ein passendes H1, eindeutige IDs, gleiche Media-/Motion-Policy; Quellähnlichkeit nur als Hinweis.

**Sichtbare Wirkung:** Kein Layoutumbau vorgeschlagen.

## K02: Kartenraster und generische Section-Hüllen

A, Priorität 6, Aufwand M, Risiko M. 314 Zeilen in 9 Dateien.

PostGrid, ProjectGrid, LandingRefs und References bauen Rasterhüllen mit eigenen Breakpoints/Gaps. MediaCard ist bereits gemeinsam. Bento/Stories und Team haben fachlich verschiedene Anordnung.

**Einziger Besitzer:** Ein kleiner CardGrid-Vertrag für tatsächlich gleichartige Kartenlisten, mit benannten Spalten-/Gap-Varianten.

**Ableitung:** Vorhandene Section-Adapter projizieren Einträge in dasselbe Raster; Bento/versetzte Stories nicht zwangsweise aufnehmen.

**AFE:** Section-Felder/Eintragsreihenfolge bleiben unverändert. Rasterparameter nur anbieten, wenn heute redaktionell vorgesehen.

**Übersetzungen:** Raster sprachneutral, lange EN/NL-Titel als Testdaten.

**Guard:** Reflow mit 1–6 Karten, 320px und großer Grundschrift; Layoutvergleich je bestehender Variante.

**Sichtbare Wirkung:** Nur text- und geometriegleiche Übernahme. Abweichende Raster bleiben explizite Varianten.

## K03: Button-, Iconbutton- und Textlink-Geometrie

A, Priorität 6, Aufwand M, Risiko M. 130 Zeilen in 37 Dateien. In Arbeit bei Claude bzw. von seinem laufenden Umbau berührt.

Textbuttons haben bereits .btn. Runde Medien-/Menü-/Schließenknöpfe und wiederholte Pfeil-Textlinks teilen Geometrie, haben aber unterschiedliche Zustände. Header-Knöpfe bearbeitet Claude.

**Einziger Besitzer:** Bestehende .btn-Basis; wenige Iconbutton-/Textlink-Primitive mit expliziter Semantik, Größen und Overlay-Variante.

**Ableitung:** Steuerungslogik bleibt am jeweiligen Modul. Keine neue Universal-Button-Komponente mit fachlichen Play-/Consentzuständen.

**AFE:** Labels/Links aus bisherigen Besitzern, nicht in Komponenten verstecken.

**Übersetzungen:** Label und aria-label aus demselben UI-/Content-Feld; interne Ziele über routing.mjs.

**Guard:** Fokus, Zielgröße, disabled/pressed und Link-vs-Button prüfen; Header erst nach Claudes Patch.

**Sichtbare Wirkung:** Keine Größen-/Hoveränderung als stille Bereinigung.

## K04: Avatar-Renderer

A, Priorität 6, Aufwand S, Risiko S. 129 Zeilen in 4 Dateien.

Faces und zwei Autorenzeilen in BlogPost erzeugen runde Ausschnitte separat. Team ist eine rechteckige Porträtkarte mit eigener Interaktion.

**Einziger Besitzer:** Kleines Avatar-Modul für runde Bilder; Personendaten F03.

**Ableitung:** Faces und Autor verwenden Avatar; Team bleibt eigenständig.

**AFE:** Person-/Bildbindung bis in Avatar propagieren, Bild nicht aus hartem Namen suchen.

**Übersetzungen:** Dekorative Bilder leerer Alt-Text; Gruppennamen lokalisiert, kontextuelle Alt-Texte erhalten.

**Guard:** AFE-Markierung und Bildwechsel, kein doppeltes Vorlesen des Namens; Team-Crop unverändert.

**Sichtbare Wirkung:** Keine Fotoformänderung im Team.

## K05: Dialoge, Consent und Menü

B, Priorität 6, Aufwand S, Risiko H. 123 Zeilen in 6 Dateien. In Arbeit bei Claude bzw. von seinem laufenden Umbau berührt.

Menü ist ein natives dialog; Consent 3.2.1 besitzt Einwilligungszustand und eigene Modalisierung. Video-Dialog ist unbenutzter Altbestand. Es gibt keinen zweiten aktiven Consent-Renderer.

**Einziger Besitzer:** Menü bei site.ts, Consent bei Bibliothek/consent.ts lassen. Nur nachweislich identisches Scroll-Lock/Fokusverhalten als kleine interne Hilfe teilen.

**Ableitung:** Keine gemeinsame Dialogschablone, die Bibliothekszustand oder Navigation übernimmt.

**AFE:** Kein redaktioneller Besitzerwechsel.

**Übersetzungen:** Bestehende UI-Texte beibehalten.

**Guard:** Escape, Fokusrückkehr, inert und gespeicherte Einwilligung separat im Browser testen.

**Sichtbare Wirkung:** Keine Interaktionsänderung. Header/Menü in Arbeit bei Claude.

## K06: Slider-Randzustand nach bereits erfolgter Pfeil-Konsolidierung

A, Priorität 5, Aufwand S, Risiko S. 39 Zeilen in 5 Dateien.

SliderNav bedient Anlass- und Case-Galerie bereits gemeinsam und misst den Gap. at-end und Edge-Berechnung bleiben in Occasions und case.js erneut vorhanden. SliderNav reagiert auf Resize, deren Fading-Status nicht.

**Einziger Besitzer:** SliderNav bzw. ein von ihm verwendetes ScrollRail-Modul besitzt Randzustand, Pfeile und Resize.

**Ableitung:** Occasions behält Saisonsortierung, case.js behält Maus-Dragging; beide melden Inhaltsänderung an denselben Mechanismus.

**AFE:** Reihenfolge, Zahl und Bilder der Items bleiben editierbar.

**Übersetzungen:** Pfeiltexte bereits gemeinsam; reduced motion bei Scrolling erhalten.

**Guard:** Rand nach Sortieren, Resize, unterschiedlichen Kartenbreiten und 0/1 Items; Pointerdrag und Tastatur.

**Sichtbare Wirkung:** Fading-Nachführung bei Resize wäre eine gekennzeichnete Fehlerkorrektur.

## K07: Zwei Teaser-Section-Adapter

A, Priorität 6, Aufwand S, Risiko S. 122 Zeilen in 3 Dateien.

configuratorTeaser und landingTeaser besitzen fast dieselbe Section-Hülle und delegieren bereits an ConfiguratorTeaser. Unterschiedlich sind occasion/drones und href/cta/loop→reel.

**Einziger Besitzer:** Ein interner TeaserSection-Adapter mit zwei schmalen fachlichen Eingängen; vorhandene Schema-Typen behalten.

**Ableitung:** Beide bestehenden Renderer normalisieren Props und delegieren; kein neuer Section-Typ erforderlich.

**AFE:** Bestehende Feldpfade/Marker beibehalten oder migrationsgeprüft abbilden.

**Übersetzungen:** Keine Copy-Änderung; IDs/Anker erhalten.

**Guard:** Beide Section-Schemas mit echten Inhalten rendern und AFE-Bindungen prüfen.

**Sichtbare Wirkung:** Nur gleiche Hülle zusammenziehen; Layout bleibt.

## K08: Feature-Listen, Badges und Metazeilen

A, Priorität 6, Aufwand M, Risiko M. 61 Zeilen in 19 Dateien.

Punkt-/Check-/Plus-Listen und passive Tags besitzen weiter eigene Geometrie. MediaCard besitzt bereits Medien-Badges, IconFeature und FactList ihre Rollen. Auswahl-chips sind fachlich andere Elemente.

**Einziger Besitzer:** Bestehende Besitzer zuerst nutzen; nur kurze FeatureList-/passive Tag-Tokens für wiederholte gleiche Rolle.

**Ableitung:** Redaktionelle Prosa-Listen bleiben Markdown, Vergleichszellen bleiben ComparisonCell; keine universelle Listen-API.

**AFE:** Listeninhalte weiter redaktionell, Marker/Status als explizites Feld.

**Übersetzungen:** Labels aus vorhandenen Sprachfeldern; Status braucht Textalternative.

**Guard:** Keine Vermischung passiver Badge- und Auswahlzustände; textgleiche Ausgabe und lange Übersetzungen prüfen.

**Sichtbare Wirkung:** Keine neue Statusbedeutung oder Listenverkürzung.

## C01: Markenfarben und Alpha-Literale neben Tokens

A, Priorität 5, Aufwand M, Risiko M. 498 Zeilen in 32 Dateien.

--text/--surface/--ground/--accent existieren, dieselben RGB-Kanäle werden in vielen rgba-Regeln wiederholt. Canvas-Renderer und Pakete verwenden daneben Arrays oder eigene Farbparameter.

**Einziger Besitzer:** CSS-Farbkanäle/Tokens am Designsystem; Paketfarben am Paketmodell. Canvas bekommt bei gemeinsamem Markenbezug kleine reine Farbprojektionen.

**Ableitung:** rgba(var(--text-rgb), alpha) oder passende semantische Overlay-/Border-Tokens; vorhandene Alpha-Werte erhalten.

**AFE:** Design-Tokens sind Codekonfiguration; Paketfarben bleiben AFE-editierbar.

**Übersetzungen:** Sprachneutral.

**Guard:** Neue Marken-RGB-/Hex-Literale außerhalb Tokenbesitzer ablehnen, kleine Ausnahmen für eigenständige Case-/Diagrammfarben. Computed-Style-Vergleich.

**Sichtbare Wirkung:** Keine Alpha-/Farbänderung. Diagrammfarben aus dem Datenblatt sind ausdrücklich eigenständig.

## C02: CSS-Besitzer über globale, scoped und PoC-Blätter

A, Priorität 6, Aufwand M, Risiko M. 171 Zeilen in 35 Dateien.

Der bestehende Guard deckt global.css/facts.css/media-card.css ab und besteht. Der breitere Scan findet weitere gleiche Selektor-/Property-Namen, vor allem PoC und Astro-scoped CSS. Diese sind nicht automatisch konkurrierende globale Besitzer.

**Einziger Besitzer:** Je tatsächlich geteilter Rolle ein Stilbesitzer; PoC isolieren/entfernen. Astro-Scope und @media/@supports als Teil der Identität behandeln.

**Ableitung:** Gemeinsame Klassen direkt am Basisrenderer; fachliche Layoutregeln bleiben lokal. Legacy-Calculator-CSS nach A01 entfernen.

**AFE:** Keine inline-Styles als zweite dauerhafte Wahrheit erzeugen.

**Übersetzungen:** Sprachneutrale Styles, Reflow mit längerer Copy prüfen.

**Guard:** Bestehenden PostCSS-Guard um aufgelöste Imports und Scope-Identität erweitern, Fallbacks explizit zulassen. Keine Warnung allein für gleichnamige scoped Klassen.

**Sichtbare Wirkung:** CSS-Migration nur mit identischen Computed Styles; keine pauschale Bereinigung aller 140 Kandidaten.

## C03: Breakpoints und Typo-/Abstandsvarianten

A, Priorität 5, Aufwand M, Risiko M. 707 Zeilen in 50 Dateien.

Wiederholte em-Grenzen, insbesondere 40/43.75/62.5/68.75em, stehen in vielen Komponenten. Video teilt seine Mobile-Grenze bereits als VIDEO_MOBILE_QUERY mit Guard. Viele rem-Abstände sind legitime fachliche Varianten.

**Einziger Besitzer:** Benannte responsive Verträge pro koordiniertem Verhalten; vorhandene Typo-/Gutter-Tokens zuerst nutzen. Keine globale Einheitsgrenze für alle Module.

**Ableitung:** CSS-Generierung oder eine nachweislich unterstützte Build-Abbildung, JS-Query aus demselben Vertrag. Native Custom Media nicht ungeprüft voraussetzen.

**AFE:** Technisches Layout bleibt Code, redaktionelle Spaltenparameter nur bei existierendem Bedarf.

**Übersetzungen:** Schmale Layouts mit langen EN/NL-Labels prüfen.

**Guard:** Alle koordinierten CSS-/JS-Grenzen gegeneinander und mit Root 16/20/32 prüfen; no-px-Guard erhalten.

**Sichtbare Wirkung:** Bestehende Grenzen und rem-Werte exakt erhalten, Tokens nur benennen.

## C04: Bewegungsdauern, Easing und Reveal-Abstände

A, Priorität 5, Aufwand S, Risiko S. 179 Zeilen in 25 Dateien.

Viele gleiche 0.2/0.3s-Werte und Kurven sind als Literal gepflegt. Reveal-Auslösepunkt ist inzwischen zentral, ein älterer Testname behauptet noch 3rem statt des aktuellen halben rem.

**Einziger Besitzer:** Wenige benannte Motion-Tokens nach Rolle: Control, Reveal, Curtain. REVEAL_MARGIN bleibt sein eigener Geometrie-Vertrag.

**Ableitung:** CSS-Werte aus Tokens, JS nutzt bei wirklich koordinierter Verzögerung dieselbe Datenquelle oder berechnete Dauer.

**AFE:** Keine Kundentexte betroffen.

**Übersetzungen:** Sprachneutral.

**Guard:** Nur bekannte Rollen tokenisieren; reduzierte Bewegung und Pause über alle Varianten; keine freien Kopien koordinierter JS-/CSS-Dauern.

**Sichtbare Wirkung:** Keine neue Kurve oder Geschwindigkeit. Historische Testbeschreibung aktualisieren, nicht die neue Dauer zurückdrehen.

## L01: Preis-/Zahlformatierung und geparste Preissätze

A, Priorität 3, Aufwand M, Risiko M. 43 Zeilen in 23 Dateien.

Preisformatierung entsteht in PackageCard, LandingPrice, PricingPage, ShowConfigurator und Browsermodul. LandingPrice zerlegt lokalisierte „ab/ab ca./from/vanaf“-Sätze per Regex. Datums-/Lesezeitformatierung in post-meta ist bereits gemeinsam.

**Einziger Besitzer:** Reines Price-Modul mit Betrag, Währung, Qualifikator, Steuer-/Anfahrtsstatus und formatierten Teilen.

**Ableitung:** PriceDisplay/Textprojektionen statt Regex auf vollständiger Übersetzung; normale Zahlen und historische Datumsangaben behalten eigene Formate.

**AFE:** Betrag/Qualifikator strukturiert editierbar, Satzmuster in site/ui. Freitext für echte Sonderfälle mit expliziter Variante.

**Übersetzungen:** DE/EN/NL-Formatierung zentral, Nonbreaking Spaces und Währung erhalten.

**Guard:** Bestehende Preise, „ab ca.“, auf Anfrage, netto/Anfahrt in allen drei Sprachen textgleich rendern.

**Sichtbare Wirkung:** Keine unbeabsichtigte Währungs-/Wortlautänderung bei Migration.

## L02: Anfrage-URL, Vorbelegung und Validierung

A, Priorität 2, Aufwand M, Risiko H. 181 Zeilen in 40 Dateien.

Karten, Konfigurator und Extras bauen Anfrage-URLs getrennt; contact.ts liest sie und API validiert eigene Enums/Grenzen. Form-maxlengths wiederholen API-Limits. Vorschau 100–600 und API 100–1000 sind unterschiedliche Geltungsbereiche.

**Einziger Besitzer:** Schmales Inquiry-Modul mit Inputvertrag, buildHref, parseSelection und stabilen ID-Projektionen. Transport-/Sicherheitsvalidierung bleibt am API-Eingang.

**Ableitung:** Karten/Extras/Konfigurator verwenden denselben Builder, contact.ts denselben Parser; API übernimmt nur portable IDs/Limits. Keine Browser-DOM-Abhängigkeit auf dem Server.

**AFE:** Anlass-/Paket-/Extra-IDs aus ihren Besitzern; keine zusätzliche redaktionelle Optionsliste.

**Übersetzungen:** Querywerte und quelle unverändert; nur Zielpfad und sichtbare Zusammenfassung lokalisiert.

**Guard:** Roundtrip DE/EN/NL, mehrere Extras, Indoor, eigener Text mit Sonderzeichen, Querybereinigung, No-JS; transportseitige Body/Origin/Dateiprüfungen behalten.

**Sichtbare Wirkung:** Keine Verengung des Formularvertrags auf Demo-Maximum; private Texte weiterhin aus der URL entfernen.

## L03: Motion-Policy, Observer und Count-up außerhalb von Video

A, Priorität 5, Aufwand M, Risiko H. 181 Zeilen in 47 Dateien.

Video verwendet bereits motion-policy.ts. Canvas/Count-up/Reveal lesen Pause, reduced motion und Sichtbarkeit weiter eigenständig. whenNear ist inzwischen vorhanden. Ein Observer für Sentinel und einer für Story sind deshalb noch keine Dublette.

**Einziger Besitzer:** Bestehende Motion-Policy um fachlich explizite Verbraucher vertiefen, keine zweite Policy bauen; Count-up kann eine kleine gemeinsame Ablaufhilfe bekommen.

**Ableitung:** Effekte abonnieren Policy und definieren eigene Regeln für dekorativ/manuell/einmalig. Frühes Head-Skript bleibt kleiner flackerfreier Bootstrap.

**AFE:** Keine redaktionellen Daten betroffen.

**Übersetzungen:** Zahlenformat aus Locale-Modul; statischer Endwert bleibt zugänglich.

**Guard:** Zustandswechsel reduced/global pause/tab visibility/Save-Data sowie verspätete Initialisierung und Dispose; alle Inhalte ohne JS sichtbar.

**Sichtbare Wirkung:** Einheitliche Pause-Reaktion ist bei bisher abweichendem Verhalten eine gekennzeichnete Änderung; keine pauschale Observer-Zusammenlegung.

## L04: Kleine Geometrie-, Hash-, Hilbert- und Sprite-Helfer

B, Priorität 6, Aufwand S, Risiko M. 43 Zeilen in 17 Dateien.

AST-Normalisierung findet identische Hash/Hilbert-/Vektor-Helfer und ähnliche Glow-Sprites. Dotimage erklärt seine Entkopplung vom schweren Formationsrenderer. Parameter/Quantisierung der Sprites unterscheiden sich absichtlich.

**Einziger Besitzer:** Lokale Kleinsthelfer zunächst behalten; nur bei gemeinsamer Änderungsregel ein winziges reines math-Modul ohne Rendererimport.

**Ableitung:** Kein Import großer Formations-/Canvas-Module für wenige Zeilen. Scene-Komposition bleibt lokal.

**AFE:** Kein redaktioneller Besitzerwechsel.

**Übersetzungen:** Sprachneutral.

**Guard:** Identische Algorithmus-Ausgaben vor/nach Auslagerung und Bundle-Graphgrenzen; AST-Klonliste ist Review-Hinweis, kein DRY-Zwang.

**Sichtbare Wirkung:** Keine Renderoptik oder Performanceänderung als Nebeneffekt.

## L05: Bildpfade mit unterschiedlichen Aufgaben

B, Priorität 6, Aufwand S, Risiko M. 66 Zeilen in 5 Dateien.

optimizedImage, Picture und LocalImage sind drei Wege, aber für Remote-Crop/Source-Maße, Astro-responsive Bilder und lokale Markenassets. Uploads werden in media.ts bewusst nicht nochmals remote optimiert.

**Einziger Besitzer:** Drei schmale Adapter behalten; gemeinsame Quellenpolicy aus F11, Assetidentität F10.

**Ableitung:** Nur gleiche Transformationsaufgabe vereinen; explizite Bildgrößen und srcset-Regeln erhalten.

**AFE:** Vorhandene afeBindings an Transformationen erhalten.

**Übersetzungen:** Alt-Text bleibt Nutzungseigenschaft.

**Guard:** Quell-/Zielmaße, responsive Bilder, lokaler Upload und Logo ohne Abschneiden mit echten Medienfällen prüfen.

**Sichtbare Wirkung:** Keine ungeprüfte Umstellung sämtlicher Bilder auf denselben Renderer.

## S01: Gemeinsame Zod-Schemas und aktive AFE-Deskriptoren

B, Priorität 5, Aufwand S, Risiko M. 667 Zeilen in 13 Dateien.

Der aktive Adapter lädt dieselben contentSchemas/sectionSchema wie Astro. design/templates erzeugt Felder aus der Union. project-showcase.ts ist nur Typ-/Re-export-Hülle, kein zweites Schema. Die früheren Editor-Feldkataloge sind S02.

**Einziger Besitzer:** Bestehende gemeinsame Zod-Instanzen und x-afe-Metadaten beibehalten.

**Ableitung:** Marker/afeBindings sind Adressen für Transformationen, keine Kopie der Inhalte. Neue Datensätze aus F01/F03/F10 werden an dieselbe AFE-Schnittstelle angeschlossen.

**AFE:** Neue Fakten ausdrücklich als Dateibesitzer mit Schema registrieren; keine parallelen Felddefinitionen.

**Übersetzungen:** Locale-Policy nicht aus dem bloßen Feldnamen ableiten, sondern als Schema-Metadatum definieren.

**Guard:** Alle Content-Schemas und AFE-Deskriptoren gemeinsam prüfen; proof.json validiert 198 vorhandene Dateien.

**Sichtbare Wirkung:** Keine neue Schema- oder Section-API in dieser Analyse.

## S02: Inaktive Editor-Architektur und kaputte historische Prüfhilfen

C, Priorität 4, Aufwand M, Risiko M. 998 Zeilen in 25 Dateien.

Neben editor/design existiert der ältere createFlyingStarsExtensions-Katalog mit Creation/Overlay/Record-Kinds. Der aktive Launcher ruft ihn nicht auf. Einzelne alte Module importieren nicht mehr vorhandene content-addresses/color-tokens/inline-text/package-ownership. Einige web-Unterdateien werden vom aktiven Adapter jedoch weiterhin benutzt.

**Einziger Besitzer:** Aktiven Server-/Browseradapter als Wurzelgraph dokumentieren; nur nachgewiesen unerreichbare historische Zweige entfernen.

**Ableitung:** routing.mjs, preview.mjs und media-usage.mjs sowie ihre aktiven Abhängigkeiten behalten. Tests, Import-by-URL und browserFiles-Registry mitprüfen.

**AFE:** Keine Umstellung auf die alte Overlay-/Schemaarchitektur; aktueller Marker- und Full-file-Vertrag bleibt.

**Übersetzungen:** Alte Translation-Overlay-Migrationen nicht mit aktuellen localeTransactions verwechseln.

**Guard:** Erreichbarkeits-/Importprüfung einschließlich Registrierungsstrings; kein unaufgelöster Import im ausführbaren Werkzeugbestand. Historische Fixtures mit Grund behalten.

**Sichtbare Wirkung:** Keine aktive Editorfunktion entfernen. Diese Löschliste benötigt einen eigenen kleinen Abhängigkeits-PR.

## S03: Copy-gebundene Tests und duplizierte Test-Helfer

A, Priorität 4, Aufwand M, Risiko M. 1103 Zeilen in 90 Dateien.

Quelltext- und Copy-Assertions wiederholen sichtbare Wörter/Labels, Importsyntax und historische Strukturen. Node-Tests und Browser-Specs besitzen gleiche Datei-/Content-/Szenario-Helfer. Nicht jede feste Erwartung ist fragil: unabhängig genehmigte Verträge brauchen ein eigenes Orakel.

**Einziger Besitzer:** Tests nach Vertrag ordnen, wenige reine Fixture-/Leser-Helfer; UI-Verhalten über Role/State/IDs prüfen. Kleine Copy-Snapshots nur dort, wo exakter Wortlaut der Auftrag ist.

**Ableitung:** Migrationstests mit altem unabhängigen Snapshot behalten, danach wenige kritische Vertragsfälle und vollständige datengesteuerte Abdeckung. Erwartung nicht aus derselben Funktion berechnen wie Ergebnis.

**AFE:** AFE-Tests ändern Werte über echte Felder/Adressen und prüfen Ausgabe statt hart codierter Layoutsyntax.

**Übersetzungen:** Alle Locales aus LOCALES, Text nur aus unabhängiger freigegebener Erwartung; keine Copy-Änderung in zig Browser-Locators nachtragen.

**Guard:** Testinventar mit Vertrags-ID/Owner; neue Quelle-Regex braucht Begründung. Auf semantische Fehler reagieren, nicht auf Umformatierung.

**Sichtbare Wirkung:** Keine Assertions löschen, nur weil sie unbequem sind; vor Ersatz denselben Fehlerfall nachweisen.

## S04: Mehrere Gate-Einstiege, Buildregeln und Laufzeitversionen

A, Priorität 4, Aufwand M, Risiko M. 828 Zeilen in 19 Dateien.

npm test/test:unit/ci/gates und editor/ci/check.mjs wählen Tests unterschiedlich. CI verwendet npm run ci und danach einen echten Build/Playwright; npm test allein enthält nicht alle src/scripts-Tests. Root verlangt Node>=22.12, .nvmrc/CI verwenden 24, installiertes AFE 0.3.0 deklariert >=24.15.

**Einziger Besitzer:** Ein explizites Test-/Buildmanifest mit Teilmengen für lokal, Editor, Produktion und Browser; unterstützte Node-Version einmal als Betriebsvoraussetzung.

**Ableitung:** npm/CI/Host-Update verwenden diese Teilmengen, weiterhin offline Editorbuild und echte Produktionsbilder unterscheiden.

**AFE:** Host-Editor-Voraussetzungen mit Paket-Engine abstimmen; keine stillschweigende Upgrade-Empfehlung ohne Hostingprüfung.

**Übersetzungen:** Hash-/Provenienzprüfung ist eigenes Gate und muss in jedem Veröffentlichungspfad enthalten sein.

**Guard:** Manifest-Abdeckung aller .test.mjs/.spec.ts, keine Testdatei unbeabsichtigt ausgelassen; deklarierte Node-/Paket-Engine kompatibel. Wiederholte Deploy-Bausteine erst bei identischem Vertrag teilen.

**Sichtbare Wirkung:** Kein Upgrade/Deploy in dieser Runde. Node22-Installation und gezielte Tests funktionieren, volles Node24-Runtimeverhalten unbewiesen.

## S05: Freigegebene Test-Snapshots und generierte Referenzdaten

B, Priorität 6, Aufwand S, Risiko S. 686 Zeilen in 5 Dateien.

package-projections-main.json und p6-before-Dateien konservieren ältere genehmigte Ausgaben. video-lab.json speichert verschiedene encodierte Renditions; gleiche URLs/Zahlen darin sind nicht automatisch doppelte redaktionelle Fakten.

**Einziger Besitzer:** Unabhängige Fixture mit Herkunft/Version bzw. technischer Generierung behalten.

**Ableitung:** Migration gegen historische Erwartung testen; technische Assetvarianten aus dokumentiertem Encode-Prozess erzeugen.

**AFE:** Fixtures sind nicht editierbare Site-Daten, nicht als aktive AFE-Quelle registrieren.

**Übersetzungen:** Snapshots pro Sprache sind absichtlich unabhängige Erwartungen.

**Guard:** Herkunft/Regenerationsbefehl und bewusste Aktualisierung; keine automatische Ableitung des erwarteten Ergebnisses aus aktuellem Produktionscode.

**Sichtbare Wirkung:** Keine Produktänderung.

## I01: Sprachkopien struktureller und unveränderlicher Werte

A, Priorität 1, Aufwand L, Risiko H. 3717 Zeilen in 203 Dateien.

66 deutsche Content-Einträge haben je eine vollständige EN-/NL-Datei. 2.481 gleiche Blattwerte, darunter URLs, IDs, Zahlen, Referenzen und Eigennamen. Vollständige Dateihashes erzwingen heute Sprachprüfung auch nach Struktur-/URLänderung. Editor synchronisiert solche Felder teils schon automatisch, verlangt aber weiterhin beide Sprachdateien.

**Einziger Besitzer:** Kurzfristig Full-file-Vertrag beibehalten und strukturierte Fakten aus ihren Besitzern beziehen. Danach separater Entwurf für schemaannotierte Felder: shared, localized, identity/reference, context-alt.

**Ableitung:** Struktur/IDs und sprachneutrale Fakten aus DE bzw. eigenem Datensatz; lokalisierte Textfelder pro stabiler Feld-/Item-ID. Eine Materialisierung vollständiger Sprachdateien wäre als Übergang zulässig, kein stilles Overlay-Fallback.

**AFE:** Shared-Feld einmal editieren, Auswirkungen in EN/NL zeigen. Textänderungen weiterhin gemeinsam prüfen; keine nur pfadbasierte structuralString-Heuristik für Namen/Zahlen/Alt-Texte.

**Übersetzungen:** docs/i18n/README.md verlangt derzeit vollständige Dateien und Raw-SHA. Diese Regel erst mit explizitem Architektur-PR ändern. Translatable-Hash muss referenzierte Faktenänderungen und Übersetzungsbedarf bewusst abbilden, niemals nur Hashes automatisch nachziehen.

**Guard:** Mutationsmatrix: URL/Maße/ID ohne unnötige Textprüfung, Name/Zahl im Fließtext mit betroffenen Übersetzungen; Reorder per stabiler ID, keine verwaisten Übersetzungen oder stiller DE-Fallback.

**Sichtbare Wirkung:** Sprachdatei-Migration muss alle sichtbaren Texte, IDs und Markierungen unverändert materialisieren. Keine Übersetzung automatisch als reviewed ausgeben.

## I02: Übersetzungsprovenienz und Quellhashes als Nachweis

B, Priorität 5, Aufwand S, Risiko M. 25 Zeilen in 4 Dateien.

Content-Datei, Quellhash und docs/i18n/content-provenance.json beschreiben verschiedene Dinge: Text, Aktualität und Herkunft/Review. Provenienz dupliziert Feldadressen absichtlich. Aktuell sind alle 132 Sprachhashes korrekt.

**Einziger Besitzer:** Content als Textquelle, maschinell geschriebene Provenienz als Nachweis, Hashfunktion/Translationsvertrag an einer Stelle.

**Ableitung:** Build, AFE-Transaktion und Prüfer verwenden dieselbe Definition des Quellstands; Herkunftsnachweise nicht als zweite editierbare Übersetzung behandeln.

**AFE:** Nur tatsächliche Review-Aktion schreibt Review-Metadaten; Transaktion und Vorschau unterscheiden.

**Übersetzungen:** Bei I01 den neuen Standvertrag und die Provenienz zusammen migrieren. Historische Nachweise mit Herkunft erhalten.

**Guard:** Keine verwaisten Feldadressen; Hash nur für tatsächlich geprüften Stand; gleiche Hashberechnung und keine automatische reviewed-Markierung bei reinem Sync.

**Sichtbare Wirkung:** Keine neue Copy und keine erfundene Freigabe.

## A01: Unbenutzte Frontend-Renderer und Legacy-Preisskript

C, Priorität 4, Aufwand M, Risiko M. 1747 Zeilen in 7 Dateien.

Video.astro, Calculator.astro und pricing.js haben keine Produktions-/PoC-Importe. pricing-heart-capacities.ts ist nur über pricing.js erreichbar. no-px.test und die historische i18n-Runtimehilfe referenzieren Altbestand noch direkt.

**Einziger Besitzer:** Entfernung als eigener Bereinigungsschritt nach Migration der noch relevanten Tests; verbleibende produktive heart-/formation-Daten nicht über Ordnernähe löschen.

**Ableitung:** Legacy-CSS für calc-hero/tiers/range/form nur nach Selektorabgleich mit aktiven Seiten/PoCs entfernen. Tests für aktuelle Konfigurator-Range/Medien schreiben, nicht nur Altdatei-Assertions streichen.

**AFE:** Nicht zum alten Calculator oder Video-Section zurückkehren; aktiven Renderer- und Schema-Graph prüfen.

**Übersetzungen:** Zugehörige UI-Schlüssel erst nach Verbrauchernachweis löschen. Referenzen in Provenienz/Historie nicht blind umschreiben.

**Guard:** Kein Import/Dateileser auf gelöschte Dateien; aktuelle Feature-/Bundleprüfungen bestehen; aktiver Editor und SectionRenderer unverändert.

**Sichtbare Wirkung:** Keine live erreichbare Ausgabe ändern; tatsächliche Deadness über Buildgraph/gezielte Browserfälle in Runde 2 bestätigen.

## A02: PoC-Routen, eigene Designsprache und Video-Labor

C, Priorität 6, Aufwand M, Risiko M. 891 Zeilen in 16 Dateien.

PoC-Routen sind eigenständige Seiten mit kopierten Formular-/Team-/Layoutdemonstrationen und eigenen Styles. Video-Labor nutzt zugleich freigegebene Renditiondaten, die der produktive Hero braucht.

**Einziger Besitzer:** Nur Demonstrationsrouten und ausschließlich von ihnen genutzten Code aus Produktionsbuild entfernen oder als nachvollziehbares Entwicklungsarchiv erhalten; produktive Renditionquelle bleibt.

**Ableitung:** Reale Produktionsimporte aus hero-video-sources/video-controller dürfen keine Laborroute benötigen. Git-Historie/Belege und dokumentierten Rückweg erhalten.

**AFE:** PoC nicht als neue produktive Section-Bibliothek anbieten.

**Übersetzungen:** PoC ist ausdrücklich von vollständiger Locale-Abdeckung ausgenommen; Ausnahme nach Entfernen der Routen gezielt abbauen.

**Guard:** Produktionsrouteninventar enthält keine unbeabsichtigten PoCs; freigegebene Hero-Renditions und Medienmanifest weiterhin vollständig.

**Sichtbare Wirkung:** Entfernung der öffentlich erreichbaren /poc/-URLs ist eine gekennzeichnete Routenänderung, keine stille Refaktorierung.
