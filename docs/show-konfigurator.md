# Show-Konfigurator (Prototyp)

Stand: 10. Oktober 2026, elfte Fassung. Frühere Stände sind als Tags erhalten: `konfigurator-v6`, `konfigurator-v8`, `konfigurator-v9`, `konfigurator-v10`. Die Route ist `/show-konfigurator/`, nicht verlinkt und mit `noindex`. Der Konfigurator ist ein Vorschlag an FlyingStars und ersetzt den Preisrechner der Referenz nicht.

## Das Modell: zwei Entscheidungen, die sich nicht gegenseitig verändern

- **Anlass** (Hochzeit, Jubiläum, Launch, Kultur, Winter & Silvester, Stadtfest) bestimmt, **was** am Himmel steht: vier oder fünf Motive, die als kleine Show nacheinander laufen, und den Anlass in der Anfrage. Er verändert weder Paket noch Preis.
- **Wie aufwendig?** hat drei Knöpfe, einen je Paket, in der Paketfarbe. Er bestimmt, **wie**: Paket, Drohnenzahl, Art der Bewegung und damit den Preis. Der Preis ändert sich genau dann, wenn ein anderer Knopf gewählt wird.

| Stufe | Paket | Drohnen | Preis | Enthalten (Wortlaut der Paketbeschreibungen) |
|---|---|---|---|---|
| Klassisch in 2D | SPARK | 100 | ab 7.900 € | vordefinierte Formationen wie Herzen oder Ringe und bis zu vier eigene Elemente |
| 3D in Bewegung | HORIZON | 200 | ab 15.900 € | alles aus SPARK plus individuelle 2D-Animationen und einfache 3D-Elemente |
| Erzählte 3D-Show | ODYSSEY | 300 | ab 34.900 € | alles aus HORIZON plus komplexe 3D-Animationen und volumetrische Effekte |

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
| Hochzeit | Herz | unverändert | Herztunnel: fünf Herzen in der Tiefe, Licht fließt nach hinten | unverändert |
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

**Zwischenbilder bei SPARK**

Marc: Torbogen, Ornamente und Pfeilformen „für zwischendurch“. Zwischen zwei SPARK-Motiven erscheint kurz eine geometrische Figur: ein Tor aus Licht, ein Fächer oder Pfeile zur Mitte (`scenes/interludes.js`). Licht zeichnet sie in 1,4 s, danach steht sie 1,6 s. Die Knöpfe ‹ › überspringen Zwischenbilder, ein Paketwechsel landet auf dem Motiv.

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
