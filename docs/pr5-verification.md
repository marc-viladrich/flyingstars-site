# PR 5 verification and handoff

Verified on 2026-10-15 with Node 22.22.1. Base: `81caa685216019e118a94acbfafd28010ed55b71`, branch `afe/pr5`.

The migration registers existing JSON files through Astro's own `glob()` loader. No content file was moved, renamed or edited. Existing schemas are reused without changes. No dependency, product-repository file, protected configuration or existing test was changed. No push, merge or service on ports 4542–4544. No environment file was opened or copied by the agent.

## Collections

All paths below are relative to `src/content/`. Each JSON file is one entry with a document locator and a whole-file SHA-256 revision. All loaders are imported directly from `astro/loaders`; product provenance wrappers and schema helpers are deferred.

| Collection | Loader | Existing files | Entries | Existing schema |
|---|---|---|---:|---|
| `packages` | `glob` | `packages/**/*.json` | 3 | `packageSchema` |
| `screens` | `glob` | `screens/**/*.json` | 2 | `screenSchema` |
| `clients` | `glob` | `clients/**/*.json` | 11 | `clientSchema` |
| `team` | `glob` | `team/**/*.json` | 5 | `teamSchema` |
| `media` | `glob` | `media/**/*.json` | 45 | `mediaSchema` |
| `siteContact` | `glob` | `site/contact.json` | 1 | `siteSchemas.contact` |
| `siteInquiry` | `glob` | `site/inquiry.json` | 1 | `siteSchemas.inquiry` |
| `siteNavigation` | `glob` | `site/navigation.json` | 1 | `siteSchemas.navigation` |
| `siteUi` | `glob` | `site/ui.json` | 1 | `siteSchemas.ui` |
| `translations` | `glob` | `translations/**/*.json` | 76 | `translationSchema` |

These are **146 JSON entries**. Together with the unchanged `pages` (8), `posts` (2), `projects` (5) and `faq` (9), Astro and NativeStore cover **170 records** in **14 collections**. The PR 1 inventory's 148 JSON candidates also includes the two geometry/font data assets in `src/data/`. Those have no editorial models and stay code-owned assets.

The four site singletons have separate collections because their existing schemas differ. A union for one `site` collection would not enforce which schema belongs to which filename. Each singleton uses an exact filename glob so its entry ID remains `contact`, `inquiry`, `navigation` or `ui`. No `file()` parser or invented `id` property is needed. The integration test substitutes navigation data into `contact.json` and proves Astro rejects it as `siteContact`.

## Identity and compatibility bridges

The explicit tables in `src/lib/content-addresses.mjs` are shared by the site adapter and the content readers:

| Legacy record | Astro address |
|---|---|
| `page/<id>` | `{collection:'pages', id}` |
| `post/<id>` | `{collection:'posts', id}` |
| `project/<id>` | `{collection:'projects', id}` |
| `faq/<id>` | `{collection:'faq', id}` |
| `package/<id>` | `{collection:'packages', id}` |
| `screen/<id>` | `{collection:'screens', id}` |
| `client/<id>` | `{collection:'clients', id}` |
| `team/<id>` | `{collection:'team', id}` |
| `media/<id>` | `{collection:'media', id}` |
| `translation/<id>` | `{collection:'translations', id}` |
| `site/contact` | `{collection:'siteContact', id:'contact'}` |
| `site/inquiry` | `{collection:'siteInquiry', id:'inquiry'}` |
| `site/navigation` | `{collection:'siteNavigation', id:'navigation'}` |
| `site/ui` | `{collection:'siteUi', id:'ui'}` |

Examples: `page/index` maps to `pages/index`; `package/spark` maps to `packages/spark`. Prefixes are not pluralized or guessed. Unknown site singleton names remain rejected. NativeStore's public IDs and marker IDs stay unchanged. PR 3's registry and document codecs still read and write whole files. The preview adapter's collection-change paths now include every registered JSON folder, so preview waits also cover these collection updates.

`src/lib/content.ts` now uses `getEntry()` for individual entities, packages, screens and site records; `getCollection()` for entity lists and translation overlays. The existing Astro consumers await these readers in frontmatter. Package display-name/max normalization, localization, list order and media alt precedence are preserved.

Remaining bridges:

