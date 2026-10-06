// Canonical records have no UI coordinates or privileged O/X/I orientation.
export const VERSION = 1;
export function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}
export async function hash(value) {
  const bytes = new TextEncoder().encode(typeof value === 'string' ? value : canonical(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function piece(kind, body, links = []) {
  const payload = {version: VERSION, kind, body, links};
  return {id: 'sha256:' + await hash(payload), ...payload};
}
export const normalize = text => text.replace(/\s+/gu, ' ').trim();
export function locus(url) { const u = new URL(url); u.hash = ''; return u.href; }
export const frame0 = Object.freeze({O: 'PieceSpace', X: 'PieceProcess', I: 'PieceBrain'});
export const sigma = f => ({O: f.I, X: f.X, I: f.O});
export const rho = f => ({O: f.I, X: f.O, I: f.X});
export async function makeEncounter(scan) {
  if (!scan || !/^https?:/.test(scan.url) || !Array.isArray(scan.blocks) || scan.blocks.length > 1200) throw Error('Invalid encounter');
  const pieces = [];
  const nodes = [];
  for (let index = 0; index < scan.blocks.length; index++) {
    const b = scan.blocks[index];
    if (typeof b.text !== 'string' || b.text.length > 100000) throw Error('Invalid text block');
    const content = await piece('text', {text: normalize(b.text)});
    pieces.push(content);
    nodes.push({...b, text: content.body.text, contentId: content.id, occurrence: index});
  }
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].before = nodes[i - 1]?.contentId || null;
    nodes[i].after = nodes[i + 1]?.contentId || null;
  }
  // The root identifies an ordered text representation, never the whole web resource.
  const root = await piece('text-sequence', {normalization: 'whitespace-v1', children: nodes.map(n => n.contentId)}, nodes.map(n => ({rel: 'contains', to: n.contentId})));
  pieces.push(root);
  const encounter = await piece('encounter', {
    instance: crypto.randomUUID(), source: locus(scan.url), title: String(scan.title || '').slice(0, 500),
    capturedAt: new Date().toISOString(), documentHash: root.id, nodes,
    viewport: scan.viewport, extent: scan.extent, coverage: scan.coverage,
    representation: 'visible-dom-text-and-line-geometry-v1'
  }, [{rel: 'represents', to: root.id}]);
  pieces.push(encounter);
  return {encounter, pieces};
}
export function makeAnchor(encounter, index, selection = null) {
  const node = encounter.body.nodes[index];
  if (!node) throw Error('Target is absent from encounter');
  let start = 0, end = node.text.length;
  if (selection) {
    ({start, end} = selection);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > node.text.length) throw Error('Invalid selection range');
  }
  return {encounterId: encounter.id, occurrence: index, contentId: node.contentId,
    start, end, quote: node.text.slice(start, end), prefix: node.text.slice(Math.max(0, start - 48), start),
    suffix: node.text.slice(end, end + 48), before: node.before, after: node.after, path: node.path};
}
export function reconcile(anchor, encounter) {
  const nodes = encounter.body.nodes;
  if (anchor.encounterId === encounter.id) return {status: 'historical', index: anchor.occurrence, evidence: ['same encounter']};
  let exact = nodes.filter(n => n.contentId === anchor.contentId);
  if (exact.length === 1) return {status: 'exact-content', index: exact[0].occurrence, evidence: ['unique content hash; occurrence identity is inferred']};
  if (exact.length > 1) {
    const context = exact.filter(n => (anchor.before !== null || anchor.after !== null) && n.before === anchor.before && n.after === anchor.after);
    if (context.length === 1) return {status: 'context-match', index: context[0].occurrence, evidence: ['content hash', 'both neighboring hashes']};
    return {status: 'ambiguous', candidates: exact.map(n => n.occurrence), evidence: ['duplicate content; insufficient context']};
  }
  const candidates = [];
  for (const n of nodes) {
    let from = 0, at;
    while ((at = n.text.indexOf(anchor.quote, from)) !== -1 && anchor.quote) {
      const prefix = n.text.slice(Math.max(0, at - anchor.prefix.length), at);
      const suffix = n.text.slice(at + anchor.quote.length, at + anchor.quote.length + anchor.suffix.length);
      if (prefix === anchor.prefix && suffix === anchor.suffix) candidates.push({index: n.occurrence, start: at});
      from = at + 1;
    }
  }
  if (candidates.length === 1) return {status: 'quote-candidate', ...candidates[0], evidence: ['quote and context only; requires explicit acceptance']};
  return {status: candidates.length ? 'ambiguous' : 'unresolved', candidates: candidates.map(c => c.index), evidence: ['no unique exact content match']};
}
export function materialize(events) {
  const notes = new Map();
  for (const e of events) {
    if (e.type === 'annotate') notes.set(e.noteId, {...e, deleted: false});
    if (e.type === 'revise' && notes.has(e.noteId)) notes.set(e.noteId, {...notes.get(e.noteId), text: e.text, crossingId: e.crossingId, updatedAt: e.at});
    if (e.type === 'visibility' && notes.has(e.noteId)) notes.get(e.noteId).deleted = e.deleted;
  }
  return [...notes.values()].filter(n => !n.deleted);
}
export function compile(encounters, events) {
  const byId = new Map(encounters.map(e => [e.id, e]));
  const notes = materialize(events);
  return ['# 𐂷 genpeace.trie — peace process transparency', '', ...notes.flatMap(n => {
    const e = byId.get(n.anchor.encounterId);
    return [`## ${e?.body.title || 'Encounter'}`, `Source: ${e?.body.source || '(missing)'}`, `Encounter: ${n.anchor.encounterId}`, `Captured: ${e?.body.capturedAt || ''}`, '', ...n.anchor.quote.split('\n').map(l => '> ' + l), '', n.text, ''];
  })].join('\n');
}
