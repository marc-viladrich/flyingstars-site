# Video-Diät

Stand: 2. November 2026. Ausgangspunkt `f8c2bad`, Branch `codex/video-diaet`.

Alle sechs registrierten Originale enthalten genau eine H.264-Videospur und **keine Audiospur**. Audio zu entfernen spart hier 0 Byte. Die Änderung trennt deshalb große Hero-Videos und kleine Vorschauen. Die vier Referenzvorschauen benötigen zusammen 2,80 MB statt 5,47 MB, eine Ersparnis von 48,82 %.

## Inventar der Originale

Alle Quellen wurden aus `src/lib/videos.ts` nach `/tmp/fs-videos/<key>.mp4` heruntergeladen und mit `ffprobe -show_format -show_streams -of json` geprüft. MB und kbit/s sind dezimal. Bitrate ist die mittlere Container-Bitrate, nicht die maximale momentane Bitrate. Die JSON-Ausgaben liegen unter `/tmp/fs-videos/<key>.json`.

| Schlüssel | Container / Codec | Auflösung | fps im Mittel | Dauer | Datei in Byte | Dateigröße | Bitrate | Audio | Audio-Bitrate / Größenanteil |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| `showreel` | MP4 / H.264 | 1918 × 1080 | 25 | 25,88 s | 6.514.429 | 6,51 MB | 2013,7 kbit/s | nein | 0 kbit/s / 0 Byte / 0 % |
| `bokkenrijders` | MP4 / H.264 | 1280 × 720 | 25 | 8,44 s | 1.105.755 | 1,11 MB | 1048,1 kbit/s | nein | 0 kbit/s / 0 Byte / 0 % |
| `nfl` | MP4 / H.264 | 1280 × 720 | 25 | 6,88 s | 804.593 | 0,80 MB | 935,6 kbit/s | nein | 0 kbit/s / 0 Byte / 0 % |
| `ford` | MP4 / H.264 | 1280 × 720 | 25 | 10,36 s | 2.144.131 | 2,14 MB | 1655,7 kbit/s | nein | 0 kbit/s / 0 Byte / 0 % |
| `puma` | MP4 / H.264 | 1280 × 720 | 25 | 7,80 s | 1.412.013 | 1,41 MB | 1448,2 kbit/s | nein | 0 kbit/s / 0 Byte / 0 % |
| `siemensIndoor` | MP4 / H.264 | 1726 × 1080 | 24,831 | 77,04 s | 6.563.549 | 6,56 MB | 681,6 kbit/s | nein | 0 kbit/s / 0 Byte / 0 % |

Siemens ist variabel getaktet. `r_frame_rate` meldet 150/1 als Zeitraster, `avg_frame_rate` dagegen 47825/1926 = 24,831 fps über 1913 Frames und 77,04 s. Es ist kein echtes 150-fps-Video. Alle anderen Quellen sind 25/1 fps. Die Video-Bitraten ohne Container sind 2011,1 / 1044,9 / 932,2 / 1652,7 / 1444,8 / 679,1 kbit/s in Tabellenreihenfolge.

Die festen Quellen bleiben unverändert:

- `showreel`: https://flyingstars.art/wp-content/uploads/2026/05/Flyingstars-Showreel.mp4
- `bokkenrijders`: https://flyingstars-relaunch.vercel.app/media/projekte/bokkenrijders.mp4
- `nfl`: https://flyingstars-relaunch.vercel.app/media/projekte/nfl.mp4
- `ford`: https://flyingstars-relaunch.vercel.app/media/projekte/ford.mp4
- `puma`: https://flyingstars-relaunch.vercel.app/media/projekte/puma.mp4
- `siemensIndoor`: https://flyingstars.art/wp-content/uploads/2025/04/Siemens-Overview.mp4

## Sämtliche Abspielstellen und Entscheidung

