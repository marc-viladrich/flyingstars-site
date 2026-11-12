# Show-Konfigurator (Prototyp)

Stand: 5. November 2026, Runde 24 (Abschnitt ganz unten: Motive aus dem FlyingStars-Katalog, Drohnenbedarf des Textes). Davor sechzehnte Fassung. Frühere Stände sind als Tags erhalten: `konfigurator-v6`, `konfigurator-v8`, `konfigurator-v9`, `konfigurator-v10`. Seit der sechzehnten Fassung ist der Konfigurator eine Komponente (`src/components/configurator/ShowConfigurator.astro`) direkt auf der Preisseite, Anker `#konfigurator`; `/show-konfigurator/` leitet dorthin weiter. Für die Startseite gibt es einen Teaser als sich selbst abspielendes Showreel (`ConfiguratorTeaser.astro`, Abschnitt „Startseiten-Teaser als Showreel“). Der Konfigurator ist ein Vorschlag an FlyingStars.

## Das Modell: zwei Entscheidungen, die sich nicht gegenseitig verändern

- **Anlass** (Hochzeit, Jubiläum, Launch, Kultur, Winter & Silvester, Stadtfest) bestimmt, **was** am Himmel steht: vier oder fünf Motive, die als kleine Show nacheinander laufen, und den Anlass in der Anfrage. Er verändert weder Paket noch Preis.
- **Wie aufwendig?** hat drei Knöpfe, einen je Paket, in der Paketfarbe. Er bestimmt, **wie**: Paket, Drohnenzahl, Art der Bewegung und damit den Preis. Der Preis ändert sich genau dann, wenn ein anderer Knopf gewählt wird.

| Stufe | Paket | Drohnen | Preis | Enthalten (Wortlaut der Paketbeschreibungen) |
|---|---|---|---|---|
| Klassisch in 2D | SPARK | 100 | ab 7.900 € | vordefinierte Formationen wie Herzen oder Ringe und bis zu vier eigene Elemente |
| 3D in Bewegung | HORIZON | 200 | ab 15.900 € | alles aus SPARK plus individuelle 2D-Animationen und einfache 3D-Elemente |
| Erzählte 3D-Show | ODYSSEY | 300 | ab 34.900 € | alles aus HORIZON plus komplexe 3D-Animationen und volumetrische Effekte |

Die Preise kommen aus `priceFor()` in `src/content/show-packages.ts`; seit der zwölften Fassung bestimmt zusätzlich die Drohnenzahl den Preis (siehe unten). Publikum, Musik, Storytelling, Film und eigener Text sind bewusst nicht enthalten. Sie kommen später als sichtbare, eigene Preistreiber zurück, zum Beispiel hinter einem Aufklapper.

## Warum so (Marcs Rückmeldungen)

1. **Erste Fassung, acht Bedienblöcke:** viel zu komplex. Daraus wurden zwei Entscheidungen plus Preis.
2. **Zweite Fassung:** Anlässe setzten unsichtbar Preistreiber. Dieselbe 3D-Maske kostete 34.900 € oder 64.600 €. Daraus folgte: kein verborgener Zustand, eine Stufe je Paket.
3. **Dritte Fassung:**
   - Die Show-Schleife mit vielen Textmotiven versteckte die Motive; die Bokkenrijders-Maske war nicht auffindbar.
   - SPARK wirkte schon individuell, der Unterschied zu HORIZON war kaum zu sehen.
   - Der Sternenhimmel kam bei allen Anlässen vor.
   - Der 3-2-1-Countdown war zu schnell, um realistisch zu sein.
   - Die Mausreaktion brachte nichts und kostete Leistung.
   - Daraus folgte die vierte Fassung: **ein Motiv, drei Ausbaustufen**. Bilder statt Text, keine automatische Schleife.
4. **Neunte Fassung (Marc, nach der achten):** Die Motive werden nicht mehr gewählt, sondern laufen als Folge durch. Begründung: Schon eine SPARK-Show dauert rund zehn Minuten und zeigt viele Bilder, die ineinander übergehen. Genau diese Übergänge zeigen, was eine Show ist. Die Grenze zur dritten Fassung: Die Folge besteht aus drei Bildmotiven desselben Anlasses, nicht aus Textmotiven, und ein Paketwechsel bleibt beim Motiv auf der Bühne. So bleibt der Vergleich „dasselbe Motiv, größeres Paket“ erhalten. ODYSSEY behält sein Alleinstellungsmerkmal: Jedes Motiv bekommt eine eigene Geschichte in Akten.
   - Der Regler wurde zu drei Knöpfen wie im Preisrechner des Vercel-Prototyps. Ein Regler versprach Zwischenstufen, die es nicht gibt.
   - Warmweiße Drohnen leuchten in der Paketfarbe (SPARK Orange, HORIZON Pink, ODYSSEY Blau). Motive mit eigenen Farben behalten sie (Herz, Klee, Gold, Vorhang).
   - Herz-Geschichte neu: Der Pfeil fliegt durch das Herz hindurch, statt stehen zu bleiben. Danach werden daraus zwei Herzen, die sich umkreisen. Die kreisenden kleinen Herzen sind weg.
   - Ringe neu: SPARK zwei Ringe, die sich um die eigene Achse drehen. HORIZON ein Verlobungsring in 3D. ODYSSEY eine Hand, über der der Ring schwebt, bis er auf den Ringfinger gleitet.
   - Masken-Geschichte neu: Komödie, dann tritt die Tragödie dazu, beide verbinden sich zum Theaterzeichen, daraus wird der Bokkenrijders-Teufel.
   - Die Funkwellen des Fernsehturms bewegen sich langsam nach außen und zurück, unabhängig vom Warnlicht.

## Die Vorschau: drei Motive je Anlass, drei Ausbaustufen

Jeder Anlass spielt drei Motive nacheinander, danach beginnt die Folge von vorn. ‹ › schalten Bild für Bild vor und zurück, im Kreis, ↻ beginnt die Show von vorn. Ein Paketwechsel verwandelt das Motiv auf der Bühne in seine Fassung für das neue Paket und spielt von dort weiter. Pausiert oder bei reduzierter Bewegung steht das aktuelle Motiv in Ruhe.

- **SPARK:** 2D-Bilder mit sanfter Bewegung. Sie drehen sich, wiegen sich oder flackern.
- **HORIZON:** 3D-Objekte, die sich weiter selbst bewegen.
- **ODYSSEY:** Jedes Motiv ist eine kurze Geschichte in Akten. Das entspricht „Narratives Storytelling mit dramaturgischer Kurve“ aus der ODYSSEY-Beschreibung.

Jedes Motiv hat einen eigenen Maßstab, sodass es die Bühne füllt. Innerhalb einer Geschichte bleibt der Maßstab gleich; nur Amors Anflug hat einen eigenen Ausschnitt (`frame` am Akt).

| Anlass | Folge | SPARK (100 Drohnen) | HORIZON (200) | ODYSSEY (300), Akte |
|---|---|---|---|---|
| Hochzeit | Ring | zwei Ringe drehen sich um die eigene Achse | Solitär als Körper: Torus-Band und Brillant, dreht sich und kippt | zwei verschlungene Tori → ein Solitär mit Stein → eine Hand, der Ring kippt und gleitet auf den Ringfinger → der Stein funkelt, ein Herz steigt auf |
| | Herz | Herz, atmet in Licht | volles 3D-Herz, ruhig atmend | Amor zielt → der Pfeil fliegt durch das Herz → das Herz wird voll → zwei Herzen umkreisen sich |
| | Sektgläser | zwei Gläser stoßen an | 3D-Gläser, die Perlen steigen in Licht | zwei Gläser → sie stoßen an → die Perlen steigen als Herz auf |
| Jubiläum | Wappen | eigenes Vereinswappen: Fluss, wehende Fahne, Stern | 3D-Wappen mit Zahl, die Fahne weht | aus dem Stern wird eure Zahl → Krone und Sternenkranz |
| | Wahrzeichen | Berliner Fernsehturm, Warnlicht blinkt | 3D, Licht läuft um die Kugel | der Turm → die Funkwellen bewegen sich hinaus und zurück → Brandenburger Tor |
| | Pokal | Pokal, Sterne funkeln darüber | 3D-Pokal dreht sich | der Sockel, Funken sammeln sich → der Pokal wächst → eure Zahl steigt heraus, Konfetti |
| Launch | Glühbirne | Glühbirne, der Faden glimmt | 3D-Glühbirne dreht sich | ein Funke → um ihn formt sich die Glühbirne → sie strahlt (Strahlen reichen hinaus und zurück) |
| | Rakete | Rakete mit flackernder Flamme | Rakete als Körper (Silhouette in zwei Ebenen, Reifen, Finnen) schwebt und dreht sich | startklar auf der Rampe → Zündung, die Rampe fällt weg, die Spur wächst → Orbit um einen Planeten, Kometenschweif → Landung auf dem Mond, Flagge |
| | Logo | Beispiel-Logo, Licht läuft um den Ring | 3D-Logo mit Lichtschimmer | Funkenwirbel → Logo → Wirbel → Ring aus Licht |
| Kultur | Vorhang | Vorhang im Luftzug | Vorhang öffnet sich, ein 3D-Stern löst sich heraus | Vorhang öffnet sich → Goldregen → ein Stern steigt auf |
| | Masken | die Masken wiegen sich gegeneinander | die Masken in 3D | Komödie → die Tragödie tritt dazu → beide verbinden sich → Bokkenrijders-Teufel |
| | Noten | zwei Noten wiegen sich im Takt | die Noten in 3D | ein Ton → zwei Töne → Melodie auf fünf Linien, die Noten hüpfen nacheinander |
| Silvester | Uhr | Zeiger laufen auf zwölf | 3D-Uhr, die Zeiger laufen | fünf vor zwölf → Funken schwärmen aus → das neue Jahr → Bahnen um die Uhr → Champagnerkorken |
| | Feuerwerk | Feuerwerksstern dreht sich | drei 3D-Kugeln öffnen sich nacheinander | Feuerwerk → Silvesterkugel → sie sinkt → Ring → Knoten |
| | Kleeblatt | Glücksklee dreht sich | Glücksklee in 3D | drei Blätter → ein viertes kommt dazu → Klee in 3D, umringt von Funken |

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

### Zehnte Fassung: Körper als Skelett, Geschichten in Bildausschnitten (8. Oktober)

Marcs Rückmeldung zur neunten: Rakete und Verlobungsring in 3D wirken billig. Als Anker wurden 17 FlyingStars-Shows vom YouTube-Kanal katalogisiert (intern: `freelance/clients/flyingstars/06-show-animationen-2026-10/`, nicht im Repo). Befund: Echte Shows zeichnen 3D als Skelett (Würfelkanten, gestapelte Reifen, ein Globus aus Umriss und Meridianen), nie als Punktkugel; Übergänge sind lose Wolken, in denen das neue Bild schon als Vorform steht; ein kleines Teil darf als Objekt fliegen (der Korken), während der Rest steht.

- **Neue Körper** in `show-shapes.js`: `brilliant` (Brillantschliff), `band`/`solitaire`/`torusLink` (Torus-Ringe), `globe` (Umriss, Äquator, zwei drehbare Meridiane), `rocketSolid` (Silhouette in ein oder zwei Ebenen, Reifen, Fenster, Finnen), `launchPad`, `moonHorizon`, `flagStar`, `starField`; alle über `sample3d` (Punkte nach Länge entlang 3D-Polylinien).
- **Ring:** HORIZON ein Solitär als Körper; ODYSSEY zwei verschlungene Tori → Solitär → Hand, auf deren Ringfinger der Ring kippt und gleitet → Herz.
- **Rakete:** HORIZON als Körper; ODYSSEY Rampe → Zündung (die Rampe fällt aus dem Bild, die Welt rückt weg) → Orbit um einen Planeten mit Kometenschweif → Mondlandung mit Flagge. Die Rakete folgt dem Orbit als Bild (dreht sich in der Bildebene entlang der projizierten Bahn), Tiefe kommt aus der Bahn selbst.
- **Engine:** Ein Teil kann `offstage` sein (es verlässt das Bild, zählt nicht für den Ausschnitt; `fitPts` am Beat). Geschichten dürfen mehrere Ausschnitte haben (`frame`): Start und Zündung teilen einen, Orbit und Landung den zweiten. So bleibt die Rakete auf der Rampe groß.
- **Drohnenbudget je Akt (300):** Rakete 120, Spur 60, Welt (Rampe/Planet/Mond) 85, Sterne 35. Ring-Geschichte: Ringe 260 + Sterne 40, auf der Hand: Ring 84, Hand 176, Sterne 40.

### Elfte Fassung: mehr Motive, eigener Text, Animation nach echten Shows (10. Oktober)

Marcs Auftrag: Motive sammeln, die inhaltlich passen, und vor allem die Art der Animation aus echten Shows übernehmen. Gemeint sind subtile, natürlich wirkende 2D-Bewegungen, Übergänge zwischen Formen und Text und Feuerwerk über Licht. Dazu kommt der eigene Text als Wow-Effekt aus dem Vercel-Prototyp, aber nicht statisch. Grundlage sind elf Videoanalysen, Codex' Auswertung von 20 Referenzclips und zwei Web-Bibliotheken. Alles liegt intern unter `freelance/clients/flyingstars/06-show-animationen-2026-10/anker-runde-2/`, nicht im Repo. Die Referenzen dienen als Denkanstoß; kein Motiv ist nachgebaut.

**Neue Motive (je drei Fassungen)**

