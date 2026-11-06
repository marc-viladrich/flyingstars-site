# Motive aus dem FlyingStars-Katalog im Konfigurator (Runde 24, 05.11.2026)

Am 05.11.2026 hat FlyingStars den internen Motivkatalog gezeigt (https://flyingstars-katalog-web.vercel.app). Dazu kam die Information, dass die meisten geflogenen Shows zwischen 100 und 150 Drohnen liegen. Der Konfigurator braucht deshalb schon in SPARK viel Auswahl. Diese Runde übernimmt 32 Katalogmotive mit 50 Varianten als echte FlyingStars-Formationen.

Die Recherche und die Rohdaten liegen intern im akomo-Hub unter `freelance/clients/flyingstars/20-katalog-und-materialinventar-2026-11-05/`, nicht im Repo.

## Was übernommen ist und was nicht

- **Übernommen:** die Punkte der Formationen (Position, Farbe), gezählt statt aus der Katalogbeschriftung. 41 von 85 Katalogdateien weichen von ihrer Beschriftung ab. Zum Beispiel trägt der Sportwagen die Angabe „150“, hat aber 147 Punkte. Es gilt immer die gezählte Zahl.
- **Nicht übernommen:** Bewegung. Der Katalog enthält statische Punkte. Die Clips (MP4) sind Vorschauen mit zwei- bis fünffachem Tempo und keine Flugspuren. Jede Bewegung im Konfigurator ist von uns abgeleitet und als Vorschau zu verstehen, nicht als geflogene Choreografie.
- **Nicht erfunden:** Fehlt einer Variante die Punktdatei (Golfcaddy 100, Ballons/Konfetti/Sektflasche 100, Taube 150), gibt es sie im Konfigurator nicht. Der leere Regenbogen (210) ist ausgeschlossen. Den kleinen Regenbogen (92 Punkte) haben wir nach Sichtung weggelassen: Er ist ein schräges Punktraster und liest sich nicht als Regenbogen. Der Regenbogen spielt deshalb erst ab 210 Drohnen (201 Punkte).
- **Bewusst draußen:** Wappen (Berliner Bär, Niedersachsen), EU-Flagge und Europakarte, das Rote Kreuz (geschütztes Zeichen), Kundenslogans („STABIL BLEIBEN“), das FlyingStars-Beispiellogo (der Konfigurator hat sein eigenes), Karten mit Standortmarken, das Porträt „Mann mit Schnurrbart“, Tiger & Turtle, Halloween-Motive (kein Anlass dafür) und Fahrzeuge einzelner Kund:innen (Traktor, Planierraupe, Golfcaddy). Grund ist jeweils eine fehlende Nutzungsfreigabe oder ein fehlender Anlass.

## Wie ein Katalogmotiv spielt

| Paket | Fassung |
|---|---|
| SPARK | die Formation mit ihrem Bewegungsprofil (siehe unten). Echte 3D-Formationen wie Kugel, Spirale, Atom, Möbius-Schleife und Pyramide drehen sich schon hier, denn FlyingStars fliegt sie mit 100–160 Drohnen. |
| HORIZON | als Körper: Flache Formationen bekommen eine zweite Ebene dahinter, sobald die Drohnen dafür reichen, und schwenken. 3D-Formationen drehen sich mit der größten Variante, die passt. |
| ODYSSEY | zwei Akte: Licht zeichnet die Form, dann wird sie zum Körper. |

- **Ab wann:** gezählte Punkte der kleinsten Variante, auf Zehner aufgerundet. Ein Motiv mit 72 Punkten spielt ab 100, eins mit 113 ab 120, eins mit 153 ab 160.
- **Größere Varianten:** Mit mehr Drohnen wird die größere Katalogvariante gewählt, wo es eine gibt. Beispiele: Ballons 100 → 150, Atom 147 → 162 → 220, Anstoßende Gläser 72 → 88 → 108 → 148.
- **Reserve:** Drohnen, die eine Formation nicht braucht, warten dunkel hinter der Form, eine Ebene tiefer, und zählen nicht für den Bildausschnitt. Eine Reihe unter dem Bild blitzte beim Start der lebendigen Wolke als Fremdkörper auf. Keine zwei Drohnen stehen an derselben Stelle.
- **Freischalt-Leiter:** Katalogmotive schalten in Zehnerschritten frei. Neben der Spur steht ein ungeleuchteter Lichtpunkt je Schwelle, nicht je Motiv („Drehzahlmesser, Kugel +1 · ab 120 Drohnen“).

## Bewegungsprofile (abgeleitet, `src/scripts/scenes/catalog.js`)

Grundlage ist die Sichtung aller 54 Katalogclips (Recherche `clip-analyse/`). Bewegt wird nur, was FlyingStars' eigene Vorschau zeigt oder der Körper eindeutig nahelegt (Räder, Nadel). Wo der Clip nur Licht zeigt, bewegt sich in SPARK auch nur Licht.

| Profil | Motive | Bewegung | Beleg |
|---|---|---|---|
| drive | Sportwagen | Räder drehen sich um ihre Mitte, Fahrtlinien leuchten nach hinten ab, der Wagen steht | kein Clip; Radkreise geometrisch gefittet, beim Traktor-Clip drehen sich die Räder genauso |
| needle | Drehzahlmesser | die rote Nadel schwingt um ihre Nabe über die Skala und zurück | kein Clip, abgeleitet |
| bob | Ballons | jeder Ballon schwebt einzeln auf und ab, samt Schnur | Clip Ballons 150 |
| clink | Anstoßende Gläser | die Gläser neigen sich zueinander und stoßen an | Clips 72/88/108 |
| blossoms | Zwei Blüten | die Blätter drehen sich um die Mitte der Blüte | Clip Zwei Blüten |
| palm | Palmeninsel | die Wedel wiegen sich leicht | Clip Palmeninsel |
| sail | Schiff | das Schiff wiegt sich auf und ab | Clip Schiff 200 |
| turn | Kugel, Spirale, Wasserball | Drehung um die Hochachse | Clips Kugel, Spirale; Wasserball dreht sich im Plimmiri-Entwurf starr (≈ 5°/s real) |
| swirl, spin | Galaxie, Mandala | Drehung in der Bildebene | Clip Galaxie; Mandala abgeleitet |
| glow | Atom, Möbius-Schleife, Pyramide | Licht läuft über die Bahnen; erst als Körper (HORIZON, ODYSSEY) dreht sich die Form | Clips zeigen nur Licht |
| surf | 3D-Welle | die Fläche wogt | Clips 3D-Welle |
| wave | Wehende Fahnen | eine Welle läuft vom Mast nach außen | abgeleitet; der Clip zeigt wechselnde Länderflaggen (Licht) |
| confetti | Konfetti-Kanone, Sektflasche | Licht schießt aus der Mündung bzw. funkelt am Flaschenhals | Clips Konfetti, Sektflasche (der fliegende Korken ist nicht nachgebaut) |
| breathe, twinkle, rainbow | Herzen, Stern, Regenbogen | ruhiges Atmen, Licht läuft die Zacken bzw. Bögen entlang | Clips Stern, Doppelherz |
| shimmer | alle übrigen, auch Schmetterling und Taube | ein feiner Schein läuft die Linien entlang | Clips Schmetterling, Taube: Licht, kein Flügelschlag |

Alle Profile laufen über `steadyClock()` an und kommen zum Stehen, also ohne Finte (`scripts/show-finte.test.mjs`). Kein Profil funkelt dauerhaft, das hätte als ruhende Wolke gegolten (`scripts/show-clouds.test.mjs`).

## Zuordnung zu den Anlässen

Die Katalogmotive ergänzen die eigenen Motive, sie ersetzen sie nicht. An drei Stellen ist die Katalogformation die neue SPARK-Fassung eines eigenen Motivs: Sektgläser (Anstoßende Gläser), Schmetterling und Spirale. HORIZON und ODYSSEY bleiben dort die eigenen Fassungen.

| Anlass | neu aus dem Katalog |
|---|---|
| Launch | Galaxie, Atom, Drehzahlmesser, Sportwagen, Kugel, Möbius-Schleife, Pyramide (Spirale als SPARK-Fassung) |
| Jubiläum | Ballons, Wehende Fahnen, Golfer, Handschlag, Stern, Konfetti-Kanone |
| Stadtfest | Palmeninsel, Cocktailglas, Bierkrug, Regenbogen, Kuh und UFO, Wasserball, Schiff |
| Hochzeit | Doppelherz, Herz mit Initialen, Friedenstaube, Zwei Blüten, Unendlich-Zeichen (Gläser und Schmetterling als SPARK-Fassung) |
| Kultur | Friedenstaube, 3D-Welle, Kugel, Pyramide, Regenbogen, Lebensbaum, Mandala |
| Winter & Silvester | Sektflasche, Stern, Galaxie, Anstoßende Gläser, Konfetti-Kanone |

Motive in SPARK je Anlass bei 100 / 150 / 190 Drohnen: vorher 3 / 4 / 4, jetzt 4–7 / 7–11 / 8–11.

## Eigener Text: Drohnenbedarf

Die Regel kommt aus dem Katalog: zehn Drohnen je Zeichen, Leerzeichen zählen nicht, auf Zehner gerundet. Unter dem Textfeld steht, wie viele Zeichen bei der gewählten Drohnenzahl passen („8 von 10 Zeichen bei 100 Drohnen“). Braucht der Text mehr, steigt die Drohnenzahl. Damit wechseln sichtbar auch Paket und Preis. Ein Absenken unter den Bedarf hält der Regler fest und sagt warum. Das Feld nimmt höchstens 24 Zeichen, also 240 Drohnen. Der Regler (bis 600) wird dadurch nie unbegrenzt. Die Regel ist eine Vorabprüfung, keine Lesbarkeitsgarantie: Die Schrift plant mit genau den gewählten Drohnen.

## Neu importieren

```sh
node scripts/import-catalog.mjs "<akomo-Hub>/freelance/clients/flyingstars/20-katalog-und-materialinventar-2026-11-05"
node --test scripts/catalog-motifs.test.mjs
```

Die Auswahl steht als `CURATED` im Importskript. Ein Motiv kommt hinzu, indem es dort mit Katalognummer, Bewegungsprofil und Namen in drei Sprachen eingetragen und im Anlass in `src/content/show-configurator.js` mit `catalogMotif()` aufgeführt wird.

## Offene Fragen an FlyingStars

1. Stimmen die gezählten Punktzahlen, oder ist die Beschriftung richtig (z. B. Kuh und UFO: „100“, aber 153 Punkte)?
2. Gibt es für die Katalogclips die Originalanimationen mit Flugspuren? Dann könnten Räder, Flügel und Drehungen aus euren Daten kommen statt aus unserer Ableitung.
3. Dürfen alle hier gezeigten Motive öffentlich als Beispiel stehen?
4. Welche weiteren Kundenpreviews wie Plimmiri dürfen wir als Bewegungsreferenz nutzen?

## Runde 24b (06.11.2026): Formationen aus FlyingStars' Showfotos und Videos

Marc: nicht nur aus dem Katalog, auch aus den Show-Impressionen. Codex hat 459 Bilder gesichtet (191 Drive-Fotos, Frames aus 17 YouTube-Shows) und 142 Motivkandidaten erfasst. Logos, Kundennamen, Slogans, Ortsnamen, Porträts und Regionskarten sind ausgeschlossen. 18 allgemeine Formationen hat Codex ausgelesen: Jede sichtbare Drohne im Bild ist ein Punkt. Die Recherche liegt unter `show-formationen/`, mit Overlay und Nachzeichnung je Motiv zur Kontrolle.

Übernommen sind 15 Formationen, über denselben Import (`SHOWS` in `scripts/import-catalog.mjs`):

| Anlass | Motive aus Shows |
|---|---|
| Launch | Batterie (Licht lädt sie von links nach rechts), Hubschrauber, Flugzeug |
| Jubiläum | Lachendes Gesicht |
| Stadtfest | Strandliege mit Sonnenschirm, Elefant, Hund mit Ball, Zwei Hasen |
| Hochzeit | Hochzeitstorte, Schleifenornament |
| Kultur | Peace-Zeichen |
| Winter & Silvester | Glocke (schwingt), Schneemann, Lebkuchenmann, Zuckerstange (rot-weiß) |

Nicht übernommen: Filmklappe und Bär (Nachzeichnung zu unruhig), Weihnachtsstrumpf (Winter wäre zu lang geworden).

Farben: Kameras färben weiße Drohnen oft violett oder rosa. Darum werden Punkte nahe am mittleren Farbton weiß und nehmen die Paketfarbe an; nur echte Farbgruppen ab vier Punkten bleiben farbig. Zuckerstange und Hund (roter Ball) sind ausdrücklich eingefärbt. Tiefe lässt sich aus einem Foto nicht rekonstruieren, alle Showformationen sind flach (HORIZON setzt die zweite Ebene dazu).

Motive je Anlass in SPARK bei 100 / 150 / 190 Drohnen jetzt: Launch 5/13/14, Jubiläum 6/10/11, Stadtfest 6/12/15, Hochzeit 7/11/11, Kultur 6/10/10, Winter & Silvester 11/12/13. Wächter: am Einstieg jedes Pakets mindestens fünf Motive je Anlass (`scripts/show-unlock.test.mjs`, Marc 06.11.).

Die Wolkenplanung (`planClouds`) ist seit dieser Runde eine dynamische Programmierung. Mit 20 Motiven kostete die alte Suche über alle Teilmengen 190 ms je Aufbau, jetzt unter 1 ms, mit denselben Kosten, derselben Wolkenzahl und derselben ersten Wolke.
