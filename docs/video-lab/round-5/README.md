# Runde 5: Motivvielfalt im kurzen Showreel

Marcs Feedback: Kolibri, Puma und Riders-Motiv wieder zeigen. NFL soll den Catch und nur eine Logo-Einstellung enthalten. Bodenflug kürzen, Cube-Animation und die erste Ford-Einstellung auf Bodenhöhe entfernen. FlyingStars darf am Schluss etwa anderthalb Sekunden kürzer werden. Ziel bleibt ungefähr 16 Sekunden, Veröffentlichung auf der bestehenden WIP-Adresse.

## Schnittentscheidung

Der neue Film dauert **16,76 Sekunden**, 419 Frames bei 25 fps. Fünf Originalpassagen, Frame-Enden exklusiv:

| Passage | Quellframes | Originalzeit | Dauer |
|---|---|---|---|
| Kurzer Flug durch die Bodendrohnen | 0–41 | 0,00–1,64 s | 1,64 s |
| QR / Scan Me | 100–158 | 4,00–6,32 s | 2,32 s |
| Kolibri, Puma, Riders-Motiv und NFL-Catch | 240–387 | 9,60–15,48 s | 5,88 s |
| Einmal NFL-Logo, frontale Einstellung | 408–434 | 16,32–17,36 s | 1,04 s |
| Ford aus der Vogelperspektive, Zoom-/Blurübergänge und FlyingStars | 463–610 | 18,52–24,40 s | 5,88 s |

Der zusammenhängende Mittelblock erhält die Originalübergänge zwischen den geforderten Motiven. Die schräge erste NFL-Logo-Einstellung entfällt. Bei Ford bleibt die spätere Vogelperspektive erhalten, der vorangehende Blick vom Boden über das Auto entfällt. Am Ende fehlen 37 Originalframes beziehungsweise 1,48 Sekunden. Der Film bleibt bewegt, ohne Standbild, künstliches Padding oder Beschleunigung.

Der Vergleich zur vorherigen Runde ist eine redaktionelle Änderung: mehr Motive anstelle von zwei sehr langen Originalpassagen. Die automatische Größenwahl und das Resize-Verhalten bleiben unverändert.

## Ausgaben und Nachweise

Dateien `cut17b-…-v5.mp4`, Edit `motif-diversity-16_76-v5`. Desktop-Exporte 1918, 1600, 1440, 1280 und 960 Pixel; mobil 640 Pixel. Alle Größen haben H.264 und AV1, zusätzlich eine hochwertige H.264-Schnittreferenz. Der normale Hero verwendet Desktop 960/1280/1440 und mobil 640. AV1 bleibt an die positive Decoder- und Effizienzauskunft gebunden, sonst H.264.

`encode.py` erzeugt sämtliche Dateien und die Metadaten. `source-lineage.json` vergleicht alle decodierten Frames des verlustfreien Schnittmasters mit den ausgewählten Originalframes. `end-motion.json` bindet die 28 unterschiedlichen Schlussframes der acht automatisch verwendeten Dateien an ihre SHA-256. Die schnellen Node-Guards prüfen Motivintervalle, Größenpaare, Vergleichskonsistenz, echte Datei-Hashes und Antwortlängen.

Die aktuelle große Vergleichsansicht zeigt ausschließlich den neuen Schnitt. Historische Dateien und Prüfseiten bleiben erhalten. Ein Kontaktbogen der Originalquelle, der Schnittgrenzen und des neuen Exports wird im Geschäftshub aufbewahrt. Keine Browser-Testserie oder Aufnahme für diese Medienänderung.

## Dateigrößen

| Fassung | Byte |
|---|---:|
| cut17b-reference | 15,180,209 |
| cut17b-h264-1918 | 4,506,768 |
| cut17b-av1-1918 | 2,528,480 |
| cut17b-h264-1600 | 3,513,062 |
| cut17b-av1-1600 | 2,267,620 |
| cut17b-h264-1440 | 2,968,884 |
| cut17b-av1-1440 | 1,950,832 |
| cut17b-h264-1280 | 2,208,979 |
| cut17b-av1-1280 | 1,673,687 |
| cut17b-h264-960 | 1,467,930 |
| cut17b-av1-960 | 1,161,942 |
| cut17b-mobile-h264-640 | 904,189 |
| cut17b-mobile-av1-640 | 771,727 |

38 fokussierte Node-Checks und neun Render-/Bildprüfungen bestanden. Astro check: 255 Dateien, keine Fehler oder Warnungen. Astro-Build erfolgreich. Kein neuer Lighthouse-Score erhoben.