| Anlass | Motiv | SPARK | HORIZON | ODYSSEY |
|---|---|---|---|---|
| Hochzeit | Ring | zwei Eheringe mit Doppelkontur, Stein funkelt | unverändert (Solitär) | Schmuckkästchen → Ring steigt → Hand → Ring gleitet auf den Ringfinger → Herz |
| | Herz | unverändert | Herztunnel: fünf Herzen in der Tiefe, Licht fließt nach hinten | unverändert |
| | Lotusblüten | – (nicht bei SPARK) | zwei 3D-Blüten drehen sich und gleiten ineinander | Knospen → Blüte → ineinander → verdrillte Kugel aus sechs Bändern mit goldenem Herz |
| | Schmetterling | Lichtschimmer über die Flügel | 3D im Dreiviertelprofil, Flügelschlag ±0,3 rad in 2,6 s | zwei Falter tanzen umeinander → Funken → Herz |
| Jubiläum | Fußball | Schusspose, das Muster im Ball dreht sich (wie in Eisenhüttenstadt) | Gelenkfigur holt aus und schießt, Ball mit Drall | Funken → Spieler → Schuss ins Tor → „Tor!“ → „25“ |
| | Kopfsprung | – (nicht bei SPARK) | Springer taucht im Bogen ein, Wasser wogt, Ringe | Sprungbrett → Absprung → Eintauchen → Ringe → Medaille mit „25“ |
| Launch | QR-Code | Finder-Quadrate und Scanrahmen, Scanlicht | echter Code baut sich Zeile für Zeile auf | Handy mit Nachrichten → Funken → Code im Display → „SCAN ME“, Code steht still |
| | Spirale | flache Spirale, Licht läuft nach innen | konische Helix, Farbwelle steigt | Helix → Torus-Wicklung → Torus, durch den die Drohnen strömen → Möbius-Schleife |
| Kultur | Buch | Licht liest die Zeilen | eine Seite wendet sich in 3D | Buch öffnet sich → Feder schreibt → Zeilen steigen auf → Stern |
| | Musik | unverändert (Noten) | Harfe, Licht zupft die Saiten, Noten kreisen | Glissando → Noten fliegen davon → Notenlinien mit Violinschlüssel |
| | Tanz | Tänzerin, Rocksaum wiegt | Drehung, der Rock als Kegel mit laufendem Volant | Drehung → Rock wird Blüte → Fächer |
| Winter & Silvester | Lichterbaum | Schneeflocke dreht sich | Spiralbaum, Licht steigt hinauf, Stern | Schnee fällt → Wolke → Licht zeichnet die Spirale → Stern → Lichterkette |
| | Feuerwerk | ersetzt: Sterne leuchten nacheinander auf | sechs Sterne blühen und verglühen, nur Licht | Leuchtspur → 3D-Stern → Wellen → Finale → Goldregen |
| Stadtfest (neu) | Reise | Kompass, Nadel schwingt ein | Kompass kippt in die Frontalansicht | Altstadt → Karte → Pins → Route → Papierflieger → Kompass |
| | Kolibri | Flügel schwirren über Licht (zwei Posen) | 3D, Flügelschlag ±26° in 2 s plus Lichtschwirren | Anflug → schwebt vor der Blüte → trinkt → steigt auf |
| | Delfin | Delfin über einer Welle | springt im Bogen, unter Wasser gedimmt | Wellen → Sprung → Ringe → zwei Delfine → Herz |
| | Drache | – (nicht bei SPARK) | Flügelschlag ±24°, Körperwelle | Funken → steigt auf einer Spirale auf → Runde → Feuer und Feuerwerk |

Nach Marcs Durchsicht am 10. Oktober fehlen drei Motive bei SPARK, weil 100 Drohnen sie nicht lesbar tragen: Lotusblüten (wurden zur Punktkrone), Kopfsprung (der Springer wurde zum schrägen Strich) und Drache. Marc: „Manche Motive sind mit 100–150 Drohnen einfach nicht umsetzbar, das ist vollkommen fine.“ SPARK spielt den Anlass ohne sie, mindestens drei Motive bleiben. Steht ein solches Motiv beim Paketwechsel auf der Bühne, springt die Vorschau zum nächsten Motiv, das das Paket hat. Die Anfrage nennt nur die Motive des gewählten Pakets.

Das Stadtfest liegt bei der Anfrage auf `anlass: stadt`. Die alten Fassungen burst2d/burst3d/ballStory (Feuerwerk), notes3d/notesStory (Noten) und heart3d (Herz in HORIZON) sind entfernt.

**Was aus den echten Shows übernommen ist**

- Feuerwerk ist Licht: Ein Stern ist in unter 0,1 s komplett da, steht gut 3 s an derselben Stelle und hat eine Farbe (Frühlingsnacht 2:10–2:25). Die Drohnen bewegen sich dabei kaum.
- Aufbau als Licht-Reveal: Die Drohnen stehen schon gedimmt auf den Linien, ein Licht zeichnet die Form (`trace` in `show-motion.js`).
- Ein ruhiger Kern mit bewegten Enden: Der Körper steht, nur Bein, Flügel oder Schweif bewegt sich, mit kleinem Ausschlag (`rig` für Gelenkfiguren).
- Langsames Gleiten der ganzen Figur, wie bei den Leipziger Schlitten: Beim eigenen Text in HORIZON sinkt der Schriftzug leicht und kommt zurück.
- Übergänge über eine lose Wolke, in der die nächste Form schon vorgezeichnet ist (`loosen`).

**Eigener Text** (Block „Euer Text“, optional, ohne Aufpreis)

- Wer tippt, sieht den Text nach 0,45 s als Finale der Show; die Bühne springt direkt dorthin. Die Schrift ist wählbar: Schreibschrift, Druckschrift oder Initialen.
- Druckschrift kommt aus dem bestehenden Text-Planer von FlyingStars (Einstrich). Die Schreibschrift ist EMS Allure, eine Einstrich-Fassung von Allura unter SIL OFL 1.1 (`src/data/script-allure.json`, Lizenz daneben). Die Punkte liegen in Schreibreihenfolge, so kann Licht den Text Strich für Strich schreiben. Umlaute werden aus Grundbuchstabe und zwei Punkten gebaut, ß wird zu „ss“. Initialen: „Anna und Ben“ → „A & B“, bei Hochzeit im Herz, sonst im Kreis.
- SPARK: Der Text steht, Licht atmet darüber. HORIZON: Licht schreibt den Text, danach läuft eine Farbwelle, Ornamente funkeln (Herzen bei Hochzeit, sonst Sterne), der Schriftzug gleitet leicht. ODYSSEY: Funken → Licht schreibt → die Buchstaben schwingen als Welle in 3D in einem kreisenden Lichtring → Wechsel zu Initialen oder zur Schreibschrift.
- Der Text steht in der Anfrage („Eigener Text: „Anna & Ben“ (Schreibschrift)“). Er zählt als eines der eigenen Elemente, die alle Pakete enthalten.

**Ring und Hand neu (zwölfte Runde)**

Marc fand die alte Hand mit Ring (frontale, steife Handfläche) im Vergleich zu den neuen Motiven deutlich schwächer. Codex hat dazu die FlyingStars-Shows Hugenpoet und „Heimlich“ sowie FSR-001 und FSR-002 aus der Bibliothek ausgewertet (`anker-runde-2/codex-hand-ring.md`, intern). Der wichtigste Befund: Bei FlyingStars wandert der Ring tatsächlich zur Hand. Die Hand ist eine schräge Seitenansicht mit leerer Innenfläche, ungleich gebogenen Fingern und einer Manschette.

- **ODYSSEY `ringStory`** (in `scenes/hochzeit.js`): Ein Schmuckkästchen öffnet sich, der Deckel schwenkt um das hintere Scharnier. Der Ring steigt aus dem Polster, erst funkelt der Stein, dann wird der Reif hell. Das Kästchen löst sich in eine Wolke, daraus entsteht die eigene Hand. Der Ring fliegt als starres Teil im Bogen zur Ringfingerspitze, richtet sich entlang des Fingers aus und gleitet zum Ansatz. Seine Achse kippt dabei höchstens 30° aus der Blickrichtung, damit er eine offene Ellipse bleibt. Zum Schluss ein Herz mit Doppelkontur.
- **SPARK `weddingRings2d`**: Zwei Eheringe mit Innen- und Außenkontur wie bei FlyingStars, dazu ein Stein am linken Ring. Licht läuft gegenläufig um die Ringe, der Stein funkelt.
- HORIZON behält den Solitär (`rings3d`). Die alten Fassungen `rings2d` und `ringsStory` sind entfernt.

**Übergänge bei SPARK (zwölfte Runde)**

Marc zu den ersten Zwischenbildern: Zu viele (drei bis vier pro Ablauf), und weil sie keinen inhaltlichen Bezug hatten, wirkte das verwirrend. FlyingStars nutzen als Übergang ein formloses Funkeln: eine breite, lose Lichterkette, in der an mehreren Stellen gleichzeitig einzelne Drohnen zufällig aufblitzen, danach eine Art Glitzerregen. Vermutlich ordnen sie dabei die Drohnen für das nächste Bild, ohne dass dessen Form schon zu sehen ist.

Regel (`transitions()` in `src/scripts/scenes/interludes.js`):
- Pro SPARK-Runde gibt es höchstens zwei Übergänge.
- Der erste ist immer das Funkeln. Das Band ist breiter als ein normales 100-Drohnen-Bild (`zoom` am Beat, ausgewertet in `show-field.js`).
- Der zweite ist eine Figur, wenn sie zum Anlass passt. Bei Kultur ist es der Fächer, vor der Musik. Beim Stadtfest ist es das Tor aus Licht, bevor die Runde wieder mit der Reise beginnt. Sonst folgt noch einmal das Funkeln, oder es gibt keinen zweiten Übergang.
- Die Pfeilfigur ist entfallen, weil sie zu keinem Anlass passte.

Übergänge gehören zum folgenden Motiv. Die Knöpfe ‹ › überspringen sie, und ein Paketwechsel landet auf dem Motiv. Der Unit-Test `SPARK-Übergänge` prüft die Regel für alle Anlässe und Motivzahlen.

**Direktlinks**

`/show-konfigurator/?anlass=festival&paket=ODYSSEY&motiv=reise` öffnet ein Motiv in einem Paket und spielt es von vorn. Erlaubt sind die IDs aus `src/content/show-configurator.js`.

**Struktur**

- `src/scripts/show-motion.js`: gemeinsames Vokabular für Drehung, Licht (`breathe`, `glint`, `sparkle`, `chase`, `trace`), Gelenkfiguren (`rig`), Funkenwolken (`loosen`) und Akte (`part`, `act`).
- `src/scripts/scenes/<anlass>.js`: neue Motive je Anlass, registriert in `scenes/index.js`. `show-scenes.js` lädt sie nach, wenn eine Fassung dort nicht steht.
- Schnellprüfung beim Bauen: `node .capture/live-check.mjs <anlass>` misst gegen den Dev-Server die Drohnenzahl je Bild und die Eigenbewegung jeder Drohne. Die Grenzen sind 1,8 für die Geschwindigkeit und 3 für die Beschleunigung. Der verbindliche Test bleibt `tests/show-physics.spec.ts`, der jetzt auch das Stadtfest und längere Laufzeiten abdeckt.
- Gebaut haben die Motive sieben parallele Opus-Worker mit je einer eigenen Datei. Alle haben Screenshots über mindestens zwei Runden geprüft.

**Bekannte Schwächen**

- Die ODYSSEY-Tunnelwicklung der Spirale sieht stellenweise eher wie eine Blüte aus.
- Die Zahl „25“ in Fußball und Kopfsprung ist fest eingetragen.
- Der QR-Code kodiert `HTTPS://FLYINGSTARS.ART`. Für 198 statt 208 dunkle Module ist das Füllbyte nach dem Terminator gewählt; Lesegeräte werten es nicht aus. OpenCV liest den Code aus Bühnen-Screenshots, wenn die Punkte etwas größer gerendert werden. Mit einem echten Handy ist das noch nicht geprüft.
- Alle Bildunterschriften sind akomo-Entwürfe.

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
| Chromium mit 6-fach gedrosselter CPU | 53–58 fps (neunte Fassung) |
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

- `tests/show-physics.spec.ts` spielt jede Show in allen drei Paketen ganz durch (bis zurück zum ersten Motiv) und prüft Geschwindigkeit und Beschleunigung jeder Drohne.
- `scripts/show-flight.test.mjs` prüft:
  - Die Zuordnung ist optimal.
  - Die Ankunft ist exakt.
  - Flugzeiten halten die Grenzen ein.
  - Das Strömungsfeld ist divergenzfrei.
- `scripts/show-geometry.test.mjs` prüft:
  - exakte Punktzahlen aller Formen
  - drei Motive je Anlass mit je drei Fassungen
- `tests/show-configurator.spec.ts` prüft:
  - Paket, Preis und Drohnenzahl
  - Jeder Anlass zeigt drei Motive, jedes Bild hat genau die Drohnen des Pakets.
  - Die Motive laufen von selbst durch, ein Paketwechsel bleibt beim Motiv.
  - Jedes Paket bewegt sich nach dem Aufbau weiter.
  - Die Bilder laufen im Kreis vor und zurück.
  - ODYSSEY erzählt in Akten und lässt sich wiederholen.
  - Nach schnellem Umschalten leuchten nie zu viele Drohnen.
  - Tastatur, erster Bildschirm, Übergabe ins Formular

Offen: Die optimale Zuordnung für 300 Drohnen kostet beim Umschalten einmalig etwa 70 ms auf einem schnellen Rechner (vor dem Flug, kein Ruckeln währenddessen). Auf schwachen Geräten wäre ein Web Worker der nächste Schritt.


## Typografie und ruhige Vorschau, 12.10.2026

Die gesamte Site verwendet nur die lokale variable Space Grotesk, 300–700. Body-, Display- und bisherige Mono-Rollen zeigen auf dieselbe Familie; Inter, JetBrains Mono und Montserrat einschließlich unbenutzter Dateien entfallen. Die im Canvas gezeichnete Schreibschrift ist lokale Geometriedaten und keine zusätzliche Webschrift. Die echte Fontdatei enthält die Gewichtsachse 300–700 und deutsche Umlaute/ß.

Die Vorschau zeigt nur das Paketbadge. Die redundante Drohnenzahl oben rechts entfällt. Bildbeschreibungen sind visuell ausgeblendet, bleiben als Textalternative über `aria-describedby` verfügbar, weil der Canvas selbst für Screenreader verborgen ist. Eine fehlgeschlagene Vorschau hat weiterhin eine sichtbare Fehlermeldung mit nutzbarer Paketauswahl/Anfrage. Technische Paketdaten bleiben im Ergebnisbereich und in der Anfrage.

`tests/network-allowlist.spec.ts` prüft alle tatsächlich gebauten Routen auf genau eine lokale Fontdatei. Der Konfigurator-Test prüft alle Anlässe auf ausgeblendete Beschreibungen, erhaltene Textalternative und entfernten Zähler. Überprüfung: `npm run gates`.


## Fließtextschrift wiederhergestellt, 12.10.2026

Nach Ansicht der Ein-Schrift-Fassung bevorzugt Marc Inter für die ursprünglichen Body-Rollen. Deshalb zeigt `--body` wieder auf die vorhandene lokale variable Inter. Überschriften und bisherige Mono-Rollen bleiben Space Grotesk; das Logo verwendet wie ursprünglich den Body-Token. JetBrains Mono und Montserrat bleiben entfernt. Die Fontprüfung erwartet genau die beiden lokalen Dateien auf allen gebauten Routen. Sichtbare Motivbeschreibungen und Preview-Zähler bleiben entfernt. Eine separate kuratierte Fontstudie entscheidet nicht ungefragt über die finale Designsprache.


## Zwölfte Fassung: lebendige Wolke, Show-Uhr, Drohnenzahl, zwei Spalten (30.10.2026)

