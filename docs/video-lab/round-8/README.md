# Runde 8: Zoom-Brücke für den Loop

Marc hat den harten Sprung vom dynamischen Schlusslogo zum Bodenflug beim Wiederholen beanstandet und einen zur Originalsprache passenden Zoom-/Swoosh-Effekt gewünscht. Die zwei Motive haben weder denselben Bildaufbau noch eine fortlaufende Kamerabewegung. Eine zusätzliche bewegte Brücke verbindet sie.

## Gestaltung

Die gewählte Brücke dauert 14 Frames beziehungsweise 0,56 Sekunden. Das dynamische Logo wird radial vergrößert und mit integrierter Bewegungsunschärfe in den Bodenflug überführt. Der Bodenflug kommt aus dem Zoom scharf zurück. Eine zeitlich begrenzte weiche Überblendung liegt innerhalb der Bewegungsunschärfe. Kein Ton, kein Blitz oder schwarzer Zwischenframe. Alle bisherigen Motive einschließlich des vollständigen dynamischen Schlusslogos bleiben erhalten. Cube und spätere Logo-Einstellung bleiben ausgeschlossen.

Mehrere Längen und Intensitäten wurden als Kontaktbögen verglichen. Die stärkere radiale Variante passt besser zu den bereits vorhandenen Zoom-Streifen als die zunächst zurückhaltenden Überblendungen. Der endgültige Kontaktbogen zeigt die echten Masterframes über die Dateigrenze hinweg. Kontaktbögen prüfen Einzelbilder und den Bewegungsaufbau; sie sind keine Behauptung eines Echtzeit-Browsertests.

## Konstruktion der Dateigrenze

Der freigegebene 379-Frame-Schnitt aus Runde 7 wird unverändert aus den Originalpassagen aufgebaut. Seine Frames 1–378 bilden den Anfang der neuen Datei. Darauf folgen 13 neu berechnete Zoomframes aus Schlussbild 378 und Anfangsbild 0. Ganz am Ende steht das unveränderte Anfangsbild 0. Beim Neustart folgt daher das unveränderte Bild 1.

Die Dateigrenze selbst ist damit exakt dieselbe Bewegung 0 → 1 wie am ursprünglichen Beginn. Das erste Bild wird zyklisch ans Ende gelegt, kein Motiv übersprungen. Alle 379 Originalframes bleiben pro Schleife erhalten, hinzu kommen 13 synthetisch transformierte Frames. Ergebnis: **392 Frames, 15,68 Sekunden**, 0,52 Sekunden länger als Runde 7. Die Brücke enthält das bereits vorhandene Anfangsbild und dauert deshalb 0,56 Sekunden.

`transition.py` berechnet die 13 Zwischenbilder mit Lanczos-Skalierung, sieben zeitlich versetzten Zoomproben pro Ebene, radialer Bewegungsunschärfe und einem weichen Blendverlauf. FFmpeg konvertiert die RGB-Zwischenbilder ausdrücklich nach BT.709 im begrenzten Videobereich. Native Anfangs-/Schlussbilder werden ohne RGB-Rundweg übernommen. Keine neuen npm-Abhängigkeiten oder Browser-Effekte.

## Ausgaben und Prüfung

Dateien `loop16-…-v8.mp4`, Edit `radial-zoom-loop-15_68-v8`. Alle 13 Größen-/Codec-/Referenzfassungen verwenden denselben Loopmaster. Desktop 960/1280/1440, mobil 640, AV1 nur bei positiver Effizienzauskunft, sonst H.264. Normaler Wiedergabecontroller, Resize und Consent unverändert.

`source-lineage.json` trennt unveränderte Originalframes und die 13 bewusst transformierten Frames. Der native 378-Frame-Anfang muss exakt dem freigegebenen Schnitt ab dessen zweitem Frame entsprechen. Letzter und erster Dateiframe müssen exakt Original 0 und 1 sein. Eigene Guards sichern weiterhin den QR-Zoom sowie den Ausschluss von Cube und späterer Logo-Einstellung.

`repeat-proof.json` dokumentiert drei tatsächlich aneinandergehängte und decodierte H.264-640-Zyklen: 1176 Frames, drei identische vollständige Zyklen, zwei geprüfte Dateigrenzen. Das belegt Framefolge und Bitstream-Wiederholung. Es garantiert keine lückenlose Decoder-Neuinitialisierung in jedem Browser. `end-motion.json` prüft zusätzlich 28 verschiedene Schlussframes jeder der acht automatischen Dateien, an deren SHA-256 gebunden.

Die große Vergleichsansicht unterstützt `?start=1&at=14`, damit Marc direkt vor dem Übergang einsteigen kann. Die ältere Fassung ohne Brücke bleibt als Einzelprüfung über `cut15d-h264-1440` erreichbar. Keine Browser-Testserie, Aufnahme oder neue Lighthouse-Messung.

## Dateigrößen

| Fassung | Byte |
|---|---:|
| loop16-reference | 14687401 |
| loop16-h264-1918 | 4431022 |
| loop16-av1-1918 | 2424815 |
| loop16-h264-1600 | 3452565 |
| loop16-av1-1600 | 2167866 |
| loop16-h264-1440 | 2917485 |
| loop16-av1-1440 | 1877163 |
| loop16-h264-1280 | 2170995 |
| loop16-av1-1280 | 1608841 |
| loop16-h264-960 | 1441628 |
| loop16-av1-960 | 1118629 |
| loop16-mobile-h264-640 | 882643 |
| loop16-mobile-av1-640 | 742077 |

43 fokussierte Node-Checks und neun Render-/Bildprüfungen bestanden. Astro check: 255 Dateien, 0 Fehler, 0 Warnungen. Build erfolgreich. Keine Aussage über die vollständige CI.
