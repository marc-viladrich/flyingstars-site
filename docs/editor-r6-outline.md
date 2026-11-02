# Stored outline marks and schema-declared images

Editable outline belongs to the stored inline text (`{o}…{/o}`). The four case-title second lines and the homepage sustainability second line now use the same mark as the toolbar. `.t-outline` owns the transparent fill and fixed 1.5px stroke (1px at ≤640px), using the text colour at 90% opacity. Case-title padding and typography remain on their existing layout selectors. Positional stroke rules have been removed.

The EN/NL values carry the same marks and fresh UTF-8 field hashes from `src/lib/localize.mjs`. Record source hashes match the changed source file bytes. Review flags remain unchanged; machine translations still require review before public use.

Image controls are selected exclusively by `format: 'image'` metadata on the shared image schema and project photograph schema. Server descriptions, serialized schemas, browser descriptions and saved source-image snapshots carry/use that declaration, including optional images and photographs without dimensions. A `src` property alone does not declare an image.

Formation is labelled “Interaktive Drohnenformation”. Its schema contains the explanatory help and hint, plus a read-only/advanced JSON source. The existing read-only-path guard also enforces schema-declared read-only fields at the save boundary. Title and text remain editable.

## Verification

- `node --test editor/inline-format.test.mjs editor/outline-content.test.mjs editor/image-schema.test.mjs editor/native-schema.test.mjs editor/view-state.test.mjs src/schemas/editorial-source.test.mjs`
- Full suite: `node --test 'editor/*.test.mjs' 'editor/test/*.test.mjs' 'editor/core/*.test.mjs' src/schemas/editorial-source.test.mjs`
- With Node 22 in PATH: `npx astro check` and `FLYINGSTARS_OFFLINE_MEDIA=1 npx astro build`.
- `/tmp/cx8/d/compare-html.py` compares the 15 built DE/EN/NL case/home pages against the pre-change build. Text and metadata must remain identical; each page gains exactly one outline span.
- `/tmp/cx8/d/verify-stroke.mjs` compares computed strokes and typography at 1440px and 390px, using Playwright from `/tmp/fs-ux/node_modules`. It needs permission to start loopback HTTP listeners and Chromium.

## Follow-ups / scope limits

- Sustainability facts with `tone: o` still outline value **and unit** using their existing component presentation. Migrating that mechanism needs a separate decision covering both fields and their different stroke widths.
- The existing inspector hides read-only fields and has no help/hint renderer. The task's `editor.js` ownership restriction permits image-classification changes only, so the visible JSON technical info and help/hint presentation require the separate, unapplied `/tmp/cx8/d/formation-renderer-pending.patch`. That patch is a reviewable integration proposal for the editor owner; it has not been applied or browser-verified.
- This sandbox rejects TCP listeners (`listen EPERM` on 127.0.0.1:4610) and Chromium launch. Computed-style parity and a computer-use recording remain unverified here; no video proof is claimed.
