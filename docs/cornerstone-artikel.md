# Cornerstone-Artikel im Blog

Stand 22.11.2026 (Runde 15). Hochwertige Darstellung für ausgewählte Blogartikel: Titelbild im Lichtraster, eigene Fotos,
isometrische Scroll-Szene, ruhige Logo-Formation am Schluss. Entstanden in drei Labor-Prototypen mit Marc (21./22.11.), jetzt
auf den echten Blog-URLs in DE, EN und NL. Artikel:

| Artikel | Szene | Besonderheit |
|---|---|---|
| Wie programmiert man eine Drohnenshow? | `story-scene.ts`, 7 Schritte (Werkzeug, Ablauf) | Drohne explodiert, Funk bringt die Drohnen in den Stern, Abspielkopf treibt Licht und Stern, Wind und Böen |
| Wie funktioniert eine Drohnenshow? | `ablauf-scene.ts`, 4 Schritte aus der Aufzählung in „Ablauf“ | Raster → synchroner Start zum Kreis → Herz schlägt → Landung am Startpunkt |
| Drohnen als Alternative zum Feuerwerk | keine (der Text vergleicht, er erklärt keinen Ablauf) | Vergleichstabelle der Seite Nachhaltigkeit nach dem ersten Absatz zur Umwelt |

Die beiden letzten hat ein zweiter Agent im Labor entworfen (Runde 18, Branch `r18/cornerstone`), danach über diese Schnittstelle
produktiv gemacht; eine Szenen-Komponente (`StoryScene.astro`) für alle.

## Schnittstelle: einen Artikel einhängen

Eine Datei in `src/components/blog/cornerstone/articles/<slug>.ts` mit `export default defineCornerstone({...})` genügt; die
Registrierung (`cornerstone/index.ts`) sammelt alle Dateien dort per `import.meta.glob` ein. Keine zentrale Liste.

```ts
export default defineCornerstone({
  post: '2025-06-12-wie-programmiert-man-eine-drohnenshow', // Quell-ID des DE-Posts ohne Sprachpräfix
  i18n: 'cornerstone.programmieren',                          // Präfix aller Texte in src/i18n/ui.json
  cover: { avif, webp, width: 1600, height: 800, alt: 'cover', social: [16:9, 4:3, 1:1 als JPG] },
  dropBodyImages: true,                                       // Bilder aus dem importierten Text weglassen
  blocks: [
    { kind: 'text', section: 0 },                             // 0 = Text vor dem ersten ##
    { kind: 'photos', photos: [{ src, width, height, alt: 'photoPads' }], caption: 'photoPadsCaption' },
    { kind: 'text', section: 1 },                             // n = n-ter ## mit allem bis zum nächsten
    { kind: 'story', sections: [2, 3], scene: () => storyScene(scenePalette), groups: ['groupTools', 'groupFlow'], label: 'sceneLabel', caption: 'sceneCaption' },
    { kind: 'finale', section: 4 },
  ],
});
```

- **Weitere Bausteine**: `{ kind: 'text', section, split: { after: n, part: 0 | 1 } }` teilt einen Abschnitt nach dem n-ten
  Absatz (beide Teile müssen vorkommen); `{ kind: 'compare', label, caption }` setzt die Vergleichstabelle der Seite
  Nachhaltigkeit (`pages/nachhaltigkeit`, Abschnitt `alternative`) in der Sprache des Artikels; bei `story` liest
  `steps: 'list'` die Schritte aus der ersten Aufzählung des Abschnitts (Titel = fetter Anfang) statt aus `###`. Text nach
  der Aufzählung gilt als Abweichung (Rückfall), damit nichts verloren geht.
- **Abschnitte** kommen aus dem gerenderten Artikeltext (`splitSections` in `cornerstone/types.ts`). Jeder Abschnitt muss genau
  einmal vorkommen. Bei `story` ist jeder genannte Abschnitt ein Kapitel, seine `###`-Unterabschnitte sind die Schritte, in
  Reihenfolge. Die Szene muss genau so viele Schritte haben (`Story.steps`).
