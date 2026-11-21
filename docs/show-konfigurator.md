# Show-Konfigurator

Gültiger Stand: 20.11.2026 (Runde 9). Dieser Abschnitt beschreibt den aktuellen Vertrag. Der Anhang „Verlauf“ darunter
protokolliert alle Fassungen seit Oktober in zeitlicher Reihenfolge; dort beschriebene Modelle (Paketwahl, Ergebnis-Spalte,
Leistungsvergleich) gelten nur, wenn dieser Abschnitt sie nennt.

## Wo er steht

- Komponente `src/components/configurator/ShowConfigurator.astro`, einziger Einsatz auf der Preisseite
  (`src/templates/PricingPage.astro`, Anker `#konfigurator`). Die Seite beginnt mit ihm: H1, Einleitung und Eckdaten der
  Preisseite sind sein Kopf (Slots `head`, `intro`, `facts`). `/show-konfigurator/` leitet dorthin weiter.
- Logik `src/scripts/show-configurator.js`, Bühne `src/scripts/show-field.js` mit Motiven aus `src/scripts/scenes/` und
  `show-scenes.js`, Flugbahnen `show-flight.js`. Stile `src/styles/show-configurator.css`, nur auf Seiten mit Konfigurator
  eingebettet.
- Startseiten-Teaser `ConfiguratorTeaser.astro` (`show-teaser.js`, `configurator-teaser.css`): selbstlaufendes Showreel
  mit reduziertem Wireframe, ohne Paketknöpfe, Regler neutral; er verlinkt in den Konfigurator.
- Seitenkopf der Hochzeitsseite (Runde 14, `landingHero.show: hochzeitHero`, `src/scripts/hero-show.js`): dieselbe Engine
  und `buildReel` wie der Teaser, ohne Wireframe, Tempo `HERO_RATE` 2,2 statt 3,4, Ablauf `REELS.hochzeitHero`. Einträge
  eines Ablaufs können mit `tier` die Fassung unabhängig von der Drohnenzahl wählen (erster Tanz in 3D bei 300). Folge und
  Begründung: docs/DESIGN.md, „Formationen im Rahmen“. Der Teaser-Ablauf `hochzeit` zeigt seitdem Initialen, Unendlich-Zeichen
  (2D → 3D), Sektflasche mit Korken und Blütenspalier statt Herz, Gläsern, Ringen und Antrag.

## Aufbau

Ab Desktop links das Bedienfeld, rechts die klebende Vorschau; auf dem Handy Vorschau (klebt), Eingaben, Paket-/Preis-Box,
„Immer dabei“, Einleitung, unten die Preisleiste. Abstand Seitenkopf → Konfigurator ist die freigegebene Ausnahme von
`--head-gap-content` (docs/DESIGN.md).

Eingaben in dieser Reihenfolge:
1. **Anlass** (Pills `.chips-quiet`): Winter & Silvester, Marketing (ID `launch`), Jubiläum, Stadtfest, Hochzeit, Kultur,
   Logo. Bestimmt, was am Himmel steht; ändert weder Paket noch Preis.
2. **Art der Show** (dieselben Pills): 2D, 3D, 3D+ (`SHOW_ARTS` = `2d`, `3d`, `story`). Darunter je Art drei Häkchen aus
   Moritz' Paketbeschreibungen, per `opacity` übergeblendet. Mindest-Drohnenzahl je Art (`artMin`): 100, 200, 300. Ein
   Wechsel zu einer kleineren Art setzt deren Einstiegszahl (2D 100, 3D 200), nie unter den Bedarf von Text oder Logo.
   Motive je Art nach `scenes/catalog-3d/stufen.js`: 3D nur Stufe 3D, 3D+ alle eingestuften, ohne 3D-Fassung nur 2D.
3. **Drohnen**: Regler 100–1000, neutral (keine Paketfarben), Marken 100/300/500/1000; unter der Mindestzahl der Art hält
   er an, ein Hinweis ersetzt kurz die Skala. Einstellbar sind nur Preisstufen (`droneStops(art)`, show-packages.ts): 2D bis
   190 je 10, ab 200 je 50; 3D je 50; 3D+ je 100. Werte von außen runden auf (`stopAtLeast`, gleicher Preis).
4. **Text oder Logo**: eigener Text (Textplaner im Worker) bzw. im Anlass „Logo“ der Logo-Modus (Logo-Konverter v10,
   Abschnitt „Runde 27“ im Verlauf).
5. **Upgrades**: eingeklappte Zeile mit Zähler, dieselben sechs Extras wie im Raster „Upgrades“ der Preisseite.

Darunter die Paket-/Preis-Box mit Anfrage-Knopf und „Immer dabei“ (ruhige Liste).

## Zustände und Preis

- **Eure Show** (Standard; „Eure 2D Show“, „Eure 3D Show“, „Eure 3D+ Show“, Runde 10 ohne Bindestrich und ohne
  „ab … Drohnen“, in Preisbox und Handy-Leiste gleich; in der Anfrage „Unsere Show: …“): Preis aus `showArtPrice(art, drones)` (`src/content/show-packages.ts`) mit „ab“;
  2D = `individualPrice` je Drohnenzahl, 3D derselbe Preis ab 200, 3D+ = ODYSSEY-Preis (`priceFor('ODYSSEY')`). Show
  warmweiß, keine Paketnamen.
- **Startpunkt aus einer Paketkarte** (`?paket=SPARK|HORIZON|ODYSSEY#konfigurator`, auf der Preisseite ohne Neuladen):
  Drohnenzahl und Art des Pakets, Name und Festpreis ohne „ab“, Show in der Paketfarbe. Jede Änderung an Art,
  Drohnenzahl, Upgrades oder Logo macht daraus „Eure Show“ und entfernt `?paket=` aus der Adresse. Anlass,
  eigener Text (solange er keine Drohnen nachfordert) und Wiedergabe ändern das Paket nicht.
- Festes Paket und dieselbe Art mit derselben Drohnenzahl im individuellen Paket kosten gleich viel
  (Wächter `scripts/individual-price.test.mjs`). Offene Preisfragen an Moritz: Verlauf, Runde 5.
- Direktlinks: `?anlass=…&paket=…&drohnen=…&art=2d|3d|story&motiv=…`.

## Vorschau

- Fassung der Motive nach Art (2D flach, 3D als Körper mit Schwenk, 3D+ in Akten) und Drohnenzahl (`unlockAt`); ein
  Wechsel der Art startet die Folge von vorn.
- Erste Ansicht: das erste Motiv steht sofort (Runde 10; der Einstieg über die lebendige Wolke aus Runde 9 ist wieder
  raus, Marc: „direkt mit dem ersten Motiv reinstarten“). Startmotive: Lichterbaum, Rakete, Wappen, Ballons, Ring, Harfe.
- FlyingStars-Katalogmotive werden auf die Drohnenzahl abgetastet (`scenes/catalog-resample.js`), verdichtet bis 200
  Drohnen (`DENSE_MAX`); darüber bleiben weitere Drohnen dunkel in Reserve.
- Bewegung folgt der globalen Bewegungspolitik (Pause, reduzierte Bewegung: stehendes Bild); außerhalb des Bildes
  hält die Bühne an.

## Anfrage

Der Anfrage-Knopf führt zum Formular auf derselben Seite (`/drohnenshow-preise/#anfrage`) und übergibt Paket (nur beim
Startpunkt), Drohnenzahl, Anlass, Upgrades (`extras`) und eine Zusammenfassung mit „Art der Show“.

## Prüfen

- Unit: `scripts/individual-price.test.mjs`, `scripts/show-assign.test.mjs`, `scripts/catalog-resample.test.mjs`,
  `src/scripts/show-field.test.mjs`; Runde 9: `src/scripts/drone-stops.test.mjs`, `show-art-motifs.test.mjs`,
  `spelling-3d-plus.test.mjs`, `logo-density.test.mjs`, `logo-rows.test.mjs`, `logo-stage.test.mjs`.
- Browser: `tests/show-configurator.spec.ts`, `tests/pricing.spec.ts`, `tests/logo-show-budget.spec.ts`,
  `tests/show-teaser.spec.ts`.
- Leistung: `npm run build && npm run perf:start` (LCP der Preisseite, Long Tasks), Zahlen aus Runde 6 im Verlauf.

---

## Anhang: Verlauf (Oktober bis 18.11.2026)

Protokoll der Fassungen, älteste zuerst. Die Beschreibungen geben den damaligen Stand wieder.

Damaliger Stand am 5. November 2026, Runde 24 (Abschnitt „Runde 24“: Motive aus dem FlyingStars-Katalog, Drohnenbedarf des Textes). Davor sechzehnte Fassung. Frühere Stände sind als Tags erhalten: `konfigurator-v6`, `konfigurator-v8`, `konfigurator-v9`, `konfigurator-v10`. Seit der sechzehnten Fassung ist der Konfigurator eine Komponente (`src/components/configurator/ShowConfigurator.astro`) direkt auf der Preisseite, Anker `#konfigurator`; `/show-konfigurator/` leitet dorthin weiter. Für die Startseite gibt es einen Teaser als sich selbst abspielendes Showreel (`ConfiguratorTeaser.astro`, Abschnitt „Startseiten-Teaser als Showreel“). Der Konfigurator ist ein Vorschlag an FlyingStars.

### Das Modell: zwei Entscheidungen, die sich nicht gegenseitig verändern

- **Anlass** (Hochzeit, Jubiläum, Launch, Kultur, Winter & Silvester, Stadtfest) bestimmt, **was** am Himmel steht: vier oder fünf Motive, die als kleine Show nacheinander laufen, und den Anlass in der Anfrage. Er verändert weder Paket noch Preis.
- **Wie aufwendig?** hat drei Knöpfe, einen je Paket, in der Paketfarbe. Er bestimmt, **wie**: Paket, Drohnenzahl, Art der Bewegung und damit den Preis. Der Preis ändert sich genau dann, wenn ein anderer Knopf gewählt wird.

| Stufe | Paket | Drohnen | Preis | Enthalten (Wortlaut der Paketbeschreibungen) |
|---|---|---|---|---|
| Klassisch in 2D | SPARK | 100 | ab 7.900 € | vordefinierte Formationen wie Herzen oder Ringe und bis zu vier eigene Elemente |
| 3D in Bewegung | HORIZON | 200 | ab 15.900 € | alles aus SPARK plus individuelle 2D-Animationen und einfache 3D-Elemente |
| Erzählte 3D-Show | ODYSSEY | 300 | ab 34.900 € | alles aus HORIZON plus komplexe 3D-Animationen und volumetrische Effekte |

Die Preise kommen aus `priceFor()` in `src/content/show-packages.ts`; seit der zwölften Fassung bestimmt zusätzlich die Drohnenzahl den Preis (siehe unten). Publikum, Musik, Storytelling, Film und eigener Text sind bewusst nicht enthalten. Sie kommen später als sichtbare, eigene Preistreiber zurück, zum Beispiel hinter einem Aufklapper.

### Warum so (Marcs Rückmeldungen)

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

### Die Vorschau: drei Motive je Anlass, drei Ausbaustufen

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

#### Objektpermanenz und fließende Übergänge (siebte Fassung)

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

