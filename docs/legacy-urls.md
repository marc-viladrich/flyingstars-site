# Alte URLs und Redirect-Abdeckung

Quelle: GA4-Exporte im Datenbriefing, Zeitraum 2023-07-28 bis 2026-09-17. Die maschinenlesbare Inventur liegt in `legacy-url-inventory.json`.

Querystrings einschließlich fehlerhaft kodierter %3F-Anhängsel für die Inhaltsinventur entfernt; abschließender Slash bei Inhaltsrouten vereinheitlicht, Dateipfade beibehalten. Werte je Export summiert, nicht über Exporte addiert. encodedQueryRows zählt fehlerhafte URL-Zeilen, deren Auslieferung nicht als abgedeckt behauptet wird.

GET wp-sitemap.xml lieferte keine XML-Daten; weiterer GET auf sitemap_index.xml scheiterte an DNS. Vor Freigabe erneut abgleichen. Keine WordPress-XML-Exporte im untersuchten Kunden-Dateibaum gefunden (relaunch/source ausgelassen).

## Abdeckung

16 retained, 41 redirect, 238 unmapped. Beibehaltene URLs brauchen keinen Migrationsredirect. Slashlose Varianten bestehender Verzeichnisse normalisiert Apache mit DirectorySlash. Die Projektduplikate kommen zusätzlich zur GA4-Karte hinzu.

Keine Zuordnung von NFL München zu NFL Berlin: unterschiedliche Veranstaltungen. Alte Fachartikel haben bislang keine entsprechenden Inhalte im neuen Blog. Für AGB, alte Sprachfassungen, entfernte Projekte, Archive und Medien fehlen teils Nachfolger. Keine pauschale Umleitung zur Startseite.

## Alle erfassten Pfade mit Traffic

