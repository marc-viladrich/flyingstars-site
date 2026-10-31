# Chopper: Sprung vor der Wende

Behoben am 31.10.2026 in `src/scripts/effects/swarm.js`.

## Ursache und Entscheidung

`Swarm.frame()` berechnete den Übergangsfortschritt vor dem Aufruf der dynamischen
Formation. Chopper spiegelt während dieses Aufrufs seine Zielpunkte und startet mit
`retarget(3200)` eine neue Wolke. Der Renderer verwendete für diesen Frame trotzdem
den alten, bereits abgeschlossenen Fortschritt. Dadurch erschien die gespiegelte
Formation sofort für einen Frame. Im nächsten Frame sprang sie zurück zur
Ausgangsposition und begann erst dann den Wolkenflug.

Der Fortschritt wird jetzt nach dem dynamischen Aufruf berechnet. Er wird auf
0 bis 1 begrenzt, weil `performance.now()` in `retarget()` etwas später als der
Zeitstempel des laufenden Animationsframes liegen kann. Negative Werte würden
die Ausgangshelligkeit kurz verstärken.

Der Fix gehört in den gemeinsamen Renderer, nicht in Choppers Hover-Entprellung
oder die Flugsteuerung. Wolkenpfad, Wendepause und Tempo bleiben erhalten.

## Schneller Wächter

```sh
npm run test:effects
```

Sieben Tests mit der echten `Swarm.frame()`- und `retarget()`-Implementierung;
nur Browser-Umgebung und Zeichnen sind ersetzt. Abgedeckt sind 30/60/120 fps,
eine unterbrochene Wolke, leicht versetzte Zeitstempel sowie reduzierte und
pausierte Bewegung. Die drei Bildratenfälle wurden vor dem Fix rot ausgeführt.
Der Wächter liegt neben dem Modul und ist auch im regulären `npm test`-Befehl
eingebunden. `test:effects` führt nur diese schnellen Node-Tests aus.

Auf `/gibt-es-nicht/` wurde vor dem Fix bei 438 Drohnen ein Positionssprung von
446,49 CSS-Pixeln im ersten Wendeframe gemessen. Die Diagnose liest die Positionen
unmittelbar vor `retarget()` und beim folgenden `draw()`, ohne die Bewegung zu ändern.
Nach dem Fix: 0 CSS-Pixel Sprung beim Beginn der Wende in beiden Richtungen.
Ein vollständiger Wolkenflug wurde zusätzlich über 193 Frames gemessen;
der größte einzelne Positionsschritt betrug 8,45 CSS-Pixel.

Bei Vite-HMR muss die Browser-Diagnose dieselbe Modul-URL einschließlich
`?t=…` verwenden wie die laufende Komponente. Ein separater Import ohne diesen
Parameter liefert sonst eine andere Klasse und beobachtet die Animation nicht.

`astro check`: 0 Fehler, 0 Warnungen, 210 Hinweise. `astro build`: erfolgreich;
Hinweis auf statischen und dynamischen Import von `shape-core.js` bleibt bestehen.
Keine komplette Browser-Testsuite und keine Aufnahme ausgeführt. Die mitgelieferte
Desktop-Aufnahme war durch macOS-Datenschutz nicht lesbar.
