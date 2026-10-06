# Verification — 2026-10-05

## Automated

`npm test`: **30 passed, 0 failed**.

The suite exercises canonical hashes and normalization; distinct occurrences; changed/moved/duplicate-text reconciliation; rejected range errors; σ², ρ³ and reflection/rotation relations; release-based and sequential trie input; query-sensitive source indexing; transactional storage and reopen; concurrent captures; immutable note revisions; persisted reconciliation and recipe provenance; exact UTF-8 byte budgets; incremental reconstruction; reused stock; insufficient channel capacity; atomic rejection of tampered packets; partial dependency states; editable/hidden-content exclusions; line evidence; partial coverage flags; nested-container duplication; source-scoped service-worker messages; subframe/spoof rejection; and privileged archive access with tab metadata.

`npm run build`: both Manifest V3 configurations compile successfully. Static packaging checks resolve manifest assets and local module imports. Development dependencies are absent from the distributable extension folders.

## Browser exercise

The local browser demo was exercised through the in-app browser:

- Seeded archive rendered with encounter history, historical notes and unresolved projections.
- Actual content/overlay source captured the local field fixture.
- Created and preserved an annotation against a paragraph.
- Reloaded the page and observed the persisted note, now marked as an exact-content projection.
- Changed the source passage and captured again; the historical note stopped projecting onto the changed passage.
- Inspected the historical note in the archive.
- Sent a replay recipe and observed reconstructed text and annotations at the separate receiver.
- Repeated the transfer and observed **0 new pieces**, with only the **127-byte** envelope.
- Activated σ and observed O → PieceBrain, X → PieceProcess, I → PieceSpace with an added process event.
- Entered B in the key pad and observed the Brain branch with inspect/swap/rotate choices.
- Visually inspected the archive and exact 𐂷 icon. A preview image is included.

## What these checks do not establish

The browser fixture uses the real capture, overlay, data and rendering modules with a local message adapter. The actual packaged extension has **not been loaded in Chrome**, so native installation, real service-worker suspension, shortcut delivery and behavior across arbitrary external websites remain unverified. Message validation and persistence have automated coverage with mocked browser APIs and IndexedDB.

The automated duplicate-container regression covers the corrected final capture logic; previously generated demo encounters remain immutable and can show the older representation. Browser layout is heuristic, not certified across every website or viewport.

The builds are prototypes for finding an MV0 specification, not store-reviewed production releases.
