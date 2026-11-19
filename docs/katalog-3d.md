# 3D-Fassungen der Katalogmotive

Runde 6, 18.11.2026. Marcs Auftrag: Jedes FlyingStars-Motiv soll eine echte 3D-Fassung bekommen, die zur selben Familie gehört wie die 2D-Formation, aber ein anderes Ding ist: keine zweite Ebene hinter der ersten, sondern ein Körper, so wie bei Kolibri, Fernsehturm, Masken und Buch.

Code: `src/scripts/scenes/catalog-3d/` (Baukasten `kit.js`, Motive in `figuren.js`, `dinge.js`, `symbole.js`, `technik.js`, `hochzeit.js`, Register `index.js`). Der Haken sitzt in `catalogScene()` in `src/scripts/scenes/catalog.js`: Hat ein Motiv einen Eintrag im Register, spielt in den Show-Arten 3D (HORIZON) und Storytelling (ODYSSEY) die 3D-Fassung, in 2D (SPARK) unverändert die Katalogformation. `show-configurator.js` musste dafür nicht geändert werden: Die Show-Art wählt schon heute über `ART_TIER` die Fassung (2D → SPARK, 3D → HORIZON, Storytelling → ODYSSEY).

## Was die vorhandenen 3D-Fassungen gut macht

| Vorbild | Bauweise | Bewegung |
|---|---|---|
| Kolibri (`scenes/natur.js`) | Körper als Achse mit Radiusprofil: Seitenlinien, Kammlinien, zwei Reifen; Kopf als Ring plus gedrehter Ring; Flügel als Umriss, aus der Ebene gedreht | Flügelschlag ±26° in 2 s (Drohnengrenzen), Licht schwirrt an den Spitzen, Dreiviertelansicht mit leichtem Schwenk |
| Fernsehturm (`tower3d`) | Rotationskörper: sechs Profillinien rundum, Ringe um die Kugel, Antenne als Linie | Licht läuft um die Kugel, Turm dreht sich langsam |
| Masken (`mask3d`) | Gesichtszüge vorn, nur der Rand dahinter | ruhiges Wiegen |
| Buch (`book3dScene`) | Seiten als gebogene Flächen um den Rücken, Zeilen darauf | eine Seite wendet sich |
| Wappen (`shield3d`) | Umriss vorn und hinten | Fahne weht in der Tiefe |
| Kugel (`scenes/kugel.js`) | Längen- und Breitenkreise, keine Punktwolke | gleichmäßige Drehung, Licht auf den Breitenkreisen |

Gemeinsam: Volumen wird als **Skelett** gezeichnet (Umriss, Querschnitt-Reifen, Kamm-, Profil- und Meridianlinien), nie als gefüllte Punktwolke. Echte Shows zeichnen Körper genauso (zehnte Fassung, Befund aus 17 FlyingStars-Shows). Ein Teil bewegt sich, der Rest steht; der ganze Körper schwenkt langsam und zeigt so seine Tiefe.

## Methode

