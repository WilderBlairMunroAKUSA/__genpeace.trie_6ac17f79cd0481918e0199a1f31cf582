import {makeEncounter, makeAnchor, piece, frame0, sigma, rho, materialize, reconcile} from './model.js';
import {recipeFor} from './accumulator.js';
export class Repository {
  constructor(db) { this.db = db; }
  static async open(name = 'genpeace.trie.v1') {
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open(name, 1);
      r.onupgradeneeded = () => { r.result.createObjectStore('pieces', {keyPath: 'id'}); r.result.createObjectStore('events', {keyPath: 'seq', autoIncrement: true}); };
      r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
    });
    return new Repository(db);
  }
  async read(store) {
    return new Promise((resolve, reject) => { const r = this.db.transaction(store).objectStore(store).getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  }
  async state() {
    // One readonly transaction provides a consistent export during concurrent writes.
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['pieces', 'events']);
      const p = tx.objectStore('pieces').getAll(), e = tx.objectStore('events').getAll();
      tx.oncomplete = () => resolve({version: 1, pieces: p.result, events: e.result}); tx.onerror = () => reject(tx.error);
    });
  }
  async commit(pieces, event) {
    const record = {...event, id: crypto.randomUUID(), at: new Date().toISOString()};
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['pieces', 'events'], 'readwrite');
      const ps = tx.objectStore('pieces');
      // Content addressing makes put idempotent, without modifying an existing payload.
      pieces.forEach(p => ps.put(p)); tx.objectStore('events').add(record);
      tx.oncomplete = () => resolve(record); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || Error('Storage transaction aborted'));
    });
  }
  async capture(scan) {
    const {encounter, pieces} = await makeEncounter(scan);
    await this.commit(pieces, {type: 'encounter', encounterId: encounter.id, source: encounter.body.source});
    return encounter;
  }
  async annotate(encounterId, index, selection, text) {
    if (typeof text !== 'string' || !text.trim() || text.length > 20000) throw Error('Write a note of 1–20,000 characters');
    const records = await this.read('pieces');
    const encounter = records.find(p => p.id === encounterId && p.kind === 'encounter');
    if (!encounter) throw Error('Capture the encounter first');
    const anchor = makeAnchor(encounter, index, selection);
    const noteId = crypto.randomUUID();
    const crossing = await piece('crossing', {operation: 'annotate', anchor, text: text.trim(), actor: 'local-human', noteId}, [{rel: 'targets', to: encounter.id}]);
    await this.commit([crossing], {type: 'annotate', noteId, anchor, text: text.trim(), crossingId: crossing.id, source: encounter.body.source});
    return noteId;
  }
  async revise(noteId, text) {
    if (typeof text !== 'string' || !text.trim() || text.length > 20000) throw Error('Write a note of 1–20,000 characters');
    const events = await this.read('events');
    const note = materialize(events).find(n => n.noteId === noteId);
    if (!note) throw Error('Note not found');
    const p = await piece('crossing', {operation: 'revise', noteId, text: text.trim()}, [{rel: 'revises', to: note.crossingId}]);
    await this.commit([p], {type: 'revise', noteId, text: text.trim(), crossingId: p.id, source: note.source});
  }
  async projections(encounterId) {
    const state = await this.state();
    const encounter = state.pieces.find(p => p.id === encounterId && p.kind === 'encounter');
    if (!encounter) throw Error('Encounter not found');
    const known = new Set(state.pieces.map(p => p.id)), results = [];
    for (const note of materialize(state.events).filter(n => n.source === encounter.body.source)) {
      const match = reconcile(note.anchor, encounter); results.push({noteId: note.noteId, match});
      if (match.status === 'historical') continue;
      const crossing = await piece('crossing', {operation: 'reconcile', noteId: note.noteId, anchor: note.anchor, targetEncounter: encounterId, result: match}, [{rel:'from',to:note.anchor.encounterId},{rel:'to',to:encounterId},{rel:'projects',to:note.crossingId}]);
      if (!known.has(crossing.id)) await this.commit([crossing], {type:'reconcile',source:encounter.body.source,noteId:note.noteId,encounterId,crossingId:crossing.id,status:match.status});
    }
    return results;
  }
  async produce(encounterId) {
    const state = await this.state();
    const encounter = state.pieces.find(p => p.id === encounterId && p.kind === 'encounter');
    if (!encounter) throw Error('Encounter not found');
    const recipe = await recipeFor(encounter, state.events);
    if (!state.pieces.some(p => p.id === recipe.id)) await this.commit([recipe], {type:'produce',source:encounter.body.source,encounterId,recipeId:recipe.id});
    return recipe;
  }
  async transform(operator) {
    if (!['sigma', 'rho'].includes(operator)) throw Error('Unknown vantage transform');
    const events = await this.read('events');
    const before = events.findLast(e => e.type === 'vantage')?.frame || frame0;
    const frame = operator === 'sigma' ? sigma(before) : rho(before);
    const p = await piece('crossing', {operation: operator, before, after: frame});
    await this.commit([p], {type: 'vantage', operator, frame, crossingId: p.id}); return frame;
  }
}
