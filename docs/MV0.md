# 𐂷 genpeace.trie — candidate MV0 specification

This is a runnable interpretation, not a claim that the WPC ontology is settled.

## Recovered constraints

1. Visited documents are important: ingest HTTP(S) top-frame pages eagerly.
2. An annotation is a durable extension-owned record. Pink text is its projection.
3. A source URL is a locus through time. An anchor targets an immutable encounter.
4. Content identity, occurrence identity, coordinate recovery and similarity are distinct.
5. X carries the actual crossing: annotation, revision, reconciliation, production recipe or vantage transform.
6. O:X:I ↔ PieceSpace:PieceProcess:PieceBrain is vantage-dependent. σ swaps O/I; ρ is an exploratory rotation, not a settled domain claim.
7. A horizontal browser hook plane is the primary interaction entrance. This prototype inhabits the page immediately beneath native browser chrome.
8. The supplied SLEEP attachment adds stock + relations + ordering + observer state + reconstruction procedure. The channel / production entity participates in what can be reconstructed.

## Two loadable archetypes

| | Lens | Trychorder / Accumulator |
|---|---|---|
| Primary question | Where did this thought happen? | What must cross to make this encounter reconstructable here? |
| Page entrance | Pointer annotation toolbar | Accumulator introduction + same toolbar |
| Archive entrance | Encounter atlas | Accumulator experiment |
| Data | Immutable content, encounters, crossings, events | Same kernel + replay recipes and missing-piece packets |
| Best test | Mark a page, reload, mutate it, inspect the old anchor | Send S0, send S1, observe reused stock, reduce byte budget |

These are two configurations of one kernel, not incompatible forks. Both expose all views. They have independent Chrome extension IDs and independent archives when loaded from their separate folders. Comparing both simultaneously on the same tab will produce two toolbars; enable one at a time.

## Canonical records

```text
Piece = {
  id: SHA256(canonical({version, kind, body, links})),
  version: 1,
  kind: text | text-sequence | encounter | crossing | replay-recipe,
  body: JSON,
  links: [{rel, to: PieceID}]
}

Event = {
  seq: monotonically increasing local commit order,
  id: UUID,
  at: client wall-clock timestamp,
  type, source?, ...references to immutable pieces
}
```

Canonical JSON sorts object keys, preserves array order, and hashes UTF-8. Records are local content-addressed data, not signed attestations. The event sequence is local to this archive and is not a distributed clock.

A `text` piece stores whitespace-normalized DOM text. A `text-sequence` stores ordered content IDs and dependency links. An `encounter` stores its own occurrence UUID, source, capture time, ordered node occurrences, text content IDs, DOM paths, document-space rectangles, line fragments, viewport state, document extent and explicit capture coverage. The document hash denotes the captured normalized text sequence only. It is not proof that pixels, styles, scripts, omitted content, or the complete resource are identical.

A node occurrence is `(encounterID, occurrenceIndex)`. It is never just a content hash. Identical paragraphs have identical text piece IDs but different occurrence addresses.

```text
source locus
  ├─ encounter S0 ── ordered content stock
  │    └─ anchor A0 ← annotate crossing ← human note
  └─ encounter S1 ── partly shared stock

A0 ── explicit reconciliation crossing ── candidate occurrence in S1
```

The historical anchor remains unchanged. It contains encounter ID, occurrence index, content ID, UTF-16 range offsets, quote, prefix, suffix, neighboring hashes and capture-time DOM path. A cross-block selection or repeated quote within one block is refused rather than assigned arbitrary coordinates.

Projection rules: same encounter; otherwise unique exact content hash; otherwise exact content plus both neighbors. Quote/context-only recovery is reported as a candidate and is not automatically rendered. Ambiguous and unresolved notes remain visible in the archive. Explicit acceptance of a fuzzy candidate is deferred. Live-page reconciliation results are themselves persisted as crossing pieces and journal events; archive comparisons can also recompute these deterministic results.