1. `resolveMedia()` retains a narrow eager glob over `src/content/media/**/*.json`. Existing nested template expressions synchronously access its return value, including `.src` and `.alt`; removing this bridge would require changing those rendering expressions. It reuses `mediaSchema`, and the collection still validates all media. Translation overlays explicitly exclude media source IDs, so there is no omitted localized media overlay. `getMedia()` and `mediaForSource()` use Astro collections.
2. The existing raw Markdown glob remains for exact body whitespace and per-field translation hashes. German Markdown rendering still uses Astro's compiled `render()` pipeline. This bridge predates PR 5.
3. The legacy editor still translates its public singular record IDs into the Astro addresses above and registers document files through the PR 3 adapter. Loader-wrapper provenance and lifecycle pruning remain for package consumption.
4. The `translations` collection registers the existing overlay documents without re-encoding their filenames, `sourceId`, paths or hashes. The localization lookup remains the pilot's legacy overlay lookup. Decision 001 §3's canonical translation tuple `[collection,id,locale,field]` belongs to the later product overlay-storage/format migration, not to a silent rewrite of these records. No flattened legacy filename is presented as that tuple.

## Deferred annotation notes

These notes follow `docs/spike/pr4-shadow.md` in the read-only product repository. PR 5 adds no `x-afe` metadata and does not change parsed references into objects.

| Collection | Annotations needed in the metadata/package steps |
|---|---|
| `packages` | `editable()` collection label/title, update operations, overlay i18n, explicit text eligibility, list/item-label policy; read-only package identity and site pricing/feature policies. Incoming `tiers[*].packageId` references use `ref('packages')` or metadata preserving the current enum and raw ID encoding. |
| `screens` | `editable()` collection label/title/update operations/i18n; explicit editorial strings, long text and occasion/motif list policies. Technical animation and occasion IDs remain untranslated. |
| `clients` | `editable()` collection label/title/create/update/delete/i18n and media-ownership policy; `media()` on shared logo objects and a media reference on `assetId`. Incoming `clientIds[*]` use `ref('clients')` or equivalent raw-string metadata. |
| `team` | `editable()` collection label/title/operations/i18n; `media()` on shared portraits, media references on `assetId`, media-ownership policy. Incoming `memberIds[*]` use `ref('team')` or equivalent raw-string metadata. |
| `media` | `editable()` collection label/title and upload-controlled operations; `src`, dimensions and MIME remain upload-owned/read-only. Shared image `assetId` references target `media`; `media()` policies describe image source/alt/dimensions/decorative paths and contextual overrides at usage sites. |
| `siteContact` | `singleton()` label/title and overlay i18n; explicit text eligibility and `editable({format:'url',translatable:false})` for link targets. |
| `siteInquiry` | `singleton()` label/title/i18n; explicit text eligibility and multiline messages; preserve technical occasion keys and interpolation placeholders. |
| `siteNavigation` | `singleton()` label/title/i18n; explicit list operations/item labels, translatable link labels and URL controls for unchanged link targets. |
| `siteUi` | `singleton()` label/title/i18n; explicit translatable UI text and formats. No field-name inference. |
| `translations` | Product-owned overlay addressing, reviewed/source-hash ownership and operations. Preserve current raw encoding until the explicit tuple/format migration; a generic single-target `ref()` cannot describe heterogeneous legacy `sourceId` values. |

Shared images need `media({policy:'editor-images',shape:{kind:'object',source:['src'],alt:['alt'],width:['width'],height:['height'],decorative:['decorative']}})` where those paths exist. Showcase photographs omit dimension paths. `editable({reference:{collection:'media',encoding:'id'}})` must preserve prefixed legacy media IDs through the site bridge. Media-ownership/override policies stay conditional; blanket read-only flags would lock manually owned images. `singleton()` metadata alone does not enforce cardinality; the later provenance/checker step must do that.

## Verification

Baseline, before implementation, used the requested command:

```sh
/opt/homebrew/opt/node@22/bin/node --test 'editor/*.test.mjs' 'editor/test/*.test.mjs' 'editor/core/*.test.mjs'
```

**410 tests: 408 passed, 1 failed, 1 skipped.** The existing `Actual Astro source builds original scripts ...` test fails in its Astro build without offline media, as documented in PR 2/3. A focused unchanged-baseline rerun reproduces that failure in `/tmp/afe-pr5-baseline-build-test.log`. The CLI listener test skips because the sandbox blocks TCP listeners. A focused baseline run with `FLYINGSTARS_OFFLINE_MEDIA=1` passes both build tests, logged in `/tmp/afe-pr5-baseline-offline-build-test.log`. The baseline offline build succeeded with **63 pages**, saved under `/tmp/afe-pr5-baseline-html`; the full baseline NativeStore response was captured in `/tmp/afe-pr5-baseline-state.json`.

