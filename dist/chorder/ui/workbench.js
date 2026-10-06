import {request, download} from './api.js';
import {materialize, reconcile, compile, frame0} from '../core/model.js';
import {ChordSession, commands, encounterTrie} from '../core/trie.js';
import {recipeFor, deltaPacket, receive, replay} from '../core/accumulator.js';
import {archetype} from '../variant.js';
const $ = id => document.getElementById(id);
const el = (tag, text, parent, cls) => { const n = document.createElement(tag); n.textContent = text; if (cls) n.className = cls; parent?.append(n); return n; };
let state, encounters, notes, selectedSource, selectedId;
function fail(error) { $('notice').textContent = error.message; }
function on(id, fn) { $(id).addEventListener('click', () => Promise.resolve().then(fn).catch(fail)); }
function tab(name) { if (name !== 'atlas') $('notice').textContent = ''; else if (state) renderEncounter(); document.querySelectorAll('.panel').forEach(p => p.classList.toggle('hidden', p.id !== name)); document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === name)); }
document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => tab(b.dataset.tab)));
if (globalThis.chrome?.runtime?.id) $('live-demo').remove();
$('environment').textContent = globalThis.chrome?.runtime?.id ? archetype.toUpperCase() + ' / LOCAL ARCHIVE' : 'INTERACTIVE DEMO / SAMPLE DATA';
async function refresh() {
  state = await request('state'); encounters = state.pieces.filter(p => p.kind === 'encounter').sort((a,b) => a.body.capturedAt.localeCompare(b.body.capturedAt)); notes = materialize(state.events);
  $('stats').replaceChildren();
  for (const [count, label] of [[encounters.length, 'Encounters'], [notes.length, 'Transparencies'], [state.events.length, 'Process events']]) { const s = el('div', '', $('stats'), 'stat'); el('strong', count.toString().padStart(2, '0'), s); el('span', label, s); }
  if (!selectedSource) selectedSource = encounters.at(-1)?.body.source;
  renderSources(); renderEncounter(); renderKernel(); renderProcess(); renderRecipes();
  $('compiled').value = compile(encounters, state.events);
  if ($('atlas').classList.contains('hidden')) $('notice').textContent = '';
}
function renderSources() {
  const target = $('sources'); target.replaceChildren();
  const trie = encounterTrie(encounters);
  // Source grouping is a projection of origin / path segments / query / encounter leaves.
  for (const origin of trie.next()) {
    const sources = [...new Set(encounters.filter(e => new URL(e.body.source).origin === origin.token).map(e => e.body.source))];
    for (const source of sources) {
      if (!source.toLowerCase().includes($('filter').value.toLowerCase())) continue;
      const u = new URL(source), b = el('button', u.hostname, target, 'source' + (source === selectedSource ? ' active' : ''));
      el('small', '↳ ' + u.pathname + u.search, b); el('small', `${encounters.filter(e => e.body.source === source).length} encounter leaves`, b);
      b.addEventListener('click', () => { selectedSource = source; selectedId = null; renderSources(); renderEncounter(); });
    }
  }
  if (!encounters.length) el('p', 'Visit an HTTP(S) page with the extension enabled, then refresh this archive.', target, 'aside-note');
}
function renderEncounter() {
  const list = encounters.filter(e => e.body.source === selectedSource);
  if (!list.some(e => e.id === selectedId)) selectedId = list.at(-1)?.id;
  $('encounters').replaceChildren();
  list.forEach((e, i) => { const o = el('option', `S${i} · ${new Date(e.body.capturedAt).toLocaleTimeString()}`, $('encounters')); o.value = e.id; }); $('encounters').value = selectedId || '';
  const e = list.find(e => e.id === selectedId);
  $('blocks').replaceChildren(); $('minimap').replaceChildren(); if (!e) return;
  $('encounter-label').textContent = `IMMUTABLE ENCOUNTER S${list.indexOf(e)} / ${e.body.nodes.length} BLOCKS`;
  $('document-title').textContent = e.body.title;
  $('metadata').textContent = `${e.body.source} · ${e.body.capturedAt} · ${e.id.slice(0, 24)}…${e.body.coverage?.truncated ? ' · PARTIAL CAPTURE' : ''}`;
  const applicable = notes.filter(n => n.source === selectedSource).map(n => ({note: n, match: reconcile(n.anchor, e)}));
  let unresolved = 0;
  e.body.nodes.forEach((node, index) => {
    const b = el('div', '', $('blocks'), 'block'); b.id = 'block-' + index;
    el('span', String(index).padStart(3, '0'), b, 'ordinal'); el('p', node.text, b, 'bodytext');
    const here = applicable.filter(a => a.match.index === index && ['historical', 'exact-content', 'context-match'].includes(a.match.status));
    for (const a of here) renderNote(a.note, a.match.status, b);
    const m = el('button', '', $('minimap'), 'mapblock' + (here.length ? ' marked' : '')); m.title = node.text; m.setAttribute('aria-label', 'Go to block ' + index); m.style.height = Math.max(6, Math.min(40, node.rect?.height / 4 || 12)) + 'px'; m.addEventListener('click', () => b.scrollIntoView({behavior:'smooth',block:'center'}));
  });
  for (const {note, match} of applicable) {
    if (['historical', 'exact-content', 'context-match'].includes(match.status)) continue;
    unresolved++;
    const b = el('div', '', $('blocks'), 'annotation'); el('small', `HISTORICAL NOTE · ${match.status.toUpperCase()} · NOT PROJECTED ONTO THIS ENCOUNTER`, b);
    el('p', '“' + note.anchor.quote + '”', b); el('p', note.text, b);
    const go = el('button', 'View original encounter', b); go.addEventListener('click', () => { selectedId = note.anchor.encounterId; renderEncounter(); });
  }
  $('notice').textContent = unresolved ? `${unresolved} note(s) remain bound to their original encounter. No guessed relocation.` : '';
}
function renderNote(note, status, target) {
  const n = el('div', '', target, 'annotation'); el('small', status.toUpperCase() + ' · HUMAN CROSSING', n);
  const edit = el('button', 'Revise', n); el('span', note.text, n);
  edit.addEventListener('click', () => {
    edit.disabled = true; const input = el('textarea', '', n); input.value = note.text; input.maxLength = 20000; input.setAttribute('aria-label', 'Revise annotation');
    const save = el('button', 'Preserve revision', n), cancel = el('button', 'Cancel', n);
    cancel.addEventListener('click', renderEncounter);
    save.addEventListener('click', async () => { save.disabled = true; try { await request('revise', {noteId: note.noteId, text: input.value}); await refresh(); } catch(e) { fail(e); save.disabled = false; } }); input.focus();
  });
}
function renderKernel() {
  const frame = state.events.findLast(e => e.type === 'vantage')?.frame || frame0;
  $('frame').replaceChildren(); for (const [role, value] of Object.entries(frame)) { const d = el('div', '', $('frame')); el('strong', role, d); el('span', value, d); }
  const previous = $('records').value; $('records').replaceChildren();
  for (const p of state.pieces) { const option = el('option', `${p.kind} · ${p.id.slice(7, 23)}`, $('records')); option.value = p.id; }
  if (state.pieces.some(p => p.id === previous)) $('records').value = previous;
  renderRecord();
}
function renderRecord() { $('record').textContent = JSON.stringify(state.pieces.find(p => p.id === $('records').value) || {}, null, 2); }
function renderProcess() {
  $('events').replaceChildren();
  for (const e of state.events) { const row = el('div', '', $('events'), 'event'); el('code', String(e.seq).padStart(3,'0'), row); el('strong', e.type, row); el('code', `${e.at} · ${e.operator || e.noteId || e.encounterId || ''}`, row); }
}
$('filter').addEventListener('input', renderSources); $('encounters').addEventListener('change', () => { selectedId = $('encounters').value; renderEncounter(); }); $('records').addEventListener('change', renderRecord);
on('sigma', async () => { await request('vantage', {operator: 'sigma'}); await refresh(); }); on('rho', async () => { await request('vantage', {operator: 'rho'}); await refresh(); });
on('download', async () => download('genpeace.trie-archive.json', JSON.stringify(await request('state'), null, 2)));
on('markdown', () => download('genpeace.trie-transparency.md', $('compiled').value, 'text/markdown'));
const session = new ChordSession();
function showChoices(message = '') {
  $('chordpath').textContent = '𐂷 ' + session.path.map(k => '→ ' + k.toUpperCase()).join(' '); $('choices').replaceChildren();
  for (const c of session.trie.next(session.path)) { const b = el('button', c.token.toUpperCase() + ' · ' + (c.value?.label || {s:'Space',p:'Process',b:'Brain'}[c.token]), $('choices')); b.addEventListener('click', () => { c.token.split('+').forEach(k => session.down(k)); let r; c.token.split('+').forEach(k => r = session.up(k)); result(r); }); }
  $('chordstatus').textContent = message || 'Ready · release keys to cross into the next branch';
}
async function result(r) {
  if (r.command) {
    const {id, label} = r.command;
    if (id === 'sigma' || id === 'rho') { try { await request('vantage', {operator:id}); await refresh(); } catch(e) { fail(e); } }
    if (id === 'inspect') tab('kernel'); if (id === 'map') tab('atlas'); if (id === 'export') tab('export');
    showChoices(`${label}${['scan','annotate'].includes(id) ? ' — available in the live page toolbar' : ' ✓'}`);
  } else showChoices(r.invalid ? `No branch for ${r.invalid}; reset to root.` : '');
}
$('chordpad').addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
  if (e.key === 'Escape') { e.preventDefault(); session.reset(); showChoices(); }
  if (e.key === 'Backspace') { e.preventDefault(); session.path.pop(); showChoices(); }
  if (/^[a-z]$/i.test(e.key)) { e.preventDefault(); if (!e.repeat) session.down(e.key); }
});
$('chordpad').addEventListener('keyup', e => { if (session.held.has(e.key.toLowerCase())) { e.preventDefault(); result(session.up(e.key)); } });
$('chordpad').addEventListener('focusout', e => { if (!$('chordpad').contains(e.relatedTarget)) { session.reset(); showChoices(); } });
for (const c of commands) { const d = el('div', '', $('grammar')); el('code', c.path.join(' → '), d); el('span', ' ' + c.label, d); }
showChoices(); refresh().then(() => { if (archetype === 'chorder') tab('accumulator'); }).catch(fail);
addEventListener('focus', () => refresh().catch(fail));

