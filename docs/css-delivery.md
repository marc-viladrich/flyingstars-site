# CSS delivery

This development task explicitly authorizes CSS ownership, build, and guard changes beyond the restricted content-agent workflow in AGENTS.md. No content/schema changes, new dependencies, or publishing are involved.

## Ownership and loading

- `global.css` contains shared design tokens, reset, typography, controls, effects and layout primitives. It imports the shared shell and section-head styles. Base links one processed, fingerprinted external stylesheet so it remains reusable between pages.
- Section/template styles live beside their owner. Components import CSS with Vite's `?url` and render `Styles.astro` when they actually render. This bypasses the catch-all's static CSS-import propagation without changing the single section registry or creating a path-based page catalogue.
- `Styles.astro` registers and deduplicates assets per request using `Astro.locals`. It emits no DOM nodes. Base renders its default slot exactly once before the head, then emits the registered assets there in canonical owner-ID order. This preserves structural selectors such as :first-child and keeps dependency requests in the preload scanner’s early path. A CSS URL imported by an unused component emits no link on that page. There is no client loader, hidden-state filter or post-build HTML rewriting.
- Explicit first-viewport hero owners can import their CSS with `?inline` and pass it as `critical`. The processed inline owner has a hard 6 KiB limit. All other owners use normal stylesheet links. Common CSS still blocks rendering; this change does not pretend that duplicating critical CSS removes that blocking request.
- CSS uses the existing PostCSS custom-media expansion and Vite minification/hashing. Fonts and video stay external. `inlineStylesheets: auto` remains unchanged.

## Cascade contract

Selectors and declarations retain their order within each owner, including responsive rules. Mixed selector lists are separated without changing selector specificity. Shared primitives precede owner-specific rules. Existing native scoped CSS for the small shared Icon, LanguageSwitch and ComparisonCell remains intact. Heavy formerly scoped components use their existing class namespaces; generic LandingSite, ContactDetails, LandingHero and BlogPost selectors are explicitly restricted to their owner.

Regrouping is a cascade-equivalence change, not a claim that the old global source order is byte-identical. The generated pages must be compared against the unchanged baseline before accepting the migration. Menu, motion, video and form states remain part of that check. Do not remove dormant CSS merely because it does not match the first viewport.

## Verification

Build with `npm run check` and `npm run build`. Verify actual HTML owner links, shared URL reuse, deduplication, inline budget and absence of unrelated route owners. Measure cold and warm navigations separately with the same content, optional consent configuration, video and throttling. Preserve a baseline build outside the source tree; never test against editor/customer state.

## Measured result, 5 November 2026

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

This is a measured but limited cold-load improvement. Splitting CSS increases the home from two external stylesheets to fourteen smaller stylesheets, including Astro's remaining shared native chunk. They remain render-blocking and work without JavaScript. The dynamic consent styles are unchanged and excluded from those static stylesheet size totals. The earlier 1.7 s PSI result came from a different preview build and has not been reproduced by this implementation. Local results do not promise a hosted PSI result.

The native shared chunk can still have a Chopper404-derived filename because of Astro's import graph. Its 4,661 bytes contain the remaining shared scoped styles, not the actual 404 owner. The real Chopper404 rules are linked only where that component renders. The build audit checks selectors, not misleading chunk names.

Validation passed for public and editor builds, 72 pages each, and `astro check` reported zero errors and warnings. Seventy-three targeted CSS, layout and responsive-video tests passed, with three existing checks skipped because they expect the default `dist` directory; the actual builds were independently audited in isolated output directories. A full unit run was stopped after severe memory pressure and a failed editor fixture build; it is not claimed as passing. The contact editor-save fixture was then rerun alone against the committed change with a bounded Node heap and passed, including its real immutable editor build, all three locales, footer/section markers and unchanged legal documents.

Computed styles matched the baseline in 33 route/viewport cases across 18 routes, at 390, 700, 900 and 1440 CSS pixels. Comparisons include pseudo-elements, decoded images and loaded fonts; 45 or 73 properties were checked per element. Menu-open, second diagram zone, second package tab and optional phone-field states also matched. Live hero video playback and the global pause control were verified separately. A revisit from home to contact reused the shared stylesheet with zero transferred bytes. All CSS had been warmed in that browser, so this is a reuse check, not a first-visit contact benchmark.

The implementation uses Vite CSS URL/inline imports and Astro's slot/locals APIs. No dependency, content, schema, video or build-output patch was introduced. The read-only `astro:build:done` audit rejects CSS in the body, duplicate assets, unprocessed media aliases, changing shared URLs and critical owners above 6 KiB.