Grundlage sind Marcs Entscheidungen vom 30.10.2026 nach der Designsprache-Probe (Studie 2, `/poc/designsprache/`) und Codex' Codeanalyse (intern: `freelance/clients/flyingstars/17-designsprache-poc-2026-10-30/codex-befunde/konfigurator-codeanalyse.md`).

**1. Lebendige Wolke in allen Paketen.** Marc: „Der Unterschied zwischen der lebendigen Wolke und der bisherigen Wolke ist Night and Day.“
- Entscheidung: Bisher gab es eine Wolke nur bei SPARK, und zwar als eigenes Bild (Funkelband mit Haltezeit, `glitter()` in `scenes/interludes.js`). Das Funkelband ist entfernt. Die lebendige Wolke ist jetzt eine Art zu fliegen: Ein Bild mit `cloud: true` wird durch sie hindurch erreicht.
- Wie sie fliegt (`show-field.js`, `startBeat`/`step`):
  - Jede Drohne startet gestaffelt, nach ihrer Stelle im Lichtlauf des Zielbildes plus Zufall.
  - Sie fliegt auf einer quadratischen Bézier-Bahn über einen zufälligen Mittelpunkt, auch in der Tiefe (z). So funktioniert die Wolke mit 3D-Formen.
  - Im Flug leuchtet sie gedimmt (0,07); etwa 10 % blitzen deterministisch auf (Hash über Drohne und Zeitfenster).
  - Die Form schaltet sich erst beim Ankommen ein.
  - Die Flugdauer reicht in jedem Fall für die Geschwindigkeits- und Beschleunigungsgrenzen. Der Physiktest prüft das.
- Wann: In jedem Paket vor dem zweiten Motiv und vor dem vierten Motiv. Bei drei Motiven liegt die zweite Wolke stattdessen vor dem Neustart der Runde. Das sind höchstens zwei Wolken je Runde, nicht vor jedem Motiv (`transitions()` in `scenes/interludes.js`).
- SPARK behält Fächer (Kultur) und Lichttor (Stadtfest) als Figuren mit Bezug zum Anlass; diese Figuren werden selbst durch die Wolke erreicht.
- Die Wolke kommt nur beim automatischen Weiterlaufen vor. Ein Klick (Paket, Anlass, Bildwechsel) antwortet weiter schnell mit einem normalen Flug.
- Für die Wolke ordnet eine Hilbert-Reihenfolge die Drohnen ihren Plätzen zu statt der optimalen Zuordnung. Die Bahnen sind ohnehin gekrümmt, Kreuzungen fallen nicht auf. Grund: Bei 600 Drohnen kostete die optimale Zuordnung über alle Teile bis zu 0,6 s (4× gedrosselt 1,1 s) Stillstand.

**2. Helligkeit.** Die Form leuchtet in voller Grundhelligkeit, Lichteffekte kommen nur obendrauf.
- `lift()` in `show-tempo.js`:
  - Werte von 0,6 bis 1 werden zu 1.
  - Unter 0,2 bleibt bewusst dunkel, etwa Delfin unter Wasser, verdeckte Buchzeilen oder Feuerwerksglut.
  - Dazwischen gibt es einen weichen Übergang, damit ein Ausblenden nicht springt.
- `trace()` in `show-motion.js` dimmt nicht mehr: Die Linie steht vor dem Lichtkopf schon voll. Licht „schreibt“ damit über eine stehende Form; QR-Code und Route bauen sich nicht mehr im Dunkeln auf.
- Der Lichtlauf läuft häufiger und entlang der Form. Er ersetzt den bisherigen diagonalen Schimmer:
  - Reihenfolge ist die Hilbert-Ordnung der Punkte, oder `order` am Bild, falls ein Motiv eine Konturreihenfolge vorgibt.
  - Er beginnt 0,6 s nach der Ankunft und wiederholt sich alle 4,6 s (`TEMPO.run`).
  - Er kommt nur dazu, er dimmt nie.

**3. Tempo.** Die Werte stehen zentral in `src/scripts/show-tempo.js` (`TEMPO`).
- Wolke 4,3 s. Das ist Marcs langsamste Stufe aus der Probe: 2600 ms / 0,6.
- Automatische Neupositionierung 1,8–4,3 s statt 1,1–3,2 s. Klicks bleiben bei 1,1–3,2 s.
- Das letzte Bild eines Motivs steht in allen Paketen 3 s, vorher 3,5/5/3,5 s.
- Gemessene Summe der Haltezeiten je Runde, vorher → nachher:

  | Paket | Vorher | Nachher |
  |---|---|---|
  | SPARK | 14,5–21,5 s | 11–17 s |
  | HORIZON | 20–30,4 s | 12–22,4 s |
  | ODYSSEY | 49,8–72 s | 47,3–70,3 s |

- **Offen bei ODYSSEY:** Die langen Akte sind Handlung, keine Standbilder. Beispiele: Zündung 8 s, Orbit 9,5 s, Landung 7,5 s, Feder schreibt 9 s, Ring auf der Hand 7,4 s, Papierflieger 8 s. Pauschal kürzen würde Handlungen abschneiden. Das braucht einen Durchgang Akt für Akt (Handlungsende + 1 s). Bis dahin hilft der Tempofaktor 2×.

**4. Vorführ-Steuerung.**
- Virtuelle Show-Uhr in `show-field.js` (`vt`): Sie rückt nur in der Render-Schleife vor, um die echte Zeit mal Tempofaktor. Pro Bild sind das höchstens 0,1 s; ein langsames Gerät verlangsamt die Show, statt sie springen zu lassen.
- Alle Zeitpfade (Flug, Wolke, Eigenbewegung, Licht) hängen an dieser Uhr.
- Die Leiste unter der Bühne hat vier Teile:
  - **Pause:** friert das exakte Bild ein, auch mitten in der Wolke.
  - **‹ ›:** ein Bild zurück oder vor.
  - **Spur:** eine Marke je Bild, Breite nach geschätzter Dauer; ein neues Motiv beginnt mit größerem Abstand. Die Marken füllen sich in der Paketfarbe.
  - **Tempo:** 0,5× / 1× / 2×.
- Die Spur ist ein `role="slider"`:
  - Klicken oder Ziehen springt zum Bild unter dem Zeiger, nach dem Ziehen beim Loslassen.
  - Pfeiltasten gehen ein Bild weiter, Pos1 an den Anfang, Ende zum letzten Motiv.
  - `aria-valuetext` lautet „Bild k von N: Beschreibung“.
- ↻ ist entfallen; Pos1 oder ein Klick an den Anfang der Spur ersetzt es.
- **Nicht gebaut: echtes Scrubben (stufenlos rückwärts).** Die Engine trägt Zustand von Bild zu Bild (Positionen, Geschwindigkeiten, Zuordnung). Rückwärts bräuchte sie Zustands-Schnappschüsse oder vorberechnete Übergänge. Gebaut sind deshalb Sprungmarken je Bild, wie vereinbart.
- Die globale Pause im Kopf der Seite und reduzierte Bewegung zeigen weiterhin das Motiv in Ruhe.

**5. Drohnenzahl als dritte Achse.**
- Regler 100–600 in Zehnerschritten, darunter die Spur in den Paketfarben.
- Jedes Paket hat einen eigenen Bereich (`DRONE_RANGES` in `src/content/show-packages.ts`): SPARK 100–150, HORIZON 200–290, ODYSSEY 300–600.
- Die Lücke 160–190 ist nicht wählbar; der Regler springt in Bewegungsrichtung zur nächsten Grenze (`snapDrones`).
- Überschreitet der Regler eine Grenze, wechselt das Paket sichtbar: Der Paketknopf springt um, darunter steht „Paket gewechselt: HORIZON beginnt bei 200 Drohnen.“ (`aria-live`).
- Ein Klick auf einen Paketknopf setzt dessen Einstiegszahl.
- Preis = Paketpreis + Aufpreis je angefangenem Schritt (`priceFor`, unverändert). So kostet HORIZON höchstens 25.700 € (290 Drohnen), ODYSSEY mindestens 34.900 €.
- **Platzhalter:** Bereichsgrenzen und Aufpreise sind nicht mit FlyingStars geklärt. Im Code steht `DRONE_RANGES_PLACEHOLDER`, in der Oberfläche „Bereiche und Aufpreise: Platzhalter“.
- Die Obergrenze 600 ist eine Vorschaugrenze, keine Flottengrenze. Bei 600 Drohnen hält die Vorschau während einer Wolke mit 4-fach gedrosselter CPU noch 46 fps.
- Drohnenzahl in der Anfrage: `drohnen=<n>`, im Text „(ODYSSEY, 420 Drohnen, ab 54.700 € netto, Preis laut Konfigurator)“.
- Direktlink: `?anlass=launch&paket=ODYSSEY&drohnen=420&motiv=rakete`.
- Über 300 Drohnen behält das Bild die Bühnengröße und wird dichter. Bis 300 wächst es wie bisher mit der Wurzel der Drohnenzahl.
- Vorher repariert: Drei Motivbauer lieferten bei anderen Drohnenzahlen zu wenige Punkte:
  - Buch in HORIZON: Textzeilen wurden über `n/3` abgerundet, jetzt `textRowsTotal` in `scenes/kultur.js`.
  - Delfin in HORIZON: ungerade Wasserdrohnen, `scenes/natur.js`.
  - Herzgeschichte in ODYSSEY: Das 3D-Herz hat höchstens 290 Punkte. Darüber legt `heart3d` in `show-scenes.js` ein kleineres Herz hinein.

**6. Zwei Spalten.**
- Ab 1000 px steht die Bedienung links in fester Lesebreite (`clamp(340px, 27vw, 500px)`), die Bühne rechts nimmt den Rest bis 2560 px.
- Mobil bleibt es gestapelt: Bühne oben, Bedienung darunter, Preisleiste unten.
- Reihenfolge links: Anlass, Paket, Drohnen, Preis, Anfrage, danach „Euer Text“ (optional). So stehen Preis und Anfrage auch bei 1280 × 720 im ersten Blick.

**Nicht in dieser Runde:** Logo-Upload im Konfigurator. Die Preisseite `/drohnenshow-preise/` hat in diesem Branch weiter den alten Rechner (`Calculator.astro`, `pricing.js`, eigener Regler 100–1.000). Die neue Logik gilt nur in `/show-konfigurator/`.

### Wie prüfen

- Schnell, ohne Browser: `node --test scripts/show-price.test.mjs scripts/show-counts.test.mjs scripts/show-geometry.test.mjs scripts/show-flight.test.mjs`.
  - `show-price.test.mjs` prüft:
    - getrennte Bereiche
    - der Preis steigt nie, wenn Drohnen dazukommen
    - HORIZON ist nie teurer als ODYSSEY bei gleicher oder höherer Drohnenzahl
    - der Regler springt über die Lücke
    - die Einstiegspreise bleiben
  - `show-counts.test.mjs` baut jedes Motiv in jedem Paket bei jeder wählbaren Drohnenzahl (47 Zahlen) und prüft:
    - die Punktzahl und endliche Koordinaten in jedem Bild
    - den eigenen Text in drei Schriften an den Bereichsgrenzen
    - die Wolkenregel
  - Laufzeit etwa 3 s. `scripts/show-node-env.mjs` lädt die Motivbauer dafür in Node: JSON-Importe, `fetch` aus `public/`.
- Browser (`tests/show-configurator.spec.ts`), neu:
  - Regler mit echter Maus und Tastatur über die Paketgrenze
  - Pause friert das Bild ein, Tempo, Sprung über die Spur
  - zwei Spalten bei 1440 und 2560 px, gestapelt bei 390 px
- `tests/show-physics.spec.ts` deckt jetzt auch die Wolken ab, weil sie im automatischen Ablauf vorkommen.
- Bei der Bühne: Eine Wolke sieht man, wenn man im Ablauf ein Motiv vor dem zweiten oder vierten ansteuert und wartet. Beispiel: `?anlass=festival&paket=ODYSSEY&motiv=kolibri`, dann auf der Spur ← drücken; nach dem Kompass zerfällt das Bild in die Wolke, und Kolibri und Blüte setzen sich zusammen.


## Dreizehnte Fassung: nur noch die lebendige Wolke, lückenloser Regler, Motive nach Drohnenzahl (30.10.2026)

Grundlage ist Marcs Rückmeldung zur zwölften Fassung vom selben Tag. Fortschrittsleiste, Weiter/Zurück und Tempo bleiben unverändert („gerne so beibehalten“).

**1. Keine ruhende Wolke mehr.** Marc: „kompletter Bullshit … alles muss die lebendige Wolke sein“ (gesehen bei Hochzeit und Jubiläum).
- Ursache: Mehrere ODYSSEY-Geschichten hatten ein eigenes Bild, in dem die Drohnen als gelockerte, funkelnde Wolke stehen (`loosen()` plus `sparkle()`), und erst das Bild danach war die Form. Das Funkelband der zwölften Fassung war schon weg, diese Zwischenbilder nicht.
- Entfernt, das jeweils folgende Bild wird durch die lebendige Wolke erreicht:

  | Anlass | Geschichte | entfallenes Standbild | jetzt |
  |---|---|---|---|
  | Hochzeit | Ring | „das Kästchen löst sich in eine Wolke“ | Kästchen und Sterne werden in der Wolke zur Hand, der Ring fliegt dabei normal weiter (Teil-Umbau) |
  | Hochzeit | Schmetterling | „ihre Flügel lösen sich in Funken“ | das Herz entsteht aus der Wolke |
  | Jubiläum | Fußball | „Funken“ (erstes Bild) | „Ein Spieler und sein Tor“, das Tor steht als gedimmte Linie statt als gelockerte Vorform |
  | Jubiläum | Pokal | Funkenkugel über dem Sockel (zwei Bilder) | die Drohnen warten gedimmt als schmaler Kranz; Zahl und Konfetti entstehen in der Wolke, der Pokal bleibt stehen |
  | Launch | Glühbirne | „Ein Funke“ (Funkenball) | der Glühfaden glimmt allein, das Glas entsteht aus der Wolke (Teil-Umbau) |
  | Launch | QR-Code | „die Nachrichten lösen sich in Funken“ | die Nachrichten werden in der Wolke zum Code, das Handy bleibt stehen (Teil-Umbau) |
  | Launch | Logo | zwei „Funkenwirbel“ | Logo → Ring aus Licht durch die Wolke |
  | Kultur | Buch | „die Zeilen steigen als Funken auf“ | Teil-Umbau, siehe Punkt 2 |
  | Winter | Lichterbaum | „Schnee fällt“ und „die Flocken sammeln sich“ | eine Schneeflocke (die Flocke aus SPARK) wird in der Wolke zum Baum |
  | Stadtfest | Drache | „Funken am Boden“ | der Drache steigt direkt aus der Wolke auf |
  | eigener Text | ODYSSEY | „Funken sammeln sich“ | Licht schreibt den Text, erreicht durch die Wolke |

