# Video-Labor: Archiv der Encodes

Hier liegen alle Encodes der Hero-Video-Runden 1–9 (`files/`) und ihr Katalog (`catalog.json`: Codec, Maße, Laufzeit,
Bytes, SHA-256, Schnittfassung). Sie gehören nicht zur Website: Astro kopiert nur `public/` nach `dist/`.

Öffentlich ausgeliefert werden ausschließlich die freigegebenen Renditions aus `src/data/hero-video.json`
(Schnitt `flythrough-loop-15_00-v9`, AV1 und H.264 in 960/1280/1440 px, Handy 640 px) unter `public/media/video-lab/`.
Der URL-Pfad bleibt aus Cache-Gründen bestehen. `src/scripts/payload-guards.test.mjs` prüft, dass der öffentliche Ordner
genau diese Dateien enthält und jede Archivdatei zu ihrem Katalogeintrag passt.

Eine neue Freigabe: Datei aus `files/` nach `public/media/video-lab/` verschieben, ihren Katalogeintrag unverändert in
`hero-video.json` übernehmen, Länge und MIME in `public/_headers` eintragen. Die Erzeugung und Prüfung jeder Runde steht
in `docs/video-lab/` (die dortigen `encode.py` schreiben noch an den alten Ort `src/data/video-lab.json`; vor einer neuen
Runde auf `archive/video-lab/catalog.json` umstellen).
