# Kontaktformular: Datenschutzprüfung und Entscheidungen

Stand: 2. November 2026. Geprüft ab Commit `7bd1fbf`, Branch `feat/designsprache-poc`. Arbeitsbranch `codex/kontaktformular-dsgvo`. Dies ist eine technische und datenschutzrechtliche Orientierung, keine Rechtsberatung und keine Freigabe für den Livebetrieb. FlyingStars bleibt verantwortlich; die Datenschutzberatung muss Rechtsgrundlagen, Verträge, Drittlandtransfers und Fristen bestätigen.

## Ergebnis und Schwere der Befunde

**Vor produktivem Versand zu klären:** Die bisherige Vorschau-Erklärung war sachlich falsch: Auch ohne Brevo-Versand verarbeitet Cloudflare IP-Adressen und abgeschickte Inhalte. Videos starten teilweise automatisch. Cloudflare Pages Functions läuft standardmäßig global; ein EU-Mailanbieter macht diese Eingangsstufe nicht zu EU-only. Der neue Text in `datenschutz.yaml` ist deshalb ausdrücklich ein Entwurf zur rechtlichen Prüfung.

**Hohe Priorität für den Betrieb:** Der Code enthält keinen Nachweis abgeschlossener AV-Verträge, eingeschalteter Brevo-Löschfristen oder des Postfachanbieters. Das kann ein Repository nicht belegen. Keine Secrets, `.env`-Dateien oder Konten wurden gelesen. Angaben „Versand noch nicht eingerichtet“ sind dokumentierter Projektstand, keine Prüfung der aktuellen Production-Secrets. Ein fehlendes `BREVO_API_KEY`, `CONTACT_FROM` oder `CONTACT_TO` unterbindet den Versand im Code.

**Technische Mängel behoben:** Gesamteingaben waren unbeschränkt, kaputte Multipart-Anfragen und Netzausfälle nicht abgefangen. Dateien wurden implizit zu Strings umgewandelt, optionale Felder clientseitig nicht mitvalidiert. Die Function hat jetzt ein echtes 64-KiB-Streamlimit, lehnt Dateien/mehrdeutige Einzelwerte ab, prüft Längen und Auswahlwerte und gibt kontrollierte Fehler ohne Providerinterna aus. Die bereits vorhandene Honeypot-Prüfung bleibt; eine umgehbare Zeitfalle ergänzt sie.

**Mittlere Priorität:** Eigener Showtext reist bisher in `?text=` oder `?show=` zur Anfrage. Das kann Namen oder private Eventdetails in URL-Logs und den Browserverlauf bringen. Das Formular entfernt beide Parameter nach Übernahme aus der aktuellen URL. Den ersten HTTP-Aufruf und vorgeschaltete Logs verhindert das nicht. Eine spätere Übergabe über kurzlebigen Browser-Speicher braucht einen gemeinsamen Umbau des Konfigurators und ist hier bewusst keine stillschweigende Änderung an fremden Dateien.

**Bereits gut:** Festes Empfängerpostfach, verifizierter Server-Absender, Besucheradresse nur als Reply-To, Plaintext-Mail, kein Newsletterkontakt, keine eigene Datenbank, keine `console`-Logs mit Inhalt/IP und bereits ein Datenschutzlink ohne Pflichtcheckbox. Kein Datei-Upload im Anfrageformular.

## Tatsächlicher Datenfluss

```text
Browser
  GET /kontakt/ oder /?paket=…&show=…#anfrage
  → Cloudflare Pages: IP, URL einschließlich Query, technische HTTP-Metadaten
  ← statische Seite, lokale Fonts/Bilder, Formularskript

Browser, erst nach Absenden
  POST /api/contact: Felder + Honeypot + bei JS Bearbeitungsdauer in ms
  → Cloudflare Pages Function: Größen-/Feldprüfung, Honeypot, Zeitfalle
      ├─ kein Mail-Setup: keine Mail / keine eigene dauerhafte Formularablage
      ├─ optional TURNSTILE_SECRET: Tokenprüfung bei Cloudflare Siteverify
      │    nur Secret + Token; kein zusätzliches remoteip aus dem Formularcode
      └─ Mail-Setup aktiv: POST https://api.brevo.com/v3/smtp/email
           → Brevo: Kontaktangaben + Showdetails als Textmail, Reply-To
           → festes CONTACT_TO-Postfach: Anfrage, Metadaten, Mail-Backups
           → zuständige FlyingStars-Mitarbeitende beantworten/bearbeiten
```

