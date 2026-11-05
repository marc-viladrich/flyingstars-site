# CSS delivery

This development task explicitly authorizes CSS ownership, build, and guard changes beyond the restricted content-agent workflow in AGENTS.md. The follow-up explicitly authorizes publishing a feature-branch Cloudflare preview. Production merge/deployment is excluded. No content/schema changes or new dependencies are involved.

## Ownership and loading

- `global.css` contains shared design tokens, reset, typography, controls, effects and layout primitives. It imports the shared shell and section-head styles. Base links one processed, fingerprinted external stylesheet so it remains reusable between pages.
- Section/template styles live beside their owner. Components import CSS with Vite's `?url` and render `Styles.astro` when they actually render. This bypasses the catch-all's static CSS-import propagation without changing the single section registry or creating a path-based page catalogue.
- `Styles.astro` registers and deduplicates assets per request using `Astro.locals`. It emits no DOM nodes. Base renders its default slot exactly once before the head, then emits the registered assets there in canonical owner-ID order. This preserves structural selectors such as :first-child and keeps dependency requests in the preload scanner’s early path. A CSS URL imported by an unused component emits no link on that page. There is no client loader, hidden-state filter or post-build HTML rewriting.
- Critical owner CSS uses native Vite `?inline`, with a hard 6 KiB budget per owner. The first FlightHero additionally opts into `initialViewport`. Other templates retain normal blocking CSS because their next section can enter the first viewport.
- On that verified layout, `criticalShell()` derives a maximum 16 KiB subset from processed global CSS. It preserves selector specificity, cascade and responsive states, follows custom-property dependencies transitively, and includes dependencies of the critical owners, native shared components and configured consent. Its selector scope lives in one build helper; declarations continue to have one source. This avoids maintaining a second hand-copied stylesheet. Changing navigation or first-viewport structure requires rerunning the delayed-CSS proof. The table scroll-container rule is also critical: off-screen uncontained tables can widen the mobile layout viewport and displace fixed navigation.
- The viewport meta tag precedes all responsive stylesheet links, so mobile preload/media evaluation starts with the actual viewport. The full hashed global/owner styles remain external and cacheable. `StyleLink` downloads them without blocking the supported first viewport, then activates them on load. Its native height media conditions fall back to blocking CSS at 1100 CSS pixels, or 900 on the stacked mobile layout, for unusually tall viewports, where further sections can enter the screen. Every deferred link has a normal stylesheet in `noscript`. This has no browser, Lighthouse, bot or route-name detection. Cold fragment navigations also switch the owner links to native `blocking="render"` before the body is parsed, because their first screen can be below the hero. Inner pages continue to use blocking links.
- Cloudflare serves `/_astro/*` with an immutable one-year browser cache policy because those URLs contain content hashes. Font-face declarations are inline, while the same two WOFF2 files remain external, preloaded and cacheable. The showreel poster has responsive 480/768/960 variants; the video no longer makes a second request for its own duplicate poster. Playback, codecs, resolution and motion preferences are unchanged.
- Configured consent styles are one Vite-processed bundle discovered in the head. Consent waits for that sheet before showing controls. Base conditionally imports/renders the native Astro Consent component only when tracking IDs are configured; Astro emits its direct module entry without the former extra client import hop. A build without IDs has no consent entry or stylesheet. Tracking choices and storage logic are unchanged.
- CSS uses the existing PostCSS custom-media expansion and Vite minification/hashing. Fonts and video stay external. `inlineStylesheets: auto` remains unchanged.

## Cascade contract

Selectors and declarations retain their order within each owner, including responsive rules. Mixed selector lists are separated without changing selector specificity. Shared primitives precede owner-specific rules. Existing native scoped CSS for the small shared Icon, LanguageSwitch and ComparisonCell remains intact. Heavy formerly scoped components use their existing class namespaces; generic LandingSite, ContactDetails, LandingHero and BlogPost selectors are explicitly restricted to their owner.

