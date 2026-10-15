# Öffentliche Auslieferung auf Hetzner

Stand: 15. Oktober 2026. Implementierung im Repository, kein Deployment und keine Änderung am Hostingkonto. Die öffentliche Astro-Ausgabe liegt im Apache-Webroot. Der Editor läuft als eigene Node-App auf einer separaten Subdomain und braucht eigene Cache-Regeln.

## Im Repository eingerichtet

- `src/pages/robots.txt.ts` erzeugt die robots.txt aus `Astro.site`, also `SITE_URL` beim Build. Produktion: `https://flyingstars.art`, Sitemap: `https://flyingstars.art/sitemap-index.xml`. Mit `FLYINGSTARS_EDITOR=1` wird stattdessen jede Route für Crawler gesperrt. Editor- und Vorschaubuilds setzen außerdem weiterhin `noindex` im HTML. Crawler-Sperren ersetzen keine Anmeldung.
- `public/.htaccess` wird unverändert nach `dist/.htaccess` kopiert. Produktionskonvention ist HTTPS auf der Apex-Domain. Der einmalige Headerabruf am 15.10.2026 ergab für `https://flyingstars.art` 200 und für `https://www.flyingstars.art` 301 mit `Location: https://flyingstars.art`.
- HTML erhält `no-cache, max-age=0, must-revalidate`. Unversionierte Dateien erhalten eine Stunde Cachezeit. Nur Dateinamen mit Hash im reservierten Astro-Build-Verzeichnis `/_astro/` erhalten ein Jahr und `immutable`. Fehlerantworten sowie versehentliche `/editor/`- und `/api/`-Aufrufe erhalten `no-store`. `mod_headers` muss dafür aktiv sein.
- Komprimierung wird nach Text-MIME-Typ angefordert. `mod_filter`, `mod_deflate` und `mod_brotli` sind mit `<IfModule>` geschützt. Fehlende Erweiterungen verhindern den Start nicht, liefern aber auch keine Komprimierung. Die Module setzen `Content-Encoding`; Textdateien variieren nach `Accept-Encoding`.
- `ErrorDocument 404 /404.html` nutzt die neue Astro-Fehlerseite und bewahrt HTTP 404. Es gibt keinen pauschalen Rewrite unbekannter URLs auf die Startseite.
- Showcase-Projekte verwenden die kurze URL, zum Beispiel `/nfl-berlin-game/`, einschließlich `/en/` und `/nl/`. Dies war bereits das Ziel der Canonical-Tags, internen Projektlinks und Sitemap-Auswahl. Die zusätzliche HTML-Ausgabe unter `/projekte/<slug>/` entfällt, Apache leitet diese URLs mit 301 weiter. Projekte ohne Showcase behalten `/projekte/<slug>/`.
- Die Migrationskarte enthält 41 alte GA4-Pfade mit belegtem Nachfolger und 12 Projektduplikate. 16 GA4-Pfade bleiben unverändert, 238 Pfade mit Traffic haben noch keinen belegten Nachfolger. Die vollständige Liste mit Traffic und Status steht in [Alte URLs](legacy-urls.md), die Daten in [legacy-url-inventory.json](legacy-url-inventory.json). Querystrings bleiben bei normalen Redirects erhalten. Fehlerhaft kodierte `%3F`-Query-Anhängsel wurden nur für die Inhaltsinventur zusammengefasst; deren Auslieferung ist nicht als abgedeckt geprüft.

Die `.htaccess` wird aus der Inventur und den aktuellen veröffentlichten Projektquellen erzeugt:

```sh
PATH=/opt/homebrew/opt/node@22/bin:$PATH node scripts/generate-public-delivery.mjs
```

Nach neuen Showcase-Projekten oder einer geänderten Zuordnung erneut erzeugen und den Diff prüfen. Der Auslieferungscheck bricht bei einer veralteten Datei, fehlenden Zielen, Redirect-Ketten oder internen Links auf Redirect-Quellen ab. Keine Bilder oder Übersetzungswerte wurden für diese Aufgabe verändert.

