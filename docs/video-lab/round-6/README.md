# Runde 6: originaler Zoom zum QR-Code

Marc hat den ruckeligen Einstieg in Scan Me beanstandet und den Zoom-Übergang aus dem Original gewünscht. Der vorherige Schnitt setzte bei Quellframe 100 ein. Dort ist der eigentliche Zoom bereits vorbei.

Die QR-Passage beginnt jetzt bei Frame 82 und läuft bis Frame 158. Damit bleiben der kurze Ausgang aus der vorherigen Formation, der originale Zoom und das Einpendeln in Scan Me vollständig erhalten. Es wird kein neuer Zoom nachgebaut. Die vollständige Cube-Animation wird nicht wieder aufgenommen; ihr kurzer Auslauf gehört zum Übergang.

Alle anderen Quellintervalle bleiben unverändert gegenüber Runde 5:

| Passage | Quellframes, Ende exklusiv | Dauer |
|---|---|---|
| Kurzer Bodenflug | 0–41 | 1,64 s |
| Originalzoom und QR/Scan Me | 82–158 | 3,04 s |
| Kolibri, Puma, Riders und NFL-Catch | 240–387 | 5,88 s |
| Eine NFL-Logo-Einstellung | 408–434 | 1,04 s |
| Spätere Ford-Perspektive, Übergänge und FlyingStars | 463–610 | 5,88 s |

Ergebnis: 437 Frames bei 25 fps, **17,48 Sekunden**, 0,72 Sekunden länger. Keine zusätzliche Beschleunigung oder Überblendung, kein Freeze. Desktop 960/1280/1440 und mobil 640 bleiben wie bisher, AV1 mit positiver Effizienzauskunft und H.264-Fallback. Die großen Vergleichsgrößen 1600 und 1918 sind ebenfalls aktualisiert.

Die Dateien heißen `cut17c-…-v6.mp4`, Edit `original-qr-zoom-17_48-v6`. Historische Fassungen bleiben erhalten. `encode.py` erzeugt Exporte und Metadaten. `source-lineage.json` vergleicht sämtliche 437 decodierten Masterframes mit den Originalpassagen. Zusätzlich werden die 36 aufeinanderfolgenden Übergangsframes aus dem Original 82–118 gegen die Ausgabe 41–77 geprüft. `end-motion.json` prüft die letzten 28 Frames jeder automatisch verwendeten Fassung und bindet den Nachweis an den Dateihash.

Gezielte schnelle Node-Guards sowie Typprüfung und Build. Keine Browser-Testserie oder Aufnahme für diese Medienkorrektur. Der Kontaktbogen des Originalübergangs und des neuen Masters liegt im Geschäftshub. Die Originalframe-Prüfung belegt den übernommenen Übergang; sie ersetzt keine subjektive Beurteilung des Pacings.

## Dateigrößen

| Fassung | Byte |
|---|---:|
| cut17c-reference | 15916792 |
| cut17c-h264-1918 | 4724154 |
| cut17c-av1-1918 | 2565626 |
| cut17c-h264-1600 | 3678991 |
| cut17c-av1-1600 | 2301780 |
| cut17c-h264-1440 | 3108821 |
| cut17c-av1-1440 | 1979925 |
| cut17c-h264-1280 | 2311356 |
| cut17c-av1-1280 | 1703816 |
| cut17c-h264-960 | 1535031 |
| cut17c-av1-960 | 1172982 |
| cut17c-mobile-h264-640 | 942864 |
| cut17c-mobile-av1-640 | 783818 |

39 fokussierte Node-Checks und neun Render-/Bildprüfungen bestanden. Astro check: 255 Dateien, keine Fehler oder Warnungen. Astro-Build erfolgreich. Die vollständige CI wird nicht als geprüft oder grün behauptet.
