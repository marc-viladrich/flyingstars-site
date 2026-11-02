# Analytics, Google Ads und Einwilligung

Stand 02.11.2026, Branch `codex/consent-library`, Basis `46cf22d`. Diese Dokumentation beschreibt die Library-Integration. Die [ursprüngliche Recherche und Abnahme des nativen Prototyps](analytics-consent-native-research.md) bleibt als historische Quelle erhalten. Deren Entscheidung für einen Eigenbau und Aussagen über unkonfigurierte IDs bzw. einen unverbundenen Adapter sind überholt.

## Entscheidung und Größe

`vanilla-cookieconsent` **3.2.1**, MIT, exakt aus npm gebündelt, ohne CDN und ohne Laufzeitabhängigkeiten. Die Library übernimmt Dialoge, getrennte Kategorien, Sprache, Speicherung, Revision und den Großteil der Fokussteuerung. Es gibt weder GTM noch einen extern gehosteten CMP-Dienst. Referenzen: [Konfiguration](https://cookieconsent.orestbida.com/reference/configuration-reference.html), [API](https://cookieconsent.orestbida.com/reference/api-reference.html), [Consent-Mode-Beispiel](https://cookieconsent.orestbida.com/advanced/google-consent-mode.html).

Der Aufpreis ist für die gewünschte gepflegte Oberfläche vertretbar, aber erheblich gegenüber dem kleinen Eigenbau. Die Library ist nicht automatisch robuster als jede native Lösung. Der reale Browserlauf fand ein verzögertes Autofokus-Rennen beim schnellen Schließen; die Integration korrigiert verlorenen Fokus nach dem Library-Timer, ohne eine bereits ausgeführte nächste Nutzeraktion zu übersteuern. Nach Laden oder Rückkehr zum Tab wird nur verlorener Fokus außerhalb des offenen Dialogs wiederhergestellt. Während eines Dialogs isoliert `inert` den Hintergrund wie beim früheren nativen Dialog; bestehende Inert-Zustände werden danach wiederhergestellt. macOS-WebKit wird gemäß dessen Tastaturmodus mit Option+Tab geprüft. Für die auf kurzen Bildschirmen scrollende Bannerbeschreibung wird ein explizites Tastaturziel ergänzt. Diese Safari-Anforderung fiel erst im vollständigen mobilen axe-Lauf auf. Eine zentrale revisionsfeste Consent-Nachweissammlung oder TCF-Zertifizierung kommt durch das Paket nicht hinzu.

Gemessen wird der Produktionsbuild mit Node 22, minifiziert, gzip Stufe 9 mit `mtime=0`. KB sind hier 1.000 Byte. Ohne externe Google-Bibliothek. Finale Werte und Testbelege stehen im Abnahmeabschnitt.

| Artefakt | Native Basis `46cf22d`, Byte/gzip | Library-Stand, Byte/gzip |
| --- | --- | --- |
| Consent-JS | 4.897 / 2.043 | 28.974 / 12.151 |
| Bedingter Einstieg | im Consent-JS enthalten | 134 / 142 |
| Library-CSS | im globalen CSS enthalten | 31.875 / 5.326 |
| Site-Consent-CSS | im globalen CSS enthalten | 2.923 / 933 |
| Globales Base-CSS | 81.643 / 17.577 | 79.201 / 17.231 |

Consent-JS und CSS zusammen **18.552 Byte gzip**, also **18,6 KB**. Nach Abzug des nativen JS und der eingesparten 346 Byte im komprimierten globalen CSS beträgt der zusätzliche JS/CSS-Transfer **16.163 Byte gzip**. Der bereits vorhandene identische Vite-Preload-Helper ist in beiden Builds vorhanden und nicht doppelt eingerechnet. Das Startseiten-HTML schrumpft von 20.723 auf 20.646 Byte gzip. Die Werte sind Artefaktgrößen, keine Netzwerklatenz- oder CWV-Messung.

Die gesamte Library samt CSS wird nur über den vorhandenen `Consent.astro`-Einstieg dynamisch importiert, wenn mindestens eine Tag-ID konfiguriert ist. Ohne IDs keine Banner-Konfiguration, kein Import des Consent-Pakets und keine Consent-CSS-Anfrage. Die Library generiert die Einstellungen erst beim Öffnen. Nur die Consent-Texte der aktuellen Sprache werden ins HTML übernommen; keine zusätzliche Kopie des gesamten UI-Wörterbuchs im Consent-Chunk.

## Verhalten und Speicherung

DE, EN und NL kommen aus `src/i18n/ui.json`. Notwendig ist fest aktiv, `analytics` und `marketing` beginnen aus und werden nur für tatsächlich konfigurierte Ziele angeboten. Die primären Buttons Ablehnen/Akzeptieren verwenden dieselben Klassen und Abmessungen; Ablehnen steht im DOM vor Akzeptieren. Hintergrund, Space Grotesk/Inter, orange Links, Fokus und Buttons folgen `docs/DESIGN.md`.

Ein einziger Library-Datensatz liegt unter `flyingstars:consent` in `localStorage`. Er enthält Kategorien, Consent-ID, Sprache, Zeitpunkte, Ablauf und Revision. Laufzeit **180 Tage**, auch bei Ablehnung. `CONSENT_VERSION` in `src/lib/consent.mjs` bei geänderten Zwecken oder wesentlichen Textänderungen erhöhen. Die numerische Library-Revision wird zusätzlich aus den drei Zielkennungen abgeleitet. Änderungen an IDs/Label verlangen eine neue Auswahl; alte native Einträge werden nicht als Zustimmung übernommen.

Beschädigte, abgelaufene, zukünftige und unpassende Datensätze gewähren keine Zustimmung. Der Adapter prüft den Ablauf vor Lead-Ereignissen, ein Timer berücksichtigt lange geöffnete Tabs. Ein Schreibtest mit unverändertem Datensatz verhindert das Wiederherstellen alter Zustimmung aus schreibgeschütztem Speicher und verlängert die Frist nicht. Bei Speicherfehler gilt eine aktuelle Auswahl nur im Dokument und ein sichtbarer Hinweis erklärt die Grenze.

Einstellungen bleiben im Footer erreichbar. Impressum und Datenschutz lassen sich ohne Entscheidung lesen. Jede Änderung bereits geladener Tags beendet deren Dokument durch Reload, mit `ga-disable` für GA4 und bestmöglichem Entfernen erreichbarer First-Party-Google-Cookies. Es geht kein zusätzliches Denied-Update an die alte Google-Instanz, das einen Ping auslösen könnte. Im neuen Dokument gelten wieder alle Defaults. Ein `storage`-Ereignis synchronisiert Widerruf und Änderungen in anderen Tabs; BFCache-Wiederherstellung lädt ebenfalls neu. Bereits übertragene Daten, fremde/HttpOnly-Cookies und unbekannte Cookie-Pfade können dadurch nicht zurückgerufen bzw. vollständig gelöscht werden.

## Google Consent Mode v2 und Ereignisse

Basic Mode: Vor einer Entscheidung und nach Ablehnung werden keinerlei Google-Ressourcen angefordert. Alle vier Signale starten lokal mit `denied`; nur anschließend erlaubte Ziele werden konfiguriert und ein einziges `gtag/js` geladen.

| Auswahl | analytics_storage | ad_storage | ad_user_data | ad_personalization |
| --- | --- | --- | --- | --- |
| Keine/Ablehnung | denied | denied | denied | denied |
| Analytics | granted | denied | denied | denied |
| Marketing | denied | granted | granted | denied |
| Beide | granted | granted | granted | denied |

Personalisierung bleibt mangels angebotenem Personalisierungszweck immer aus. Enhanced Conversions sind im Tag explizit aus, `allow_google_signals` und `allow_ad_personalization_signals` ebenfalls. Keine Formularwerte, gehashten E-Mail-Adressen oder `user_data`. Kontoautomatik muss separat ausgeschaltet und die reale Google-Payload geprüft werden. `page_location` enthält Origin und Pfad ohne Query/Fragment; `page_referrer` und `page_title` sind leer. Das begrenzt explizite Felder, garantiert aber nicht das interne Verhalten des externen Google-Codes.

`functions/api/contact.ts` erzeugt **nur nach erfolgreicher Brevo-Annahme** eine zufällige UUID v4 in `requestId`. Honeypot liefert weiterhin einen vorgetäuschten `sent`-Erfolg ohne UUID; `not-configured`, Fehler und Timeout liefern ebenfalls keine UUID. Provider-Annahme ist der technische Messpunkt, kein Beleg für Postfachzustellung oder eine qualifizierte Anfrage.

`src/scripts/contact.ts` fordert HTTP-Erfolg, `ok === true` und `state === 'sent'`. Nur mit `requestId` löst es danach `flyingstars:lead-confirmed` aus. Der Adapter prüft UUID, aktuell gültige Einwilligung und Ziele:

- Marketing: Ads-`conversion`, `send_to=AW-10895586292/sbEZCK3tv-kaEPTntcso`, UUID als `transaction_id`.
- Analytics: GA4-`generate_lead`, ausdrücklich an `G-58DM798QN8` adressiert.

Deduplizierung pro UUID im Dokument. Kein Replay nach späterer Zustimmung. Kontakt-/Danke-Seitenaufruf, Submit-Klick, bloße Validierung, Honeypot, Vorschau und Versandfehler zählen nicht. Ein Browserereignis allein ist keine Sicherheitsgrenze gegen beliebige Seitenskripte; die echte Formularverbindung und der Backend-Erfolg werden zusätzlich getestet.

## Build und öffentliche GitHub-Variablen

Diese **Repository variables**, keine Secrets, wurden für `marc-viladrich/flyingstars-site` gesetzt und zurückgelesen:

| Name | Wert |
| --- | --- |
| PUBLIC_GOOGLE_ADS_ID | AW-10895586292 |
| PUBLIC_GOOGLE_ADS_LABEL | sbEZCK3tv-kaEPTntcso |
| PUBLIC_GA_ID | G-58DM798QN8 |

Die Ads-Kundennummer `281-224-6991` und die Analytics-Property-ID `194466424` sind keine Tag-Kennungen und werden nicht verwendet. Der Nutzer lieferte die Tag-IDs aus dem verifizierten Capture vom 28.09.2026. In diesem Auftrag wurden keine Kontozugänge und keine `.env`-Dateien gelesen.

`.github/workflows/deploy-cloudflare.yml` und `deploy-cloudflare-preview.yml` übergeben alle drei `${{ vars.… }}` beim Astro-Build. Der manuelle Preview-Workflow baut den ausgewählten Branch und nutzt weiterhin den vorhandenen Alias `manual-preview`; Produktion bleibt `main`. Für eine eigene Branch-URL dient der lokale Preview-Aufruf weiter unten. Eine reine Änderung der Cloudflare-Function-Umgebung genügt nicht für Astro-Buildwerte. Der nächste Build aus diesem Branch bzw. nach Merge trägt die Kennungen ins HTML ein. Bestehende Deployments ändern sich durch das Setzen der Repository-Variablen nicht.

Für lokale Preview-Builds liest `scripts/build-cloudflare-preview.mjs` ausschließlich die drei öffentlichen Variablen aus `gh variable list`, validiert sie und startet `npm run build` mit diesen Werten im Prozess. Kein `eval`, keine Secrets und keine erzeugte `.env`:

```sh
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
SITE_URL=https://codex-consent-library.flyingstars-site.pages.dev node scripts/build-cloudflare-preview.mjs
```

Der vorhandene lokale `/tmp/fs-deploy-preview.sh` liest dieselben drei Variablen direkt per `gh variable list` und wurde mit `bash -n` geprüft. Das funktioniert auch auf älteren Branches ohne den neuen Repo-Buildhelfer. Er erlaubt `FS_PREVIEW_BRANCH`, Standard bleibt `feat/designsprache-poc`. Für den gepushten Branch lautet der Aufruf:

```sh
FS_PREVIEW_BRANCH=codex/consent-library /tmp/fs-deploy-preview.sh
```

Der lokale Deploy wurde in diesem Implementierungsauftrag **nicht ausgeführt**. Das temporäre Deployscript ist nicht Teil des Repos; der Buildhelfer und diese Anleitung sind versioniert. GitHub-Authentifizierung und vorhandener Cloudflare-Zugang bleiben Voraussetzungen. `.env.example` nennt die optionalen Variablen mit leeren Werten.

## Nach dem nächsten Deployment prüfen

1. Mit frischem Browserprofil in DE, EN und NL öffnen. Banner und Footer testen. Netzwerk vor der Entscheidung und nach Ablehnung enthält keine Google-Requests. Keine Google-Preconnects und keine CDN-Library.
2. Nur Analytics bzw. nur Marketing wählen. Genau das jeweilige Ziel konfigurieren; vier Consent-Signale in Tag Assistant prüfen. Einstellungen öffnen, widerrufen und zweiten bereits offenen Tab kontrollieren.
3. Eine vereinbarte Testanfrage wirklich versenden. API-Antwort muss `ok: true`, `state: sent` und UUID enthalten; Eingang zusätzlich im Postfach prüfen. Mit Marketing eine Ads-Conversion, mit Analytics ein `generate_lead`; keine personenbezogenen Formularwerte in den Messanfragen. Google-Testbetrieb mit der Ads-Fachperson abstimmen.
4. Direkt `/danke/` öffnen: kein Lead. Versandfehler oder `not-configured`: kein Lead. Eine ohne Zustimmung versendete Anfrage nach späterer Zustimmung nicht nachmelden.
5. Im Google-Konto kontrollieren, ob die richtige Aktion eingeht und importierte GA4-Leads nicht zusätzlich dieselbe primäre Ads-Conversion zählen.

## Was FlyingStars noch entscheiden und freigeben muss

- Ads-Verantwortliche und primäre Anfrage-Conversion, Zählmethode, Attribution, Werte und Kampagnenziele bestimmen. Alte Danke-Seiten-Conversion sowie parallelen GA4-Import prüfen und geordnet ablösen.
- GA4-Zweck, Verantwortliche, Aufbewahrung und Reporting festlegen. Insbesondere automatische Formularereignisse/Enhanced Measurement, Google Signals, Remarketing, Zielgruppen-/Kontoverknüpfungen, Datenfreigaben und Enhanced Conversions in Ads/GA4 prüfen. Der Code ersetzt diese Kontoeinstellungen nicht.
- Dienstspezifische AVV und Verantwortungsrollen, Empfänger, Drittlandmechanismen und aktuellen DPF-Status dokumentieren. Ein Vertrag für einen Google-Dienst deckt nicht automatisch alle anderen Funktionen ab. Die Quellen und rechtlichen Grenzen stehen im Recherchearchiv.
- DE/EN/NL-Datenschutzentwürfe juristisch und sprachlich freigeben, reale Cookies/Laufzeiten ergänzen und Consent-Nachweisführung samt Revisionierung abstimmen. Die technischen Änderungen sind keine rechtliche Freigabe. Bibliothek und 180 Tage sind keine allgemeine Konformitätsgarantie.

## Technische Abnahme

Prüfumgebung: Node **22.22.1**, Basis `46cf22d`, Worktree `/private/tmp/fs-consent-library`. Die Vorschauen verwenden isolierte Ports und den ausdrücklich angegebenen Build. Andere laufende Checkouts wurden nicht übernommen.

- `npx astro check`: **197 Dateien, 0 Fehler, 0 Warnungen**, 232 bestehende Hinweise.
- `npm run build` mit den drei echten öffentlichen IDs sowie mit leeren Werten: jeweils **65 Seiten erfolgreich**. Die finale aktive Ausgabe liegt in `/tmp/fs-consent-final-dist`, die deaktivierte in `/tmp/fs-consent-off-dist`. Ein vorübergehender Fehler beim Abruf eines bestehenden Vercel-Referenzbilds wurde durch Wiederholung desselben Builds behoben; keine Inhaltsänderung dafür.
- `node --test 'scripts/*.test.mjs' 'src/scripts/effects/*.test.mjs' 'src/scripts/*.test.mjs'`: **105 bestanden, 0 Fehler**. Die geänderten Consent-/Kontakt-/i18n-Grenzen wurden zusätzlich mit **15 bestandenen Tests** geprüft.
- Die angeforderten Playwright-Dateien `consent`, `network-allowlist`, `a11y`, `html` und `i18n` wurden mit **drei Workern** in Desktop-/Mobil-Chromium und Desktop-/Mobil-WebKit ausgeführt. Nach Unterbrechung eines Teil-Laufs, Korrekturen und gezielten Wiederholungen wurde die vollständige Fallliste gegen die Ausführungsprotokolle abgeglichen: **892 eindeutige Fälle, 888 bestanden, 4 erwartete OFF-Build-Skips, kein fehlender oder weiterhin fehlgeschlagener Fall**. Die Schlussläufe verwendeten unter paralleler Rechnerlast ein 60-Sekunden-Testlimit.
- Nach der letzten Fokuskorrektur die vollständige Consent-Suite erneut ausgeführt: **84 bestanden, 4 erwartete OFF-Build-Skips**. Der Fokus-/Screenshotfall im mobilen WebKit bestand zusätzlich **fünf Wiederholungen**, ebenso der zuvor einmal im Dialogübergang gescheiterte Read-only-Storage-Fall. Der Test wartet nun auf die tatsächliche Freigabe der Hintergrundinteraktion.
- Deaktivierter Build: Netzwerk-/Consent-Lauf **264 bestanden**, aktive Fälle erwartungsgemäß übersprungen; auf dem finalen OFF-Build zusätzlich **4 bestandene Ohne-ID-Prüfungen**. Die bestehende Netzwerk-Allowlist enthält weiterhin keinerlei Google-Ausnahme.
- Banner und Einstellungen auf Deutsch bei **1440 × 900 und 390 × 900** in beiden Browserengines als Screenshots erzeugt und geöffnet. Tastatur, Fokus-Rückgabe, Hintergrundisolation und scrollbarer Text bei 390 × 600 zusätzlich geprüft. Kein manuelles Screenreader-Audit, kein physisches iPhone und kein beobachteter Nutzertest.
- Die GitHub-Workflows installieren jetzt Chromium **und WebKit** mit entsprechend neuem Browser-Cache-Schlüssel. Der zusätzliche aktive Dummy-Build prüft Consent und Netzwerk-Allowlist in allen vier Profilen. GitHub-CI ist gesondert am PR zu prüfen; lokale Ergebnisse werden nicht als bereits grüne Remote-CI ausgegeben.

Die Tests kontaktieren **keinen Google-Server** und versenden **keine echte E-Mail**. Google-Anfragen werden abgefangen; Provider-Annahme wird durch lokale HTTP-Stubs geprüft. Reale Attribution, Google-Payloads, Brevo-Annahme und Postfacheingang bleiben Bestandteil der Live-Abnahme.

Die vollständige Fallliste und der Abgleich liegen in `/tmp/fs-consent-case-plan.json`, `/tmp/fs-consent-case-coverage.json` und `/tmp/fs-consent-check-coverage.py`. Die finalen Consent-Screenshots stammen aus `/tmp/fs-consent-final-consent-results/consent-configured-public--59c6c-eyboard-no-overflow-and-axe-{desktop,mobile,webkit,mobile-webkit}/`. Kopien der Screenshots und entscheidenden Protokolle wurden dauerhaft unter `/Users/marcviladrich/Movies/Codex Feature Proofs/flyingstars-consent-2026-11-02/` gesichert. Alle Messungen betreffen den tatsächlich gebauten Stand, nicht die externe Google-Bibliothek.


Reproduzierbarer aktiver Lauf ohne Umgebungsdatei, mit ausschließlich abgefangenen Google-Anfragen:

```sh
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
export PUBLIC_GOOGLE_ADS_ID=AW-10895586292
export PUBLIC_GOOGLE_ADS_LABEL=sbEZCK3tv-kaEPTntcso
export PUBLIC_GA_ID=G-58DM798QN8
npm run build
CONSENT_TEST_ENABLED=1 PLAYWRIGHT_PORT=4469 npx playwright test tests/consent.spec.ts tests/network-allowlist.spec.ts tests/a11y.spec.ts tests/html.spec.ts tests/i18n.spec.ts --workers=3
```

Für den OFF-Build alle drei öffentlichen Variablen im Buildaufruf leer übergeben und `CONSENT_TEST_ENABLED=0` verwenden. Die im Testprozess gesetzten öffentlichen Werte müssen zum aktiven Build passen; ohne diese Angaben erwartet die Consent-Suite die dokumentierten Dummy-IDs aus der CI-Konfiguration.