Revisions append crossings and journal entries. Replay materializes current note text without deleting earlier versions. σ and ρ append events without relabeling persisted source or note records.

## Accumulators and channel

`P2 source stock → P3 production/channel → P1 receiving stock` is the experiment's chosen orientation. It is not a permanent identification of P1 or P2 with a geography or an observer.

A replay recipe preserves text order, references to the source encounter and note crossings, observer viewport, coverage, and current vantage. Dependency closure specifies required stock. The source subtracts the receiver's content-ID inventory and produces a topologically ordered packet of missing pieces that fits the requested UTF-8 byte budget, including its envelope. The receiver validates every SHA-256 before accepting any piece in that packet. It reconstructs only after the whole closure exists. The recipe is durable in the main archive; the second receiver is an in-memory experiment and resets on reload. There is no network transport.

Assembly states use the attachment's ternary cue conservatively:

- `0`: receiver has no stock.
- `ϕ`: dependencies are incomplete.
- `1`: recipe dependency closure is present.

These are not probabilities, inferred experiences or psychological labels. Text and compact outline are two local compiler targets. The outline intentionally elides text; the full stock remains available.

Packets transfer whole pieces. A large encounter may require a larger single-packet budget; chunking is deferred. This is missing-piece transport, not optimal compression: encounter records still contain convenient inline text and geometry, and full encounter envelopes can dominate transfer size. No claim of minimal deltas or preservation of all story semantics is made.

## Trie / key grammar

The source index is a trie of origin → path segments → query → encounter ID. The command trie has Space, Process and Brain branches. Key chords are sorted sets; chord order is immaterial, while path order matters. A chord commits on release of every held key. Escape resets, Backspace ascends, blur cancels held keys, and editable fields retain their typing behavior.

The supplied attachment does **not** contain a keyboard-chord specification or the word “trychorder.” The keyboard trie is an explicitly invented experiment. The accumulator/reconstruction interpretation is grounded in the supplied text; it should not be mistaken for recovered wording from the unavailable original discussion.

## Deliberate MV0 boundaries

- DOM text + geometry, not pixels or video. Line rectangles are browser text-fragment rectangles, not line image captures. No raster↔DOM correspondence is claimed.
- Top frame only; no embedded frames, shadow-root source content, canvas, browser internal pages, built-in PDF viewer, offscreen virtualized text or original page replay.
- Capture after page initialization, after a 1-second mutation quiet period, and at 6-second checkpoints for streaming/SPAs. Checkpoints create records only for changed text/path/source; reload and explicit capture create new encounters. Style-only, viewport-only and scroll-only changes do not create new snapshots automatically.
- At most 1,200 blocks, 1,000,000 normalized characters, 100,000 characters per block, 20,000 visited text nodes, and 512 line rectangles per block. Partial coverage is reported. No atomic snapshot of a concurrently mutating website is promised.
- Inputs, textareas, selects, editable regions and hidden text are excluded. Ordinary rendered page text may still be private. The extension works locally; archive export includes whatever you captured. It does not capture keystrokes, gaze, cameras, audio, or cursor trajectories.
- Shadow DOM isolates styling; it is not a secrecy boundary against the host page. Notes rendered into page space can be observed by the page.
- Margin notes can overlap a narrow page's source text. This prototype does not reflow the host DOM or provide a collision-free inline layout.
- The browser's native toolbar remains browser-owned. No foreign-extension launcher automation, model integration, native host, background upload or automatic chat submission.
- Local IndexedDB, no account, sync, retention policy, encryption layer or automatic cleanup. Browser quota errors are surfaced. Archive export is inspectable JSON; full archive import/migration is deferred.
- Sixpart ontology remains open: coordinate/quality, operation/purpose and state/process can be views over these records. This build does not claim that six application fields define the universal Piece primitive.

## Next decision, after trying it

Choose what MV0 must conserve: (a) stable annotation places, (b) a generative recipe with transferable stock, or (c) the general recursive Piece with both as specializations. The current kernel supports experimentation with all three, but does not settle that choice on your behalf.