Honeypot-Treffer werden ohne Versand wie Erfolg beantwortet. Ungültige und zu große Anfragen gehen nicht zu Brevo. Die Zeitfalle prüft die Bearbeitungsdauer von mindestens zwei Sekunden nur, wenn der Browser das Feld mitsendet. Sie speichert keinen absoluten Zeitpunkt und vermeidet Uhrabweichungen zwischen Browser und Server. Sie ist kein belastbarer Botnachweis.

`PUBLIC_FORM_ENDPOINT` kann das Formular an einen anderen Dienst richten. Der geprüfte Fallback ist `/api/contact`. Vor jedem abweichenden Build muss die tatsächlich gerenderte `action` geprüft werden; fremde Endpoints ändern Datenfluss, Vertragspartner, Fehlermeldungen und Spam-Schutz. Brevo ist kein sicherer Browser-Endpoint: Der API-Key gehört ausschließlich in die Serverlaufzeit. [Brevo API](https://developers.brevo.com/docs/send-a-transactional-email)

## Daten und Zwecke

Alle Felder sind zusammen mit der Kontaktadresse personenbezogene Daten, auch wenn ein Paketname für sich genommen keine Person bezeichnet.

| Feld / Datum | Erforderlichkeit und Zweck | Weitergabe / Grenze im Code |
| --- | --- | --- |
| `name` | Pflicht für persönliche Ansprache/Zuordnung; vollen amtlichen Namen nicht verlangen | Reply-To und Mailtext, 120 Zeichen; Name nicht mehr im Betreff |
| `email` | Pflicht für Antwort | Reply-To und Mailtext, 200 Zeichen, Format-/Steuerzeichenprüfung |
| `anlass` | Im Showformular Pflicht für erste Einordnung | Feste Auswahl; API erlaubt alternativ eine Nachricht für allgemeine Kontaktanfragen |
| `ort` | Im Showformular Pflicht, Machbarkeit und Anfahrt | Ort/PLZ reicht, keine Privatadresse verlangen; höchstens 200 Zeichen |
| `datum`, `datum-offen` | Im JS-Formular Datum oder offener Termin; ohne JS Datum freiwillig | Datum geprüft; bei „offen“ wird kein Datum mitgemailt |
| `paket`, `drohnen` | Freiwillige Vorbelegung/Angebotsumfang | Paket-Allowlist; 100–1000 Drohnen, keine Tracking-ID |
| `extras` | Freiwillige Mehrfachauswahl vom Preisbereich | Höchstens 10 Werte mit je 30 Zeichen; Syntaxprüfung, dedupliziert |
| `telefon` | Freiwillig für Rückruf | Mailtext, höchstens 200 Zeichen |
| `firma` | Freiwillig zur geschäftlichen Zuordnung | Mailtext, höchstens 200 Zeichen |
| `quelle` | Freiwillige Herkunftsangabe zur Bewertung der Kontaktwege | Mailtext, höchstens 200 Zeichen; eigener Zweck, keine automatische Werbeeinwilligung |
| `message` | Freiwillige Idee/Zusatzinformationen; kann Show-Zusammenfassung und eigenen Text enthalten | Mailtext, höchstens 5000 Zeichen; keine besonderen Daten nach Art. 9 verlangen |
| `website` | Versteckter Honeypot, soll leer bleiben | Nur lokale Prüfung in der Function, kein Mailfeld |
| `form-duration` | Bei JS kurze Missbrauchsprüfung | Nur Dauer in ms, kein Cookie/Storage, kein Mailfeld; ohne JS nicht nötig |
| `cf-turnstile-response` | Nur bei künftiger Turnstile-Integration | Token zur Siteverify-API, nicht in die Mail; maximal 2048 Zeichen |
| IP, User-Agent, URL, Zeitpunkt und HTTP-Metadaten | Hosting, Zustellung, Sicherheit; technische Erhebung schon vor Submit | Cloudflare sieht sie; der Anwendungscode speichert/loggt sie nicht und reicht Besucher-IP/UA nicht an Brevo weiter |
| E-Mail-Metadaten und Bearbeitungsdaten | Transport, Antwort und Nachverfolgung der Anfrage | Brevo, Empfänger-Mailanbieter und intern; keine Besucherstammdatenliste wird angelegt |

Ein Request darf einschließlich Kodierung und Multipart-Rahmen höchstens 64 KiB haben. Unbekannte Textfelder werden nicht weitergereicht. Dateien werden abgelehnt, bevor ein externer Prüfdienst oder Brevo aufgerufen wird. Die API verlangt bewusst weniger Showdaten als die Showoberfläche, damit allgemeine Textanfragen ohne erfundenen Anlass möglich bleiben.

## Rechtsgrundlagen und Checkbox

Für eine konkrete Show-/Angebotsanfrage einer Person, die selbst Vertragspartner werden soll, kommt Art. 6 Abs. 1 Buchst. b DSGVO infrage: erforderliche vorvertragliche Schritte auf ihren Wunsch. Ein späterer Vertragsschluss ist dafür nicht Voraussetzung. Eine bloß nützliche Information ist noch nicht objektiv erforderlich. Bei geschäftlichen Kontaktpersonen, die für ihre Organisation handeln, und allgemeinen Anliegen ist Buchstabe b nicht automatisch tragfähig. Hier Art. 6 Abs. 1 Buchst. f einschließlich konkretem Interesse, Erforderlichkeit und Abwägung dokumentieren. Spam-Abwehr und sicheres Hosting getrennt unter f prüfen. [DSGVO Art. 5–6](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:02016R0679-20160504), [EDPB 2/2019, insbesondere Rn. 45–47](https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines-art_6-1-b-adopted_after_public_consultation_en.pdf)

Für die freiwillige `quelle`-Angabe muss FlyingStars den zusätzlichen Zweck rechtfertigen oder sie entfernen. Die jetzige freiwillige Selbstauskunft ist kein Cookie-Tracking, aber auch keine notwendige Angebotsangabe. Telefon und Firma bleiben freiwillig. Prüfen, ob überhaupt ein Name erforderlich sein muss oder eine Ansprache/Pseudonym genügt. Das bestehende UI verlangt keinen vollständigen Namen.

**Keine Pflichtcheckbox „Ich stimme der Datenschutzerklärung zu“.** Für die unter b/f begründete Bearbeitung ist keine zusätzliche Einwilligung nötig. Datenschutzinformationen sind eine Information, kein zustimmungspflichtiger Vertrag. Das ist eine Ableitung aus den Anforderungen an passende Rechtsgrundlagen und freiwillige Einwilligung, keine pauschale Behördenfreigabe jedes Formulars. Der kurze Hinweis unter dem Button und die verlinkte Erklärung erfüllen die Transparenzfunktion nur gemeinsam mit vollständigen, richtigen Informationen. Ein zusätzlicher Newsletter wäre ein eigener Zweck mit gesonderter, freiwilliger Prüfung und Einwilligung. [DSK Kurzpapier 20](https://www.datenschutzkonferenz-online.de/media/kp/dsk_kpnr_20.pdf), [EDPB 05/2020, Rn. 26–31](https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf)

## Anbieter, Länder und Verträge

### Cloudflare als Hosting und Function

Cloudflare, Inc. ist ein US-Unternehmen. Pages Functions baut auf Workers auf und läuft standardmäßig im globalen Netzwerk. Ein deutscher Websitebesucher oder eine `pages.dev`-Domain garantiert keinen EU-Verarbeitungsort. Regional Services/Data Localization ist gesondert einzurichten; die Pages-Dokumentation beschränkt die Wirkung auf entsprechend konfigurierte Custom Domains. Das ist kein belegter Bestandteil dieses Prototyps. [Functions](https://developers.cloudflare.com/pages/functions/), [Pages Data Localization](https://developers.cloudflare.com/data-localization/how-to/pages/)

Vor Betrieb das anwendbare Cloudflare-DPA nach Art. 28 dokumentieren, einschließlich Unterauftragsverarbeitern, Sicherheitsmaßnahmen und Weiterübermittlungen. Das veröffentlichte DPA enthält SCC und DPF-Regelungen. Das amtliche Register führt Cloudflare am Recherchetag als aktiv zertifiziert; für erfasste Transfers kann Art. 45 einschlägig sein. DPF ist keine EU-Lokalisierung und ersetzt weder Rechtsgrundlage noch AVV oder Transparenz. Bei SCC die erforderliche Transferprüfung und ergänzende Maßnahmen anhand des tatsächlichen Datenflusses bewerten. Zertifizierung und Rechtslage vor Livegang erneut prüfen. [Cloudflare DPA](https://www.cloudflare.com/cloudflare-customer-dpa/), [DPF-Register Cloudflare](https://www.dataprivacyframework.gov/participant/5666), [EU-Kommission zu US-Transfers](https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/eu-us-data-transfers_en), [DSGVO Kapitel V](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:02016R0679-20160504)

### Brevo als Mailversand

Brevo nennt in seinem eigenen [Agenturvertrag](https://partners.brevo.com/experts-agreement) Sendinblue SAS, Paris, Frankreich, als Gesellschaft hinter dem Handelsnamen. Welcher Vertrag FlyingStars konkret bindet, ist im Konto zu bestätigen. Der Code verwendet `api.brevo.com/v3/smtp/email`, keinen auswählbaren EU-Regionsendpunkt. Brevo dokumentiert Datenbankhosting in Frankreich/Deutschland und Infrastruktur in Belgien. Das ist keine Garantie, dass sämtliche Verarbeitung in der EU bleibt. Das veröffentlichte DPA, Appendix 3 der Terms, erlaubt auch Drittlandverarbeitung und nennt unter anderem Cloudflare sowie Konzerngesellschaften in Indien/USA. FlyingStars muss die tatsächliche Vertragsgesellschaft und einschlägige Unterauftragnehmer für seinen Dienst prüfen. Die Marke „Brevo“ allein reicht als Vertragsnachweis nicht. [Datenstandorte](https://help.brevo.com/hc/en-us/articles/360001005510-Data-storage-location), [Brevo Terms/DPA](https://www.brevo.com/legal/termsofuse/)

Die Function sendet ausschließlich eine interne Transaktionsmail. Es werden kein Newsletterkontakt und kein CRM-Datensatz über die API angelegt. Der Request ist Plaintext und enthält keinen selbst eingebauten Trackingpixel. Brevos Versandtracking, Vorschauen und Logs sind trotzdem im Konto zu prüfen und für diesen internen Zweck soweit möglich abzuschalten oder zu minimieren. Nicht ungeprüft behaupten, dass ein bestimmter API-Schalter Tracking zuverlässig deaktiviert. [Tracking-Einstellungen](https://help.brevo.com/hc/en-us/articles/37114679474706-About-email-tracking-pixels-and-the-CNIL-recommendation-in-Brevo)

### Empfängerpostfach

`CONTACT_TO` ist fest im Server konfiguriert, nicht vom Besucher wählbar. Anbieter, Speicherland, AVV, Berechtigungen, Weiterleitungen, Mobilgeräte und Backups sind im Repo nicht nachgewiesen. Diese Stufe muss FlyingStars benennen und mitprüfen. Kein Verteiler an beliebige Mitarbeitende; nur zuständiges Team, MFA und gepflegte Zugriffsrechte. TLS schützt die Transportwege, ist keine Ende-zu-Ende-Verschlüsselung. Besonders sensible Unterlagen deshalb nicht über dieses Formular anfordern. [DSGVO Art. 28 und 32](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:02016R0679-20160504)

## Löschung und Protokollierung

Keine eigene Datenbank bedeutet keine automatische Löschung der gesamten Kette. Der Anwendungscode schreibt keine Inhalte, IPs, Tokens oder Providerfehler in Logs. Die Antwort enthält `Cache-Control: no-store`; das unterbindet keine plattformeigene Protokollierung. Anfragen und FormData existieren während der Verarbeitung im Arbeitsspeicher. Cloudflare-Einstellungen zu Observability, Requestlogs, Logpush, WAF, Sampling, Aufbewahrung und Vollzugriff müssen separat geprüft werden. Keine Roh-Requests für Debugging loggen; für Betriebszahlen genügen aggregierte Status-/Fehlerklassen ohne Inhalt und Identifikatoren.

Brevo dokumentiert standardmäßig unbefristete Transaktionslogs und erlaubt eine Begrenzung auf 1–24 Monate. Für die Vorschau-Aufbewahrung sind die offiziellen Aussagen zum Default widersprüchlich. Deshalb im Konto prüfen, nicht raten. Empfehlung: niedrigste passende Logfrist einstellen, aktuell mindestens einen Monat, neue Nachrichtenvorschauen nicht speichern und vorhandene Inhalte/Altbestände gesondert bereinigen. Diese Frist ist eine Anbieterfunktion, keine gesetzliche Aufbewahrungspflicht. [Logs](https://help.brevo.com/hc/en-us/articles/360021533839-Manage-your-transactional-logs-and-email-previews), [Aufbewahrungseinstellungen](https://help.brevo.com/hc/en-us/articles/4415743225746-Configure-a-custom-retention-period-for-your-transactional-logs-and-email-previews)

Als zu beschließende Arbeitsregel: nicht weiterverfolgte Anfragen drei Monate nach Abschluss löschen, einschließlich lokaler Kopien und Papierkorb, sofern keine dokumentierte Erforderlichkeit entgegensteht. Bei Verträgen oder aufbewahrungspflichtiger Geschäftskorrespondenz nach Dokumentenart gesonderte gesetzliche Fristen bestimmen; keine pauschale Mehrjahresfrist für jede Kontaktanfrage. Backups mit festem Ablauf, eingeschränktem Zugriff und geregelter Wiederherstellung/Löschung erfassen. Die Dreimonatsregel ist ein Vorschlag, im Code nicht automatisiert umgesetzt. Für Art. 13 eine beschlossene konkrete Frist oder überprüfbare Kriterien veröffentlichen. [DSGVO Art. 5 Abs. 1 e, Art. 13 Abs. 2 a und Art. 17](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:02016R0679-20160504)

## Dateien, Spam-Schutz und Fehlermeldungen

Der Logo-Selektor auf der Preisseite gehört zum lokalen Show-Konfigurator. PNG/JPEG/WebP werden per Blob-URL, SVG als lokale Bildquelle verarbeitet. Er liegt außerhalb des Kontaktformulars. Es wird nur der Satz „Eigenes Logo: in der Vorschau ausprobiert“ in die Show-Zusammenfassung übernommen, keine Datei, kein Dateiname und kein Dateiinhalt. Bei künftigen Uploads wären ein eigener Zweck, Größen-/MIME-/Inhaltsprüfung, Berechtigungen, Schadsoftwareprüfung, kurze Löschfristen, isolierter EU-Speicher und genaue Empfängerinformationen nötig. Jetzt Dateien ausdrücklich abweisen.

Honeypot und Zeitfalle sind ein datensparsamer Einstieg. Beide sind leicht umgehbar und kein Rate-Limit. **Empfohlen vor offenem Produktivbetrieb:** wirksames plattformseitiges Rate-Limit für POST auf diesen Pfad und ein kleines Versandbudget/Alarmierung. Keine IP-Sperrliste als improvisierte Prozessvariable in global verteilten Functions. Wenn IP-basierte Limits nötig werden, Zweck, kurze TTL, Zugriff und Rechtsgrundlage festlegen. Ein IP-Hash ist grundsätzlich keine sichere Anonymisierung; auch Cloudflare-WAF verarbeitet IPs. Keine neuen Trackingdienste allein zur Spam-Abwehr einführen.

Turnstile ist nur serverseitig vorbereitet. Im Browser gibt es weder Widget noch Site-Key noch externes Script. `TURNSTILE_SECRET` allein würde alle echten Anfragen ohne Token blockieren. Bei Integration müssen Widget, Tokenablauf, Fehler-/barrierearme Ausweichwege, Hostbindung und serverseitige Prüfung gemeinsam stehen. Die Function prüft bereits den zurückgegebenen Hostnamen und sendet kein optionales `remoteip`. Das macht Turnstile nicht anonym: das Widget verarbeitet selbst technische Browserdaten und IP. Cloudflare benennt eigene Verantwortlichkeit für Teile der Bot-Erkennungsverbesserung. Pre-clearance kann Cookies setzen. [Serverprüfung](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [Turnstile Privacy Addendum](https://www.cloudflare.com/turnstile-privacy-policy/), [Pre-clearance](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/pre-clearance/)

reCAPTCHA wäre ein weiterer Google-Datenfluss und setzt laut eigener Dokumentation `_GRECAPTCHA`. Auch die seit April 2026 beschriebene Auftragsverarbeiterrolle ist kein pauschaler Rechtmäßigkeitsnachweis. Für beide Produkte DSGVO und Endgerätezugriffe nach § 25 TDDDG getrennt bewerten; „Art. 6 f, deshalb kein Consent nötig“ reicht dafür nicht. Bei geringem Spamaufkommen bleiben die lokalen Mechanismen mit Rate-Limit die bevorzugte Lösung. [Google FAQ](https://docs.cloud.google.com/recaptcha/docs/faq), [DSK Orientierungshilfe digitale Dienste](https://www.datenschutzkonferenz-online.de/media/oh/OH_Digitale_Dienste.pdf), [§ 25 TDDDG](https://www.gesetze-im-internet.de/ttdsg/__25.html)

Fehlertexte benennen Eingabeproblem, fehlende Einrichtung oder vorübergehenden Ausfall. Keine Rohantworten, Mailinhalte oder Schlüssel ausgeben. Ungültige Eingaben bleiben im Formular zur Korrektur erhalten. Ein Netzwerk-Timeout kann eintreten, nachdem Brevo die Mail angenommen hat; deshalb meldet die Function „Versand konnte nicht bestätigt werden“ und wiederholt nicht automatisch. Ein API-Erfolg bedeutet Annahme durch Brevo, keine garantierte Zustellung ins Postfach. Zustellung/Bounces vor Livegang separat testen. Die statische `/danke/`-Seite behauptet weiterhin fehlende Einrichtung und muss vor Aktivierung echten Versands mit dem tatsächlichen Status abgestimmt werden. Das ist ein offener Freigabepunkt außerhalb der hier bearbeiteten Inhaltsdateien.

## Drittressourcen und Consent auf der Seite

Build-Ausgabe, Quellcode und Netzwerkprüfung unterscheiden zwischen geladenen Ressourcen, bloßen Links und Metadaten. Geprüfter Build ohne `PUBLIC_FORM_ENDPOINT`-Override:

- Inter und Space Grotesk werden aus `/fonts/` geladen. Bilder werden beim Build aus freigegebenen Quellen optimiert und als `/_astro/` oder lokale Medien ausgeliefert. Dieser Build-Abruf ist kein Drittrequest vom Besucherbrowser.
- Videos laufen im Produktionsbuild über `/api/media?asset=…`. Die Function ruft feste Quellen auf `flyingstars.art` und `flyingstars-relaunch.vercel.app` ab und reicht nur Range weiter, keine Besucher-IP, Cookies oder Referer. Die Upstream-Stufe ist dennoch Teil der Medieninfrastruktur. Einige Videos starten im Hero oder bei Sichtbarkeit automatisch. Im Dev-Modus werden Quellen direkt geladen; lokale Dev-Netzwerke sind daher kein Beleg für die Production-Datenflüsse.
- Keine externen Font-, Analytics-, Maps-, reCAPTCHA- oder Turnstile-Scripts, keine YouTube-/Calendly-/WhatsApp-Iframes im geprüften Build. Calendly, WhatsApp, Instagram, YouTube, TikTok und Facebook sind Links und erzeugen allein beim Rendern keinen automatischen Ressourcenabruf. Nach Klick entstehen eigenständige Datenflüsse; Dienste vor tatsächlicher Termin-/Messenger-Nutzung prüfen.
- `sessionStorage['flyingstars:motion']` merkt die ausdrückliche Bewegungswahl für die Sitzung. Kein Anfrageentwurf in persistentem Browser-Speicher. Notwendigkeit als gewünschte Komfort-/Barrierefreiheitsfunktion nach § 25 Abs. 2 TDDDG bewerten und beschreiben. Nicht pauschal „keine Speicherung im Browser“ versprechen.

Aus diesem Stand folgt kein Bedarf für ein pauschales Analyse-Cookiebanner. Das ist keine Freigabe für zusätzliche Dienste: Bei Cloudflare Web Analytics, Zaraz, Browser Insights, Challenge-Seiten oder künftigem Embed/Widget erneut tatsächliche Requests und Endgerätezugriffe prüfen. Diese Accountfunktionen wurden hier nicht kontrolliert.

## Was vor Livegang erforderlich ist

1. Verantwortliche FlyingStars GmbH, Kontaktdaten und gegebenenfalls Datenschutzbeauftragten bestätigen; finale Erklärung nach Art. 13 freigeben. Zwecke, b/f-Zuordnung und konkrete Interessen dokumentieren, Pflicht-/freiwillige Felder und Folgen fehlender Angaben erklären. Automatisierte Spam-Aussortierung transparent beschreiben; keine erhebliche Art.-22-Entscheidung im Prototyp erkennbar.
2. AVV/DPA-Kette Cloudflare, Brevo, Postfachanbieter und einschlägige Unterauftragnehmer dokumentieren; Drittlandgarantien konkret benennen und zugänglich machen. DPF-Status/Transferprüfung erneut kontrollieren. „EU-only“ für diesen Stack nicht zusagen.
3. Beschlossene Löschfristen und reale Einstellungen für Hostinglogs, Brevo-Logs/Vorschauen, Postfach, Backups und spätere CRM-Kopien festlegen. Betroffenenrechte, Widerspruch nach Art. 21, Beschwerderecht und Aufsicht ergänzen. Technische und organisatorische Maßnahmen mit Zugriffsrechten/MFA/TLS prüfen. [Art. 13/28/32 DSGVO](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:02016R0679-20160504)
4. Build-Endpoint, Domain und aktive Accountdienste kontrollieren. Absende-/Fehler-/Danke-Zustände auf aktivierten Versand abstimmen. Mit freigegebenem Testpostfach echte Annahme, Eingang und Antwort testen; hier wurde keine Mail versendet.

## Empfohlen

- Datensparsame lokale Spam-Prüfung beibehalten, wirksames Rate-Limit und Versandbudget ergänzen, bevor der Endpoint offen beworben wird.
- Brevo-Tracking für interne Anfragen deaktivieren, Vorschauen unterbinden, minimale Logfrist einstellen und Altbestände prüfen. Ausschließlich benötigte Mitarbeiterpostfächer nutzen.
- Freitext künftig ohne URL-Query übergeben. Bis dahin keine personenbezogenen Namen oder sensiblen Inhalte im Konfigurator anfordern. Hoster-Logs mit Querystrings gesondert minimieren.
- `quelle` entfernen, wenn niemand sie auswertet. Formularhinweis schlank halten und finalen Datenschutztext leicht erreichbar machen. Weitere Pflichtdaten erst bei konkreter Notwendigkeit erheben.
- Finale Quelle und Betriebsstandort für Medien konsolidieren. Keine Nachhaltigkeitsaussage allein aus „statisch“ oder „EU“ ableiten.

## Optional: passendere EU-Architektur

Die Entscheidung aus Design-Space Abschnitt 13 favorisierte Form.taxi. Abschnitt 15 akzeptierte Cloudflare Functions ausdrücklich als schnellen Prototyp; EU-Dienste sollten später folgen. Das ist eine offene Architekturentscheidung, kein bereits erfülltes EU-Versprechen.

**Form.taxi**, betrieben von wrkt*biz Reinhard Söllradl in Österreich, ist für einen betreuungsarmen EU-Formulardienst der naheliegende Prüf-Kandidat. Der Betreiber dokumentiert ALL-INKL in Dresden, EU-Mailversand via Mailjet, Friendly Captcha und EU-Verarbeitung der Formularsendungen. AVV wird im Panel abgeschlossen. Archivierte Einsendungen können bis zu einem Jahr bleiben, Spam einen Monat. Das ist eine zusätzliche Datenablage und muss zur Löschregel passen. Kontingente, Löschfunktionen, Unterauftragnehmer und den vollständigen Vertrag vor Abschluss prüfen. Eigene Weiterleitungen können die EU-Kette verlassen. Brevo ist bei direktem Mailjet-Versand nicht nötig; eine zusätzliche Brevo-Anbindung erfordert nachgewiesene Webhook-Authentifizierung und gegebenenfalls einen Adapter. Für das bestehende `fetch` braucht es einen Response-Adapter oder einen geprüften No-JS-Submitweg, nicht nur einen neuen URL-Wert. [Form.taxi Datenschutz](https://docs.form.taxi/de/privacy)

**Eigener EU-Endpoint auf Hetzner oder Scaleway** gibt mehr Kontrolle über Verarbeitung, Logs und Löschung. Hetzner ausdrücklich mit Standort Deutschland/Finnland wählen, nicht automatisch jeden weltweiten Standort akzeptieren. Scaleway mit passender EU-Region und separat geprüftem Dienst-AVV wählen. Ein kleiner gehärteter Node- oder anderer Webdienst genügt fachlich; Updates, Monitoring, Missbrauchsschutz, Zertifikate, Backups und Störungen bleiben eigene Betriebsarbeit. Der bestehende Request/Response-Code ist weitgehend portabel, Deployment/Rate-Limits/Secrets sind es nicht automatisch. Ein EU-Endpoint hinter weiterhin vorgeschaltetem Cloudflare wäre keine vollständig EU-exklusive Eingangsstufe. [Hetzner Datenschutz und EU-Standorte](https://docs.hetzner.com/de/general/company-and-policy/data-protection-at-hetzner/)

**Scaleway Transactional Email** kann zusätzlich Brevo ersetzen. TEM ist in Paris `fr-par`; die Produktdokumentation nennt Frankreich für Inhalte, Metadaten, Logs und Backups. API/SMTP-Anbindung, DKIM/SPF/DMARC, Absenderfreigabe, Retouren und Limits wären neu zu testen. Das Dokument belegt die TEM-Datenorte, nicht automatisch alle anderen Scaleway-Produkte oder die Gesamtwebsite. [Scaleway TEM Datenschutz](https://www.scaleway.com/en/docs/transactional-email/reference-content/data-privacy/)

Wenn „EU-only“ die Positionierung tragen soll, reicht ein Austausch des Mailversands nicht: Eingang/Hosting, Medien, Formulardienst und Postfach einschließlich Support/Unterauftragnehmern müssen zusammenpassen. Für dieses kleine Formular wirkt Form.taxi organisatorisch einfacher als ein eigener Container. Wer keine zusätzliche Formularablage möchte und den Betrieb übernimmt, kann den eigenen EU-Endpoint bevorzugen. Open Source ist dabei eine Wahl der eingesetzten Software, keine Eigenschaft von Cloudflare, Form.taxi oder einem bloßen EU-Server und keine DSGVO-Garantie.

## Prüfprotokoll

Keine produktiven Requests, Kontozugriffe oder Zustelltests, keine Secrets gelesen, kein Push oder Deployment.

Abschließende lokale Prüfung:

- `npx astro check`: 0 Fehler, 0 Warnungen, 227 bestehende Hinweise.
- `npm run build`: erfolgreich, 23 Astro-Seiten, 31 HTML-Dateien einschließlich Weiterleitungen. Der erste Basisbuild scheiterte beim externen Abruf eines Referenzbilds; Wiederholung auf unverändertem `7bd1fbf` erfolgreich.
- `node --test 'scripts/*.test.mjs' 'src/scripts/effects/*.test.mjs'`: 71 bestanden.
- Zusätzlicher dauerhafter Endpoint-Guard `node --experimental-strip-types --test src/scripts/contact.test.mjs`: 6 bestanden. Prüft Größen-/Feldgrenzen, Dateien, Mehrfachfelder, Origin, Zeitfalle/No-JS, Honeypot, Mail-Payload, Providerfehler und Turnstile ohne IP-Weitergabe. Provideraufrufe sind ausschließlich lokal gemockt.
- Nur `tests/inquiry.spec.ts`, Desktop/Mobil: auf unverändertem Basiscommit und Arbeitsbranch jeweils 6 bestanden, dieselben 4 fehlgeschlagen. Ursachen: veraltetes Label „Was soll am Himmel passieren?“ und Erwartung „Blog“ anstelle von „Wie Drohnenshows entstehen.“. Die Tests wurden nicht geändert. Nach Korrektur des ersten Labels muss auch dessen inzwischen bewusst präzisierte Status-Erwartung aktualisiert werden.
- Arbeitsbranch-Specs verwenden eine temporäre Konfiguration mit unverändertem Testinhalt und separatem Preview-Port 4415, damit andere Worker nicht betroffen sind. Dev wurde auf 4414 gestartet. Zusätzlicher Build-Browsercheck auf 4416 mit Desktop 1440 px und Mobil 390 px: tatsächliche FormData vom Browser durch die importierte Function ohne Versandkonfiguration; Vorbelegung, Entfernung von `text`/`show`, Datenschutzlink, Eingabeerhalt und fehlender horizontaler Überlauf geprüft. Screenshots des Hinweises in beiden Größen angesehen. Ohne JS bleiben beide Formularschritte sichtbar, das Dauerfeld fehlt. Keine E-Mail und kein Aufruf eines externen Versanddienstes.
- Scan der 31 HTML-Dateien: keine externen Ressourcenattribute, keine Iframes; Form-Action `/api/contact`, daneben das rein lokale Konfiguratorformular ohne Action. JS/CSS-Scan: einzige HTTP-Zeichenfolge ist der SVG-Namensraum, keine externe Asset-URL. Beim zusätzlichen Browsercheck von Kontakt und Datenschutz in beiden Größen 0 externe Requests. Serverseitige Video-Upstreams wurden anhand der festen Registry geprüft; Cloudflare-Production-Accountfunktionen bleiben ungeprüft.
- `git diff --check`: ohne Fehler. Keine Abhängigkeiten oder fremden Seiten geändert.

Lokale Belege liegen unter `/private/tmp/fs-dsgvo/` und `/tmp/fs-dsgvo-*.log`, insbesondere `form-1440.png`, `form-390.png`, `ui-proof.mjs`, Basis-/Arbeitsbranch-Testlogs und Function-Testlog. Temporäre Belege sind kein dauerhaftes Archiv.