- **Szene**: eine Funktion, die ein `Story`-Objekt liefert (`story-scene.ts`: Typen `Story`, `Piece`, `StoryDrone`, `Note`,
  `Motion`, Helfer `frameCam`, `pathD`). Farben aus `scene-palette.ts`. Annotationen tragen `key`; der Text steht in `ui.json`
  unter `<i18n>.note.<key>` (ohne `key` gilt `text`, nur Deutsch). Bewegung je Schritt über `story.motion`: `sweep`
  (Abspielkopf), `wind` (Windlinien und Böen), `alive` (Eigenbewegung), `plain` (Drohnen ohne Farbe), `assemble` (Schritt, in
  dem Teile mit `asmOnly`/`inner` erst zusammen stehen und dann explodieren), `off`/`warm` (LEDs aus bzw. warmweiß), `beat`
  (Formation schlägt leise um einen Mittelpunkt), `signal` (Funk: im Zwischenhalt stehen die Drohnen ohne Farbe im
  Startraster, gestrichelte Signallinien `signal-ground` laufen von der Station, danach steigen alle zugleich und die Linien
  wechseln weich zu `signal-sky`). Bei `sweep` können Lichtblöcke einen Zeitbereich tragen (`Shape.tl`: Anfang, Ende, Spur)
  und Drohnen einen Weg (`StoryDrone.track`, Versatz von der Startreihe bis zur Lage des Schritts): solange der Kopf läuft,
  ist nur der Block unter ihm hell, die Drohnen folgen ihm weich nachgeführt und tragen die Farbe des Blocks ihrer Spur;
  ohne Schleife steht der Endzustand. `Piece.late` / `Note.late`: kommt erst nach der ersten Bewegung des Schritts
  (`--ss-late`). Ohne `motion` ruht die Szene. Je Drohne optional `via` (Zwischenhalt beim
  Vorwärtsschritt, alle zugleich: synchrones Abheben, Sinken über den Startpunkt); `story.poster` wählt den Schritt, der im
  HTML steht (sonst der letzte).
- **Texte**: alle `UiKey`-Werte sind relativ zum Präfix. Jeder neue Schlüssel braucht DE, EN, NL in `src/i18n/ui.json` und je
  einen EN- und NL-Eintrag in `docs/i18n/ui-provenance.json` (`origin: machine-new`, `components`: die Artikeldatei bzw.
  Szene). Kapitelnamen der Schrittleiste kommen aus den `##`-Titeln des Texts, also automatisch in jeder Sprache.
- **Medien**: Rezept in `tools/blog/cornerstone-media.json` (Drive-ID je Foto, Lichtraster-Regler), rechnen mit
  `node tools/blog/cornerstone-media.mjs <slug>`, Ausgabe nach `public/media/blog/<slug>/`.

## Verhalten und Rückfall

- `BlogPost.astro` prüft die Anordnung gegen den Text (`checkPlan`). Passt sie nicht, etwa weil im Editor ein Zwischentitel
  dazukam, erscheint der Artikel im normalen Format und der Build meldet `[cornerstone] <id>: …`. Der Text geht nie verloren.
- **Editor-Build** (`AFE_MODE=editor`): normales Format mit `body`-Marker, der Artikeltext bleibt direkt bearbeitbar. Die
  Szene erscheint nur im öffentlichen Build. Der Text bleibt vollständig in der Collection; die Posts wurden nicht geändert,
  deshalb waren keine Übersetzungsnachweise neu zu stempeln.
- **Titelbild**: Artikelkopf und Blogkarte zeigen das Lichtraster-Bild (AVIF mit WebP-Rückfall); `og:image` ist das 16:9-JPG,
  `BlogPosting` (JSON-LD, für alle Posts) nennt 16:9, 4:3 und 1:1. Das `cover`-Feld des Posts bleibt für normale Artikel und den
  Editor zuständig.
- **Layout**: Querformat (min-aspect-ratio 5/4) ab 60 em Breite und unter 75 em (1200 px) Höhe: Text links in 37 rem, Szene
  rechts klebend, Gesamtbreite `--feature-w` (76 rem) wie die Fotoreihe. Sonst klebt die Szene oben (Handy rund 220 px hoch) mit
  weichem, unscharfem Übergang zum Text.
