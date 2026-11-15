# EN/NL nach dem Umbau auf Moritz' Texte (15.11.2026)

Die deutschen Seiten Startseite, Werbung, Hochzeit und Indoor folgen jetzt Moritz' Webtexten. EN und NL sind **nicht übersetzt**, sondern nur formal an den Vertrag angeglichen, damit der Build läuft:

- Neue Felder (neue Sections, Karten, Schritte, FAQ-Einträge, Projekt `eon-hamburg`) tragen in EN und NL den **deutschen Text**.
- Felder mit gleichem `_key`, deren deutscher Text sich geändert hat, behalten die **alte Übersetzung**. Sie passt inhaltlich nicht mehr zum neuen deutschen Text.
- Alte Übersetzungen mit anderen Faktenplatzhaltern als der neue DE-Text wurden durch den DE-Text ersetzt.
- Alle diese Nachweise stehen auf `adopted-existing`. Das ist keine Prüfung. Mit `unreviewed` bricht der Build außerhalb des Editors ab.

Vollständig neu zu übersetzen:

- `src/content/pages/{en,nl}/index.yaml`, `drohnenshow-werbung.yaml`, `drohnenshow-hochzeit.yaml`, `drohnenshow-indoor.yaml`
- `src/content/faq/{en,nl}/start-*.md`, `werbung-{einsatz,marke,kosten}.md`, `hochzeit-{moritz-kosten,planung,wuensche,musik,geheim}.md`, `indoor-{was-ist,unterschied,voraussetzungen,moritz-kosten}.md`
- `src/content/projects/{en,nl}/eon-hamburg.md`
- `src/i18n/ui.json`: EN/NL von `site.droneShowsForBusinessesCitiesFestivalsAndWeddingsDesignPermits` (Footer-Text nach Moritz) und die Formularfelder `contactform.*` / `contact.yourEnquiry…` (DE jetzt in Ihr-Form)

Nur Hash und Nachweise ohne Textänderung (neue optionale Schemafelder): `danke`, `datenschutz`, `impressum`, `kontakt`, `referenzen`, `ueber-uns`.