#### Achte Fassung (Marcs Rückmeldung zur siebten)

- **Tempo:** Paketwechsel so schnell wie ein Anlasswechsel. Die Flugzeit liegt jetzt bei 1,1 bis 3,2 Sekunden (vorher bis 5), die Planungsgrenzen bei 1,8 Einheiten/s und 3 Einheiten/s². Der Physiktest prüft mit Reserve gegen 2,6 und 5,5. Neue Drohnen kommen von einem näheren Ring außerhalb des Bildes.
- **Heller:** Lichteffekte hellen nur noch auf (Schimmer, Funkeln, Lichtlauf zwischen 0,8 und etwa 1,4). Über 1 vergrößert sich der Leuchthof und der Kern wird weißer. Die Tiefenabdunklung ist schwächer (hinten 78 % statt deutlich dunkler).
- **Herz:** ruhiges Atmen (2,6 s) statt Doppelblitz.
- **Motivwahl** in der linken Spalte unter „Anlass“.
- **Akte im Kreis:** Nach dem letzten Akt kommt mit › wieder der erste, mit ‹ vom ersten der letzte.
- **Vorhang:** Jede Linie des Vorhangs behält ihre Drohnen bei jeder Öffnung, darum gleiten die Drohnen beim Öffnen sichtbar zur Seite (kein Springen zwischen Linien).
- **Wappen:** eigener Entwurf im Stil eines Vereinswappens (erhöhte Mitte, Fluss, Fahne, Stern), bewusst kein bestehendes Vereinswappen.
- **Rakete im Sonnensystem:** Aus der Ferne braucht sie weniger Drohnen; die übrigen fliegen zur Sonne. Umlaufbahnen laufen über 2,5 Sekunden sanft an (sonst Beschleunigungsspitze bei der Ankunft).

#### Zehnte Fassung: Körper als Skelett, Geschichten in Bildausschnitten (8. Oktober)

Marcs Rückmeldung zur neunten: Rakete und Verlobungsring in 3D wirken billig. Als Anker wurden 17 FlyingStars-Shows vom YouTube-Kanal katalogisiert (intern: `freelance/clients/flyingstars/06-show-animationen-2026-10/`, nicht im Repo). Befund: Echte Shows zeichnen 3D als Skelett (Würfelkanten, gestapelte Reifen, ein Globus aus Umriss und Meridianen), nie als Punktkugel; Übergänge sind lose Wolken, in denen das neue Bild schon als Vorform steht; ein kleines Teil darf als Objekt fliegen (der Korken), während der Rest steht.

- **Neue Körper** in `show-shapes.js`: `brilliant` (Brillantschliff), `band`/`solitaire`/`torusLink` (Torus-Ringe), `globe` (Umriss, Äquator, zwei drehbare Meridiane), `rocketSolid` (Silhouette in ein oder zwei Ebenen, Reifen, Fenster, Finnen), `launchPad`, `moonHorizon`, `flagStar`, `starField`; alle über `sample3d` (Punkte nach Länge entlang 3D-Polylinien).
- **Ring:** HORIZON ein Solitär als Körper; ODYSSEY zwei verschlungene Tori → Solitär → Hand, auf deren Ringfinger der Ring kippt und gleitet → Herz.
- **Rakete:** HORIZON als Körper; ODYSSEY Rampe → Zündung (die Rampe fällt aus dem Bild, die Welt rückt weg) → Orbit um einen Planeten mit Kometenschweif → Mondlandung mit Flagge. Die Rakete folgt dem Orbit als Bild (dreht sich in der Bildebene entlang der projizierten Bahn), Tiefe kommt aus der Bahn selbst.
- **Engine:** Ein Teil kann `offstage` sein (es verlässt das Bild, zählt nicht für den Ausschnitt; `fitPts` am Beat). Geschichten dürfen mehrere Ausschnitte haben (`frame`): Start und Zündung teilen einen, Orbit und Landung den zweiten. So bleibt die Rakete auf der Rampe groß.
- **Drohnenbudget je Akt (300):** Rakete 120, Spur 60, Welt (Rampe/Planet/Mond) 85, Sterne 35. Ring-Geschichte: Ringe 260 + Sterne 40, auf der Hand: Ring 84, Hand 176, Sterne 40.

#### Elfte Fassung: mehr Motive, eigener Text, Animation nach echten Shows (10. Oktober)

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

#### Nur, was echte Drohnen können

Marcs Rückmeldung zur fünften Fassung: Ein Herz kann nicht im Takt pulsieren, ein Logo kann sich nicht verbiegen, Drohnen können nicht aus dem Nichts aufleuchten und mit Abgas- oder Funkentempo davonschießen. Deshalb gilt jetzt:

- **Bewegung:** Drohnen bewegen sich nur glatt, mit begrenzter Geschwindigkeit und Beschleunigung. Sie springen nie, auch nicht im Dunkeln.
- **Effekte mit Licht:** Herzschlag, Funkeln, Regen, Flamme und Wellen entstehen nur mit Licht auf Drohnen, die an ihrem Platz bleiben: Lichtlauf, Funkeln, Aufleuchten. So machen es echte Shows.
- **Feuerwerk:** Es öffnet und schließt sich langsam aus einer kompakten Kugel. Das Schließen geschieht dunkel.
- **Unbenutzte Drohnen** warten dunkel in einer Ebene hinter dem Bild und fliegen dorthin und zurück. Sie starten nicht mehr vom Boden.
- **Fortlaufende Bewegung:** Eine neue Flugbahn übernimmt die aktuelle Geschwindigkeit jeder Drohne, statt sie schlagartig zu stoppen.
- **Grenzen:** Die Flugdauer ergibt sich aus Geschwindigkeits- und Beschleunigungsgrenzen (`LIMITS` in `show-flight.js`, etwa 8 m/s und 5 m/s² bei einem 300-Drohnen-Bild).
- **Test:** `tests/show-physics.spec.ts` spielt alle 30 Fassungen mit simulierter Zeit ab und misst jede Drohne in jedem Frame. Der alte pulsierende Herzschlag fällt damit nachweislich durch (0,9 statt höchstens 0,5).

#### Wie die Drohnen fliegen (`src/scripts/show-flight.js`)

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

#### Leistung

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

### Die Anfrage

Der Anfrageknopf übergibt Paket, Drohnenzahl und Anlass sowie eine Zusammenfassung als bearbeitbaren Nachrichtenentwurf: Anlass, Stufe mit Paket und Einstiegspreis, Beispielmotive. Mobil stehen Paket, Preis und „Anfragen“ in einer festen Leiste.

### Offene Fragen an FlyingStars

1. Passt die Zuordnung „2D-Vorlage = SPARK, ein 3D-Objekt = HORIZON, mehrere 3D-Objekte oder 3D-Animation = ODYSSEY“ zur Praxis?
2. Können die Beispielmotive als Vorschau stehen, insbesondere die Formation aus der Bokkenrijders-Show?
3. Welche Publikumsgrößen, Musik- und Storytelling-Optionen sollen als sichtbare Preistreiber dazukommen?
4. Welche Katalogmotive gibt es wirklich? Passt das Fördergerüst von Zollverein als Wahrzeichen-Beispiel, oder ein anderes?

### Prüfen

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


### Typografie und ruhige Vorschau, 12.10.2026

Die gesamte Site verwendet nur die lokale variable Space Grotesk, 300–700. Body-, Display- und bisherige Mono-Rollen zeigen auf dieselbe Familie; Inter, JetBrains Mono und Montserrat einschließlich unbenutzter Dateien entfallen. Die im Canvas gezeichnete Schreibschrift ist lokale Geometriedaten und keine zusätzliche Webschrift. Die echte Fontdatei enthält die Gewichtsachse 300–700 und deutsche Umlaute/ß.

Die Vorschau zeigt nur das Paketbadge. Die redundante Drohnenzahl oben rechts entfällt. Bildbeschreibungen sind visuell ausgeblendet, bleiben als Textalternative über `aria-describedby` verfügbar, weil der Canvas selbst für Screenreader verborgen ist. Eine fehlgeschlagene Vorschau hat weiterhin eine sichtbare Fehlermeldung mit nutzbarer Paketauswahl/Anfrage. Technische Paketdaten bleiben im Ergebnisbereich und in der Anfrage.

`tests/network-allowlist.spec.ts` prüft alle tatsächlich gebauten Routen auf genau eine lokale Fontdatei. Der Konfigurator-Test prüft alle Anlässe auf ausgeblendete Beschreibungen, erhaltene Textalternative und entfernten Zähler. Überprüfung: `npm run gates`.


### Fließtextschrift wiederhergestellt, 12.10.2026

Nach Ansicht der Ein-Schrift-Fassung bevorzugt Marc Inter für die ursprünglichen Body-Rollen. Deshalb zeigt `--body` wieder auf die vorhandene lokale variable Inter. Überschriften und bisherige Mono-Rollen bleiben Space Grotesk; das Logo verwendet wie ursprünglich den Body-Token. JetBrains Mono und Montserrat bleiben entfernt. Die Fontprüfung erwartet genau die beiden lokalen Dateien auf allen gebauten Routen. Sichtbare Motivbeschreibungen und Preview-Zähler bleiben entfernt. Eine separate kuratierte Fontstudie entscheidet nicht ungefragt über die finale Designsprache.


### Zwölfte Fassung: lebendige Wolke, Show-Uhr, Drohnenzahl, zwei Spalten (30.10.2026)

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

#### Wie prüfen

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


### Dreizehnte Fassung: nur noch die lebendige Wolke, lückenloser Regler, Motive nach Drohnenzahl (30.10.2026)

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

#### Wie prüfen (dreizehnte Fassung)

- Schnell: `node --test scripts/show-clouds.test.mjs scripts/show-price.test.mjs scripts/show-counts.test.mjs scripts/show-geometry.test.mjs scripts/show-flight.test.mjs` (etwa 30 s, der Wolken-Wächter braucht die meiste Zeit).
- Browser: `tests/show-configurator.spec.ts` („Kein Hin und Her …“, „Mehr Drohnen schalten ein Motiv frei …“), `tests/show-physics.spec.ts` (600 Drohnen jetzt für alle Anlässe, weil die freigeschalteten Motive und ihre Teil-Umbauten erst dort laufen).
- Ansehen: `?anlass=kultur&paket=ODYSSEY` und warten, bis die Feder fertig geschrieben hat (Buch, Teil-Umbau); `?anlass=hochzeit&paket=ODYSSEY&drohnen=440`, dann den Regler auf 450 (Meldung, Wolke, Ringkästchen).
- Ergebnisse am 30.10.2026 (eigener Build, nicht der Dev-Server): schnelle Tests 27/27; `tests/show-configurator.spec.ts` in Chromium, WebKit und mobil grün (54 bestanden, 3 nur für Desktop übersprungen); `tests/show-physics.spec.ts` alle 12 Läufe grün (alle Anlässe in allen Paketen, dazu alle Anlässe mit 600 Drohnen); `astro check` 0 Fehler. Bildraten während einer Wolke mit 600 Drohnen: Chromium mit 4-fach gedrosselter CPU 47–51 fps (Median 16,7 ms, schlechtestes Bild 33 ms, auch das Startbild der Wolke), WebKit 75 fps.


