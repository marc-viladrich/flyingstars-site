# WordPress-Blogbestand vom 27. November 2026

Ein Abgleich von Live-Sitemap, öffentlicher WordPress-REST-Antwort und Inventar ergab dieselben 64 Beitrags-URLs. Das Blog enthält die 28 Originalfassungen außerhalb der 36 Showberichte. Davon sind 18 deutsch und 10 englisch. Die beiden englischen Artikel zum niederländischen Feuerwerksverbot haben jeweils einen eigenen Pfad. Für die vorhandenen drei niederländischen Astro-Artikel und den Astro-Testflug bleiben die redaktionellen Fassungen erhalten.

Die importierten Einträge haben einen `legacyPath`: Diese Originale können je Sprache in Inhalt, Datum und Bildern abweichen. Nur diese Dateien sind vom deutschen Übersetzungsvertrag ausgenommen. Blogdetailseiten setzen Hreflang anhand der tatsächlich vorhandenen öffentlichen Geschwister und verlinken im Sprachmenü bei fehlender Fassung auf die jeweilige Blogübersicht.

Die Elementor-Hülle entfällt im Astro-Layout. Artikelüberschriften, Text, Listen, Links und Originalbilder werden übernommen. Drei fehlende Alternativtexte der Titelbilder sind ergänzt. Das HTML benutzt die Autorenbox für Florian gemäß Projektbriefing. Die alte dynamische Empfehlungen-Liste wird durch das Astro-Blogmodul ersetzt. Externe WordPress-Videoeinbettungen verweisen auf die jeweiligen Videos, ohne die Player beim Öffnen der Seite zu laden.

Die Redirects kommen aus dem vorhandenen URL-Inventar. `node scripts/generate-public-delivery.mjs` generiert die Apache-Regeln und die Blog-Redirects für Cloudflare Pages. `node --test scripts/public-routes.test.mjs` prüft alle 28 Zielpfade, ihre Eindeutigkeit, Sprache und die Regeln beider Hosts. `node scripts/check-i18n-build.mjs` prüft die gebauten Sprachziele.

In der Pages-Vorschau zeigt `?bild=flyingstars` für fünf deutsche Artikel auf Wunsch ein alternatives Titelbild. Die Abbildungen in Artikeltext und Karten folgen weiter dem Original. Vor der Umschaltung der Live-Domain die Beibehaltung der alten Pfade unter `/wp-content/uploads/` sicherstellen. Die Astro-Titelbilder werden beim Build optimiert, die Originalbilder im Artikelkörper verwenden ihre WordPress-Pfade.