| Stelle | Verhalten und Ton | Verwendete Variante |
|---|---|---|
| `FlightHero.astro` und `hero-reel.ts` auf DE/EN/NL-Home | Stumm, Desktop ab 701 px, Hintergrundloop. Kein Download bei reduzierter Bewegung, globaler Pause oder Save-Data. | Originales Showreel, 1918 × 1080, 25,88 s, über `/api/media?asset=showreel`. |
| `CaseStudy.astro` und dasselbe Reel-Skript | Vier große Case-Heroes, stumm; dieselben Startbedingungen. | Die vorhandenen vier stummen 1280 × 720-Loops bleiben über den festen Proxy. Kein Hochskalieren auf 1920. |
| `ProjectCard.astro`, verwendet von `ProjectGrid.astro` und `References.astro` | Vier Referenzkarten auf Home und Referenzen in allen Sprachen. Erste Home-Karte startet im Bild, andere bei Hover oder Fokus, auf Touch im Bild. Außerhalb des Bildes und bei globaler Pause/reduzierter Bewegung pausiert. | Jeweils lokale 960-Pixel-Vorschau, ohne Audio. Quelle wird erst beim ersten Abspielen gesetzt, `preload="none"`. |
| `LandingHero.astro` auf Hochzeit / Werbung / Indoor in DE/EN/NL | Kleiner Rahmen, Desktop automatisch im Bild, mobil erst nach Klick; bestehende Pause-, Bewegungs- und Save-Data-Regeln bleiben. | Kleine lokale Showreel-, Ford- und Siemens-Vorschauen. |
| `Video.astro` | Generischer Player mit Controls, einschließlich möglichem Modal. Er setzt kein `muted` und könnte Ton abspielen. **Keine Komponente importiert oder verwendet ihn derzeit.** Der Home-Overlay wurde vor diesem Auftrag entfernt. | Default `videoPath(src)` liefert weiterhin das Original. Keines dieser Originale hat Audio. Keine künstliche Audio-Version hinzugefügt. |

Suche über `src/` nach `<video`, `<Video`, `Video.astro`, `.mp4`, `.webm`, `iframe`, `.play(` und `videoPath`: keine weiteren Video-Player oder eingebetteten Videoanbieter. Die ähnlich benannten `data-reel`-Attribute des Konfigurators betreffen Canvas-Animationen, keine Videodateien.

### Warum große Heroes unverändert bleiben

Die 64 % Breite gelten ab 901 px. Der Hero bleibt annähernd fensterhoch, das Video nutzt `object-fit: cover`. Bei einem 1440 × 900-Fenster ist die Video-Box etwa 922 × 900 Pixel groß. Ein 16:9-Video muss für diese Höhe rund 1600 Pixel breit gerendert werden und wird seitlich beschnitten. 1280 Pixel Quellbreite reichen deshalb selbst bei DPR 1 nicht für eine native Darstellung. 1918 × 1080 ist für normale Desktop-Fenster angemessen. 4K wird nicht benötigt; sehr große und Retina-Fenster skalieren weiterhin hoch.

Geprüfte Showreel-Kandidaten über die volle Laufzeit:

| Kandidat | Dateigröße | Ersparnis gegenüber Original | Entscheidung |
|---|---:|---:|---|
| Original 1918 × 1080 | 6.514.429 Byte | 0 % | Behalten. Bereits ohne Audio. |
| 1280, CRF 23, AQ 3 | 6.145.212 Byte | 5,7 % | Detailverlust beim Skalieren lohnt die geringe Ersparnis nicht. |
| 1280, CRF 25, Standard-AQ | 4.227.727 Byte | 35,1 % | Sichtbar weichere Lichtpunkte im vergrößerten Hero-Ausschnitt. |
| 1918, CRF 25, AQ 3 | 8.000.393 Byte | −22,8 % | Größer als das Original. |
| 1918, CRF 27, Standard-AQ | 6.314.568 Byte | 3,1 % | Erneuter Qualitätsverlust für nur 0,20 MB weniger. |

Bei den vier Case-Videos erzeugte 1280/CRF 23/AQ 3 ebenfalls größere Dateien als die vorhandenen Originale. Deren 720p-Auflösung bleibt die verfügbare Obergrenze; ein größeres Encoding würde keine zusätzlichen Details schaffen.

## Ausgelieferte Vorschauen

H.264 (`avc1`), `yuv420p`, 25 fps, Lanczos-Skalierung, x264 `slow`, CRF 27 mit Standard-AQ, keine Audio-/Untertitel-/Datenspuren, entfernte Metadaten, MP4 mit `moov` vor `mdat` für Faststart. Kein zusätzlicher WebM-Encode: eine H.264-Datei je Clip hält Download, Repo und Browser-Fallback einfach. Chromium und WebKit werden mit diesen tatsächlichen MP4s geprüft.