### Vierzehnte Fassung (A): Bedienung (30.10.2026, abends)

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

#### Wie prüfen (vierzehnte Fassung, A)

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


### Fünfzehnte Fassung: Feinschliff nach Marcs Rückmeldung (30.10.2026, 22 Uhr)

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

#### Wie prüfen (fünfzehnte Fassung)

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


### Sechzehnte Fassung: Freischalt-Leiter, größere Lichter, Komponente und Teaser (31.10.2026)

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

#### Wie prüfen (sechzehnte Fassung)

- Schnell: `node --test scripts/show-unlock.test.mjs scripts/show-price.test.mjs scripts/show-geometry.test.mjs scripts/show-counts.test.mjs scripts/show-motive15.test.mjs scripts/show-flight.test.mjs`, dazu einzeln `scripts/show-clouds.test.mjs` (etwa 30 s) und `scripts/show-finte.test.mjs` (etwa 2 min).
- Browser: `tests/show-configurator.spec.ts` (neu: gesperrte Lichtpunkte), `tests/show-teaser.spec.ts` (Laden in der Nähe des Viewports, Freischalten, Übergabe, Pause außerhalb und bei reduzierter Bewegung), `tests/show-physics.spec.ts` (neu: SPARK 190 und HORIZON 290). Die Specs laufen standardmäßig gegen `/drohnenshow-preise/`; `CFG_PATH=/poc/konfigurator-teaser/` bzw. `TEASER_PATH=/` stellen eine andere Seite ein.

### Startseiten-Teaser als Showreel (31.10.2026, abends)

Marc zur ersten Teaser-Fassung: Interaktiv ist für die Startseite zu komplex. Stattdessen ein vorprogrammierter Ablauf „wie so ein Quick-Showreel“ in schnellerem Tempo durch die „Greatest Hits“ von SPARK bis ODYSSEY, dazwischen lebendige Wolken mit „Quick Morphing Action“, ein Beispiel-Logo („das könnte dein Logo sein“) und ein reduziertes, vor-animiertes Wireframe des Konfigurators.

- **Bühne** (`src/scripts/show-teaser.js`, `buildReel()`): eine Szene aus ausgewählten Bildern verschiedener Pakete und Drohnenzahlen, gebaut mit `buildSequence()` wie im Konfigurator, in der Paketfarbe. Jedes Motiv ist ein eigenes Segment und wird durch die lebendige Wolke erreicht; nach dem letzten geht es durch die Wolke zurück zum ersten.
- **Ablauf** (`REEL`): Herz (SPARK 100) → Schmetterling (SPARK 150) → Beispiel-Logo mit Lichtlauf (SPARK 150, Schrift „Das könnte euer Logo sein“) → Rakete als Körper (HORIZON 200) → Tänzerin in 3D (HORIZON 250) → Orbit und Mondlandung (ODYSSEY 450) → Drache speit ein Feuerwerk (ODYSSEY 450) → Finale mit Goldregen (ODYSSEY 600).
- **Tempo:** nur über die Show-Uhr, `REEL_RATE = 2.5` (`field.setRate`). Flug, Wolke, Eigenbewegung und Licht laufen gleichmäßig schneller, darum gibt es weder Einrasten noch Finten (Engine und Motive unverändert). Eine Wolke dauert etwa 1,7 s, ein Motiv steht etwa 1,2 bis 1,6 s; die Mondlandung als Geschichte etwa 5 s. Ein Durchlauf dauert gemessen 28 bis 32 s (Chromium und WebKit, Dev-Server).
- **Wireframe** (`ConfiguratorTeaser.astro`, `aria-hidden`, keine Formularelemente): Platzhalterbalken für Überschrift und Beschriftungen; echte Wörter nur dort, wo sie den Wechsel zeigen (Anlass-Chips, Paketnamen, Drohnenzahl, Preis). Mit jedem neuen Motiv springt der Anlass-Chip, der Paketknopf wechselt SPARK → HORIZON → ODYSSEY (mit kurzem Druck statt eines sichtbaren Cursors), der Regler wandert nach rechts, Zahl und Preis folgen. Auf dem Handy bleiben nur Paketknöpfe und Regler.
- **Bedienbar** ist nur der Knopf „Show selbst zusammenstellen“ → `/drohnenshow-preise/#konfigurator`. Die Bühne hat eine kurze Textalternative.
- **Leistung:** wie zuvor; Laden erst auf 300 px vor dem Viewport, Pause außerhalb und bei `html.motion-paused`. Bei reduzierter Bewegung steht von Anfang an das Drachen-Feuerwerk in Ruhe (`STILL`).
- **Props:** `id`, `href` (Standard `/drohnenshow-preise/#konfigurator`), `cta`. `occasion` und `drones` werden noch angenommen, haben aber keine Wirkung mehr.
- **Prüfen:** `tests/show-teaser.spec.ts` (Laden in Viewport-Nähe; keine Formularelemente, ein Link, Textalternative; das Showreel läuft durch SPARK, HORIZON, ODYSSEY, zeigt das Logo und beginnt von vorn durch die Wolke; Pause außerhalb, Standbild bei reduzierter Bewegung), 12/12 in Chromium, WebKit und Pixel 7. Frame-Folge über einen Durchlauf: `/tmp/fs-r7-k/r1-sheet.png`.

#### Runde 8: reduziertes Wireframe, Schärfe-Effekt, Leistung (31.10.2026, abends)

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

#### Runde 9: drei Abläufe, Logo mit Schriftzug, Kolibri, weniger Text im Konfigurator (31.10.2026, nachts)

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

#### Runde 10: Herz über die Pakete, Rakete ohne Orbit, QR-Geschichte, gedämpfte Paketfarben (31.10.2026, nachts)

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


### Runde 11: Anlass als Dropdown, gleitender Paketrahmen, mehr Luft (1.11.2026)

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

#### Wie prüfen (Runde 11)

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

### Runde 24: Motive aus dem FlyingStars-Katalog, Drohnenbedarf des Textes (5.11.2026)

Anlass: FlyingStars hat im Meeting am 5.11. den internen Motivkatalog gezeigt. Laut Marcs Gesprächsbericht liegen die meisten geflogenen Shows zwischen 100 und 150 Drohnen. SPARK braucht deshalb die größte Auswahl. Die Einzelheiten stehen in [show-katalog-motive.md](show-katalog-motive.md).

- 32 Katalogmotive mit 50 Varianten, gezählte Punkte, eigene Farben. Sie spielen ab der Punktzahl ihrer kleinsten Variante, in Zehnerschritten. SPARK zeigt je Anlass jetzt 4–7 Motive bei 100 Drohnen und 7–11 bei 150 (vorher 3 und 4).
- Je Paket eine eigene Fassung, damit ein größeres Paket nie weniger zeigt (Wächter `show-unlock`): SPARK die Formation, HORIZON als Körper mit zweiter Ebene, ODYSSEY Licht zeichnet die Form, dann wird sie zum Körper.
- Die Bewegung ist abgeleitet, nicht aus Flugdaten: Räder, Nadel, Ballons, Gläser, Fahnen; 3D-Formationen drehen sich schon in SPARK. Das korrigiert die Vereinfachung „SPARK = Standbild“, wo FlyingStars' eigene Daten 3D mit 100–160 Drohnen belegen.
- Gesperrte Motive: ein Lichtpunkt je Schwelle, nicht je Motiv. Mit 13 Motiven drückten die Einzelpunkte auf dem Handy die Tempo-Knöpfe aus dem Bild.
- Eigener Text: zehn Drohnen je Zeichen ohne Leerzeichen (Regel des Katalogs). Unter dem Feld steht „8 von 10 Zeichen bei 100 Drohnen“. Braucht der Text mehr, steigen Drohnenzahl, Paket und Preis sichtbar mit. Ein Absenken darunter hält der Regler und sagt warum. Höchstens 24 Zeichen, also 240 Drohnen.
- Wächter: `scripts/catalog-motifs.test.mjs` (Daten, Mindestzahlen, Varianten wachsen mit), dazu die bestehenden `show-unlock`, `show-counts`, `show-finte`, `show-clouds`.

### Runde 27: Logo-Modus mit dem Logo-Konverter v10 (12.11.2026)

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
- Nachtrag (12.11. abends, Marc): „Euer Logo“ ist jetzt ein Anlass (letzte Pill, Verlaufsrahmen in den Logofarben) statt
  eines Logo-Modus-Schalters; ein Upload wählt ihn. Die Zonen des Detailgrad-Reglers sind neutral (nicht die Paketfarben).
  Braucht das eigene Logo mehr Drohnen als gewählt, zeigt der Drohnenregler den Bedarf: Band vom Griff bis zu einer
  gestrichelten Marke (gleitet bei jeder neuen Berechnung), daneben „Logo braucht ca. N“. Die Kundenlogo-Folge zeigt nur die
  beste (flexible) Fassung; die strenge nur, wenn sonst keine drei Logos in die Zahl passen (bei 200 Drohnen: DKB, Prada,
  REWE, Spotify). Unit-Tests 727/731 nach den Korrekturen; die zwei bekannten Fehler bestehen auch ohne diese Runde.
- Nachtrag 2 (12.11. nachts, Marc): Im Anlass „Euer Logo“ nur Drohnenzahl, Liniendichte (statt Detailgrad; die
  Budget-Flexibilität ist fest „Mittel“), „Euer Text, euer Logo“ und die Preiskachel; Anlass, Paket, Abspielleiste,
  Bildunterschrift und Motiv-Hinweise treten zurück, „Alle Anlässe“ führt zurück. Hochladen zeigt sofort die lebendige
  Wolke (eigenes Bild mit live-Bewegung), bis das Logo gerechnet ist. Braucht das Logo mehr Drohnen: große Zahl = Bedarf in
  der Paketfarbe, gewählte Zahl durchgestrichen, Griff blass, gestrichelter Bogen zum Bedarf; × am Bogen legt das Logo in die
  gewählte Zahl (strenge Flexibilität); kurzer Fokus auf den Regler; der Hinweis steht als Karte auf der Bühne. Formen
  werden direkt auf der Bühne gewählt (`createField().screenOf()` liefert die Bildschirmlage je Punkt), ein Klick auf die
  Bühne hält dort nicht mehr an. Minimap mit dem Original oben rechts. Kundenlogos: nur von Hand freigegebene Bilder
  (`ok` in kundenlogos.json, Begründungen in `23-logo-drohnen-konverter/screens/v10-kundenlogos/README.md`); passen weniger
  als zwei, laufen bis zu vier mit ihrer eigenen Zahl („mit 400 Drohnen“). Geprüft in Chromium und WebKit (Upload, Wolke,
  Bedarf, Karte, Klick- und Rahmenauswahl, Entfernen, Liniendichte, ×).
