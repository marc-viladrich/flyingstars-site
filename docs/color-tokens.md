# Farben für Website und Editor

`src/lib/color-tokens.mjs` enthält die Website-Palette als eingefrorene Einträge mit stabiler Kennung, deutschem Namen, Hex-Wert und Gruppe. `Base.astro` erzeugt daraus die `--c-*`-Variablen. Die bisherigen semantischen Variablen in `global.css` verweisen darauf. Transparente Varianten verwenden relative RGB-Farben, damit auch vollständig transparente Verlaufsstopps ihre ursprünglichen RGB-Kanäle behalten.

`showcase.accent` und Paket-`color` speichern ausschließlich gültige Token-Kennungen. Beide Zod-Felder tragen `format: 'color'`. Die beiden Wege zur Feldbeschreibung reichen dieses Format unverändert durch. Übersetzungswerkzeuge und der Fremdsprachenzweig des Editors schließen solche Felder aus. Die Farbauswahl selbst implementiert Task B.

CSS-Verbraucher verwenden `colorVar(id)`. Die Canvas-Verbraucher verwenden `rgbOf(id)` an der Grenze zur Zeichenfunktion. Paketdaten behalten im HTML ihre Kennungen. Logo-Punkte und Formationsfarben bleiben unveränderte Grafikdaten.

Die sieben migrierten Inhaltswerte behalten ihre Farben. Spark unterscheidet sich weiterhin von Amber, Horizon von Orchidee. Unbekannte Kennungen scheitern bei der Schema-Prüfung und bei beiden Resolvern.

`editor/web/ui-tokens.css` enthält die Variablen des Editors. `editor.css` importiert sie und `frame.js` lädt dieselbe Datei für die iframe-Werkzeuge. Die Dateien enthalten keine gegenseitigen Resets. Die Registry wird wie `inline-text.mjs` über die Browser-Dateiliste des Site-Adapters bereitgestellt; die Anmeldung schützt beide Module.

Prüfung mit Node 22:

```sh
node --test 'editor/*.test.mjs' 'editor/test/*.test.mjs' 'editor/core/*.test.mjs' src/schemas/editorial-source.test.mjs
npx astro check
FLYINGSTARS_OFFLINE_MEDIA=1 npx astro build
```

`editor/color-tokens.test.mjs` prüft Registry, Resolver, beide Feldbeschreibungen, Übersetzungsausschluss und Farbliterale in allen Komponenten, Website-Styles und Editor-Werkzeugen. Neue Farben gehören in die jeweilige zentrale Definition. Die NativeStore-Tests prüfen außerdem Speicherung gültiger Kennungen und Ablehnung unbekannter Kennungen und alter RGB-Tupel.
