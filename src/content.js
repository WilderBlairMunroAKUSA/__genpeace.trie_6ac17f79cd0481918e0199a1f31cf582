import {scanDocument, readBlock, selectionFor} from './core/dom.js';
import {materialize, reconcile, frame0, compile, locus} from './core/model.js';
import {ChordSession, commands} from './core/trie.js';
import {archetype} from './variant.js';
const send = async (type, data = {}) => {
  const response = await chrome.runtime.sendMessage({scope: 'genpeace', type, ...data});
  if (!response?.ok) throw Error(response?.error || 'Extension unavailable; reload this page');
  return response.value;
};
const host = document.createElement('div'); host.dataset.genpeaceRoot = 'true';
host.style.cssText = 'all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647';
const shadow = host.attachShadow({mode: 'open'});
const style = document.createElement('style'); style.textContent = `
:host{color-scheme:dark}*{box-sizing:border-box}button,textarea{font:inherit}button{cursor:pointer;color:#dfe9e4;background:#23362f;border:1px solid #496252;border-radius:6px;padding:5px 10px}button:hover,button.on{background:#46634b}button:focus-visible,textarea:focus-visible{outline:2px solid #d5f18f;outline-offset:2px}button:disabled{opacity:.45;cursor:wait}.bar{position:fixed;top:0;left:0;right:0;height:38px;background:#13251ff5;box-shadow:0 2px 9px #0004;color:#dfe9e4;display:flex;gap:7px;align-items:center;padding:4px 12px;font:12px system-ui;pointer-events:auto}.brand{font-weight:700;letter-spacing:.04em;margin-right:8px}.mark{font-size:25px;color:#d5f18f}.status{margin-left:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:34vw;color:#b9cbbd}.outline{position:fixed;border:2px solid #d5f18f;background:#d5f18f18;pointer-events:none;border-radius:4px;display:none}.note{position:fixed;pointer-events:auto;background:#fff0f7;color:#792449;border:1px solid #e8a4c7;border-left:4px solid #dc5c9e;padding:6px 9px;border-radius:5px;font:12px/1.4 system-ui;width:240px;max-height:100px;overflow:auto;white-space:pre-wrap;box-shadow:0 2px 8px #0002;text-align:left}.editor,.drawer{position:fixed;pointer-events:auto;background:#15281f;color:#edf2e7;border:1px solid #6c8066;border-radius:10px;box-shadow:0 18px 60px #0006;padding:18px;font:14px/1.5 system-ui}.editor{width:min(430px,95vw);right:18px;top:55px}.editor textarea,.drawer textarea{display:block;width:100%;min-height:130px;background:#f8faf2;color:#20362a;border:0;border-radius:5px;padding:10px;margin:12px 0;resize:vertical}.editor blockquote{max-height:90px;overflow:auto;margin:10px 0;color:#c4d4c5;font-size:12px}.drawer{right:18px;top:55px;width:min(510px,95vw);max-height:80vh;overflow:auto}.drawer h2{margin:0 0 12px;font:22px Georgia}.drawer p{color:#c4d4c5}.drawer button{margin:4px}.row{display:flex;align-items:center;justify-content:space-between;gap:10px}.hint{font-size:12px;color:#bdd09f}.mapitem{display:block;width:100%;text-align:left;font-size:12px;margin:5px 0!important}.danger{color:#ffbfbc}.hidden{display:none!important}
@media(max-width:650px){.bar{gap:3px;padding:3px}.brand{display:none}.status{max-width:100px}.bar button{padding:5px}.note{width:170px}}
`;
shadow.append(style); const bar = document.createElement('div'); bar.className = 'bar'; shadow.append(bar);
const make = (tag, text, parent, cls) => { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (cls) e.className = cls; parent?.append(e); return e; };
const button = (text, parent, fn, title = text) => { const b = make('button', text, parent); b.title = title; b.addEventListener('click', () => Promise.resolve().then(fn).catch(fail)); return b; };
make('span', '𐂷', bar, 'mark'); make('span', 'genpeace.trie', bar, 'brand');
const modeButton = button('Annotate', bar, () => run('annotate'));
button('PS · Map', bar, () => run('map')); button('PB · Inspect', bar, () => run('inspect')); button('PP · Export', bar, () => run('export'));
button('⌘ Trie', bar, showChorder); button('↻', bar, () => capture(true), 'Capture another encounter');
const status = make('span', 'Ingesting encounter…', bar, 'status');
button('−', bar, () => { const collapsed = bar.classList.toggle('collapsed'); [...bar.children].forEach((el, i) => { if (i > 1 && el !== bar.lastElementChild) el.classList.toggle('hidden', collapsed); }); bar.lastElementChild.textContent = collapsed ? '+' : '−'; }, 'Collapse toolbar');
const outline = make('div', '', shadow, 'outline');
document.documentElement.append(host);
let current = null, elements = [], state = {pieces: [], events: []}, inspecting = false, hovered = null, editor = null, drawer = null, capturing = false, dirty = false, previousSignature = '', busyTimer, frame = frame0;
const projectionElements = [];
function fail(e) { status.textContent = e.message || String(e); status.title = status.textContent; status.classList.add('danger'); }
function tell(text) { status.textContent = text; status.title = text; status.classList.remove('danger'); }
async function refresh() { if (current) await send('projections', {encounterId:current.id}); state = await send('state'); frame = state.events.findLast(e => e.type === 'vantage')?.frame || frame0; return renderNotes(); }
async function capture(force = false) {
  if (capturing) { dirty = true; return; }
  if (editor && !force) { dirty = true; return; }
  capturing = true;
  try {
    const scanned = scanDocument();
    const signature = JSON.stringify([locus(scanned.scan.url), scanned.scan.blocks.map(b => [b.path, b.text])]);
    if (!force && signature === previousSignature) { elements = scanned.elements; renderNotes(); return; }
    tell('Preserving encounter…');
    current = await send('capture', {scan: scanned.scan});
    elements = scanned.elements; previousSignature = signature;
    const unresolved = await refresh();
    tell(`${current.body.nodes.length} blocks · ${materialize(state.events).length} notes${unresolved ? ` · ${unresolved} historical / unprojected` : ''}${current.body.coverage.truncated ? ' · partial capture' : ''}`);
  } catch (e) { fail(e); }
  finally { capturing = false; if (dirty && !editor) { dirty = false; schedule(); } }
}
function schedule() { clearTimeout(busyTimer); busyTimer = setTimeout(() => capture(), 1000); }
function belongs(event) { return event.composedPath().includes(host); }
function locate(target) {
  const matches = elements.map((el, i) => ({el, i})).filter(({el}) => el.isConnected && (el === target || el.contains(target)));
  return matches.sort((a, b) => a.el.contains(b.el) ? 1 : -1)[0];
}
function placeOutline(el) { const r = el.getBoundingClientRect(); Object.assign(outline.style, {display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px'}); }
document.addEventListener('pointermove', e => { if (!inspecting || editor || belongs(e)) return; hovered = locate(e.target); if (hovered) placeOutline(hovered.el); else outline.style.display = 'none'; }, true);
document.addEventListener('click', e => {
  if (!inspecting || editor || belongs(e)) return;
  const found = locate(e.target); if (!found) return;
  e.preventDefault(); e.stopImmediatePropagation();
  try { openEditor(found); } catch (error) { fail(error); }
}, true);
function closeEditor() { editor?.remove(); editor = null; if (dirty) { dirty = false; schedule(); } }
function openEditor(target, note = null) {
  if (!current) throw Error('Wait for the first encounter');
  let selection = null;
  if (!note) {
    if (readBlock(target.el) !== current.body.nodes[target.i].text) { capture(true); throw Error('Page changed; capturing it now. Select the target again.'); }
    selection = selectionFor(target.el, current.body.nodes[target.i].text);
  }
  closeDrawer(); closeEditor(); outline.style.display = 'none';
  const encounterId = current.id, index = target?.i;
  editor = make('section', undefined, shadow, 'editor'); editor.setAttribute('role', 'dialog'); editor.setAttribute('aria-label', 'Peace process annotation');
  make('strong', note ? 'Revise transparency' : 'A thought at this coordinate', editor);
  const quote = note?.anchor.quote || (selection ? current.body.nodes[index].text.slice(selection.start, selection.end) : current.body.nodes[index].text);
  make('blockquote', quote, editor);
  const input = make('textarea', undefined, editor); input.placeholder = 'What do you see from here?'; input.setAttribute('aria-label', 'Annotation'); input.maxLength = 20000; input.value = note?.text || '';
  const row = make('div', undefined, editor, 'row'); make('span', '⌘ / Ctrl + Enter to preserve', row, 'hint');
  const save = async () => {
    saveButton.disabled = true;
    try { if (note) await send('revise', {noteId: note.noteId, text: input.value}); else await send('annotate', {encounterId, index, selection, text: input.value}); closeEditor(); await refresh(); tell('Transparency preserved'); }
    catch (e) { saveButton.disabled = false; fail(e); }
  };
  const saveButton = button('Preserve', row, save); button('Cancel', row, closeEditor);
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); } if (e.key === 'Escape') closeEditor(); });
  input.focus();
}
function renderNotes() {
  projectionElements.splice(0).forEach(p => p.node.remove());
  if (!current) return;
  let unresolved = 0;
  for (const note of materialize(state.events)) {
    const match = reconcile(note.anchor, current);
    if (!['historical', 'exact-content', 'context-match'].includes(match.status)) { unresolved++; continue; }
    const el = elements[match.index];
    if (!el?.isConnected || readBlock(el) !== current.body.nodes[match.index].text) { unresolved++; continue; }
    const n = button(note.text, shadow, () => openEditor({el, i: match.index}, note), `${match.status} · click to revise`); n.className = 'note';
    projectionElements.push({node: n, el});
  }
  layout();
  if (unresolved) tell(`${unresolved} historical notes need reconciliation · inspect archive`);
  return unresolved;
}
function layout() {
  let occupied = [];
  for (const {node, el} of projectionElements) {
    const r = el.getBoundingClientRect();
    if (r.bottom < 38 || r.top > innerHeight) { node.style.display = 'none'; continue; }
    node.style.display = 'block';
    const width = innerWidth <= 650 ? 170 : 240;
    const left = Math.max(5, Math.min(innerWidth - width - 10, r.right + 12));
    let top = Math.max(42, r.top);
    for (const other of occupied) { if (Math.abs(other.left - left) < width && top < other.bottom && top + node.offsetHeight > other.top) top = other.bottom + 5; }
    Object.assign(node.style, {left: left + 'px', top: top + 'px'}); occupied.push({left, top, bottom: top + node.offsetHeight});
  }
  if (hovered && inspecting && !editor) placeOutline(hovered.el);
}
let layoutFrame;
function requestLayout() { cancelAnimationFrame(layoutFrame); layoutFrame = requestAnimationFrame(layout); }
addEventListener('scroll', requestLayout, true); addEventListener('resize', requestLayout);
function closeDrawer() { drawer?.remove(); drawer = null; chording = false; chordSession.reset(); }
function openDrawer(title) { closeDrawer(); drawer = make('section', undefined, shadow, 'drawer'); const row = make('div', undefined, drawer, 'row'); make('h2', title, row); button('Close', row, closeDrawer); return drawer; }
async function run(id) {
  if (id === 'annotate') { inspecting = !inspecting; modeButton.classList.toggle('on', inspecting); outline.style.display = 'none'; tell(inspecting ? 'Select text or point at a block, then click' : 'Annotation mode off'); closeDrawer(); }
  if (id === 'scan') await capture(true);
  if (id === 'inspect') await send('workbench');
  if (id === 'sigma' || id === 'rho') { frame = await send('vantage', {operator: id}); tell(`O:${frame.O} · X:${frame.X} · I:${frame.I}`); }
  if (id === 'map') {
    if (!current) return;
    const d = openDrawer('PieceSpace · cartograph');
    make('p', `${current.body.nodes.length} text blocks. Geometry is an encounter record; click to visit its current element.`, d);
    current.body.nodes.forEach((n, i) => button(`${String(i).padStart(3, '0')} · ${n.tag} · ${n.text.slice(0, 85)}`, d, () => { elements[i]?.scrollIntoView({block: 'center', behavior: 'smooth'}); if (elements[i]) placeOutline(elements[i]); }, 'Go to block').className = 'mapitem');
  }
  if (id === 'export') {
    await refresh(); const d = openDrawer('Compile transparency');
    make('p', 'Historical quotes + your notes, ready to paste into a conversation.', d);
    const t = make('textarea', undefined, d); t.readOnly = true; t.value = compile(state.pieces.filter(p => p.kind === 'encounter'), state.events); t.setAttribute('aria-label', 'Compiled transparency');
    button('Copy Markdown', d, async () => { await navigator.clipboard.writeText(t.value); tell('Copied transparency'); });
  }
}
let chording = false;
const chordSession = new ChordSession();
function drawChord() {
  const area = drawer?.querySelector('[data-choices]'); if (!area) return; area.replaceChildren();
  make('p', chordSession.path.length ? 'Path: ' + chordSession.path.join(' → ') : 'Choose a branch. Tap sequentially or hold S + P together.', area);
  for (const next of chordSession.trie.next(chordSession.path)) button(`${next.token.toUpperCase()} · ${next.value?.label || ({s:'Space',p:'Process',b:'Brain'}[next.token] || 'Branch')}`, area, () => advance(next.token));
  make('p', 'Escape cancels · Backspace returns · keys commit when released', area, 'hint');
}
function showChorder() { const d = openDrawer('Try chorder'); chording = true; const choices = make('div', undefined, d); choices.dataset.choices = ''; drawChord(); }
function advance(token) { const keys = token.split('+'); keys.forEach(k => chordSession.down(k)); let result; keys.forEach(k => { result = chordSession.up(k); }); handleChord(result); }
function handleChord(result) { if (result.command) { closeDrawer(); run(result.command.id).catch(fail); } else { drawChord(); if (result.invalid) tell(`No branch for ${result.invalid}; returned to root`); } }
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !editor) { if (chording) closeDrawer(); inspecting = false; modeButton.classList.remove('on'); outline.style.display = 'none'; return; }
  const inputTarget = e.composedPath()[0];
  if (!chording || e.isComposing || e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(inputTarget.tagName) || inputTarget.isContentEditable) return;
  if (e.key === 'Backspace') { e.preventDefault(); chordSession.path.pop(); drawChord(); return; }
  if (!/^[a-z]$/i.test(e.key)) return;
  e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) chordSession.down(e.key);
}, true);
document.addEventListener('keyup', e => { if (!chording || !chordSession.held.has(e.key.toLowerCase())) return; e.preventDefault(); e.stopImmediatePropagation(); handleChord(chordSession.up(e.key)); }, true);
addEventListener('blur', () => { chordSession.reset(); if (chording) drawChord(); });
chrome.runtime.onMessage.addListener(m => { if (m.scope !== 'genpeace-control') return; if (m.command === 'toggle-annotation') run('annotate'); if (m.command === 'open-chorder') showChorder(); if (m.command === 'capture') capture(true); });
const observer = new MutationObserver(changes => {
  if (changes.some(m => m.target !== host && !host.contains(m.target))) schedule();
});
observer.observe(document.body, {childList: true, subtree: true, characterData: true});
// Also detect SPA URL changes and establish snapshots during continuously streaming pages.
setInterval(() => { if (!document.hidden && !editor) capture(); }, 6000);
addEventListener('pageshow', () => capture());
capture().then(() => { if (archetype === 'chorder') { const d = openDrawer('Trychorder · accumulator'); make('p', 'This encounter is now part of local stock. Compose a replay recipe, send only missing pieces through a bounded channel, and reconstruct at a second accumulator.', d); button('Open accumulator', d, () => run('inspect')); button('Explore key trie', d, showChorder); } });
