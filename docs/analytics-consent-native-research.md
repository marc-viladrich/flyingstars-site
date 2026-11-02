> Archiv des nativen Prototyps vor der Library-Umstellung. Technischer Betriebsstand und Abnahme: [analytics-consent.md](analytics-consent.md). Aussagen über fehlende IDs und den unverbundenen Formularadapter gelten nur für diesen historischen Stand.

# Analytics, Google Ads und Einwilligung für FlyingStars

Recherche- und Entscheidungsstand: **02.11.2026**. Ausgangspunkt ist die Site-Worktree auf `f8c2bad`. Diese Datei dokumentiert Primärquellen, die technische Entscheidung, den umgesetzten Prototyp und offene Freigaben. Die ausgeführten technischen Prüfungen stehen am Ende. Sie ist keine rechtliche Freigabe und kein Nachweis eines produktiven Google- oder Mailbetriebs. Keine `.env` wurde gelesen; keine echte Tracking-ID wurde konfiguriert.

## Empfehlung und konkreter Umfang

Für FlyingStars genügt zunächst direktes Google-Ads-Conversion-Tracking nach freiwilliger Marketingzustimmung im **Basic Consent Mode v2**. Kein Remarketing, `ad_personalization` bleibt immer `denied`. GA4 ist optional und braucht einen benannten fachlichen Nutzen, etwa eine tatsächlich betreute Auswertung von Anfragewegen. Für allgemeine Website-Statistik ist optional Plausible mit EU-Betrieb die passendere, einfachere Alternative. Dessen konkrete Konfiguration muss separat rechtlich geprüft werden. Cookielos bedeutet nicht automatisch einwilligungsfrei.

Der Prototyp verwendet eine kleine eigene Oberfläche mit nativem `<dialog>`, ohne CMP-Paket. Sie sieht ausschließlich `PUBLIC_GA_ID`, `PUBLIC_GOOGLE_ADS_ID` und `PUBLIC_GOOGLE_ADS_LABEL` sowie die getrennten Kategorien `analytics` und `ads` vor. **Es gibt keinen GTM-Loader und keine `PUBLIC_GTM_ID`-Unterstützung.** GTM bleibt eine spätere Architekturentscheidung mit eigener Prüfung und Container-Verantwortung.

