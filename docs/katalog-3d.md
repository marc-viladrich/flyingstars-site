# 3D-Fassungen der Katalogmotive

Runde 6, 18.11.2026. Marcs Auftrag: Jedes FlyingStars-Motiv soll eine echte 3D-Fassung bekommen, die zur selben Familie gehört wie die 2D-Formation, aber ein anderes Ding ist: keine zweite Ebene hinter der ersten, sondern ein Körper, so wie bei Kolibri, Fernsehturm, Masken und Buch.

Code: `src/scripts/scenes/catalog-3d/` (Baukasten `kit.js`, Motive in `figuren.js`, `dinge.js`, `symbole.js`, `technik.js`, `hochzeit.js`, `einfach.js`, Register `index.js`, Einstufung 3D/3D+ in `stufen.js`). Der Haken sitzt in `catalogScene()` in `src/scripts/scenes/catalog.js`: Hat ein Motiv einen Eintrag im Register, spielt in den Show-Arten 3D (HORIZON) und Storytelling (ODYSSEY) die 3D-Fassung, in 2D (SPARK) unverändert die Katalogformation. `show-configurator.js` musste dafür nicht geändert werden: Die Show-Art wählt schon heute über `ART_TIER` die Fassung (2D → SPARK, 3D → HORIZON, Storytelling → ODYSSEY).

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

## Runde 9 (20.11.2026): Einstufung 3D / 3D+, Galaxie, Lücken

Marc: „der Unterschied zwischen 3D und 3D plus ist noch nicht krass genug … bei 3D … wirklich einfache Elemente, und dann die komplexen 3D-Elemente eher bei 3D Plus“; „die Galaxie … sieht noch ziemlich janky aus“; „Sportwagen und Helikopter, aber vom Flugzeug nicht … diese ganzen Inconsistencies“.

**Regel (stufen.js).** Die Stufe folgt allein aus der Formklasse, die jedes Motiv im Register angeben muss (Wächter in `scripts/catalog-3d.test.mjs`):

- **3D, einfach:** Zeichen, Körper, Gegenstand, Technik. Ein Gegenstand aus wenigen Grundkörpern (Kugel, Rotationskörper, Ring, Scheibe) oder ein Zeichen; Bewegung ist Drehung, Licht oder EIN einfacher Teil.
- **3D+, komplex:** Figur, Tier, Pflanze, Fahrzeug, Szene, Effekt. Glieder oder Flügel, Räder und Rotoren, viele Blätter, mehrere Dinge in einer Szene, volumetrische Effekte, erzählte Abläufe.

Angewendet wird die Stufe im Konfigurator (`src/content/show-configurator.js`): Motive der Stufe 3D+ spielen nur in Storytelling (ODYSSEY). `stufen.js` enthält auch einen Vorschlag für die eigenen Motive (`STUFE_EIGEN`) und die Katalog-Formationen, die schon räumlich sind (`STUFE_FORMATION`, alle 3D).

**Zwei Fassungen je einfachem Motiv.** Marc: „dass 3D+ offensichtlich komplexer und refinter und more polished wirkt“. Einfache Motive laufen in 3D und in 3D+; jede Fassung ist deshalb `(n, stufe)` und baut je Stufe etwas anderes (`isPlus(stufe, n)` in `kit.js`, 3D+ ab 300 Drohnen voll):

- **3D:** Grundkörper mit wenigen Profillinien, Einzellinien statt Röhren, keine Zierteile, keine Eigenbewegung außer dem, was das Ding ausmacht (Nadel, Zahnräder), ruhiger Schwenk.
- **3D+:** Röhren mit Kamm, Zusatzteile (Spray, Klöppel, Noten, Schirmchen, Schaumkrone, Kette, Girlanden, Höhenlinien, Gehäusetiefe, drittes Zahnrad, polarer Ring der Galaxie …), feinere Silhouette und eine Story-Bewegung (laden, anstoßen, schlagen, aufblitzen).
- Komplexe Motive (Stufe 3D+) haben nur eine Fassung; sie ignorieren die Stufe.
- Wächter: jedes einfache Motiv baut in 3D+ eine andere Punktlage als in 3D; Abstände und Drohnengrenzen gelten für beide Stufen.
- **Offen im Konfigurator:** `scenes/catalog.js` reicht die Stufe noch nicht durch. Nötig sind drei Zeilen: in `bodyScene` `const stufe = tier === 'ODYSSEY' ? '3D+' : '3D'`, `body3d(key, k, stufe)` mit Cache-Schlüssel `${key}|${k}|${stufe}` und `CATALOG_3D[key](k, stufe)`. Bis dahin zeigen 3D und 3D+ beide die schlichte Fassung.