- `loosen()` ist aus `show-motion.js` gelöscht, damit niemand das Muster wieder einbaut. Die Übergangsfiguren bei SPARK (Fächer, Tor) funkeln nach dem Zeichnen nicht mehr (`interludes.js`).
- Nebenbefund: Bei 600 Drohnen stellte die Raketengeschichte 335 Drohnen als funkelnden Sternenhimmel hin, weil Rakete, Spur und Welt feste Zahlen hatten. Rakete und Buch wachsen jetzt mit der Drohnenzahl (`rocketStory` in `show-scenes.js`, `bookStoryScene` in `scenes/kultur.js`).
- Wächter (`scripts/show-clouds.test.mjs`, „Keine ruhende Wolke“): baut alle Anlässe × Pakete bei den Bereichsgrenzen und Freischaltschwellen und misst je Bild den Anteil der Drohnen, die hell stehen und für sich allein funkeln. Kein Nachbar trägt dasselbe Licht (auch nicht leicht zeitversetzt wie bei einem Lichtlauf), und der Rhythmus der Drohne weicht von dem ihrer Nachbarn ab. Kalibriert am Stand vor dieser Runde: Die acht Standbilder lagen bei 0,25 bis 0,43, der Sternenhimmel der Rakete bei 600 bei 0,31. Echte Motive liegen jetzt höchstens bei 0,18. Grenze 0,22 für das ganze Bild, dazu kein Teil mit mindestens einem Drittel der Drohnen über 0,6.
- Grenze des Wächters: Er erkennt funkelnde Wolken. Eine unbeleuchtete, formlose Punktfläche (wie der frühere Funkenwirbel) würde er nicht erkennen.

**2. Lebendige Wolke häufiger, auch als Teil-Umbau.**
- Regel: alle drei bis vier Bilder, höchstens fünf, in jedem Paket (`planClouds()` in `scenes/interludes.js`). Feste Wolken setzen die Geschichten selbst (Teil-Umbauten, Bilder nach einem entfernten Standbild, SPARK-Figuren). Dazu wählt `planClouds()` unter den Motivanfängen die Kombination, deren Abstände rund um die Schleife am nächsten an drei bis vier liegen; bei Gleichstand weniger Wolken und die erste möglichst früh.
- Gemessene Abstände (Bilder bis zur nächsten Wolke, im Kreis):

  | Paket | Hochzeit | Jubiläum | Launch | Kultur | Winter | Stadtfest |
  |---|---|---|---|---|---|---|
  | SPARK 100 | 4 | 4 | 5 | 3-3 | 4 | 4 |
  | HORIZON 200 | 5 | 5 | 5 | 3-3 | 4 | 4 |
  | ODYSSEY 300 | 5-5 | 5-4 | 2-5-2 | 3-3-5 | 3-5-4 | 4-5-3 |
  | ODYSSEY 600 | 2-4-4-5-3 | 4-3-5-2-4 | 3-2-4-5-2 | 3-3-5-4-4 | 3-5-5-4 | 5-5-5-3 |

  Vorher sah Marc bei ODYSSEY-Hochzeit eine einzige Wolke in 20 Bildern.
- Teil-Umbau: `beat.cloud` darf eine Liste von Teilnamen sein (`show-field.js`, `assignPlaces`/`startBeat`/`step`). Nur die Drohnen dieser Teile fliegen durch die Wolke (Hilbert-Zuordnung), die übrigen Teile behalten ihre Drohnen und fliegen normal oder bleiben stehen. Eingesetzt:
  - Buch (Kultur, ODYSSEY): Zeilen und Sterne steigen aus den Seiten und werden ein Stern; Deckel, Seiten und Feder bleiben (`cloud: ["star"]`).
  - Vorhang (Kultur, HORIZON und ODYSSEY): der Stern entsteht aus dem Goldregen bzw. aus dem Vorhang, der Vorhang bleibt.
  - Ring (Hand entsteht, Ring fliegt weiter), Pokal (Zahl und Konfetti), Glühbirne (Glas), QR-Code (Code), Reise (Karte wird zum Kompass, der Papierflieger kreist weiter).
- Kontaktbögen zum Ansehen (nicht im Repo): `/tmp/fs-konfig-r3/sheets/*/sheet.png`.

**3. Weniger Glühen.** Ursache: Jedes Bild bekam den Lichtlauf (`shimmer ??= true` in `buildSequence`), auch Formen mit eigenem Licht und Flächen.
- Jetzt entscheidet `runFits()` in `show-tempo.js` je Bild: Lichtlauf nur, wenn das Bild kein eigenes Licht hat (die Helligkeit aus `live()` bleibt bei allen Stichproben bei 1) und die meisten Punkte auf Linien liegen (die vier nächsten Nachbarn liegen fast auf einer Geraden). Ergebnis: 16 von 162 Bildern bei 100/200/600 Drohnen, vorher alle.
- Der Lauf selbst ist schwächer (0,65 → 0,4) und seltener (alle 6,5 statt 4,6 s). Sein Kopf startet vor der Form und blendet über 0,8 s ein, wie in der Designsprache-Probe; so blitzt beim Start nichts auf.
- Eigener Text behält sein eingebautes Licht („Licht schreibt“), einen zusätzlichen Lauf bekommt er nicht.

**4. Lotusblüten ohne Finte.** Ursache: In HORIZON glitten die Blüten zusammen und wieder auseinander, bevor das nächste Motiv kam; in ODYSSEY rückten sie beim Aufblühen erst nach außen (0,62 → 1,02) und danach zueinander. Jetzt geht jede Bewegung in eine Richtung: HORIZON bleibt ineinander gedreht (Haltezeit 7,6 statt 10,4 s), die Knospen stehen von Anfang an dort, wo die offenen Blüten stehen (`lotus3d`, `lotusStory` in `scenes/hochzeit.js`).

**5. Kein Hin und Her am Regler.**
- Ursache: Zwischen SPARK (bis 150) und HORIZON (ab 200) lag eine Lücke. `snapDrones()` setzte einen Wert in der Lücke in Bewegungsrichtung auf die nächste Grenze, und `update()` schrieb ihn in den Regler zurück. Stand der Zeiger in der Lücke, meldete der Regler beim nächsten Mausereignis wieder den Zeigerwert, diesmal von der anderen Seite. Reproduziert mit echter Maus in Chromium und WebKit (Nachbau der alten Logik): 20 Ereignisse bei ruhender Hand auf 170 ergaben 19 Paketwechsel 150 ↔ 200; mit den neuen Bereichen 0.
- Jetzt lückenlos: SPARK 100–190, HORIZON 200–290, ODYSSEY 300–600 (`DRONE_RANGES` in `src/content/show-packages.ts`). Die Einstiegspunkte 100/200/300 bleiben die der Referenz. Bis 150 Drohnen gilt der Aufpreis der Referenz (900 € je 10), von 160 bis 190 ein eigener Platzhalter von 700 € je 10 (`SPARK_EXTRA`), damit SPARK mit 190 Drohnen (15.200 €) günstiger bleibt als HORIZON mit 200 (15.900 €). Die Preisseite ist davon nicht berührt.
- Tests: `scripts/show-price.test.mjs` („lückenlos“, „kein Hin und Her“) und `tests/show-configurator.spec.ts` („Kein Hin und Her …“: echte Maus, ruhende zitternde Hand auf 140, 160, 170, 180, 190, die Paketfolge ist genau SPARK → HORIZON).

**6. Mehr Drohnen, mehr Motive.** Marc: 300 und 600 Drohnen sahen gleich aus, kosten aber doppelt.
- Rangfolge der ODYSSEY-Geschichten nach Akten, Teilen, Bildausschnitten und Tiefe (gemessen bei 300 Drohnen):

  | Anlass | ab 450 | ab 520 | bei 300 bleiben |
  |---|---|---|---|
  | Hochzeit | Ring (5 Akte, 3 Teile, 3 Ausschnitte) | Lotusblüten (3D-Volumen, 3 Teile) | Herz, Sektgläser, Schmetterling |
  | Jubiläum | Fußball (5 Akte, 6 Teile) | Kopfsprung (5 Akte, 5 Teile, 3D) | Wappen, Wahrzeichen, Pokal |
  | Launch | Rakete (4 Teile, 2 Ausschnitte, 27 s) | QR-Code (2 Ausschnitte) | Glühbirne, Spirale, Logo |
  | Kultur | Masken (der Bokkenrijders-Teufel ist eine echte Formation mit 600 Drohnen) | Musik/Harfe (3 Ausschnitte) | Buch, Vorhang, Tanz |
  | Winter & Silvester | Uhr (5 Akte, Korken als eigenes Teil) | – | Lichterbaum, Feuerwerk, Kleeblatt |
  | Stadtfest | Reise (6 Akte, 4 Teile) | – | Kolibri, Delfin, Drache |

  Das Buch hätte nach der reinen Zählung vorn gelegen. Es bleibt ab 300, weil Marc den Teil-Umbau im Buch sehen will und die Masken mit dem echten 600er-Teufel den stärkeren Grund für mehr Drohnen haben.
- Daten: `min` am Motiv (`v(build, caption, min)`), Schwellen in `UNLOCK = [450, 520]`, Hilfsfunktion `playable()` in `src/content/show-configurator.js`. `buildSequence` lässt Motive unter ihrer Schwelle weg. Die Anfrage nennt nur gespielte Motive. Ein Direktlink auf ein gesperrtes Motiv öffnet es mit der nötigen Drohnenzahl.
- Gamifiziert, zurückhaltend: Schiebt man den Regler über eine Schwelle, erscheint oben auf der Bühne eine kleine Meldung („Neues Motiv freigeschaltet: Ring“, `role="status"`, verschwindet nach 3,4 s), und die Bühne fliegt durch die lebendige Wolke direkt zu diesem Motiv (`show(…, { cloud: true })`). Unter dem Regler steht leise, was noch fehlt („Mehr Drohnen, mehr Motive: ab 450 Ring, ab 520 Lotusblüten“).
- Folge: ODYSSEY mit 300 Drohnen zeigt drei Motive, mit 600 alle vier oder fünf; die Runde wird länger (z. B. Hochzeit 10 → 18 Bilder).
- **Platzhalter:** Schwellen und Zuordnung sind nicht mit FlyingStars abgestimmt.

**Nicht in dieser Runde:** Logo-Upload im Konfigurator, die Preisseite `/drohnenshow-preise/`, der Akt-für-Akt-Durchgang der ODYSSEY-Haltezeiten aus der zwölften Fassung.

### Wie prüfen (dreizehnte Fassung)

- Schnell: `node --test scripts/show-clouds.test.mjs scripts/show-price.test.mjs scripts/show-counts.test.mjs scripts/show-geometry.test.mjs scripts/show-flight.test.mjs` (etwa 30 s, der Wolken-Wächter braucht die meiste Zeit).
- Browser: `tests/show-configurator.spec.ts` („Kein Hin und Her …“, „Mehr Drohnen schalten ein Motiv frei …“), `tests/show-physics.spec.ts` (600 Drohnen jetzt für alle Anlässe, weil die freigeschalteten Motive und ihre Teil-Umbauten erst dort laufen).
- Ansehen: `?anlass=kultur&paket=ODYSSEY` und warten, bis die Feder fertig geschrieben hat (Buch, Teil-Umbau); `?anlass=hochzeit&paket=ODYSSEY&drohnen=440`, dann den Regler auf 450 (Meldung, Wolke, Ringkästchen).
- Ergebnisse am 30.10.2026 (eigener Build, nicht der Dev-Server): schnelle Tests 27/27; `tests/show-configurator.spec.ts` in Chromium, WebKit und mobil grün (54 bestanden, 3 nur für Desktop übersprungen); `tests/show-physics.spec.ts` alle 12 Läufe grün (alle Anlässe in allen Paketen, dazu alle Anlässe mit 600 Drohnen); `astro check` 0 Fehler. Bildraten während einer Wolke mit 600 Drohnen: Chromium mit 4-fach gedrosselter CPU 47–51 fps (Median 16,7 ms, schlechtestes Bild 33 ms, auch das Startbild der Wolke), WebKit 75 fps.


## Vierzehnte Fassung (A): Bedienung (30.10.2026, abends)

Grundlage ist Marcs Rückmeldung zur dreizehnten Fassung vom selben Abend. Teil B (Motive, Text-Beats, Freischalt-Schwellen) steht in einem eigenen Abschnitt. Fortschrittsleiste, Weiter/Zurück und Tempo bleiben.

**1. Lebendige Wolke beim Rücksprung und beim Anlasswechsel.**
- Vom letzten Bild zurück zum ersten fliegt die Show in jedem Paket und jedem Anlass durch die lebendige Wolke (`step()` in `show-field.js`, `startBeat(loopTo, t, true, true)`).
- Ein neuer Anlass wird ebenfalls durch die Wolke erreicht (`update(false, …, { cloud: true })` in `show-configurator.js`).
- Sonst bleibt es bei der Regel der dreizehnten Fassung. Ein Klick auf ‹ › oder die Spur antwortet weiter mit einem schnellen normalen Flug.

**2. Klick auf die Bühne: Pause und weiter.**
- Über der Leinwand liegt ein durchsichtiger Knopf über die ganze Bühne (`#cfg-hit`, `aria-pressed`, Name „Vorführung anhalten“). Er liegt unter der Leiste und den Meldungen, deshalb pausiert ein Klick auf ‹ › oder die Spur nicht.
- Leertaste und Eingabe schalten um, wenn die Bühne den Fokus hat.
- Knopf in der Leiste und Bühne zeigen denselben Zustand.
- Wie bei YouTube erscheint kurz ein Pause- bzw. Abspielzeichen in der Mitte, bei reduzierter Bewegung nicht.

**3. Hinweis an der Spur.** Beim Überfahren der Spur und bei Fokus auf ihr zeigt ein kleiner Hinweis über der Sequenz deren Namen und ab wie vielen Drohnen sie möglich ist, z. B. „Ring · ab 450 Drohnen“.
- Die Zahl ist die Mindestzahl der Fassung, mindestens der Anfang des Paketbereichs (`possibleFrom()` in `show-tempo.js`).
- Gelesen wird `minDrones` am Motiv; solange Teil B das Feld nicht gesetzt hat, gilt das `min` der dreizehnten Fassung (`minDronesOf()`).
- Für Screenreader ist der Hinweis die Beschreibung der Spur (`role="tooltip"`, `aria-describedby`).
- Auf dem Handy erscheint er beim Ziehen über die Spur.

