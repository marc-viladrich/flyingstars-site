# Sicherheitskonzept und Standortvisualisierung

Stand: 02.11.2026. Ausgangspunkt: `feat/designsprache-poc`, `7bd1fbf`. Textentwurf für Moritz und FlyingStars, keine neue flugbetriebliche Freigabe. Originalquellen geben den Rahmen vor; der tatsächliche Standortplan wird von FlyingStars berechnet.

## Quellen und Rangfolge

Kundenbasis auf diesem Rechner: `/Users/marcviladrich/Freelance/AI & Automation/Claude Code Prep/freelance/clients/flyingstars/`. Die folgenden Pfade sind relativ dazu, außer D und Site-Dateien. Zeilen beziehen sich auf die unveränderten Quelldateien, PDF-Angaben auf gedruckte Seiten und Abschnittsnummern.

| Kürzel | Datei | Verwendung |
| --- | --- | --- |
| D | `public/media/downloads/FlyingStars-Technik-Datenblatt.pdf` im Site-Repo, Stand 09/2026, 2 Seiten | Technische Originalquelle; beide Seiten mit `pdftotext -layout` ausgelesen, die Zonenzeichnung auf S. 1 zusätzlich gerendert und betrachtet. |
| F | `16-fragebogen-und-elevate-2026-10-30/fragebogen-ausgefuellt-2026-10-21.md` | Antworten/Korrekturlisten vom 21.10. haben Vorrang vor alten Fragen und kopierten Website-Texten im selben Dokument. |
| L | `16-fragebogen-und-elevate-2026-10-30/codex-befunde/live-inventar-flyingstars-art.md` | Wörtliche Live-Texte, einschließlich FlyingStars-AGB. Älter als Kundenkorrekturen, keine unabhängige Sicherheitsbestätigung. JSON im selben Ordner ist das zugehörige Maschineninventar. |
| A | `16-fragebogen-und-elevate-2026-10-30/codex-befunde/faktenabgleich-site-vs-fragebogen.md` | Bestehender Audit, insbesondere Abschnitt 1.4 zu möglichen projektspezifischen Wetterausnahmen. Sekundärbefund, kein eigener Zahlenbeleg. |
| M | `17-designsprache-poc-2026-10-30/moritz-notizen-2026-10-30.txt` | Projektbriefing, enthält ältere Kopien neben korrigierten Angaben. Späteres Dateidatum hebt ausdrückliche Antworten aus F nicht auf. |
| R | `17-designsprache-poc-2026-10-30/README.md` | Designentscheidungen und offene Fragen: Z. 32 Sicherheitsschema; Z. 148, 262 Startfläche/Sperrzeit weiterhin offen. |
| B | `17-designsprache-poc-2026-10-30/codex-befunde/datensammlung-sitemap-logos-presse-konflikte.md` | Abschnitt 6 führt die Startflächen-/Sperrzeitkonflikte ebenfalls auf. `konfigurator-codeanalyse.md` beschreibt die Vorschau-Engine, keine realen Flugbetriebsgrenzen. |
| U1 | `05-relaunch-konzeption-2026-10/quellen/angebot-AN-1043.txt` und `.pdf` | **Marketingangebot von unwashed an FlyingStars**, 07.10.2026. S. 1/Z. 23 ff. SEO/GEO, Website, Google Ads. Kein Angebot für eine Drohnenshow, keine technischen Showwerte ableitbar. PDF ebenfalls ausgelesen. |
| U2 | `05-relaunch-konzeption-2026-10/quellen/agb-unwashed-2026-10-07.txt` und `.pdf` | **Agentur-AGB von unwashed**, § 1/Z. 1–19 und § 3. Nicht die AGB für FlyingStars-Drohnenshows. PDF ebenfalls ausgelesen. Die tatsächlichen FlyingStars-AGB stehen in L:1134–1188. |

D ist bytegleich mit der genannten Kopie in `09-inline-editor-poc-2026-10/site/public/media/downloads/`: SHA-256 `e3aba6cf5811fc63c341fdd1c18c62dba9247add06f13a8dc950424ae26b46b3`.