Regrouping is a cascade-equivalence change, not a claim that the old global source order is byte-identical. The generated pages must be compared against the unchanged baseline before accepting the migration. Menu, motion, video and form states remain part of that check. Do not remove dormant CSS merely because it does not match the first viewport.

## Verification

Build with `npm run check` and `npm run build`. Verify actual HTML owner links, shared URL reuse, deduplication, inline budget and absence of unrelated route owners. Measure cold and warm navigations separately with the same content, optional consent configuration, video and throttling. Preserve a baseline build outside the source tree; never test against editor/customer state.

## Initial ownership measurement, 5 November 2026

Compared against unchanged `origin/main` at `3a3859d`. Final mobile Lighthouse 13.6 runs used actual DevTools throttling, CPU multiplier 1.2, fresh Chrome profiles, local HTTP/2, gzip, and the same active video and consent configuration. Three alternating runs per build:

| Metric | Baseline | New delivery |
| --- | ---: | ---: |
| Speed Index, median | 3.063 s | 2.816 s |
| Speed Index, individual runs | 3.085 / 3.063 / 2.930 s | 2.816 / 2.826 / 2.766 s |
| FCP / LCP, median | 1.723 s | 1.667 s |
| Performance score, median | 98 | 99 |
| Home external CSS, uncompressed | 148,715 B | 77,176 B |
| Home external CSS, gzip | 29,309 B | 22,019 B |
| Home HTML, gzip | 25,642 B | 27,717 B |

The home adds 5,097 bytes of processed FlightHero CSS inline. The existing 5,907-byte configurator teaser inline CSS is unchanged. The shared external basis is 33,265 bytes before compression, about 8.1 kB gzip. A first-section plain Hero uses 788 bytes inline instead. Other component styles remain external and cacheable.

These figures describe the initial ownership commit, before the critical-delivery follow-up below. Splitting CSS increases the home from two external stylesheets to fourteen smaller stylesheets, including Astro's remaining shared native chunk. They remain render-blocking and work without JavaScript. The dynamic consent styles are unchanged and excluded from those static stylesheet size totals. The earlier 1.7 s PSI result came from a different preview build and has not been reproduced by this implementation. Local results do not promise a hosted PSI result.

The native shared chunk can still have a Chopper404-derived filename because of Astro's import graph. Its 4,661 bytes contain the remaining shared scoped styles, not the actual 404 owner. The real Chopper404 rules are linked only where that component renders. The build audit checks selectors, not misleading chunk names.

Validation passed for public and editor builds, 72 pages each, and `astro check` reported zero errors and warnings. Seventy-three targeted CSS, layout and responsive-video tests passed, with three existing checks skipped because they expect the default `dist` directory; the actual builds were independently audited in isolated output directories. A full unit run was stopped after severe memory pressure and a failed editor fixture build; it is not claimed as passing. The contact editor-save fixture was then rerun alone against the committed change with a bounded Node heap and passed, including its real immutable editor build, all three locales, footer/section markers and unchanged legal documents.

Computed styles matched the baseline in 33 route/viewport cases across 18 routes, at 390, 700, 900 and 1440 CSS pixels. Comparisons include pseudo-elements, decoded images and loaded fonts; 45 or 73 properties were checked per element. Menu-open, second diagram zone, second package tab and optional phone-field states also matched. Live hero video playback and the global pause control were verified separately. A revisit from home to contact reused the shared stylesheet with zero transferred bytes. All CSS had been warmed in that browser, so this is a reuse check, not a first-visit contact benchmark.

The implementation uses Vite CSS URL/inline imports and Astro's slot/locals APIs. No dependency, content, schema, video or build-output patch was introduced. The read-only `astro:build:done` audit rejects CSS in the body, duplicate assets, unprocessed media aliases, changing shared URLs and critical owners above 6 KiB.


## Critical-delivery follow-up

