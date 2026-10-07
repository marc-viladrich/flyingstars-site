# Show-Konfigurator (Prototyp)

Stand: 7. Oktober 2026, vierte Fassung. Die Route ist `/show-konfigurator/`, nicht verlinkt und mit `noindex`. Der Konfigurator ist ein Vorschlag an FlyingStars und ersetzt den Preisrechner der Referenz nicht.

## Das Modell: zwei Entscheidungen, die sich nicht gegenseitig verändern

- **Anlass** (Hochzeit, Jubiläum, Launch, Kultur, Silvester) bestimmt, **was** am Himmel steht: zwei Beispielmotive und den Anlass in der Anfrage. Er verändert weder den Regler noch den Preis.
- **Wie aufwendig?** hat eine Stufe je Paket und bestimmt, **wie**: Paket, Drohnenzahl, Art der Bewegung und damit den Preis. Der Preis ändert sich genau dann, wenn der Regler sich bewegt.

| Stufe | Paket | Drohnen | Preis | Enthalten (Wortlaut der Paketbeschreibungen) |
|---|---|---|---|---|
| Klassisch in 2D | SPARK | 100 | ab 7.900 € | vordefinierte Formationen wie Herzen oder Ringe und bis zu vier eigene Elemente |
| Mit 3D | HORIZON | 200 | ab 15.900 € | alles aus SPARK plus individuelle 2D-Animationen und einfache 3D-Elemente |
| Komplexes 3D | ODYSSEY | 300 | ab 34.900 € | alles aus HORIZON plus komplexe 3D-Animationen und volumetrische Effekte |

Die Preise kommen unverändert aus `priceFor()` in `src/content/show-packages.ts`. Publikum, Musik, Storytelling, Film und eigener Text sind bewusst nicht enthalten. Sie kommen später als sichtbare, eigene Preistreiber zurück, zum Beispiel hinter einem Aufklapper.

## Warum so (Marcs Rückmeldungen)

1. **Erste Fassung, acht Bedienblöcke:** viel zu komplex. Daraus wurden zwei Entscheidungen plus Preis.
2. **Zweite Fassung:** Anlässe setzten unsichtbar Preistreiber. Dieselbe 3D-Maske kostete 34.900 € oder 64.600 €. Daraus folgte: kein verborgener Zustand, eine Stufe je Paket.
3. **Dritte Fassung:**
   - Die Show-Schleife mit vielen Textmotiven versteckte die Motive; die Bokkenrijders-Maske war nicht auffindbar.
   - SPARK wirkte schon individuell, der Unterschied zu HORIZON war kaum zu sehen.
   - Der Sternenhimmel kam bei allen Anlässen vor.
   - Der 3-2-1-Countdown war zu schnell, um realistisch zu sein.
   - Die Mausreaktion brachte nichts und kostete Leistung.
   - Daraus folgte die vierte Fassung (diese): **ein Motiv, drei Ausbaustufen**. Bilder statt Text, keine automatische Schleife.

## Die Vorschau: ein Motiv, drei Ausbaustufen

Jeder Anlass hat zwei Motive. Die Knöpfe unter dem Bild wechseln zwischen ihnen. Jedes Motiv hat je Paket eine eigene Fassung, und der Regler verwandelt dasselbe Motiv in seine nächste Fassung:

- **SPARK** = Vorlage in 2D
- **HORIZON** = ein volles 3D-Objekt
- **ODYSSEY** = mehrere 3D-Objekte oder eine 3D-Animation