- Nachtrag 3 (12.11. nachts, Marc: „das funktioniert gar nicht … zurück zur Logik des lokalen Prototyps“): Der Anlass
  „Euer Logo“ rechnet jetzt genau wie der Prototyp `app-v10`: feste gewünschte Drohnenzahl, Liniendichte (Automatisch oder
  Regler), Budget-Flexibilität (Automatisch/Streng/Mittel/Flexibel) und „Was zeigen“ (Automatisch/Ganzes Logo/Nur
  Symbol). Automatisch nimmt nur das Symbol, wenn das ganze Logo nicht in die Zahl passt (Puma bei 100: 97 Drohnen, nur die
  Raubkatze). Beschreibungstexte, Zonen, Bogen, Durchstreichen und das × am Bogen sind entfernt. Oben steht die große Zahl
  „N Drohnen werden benötigt“ (Korallrot über der gewünschten Zahl), der Regler heißt „Gewünschte Drohnenanzahl“.
  „Beispiele“: Mastercard, IKEA, DHL, Firefox, Spotify, Nike, Apple, McDonald’s, Adidas als SVG unter
  `public/media/logo-modus/beispiele/` (laden wie ein Upload). Bühne niedriger, Minimap und Hinweiskarte unten; auf dem
  Handy ist die Karte kompakt über die volle Breite, die Minimap oben rechts. Geprüft in Chromium und WebKit (1440 px:
  Puma 97, Mastercard 98/100; 390 px: Puma „Ganzes Logo“ = 207, rot, Karte). Bekannt: Playwright-WebKit stürzt beim
  Verkleinern des Fensters von 1440 auf 390 px auf jeder Seite der Site ab (auch „Über uns“, nicht auf einer leeren Seite);
  frisch mit 390 px geöffnet läuft alles. Nicht geprüft: Handys, Marcs Safari 18.6.
- Nachtrag 4 (12.11. nachts, Marc): Leiste im Anlass „Euer Logo“: „Alle Anlässe“, Upload „Euer Logo“ (ohne Textfeld),
  Beispiele (16, vorberechnet: Klick zeigt das Bild sofort, erst Liniendichte oder Entfernen rechnet live), große Zahl,
  Drohnenregler, Liniendichte. Budget-Flexibilität und „Was zeigen“ entfernt (intern immer Automatisch; Marc hat sie bei
  keinem Logo geändert). Liniendichte mit fünf neuen, sparsameren Stufen unten; die Spur ist dort korallrot, und solange
  der Griff dort steht, steht darunter „kann unleserlich werden“. Der Bedarf bestimmt Paket und Preis; auf dem Drohnenregler
  sitzt ein Bedarfspunkt in der Paketfarbe des Bedarfs (über 600: Koralle), die große Zahl hat dieselbe Farbe, der
  gewünschte Griff und seine Zahl treten blass zurück. Bühne wieder in voller Höhe, Logo größer, Leiste ab Desktop breiter
  (`clamp(22.5rem, 30vw, 36rem)`). Hinweiskarte schmal unten links, halbtransparent mit Weichzeichner, voll deckend bei
  Hover/Fokus. Lebendige Wolke: verzerrte Uhr (Tempowechsel bis fast Stillstand), Breite/Höhe/Lage/Drehung wandern,
  gelegentlich drei lose Haufen. Der Logo-Modus läuft auch, wenn die Show vorher pausiert war (`setMotionIndependent`).
  Beim Entfernen eines Teils tauchen im entfernten Bereich keine neuen Punkte mehr auf (`removed-mask.mjs`).

### Preisseite nach Moritz' Preistext: keine Paketwahl, „Individuelles Paket“ (17.11.2026)

Moritz' Konzept, mit Marc abgestimmt: Der Konfigurator ist der Hauptabschnitt direkt nach dem Kopf der Preisseite. Die
drei Pakete sind feste Beispiele mit Festpreis darunter (Paketkarten, je „X anfragen“ und „X anpassen“).

- Keine Paketwahl mehr im Konfigurator. Drohnenregler 100–1000 ohne Paketfarben (Spur füllt sich neutral, `--fill`),
  Marken 100/300/500/1000. Anlässe in Moritz' Reihenfolge: Winter & Silvester, Marketing (ID bleibt `launch`), Jubiläum,
  Stadtfest, Hochzeit, Kultur, Logo (vorher „Euer Logo“). Neu: Upgrades als Pills (dieselben sechs Extras wie im Raster
  „Upgrades“, beide Auswahlen bleiben gleich) und „Immer dabei“ als ruhige Liste.
- Zwei Zustände (`preset` in `src/scripts/show-configurator.js`):
  - Startpunkt aus einer Paketkarte („SPARK anpassen“ = `?paket=SPARK#konfigurator`; auf derselben Seite ohne Neuladen):
    Drohnenzahl des Pakets (100/200/300), Name und Festpreis ohne „ab“, „Festes Paket · Festpreis“ darüber, Paketmarke auf
    der Bühne, Show in der Paketfarbe.
  - „Individuelles Paket“ (Standard): Preis frei aus `individualPrice()` mit „ab“, Show warmweiß ohne Farbton, keine
    Paketnamen. Eine Änderung an Drohnenzahl, Upgrades oder Logo verlässt den Startpunkt und nimmt `?paket=` aus der
    Adresse. Anlass, eigener Text (solange er keine Drohnen nachfordert) und Wiedergabe ändern das Paket nicht.
  - Links mit `?paket=X&drohnen=N`: weicht N von der Paketzahl ab, ist das schon eine Änderung (individuell).
- `individualPrice()` (`src/content/show-packages.ts`): bis 190 Drohnen wie bisher, ab 200 der HORIZON-Aufpreis ohne
  Obergrenze. Trifft Moritz' Zahlen 100 = 7.900, 200 = 15.900, 300 = 25.700, 500 = 45.300; 1000 = 94.300 €. Foto & Video
  +900 €, Indoor hebt auf mindestens 15.000 €, die übrigen Upgrades stehen „nach Aufwand“ nur in der Anfrage.
  ODYSSEY (300 Drohnen, 34.900 €) ist ein Festpaket mit Mehrleistung und liegt über der freien Kurve. Test:
  `scripts/individual-price.test.mjs`.
- Intern bleibt die Fassung der Motive an der Drohnenzahl (`packageForDrones`: 2D bis 190, 3D ab 200, Geschichten ab 300),
  Freischalt-Leiter und Hinweise unverändert.
- Die Anfrage aus dem Konfigurator geht an das Formular auf der Preisseite (`/drohnenshow-preise/#anfrage`), mit Paket nur
  beim Startpunkt, sonst Drohnenzahl, Upgrades (`extras`) und Zusammenfassung.
- Startseiten-Teaser: das Wireframe zeigt keine Paketknöpfe mehr, der Regler ist neutral (nur CSS,
  `configurator-teaser.css`); Ablauf und Bühne unverändert.
- Offen: Die Playwright-Specs `tests/show-configurator.spec.ts`, `logo-show-budget.spec.ts`, `show-physics.spec.ts` und
  `i18n.spec.ts` prüfen noch die alte Paketwahl bzw. den Leistungsvergleich und müssen nachgezogen werden.

### Runde 5: Art der Show, ruhiger Einstieg, Katalogmotive mit der Drohnenzahl (18.11.2026)

Marcs Rückmeldung zur Preisseite: Einstieg zu voll; neben der Drohnenzahl soll die Art der Show (2D, 3D, 3D mit
Storytelling) die zweite Hauptgröße sein; die FlyingStars-Katalogmotive reagierten nicht auf die Drohnenzahl.

**Einstieg.** Kopf (Kicker, H1, Einleitung, Eckdaten) steht mit deutlich mehr Abstand über dem Werkzeug
(`--cfg-head-gap`, PricingPage.astro). Links nur die Eingaben: Anlass, Art der Show, Drohnen, Text/Logo, darunter die
Upgrades als eingeklappte Zeile mit Zähler („2 gewählt“; `grid-template-rows` 0fr → 1fr, geschlossen `inert`). Rechts
die Ergebnis-Spalte `.cfg-out`: Vorschau, darunter die Preis-Box als ruhige Zeile (Name, Preis, Art · Drohnen ·
Showzeit, Anfrage-Knopf), darunter „Immer dabei“ in vier Spalten. Die Preis-Box konnte unter den Eingaben bei
1440 × 900 nicht mehr im ersten Bildschirm stehen (gemessen: Oberkante 1128 px), unter der Vorschau steht sie bei
781 px. Die Bühnenhöhe lässt dafür Platz (`calc(100svh - 12.9vw - 20.75rem)`). Handy: `.cfg-out` ist `display: contents`,
Reihenfolge Vorschau (klebt), Eingaben, Preis-Box, Immer dabei, Einleitung; die Preisleiste unten bleibt.

**Art der Show** (`SHOW_ARTS`, `ART_TIER`, `artMin`, `showArtPrice` in content/show-packages.ts). Drei Segmente mit
gleitendem Rahmen, ohne Paketnamen; darunter ein Satz aus Moritz' Paketbeschreibungen samt Musik. Die Art bestimmt die
Fassung der Motive (2D = SPARK-Fassung flach, 3D = HORIZON als Körper mit Schwenk, Storytelling = ODYSSEY in Akten) über
den ganzen Regler; ein Wechsel startet die Folge von vorn, weil ab 3D die räumlichen Motive zuerst laufen. Freischalten
(`unlockAt(m, drones, tier)`) gilt je Art. Mindestzahl wie das Paket, das die Art einführt: 2D 100, 3D 200, Storytelling
300. Darunter hält der Regler an, die Spur ist dort gedämpft, und ein Hinweis ersetzt kurz die Skala („3D-Show mit
Storytelling ab 300 Drohnen“).

Preise, hergeleitet aus Moritz' Text: 2D = Preis je Drohnenzahl (`individualPrice`; 100 = 7.900, 300 = 25.700, 500 =
45.300 €). 3D = derselbe Preis ab 200 (HORIZON 200 = 15.900 € = Preis je Drohnenzahl bei 200, also kein 3D-Aufpreis).
Storytelling = ODYSSEY: 300 = 34.900 €; darüber der ODYSSEY-Aufpreis aus FlyingStars' Vercel-Referenz (+9.900 € je
angefangene 100 Drohnen, `priceFor('ODYSSEY')`), den Moritz' Text nicht nennt. Damit erklärt sich die Lücke ODYSSEY
34.900 € gegen „300 Drohnen ab 25.700 €“ als Storytelling-Aufpreis (9.200 € bei 300), und jedes feste Paket kostet genau
so viel wie dieselbe Art mit derselben Drohnenzahl im individuellen Paket (Wächter scripts/individual-price.test.mjs).
Musik: 2D mit GEMA-freier oder bei Anmeldung lizenzierter Musik, ab 3D synchron zur Wunschmusik, beides inklusive.
Pakete setzen beim Anpassen Drohnenzahl und Art; jede Änderung, auch der Art, macht „Individuelles Paket“. Direktlink
`?art=2d|3d|story`. Die Anfrage trägt „Art der Show: …“ in der Zusammenfassung.

Offene Preisfragen an Moritz: (1) Storytelling über 300 Drohnen: gilt +9.900 € je angefangene 100 Drohnen aus der
Vercel-Referenz? (2) 3D unter 200 und Storytelling unter 300 Drohnen: möglich, zu welchem Preis? (3) 2D mit 200+
Drohnen: wirklich derselbe Preis wie 3D? (4) Wunschmusik synchron bei einer 2D-Show: Aufpreis oder inklusive?
(5) Zwischenstufen 110–190 Drohnen: der Aufpreis (+900 € je 10 bis 150, dann +700 €) ist ein Platzhalter.
(6) Sind HORIZON-Leistungen (Workshop, Videovorschau, komplexe Genehmigungen) bei jeder individuellen 3D-Show dabei?