## SEO-Übersetzung und Bericht

Seitentitel und Beschreibungen waren bereits normale übersetzbare Felder. `translatableFields()` bestimmt die erlaubten Pfade; `localize()` übernimmt sie öffentlich nur mit passendem UTF-8-Quellhash und `reviewed: true`. Die vorhandenen EN- und NL-Startseitenvorschläge sind ungeprüft. Der deutsche öffentliche SEO-Text ist daher ein beabsichtigter Rückfall, kein falscher Sprachrouter. Projekt-SEO liegt unter `showcase.meta`, Systemseiten unter `screen`, die Blogindex-Beschreibung unter `site/ui`.

Im Übersetzungsdialog nennen die Kategorien Seiten und Projekte/Blog SEO nun ausdrücklich. Es gibt keinen zweiten Übersetzungsspeicher und keine Sonderfreigabe für SEO. Im Editor die jeweilige Sprache wählen, Titel/Beschreibung übersetzen oder vorhandene Vorschläge prüfen und anschließend bewusst freigeben. Diese Implementierung schreibt keine Übersetzung und setzt keinen Prüfstatus.

Jeder Astro-Build schreibt `.astro/seo-fallbacks.json` und nennt die betroffenen Sprachseiten im Buildlog. Der Bericht verwendet dieselben Quellschemas und `localize()` wie der Editor und unterscheidet `missing`, `stale` und `unreviewed`. Er enthält die tatsächlich erzeugten SEO-Werte und kennzeichnet `noindex`-Seiten. Der Bericht wird nicht öffentlich ausgeliefert. Fallbacks sind redaktionelle Aufgaben und brechen den Build nicht ab.

## Lokale Prüfung

```sh
PATH=/opt/homebrew/opt/node@22/bin:$PATH node --test scripts/production-seo.test.mjs scripts/production-apache.test.mjs
PATH=/opt/homebrew/opt/node@22/bin:$PATH node scripts/check-production-delivery.mjs
```

Der zweite Befehl kopiert die Arbeitsdateien in ein temporäres Verzeichnis, lässt `.env`-Dateien aus, setzt Node 22 und `FLYINGSTARS_OFFLINE_MEDIA=1`, führt `astro check` aus und baut die öffentliche Ausgabe nach `dist/`. Er prüft robots.txt, die kopierte `.htaccess`, sämtliche 301-Ziele, Projektduplikate, interne Links und Editor-Markierungen. Ein zweiter Build mit eigenem Preview-Origin prüft robots.txt und `noindex` für jede HTML-Seite. Die lokale Apache-Prüfung liest dieselbe `.htaccess` im Directory-Kontext mit und ohne optionale Kompressionsmodule. Sie startet keinen Server und beweist keine tatsächlichen Antwortheader. Brotli bleibt mangels lokalem Modul ein Kontotest.

## Einmal in konsoleH einrichten

