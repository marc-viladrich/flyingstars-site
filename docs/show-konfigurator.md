# Show-Konfigurator (Prototyp)

Stand: 7. Oktober 2026, dritte Fassung. Die Route ist `/show-konfigurator/`, nicht verlinkt und mit `noindex`. Der Konfigurator ist ein Vorschlag an FlyingStars und ersetzt den Preisrechner der Referenz nicht.

## Das Modell: zwei Entscheidungen, die sich nicht gegenseitig verändern

- **Anlass** (Hochzeit, Jubiläum, Launch, Kultur, Silvester) bestimmt, **was** am Himmel steht: Beispielmotive und den Anlass in der Anfrage. Er verändert weder den Regler noch den Preis.
- **Wie aufwendig?** hat eine Stufe je Paket und bestimmt, **wie**: Paket, Drohnenzahl, Art der Bewegung und damit den Preis. Der Preis ändert sich genau dann, wenn der Regler sich bewegt.

| Stufe | Paket | Drohnen | Preis | Enthalten (Wortlaut der Paketbeschreibungen) |
|---|---|---|---|---|
| Klassische Bilder | SPARK | 100 | ab 7.900 € | vordefinierte Formationen wie Herzen oder Ringe und bis zu vier eigene Elemente |
| Mit Bewegung | HORIZON | 200 | ab 15.900 € | alles aus SPARK plus individuelle 2D-Animationen und einfache 3D-Elemente |
| Mit 3D-Animation | ODYSSEY | 300 | ab 34.900 € | alles aus HORIZON plus komplexe 3D-Animationen und volumetrische Effekte |

Die Preise kommen unverändert aus `priceFor()` in `src/content/show-packages.ts`. Publikum, Musik, Storytelling, Film und eigener Text sind bewusst nicht enthalten. Sie kommen später als sichtbare, eigene Preistreiber zurück, zum Beispiel hinter einem Aufklapper.

## Warum so (Marcs Rückmeldungen)

1. **Erste Fassung, acht Bedienblöcke:** viel zu komplex. Daraus wurden zwei Entscheidungen plus Preis.
2. **Zweite Fassung:** Die Anlässe setzten unsichtbar Publikum, Musik und Storytelling. Dieselbe 3D-Maske kostete deshalb je nach Anlass 34.900 € oder 64.600 €. Höhere Stufen zeigten ein einzelnes Standbild, sodass 3D weniger Bewegung bot als die Stufe darunter. Die Anlässe teilten sich die meisten Motive. Daraus folgt das Modell oben: kein verborgener Zustand, eine aufbauende Vorschau und eigene Motive je Anlass.

## Die Vorschau

- **Aufbauende Vorschau:** Je Anlass gibt es eine Motivliste, jedes Motiv mit dem Paket, ab dem es auftaucht (`src/content/show-configurator.js`). Die Vorschau eines Pakets spielt alle Motive bis zu diesem Paket in einer Schleife. Jede höhere Stufe zeigt also alles aus der niedrigeren und mindestens ein neues Motiv. Das prüft ein Unit-Test.
- **Stufenwechsel:** Nach einem Schritt nach oben beginnt die Schleife mit dem neuen Motiv, die Bildunterschrift trägt „Neu in HORIZON“ bzw. „Neu in ODYSSEY“. Die Punkte unter dem Bild zeigen die Motive der Vorschau, sind per Klick und Tastatur bedienbar und markieren neue Motive.
- **Drohnenzahl sichtbar:** Jedes Bild nutzt genau die Drohnenzahl des Pakets. Bei gleichem Drohnenabstand wächst die Bildbreite mit der Wurzel der Drohnenzahl: 100 Drohnen zeigen das Bild bei 58 %, 300 bei 100 % der Größe. Nur der Sternenhimmel bleibt himmelsgroß und wird dichter. Rechts oben steht die Drohnenzahl.
- **Echte und erzeugte Bilder:**
  - Text kommt aus dem Textplaner (`text-formation.js`), das 3D-Herz aus FlyingStars' Herzformationen.
  - Das FlyingStars-Zeichen ist ausdrücklich als „Beispiel-Logo“ beschriftet.
  - Kultur zeigt in ODYSSEY die echte Bokkenrijders-Show-Datei, beschriftet als „Beispiel aus unserer Musical-Show“ und auf 300 Drohnen gleichmäßig ausgedünnt.
  - Ringe, Uhr, Stern, 3D-Ringe und 3D-Feuerwerk erzeugt `src/scripts/show-geometry.js` ohne Zufall und mit exakter Punktzahl.
  - Die Silvester-Jahreszahl wird aus dem Datum berechnet.
- **Pause:** Pausiert oder bei reduzierter Bewegung läuft keine Schleife. Das Feld zeigt das fertige Bild, die Punkte führen von Hand durch die Motive.

| Anlass | SPARK | dazu in HORIZON | dazu in ODYSSEY |
|---|---|---|---|
| Hochzeit | Herz, Initialen, zwei Ringe, „Ja“ | schlagendes Herz, drehendes 3D-Herz | ineinander drehende 3D-Ringe |
| Jubiläum | Sternenhimmel, Jubiläumszahl, Funken, „Danke“ | Zahl zählt hoch, drehender 3D-Stern | Weltkugel wird zur 3D-Zahl |
| Launch | Sternenhimmel, Claim, Funken, Beispiel-Logo | „bald“ wird „jetzt“, drehende Weltkugel | Beispiel-Logo entsteht aus Funken in 3D |
| Kultur | Sternenhimmel, Titel, Funken, „Bravo“ | „Vorhang auf“, drehender 3D-Stern | Teufel aus der Bokkenrijders-Show entsteht aus den Sternen |
| Silvester | Uhr auf zwölf, neues Jahr, Funken, „Prosit“ | Countdown 3-2-1, drehender 3D-Stern | 3D-Feuerwerk ohne Knall |

## Die Anfrage

Der Anfrageknopf übergibt Paket, Drohnenzahl und Anlass sowie eine Zusammenfassung als bearbeitbaren Nachrichtenentwurf: Anlass, Stufe mit Paket und Einstiegspreis, Beispielmotive. Mobil stehen Paket, Preis und „Anfragen“ in einer festen Leiste.

## Offene Fragen an FlyingStars

1. Passt die Zuordnung „2D-Bewegung und einfaches 3D ab HORIZON, komplexes 3D ab ODYSSEY“ zur Praxis?
2. Können die Beispielmotive als Vorschau stehen, insbesondere die Formation aus der Bokkenrijders-Show?
3. Welche Publikumsgrößen, Musik- und Storytelling-Optionen sollen als sichtbare Preistreiber dazukommen?
4. Welche Katalogmotive gibt es wirklich?

## Prüfen

- `scripts/show-geometry.test.mjs`: exakte Punktzahlen, gleichmäßige Verteilung, aufbauende Stufen, verschiedene Motive je Anlass.
- `tests/show-configurator.spec.ts` auf Desktop und Mobil:
  - Preis nur über den Aufwand, für alle 15 Kombinationen
  - Der Anlass bewegt den Regler nicht.
  - Ein Schritt nach oben beginnt mit dem Neuen.
  - Das Bild wird mit mehr Drohnen messbar größer.
  - Tastaturbedienung bei Pause
  - Anfrageknopf im ersten Bildschirm
  - Übergabe ins Formular