**Katalogmotive** (scenes/catalog-resample.js, Wächter scripts/catalog-resample.test.mjs). Vorher stand jedes
Katalogmotiv mit den Punkten seiner Katalogvariante auf der Bühne, alle weiteren Drohnen warteten dunkel; mehr Drohnen
änderten nichts. Jetzt wird jede Variante auf die gewählte Drohnenzahl abgetastet: Linien werden aus den Punkten
zurückgewonnen (Relative-Neighbourhood-Graph mit Reichweitengrenze, damit Augen nicht mit dem Umriss verbunden werden),
neue Drohnen kommen erst auf die Außenkontur, dann auf Binnenlinien (Gewicht 0,72), Einzelheiten (bis vier Punkte)
wachsen als kleiner Lichtring, und bei großen geschlossenen Innenflächen (≥ 16 % der Silhouette) kommt ab dreifacher
Liniendichte eine gedimmte Rasterfüllung dazu. Ohne Füllung werden die Linien weiter verdichtet (eine echte Show mit
mehr Drohnen fliegt das Bild größer; auf der Bühne steht es gleich groß mit kleineren Lichtern). Katalogpunkte behalten
Platz und Index (Bewegungsgruppen, Aktionen in catalog-actions.js), neue Drohnen folgen ihren Eltern (`derive`).
Mindestzahl je Motiv unverändert (Katalogvariante). Rechenzeit: Analyse einmal je Variante (Median 0,5 ms), Abtastung je
Drohnenzahl im Median 0,1 ms; beim Reglerziehen mit 4× CPU-Drossel bleibt die Bildzeit bei 17 ms, der Neuaufbau nach
dem Loslassen liegt wie vorher bei rund 300 ms.

Tests: tests/show-configurator.spec.ts neu geschnitten (Tests der Paketknöpfe, des Bereichswechsels, der Paketfarben und
des Paketrahmens entfernt, sieben Tests für den neuen Ablauf), logo-show-budget.spec.ts auf „2D-Show, Regler auf 100“
umgestellt.

### Runde 6: Aufbau wie vor Runde 5, Show-Art als Pills, Verdichtung bis 200, Leistung (18.11.2026)

**Aufbau.** Marc: „Keep the main logic and the main structure … exactly the same as it was before.“ Die Ergebnis-Spalte aus
Runde 5 ist zurückgenommen: Vorschau rechts (klebend), links das Bedienfeld mit der Paket-/Preis-Box wie vor Runde 5.
Geblieben sind nur: „Immer dabei“ unter der Paket-/Preis-Box, Upgrades eingeklappt, der größere Abstand Seitenkopf →
Konfigurator (ab Desktop `clamp(var(--space-14), 6.5vw, var(--space-24))`, bei 1440 ≈ 94 px; die einzige bewusste Abweichung
von `--head-gap-content`, eingetragen in docs/DESIGN.md). Die Bühne passt mit Steuerleiste auch in 1280 × 720.

**Art der Show** als dieselben Pills wie der Anlass (`.chips-quiet`), „2D · 3D · 3D+“. Darunter je Art drei Häkchen aus
Moritz' Paketbeschreibungen (`preise.artItem.*`); die drei Listen liegen in derselben Rasterzelle und blenden per `opacity`
über (CSS über `:has`, keine Höhenänderung). Preislogik und Mindestzahlen wie in Runde 5.

**Upgrades:** Beschriftung wie die übrigen Felder (Label, Zähler, Pfeil), keine Linien; Aufklappen über
`grid-template-rows`.

**Katalogmotive:** verdichtet nur bis 200 Drohnen (`DENSE_MAX` in scenes/catalog-resample.js); darüber behält das Motiv
seine 200er-Gestalt, weitere Drohnen bleiben dunkel in Reserve.

**Leistung** (Preisseite bedienen, 1440 × 900, Pixeldichte 2, Median aus 3; vorher = 25d5f80, abwechselnd gemessen):
- Regler auf 1000: die optimale Zuordnung lief über alle 1000 Drohnen (kubisch), 2,2 s am Stück bei 4×. Jetzt bis 128 Drohnen
  optimal, darüber Blöcke von 48 in Hilbert-Reihenfolge (show-field.js, `assignScalable`; Wege 0–7 % länger als optimal,
  scripts/show-assign.test.mjs).
- 3D+ (Silvester): die Jahreszahl setzte der Textplaner am Stück (513 ms bei 4×). Jetzt im Worker
  (`textFormationAsync`, text-worker.js) für Jahreszahl, „125“, Jubiläumszahl, eigenen Text und Schriftzüge.
- Nach jedem Wechsel der Drohnenzahl wandert die Lichtgröße in Viertelpixel-Schritten; jeder Schritt legte für alle Farben
  neue Sprite-Canvases an (in WebKit Bilder von 75–99 ms). Jetzt ein Sprite je Farbe in Referenzgröße, beim Zeichnen
  skaliert.
- Modulketten von Konfigurator und Teaser werden in Stufen ausgewertet (`importInStages`, when-near.mjs). Der Teaser rechnet die
  Lichtlauf-Reihenfolge aller Bilder im Leerlauf vor, zeigt erst, wenn die Bühne auf 300 px herankommt, und das erste Bild
  fliegt durch die lebendige Wolke ein (ohne optimale Zuordnung). `perf:start` damit grün, auch `nachhaltigkeit → ablauf`
  (vorher 53 ms Long Task) und `ablauf → preise`.
- Ergebnis Chromium 4× (vorher → nachher): Regler auf 1000 Long Task 2296 → keiner, Regler auf 200 469 → keiner, 3D+ 253 →
  keiner; übrig ein Task von 51 ms (vorher ebenso) nach dem Loslassen des Reglers, fast ganz native Canvas-Arbeit. WebKit max:
  Regler auf 1000 251 → 37 ms, Ziehen 60 → 26, 3D+ 93 → 20, Scrollen 40 → 28 ms.

### Runde 9: Liniendichte, Logo-Parität, Preisstufen, Show-Art-Stufen, Einstieg (20.11.2026)

- **Liniendichte im Automatikzustand** (Marc: „bleibt dann immer in der Mitte … von 114 auf 233“). Ursache: der Griff stand
  auf `meta.density` der Automatik (fast immer 0,6 = Stufe 8); eine Reglerstufe ist aber eine feste Liniendichte des
  Konverters, eine andere Skala (Cupra bei 100: automatisch 114 Drohnen, Stufe 8 = 259, Stufe 3 = 101). Jetzt steht der Griff
  auf der gemessenen Stufe mit der Drohnenzahl der Automatik, deren untere Nachbarin höchstens so viele braucht
  (`src/scripts/logo-density.mjs`). Beispiele: vorberechnet in `beispiele/<id>.json` unter `density[n]` mit
  `23-logo-drohnen-konverter/tools/v10/configurator-density.mjs` (nach `configurator-examples.mjs` laufen lassen, ca. 20 min);
  eigene Logos und geänderte Beispiele: im Hintergrund gemessen (`effectiveDensity`, 5–7 Umrechnungen, gemessen 6–7 s), der
  Griff ist so lange blass (`aria-busy`). Die rote Zone und „kann unleserlich werden“ gelten auch im Automatikzustand.
- **Energizer** ist aus den Beispielen entfernt, **Target** (Zielscheibe ohne Schrift, schon vorberechnet) dazu.
- **Glättung quer zur Linie** (Spotify-Schallwellen, `src/scripts/logo-rows.mjs`): der Konverter setzt Konturpunkte auf die
  Pixeltreppe; geglättet wird nur senkrecht zur Linie bei Punkten mit zwei Nachbarn in einer Flucht (höchstens 0,3
  Punktabstände). Spotify p90 0,093 → 0,009 Punktabstände; gilt für vorberechnete, live gerechnete und Kundenlogos.
- **Logo-Modus und Show zeigen dieselbe Formation** (Shell): die Punkte waren gleich, aber der Logo-Modus zoomte das Logo unter
  die Hinweiskarte. `src/scripts/logo-stage.mjs` legt es in die freie Fläche über Karte und Minimap; „Dieses Logo in der
  Show verwenden“ rundet auf die nächste Preisstufe auf, nie unter den Bedarf.
- **Show-Art**: Wechsel auf eine kleinere Art setzt deren Einstiegszahl (2D 100, 3D 200) mit Hinweis „2D-Show ab 100
  Drohnen“. Einstufung 3D/3D+ aus `stufen.js` (`byStufe` in content/show-configurator.js): je Anlass 2D/3D/3D+ (gesamt):
  Silvester 17/13/19, Marketing 16/13/18, Jubiläum 24/10/17, Stadtfest 24/7/15, Hochzeit 18/7/13, Kultur 16/12/16.
  `scripts/show-unlock.test.mjs` prüft noch das Modell vor Runde 5 (ODYSSEY ⊇ HORIZON ⊇ SPARK, Pakete nach Drohnenzahl) und
  muss auf die Show-Art umgestellt werden.
- **Nachtrag Einstufung**: Fußball und Kopfsprung (Stufe 3D+, Szenen aus `scenes/catalog-3d/sport.js`) spielen ihre einzelne
  3D-Szene in 3D+ als eigenes Motiv „Torschuss“/„Sprung“ direkt vor der Geschichte (`EIGENE_3DPLUS_SZENE`). Direktlinks auf
  ein Motiv, das in der verlinkten Art nicht spielt, wechseln auf die nächste Art, in der es spielt (erst größer, dann
  kleiner; `artForMotif`), mit Hinweis „Fußball gibt es als 3D+-Show“; ohne `?anlass` öffnet der Anlass des Motivs.
  `scripts/show-counts.test.mjs`: der Golfcaddy-Test ist geteilt in Räder (2D, 100–350) und Reserve (Atom, 3D+, 600–1000).
  Lichterbaum: in 3D und 3D+ faltet sich die Flocke räumlich auf und wird zum Baum (`snowTree3d`, `snowTreeStory`,
  scenes/schnee.js). `scripts/show-geometry.test.mjs` prüft die Fassungen je Stufe statt „jedes Motiv hat ODYSSEY“.
  Alle zwölf 3D+-Motive mit eigener 3D-Szene stehen in 3D+ als eigenes Motiv vor ihrer Geschichte (Namen sind
  akomo-Entwürfe: Kolibri im Flug, Delfinsprung, Drachenflug, Falterflug, Blütentanz, Gondelrunde, Pirouette, Herztunnel,
  Vorhang auf, Lichtsterne). Stadtfest: Drache vor Delfin, sonst zwei Wolken direkt hintereinander. Schlösser und der
  Hinweis an der Spur nennen die Schwelle als Preisstufe (3D+: 450 → 500). `scripts/show-unlock.test.mjs` prüft je Art;
  offen an Marc: in 3D schaltet bei Jubiläum, Stadtfest, Hochzeit und Kultur mehr Drohnen nichts mehr frei (alle späteren
  Motive sind 3D+). Der Startseiten-Teaser nimmt für Herz bei 200 Drohnen die 3D-Szene (`of`), show-teaser.js.