| Anlass | Motiv | SPARK (100 Drohnen) | HORIZON (200) | ODYSSEY (300) |
|---|---|---|---|---|
| Hochzeit | Herz | Herz als Umriss | volles 3D-Herz | 3D-Herz mit kleinen Herzen (FlyingStars' eigene Herzformation) |
| | Ringe | Antrag (nach FlyingStars' Antragsformation), daraus werden zwei Ringe | ineinander verschlungene 3D-Ringe | 3D-Ringe im Funkenregen |
| Jubiläum | Wappen | Wappenschild | 3D-Wappen mit eurer Zahl | 3D-Wappen mit Krone und Sternenkranz |
| | Wahrzeichen | Beispiel: Doppelbock-Fördergerüst von Zeche Zollverein | Fördergerüst in 3D | 3D-Fördergerüst mit aufsteigenden Funken |
| Launch | Rakete | Rakete als Umriss | 3D-Rakete (Drahtgitter) | 3D-Rakete hebt mit Abgaswolke ab |
| | Logo | Beispiel-Logo (FlyingStars-Zeichen) | Beispiel-Logo in 3D | Beispiel-Logo entsteht aus einer Funkenkugel |
| Kultur | Maske | Theatermasken Komödie/Tragödie | 3D-Maske | 3D-Maske aus der echten Bokkenrijders-Show-Datei |
| | Vorhang | Vorhang zu | Vorhang auf für einen 3D-Stern | Vorhang auf für 3D-Sternenregen |
| Silvester | Feuerwerk | Feuerwerksstern | 3D-Feuerwerkskugel | drei 3D-Feuerwerke |
| | Uhr | Uhr läuft ruhig auf zwölf | 3D-Uhr schlägt zwölf | 3D-Uhr zerfällt in Feuerwerk |

- **Bewegung:** Jede Änderung spielt einmal ab. Mehrteilige Fassungen, etwa der Antrag oder der Vorhang, verwandeln sich ruhig (2 bis 2,6 s Pause je Bild). 3D-Fassungen drehen sich danach einmal in 5,5 s um ihre eigene Achse und kommen zur Ruhe. Bühne und Vorhang bleiben dabei stehen, nur das Objekt dreht sich.
- **Leistung:** Sobald nichts mehr in Bewegung ist, zeichnet die Fläche keine Frames mehr (`data-running="false"`). Es gibt keine Mausreaktion, Leuchthöfe sind vorgerendert, die Pixeldichte ist auf 1,5 begrenzt. Gemessen bei 300 Drohnen während der Drehung, mit 2× Pixeldichte:
  - Chromium: 60 fps
  - Chromium mit 6-fach gedrosselter CPU: 58 fps
  - WebKit (Safari-Engine): 60 fps
- **Drohnenzahl sichtbar:** Jede Fassung nutzt genau die Drohnen ihres Pakets. Die Bildbreite wächst mit der Wurzel der Drohnenzahl, sodass 100 Drohnen das Bild bei 58 % der Größe von 300 zeigen.
- **Herkunft der Formen:**
  - Herzen stammen aus FlyingStars' Herzformationen, die Maske aus der echten Bokkenrijders-Show-Datei, das Logo ist das FlyingStars-Zeichen.
  - Antrag, Ringe, Wappen, Fördergerüst, Rakete, Masken, Vorhang, Uhr und Feuerwerk sind Linienzeichnungen und daraus gebaute 3D-Körper (extrudierte Umrisse, Drehkörper, Drahtgitter) in `src/scripts/show-shapes.js`, ohne Zufall.
  - Pausiert oder bei reduzierter Bewegung erscheint direkt das fertige Bild.

## Die Anfrage

Der Anfrageknopf übergibt Paket, Drohnenzahl und Anlass sowie eine Zusammenfassung als bearbeitbaren Nachrichtenentwurf: Anlass, Stufe mit Paket und Einstiegspreis, Beispielmotive. Mobil stehen Paket, Preis und „Anfragen“ in einer festen Leiste.

## Offene Fragen an FlyingStars

1. Passt die Zuordnung „2D-Vorlage = SPARK, ein 3D-Objekt = HORIZON, mehrere 3D-Objekte oder 3D-Animation = ODYSSEY“ zur Praxis?
2. Können die Beispielmotive als Vorschau stehen, insbesondere die Formation aus der Bokkenrijders-Show?
3. Welche Publikumsgrößen, Musik- und Storytelling-Optionen sollen als sichtbare Preistreiber dazukommen?
4. Welche Katalogmotive gibt es wirklich? Passt das Fördergerüst von Zollverein als Wahrzeichen-Beispiel, oder ein anderes?

## Prüfen

- `scripts/show-geometry.test.mjs` prüft:
  - exakte Punktzahlen aller Formen bei 100, 200 und 300 Drohnen
  - zwei Motive je Anlass mit je drei eigenen Fassungen
  - keine geteilten Fassungen zwischen den Anlässen
- `tests/show-configurator.spec.ts` prüft:
  - alle 30 Fassungen: Paket, Preis und genaue Drohnenzahl
  - Der Anlass ändert weder Regler noch Preis.
  - Dasselbe Motiv wird mit dem Paket größer.
  - Die Animation kommt nach der Drehung zur Ruhe.
  - Motivwechsel per Tastatur
  - Anfrageknopf im ersten Bildschirm
  - Übergabe ins Formular
