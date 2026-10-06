import {Repository} from './core/repository.js';
import {locus, materialize} from './core/model.js';
const repository = Repository.open();
let queue = Promise.resolve();
const serialize = fn => { const next = queue.then(fn); queue = next.catch(() => {}); return next; };
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id || !message || message.scope !== 'genpeace') return;
  serialize(async () => {
    const repo = await repository;
    const privileged = sender.url?.startsWith(chrome.runtime.getURL(''));
    if (!privileged && (!sender.tab || !/^https?:/.test(sender.url || ''))) throw Error('Unsupported message origin');
    const source = !privileged ? locus(sender.url) : null;
    if (!privileged && sender.frameId !== 0) throw Error('Only top-frame encounters are supported');
    switch (message.type) {
      case 'capture': {
        if (!sender.tab || locus(message.scan.url) !== source) throw Error('Encounter source mismatch');
        return repo.capture(message.scan);
      }
      case 'state': {
        const s = await repo.state();
        if (privileged) return s;
        // Content scripts receive only their source's records, never the entire archive.
        const encounters = s.pieces.filter(p => p.kind === 'encounter' && p.body.source === source);
        return {version: s.version, pieces: encounters, events: s.events.filter(e => e.source === source || e.type === 'vantage')};
      }
      case 'annotate': {
        const e = (await repo.read('pieces')).find(p => p.id === message.encounterId);
        if (!e || (!privileged && e.body.source !== source)) throw Error('Annotation source mismatch');
        return repo.annotate(message.encounterId, message.index, message.selection, message.text);
      }
      case 'revise': {
        const note = materialize(await repo.read('events')).find(n => n.noteId === message.noteId);
        if (!note || (!privileged && note.source !== source)) throw Error('Note source mismatch');
        return repo.revise(message.noteId, message.text);
      }
      case 'projections': {
        const e = (await repo.read('pieces')).find(p => p.id === message.encounterId);
        if (!e || (!privileged && e.body.source !== source)) throw Error('Encounter source mismatch');
        return repo.projections(message.encounterId);
      }
      case 'produce': {
        if (!privileged) throw Error('Recipes are produced in the archive');
        return repo.produce(message.encounterId);
      }
      case 'vantage': return repo.transform(message.operator);
      case 'workbench': return chrome.tabs.create({url: chrome.runtime.getURL('ui/workbench.html')});
      default: throw Error('Unknown request');
    }
  }).then(value => reply({ok: true, value}), error => reply({ok: false, error: error.message}));
  return true;
});
chrome.commands.onCommand.addListener(async command => {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (!tab?.id) return;
  try { await chrome.tabs.sendMessage(tab.id, {scope: 'genpeace-control', command}); }
  catch { await chrome.action.setBadgeText({tabId: tab.id, text: '!'}); }
});
