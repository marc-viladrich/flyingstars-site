# P6: Metadata migration evidence

Base: `2cb8e88` on `afe/pr6`. Node 22.22.1. No content values, dependencies, deployment settings or remote branches changed. The live checkout and ports 4542–4544 were not used.

The shared native descriptor now carries validated `x-afe` metadata. The vendored vocabulary is an exact copy of product `src/schema/spec.mjs`, package 0.0.0 / contract 1.0, PR 4. A digest test guards the copy; unknown keys fail descriptor compilation and the test suite. PR 11 replaces the vendored import.

Schema descriptions supply field and option labels, references, visibility, array permissions, item labels, collection titles, block labels/icons, translation eligibility and text formats. Existing image/color/palette and formation controls retain their compatibility metadata. Site queries, legacy ID normalization, media ownership and the media widget live in the FlyingStars adapters. Extending the Markdown schemas explicitly preserves root collection metadata.

Server writes validate the complete candidate against these same serialized permissions. Direct fields, parent replacements and whole-record patches cannot bypass read-only or array restrictions. Real save tests assert both rejection and an unchanged Git head. Positional arrays permit editing their values but reject independent structural changes. Stable keyed arrays also detect a reorder combined with edited item text.

## Parity

`editor/metadata.test.mjs` compares pure `describe()` panels against the captured pre-refactor snapshot, covering 170 actual records and all 17 section variants, grouped into 31 models. It checks labels, kinds, visibility, enum wording and array permissions. Record titles have an additional real-record regression guard. Full browser modules are syntax-checked, and block actions/handlers obey the same array permissions as ordinary lists, including inherited read-only restrictions. All 290 compact/overview table decisions match the pre-refactor snapshot. All actual translation-eligible field paths match the old resolver exactly.

Intentional differences:

- The internal translation document's `values` list has explicit insert/remove/reorder permissions. The former property-name rule incorrectly treated it like comparison values. This preserves the existing translation workflow; translation documents do not gain a new library panel.
- Prose controls use explicit `format: 'multiline'`, and Markdown/link controls use explicit formats. Their sizing no longer changes merely because a value crosses 60 characters. The descriptor kind remains text. The image, color and formation controls retain their existing behavior.

Full per-record before/after panel dumps, table snapshots, translation-field snapshots and raw logs are under `/tmp/cx12/p6/`. The checked-in snapshots contain descriptors, not a second content model.

## Verification

- Baseline editor suite: 490 tests, 488 passed, 1 skipped, 1 failed because this sandbox forbids TCP listening on `127.0.0.1` in the existing media API test. The authenticated server tests already exercise their in-memory HTTP fallback.
- Final editor suite: 501 tests, 499 passed, 1 skipped, the same 1 sandbox TCP-listen failure; no additional failures. Exact requested command, against the committed isolated copy. Log: `/tmp/cx12/p6/complete-editor.log`.
- Scripts: 33/33 before and after.
- Astro check: 0 errors, 0 warnings, 207 existing hints.
- `FLYINGSTARS_OFFLINE_MEDIA=1` build: all 52 pages built.
- Dedicated real Astro translation E2E: passed, including reviewed FAQ Markdown in the public HTML.
- Product checker, run only on isolated copies: AFE2xx errors **691 → 161**, all errors **698 → 168**.

| Rule | Before | After |
| --- | ---: | ---: |
| AFE201 | 588 | 0 |
| AFE202 | 98 | 98 |
| AFE203 | 0 | 62 |
| AFE206 | 1 | 1 |
| AFE207 | 3 | 0 |
| AFE208 | 1 | 0 |

AFE202 reports the retained compatibility hints, including inline/image/color and palette metadata. AFE203 newly exposes the existing prefixed `media/...` values: the pilot's site bridge resolves them against the declared collection without changing stored bytes; the product checker does not execute this bridge. AFE206 concerns the translation transport's string/number path union. This is a migration step, not a claim of complete product-contract conformance.

Reproduction, with `/opt/homebrew/opt/node@22/bin` in `PATH`:

```sh
node --test 'editor/*.test.mjs' 'editor/test/*.test.mjs' 'editor/core/*.test.mjs' src/schemas/editorial-source.test.mjs
node --test 'scripts/*.test.mjs'
npx astro check
FLYINGSTARS_OFFLINE_MEDIA=1 npx astro build
```

The worktree's shared Git directory rejects `index.lock` creation. Commits were made in an isolated clone and exported to `/tmp/cx12/p6/patches`; the worktree contains the same implementation as uncommitted changes. No push or merge was performed.

## PR 7 handoff

P6 introduces the metadata and a local site registry. PR 7 still needs to move the remaining site orchestration behind the product extension API:

- Record/section factories, `newRecordData`, unique-section lifecycle and the example/pool template fallback.
- Navigation, record-kind/change groups, route reservations and locale-specific site menus.
- The remaining media-library/upload orchestration and its concrete data protocol; the media usage widget and ownership policy are already isolated here.
- Translation overlay storage/review orchestration, including its concrete `sourceId`/`values` transport shape. Field eligibility now comes exclusively from metadata.
- Registration of policies, media policies and widgets through site configuration instead of direct composition-root imports. Comparison shape validation remains authoritative in Zod; its widget/policy annotation is explicit.

No removed field-name table or ID-suffix inference should return to core during that extraction.