| Clip | Ausschnitt im Original | Auflösung | Dauer der Vorschau | Vorher in Byte | Nachher in Byte | Nachher | Ersparnis |
|---|---|---:|---:|---:|---:|---:|---:|
| `showreel` | 10–22 s | 960 × 540 | 12,00 s | 6.514.429 | 1.176.210 | 1,18 MB | 81,94 % |
| `bokkenrijders` | vollständiger Kurzloop | 960 × 540 | 8,40 s | 1.105.755 | 572.610 | 0,57 MB | 48,22 % |
| `nfl` | vollständiger Kurzloop | 960 × 540 | 6,84 s | 804.593 | 415.848 | 0,42 MB | 48,32 % |
| `ford` | vollständiger Kurzloop | 960 × 540 | 10,32 s | 2.144.131 | 1.189.979 | 1,19 MB | 44,50 % |
| `puma` | vollständiger Kurzloop | 960 × 540 | 7,76 s | 1.412.013 | 619.505 | 0,62 MB | 56,13 % |
| `siemensIndoor` | 8–18 s | 960 × 600 | 9,96 s | 6.563.549 | 214.043 | 0,21 MB | 96,74 % |

Die Case-Loops sind bereits nur 7–10 Sekunden lang und bleiben inhaltlich vollständig. Der FPS-Filter lässt am Dateiende bis zu ein Frame weg. Showreel und Siemens sind auf 12 beziehungsweise knapp 10 Sekunden gekürzt. Das Showreel zeigt mehrere Motive einschließlich Herz und Ford, Siemens die Indoor-Drohnen um die Präsentationsfläche. Die Wiederholung springt wie bei den Original-Loops zurück zum Anfang; keine Überblendung, die Lichtpunkte verschmieren könnte.

### Transfer pro Seitenbesuch

Die Zahlen vergleichen **vollständig geladene Videodateien bei kaltem Cache**, ohne Bilder, HTML, Fonts oder Request-Header. Sie sind ein reproduzierbares Dateibudget, keine Behauptung über identische Netzwerkbytes bei jedem Besuch. Vorzeitiges Verlassen, Range-Requests, Cache und Sichtbarkeit verändern den tatsächlichen Transfer. Ein Loop lädt normalerweise dieselbe URL wieder aus dem Cache und bedeutet nicht pro Wiederholung einen vollständigen neuen Download.

| Szenario | Vorher | Nachher | Ersparnis |
|---|---:|---:|---:|
| Home, erster Desktop-Viewport, nur Hero | 6,51 MB | 6,51 MB | 0 % |
| Home, erste Referenzkarte kommt automatisch ins Bild, zusätzlich zum Hero | +1,11 MB | +0,57 MB | 48,22 % für diese Karte |
| Home, anschließend alle drei übrigen Karten per Hover/Fokus | +4,36 MB | +2,23 MB | 48,97 % für diese drei Karten |
| Alle vier Referenzvorschauen zusammen | 5,47 MB | 2,80 MB | 48,82 % |
| Home inklusive Hero und allen vier vollständig geladenen Vorschauen | 11,98 MB | 9,31 MB | 22,27 % |
| Case Bokkenrijders, großer Hero | 1,11 MB | 1,11 MB | 0 % |
| Case NFL, großer Hero | 0,80 MB | 0,80 MB | 0 % |
| Case Ford, großer Hero | 2,14 MB | 2,14 MB | 0 % |
| Case PUMA, großer Hero | 1,41 MB | 1,41 MB | 0 % |
| Landing Hochzeit, kleiner Rahmen | 6,51 MB | 1,18 MB | 81,94 % |
| Landing Werbung, kleiner Rahmen | 2,14 MB | 1,19 MB | 44,50 % |
| Landing Indoor, kleiner Rahmen | 6,56 MB | 0,21 MB | 96,74 % |

Mobil lädt der große Home-/Case-Hero weiterhin kein Video. Referenzkarten starten auf Touch bei Sichtbarkeit, Landing-Videos nach Klick. Ein Besuch nur im ersten mobilen Home-Viewport hat daher 0 Video-Bytes vor und nach dieser Änderung.

## Bildqualität

Angesehene Original-Kontaktbögen: alle sechs Clips mit acht Zeitpunkten. Danach direkte Original/640/960-Vergleiche sowie für alle sechs finalen Vorschauen jeweils vier über den Clip verteilte Frames gegen das Original. Bei den Nachtaufnahmen wurde auf getrennte Lichtpunkte, Hufeisen/Schrift bei NFL, Bokkenrijders-Schädel, PUMA-Schrift und das Ford-Logo geachtet. Die 960-Pixel-Fassung erhält Punktabstände und Konturen besser als 640, besonders bei den sehr kleinen PUMA-Lichtern. Sie ist für die kleinen Rahmen gewählt, nicht für einen großen Hero oder ein Vollbildvideo. Die Stadt-/Publikumsflächen sind stärker komprimiert, und im Himmel bleibt vorhandenes Banding sichtbar. Bewegungsunschärfe einzelner Showreel-Durchflüge ist schon im Original vorhanden.

