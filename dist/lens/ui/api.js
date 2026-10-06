import {Repository} from '../core/repository.js';
import {seed} from './seed.js';
let local;
export async function request(type, data = {}) {
  if (globalThis.chrome?.runtime?.id) {
    const response = await chrome.runtime.sendMessage({scope: 'genpeace', type, ...data});
    if (!response?.ok) throw Error(response?.error || 'Extension unavailable');
    return response.value;
  }
  if (!local) local = Repository.open('genpeace.trie.demo').then(async repo => { await seed(repo); return repo; });
  const repo = await local;
  if (type === 'produce') return repo.produce(data.encounterId);
  if (type === 'projections') return repo.projections(data.encounterId);
  if (type === 'state') return repo.state();
  if (type === 'vantage') return repo.transform(data.operator);
  if (type === 'annotate') return repo.annotate(data.encounterId, data.index, data.selection, data.text);
  if (type === 'revise') return repo.revise(data.noteId, data.text);
  if (type === 'capture') return repo.capture(data.scan);
  if (type === 'workbench') { window.open('/ui/workbench.html'); return; }
}
export function download(name, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], {type}));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