- **„Eure Show“ statt „Individuelles Paket“**, einheitlich „3D+“ (`preise.artName.story` = „3D+-Show“).
- **Preisstufen am Regler** (Marc: „warum ein Jump von 200 auf 210“): siehe Aufbau, Punkt 3. Pfeil-/Bild-Tasten gehen eine bzw.
  drei Stufen, Ziehen nimmt die nächste Stufe, Motivschwellen und Bedarf runden auf.
- **Einstieg**: siehe Vorschau.
- Geprüft (Playwright, echte Maus/Tastatur/Dateiwahl): Chromium und WebKit bei 390 und 1440 px; Messungen und Bilder unter
  `/tmp/fs-r9/k/`.


### Freischaltungen Runde 10 (20.11.2026)

Marc: „Im Idealfall sollte es mindestens 2 freigeschaltete Motive geben“ (3D bei 250, 2D bei 150), „überrascht, wie viele
neue Motive auf einmal möglich werden, wenn man nur auf 110 oder 120 hochschraubt“, „Einige von den 110er/120er Motiven
könnten wir auf die 100-Drohnen-Kategorie runterbringen“.

- **Stufen** (`STAGES` in `src/content/show-configurator.js`): Motive werden nur auf diesen Drohnenzahlen frei, 2D 100/150/200,
  3D 200/250, 3D+ 300/400. Katalogmotive bündeln ihre gezählte Punktzahl auf die nächste Stufe (`catalogAb`): 113 Punkte
  spielen ab 150, nicht ab 120. Die zweite 3D+-Sprosse ist 400 statt 450. Seit Runde 9 springt der 3D+-Regler in
  Hunderten, also erschien 450 erst bei 500.
- **Regel, Wächter `scripts/show-unlock.test.mjs`**: Jede Stufe, die etwas freischaltet, schaltet in jedem Anlass und jeder
  Art mindestens zwei Motive frei. 3D 250 und 2D 150 schalten überall mindestens zwei frei. Der Wächter liest alle Anlässe
  und Arten aus den Daten.
- **Gesenkt auf 100** (`SPARK_AB`, am Kontaktbogen bei 100 geprüft): Roboter, Zahnräder, Sportwagen, Lkw, Sparschwein,
  Smiley, Handschlag, Förderturm, Autoscooter, Bierkrug, Blume, Unendlich, Hochzeitstorte, Fledermäuse; Feuerwehr und
  Strandliege auf 150. Eigene Motive auf 100: Riesenrad, Feuerwerk, Masken. Technisch zeichnen flache Katalogmotive ihre Linien auch
  mit weniger Drohnen, als die kleinste Variante Punkte hat (`flatVariant` in `scenes/catalog.js`). Nicht gesenkt wurden
  Motive, deren Drohnen auf jedem Katalogpunkt verankert sind (Elefant, Palme, Anker, Kind, Drehzahlmesser, Blüten,
  Leuchtturm …: bei 100 fehlen Teile), die Fahnen (Raster mit 117 Punkten), räumliche Formationen (Kugel, Atom, Spirale:
  jeder Katalogpunkt bleibt), die Lotusblume (zu dünn) und der Fußballer (der Kopf zerfällt). Der Wächter
  `scripts/show-unlock-render.test.mjs` baut jedes Katalogmotiv bei seiner Schwelle und prüft, dass das Bild genau n
  Drohnen hat und keine Ankerpunkte abgeschnitten werden.
- **3D 250**: Marc wollte die aufwendigeren Körper nicht erst ab 250 („eher nein“). Galaxie, Atom, Pyramide, Möbius,
  Hochzeitstorte, Wasserball und Anker spielen ab 200 und sehen am Kontaktbogen dort sauber aus. Kein Katalogmotiv mit
  3D-Fassung braucht mehr als 200 Drohnen (das größte, der Wasserball, hat 186 Punkte). Darum schaltet 250 je Anlass zwei
  Zugaben frei (`zugabe()`): passende 3D-Motive, die im Anlass neu sind, in 2D ab 150, in 3D+ ab 300. Silvester:
  Cocktailglas (+ Sektkorken). Marketing: Mikrofon, Stern. Jubiläum: Sektflasche, anstoßende Gläser. Stadtfest: Mikrofon,
  Sonne. Hochzeit: Glocke, Sektflasche. Kultur: Stern, anstoßende Gläser.
- **3D+ ab 400**: Marketing Mondlandung + Flugzeug, Jubiläum Kopfsprung + Medaille (Schluss derselben Geschichte),
  Stadtfest Papierflieger + Drache, Hochzeit Falter + Lotus, Kultur Tanz + Bokkenrijders, Silvester Finale + Konfettikanone.
- **Marketing**: Reihenfolge QR-Code (Chat → QR) → Logo → Rakete → Mondlandung. Der QR-Code spielt in jeder Art, in 2D ab 150 (Marc: „erst ab da … wirklich brauchbar“). Bei 100 eröffnet das Logo.
  In 2D tragen die drei Ankerquadrate das Bild und bekommen die meisten Drohnen: Jedes ist ein vollständiger Rahmen aus 24
  Modulen mit gleichem Abstand, dazu ein gefüllter 3×3-Kern. Bei 100–110 Drohnen ist der Kern ein einzelner Punkt, sonst
  blieben weniger als 15 Datenmodule. Die Datenmodule dazwischen sind eine gleichmäßige Auswahl der echten und dürfen
  spärlich sein. Die goldenen Scan-Ecken kommen erst ab 150 Drohnen (3 je Ecke), ab 210 passt der ganze Code
  (`qrSketch`/`qrFrame` in `scenes/launch.js`). Verworfen: halbe Auflösung und ausgedünnte Ankerquadrate. Beide lasen sich
  am Bogen als loses Punkteraster.
- **Hochzeit**: Der Antrag (Ring auf Hand) steht wieder direkt nach den Ringen und spielt ab dem Einstieg in 3D+ (300).
  Ursache für das Verschwinden: Die Schwelle 450 erschien seit den 100er-Schritten von Runde 9 erst bei 500. Nur in 3D+,
  weil es eine Geschichte in drei Akten ist. Bei 300 bekommt das Armband 14 % der Hand (32 Drohnen), ab 450 die 46 aus
  dem Foto.
- **Stadtfest**: Vorn stehen Agent Ws Wahrzeichen und Jahreszahl, dann Ballons, Riesenrad, Autoscooter, Bierkrug,
  Cocktail, Stern, Förderturm, Reise. Danach Kind, Anker, Leuchtturm, Traktor, Berge, Wasserball und die beiden Zugaben.
  Kolibri, Biene, Hund und Delfin spielen in 2D ab 150. Ganz am Ende (Marc: „ans Ende“, nicht streichen) stehen Elefant,
  Hasen, Robbe, Strandliege und Palme ab 150, die Kuh mit UFO ab 200.
- Kontaktbögen je Anlass (2D 100/150/200, 3D 200/250, 3D+ 300/400, neue Motive gold): erzeugt mit dem Werkzeug unter
  `/tmp/fs-r10/m/tools/` (nicht im Repo).

## Runde 10 · Bedienung und Bühne (20.11.2026)

Marcs Rückmeldung zu Handy und Desktop, umgesetzt an der gemeinsamen Mechanik statt je Motiv.

- **Einpassung (Desktop und Handy)**: Die Motive standen in der Mitte der ganzen Leinwand. Die Steuerleiste liegt aber
  über deren unterem Rand, also rutschte jedes Bild nach unten (am Kontaktbogen von 353 Motiven bei 1440 × 900 lag das
  Motiv im Median 15 px unter der Oberkante der Leiste). Dazu passte die Einpassung nur die Punkte ein, nicht das
  gezeichnete Bild: Kippung und Perspektive schoben 3D-Körper weiter nach unten, und Eigenbewegung (Korken-Fontäne,
  sich wendende Seite) lief oben aus dem Bild. Jetzt (`src/scripts/show-field.js`, additiv, der Himmel setzt nichts davon):
  - `view()` nennt den freien Teil der Leinwand (Konfigurator: bis 8 px über der Steuerleiste; Teaser: über der
    Paketzeile). Die Motive stehen in dessen Mitte; `frameOf()` ist die eine Projektion für `render`, `screenOf` und
    `drones`. Verschwindet die Leiste (Logo-Anlass), rechnet die Bühne über einen ResizeObserver neu (`relayout`).
  - `fitProjected` passt das gezeichnete Bild ein: Rahmen nach Kippung und Perspektive, vier Nachführschritte, dazu
    Stichproben der Eigenbewegung (`motionPts`, 8 Zeitpunkte × höchstens 160 Punkte, nur ohne `fitPts`). Gerechnet wird
    nur mit Randpunkten (`edgePts`).
  - Auf schmalen Bühnen (< 600 px) darf das Bild 92 % statt 83 % der Breite nutzen, auf hohen Bühnen ein hohes Motiv
    die freie Höhe (bis 90 %).
  - Ergebnis am Kontaktbogen (alle Motive aller Anlässe in 2D 300 / 3D 1000 / 3D+ 1000, reduzierte Bewegung): 1440 × 900
    Median 39 px frei oben, 42 px über der Leiste (vorher 32 / −15); iPhone 390 × 844 Median 43 / 45. Übrig sind
    Fälle der Szenen: Kopfsprung (`fitPts` ohne das Abtauchen), schwacher Sternenkranz ums Schmuckkästchen, Zahnräder
    3 px über der Leiste.
  - Kosten: `show()` mit 50 Bildern × 1000 Punkten 2,6 → 5,8 ms, mit Eigenbewegung in allen Bildern 4,2 → 12,2 ms; bei
    4× gedrosselter CPU keine Long Tasks beim Laden und bei Anlasswechseln.
- **Bühne am Handy größer**: 50 % der Sichthöhe statt 42 % (niedrige Handys 44 statt 36 %), Variable `--cfg-stage-h`
  trägt die Höhe auch in den Fokus-Abstand der Bedienung.
- **Steuerleiste am Handy** (`--compact`, bis 640 px): keine Spur, keine Lichtpunkte gesperrter Motive, kein Hinweis.
  Pause, ‹, ›, Tempo bleiben an ihren Plätzen, die Leiste bleibt so breit wie vorher (die Spur hält unsichtbar den Platz).
- **Freischalt-Meldung**: nur die Zahl, „1 neues Motiv freigeschaltet“ / „3 neue Motive freigeschaltet“ (EN „… new
  motif(s) unlocked“, NL „… nieuw(e) beeld(en) beschikbaar“), `unlockNote` in `show-tempo.js`.
- **Startseiten-Teaser**: dieselbe Einpassung (`view` über der Paketzeile, `fitProjected`).
- Wächter: `scripts/show-fit.test.mjs` (Einpassung an fünf Bühnengrößen und vier Formen, Eigenbewegung, unveränderter
  Himmel), `src/scripts/spelling-3d-plus.test.mjs` (Namen ohne Bindestrich, keine Drohnenzahl im Titel),
  `scripts/show-price.test.mjs` (Meldung), in `tests/show-configurator.spec.ts` vier Specs „Runde 10“ (Einstieg ohne
  Wolke, Handy-Leiste, Preisbox-Titel, Motiv im freien Teil), alle auf dem Stand vor Runde 10 rot. Der Test-Helfer
  `reach()` scrollt am Handy wie ein Mensch in den Streifen zwischen Bühne und Preisleiste, bevor er klickt.


