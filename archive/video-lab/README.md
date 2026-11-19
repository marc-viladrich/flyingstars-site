# Video-Labor: Archiv der Encodes

Hier liegen alle Encodes der Hero-Video-Runden 1–9 (`files/`) und ihr Katalog (`catalog.json`: Codec, Maße, Laufzeit,
Bytes, SHA-256, Schnittfassung). Sie gehören nicht zur Website: Astro kopiert nur `public/` nach `dist/`.

Öffentlich ausgeliefert werden ausschließlich die freigegebenen Renditions aus `src/data/hero-video.json`
(Schnitt `flythrough-loop-15_00-v9`, AV1 und H.264 in 960/1280/1440 px, Handy 640 px) unter `public/media/video-lab/`.
Der URL-Pfad bleibt aus Cache-Gründen bestehen. `src/scripts/payload-guards.test.mjs` prüft, dass der öffentliche Ordner
genau diese Dateien enthält und jede Archivdatei zu ihrem Katalogeintrag passt.

Eine neue Freigabe: Datei aus `files/` nach `public/media/video-lab/` verschieben, ihren Katalogeintrag unverändert in
`hero-video.json` übernehmen, Länge und MIME in `public/_headers` eintragen.

Ein neuer Encode läuft mit `docs/video-lab/round-9/encode.py`: Quelle `files/original-v1.mp4`, Ausgabe nach `files/`,
Katalog `catalog.json`, alles hier im Archiv; er veröffentlicht nichts und schreibt `public/_headers` nicht. Die Skripte
der Runden 2–8 sind als historisch markiert (alte Pfade `src/data/video-lab.json` und `public/media/video-lab/`) und
dokumentieren nur, wie die damaligen Fassungen entstanden.
