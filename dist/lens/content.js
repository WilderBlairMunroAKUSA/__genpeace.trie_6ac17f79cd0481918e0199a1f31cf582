(() => {
  // src/core/model.js
  var normalize = (text) => text.replace(/\s+/gu, " ").trim();
  function locus(url) {
    const u = new URL(url);
    u.hash = "";
    return u.href;
  }
  var frame0 = Object.freeze({ O: "PieceSpace", X: "PieceProcess", I: "PieceBrain" });
  function reconcile(anchor, encounter) {
    const nodes = encounter.body.nodes;
    if (anchor.encounterId === encounter.id) return { status: "historical", index: anchor.occurrence, evidence: ["same encounter"] };
    let exact = nodes.filter((n) => n.contentId === anchor.contentId);
    if (exact.length === 1) return { status: "exact-content", index: exact[0].occurrence, evidence: ["unique content hash; occurrence identity is inferred"] };
    if (exact.length > 1) {
      const context = exact.filter((n) => (anchor.before !== null || anchor.after !== null) && n.before === anchor.before && n.after === anchor.after);
      if (context.length === 1) return { status: "context-match", index: context[0].occurrence, evidence: ["content hash", "both neighboring hashes"] };
      return { status: "ambiguous", candidates: exact.map((n) => n.occurrence), evidence: ["duplicate content; insufficient context"] };
    }
    const candidates = [];
    for (const n of nodes) {
      let from = 0, at;
      while ((at = n.text.indexOf(anchor.quote, from)) !== -1 && anchor.quote) {
        const prefix = n.text.slice(Math.max(0, at - anchor.prefix.length), at);
        const suffix = n.text.slice(at + anchor.quote.length, at + anchor.quote.length + anchor.suffix.length);
        if (prefix === anchor.prefix && suffix === anchor.suffix) candidates.push({ index: n.occurrence, start: at });
        from = at + 1;
      }
    }
    if (candidates.length === 1) return { status: "quote-candidate", ...candidates[0], evidence: ["quote and context only; requires explicit acceptance"] };
    return { status: candidates.length ? "ambiguous" : "unresolved", candidates: candidates.map((c) => c.index), evidence: ["no unique exact content match"] };
  }
  function materialize(events) {
    const notes = /* @__PURE__ */ new Map();
    for (const e of events) {
      if (e.type === "annotate") notes.set(e.noteId, { ...e, deleted: false });
      if (e.type === "revise" && notes.has(e.noteId)) notes.set(e.noteId, { ...notes.get(e.noteId), text: e.text, crossingId: e.crossingId, updatedAt: e.at });
      if (e.type === "visibility" && notes.has(e.noteId)) notes.get(e.noteId).deleted = e.deleted;
    }
    return [...notes.values()].filter((n) => !n.deleted);
  }
  function compile(encounters, events) {
    const byId = new Map(encounters.map((e) => [e.id, e]));
    const notes = materialize(events);
    return ["# \u{100B7} genpeace.trie \u2014 peace process transparency", "", ...notes.flatMap((n) => {
      const e = byId.get(n.anchor.encounterId);
      return [`## ${e?.body.title || "Encounter"}`, `Source: ${e?.body.source || "(missing)"}`, `Encounter: ${n.anchor.encounterId}`, `Captured: ${e?.body.capturedAt || ""}`, "", ...n.anchor.quote.split("\n").map((l) => "> " + l), "", n.text, ""];
    })].join("\n");
  }

  // src/core/dom.js
  var OMIT = 'script,style,noscript,template,input,textarea,select,[contenteditable]:not([contenteditable="false"]),[data-genpeace-root],svg,canvas';
  function pathOf(el) {
    const path = [];
    while (el && el !== document.body) {
      const parent = el.parentElement;
      if (!parent) break;
      path.unshift(`${el.tagName.toLowerCase()}:${[...parent.children].indexOf(el)}`);
      el = parent;
    }
    return path.join("/");
  }
  function rectOf(r) {
    return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height };
  }
  function textNodes(el) {
    const out = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while (node = w.nextNode()) {
      const p = node.parentElement;
      if (p?.closest(OMIT) || !node.textContent) continue;
      const style2 = getComputedStyle(p);
      if (style2.display === "none" || style2.visibility === "hidden" || !p.getClientRects().length) continue;
      out.push(node);
    }
    return out;
  }
  function ownerOf(node) {
    const parent = node.parentElement;
    let el = parent;
    while (el !== document.body && !/^(block|list-item|table-cell|flex|grid)$/.test(getComputedStyle(el).display)) el = el.parentElement;
    if (el.matches("main,body,article,section") && parent !== el) {
      let inline = parent;
      while (inline.parentElement !== el) inline = inline.parentElement;
      return inline;
    }
    return el;
  }
  function ownTextNodes(el) {
    return textNodes(el).filter((n) => ownerOf(n) === el);
  }
  function readBlock(el) {
    return normalize(ownTextNodes(el).map((n) => n.textContent).join(""));
  }
  function scanDocument() {
    const groups = /* @__PURE__ */ new Map(), w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node, total = 0, walked = 0, truncated = false;
    while (node = w.nextNode()) {
      if (++walked > 2e4) {
        truncated = true;
        break;
      }
      if (!normalize(node.textContent)) continue;
      const p = node.parentElement;
      if (!p || p.closest(OMIT)) continue;
      const el = ownerOf(node);
      if (groups.has(el)) continue;
      const style2 = getComputedStyle(el);
      if (style2.visibility === "hidden" || style2.display === "none" || !el.getClientRects().length) continue;
      const text = readBlock(el);
      if (!text) continue;
      if (groups.size >= 1200 || text.length > 1e5 || total + text.length > 1e6) {
        truncated = true;
        continue;
      }
      total += text.length;
      groups.set(el, text);
    }
    const elements2 = [...groups.keys()];
    const blocks = elements2.map((el) => {
      const lines = [];
      for (const n of ownTextNodes(el)) {
        const r = document.createRange();
        r.selectNodeContents(n);
        for (const rect of r.getClientRects()) {
          if (lines.length >= 512) break;
          if (rect.width && rect.height) lines.push(rectOf(rect));
        }
      }
      return { text: groups.get(el), tag: el.tagName.toLowerCase(), path: pathOf(el), rect: rectOf(el.getBoundingClientRect()), lines };
    });
    return { scan: { url: location.href, title: document.title, blocks, viewport: { width: innerWidth, height: innerHeight, scrollX, scrollY, dpr: devicePixelRatio }, extent: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }, coverage: { truncated, blocks: blocks.length, characters: total, excludes: ["frames", "shadow roots", "canvas", "form fields", "hidden text", "unloaded virtual content"], raster: false } }, elements: elements2 };
  }
  function selectionFor(el, text) {
    const s = getSelection();
    if (!s || s.isCollapsed || !s.rangeCount) return null;
    const range = s.getRangeAt(0);
    if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) throw Error("Select text within one captured block");
    const quote = normalize(range.toString());
    if (!quote) return null;
    const start = text.indexOf(quote);
    if (start < 0 || text.indexOf(quote, start + 1) >= 0) throw Error("This selection is ambiguous; annotate the whole block or select more context");
    return { start, end: start + quote.length };
  }

  // src/core/trie.js
  var chord = (keys) => [...new Set(keys.map((k) => k.toLowerCase()))].sort().join("+");
  var Trie = class {
    constructor() {
      this.root = { children: /* @__PURE__ */ new Map(), value: null };
    }
    insert(path, value) {
      let node = this.root;
      for (const token of path) {
        if (!node.children.has(token)) node.children.set(token, { children: /* @__PURE__ */ new Map(), value: null });
        node = node.children.get(token);
      }
      if (node.value !== null) throw Error("Duplicate trie address: " + path.join(" / "));
      node.value = value;
      return this;
    }
    at(path) {
      let n = this.root;
      for (const token of path) {
        n = n.children.get(token);
        if (!n) return null;
      }
      return n;
    }
    next(path = []) {
      return [...this.at(path)?.children || []].map(([token, n]) => ({ token, value: n.value, branch: n.children.size > 0 }));
    }
  };
  var commands = [
    { path: ["s", "c"], id: "scan", label: "Capture encounter", group: "Space" },
    { path: ["s", "m"], id: "map", label: "Cartograph", group: "Space" },
    { path: ["p", "a"], id: "annotate", label: "Point & annotate", group: "Process" },
    { path: ["p", "e"], id: "export", label: "Compile transparency", group: "Process" },
    { path: ["b", "i"], id: "inspect", label: "Inspect kernel", group: "Brain" },
    { path: ["b", "s"], id: "sigma", label: "\u03C3 \xB7 exchange O / I", group: "Brain" },
    { path: ["b", "r"], id: "rho", label: "\u03C1 \xB7 rotate vantage", group: "Brain" },
    { path: [chord(["s", "p"])], id: "annotate", label: "Space + Process \u2192 annotate", group: "Chord" }
  ];
  function commandTrie() {
    const t = new Trie();
    commands.forEach((c) => t.insert(c.path, c));
    return t;
  }
  var ChordSession = class {
    constructor(trie = commandTrie()) {
      this.trie = trie;
      this.reset();
    }
    reset() {
      this.path = [];
      this.held = /* @__PURE__ */ new Set();
      this.stroke = /* @__PURE__ */ new Set();
    }
    down(key) {
      this.held.add(key.toLowerCase());
      this.stroke.add(key.toLowerCase());
    }
    up(key) {
      this.held.delete(key.toLowerCase());
      if (this.held.size || !this.stroke.size) return { pending: true };
      const token = chord([...this.stroke]);
      this.stroke.clear();
      const path = [...this.path, token], node = this.trie.at(path);
      if (!node) {
        this.path = [];
        return { invalid: token };
      }
      this.path = path;
      if (node.value && !node.children.size) {
        const command = node.value;
        this.reset();
        return { command };
      }
      return { path, next: this.trie.next(path) };
    }
  };

  // src/variant.js
  var archetype = "lens";

  // src/content.js
  var send = async (type, data = {}) => {
    const response = await chrome.runtime.sendMessage({ scope: "genpeace", type, ...data });
    if (!response?.ok) throw Error(response?.error || "Extension unavailable; reload this page");
    return response.value;
  };
  var host = document.createElement("div");
  host.dataset.genpeaceRoot = "true";
  host.style.cssText = "all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647";
  var shadow = host.attachShadow({ mode: "open" });
  var style = document.createElement("style");
  style.textContent = `
:host{color-scheme:dark}*{box-sizing:border-box}button,textarea{font:inherit}button{cursor:pointer;color:#dfe9e4;background:#23362f;border:1px solid #496252;border-radius:6px;padding:5px 10px}button:hover,button.on{background:#46634b}button:focus-visible,textarea:focus-visible{outline:2px solid #d5f18f;outline-offset:2px}button:disabled{opacity:.45;cursor:wait}.bar{position:fixed;top:0;left:0;right:0;height:38px;background:#13251ff5;box-shadow:0 2px 9px #0004;color:#dfe9e4;display:flex;gap:7px;align-items:center;padding:4px 12px;font:12px system-ui;pointer-events:auto}.brand{font-weight:700;letter-spacing:.04em;margin-right:8px}.mark{font-size:25px;color:#d5f18f}.status{margin-left:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:34vw;color:#b9cbbd}.outline{position:fixed;border:2px solid #d5f18f;background:#d5f18f18;pointer-events:none;border-radius:4px;display:none}.note{position:fixed;pointer-events:auto;background:#fff0f7;color:#792449;border:1px solid #e8a4c7;border-left:4px solid #dc5c9e;padding:6px 9px;border-radius:5px;font:12px/1.4 system-ui;width:240px;max-height:100px;overflow:auto;white-space:pre-wrap;box-shadow:0 2px 8px #0002;text-align:left}.editor,.drawer{position:fixed;pointer-events:auto;background:#15281f;color:#edf2e7;border:1px solid #6c8066;border-radius:10px;box-shadow:0 18px 60px #0006;padding:18px;font:14px/1.5 system-ui}.editor{width:min(430px,95vw);right:18px;top:55px}.editor textarea,.drawer textarea{display:block;width:100%;min-height:130px;background:#f8faf2;color:#20362a;border:0;border-radius:5px;padding:10px;margin:12px 0;resize:vertical}.editor blockquote{max-height:90px;overflow:auto;margin:10px 0;color:#c4d4c5;font-size:12px}.drawer{right:18px;top:55px;width:min(510px,95vw);max-height:80vh;overflow:auto}.drawer h2{margin:0 0 12px;font:22px Georgia}.drawer p{color:#c4d4c5}.drawer button{margin:4px}.row{display:flex;align-items:center;justify-content:space-between;gap:10px}.hint{font-size:12px;color:#bdd09f}.mapitem{display:block;width:100%;text-align:left;font-size:12px;margin:5px 0!important}.danger{color:#ffbfbc}.hidden{display:none!important}
@media(max-width:650px){.bar{gap:3px;padding:3px}.brand{display:none}.status{max-width:100px}.bar button{padding:5px}.note{width:170px}}
`;
  shadow.append(style);
  var bar = document.createElement("div");
  bar.className = "bar";
  shadow.append(bar);
  var make = (tag, text, parent, cls) => {
    const e = document.createElement(tag);
    if (text !== void 0) e.textContent = text;
    if (cls) e.className = cls;
    parent?.append(e);
    return e;
  };
  var button = (text, parent, fn, title = text) => {
    const b = make("button", text, parent);
    b.title = title;
    b.addEventListener("click", () => Promise.resolve().then(fn).catch(fail));
    return b;
  };
  make("span", "\u{100B7}", bar, "mark");
  make("span", "genpeace.trie", bar, "brand");
  var modeButton = button("Annotate", bar, () => run("annotate"));
  button("PS \xB7 Map", bar, () => run("map"));
  button("PB \xB7 Inspect", bar, () => run("inspect"));
  button("PP \xB7 Export", bar, () => run("export"));
  button("\u2318 Trie", bar, showChorder);
  button("\u21BB", bar, () => capture(true), "Capture another encounter");
  var status = make("span", "Ingesting encounter\u2026", bar, "status");
  button("\u2212", bar, () => {
    const collapsed = bar.classList.toggle("collapsed");
    [...bar.children].forEach((el, i) => {
      if (i > 1 && el !== bar.lastElementChild) el.classList.toggle("hidden", collapsed);
    });
    bar.lastElementChild.textContent = collapsed ? "+" : "\u2212";
  }, "Collapse toolbar");
  var outline = make("div", "", shadow, "outline");
  document.documentElement.append(host);
  var current = null;
  var elements = [];
  var state = { pieces: [], events: [] };
  var inspecting = false;
  var hovered = null;
  var editor = null;
  var drawer = null;
  var capturing = false;
  var dirty = false;
  var previousSignature = "";
  var busyTimer;
  var frame = frame0;
  var projectionElements = [];
  function fail(e) {
    status.textContent = e.message || String(e);
    status.title = status.textContent;
    status.classList.add("danger");
  }
  function tell(text) {
    status.textContent = text;
    status.title = text;
    status.classList.remove("danger");
  }
  async function refresh() {
    if (current) await send("projections", { encounterId: current.id });
    state = await send("state");
    frame = state.events.findLast((e) => e.type === "vantage")?.frame || frame0;
    return renderNotes();
  }
  async function capture(force = false) {
    if (capturing) {
      dirty = true;
      return;
    }
    if (editor && !force) {
      dirty = true;
      return;
    }
    capturing = true;
    try {
      const scanned = scanDocument();
      const signature = JSON.stringify([locus(scanned.scan.url), scanned.scan.blocks.map((b) => [b.path, b.text])]);
      if (!force && signature === previousSignature) {
        elements = scanned.elements;
        renderNotes();
        return;
      }
      tell("Preserving encounter\u2026");
      current = await send("capture", { scan: scanned.scan });
      elements = scanned.elements;
      previousSignature = signature;
      const unresolved = await refresh();
      tell(`${current.body.nodes.length} blocks \xB7 ${materialize(state.events).length} notes${unresolved ? ` \xB7 ${unresolved} historical / unprojected` : ""}${current.body.coverage.truncated ? " \xB7 partial capture" : ""}`);
    } catch (e) {
      fail(e);
    } finally {
      capturing = false;
      if (dirty && !editor) {
        dirty = false;
        schedule();
      }
    }
  }
  function schedule() {
    clearTimeout(busyTimer);
    busyTimer = setTimeout(() => capture(), 1e3);
  }
  function belongs(event) {
    return event.composedPath().includes(host);
  }
  function locate(target) {
    const matches = elements.map((el, i) => ({ el, i })).filter(({ el }) => el.isConnected && (el === target || el.contains(target)));
    return matches.sort((a, b) => a.el.contains(b.el) ? 1 : -1)[0];
  }
  function placeOutline(el) {
    const r = el.getBoundingClientRect();
    Object.assign(outline.style, { display: "block", left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
  }
  document.addEventListener("pointermove", (e) => {
    if (!inspecting || editor || belongs(e)) return;
    hovered = locate(e.target);
    if (hovered) placeOutline(hovered.el);
    else outline.style.display = "none";
  }, true);
  document.addEventListener("click", (e) => {
    if (!inspecting || editor || belongs(e)) return;
    const found = locate(e.target);
    if (!found) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    try {
      openEditor(found);
    } catch (error) {
      fail(error);
    }
  }, true);
  function closeEditor() {
    editor?.remove();
    editor = null;
    if (dirty) {
      dirty = false;
      schedule();
    }
  }
  function openEditor(target, note = null) {
    if (!current) throw Error("Wait for the first encounter");
    let selection = null;
    if (!note) {
      if (readBlock(target.el) !== current.body.nodes[target.i].text) {
        capture(true);
        throw Error("Page changed; capturing it now. Select the target again.");
      }
      selection = selectionFor(target.el, current.body.nodes[target.i].text);
    }
    closeDrawer();
    closeEditor();
    outline.style.display = "none";
    const encounterId = current.id, index = target?.i;
    editor = make("section", void 0, shadow, "editor");
    editor.setAttribute("role", "dialog");
    editor.setAttribute("aria-label", "Peace process annotation");
    make("strong", note ? "Revise transparency" : "A thought at this coordinate", editor);
    const quote = note?.anchor.quote || (selection ? current.body.nodes[index].text.slice(selection.start, selection.end) : current.body.nodes[index].text);
    make("blockquote", quote, editor);
    const input = make("textarea", void 0, editor);
    input.placeholder = "What do you see from here?";
    input.setAttribute("aria-label", "Annotation");
    input.maxLength = 2e4;
    input.value = note?.text || "";
    const row = make("div", void 0, editor, "row");
    make("span", "\u2318 / Ctrl + Enter to preserve", row, "hint");
    const save = async () => {
      saveButton.disabled = true;
      try {
        if (note) await send("revise", { noteId: note.noteId, text: input.value });
        else await send("annotate", { encounterId, index, selection, text: input.value });
        closeEditor();
        await refresh();
        tell("Transparency preserved");
      } catch (e) {
        saveButton.disabled = false;
        fail(e);
      }
    };
    const saveButton = button("Preserve", row, save);
    button("Cancel", row, closeEditor);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        save();
      }
      if (e.key === "Escape") closeEditor();
    });
    input.focus();
  }
  function renderNotes() {
    projectionElements.splice(0).forEach((p) => p.node.remove());
    if (!current) return;
    let unresolved = 0;
    for (const note of materialize(state.events)) {
      const match = reconcile(note.anchor, current);
      if (!["historical", "exact-content", "context-match"].includes(match.status)) {
        unresolved++;
        continue;
      }
      const el = elements[match.index];
      if (!el?.isConnected || readBlock(el) !== current.body.nodes[match.index].text) {
        unresolved++;
        continue;
      }
      const n = button(note.text, shadow, () => openEditor({ el, i: match.index }, note), `${match.status} \xB7 click to revise`);
      n.className = "note";
      projectionElements.push({ node: n, el });
    }
    layout();
    if (unresolved) tell(`${unresolved} historical notes need reconciliation \xB7 inspect archive`);
    return unresolved;
  }
  function layout() {
    let occupied = [];
    for (const { node, el } of projectionElements) {
      const r = el.getBoundingClientRect();
      if (r.bottom < 38 || r.top > innerHeight) {
        node.style.display = "none";
        continue;
      }
      node.style.display = "block";
      const width = innerWidth <= 650 ? 170 : 240;
      const left = Math.max(5, Math.min(innerWidth - width - 10, r.right + 12));
      let top = Math.max(42, r.top);
      for (const other of occupied) {
        if (Math.abs(other.left - left) < width && top < other.bottom && top + node.offsetHeight > other.top) top = other.bottom + 5;
      }
      Object.assign(node.style, { left: left + "px", top: top + "px" });
      occupied.push({ left, top, bottom: top + node.offsetHeight });
    }
    if (hovered && inspecting && !editor) placeOutline(hovered.el);
  }
  var layoutFrame;
  function requestLayout() {
    cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(layout);
  }
  addEventListener("scroll", requestLayout, true);
  addEventListener("resize", requestLayout);
  function closeDrawer() {
    drawer?.remove();
    drawer = null;
    chording = false;
    chordSession.reset();
  }
  function openDrawer(title) {
    closeDrawer();
    drawer = make("section", void 0, shadow, "drawer");
    const row = make("div", void 0, drawer, "row");
    make("h2", title, row);
    button("Close", row, closeDrawer);
    return drawer;
  }
  async function run(id) {
    if (id === "annotate") {
      inspecting = !inspecting;
      modeButton.classList.toggle("on", inspecting);
      outline.style.display = "none";
      tell(inspecting ? "Select text or point at a block, then click" : "Annotation mode off");
      closeDrawer();
    }
    if (id === "scan") await capture(true);
    if (id === "inspect") await send("workbench");
    if (id === "sigma" || id === "rho") {
      frame = await send("vantage", { operator: id });
      tell(`O:${frame.O} \xB7 X:${frame.X} \xB7 I:${frame.I}`);
    }
    if (id === "map") {
      if (!current) return;
      const d = openDrawer("PieceSpace \xB7 cartograph");
      make("p", `${current.body.nodes.length} text blocks. Geometry is an encounter record; click to visit its current element.`, d);
      current.body.nodes.forEach((n, i) => button(`${String(i).padStart(3, "0")} \xB7 ${n.tag} \xB7 ${n.text.slice(0, 85)}`, d, () => {
        elements[i]?.scrollIntoView({ block: "center", behavior: "smooth" });
        if (elements[i]) placeOutline(elements[i]);
      }, "Go to block").className = "mapitem");
    }
    if (id === "export") {
      await refresh();
      const d = openDrawer("Compile transparency");
      make("p", "Historical quotes + your notes, ready to paste into a conversation.", d);
      const t = make("textarea", void 0, d);
      t.readOnly = true;
      t.value = compile(state.pieces.filter((p) => p.kind === "encounter"), state.events);
      t.setAttribute("aria-label", "Compiled transparency");
      button("Copy Markdown", d, async () => {
        await navigator.clipboard.writeText(t.value);
        tell("Copied transparency");
      });
    }
  }
  var chording = false;
  var chordSession = new ChordSession();
  function drawChord() {
    const area = drawer?.querySelector("[data-choices]");
    if (!area) return;
    area.replaceChildren();
    make("p", chordSession.path.length ? "Path: " + chordSession.path.join(" \u2192 ") : "Choose a branch. Tap sequentially or hold S + P together.", area);
    for (const next of chordSession.trie.next(chordSession.path)) button(`${next.token.toUpperCase()} \xB7 ${next.value?.label || ({ s: "Space", p: "Process", b: "Brain" }[next.token] || "Branch")}`, area, () => advance(next.token));
    make("p", "Escape cancels \xB7 Backspace returns \xB7 keys commit when released", area, "hint");
  }
  function showChorder() {
    const d = openDrawer("Try chorder");
    chording = true;
    const choices = make("div", void 0, d);
    choices.dataset.choices = "";
    drawChord();
  }
  function advance(token) {
    const keys = token.split("+");
    keys.forEach((k) => chordSession.down(k));
    let result;
    keys.forEach((k) => {
      result = chordSession.up(k);
    });
    handleChord(result);
  }
  function handleChord(result) {
    if (result.command) {
      closeDrawer();
      run(result.command.id).catch(fail);
    } else {
      drawChord();
      if (result.invalid) tell(`No branch for ${result.invalid}; returned to root`);
    }
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !editor) {
      if (chording) closeDrawer();
      inspecting = false;
      modeButton.classList.remove("on");
      outline.style.display = "none";
      return;
    }
    const inputTarget = e.composedPath()[0];
    if (!chording || e.isComposing || e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(inputTarget.tagName) || inputTarget.isContentEditable) return;
    if (e.key === "Backspace") {
      e.preventDefault();
      chordSession.path.pop();
      drawChord();
      return;
    }
    if (!/^[a-z]$/i.test(e.key)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!e.repeat) chordSession.down(e.key);
  }, true);
  document.addEventListener("keyup", (e) => {
    if (!chording || !chordSession.held.has(e.key.toLowerCase())) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    handleChord(chordSession.up(e.key));
  }, true);
  addEventListener("blur", () => {
    chordSession.reset();
    if (chording) drawChord();
  });
  chrome.runtime.onMessage.addListener((m) => {
    if (m.scope !== "genpeace-control") return;
    if (m.command === "toggle-annotation") run("annotate");
    if (m.command === "open-chorder") showChorder();
    if (m.command === "capture") capture(true);
  });
  var observer = new MutationObserver((changes) => {
    if (changes.some((m) => m.target !== host && !host.contains(m.target))) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  setInterval(() => {
    if (!document.hidden && !editor) capture();
  }, 6e3);
  addEventListener("pageshow", () => capture());
  capture().then(() => {
    if (archetype === "chorder") {
      const d = openDrawer("Trychorder \xB7 accumulator");
      make("p", "This encounter is now part of local stock. Compose a replay recipe, send only missing pieces through a bounded channel, and reconstruct at a second accumulator.", d);
      button("Open accumulator", d, () => run("inspect"));
      button("Explore key trie", d, showChorder);
    }
  });
})();
