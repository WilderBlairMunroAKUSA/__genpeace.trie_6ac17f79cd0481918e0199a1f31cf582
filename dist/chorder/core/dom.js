import {normalize} from './model.js';
const OMIT = 'script,style,noscript,template,input,textarea,select,[contenteditable]:not([contenteditable="false"]),[data-genpeace-root],svg,canvas';
export function pathOf(el) {
  const path = [];
  while (el && el !== document.body) {
    const parent = el.parentElement; if (!parent) break;
    path.unshift(`${el.tagName.toLowerCase()}:${[...parent.children].indexOf(el)}`); el = parent;
  }
  return path.join('/');
}
export function rectOf(r) { return {x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height}; }
export function textNodes(el) {
  const out = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = w.nextNode())) {
    const p = node.parentElement;
    if (p?.closest(OMIT) || !node.textContent) continue;
    const style = getComputedStyle(p);
    if (style.display === 'none' || style.visibility === 'hidden' || !p.getClientRects().length) continue;
    out.push(node);
  }
  return out;
}
function ownerOf(node) {
  const parent = node.parentElement;
  let el = parent;
  while (el !== document.body && !/^(block|list-item|table-cell|flex|grid)$/.test(getComputedStyle(el).display)) el = el.parentElement;
  // A stray inline label inside a structural container is its own unit.
  if (el.matches('main,body,article,section') && parent !== el) {
    let inline = parent;
    while (inline.parentElement !== el) inline = inline.parentElement;
    return inline;
  }
  return el;
}
function ownTextNodes(el) { return textNodes(el).filter(n => ownerOf(n) === el); }
export function readBlock(el) { return normalize(ownTextNodes(el).map(n => n.textContent).join('')); }
export function scanDocument() {
  const groups = new Map(), w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node, total = 0, walked = 0, truncated = false;
  while ((node = w.nextNode())) {
    if (++walked > 20000) { truncated = true; break; }
    if (!normalize(node.textContent)) continue;
    const p = node.parentElement;
    if (!p || p.closest(OMIT)) continue;
    // Choose the nearest true block. Inline wrappers do not change text identity.
    const el = ownerOf(node);
    if (groups.has(el)) continue;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none' || !el.getClientRects().length) continue;
    const text = readBlock(el);
    if (!text) continue;
    if (groups.size >= 1200 || text.length > 100000 || total + text.length > 1000000) { truncated = true; continue; }
    total += text.length; groups.set(el, text);
  }
  const elements = [...groups.keys()];
  const blocks = elements.map(el => {
    const lines = [];
    for (const n of ownTextNodes(el)) {
      const r = document.createRange(); r.selectNodeContents(n);
      for (const rect of r.getClientRects()) { if (lines.length >= 512) break; if (rect.width && rect.height) lines.push(rectOf(rect)); }
    }
    return {text: groups.get(el), tag: el.tagName.toLowerCase(), path: pathOf(el), rect: rectOf(el.getBoundingClientRect()), lines};
  });
  return {scan: {url: location.href, title: document.title, blocks, viewport: {width: innerWidth, height: innerHeight, scrollX, scrollY, dpr: devicePixelRatio}, extent: {width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight}, coverage: {truncated, blocks: blocks.length, characters: total, excludes: ['frames', 'shadow roots', 'canvas', 'form fields', 'hidden text', 'unloaded virtual content'], raster: false}}, elements};
}
export function selectionFor(el, text) {
  const s = getSelection(); if (!s || s.isCollapsed || !s.rangeCount) return null;
  const range = s.getRangeAt(0);
  if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) throw Error('Select text within one captured block');
  const quote = normalize(range.toString());
  if (!quote) return null;
  // Refuse to choose an arbitrary occurrence inside repeated text.
  const start = text.indexOf(quote);
  if (start < 0 || text.indexOf(quote, start + 1) >= 0) throw Error('This selection is ambiguous; annotate the whole block or select more context');
  return {start, end: start + quote.length};
}