Ergänzender Live-Abruf am 02.11.2026: [Indoor](https://flyingstars.art/drohnenshow-indoor), Abschnitte „Technische Voraussetzungen“, „Technische Details“ und FAQ, sowie [Startseite](https://flyingstars.art/). Indoor-Angaben entsprechen dem archivierten Wortlaut in L. Live-Text ist gegenüber F nachrangig. Keine externen Regelwerke als Quelle neuer Grenzwerte verwendet.

## Fakteninventar Outdoor

| Thema | Quellenbefund | Beleg | Umsetzung/Status |
| --- | --- | --- | --- |
| Gesamter Sicherheitsbereich | Faustregel ca. 100 × 100 m, abhängig von Drohnenzahl, Motiven und Flughöhe. | D S. 1 § 01/02; F:702–705, 888–891 | Beide Außenmaße im Schema, mit Standortvorbehalt. |
| Publikum und Abstand | Publikum außerhalb. **Kein pauschaler 100-m-Publikumsabstand.** | F:888–891 korrigiert F:714–715; D S. 1 § 02 | Keine 100-m-Abstandslinie zwischen Gästen und Flugbereich. |
| Äußerer Sicherheitsbereich | Umfasst auch innere Bereiche; während der Show frei von Unbeteiligten, ca. 15 Min. | D S. 1 § 02; F:888–891 | Äußerer Rahmen, Zone 1. Ca. 15 Min ist die Sperrdauer im Beispiel, keine garantierte Showlänge. |
| Innerer Sicherheitsbereich | Innerer operativer Bereich, im Datenblatt gelb/orange. Kein pauschales Maß genannt. | D S. 1 § 02 einschließlich Zeichnung | Eigene Kontur, Zone 2; kein erfundenes Maß. |
| Flugbereich | Innerhalb der Sicherheitsbereiche; Motive zum Publikum ausgerichtet. | D S. 1 § 02 | Eigene Fläche, Zone 3. |
| Drohnenlinie | Draufsicht: quer zur Blickrichtung; im Beispiel ca. 60 m breit, äußerer Bereich ca. 100 m. | D S. 1 § 02 | Bemaßte Beispiel-Drohnenlinie; ausdrücklich kein allgemeiner Mindestwert. |
| Flughöhe | Bis 120 m; Fragebogen schränkt mit „in der Regel“ ein. Motive laut D bis ca. 100 m breit. | D S. 1 § 01/02; F:738–742 | Höhe als Text unter der Draufsicht, nicht als vertikale Achse einer Draufsicht. |
| Start-/Landefläche | Freie, ebene Fläche. Drohnenzahl bestimmt Größe. Keine einheitliche belastbare Outdoor-Abmessung. | D S. 1 § 02/03; F:710–711; M:383 | Zone 4 ohne feste Meterangabe, Konflikt unten. |
| Sperrung der Startfläche | Ab Ankunft ca. 3 h vor der Show. | D S. 1 § 01/02/03; F:888–891 | Klar vom ca. 15-minütigen Freihalten des gesamten Sicherheitsbereichs getrennt. |
| Aufbau/Technik | Drohnenraster, Antennenstative, Kontrollstation im Start-/Landebereich; Aufbau ca. 3 h. | D S. 1 § 01/02; S. 2 § 05 | In Zonenerklärung enthalten. |
| Publikum/Sicht | Freie Sicht Richtung Flugbereich, nicht zu nah vor Hauswänden/Bäumen. Keine Meterzahl dafür. | D S. 1 § 02 | Zone 5, Pfeil der Blickrichtung, qualitative Erklärung. |
| Gebäude | Überflug mit Zustimmung der Eigentümer:innen möglich. | D S. 1 § 03 | In Mitwirkung erklärt. Keine pauschale gebäudefreie 100-×-100-m-Fläche behauptet. |
| Straßen/Wege | Im Beispiel Parkweg/Hauptstraße dargestellt, keine Mindestabstände oder pauschalen Überflugerlaubnisse genannt. | D S. 1 § 02 Zeichnung | Keine erfundenen Straßenabstände oder implizite Verkehrsfreigabe gezeichnet. |
| Hindernisse | Veranstalter informiert über Hindernisse im Flugbereich und Publikumssichtfeld, optimal mit Höhen. | D S. 1 § 03 | Kundenseitige Vorbereitung. |
| Flächennutzung/Zustimmung | Für alle überflogenen Flächen, also den gesamten äußeren Bereich; öffentlich: Stadt/Gemeinde. Schreiben von FlyingStars. | D S. 1 § 03; F:719–725 | Klarer Zuständigkeitssplit. |
| Flächenbereitstellung | Geeignetes Gelände und Sicherheitsbereich kostenfrei für Aufbau, Show und Abbau; Eignung vorab abstimmen. | L:1149–1154, FlyingStars-AGB § 4 | Bereitstellung genannt; keine neue Vertragsklausel auf der Website. |
| Sicherung vor Ort | Veranstalter zuständig, sofern nicht anders vereinbart. Meist Flatterband; belebt: 1–2 Ordner:innen; über Wasser: eine Person im Boot. | D S. 1 § 02/03; L:1153 | In „Das braucht ihr“; Ordner:innen nicht mit Flugteam gleichgesetzt. |
| Ansprechpartner | Erreichbare verantwortliche Person in Vorbereitung/Durchführung; gewünschte Showzeit. | D S. 1 § 03; L:1151 | Kundenseitige Ansprechperson. |
| Teamgröße/-rollen | 3–4 Personen, Pilot:innen und Techniker:innen. Geschultes Team überwacht vor Ort. | D S. 1 § 01; F:750–753 | Eigener Sicherheitsbaustein. Keine feste Spotter-Rolle hinzuerfunden. |
| Interne Ansprechpartner | Erwin für Anträge/Behörden/Luftfahrtrecht/Ordnungsamt. Patrick für technisches Show-Setup. Flo steuert offiziell keine Shows. | F:137–141, 165–168, 195–198 | Inventar; keine konkrete Pilotenzuordnung aus Geschäftsführerrolle. |
| Drohnen | Rund 300 g, keine Kameras. | D S. 1 § 01; F:738, 898–900 | Als Outdoor-Angabe benannt. |
| Flugbahnen | Vorprogrammiert, keine Echtzeitsteuerung der Flugbahnen. | F:918–919 | Kein Bild einer manuell geflogenen Show erzeugt. Sicherheitsüberwachung bleibt davon getrennt. |
| Geofencing | Digitaler Zaun begrenzt Showbereich; beim Verlassen automatisches Sicherheitsprotokoll. | F:744–753, durch F:898 zusammenzuführen; L:1333–1341 | Eigener Baustein. Geofence-Grenze nicht mit äußerem Bodenbereich gleichgesetzt. |
| Redundanz | Automatische und manuelle Systeme überwachen jeden Flug, mehrfach abgesichert. | D S. 2 § 07; F:738–753 | Explizit genannt, keine unbestätigten Dual-GNSS-/Akku-/Funkdetails. |
| Ausfall/Rückkehr | Meist automatische Rückkehr, im Notfall Landung im freien Sicherheitsbereich. Keine garantierte Absturzvermeidung. | F:921–923 | Mit „meist“ formuliert. |
| Wind/Nieselregen | Formstabil bis Windstärke 5, D ca. 36 km/h; leichter Nieselregen möglich. | D S. 1 § 01, S. 2 § 06; F:729–734 | Windstärke 5, ohne widersprüchliche m/s-Grenze. |
| Starkregen/Gewitter | Laut Live-FAQ wird bei starkem Regen oder Gewitter verschoben oder abgesagt. | L:1383–1388 | Bestätigt den engeren Wetterrahmen; vorhandene Wetterabschnitte bleiben bestehen. |
| Pyrotechnik | Datenblatt und Fragebogen nennen keine Pyrotechnik, keinen Knall und keine Brandgefahr. | D S. 2 § 07; F:738–742 | Als Quellenangabe inventarisiert. Keine zusätzliche absolute Risikofreiheit in der Sicherheitsdarstellung behauptet. |
| Showgröße/-dauer | D nennt 100–1.000+ Drohnen, meist ca. 13 Min, bis 25 Min möglich. | D S. 1 § 01; F:915–916 | Die ca. 15 Min Freihaltung im Zonenbeispiel ist keine maximale Showdauer. |
| Wetterabstimmung | Idealerweise 1–2 Tage vorher; trockene Zeitfenster, bei mehrtägigen Events Ausweichtermin. | D S. 2 § 06 | Abstimmung im Sicherheitsbaustein; Ausweichtermin im Inventar. |
| Abbruchgründe | Starke Funk-/GNSS-Interferenzen, möglicher Jamming/Spoofing, anderer Flugverkehr, fehlende/widerrufene Genehmigung. | L:1162–1165, FlyingStars-AGB § 7 | Dokumentiert; Website verspricht keinen Flug bei jeder Wetter-/Funklage. |
| Ältere Wettergrenzen | >8 m/s, Niederschlag, Sicht <1 km, Temperatur <0 °C/>40 °C als Ausfallumstände in AGB von 2025. | L:1165 | Konflikt mit späterem Wettertext, unten festgehalten; keine neue universelle Checkliste daraus. |
| Wetter/Vertragsfolgen | Kostenlos verschieben vor Anfahrt; bei vollständigem Ausfall Staffel 40/60/80/95 % je Zeitpunkt. | F:893–896; L:1166–1174 | Bestehende Wetter-/FAQ-Texte nicht erweitert; keine zusätzlichen Vertragsversprechen. |
| Beschallung | Veranstalter stellt Beschallung; Musikschnitt von FlyingStars, große Box für kleine Gruppen möglich. | D S. 1 § 03; F:925–926 | Unter Zuständigkeiten. |
| Startzeit | Outdoor ab 30 Min nach Sonnenuntergang bis 30 Min vor Sonnenaufgang. | D S. 1 § 01; F:909–910 | Im Inventar; vorhandene Startzeit-FAQ bleibt zuständig. |

## Genehmigungen und Versicherung

Diese Tabelle beschreibt die Angaben von FlyingStars. Sie ist keine unabhängig durchgeführte Prüfung der Betriebsgenehmigung, Police oder geltenden Rechtslage.

| Thema | Quellenbefund | Beleg | Umsetzung/Status |
| --- | --- | --- | --- |
| Betriebsgenehmigung | Generische Betriebsgenehmigung des Luftfahrt-Bundesamts; die meisten Flugorte können selbst freigegeben werden. | D S. 2 § 04; F:990–1001 | Zuständigkeiten, ohne Garantie für jeden Standort. |
| Specific | Datenblatt nennt spezielle Kategorie und europäische Vorgaben. Kein Genehmigungsbescheid liegt im Quellenpaket. | D S. 2 § 07 | Spezielle Kategorie genannt. Keine pauschale EASA-Ausstellungsbehörde behauptet. |
| EU/EWR | EU-weite Betriebslizenz; D verweist auf Art. 12/13 IR (EU) 2019/947. Ergänzende Anträge im Zielland. | D S. 2 § 04; F:1088–1092 | Cross-border-Bestätigung ausdrücklich genannt. |
| DFS/Kontrollzone | Weitere Anträge und Verkehrsfreigabe für den Abend übernimmt FlyingStars. Erfahrungen an zivilen und Militärflughäfen. | D S. 2 § 04; F:859–865 | Als standortabhängiger Zusatzschritt erklärt. |
| Normale Vorlaufzeit | Ideal 1–2 Monate, Design mit Feedback mindestens 3 Wochen. | D S. 2 § 05; F:694–698 | Planungsrichtwert in beiden Outdoor-Blöcken. |
| Komplexe Genehmigung | Etwa Flughafennähe: eher 3 Monate. Keine verbindliche behördliche Bearbeitungsfrist. | F:694–698; M:379 | Bedingte Planungsaussage, keine feste Zeitleiste bis zu garantiertem Bescheid. |
| Express | 1–2 Wochen möglich; alles unter 14 Tagen Express, Aufpreis nach Aufwand. | D S. 2 § 05; F:928, 1097–1098 | Mit Standortvorbehalt. |
| Ablauf | Anfrage/Antwort binnen 48 h; Standortprüfung, Zonenplan und Festpreisangebot; luftrechtliche Anträge; Design; Showtag. | D S. 2 § 05 | Standortprüfung vor Angebot und Anträge in Verantwortlichkeiten. Keine neue Antwortfrist erfunden. |
| Ausland allgemein | Andere Länder zusätzlich 4–8 Wochen, Italien ca. 3 Monate. | F:904–907 | Quelle für pauschale Auslandseinordnung; Detailwerte nach D nachfolgend. |
| Niederlande/Belgien/Luxemburg/Frankreich | ILT ca. 6 Wochen; DGLV 4–8 Wochen; DAC ca. 6 Wochen; DGAC ca. 6 Wochen. | D S. 2 § 04 | Inventar; keine neue Ländertabelle im Standortabschnitt. |
| Dänemark/Irland/Italien | Trafikstyrelsen 4–6 Wochen; IAA 6–8 Wochen; ENAC ca. 3 Monate. | D S. 2 § 04 | Dänemarkkonflikt mit M:394, siehe unten. |
| Österreich | Austro Control spätestens ca. 6 Wochen vorher; M nennt um 650 € für Antrag. | D S. 2 § 04; M:394 | Termin im Inventar, Kosten nur nach aktuellem Angebot bestätigen. |
| Schweiz | BAZL und Zollabwicklung, zusätzlich 1.900 € netto. | D S. 2 § 04; F:904–907, 1110–1112 | Inventar; bestehende Auslands-FAQ unverändert. |
| Bundeswasserstraßen | Abstimmung mit Wasserstraßen- und Schifffahrtsamt übernimmt FlyingStars. | D S. 2 § 04 | In Zuständigkeiten. |
| Naturschutzgebiete | Behörde entscheidet; erste Anfrage am besten durch lokalen Betreiber, FlyingStars übernimmt Antrag/Konzept/Flugplanung. | D S. 2 § 04 | Ausnahmen von „alles übernehmen wir“ sichtbar gemacht. |
| Ordnungsamt | Als interner Aufgabenbereich Erwins genannt; keine allgemeine Frist oder Meldepflicht dokumentiert. | F:139 | Keine pauschale Zusage einer Ordnungsamtsgenehmigung. |
| NOTAM | Kein belastbarer Fund in den technischen Originalquellen und geprüften Sicherheits-/Genehmigungstexten. | D § 04/07; F Sicherheits-/Genehmigungspassagen; L FAQ/Warum wir | Offen; keine automatische NOTAM-Pflicht behauptet. |
| Haftpflicht | Drohnen-Haftpflicht bis 1,3 Mio. € in jedem Paket; Veranstalter braucht dafür keine Zusatzversicherung. | D S. 2 § 07; F:898–900, 1110–1112 | Als Outdoor-Drohnen-Haftpflicht gekennzeichnet, keine allgemeine Veranstalterversicherung ersetzt. |
| Gebühren/Erfolg | Luftrechtliche Anträge von FlyingStars; Genehmigungserfolg nicht geschuldet. Gebühren und Auflagenkosten laut Auftragsbestätigung/AGB. | L:1155–1157 | „Wir übernehmen Anträge“ ist keine Zusage pauschal kostenloser Sondergenehmigungen. |
| TÜV | Schallschutz-Gutachten, kein Sicherheitszertifikat. | F:435–438, 1088–1092 | Kein TÜV-Sicherheitsbadge hinzugefügt. |

## Indoor-Fakten

| Thema | Quellenbefund | Beleg | Umsetzung/Status |
| --- | --- | --- | --- |
| Eigenes System | Separates Indoor-System, meist 20–50 Drohnen, 5–8 Min. | F:877–880, 930, 1129–1133; D S. 2 § 09 | Keine Outdoor-Flächen oder pauschalen Outdoor-Betriebsregeln übertragen. |
| Raumhöhe | Mindestens 3 m. | F:930, 1129–1131; L:1911–1914 | Im Raumschnitt bemaßt. |
| Flughöhe | Bis 8 m, Live-Text 1–8 m. | D S. 2 § 09; L:1928 | Höhenangabe passend zum tatsächlichen Raum, keine 8-m-Mindestdecke. |
| Startfeld | Raster mit 1 m Abstand, 20 Drohnen ca. 5 × 5 m, 50 Drohnen ca. 7 × 7 m. | D S. 2 § 09; L:1931 | Separate Draufsicht als Beispiel für 20 Drohnen, beide Flächen im Text. |
| Boden | Eben, alle Drohnen auf gleicher Höhe. | D S. 2 § 09 | Zonenerklärung und Kundenvorbereitung. |
| Antennen | An den Ecken des Fluggebiets. | D S. 2 § 09 | Vier kleine Standortpunkte an der Fluggebietsgrenze, eigene nummerierte Erklärung. |
| UWB | Basis- und Sendestationen für Positionierung. Live nennt 3,7/6,7 GHz. | L:1930–1932 | UWB erklärt; Frequenzen bleiben im Inventar, keine allgemeine Funkfreigabe zugesagt. |
| Planungseingaben | Grundriss mit Maßen und Deckenhöhe. | D S. 2 § 09 | Verbindlichere Vorbereitung als allein „Foto“. Publikumsposition als Planungsinformation. |
| Freie Flugfläche | Start- und Flugfläche bleibt frei; Raumkonzept individuell. | D S. 2 § 09; L:1910–1915 | Nummerierte Zonen für Flug, Boden und Publikum. |
| Publikumsabstand/Netz | Keine fixe Meterzahl zum Publikum und keine generelle Netzpflicht belegt. | D § 09; F Indoor-Passagen; L:1895–1942 | Keine solche Maßlinie/Netzzeichnung. Publikumsbereich wird mit FlyingStars geplant. |
| Drohnengewicht | 188 g. | L:1926 | Bestehende Indoor-Kennzahlen bleiben unverändert. Nur Live-Beleg, nicht in F bestätigt. |
| Geschwindigkeit | Max. 1,5 m/s. | L:1927 | Bestehender Sicherheitsbaustein bleibt. |
| Drohnenabstand | Mindestens 0,5 m **zwischen fliegenden Drohnen**, kein Publikumsabstand. | L:1929 | Bestehender Baustein formuliert das korrekt. Vom 1-m-Startraster getrennt. |
| Schutzsysteme | Rotorschutz, redundante Mechanismen, kontrollierte Landefunktion, CE-zertifizierte Komponenten. | L:1895–1901, 1939–1940 | Vorhandene Indoor-Sicherheitskacheln behalten; CE nicht zu Sicherheitszertifikat der ganzen Show aufgewertet. |
| Strom | Stromanschluss in der Nähe laut Live-FAQ. | L:1941–1942 | Abstimmung erwähnt; Anschlussleistung nicht erfunden. |
| Indoor-Aufbau | Live nennt Ankunft/Aufbau ab 2 h vorher und ca. 45 Min Aufbauzeit. | L:1924 | Nur Inventar. Nicht mit Outdoor-Sperrung von 3 h gleichgesetzt. |
| Versicherung/Behörden Indoor | D § 07 spricht von jedem Paket im Outdoor-Datenblatt; § 09 ist separates Produkt. Kein belastbarer eigener Indoor-Police-/Behördennachweis. | D S. 2 § 07/09 | Keine universelle Indoor-Deckung/Behördenfreiheit zugesagt. Klärfrage unten. |

## Konflikte und redaktionelle Entscheidung

| Konflikt | Entscheidung |
| --- | --- |
| F:714–715 und L:1375–1376 „mindestens 100 m zum Publikum“ gegen F:888–891 | Kundenkorrektur gewinnt: ca. 100 × 100 m Sicherheitsbereich, keine allgemeine Distanz von 100 m. |
| Startfläche 15 × 15 m in F:710–711 gegen 25 × 25 m in M:383 und L:1372 | F korrigiert die Fläche in seiner Antwort nicht ausdrücklich; D nennt bewusst kein Outdoor-Maß. R:148/262 und B Abschnitt 6 kennzeichnen den Wert als offen. Deshalb weiterhin kein fixes Outdoor-Startflächenmaß, Größe aus Planung. |
| Sperrung 4 h in F:711/L:1372 gegen 3,5 h in M:383/L:2012 gegen ca. 3 h in F:888/D | Ausdrückliche Kundenantwort gewinnt: ab Ankunft ca. 3 h. |
| D „ca. 36 km/h“, F Windstärke 5 gegen ältere FlyingStars-AGB L:1165 „über 8 m/s“ | Website nutzt bestätigte Windstärke 5. Keine Umrechnung als neue exakte Betriebsgrenze; Verhältnis zwischen Böen, Betriebs- und Vertragsgrenze durch FlyingStars klären. |
| Pauschal ca. 6 × 6 m Raumfläche in L:1535/1942 gegen D § 09 drohnenzahlabhängiges Raster | Konkrete technische Beispiele 20/50 Drohnen verwenden. Rastergröße ist nicht automatisch die gesamte benötigte Flug-/Publikumsfläche. |
| EU-weite Genehmigung im alten Text ohne Zusatzantrag gegen F:1088–1092 | Cross-border-Bestätigung ausdrücklich nennen. Keine Genehmigungsfreiheit außerhalb Deutschlands behaupten. |
| TÜV-Sicherheitszertifizierung gegen F:435–438/1088–1092 | Ausschließlich Schallschutz-Gutachten. |
| M:394 „Dänemark noch länger“ gegen D 4–6 Wochen und F pauschal 4–8 Wochen | Detaillierte Länderfrist nicht neu veröffentlichen; aktuellen Stand je Land erfragen. |
| „Alle Genehmigungen inklusive“ gegen Eigentümerzustimmung und AGB § 5 | Luftrechtliche Anträge von FlyingStars, Eigentümerzustimmung vom Veranstalter, Sondergebühren nach Angebot. |
| „Niemand“ im Sicherheitsbereich gegen „frei von Unbeteiligten“ in F/D | Neue Abschnitte verwenden „Unbeteiligte“. Betriebsbeteiligte werden nicht als grundsätzlich ausgeschlossen dargestellt. |

## Vergleich zum Ausgangsstand 7bd1fbf

Ursache der Lücke: `landingSite` erlaubte höchstens fünf lose Listenpunkte, vermischte räumliche Zonen mit technischen Sicherheitsmaßnahmen und hatte nur ein optionales Checklistenfeld. In der Komponente waren Maße/Alt-Texte fest codiert; mehrere Texte konnten dieselbe Zone verwenden. Dadurch passten Listennummern und gezeichnete Bereiche nicht vollständig zusammen.

| Bereich | Vorher | Änderung |
| --- | --- | --- |
| Outdoor-Zeichnung | Äußerer Rahmen, Drohnenlinie, Startfeld und Gäste; kein operativer Bereich. 100-m-Seiten vorhanden, 60-m-Beispiellinie ohne Maß. | Alle fünf Bereiche, 60-m-Beispielmaß, äußere Maße und Höhe getrennt. Nummern entstehen aus derselben Inhaltsliste. |
| Über uns | „Mehrfach abgesichert“ fälschlich an Startzone gebunden; Gewicht teilte die Drohnenzone, nur vier Marker für fünf Listenpunkte. | Ein Punkt pro räumlicher Zone; Geofence, Rückkehr/Redundanz, Flugteam und Wetter separat sichtbar. |
| Hochzeit | Grundstückszustimmung erwähnt; Absicherung und unterschiedliche Sperrzeiten unvollständig. | Vollständige räumliche Planung, Mitwirkung und Leistungen, Anträge und Planungsrichtwerte. |
| Indoor | Deckenhöhe und freie Fläche; kein Rastermaß, kein Antennenstandort, keine Publikumszone erläutert. | Raumschnitt plus Startraster, 1-m-Raster und 20-/50-Drohnen-Beispiele, Antennen/UWB, Publikumsplanung und Vorbereitung. |
| Schema | Nicht strikt; unbekannte Schlüssel konnten verloren gehen, Zonen doppelt/fehlend. | Äußeres Objekt und alle Unterobjekte strikt. Fünf eindeutige, zur Variante passende Zonen sind Pflicht. Unbekannte alte `checklist`-Felder schlagen fehl. |
| Interaktion | Zeiger-Hover dimmte andere Zonen; Lichtpunkte blendeten zeitversetzt ein. | Statisches, vollständig lesbares Schema. Keine Information hängt von Hover oder Animation ab. Keine neue Browserlogik. |

Weitere Fundstellen wurden mit `rg -n -i 'sicher|genehmigung|haftpflicht|abstand' src` geprüft:

- `src/content/faq/platz.md`, `sicherheit.md`, `absturz.md`, `stadt-flughafen.md`, `vorlauf.md`, `ausland.md`: aktuelle 100-×-100-m-Fläche, 3-h-Ankunft, Geofence/Rückkehr, Haftpflicht und bedingte Fristen weitgehend bereits korrekt. `was-braucht-ihr.md` nennt bisher nicht die Absicherung; der vollständige Split steht jetzt in den Standortabschnitten.
- `src/content/faq/genehmigung.md`: eigener Zusatzantrag außerhalb Deutschlands fehlt in dieser einzelnen Antwort, ist in `ausland.md` vorhanden. Mögliche spätere redaktionelle Vereinheitlichung, außerhalb des Besitzbereichs dieses Tasks.
- `src/content/faq/indoor-raum.md` ist weniger detailliert als D § 09; `indoor-sicherheit.md` und die Indoor-Sicherheitskacheln sind anhand L belegt. Der neue Standortabschnitt trägt die Rasterdaten, ohne die Sicherheitskacheln zu duplizieren.
- `src/content/package-details.ts`: Vergleichstabelle führt Sicherheitskonzept und Haftpflicht bis 1,3 Mio. € in allen Paketen, Basisleistungen ebenfalls. Sicherheitsangaben stimmen mit D/F überein. Sonderverfahren unterscheiden sich nach Paket, daher keine kostenlose unbegrenzte Behördenleistung versprochen.
- `src/components/pricing/PackageDetails.astro`: altes Paketmarkup mit allgemeinem Sicherheitskonzept/Haftpflicht; keine aktuelle Import-Fundstelle. Sicherheit nicht falsch, aber alte paketgebundene Laufzeiten dort widersprechen F. Keine sachfremde Preisüberarbeitung in diesem Task.
- Startseite, Werbeseite, Über-uns-Abschnitte außerhalb `landingSite` und importierte Blogartikel enthalten weitere Sicherheits-/Genehmigungstexte. Die generalisierten Aussagen sind kein Beleg für zusätzliche konkrete Grenzwerte. Keine Änderungen außerhalb der vereinbarten drei Blöcke.

## Umsetzung und Prüfregel

Besucheraufgabe: erkennen, ob die Location grundsätzlich passt und welche Angaben/Leistungen nötig sind. Sichtbare Fakten: räumliche Grenzen und belegte Richtmaße zuerst, danach Sicherungssysteme und Zuständigkeiten. Darstellung: ruhige schematische Flächen, fünf nummerierte Zonen, offene Inhaltsgruppen im vorhandenen Dunkel-/Orange-System. Tradeoff: mehr Inhalt und Scrollstrecke, dafür bleiben entscheidende Mitwirkungspflichten sichtbar. Planungszeiten stehen als bedingte Richtwerte im Text, weil die Quellen keine garantierte Genehmigungsdauer für jeden Standort liefern.

`landingSite` ist weiterhin ein einzelner bestehender Section-Typ. Dauerhafter Wächter ist die Content-Grenze in `src/content.config.ts`: `.strict()` für alle Objekte, fünf Pflichtzonen und Prüfung auf eindeutige/vollständige Variantenzonen. Ein ausgelassener operativer Bereich oder eine doppelte Drohnenzone bricht künftig die Content-Validierung. Alle Maße und Beschreibungen werden aus YAML gerendert; die Komponente enthält keine fest codierten technischen Grenzwerte.

Nach Schemaänderungen Dev-Server stoppen und `.astro/data-store.json` löschen. Erneute Prüfung: `npx astro check`, `npm run build`, dann die drei Abschnitte bei 1440/390 px betrachten und Nummern, Textinhalte, SVG-Beschriftungen und Überlauf prüfen. Keine vollständige Playwright-Suite, keine Aufzeichnung beauftragt.

## Offene Fragen an FlyingStars

1. Welche aktuellen Outdoor-Startflächen gelten je Drohnenzahl? Sind 15 × 15 und 25 × 25 m Beispiele verschiedener Flotten/Showgrößen?
2. Welche Abstände/Grenzen gelten konkret zu Straßen, Wegen, Gebäuden und Publikum im genehmigten Betrieb? Welche standortabhängigen Faktoren bestimmen den inneren operativen Bereich?
3. Wie unterscheiden sich Windstärke 5/ca. 36 km/h, die 8-m/s-Vertragsklausel sowie Böen-/Dauerwindgrenzen? Gelten die älteren Temperatur-/Sichtgrenzen noch?
4. Ist ein Spotter als feste Rolle vorgeschrieben? Welche Aufgaben darf die Veranstalterabsicherung übernehmen, welche ausschließlich das Flugteam?
5. Wer veranlasst gegebenenfalls NOTAM und Abstimmungen mit dem Ordnungsamt, mit welchen Fristen? In welchen Fällen sind sie nötig?
6. Wie groß sind Indoor-Flugbereich und Publikumsabstand zusätzlich zum Startraster? Gibt es standortabhängige Netze/Barrieren? Welcher Stromanschluss und welche Zugänglichkeit werden gebraucht?
7. Gelten 188 g, 1,5 m/s, 0,5 m Drohnenabstand, UWB/Frequenzen und die Indoor-Aufbauzeiten für die aktuelle Flotte? Welche Unterlagen bestätigen die CE-Angaben?
8. Welche Police/Deckung gilt ausdrücklich für Indoor? Versicherer, aktuelle Deckungsbestätigung und Betriebsgenehmigungsbescheid fehlen im Quellenpaket.
9. Welche aktuellen Cross-border-Fristen/Kosten gelten je Land, insbesondere Dänemark/Österreich? Welche Sondergebühren sind in welchem Paket tatsächlich enthalten?

## Prüfprotokoll

- `npx astro check`: 161 Dateien, 0 Fehler, 0 Warnungen, 227 bestehende Hinweise.
- `npm run build`: erfolgreich, 23 Seiten, letzter Durchlauf 4,49 s. Alle drei gebauten HTML-Dateien auf die neuen Beschriftungen geprüft.
- Gezielter Content-Grenztest in `/tmp/fs-sicher/check.mjs`: alle 3 echten YAML-Abschnitte gültig; 23 ungültige Varianten abgewiesen. Darunter fehlende/doppelte/falsche Variantenzonen, unbekannte Objektfelder und die alte Checklistenstruktur.
- Chromium: alle 3 Seiten bei 1440 und 390 px geprüft. Dokumentbreite exakt 1440 beziehungsweise 390 px, keine JavaScript-Laufzeitfehler, jeweils 5 Listeneinträge und 5 passende Marker. Alle Maßbeschriftungen aus YAML vorhanden, kein SVG-Text angeschnitten, Sicherheitsicons tatsächlich 36 px breit.
- WebKit: dieselben 6 Ansichten, kein Überlauf und keine JavaScript-Laufzeitfehler. Alle Zonenerläuterungen und Verantwortlichkeiten gegen die echten YAML-Texte im DOM abgeglichen.
- Zwölf aktuelle PNGs betrachtet: je Seite/Breite ganzer Abschnitt und isoliertes Diagramm. Screenshots ohne Astro-Entwicklungsleiste; keine Produktinhalte ausgeblendet. Die erste Sichtprüfung fand zu kleine Icons durch globale `.ico`-Regeln und abgeschnittenen SVG-Textraum, beides im Komponentenscope korrigiert.
- `final-check.mjs` vergleicht die vollständigen YAML-Daten nach Entfernen der `landingSite`-Blöcke mit `7bd1fbf`: unverändert. `git diff --check` fehlerfrei.
- Keine vollständige Playwright-Suite, keine Aufzeichnung und keine Prüfung realer Betriebsfreigaben oder Versicherungsunterlagen. Die T3-Vorschau meldete beim Snapshot zweimal `Preview automation snapshot timed out after 15000ms.`; die beauftragten lokalen Playwright-Prüfungen waren erfolgreich.

Screenshots und Hilfsskripte liegen außerhalb des Repos in `/tmp/fs-sicher/`:

| Seite | 1440 px | 390 px |
| --- | --- | --- |
| Über uns | `ueber-uns-1440.png` | `ueber-uns-390.png` |
| Hochzeit | `drohnenshow-hochzeit-1440.png` | `drohnenshow-hochzeit-390.png` |
| Indoor | `drohnenshow-indoor-1440.png` | `drohnenshow-indoor-390.png` |

Zusätzliche Diagrammausschnitte tragen jeweils `-diagramm.png`. Messwerte: `verification.json` und `final-check.json`; vollständige CLI-Ausgaben: `astro-check.log`, `build.log` und `screenshots.log`. Die Skripte importieren die installierten Projektwerkzeuge aus dem oben genannten Worktree; bei einem Umzug den darin enthaltenen `root`-Pfad anpassen.
