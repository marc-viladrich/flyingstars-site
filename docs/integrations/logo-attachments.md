# Logoanhänge der Anfrage

Der Konverter rechnet lokal. `prepareLogoInquiry(file, points, drones)` ist die einzige Übergabe aus dem Konfigurator. Sie erzeugt eine PNG-Punkteansicht und hält die unveränderte Originaldatei sowie die gewählte Drohnenzahl im tabgebundenen `sessionStorage`. Die Auswahl gilt 30 Minuten, übersteht den Link von der Preisseite zum Formular und wird nach bestätigtem Versand gelöscht. Volles oder gesperrtes Storage verhindert die Vorbereitung mit sichtbarem Fehler. Kein Dateiinhalt und kein Dateiname wird in die URL geschrieben.

Das Formular zeigt beide Dateien mit Thumbnail, Name und Größe sowie die Drohnenzahl. Jede Angabe lässt sich separat entfernen. Vorschau und Drohnenzahl sind ein ausdrücklich bezeichneter Stand bei Übernahme. Nach Änderungen im Konfigurator erneut übernehmen. Erst der abschließende Submit hängt die verbleibenden `File`-Objekte an `FormData` an. Fehler und fehlende Versandkonfiguration behalten die Auswahl für einen erneuten Versuch. Ein Neuladen verwirft bereits entfernte Angaben nicht.

## Versand und Grenzen

Bestehender Weg: Cloudflare Pages Function → Brevo Transactional Email → konfiguriertes FlyingStars-Postfach. Keine neue Abhängigkeit, kein öffentlicher Downloadlink und keine zusätzliche serverseitige Ablage. Brevos [API-Referenz](https://developers.brevo.com/reference/send-transac-email) erlaubt Base64-Anhänge, jedoch keine direkten SVG-/WebP-Anhänge. Diese Originale kommen deshalb unverändert als einzelne Datei in einem unkomprimierten ZIP. PNG/JPG und Punkte-PNG werden direkt angehängt. Namen beim Versand sind fest vorgegeben; Kunden-Dateinamen werden nicht als Mailheader oder Archivpfad verwendet.

Pro Datei maximal 2 MiB, genau zwei erlaubte Dateifelder, insgesamt 4 MiB + 64 KiB Request. Das deckelt Pufferverbrauch und Base64-Mailpayload auf etwa 5,4 MiB plus Text. Die Punkteansicht ist 1000 × 1000 Pixel. Rasterdateien werden nach deklarierter MIME-Art, tatsächlicher Signatur, Containermerkmalen und maximal 16 Millionen Pixeln geprüft. Dies ist kein vollständiger PNG/JPEG/WebP-Decoder und kein Virenscanner. SVG akzeptiert nur eine eingeschränkte statische Geometrie mit erlaubten Elementen und Attributen; Skripte, Eventhandler, CSS, externe Ressourcen, Entities und Fremd-HTML werden abgewiesen. SVG wird serverseitig niemals ausgeführt oder gerendert; im Browser nur als `img` verwendet.

## Vor Livebetrieb offen

- Tatsächliche Brevo-/Postfachzustellung mit real konfiguriertem Dienst prüfen. Tests verwenden ausschließlich lokale Provider-/HTTP-Mocks.
- Datenschutzerklärung für Anhänge, Cloudflare, Brevo und Postfach vervollständigen; AV-Verträge, Transfers, Aufbewahrung und Löschung betrieblich bestätigen. Keine Aussage über reine EU-Verarbeitung.
- Gestaltung der Formularliste und feinere Fehlertexte können im Designpass folgen.

## Gezielte Prüfung

Mit `/opt/homebrew/bin` vorne im PATH:

```
node --test src/scripts/contact.test.mjs src/scripts/deferred-form.test.mjs src/scripts/logo-attachments.test.mjs src/scripts/logo-inquiry.test.mjs
npx playwright test --config tests/logo-attachment.config.ts --project chromium
npx playwright test --config tests/logo-attachment.config.ts --project webkit
npm run check
npm run build
```

Der separate Playwright-Config startet Astro Dev auf 4402 mit einem Worker. Die Specs prüfen die tatsächlich empfangenen Multipart-Bytes an einem lokalen HTTP-Mock, weil WebKits Playwright-Routing Datei-Inhalte in `postDataBuffer()` auslässt.
