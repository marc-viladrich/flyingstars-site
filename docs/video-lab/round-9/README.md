# Runde 9: Durchflug statt Zoom-Brücke

Marc fand die Brücke aus Runde 8 „okay, aber man merkt, dass es eine falsche Transition ist“. Runde 9 ersetzt sie durch einen Übergang, der in der Bildsprache des Originals bleibt.

## Warum Runde 8 künstlich wirkte

Frameweise geprüft, vier Ursachen:

1. **Zwei Standbilder.** Die 13 Zwischenbilder entstanden aus genau zwei Einzelbildern (Logo 378, Bodenflug 0). Für eine halbe Sekunde standen Drohnen und Kamera still, mitten in einem Film, der sonst nie stillsteht.
2. **Rückwärtszoom.** Das Logo wurde hineingezoomt (Skala 1 → etwa 8), der Bodenflug aber von etwa 7 auf 1 *heraus*gezoomt. Die Kamera kehrt also mitten im Übergang die Richtung um, obwohl der Bodenflug selbst ein Vorwärtsflug ist.
3. **Weichzeichner statt Lichtspur.** Die Bewegungsunschärfe war im Kern ein Gauß-Weichzeichner über das ganze Bild. Die Originalübergänge (NFL-Rot, Parkplatz → Ford, Ford → FlyingStars) ziehen dagegen jeden Lichtpunkt zu einer scharfen radialen Spur; das Bild wird nie neblig.
4. **Helligkeitsdelle.** Die Rückwandlung RGB → YUV lief mit FFmpegs Standard-Skalierer, der diese dunklen Bilder etwa 1,5 Stufen zu dunkel zurückgibt. Die Brücke sackte dadurch sichtbar ab (Luma 21,8 → 20,2), bevor sie wieder anstieg.

## Gestaltung

Die Kamera fliegt durch das Logo in den Bodenflug.

- **Beide Seiten bewegen sich weiter.** Die letzten 9 Logo-Frames (Schnitt 370–378) und die ersten 8 Bodenflug-Frames (Schnitt 0–7) laufen echt weiter. Kein Standbild.
- **Durchgehend vorwärts.** Die Kamera beschleunigt ins FS-Zeichen hinein (Skala 1 → 7, Beschleunigungskurve u^2,4). Der Zoommittelpunkt wandert dabei vom Zeichen zum Fluchtpunkt des Bodenflugs. Der Bodenflug kommt ohne Rückwärtszoom an: Seine Lichtspuren zeigen vom eigenen Fluchtpunkt nach außen und klingen zu null ab, bis die native Eigenbewegung übernimmt.
- **Lichtspuren wie im Original.** Radiale Spuren in linearem Licht, Kopf hell und Schweif zum Zentrum hin auslaufend, drei Durchgänge, damit die Spur geschlossen statt gepunktet ist. Nur die Lichter ziehen Spuren; der komprimierte Himmelsdunst wird nur skaliert, sonst verschmiert er zu einem Fleck mit harter Kante. Die durch das Mitteln entsättigten Spuren erhalten ihre Farbe zurück.
- **Überblendung im linearen Licht** über 4 Frames. Keine Doppelbelichtung, kein Blitz.
- **Belichtung gehalten.** Die Durchschnittshelligkeit folgt der Linie zwischen den beiden nativen Einstellungen, mit 8 % Anhebung in der Mitte, wie bei den Zoom-Übergängen des Originals (Ford: +8 %).

Gemessene Luma über die Dateigrenze (Y-Mittel, 1918 px): Logo 22,0 → Brücke 22,2 … 23,8 → Bodenflug 23,6. Runde 8 an derselben Stelle: 21,8 → 20,2 → 23,8 → 21,1.

## Konstruktion der Dateigrenze

Der freigegebene 379-Frame-Schnitt aus Runde 7 bleibt die Quelle. Die Datei besteht aus:

| Abschnitt | Frames | Herkunft |
|---|---:|---|
| Schnitt 8–369 | 362 | unverändert, framegenau gegen das Original geprüft |
| Brücke | 13 | Logo 370–378 und Bodenflug 0–7, je bewegt, 4 Frames Überlappung |

**375 Frames, 15,00 Sekunden** (Runde 8: 392 Frames, 15,68 s). Das letzte Brückenbild ist Bodenflug 7 ohne Restspur, die Datei beginnt mit nativem Bodenflug 8. Die Dateigrenze ist also eine durchgehende Vorwärtsbewegung im echten Material. Kein Motiv entfällt: Die Bodenflug-Frames 0–7 und die Logo-Frames 370–378 sind in der Brücke sichtbar.

Die Brückenframes werden mit `accurate_rnd+full_chroma_int+bitexact` nach RGB gelesen und zurück nach BT.709 im begrenzten Bereich geschrieben. Der Rundweg weicht im Mittel 0,03 Stufen ab, vorher 1,5.

`transition.py` enthält die Gestaltung, `encode.py` Schnitt, Master, alle 13 Fassungen und die Nachweise. Abhängigkeiten: Pillow, NumPy, FFmpeg mit libx264 und libsvtav1. Keine Browser-Effekte, kein Ton.

## Ausgaben und Prüfung

Dateien `loop16-…-v9.mp4`, Edit `flythrough-loop-15_00-v9`; IDs, Größen, Codecs und CRF wie in Runde 8, damit Hero-Auswahl und Vergleichsansicht unverändert bleiben. Zum direkten Vergleich bleibt die Runde-8-Datei als `loop16v8-h264-1440` im Katalog (Gruppe „Vorherige Loop-Brücke“).

- `source-lineage.json`: 362 native Frames gleich Schnitt 8–369, QR-Zoom framegenau (Ausgabe 33–56), Cube und spätere Logo-Einstellung weiterhin ausgeschlossen, erstes Dateibild = Original-Frame 8.
- `end-motion.json`: die letzten 28 decodierten Frames jeder automatischen Fassung sind alle verschieden (kein Standbild am Ende).
- `repeat-proof.json`: drei aneinandergehängte H.264-640-Zyklen, 1125 Frames, identisch, beide Grenzen enthalten.

Bewertet wurde über Kontaktbögen, Bild-für-Bild-Differenzen und Luma-Verlauf über die Dateigrenze. Eine Sichtprüfung der echten Wiedergabe im Browser steht noch aus.