Die hochauflösenden Hero-Ausschnitte wurden zusätzlich bei 1080 Pixeln Renderhöhe verglichen. Beim 1280er-Kandidaten verbreitern sich eng stehende Lichter sichtbar. Deshalb keine pauschale Herunterskalierung aller Videos.

Nachweise außerhalb von Git:

- `/tmp/fs-videos/quality/<key>-overview.jpg`: acht Original-Frames.
- `/tmp/fs-videos/quality/<key>-compare.png`: Original, 640/CRF 25/AQ 3 und 960/CRF 27 untereinander, auf gemeinsame 960 Pixel Breite gebracht.
- `/tmp/fs-videos/quality/<key>-sequence.png`: Original oben, finale Vorschau unten, vier Zeitpunkte je Clip.
- `/tmp/fs-videos/quality/hero-compare.png`: nativer Ausschnitt, 1280-Encode hochskaliert, 1918-Reencode.
- `/tmp/fs-videos/playback/`: Browser-Screenshots und gemessene Wiedergabedaten. Keine Bildschirmaufnahme erstellt oder behauptet.

## Hosting und feste Quellen

Sechs versionierte Vorschau-MP4s liegen unter `public/media/video/`, zusammen 4.188.195 Byte. Jede Datei ist kleiner als 1,2 MB. Nur diese kleinen Auslieferungsdateien kommen in Git, weder Originale noch Encoding-Kandidaten oder QA-Bilder. Bei neuen Encodes den Dateinamen versionieren und die Registry aktualisieren, damit Browser-Caches nicht eine alte Datei unter derselben URL behalten.

