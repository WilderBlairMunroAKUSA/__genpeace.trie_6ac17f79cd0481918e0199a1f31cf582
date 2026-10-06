# 𐂷 genpeace.trie

Two installable Manifest V3 experiments for peace process transparencies: **Lens** and **Trychorder / Accumulator**. Built from the three project conversations and the supplied SLEEP / Piece Accumulator excerpt. The focus is immutable encounters, first-class crossings, variable vantage, and reconstructable stock.

## Try it

The generated folders are ready to load; no build step is required:

1. Open Chrome or a Chromium-based browser's Extensions page.
2. Enable Developer mode and choose **Load unpacked**.
3. Select `dist/lens` for annotation-first use, or `dist/chorder` for accumulator-first use.
4. Pin **𐂷**, then visit or refresh an ordinary HTTP(S) page.
5. Click **Annotate**, click a paragraph, write a note, and **Preserve**. Reload to see it reprojected.
6. Open **PB · Inspect** or **Open encounter atlas** to inspect encounters, crossings, historical notes and exported artifacts.

Use one archetype at a time. Each has independent extension storage. Installation grants access to HTTP(S) pages because eager ingestion is the requested starting premise. Captured content stays local until you export it.

### Browser demo, without installing

```sh
npm ci
npm run preview
```

Open http://127.0.0.1:4317/ui/workbench.html for the sample atlas, or http://127.0.0.1:4317/ui/field.html for a live local annotation page. Sample data is clearly labeled and stored separately from extension data. The live fixture uses the same source capture/overlay code with a local message adapter.

In **Accumulator**, send the first recipe, then send it again: the second packet should contain no new pieces. Select another encounter and observe shared stock. Reduce the byte budget to see incomplete reconstruction and explicit missing dependencies. The receiving store is an in-memory local experiment, not a remote service.

### Controls

- **Alt + Shift + A**: toggle annotation (editable via the browser's extension shortcuts).
- **Alt + Shift + G**: open the key trie.
- **Command / Ctrl + Enter**: preserve a note.
- **Escape**: cancel editing or the active trie / annotation mode.
- Trie examples: `S → C` capture; `S → M` cartograph; `P → A` annotate; `P → E` compile; `B → I` inspect; `B → S` swap vantage; `B → R` rotate vantage; simultaneous `S + P` annotate.

The chord grammar is an inference, not a recovered specification. The supplied attachment supports the accumulator/reconstruction model, but does not prescribe keyboard chords.

## What is implemented

- Eager DOM/text ingestion; source history with immutable encounter IDs.
- SHA-256 content stock, ordered roots, occurrence addresses, geometric/line-fragment evidence.
- Persistent annotations, immutable revisions, explicit reconciliation records, conservative projection.
- A horizontal page toolbar, pink notes, source cartograph, archive inspector, and process journal.
- σ / ρ vantage transforms recorded separately from canonical pieces.
- Durable replay recipes, validated missing-piece packets with byte budgets, and local reconstruction.
- JSON archive export, delta packet export, and Markdown transparencies for manual sharing.

**Limits:** text/geometry capture, not screenshot or full webpage preservation; top frame only; no PDF/canvas/shadow-source capture; no automatic chat sending; no network sync; no full-archive import. Read [the candidate MV0 specification](docs/MV0.md) for exact coverage and open decisions.

## Development

```sh
npm ci
npm test
npm run build
```

Runtime code has no external dependencies or remote scripts. esbuild, jsdom and fake-indexeddb are development-only dependencies. PNG icons are checked in; rebuilding the extension does not require Swift. `scripts/icons.swift` is an optional macOS icon regeneration utility for the exact 𐂷 glyph.

- `src/core/model.js`: canonical pieces, anchors, materialization, vantage and reconciliation.
- `src/core/repository.js`: transactional IndexedDB and durable process events.
- `src/core/accumulator.js`: recipes, dependency closure, byte budgets, receive verification and replay.
- `src/core/trie.js`: source/command tries and the chord state machine.
- `src/core/dom.js`: text and geometry observation.
- `src/content.js`: capture lifecycle and page projections.
- `src/background.js`: MV3 storage boundary and message validation.
- `src/ui/`: popup, archive, accumulator and sample fixture.

Read [provenance](docs/PROVENANCE.md) and [verification](docs/VERIFICATION.md).