1. Öffentliche Domain und `www` demselben statischen Webroot zuordnen. Nur das vollständige Build-Artefakt inklusive versteckter `.htaccess` aktivieren. Öffentlichen Origin für Build und Editor-Publisher auf `https://flyingstars.art` setzen. Apache-Overrides für Rewrite, Headers, Options und ErrorDocument sowie Symlinkzugriff des vorhandenen Release-Verfahrens prüfen.
2. TLS-Zertifikate für Apex, `www` und die gewählte Editor-Subdomain einrichten. HTTPS-Weiterleitungen erst mit gültigen Zertifikaten auf beiden öffentlichen Hosts testen.
3. Node nur für die Editor-Subdomain aktivieren. Hetzner deaktiviert bei der Node-Zuordnung andere Webanwendungen auf dieser Domain. Node 22, Arbeitsverzeichnis des privaten Klons, Skript `editor/server.mjs`, Port laut Account, Umgebungsvariablen und ausreichendes Speicherlimit für Astro-Builds einstellen. Details zu `AFE_SITE_ROOT`, `AFE_STATE_DIR`, `AFE_PUBLIC_WEBROOT`, `AFE_EDITOR_ORIGIN`, `AFE_CANONICAL_ORIGIN`, `AFE_AUTH`, Kontodatei und Git-Sync stehen in [Deployment](deployment.md) und [Runtime-Optionen](runtime-options.md). State, Konten und Klon bleiben außerhalb des öffentlichen Webroots. Diese öffentliche `.htaccess` gehört nicht in den Editor-Webroot.
4. Unter Einstellungen → Webserver-Erweiterungen verfügbare `mod_deflate`-/`mod_brotli`-Erweiterungen aktivieren und einzeln testen. Keine Verfügbarkeit aus einem erfolgreichen Build ableiten. Varnish vorerst deaktiviert lassen, insbesondere für den Editor. Dort dürfen weder Hostingcache noch Proxy die vorhandenen `Cache-Control: no-store`-Antworten überschreiben.
5. Node-Start, Wiederanlauf, Restart-Verfahren und Speichergrenze am Account prüfen. Für diese konsoleH-Einrichtung existiert im Projekt keine CLI; die dokumentierten Dashboard-Schritte werden einmal manuell ausgeführt. Keine Hetzner-Cloud-CLI dafür einsetzen.