1. **Maße aus der Katalogformation.** Die Teile werden in den Koordinaten der Katalogvariante gesetzt (Raster über die Punkte gelegt, Mittelpunkte und Radien abgenommen). Der Umriss eines runden Körpers liegt physikalisch in seiner Mittelebene, also bei z = 0: Bei 0° steht die 3D-Fassung wie das 2D-Bild da.
2. **Bauweise nach Formklasse.**
   - *Figuren und Tiere* (Lebkuchenmann, Hund, Biene, Taube): Körper aus Ellipsoiden und Röhren. Ellipsoid = Umriss + Breitenkreise + ggf. Globus-Meridiane; Röhre = zwei Seitenlinien + Kammlinie vorn + Querschnitt-Reifen + runde Enden. Gliedmaßen, die im 2D-Bild übereinanderliegen, stehen in der Tiefe auseinander (Hundebeine, Flügelpaare).
   - *Gegenstände mit Achse* (Leuchtturm, Sektflasche, Kanone, Glocke …): Rotationskörper aus Meridianen und Ringen, im eigenen Rahmen gebaut (Achse = y) und dann wie im Katalog schräg gestellt.
   - *Kugeln und Bälle* (Schneemann, Diskokugel, Ballons): Globus-Bauweise wie `kugel.js`; der Umriss bleibt ruhig, Meridiane drehen sich darin.
   - *Flache Zeichen* (Stern, Galaxie): Aus dem Umriss wird ein Körper mit Graten (Stern: vorn und hinten eine Spitze, Grate zu Zacken und Innenwinkeln) oder eine räumliche Anordnung (Galaxie: Spiralarme in einer zum Publikum gekippten Scheibe).
   - *Schriftzüge und Zahlen*: noch nicht umgesetzt; vorgesehen ist Tiefenstaffelung je Zeichen plus Kanten (siehe Offene Punkte).
3. **Vereinigung der Körper.** Wo ein Teil in einem anderen steckt (Arm im Rumpf, Kugel auf Kugel), fallen seine Linien weg (`assemble()` prüft jede Linie gegen alle anderen Volumen). So entsteht ein zusammenhängender Körper statt übereinandergelegter Formen.
4. **Merkmale auf der Vorderfläche.** Augen, Knöpfe, Mund, Nase sitzen auf der gewölbten Vorderseite (`ellipsoid().front(x, y)`). Beim Schwenken wandern sie mit der Fläche: das stärkste Tiefensignal. Wo es passt, ragt ein Teil zum Publikum (Karottennase, Fühler, Ölzweig).
5. **Gleichmäßige Abstände, nichts doppelt.** Linien werden gleichmäßig abgetastet; wo Linien sich kreuzen oder zusammenlaufen, fällt die jüngere Drohne weg, ihr Platz geht an die Linien zurück (keine Drohne näher als 0,45 × Linienabstand). Merkmalsringe schrumpfen bei wenigen Drohnen auf das, was mit Abstand hineinpasst, zuletzt auf eine Drohne.
6. **Drohnenzahl.** Genau n Drohnen von 200 (3D) bis 600. Bis `LIT_MAX` = 480 tragen alle das Skelett (Linien werden dichter, bei einigen Motiven kommen Reifen dazu); darüber warten die übrigen dunkel hinter der Form, weil dichtere Linien nicht schöner werden (gleiche Beobachtung wie Marcs Rückmeldung zur 2D-Verdichtung über 200).
7. **Bewegung.** Ein Teil tut, was das Ding tut (Arm winkt, Hut lüftet sich, Schwanz wedelt, Ball hüpft, Lichtkegel kreist, Korken wippt, Flügel schlagen, Meridiane drehen sich); der ganze Körper schwenkt aus einer Dreiviertelansicht um ±18–24° (Periode 12–14 s). Nur Drehungen und Hin-und-zurück-Verläufe ohne Finte; Geschwindigkeit < 0,8 × Drohnengrenze, Beschleunigung < 3 (Wächter). Licht: Glanz läuft über Grate und Streifen, Merkmale atmen.
8. **Prüfung als Bildfolge.** `scripts/catalog-3d-sheet.mjs` + `.py` zeichnen je Motiv 2D | 3D bei −30°, 0°, +30° um die Ruhelage | Bewegungsspur über 12 s, mit der Bühnenprojektion des Konfigurators (Kippung 0,14, Perspektive, Tiefenschattierung). Kriterien: als Familie erkennbar, räumlich, keine doppelte Ebene, keine Klumpen, keine verstreuten Punkte. Danach im echten Konfigurator (Show-Art 3D).

Aufruf Kontaktbogen:

```sh
node scripts/catalog-3d-sheet.mjs /tmp/bogen.json 200 300 lebkuchen schneemann
python3 scripts/catalog-3d-sheet.py /tmp/bogen.json /tmp/bogen.png   # braucht numpy + Pillow
```

