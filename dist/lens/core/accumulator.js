import {canonical, hash, piece, materialize, frame0} from './model.js';
export const byteLength = object => new TextEncoder().encode(canonical(object)).byteLength;
// A recipe binds local stock to a reconstruction, retaining historical provenance.
export async function recipeFor(encounter, events) {
  const notes = materialize(events).filter(n => n.anchor.encounterId === encounter.id);
  return piece('replay-recipe', {
    procedure: 'ordered-text-with-transparencies-v1', encounterId: encounter.id,
    rootId: encounter.body.documentHash, title: encounter.body.title, source: encounter.body.source,
    observerState: encounter.body.viewport,
    frame: events.findLast(e => e.type === 'vantage')?.frame || frame0,
    notes: notes.map(n => ({noteId: n.noteId, anchor: n.anchor, text: n.text})),
    coverage: encounter.body.coverage,
    limits: ['not original pixels', 'not an inferred mental state', 'no video reconstruction']
  }, [{rel: 'reconstructs', to: encounter.id}, {rel: 'assembles', to: encounter.body.documentHash}, ...notes.map(n => ({rel: 'includes-crossing', to: n.crossingId}))]);
}
export function closure(rootId, stock) {
  const ordered = [], seen = new Set(), visiting = new Set();
  function visit(id) {
    if (seen.has(id)) return;
    if (visiting.has(id)) throw Error('Cyclic recipe');
    const p = stock.get(id); if (!p) throw Error('Missing stock: ' + id);
    visiting.add(id); for (const link of p.links) visit(link.to);
    visiting.delete(id); seen.add(id); ordered.push(p);
  }
  visit(rootId); return ordered;
}
export function deltaPacket(recipeId, stock, inventory, budget) {
  if (!Number.isSafeInteger(budget) || budget <= 0) throw Error('Byte budget must be a positive integer');
  const needed = closure(recipeId, stock).filter(p => !inventory.has(p.id));
  const packet = {format: 'genpeace.delta.v1', recipeId, pieces: []};
  if (byteLength(packet) > budget) throw Error('Budget is smaller than the packet envelope');
  for (const p of needed) {
    const candidate = {...packet, pieces: [...packet.pieces, p]};
    if (byteLength(candidate) > budget) break;
    packet.pieces.push(p);
  }
  return {packet, bytes: byteLength(packet), remaining: needed.length - packet.pieces.length,
    nextMinimum: needed[packet.pieces.length] ? byteLength({...packet, pieces: [needed[packet.pieces.length]]}) : 0};
}
export async function receive(packet, stock) {
  if (packet?.format !== 'genpeace.delta.v1' || !Array.isArray(packet.pieces) || packet.pieces.length > 20000 || byteLength(packet) > 50000000) throw Error('Invalid delta packet');
  // Validate the complete packet before mutating receiver state.
  for (const p of packet.pieces) {
    if (p.version !== 1 || typeof p.kind !== 'string' || !Array.isArray(p.links) || p.links.some(l => typeof l.rel !== 'string' || typeof l.to !== 'string')) throw Error('Invalid piece');
    const {id, ...payload} = p;
    if (id !== 'sha256:' + await hash(payload)) throw Error('Piece hash mismatch');
    if (stock.has(id) && canonical(stock.get(id)) !== canonical(p)) throw Error('Conflicting piece identity');
  }
  packet.pieces.forEach(p => stock.set(p.id, structuredClone(p)));
  return stock.size;
}
export function replay(recipeId, stock) {
  const recipe = stock.get(recipeId);
  if (!recipe) return {state: stock.size ? 'ϕ' : '0', missing: [recipeId], blocks: [], notes: []};
  const missing = new Set(), visited = new Set();
  function check(id) { if (visited.has(id)) return; visited.add(id); const p = stock.get(id); if (!p) { missing.add(id); return; } p.links.forEach(l => check(l.to)); }
  check(recipeId);
  if (missing.size) return {state: 'ϕ', missing: [...missing], blocks: [], notes: []};
  if (recipe.kind !== 'replay-recipe') throw Error('Not a replay recipe');
  const root = stock.get(recipe.body.rootId);
  if (root?.kind !== 'text-sequence') throw Error('Invalid assembly root');
  const blocks = root.body.children.map(id => { const p = stock.get(id); if (p?.kind !== 'text') throw Error('Invalid text stock'); return p.body.text; });
  return {state: '1', missing: [], title: recipe.body.title, source: recipe.body.source, observerState: recipe.body.observerState, blocks, notes: recipe.body.notes};
}