Der Conversion-Adapter hört auf `flyingstars:lead-confirmed` mit einer UUID in `detail.requestId`. Er sendet nur bei gültiger Ads-ID, Conversion-Label und aktueller Ads-Einwilligung. Er dedupliziert innerhalb des Dokuments und übergibt `transaction_id`. Er ist bewusst **nicht mit dem Kontaktformular verbunden**. Ohne diese spätere Verbindung gibt es keine echte Formular-Conversion. Die Referenz für die direkte Kombination aus Google-Tag und Conversion-Ereignis ist [Googles Ads-Dokumentation](https://support.google.com/google-ads/answer/7548399?hl=en); die Entscheidung gegen Remarketing ist projektspezifisch.

## Warum die Messung zuerst repariert werden muss

Drei lokale Unterlagen wurden vor der Recherche gelesen:

- [Tracking-/Consent-Check vom August 2026](</Users/marcviladrich/Freelance/AI & Automation/Claude Code Prep/freelance/clients/flyingstars/01-vorbereitung-2026-08/flyingstars-consent-check.md>). Er dokumentiert die Prüfung von GA-/Ads-Messanfragen vor der Bannerentscheidung und fehlende erkennbare Consent-Mode-Integration. Die damalige Konfiguration wird als Bestandsbefund behandelt; sie wurde hier nicht erneut live vermessen. Ein geladenes Skript allein ist kein Beweis für eine bestimmte Messung oder einen Rechtsverstoß.
- [Interne Strategienotiz vom 28./29.09.2026](</Users/marcviladrich/Freelance/AI & Automation/Claude Code Prep/freelance/clients/flyingstars/03-datenbriefing-2026-09/flyingstars-interne-strategienotiz-2026-09-28.md>). GA4 erzeugte `generate_lead` bereits bei `page_view` auf `/kontakt*`. Die 4.474 historischen Key Events waren damit keine nachgewiesenen Formularsendungen. EN/NL hatten zugleich andere Kontaktpfade. Ein Kontaktseitenaufruf darf als Diagnoseereignis bestehen bleiben, aber nicht als Lead gelten.
- [Fragebogen-/SEA-Audit-Einordnung vom 30.10.2026](</Users/marcviladrich/Freelance/AI & Automation/Claude Code Prep/freelance/clients/flyingstars/16-fragebogen-und-elevate-2026-10-30/README.md>). Für 01.01.–28.10.2026 nennt sie 15.574 € Ads-Ausgaben und 124 nominelle Conversions. Die Ads-Conversion zählte den Danke-Seitenaufruf. Daraus folgen weder 124 echte Anfragen noch ein belastbarer CPA pro Anfrage. Die zugrunde liegende Audit-PDF wurde im Implementierungsauftrag zusätzlich per Textextraktion gelesen; sie verlangt die Prüfung der korrekten Conversion-Auslösung.

Priorität hat deshalb der Nachweis des tatsächlichen Versands in allen Sprachen. Vor einer Umstellung muss die Ads-Fachperson feststellen, welche Aktion aktuell primär ist, ob ein GA4-Import und eine Website-Conversion parallel zählen und worauf die Gebote optimieren. Die alte Zeitreihe erhält eine dokumentierte Messgrenze; sie wird nicht rückwirkend in echte Leads umgedeutet. Google beschreibt [`generate_lead`](https://developers.google.com/tag-platform/gtagjs/reference/events#generate_lead) als Lead-Ereignis, nicht als beliebigen Kontaktseitenbesuch.

## Rechtliche Ebenen getrennt prüfen

### Endeinrichtung und personenbezogene Daten

§ 25 TDDDG betrifft das Speichern und Auslesen von Informationen auf Endgeräten, unabhängig vom Personenbezug. Ausnahmen gelten insbesondere für die Übertragung einer Nachricht und unbedingt erforderliche Vorgänge für einen ausdrücklich gewünschten Dienst. Das betrifft auch vergleichbare Speichertechniken wie `localStorage`; ein anderer Speichername schafft keine Ausnahme. Seit 14.05.2024 heißt das frühere TTDSG TDDDG. Quellen: [§ 25 im Gesetzestext](https://www.gesetze-im-internet.de/ttdsg/__25.html), [LfD Niedersachsen zur Umbenennung](https://www.lfd.niedersachsen.de/startseite/infothek/faqs_zur_ds_gvo/faq-telekommunikation-digitale-dienste-datenschutzgesetz-tdddg-206449.html).

Die anschließende Verarbeitung personenbezogener Daten braucht zusätzlich eine Rechtsgrundlage nach Art. 6 DSGVO. Für das hier gewählte Google-Tracking ist Art. 6 Abs. 1 lit. a die vorgesehene Grundlage. Art. 7 verlangt unter anderem Nachweisbarkeit und einen ebenso einfachen Widerruf wie die Erteilung. Einwilligung muss freiwillig, informiert, zweckbezogen und eindeutig sein; Scrollen, vorangekreuzte Optionen oder die Benutzung des Formulars ersetzen sie nicht. Quellen: [DSGVO, insbesondere Art. 4 Nr. 11, 6 und 7](https://eur-lex.europa.eu/eli/reg/2016/679/oj), [EDPB-Leitlinien 05/2020, Version 1.1, Abschnitte 3 und 5](https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf). Der EUR-Lex-Volltext war beim Abruf durch eine JavaScript-Prüfung geschützt; die EDPB-Leitlinien wurden gelesen.

Die [DSK-Orientierungshilfe Digitale Dienste, Version 1.2, November 2024](https://www.datenschutzkonferenz-online.de/media/oh/OH_Digitale_Dienste.pdf) trennt beide Ebenen und konkretisiert Banner, Ablehnung und Widerruf. Daraus abgeleitete Projektvorgabe: Ablehnen und Zustimmen auf der ersten Ebene gleich leicht erreichbar, keine Vorauswahl, einzelne Zwecke auswählbar, dauerhafter Zugang zu Einstellungen. Das Formular funktioniert unabhängig von Trackingzustimmung. Die Speicherdauer einer Entscheidung muss begründet werden; **180 Tage sind unsere Konfiguration, keine gesetzliche Universallaufzeit**.

Die [DSK-Hinweise zu Google Analytics vom 12.05.2020](https://www.datenschutzkonferenz-online.de/media/dskb/20200526_beschluss_hinweise_zum_einsatz_von_google_analytics.pdf) verlangen für die damalige Standardverwendung eine Einwilligung und Transparenz. Ihr ausdrücklicher Bezug auf die Einstellungen vom März 2020 ist relevant: Das Papier ist keine aktuelle GA4-Freigabe, kein vollständiger Vergleich heutiger Google-Verträge und kein Beleg für die heutige Drittlandlage. Für diese Fragen sind die neueren Dokumente und die konkrete Konfiguration maßgeblich.

### Schrems II und der heutige DPF-Status

Der EuGH erklärte am 16.07.2020 in **C-311/18, Schrems II**, den Privacy Shield für ungültig. Standardvertragsklauseln wurden nicht pauschal aufgehoben; ihre Tragfähigkeit hängt auch vom tatsächlichen Schutzniveau und erforderlichen ergänzenden Maßnahmen ab. Quelle: [Urteil, insbesondere Tenor und Rn. 126 ff.](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=celex%3A62018CJ0311).

Der spätere [Angemessenheitsbeschluss EU 2023/1795 zum EU-US Data Privacy Framework](https://eur-lex.europa.eu/eli/dec_impl/2023/1795/oj) ist ein eigener Mechanismus nach Art. 45 DSGVO für erfasste Übermittlungen an teilnehmende US-Organisationen. Am 03.09.2025 wies das EuG die Nichtigkeitsklage **T-553/23, Latombe/Kommission**, ab. Es bewertete die Lage beim Erlass des Beschlusses. Quelle: [Gerichtliche Mitteilung zum Urteil](https://curia.europa.eu/site/upload/docs/application/pdf/2025-09/cp250106en.pdf).

Dagegen wurde am 31.10.2025 das Rechtsmittel **C-703/25 P** eingelegt. Das [Amtsblatt dokumentiert das Rechtsmittel](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX%3A62025CN0703); das [CURIA-Verfahrensregister](https://juris.curia.europa.eu/juris/liste.jsf?language=en&num=C-703%2F25) führt es beim Abruf als laufend. Zum Stichtag ist in diesen Primärquellen keine abschließende Rechtsmittelentscheidung belegt. Eine künftige Bestätigung oder Aufhebung wird hier nicht behauptet.

Der amtliche [DPF-Eintrag für Google LLC, Teilnehmer 5780](https://www.dataprivacyframework.gov/participant/5780%20) wird im auslesbaren Suchindex als **EU-US DPF: Active**, einschließlich Non-HR-Daten, geführt. Auch [Google nennt seine Zertifizierung und den Geltungsbereich](https://policies.google.com/privacy/frameworks?hl=en). Grenze der Prüfung: Die unmittelbar geöffnete Register-App lieferte nur einen JavaScript-Hinweis. Der Status wurde über den indexierten amtlichen Eintrag und Googles Erklärung abgeglichen, nicht als signierter Registerauszug gesichert. Vor Produktionsfreigabe den dann aktuellen Eintrag samt erfasstem Empfänger und Verarbeitung dokumentieren.

Der DPF ersetzt weder eine erforderliche Einwilligung noch Informationspflichten oder passende Verträge. Aus Schrems II folgt heute kein pauschales Google-Verbot; aus dem DPF folgt keine dauerhafte Garantie für jede Google-Verarbeitung. Auch EU-Erfassung und das Verwerfen von IP-Adressen machen GA4 nicht zu einem ausschließlich europäischen Dienst: [Google beschreibt die anschließende Weiterleitung zur Verarbeitung selbst](https://support.google.com/analytics/answer/12017362?hl=en).

## Consent Mode v2, Basic und Advanced

Seit März 2024 verlangt Google für einschlägige EWR-Werbefunktionen die Übermittlung von Zustimmungssignalen. Betroffen sind insbesondere Personalisierung und Remarketing; aktuelle Produktvorgaben beziehen auch die entsprechenden Mess-Tags ein. Das sind Google-Produkt- und Vertragsanforderungen. TDDDG und DSGVO schreiben nicht die Nutzung eines Produkts namens Consent Mode vor. Quelle: [Google zu EWR-Änderungen und betroffenen Funktionen](https://support.google.com/google-ads/answer/14625550?hl=en), [EU User Consent Policy](https://www.google.com/about/company/user-consent-policy/).

Google unterscheidet [zwei technische Varianten](https://developers.google.com/tag-platform/security/concepts/consent-mode):

| Variante | Verhalten ohne Zustimmung | Einordnung für FlyingStars |
| --- | --- | --- |
| Basic | Tags bleiben blockiert; ohne Zustimmung gehen auch keine Consent-Pings an Google. | Gewählt. Weniger Daten und keine vorgezogenen Google-Messanfragen. |
| Advanced | Tags laden schon mit abgelehnten Speichersignalen und können cookielose Mess-/Consent-Pings senden. | Nicht vorgesehen. Zusätzliche Datenübermittlung braucht eine eigene rechtliche Bewertung. |

Consent Mode zeigt kein Banner an und beschafft selbst keine Einwilligung. `denied` allein blockiert bei bereits geladenen Google-Tags nicht jede Datenübertragung. Eine Wartezeit wie `wait_for_update` ist ebenfalls keine Zustimmung. Grundlage der projektspezifischen Steuerung ist [Googles Implementierungsanleitung](https://developers.google.com/tag-platform/security/guides/consent).

Die Zuordnung lautet:

| Entscheidung | `analytics_storage` | `ad_storage` | `ad_user_data` | `ad_personalization` |
| --- | --- | --- | --- | --- |
| Anfang, abgelehnt, abgelaufen oder ungültig | denied | denied | denied | denied |
| Nur Statistik | granted | denied | denied | denied |
| Nur Anzeigen-Erfolgsmessung | denied | granted | granted | denied |
| Beide Kategorien | granted | granted | granted | denied |

`analytics_storage` betrifft Analysespeicher, `ad_storage` Werbespeicher, `ad_user_data` die Nutzung bzw. Übermittlung von Daten für Werbezwecke und `ad_personalization` personalisierte Werbung. Die vier Signale sind keine Vorschrift für vier identische Banner-Schalter. Die projektspezifische Bündelung von `ad_storage` und `ad_user_data` muss denselben verständlich beschriebenen Zweck der Ads-Erfolgsmessung abdecken. Es gibt hier keinen angebotenen Personalisierungszweck und deshalb keinen dritten Schalter. [Google definiert die Signaltypen](https://developers.google.com/tag-platform/security/concepts/consent-mode).

### TCF und zertifizierte CMPs

Eine Firmenwebsite mit eigener Ads-Conversion-Messung braucht nicht generell das IAB Transparency and Consent Framework. Googles Pflicht zu einer zertifizierten, TCF-integrierten CMP für personalisierte Anzeigenauslieferung betrifft insbesondere Publisher mit **AdSense, Ad Manager oder AdMob**. FlyingStars kauft Anzeigen ein und betreibt hier keine solche Publisher-Vermarktung. Die [Google-Publisher-Vorgaben](https://support.google.com/adsense/answer/13554116?hl=en) grenzen Advertiser ausdrücklich ab. Die eigene Consent-Lösung wird damit weder TCF-zertifiziert noch von Google rechtlich geprüft. Bei späterer Publisher-Nutzung neu entscheiden.

## Geprüfte Open-Source- und Astro-Optionen

Es wurde nichts installiert. Die Prüfung nutzte npm-Registry-Metadaten, veröffentlichte Tarballs im Arbeitsspeicher sowie GitHub-Lizenz, Commit-Historie und Dokumentation. Stabile Versionen wurden auf Veröffentlichungen bis einschließlich 02.11.2026 begrenzt. Ein aktueller Commit belegt Aktivität, aber keine garantierte künftige Pflege.

| Option | Version und Pflegebefund | Lizenz, Größe und Abhängigkeiten | a11y, Sprache und Consent Mode |
| --- | --- | --- | --- |
| `vanilla-cookieconsent` | **3.2.1**, npm 30.10.2026; letzter ermittelter GitHub-Commit ebenfalls 30.10.2026. | MIT; keine npm-Laufzeitabhängigkeiten. ESM-JS 24.052 B, gzip 10.512 B; Standard-CSS 32.051 B, gzip 5.394 B. | Quellcode enthält Dialogrollen, ARIA-Beschriftung, Fokus-/Tab-Steuerung und Escape-Behandlung. Mehrsprachigkeit mit eigener Textkonfiguration. Vier Consent-v2-Signale über explizite Callbacks/Zuordnung, keine automatische Rechtsfreigabe. |
| `klaro` | **0.7.21**, npm 26.03.2024; letzter ermittelter GitHub-Commit 27.03.2025. Repo beim Abruf nicht archiviert. Deutlich längere Releasepause. | BSD-3-Clause laut tatsächlicher LICENSE und npm. `dist/klaro.js` 235.933 B, gzip 68.904 B, einschließlich eingebetteter Styles/Übersetzungen. Paket deklariert auch Babel-Parser, Sass und webpack-merge als dependencies. | Mehrsprachige Texte einschließlich DE/EN/NL. Notice-Quellcode enthält Dialogrolle und ARIA-Verweise. Offizieller GTM-Leitfaden behandelt alle vier v2-Signale. Eigene Konfiguration und Prüfung erforderlich. |
| `@jop-software/astro-cookieconsent` | **3.0.1**, npm 24.10.2024; letzter ermittelter Commit am selben Tag. | **GPL-3.0-or-later**, nicht MIT. Wrapper 41.076 B entpackt; ESM-Integrationsdatei 428 B. `vanilla-cookieconsent ^3.0.0` ist zusätzliche Peer-Abhängigkeit. | Übernimmt vieles von CookieConsent. README warnt, dass JS-Callbacks in der Konfiguration nicht unterstützt werden. Deshalb keine fertige Lösung für die hier benötigte präzise v2-Steuerung. |
| `astro-cookie-consent` von Leevi Kopakkala | **1.0.0**, npm 21.10.2026; letzter ermittelter Commit 21.10.2026 mit v2-Erweiterung. Sehr junge Version, kurze Pflegehistorie. | MIT, keine dependencies, Peer `astro >=4.0.0`. Paket 66.870 B entpackt; die `.astro`-Bannerquelle 17.076 B. Kein gemessener fertiger Browser-Bundlewert. | Kategorien, prop-basierte Texte und `ConsentMode`-Komponente dokumentiert; native Checkboxen mit Labels und sichtbarer Fokusgestaltung im Quellcode. Standardmapping erlaubt auch Personalisierung und Standardablauf ist 365 Tage: beides müsste geändert werden. |

Primärquellen pro Paket:

- CookieConsent: [npm-Metadaten einschließlich Veröffentlichungszeiten](https://registry.npmjs.org/vanilla-cookieconsent), [geprüfter Tarball 3.2.1](https://registry.npmjs.org/vanilla-cookieconsent/-/vanilla-cookieconsent-3.2.1.tgz), [GitHub-Stand](https://github.com/orestbida/cookieconsent/commit/945d619145327a316e9bfb6e17d7b2efb0346e04), [v2-Signalzuordnung im offiziellen Leitfaden](https://cookieconsent.orestbida.com/advanced/google-consent-mode.html).
- Klaro: [npm-Metadaten](https://registry.npmjs.org/klaro), [Tarball 0.7.21](https://registry.npmjs.org/klaro/-/klaro-0.7.21.tgz), [GitHub-Lizenz am geprüften Stand](https://github.com/kiprotect/klaro/blob/db9f1aca906a392990c58c58475366a091012ea7/LICENSE), [offizieller Consent-v2-Leitfaden](https://klaro.org/docs/tutorials/google_tag_manager).
- JOP: [npm-Metadaten](https://registry.npmjs.org/@jop-software%2Fastro-cookieconsent), [Tarball 3.0.1](https://registry.npmjs.org/@jop-software/astro-cookieconsent/-/astro-cookieconsent-3.0.1.tgz), [README am geprüften Stand](https://github.com/jop-software/astro-cookieconsent/tree/79f3db6f8e2db8e568a68df59a46f7a164d102cb).
- Leevi: [npm-Metadaten](https://registry.npmjs.org/astro-cookie-consent), [Tarball 1.0.0](https://registry.npmjs.org/astro-cookie-consent/-/astro-cookie-consent-1.0.0.tgz), [Quellcode und README am geprüften Stand](https://github.com/LeeviKopakkala/astro-cookie-consent/tree/48fd7ebe3f035b1197574af5a1ecb804647cb413).

Die gzip-Werte wurden über die genannten Dateien mit Python `gzip.compress`, Stufe 9 und `mtime=0`, berechnet. Das sind reproduzierbare Artefaktgrößen, keine Netzwerkmessung der Site. Entpackte Paketgröße, Astro-Quellgröße und ausgeliefertes Browser-JavaScript sind verschiedene Größen. Bei Klaro steht deshalb der tatsächlich gemessene Distributionswert statt einer älteren README-Angabe von 57 kB.

Keine der Oberflächen wurde in dieser Recherche mit Screenreader oder Tastatur praktisch auditiert. ARIA im Quellcode ist ein Indiz, kein WCAG-Nachweis. Für jede Lösung wären Reihenfolge und Rückgabe des Fokus, alle Bedienelemente per Tastatur, Zoom/Reflow, Kontraste und übersetzte zugängliche Namen zu testen.

Unter den externen Bibliotheken wäre CookieConsent die erste Wahl. Seine [eigene Einführung](https://cookieconsent.orestbida.com/essential/introduction.html) nennt ausdrücklich fehlende zentrale Consent Records und fehlendes TCF. Für zwei fest definierte Zwecke rechtfertigt das zusätzliche Paket derzeit keinen Wechsel vom gewählten Eigenbau. Dessen Wartung und rechtliche Nachweisführung bleiben allerdings unsere Verantwortung.

## Usercentrics und Cookiebot

Beide bieten gehostete Consent-Verwaltung mit Scan-, Sprach- und Google-Integration. Cookiebot ist ebenfalls ein Usercentrics-Produkt. Der Nutzen liegt für dieses Projekt vor allem in verwalteter Dienstinventur und Consent-Verwaltung; ein Anbieterbanner ersetzt weder die fachliche Tag-Prüfung noch eine wirksame Einwilligung. [Usercentrics-Funktionsvergleich](https://usercentrics.com/pricing/), [Cookiebot-Funktionsvergleich](https://www.cookiebot.com/de/pricing/).

| Angebot | Beim Abruf genannter Einstieg | Bedingungen und Einordnung |
| --- | --- | --- |
| Usercentrics Web CMP Essential | 7 €/Monat bis 1.500 Sessions/Monat | 1 Domain, 2 Bannersprachen, 1 Datenschutzregelwerk, unbegrenzte Unterseiten. Für DE/EN/NL reichen zwei Sprachen nicht. |
| Usercentrics Web CMP Plus | 15 €/Monat bis 3.000 Sessions/Monat | 1 Domain, 5 Bannersprachen. Essential/Plus laut FAQ monatlich abgerechnet; Sessionbedarf und Steuerbehandlung vor Bestellung bestätigen. [Primärquelle](https://usercentrics.com/pricing/). |
| Cookiebot Free / Premium Lite | Free bei einer kleinen Domain ohne Premium-Funktionen; Lite 7 €/Monat/Domain | Preisseite nennt bis 50 Unterseiten, FAQ teils weniger als 50. Am Grenzwert vor Bestellung bestätigen. Lite nur für eine Domain. |
| Cookiebot Premium | Small 15 €, Medium 30 €, Large 50 €, XLarge 90 € pro Monat/Domain | Karten nennen bis 350 / 3.500 / 7.000 / über 7.000 Unterseiten. Small ist laut FAQ an mindestens vier Domains gebunden; für ein bis drei Domains kann selbst eine kleine Domain in Medium fallen. Höchster Scan-Seitenstand und weitere Subdomains beeinflussen die Rechnung. EUR, ggf. zuzüglich MwSt. [Primärquelle mit Tarif-FAQ](https://www.cookiebot.com/de/pricing/). |

Das sind abgelesene Listenangaben, kein Angebot für FlyingStars. Die Seite enthält unterschiedliche Sprach-/Währungsansichten sowie Monats-/Jahresumschalter. Vor Beauftragung Tarif, Zahlweise, Limits und Laufzeit schriftlich festhalten. Nicht mit einem einzelnen „ab 7 €“-Preis kalkulieren, bevor Sprachumfang, Seitenzahl nach Migration und Traffic geklärt sind. Eine unabhängige Messung der SDK-Größe oder der Barrierefreiheit dieser SaaS-Oberflächen war nicht Teil dieser Recherche.

## Allgemeine Analytics mit EU-Betrieb

| Option | Eignung und Datenstandort | Preisbefund aus Primärquelle |
| --- | --- | --- |
| Plausible | Empfehlung für die optionale allgemeine Statistik. Anbieter beschreibt EU-Betrieb ohne Cookies oder persistente Browserkennung. IP und User-Agent werden zur Verarbeitung und Bildung täglich wechselnder Kennungen benutzt, nicht einfach gar nicht verarbeitet. [Datenbeschreibung](https://plausible.io/data-policy), [AVV/DPA](https://plausible.io/dpa). | Starter bei 10.000 monatlichen Pageviews und einer Site: 9 USD monatlich oder 90 USD jährlich laut Preislogik des Seitenquelltexts, entsprechend 7,50 USD/Monat bei Vorauszahlung. Custom Events sind enthalten und zählen zum abrechenbaren Volumen. Währung wird lokalisiert; Steuer und Endpreis im Checkout prüfen. [Preisquelle](https://plausible.io/#pricing). |
| Matomo | Umfangreicher; EU-Selfhosting erlaubt eigene Betriebsentscheidung. Matomo Cloud speichert in Frankfurt, Backups Dublin, Anbieter InnoCraft sitzt in Neuseeland und nennt weitere Unterauftragsverarbeiter. EU-Speicherung ist daher keine Zusage ausschließlich europäischer Beteiligter. [Cloud-AVV](https://matomo.org/matomo-cloud-dpa/), [Unterauftragsverarbeiter](https://matomo.org/matomo-cloud-dpa/subprocessors/). Cookies, IP-Anonymisierung, Aufbewahrung und Consent-Verhalten konfigurieren. | Die strukturierten Angebotsdaten der [Preisseite](https://matomo.org/pricing/#cloud-50-000) nennen für Cloud mit 50.000 Hits/Monat **22 EUR/Monat exkl. Steuer**. Gleichzeitig enthält das gerenderte HTML eine unklare 29-Anzeige. Deshalb 22 EUR nur als technischer Preisbefund, kein bestätigter Checkoutpreis. Jahresrabatt wird beworben; Zahlbetrag bestätigen. Community-Selfhosting ohne Lizenzentgelt, Infrastruktur/Wartung zusätzlich. |
| Umami | Schlanke Alternative, selbst in der EU hostbar. Cloud erlaubt US-/EU-Region bei Einrichtung. Das betrifft Analytics-Speicherung; CDN, Support, Sicherheits- und Betriebslogs können andere Regionen berühren. [Offizielle Cloud-FAQ](https://docs.umami.is/docs/cloud/faq). | Hobby 0 USD, 100.000 Events/Monat, eine Website, sechs Monate Datenhaltung; Pro 20 USD/Monat, eine Million Events, bis 20 Websites, zwei Jahre, weitere Events 0,00003 USD. Event-Daten und zusätzliche Session-Daten können ebenfalls Nutzung erzeugen. Monatliche/jährliche Abrechnung möglich. [Preise](https://umami.is/pricing), [Abrechnungsdefinition](https://docs.umami.is/docs/cloud/faq). |

Die genannten Hosting- und Datenschutzangaben sind Anbieterbeschreibungen, keine behördlichen Freistellungen. Für die konkret eingesetzte Version klären: Zugriffe auf Endgeräte, Personenbezug, Rechtsgrundlage, Zweckbegrenzung, Löschfristen, AVV und Unterauftragnehmer. Erst dann über einen Betrieb ohne Analyse-Einwilligung entscheiden. Bis zur Freigabe bleibt die Alternative deaktiviert oder wird von `analytics` abhängig gemacht. Google Ads braucht seine eigene Zustimmung unabhängig davon, ob die allgemeine Statistik später ohne Einwilligung betrieben werden darf.

Es wurde **kein Plausible-, Matomo- oder Umami-Skript implementiert**. Die jetzige Google-Bannerbedingung steuert diese hypothetischen Alternativen nicht automatisch. Ein späterer Anschluss braucht seine eigene Konfiguration und gegebenenfalls eine angepasste Bannerbedingung.

Die selbst betreibbaren Quellprojekte verwenden [Plausible AGPL v3](https://github.com/plausible/analytics/blob/master/LICENSE.md), [Matomo GPL v3 oder später](https://github.com/matomo-org/matomo/blob/5.x-dev/LEGALNOTICE) und [Umami MIT](https://github.com/umami-software/umami/blob/master/LICENSE). Cloud-Tarife und Community-Versionen sind hinsichtlich Funktionsumfang und Betrieb getrennt zu prüfen. Selfhosting spart keine Administration: Updates, Backups, Löschung, Absicherung und Verfügbarkeit bleiben eigene Aufgaben. Für eine kleine eigene EU-Instanz grob **10–40 €/Monat Infrastruktur** als Planungsannahme reservieren, zuzüglich Wartung; das ist kein recherchierter Providerpreis und keine belastbare sGTM-Produktionskalkulation. Für redundantes sGTM und stärkere Last separat anbieten lassen.

## Direktes GA4, GTM, Partytown und Server-Tagging

Direktes `gtag` reduziert bei zwei Diensten die zusätzliche Container-Konfiguration. GA4 ist für eine eigenständige Google-Ads-Conversion nicht technisch erforderlich. Der Vorteil von GTM wäre später eine von der Ads-Fachperson betreute Tag-Verwaltung. Dafür braucht FlyingStars Eigentum und Admin-Zugang, benannte Veröffentlichungsrechte, Versionierung, Freigabe und ein vollständiges Tag-Inventar. Eine spätere GTM-Einführung ersetzt den Direktbetrieb; parallele unkoordinierte Installationen drohen doppelt zu messen. **Das ist keine vorhandene Konfigurationsoption.**

Auch ein späterer GTM-Container dürfte nach dieser Basic-Entscheidung erst nach passender Zustimmung laden. Alle enthaltenen Tags müssten zusätzlich ihre jeweilige Kategorie prüfen; Googles eingebaute Consent-Prüfung kann sonst auf cookielose Pings ausweichen. Eine bloße Container-Einbindung ist keine Freigabe aller darin hinterlegten Dienste. [Google zur Tag-Steuerung und Basic/Advanced](https://developers.google.com/tag-platform/security/concepts/consent-mode).

[Astros Partytown-Integration](https://docs.astro.build/en/guides/integrations-guide/partytown/) verschiebt geeignete Skriptarbeit in einen Web Worker. Daraus folgt kein Wechsel der Rechtsgrundlage oder Empfänger. Für dieses Projekt wird sie nicht eingesetzt; zusätzliches Worker-/Proxy-Verhalten würde die ohnehin notwendige Consent-Prüfung erweitern.

Serverseitiges GTM über Stape Europe oder einen eigenen EU-Container kann Kontrolle über Filterung und Weiterleitung geben. Es ersetzt weder die vorgelagerte Einwilligung noch die Prüfung der nachgelagerten Google-Empfänger. [Google dokumentiert Consent-Verarbeitung auch für Server-Container](https://developers.google.com/tag-platform/tag-manager/server-side/consent-mode). Stape unterscheidet normalen GCP-Betrieb und Stape Europe mit europäischem Anbieter; [die eigene FAQ sagt ausdrücklich, dass EU-Hosting allein GA nicht konform macht](https://stape.io/helpdesk/knowledgebase/how-user-data-is-protected). Auch eine eigene Domain oder ein pseudonymisierender Proxy garantiert weder Anonymität noch den Ausschluss von US-Verarbeitung.

[Stapes Preisseite](https://stape.io/price) nennt im USD-Angebot Free bis 10.000 Requests und Pro bis 500.000 Requests: 20 USD bei Monatszahlung, ungefähr 17 USD/Monat bei Jahreszahlung. Die jährliche Anzeige ist gerundet. Das ist ein Hosting-Listenpreis, keine bestätigte Stape-Europe-Kalkulation. Einrichtung, Monitoring, AVV, Subprozessoren, Logdaten und Datenweiterleitung wären zusätzlich zu prüfen. Für den gegenwärtigen Umfang ist sGTM nicht empfohlen und nicht implementiert.

## Unverbindliche technische Aufwandsschätzung

Die folgenden Stundenrahmen sind **eigene technische Schätzungen, keine Anbieterpreise und keine Leistungszusage**. Sie dienen der Scope-Entscheidung. Sie beschreiben den Gesamtaufwand eines solchen Arbeitspakets ab seinem Start, nicht automatisch noch offene Stunden nach dieser Umsetzung. Bereits erledigte Arbeit muss vor einer Beauftragung abgezogen werden. Die Schätzung setzt vorhandene Zugänge, abgestimmte Zwecke und Texte, den bestehenden Astro-Stack sowie eine zeitnah erreichbare Ads-Fachperson voraus.

| Arbeitspaket | Einmaliger technischer Aufwand | Enthalten und abgegrenzt |
| --- | --- | --- |
| Consent-Basis mit direktem Google-Tag | **8–14 h** | Nativer Dialog, DE/EN/NL-Anbindung, Kategorien, gültige/ungültige Build-Konfiguration, Speicherung mit Ablauf und Version, Widerruf, minimierte explizite Seitenfelder, gezielte Browser-/a11y-Prüfung. Keine zentrale revisionsfeste Nachweisplattform. |
| Ads-UUID mit tatsächlichem Versand verbinden, einschließlich QA | **6–12 h zusätzlich** | Bestätigung erst nach Provider-Annahme, Honeypot und `not-configured` ausschließen, belastbare UUID, Wiederholungen/Doppel-Submit bedenken, Adapteranschluss, Fehler-/Timeouttests, echter Versand und Ads-Test mit Fachabnahme. Kein CRM-Abgleich und keine nachträgliche Offline-Conversion-Importstrecke. |
| Optional Plausible EU | **2–4 h zusätzlich** | Einrichtung, minimierter Anschluss, gegebenenfalls Analytics-Gating, Daten-/Zielprüfung und Test. Abo und rechtliche Bewertung zusätzlich. |
| Optional GA4 mit benanntem Analysebedarf | **3–6 h zusätzlich** | Konto-/Datenstromprüfung, sparsame Einstellungen, konkrete Ereignisdefinition und Payload-/Consent-QA. Keine vollständige Reporting- oder Attributionskonzeption. |
| Späterer Wechsel zu GTM | **8–16 h als eigenes Migrationspaket** | Ownership, Tag-Inventar, Ablösung des Direktbetriebs, Initialisierung erst nach Zustimmung, Trigger/Kategorien, Versionierung und Regressionstest. Aktuell nicht implementiert. Kein bloßer zusätzlicher Loader. |
| Später sGTM in der EU | **12–24 h zusätzlich zum abgestimmten Browser-Tracking** | Hosting-/Container-Einrichtung, Datenfluss, Consent-Weitergabe, Filterung, Fehler-/Deduplizierungsprüfung und Betriebseinweisung. Komplexe Anonymisierung, Multi-Domain-Setups oder neue Offline-Schnittstellen können darüber liegen. |

Für Consent-Basis plus echte Ads-Sendungsverbindung ergibt sich damit ein technischer Planungsrahmen von **14–26 Stunden insgesamt**. Das ist keine Restaufwandsmeldung und keine Kalkulation für sämtliche Leistungen eines Relaunches. GA4, Plausible und GTM sind bewusste Alternativ- bzw. Erweiterungsentscheidungen; ihre Zeiten nicht unbesehen alle addieren.

Für den laufenden technischen Betrieb grob einplanen:

| Betriebsumfang | Eigener monatlicher Planungsansatz |
| --- | --- |
| Consent-Basis und direkte Ads-Messung | **0,5–1,5 h/Monat** für stichprobenartige Consent-/Conversion-Kontrolle, Veränderungen an Bibliothek/Konto und kleine Korrekturen. |
| Plausible ergänzend | **0,25–0,5 h/Monat zusätzlich** für Volumen, Datenqualität und Konfigurationsänderungen. |
| GA4 ergänzend | **0,5–1 h/Monat zusätzlich** für automatische Erfassung, Verknüpfungen, Ereignisse und Datenqualität. |
| GTM-Betrieb anstelle direkter Tags | **1–2 h/Monat zusätzlich zur Consent-Kontrolle**, abhängig von Tag-Änderungen und Freigabeprozess. |
| sGTM-Betrieb | **1–3 h/Monat zusätzlich** für Logs, Weiterleitung, Updates, Verfügbarkeit und Kostenkontrolle. |

Monatswerte sind geglättete Budgets, keine zugesagte Reaktionszeit oder garantierte Höchstgrenze. Größere Anbieteränderungen, neue Zwecke/Sprachen, Consent-Textrevisionen und Fehlerfälle können ein eigenes Arbeitspaket auslösen. Kampagnenoptimierung, juristische Beratung, AVV-Verhandlung, zentrale Nachweisführung und laufende Marketingauswertung sind in diesen Technikstunden nicht enthalten. SaaS-Abos, Hosting, Steuern und Anzeigenbudget sind separat zu kalkulieren; die zuvor genannten Listenpreise sind dafür keine individuelle Preiszusage.

## Vertrag für die jetzige Implementierung

Die folgenden Punkte beschreiben die eigene Implementierung und ihre Grenzen. Die Abnahme der externen Google-Bibliothek mit echten, freigegebenen Konten und der spätere Versandanschluss bleiben zusätzlich nötig.

### Konfiguration und Ladeverhalten

| Öffentliche Build-Variable | Bedeutung | Grenze |
| --- | --- | --- |
| `PUBLIC_GA_ID` | Optionale GA4-Mess-ID im Format `G-…` | Nur mit `analytics` initialisieren. |
| `PUBLIC_GOOGLE_ADS_ID` | Optionale Google-Ads-ID im Format `AW-…` | Nur mit `ads` initialisieren. |
| `PUBLIC_GOOGLE_ADS_LABEL` | Label der fachlich freigegebenen Ads-Conversion | Ohne Label keine Conversion senden; Ads-ID allein beweist keine korrekt eingerichtete Conversion-Aktion. |

Öffentliche IDs sind keine Geheimnisse, aber auch keine Betriebsfreigabe. Formatvalidierung beweist weder Eigentum noch Existenz des Kontos. In dieser Arbeit werden keine echten IDs gesetzt. Ohne syntaktisch gültige Google-Ziel-ID erscheinen kein Google-Consent-Banner und kein Google-Lader. Leere Ziel-IDs schalten den jeweiligen Dienst aus. Syntaktisch ungültige konfigurierte IDs oder Labels lassen `trackingConfig` absichtlich den Build scheitern; sie werden nicht still ignoriert. Ein leeres Conversion-Label lässt die Conversion-Schnittstelle deaktiviert. Der erlaubte Netzwerkumfang muss zur freigegebenen Konfiguration passen; die Repo-Netzwerkprüfung darf nicht pauschal abgeschaltet werden.

Vor einem Google-Ladevorgang stehen alle vier Consent-v2-Signale auf `denied`; anschließend wird die gültige Auswahl angewendet, erst danach das zugelassene Ziel konfiguriert. Vor einer Entscheidung und nach Ablehnung keine Google-Skripte, Messanfragen, `noscript`-Pixel oder vorgezogenen Google-Preconnects. Bei ausschließlicher Analytics-Zustimmung keine Ads-Konfiguration, bei ausschließlicher Ads-Zustimmung keine GA4-Konfiguration. Die gemeinsame Bibliothek darf keine abgelehnten Ziele durch gekoppelte Tags oder Kontoeinstellungen mitaktivieren. Das ist am tatsächlichen Netzwerkverkehr zu prüfen.

Die Kategorien bleiben getrennt. „Statistik“ erklärt GA4 und den Analysezweck; „Anzeigen-Erfolgsmessung“ erklärt Google Ads und die Zuordnung erfolgreicher Anfragen zu Anzeigen. Sie sind freiwillig und anfangs aus. Es gibt keinen Remarketing-Schalter. `ad_personalization` bleibt auch nach „Alle akzeptieren“ abgelehnt.

Die `config`-Aufrufe minimieren die explizit übergebenen Seitenfelder:

- `page_location`: aktuelle URL ohne Query und Fragment.
- `page_referrer`: leer.
- `page_title`: leer.

**Das ist keine Garantie, welche Daten die externe Google-Bibliothek selbst aus Browser, URL oder Konfiguration ausliest.** Suchparameter, Anzeigenklick-IDs, automatisch erfasste Ereignisse und serverseitige Datenweitergabe müssen zusätzlich geprüft werden. Keine Namen, E-Mail-Adressen, Telefonnummern, Nachrichtentexte oder andere Formularwerte an Analytics/Ads übergeben. Die UUID ist eine zufällige technische Anfragereferenz, kein aus einer E-Mail abgeleiteter Wert.

### Entscheidung speichern und widerrufen

`localStorage` enthält die Entscheidung mit Version, Konfigurationsbezug und Zeitangabe. Nach **180 Tagen** ist sie ungültig. Fehlende, beschädigte, abgelaufene oder zur aktuellen Version/Konfiguration unpassende Einträge bedeuten keine Zustimmung. Auch wenn ein Store nachträglich nur noch lesbar ist, wird eine alte Zustimmung nicht wiederhergestellt; ein Schreibtest mit unverändertem Wert verlängert dabei keine Frist. Den Ablauf auch in einem lange geöffneten Dokument berücksichtigen; vergangene Zustimmung ist keine unbegrenzte Erlaubnis für später ausgelöste Ereignisse.

Beim Widerruf wird die neue Auswahl gespeichert, die passende `ga-disable`-Sperre gesetzt, erreichbare First-Party-Messcookies bestmöglich entfernt und die Seite neu geladen. Im alten Dokument wird bewusst **kein** `gtag`-Consent-Update auf `denied` mehr gesendet, damit die bereits laufende Bibliothek dadurch kein zusätzliches Denied-Ping auslöst. Erst im frischen Dokument gelten wieder zunächst alle vier Defaults `denied`; danach darf nur die weiterhin gültige Auswahl zum Laden freigegebener Ziele führen. Ein Reload beendet die bisher geladene Bibliothek für den weiteren Seitenbetrieb; bereits versandte Daten holt er nicht zurück. JavaScript kann insbesondere fremde Cookies, HttpOnly-Cookies sowie unbekannte Domain-/Pfadvarianten nicht vollständig löschen. Keine Behauptung „alle Google-Daten gelöscht“. Der Zugang zu Einstellungen und Widerruf bleibt dauerhaft im Footer erreichbar.

Es gibt **keine revisionsfeste zentrale Nachweissammlung**. Ein lokaler Zeitstempel ist manipulierbar, kann gelöscht werden und steht dem Verantwortlichen nicht automatisch als Nachweis zur Verfügung. Bannertexte, Zwecke, Versionen und Konfiguration müssen zusätzlich nachvollziehbar archiviert werden. Ob dieses Konzept die Nachweisführung nach Art. 7 Abs. 1 für den konkreten Betrieb ausreichend trägt oder eine andere Lösung braucht, ist vor Freigabe rechtlich zu prüfen. [EDPB, Abschnitt 5.1 zur Nachweisführung](https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf), [Googles eigene Aufzeichnungspflicht](https://www.google.com/about/company/user-consent-policy/).

Die Oberfläche muss den Regeln aus `docs/DESIGN.md` folgen. Native Dialogtechnik nimmt uns die Prüfung von Fokus, Escape-Verhalten, beschrifteten Checkboxen, erreichbarer Ablehnung, mobiler Darstellung und deutschen/englischen/niederländischen Texten nicht ab. Schließen ohne Auswahl erteilt keine Einwilligung.

### Adapter für echte Anfrage-Conversions

Der definierte Eingang lautet `flyingstars:lead-confirmed`; `detail.requestId` muss eine gültige UUID sein. Der Adapter ist lediglich eine interne Ereignisschnittstelle. Jedes Seitenskript kann ein Browserereignis erzeugen; es ist für sich kein Versandbeweis.

Gesendet wird ausschließlich, wenn beim Ereignis eine gültige Ads-Zustimmung sowie Ads-ID und Label vorliegen. Der ausgehende Ads-Aufruf verwendet `conversion`, `send_to` aus Ads-ID/Label und die UUID als `transaction_id`. Innerhalb eines Dokuments darf dieselbe UUID nur einmal verarbeitet werden. Googles [`transaction_id` zur Vermeidung doppelter Conversions](https://support.google.com/google-ads/answer/6386790?hl=en) ergänzt diese lokale Sperre; es ist kein Versprechen über jede kontoübergreifende Auswertung.

Es gibt kein nachträgliches Event-Replay. Eine ohne Zustimmung abgeschlossene Anfrage wird nicht vorgemerkt und später nach Zustimmung an Google geschickt. Eine zwischenzeitliche Ablehnung löst den beschriebenen Neustart mit gesperrten Tags aus. Bereits laufende Netzwerkübertragungen können dabei nicht zurückgerufen werden. Anfragen dürfen ungeachtet des Trackingzustands erfolgreich versendet werden.

Für den späteren Anschluss gilt eine zusätzliche technische Sperre: Im Backend auf `f8c2bad` liefert der **Honeypot absichtlich `ok` mit `state: sent`, obwohl kein Versand stattfindet**. Fehlende Versandkonfiguration liefert `not-configured`. Ein allgemeiner Erfolgstext oder `ok + sent` reicht deshalb nicht als Conversion-Auslöser. Vor Anschluss braucht es eine nur nach tatsächlicher Provider-Annahme erzeugte bzw. bestätigte, verlässliche UUID und die klare Unterscheidung zu Honeypot, Vorschau, Fehler und Timeout. Backend-Referenz: `functions/api/contact.ts`; Browserformular: `src/scripts/contact.ts`.

Eine Provider-Annahme bestätigt zudem noch keine Zustellung im Empfängerpostfach und keine qualifizierte Anfrage oder Buchung. Für die technische Conversion ist der freigegebene Erfolgspunkt zu definieren; Zustellung und Geschäftsqualität werden getrennt geprüft. Die aktuelle Backend-Antwort enthält noch keine solche UUID. Der Adapter bleibt daher bis zur gesonderten Integration unverbunden. Ein Aufruf von `/danke/`, der Submit-Klick oder reine Frontend-Validierung dürfen ihn nicht auslösen.

## Konto-Einstellungen, Verträge und Freigaben

Vor Aktivierung sind diese Punkte konkret abzuarbeiten:

1. **Verantwortung und Zugriff.** FlyingStars benennt Verantwortliche und Ads-Fachperson, erhält Admin-Zugang zu Ads und gegebenenfalls Analytics. Keine versteckte Abhängigkeit von einem Agenturkonto. Bestehende Tags und Kontoverknüpfungen inventarisieren.
2. **Conversion-Aktion.** Eindeutig eine primäre Anfrage-Aktion festlegen, Zählmethode, Attributionsfenster, Werte und Kampagnenziele dokumentieren. Alte Kontakt-/Danke-Seiten-Conversions und mögliche GA4-Importe fachlich bereinigen, ohne ungeprüft laufende Gebote umzustellen. UUID-Deduplizierung und echte Sendung in DE/EN/NL abnehmen.
3. **Google-Funktionen.** Kein Remarketing, keine Zielgruppenfreigabe und keine personalisierte Werbung. Enhanced Conversions und automatische Erfassung nutzerbereitgestellter Daten bleiben aus. Bei GA4 insbesondere Enhanced Measurement, automatische Formular-/URL-Ereignisse, Google Signals, verknüpfte Ziele, granulare Standort-/Gerätedaten, Datenfreigaben und Aufbewahrung abschalten bzw. einzeln begründet freigeben. Nicht abschaltbare automatische Ereignisse und Payloads gesondert prüfen. [Google zu regionalen Dateneinstellungen](https://support.google.com/analytics/answer/12017362?hl=en), [Datenaufbewahrung](https://support.google.com/analytics/answer/7667196?hl=en).
4. **Verträge und Transfers.** Aktuelle dienstspezifische Bedingungen und Rollen prüfen; für Auftragsverarbeitung passende AVV nach Art. 28, bei eigenständiger oder gemeinsamer Verantwortung die dafür maßgeblichen Vereinbarungen. Ein GA-AVV deckt nicht automatisch jede Ads-Funktion ab. Google-Empfänger, DPF-Geltungsbereich und erforderliche alternative Transfermechanismen dokumentieren. Für optionale Analytics-/Hosting-Anbieter ebenfalls AVV, Unterauftragnehmer und Speicher-/Supportländer prüfen.
5. **Information und Entscheidung.** Dienstnamen, Betreiber, Zwecke, Datenarten, Cookie-/Speicherfristen, Widerruf und Drittlandverarbeitung in verständlichen Texten abstimmen. Statistik und Ads-Erfolgsmessung getrennt auswählbar. 180 Tage, lokale Nachweisgrenze und Versionierung rechtlich freigeben. Kein Release mit Platzhalter-Datenschutztext.
6. **Produktionsabnahme.** Erst nach fachlicher, technischer und rechtlicher Freigabe echte öffentliche IDs im zuständigen Deployment konfigurieren. Kein Kontozugang und keine `.env` waren Teil dieses Rechercheauftrags.

## Abnahmekriterien und Grenzen des Prototyps

Die Tests müssen den eindeutig zur Worktree gehörenden Build prüfen. Der Standardport 4399 war durch einen anderen Checkout belegt; die ausgeführten Läufe nutzten deshalb isolierte Ports. Testergebnisse und Befundkorrekturen sind im Abschlussabschnitt dokumentiert.

Diese Szenarien definieren die technische Abnahme. Die ersten fünf betreffen die eigene Consent-Basis, die letzten beiden die noch ausstehende Produktionsintegration:

- Mit leeren Ziel-IDs kein Banner und kein Google-Netzwerkverkehr. Ungültige konfigurierte IDs oder Labels müssen bereits den Build mit einem Konfigurationsfehler abbrechen. Mit gültiger Testkonfiguration vor Auswahl und nach Ablehnung keine Google-Anfragen.
- Nur Analytics, nur Ads und beide Kategorien in Chromium und WebKit getrennt prüfen, einschließlich zweiter Seite, Reload, zweitem Tab und geänderter Konfiguration. Keine unerlaubten Ziele oder doppelten Tags.
- Abgelaufene oder beschädigte Einträge, blockiertes `localStorage`, Versionswechsel und Widerruf sicher behandeln. Beim Widerruf kein zusätzliches `denied`-Update im alten Dokument; Speichern, `ga-disable`, Cookie-Bereinigung und Reload nachweisen. Personalisierung in allen Zuständen `denied`.
- Tastatur, Fokus und Rückkehr zum auslösenden Element, Escape, Reflow und alle unterstützten Sprachen am echten Dialog prüfen.
- Mit UUID-Testereignissen die Adapterbedingungen prüfen: ungültige UUID, fehlendes Label, keine Ads-Zustimmung und Wiederholung führen nicht zu einer weiteren Conversion. Ein synthetisches Ereignis beweist nur den Adapter, keinen Formularversand.
- Nach dem späteren Formularanschluss echte Provider-Annahme und Eingang der Anfrage überprüfen. Fehler, Honeypot, `not-configured`, Timeout, Doppel-Submit und direkt geöffnete Danke-Seite dürfen keine Erfolgs-Conversion erzeugen. Einreichung vor Zustimmung wird nach Zustimmung nicht nachgemeldet.
- Im realen Google-Testbetrieb Tags und Payloads einschließlich automatisch erzeugter Ereignisse prüfen, ohne dabei Formular-PII an Google zu senden. Minimierte `config`-Felder und abgefangene Testanfragen belegen keine vollständige Kontrolle der externen Bibliothek.

Offen bleiben die reale Konto-Konfiguration, die belastbare Versand-/UUID-Verbindung, die rechtliche Nachweisfreigabe und die Produktionsprüfung mit tatsächlichen, freigegebenen Ziel-IDs. Die Recherche belegt weder einen vollständig konformen Livebetrieb noch 124 echte historische Anfragen. Die hier dokumentierte Consent-Basis kann diese fehlenden Nachweise vorbereiten; sie ersetzt sie nicht.


## Aktivierung im Build und zusätzliche Kontovorgaben

Im Cloudflare-Pages-Projekt die öffentlichen Variablen im Bereich **Settings → Variables and Secrets** für die gewünschte Build-Umgebung konfigurieren und neu bauen. Preview und Produktion getrennt behandeln. Diese Variablen werden beim Astro-Build in HTML übernommen; eine Änderung erst zur Function-Laufzeit aktiviert keinen neuen statischen Build. Für die Empfehlung nur `PUBLIC_GOOGLE_ADS_ID=AW-…` und das zugehörige `PUBLIC_GOOGLE_ADS_LABEL` setzen. `PUBLIC_GA_ID` bleibt leer, solange FlyingStars keinen GA4-Bedarf freigegeben hat. Kein GTM-Container wird geladen. Die Kennungen sind öffentlich; ein API-Schlüssel oder Kontopasswort gehört niemals hierher. Die [Cloudflare-Dokumentation](https://developers.cloudflare.com/pages/configuration/build-configuration/#environment-variables) beschreibt die Build-Variablen.

Lokal lässt sich die Konfiguration ohne eine Umgebungsdatei mit Dummy-Werten prüfen:

```sh
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
PUBLIC_GA_ID=G-CONSENTTEST PUBLIC_GOOGLE_ADS_ID=AW-123456789 PUBLIC_GOOGLE_ADS_LABEL=TEST_LABEL npm run build
CONSENT_TEST_ENABLED=1 PLAYWRIGHT_PORT=4419 npx playwright test tests/consent.spec.ts --workers=2
```

Diese Kennungen sind ausschließlich Testwerte. Der Test fängt sämtliche externen Anfragen ab und liefert die Bibliothek als leeren lokalen Stub aus. Danach mit leeren Google-Variablen erneut bauen, damit die Vorschau ausgeschaltet bleibt. Die produktive Formularanbindung darf erst mit der zuvor beschriebenen Versandbestätigung erfolgen. Beispiel der vorgesehenen Schnittstelle, **kein Versandbeweis**:

```js
window.dispatchEvent(new CustomEvent('flyingstars:lead-confirmed', {
  detail: { requestId: confirmedRequestId },
}));
```

Bei optionalem GA4 empfehlen wir zunächst **zwei Monate** Aufbewahrung für Nutzer-/Ereignisdaten und keinen Reset dieser Frist bei neuer Aktivität, sofern keine begründete andere Frist beschlossen wird. Die Aufbewahrungsoption begrenzt nicht automatisch alle aggregierten Standardberichte. Google beschreibt diese Unterschiede und die Zwei-/Vierzehn-Monats-Optionen in der [Aufbewahrungsdokumentation](https://support.google.com/analytics/answer/7667196?hl=en).

Für EU-Traffic beschreibt Google die Nutzung der IP-Adresse zur Standortableitung und ihr anschließendes Verwerfen vor der Protokollierung. Das verhindert nicht die anfängliche Verarbeitung der IP oder die weitere Verarbeitung anderer Messdaten. Es gibt hier keinen zusätzlich zu setzenden Universal-Analytics-Schalter `anonymize_ip`. Granulare Standort-/Gerätedaten und Google Signals bleiben aus; das tatsächliche Verhalten ist zu kontrollieren. [Googles regionale Datenkontrollen](https://support.google.com/analytics/answer/12017362?hl=en).

GA4 und Ads vorerst nicht allein aus Gewohnheit verknüpfen. Eine Verknüpfung samt Import, Zielgruppen und Datenfreigaben braucht einen eigenen Zweck und die Ads-Abnahme, insbesondere gegen Doppelzählung der primären Anfrage. Consent Mode muss technisch korrekt initialisiert und in den Google-Tag-Diagnosen geprüft werden; es gibt keinen Kontoschalter, der das Banner und die Ladesperre ersetzt. Für Verträge die [Google Ads Data Processing Terms](https://business.safety.google/adsprocessorterms/) und die separat geregelten [Controller-Controller Terms](https://business.safety.google/adscontrollerterms/) einschließlich ihres jeweiligen Dienstumfangs prüfen und die tatsächliche Annahme dokumentieren.

## Ausgeführte technische Prüfung der Implementierung

Abnahme im Worktree `/private/tmp/fs-analytics-consent/worktree`, Branch `codex/analytics-consent`, Basis `f8c2bad`. Dieser Abschnitt dokumentiert die ausgeführten Implementierungsprüfungen am tatsächlich gebauten Artefakt.

- `npm ci` ausgeführt. Keine neue Abhängigkeit hinzugefügt.
- `npx astro check`: 0 Fehler, 0 Warnungen; vorhandene Hinweise in der Codebasis bleiben erhalten.
- `npm run build`: erfolgreich, 65 Inhaltsseiten und Weiterleitungsseiten. Separater Build mit Dummy-IDs ebenfalls erfolgreich. Der letzte reguläre `dist` ist wieder ohne IDs gebaut. Im OFF-Build ist auch das lokale Consent-Modul nicht im HTML eingebunden. Im aktiven Build misst sein kompiliertes JS 4.897 Byte, gzip 2.043 Byte, ohne HTML/CSS und ohne die externe Google-Bibliothek.
- Vollständiger angeforderter Node-Testbefehl: **95 bestanden, 0 Fehler**, rund 269 Sekunden unter paralleler Last. Die anschließend berührten i18n-/Consent-Prüfungen zusätzlich gezielt bestanden.
- Nur die angeforderten Playwright-Dateien ausgeführt: `network-allowlist`, `a11y`, `html`, `consent`, mit zwei Workern und den vier Projekten Desktop/Mobil für Chromium und WebKit. Im großen OFF-Lauf **786 bestanden**, 36 aktive Consent-Fälle erwartungsgemäß übersprungen; zwei Skip-Link-Annahmen zunächst fehlgeschlagen. Ursache war WebKits macOS-Tastaturmodus. Der Test verwendet dort nun Option+Tab gemäß [Apple-Dokumentation](https://support.apple.com/en-ie/guide/safari/cpsh003/mac). Anschließender gezielter Lauf über die geänderten Datenschutzseiten, Skip-Links und OFF-Zustand: **44 bestanden, 0 Fehler**. Alle zuvor fehlgeschlagenen Fälle bestanden erneut.
- Aktiver Dummy-Build: **44 bestanden, 0 Fehler**, vier OFF-Fälle erwartungsgemäß übersprungen. Das umfasst getrennte Zwecke, Ablehnung, Zustimmung, Reload, Widerruf einschließlich zweitem Tab, beschädigte/abgelaufene/veraltete Entscheidungen, blockierten oder nach Zustimmung schreibgeschützten Speicher, Sprachwechsel, lesbare Rechtstexte und den synthetischen Conversion-Adapter. In WebKit wurde eine fehlende Fokusrückgabe nach Pointer-Öffnung gefunden und explizit behoben; die Browserprüfung besteht danach.
- Axe am geöffneten Dialog und an den Einstellungen sowie echte Tastatur-/Fokusinteraktion geprüft. Screenshots von Banner und Einstellungen bei **1440 × 900 und 390 × 900** erstellt. Die Desktop- und Mobilansichten von Chromium und WebKit wurden geöffnet und visuell geprüft. Die Einstellungen sind auf kleinen Bildschirmen innerhalb des Dialogs scrollbar; beide Entscheidungen haben dieselben Abmessungen und CSS-Klassen. Kein vollständiges manuelles WCAG-Audit und kein Screenreader-Nachweis.

Die Browsertests kontaktieren **keinen Google-Server**. Sie prüfen die eigene Ladesperre und die erzeugte Befehlswarteschlange gegen einen abgefangenen Tag. Das ist keine Payload-Abnahme des tatsächlichen Google-Codes und kein Nachweis erfolgreicher realer Ads-Attribution. Es wurde keine echte Anfrage versendet.

Der Standardport 4399 war durch die Vorschau des anderen Checkouts belegt und blieb unangetastet. OFF-Prüfungen liefen deshalb über `PLAYWRIGHT_PORT=4419`. Der parallele Dummy-Build wurde unter `/private/tmp/fs-analytics-consent/dummy-dist` separat über die Astro-Preview-API auf Port 4429 bereitgestellt. Die temporäre Playwright-Konfiguration liegt außerhalb des Repos. Die Repo-Konfiguration behält 4399 als Standard, erlaubt einen expliziten Port und verweigert das Wiederverwenden eines bereits belegten Servers.

Prüfbelege außerhalb des Repos:

- `/private/tmp/fs-analytics-consent/{check-final,build-off-final,build-on,unit,unit-changed,i18n-build}.log`
- `/private/tmp/fs-analytics-consent/{playwright-off,playwright-off-recheck,playwright-on-final}.log`
- `/private/tmp/fs-analytics-consent/on-test-results/consent-explicitly-configu-d9255-ions-at-1440-and-390-pixels-{desktop,mobile,webkit,mobile-webkit}/consent-{de,settings-de}-{1440,390}.png`
- `/private/tmp/fs-analytics-consent/playwright-on.config.mts` und `preview-dummy.mjs`

Keine `.env`-Dateien gelesen, keine echten Kennungen konfiguriert, kein Push und kein Deployment. Rechtstexte und neue Übersetzungen sind weiterhin Entwürfe zur fachlichen, sprachlichen und rechtlichen Freigabe.
