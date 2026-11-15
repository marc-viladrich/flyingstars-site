# EN/NL nach dem Umbau auf Moritz' Texte (15.11.2026)

Die deutschen Seiten Startseite, Werbung, Hochzeit und Indoor folgen Moritz' Webtexten (Commit `18a3924`). EN und NL waren danach nur formal angeglichen. Mit dem Folgecommit sind sie vollständig aus dem aktuellen deutschen Stand übersetzt:

- `src/content/pages/{en,nl}/index.yaml`, `drohnenshow-werbung.yaml`, `drohnenshow-hochzeit.yaml`, `drohnenshow-indoor.yaml`: alle übersetzbaren Felder neu aus DE, auch die mit gleichem `_key` und alter Übersetzung.
- `src/content/faq/{en,nl}/start-*.md`, `werbung-{einsatz,marke,kosten}.md`, `hochzeit-{moritz-kosten,planung,wuensche,musik,geheim}.md`, `indoor-{was-ist,unterschied,voraussetzungen,moritz-kosten}.md`
- `src/content/projects/{en,nl}/eon-hamburg.md`
- `src/i18n/ui.json`: Footer-Text `site.droneShowsForBusinessesCitiesFestivalsAndWeddingsDesignPermits`. Die Formularfelder waren in EN/NL schon passend.

Eigennamen, Kundennamen, Presse-Titel („1, 2 oder 3“, „Startup News“, „Ruhrorter Hafenfest“) und „Featured on Hochzeitsportal24“ bleiben unübersetzt. NL spricht wie der Bestand mit „jullie“ an.

## Status der Nachweise

Die Übersetzungen stammen von einem Agenten, nicht aus einer menschlichen Prüfung. Die Nachweise stehen deshalb weiter auf `adopted-existing`, nicht auf `reviewed`. Hashes und Fingerprints sind mit `project()` aus `src/i18n/contract.mjs` berechnet; `translate-missing.mjs --dry-run` meldet für EN und NL keine Befunde. Eine Durchsicht durch Muttersprachler*innen im Editor („Geprüft speichern“) steht aus.

## Offen

- `scripts/i18n.test.mjs` „Translation provenance …“: 629 historische Einträge in `content-provenance.json` zeigen auf Felder, die `18a3924` aus Startseite, Werbung, Hochzeit und Indoor entfernt hat. Entscheidung nötig: Einträge für entfernte Felder aus der Provenienz nehmen oder den Test auf noch vorhandene Pfade beschränken.
- `scripts/i18n-ui-dependencies.test.mjs` „used UI key quantity.number3 …“: Kein Inhalt nutzt mehr `{{offer.indoor.ceilingWords}}` (früher die Indoor-Karte der Startseite). Moritz' Texte nennen die Deckenhöhe als feste Zahl („Schon ab 3 Metern“, „mindestens drei Metern“). Entweder dort den Faktenplatzhalter einsetzen (nur in Feldern, deren Renderer `factText` nutzt; `textMedia.body` tut das nicht) oder den Test anpassen.
