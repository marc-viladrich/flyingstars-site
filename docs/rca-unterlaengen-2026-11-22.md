# FlyingStars · Space Grotesk clipping

## Cause

The Hochzeit headline comes from [drohnenshow-hochzeit.yaml:9](src/content/pages/drohnenshow-hochzeit.yaml#L9) and uses a line-height of 1 in [LandingHero.astro:124](src/components/landing/LandingHero.astro#L124). The shared weight-animation script creates one inline-block `.st-v` per gradient word in [staerke.ts:21–22](src/scripts/himmel/staerke.ts#L21). Its gradient is painted with `background-clip: text` on that block in [himmel.css:114–118](src/styles/himmel.css#L114). The original rule had horizontal padding to catch letter overhang. Vertically, the background painted only within the line-height box, cutting ink that extended beyond it.

At 1440 px the Hochzeit word computed to roughly 78.26 px for both font size and line height, at weight 500. Canvas glyph metrics and an inline baseline probe gave these document-relative y coordinates, in CSS pixels.

| Browser | Baseline | Ink bounds of “g” | Background box | Ink past bottom |
| --- | ---: | ---: | ---: | ---: |
| Chromium 153 | 314.27 | 274.63–329.92 | 248.27–326.53 | 3.39 |
| WebKit 26.6 | 314.45 | 274.77–330.09 | 248.25–326.50 | 3.59 |

The cut reproduced with the weight and reveal transitions frozen, including at the end weight. Every measured overrun belonged to the word's own gradient box. The vertical overflow, inset clip-path and mask bounds on ancestors yielded zero findings. The masks encountered around text were horizontal slider fades. The source contains no `text-box-trim` or `text-box-edge` rules.

## Fix

The shared `.grad.st-bereit .st-v` rule adds `0.125em` of block padding at each edge. Equal negative block margins cancel the padding in layout, so the word's baseline and line box stay in place. Because the gradient is horizontal and both background layers fill the padding box vertically, they cover the taller box with the existing stops and alignment. The rule uses CSS supported in Safari 18. The browser run used Playwright WebKit 26.6.

Across the sweep, all 4,406 measured heading and word-wrapper rectangles matched exactly in x, y, width and height. The Hochzeit screenshot gained three painted pixel rows at the bottom of the “g” in each engine. Chromium's earlier rows were pixel-identical. WebKit's earlier rows differed by at most one level per RGB channel.

## All affected words in the baseline build

C is Chromium and W is WebKit. Numbers are viewport widths in CSS pixels. The table groups the 372 findings from both measured weights into 38 word instances. Every instance below had zero findings after the fix. The two JSON files retain per-weight readings and individual glyph offsets.

| Route | Heading | Word and clipped ink | Browser and width |
| --- | --- | --- | --- |
| `/` | Ablauf Von der Idee bis zum Applaus | Applaus (p↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/` | Individuelle Drohnenshows Feuerwerk? War gestern | gestern (g↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/` | Referenzen Nächte, die wir nie vergessen | vergessen (g↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/` | Sicherheit Damit alles rund fliegt | fliegt (g↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/` | Über FlyingStars Leuchtende Drohnen für leuchtende Augen | Augen (g↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/` | Veranstaltungen Für jeden Anlass das passende Spektakel | Spektakel (p↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/drohnenshow-hochzeit/` | Drohnenshow zur Hochzeit buchen Malt eure Liebesgeschichte in den Himmel | Liebesgeschichte (g↓) | C 390, C 1440, C 1920, W 390, W 1440, W 1920 |
| `/drohnenshow-hochzeit/` | Es soll eine Überraschung werden? | Überraschung (Ü↑) | C 1440, C 1920 |
| `/drohnenshow-hochzeit/` | Individuelle Choreografie So einzigartig wie eure Lovestory | Lovestory (y↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/drohnenshow-hochzeit/` | Referenzen Nächte, die wir nie vergessen | vergessen (g↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/drohnenshow-indoor/` | Anlässe Das Highlight jeder Feier | Highlight (g↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/drohnenshow-indoor/` | Über FlyingStars Große Spektakel – ohne Kompromisse | Spektakel (p↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/drohnenshow-preise/` | Drohnenshow buchen & Kosten klären Lasst uns eure Choreografie planen | Choreografie (g↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/drohnenshow-preise/` | Upgrades Alles ist möglich | möglich (g↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/drohnenshow-werbung/` | Drohnen-Werbung und -Marketing buchen Erzählt uns von eurer Kampagne | Kampagne (p↓, g↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/drohnenshow-werbung/` | Werbung und Marketing mit Drohnen Euer Unternehmen auf der größten Bühne der Welt | größten (g↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/drohnenshow-werbung/` | Wir fliegen, ihr glänzt | glänzt (g↓) | W 1440, W 1920 |
| `/en/` | About FlyingStars Shining drones for shining eyes | eyes (y↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/en/` | About FlyingStars Shining drones for shining eyes | shining (g↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/en/` | Bespoke drone shows Fireworks? So last year | year (y↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/en/` | Book a drone show Design your own piece of sky | your (y↓) | C 390, C 1440, C 1920, W 390, W 1440, W 1920 |
| `/en/` | Events The right spectacle for every occasion | spectacle (p↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/en/` | Prices Put your show together | your (y↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/en/` | Process From idea to applause | applause (p↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/en/` | References Nights we will never forget | forget (g↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/faq/` | FAQ Häufige Fragen | Fragen (g↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/faq/` | Kontakt Weitere Fragen? | Fragen (g↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/nachhaltigkeit/` | Kontakt Stellt uns eure Fragen zur Nachhaltigkeit | Nachhaltigkeit (g↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/nachhaltigkeit/` | Referenzen Wir fliegen mit Engagement | Engagement (g↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/nl/` | Droneshow boeken Geef jullie eigen stukje hemel vorm | jullie (j↓) | C 390, C 1440, C 1920, W 390, W 1440, W 1920 |
| `/nl/` | Droneshows op maat Vuurwerk? Dat was gisteren | gisteren (g↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/nl/` | Evenementen Voor elke gelegenheid het juiste spektakel | spektakel (p↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/nl/` | Over FlyingStars Stralende drones voor stralende ogen | ogen (g↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/nl/` | Prijzen Stel jullie show samen | jullie (j↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/nl/` | Referenties Nachten die we nooit vergeten | vergeten (g↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/nl/` | Veiligheid Zodat alles soepel vliegt | vliegt (g↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/nl/` | Verloop Van idee tot applaus | applaus (p↓) | C 1440, C 1920, W 390, W 1440, W 1920 |
| `/presse/` | Kontakt Show planen oder Fragen stellen | Fragen (g↓) | C 1440, C 1920, W 390, W 1440, W 1920 |

## Sweep and regression guard

[descender-sweep.mjs](descender-sweep.mjs) discovers German pages from the generated HTML, discards redirect documents and adds the English and Dutch homepages. Both engines tested 31 routes at 390, 1440 and 1920 px, for 186 page visits per build. Each visit checked initial weight 300 and the heading's inherited end weight. The script opens each route at its default controls and settles scroll reveals to include below-the-fold text. It skips image/media requests and cross-origin resources. Hidden controls and temporary clipping during reveals are outside these counts.

The inspector walks rendered Space Grotesk HTML text with a potential gradient, vertical overflow, inset clip-path or mask boundary. It derives each glyph's baseline from its Range and a calibrated DOM baseline marker, measures the ink with Canvas TextMetrics and compares it with the relevant clip boxes. It allows 0.75 CSS px for hinting and pixel rounding. The mask check uses the outer box. The sweep counts vertical ink overruns and leaves the intentional horizontal carousel fades in place.

| Engine | Width | Before | After |
| --- | ---: | ---: | ---: |
| Chromium | 390 | 6 | 0 |
| Chromium | 1440 | 73 | 0 |
| Chromium | 1920 | 73 | 0 |
| WebKit | 390 | 72 | 0 |
| WebKit | 1440 | 74 | 0 |
| WebKit | 1920 | 74 | 0 |

The same 74,984 glyph readings and 7,932 gradient ink checks ran per build. [Baseline data](sweep-before.json) · [Fixed-build data](sweep-after.json)

The permanent [Playwright spec](tests/descender.spec.ts) reuses the inspector on Start, Hochzeit, Indoor, Werbung, Preise and one blog post. It checks desktop and mobile Chromium and WebKit with both animated weights and the reduced-motion rendering. The Hochzeit test failed for the expected glyph overrun in each desktop engine before the fix. Afterward all 24 Playwright cases passed. The no-px and CSS-token guards passed all 17 tests combined.

To reproduce the sweep against a build, run `npx astro build --ignore-lock`, then `npx astro preview --ignore-lock --host 127.0.0.1 --port 4810` and `node descender-sweep.mjs after` in the worktree.

Hochzeit hero at 1440 px, weight 500. [Chromium before](shots/hochzeit-chromium-before.png) · [Chromium after](shots/hochzeit-chromium-after.png) · [WebKit before](shots/hochzeit-webkit-before.png) · [WebKit after](shots/hochzeit-webkit-after.png)