Baut die 2D-Abtastung gerade nicht (fremde Arbeit im Checkout), bleibt die 2D-Spalte leer, die 3D-Spalten entstehen trotzdem.

## Show-Arten

- **3D (HORIZON):** ein Bild, Bildunterschrift „{Name} als Körper in 3D“ (`texts.body` aus `catalog-motifs.json`).
- **Storytelling (ODYSSEY):** zwei Akte wie bei den übrigen Katalogmotiven: Licht zeichnet den Körper (Lichtlauf von oben), dann wird er lebendig.
- Die Reihenfolge in der Folge bleibt unverändert: Katalogmotive sind in `content/show-configurator.js` als `flat` markiert und laufen ab HORIZON nach den eigenen 3D-Motiven.

## Leistung

Aufbau je Motiv und Drohnenzahl 2–6 ms (Median, Node, Rechner unter Last), einmal je Motiv und Zahl zwischengespeichert. Wächter `scripts/catalog-3d.test.mjs`: genau n Punkte in jeder Fassung, kein Punktpaar enger als 0,4 × Median-Abstand, keine allein stehende Drohne, Geschwindigkeit und Beschleunigung, Aufbauzeit < 12 ms. Im Browser (Chromium, 4× CPU-Drossel, Anlasswechsel) entsteht kein zusätzlicher Long Task gegenüber Show-Art 2D.

## Umgesetzte Motive (24, Stand 18.11.2026)

| Formklasse | Motiv | Was die 3D-Fassung ausmacht | Bewegung |
|---|---|---|---|
| Figur | Lebkuchenmann | dicker Keks aus Ellipsoiden und Röhren, Zuckerguss-Zickzack, Perlenknöpfe | rechter Arm winkt |
| Figur | Schneemann | drei Globus-Kugeln, Zylinderhut, Karottennase ragt zum Publikum | lüftet den Hut |
| Tier | Hund mit Ball | Rumpf, Brust, Kopf, Schlappohren beidseitig, vier Beine in der Tiefe, Pfoten | Schwanz wedelt, Ball hüpft |
| Tier | Biene | Hinterleib mit Querschnitt-Reifen als Streifen, Vorder- und Hinterflügel schräg nach hinten | Flügelschlag, schwebt |
| Tier | Friedenstaube | Körper, Kopf, gefiederte Flügel nach vorn und hinten in die Tiefe, Ölzweig | Flügelschlag um die Körperachse |
| Tier | Marienkäfer | Kuppel mit Naht und Punkten, Kopf, Fühler, sechs Beine nach hinten | Beine im Dreifuß-Takt, Fühler tasten |
| Figur | Lachendes Gesicht | Kugelkopf, Augen und Mund auf der Vorderfläche | nickt lachend, dreht sich |
| Tier | Sparschwein | Rumpf, Rüssel zum Publikum, Ohren, vier Beine, Ringelschwanz, Schlitz | Münze schwebt und dreht sich |
| Pflanze | Lotusblume | zwei Blütenkränze um die Achse, innen steil, außen offen, Blatt auf dem Wasser | dreht sich, Licht steigt |
| Gegenstand | Leuchtturm | rot-weißer Rotationskörper, Galerie mit Geländer, Laterne, Dach; Felsen, Meer als Wellenreihen in der Tiefe | zwei Lichtkegel kreisen |
| Gegenstand | Sektflasche | Rotationskörper, Etikett, Folie, Korken, Lichtsprühen | dreht sich um die Längsachse, Korken wippt |
| Gegenstand | Konfetti-Kanone | Rohr mit Mündung, zwei Räder in der Tiefe, Luftschlangen als Spiralen | Luftschlangen treiben hinaus |
| Gegenstand | Diskokugel | Breitenkreise und Meridiane an der Schnur, Lichtsterne in der Tiefe | Meridiane drehen sich, Lichtfleck wandert |
| Gegenstand | Ballons | fünf Ballon-Körper in verschiedener Tiefe, Schnüre im Raum | jeder schwebt im eigenen Takt |
| Gegenstand | Basketball | ruhiger Umriss, Nähte | Nähte drehen sich |
| Gegenstand | Zuckerstange | Röhre entlang des Stocks, zwei Spiralstreifen | Licht läuft die Streifen entlang |
| Gegenstand | Glocken mit Schleife | zwei Glocken als Rotationskörper mit sichtbarem Klöppel, Schlaufen schräg in der Tiefe | schwingen gegeneinander |
| Gegenstand | Geburtstagstorte | drei Stockwerke mit Zuckerguss-Wellen, Teller, Kerze, Flamme in zwei Ebenen | dreht sich, Flamme flackert |
| Gegenstand | Mikrofon | Gitterkugel, Griff, Noten in der Tiefe | Gitter dreht sich, Noten wippen |
| Gegenstand | Cocktailglas | Kelch, Stiel, Fuß, Drink-Oberfläche, Strohhalm, Schirmchen | Schirmchen dreht sich, Licht über den Drink |
| Gegenstand | Bierkrug | bauchiger Krug, Henkel als Röhre, Schaumkrone | Licht steigt als Bläschen |
| Zeichen | Stern | geschliffener Stern mit Graten vorn und hinten | dreht sich ganz, Licht läuft die Grate |
| Zeichen | Galaxie | zwei Spiralarme in einer gekippten Scheibe, Kern | Scheibe dreht sich |
| Zeichen | Sonne | Kugelkern, Strahlenkrone abwechselnd vor und hinter der Bildebene | Krone dreht sich, Licht läuft hinaus |