The critical shell also retains the next section’s padding and the positioning rules for enhanced image canvases. The latter is a layout safety dependency: without `position: absolute`, a ResizeObserver can repeatedly include its own canvas in the parent height before deferred CSS arrives. The delayed-network proof asserts real canvases are out of flow. Empty media/support wrappers are pruned after token selection.

The logo marquee now lives with LogoBar rather than the shared shell. It and MediaFrame carry their small critical owner CSS where necessary, preserving the visible mobile logo strip. Native scoped styles stay native; blanket `inlineStylesheets: always`, a second critical stylesheet, HTML patching and runtime CSS extraction were rejected.

The cost is a larger home document. Full shared CSS is still cached across navigations, but its bounded critical subset is also present in each opted-in document. This trades a few compressed kilobytes of HTML for removing stylesheet round trips from first paint. It does not claim to eliminate that duplication.

`node scripts/verify-critical-delivery.mjs BASELINE_URL CANDIDATE_URL` verifies real network requests, not just removed DOM stylesheets. It holds external page CSS while checking visible geometry and computed styles across eight phone, tablet and desktop viewport sizes; checks native blocking at 390×1099; verifies cached shared CSS on navigation; and compares baseline/candidate with JavaScript disabled on home, wedding and contact. Set `CRITICAL_BROWSER=webkit` for the second engine. Use an isolated immutable baseline build and keep both output directories stable during the test.

Final validation and measurements are recorded with the feature PR and in the workspace report `notes/flying-stars/critical-render-2026-11-05/`. Local DevTools and PSI simulated throttling are separate experiments; their Speed Index values are not interchangeable. Public PSI must use the deployed feature artifact.


### Final follow-up measurement, 6 November 2026

Three alternating cold runs per variant compare the previous ownership candidate `6f690d3` with the completed follow-up. Same local HTTP/2/gzip server, Lighthouse 13.6, DevTools throttling, CPU multiplier 1.2, fresh Chrome profiles and active video/consent:

| Metric | Previous ownership candidate | Critical delivery |
| --- | ---: | ---: |
| Speed Index, median | 2.826 s | 2.380 s |
| Speed Index, individual runs | 2.832 / 2.749 / 2.826 s | 2.562 / 2.380 / 2.369 s |
| FCP, median | 1.615 s | 0.885 s |
| LCP, median | 1.648 s | 0.885 s |
| CLS, median | 0.0185 | 0.0185 |
| Performance score, median | 99 | 100 |
| Home HTML, gzip level 6 | 27,622 B | 33,259 B |
| Shared global CSS, gzip level 6 | 8,118 B | 7,954 B |

The critical shell is 16,344 bytes before compression. The complete shared global file remains external at 32,711 bytes; only home layouts opt into duplicating its bounded critical subset. The compressed home document grows by 5,637 bytes.

The completed delayed-network proof passes 13 cases in each of Chromium and WebKit: eight first-viewport sizes, a tall-viewport fallback, a cold fragment fallback and three JavaScript-disabled comparisons. Every viewport also verifies cached shared CSS on navigation. Phone cases use mobile/touch emulation and the actual visual viewport. Canvas positioning is asserted before deferred styles arrive.

Final `astro check` reports zero errors and warnings. Public and editor builds both render and audit 72 pages. The 82 targeted guards report 79 passed and three skipped because they expect the default `dist` directory; actual isolated builds pass the independent audit. The configured consent suite covers 22 cases per engine, with all cases passing across the complete run and targeted reruns; the no-ID case passes in both engines. The five-reload WebKit test needs its combined slow-test budget, also on the baseline. Full PR CI remains separate and is not represented as passing by these local checks.

The old head-linked CSS byte total excludes its late consent CSS, whereas the new head includes the combined consent bundle. Those two head totals must not be presented as comparable total transfer sizes. Full CSS declarations, hash URLs, fonts and media stay in the native Astro/Vite pipeline; no generated HTML or installed package is patched.
