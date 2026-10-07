# Show-Konfigurator (Prototyp)

Stand: 7. Oktober 2026. Auftrag von Marc: Besucher*innen stellen eine Show nach dem zusammen, was für sie zählt (Motive, Musik, Publikum), statt eine Drohnenzahl zu wählen. Der Prototyp liegt unter `/show-konfigurator/`. Die Seite ist nicht verlinkt und hat `noindex`. Er ersetzt den Preisrechner der Referenz nicht, sondern dient als Vorschlag an FlyingStars.

## Warum

Für Laien sagt die Drohnenzahl wenig aus. Im Rechner der Referenz bewegt der Regler oben alle drei Paketkarten unten mit. Bei 1.000 Drohnen steht HORIZON dann bei 94.300 €, und die Preise wirken willkürlich. Die veröffentlichten Cases stützen das: PUMA hatte vier Motive mit Verwandlung bei 100 Drohnen, NFL zehn Motive bei 300.

## Bedienung

Fünf Ausgangspunkte setzen alle Regler. Danach lässt sich alles anpassen, und das Drohnenfeld zeigt jede Änderung sofort.

| Regler | Bedeutung | Wirkung auf das Paket |
|---|---|---|
| Wie aufwendig sind die Motive? (5 Stufen mit Bild) | Klassiker · Eure Zeichen · Es bewegt sich · Einfaches 3D · Komplexes 3D | 1–2 SPARK, 3–4 HORIZON, 5 ODYSSEY |
| Wie viele Motive? | Auswahl aus den Szenen des Ausgangspunkts bis zur gewählten Stufe | mehr als vier eigene Motive → HORIZON |
| Eigener Text | ersetzt das Textmotiv des Ausgangspunkts | Mindestens 10 Drohnen je Zeichen, Regel aus dem Preisrechner |
| Musik | von uns · eure Musik synchron · live mit Timecode | SPARK · HORIZON · ODYSSEY |
| Erwartete Zuschauer*innen | 4 Stufen | empfohlene Drohnenzahl; über 150 → HORIZON |
| Erzählte Geschichte | dramaturgische Kurve | ODYSSEY |
| Filmaufnahmen | Rohaufnahmen | +900 €, bei ODYSSEY inklusive |

Das Paket ist das höchste, das eine Antwort verlangt. Die Drohnenzahl ist das Maximum aus Basis des Pakets, Empfehlung für das Publikum und Textbedarf. Der Preis kommt unverändert aus `priceFor()` in `src/content/show-packages.ts`. Der Konfigurator erfindet keinen Preis. Die Begründung listet jede Antwort, die das Paket anhebt, und markiert die entscheidende.

## Herkunft der Regeln

Alle Zuordnungen stehen in `src/content/show-configurator.ts`, jede mit ihrer Quelle:

- **Motivstufen:** Sie folgen dem Wortlaut der Pakete. SPARK: „vordefinierte Premium-Formationen wie Herzen oder Ringe“ und „bis zu vier eigene Elemente“. HORIZON: „individuelle 2D-Animationen und einfache 3D-Elemente“. ODYSSEY: „komplexe 3D-Animationen und volumetrische Effekte“.
- **Musik:** Sie folgt den Paketleistungen: GEMA-freie Musik, „Perfekte Synchronisation auf deine Wunschmusik“, „Timecode-Synchronisation vor Ort“.
- **Publikum → Drohnen (100 / 200 / 300 / 600):** Das ist eine Annahme, verankert an SPARK „für Hochzeiten“, der NFL-Show (300) und Bokkenrijders (600). PUMA zeigt, dass es keine Untergrenze ist. Die Cases nennen keine Pakete, sie sind älter als das Paketmodell.

## Bilder im Feld

Alle Bilder entstehen aus FlyingStars-Quellen:

- Herzen aus `pricing-formations.js`
- Schrift aus dem Textplaner (`text-formation.js`, gemeinsam mit dem Preisrechner)
- FlyingStars-Zeichen aus `logo-dots.json`
- 3D-Figur aus der echten Bokkenrijders-Show-Datei

Sterne, Funken, Ring und Weltkugel werden mit festem Zufallswert erzeugt. Drohnen, die ein Bild nicht braucht, warten gedimmt darunter.

Ford, NFL und PUMA sind als Formationen vorhanden, werden aber bewusst nicht als Motive angeboten. Fremde Marken im Konfigurator sähen buchbar aus.

## Gemeinsame Mechanismen

- **Textplaner und Herzgeometrie:** Sie lagen vorher im Preisrechner und sind jetzt eigene Module (`text-formation.js`, `heart-formation.js`). Preisrechner und Konfigurator nutzen dieselben Funktionen.
- **Anfrageformular:** Es übernimmt zusätzlich `anlass` (wählt den Anlass vor, wenn noch keiner gewählt ist) und `show` (Zusammenfassung als bearbeitbarer Nachrichtenentwurf, höchstens 600 Zeichen, nur als Wert gesetzt).
- **Base-Layout:** Es bekommt `fullBleed` als Prop, damit neue Seiten nicht in die hart kodierte Liste müssen.
- **Pause:** Die globale Pause und reduzierte Bewegung zeigen das fertige Bild.

## Offene Fragen an FlyingStars

1. Stimmt die Zuordnung der Motivstufen und Musikoptionen zu den Paketen?
2. Wie viele eigene Motive enthält HORIZON? Ab wann wird es ODYSSEY?
3. Welche Drohnenzahl empfehlt ihr für welches Publikum und welche Entfernung?
4. Welche Katalogmotive gibt es wirklich (Herz, Ring, Sterne …)? Dürfen Formationen aus Kundenshows (Teufelskopf) als Beispiel stehen?
5. Gibt es weitere 3D-Formationen als Export, wie bei den Cases?

## Prüfen

`tests/show-configurator.spec.ts` prüft auf Desktop und Mobil:

- alle fünf Ausgangspunkte gegen die Preisregeln
- die Wirkung jedes Reglers samt entscheidender Begründung
- eigenen Text, Ablauf und Übergabe ins Formular
- das fertige Bild bei pausierter Bewegung

axe, HTML-Hygiene und Netzwerk-Allowlist laufen automatisch über alle gebauten Routen, also auch über diese.
