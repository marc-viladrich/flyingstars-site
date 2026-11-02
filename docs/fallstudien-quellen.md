# Quellen der drei ergänzten Fallstudien

Stand: 2. November 2026. Bestehende Kurzreferenzen aus dem Inventar vom 30.10. wurden erweitert. Fakten und Motive stammen aus FlyingStars' eigenen Projektberichten. Keine unabhängige Erfolgsmessung oder Kundenfreigabe wird daraus abgeleitet. Alle genannten Bilder wurden erneut heruntergeladen, vermessen und visuell geprüft. Sie bleiben externe URLs, keine Bilddateien wurden ins Repository kopiert.

## Hochzeit in Recklinghausen

Original: [Hochzeitsüberraschung](https://flyingstars.art/besondere-hochzeitsueberraschung-fuer-brautpaar-und-gaestinnen), erneut per HTTP 200 abgerufen.

- Kopf: 29.06.2024, Recklinghausen, privat, 150 Drohnen.
- „Die Anfrage“: Familie fragt vier Monate vor der Hochzeit an.
- „Die Vorbereitung“: Motive/Musik mit der Familie, Start-/Landefläche auf Nachbargrundstück ohne Wissen des Brautpaars eingerichtet und abgesperrt.
- „Die Durchführung“: ungeeigneter Boden, mobile Holzplattform pro Drohne, Gewitterfront, Flotte wieder eingepackt, Show mit Familie zeitlich verschoben und später durchgeführt. Keine Sicherheitsausnahme und keine garantierte Durchführung bei Gewitter behauptet.
- Storyboard: Taube, Ringe, Herzen und persönliche Initialen. Die Reihenfolge der Liste wird nicht als exakter Flugplan ausgegeben.
- Foto: [Hochzeit_cover.jpg](https://flyingstars.art/wp-content/uploads/2024/12/Hochzeit_cover.jpg), 1518 × 854, zwei Blüten über Bäumen. Dasselbe einzige belegte Foto begleitet die drei Textabschnitte; eine aufgefüllte Galerie entfällt.
- Im Original eingebetteter Film: [YouTube WRoA4dbs88w](https://www.youtube.com/watch?v=WRoA4dbs88w), durch spätere Videosammlung inklusive Metadaten und Frames dokumentiert. Externer Textlink, kein neuer Embed und kein erfundener MP4-Pfad.

Route: `/hochzeit-recklinghausen/`, ebenso mit `/en/` und `/nl/`. Hochzeit-Landingpage verwendet nun `landingRefs` und damit die normale verlinkte Projektkarte.

## Heiratsantrag auf Schloss Hugenpoet

Original: [Heiratsantrag](https://flyingstars.art/heiratsantrag-sie-hat-ja-gesagt), erneut per HTTP 200 abgerufen. Der erste Browser-Textabruf lief in einen Timeout; der direkte Originalabruf war erfolgreich.

- Kopf: 10.09.2024, Schloss Hugenpoet in Essen, 220 Drohnen. Keine öffentlich benannten Personen ergänzen.
- „Über die Show“: Violinistin begleitet die künftige Braut vom Innenhof durchs Schloss; Partner wartet im Garten; 10.09. ist laut Bericht gemeinsamer Geburtstag.
- Schmuckschatulle öffnet sich, Ring bewegt sich an den Finger einer Hand; Frage „Do you want to be my Forever?“, Antwort Ja, Freund:innen und Familie als Überraschungsgäste, weitere Motive danach. Kein wörtliches Kunden-Testimonial daraus gemacht.
- Foto: [Heiratsantrag_Headerbild.jpg](https://flyingstars.art/wp-content/uploads/2025/07/Heiratsantrag_Headerbild.jpg), 2063 × 1303, Hand mit Ring aus Drohnen über Baumkronen. Keine weiteren Bilder behauptet, keine Galerie aufgefüllt.
- Im Original eingebetteter Film: [YouTube JhOLT_DfA8M](https://www.youtube.com/watch?v=JhOLT_DfA8M), in der Videosammlung als reale 4:3-Quelle mit Frames dokumentiert. Textlink wahrt das Originalformat.

Route: `/heiratsantrag-hugenpoet/`, auch EN/NL. Verlinkt aus Hochzeit und dem vorhergehenden neuen Case.

## L’Oréal × Prada Paradoxe

Original: [Prada Paradoxe](https://flyingstars.art/loreal-prada-paradoxe), erneut per HTTP 200 abgerufen. Der Fragebogen bestätigt zusätzlich 350 Drohnen und die Priorität dieser Referenz.

- Kopf: 11.10.2023, Rheinturm Düsseldorf, L’Oréal Deutschland / Prada, 350 Drohnen.
- „Die Anfrage“: Influencer-Event für Prada Paradoxe im Rheinturm, Suche nach geeigneter Fläche in der Stadt.
- „Die Vorbereitung“: Austausch mit Stadt und Eigentümer:innen, geeigneter Flugort 1,5 km vom Event entfernt, Blick vom Rheinturm; Designabstimmung mit Deutschland und Paris.
- Storyboard: PARADOXE, Mobile aus Flacons, PRADA, 3D-Flacon. Keine Reichweitenzahl, Konversion, Superlative oder nicht belegte Kundenstimme ergänzt. Die unpräzise Konzernzuordnung des alten Texts wurde nicht übernommen.
- [prada1.png](https://flyingstars.art/wp-content/uploads/2024/07/prada1.png), 701 × 614, Produktvorlage. Als Vorlage bezeichnet, nicht als Showfoto.
- [prada2.png](https://flyingstars.art/wp-content/uploads/2024/07/prada2.png), 614 × 658, fotografierte dreidimensionale Drohnenformation des Flacons.
- [Prada_Cover_img.jpg](https://flyingstars.art/wp-content/uploads/2024/07/Prada_Cover_img.jpg), 1920 × 985, Formation über der Stadt mit Rheinturm. Diese drei Originalbilder tragen die Geschichte und Galerie. Niedrige Auflösung wird nicht durch ein erfundenes hochauflösendes Original ersetzt.
- Im Original eingebetteter Film: [YouTube m2K9VoelZYY](https://www.youtube.com/watch?v=m2K9VoelZYY), 15 Sekunden laut Videosammlung. Externer Originalfilm-Link.

Route: `/loreal-prada-rheinturm/`, auch EN/NL. Der vorhandene Eintrag wird erweitert; die Werbe-Landingpage verlinkt ihn automatisch. Auf Werbung ersetzt die vorhandene ausgearbeitete Ford-Fallstudie Spotify. Spotify bleibt in der vollständigen Referenzauswahl.

## Grenzen des Materials und der Umsetzung

Die neuen Cases haben keine originalen Formationsdateien und keine registrierten eigenen Hero-Loops. Das Schema erlaubt deshalb fehlende `formation` und `heroVideo`; die Template-Sections entstehen nur bei vorhandenen Daten. `gallery` darf fehlen oder leer sein. Ungültige vorhandene Werte bleiben Fehler. `videoLink` verlinkt vorhandene Originalfilme ohne neue Drittanbieter-Anfragen beim Laden der Seite. Die vier bestehenden Showcase-Inhaltsdateien bleiben bytegleich. Ihr Verhalten einschließlich Video, Formation, Galerie und nächstem Projekt bleibt erhalten; nur die Gesamtzahl in der gemeinsamen Navigation wächst von vier auf sieben.

Siemens Mobility am Wannsee ist eine Outdoor-Show und kein Ersatz für Siemens Hannover Messe. Die Indoor-Videosammlung belegt ein Siemens-Bühnenvideo, aber keine vollständige Projektdokumentation für Hannover/Triple Z. Ohne eindeutig zugeordnete Bilder, Briefing und konkrete Projektdaten entsteht hier kein erfundener Indoor-Case. Die Lieferaufgabe steht an `landingSpotlight#einsatzorte` in allen drei Sprachfassungen.

Die drei neuen Übersetzungen sind maschinelle Entwürfe, je neuem Textfeld als `machine-new` in der Provenienz geführt. FlyingStars/Moritz müssen sie prüfen. Die Quellseiten belegen Inhalte; die endgültigen Nutzungsrechte für Relaunch-Bilder und Filme bestätigt FlyingStars.
