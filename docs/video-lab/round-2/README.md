# Runde 2 — 03.11.2026

Auftrag: längerer FlyingStars-Abschluss, QR/Scan Me behalten, 15s auf Desktop und Mobil, Mobil 640px, große Qualitätsprüfung, AV1 mit H.264-Rückfall und kleinere Inter-Datei.

## Schnitt und Dateien

Quelle ist `public/media/video-lab/original-v1.mp4`, SHA-256 `3ac827bd54aa2febfe1d422f230ff2d5463b871772e3da48da704a3a3339214d`. Frames bei 25fps, Ende exklusiv:

| Motiv | Quellframes | Dauer |
|---|---|---|
| QR/Scan Me, Übergang Sea You | 90–170 | 3,20s |
| Fisch | 250–290 | 1,60s |
| Puma | 295–327 | 1,28s |
| Performance | 365–395 | 1,20s |
| NFL | 407–445 | 1,52s |
| Runway | 450–480 | 1,20s |
| FlyingStars | 550–647 + 28 Holdframes | 5,00s |

375 Ausgabeframes; alle elf finalen MP4-Dateien sind laut ffprobe 15,000s lang und ohne Audio. Der letzte Frame wird 1,12s gehalten; es handelt sich um harte Schnitte und einen Loop, keinen nahtlosen Übergang. Ein extrahiertes Raster aus zwölf Zeitpositionen wurde angesehen: QR/Scan Me und längerer vollständiger Logoabschluss sind vorhanden.

| Fassung | H.264 Byte | AV1 Byte |
|---|---:|---:|
| 1918 × 1080 | 3.281.889 | 1.823.492 |
| 1600 × 900 | 2.545.893 | 1.601.268 |
| 1440 × 810 | 2.159.133 | 1.401.949 |
| 1280 × 720 | 1.605.075 | 1.201.902 |
| Mobil 640 × 360 | 662.875 | 551.387 |

Die separate 1918px-Referenz hat 11.871.940 Byte, H.264 CRF12. Das ist eine absichtlich große, hochwertige Vergleichsfassung desselben Schnitts. Sie wird im normalen Hero nicht verwendet. AV1 und H.264 haben bewusst eigene CRF-Einstellungen; gleiche CRF-Zahlen wären kein Qualitätsgleichheitsnachweis. Quellmaterial war bereits verlustbehaftet.

`encode.py` kann aus dem Repository heraus erneut ausgeführt werden und braucht FFmpeg mit libx264, libsvtav1 und ffprobe. Es erzeugt einen temporären FFV1-Schnittmaster, dann die elf Dateien sowie Metadaten und Header. `encodes.json` hält die tatsächlich ausgeführten Befehle, Parameter und Probes fest. Softwareversionen können Encodierung und Hashes ändern; bestehende versionierte Dateien dann nicht still ersetzen.

## Auswahl und Darstellung

Desktop verwendet vorläufig volle 1918px, bis die große Ansicht die Auflösungsentscheidung erlaubt. Mobil nutzt 640px Breite. AV1 wird auf beiden Layouts nur bei positiver Unterstützung, flüssiger und energieeffizienter Wiedergabe gewählt. Fehlende API, Timeout nach 250ms, Ablehnung oder Fehler führen zu H.264; tatsächlicher AV1-Medienfehler löst einmal H.264 aus. Kein UA-/M1-/iPhone-Modellkatalog. Die positive Browserauskunft ist keine Hardware- oder Strommessung.

Die Auswahl erfolgt vor der Quellzuweisung. Das bestehende Sichtbarkeits-, Save-Data-, Reduced-Motion- und globale Pausenverhalten bleibt im gemeinsamen VideoController. Ein späteres Resize lädt nicht automatisch eine zweite Datei.

Die große Ansicht belegt die volle Browserhöhe. 1–4/Pfeile wechseln dieselbe Zeitposition; alternativ zwei Filme mit je halber Fensterbreite. „Ganzes Bild“ vermeidet den Hero-Beschnitt. Vier bewusst vorgeladene Vergleichsdateien ermöglichen schnelle Wechsel; diese zusätzliche Reviewlast ist kein Besucherpayload. Die reguläre Heroansicht lädt nur die ausgewählte Datei.

## Inter

Variable Achse 400–700, nicht 500–700: Fließtext braucht 400. Datei 48.432 → 36.220 Byte, Ersparnis 12.212 Byte (25,2%). FontTools-Prüfung bestätigt gleiche cmap, Glyphenreihenfolge, GSUB- und GPOS-Features einschließlich Kerning. Original bleibt unveränderte Quelle im Repository.

## Verifikation

19 gezielte Node-Tests erfolgreich; Astrocheck 0 Fehler/0 Warnungen (237 Hinweise), Build 105 Seiten erfolgreich. Hash-/Längenwächter erfassen alle 27 Dateien. Keine breite Browser-/Regressionssuite und keine Aufnahme.

Gezielte Bedienung im nativen T3-Browser: H.264 aktiv auf 1440×900 Fläche, Tastenwechsel auf 1440px, zwei laufende Filme mit je 720×900, Pause beider Filme, AV11440 tatsächliche Wiedergabe und Element-Vollbild. Regulärer Desktophero forderte ausschließlich die neue 1918px-H.264-Datei an.

Grenzen: T3-Bildabfrage wieder `Preview automation snapshot timed out after 15000ms`; kein neues Screenshoturteil. Die Resize-API meldete zwar 390×844 als Einstellung, die Seite behielt tatsächlich 1440×900. Daher kein behaupteter mobiler Lauf in Runde 2. Mobilpaar und 640px-Vertrag sind mit Node geprüft; Safari/iOS/Android und echte ältere Geräte müssen visuell abgenommen werden. Bestehende native Browserdiagnose in der Lab-Galerie ist für Marcs Gerät verfügbar. Kein neuer Lighthouse-/Carbonwert behauptet.
