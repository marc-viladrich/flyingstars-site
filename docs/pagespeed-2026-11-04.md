# PageSpeed und Indexierung, 04.11.2026

Untersucht wurde der [mobile PSI-Bericht vom 04.11.2026, 09:33 Uhr](https://pagespeed.web.dev/analysis/https-flyingstars-site-pages-dev/uf81oqxukv?form_factor=mobile) gegen `https://flyingstars-site.pages.dev/`. Cloudflare nennt dafür das Produktionsdeployment `66e0ff66-b207-4af0-829f-76f264ab4894`, Quellstand `cd1ea13`. Die parallel laufenden Navigations-/Kontaktänderungen im Checkout `flyingstars-poc` wurden nicht angefasst. Dieser Bericht und die Headeränderung entstanden in einem eigenen Worktree auf diesem Quellstand.

## Befund

- Performance 100; FCP 1,1 s, LCP 1,4 s, TBT 0 ms, CLS 0,001. Keine CrUX-Felddaten im Bericht.
- Forced Reflow: 24 ms ohne zugeordneten JavaScript-Stack, 6 ms Consent, 1 ms `dotimage`, ein weiterer gerundeter 0-ms-Eintrag. Die 6 ms unter „Top function call“ sind kein zusätzlicher Posten zur Quelltabelle. Die 24 ms sind also nicht die Gesamtsumme.
- Der ausgelieferte Consent-Quelltext an `consent.BoqCbUK5.js:1:23597` liegt in `focusVisibleModal()`: Sichtbarkeit über `getComputedStyle()` prüfen und bei Bedarf `.focus({preventScroll:true})` setzen. Der Adapter misst außerdem beim Erstellen `scrollHeight`/`clientHeight`, um einen scrollbaren Textbereich per Tastatur erreichbar zu machen. Diese Arbeit dient der Tastaturbedienung; der kleine Messwert rechtfertigt keinen Umbau oder das Entfernen des Fokusverhaltens.
- `dotimage.B2W_d6v_.js:1:4702` liest `getBoundingClientRect().top` vor dem mobilen Reveal; `:1:3208` liegt beim Größenlesen für das Canvas. Das Modul erzeugt den Foto-zu-Lichtpunkte-Effekt auf Karten und Porträts. Es wird in der Nähe des Viewports nachgeladen. Der beobachtete Aufwand ist sehr klein.
- `position: fixed` entfernt eine Box aus dem normalen Dokumentfluss, aber nicht aus der Layoutberechnung. Nach einer DOM-/Styleänderung können Größenabfragen und Fokus den Browser zu sofortiger Style-/Layoutberechnung zwingen. Reflow ist nicht gleich sichtbare Layoutverschiebung. Ohne den ursprünglichen Trace lässt sich der nicht zugeordnete Anteil nicht zuverlässig einer Bibliothek oder Funktion zuschreiben.
- Render-Blocking: 27,7 KiB Transfer für `global.HXbvJNBD.css` (19,2 KiB) und `_..BA0RUZPc.css` (8,5 KiB); geschätztes Einsparpotenzial 430 ms. Das ist ein Modellwert unter Slow-4G-Simulation, kein nachgewiesener Gewinn eines konkreten Patches. Die zweite Datei bündelt seiten-/komponentenbezogene Styles. Geringe Bytezahl beseitigt die Wartezeit auf Requests und CSS-Verarbeitung nicht.

Empfehlung: aktuell keinen Performance-Patch. Keine Bibliothek forken, keinen Fokus entfernen, keine Styles pauschal asynchron laden. Bei späterem Wachstum zuerst ungenutztes CSS pro Route prüfen. Kritisches CSS nur nach einem kontrollierten Vorher-/Nachher-Vergleich über mehrere Seiten und wiederholte mobile Messungen herauslösen; vollständiges Inlining wiederholt CSS in jedem HTML-Dokument und verliert den seitenübergreifenden CSS-Cache. „Keine Forced-Reflow-Warnung“ ist kein sinnvolles Zuverlässigkeitsversprechen über Browser- und Lighthouse-Versionen hinweg.

## Indexierung des Staginghosts

Vor der Änderung liefern `/` und `/en/` auf `flyingstars-site.pages.dev` keinen `X-Robots-Tag`; die Branch-Preview `feat-designsprache-poc.flyingstars-site.pages.dev` liefert bereits automatisch `noindex`.

`public/_headers` ergänzt ausschließlich für `https://flyingstars-site.pages.dev/*` den Header `X-Robots-Tag: noindex`. Cloudflare wendet diese Regeln auf statische Antworten an. Das passt zur statischen Astro-Site. API-Functions sind davon nicht erfasst; sie liefern keine indexierbaren Inhaltsseiten. Branch-Previews behalten Cloudflares eigenen Schutz. Eine spätere eigene Produktionsdomain erhält durch diese Regel kein `noindex`.

`robots.txt` bleibt crawlbar, damit Suchmaschinen den Header tatsächlich lesen können. Kein `Disallow: /` ergänzen. Bereits indexierte URLs verschwinden erst nach erneutem Crawlen. Der gewollte Indexierungsausschluss kann den Lighthouse-SEO-Score senken und ist hier korrekt.

Quellen: [Chrome: Forced Reflow](https://developer.chrome.com/docs/performance/insights/forced-reflow), [Cloudflare: hostbezogene Header](https://developers.cloudflare.com/pages/configuration/headers/), [Cloudflare: Preview-noindex](https://developers.cloudflare.com/pages/configuration/preview-deployments/), [Google: noindex und Crawling](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag).

Nach dem Deployment mit echten GET-Antworten prüfen:

```sh
curl -sS -D - -o /dev/null https://flyingstars-site.pages.dev/
curl -sS -D - -o /dev/null https://flyingstars-site.pages.dev/en/
curl -sS -D - -o /dev/null https://flyingstars-site.pages.dev/nl/kontakt/
```

Erwartung jeweils `200` und `X-Robots-Tag: noindex`. Diese Headerprüfung belegt die Auslieferung, nicht den aktuellen Google-Indexstand. Bis zum Merge/Deployment ist die Regel nur vorbereitet. Ein neuer Lighthouse-Lauf wurde nicht benötigt, da der originale PSI-Bericht einschließlich der aufgeklappten Quelltabellen zugänglich war.

Geprüft: `astro check` mit 0 Fehlern, 0 Warnungen und 238 bestehenden Hinweisen; echter Astro-Build mit den öffentlichen GitHub-Trackingvariablen erfolgreich, 182 Seiten. `dist/_headers` stimmt bytegenau mit der Quelle überein, 23 von maximal 100 Headerregeln. Wrangler 4.147.0 hat alle 23 Regeln akzeptiert. Vier GET-Prüfungen gegen `wrangler pages dev dist` mit tatsächlichen Host-Headern liefern für die drei obigen Pages-Pfade `200` mit `noindex`, für `Host: flyingstars.art` dagegen `200` ohne `noindex`. Keine Layout-, Browser- oder Regressionstest-Suite nötig, da nur der HTTP-Header geändert wurde.