Final full suite, with the existing offline image service:

```sh
FLYINGSTARS_OFFLINE_MEDIA=1 /opt/homebrew/opt/node@22/bin/node --test 'editor/*.test.mjs' 'editor/test/*.test.mjs' 'editor/core/*.test.mjs'
```

**413 tests: 412 passed, 0 failed, 1 skipped.** All three new tests pass; the only skip is the same sandbox-blocked CLI listener scenario. The suite runs in `/tmp/afe-pr5-validation/one/two/three/four/site`: existing tests create Git clones, so committed artifacts are necessary to exercise this implementation rather than the original worktree's unchanged HEAD. This disposable clone has its own local `content/draft` at the implementation and a read-only symlink to the existing `editor-lab` fixtures at the relative path expected by PR 3's tests. No branch in the original repository was changed. Log: `/tmp/afe-pr5-verification-tests.log`.

The first attempt in a flat `/tmp/afe-pr5-commit-series` clone failed because it lacked those relative fixtures and its own local draft branch. The validation clone supplies the original test environment without changing the tests. Its initial run started before the local draft ref was installed and reproduced that setup failure; the final full run starts with both fixture paths and the local ref in place. Its tracked implementation tree is byte-identical to the delivery commits.

Additional evidence:

- `npx astro sync` generates the exact 14-schema set, including all ten new collections. `editor/collections.test.mjs` invokes real Astro sync/build in an isolated fixture, checks the full schema filename set, and reads entries through the public `getCollection()` API. All 146 JSON entries match NativeStore IDs and schema-parsed values.
- The NativeStore regression executes the actual pre-migration adapter from base `81caa68` against the same content revision and compares the complete state with the new adapter. Every registered address is checked independently against its expected collection, and every record revision equals the PR 3 registry's whole-file hash.
- The snapshot comparison normalizes through JSON, as the HTTP state API does, and compares all records and templates with the captured pre-change response. **170 records identical**, including IDs, revisions, values and descriptors; templates identical.
- `FLYINGSTARS_OFFLINE_MEDIA=1 npx astro build` produces **63 pages**. The comparison checks the page set and calls `Buffer.equals()` for every HTML file. **63 identical, 0 different**, with no normalization or ignored bytes. All German, English and Dutch pages and aliases are included.
- `npx astro check`: **0 errors, 0 warnings, 207 existing hints**.
- `git diff --check`: passed.
- `git diff -- src/content` is empty; no content file or schema definition was edited.

Re-run comparisons from this worktree, or from the committed copy using absolute baseline paths:

```sh
/opt/homebrew/opt/node@22/bin/node editor/pr5-compare.mjs html /tmp/afe-pr5-baseline-html dist
/opt/homebrew/opt/node@22/bin/node editor/pr5-compare.mjs state /tmp/afe-pr5-baseline-state.json
```

The comparison helper also supports `snapshot-html DIST EMPTY_DIRECTORY` and `snapshot-state FILE [REVISION]` to capture a fresh baseline before another migration. It exits nonzero on any page-set, byte, record or template difference. HTML differences include the first differing byte offset and neighboring text. A regression test verifies both byte and page-set failures.


## Commit and patch delivery

The sandbox rejects the original worktree's Git index lock with `Operation not permitted`. The implementation therefore remains uncommitted in that worktree. Three focused commits on `afe/pr5` live in the independent repository `/tmp/afe-pr5-commit-series`:

1. `27cf20d` registers collections, explicit addresses, preview collection paths and verification helpers/tests.
2. `c72c3b7` switches editorial readers and their existing consumers to Astro APIs, retaining the documented bridges.
3. The documentation commit adds this report.

A clean-base `git am` check of the exported series reproduces the complete delivery tree. Every changed file is also compared byte-for-byte with this worktree.

Every commit message ends with `Co-Authored-By: Codex <noreply@openai.com>`.
The `git format-patch` series is in `/tmp/afe-pr5-patches`, based on `81caa685216019e118a94acbfafd28010ed55b71`. Apply it with `git am` to a clean checkout of that base, not on top of the already modified working files. No patch was applied to the live checkout or the original worktree.

Open work is limited to the planned product steps: loader-wrapper provenance and registration lifecycle, `x-afe` annotations/site policies, canonical translation tuples and removal of the media/Markdown/legacy-address bridges after parity. The current PR deliberately keeps those existing formats and rendering contracts.
