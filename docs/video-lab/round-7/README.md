# Runde 7: kein Cube, Schluss auf dem dynamischen Logo

Marcs letzte Schnittkorrektur betrifft zwei genaue Grenzen: Die kurze rote Cube-Passage vor dem QR-Zoom entfällt vollständig. Am Ende bleibt das dynamische FlyingStars-Logo unmittelbar nach dem Ford-Zoom; die anschließende weiter entfernte, blinkende Logo-Einstellung entfällt.

Einzelbilder der Quelle belegen die Grenzen. Frame 93 zeigt noch die Cube-Formation, Frame 94 bereits den eingehenden Scan-Me-Zoom. Frame 563 zeigt das dynamische FlyingStars-Logo mit lesbarem Schriftzug, Frame 564 wechselt in die spätere Einstellung. Daher beginnt die QR-Passage bei 94 und endet die Schlusssequenz exklusiv bei 564.

| Passage | Quellframes, Ende exklusiv | Dauer |
|---|---|---|
| Kurzer Bodenflug | 0–41 | 1,64 s |
| QR-Zoom ohne Cube und Scan Me | 94–158 | 2,56 s |
| Kolibri, Puma, Riders und NFL-Catch | 240–387 | 5,88 s |
| Eine NFL-Logo-Einstellung | 408–434 | 1,04 s |
| Spätere Ford-Perspektive bis dynamisches FlyingStars-Logo | 463–564 | 4,04 s |

Ergebnis: **379 Frames bei 25 fps, 15,16 Sekunden**. Gegenüber Runde 6 entfallen zwölf Cube-Frames und 46 Frames der späteren Logo-Einstellung, insgesamt 2,32 Sekunden. Alle anderen Quellintervalle bleiben gleich. Kein künstlicher Übergang, keine Beschleunigung oder angehängtes Standbild. Der eingehende Originalzoom zum QR-Code bleibt erhalten; der zuvor übernommene sichtbare Auslauf der Cube-Formation ist ausdrücklich entfernt.

Alle 13 Größen-/Codec-/Referenzdateien heißen `cut15d-…-v7.mp4`, Edit `dynamic-ending-no-cube-15_16-v7`. Desktop-Auswahl 960/1280/1440, mobil 640, AV1 nur nach positiver Decoder-/Effizienzauskunft, sonst H.264. Auswahl, Resize, Consent und Tracking bleiben unverändert.

`encode.py` erzeugt die Dateien und Metadaten. `source-lineage.json` vergleicht sämtliche 379 decodierten Masterframes gegen die ausgewählten Originalframes. Der eingehende QR-Zoom 94–118 muss kontinuierlich Ausgabe 41–65 entsprechen. Eine eigene Prüfung schließt alle Cube-Frames 41–94 und alle späteren Logo-Frames ab 564 aus. `end-motion.json` prüft die tatsächlichen letzten 28 decodierten Frames aller acht automatisch genutzten Dateien und bindet sie an die Dateihashes. Unterschiedliche Schlussframes allein unterscheiden nicht zwischen den beiden Logo-Einstellungen. Deshalb sichert jetzt zusätzlich die am Original geprüfte Quellgrenze 564 die gewünschte Einstellung ab.

Kontaktbögen der Originalgrenzen und des Exports liegen im Geschäftshub. Schnelle Node-Guards, Typprüfung und Build; keine Browser-Testserie, Aufnahme oder neue Lighthouse-Messung für diese Medienkorrektur. Die vorherigen Fassungen bleiben historisch erhalten.

## Dateigrößen

| Fassung | Byte |
|---|---:|
| cut15d-reference | 14022425 |
| cut15d-h264-1918 | 4279572 |
| cut15d-av1-1918 | 2381214 |
| cut15d-h264-1600 | 3340660 |
| cut15d-av1-1600 | 2125272 |
| cut15d-h264-1440 | 2821266 |
| cut15d-av1-1440 | 1834874 |
| cut15d-h264-1280 | 2100143 |
| cut15d-av1-1280 | 1577926 |
| cut15d-h264-960 | 1393873 |
| cut15d-av1-960 | 1095055 |
| cut15d-mobile-h264-640 | 853965 |
| cut15d-mobile-av1-640 | 728868 |

40 fokussierte Node-Checks und neun Render-/Bildprüfungen bestanden. Astro check: 255 Dateien, keine Fehler oder Warnungen. Astro-Build erfolgreich. Die vollständige CI wird nicht als geprüft oder grün behauptet.