Damit haben 32 der 77 Auftritte flacher Katalogmotive in den Anlass-Folgen eine 3D-Fassung (die mehrfach gezeigten Stern, Galaxie, Taube, Konfetti, Diskokugel, Ballons alle).

## Runde 7 (19.11.2026): Technik, Fahrzeuge, Schmetterling, Hochzeit

Marc: „Der Schneemann und Lebkuchenmann sind crrrazy gut … warum nicht auch beim kleinen Roboter, dem Zahnrad, Drehzahlmesser, Sportwagen, Hubschrauber“, und der Schmetterling soll „nicer und ein bisschen realer“ aussehen. Acht neue Fassungen, damit 32 im Register:

| Formklasse | Motiv | Was die 3D-Fassung ausmacht | Bewegung |
|---|---|---|---|
| Figur | Kleiner Roboter | Kuppelkopf, breiter Kinnkasten mit Gitter, runder Bauch (Rotationskörper, Reifen als Querschnitt), Greifarme mit Zangen, Laufrollen als Zylinder | Arme schwingen abwechselnd, Zangen schnappen, Augen zwinkern |
| Gegenstand | Zahnräder | drei ineinandergreifende Räder (Zähnezahl im Verhältnis der Radien), Zahnkontur vorn, glatter Kreis hinten, Speichen, Achse steht heraus | drehen sich passend gegeneinander |
| Gegenstand | Drehzahlmesser | Gehäuse als kurzer Zylinder, Skala über 270° mit rotem Bereich, Nadel vor dem Zifferblatt, Digitalanzeige | Nadel dreht hoch in den roten Bereich, die Striche unter ihr leuchten |
| Fahrzeug | Sportwagen | Kastenkörper: Seitenkontur beidseitig, Dach schmaler als der Unterbau, Querkanten, Seitenfenster, vier Räder mit Speichen, Scheinwerfer, Rücklichter, Fahrtwind | Räder drehen, Wagen federt |
| Fahrzeug | Hubschrauber | Rumpf-Ellipsoid mit Querschnitt-Reifen, Kanzel beidseitig, Heckausleger, Leitwerk, Kufen mit Bügeln in der Tiefe | Hauptrotor waagerecht (im Schwenk sieht man seine Fläche), Heckrotor, Positionslicht, schwebt |
| Tier | Schmetterling (neu statt Katalog-3D) | von oben, Flügel leicht aufgestellt: spitzer Vorderflügel mit Querbinde und hellen Spitzenpunkten, Hinterflügel mit gewelltem Saum, Schwänzchen, Augenfleck und Saumlinie, Adern; Körper gegliedert, Fühler mit Kolben | Flügelschlag um die Körperachse |
| Gegenstand | Anstoßende Gläser | zwei Weingläser als Rotationskörper (runder Kelch), Wein als Oberfläche, Perlen | neigen sich zum Anstoßen, Licht blitzt an der Berührstelle |
| Zeichen | Verschlungene Eheringe | zwei Tori (Innen-, Außenkante, Kamm), gegeneinander gekippt und wirklich verschlungen, Stein oben | Glanz läuft um die Ringe, der rechte wiegt sich |

