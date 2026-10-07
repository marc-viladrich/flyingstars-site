# Show-Konfigurator (Prototyp)

Stand: 7. Oktober 2026, sechste Fassung. Die Route ist `/show-konfigurator/`, nicht verlinkt und mit `noindex`. Der Konfigurator ist ein Vorschlag an FlyingStars und ersetzt den Preisrechner der Referenz nicht.

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

Jeder Anlass hat zwei Motive (Knöpfe unter dem Bild). Der Regler verwandelt dasselbe Motiv in seine Fassung für das Paket:

- **SPARK:** ein ruhiges 2D-Bild. Wenn es steht, bewegt sich nichts mehr.
- **HORIZON:** ein 3D-Objekt, das sich weiter selbst bewegt.
- **ODYSSEY:** eine kurze Geschichte in Akten mit komplexer 3D-Animation und fließenden Effekten. Das entspricht „Narratives Storytelling mit dramaturgischer Kurve“ aus der ODYSSEY-Beschreibung.

| Anlass | Motiv | SPARK (100 Drohnen) | HORIZON (200), Eigenbewegung | ODYSSEY (300), Akte |
|---|---|---|---|---|
| Hochzeit | Herz | Herz als Umriss | volles 3D-Herz, leuchtet im Takt auf | ein Herz → Amors Pfeil fliegt im Bogen hinein und bleibt stehen wie in der klassischen Illustration → das Herz wird voll → kleine Herzen kreisen |
| | Ringe | zwei Ringe ineinander (wie ein Venn-Diagramm) | verschlungene 3D-Ringe mit Lichtlauf | ein Ring → findet den zweiten → sie verschlingen sich in 3D, umgeben von Funkeln |
| Jubiläum | Wappen | Wappenschild | 3D-Wappen mit eurer Zahl, Lichtschimmer | Wappen → die Zahl tritt hervor → Krone und langsam kreisender Sternenkranz |
| | Wahrzeichen | Beispiel: Berliner Fernsehturm | 3D-Fernsehturm, Licht läuft um die Kugel, rotes Warnlicht | der Turm → sendet (Wellen breiten sich in Licht aus) → wird zum Brandenburger Tor |
| Launch | Rakete | Rakete als Umriss | 3D-Rakete schwebt und dreht sich | startklar mit funkelnder Flamme → hebt nach rechts oben ab, die Spur bleibt stehen und funkelt → landet auf dem Mond |
| | Logo | Beispiel-Logo | 3D-Logo mit Lichtschimmer | ein langsamer Funkenwirbel dreht sich ein und wird zum Logo |
| Kultur | Maske | die klassischen Theatermasken: Tragödie hinten, Komödie davor | die Masken in 3D | Komödie → Tragödie → Teufel aus der echten Bokkenrijders-Show-Datei |
| | Vorhang | Vorhang zu | Vorhang auf für einen 3D-Stern | Vorhang auf, der Stoff bewegt sich leicht, Goldregen fällt in Licht → ein Stern steigt auf |
| Silvester | Feuerwerk | Feuerwerksstern | eine 3D-Kugel öffnet sich immer wieder | drei Raketenspuren leuchten auf → Kugel, Ring, Kugel öffnen sich nacheinander |
| | Uhr | fünf vor zwölf | 3D-Uhr, die Zeiger laufen | die Zeiger laufen auf zwölf → die Uhr funkelt |

### Nur, was echte Drohnen können

Marcs Rückmeldung zur fünften Fassung: Ein Herz kann nicht im Takt pulsieren, ein Logo kann sich nicht verbiegen, Drohnen können nicht aus dem Nichts aufleuchten und mit Abgas- oder Funkentempo davonschießen. Deshalb gilt jetzt:

- **Bewegung:** Drohnen bewegen sich nur glatt, mit begrenzter Geschwindigkeit und Beschleunigung. Sie springen nie, auch nicht im Dunkeln.
- **Effekte mit Licht:** Herzschlag, Funkeln, Regen, Flamme und Wellen entstehen nur mit Licht auf Drohnen, die an ihrem Platz bleiben: Lichtlauf, Funkeln, Aufleuchten. So machen es echte Shows.
- **Feuerwerk:** Es öffnet und schließt sich langsam aus einer kompakten Kugel. Das Schließen geschieht dunkel.
- **Unbenutzte Drohnen** warten dunkel in einer Ebene hinter dem Bild und fliegen dorthin und zurück. Sie starten nicht mehr vom Boden.
- **Fortlaufende Bewegung:** Eine neue Flugbahn übernimmt die aktuelle Geschwindigkeit jeder Drohne, statt sie schlagartig zu stoppen.
- **Grenzen:** Die Flugdauer ergibt sich aus Geschwindigkeits- und Beschleunigungsgrenzen (`LIMITS` in `show-flight.js`, etwa 8 m/s und 5 m/s² bei einem 300-Drohnen-Bild).
- **Test:** `tests/show-physics.spec.ts` spielt alle 30 Fassungen mit simulierter Zeit ab und misst jede Drohne in jedem Frame. Der alte pulsierende Herzschlag fällt damit nachweislich durch (0,9 statt höchstens 0,5).

