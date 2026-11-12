# Motiv-Animationen, erste Fassung

Branch `feat/motiv-animationen`, Basis `feat/logo-runde-5` / `96d2646`.

Alle vier Aktionen laufen durch `catalogAction()` in `src/scripts/scenes/catalog-actions.js`. `catalog.js` verwendet dieselben Punktidentitäten, Reserven, Paketfassungen und die vorhandene Flugengine einschließlich `steadyClock` und Reduced Motion. Die Aktion erhält eine eigene Haltezeit und beginnt in ODYSSEY nach dem Lichtaufbau bei Uhr 0. Der Bildausschnitt berücksichtigt Ausgangs- und Endpositionen.

| Motiv | Ursache und Umsetzung | Kontaktbogen |
| --- | --- | --- |
| Smiley | Das bisherige Profil `breathe` bewegt nur Licht bzw. das ganze Gesicht. Jetzt schließt sich ausschließlich das rechte Auge zu einer Linie und öffnet sich wieder. Die Augenpunkte bleiben erhalten. | [smiley.png](smiley.png) |
| Handschlag | `shimmer` fiel bisher auf das allgemeine Lichtprofil zurück. Die Katalogformation ist eine offene Pose. Beide Seiten nähern sich nun auf geraden, gemeinsam getakteten Bahnen und formen die Finger zu einem Griff. Einmalige Zuordnung je Hand, keine neue Punktzuordnung pro Frame. | [handschlag.png](handschlag.png) |
| Konfettikanone | Bisher war der Ausstoß bereits vollständig sichtbar. Nun zieht zuerst der untere Ring an der Schnur, dann fliegen die vorher dunklen Konfettipunkte aus dem Bereich der Mündung auf geraden Bahnen zu ihren Katalogpositionen. Beide Varianten, 100 und 158 Punkte. Die Sektflasche behält ihr eigenes bisheriges Profil. | [konfetti.png](konfetti.png) |
| Anstoßen | Der Import teilt die Gläser anhand `x < 0`. Überragende Kelchpunkte gehören dadurch zum falschen Glas, besonders bei 88/108 Punkten. Statt dieser Gruppen verwendet die Aktion anhand der Quellpunkte geprüfte Masken für alle vier Varianten. Nur das rechte Glas bewegt sich als ein starrer Satz. Das linke bleibt räumlich stehen und dimmt aus, Funken bleiben stehen. | [anstossen.png](anstossen.png) |

## Quellen und Grenzen

Lokale Quelle: `…/flyingstars/20-katalog-und-materialinventar-2026-11-05/clip-analyse/`.

- Handschlag: `clips.json`, Eintrag `m-3a2eec826186dbb9`, Kontaktbogen `sheets/24-m-3a2eec826186dbb9.jpg` selbst gesichtet. Dort nähern sich offene Hände und schließen die Finger. Die bisherige Punktdatei zeigt die offene Ausgangspose. Die geschlossene Zielkontur ist eine eigene Näherung an die späten Clipframes, keine ausgelesene Flugspur. Die Händezuteilung der Quelle ist ebenfalls nur geschätzt.
- Konfetti: `sheets/09-m-cef98ff37d5b9b24.jpg` selbst gesichtet. Erst Ring/Schnur und Kanone, später Konfetti. Farbige Mündung und ausgestoßene Punkte werden separat behandelt. Die 100er-Variante stammt aus dem Katalogbild und hat keinen Clip.
- Glas-Masken: alle vier importierten Punktdateien mit beschrifteten Indizes lokal gerendert und gesichtet. Neue Glasvarianten ohne überprüfte Maske werfen einen Fehler. Das Importscript bleibt unverändert; seine alten `groups.glasses` werden für diese Aktion nicht mehr verwendet.
- Die Verdeckung ist zunächst ein gemeinsam getaktetes Ausdimmen des ganzen linken Glases während der Überlagerung, keine punktgenaue Silhouettenmaske. Das ist ein bewusster offener Punkt für Claudes visuelle Verfeinerung.
- Die Nachweise belegen Punktzahl, Stetigkeit sowie Geschwindigkeits- und Beschleunigungsgrenzen. Sie sind keine Kollisionsplanung für eine echte Drohnenshow; Mindestabstände sind nicht geprüft.

## Nachweis wiederholen

Node: `/opt/homebrew/bin/node`. `node_modules` ist mit dem Hauptcheckout verlinkt.

`node docs/motiv-animationen/render.mjs` erzeugt die vier PNGs aus den tatsächlichen `catalogScene()`-/`live()`-Funktionen. Spalten zeigen die lokale Aktionsuhr, nicht die durch die Flugengine verlangsamte Vorschauzeit. Zeilen zeigen alle betroffenen Katalogvarianten. `frames.json` enthält Zeiten und Punktzahlen. Die finalen PNGs wurden geöffnet und gesichtet. Kein Browser- oder Videonachweis; die visuelle Prüfung in der Seite übernimmt gemäß Auftrag Claude.

Einzeln ausgeführte Tests:

| Spec | Ergebnis |
| --- | --- |
| `src/scripts/scenes/catalog-actions.test.mjs` | 8 bestanden |
| `src/scripts/scenes/catalog-actions-physics.test.mjs` | 5 bestanden, einschließlich Reduced Motion |
| `scripts/show-flight.test.mjs` | 5 bestanden |
| `scripts/show-geometry.test.mjs` | 8 bestanden |
| `scripts/show-counts.test.mjs` mit `--import ./scripts/show-node-env.mjs` | 6 bestanden |
| `src/scripts/formation-data.test.mjs` | 2 bestanden |
| `src/scripts/show-field.test.mjs` | 7 bestanden |

Die neue Physik-Spec spielt alle betroffenen Varianten in allen drei Paketen mit der echten `show-field.js`-Engine, 60 fps, einzeln durch. Höchstwerte in Anzeigeeinheiten: Geschwindigkeit 1,668 bei Limit 2,6; Beschleunigung 3,022 bei Limit 5,5. Auch dunkle Drohnen zählen. Die bestehende Playwright-Spec `tests/show-physics.spec.ts` und die Gesamtsuite wurden nicht ausgeführt.

`astro check`: 0 Fehler, 0 Warnungen, 312 Hinweise. `astro build`: erfolgreich, 72 Seiten. `git diff --check`: sauber.

Dev-Server für die Übergabe: `http://127.0.0.1:4404/drohnenshow-preise/` aus diesem Worktree. Die vom parallelen Auftrag reservierten Dateien wurden nicht angefasst. Kein Push.