Paarbogen (3D 0° | 3D +30° | 3D+ 0° | 3D+ +30° | 3D+ Bewegung): `node scripts/catalog-3d-sheet.mjs aus.json 200 400 --paare stufe:3D`.

**Marcs Entscheidungen zur Einstufung (20.11.2026).** Lotusblume, Lotus-Szene, Herz-Tunnel und Riesenrad bleiben 3D+. Anstoßende Gläser: „zu nitpicky, Anstoßen kann ruhig in 3D rein“. Die 3D-Fassung stößt jetzt an (schlichte Gläser, kein Wein, kein Lichtblitz), 3D+ bleibt aufwendiger (Wein, Perlen, mehr Profillinien, Licht an der Berührstelle). Dabei behoben: Seit Runde 7 neigten sich die Gläser beim „Anstoßen“ voneinander weg (Vorzeichen der Drehung). Jetzt stehen sie in der Ruhelage mit etwas Luft und treffen sich auf dem Höhepunkt (engster Abstand 0,25 → 0,08).

**Galaxie neu.** Vorher liefen die Arme bei Radius fast null zu einem Knäuel zusammen, der Kern war ein Ellipsoid mit Querlinie (las sich als „e“), Staubarme liefen dicht neben den Hauptarmen (Doppellinien), und das Licht flackerte (`wander`). Jetzt: zwei logarithmische Spiralen mit festem Steigungswinkel ab Radius 0,15, ein kleiner Kugelumriss als Kern, starre langsame Drehung, Licht innen heller und ein einzelner Schimmer nach außen. Verworfen: Nebenarme genau zwischen den Hauptarmen (außen trotzdem zu nah), Sternhaufen auf den Armen (wirken wie Knoten).

**Neu (9):** Flugzeug, Lastwagen, Feuerwehrauto (3D+, Fahrzeuge; Kastenkörper und Radpaare aus `technik.js`), Batterie, Doppelherz, Unendlich-Zeichen, Peace-Zeichen, Anker, Hochzeitstorte (3D, `einfach.js`). Die einfachen füllen den 3D-Modus, der durch die Umstufung kleiner wird: je Anlass bleiben dort 7 bis 13 Motive.

**Noch ohne 3D-Fassung (29):** Jubiläum: Fahnen, 30 Jahre, Golfer, Golfplatz, Golfcaddy, Planierraupe, Bagger, Schraubenschlüssel, Handschlag. Festival: Palmeninsel, Strandliege, Kind mit Ballons, Autoscooter, Traktor, Berglandschaft, Elefant, Hasen, Kuh und UFO, Robbe, Förderturm. Hochzeit: Tor, Herz mit Initialen, Amor, Schleifenornament, Zwei Blüten, Blume, Blume am Stiel. Kultur: Superheldin, Fledermäuse. Im 3D-Modus sollen sie ausgeblendet werden statt als 2D-Formation zu laufen (Konfigurator).

Kontaktbogen nach Stufe: `node scripts/catalog-3d-sheet.mjs aus.json 200 400 stufe:3D` bzw. `stufe:3D+`; mit `--paare` beide Fassungen nebeneinander (die Spaltennamen stehen im JSON als `cols`; `catalog-3d-sheet.py` zeigt sie, sobald es `cols` liest).

## Sportfiguren (sport.js)

