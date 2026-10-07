# Show-Konfigurator (Prototyp)

Stand: 7. Oktober 2026, siebte Fassung. Die sechste Fassung ist als Tag `konfigurator-v6` erhalten. Die Route ist `/show-konfigurator/`, nicht verlinkt und mit `noindex`. Der Konfigurator ist ein Vorschlag an FlyingStars und ersetzt den Preisrechner der Referenz nicht.

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

Jeder Anlass hat zwei Motive (Knöpfe unter „Anlass“ in der linken Spalte, seit der achten Fassung alles an einem Ort). Der Regler verwandelt dasselbe Motiv in seine Fassung für das Paket:

- **SPARK:** ein 2D-Bild mit sanfter Bewegung: der Stern dreht sich, die Masken wiegen sich, die Rakete hat eine flackernde Flamme, die Zeiger laufen, Lichtschimmer auf allem.
- **HORIZON:** ein 3D-Objekt, das sich weiter selbst bewegt.
- **ODYSSEY:** eine kurze Geschichte in Akten mit komplexer 3D-Animation und fließenden Effekten. Das entspricht „Narratives Storytelling mit dramaturgischer Kurve“ aus der ODYSSEY-Beschreibung.

| Anlass | Motiv | SPARK (100 Drohnen) | HORIZON (200), Eigenbewegung | ODYSSEY (300), Akte |
|---|---|---|---|---|
| Hochzeit | Herz | Herz als Umriss | volles 3D-Herz, leuchtet ruhig atmend auf | ein Herz → Amors Pfeil fliegt im Bogen hinein und bleibt stehen wie in der klassischen Illustration → das Herz wird voll → kleine Herzen kreisen |
| | Ringe | zwei Ringe ineinander (wie ein Venn-Diagramm), Lichtlauf | verschlungene 3D-Ringe mit Lichtlauf | ein Ring → findet den zweiten → sie verschlingen sich in 3D, umgeben von Funkeln |
| Jubiläum | Wappen | eigenes Vereinswappen: Fluss, wehende Fahne, Stern | 3D-Wappen mit eurer Zahl, die Fahne weht | aus dem Stern im Wappen wird eure Zahl → Krone und langsam kreisender Sternenkranz |
| | Wahrzeichen | Beispiel: Berliner Fernsehturm, rotes Warnlicht blinkt | 3D-Fernsehturm, Licht läuft um die Kugel, rotes Warnlicht | der Turm → sendet (Wellen breiten sich in Licht aus) → wird zum Brandenburger Tor |
| Launch | Rakete | Rakete mit flackernder Flamme, schwebt | 3D-Rakete mit Flamme schwebt und dreht sich | startklar → hebt ab und zieht ihre funkelnde Spur → aus der Spur wird ein 3D-Mond, die Rakete landet → sie fliegt weiter um die Sonne, Planeten ziehen ihre Bahnen |
| | Logo | Beispiel-Logo, Licht läuft um den Ring | 3D-Logo mit Lichtschimmer | ein Funkenwirbel dreht sich schneller und das Logo entsteht in derselben Drehrichtung → Wirbel → Ring aus Licht → … (Schleife) |
| Kultur | Maske | die klassischen Theatermasken, sie wiegen sich gegeneinander | die Masken in 3D | Komödie → Tragödie → Teufel aus der echten Bokkenrijders-Show-Datei |
| | Vorhang | Vorhang im Luftzug | der Vorhang öffnet sich sichtbar → ein 3D-Stern löst sich heraus | der Vorhang öffnet sich → aus dem Vorhang fällt Goldregen → ein Stern steigt über dem Regen auf |
| Silvester | Feuerwerk | Feuerwerksstern, der sich dreht | drei 3D-Feuerwerkskugeln öffnen sich nacheinander | Feuerwerk → die Funken sammeln sich zur Silvesterkugel → sie sinkt → Ring → Knoten aus Licht |
| | Uhr | die Zeiger laufen auf zwölf | 3D-Uhr, die Zeiger laufen | fünf vor zwölf → die Funken schwärmen aus → sie schreiben das neue Jahr → wirbeln auf zwei Bahnen um die Uhr → die Uhr wird zur Champagnerflasche, der Korken knallt und fliegt mit Schaumspur wie die Rakete |

### Objektpermanenz und fließende Übergänge (siebte Fassung)

Marcs wichtigster Punkt zur sechsten Fassung: Objekte müssen erhalten bleiben, Übergänge müssen fließen. Innerhalb einer ODYSSEY-Geschichte ist die Drohnenzahl gleich, die Verwandlung soll also genauso organisch wirken wie ein Anlasswechsel bei SPARK.