**4. Freischalt-Meldung auch beim Paketwechsel.**
- `freshMotifs()` vergleicht Paket und Drohnenzahl vorher und nachher. Gemeldet werden alle Motive, die jetzt spielen und vorher nicht, in der Reihenfolge des Anlasses.
- Die Bühne fliegt durch die Wolke zum ersten davon.
- Beispiele mit den Inhalten aus Teil B (`UNLOCK = [300, 450]`): Hochzeit HORIZON → ODYSSEY meldet „Neues Motiv freigeschaltet: Lotusblüten“. HORIZON 200 → 600 mit der Taste Ende meldet „2 neue Motive: Lotusblüten, Antrag“. Jeder Anlass hat beim Einstieg in ODYSSEY mindestens ein neues Motiv; ein Klick auf ODYSSEY fliegt deshalb immer dorthin.
- Während man zieht, sammelt die Meldung alle neuen Motive.
- Nur mehr Drohnen schalten frei. Wer zu einem kleineren Paket zurückgeht, bekommt dessen einfachere Fassungen ohne Meldung.
- Ist ein Logo geladen und wird nichts freigeschaltet, führt jede neue Drohnenzahl zurück zum Logo.

**5. Microcopy entfernt.**
- Gestrichen sind „ODYSSEY: 300–600 Drohnen“ (`#cfg-range`), „Paket gewechselt: …“ (`#cfg-switch`), „Mehr Drohnen, mehr Motive: …“ (`#cfg-more`) und „Enthalten: …“ (`#cfg-includes`).
- Die Platzhalter-Markierung steht nur noch in der Fußnote: „Alle Preise sind netto; Drohnenbereiche und Aufpreise sind Platzhalter.“
- „Euer Text“ steht jetzt bei den Auswahlen (Anlass, Paket, Drohnen, dann Text und Logo in einer Zeile), vor Preis und Anfrage.
- Damit Preis und Anfrage bei 1280 × 720 im ersten Blick bleiben, rückt die Bedienung bei niedrigen Desktop-Fenstern enger zusammen (`max-height: 820px`).
- Auf dem Handy werden angesteuerte Felder zwischen der klebenden Bühne und der Preisleiste gehalten.

**6. Eigener Text: einmal durch alle drei Schriften.**
- Nach dem Tippen läuft die Bühne einmal durch Schreibschrift → Druckschrift → Initialen. Die Schriftwahl links markiert jeweils die Schrift auf der Bühne.
- Danach geht es mit den Motiven weiter, und die Auswahl zeigt wieder die gewählte Schrift.
- Bau: `composeShow()` in `show-tempo.js` setzt den Durchlauf vor die Runde, `loopTo` zeigt hinter ihn. Er läuft also einmal, das Finale der Runde bleibt der Text in der gewählten Schrift.
- Je Schrift nimmt der Durchlauf so viele Bilder, bis sie 5 s stand (`TEMPO.tourHold`). In ODYSSEY entfällt so der dritte Akt, der den Text in eine andere Schrift verwandelt. Im Finale bleibt er.
- Ein Bild mit `tour: false` lässt der Durchlauf aus.
- Ein Klick auf eine Schrift beendet den Durchlauf und zeigt das Finale in dieser Schrift, auch wenn die Schrift schon markiert war (`click` statt `change`).
- Wie der Text sich zeigt, baut Teil B in den Text-Bildern.

**7. Logo-Upload im Konfigurator.**
- Knopf „Logo“ mit Icon neben dem Textfeld, dazu ✕ zum Entfernen. Darunter steht der Hinweis wörtlich: „Lade nur Logos hoch, die du verwenden darfst, zum Beispiel dein eigenes. Die Datei bleibt in deinem Browser: Wir speichern und übertragen sie nicht.“
- Dropzone auf der Bühne (abgedunkelt, weichgezeichnet, „Dein Logo hier reinziehen“). Sie erscheint, sobald eine Datei über die Seite gezogen wird (über der Bühne mit Rahmen in der Paketfarbe) und wenn man auf „Logo“ zeigt.
- Nach dem Ablegen oder Auswählen verschwindet sie sofort, bis die Maus die Bühne bzw. den Knopf verlassen hat (`is-done`).
- Eine Datei, die neben die Bühne fällt, öffnet der Browser nicht.
- **Abweichung von Studie 1:** Beim bloßen Überfahren der Bühne erscheint die Dropzone nicht. Grund: Im Konfigurator ist die Bühne die Show selbst und seit Punkt 2 der Pause-Knopf. Eine Hover-Dropzone würde die Show jedes Mal abdunkeln und weichzeichnen, wenn die Maus darüber steht, auch beim Anhalten. Das Verhalten aus Studie 1 lässt sich mit `data-drop-hover` an `.cfg-stage` einschalten (eine CSS-Regel ist vorbereitet).
- Umrechnung: `formation({ kind: 'image', src: blobURL } | { kind: 'svg', markup }, n)` aus `src/scripts/formation/`, gerechnet im Web Worker und je Drohnenzahl gecacht. Farben wie im Logo, dunkle über `liftColor` aufgehellt (Schwarz wird warmes Weiß).
- Das Logo ist ein eigenes Bild (`segment` −1, `logo: true`). Es eröffnet die Runde, steht 5 s (`TEMPO.logoHold`) und kehrt vor jedem zweiten Motiv zurück (`TEMPO.logoEvery`).
- Das Logo wird durch die lebendige Wolke erreicht, das Bild danach mit einem normalen Flug (keine zwei Wolken hintereinander).
- Bei SPARK entfällt mit Logo die Figur vor dem Rücksprung, weil die Runde mit dem Logo beginnt.
- Nach dem Hochladen fliegt die Bühne durch die Wolke zum Logo. Ein laufender Text-Durchlauf endet dabei.
- Eine neue Drohnenzahl führt zurück zum Logo.
- Die Datei verlässt den Browser nicht: kein `fetch`, kein Speicher, keine Analyse. Die Blob-URL wird beim Ersetzen oder Entfernen freigegeben.
- Die Anfrage nennt nur „Eigenes Logo: in der Vorschau ausprobiert“, ohne Dateinamen.
- Eine Datei, die sich nicht umrechnen lässt, meldet: „Diese Datei konnten wir nicht umrechnen. Am besten klappt ein SVG oder ein PNG mit transparentem Hintergrund.“

**8. Lichtlauf entlang der Linien.**
- `rankOf()` in `show-tempo.js` nutzt jetzt `lightOrder()` aus `src/scripts/formation/` statt der Hilbert-Reihenfolge: ein Weg von Punkt zu nächstem Nachbarn, Start links unten.
- Das gilt für den Lichtlauf und für die Staffelung, mit der sich eine Form in der Wolke aufbaut. Für die Zuordnung der Drohnen in der Wolke bleibt Hilbert (O(n log n)).
- Der Kopf des Laufs ist eine Glocke ohne Kante (Breite 0,085), dahinter ein länger auslaufender Schweif (2,2-fache Breite).
- Test: An einem Kreis über einer Linie springt die neue Reihenfolge höchstens dreimal, die alte Hilbert-Reihenfolge vielfach so oft.

**9. Keine Finte in der lebendigen Wolke** (Nachtrag nach Teil B).
- Der Mittelpunkt der Bézier-Bahn lag zufällig in alle Richtungen versetzt. Ein Teil der Drohnen flog deshalb erst ein Stück zurück.
- Jetzt bleibt der Versatz entlang der Flugrichtung innerhalb der Strecke, gemessen so, wie man sie auf der Bühne sieht (x und gekipptes y, `TILT_C`/`TILT_S` in `show-field.js`, `startBeat`). Eine quadratische Bézier-Bahn läuft dann in Flugrichtung stetig vorwärts. Quer bleibt der Versatz frei, die Bahn bleibt gekrümmt.
- Gemessen mit `FINTE_REPORT=1 FINTE_CLOUD=1 node --test scripts/show-finte.test.mjs` über 86 Wolken: vorher 1.468 von 29.289 Drohnen (5,0 %, schlimmste Wolke 27 %), nachher 17 (0,06 %, schlimmste 1,3 %).
- Die 17 übrigen liegen in Bildern, deren Ziel sich während des Flugs selbst bewegt (Kompass mit kreisendem Flieger, Wellen, Tänzerin).
- `along()` in `src/scripts/show-flight.js` (Änderung aus Teil B, gehört ab jetzt zu A) ist bestätigt: Strömung nur quer zur Flugrichtung, ohne Sockel, Stärke nach der Strecke im Bild.

**10. Kein Einrasten.**
- Pause friert das genaue Bild ein, weiter läuft es von dort.
- Alle neuen Übergänge (Anlass, Rücksprung, Logo, Freischalten) starten aus den aktuellen Positionen und Geschwindigkeiten der Drohnen.

### Wie prüfen (vierzehnte Fassung, A)

- Schnell: `node --test scripts/show-price.test.mjs`. Neu darin:
  - Freischalten beim Paketwechsel
  - Mindestzahl und Hinweis an der Spur
  - Abfolge mit Text-Durchlauf und Logo
  - Lichtlauf ohne Viertelsprünge
- Browser: `tests/show-configurator.spec.ts`, neu:
  - Klick auf die Bühne mit Maus, Touch und Leertaste
  - Hinweis an der Spur
  - Paketwechsel-Meldung
  - Wolke bei Anlasswechsel und Rücksprung
  - Text-Durchlauf mit synchroner Auswahl
  - Logo per Dateiauswahl und Drag&Drop, ohne Übertragung und ohne Speicher
  - Lage von Text und Logo
  - Physik von Logo, Text-Durchlauf, Anlasswechsel und Rücksprung
- Ergebnisse am 30.10.2026, eigener Build mit den Inhalten aus Teil B:
  - Node 32/32 (`show-price`, `show-flight`, `show-finte`, `show-clouds`, `show-counts`, `show-geometry`)
  - `show-configurator.spec.ts` grün in Chromium, WebKit, Pixel 7 und iPhone 14
  - `tests/show-physics.spec.ts` 12/12
  - Seiten-Gates (axe, HTML, Netzwerk) für `/show-konfigurator/` grün, dazu axe nach Text, Logo, Pause und Hinweis
  - `astro check` 0 Fehler


## Fünfzehnte Fassung: Feinschliff nach Marcs Rückmeldung (30.10.2026, 22 Uhr)

Grundregeln bleiben: kein Einrasten, keine Finten (`scripts/show-finte.test.mjs` grün), keine ruhenden Wolken (`scripts/show-clouds.test.mjs` grün), Lichtlauf über `lightOrder`.

**1. Dropzone als Kompromiss.**
- Beim ersten Überfahren der Bühne mit der Maus zeigt sich die Dropzone einmal als Einladung (abgedunkelt, weichgezeichnet, „Dein Logo hier reinziehen“, Klasse `is-invite`).
- Sie geht, wenn die Maus die Bühne verlässt, bei einem Klick (der hält die Show wie gehabt an) oder nach 3,5 s. Danach erscheint sie nur noch beim Ziehen einer Datei oder beim Zeigen auf „Logo“.
- Einmal je Seitenaufruf, als Variable im Skript, ohne `sessionStorage` (keine Spur im Browser). Mit geladenem Logo und bei Touch gibt es keine Einladung.
- Nach dem Ablegen sofort weg (`is-done`, wie bisher).
- Code: `show-configurator.js` (Abschnitt „Eigenes Logo“), CSS-Regel `.cfg-stage.is-invite .cfg-drop` in `show-konfigurator.astro`.

**2. Freischalt-Meldung in der Sprache der Seite.** Marc: die Toast-UI war „gar nicht on-brand, lame“.
- Kein Kasten und keine Pille mehr. Die Meldung ist Schrift auf einem weichen dunklen Schein (Space Grotesk).
- Der Name des Motivs steht im FlyingStars-Verlauf (amber → orchid → cyan, `var(--grad)` als Verlaufsschrift).
- Darunter zieht ein Lichtpunkt eine feine Verlaufskante von links nach rechts und verlischt am Ende.
- Ein- und Ausblenden weich, mit Unschärfe zu scharf. Bei reduzierter Bewegung steht die Kante sofort, ohne Lichtpunkt.
- Vorgelesen wird derselbe Satz wie vorher („Neues Motiv freigeschaltet: Antrag“, `role="status"`).
- Die Teile baut `showToast()`. Weil Astro Stile auf Elemente aus dem Markup begrenzt, steht die Regel für den Namen als `.cfg-toast :global(b)`.

**3. Das hochgeladene Logo glänzt.**
- Bisher bekam das Logo keinen Lichtlauf: `runFits()` gibt Flächen keinen.
- Jetzt hat es immer einen, mit den Werten aus Studie 1 der Designsprache-Probe: `TEMPO.logoRun` in `show-tempo.js` (Breite 0,06, Stärke 0,6, Kopf von −0,3 bis 1,3 in 3,56 s = wave 0,45, ohne Pause, symmetrische Glocke, nur aufhellend).
- Die Reihenfolge ist `lightOrder` (über `rankOf`). Der Lauf beginnt mit der Ankunft und blendet über 0,8 s ein, an der Ankunft blitzt nichts.
- `runLight(u, tau, params)` nimmt dafür eigene Werte, `restAt()` in `show-field.js` reicht `beat.runLight` durch.

**4. Lichter wie auf der Probe-Seite.**
- Vorher war jede Drohne ein voller Kreis von etwa 3 px Radius, darüber ein Hof von etwa 10 px mit 35 % Deckkraft (auf einer 1440er Bühne). Das wirkte groß, weich und verschwommen.
- Jetzt rendert `show-field.js` (`sprite()`, `dotRadius()`, `render()`) wie `Swarm.draw()`/`sprite()` in `src/scripts/poc/swarm.js`:
  - ein vorgerendertes Sprite je Farbe und Größe
  - klarer, aufgehellter Kern bis 0,8 r, schmaler Übergang auf einen schwachen Hof (0,24 bei 1,15 r, aus bei 3,4 r)
  - alles additiv
  - Licht über 1 legt ein zweites Sprite mit weißem Kern darüber
- Größe: 2,1 px bis 300 Drohnen (bis dahin wächst das Bild mit, der Abstand bleibt gleich). Darüber wird das Bild dichter und die Lichter kleiner (600: 1,6 px wie in Studie 1). Kleine Bilder (Handy) bekommen kleinere Lichter (Faktor Bildmaßstab / 250 CSS-Pixel, höchstens 1, mindestens 0,45) und einen kürzeren Hof (bis 2 statt 3,4 Kernradien, `haloOf()`). Mit der Bühnenseite wie in der Probe (min. Seite / 520) liefen auf dem Handy die Höfe der dichten Formationen zu Flecken zusammen (Vergleich `/tmp/fs-konfig-r5/shots/render-compare-mobile*.png`).
- Nebenbei schneller: ein `drawImage` je Drohne statt zweier Zeichenaufrufe, keine Sortierung mehr.