Runde 9 (19./20.11.2026). Marc: „so nice wie du den Schneemann und das Lebkuchenmännchen gemacht hast, es ist crazy, wie schlecht im Vergleich dann dieser Fußballer ist.“ Fußball und Kopfsprung sind eigene Motive (Anlass Jubiläum, `scenes/jubilaeum.js`), keine Katalogmotive. Ihre Körper stehen in `catalog-3d/sport.js`; `index.js` reicht sie als `SPORT_3D` weiter, nicht in `CATALOG_3D` (`catalogScene()` kennt nur Katalogschlüssel). Stufe nach `stufen.js`: beide 3D+ (Figur mit Gliedern), also im Konfigurator in 2D und 3D+, nicht in 3D.

**Was vorher falsch war (gemeinsame Ursache: Strichfigur statt Körper).** Kopf als Ring, Rumpf als ein Strich, Arme als Einzellinien, alles bei z = 0: im Schwenk eine schmaler werdende Pappkarte. Der Ball war eine flache Scheibe, startete ohne Schwung und flog beim Schuss durch das Bein. Der Springer war dieselbe Strichfigur aus Kapseln.

**Körper (`spieler(n, { outline, kind })`).** Figurrahmen: Blick nach +x, y oben, z seitlich. Kopf, Trikot, Hose und Schuhe sind Ellipsoide, Hals, Arme und Beine Röhren (Oberschenkel kräftig, Wade). Schulterbreite von Gelenk zu Gelenk gut zweimal die Kopfbreite (Marc: „wirkt noch dürr, fast wie ein Skelett“). Trikot mit Schulter- und Saumreifen: Breitenkreise zeigen die wahre Breite aus jedem Blickwinkel; Profil und Meridian allein ließen den Rumpf im Dreiviertelblick schmal wirken. Hosensaum und Stutzen sind Querschnitt-Reifen. Stufen nach Drohnenzahl: unter 300 Doppelkontur mit Reifen, ab 300 Kammlinien an Beinen und die Brustbreite, ab 400 Kammlinien an den Armen (vorher rissen die Linien bei 250 Drohnen auf). `outline: true` ist nur die Doppelkontur, so wie FlyingStars dicke Glieder zeichnen (2D-Fassung). `kind: 'springer'` färbt nur eine Badehose.

**Gelenke.** 13 Gelenke mit Vorwärtskinematik um die Gelenkpunkte der Bauhaltung (`SEG`, `place()`), innerstes Gelenk zuerst wie `rig()` in `show-motion.js`, nur in 3D (Beugen um z, Abspreizen der Arme um x). Haltungen sind Winkelobjekte (`POSES`: anlauf, schuss, stand, jubel).

**Schuss (Referenz Eisenhüttenstadt, `anker-runde-2`).**
- Die Figur steht in der Anlaufstellung, das Schussbein hinten, die Spitze am Boden. Das ist das Ausholen; es gibt keine Bewegung nach hinten (Finten-Wächter).
- Nach 1 s Ruhe schwingt das Bein in einem Zug bis fast in die Waagerechte. Die Schwunggeschwindigkeit (`SWING`) steigt, sinkt beim Treffen auf 45 % (der Fuß gibt den Schwung ab) und klingt dann aus; sie wird nie negativ. Oberkörper zurück, Gegenarm hinaus, jedes Gelenk ein einziger Weg.
- Der Ball liegt dort, wo die Schuhspitze am tiefsten durchschwingt. Der Abflug wird beim Aufbau gesucht: so spät wie möglich, ohne dass eine Schuh- oder Schienbeindrohne in den Ball eindringt (Abstand zum Ballrand ≥ 0,025).
- Flug (`drag()`): Die Geschwindigkeit steigt in 0,43 s weich an und klingt dann ab wie durch Luftwiderstand, waagerecht langsamer als senkrecht. So wird die Bahn zum Bogen, der Ball steigt und bremst bis zum Stand. Drall: eine Dreivierteldrehung, die mit dem Flug ausläuft.
- Ausnahme Drohnengrenze (Marc, 20.11.: „so lassen“): Ein Schuss ist ein Impuls; der Ball darf in der halben Sekunde nach dem Abflug bis 1,7 × `LIMITS.accel` beschleunigen (gemessen 4,0–5,0 Anzeigeeinheiten), danach unter der Grenze.
- Ball (`ball(k, R)`): Kugelumriss, großes Fünfeck, je Ecke ein Linienzug Naht → Kante des Nachbarflecks. Der Umriss ist bewusst nicht `solid`: Die Fünfeckkanten sind Sehnen und lägen sonst im Inneren der Kugel, das Muster verschwände.

