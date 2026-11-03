# Runde 4: ruhigeres Pacing und adaptive Desktopgrößen

Marcs Feedback vom 03.11.2026: den ursprünglichen Gang durch die Drohnen am Boden und den aufsteigenden Cube erhalten; die Schlusssequenz mit Drohnenfläche, Zoom-/Blurübergängen, Ford und FlyingStars vollständig erhalten; Sea You und hektische Zwischenschnitte entfernen. Etwas mehr Laufzeit ist ausdrücklich akzeptiert.

## Schnitt

Zwei durchgehende Originalpassagen bei 25fps, Quellframes Ende exklusiv:

| Passage | Quellframes | Originalzeit | Ausgabelänge |
|---|---|---|---|
| Boden, Cube, QR/Scan Me | 0–158 | 0,00–6,32s | 6,32s |
| NFL, Drohnenfläche, Ford, FlyingStars | 387–647 | 15,48–25,88s | 10,40s |

Ergebnis: 418 Frames, 16,72s, rund2,84s länger als die vorherige13,88s-Fassung. Statt sieben neu zusammengesetzten Blöcken gibt es zwei und damit einen zusätzlichen Schnitt. Die Schnitte und Übergänge innerhalb dieser Passagen stammen unverändert aus dem Original. Sea You beginnt erst bei Quellframe158 und ist ausgeschlossen. Die kurzen Fisch-/Puma-/Performance-Zwischenmotive entfallen; NFL bleibt als Teil des vollständigen Schlussblocks erhalten. Kein Speed-up, kein künstlicher Freeze.

`source-lineage.json` verifiziert die tatsächlich decodierten Frames des lossless FFV1-Schnittmasters gegen die Originalquelle: sämtliche418Frames stimmen positionsgenau mit diesen zwei Passagen überein. `end-motion.json` bestätigt28verschiedene Schlussframes in allen acht automatisch verwendeten Codec-/Größenfassungen. Die Tests binden die Nachweise an echte Dateihashes. Ein Raster aus12Zeitpositionen wurde angesehen.

## Encodes

Versionierte Dateinamen `cut17-…-v4.mp4`, Edit `ground-ford-paced-16_72-v4`. Alle13neuen Dateien sind16,72s lang, ohne Audio und mit MP4-Faststart. Original und historische Fassungen bleiben erhalten.

| Fassung | Breite | Byte |
|---|---:|---:|
| 16,72 s · Referenz. volle Auflösung | 1918 | 16.171.180 |
| 16,72 s · H.264 · 1918 px | 1918 | 4.605.443 |
| 16,72 s · AV1 · 1918 px | 1918 | 2.568.300 |
| 16,72 s · H.264 · 1600 px | 1600 | 3.633.075 |
| 16,72 s · AV1 · 1600 px | 1600 | 2.291.556 |
| 16,72 s · H.264 · 1440 px | 1440 | 3.074.613 |
| 16,72 s · AV1 · 1440 px | 1440 | 1.983.772 |
| 16,72 s · H.264 · 1280 px | 1280 | 2.284.309 |
| 16,72 s · AV1 · 1280 px | 1280 | 1.699.035 |
| 16,72 s · H.264 · 960 px | 960 | 1.538.609 |
| 16,72 s · AV1 · 960 px | 960 | 1.177.893 |
| 16,72 s · Mobil H.264 · 640 px | 640 | 952.971 |
| 16,72 s · Mobil AV1 · 640 px | 640 | 787.858 |

Der große Vergleich zeigt denselben neuen Schnitt in Referenz-/1600-/1440-/1280-Fassungen. 960px und mobile640px sind zusätzlich einzeln prüfbar und werden von der Automatik verwendet. Die vier automatisch nutzbaren Größen haben jeweils AV1 und H.264.

## Adaptive Auswahl

Die Auswahl nutzt die echte Videobox und `object-fit: cover` einschließlich weggeschnittener Bildbereiche. Kein pauschaler DPR-Multiplikator. Desktopstufen960/1280/1440, Mobil640. Bis10%Hochskalierung beim initialen Entscheid vermeiden einen kompletten Zusatzdownload für wenige Pixel. Bei der bestehenden Mindesthöhe640CSS-Pixel braucht das Coverbild bereits rund1138Quellpixel; hier wird1280 und nicht960 gewählt. Eine schmalere Fensterbreite allein garantiert daher keine kleinere Datei.

Vor dem ersten tatsächlichen Medienrequest wird die dann aktuelle Größe benutzt. Nach begonnenem Laden gibt es keinen Downsize-Download. Ein deutliches Vergrößern kann nach1000msStabilität höchstens ein Upgrade direkt auf1440 auslösen. Dafür muss die bisherige Fassung mehr als25% hochskaliert werden und der Sprung mindestens25%Quellbreite bringen. Ein1280→1440-Sprung lohnt nach dieser Regel keinen zweiten Download. Position, manueller Wiedergabewunsch und MotionPolicy bleiben erhalten. Während Pause/Unsichtbarkeit/reducedMotion/SaveData wird kein zusätzlicher Resize-Request ausgelöst.

AV1 benötigt je Größenstufe `supported && smooth && powerEfficient`, mit250msDeadline. Sonst H.264. Ein tatsächlicher AV1-Medienfehler wechselt über denselben Controller auf den H.264-Partner gleicher Größe. Maximal ein Größenupgrade ist zusätzlich zu einem möglichen Codecfehler-Fallback gemeint; beim Fehler können also weitere Transferbytes entstehen.

## Prüfgrenzen

Gezielte Node-Tests und deterministische Medienprüfungen; keine breite Browsersuite und keine Aufnahme. Echte Safari-/iOS-/Android-Decodierung ist keine aus Unit-Tests ableitbare Garantie. [CSS-/Importketten-/Bildmaßänderungen und Messgrenzen](performance.md) sind separat dokumentiert. 66 fokussierte Tests und neun Render-/Bild-/Dotimageprüfungen bestehen. Finale Veröffentlichungsnachweise werden im Geschäftshub ergänzt.
