import {archetype} from '../variant.js';
document.getElementById('variant').textContent = (archetype === 'chorder' ? 'TRYCHORDER / ACCUMULATOR' : 'LENS') + ' · MV0.1';
for (const [id, command] of [['annotate','toggle-annotation'],['chorder','open-chorder'],['capture','capture']]) {
  document.getElementById(id).addEventListener('click', async () => {
    try { const [tab] = await chrome.tabs.query({active:true,currentWindow:true}); await chrome.tabs.sendMessage(tab.id, {scope:'genpeace-control',command}); window.close(); }
    catch { document.getElementById('status').textContent = 'This page is unavailable to the extension. Try a normal HTTP(S) page, and refresh it after installation.'; }
  });
}
document.getElementById('archive').addEventListener('click', () => chrome.tabs.create({url:chrome.runtime.getURL('ui/workbench.html')}));