## Runde 10 · Spotify-Bänder im Logo-Modus

Ursache: Schmale, gebogene Striche, die als Loch einer Fläche entstehen (Spotify-Wellen), wurden als geschlossene Kontur abgetastet, deren zwei Seiten getrennt Punkte bekamen: Innenseite dünner als Außenseite, offene oder schräge Enden, bei 200 Drohnen versprengte Punkte. Die Glättung aus Runde 9 nahm nur die Pixeltreppe quer zur Linie heraus.

Änderung: `regularRibbons()` in `src/scripts/logo-rows.mjs` erkennt solche Bänder und legt dieselben Punkte neu auf ein sauberes Band (geglättete Mittellinie, konstante oder gleichmäßig verjüngte Breite, runde Enden, gleiche Abstände); `cleanRows()` = Bänder, dann die Glättung aus Runde 9. Punktzahl, Farben und Reihenfolge bleiben, damit Budget, Liniendichte und vorberechnete `density`-Werte gültig bleiben. Alle drei Wege in `logo-mode.js` nutzen `cleanRows`. Schutzregeln gegen Fehlgriffe (Sichel, Linse, Ring, Bosch-„S“, Puma-Schwanz) stehen am Code.

Prüfen: `node --test src/scripts/logo-rows.test.mjs` (Unruhe-Maß über alle Logos und Stufen, Spotify live bei Dichte 4–9, Kunstformen, die unangetastet bleiben müssen).

## Runde 10b · Logos mittig, Herz mit Initialen, Text-X (20.11.2026)

- **Logos im Logo-Modus mittig** (Marc: „sehr nah am oberen Rand, zu viel White Space nach unten“). Ursache: `logoFrame`
  verschob das Logo über einen unsichtbaren Hilfspunkt, gerechnet mit der Bühnen-Abbildung vor Runde 10, und die Minimap
  rechts unten kürzte das Band auch dann, wenn das Logo gar nicht über ihr stand. Jetzt gibt `logoFrame`
  (`logo-stage.mjs`) nur das Band an (`area`, Anteile der Bühne, Abdeckungen mit Breite), und die Bühne setzt das Logo
  exakt mittig (`placeInArea` in `show-field.js`, gleiche Projektion wie beim Zeichnen). Überschneidet das fertige Logo eine
  Abdeckung, gibt es drei Auswege, der größte gewinnt, mittige bei fast gleicher Größe bevorzugt: im Band darüber, so
  verkleinert erneut mittig, oder schmaler seitlich vorbei. Gemessen über alle 15 Beispiel-Logos: 1440 × 900 vorher bis
  71 px Unterschied zwischen Luft oben und unten (z. B. 26 / 90), jetzt mittig; 390 × 844 stieß Shell vorher oben an.
  Wächter: `src/scripts/logo-stage.test.mjs` misst auf der echten Bühne, Spec „Runde 10b: im Logo-Modus …“.
- **Hochzeit „Herz mit Initialen“**: kein Katalogmotiv mehr, sondern derselbe Weg wie der eigene Text im Stil Initialen
  (`textSPARK`, Standard „A & T“, nur 2D wie zuvor, `flat`). Ab 150 Drohnen berührte der Schwung des A die Herzlinie;
  `intoFrame` in `scenes/text.js` setzt Initialen im Herz kleiner und höher (gilt auch für den eigenen Text). Wächter:
  `scripts/initials-heart.test.mjs` (jeder Buchstabenpunkt im Herz, Abstand zur Linie, 100–300 Drohnen).
- **Text-X**: `#cfg-text-clear` im Feld rechts, gleiche Zeichnung wie das Logo-X, nur mit Text sichtbar, „Text entfernen“
  (DE/EN/NL); ein Klick leert sofort und lässt den Fokus im Feld.


## Große Motive (Runde 11, 20./21.11.2026)

Marc: „für ALLE Anlässe für jede 100er Steigerungsstufe mindestens 2 Motive … sonst checkt man den Mehrwert von mehr Drohnen nicht.“ Qualitätsmaßstab: 3D-Fußballer, 3D-Fahrzeuge, Baumstern → 3D-Stern mit Übergang.

- **Stufen:** `STAGES` in `src/content/show-configurator.js`: 2D 100/150/200/300, 3D 200/250/300–1000, 3D+ 300–1000 in Hunderten. Ab 400 wird 2D automatisch 3D (`TWO_D_LIMIT`).
- **Nachladen:** Jedes große Motiv liegt in `src/scripts/scenes/gross/<motiv>.js` und wird über `gross/index.js` per `import()` erst geladen, wenn der Konfigurator es baut. Nie statisch importieren (Wächter `scripts/gross-lazy.test.mjs`). Einstufung 3D/3D+ zusätzlich in `scenes/catalog-3d/stufen.js`.
- **Auswahl:** Marcs Freigabe von 40 Kandidaten plus Countdown steht im Hub unter `freelance/clients/flyingstars/25-motiv-shortlist-2026-11-20/marc-auswahl.md`.
- **Erste Welle:** Countdown (Winter 900, Steigerung der Uhr), Adventskranz (Winter 300, auch 2D), Satellit (Marketing 700, nach Rakete/Mondlandung), Tintenfisch (Stadtfest 400, nach dem Delfin), Erster Tanz (Hochzeit 500, nach dem Antrag). Je Motiv ein Wächter `scripts/<motiv>.test.mjs`.
- **Offen:** Stufen mit nur einem neuen Motiv stehen als `AUFBAU` in `scripts/show-unlock.test.mjs`; die Liste muss mit jeder Welle kürzer werden. Die meisten Stufen von 500 bis 1000 sind in den meisten Anlässen noch leer.
- **Welle 2 (21.11.2026):** Marcs Urteil zu Welle 1: Satellit und Krake sind die Referenz („beautiful, amazing“); Countdown und Adventskranz mit deutlich weniger Drohnen (Countdown jetzt ab 400, Adventskranz 200/250/300), Krake ohne Korallen, aufsteigender 3D-Drache neu (östlicher Drache in Windungen). Neu: Schlitten 500, Polarlicht 800, Eisläuferpaar 700, Fest auf dem Marktplatz 700 (Winter und Stadtfest), Förderband 500, Robotergreifer 800, Radrennen 500 (Jubiläum und Stadtfest), Firmensitz 700, Werkhalle wird Campus 1000, Schallfeld 900 (Kultur und Stadtfest), Pralinenschachtel 600, Blütenspalier 700, Töpferscheibe 500, Orgel 600 (Steigerung der Harfe). Je Anlass 3–4 Motive ab 500. Regel aus Marcs Feedback: Schwelle = kleinste Drohnenzahl, bei der das Motiv mit lockerer Linie gut liest; mehr Drohnen bringen Teile, nicht Dichte; 3D = Objekt mit eigener Bewegung, 3D+ = Geschichte mit Höhepunkt.
- **Startseite** (`src/scripts/himmel/folge.js`): höchstens 400 Drohnen je Stück (Wächter `scripts/himmel-folge-drohnen.test.mjs`); dabei Baumstern-Geschichte, Krake, Countdown, Drachenkopf.

## Runde 12 · Beispiel-Logos (21.11.2026)

Marc: „bei Bremen und Berlin die Wappenform rausnehmen … Bremen soll so nice aussehen wie im normalen Konfigurator. Und bei Ford bitte nur den Schriftzug, ohne umliegendes Oval. Und bei Rewe ist der Schriftzug einfach nicht ganz korrekt. Die Linien sind nicht gerade und die Ecken nicht rund genug. VW sieht scheiße aus, bitte raus. Spotify ist IMMER NOCH broken.“

- **Berlin**: nur der Bär aus `DEU_Berlin_COA.svg`, ohne Schild. Zunge, Krallen, Zähne und Ohr sind ebenfalls raus: am Himmel waren das Punktklumpen am Kopf und an den Tatzen. Der Bär ist schwarz, am Himmel weiß. Bei 200 Drohnen 199, bei 100 Drohnen 159.
- **Bremen** (in Runde 14 ersetzt durch den Stadtfest-Schlüssel, siehe unten): eigene vereinfachte Zeichnung des Schlüssels, nach dem Katalogmotiv Bremer Schlüssel (`scenes/wahrzeichen.js`, `KEY`, dieselben Maße): Schaft, Bart als 2×2-Raster, Reide mit vier Kreisen und nach innen gewölbten Seiten, ohne Krone und Schild. Die Striche sind dünn (11 Einheiten auf 800), damit der Konverter sie als Einzellinien zeichnet wie der Katalog; mit dicken Strichen zeichnet er Doppelkonturen und Löcher. Dunkles Schiefergrau, damit die Minimap lesbar ist; am Himmel weiß. 100 → 98, 200 → 194 Drohnen. Werkzeug: `/tmp/fs-r12/logos/tools/key.py` (nicht im Repo; die Geometrie steht im SVG).
- **Ford**: nur der Schriftzug (`path8` aus `Ford_logo_flat.svg`) in Ford-Blau `#00095b`, Ausschnitt auf den Schriftzug. Ehrlicher Befund: ein Schreibschriftzug allein braucht viele Drohnen, weil der Konverter den Punktabstand nach den dünnsten Haarstrichen richtet. Automatik: 100–120 → 250 (Lesbarkeit leidet, „ord“ zerfällt), 130–150 → 376, 160–190 → 478, 200 → 594. Eine kräftigere Fassung (Striche +0,8 Einheiten je Seite) braucht bei 200 nur 424, zerfällt bei 100 aber völlig und verändert den Schriftzug; verworfen.
- **REWE**: Ursache war die Quelle im Zusammenspiel mit dem Konverter, nicht die Glättung. Die Schlitze im E (20,5 Einheiten) und die Punze im R sind schmaler als zwei Punktabstände; der Konverter legte die Kontur dort schräg (die Unterkante des mittleren E-Arms lief diagonal), die R-Punze schrumpfte auf einen Punkt, und an jeder Ecke stand eine Drohne genau auf der Ecke. `rewe.svg` ist jetzt für den Himmel vorbereitet: R und W aus `Logo_REWE.svg` mit Strichen je Seite 3 Einheiten schmaler und Ecken r ≈ 8 (Rastern mit 2,25 px/Einheit, Erosion/Dilatation mit Kreisscheibe, Potrace), R-Außenecken und W-Oberecken r = 20; die beiden E als eigene Pfade mit Eckradien je Ecke (außen links r = 20, Armenden r = 12, Innenecken r = 3). Die Arme stehen in den Drohnen jetzt waagrecht, die R-Punze ist ein Ring, die Ecken links sind sichtbar rund. 221 Drohnen bei 200 (vorher 203).
- **Volkswagen**: aus `LOGO_EXAMPLES`, `CUSTOMER_EXAMPLES`, `sizes.json`, `rasters-index.json` und den Dateien entfernt; das Kundenlogo in der Logo-Leiste (`public/brand/logos/kunde-volkswagen-weiss.svg`) bleibt.
- **Spotify**, zwei Ursachen, beide noch sichtbar:
  1. Liniendichte 0–3 (der Griff steht in der Automatik auf 4–6, ein, zwei Schritte nach links genügen): Der Punktabstand wird größer als die Breite der Wellen. `regularRibbons` (Runde 10) greift erst ab 0,9 Punktabständen Breite, also legte der Konverter beide Seiten jeder Welle mit 0,5–0,7 Punktabständen nebeneinander, am Himmel ein Punktgitter. Neu: `thinStrokes()` in `logo-rows.mjs` (Teil von `cleanRows`) legt jede geschlossene Kontur, die schmaler ist als ihr Punktabstand, lang genug und höchstens 150° gebogen, als eine Reihe auf ihre Mittellinie, im Punktabstand der Kontur. Die überzähligen Punkte fallen weg (zwei Drohnen stünden sonst näher als ihr Abstand); die Formation braucht dann weniger Drohnen (Stufe 2: 67 → 47). `splitLoops()` trennt Konturen, die der Konverter bei grobem Abstand ohne erkennbaren Sprung hintereinander ausgibt. Ergebnis: Stufen 1–3 zeigen drei Bögen im Kreis. Stufe 0 bleibt unruhig (eine Welle liegt zu nah am Kreis), sie ist der rote Risikobereich mit Hinweis. In keiner vorberechneten Fassung eines Beispiels greift `thinStrokes` (Wächter).
  2. Vereinfachte Fassungen für ein kleineres Show-Budget (`strict`, genutzt, wenn in der Show weniger Drohnen gewählt sind als das Logo braucht): Mit `part: 'auto'` nahm der Konverter dort das ganze Logo, Kreis und Schriftzug „Spotify“, weil es vereinfacht hineinpasste (die Automatik zeigt nur die Bildmarke). `configurator-examples.mjs` rechnet `strict` jetzt mit dem Logoteil der Automatik (`part: 'mark'`, wenn die Automatik die Bildmarke nahm). **Offen (nicht in meiner Dateihoheit):** der Live-Weg für bearbeitete oder hochgeladene Logos in `show-configurator.js` (`showLogoPoints`, `mod.logoSession(source.file, { ...options, flex: "strict", hardMax: n, density: undefined })`) hat dasselbe Verhalten; dort fehlt `part: lastLogoPts?.meta?.part === "mark" ? "mark" : "auto"`.