| Alter Pfad | Views | Aktive Nutzer Landing-Export | Organische Klicks | Status / Ziel |
| --- | ---: | ---: | ---: | --- |
| `/` | 128541 | 63377 | 1511 | retained: `/` |
| `/100-drohnen-fur-puma-zum-anstoss-eines-bundesliga-derbys/` | 21 | 3 | 0 | redirect: `/puma-bundesliga/` |
| `/100-jahriges-westfalen-ag/` | 111 | 22 | 0 | **UNGEKLÄRT** |
| `/404/` | 79 | 10 | 0 | **UNGEKLÄRT** |
| `/50-jahre-golf-an-der-scalaria-am-wolfgangsee/` | 214 | 33 | 11 | **UNGEKLÄRT** |
| `/50-jahre-vw-golf/` | 12 | 0 | 0 | **UNGEKLÄRT** |
| `/75-jahre-eisenhuettenstadt-jubilaumsshows-beim-stadtfest/` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/75-jahre-eisenhuttenstadt-jubilaumsshows-beim-stadtfest/` | 68 | 13 | 1 | **UNGEKLÄRT** |
| `/AGB/` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/ab-wann-braucht-man-einen-drohnenfuhrerschein/` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/abschluss-highlight-des-movie-parks-germany-zum-hollywood-christmas/` | 20 | 3 | 0 | **UNGEKLÄRT** |
| `/admin.php` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/admin/` | 6 | 0 | 0 | **UNGEKLÄRT** |
| `/agb/` | 333 | 100 | 4 | **UNGEKLÄRT** |
| `/agentur/` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/airpower-drohnenshow/` | 9 | 0 | 0 | **UNGEKLÄRT** |
| `/alternative-zu-feuerwer/` | 12 | 2 | 0 | **UNGEKLÄRT** |
| `/alternative-zu-feuerwerk/` | 257 | 72 | 0 | **UNGEKLÄRT** |
| `/aussergewoehnlicher-einsatz-bei-der-airpower24/` | 109 | 10 | 0 | **UNGEKLÄRT** |
| `/author/azad/` | 4 | 0 | 0 | **UNGEKLÄRT** |
| `/author/hamza/` | 6 | 4 | 0 | **UNGEKLÄRT** |
| `/author/kathi/` | 7 | 3 | 0 | **UNGEKLÄRT** |
| `/bctAYpXJgwbnecx/` | 1 | 0 | 0 | **UNGEKLÄRT** |
| `/beitrag-test-2/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/beitrag-test/` | 49 | 7 | 0 | **UNGEKLÄRT** |
| `/besondere-hochzeitsueberraschung-fuer-brautpaar-und-gaestinnen/` | 177 | 27 | 0 | **UNGEKLÄRT** |
| `/blog grundlagen/` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/blog/` | 965 | 168 | 0 | retained: `/blog/` |
| `/category/100-drohnen/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/como-funciona-el-servicio-de-atencion-al-cliente-en-farmacia-francesa/` | 4 | 2 | 0 | **UNGEKLÄRT** |
| `/como-monurol-se-compara-con-otros-tratamientos-disponibles-en-farmacia-rincon-de-seca/` | 4 | 2 | 0 | **UNGEKLÄRT** |
| `/consejos-para-identificar-productos-legitimos-de-femara-en-parafarmacia-la-vega/` | 4 | 2 | 0 | **UNGEKLÄRT** |
| `/contact/` | 2 | 1 | 0 | redirect: `/kontakt/` |
| `/danke/` | 394 | 20 | 0 | retained: `/danke/` |
| `/datenschutz/` | 654 | 187 | 1 | retained: `/datenschutz/` |
| `/de/` | 10 | 1 | 0 | redirect: `/` |
| `/demo/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/deutsche-umwelthilfe-fur-die-kampagne-bollerciao-in-berlin/` | 38 | 6 | 0 | **UNGEKLÄRT** |
| `/deutsche-umwelthilfe-kampagne/` | 198 | 47 | 24 | **UNGEKLÄRT** |
| `/drohenshow berlin/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/drohne-fliegen-in-deutschland/` | 1233 | 552 | 475 | **UNGEKLÄRT** |
| `/drohne-kosten/` | 112 | 35 | 0 | **UNGEKLÄRT** |
| `/drohne-spanien/` | 205 | 84 | 79 | **UNGEKLÄRT** |
| `/drohnen-aufbau-funktionshinweise/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/drohnen-aufbau-funktionswei-se/` | 8 | 2 | 0 | **UNGEKLÄRT** |
| `/drohnen-aufbau-funktionsweise/` | 4089 | 1577 | 1254 | **UNGEKLÄRT** |
| `/drohnen-aufbau-wie-funktioniert-eine-drohne/` | 1 | 0 | 0 | **UNGEKLÄRT** |
| `/drohnen-feuerwerk-als-alternative (oder ähnliche Seiten wie Showmatrix/TenMedia/` | 3 | 1 | 0 | **UNGEKLÄRT** |
| `/drohnen-feuerwerk-als-alternative-2/` | 1 | 0 | 0 | **UNGEKLÄRT** |
| `/drohnen-feuerwerk-als-alternative/` | 465 | 103 | 75 | **UNGEKLÄRT** |
| `/drohnen-fliegen-nachts-dunkel/` | 1060 | 496 | 503 | **UNGEKLÄRT** |
| `/drohnen-im-dunkeln-fliegen-was-du-wissen-musst/` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/drohnen-kennzeichen-2/` | 4 | 0 | 0 | **UNGEKLÄRT** |
| `/drohnen-kennzeichen/` | 72 | 6 | 0 | **UNGEKLÄRT** |
| `/drohnen-versicherung/` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/drohnenfuehrerschein-ab-wann-ist-er-pflicht/` | 560 | 222 | 211 | **UNGEKLÄRT** |
| `/drohnenshow hochzeit kosten/` | 1 | 0 | 0 | **UNGEKLÄRT** |
| `/drohnenshow-bad-salzuflen/` | 24 | 2 | 0 | **UNGEKLÄRT** |
| `/drohnenshow-berlin/` | 46 | 7 | 1 | **UNGEKLÄRT** |
| `/drohnenshow-buchen/` | 34 | 4 | 0 | **UNGEKLÄRT** |
| `/drohnenshow-chemnitz/` | 16 | 1 | 0 | **UNGEKLÄRT** |
| `/drohnenshow-china-weltrekorde-technik-magische-lichtshows/` | 12 | 2 | 0 | **UNGEKLÄRT** |
| `/drohnenshow-china-weltrekorde-technik/` | 985 | 342 | 242 | **UNGEKLÄRT** |
| `/drohnenshow-dresden/` | 20 | 6 | 0 | **UNGEKLÄRT** |
| `/drohnenshow-dubai/` | 26 | 2 | 0 | **UNGEKLÄRT** |
| `/drohnenshow-duesseldorf/` | 26 | 2 | 0 | **UNGEKLÄRT** |
| `/drohnenshow-duisburg/` | 22 | 0 | 0 | **UNGEKLÄRT** |
| `/drohnenshow-frankfurt/` | 18 | 2 | 0 | **UNGEKLÄRT** |
| `/drohnenshow-hannover/` | 34 | 2 | 0 | **UNGEKLÄRT** |
| `/drohnenshow-hochzeit-kosten/` | 20 | 3 | 0 | **UNGEKLÄRT** |
| `/drohnenshow-hochzeit/` | 2546 | 921 | 116 | **UNGEKLÄRT** |
| `/drohnenshow-hofer-volksfest/` | 14 | 0 | 0 | **UNGEKLÄRT** |
| `/drohnenshow-indoor/` | 2258 | 206 | 26 | **UNGEKLÄRT** |
| `/drohnenshow-koblenz-rhein-in-flammen-setzt-neue-massstaebe-am-deutschen-eckdrohnenshow-duisburg/` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/drohnenshow-koblenz/` | 28 | 2 | 0 | **UNGEKLÄRT** |
| `/drohnenshow-leipzig/` | 153 | 33 | 0 | **UNGEKLÄRT** |
| `/drohnenshow-magdeburg/` | 26 | 1 | 0 | **UNGEKLÄRT** |
| `/drohnenshow-merzig/` | 40 | 6 | 0 | **UNGEKLÄRT** |
| `/drohnenshow-moers/` | 12 | 1 | 0 | **UNGEKLÄRT** |
| `/drohnenshow-nrw/` | 14 | 0 | 0 | **UNGEKLÄRT** |
| `/drohnenshow-oberhausen/` | 61 | 11 | 0 | **UNGEKLÄRT** |
| `/drohnenshow-preise/` | 16983 | 2308 | 395 | retained: `/drohnenshow-preise/` |
| `/drohnenshow-stuttgart/` | 14 | 1 | 0 | **UNGEKLÄRT** |
| `/drohnenshow-telekom/` | 28 | 3 | 0 | **UNGEKLÄRT** |
| `/drohnenshow-tollwood/` | 18 | 3 | 0 | **UNGEKLÄRT** |
| `/drohnenshow-wacken/` | 14 | 0 | 0 | **UNGEKLÄRT** |
| `/drohnenshow-werbung/` | 1123 | 84 | 13 | **UNGEKLÄRT** |
| `/drone-show-booking/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/elektrofestival-sonnemondsterne/` | 126 | 21 | 5 | **UNGEKLÄRT** |
| `/en/` | 24734 | 9357 | 568 | retained: `/en/` |
| `/en/100-drones-for-puma-at-the-start-of-a-bundesliga-derby/` | 59 | 27 | 0 | redirect: `/en/puma-bundesliga/` |
| `/en/100th-anniversary-of-westfalen-ag/` | 112 | 46 | 0 | **UNGEKLÄRT** |
| `/en/50-years-of-golf-at-the-scalaria-on-lake-wolfgang-austria/` | 121 | 50 | 0 | **UNGEKLÄRT** |
| `/en/50-years-vw-golf/` | 3 | 0 | 0 | **UNGEKLÄRT** |
| `/en/75-years-of-eisenhuettenstadt-anniversary-shows-at-the-city-festival/` | 27 | 8 | 0 | **UNGEKLÄRT** |
| `/en/agb/` | 14 | 1 | 0 | **UNGEKLÄRT** |
| `/en/airpower-droneshow/` | 3 | 0 | 0 | **UNGEKLÄRT** |
| `/en/blog-en/` | 240 | 82 | 0 | redirect: `/en/blog/` |
| `/en/blog/` | 28 | 4 | 0 | retained: `/en/blog/` |
| `/en/blog/articles/how-to-program-a-drone-show-process-and-costs/` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/en/blog/drones-as-an-alternative-to-fireworks-eco-friendly-light-show/` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/en/category/100-199-drones/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/en/category/250-drones/` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/en/category/350-drones/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/en/category/400-drones/` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/en/contact/` | 1274 | 159 | 1 | redirect: `/en/kontakt/` |
| `/en/data-protection-policy/` | 2 | 0 | 0 | redirect: `/en/datenschutz/` |
| `/en/datenschutz/` | 6 | 1 | 0 | retained: `/en/datenschutz/` |
| `/en/drohnenshow-koblenz-rhein-in-flammen-setzt-neue-massstaebe-am-deutschen-eck/` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/en/drohnenshow/` | 4 | 1 | 0 | **UNGEKLÄRT** |
| `/en/drone-cost/` | 152 | 71 | 0 | **UNGEKLÄRT** |
| `/en/drone-license-when-do-you-need-one/` | 7 | 1 | 0 | **UNGEKLÄRT** |
| `/en/drone-show-advertising/` | 250 | 22 | 1 | **UNGEKLÄRT** |
| `/en/drone-show-china/` | 74 | 28 | 4 | **UNGEKLÄRT** |
| `/en/drones-as-an-alternative-to-fireworks-an-eco-friendly-light-spectacle-2/` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/en/drones-as-an-alternative-to-fireworks-an-eco-friendly-light-spectacle/` | 1 | 1 | 0 | **UNGEKLÄRT** |
| `/en/drones-as-an-alternative-to-fireworks/` | 684 | 298 | 175 | **UNGEKLÄRT** |
| `/en/droneshows-indoor/` | 190 | 20 | 0 | **UNGEKLÄRT** |
| `/en/elementor-2966/` | 1 | 0 | 0 | **UNGEKLÄRT** |
| `/en/exceptional-deployment-at-airpower24/` | 116 | 53 | 1 | **UNGEKLÄRT** |
| `/en/exploring-reinvented-the-new-ford-explorer/` | 124 | 53 | 0 | redirect: `/en/exploring-reinvented-der-neue-ford-explorer/` |
| `/en/extra-shift-duisburg/` | 43 | 14 | 0 | **UNGEKLÄRT** |
| `/en/final-highlight-of-movie-park-germany-at-hollywood-christmas/` | 8 | 3 | 0 | **UNGEKLÄRT** |
| `/en/first-drone-show-at-the-sonnemondsterne-electro-festival/` | 7 | 2 | 0 | **UNGEKLÄRT** |
| `/en/flying-drones-in-the-dark-what-you-need-to-know/` | 1 | 0 | 0 | **UNGEKLÄRT** |
| `/en/flying-drones-in-the-dark/` | 468 | 221 | 189 | **UNGEKLÄRT** |
| `/en/ford-droneshow/` | 2 | 0 | 0 | redirect: `/en/exploring-reinvented-der-neue-ford-explorer/` |
| `/en/general-terms-and-conditions-gtc/` | 136 | 61 | 1 | **UNGEKLÄRT** |
| `/en/german-environmental-aid-for-the-bollerciao-campaign-in-berlin/` | 4 | 1 | 0 | **UNGEKLÄRT** |
| `/en/german-environmental-campaign/` | 126 | 60 | 2 | **UNGEKLÄRT** |
| `/en/home-test/` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/en/home/` | 1852 | 938 | 59 | redirect: `/en/` |
| `/en/how-do-they-do-the-drone-light-show/` | 195 | 90 | 55 | **UNGEKLÄRT** |
| `/en/how-do-you-program-a-drone-show/` | 469 | 190 | 117 | **UNGEKLÄRT** |
| `/en/how-does-a-drone-show-work/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/en/how-does-a-drone-work/` | 130 | 62 | 0 | **UNGEKLÄRT** |
| `/en/how-much-does-drone-insurance-cost/` | 31 | 5 | 1 | **UNGEKLÄRT** |
| `/en/impressionen/` | 269 | 11 | 0 | redirect: `/en/projekte/` |
| `/en/impressum/` | 32 | 1 | 0 | retained: `/en/impressum/` |
| `/en/indoor-drone-show/` | 271 | 37 | 7 | **UNGEKLÄRT** |
| `/en/legal-notice/` | 233 | 93 | 0 | redirect: `/en/impressum/` |
| `/en/loreal-perfume-prada-paradoxe/` | 116 | 46 | 4 | **UNGEKLÄRT** |
| `/en/marriage-proposal-she-said-yes-🤍/` | 4 | 0 | 0 | **UNGEKLÄRT** |
| `/en/marriage-proposal-she-said-yes/` | 40 | 13 | 0 | **UNGEKLÄRT** |
| `/en/movie-park-germany-christmas/` | 130 | 59 | 7 | **UNGEKLÄRT** |
| `/en/musical-teaser-bokkenrijders/` | 69 | 17 | 0 | redirect: `/en/musikalischer-teaser-bokkenrijders/` |
| `/en/netherlands-fireworks-ban-impact-on-new-years-celebrations-2026-new/` | 230 | 90 | 23 | **UNGEKLÄRT** |
| `/en/netherlands-fireworks-ban/` | 41 | 15 | 3 | **UNGEKLÄRT** |
| `/en/nfl-announcement-munich/` | 130 | 43 | 7 | **UNGEKLÄRT** |
| `/en/nfl-announcement-of-the-home-team-in-munich/` | 76 | 37 | 0 | **UNGEKLÄRT** |
| `/en/portfolio/` | 22 | 0 | 0 | redirect: `/en/projekte/` |
| `/en/post-test/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/en/powerpoint-in-the-year-2024-drone-show-for-the-speech-by-the-ceo-of-siemens-mobility/` | 130 | 58 | 2 | **UNGEKLÄRT** |
| `/en/preise/` | 518 | 34 | 0 | redirect: `/en/drohnenshow-preise/` |
| `/en/preise2/` | 239 | 12 | 0 | redirect: `/en/drohnenshow-preise/` |
| `/en/preise3/` | 1433 | 174 | 0 | redirect: `/en/drohnenshow-preise/` |
| `/en/prices/` | 5142 | 824 | 29 | redirect: `/en/drohnenshow-preise/` |
| `/en/privacy-policy/` | 250 | 104 | 0 | redirect: `/en/datenschutz/` |
| `/en/projects/` | 964 | 164 | 9 | redirect: `/en/projekte/` |
| `/en/puma-bundesliga-2/` | 75 | 24 | 0 | redirect: `/en/puma-bundesliga/` |
| `/en/siemens-mobility-2/` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/en/sonnemondsterne-electro-festival/` | 115 | 52 | 3 | **UNGEKLÄRT** |
| `/en/special-wedding-surprise-for-the-bride-groom-and-all-their-guests/` | 90 | 40 | 1 | **UNGEKLÄRT** |
| `/en/spotify-luciano-x-apache-207-2/` | 48 | 11 | 0 | **UNGEKLÄRT** |
| `/en/spring-festival-special/` | 37 | 8 | 0 | **UNGEKLÄRT** |
| `/en/tag/100-drones/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/en/tag/150-drones/` | 6 | 3 | 0 | **UNGEKLÄRT** |
| `/en/tag/200-drones/` | 4 | 2 | 0 | **UNGEKLÄRT** |
| `/en/tag/220-drones/` | 6 | 3 | 0 | **UNGEKLÄRT** |
| `/en/tag/250-drones/` | 4 | 2 | 0 | **UNGEKLÄRT** |
| `/en/tag/350-drones/` | 6 | 3 | 0 | **UNGEKLÄRT** |
| `/en/tag/400-drones/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/en/tag/600-drones/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/en/thank-you/` | 208 | 40 | 0 | redirect: `/en/danke/` |
| `/en/wedding-show/` | 1 | 0 | 0 | **UNGEKLÄRT** |
| `/en/why-us/` | 126 | 25 | 4 | **UNGEKLÄRT** |
| `/erste-drohnen-show-auf-dem-elektrofestival-sonnemondsterne/` | 20 | 4 | 0 | **UNGEKLÄRT** |
| `/exploring-reinvented-der-neue-ford-explorer/` | 100 | 11 | 0 | retained: `/exploring-reinvented-der-neue-ford-explorer/` |
| `/extraschicht-duisburg/` | 48 | 8 | 0 | **UNGEKLÄRT** |
| `/ford-drohnenshow/` | 26 | 3 | 0 | redirect: `/exploring-reinvented-der-neue-ford-explorer/` |
| `/fruehlingsfest-special/` | 107 | 9 | 0 | **UNGEKLÄRT** |
| `/heiratsantrag-sie-hat-ja-gesagt-🤍/` | 4 | 0 | 0 | **UNGEKLÄRT** |
| `/heiratsantrag-sie-hat-ja-gesagt/` | 124 | 8 | 0 | **UNGEKLÄRT** |
| `/hello-world-302902/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/hello-world-3350/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/hello-world-825186/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/help/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/hilfe/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/historia-y-evolucion-de-elmiron-en-la-farmacia-gil-vela/` | 3 | 2 | 0 | **UNGEKLÄRT** |
| `/hochzeit-drohnenshow/` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/hochzeit/` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/hochzeiten/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/hochzeitsshow/` | 30 | 6 | 0 | **UNGEKLÄRT** |
| `/impressionen/` | 3001 | 157 | 0 | redirect: `/projekte/` |
| `/impressum/` | 2438 | 348 | 41 | retained: `/impressum/` |
| `/indoor-drohnenshows/` | 1 | 0 | 0 | **UNGEKLÄRT** |
| `/indoor-drone-shows/` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/ki-test/` | 4 | 1 | 0 | **UNGEKLÄRT** |
| `/kontakt ; Angebot s. hier/` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/kontakt ; angefragt/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/kontakt/` | 4567 | 239 | 15 | retained: `/kontakt/` |
| `/landingpage-hochzeit/` | 54 | 7 | 0 | **UNGEKLÄRT** |
| `/landingpage-marketing/` | 152 | 6 | 0 | **UNGEKLÄRT** |
| `/llms.text` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/llms.txt` | 4 | 0 | 0 | **UNGEKLÄRT** |
| `/login.php` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/loreal-prada-paradoxe/` | 296 | 61 | 28 | **UNGEKLÄRT** |
| `/movie-parks-germany-christmas/` | 148 | 36 | 19 | **UNGEKLÄRT** |
| `/musikalischer-teaser-bokkenrijders/` | 91 | 8 | 0 | retained: `/musikalischer-teaser-bokkenrijders/` |
| `/neue-preisseite/` | 31 | 5 | 0 | redirect: `/drohnenshow-preise/` |
| `/nfl-announcement-des-hometeams-in-munchen/` | 52 | 7 | 0 | **UNGEKLÄRT** |
| `/nfl-announcement-muenchen/` | 394 | 48 | 1 | **UNGEKLÄRT** |
| `/niederlande-feuerwerk-verbot-auswirkungen-auf-silvesterfeiern-2026/` | 4 | 0 | 0 | **UNGEKLÄRT** |
| `/niederlande-feuerwerk-verbot/` | 1355 | 581 | 598 | **UNGEKLÄRT** |
| `/nl/` | 79 | 5 | 0 | retained: `/nl/` |
| `/nl/algemene-voorwaarden/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/nl/bedankt/` | 2 | 0 | 0 | redirect: `/nl/danke/` |
| `/nl/blog-2/` | 4 | 0 | 0 | redirect: `/nl/blog/` |
| `/nl/blog-nl/` | 6 | 2 | 0 | redirect: `/nl/blog/` |
| `/nl/contact-2/` | 12 | 0 | 0 | redirect: `/nl/kontakt/` |
| `/nl/contact-nl/` | 16 | 1 | 0 | redirect: `/nl/kontakt/` |
| `/nl/droneshows-binnenshuis/` | 14 | 1 | 0 | **UNGEKLÄRT** |
| `/nl/juridische-kennisgeving/` | 4 | 1 | 0 | redirect: `/nl/impressum/` |
| `/nl/prijzen/` | 22 | 1 | 0 | redirect: `/nl/drohnenshow-preise/` |
| `/nl/projecten/` | 8 | 1 | 0 | redirect: `/nl/projekte/` |
| `/nl/reclame-via-droneshows/` | 12 | 2 | 0 | **UNGEKLÄRT** |
| `/nl/waarom-wij/` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/pagead/aclk/` | 1 | 1 | 0 | **UNGEKLÄRT** |
| `/portfolio/` | 3 | 0 | 0 | redirect: `/projekte/` |
| `/post/drohnen-corgi-f%C3%BCr-die-queen/` | 3 | 0 | 0 | **UNGEKLÄRT** |
| `/post/fanliebe-spannende-stranger-things-und-ghostbusters-show-zu-halloween-in-den-usa/` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/powerpoint-im-jahr-2024-drohnenshow-zur-ansprache-des-ceos-von-siemens-mobility/` | 119 | 26 | 7 | **UNGEKLÄRT** |
| `/preise-neu/` | 13 | 6 | 0 | redirect: `/drohnenshow-preise/` |
| `/preise/` | 13497 | 2793 | 10 | redirect: `/drohnenshow-preise/` |
| `/preise2/` | 505 | 32 | 0 | redirect: `/drohnenshow-preise/` |
| `/preise3/` | 1732 | 301 | 0 | redirect: `/drohnenshow-preise/` |
| `/pricing/` | 2 | 1 | 0 | redirect: `/drohnenshow-preise/` |
| `/program-a-drone-show-process-and-costs/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/projects/` | 109 | 6 | 0 | redirect: `/projekte/` |
| `/projekte/` | 5868 | 351 | 59 | retained: `/projekte/` |
| `/projekte/100-drohnen-für-puma-zum-anstoß-eines-bundesliga-derbys/` | 63 | 2 | 0 | redirect: `/puma-bundesliga/` |
| `/projekte/100-jähriges-westfalen-ag-/` | 59 | 1 | 0 | **UNGEKLÄRT** |
| `/projekte/abschluss-highlight-des-movie-parks-germany-zum-hollywood-christmas/` | 43 | 1 | 0 | **UNGEKLÄRT** |
| `/projekte/deutsche-umwelthilfe-f%c3%bcr-die-kampagne-/` | 6 | 1 | 0 | **UNGEKLÄRT** |
| `/projekte/deutsche-umwelthilfe-für-die-kampagne-/` | 38 | 0 | 0 | **UNGEKLÄRT** |
| `/projekte/erste-drohnen-show-auf-dem-elektrofestival-sonnemondsterne/` | 36 | 1 | 0 | **UNGEKLÄRT** |
| `/projekte/influencer-event-von-l’oréal-für-das-parfüm-prada-paradoxe-mitten-in-düsseldorf/` | 104 | 3 | 0 | **UNGEKLÄRT** |
| `/projekte/nfl-announcement-des-hometeams-in-münchen-/` | 230 | 8 | 0 | **UNGEKLÄRT** |
| `/puma-bundesliga/` | 199 | 25 | 6 | retained: `/puma-bundesliga/` |
| `/sasalele/` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/siemens-mobility/` | 3 | 0 | 0 | **UNGEKLÄRT** |
| `/spotify-luciano-x-apache-207/` | 262 | 20 | 0 | **UNGEKLÄRT** |
| `/support/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/tag/100-drohnen/` | 6 | 3 | 0 | **UNGEKLÄRT** |
| `/tag/150-drohnen/` | 4 | 2 | 0 | **UNGEKLÄRT** |
| `/tag/200-drohnen/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/tag/220-drohnen/` | 4 | 2 | 0 | **UNGEKLÄRT** |
| `/tag/250-drohnen/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/tag/350-drohnen/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/tag/400-drohnen/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/tag/600-drohnen/` | 4 | 2 | 0 | **UNGEKLÄRT** |
| `/tag/automobile/` | 14 | 7 | 0 | **UNGEKLÄRT** |
| `/tag/berlin/` | 23 | 12 | 0 | **UNGEKLÄRT** |
| `/tag/bottrop/` | 24 | 12 | 0 | **UNGEKLÄRT** |
| `/tag/drohnen-show/` | 27 | 14 | 0 | **UNGEKLÄRT** |
| `/tag/drohnen-show/feed/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/tag/drohnenshow/` | 42 | 23 | 0 | **UNGEKLÄRT** |
| `/tag/duesseldorf/` | 18 | 9 | 0 | **UNGEKLÄRT** |
| `/tag/ebersdorf/` | 12 | 6 | 0 | **UNGEKLÄRT** |
| `/tag/koeln/` | 14 | 7 | 0 | **UNGEKLÄRT** |
| `/tag/loreal/` | 22 | 11 | 0 | **UNGEKLÄRT** |
| `/tag/moenchengladbach/` | 19 | 9 | 0 | **UNGEKLÄRT** |
| `/tag/moenchengladbach/feed/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/tag/muenchen/` | 19 | 10 | 0 | **UNGEKLÄRT** |
| `/tag/muenster/` | 26 | 13 | 0 | **UNGEKLÄRT** |
| `/tag/nfl/` | 25 | 13 | 0 | **UNGEKLÄRT** |
| `/tag/prada/` | 18 | 9 | 0 | **UNGEKLÄRT** |
| `/tag/puma/` | 11 | 6 | 0 | **UNGEKLÄRT** |
| `/tag/puma/feed/` | 2 | 1 | 0 | **UNGEKLÄRT** |
| `/tag/sports/` | 24 | 13 | 0 | **UNGEKLÄRT** |
| `/tag/westfalen/` | 24 | 12 | 0 | **UNGEKLÄRT** |
| `/team/` | 14 | 0 | 0 | **UNGEKLÄRT** |
| `/test/` | 3 | 0 | 0 | **UNGEKLÄRT** |
| `/tjbeOEENNfzMShv/` | 1 | 0 | 0 | **UNGEKLÄRT** |
| `/warum-wir/` | 422 | 32 | 4 | **UNGEKLÄRT** |
| `/was-kostet-drohnen-versicherung/` | 127 | 18 | 0 | **UNGEKLÄRT** |
| `/werbung/` | 4 | 0 | 0 | **UNGEKLÄRT** |
| `/wie-fundiert-eine-drohnenshow-drohne/` | 2 | 1 | 1 | **UNGEKLÄRT** |
| `/wie-funktichatg/` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/wie-funktioniert-drohnenshow-drohne/` | 938 | 326 | 84 | **UNGEKLÄRT** |
| `/wie-programmiert-man-drohnenshow/` | 0 | 0 | 1 | **UNGEKLÄRT** |
| `/wie-programmiert-man-eine-drohnenshow/` | 1956 | 761 | 742 | **UNGEKLÄRT** |
| `/wp-content/themes/hub/assets/vendors/bootstrap/js/bootstrap.bundle.min.js.map` | 2 | 0 | 0 | **UNGEKLÄRT** |
| `/wp-content/uploads/2022/12/drone-show-2.jpg` | 1 | 1 | 0 | **UNGEKLÄRT** |
| `/wp/` | 2 | 0 | 0 | **UNGEKLÄRT** |