**5. FLYINGSTARS ohne Querstrich im A.**
- Der Konfigurator selbst zeigt den Schriftzug nirgends als Formation. Das Motiv „Euer Logo“ ist das Bildzeichen, der QR-Code enthält die Adresse nur als Module.
- Der Schriftzug kann nur über den eigenen Text entstehen. `brandText()` in `scenes/text.js` macht aus „FlyingStars“ (Groß/klein, mit oder ohne Leerzeichen) `FLYINGSTΛRS` mit der Glyphe „Λ“ des Textplaners. Das gilt für die Druckschrift; Schreibschrift und Initialen haben kein A mit Querstrich im selben Sinn.
- Die Designsprache-Probe nutzt die Glyphe schon (`poc/page.js`).
- Offen für den Lead: Der Preisrechner (`src/scripts/pricing.js`, nicht in dieser Dateihoheit) ruft `textFormation(value)` ohne diese Umsetzung auf.

**6. Raketenflamme.**
- Ursache: Seit der vierzehnten Fassung spannte `plumeAt` die Spur zwischen Düse und Rampe, um die Finte zu entfernen. Heraus kam ein dünner Stiel an der Düse mit einem breiten Klumpen unten, der am Boden klebte. Bei der Landung ließen die 40 dunkel wartenden Flaggen-Drohnen eine Lücke zwischen Düse und Flamme.
- Jetzt hängt eine echte Flamme an der Düse (`flamePoint`, `flameTint`, `flameLight` in `show-scenes.js`):
  - schmal an der Düse, bauchig im oberen Drittel, spitz am Ende
  - innen weiß-gold, dann orange, die Spitze rot und dunkler
  - das Licht flackert, Lichtpulse laufen nach unten
- Beim Start steigen Düse und Länge mit derselben weichen Kurve. Jede Flammendrohne fliegt auf einer Geraden in eine Richtung, keine Finte; bewegt wird nur das Licht.
- Bei der Landung bilden die Spurdrohnen ohne die Flagge die Flamme. Sie wird zum Aufsetzen kürzer und geht danach in Staub über.

**7. QR-Scan auch in ODYSSEY.**
- Im Bild „Scan me“ werden zwei Drohnen der Schrift die Enden der Scanlinie (`scenes/launch.js`, `qrStory`).
- Wie in HORIZON fährt die Linie einmal von oben nach unten und pendelt dann gleichmäßig. Gemeinsame Kurve: `scanBeam()`, jetzt auch in `qrHorizon`.
- Der Code steht still und wird unter der Linie nur heller (scannbar).

**8. Die Hand aus FlyingStars' Antrags-Show.**
- Quelle: Marcs Foto ihrer Formation. Hand mit Armband, Ring am Finger, daneben eine kleine Ringformation; FlyingStars' eigene Arbeit, darf nachgebaut werden.
- Vorgehen:
  1. Helligkeitsmaxima (R+G gegen den weichgezeichneten Hintergrund) im Himmelsausschnitt, Bäume ausgeschlossen: 211 Lichter.
  2. Von Hand in vier Linienzüge geordnet: Handrücken mit erstem Finger, zweiter Finger, Ringfinger, vierter und fünfter Finger mit der Außenkante zum Handgelenk.
  3. Dazu das Armband (46 Lichter, Punkt für Punkt), der Ring am Fingeransatz (3 Lichter, pink) und die Ringformation (42 Lichter).
- Im Code (`scenes/hochzeit.js`):
  - `HAND_PHOTO`, `HAND_CUFF`, `HAND_TIP`, `HAND_RING`, `HAND_RING_WAIT`: normiert, y nach oben, Hand etwa −1 bis 1
  - `hand()` glättet die Linienzüge leicht und verteilt sie gleichmäßig auf die Drohnen neu (bei 450 rund 300 auf den Linien)
  - das Armband in Gold wie im Foto
  - der fliegende Ring wartet dort, wo im Foto die Ringformation steht, und gleitet über die Spitze auf den Ringfinger (Mittellinie aus seinen beiden Kanten, `RING_FINGER_LINE`)
- Werkzeuge (nicht im Repo): `/tmp/fs-konfig-r5/hand/detect.py`, `strokes.py`, `emit.py`.
- Kontaktbogen Foto | Linienzüge | vorher | nachher: `/tmp/fs-konfig-r5/hand-kontaktbogen.png`.
- Die Hand der elften bis dreizehnten Fassung („wrist at the top right with a cuff“, git `8c77100`) hatte schon dieselbe Lage. Die Zeichnung der vierzehnten Fassung lag flach und quer und ist ersetzt.

**9. Preissprünge.** Nichts geändert. Die Frage, wann der Preis springen soll, steht mit der Tabelle aller gleichen Preise in `docs/show-motive-inventar.md` („Was wir von FlyingStars brauchen“, Punkt 5).

### Wie prüfen (fünfzehnte Fassung)

- Schnell: `node --test scripts/show-price.test.mjs scripts/show-flight.test.mjs scripts/show-finte.test.mjs scripts/show-clouds.test.mjs scripts/show-counts.test.mjs scripts/show-geometry.test.mjs scripts/show-motive15.test.mjs`. Neu:
  - `show-motive15.test.mjs`: Schriftzug mit „Λ“, Flamme an der Düse und in Flammenform (Start und Landung), Scanlinie in ODYSSEY, Hand aus dem Foto mit Armband und Ring auf dem Ringfinger. Gegenprobe: Auf dem Stand vor dieser Runde scheitern alle vier.
  - `show-price.test.mjs`: Lichtlauf des Logos wie Studie 1, ohne Blitz an der Ankunft.
- Browser: `tests/show-configurator.spec.ts`, neu „Fünfzehnte Fassung: die Dropzone lädt … ein …“ (Einladung einmal, nicht beim zweiten Überfahren, weiter bei „Logo“; Meldung mit Namen im Verlauf, ohne Kasten) und „Ein Klick auf die Bühne beendet die Einladung …“.
- Ansehen:
  - `?anlass=hochzeit&paket=ODYSSEY&drohnen=450&motiv=antrag` (Hand)
  - `?anlass=launch&paket=ODYSSEY&drohnen=450&motiv=rakete` und `…&motiv=mond` (Flamme)
  - `?anlass=launch&paket=ODYSSEY&motiv=qr` (Scan)
  - `?anlass=hochzeit&paket=ODYSSEY&drohnen=440`, dann den Regler auf 450 (Meldung)
- Vorher/nachher der Lichter: `/tmp/fs-konfig-r5/shots/render-compare-*.png` und `render-zoom.png`.
- Ergebnisse am 30.10.2026 (eigener Build `/tmp/fs-konfig-r5/site`, nicht der Dev-Server):
  - Node 37/37 (die sieben Dateien oben)
  - `show-configurator.spec.ts` grün in Chromium, WebKit, Pixel 7 und iPhone 14
  - `show-physics.spec.ts` 12/12
  - Seiten-Gates (axe, HTML, Netzwerk) für `/show-konfigurator/` in Chromium und WebKit grün, dazu axe mit sichtbarer Meldung und Einladung
  - `astro check` 0 Fehler
  - Konsole ohne Fehler (Chromium und WebKit)


## Sechzehnte Fassung: Freischalt-Leiter, größere Lichter, Komponente und Teaser (31.10.2026)

Grundregeln bleiben: kein Einrasten, keine Finten (`scripts/show-finte.test.mjs`), keine ruhenden Wolken (`scripts/show-clouds.test.mjs`).

**1. Lichter wieder größer.** Marc: „ein Stückchen größer … dann erkennt man die Motive besser und sie wirken eindrucksvoller.“
- `dotRadius()` in `show-field.js`: Grundgröße 2,5 statt 2,1 px, auf großen Bühnen wachsen die Lichter gedämpft mit (Wurzel des Bildmaßstabs S / 300).
- Radius in CSS-Pixeln, Fassung 14 / 15 / 16: 1440er Bühne (S ≈ 330) 2,8 / 2,1 / 2,6; 2560er Bühne (S ≈ 690) 5,8 / 2,1 / 3,8; Handy 390 (S ≈ 134) 1,2 / 1,1 / 1,3.
- Kern, weicher Hof (`sprite()`, `haloOf()`), Dichte über 300 Drohnen und die kleineren Lichter auf kleinen Bühnen bleiben wie in Fassung 15.

**2. Freischalt-Leiter in jedem Paket.** Marc: „mit mehr Drohnen neue, komplexere Motive freischalten.“ Vorher hing die Schwelle am Motiv, und es gab nur 300 (= Wechsel zu ODYSSEY) und 450 (nur Antrag); innerhalb von SPARK und HORIZON änderte der Regler nie die Motive.
- `LADDER` in `src/content/show-configurator.js`, abgeleitet aus `DRONE_RANGES`: je Paket Einstieg und Mitte, auf 50 gerundet (SPARK 100/150, HORIZON 200/250, ODYSSEY 300/450).
- Jedes Motiv nennt seine Sprosse (`S0`, `S1`, `H1`, `O1`); daraus bekommt jede Fassung ihr `minDrones` (im ersten Paket die Sprosse, danach der Einstieg des Pakets). `buildSequence()` und `playable()` lesen es an der Fassung.
- Zuordnung, Begründung und neue Motive: `docs/show-motive-inventar.md`, „Freischalt-Leiter“. **Platzhalter**, geht zur Prüfung an FlyingStars.
- Neu: Riesenrad (Stadtfest, drei Fassungen in `scenes/festival.js`), Sektflasche in HORIZON (`champagne3d` in `scenes/winter.js`). Wieder gespielt ab HORIZON 250: Lotusblüten, Kopfsprung, Drache. Geteilt (`sliceExtra()` in `show-scenes.js`): Medaille aus dem Kopfsprung, Finale aus dem Feuerwerk, Papierflieger aus der Reise; die Teile stehen in der Show direkt hintereinander.
- Gesperrte Motive stehen als ungeleuchtete Lichtpunkte rechts neben der Spur (`#cfg-locks`, je Motiv ein Knopf). Zeigen oder Fokus: „Antrag · ab 450 Drohnen“, ein Klick stellt diese Drohnenzahl ein; die Meldung erscheint, die Bühne fliegt durch die Wolke dorthin. `unlockAt()` in `content/show-configurator.js`.
- Die Freischalt-Meldung erscheint bei jeder Freischaltung (Regler, Lichtpunkt, Paketknopf). **Geändert:** Ein Paketknopf meldet die neuen Motive, bleibt aber beim Motiv auf der Bühne (`setDrones(…, { fly: false })`). Grund: Mit der Leiter schaltet jeder Klick von SPARK 100 auf HORIZON ein Motiv frei, und die Bühne wäre jedes Mal weggesprungen, auch weg vom eigenen Text. Regler und Lichtpunkte fliegen weiter zum neuen Motiv. Wer das alte Verhalten will: `fly: false` am Paketknopf entfernen.
- Wächter `scripts/show-unlock.test.mjs` (unter einer Sekunde, nur Daten): am Einstieg jedes Pakets mindestens drei Motive, in jedem Paket mindestens eine Freischaltung, nie weniger Motive bei mehr Drohnen, ODYSSEY ⊇ HORIZON ⊇ SPARK, Geschichten später, `unlockAt()` und Hinweis passen zusammen.

**3. Konfigurator als Komponente.** Marc: „Auf der Preisseite sollte der Konfigurator auf jeden Fall direkt angezeigt werden.“
- `src/components/configurator/ShowConfigurator.astro`, Props `id` (Standard `konfigurator`), `headingLevel` (1 | 2, Standard 2), `heading` (Standard „Was soll am Himmel passieren?“). Sie rendert ihre eigene `<section>`, horizontal mit `var(--gutter, var(--pad))`, oben `var(--cfg-top, 84px)` für die feste Navigation.
- Die inneren IDs bleiben `cfg-*` (höchstens ein Konfigurator je Seite).
- Die Preisleiste auf dem Handy erscheint nur, solange der Konfigurator im Bild ist (`.cfg.is-near`).
- Direktlinks: `/drohnenshow-preise/?anlass=launch&paket=ODYSSEY&drohnen=450&motiv=mond#konfigurator`.
- `/show-konfigurator/` ist eine Weiterleitung in `astro.config.mjs` (`/drohnenshow-preise/#konfigurator`). Die statische Weiterleitung (meta refresh) verliert Query-Parameter; Links mit Parametern müssen direkt auf die Preisseite zeigen.
- Die Freischalt-Meldung bricht auf dem Handy nicht mehr auf halber Breite um (Breite `fit-content` statt `left: 50%` mit Verschiebung).

**4. Teaser für die Startseite (erste Fassung, interaktiv; ersetzt durch das Showreel unten).** Marc: „mit einer minimal interaktiven Version des Konfigurators schon einen Vorgeschmack geben, warum dieser Konfigurator überhaupt interessant ist.“
- `src/components/configurator/ConfiguratorTeaser.astro` + `src/scripts/show-teaser.js`: Bühne mit derselben Engine und denselben Motiven, zwei Bedienungen (Anlass, Drohnenzahl). Darunter die Motive des Anlasses, gesperrte leise mit „ab 250“, dazu Paket und Preis live und der Knopf „Show selbst zusammenstellen“.
- Der Knopf übergibt Anlass, Drohnenzahl und das Motiv auf der Bühne: `/drohnenshow-preise/?anlass=hochzeit&drohnen=250&motiv=lotus#konfigurator`.
- Props: `id` (Präfix der IDs, Standard `cft`), `occasion` (Standard `hochzeit`), `drones` (Standard 200), `href` (Standard `/drohnenshow-preise/`), `cta`. Kein Section-Kopf, kein Section-Abstand.
- Leistung: Engine und Motive laden erst, wenn der Block auf 300 px an den Viewport herankommt (IntersectionObserver, dynamischer Import). Außerhalb des Viewports, bei `html.motion-paused` und bei reduzierter Bewegung zeichnet die Engine nicht und zeigt das Motiv in Ruhe (`createField`).
- Prüfseite `/poc/konfigurator-teaser/`: am 04.11.2026 gelöscht (Marc); der Teaser-Test läuft auf der Startseite, die Abläufe „marke“/„hochzeit“ auf Werbung und Hochzeit.

### Wie prüfen (sechzehnte Fassung)

- Schnell: `node --test scripts/show-unlock.test.mjs scripts/show-price.test.mjs scripts/show-geometry.test.mjs scripts/show-counts.test.mjs scripts/show-motive15.test.mjs scripts/show-flight.test.mjs`, dazu einzeln `scripts/show-clouds.test.mjs` (etwa 30 s) und `scripts/show-finte.test.mjs` (etwa 2 min).
- Browser: `tests/show-configurator.spec.ts` (neu: gesperrte Lichtpunkte), `tests/show-teaser.spec.ts` (Laden in der Nähe des Viewports, Freischalten, Übergabe, Pause außerhalb und bei reduzierter Bewegung), `tests/show-physics.spec.ts` (neu: SPARK 190 und HORIZON 290). Die Specs laufen standardmäßig gegen `/drohnenshow-preise/`; `CFG_PATH=/poc/konfigurator-teaser/` bzw. `TEASER_PATH=/` stellen eine andere Seite ein.