Herstellergrundlagen: [Node-Konfiguration](https://docs.hetzner.com/managed/administration-on-konsoleh/nodejs/), [Webserver-Erweiterungen](https://docs.hetzner.com/managed/webserver/activate-extensions/), [HTTPS und Caching](https://docs.hetzner.com/managed/webserver/https-caching-security-configuration/), [Apache Header-Direktiven](https://httpd.apache.org/docs/2.4/mod/mod_headers.html), [Apache Brotli](https://httpd.apache.org/docs/2.4/mod/mod_brotli.html).

## Nachweis am echten Konto

Erst nach menschlich freigegebenem Deployment ausführen. Einen tatsächlich vorhandenen gehashten Assetpfad aus dem erzeugten HTML einsetzen. Für den Editor die konfigurierte Subdomain verwenden; sie wird hier nicht erfunden.

```sh
curl -sS -D - -o /dev/null http://flyingstars.art/kontakt/
curl -sS -D - -o /dev/null https://www.flyingstars.art/kontakt/
curl -sS -D - -o /dev/null -H 'Accept-Encoding: gzip' https://flyingstars.art/
curl -sS -D - -o /dev/null -H 'Accept-Encoding: br' https://flyingstars.art/
curl -sS -D - -o /dev/null -H 'Accept-Encoding: gzip' "https://flyingstars.art/_astro/DATEINAME.HASH.css"
curl -sS -D - -o /dev/null https://flyingstars.art/favicon.svg
curl -sS -D - -o /dev/null https://flyingstars.art/preise/
curl -sS -D - -o /dev/null https://flyingstars.art/en/projekte/nfl-berlin-game/
curl -sS -D - -o /dev/null https://flyingstars.art/diese-seite-existiert-nicht/
curl -sS https://flyingstars.art/robots.txt
```

- HTTP und `www`: 301 auf HTTPS/Apex mit erhaltenem Pfad. Migrationspfade und Projektduplikate: 301 auf den belegten Nachfolger, anschließend 200 ohne Schleife. Alle 53 Einträge prüfen, mit und ohne Slash, auch die UTF-8-PUMA-URL. Unbekannte Pfade: 404 mit dem Inhalt von `404.html`, kein 200 und keine externe Fehlerseiten-Weiterleitung.
- HTML: `Cache-Control: no-cache, max-age=0, must-revalidate`; gehashte Astro-Assets: ein Jahr und `immutable`; unversionierte Dateien: eine Stunde ohne `immutable`. Bedingten GET mit ETag oder Last-Modified testen, ebenso sichtbare Inhaltsänderung nach dem nächsten Release.
- Komprimierbare Antworten: zu `Accept-Encoding` passendes `Content-Encoding: gzip` oder `br`, dazu `Vary: Accept-Encoding`. Auch ohne Accept-Encoding prüfen. Bei gleichzeitig aktivem Gzip und Brotli sicherstellen, dass keine doppelte Komprimierung entsteht.
- Editor: Login, authentifizierte Oberfläche, API und Vorschau mit GET prüfen. Jede Antwort braucht `Cache-Control: no-store`, keine öffentliche Cachezeit und keine `Age`-Header aus einem Hostingcache. API-Schreibzugriffe und eine neue Sitzung dürfen keine fremden oder alten Antworten bekommen. Geheimnisse und Sitzungscookies nicht in Prüfprotokolle übernehmen.
- robots.txt und Sitemap müssen den öffentlichen Origin nennen. Canonical, hreflang und Sitemap der kurzen Projekt-URLs gegenprüfen. Den aktuellen WordPress-Sitemapindex vor dem Umzug erneut abrufen und gegen die GA4-Inventur abgleichen. Die bisherigen Sitemap-GETs lieferten hier kein auswertbares XML.

Marc muss die 238 ungeklärten Pfade redaktionell entscheiden, fehlende Nachfolger gegebenenfalls erstellen und SEO-Vorschläge prüfen. Insbesondere alte Fachartikel und noch genutzte `/wp-content/uploads/`-Originale vor dem WordPress-Abbau sichern. Die Bildpipeline und der Ablauf zur Sicherung der Originale stehen unten. Diese Implementierung belegt lokale Buildartefakte und Konfigurationssyntax; DNS, TLS, echte Kompression und vorgeschaltete Caches bleiben bis zum Kontotest unbestätigt.

## Gemeinsame Bildpipeline

`src/lib/media.ts` ist der einzige Transformationsweg. `Picture.astro` verwendet denselben `responsiveImage()`-Aufruf wie Karten, Team, Story, Galerie und Videoposter. Produktionsbuilds ermitteln die echten Remote-Abmessungen und erzeugen WebP-Varianten mit 320, 480, 768, 960, 1200 und 1600 Pixeln, begrenzt durch die Quellbreite und den jeweiligen Maximalwert. Auch kleine Quellen erhalten ihre tatsächliche Endbreite im `srcset`. Ein angeforderter Zuschnitt behält bei kleinen Originalen sein Seitenverhältnis.

Uploads behalten ihren bisherigen Ablauf und Pfad: Der Editor prüft und normalisiert die Bytes, legt `public/assets/<sha256>.<ext>` und den Medien-Datensatz atomar ab. Inhalte behalten `/assets/…` und `assetId`. Ein lazy `import.meta.glob` importiert die verwendeten Uploads direkt als Astro-`ImageMetadata`. Eine zweite Medienablage oder Migration der gespeicherten Pfade ist nicht nötig. Die Originalbytes bleiben für Editor und Vorschau unter `/assets/` verfügbar; das öffentliche `<img>` nutzt optimierte `/_astro/`-Dateien. Fehlende Upload-Dateien brechen den Build mit einer benannten Quelle ab.

`FLYINGSTARS_EDITOR=1` und `FLYINGSTARS_OFFLINE_MEDIA=1` überspringen Remote-Probes und Transformationen in diesem Modul. Sie nutzen die vorhandenen Medienabmessungen und geben das Original als einzige, wahrheitsgemäß mit dessen Breite beschriebene `srcset`-Quelle aus. Ein erfolgreiches Offline-Build belegt deshalb die HTML-Verträge, keine Bildkompression. Öffentliche Builds dürfen keinen dieser Schalter aktivieren.

Die Aufrufer besitzen `sizes`, weil nur sie das Layout kennen:

| Ausgabe | Größenwahl |
| --- | --- |
| Hero / TextMedia | Zwei Spalten, auf kleinen Viewports volle Inhaltsbreite |
| Projekt-/Artikel-Cover | Bis 40 rem, mobil Viewportbreite |
| Projektkarten | Zwei Spalten, mobil eine Spalte |
| Anlasskarten | Vier / zwei / eine Spalte, 4:3-Zuschnitt |
| Team | Aus der gewählten Spaltenzahl und den vorhandenen Breakpoints |
| Case-Story | Desktop etwa halbe Breite, mobil volle Breite; Porträt bis 420 px |
| Case-Galerie | 64 vw bis 980 px, Porträt 30 vw bis 440 px; unter 1000 px 84 / 64 vw |
| Hero-Videoposter / nächstes Projekt | 100 vw |
| Sonstige Videoposter | Zwei Spalten, mobil volle Inhaltsbreite |
| Kunden-, Nachhaltigkeits- und Footerlogos | Einzelvariante für kleine feste Darstellungen |

`optimizedImage()` bleibt für Social-Metadaten und kleine Logos; `optimizedLogo()` bewahrt das ganze Logo. Die vier erlaubten Logo-Ausnahmen stehen mit Grund in `scripts/check-content-images.mjs` und sind im HTML als `data-media-single` markiert. Der Guard läuft nach jedem Astro-Build, auch beim Host-Update, und verlangt sonst für jedes `<img>` `srcset` und `sizes`. Unbekannte oder übergroße Ausnahmen scheitern. Im aktuellen Inhalt gibt es keine Markdown-Inlinebilder. Neue Renderer oder Markdown-Bildausgaben müssen denselben Vertrag erfüllen; der Guard verhindert unbemerkte Ausnahmen.

Die lokale Prüfung ergab auf demselben Inhaltsstand 52 HTML-Dateien und 364 `<img>`-Elemente. Vorher hatten 12 ein `srcset` und `sizes`; nachher sind es 243. Die verbleibenden 121 Instanzen sind die erlaubten kleinen Logos. Mehrsprachige und wiederverwendete Instanzen werden mitgezählt. Der ältere Auditstand mit 561 Instanzen ist deshalb kein direkter Vergleich zu diesem Branch.

## Bildcache auf dem Host

`astro.config.mjs` nutzt `FLYINGSTARS_IMAGE_CACHE_DIR`, lokal standardmäßig `.astro/cache`, immer außerhalb von `dist`. `NativeBuilder` setzt den Pfad unabhängig vom Commit auf `<State>/cache/astro-images/public` für Veröffentlichungen und `<State>/cache/astro-images/editor` für die schnelle Editor-Ausgabe. `editor/deploy/host-update.mjs` verwendet denselben NativeBuilder und denselben State-Ordner. Der Austausch temporärer Buildquellen und die Aktivierung eines neuen Webroots löschen diesen Cache nicht. Die Trennung verhindert, dass Vorschauartefakte in Produktionsbuilds gelangen. Vite- und Collection-Dateien in der Buildquelle dürfen weiterhin verworfen werden.

Astro legt die Bildcache-Einträge unter `assets/` im konfigurierten Cache ab. Der Cache ist abgeleitet und darf bei Platzmangel außerhalb laufender Builds gelöscht werden; der nächste Build braucht dann alle Originale erneut. Er ersetzt deren Sicherung nicht. Remote-Dimensionsprobes benötigen auch bei warmem Transformationscache Zugriff auf die Originalquellen. [Astro-Bildcache und getImage](https://docs.astro.build/en/guides/images/#asset-caching).

Kalt-/Warmmessung mit Node 22 auf einem Rechner mit Netzwerkzugriff, in einer Kopie ohne `.env`-Dateien:

```sh
# Nur einen frischen Messpfad verwenden; keinen laufenden Hostcache leeren.
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
export SITE_URL=https://flyingstars.art
export FLYINGSTARS_IMAGE_CACHE_DIR=/tmp/flyingstars-q-image-cache
unset FLYINGSTARS_EDITOR FLYINGSTARS_OFFLINE_MEDIA
/usr/bin/time -l node node_modules/astro/bin/astro.mjs build
/usr/bin/time -l node node_modules/astro/bin/astro.mjs build
node scripts/check-content-images.mjs dist
```

Stand dieser Ausführung: Die Produktionsversuche und der Originaldownload scheitern in der eingeschränkten Umgebung an `getaddrinfo ENOTFOUND` für beide Medienhosts. Zusätzlich verweigert `/usr/bin/time -l` `sysctl kern.clockrate` und liefert keinen Spitzenspeicher. Es gibt deshalb **keine gültigen kalten oder warmen Produktionsmesswerte** und keinen belegten Vergleich mit den früheren 440–465 MB / 2,9–3,1 s ohne Bildtransformationen. Fehlerlaufzeiten werden nicht als Produktionsbenchmark angegeben. Die ursprünglichen Werte bezogen sich außerdem auf 21 Seiten, dieser Stand baut 52. Ein echter Kontotest bleibt notwendig, insbesondere wegen paralleler Sharp-Transformationen. Der Integrationstest belegt den Cache über zwei verschiedene Inhaltscommits mit einem echten lokalen 901×600-Upload und kontrolliert die Pixelbreiten der erzeugten Dateien.

## Originale vor Ablösung von WordPress sichern

Die vollständige Inventur mit jeder referenzierenden Datei steht in [legacy-media-inventory.json](legacy-media-inventory.json). `scripts/fetch-legacy-media.mjs` erzeugt sie dynamisch aus `src/content` und ausführbarem Site-Code unter `src`. Aktuell sind es 50 unterschiedliche Quellen: 20 unter `https://flyingstars.art/wp-content/uploads/` und 30 auf `flyingstars-relaunch.vercel.app`. Enthalten sind 45 Bilder und 5 Videos. Auch Codequellen wie Footerlogo und Videoregistrierung werden erfasst. Lokal gelieferte Fonts, Formations-JSON und das Technik-PDF sind davon unabhängig.

```sh
# Standard: ~/flyingstars-media-staging, ausdrücklich außerhalb des Repositorys
node scripts/fetch-legacy-media.mjs
# Alternativer lokaler Stagingpfad
node scripts/fetch-legacy-media.mjs /tmp/cx9/q/staging
```

Das Skript führt ausschließlich GETs aus. Es prüft HTTP-Status, Dateigröße bis 512 MiB, deklarierte Content-Length ohne Transferkompression, MIME-Typ gegen dekodierte Bildmetadaten beziehungsweise MP4-/WebM-/PDF-Signatur sowie SHA-256 nach dem erneuten Lesen der gespeicherten Datei. Es schreibt inhaltsadressierte Dateien unter `originals/` und aktualisiert `manifest.json` atomar nach jedem Eintrag. Das Manifest enthält Herkunft, referenzierende Dateien, Zielpfad, Bytezahl, MIME, Bildmaße und SHA-256. Ein Vollständigkeitsmarker und die erwartete Eintragszahl machen abgebrochene Läufe erkennbar. Fehler bleiben mit Status `failed` sichtbar; die CLI endet dann ungleich null. Wiederholungen sind möglich. Das Skript lädt referenzierte Quelldateien herunter, es errät keine höher aufgelösten WordPress-Varianten und sichert keine unreferenzierte Mediathek.

Der verlangte Lauf nach `/tmp/cx9/q/staging` wurde ausgeführt. Wegen der DNS-Sperre sind dort 50 Fehler und **keine gesicherten Originale** verzeichnet. Die Funktionsprüfung mit echten PNG-Bytes bestätigt Größen-/Typ-/Hashprüfung, Fehlerfälle, Wiederholung und den Schutz vor Staging im Repository. Ein erfolgreicher Abruf aller Remote-Dateien ist noch offen.

Vor Austausch des WordPress-Webroots muss Folgendes abgeschlossen sein:

1. Download auf einem Rechner mit Zugriff auf beide Quellen wiederholen; jeder Eintrag muss `verified` sein. Manifest und Originale zusätzlich sichern. Falls die gesamte WordPress-Mediathek erhalten bleiben soll, separat einen vollständigen `uploads`-Export anlegen.
2. Marc entscheidet den zentralen Medienhost, Eigentümer des Kontos, EU-Region, öffentliche HTTPS-Auslieferung und Backup. Die Originale gehören gemäß Projektvertrag dorthin, nicht in dieses Git-Repository. Diese Aufgabe hat keinen Upload vorgenommen.
3. Nach einer gesonderten Freigabe die verifizierten Originale übertragen. Eine URL-Zuordnung aus dem Manifest ableiten, öffentliche GETs und Prüfsummen vergleichen. Medien-Datensätze und direkte Referenzen im Inhalt sowie `Base.astro` und `src/lib/videos.ts` auf die dauerhaften URLs umstellen; `MEDIA_HOST` auf den tatsächlichen Hostnamen ohne Schema setzen. Alttexte, Maße und `assetId` bewahren. Keine automatische URL-Umschreibung auf einen noch nicht gewählten Speicher.
4. Produktionsbuild mit leerem Transformationscache und neuen URLs ausführen, alle Varianten und Videos prüfen. Bereits generierte WebP-Dateien reichen als Sicherung der Originale nicht aus.
5. Für bisher öffentlich verlinkte WordPress-Medien entweder deren alte `/wp-content/uploads/…`-Pfade außerhalb der neuen Releases weiter ausliefern oder gezielte 301-Regeln zu den gesicherten Quellen einrichten. Erst danach den alten Webroot ablösen. Auch die temporäre Vercel-Referenz darf erst nach erfolgreicher Übernahme entfallen.

Zwei EU-Optionen zur Entscheidung, keine Buchung oder Einrichtung:

- [Hetzner Object Storage](https://www.hetzner.com/de/storage/object-storage/) mit ausdrücklich gewähltem deutschen oder finnischen Standort. S3-kompatibel, passend zum bestehenden Hostinganbieter. Region und Auslieferungskonfiguration anhand der [Hetzner-Speicherübersicht](https://docs.hetzner.com/storage/general/which-storage-is-right-for-me/) prüfen. Umweltangaben sind Anbieterangaben; den konkreten Standort und aktuellen Energienachweis vor Auswahl bestätigen.
- [Scaleway Object Storage](https://www.scaleway.com/en/object-storage/) mit ausdrücklich gewählter EU-Region. Separater Anbieter für die Medien. Scaleway veröffentlicht [Umweltkennzahlen und Energieangaben je Rechenzentrum](https://www.scaleway.com/en/environmental-leadership/); diese auf die tatsächlich gewählte Region beziehen. Ein Herkunftsnachweis für Strom ist keine Zusage emissionsfreien Betriebs.

Ein eigener Medienhostname auf dem vorhandenen Hetzner-Webhosting ist ebenfalls möglich, wenn die Originale in einem dauerhaften, vom ausgetauschten Webroot getrennten Verzeichnis liegen und Backup sowie HTTPS dafür eingerichtet werden. Ob Bucket oder Medienverzeichnis: Marc muss den dauerhaften Zielort wählen; der Bildcache ist keiner.

### Nachmessung außerhalb der Sandbox (Claude, 15.10.2026)

- `scripts/fetch-legacy-media.mjs /tmp/…/staging`: **50 von 50 Originalen geladen und geprüft** (20 WordPress, 30 Vercel-Prototyp), 14 MB. Auch die 30 Dateien auf `flyingstars-relaunch.vercel.app` müssen vor dem Umzug in den endgültigen Medienspeicher.
- Produktionsbuild mit echten Remote-Bildern (`SITE_URL=https://flyingstars.art`, eigener `FLYINGSTARS_IMAGE_CACHE_DIR`, `/usr/bin/time -l`, MacBook): **kalt 7,5 s / 547 MB Spitze, warm 4,6 s / 479 MB**; Bild-Cache 4,3 MB. Vorher ohne responsive Varianten 440–465 MB. Ob die Kaltspitze ins Speicherlimit von Hetzner L passt, zeigt erst `hosting-probe.mjs` auf dem Konto; der dauerhafte Cache hält Folgebuilds bei der Warmspitze.
- 364 Bilder, davon 243 mit `srcset` + `sizes` (vorher 12), 121 begründete Ausnahmen (kleine Logos/SVG).