- **Ursache:** Die optimale Zuordnung lief bei jedem Akt neu über alle Drohnen. Raketendrohnen wurden so zu Monddrohnen, Pfeildrohnen zu Herzdrohnen. Dazu dimmten die Lichter im Flug, und Funkel-Effekte schalteten Drohnen fast ganz ab. Beides wirkte, als verschwänden Punkte und tauchten woanders wieder auf.
- **Teile:** Jeder Akt benennt seine Teile (`part(name, pts, { rigid })` in `show-scenes.js`). Eine Drohne bleibt in ihrem Teil, solange es den Teil gibt. Starre Teile wie Rakete und Pfeil fliegen als ein Stück, jede Drohne behält ihren Platz darin. Neu zugeordnet werden nur Drohnen, deren Teil endet oder beginnt, und zwar optimal (rechteckige Ungarische Methode).
- **Rakete:** Sie fliegt im zweiten Akt durchgehend weiter und zieht die Flammendrohnen als funkelnde Spur hinter sich her. Sie richtet sich vor der Landung auf. Aus genau diesen Spurdrohnen wird im dritten Akt der Mond.
- **Pfeil:** Er fliegt als starres Stück im Bogen ins Herz. Beim Treffer rücken nur seine Drohnen im Herzinneren zu Spitze und Federn.
- **Übergänge wie im Vercel-Prototyp:** Starts sind leicht versetzt, aber nur für Drohnen, die wirklich fliegen. Neue Drohnen fliegen von außen ein wie Sternschnuppen, überzählige fliegen hinaus. Lichter dimmen nicht mehr im Flug. Effekte gehen nie unter 35–50 % Helligkeit.
- **Tempo:** Die Vorschau läuft im Zeitraffer, ungefähr dreimal so schnell wie eine echte Show. Der Physiktest prüft weiter, dass jede Bewegung glatt ist, begrenzt bleibt und nie springt.
- **Lichtschimmer** auf allen HORIZON- und ODYSSEY-Fassungen. Raumtiefe wird zusätzlich über Helligkeit gezeigt (hintere Drohnen dunkler).
- **Akte:** Pfeile ‹ › und ↻ schalten zwischen den Akten einer Geschichte vor und zurück.
- **Logo:** Die Geschichte läuft als Schleife: Funkenwirbel → Logo → Wirbel → Ring aus Licht in 3D → …
- **Silvester:** Die alte Feuerwerksgeschichte ist ersetzt durch eine volumetrische: Die Silvesterkugel sinkt, öffnet sich um Mitternacht zum Ring und verschlingt sich zum Knoten aus Licht.

### Achte Fassung (Marcs Rückmeldung zur siebten)

- **Tempo:** Paketwechsel so schnell wie ein Anlasswechsel. Die Flugzeit liegt jetzt bei 1,1 bis 3,2 Sekunden (vorher bis 5), die Planungsgrenzen bei 1,8 Einheiten/s und 3 Einheiten/s². Der Physiktest prüft mit Reserve gegen 2,6 und 5,5. Neue Drohnen kommen von einem näheren Ring außerhalb des Bildes.
- **Heller:** Lichteffekte hellen nur noch auf (Schimmer, Funkeln, Lichtlauf zwischen 0,8 und etwa 1,4). Über 1 vergrößert sich der Leuchthof und der Kern wird weißer. Die Tiefenabdunklung ist schwächer (hinten 78 % statt deutlich dunkler).
- **Herz:** ruhiges Atmen (2,6 s) statt Doppelblitz.
- **Motivwahl** in der linken Spalte unter „Anlass“.
- **Akte im Kreis:** Nach dem letzten Akt kommt mit › wieder der erste, mit ‹ vom ersten der letzte.
- **Vorhang:** Jede Linie des Vorhangs behält ihre Drohnen bei jeder Öffnung, darum gleiten die Drohnen beim Öffnen sichtbar zur Seite (kein Springen zwischen Linien).
- **Wappen:** eigener Entwurf im Stil eines Vereinswappens (erhöhte Mitte, Fluss, Fahne, Stern), bewusst kein bestehendes Vereinswappen.
- **Rakete im Sonnensystem:** Aus der Ferne braucht sie weniger Drohnen; die übrigen fliegen zur Sonne. Umlaufbahnen laufen über 2,5 Sekunden sanft an (sonst Beschleunigungsspitze bei der Ankunft).

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
| Chromium mit 6-fach gedrosselter CPU | 48–53 fps (achte Fassung, vorher 56–59) |
| WebKit (Safari-Engine) | 60 fps |

- Beim Wechsel der Szene gibt es einen einzelnen längeren Frame: etwa 40 ms normal, etwa 250 ms bei 6-facher Drosselung. Er fällt, bevor sich die Drohnen bewegen.
- Es gibt keine Mausreaktion, Leuchthöfe sind vorgerendert, die Pixeldichte ist auf 1,5 begrenzt.
- Seit der achten Fassung bewegt sich auch SPARK sanft weiter und zeichnet darum laufend (100 Drohnen).
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
  - SPARK und HORIZON bewegen sich nach dem Aufbau weiter.
  - Die Akte laufen im Kreis vor und zurück.
  - ODYSSEY erzählt in Akten und lässt sich wiederholen.
  - Nach schnellem Umschalten leuchten nie zu viele Drohnen.
  - Tastatur, erster Bildschirm, Übergabe ins Formular

Offen: Die optimale Zuordnung für 300 Drohnen kostet beim Umschalten einmalig etwa 70 ms auf einem schnellen Rechner (vor dem Flug, kein Ruckeln währenddessen). Auf schwachen Geräten wäre ein Web Worker der nächste Schritt.