- **Werkzeuge** (Ordner 23): `configurator-examples.mjs` nimmt die Liste aus `src/scripts/logo-examples.mjs` (Shell/Target sind nicht mehr hart verdrahtet) und gibt das SVG als Text in den Browser. Vorher holte es die Datei per `fetch` vom Fixture-Server 4391, der ein anderer Checkout (`flyingstars-poc`) ist: neue Quellen wären mit dessen alter Datei unter dem neuen Hash gerastert worden. Dasselbe in `configurator-manual-rasters.mjs` (dazu `ONLY=`). Lauf: `ONLY=… node tools/v10/configurator-examples.mjs <site>`, dann `configurator-manual-rasters.mjs`, dann `configurator-density.mjs <site> http://127.0.0.1:4600 <ids>`. Rasterzwischenstände anderer Zuschnitte (Spotify-Bildmarke für `strict`) sind aus dem Cache gelöscht, sonst wüchse `spotify.raster.json` von 6 auf 18 MB.
- **Dichte** neu gemessen für Ford, REWE, Berlin, Bremen, Spotify. Die übrigen Beispiele nicht: `thinStrokes` ändert keine ihrer vorberechneten Fassungen; bei Handstufen kann es nur Zählungen unterhalb der gemessenen Stufe senken, das hält die Regel „ein Schritt nach unten braucht nie mehr Drohnen“ ein.
- Prüfen: `node --test src/scripts/logo-*.test.mjs` (neu: Spotify live bei Stufe 1–3 je eine Reihe, `strict` nur Bildmarke, keine schmalen Striche in vorberechneten Fassungen, synthetische Bögen, `splitLoops`, REWE mit Punze, Bremen/Berlin ohne Schild, VW raus). Der Test „hochgeladenes Wappen bremen: Automatik gröber als Stufe 0“ ist ohne Beispiel: kein Beispiel hat diesen Fall mehr (geprüft bei 100 für Nieheim, Lamborghini, DHL, Firefox); die Suche deckt der synthetische Arsenal-Test. Prüfbilder: `/tmp/fs-r12/logos/`.

## Runde 14 (21.11.2026) · Logo-Hinweis nacheinander, REWE raus

- **Hinweis, dann Ablagefläche** (Marc: „mega awkward, dass beides gleichzeitig angezeigt wird“, besonders am Handy): Im Logo-Modus steht zuerst nur der Hinweis zum Algorithmus mit „Verstanden“ (`.is-notice`, Ablage-Zeichen, „Euer Logo hier reinziehen“ und Dateitypen ausgeblendet). Nach „Verstanden“ bleibt die Ablagefläche stehen (`.is-await`, Schleier wie die Einladung), bis ein eigenes Logo geladen ist; Beispiel-Logos zählen nicht. Ein Klick oder Tippen auf die Fläche öffnet die Dateiauswahl. Ohne Maus (`hover: none`) lautet die Zeile „Hier tippen und euer Logo wählen“ (`showconfigurator.tapToChooseYourLogo`), denn gezogen wird dort nicht. Code: `drawNotice()` in `src/scripts/show-configurator.js`, Stile in `src/styles/show-configurator.css`.
- **REWE als Beispiel entfernt** (Marc: „mir gefällt das ehrlich gesagt nicht, so wie es da dargestellt wird“): aus `LOGO_EXAMPLES`/`CUSTOMER_EXAMPLES`, den vorberechneten Daten (`public/media/logo-modus/beispiele/`, `sizes.json`, `rasters-index.json`) und der Kundenlogo-Folge (`public/media/logo-modus/kundenlogos.json`). Das Kundenlogo in der Logo-Leiste bleibt. Wächter: `src/scripts/logo-rows.test.mjs` (REWE darf nicht zurückkommen, ohne den Test bewusst zu ändern).
- **Bremen = der Schlüssel aus dem Stadtfest** (Marc: Bremen im Logo-Modus „janky“, im Stadtfest „mega clean“; „Wir haben ja schon diese sehr gut funktionierende Variante des Bremer Schlüssels im Stadtfest drin. Lass uns das doch einfach nehmen.“). Ursache des Wackelns: `bremen.svg` war eine zweite, eigene Nachzeichnung, die der Logo-Konverter als Kontur abtastete (zwei Punktreihen je Strich, Punkte auf der Pixeltreppe, die Bartquadrate dadurch unruhig). Jetzt gilt eine Regel: **das Beispiel Bremen bei m Drohnen = `flat('schluessel', m)`** aus `src/scripts/scenes/wahrzeichen.js`, dieselben Punkte, Teile und Farben wie im Anlass Stadtfest (2D), also bis 199 Drohnen Raster, ab 200 Haken und gelbes Kreuz, ab 280 Mäander und gelbes Ornament. Bremen läuft nicht durch den Konverter und hat keine vorberechneten Daten mehr (`bremen.svg/.json/.raster.json` sowie die Einträge in `sizes.json` und `rasters-index.json` sind gelöscht; die übrigen Beispiele sind byte-gleich, Wächter mit Hash).
  - Code: `src/scripts/logo-landmark.mjs` (Formation, Sitzung, Liniendichte, Minimap-Bild); Liste `LANDMARK_EXAMPLES` in `src/scripts/logo-examples.mjs` (`shape`, `max`, `apart`, Minimap-Farben); `logo-mode.js` gibt mit `exampleFile(id)` die Beispiel-Datei aus und erkennt sie in `logoSession()` wieder (ein hochgeladenes SVG mit denselben Bytes ist ein anderes Objekt und läuft durch den Konverter); `exampleFormation`, `preparedDensity` und `loadExample` rechnen Wahrzeichen direkt. `COLOURS` in `wahrzeichen.js` ist dafür exportiert, sonst ist das Stadtfest unverändert.
  - Drohnenregler: die gewünschte Zahl bestimmt das Bild bis 300 (`max`, statt der Grenze 200 der Konverter-Beispiele; darüber kommen keine neuen Teile mehr, nur Dichte), damit zeigt der Logo-Modus bei 300 Drohnen den vollen Schlüssel wie das Stadtfest. Die knappere Show-Fassung (weniger Drohnen in der Show als empfohlen) ist der Schlüssel bei der Show-Zahl.
  - Liniendichte: eine Stufe ist eine feste Punktdichte entlang der Linien wie beim Konverter, Stufe 8 (0,6) = 200 Drohnen, linear; das Bild ist der Stadtfest-Schlüssel bei dieser Zahl. Der Griff im Automatikzustand folgt derselben Regel wie bei den anderen Beispielen (`densityIndexFromCounts`, ein Schritt nach unten braucht nie mehr Drohnen), sofort ohne Messung.
  - Teile entfernen: Teile sind die Teilnamen des Motivs. Ein Klick wählt Schaft, Bart, Kreise oder Bögen, ein zweiter den ganzen Schlüssel; das Ornament ist ein eigenes Element. Die übrigen Linien werden im selben Punktabstand neu abgetastet (z. B. ohne Bart bei 200: 112 Drohnen).
  - Minimap: das Bild entsteht aus denselben Linien (volle Zeichnung, `landmarkSvg`), keine Datei.
  - Prüfen: `node --test src/scripts/logo-landmark.test.mjs` (Punkte und Farben = Stadtfest für 100–300 über den echten Weg in `logo-mode.js`, Show-Fassung, Liniendichte, Entfernen, Minimap, Hash der übrigen Beispiele); `logo-stage.test.mjs` misst Bremen mittig bei 100/150/200/300; die alten Bremen-Prüfungen in `logo-rows.test.mjs` gelten jetzt für die Stadtfest-Punkte. Geprüft im Build (Chromium und WebKit, 1440 × 900): Stadtfest und Logo-Modus bei 100, 200 und 300 Drohnen nebeneinander, Bart anklicken und entfernen, alle wiederherstellen, Liniendichte, Minimap. Nicht geprüft: Handy, Marcs Safari 18.6.


## Runde 14 (21.11.2026): Adventskranz dreht weniger

Marc: „Es reicht, wenn er sich nur ein bisschen dreht wie alle anderen Figuren auch“. In 3D lief der Kranz wie auf einem
Drehteller (0,32 rad/s, bei 7 s Haltezeit gut 2 rad; weil er viermal symmetrisch ist, wirkte das wie eine ganze Runde). Jetzt
schwenkt er wie die Katalog-Körper (`catalog-3d/kit.js → turn()`): 0,32 rad hin und zurück, Periode 14 s (`SCHWENK` in
`scenes/gross/adventskranz.js`). 3D+ behält den sanft anlaufenden Drehteller in eine Richtung, auf 40 % verkleinert (am Ende
rund 0,5 statt 1,3 rad). Ein Hin-und-her oder Abbremsen in 3D+ schlug im Finten-Wächter an (Überschwingen der Flammen-Drohnen
im Flug), der Drehteller in eine Richtung nicht. Gesichtet auf `/drohnenshow-preise/?anlass=silvester&motiv=adventskranz`
in HORIZON und ODYSSEY, Chromium und WebKit, 1440 und 390 px.