- **Kopfzeile**: weicht seit dieser Runde auf allen Seiten und bei jeder Fenstergröße beim Runterscrollen aus (`site.ts`),
  bleibt bei Zeiger, Fokus oder offenem Untermenü in der Kopfzeile stehen.

## Entscheidungen ohne Rückfrage (Marc nicht erreichbar)

- Originalfotos bleiben auf dem Drive; ins Repo kommen nur die gerechneten, kleinen Dateien plus Rezept. Das Titelbild aus
  Rezept und Original im Build zu rechnen hätte dem Build Netz- und Drive-Zugriff abverlangt.
- Logo-Formation mit 260 statt 600 Drohnen (Marke 110, Schriftzug 150), für alle Artikel eine Datei
  (`public/media/blog/flyingstars-formation.json`).
- Labor-Route `/labor/blog-artikel/` und ihre Medien entfernt; `BlogPost` behält die Slots `body`/`after` und `coverImage`
  für Labor-Seiten.
- Desktop-Klebeköpfe mit fester Höhe (Konfigurator-Bühne, FAQ-Einleitung, Ablauf-Kopf) bleiben beim Ausweichen der Kopfzeile
  an ihrer Stelle; nur „Im Preis enthalten“ rückt nach.

- Labor-Route `/labor/cornerstone/` des zweiten Agenten und ihre Medien entfernt; seine Labor-Komponenten (`AblaufStory`,
  `split.ts`) gingen in `StoryScene.astro` und `cornerstone/types.ts` auf, die Bilder rechnet jetzt dasselbe Rezept.
- Feuerwerk: die drei Werbemotive stammen aus dem Jubiläumsordner; ihre Herkunft vor der Veröffentlichung bei FlyingStars
  bestätigen (Hinweis des zweiten Agenten, steht auch im Rezept).

- Bewegung der Szene ohne CSS-px im Code (scripts/no-px.test.mjs): Lagen sind Zahlen in Custom Properties (`--cx/--cy/--ck`
  Kamera, `--ty/--s1/--s2` Teile, `--dx/--dy` Drohnen, `--wx/--wy` Eigenbewegung, `--hx/--hy` Abspielkopf), die Einheit ist
  einmal `--u: 1px` an der Kamera-Gruppe (SVG-Benutzereinheit; die Bühne ist ein viewBox in Pixelgröße). Unschärfen in rem.
- Labor-Vergleichsseite `/labor/blog-bilder/` (fünf Titelbild-Varianten je Artikel) samt `DroneStill`, `AblaufSzene`, Daten,
  Werkzeug und Labor-Bildern entfernt: die Titelbilder sind entschieden und produktiv; `tools/labor/lichtraster.mjs` bleibt
  (Rezept-Werkzeug).

## Runde 19 (22.11.2026): Programmier-Szene neu geordnet

Der Artikel ist neu in Wir-Form (Text-Agent, parallel): `## Womit wir arbeiten` (Showdrohne, Bodenstation) und `## Wie eure
Show entsteht` (Idee und Motiv, Vom Motiv zur Flugbahn, Musik und Licht, Simulation und Testflug, Der Showabend). Die Szene
folgt: 0 Explosionsansicht · 1 Bodenstation (Startraster → Funk → Stern) · 2 3D-Modell · 3 Flugbahnen · 4 Musik und Licht
(Abspielkopf als Taktgeber für Lichtblöcke unten und Sternbildung oben, Marc) · 5 Simulation (Wind, danach „Zu nah:
korrigieren“) · 6 Live-Show. Upload/Feldtest entfiel samt Notizen `file`/`test`. Feld und Station fehlen in Musik und Licht
und in der Simulation (schwebende Ebenen ohne Boden, ruhiger).

## Prüfen

`tests/cornerstone.spec.ts` (alle drei Artikel in DE/EN/NL, reduzierte Bewegung), `scripts/cornerstone-plan.test.mjs`
(Teilung des Texts, Rückfall), `tests/nav-headroom.spec.ts` (schmal und breit, Untermenü,
Sprachliste, Tastatur), `scripts/css-tokens.test.mjs`.