Cloudflare Pages liefert sie direkt als statische Assets auf derselben Origin aus. Sie liegen deutlich unter dem [Pages-Limit von 25 MiB je Datei](https://developers.cloudflare.com/pages/platform/limits/). Pages dokumentiert derzeit [200-Antworten auch auf Range-Requests für statische Assets](https://developers.cloudflare.com/pages/configuration/serving-pages/). Deshalb bleiben die Dateien klein und haben Faststart; es wird kein 206-Verhalten der statischen Vorschauen vorausgesetzt. `public/_headers` setzt je versionierter Datei ihre exakte `Content-Length` sowie `Cache-Control: public, max-age=31536000, immutable, no-transform`. Der Node-Test vergleicht die Länge mit den tatsächlichen MP4-Bytes. Neue Encodes brauchen einen neuen Dateinamen und eine aktualisierte Header-Regel. Der vorhandene Proxy für große Originale leitet Range-Requests weiterhin durch.

Die Originale bleiben bei FlyingStars/WordPress beziehungsweise auf der bestehenden Vercel-Referenz und werden in Produktion über `/api/media?asset=<registrierter Schlüssel>` geliefert. Die Function akzeptiert weiterhin ausschließlich feste Schlüssel, keine vom Client gelieferten URLs, und folgt keinen Redirects. Die Preview-Auswahl erfolgt zentral über `videoPath(src, 'preview')`; ungültige Quellen scheitern auch hier. Der frühere erfundene `.webm`-Alias auf eine MP4-Quelle wurde entfernt.

Das ist eine pragmatische Prototyp-Lösung, **kein EU-Hosting-Nachweis**. Cloudflare und Vercel passen nicht zum langfristigen Ziel einer ausschließlich europäischen Medienauslieferung. In `notes/agentic-website-editing/00-design-space.md`, Abschnitte 13–15 des Hub-Repos, ist Scaleway Object Storage mit eigener Mediendomain als Ziel genannt. Es wird hier nicht eingerichtet. Später können dieselben Encode-Dateien dorthin wandern; Registry und feste Proxy-Ziele bleiben der Austauschpunkt. Größere neue Videos gehören ebenfalls in diesen externen Speicher, nicht in Git. Ohne Zugang oder Upload-Freigabe werden keine unzugänglichen neuen externen URLs eingebaut.

## Reproduzieren

Werkzeuge in diesem Lauf: FFmpeg/ffprobe 7.1, libx264, Node 22.22.1. Zum Herunterladen und Inventarisieren ohne Umgebungsdateien:

```sh
mkdir -p /tmp/fs-videos
python3 - <<'PYTHON'
from pathlib import Path
import re, subprocess
for key, url in re.findall(r"^  (\w+): '(https:[^']+)'", Path('src/lib/videos.ts').read_text(), re.M):
    path = f'/tmp/fs-videos/{key}.mp4'
    subprocess.run(['curl', '--fail', '--location', '--retry', '2', url, '-o', path], check=True)
    result = subprocess.check_output(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', path])
    Path(f'/tmp/fs-videos/{key}.json').write_bytes(result)
PYTHON
```

Finale Encodes, aus dem Repository-Verzeichnis. Quellen müssen den unten festgehaltenen Hashes entsprechen. Der erneute Download einer später geänderten URL kann andere Ergebnisse liefern.

```sh
python3 - <<'PYTHON'
from pathlib import Path
import re, subprocess
Path('public/media/video').mkdir(parents=True, exist_ok=True)
for key in re.findall(r"^  (\w+): 'https:", Path('src/lib/videos.ts').read_text(), re.M):
    start, duration = (10, 12) if key == 'showreel' else ((8, 10) if key == 'siemensIndoor' else (0, None))
    cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-ss', str(start), '-i', f'/tmp/fs-videos/{key}.mp4']
    if duration: cmd += ['-t', str(duration)]
    cmd += ['-map', '0:v:0', '-an', '-sn', '-dn', '-map_metadata', '-1',
            '-vf', 'scale=960:-2:flags=lanczos,fps=25', '-c:v', 'libx264',
            '-preset', 'slow', '-crf', '27', '-threads', '2', '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart', '-y', f'public/media/video/{key}-preview-v1.mp4']
    subprocess.run(cmd, check=True)
PYTHON
```

Nach dem Encoding die sechs Regeln in `public/_headers` aus den tatsächlichen Dateigrößen aktualisieren und den Guard ausführen:

```sh
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
node --test src/scripts/videos.test.mjs
```

### Herkunft und Hashes

SHA-256 für die geprüften Downloads und ausgelieferten Vorschauen:

| Schlüssel | Original | Vorschau |
|---|---|---|
| `showreel` | `3ac827bd54aa2febfe1d422f230ff2d5463b871772e3da48da704a3a3339214d` | `0c5f36a1a742336eaefb7e7f96325aeeeb6bb812a84ef295116ceff9433554d3` |
| `bokkenrijders` | `07108c3c737d185d621c758db176eed234c53526eabdd28794e32c5f2c61a532` | `4b5ff012c6abe19ba4bf6d4e7b89c038d000123418b335129e2ab3864591023d` |
| `nfl` | `b91ff00baeac0f5c247ab086dac8d2715a00e1299e2b332ab39091d7346f4ba4` | `67080d4b6652f998f8e8b6d0773df911ede990bf8c2671ba2e28dc08b6c633b8` |
| `ford` | `f8b44c09139aa1d23e27488d04596c123998a6e38ae27da169fba548cb7285ed` | `4b4937bc1ccb6e53721de35380af1d0b4d14900f9c027c0171466093f1ae9605` |
| `puma` | `dd3de0b7892ce6e01b51f9ca6d53f2236c0b248239f5f3a9d035e694404c50e6` | `573c18418b4bfed9c2d615538cb0ac6338bf1be66dccb505be6f87146ca1c366` |
| `siemensIndoor` | `37f6bb19e91c84f3b74f41ed4e3f780ac7d46fd42b53931c7cf5a993a300179b` | `a08fd4ddac25f1cfc9a5b9d6792740c265f62c02165b069667dfbd30fef825e4` |

## Verifikation und Grenzen

Ausgeführt im eigenen Worktree mit Node 22 im PATH:

```sh
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
npm ci
npx astro check
npm run build
node --test 'scripts/*.test.mjs' 'src/scripts/effects/*.test.mjs' 'src/scripts/*.test.mjs'
npx playwright test tests/projects.spec.ts tests/reference-pass.spec.ts tests/network-allowlist.spec.ts tests/html.spec.ts --workers=2 --config=/tmp/fs-video-diaet/playwright.config.mts
```

Der temporäre Playwright-Config importiert unverändert die Repository-Konfiguration und überschreibt ausschließlich `testDir` auf den absoluten Pfad sowie Server-/Basis-URL auf Port 4420. Auf 4399 lief bereits der Preview-Prozess eines anderen Checkouts. Dieser wurde nicht beendet und nicht für die Tests wiederverwendet. `tests/`, `scripts/`, Repository-Konfiguration, Lockfile und Dependencies bleiben unverändert.

- Astro: 0 Fehler, 0 Warnungen, 229 vorhandene Hinweise.
- Build: 65 Seiten, erfolgreich. Ein zusätzlicher Sweep über sämtliche gebauten HTML-Dateien prüft die Variantenauswahl über alle Sprachen.
- Node: 95 Tests bestanden, 0 fehlgeschlagen; abschließender Lauf 118,9 Sekunden.
- Die vier angeforderten Playwright-Dateien: 298 bestanden, 2 erwartete Skip-Fälle, 2 Worker. Weitere Browser-Suites wurden nicht ausgeführt.
- Drei neue schnelle Node-Guards prüfen alle Registry-Einträge, unbekannte Quellen, tatsächliche MP4-Spuren/Codec/Faststart, Größenbudgets und die exakte Bytelänge in den Pages-Headern. Die bestehenden Proxy-Tests sichern weiterhin feste Quellen, Range-Weitergabe und abgelehnte Redirects.
- Echte lokale Pages Function mit Wrangler 4.147.0 auf 4421: `/api/media?asset=nfl` mit `Range: bytes=0-31` liefert `206`, 32 Bytes und `Content-Range: bytes 0-31/804593`.

### WebKit-Befund und Behebung

Der erste Lauf gegen Wrangler scheiterte in WebKit an statischen Vorschauen. Minimaler Gegenversuch mit derselben unveränderten MP4:

| HTTP-Auslieferung | WebKit |
|---|---|
| Astro, 206 mit Länge und Content-Range | spielt |
| Wrangler vor Header-Korrektur, 200 chunked ohne Content-Length | `NotSupportedError`, readyState 0 |
| Minimalserver, 200 mit korrekter Content-Length | spielt |
| Minimalserver, 200 chunked ohne Content-Length | `NotSupportedError`, readyState 0 |
| Wrangler mit versionsgenauer `_headers`-Regel, 200 mit Content-Length | spielt |

Der Codec war nicht die Ursache. Die statischen Vorschauen brauchen eine bekannte Antwortlänge. Die sechs festen Header-Regeln beheben dies direkt an der Auslieferung; kein zusätzlicher Video-Proxy und kein Blob-Download im Browser. Cloudflare dokumentiert [eigene Header-Regeln für statische Pages-Assets](https://developers.cloudflare.com/pages/configuration/headers/). `no-transform` verhindert laut [Cloudflare-Dokumentation](https://developers.cloudflare.com/speed/optimization/content/compression/) das Entfernen der Länge durch Inhaltskompression. Der neue Header-Guard wurde zunächst rot ausgeführt und nach der Korrektur grün.

Der T3-Browser konnte die Seite zweimal nicht auslesen: `Preview automation snapshot timed out after 15000ms.` Die gezielte Wiedergabeprüfung erfolgte deshalb mit Playwright Chromium und WebKit gegen die echte lokale Pages-Laufzeit, ohne Video-Fixture oder Request-Mocking. Die 26 Prüfungen umfassen pro Browser Home-Hero, alle vier Karten nach Scroll/Hover, alle vier Case-Heroes, drei Landing-Heroes und den mobilen Indoor-Start nach Klick. Erforderlich sind richtige Quelle, `muted`, `readyState >= 2`, echte Videodimensionen, laufender Zeitstempel über 0,25 s und tatsächlich decodierte Frames. Zusätzlich bleibt der große Hero mobil ungeladen und der Landing-Clip lädt mobil erst nach dem Klick.

Logs und reproduzierbarer lokaler Browser-Harness liegen unter `/tmp/fs-videos/` und `/tmp/fs-video-diaet/check-playback.mjs`. Für einen erneuten Lauf zuerst den gebauten Stand mit Wrangler auf 4421 starten. Keine Umgebungsdateien wurden gelesen, kein Push und kein Deployment ausgeführt.

Offen bleibt der Smoke-Test nach dem nächsten freigegebenen Cloudflare-Deployment: echte HTTPS-Antworten für alle sechs Vorschauen, korrekte Längen/Cache-Header und Safari-Wiedergabe dort prüfen. Die lokale Cloudflare-Laufzeit wurde geprüft, eine neue produktive Auslieferung wurde nicht behauptet. Scaleway-Migration und eine mögliche spätere Rückkehr eines Players mit Ton sind separate Arbeiten.