## Startseiten-Teaser als Showreel (31.10.2026, abends)

Marc zur ersten Teaser-Fassung: Interaktiv ist für die Startseite zu komplex. Stattdessen ein vorprogrammierter Ablauf „wie so ein Quick-Showreel“ in schnellerem Tempo durch die „Greatest Hits“ von SPARK bis ODYSSEY, dazwischen lebendige Wolken mit „Quick Morphing Action“, ein Beispiel-Logo („das könnte dein Logo sein“) und ein reduziertes, vor-animiertes Wireframe des Konfigurators.

- **Bühne** (`src/scripts/show-teaser.js`, `buildReel()`): eine Szene aus ausgewählten Bildern verschiedener Pakete und Drohnenzahlen, gebaut mit `buildSequence()` wie im Konfigurator, in der Paketfarbe. Jedes Motiv ist ein eigenes Segment und wird durch die lebendige Wolke erreicht; nach dem letzten geht es durch die Wolke zurück zum ersten.
- **Ablauf** (`REEL`): Herz (SPARK 100) → Schmetterling (SPARK 150) → Beispiel-Logo mit Lichtlauf (SPARK 150, Schrift „Das könnte euer Logo sein“) → Rakete als Körper (HORIZON 200) → Tänzerin in 3D (HORIZON 250) → Orbit und Mondlandung (ODYSSEY 450) → Drache speit ein Feuerwerk (ODYSSEY 450) → Finale mit Goldregen (ODYSSEY 600).
- **Tempo:** nur über die Show-Uhr, `REEL_RATE = 2.5` (`field.setRate`). Flug, Wolke, Eigenbewegung und Licht laufen gleichmäßig schneller, darum gibt es weder Einrasten noch Finten (Engine und Motive unverändert). Eine Wolke dauert etwa 1,7 s, ein Motiv steht etwa 1,2 bis 1,6 s; die Mondlandung als Geschichte etwa 5 s. Ein Durchlauf dauert gemessen 28 bis 32 s (Chromium und WebKit, Dev-Server).
- **Wireframe** (`ConfiguratorTeaser.astro`, `aria-hidden`, keine Formularelemente): Platzhalterbalken für Überschrift und Beschriftungen; echte Wörter nur dort, wo sie den Wechsel zeigen (Anlass-Chips, Paketnamen, Drohnenzahl, Preis). Mit jedem neuen Motiv springt der Anlass-Chip, der Paketknopf wechselt SPARK → HORIZON → ODYSSEY (mit kurzem Druck statt eines sichtbaren Cursors), der Regler wandert nach rechts, Zahl und Preis folgen. Auf dem Handy bleiben nur Paketknöpfe und Regler.
- **Bedienbar** ist nur der Knopf „Show selbst zusammenstellen“ → `/drohnenshow-preise/#konfigurator`. Die Bühne hat eine kurze Textalternative.
- **Leistung:** wie zuvor; Laden erst auf 300 px vor dem Viewport, Pause außerhalb und bei `html.motion-paused`. Bei reduzierter Bewegung steht von Anfang an das Drachen-Feuerwerk in Ruhe (`STILL`).
- **Props:** `id`, `href` (Standard `/drohnenshow-preise/#konfigurator`), `cta`. `occasion` und `drones` werden noch angenommen, haben aber keine Wirkung mehr.
- **Prüfen:** `tests/show-teaser.spec.ts` (Laden in Viewport-Nähe; keine Formularelemente, ein Link, Textalternative; das Showreel läuft durch SPARK, HORIZON, ODYSSEY, zeigt das Logo und beginnt von vorn durch die Wolke; Pause außerhalb, Standbild bei reduzierter Bewegung), 12/12 in Chromium, WebKit und Pixel 7. Frame-Folge über einen Durchlauf: `/tmp/fs-r7-k/r1-sheet.png`.

### Runde 8: reduziertes Wireframe, Schärfe-Effekt, Leistung (31.10.2026, abends)

Marcs Rückmeldung zum Showreel.

- **Wireframe stark reduziert und größer** (Spalte `clamp(320px, 31vw, 460px)`, Bühne entsprechend schmaler): unbeschriftete Anlass-Pills (die gewählte hell, sie wechselt nur mit dem Anlass), die drei Paketknöpfe in ihren Farben, der Regler mit „N Drohnen“ und der Preis als sechs Euro-Zeichen (`euros()` in `show-teaser.js`: SPARK 100 = €, SPARK 150 = €€, HORIZON 200 = €€€, HORIZON 250 = €€€€, ODYSSEY 300 = €€€€€, ab 450 = €€€€€€; nicht erreichte gedimmt). Keine Platzhalterbalken, kein Paket-Badge auf der Bühne. Auf dem Handy nur Paketknöpfe und Regler.
- **Schärfe-Effekt:** Zwei Motive stehen mehrmals hintereinander mit wachsender Drohnenzahl (`drones: [...]` im `REEL`; die erste Stufe kommt aus der Wolke, jede weitere mit einem normalen Flug, das Bild verdichtet sich, der Regler fährt mit):
  - der Drache als 3D-Körper (`dragon3d`) bei 250, 350 und 450 Drohnen: seine Flügel sind ein feines Gitter, das mit mehr Drohnen sichtbar geschlossener wird. Der Delfin ist nicht im Vergleich gelaufen.
  - am Ende das FlyingStars-Logo der Designsprache-Probe (ohne Ring) bei 100, 200, 300, 450 und 600 Drohnen. Das Logo ist selbst ein Raster aus 88 Lichtpunkten; mit mehr Drohnen kommen Lichter auf die Verbindungen zwischen benachbarten Punkten (`logoPoints()`, wie `DENSE` in `poc/page.js`, aber stufenlos). Bei 100 Drohnen das Raster, bei 600 durchgehende Linien. Dazu „Euer Logo wird mit mehr Drohnen schärfer“ (Entwurf).
  - Die Lichtgröße folgt der Drohnenzahl des Bildes (`beat.drones`, neu und optional in `show-field.js`) in Viertelpixel-Schritten etwa alle 90 ms, ohne Sprung.
- **600 Drohnen:** die 3D-Maske aus Bokkenrijders statt des Feuerwerks. Bei reduzierter Bewegung steht sie als Standbild.
- **Tempo:** `REEL_RATE = 3` (vorher 2,5). Die Wolke ist im Showreel kürzer und ruhiger: `createField(…, { cloudTime: 0.55, cloudSpread: 0.5 })`, neu und optional, im Konfigurator unverändert 1.
- **Rahmung:** Jedes Bild hat `zoom: 0.82`, so bleiben Eigenbewegung und 3D-Tiefe auf der Bühne (die Tänzerin war unten angeschnitten). Alle Motive bei 1440 und 390 px über einen ganzen Durchlauf geprüft.
- **Ablauf jetzt:** Herz (SPARK 100) → Schmetterling (SPARK 150) → Rakete (HORIZON 200) → Tänzerin (HORIZON 250) → Drache 250 / 350 / 450 → Orbit und Mondlandung (ODYSSEY 450) → Bokkenrijders (ODYSSEY 600) → FlyingStars-Logo 100 / 200 / 300 / 450 / 600 → von vorn. Ein Durchlauf dauert 33 s (Chromium und WebKit).

**Leistung: warum die Seite nach einer Weile hing.**
- Ursache: Der Sprite-Speicher in `show-field.js` legte für jede Farbe ein vorgerendertes Canvas an. Im Flug werden die Farben stetig überblendet, dabei entstand laufend ein neuer Schlüssel, und bei 4000 Einträgen wurde der Speicher ganz geleert und neu gefüllt. Das Showreel wechselt ständig das Motiv und traf das voll.
- Gemessen über 4 Minuten Loop am Build (Chromium per CDP `Performance.getMetrics`, WebKit über rAF-Zähler und Prozessspeicher; Skripte `/tmp/fs-r8-k/perf*.mjs`, Protokolle daneben). Der Dev-Server eignet sich dafür nicht, weil HMR die Seite neu lädt, sobald jemand im Checkout eine Datei ändert.

  | | vorher | nachher |
  |---|---|---|
  | neue Canvas-Elemente | 34.800 in 4 min (≈ 145/s), ohne Ende | sättigt bei ≈ 2.800, danach praktisch keine neuen |
  | WebKit, Speicher Webinhalt | 500–900 MB, schwankend | 230–400 MB |
  | WebKit, längste Bildlücke | bis 216 ms | bis 69 ms |
  | Chromium, Bildrate / CPU | 60 fps / ≈ 19 % | 60 fps / ≈ 21 % (schnelleres Tempo) |
  | Chromium, JS-Heap | 5–13 MB | 6–9 MB |
  | nur Hero-Video (Teaser nie geladen) | 3 % CPU, 46 Canvas, WebKit 240–306 MB | unverändert |

- Behoben: 16 statt 32 Farbstufen je Kanal (Abweichung höchstens 8/255, auf einem leuchtenden Punkt unsichtbar), das Sprite in der Mitte seiner Stufe, ein Speicher für 6000 Sprites, bei vollem Speicher fallen nur die 500 ältesten heraus. Gilt auch für den Konfigurator.
- Hero-Video und Teaser zusammen lasten die CPU nicht dauerhaft aus (Chromium ≈ 21 %); der Teaser zeichnet nur, solange er sichtbar ist.
- Nicht gefunden: keine doppelten rAF-Schleifen, keine wachsenden Arrays oder Listener (konstant 163), keine langen Tasks.

### Runde 9: drei Abläufe, Logo mit Schriftzug, Kolibri, weniger Text im Konfigurator (31.10.2026, nachts)

**Teaser** (`ConfiguratorTeaser.astro`, `show-teaser.js`):
- Anlass-Pills ersatzlos raus (unbeschriftet verstand sie niemand). Über den Paketknöpfen steht „Paket“, auch auf dem Handy.
- Euro-Zeichen in acht Stufen (`EURO_STEPS`): 100 = €, 150 = €€, 200 = €€€, 250 = €€€€, 300 = €€€€€, 400 = 6, 450 = 7, ab 510 = 8. Jede Drohnenzahl im Ablauf hat damit ihre eigene Stufe; der Spec prüft das über einen ganzen Durchlauf.
- **Logo zuerst:** 100 → 200 → 300 Drohnen (ab 300 sieht das Logo aus, wie es soll), danach das verkleinerte Logo mit dem Schriftzug FLYINGSTΛRS darunter bei 450 und 600 (Druckschrift des Textplaners, `lettering()` jetzt aus `scenes/text.js` exportiert, im FlyingStars-Verlauf).
- **Kolibri über die drei Pakete** statt der Drachen-Steigerung: 2D bei 150 (SPARK), 3D bei 250 (HORIZON), als Geschichte bei 300 (ODYSSEY, alle vier Akte). Jede Stufe hat ihren eigenen Bildausschnitt, damit das 2D-Bild nicht nach dem Rahmen der Geschichte skaliert wird.
- **Bühne als Link:** Beim Zeigen ein dezenter Schleier mit „Eigene Show zusammenstellen →“ (leiser als die Dropzone im Konfigurator), ein Klick führt zum selben Ziel wie der Knopf. Kein eigener Tab-Stopp (`tabindex="-1"`, `aria-hidden`); per Tastatur führt der Knopf dorthin, hat er den Fokus, erscheint der Hinweis auch auf der Bühne. Auf Touch-Geräten ohne Zeigen gibt es den Schleier nicht.
- Die erste Ansicht fliegt ein (vorher stand sie sofort und zeigte damit das Ende des ersten Motivs, beim Logo gleich 600 Drohnen).
- **Abläufe** über die Prop `reel` (`REELS` in `show-teaser.js`):

  | reel | Ablauf | Dauer |
  |---|---|---|
  | `start` (Standard) | FlyingStars-Logo 100 / 200 / 300 → mit Schriftzug 450 / 600 → Herz (SPARK 100) → Kolibri 150 / 250 / 300 → Orbit und Mondlandung (450) → Bokkenrijders (600) | 33 s |
  | `marke` (Werbung) | Logo wie oben → Glühbirne (SPARK 100) → Spirale (150) → Rakete (HORIZON 200) → QR-Code (250) → Glühbirne als Geschichte (ODYSSEY 300) → Mondlandung (450) | 30 s |
  | `hochzeit` | Initialen „A & B“ im Herz bei 100 / 200 / 300 (über den Textplaner, stehen und werden dichter, ohne Schreib-Licht) → Herz (SPARK 100) → Schmetterling (150) → Sektgläser (HORIZON 200) → Ringe (250) → Antrag (ODYSSEY 450) | 26 s |

  Standbild bei reduzierter Bewegung: Bokkenrijders (`start`), Mondlandung (`marke`), Antrag (`hochzeit`).

**Konfigurator, weniger Text** (`ShowConfigurator.astro`):
- Der Hinweis „Lade nur Logos hoch …“ steht hinter einem Info-Zeichen an „Euer Text, euer Logo“: Klick schaltet um, Fokus und Zeigen öffnen, Esc oder ein Klick daneben schließt. Die Logo-Auswahl verweist weiter darauf (`aria-describedby`).
- Der Prototyp-Hinweis ist eine Zeile: „Prototyp: Beispielmotive; Zuordnung, Drohnenbereiche und Aufpreise sind Platzhalter.“
- Die Zeile unter dem Preis nennt die Drohnenzahl nicht mehr (sie steht am Regler): „ca. 13 Min · netto zzgl. Anfahrt“.
- Geprüft und bewusst geblieben: „(optional)“, die Statusmeldungen beim Logo, „Die Vorschau ist gerade nicht verfügbar“.

**Prüfen:** `tests/show-teaser.spec.ts` (neu: keine Pills, „Paket“, acht Euro-Stufen, Logo zuerst und Kolibri über die Pakete, jede Drohnenzahl mit eigener Stufe, Schleier beim Zeigen und bei Fokus auf dem Knopf, Abläufe `marke` und `hochzeit` auf der Prüfseite), `tests/show-configurator.spec.ts` (neu: „Runde 9: weniger Text …“). Beide grün in Chromium, WebKit und Pixel 7 gegen einen eigenen Build (der Dev-Server lädt neu, sobald im Checkout gespeichert wird).

### Runde 10: Herz über die Pakete, Rakete ohne Orbit, QR-Geschichte, gedämpfte Paketfarben (31.10.2026, nachts)