### Wie die Drohnen fliegen (`src/scripts/show-flight.js`)

Echte Shows fliegen anders als eine Animation, bei der jeder Punkt irgendwohin springt:

- **Zuordnung:** Jede Drohne bekommt ihren Platz über eine optimale Zuordnung (Ungarische Methode, kleinste Summe der quadrierten Wege). Ganze Schwärme kreuzen sich deshalb nicht. Für 300 Drohnen dauert das etwa 8 ms.
- **Takt:** Alle starten und landen gleichzeitig. Die Flugdauer ergibt sich aus dem längsten Weg bei begrenzter Geschwindigkeit und liegt zwischen 2,4 und 5 s. Die Bewegung ist am Anfang und Ende sanft (Smootherstep).
- **Strömung:** Unterwegs folgen die Bahnen einem divergenzfreien Strömungsfeld (ABC-Flow, eine stationäre Lösung der Euler-Gleichungen). Benachbarte Drohnen ziehen dadurch in gemeinsamen Strömen wie ein Schwarm.
- **Licht:** Während des Flugs dimmen die Lichter auf die Hälfte, wie in FlyingStars' eigenen Videos.
- **Mehr oder weniger Drohnen:** Kommen Drohnen hinzu, kommen sie dunkel aus der Warteposition hinter dem Bild. Werden es weniger, fliegen alle überzähligen dorthin zurück, auch die einer Szene, die mitten im Flug abgewählt wurde.

Kalibriert ist das an FlyingStars-Videos (Heiratsantrag, Hochzeitsüberraschung, 75 Jahre Eisenhüttenstadt, Extraschicht Duisburg):

- Linienzeichnungen mit wenigen Farben
- 2D-Animation als bewegter Bildteil, etwa Amors Pfeil, der ins Herz fliegt
- Volumen als Gitterkörper
- ruhige Übergänge

### Leistung

Gemessen auf den drei aufwendigsten Geschichten mit 300 Drohnen in Bewegung, 2× Pixeldichte:

| Browser | Bildrate |
|---|---|
| Chromium | 60 fps |
| Chromium mit 6-fach gedrosselter CPU | 56–59 fps |
| WebKit (Safari-Engine) | 60 fps |

- Beim Wechsel der Szene gibt es einen einzelnen längeren Frame: etwa 40 ms normal, etwa 250 ms bei 6-facher Drosselung. Er fällt, bevor sich die Drohnen bewegen.
- Es gibt keine Mausreaktion, Leuchthöfe sind vorgerendert, die Pixeldichte ist auf 1,5 begrenzt.
- SPARK zeichnet nach dem Aufbau keine Frames mehr.
- Pausiert oder bei reduzierter Bewegung erscheint direkt der letzte Akt in Ruhe. „Nochmal ansehen“ spielt eine Geschichte erneut ab.

## Die Anfrage

Der Anfrageknopf übergibt Paket, Drohnenzahl und Anlass sowie eine Zusammenfassung als bearbeitbaren Nachrichtenentwurf: Anlass, Stufe mit Paket und Einstiegspreis, Beispielmotive. Mobil stehen Paket, Preis und „Anfragen“ in einer festen Leiste.

## Offene Fragen an FlyingStars

1. Passt die Zuordnung „2D-Vorlage = SPARK, ein 3D-Objekt = HORIZON, mehrere 3D-Objekte oder 3D-Animation = ODYSSEY“ zur Praxis?
2. Können die Beispielmotive als Vorschau stehen, insbesondere die Formation aus der Bokkenrijders-Show?
3. Welche Publikumsgrößen, Musik- und Storytelling-Optionen sollen als sichtbare Preistreiber dazukommen?
4. Welche Katalogmotive gibt es wirklich? Passt das Fördergerüst von Zollverein als Wahrzeichen-Beispiel, oder ein anderes?

## Prüfen

- `tests/show-physics.spec.ts` prüft alle 30 Fassungen auf Geschwindigkeit und Beschleunigung jeder Drohne.
- `scripts/show-flight.test.mjs` prüft:
  - Die Zuordnung ist optimal.
  - Die Ankunft ist exakt.
  - Flugzeiten halten die Grenzen ein.
  - Das Strömungsfeld ist divergenzfrei.
- `scripts/show-geometry.test.mjs` prüft:
  - exakte Punktzahlen aller Formen
  - zwei Motive je Anlass mit je drei Fassungen
- `tests/show-configurator.spec.ts` prüft:
  - Paket, Preis und Drohnenzahl
  - SPARK steht still, HORIZON bewegt sich weiter.
  - ODYSSEY erzählt in Akten und lässt sich wiederholen.
  - Nach schnellem Umschalten leuchten nie zu viele Drohnen.
  - Tastatur, erster Bildschirm, Übergabe ins Formular

Offen: Die optimale Zuordnung für 300 Drohnen kostet beim Umschalten einmalig etwa 70 ms auf einem schnellen Rechner (vor dem Flug, kein Ruckeln währenddessen). Auf schwachen Geräten wäre ein Web Worker der nächste Schritt.
