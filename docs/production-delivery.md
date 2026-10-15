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

Marc muss die 238 ungeklärten Pfade redaktionell entscheiden, fehlende Nachfolger gegebenenfalls erstellen und SEO-Vorschläge prüfen. Insbesondere alte Fachartikel und noch genutzte `/wp-content/uploads/`-Originale vor dem WordPress-Abbau sichern. Die Übernahme und Vereinheitlichung der Bildpipeline gehört zur späteren Medienaufgabe. Diese Implementierung belegt lokale Buildartefakte und Konfigurationssyntax; DNS, TLS, echte Kompression und vorgeschaltete Caches bleiben bis zum Kontotest unbestätigt.