**Teaser:**
- FLYINGSTΛRS bei 600 Drohnen deutlich größer als bei 450 (halbe Breite 1,7 statt 0,8; die Schrift trägt die zusätzlichen Drohnen). Die Logo-Stufen sind jetzt 100 / 300 / 450 / 600.
- Bildunterschrift „Platz für euer Logo“ (Entwurf) statt des erklärenden Satzes.
- Das Herz zeigt die drei Pakete: ein Herz in 2D (SPARK 100) → Herztunnel (HORIZON 200) → Amors Pfeil trifft das Herz in 3D (ODYSSEY 300). Der Kolibri ist raus; ein gekürzter Kolibri hätte den Ablauf wieder über 25 s gebracht.
- Rakete ohne Orbit: die Zündung auf der Rampe, danach direkt die Landung auf dem Mond (ohne Wolke dazwischen, `cloud: false` am Eintrag).
- QR-Code-Geschichte (Nachricht kommt an → der Code baut sich auf → „Scan me“) in `start` und `marke`.
- Tempo 3,4× (vorher 3×).

  | reel | Ablauf | Dauer |
  |---|---|---|
  | `start` | Logo 100 / 300 / 450 / 600 → Herz 100 / 200 / 300 → QR-Code (300) → Rakete und Mondlandung (450) → Bokkenrijders (600) | ≈ 25 s |
  | `marke` | Logo wie oben → Glühbirne (100) → Spirale (150) → QR-Code (300) → Rakete und Mondlandung (450) | ≈ 21 s |
  | `hochzeit` | Initialen 100 / 200 / 300 → Herz 100 / 200 / 300 → Sektgläser (200) → Ringe (250) → Antrag (450) | ≈ 21 s |

  Standbild bei reduzierter Bewegung: Bokkenrijders, Mondlandung, Antrag.

**Paketknöpfe in Teaser und Konfigurator:** Das gewählte Paket bleibt voll eingefärbt, die anderen behalten ihre Farbe gedämpft: `color-mix(in srgb, var(--c) 40%, var(--faint))`. Kontrast der Beschriftung:

| Paket | gedämpft | auf der Teaser-Karte | auf --ground (Konfigurator) |
|---|---|---|---|
| SPARK (Amber) | #c0935a | 6,7 : 1 | 7,0 : 1 |
| HORIZON (Orchid) | #b27ba7 | 5,6 : 1 | 5,8 : 1 |
| ODYSSEY (Cyan) | #6eb2ab | 7,7 : 1 | 8,0 : 1 |

Im Konfigurator wird beim Zeigen auf einen Paketknopf der Name voll farbig. Beide Specs prüfen, dass die nicht gewählten Paketnamen farbig (nicht grau) sind und mindestens 4,5 : 1 erreichen.


## Runde 11: Anlass als Dropdown, gleitender Paketrahmen, mehr Luft (1.11.2026)

Marcs Rückmeldung zum Konfigurator auf der Preisseite und zum Teaser.

- **Anlass als Dropdown** (Marc: Den Anlass wechselt man selten, ein „nicer, eleganter Dropdown“ reicht): ein natives `<select id="cfg-occasion">` mit eigenem Rahmen, Pfeil und dunkler Liste (`color-scheme: dark`). Die Tastatur, der Screenreader und die Auswahlliste des Geräts bleiben die des Browsers. Statt Anlass-Pills gibt es keine Radios mehr; Specs wählen per `selectOption`.
- **Reihenfolge wie auf der Startseite** (`OCCASIONS` in `src/content/show-configurator.js`): Launch (Unternehmen), Jubiläum (auch Unternehmen), Stadtfest (Städte & Gemeinden), Hochzeit (Hochzeit & Privat), Kultur (Festivals & Konzerte), Winter & Silvester (`season: [11, 12]`). Agenturen und Indoor haben keinen eigenen Anlass. `bySeason()` im selben Modul rückt Saison-Anlässe in diesen Monaten nach vorn, mit derselben Regel wie die Anlass-Karten in `Occasions.astro` (stabil, Saison zuerst). Der Build ordnet mit seinem Monat vor, das Skript beim Laden mit dem Monat des Besuchs. Vorausgewählt ist der erste Anlass der Liste, `?anlass=…` gewinnt.
- **Gleitender Rahmen an den Paketknöpfen** (Marc: harte Hover-Wechsel ohne Übergang): `.cfg-ind-sel` zeigt das gewählte Paket in seiner Farbe und gleitet beim Wechsel dorthin (0,45 s). `.cfg-ind-hover` gleitet beim Zeigen mit halber Deckkraft zum Paket unter der Maus. Steht die Maus auf dem gewählten Paket oder verlässt sie die Gruppe, blendet der Schatten aus und gleitet zurück. Das ist reines CSS: `:has(input[value=…]:checked)` setzt `--i` und `--sc`, `:has(label:nth-child(…):hover)` setzt `--h` und `--hc`. Deshalb folgt der Rahmen jeder Änderung des Radios, auch dem Regler. Hover gibt es nur bei `(hover: hover)`. Bei reduzierter Bewegung wechselt der Rahmen sofort. Die Beschriftung behält den Stand von Runde 10: gewählt voll farbig, die anderen gedämpft (≥ 4,5 : 1).
  - Stolperstein: Die Regel für die Knopfbeschriftung hieß `.cfg-pkgs span` und traf auch den Rahmen (ebenfalls ein `span`). Damit überschrieb sie dessen Transition mit `color 0.3s`, und nichts glitt. Jetzt heißt sie `.cfg-pkgs label > span`.
  - Teaser (`ConfiguratorTeaser.astro`): dieselbe Mechanik mit `.cft-ind`, gesteuert über `.is-on`, das `show-teaser.js` setzt. Ohne Hover, weil das Wireframe Dekoration ist.
- **Mehr Luft:** Der Abstand zwischen den Eingabegruppen beträgt `clamp(26px, 2.2vw, 34px)`, vorher 16 px; bei niedrigen Desktop-Fenstern 18 px, vorher 10 px. Paket, Preis, Dauer und Anfrage stehen als eigene Fläche `.cfg-sum` im Kartenstil der Site (`--surface`, `--line`, `--radius`) mit zusätzlichem Abstand zur Bedienung.
- **Einordnung unter dem Knopf:** „Alle Motive hier sind Beispiele. Für eure Show entwerfen wir eigene.“ (`#cfg-note`, vorher `#cfg-placeholder`). Dass Drohnenbereiche, Aufpreise und die Freischalt-Leiter Platzhalter sind, steht jetzt nur noch als Kommentar im Markup und in `show-packages.ts` bzw. `show-configurator.js`.
- **Anker:** Seit der Konfigurator unter den Paketen steht, kommt man über `#konfigurator` hin. `html` hat `scroll-padding-top: 88px`, die Section bringt den Platz für die Navigation aber selbst mit (`--cfg-top`). Ohne Ausgleich landete sie 88 px zu tief, und bei 1280 × 720 lagen Spur und Anfrage-Knopf unter dem Rand. Jetzt gilt `.cfg { scroll-margin-top: -88px }`.
- **Teaser:** Der Standard-Knopf heißt „Zum Show-Konfigurator“. Eigene Beschriftungen übergeben `drohnenshow-hochzeit.yaml` („Motive im Konfigurator ansehen“) und `drohnenshow-werbung.yaml` („Logo im Konfigurator ausprobieren“).

### Wie prüfen (Runde 11)

- `tests/show-configurator.spec.ts`: Die Specs öffnen den Konfigurator jetzt über `#konfigurator` wie jeder Link der Site. Neu sind fünf Tests:
  - Dropdown, Ordnung, Vorauswahl und `?anlass`
  - Silvester vorn im November, über `page.clock.setFixedTime`
  - Gleiten bei Klick und Regler mit Zwischenwerten je Bild, Schatten beim Zeigen mit halber Deckkraft in der Paketfarbe
  - reduzierte Bewegung
  - Ergebnisfläche mit Abstand
- `tests/show-teaser.spec.ts`: Der Rahmen sitzt am gewählten Paket in dessen Farbe und gleitet über Zwischenwerte; neuer Knopftext.
- Ergebnisse am 1.11.2026 gegen einen eigenen Build (`/tmp/fs-r11-cfg/dist`, Vorschau auf 4399):
  - Konfigurator 67 bestanden, 7 übersprungen (Desktop und Pixel 7)
  - Teaser 14 bestanden, 2 übersprungen; mit `TEASER_PATH=/` 13 bestanden, 3 übersprungen
  - `astro check` 0 Fehler
  - Unit-Wächter 52/52 und `show-clouds` 5/5
- Offen: `tests/show-physics.spec.ts` wählt den Anlass noch über `label:has([name=occasion][value=…])` und muss auf `page.locator('#cfg-occasion').selectOption(…)` umgestellt werden.
- Screenshots in Chromium und WebKit (1440 und 390 px, Zwischenframes beim Gleiten): `/tmp/fs-r11-cfg/`.

## Runde 24: Motive aus dem FlyingStars-Katalog, Drohnenbedarf des Textes (5.11.2026)

Anlass: FlyingStars hat im Meeting am 5.11. den internen Motivkatalog gezeigt. Laut Marcs Gesprächsbericht liegen die meisten geflogenen Shows zwischen 100 und 150 Drohnen. SPARK braucht deshalb die größte Auswahl. Die Einzelheiten stehen in [show-katalog-motive.md](show-katalog-motive.md).

- 32 Katalogmotive mit 50 Varianten, gezählte Punkte, eigene Farben. Sie spielen ab der Punktzahl ihrer kleinsten Variante, in Zehnerschritten. SPARK zeigt je Anlass jetzt 4–7 Motive bei 100 Drohnen und 7–11 bei 150 (vorher 3 und 4).
- Je Paket eine eigene Fassung, damit ein größeres Paket nie weniger zeigt (Wächter `show-unlock`): SPARK die Formation, HORIZON als Körper mit zweiter Ebene, ODYSSEY Licht zeichnet die Form, dann wird sie zum Körper.
- Die Bewegung ist abgeleitet, nicht aus Flugdaten: Räder, Nadel, Ballons, Gläser, Fahnen; 3D-Formationen drehen sich schon in SPARK. Das korrigiert die Vereinfachung „SPARK = Standbild“, wo FlyingStars' eigene Daten 3D mit 100–160 Drohnen belegen.
- Gesperrte Motive: ein Lichtpunkt je Schwelle, nicht je Motiv. Mit 13 Motiven drückten die Einzelpunkte auf dem Handy die Tempo-Knöpfe aus dem Bild.
- Eigener Text: zehn Drohnen je Zeichen ohne Leerzeichen (Regel des Katalogs). Unter dem Feld steht „8 von 10 Zeichen bei 100 Drohnen“. Braucht der Text mehr, steigen Drohnenzahl, Paket und Preis sichtbar mit. Ein Absenken darunter hält der Regler und sagt warum. Höchstens 24 Zeichen, also 240 Drohnen.
- Wächter: `scripts/catalog-motifs.test.mjs` (Daten, Mindestzahlen, Varianten wachsen mit), dazu die bestehenden `show-unlock`, `show-counts`, `show-finte`, `show-clouds`.

## Runde 27: Logo-Modus mit dem Logo-Konverter v10 (12.11.2026)

Marc (12.11.): eigener Logo-Modus im echten Konfigurator; die Logo-Regler erscheinen nur, wenn jemand ein Logo hochlädt
oder in den Modus wechselt; im Modus laufen Kundenlogos als Formation durch; „Paket“ statt „Wie aufwendig?“; Hinweis bei
zu vielen Drohnen ohne Versprechen („…damit unsere Designer einschätzen können, ob und wie…“). Detailgrad und
Budget-Flexibilität als ein Regler (Zonen wie die Paketfarben am Drohnenregler).

- Schalter „Logo-Modus“ in „Euer Text, euer Logo“. Ohne eigenes Logo zeigt die Bühne die Kundenlogos
  (`public/brand/logos/kunde-*-weiss.svg`), vorberechnet in `public/media/logo-modus/kundenlogos.json` (erzeugt mit
  `freelance/clients/flyingstars/23-logo-drohnen-konverter/tools/v10/examples.mjs`, 8 Drohnenzahlen von 100 bis 600). Es
  laufen nur Logos, die in die gewählte Zahl passen (flexibel, sonst die strenge Fassung bis +10 %).
- Ein hochgeladenes Logo schaltet den Modus ein. Es läuft durch den Konverter v10 (`src/scripts/logo-v10/`, vendored mit
  `node integration/vendor.mjs` aus Ordner 23, nicht hier ändern): Kontur, keine Mischung aus Kontur und Mittellinie in einem
  Zeichen. Statt Strichgraph (Runde 26) und dunkler Reserve gilt: Braucht das Logo mehr als die gewählte Zahl, steht es mit
  seiner eigenen Zahl da (Lichtgröße wie bei einer Show dieser Größe) und der Hinweis sagt es.
- Regler „Detailgrad“ (nur mit eigenem Logo): drei Zonen Streng / Mittel / Flexibel = Budget-Flexibilität des Konverters
  (opts.flex), die Stelle in der Zone = Liniendichte (rechts lockerer, mehr Formen). „Automatisch“ = Flexibel.
- „Teile entfernen“: flache Ansicht über der Bühne (die Bühne ist gekippt und fliegt, Klicks wären dort nicht verlässlich):
  Klick wählt ein zusammenhängendes Farbstück, ein zweiter Klick das ganze Element, Rahmen aufziehen wählt mehrere; Entf,
  Esc; entfernte Teile bleiben als Geister sichtbar und lassen sich wiederherstellen. Alles entfernen geht nicht.
- Laden: `logo-mode.js` und der Konverter kommen erst beim Wechsel in den Modus bzw. mit der ersten Datei (dynamischer
  Import, der Konverter rechnet im Worker); die Kundenlogo-Daten (312 KB) erst im Modus.
- Das Logo verlässt den Browser weiterhin nicht: „Anfrage senden“ führt nur zum Formular (`/#anfrage`). Ein Logo-Anhang
  am Formular ist vorbereitet, aber nicht gebaut (Rechtsrecherche:
  `23-logo-drohnen-konverter/integration/recherche-logo-anhang.md`).
- Geprüft: Chromium und WebKit (Playwright, 1440 px): Kundenlogo-Folge, Upload (Energizer), Hinweis über der Zahl, Teile
  entfernen und Neuberechnung. Unit-Tests: 726 von 731; die drei Fehler bestehen auch ohne diese Runde bzw. sind behoben
  (px-Wert). Nicht geprüft: Playwright-Specs des Konfigurators (`tests/show-*.spec.ts`), Handys, Marcs Safari 18.6.
- Offen: Text-Drohnenkopplung an die Budget-Flexibilität (Marcs Idee: bei strengem Budget nur so viele Zeichen wie Drohnen);
  „Was zeigen“ (ganzes Logo / nur Symbol) bewusst weggelassen; die Wolke als Ladezustand beim ersten Rechnen fehlt im
  Konfigurator noch (bis das Logo fertig ist, läuft die bisherige Show weiter).
