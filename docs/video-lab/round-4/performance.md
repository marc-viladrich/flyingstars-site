# CSS, optionale Skripte und Bildmaße

Zusätzlicher Auftrag von Marc am 03.11.2026, zusammen mit dem ruhigeren Showreel und responsiven Videogrößen umgesetzt.

## Ursachen und Änderungen

- Der vollständige Konfigurator gelangte über PricingPage im gemeinsamen [...slug].astro-Importgraph in das CSS von Seiten ohne Konfigurator. Sein Stylesheet wird nun nur zusammen mit tatsächlich gerendertem Konfigurator ausgegeben. Auf Preis-/Konfiguratorseiten bleibt es sofort verfügbar.
- Der Teaser hat ein kleines eigenes Inline-Stylesheet, das nur bei seiner Verwendung ausgegeben wird. Seine statische Darstellung steht vor dem optionalen Animationsmodul bereit.
- Der anonyme 8,5-KiB-Chunk enthält 15 Komponenten einschließlich LandingHero und initiale Layoutregeln. Er und global.css werden nicht pauschal verzögert.
- Die scheinbare Teaser-Consent-Abhängigkeit entsteht durch gemeinsame Vite-Preloadhelper-Aufrufer. Die eigentlichen Imports sind getrennt. Consent und Tracking-Sperren bleiben unverändert.
- when-near.mjs lädt Formular, Vollkonfigurator, Teaser und Bildpunkteffekte nahe dem Viewport oder bei Interaktion. Mehrere Trigger teilen denselben Import; Fehler erlauben einen erneuten Versuch. Query-/Hash-Vorbelegung wird sofort eingerichtet.
- deferred-form.mjs hält einen frühen Submit während des Formularimports auf derselben Seite und übergibt genau einmal samt echtem submitter an den vorhandenen Handler. Bei Fehler bleiben Eingaben erhalten; lokalisierter Status und Retry. Kein echter Versandtest.
- Die Eco-Section reserviert die endgültige Scrollhöhe früh. Die schwere Canvas-Engine folgt später; die Seitenhöhe wird nicht erst beim Annähern vergrößert.
- LocalImage liest echte Logo-Maße über vorhandenes sharp aus den Dateien. Keine separate Metadatenliste. Im gesamten generierten Build fehlen keine img-Maße mehr.

Die ursprünglichen Konfigurator-/Teaser-Selektoren und Deklarationen bleiben bis auf die Entfernung der nicht mehr benötigten Astro-:global-Wrapper erhalten. Die cfg-/cft-Präfixe trennen ihre Regeln.

## Kontrollmessung

Lighthouse 12.8.2, je ein kalter lokaler mobiler Lauf mit simulierter Drosselung, ohne Antwortkompression, Scrollen oder Consent-Aktion. Beide Messbuilds haben keine Google-Konfiguration oder Consent-UI. Die öffentliche WIP hat diese Konfiguration. Die Zahlen sind deshalb kein öffentlicher WIP-Score. Video-, Bild- und Fontbytes sind in beiden Kontrollläufen identisch.

| Metrik | Vorher | Nachher mit Submit-Gate |
|---|---:|---:|
| CSS-Requests | 3 | 2 |
| CSS resourceSize, Byte | 152.781 | 121.382 |
| JS resourceSize, Byte | 88.151 | 24.151 |
| HTML resourceSize, Byte | 106.319 | 110.871 |
| Gesamtrequests | 35 | 33 |
| Lighthouse Performance | 81 | 85 |
| LCP, ms | 4071 | 3607 |

Unkomprimierte Ressourcengrößen und Einzelmessungen ergeben keine statistisch abgesicherte Scoreänderung oder Hosting-Transfergröße. Der zusätzliche HTML-Anteil enthält das direkt benötigte Teaser-CSS. Eine spätere strukturelle API-Default-Zuordnung im Loader erhält rootMargin und besteht den unveränderten no-px-Wächter. Dafür wird keine Performancewirkung behauptet.

Rohdaten, Traces, Quellenvergleich und Messgrenzen liegen im Geschäftshub unter notes/flying-stars/video-lab-2026-11-03/performance-round-4/. Die Benchmarkablage vom 02.11. bleibt unverändert.

## Finale gemeinsame Prüfung

66 fokussierte Node-Tests plus neun Render-/Bild-/Dotimageprüfungen gegen den finalen Build erfolgreich. Astrocheck: 255 Dateien, null Fehler, null Warnungen, 238 Hinweise. Build: 129 Seiten erfolgreich. Für den finalen Build waren öffentliche Dummy-GA-/Ads-Werte gesetzt; Lab-Seiten bleiben ohne Google-Konfiguration. Keine neue Dependency oder Astro-/CI-Konfigänderung, keine breite Browsersuite oder Aufnahme. Safari-/Mobildecodierung und visuelle Resize-Übergänge werden durch diese CLI-Tests nicht nachgewiesen.

Build-Sweep nach relevanten Änderungen:

```sh
FLYINGSTARS_AUDIT_DIST=dist node --test src/scripts/performance-rendering.test.mjs
```
