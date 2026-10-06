# Agent-Vertrag für diese Site

Diese Datei gilt für Claude Code (CLAUDE.md ist ein Symlink hierher) und Codex. Sie ist Teil des Zwei-Klick-Modells: Ein Mensch gibt den Auftrag frei (Label `agent-go`), du baust einen Vorschlag als PR, ein Mensch gibt den PR nach Preview frei. Du veröffentlichst nie selbst.

## Architektur in fünf Sätzen

Statische Astro-Site. Inhalte liegen als Dateien in `src/content/` und werden durch Zod-Schemas in `src/content.config.ts` validiert; fehlende Pflichtfelder brechen den Build, das ist gewollt. Seiten (`src/content/pages/*.yaml`) sind Listen von Sections; jede Section hat einen Typ aus der Discriminated Union im Schema und genau eine Komponente in `src/components/sections/`. `src/components/SectionRenderer.astro` ist die einzige Zuordnung Typ → Komponente. Medien liegen außerhalb des Repos im zentralen Speicher (`MEDIA_HOST`) und werden beim Build von Astro optimiert.

## Was du darfst

- Inhalte in `src/content/**` anlegen und ändern, wenn das Schema es erlaubt.
- Seiten aus **bestehenden** Section-Typen zusammensetzen oder umbauen.
- Bestehende Section-Komponenten in `src/components/sections/` verbessern, ohne ihre Props zu ändern.
- Styles in `src/styles/global.css` innerhalb der vorhandenen Tokens anpassen.
- `src/site.config.ts` anpassen (Navigation, Footer, Name).

## Was du nicht darfst

- Keinen neuen Section-Typ anlegen. Wenn der Auftrag einen braucht, beschreibe im PR, welcher Typ mit welchen Props fehlt, und setze den Rest um. Neue Typen sind eine Designentscheidung und laufen als eigener PR mit Review.
- Keine neuen Abhängigkeiten (`package.json`), keine externen Ressourcen (Fonts, Skripte, iframes, Tracking). Der Test `tests/network-allowlist.spec.ts` schlägt sonst fehl, und das soll er.
- Keine Änderungen an `.github/`, `scripts/`, `tests/`, `playwright.config.ts`, `lighthouserc.json`, `astro.config.mjs`, `AGENTS.md`.
- Keine Bilder ins Repo. Bilder sind URLs auf `MEDIA_HOST` mit `alt`, `width`, `height`.
- Neue Intake-Inhalte enthalten `draft: false`, damit sie nach dem menschlichen PR-Merge veröffentlicht werden. Der offene PR ist der redaktionelle Entwurf. Bestehende Inhalte mit `draft: true` bleiben verborgen; deren Veröffentlichung braucht einen ausdrücklichen Auftrag des Menschen.
- Nicht auf `main` pushen, nicht mergen, keine Secrets lesen oder ausgeben.

## Arbeitsweise

1. Lies das Issue vollständig. Bei Widerspruch zwischen Issue und Schema gewinnt das Schema; erkläre es im PR.
2. Branch `agent/issue-<nr>`. Kleine, nachvollziehbare Commits.
3. Vor dem PR: `npx astro check` und `npx astro build` müssen fehlerfrei sein.
4. PR-Titel „Agent: <kurz>“, Body nach `.github/PULL_REQUEST_TEMPLATE.md`, `Closes #<nr>`. Liste jede geänderte Datei mit einem Satz Begründung.
5. Wenn du etwas nicht umsetzen kannst, sag es im PR. Ein ehrlicher Teil-PR ist besser als eine erfundene Lösung.

## Sprache und Inhalt

Deutsch, Du-Ansprache nur wenn die Site das bereits tut. Keine Superlative, keine Heilsversprechen, keine „X statt Y“-Zuspitzungen. Konkrete Aussagen, belegbar. Headlines ohne Eyebrow-Zeile darüber. Beschreibungen (`description`) 50 bis 160 Zeichen und ohne Keyword-Stapel.

## Entwicklung

```sh
npm ci
npx astro dev          # lokal
npx astro check && npx astro build
npx playwright test    # Gates gegen den Build
```

Doku: https://docs.astro.build (Content Collections, Images, Routing).
