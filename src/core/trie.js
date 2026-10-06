export const chord = keys => [...new Set(keys.map(k => k.toLowerCase()))].sort().join('+');
export class Trie {
  constructor() { this.root = {children: new Map(), value: null}; }
  insert(path, value) {
    let node = this.root;
    for (const token of path) { if (!node.children.has(token)) node.children.set(token, {children: new Map(), value: null}); node = node.children.get(token); }
    if (node.value !== null) throw Error('Duplicate trie address: ' + path.join(' / '));
    node.value = value; return this;
  }
  at(path) { let n = this.root; for (const token of path) { n = n.children.get(token); if (!n) return null; } return n; }
  next(path = []) { return [...(this.at(path)?.children || [])].map(([token, n]) => ({token, value: n.value, branch: n.children.size > 0})); }
}
export const commands = [
  {path: ['s', 'c'], id: 'scan', label: 'Capture encounter', group: 'Space'},
  {path: ['s', 'm'], id: 'map', label: 'Cartograph', group: 'Space'},
  {path: ['p', 'a'], id: 'annotate', label: 'Point & annotate', group: 'Process'},
  {path: ['p', 'e'], id: 'export', label: 'Compile transparency', group: 'Process'},
  {path: ['b', 'i'], id: 'inspect', label: 'Inspect kernel', group: 'Brain'},
  {path: ['b', 's'], id: 'sigma', label: 'σ · exchange O / I', group: 'Brain'},
  {path: ['b', 'r'], id: 'rho', label: 'ρ · rotate vantage', group: 'Brain'},
  {path: [chord(['s', 'p'])], id: 'annotate', label: 'Space + Process → annotate', group: 'Chord'}
];
export function commandTrie() { const t = new Trie(); commands.forEach(c => t.insert(c.path, c)); return t; }
export function encounterTrie(encounters) {
  const t = new Trie();
  for (const e of encounters) { const u = new URL(e.body.source); t.insert([u.origin, ...u.pathname.split('/').filter(Boolean), u.search || '∅', e.id], e.id); }
  return t;
}
// Key sets commit on release, not on a timing threshold. A held prefix cannot fire early.
export class ChordSession {
  constructor(trie = commandTrie()) { this.trie = trie; this.reset(); }
  reset() { this.path = []; this.held = new Set(); this.stroke = new Set(); }
  down(key) { this.held.add(key.toLowerCase()); this.stroke.add(key.toLowerCase()); }
  up(key) {
    this.held.delete(key.toLowerCase());
    if (this.held.size || !this.stroke.size) return {pending: true};
    const token = chord([...this.stroke]); this.stroke.clear();
    const path = [...this.path, token], node = this.trie.at(path);
    if (!node) { this.path = []; return {invalid: token}; }
    this.path = path;
    if (node.value && !node.children.size) { const command = node.value; this.reset(); return {command}; }
    return {path, next: this.trie.next(path)};
  }
}