const receiver = new Map();
let sourceStock, activeRecipe, lastPacket;
function renderRecipes() {
  const prev = $('recipe-encounter').value; $('recipe-encounter').replaceChildren();
  encounters.forEach((e,i) => { const o = el('option', `S${i} · ${e.body.title}`, $('recipe-encounter')); o.value = e.id; });
  if (encounters.some(e => e.id === prev)) $('recipe-encounter').value = prev;
  $('stock-count').textContent = `${state.pieces.length} canonical pieces`;
  $('receiver-count').textContent = `${receiver.size} received pieces`;
}
async function transmit() {
  const e = encounters.find(e => e.id === $('recipe-encounter').value); if (!e) throw Error('Capture an encounter first');
  activeRecipe = await request('produce', {encounterId:e.id});
  await refresh();
  sourceStock = new Map([...state.pieces, activeRecipe].map(p => [p.id,p]));
  const result = deltaPacket(activeRecipe.id, sourceStock, receiver, Number($('budget').value));
  await receive(result.packet, receiver); lastPacket = result.packet;
  $('receiver-count').textContent = `${receiver.size} received pieces`;
  $('channel-status').textContent = `${result.packet.pieces.length} new pieces · ${result.bytes} UTF-8 bytes · ${result.remaining} still missing${result.remaining && !result.packet.pieces.length ? ` · next piece requires a packet of at least ${result.nextMinimum} bytes` : ''}`;
  $('channel-record').textContent = JSON.stringify({recipeId:activeRecipe.id,bytes:result.bytes,remaining:result.remaining,pieces:result.packet.pieces.map(p => ({kind:p.kind,id:p.id}))},null,2);
  renderReplay();
}
function renderReplay() {
  if (!activeRecipe) return;
  const r = replay(activeRecipe.id, receiver); $('replay').replaceChildren();
  el('h3', `Assembly state: ${r.state}`, $('replay'));
  if (r.state !== '1') { el('p', 'Waiting for recipe dependencies. Send another packet, or increase its byte budget.', $('replay')); return; }
  el('h3', r.title, $('replay'));
  r.blocks.forEach((text,i) => {
    el('p', $('replay-target').value === 'outline' ? `${i}. ${text.slice(0,110)}${text.length > 110 ? '…' : ''}` : text, $('replay'), 'bodytext');
    r.notes.filter(n => n.anchor.occurrence === i).forEach(n => el('p', n.text, $('replay'), 'annotation'));
  });
}
on('transmit', transmit); on('packet', () => { if (!lastPacket) throw Error('Send a packet first'); download('genpeace.trie-delta.json', JSON.stringify(lastPacket)); });
$('replay-target').addEventListener('change',renderReplay);