**Fassungen.** `schuss2d` (2D): Doppelkontur im Durchschwung, flach, der Ball steigt und bremst. `schuss` (Bild „Der Spieler schießt“, `kickHorizon`; derzeit nicht gespielt, da Stufe 3D+). `kickStory` (3D+): derselbe Schuss mit stehendem Blick, der Ball fliegt flach unter der Latte ins Tor (`target`, `lift`), Lichtspur entlang der echten Ballbahn, danach Jubel. Der Spieler bekommt dort 46 % der Drohnen, höchstens 320.

**Springer (`springer(n)`).** Derselbe Körper mit Badehose, die Arme gestreckt über dem Kopf, die Beine geschlossen, um die Längsachse zum Publikum gedreht (Brust und Schultern sichtbar). Der Kopf trägt mehr Drohnen (`headWeight`), damit er zwischen den Armen lesbar bleibt. Er nimmt die Gelenkwinkel der alten Strichfigur entgegen (`torso`, `arms`, `thigh`, `shin`, `foot`), daher bleiben Bahn und Takt in `jubilaeum.js`. Zwei Takt-Änderungen, beide Wächter-Befunde: Sprung 3,5 statt 3,2 s (am Scheitel überschritten die Hände die Beschleunigungsgrenze, das war schon bei der Strichfigur so), Scheitel des Absprungs 0,16 höher (der Körper steht mit erhobenen Armen höher, sonst sänke sein Schwerpunkt am Ende des Absprungs zurück).

**Wächter.** `scripts/fussball-3d.test.mjs`: genau n Drohnen in jedem Bild von 150 bis 1000, keine zwei aufeinander, keine allein stehende Drohne, Ballmuster vorhanden, Fuß dringt nicht in den Ball ein, Ball fliegt erst los, wenn der Fuß da ist, Drohnengrenzen in Anzeigeeinheiten (wie `fit()` in `show-field.js`; beim Springer nur leuchtende Drohnen, der Rückweg hinter dem Wasser läuft dunkel), Kopf des Springers mit genug Drohnen und unter den Händen, Aufbau < 30 ms. Dazu `show-finte` (Jubiläum: 0 Treffer) und `show-counts`.

**Verworfen.** Ball, der beim Erreichen des Fußes erst langsam anläuft (der Fuß lief durch ihn hindurch); Abflug genau bei höchster Fußgeschwindigkeit (der Ball hätte das Dreifache der Grenze gebraucht); Drall mit 1,2 Umdrehungen (der größte Teil der Abflugbeschleunigung kam aus dem Drall); Hals in der Doppelkontur (schnitt den Kopfring auf); Hände des Springers ganz zusammen im Profil (der Kopf verschwand zwischen den Oberarmen).

## Verworfen und offen

- Verworfen während der Arbeit: Glocke als Einzelglocke (der Katalog zeigt zwei Glocken, Familie nicht erkennbar), Konfetti als lose Punktwolke (verstreute Punkte, Wächter), Funkeln auf der Diskokugel (Wächter `show-clouds`: ruhende Funkelwolke), Taube mit Ringkörper und Segelflügeln (las sich nicht als Taube).
- Noch ohne 3D-Fassung: die aktuelle Liste (29 Motive, Stand Runde 9) steht im Abschnitt „Runde 9“. Fahrzeuge bauen wie Sportwagen, Lastwagen und Feuerwehr (`box()`, `wheel()`, `axle()` in `technik.js`); Figuren und Tiere wie Hund und Taube; Landschaften (Berge, Golfplatz, Palmeninsel, Strandliege) brauchen eine eigene Bauweise als Bühne in der Tiefe; Schriftzüge und Zahlen (30 Jahre, Initialen) Tiefenstaffelung je Zeichen.
- `flat` in `content/show-configurator.js`: Katalogmotive laufen ab HORIZON weiterhin hinter den eigenen 3D-Motiven. Motive mit 3D-Fassung könnten nach vorn rücken; das ist eine Inhaltsentscheidung und gehört nicht zu dieser Runde.