**Stufen nach Drohnenzahl.** Diese Motive brauchen schon in 2D 100–150 Drohnen. Bis etwa 330 bleibt das Wesentliche (eine Kontur, Achsen, Naben, Rumpf, Rotor); ab 330–350 kommen die Tiefenteile dazu (zweite Wagenseite und Querkanten, Gehäuserückseite, Zahnrad-Rückseite und Speichen, Kufenpaar, Adern und Saum). Ab 400 ist der Unterschied zu 2D klar sichtbar (Kontaktbögen bei 300, 400, 500).

**Verworfen in dieser Runde:** Zahnräder mit Zahnkontur vorn und hinten (liest sich als zweite Ebene) und mit Kanten an jedem Zahnkopf (unscharfe Zähne); Glasbögen über dem Drehzahlmesser (wirkten wie ein Fadenkreuz); Roboter mit sechs Meridianen (Vogelkäfig); Autoreifen als Doppelringe (im Schwenk eine „8“); Querschnitt-Reifen an dünnen Röhren (Heckausleger, Eheringe: helle Klumpen); Funken über den Gläsern als Einzeldrohnen (Wächter: allein stehende Drohne).

## Verworfen und offen

- Verworfen während der Arbeit: Glocke als Einzelglocke (der Katalog zeigt zwei Glocken, Familie nicht erkennbar), Konfetti als lose Punktwolke (verstreute Punkte, Wächter), Funkeln auf der Diskokugel (Wächter `show-clouds`: ruhende Funkelwolke), Taube mit Ringkörper und Segelflügeln (las sich nicht als Taube).
- Noch ohne 3D-Fassung (bleiben in 3D/Storytelling ihre 2D-Formation): weitere Fahrzeuge (Traktor, Lastwagen, Bagger, Feuerwehr, Planierraupe, Autoscooter, Golfcaddy, Flugzeug) – Bauweise wie Sportwagen (`box()` und `wheel()` in `technik.js`); Hochzeitsmotive Doppelherz, Herz mit Initialen, Hochzeitstorte, Tor; Landschaften (Berge, Golfplatz, Palmeninsel, Strandliege) – brauchen eine eigene Bauweise als Bühne in der Tiefe; Schriftzüge und Zahlen (30 Jahre, Initialen) – Tiefenstaffelung je Zeichen; weitere Figuren (Elefant, Hasen, Robbe, Amor, Superheldin, Kind, Golfer, Kuh und UFO, Fledermäuse) mit derselben Methode wie Hund und Taube.
- `flat` in `content/show-configurator.js`: Katalogmotive laufen ab HORIZON weiterhin hinter den eigenen 3D-Motiven. Motive mit 3D-Fassung könnten nach vorn rücken; das ist eine Inhaltsentscheidung und gehört nicht zu dieser Runde.
