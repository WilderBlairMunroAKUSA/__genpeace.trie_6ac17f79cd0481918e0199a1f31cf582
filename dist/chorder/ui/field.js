import {request} from './api.js';
import {locus} from '../core/model.js';
document.getElementById('mutate').addEventListener('click', () => { document.getElementById('passage').textContent = 'The source has changed. Our earlier encounter still records what was here.'; });
if (!globalThis.chrome?.runtime?.id) {
  globalThis.chrome = {runtime: {onMessage:{addListener(){}}, async sendMessage(m) {
    try {
      let value = await request(m.type,m);
      if (m.type === 'state') value = {...value,pieces:value.pieces.filter(p=>p.kind==='encounter'&&p.body.source===locus(location.href)),events:value.events.filter(e=>e.source===locus(location.href)||e.type==='vantage')};
      return {ok:true,value};
    } catch(e) {return {ok:false,error:e.message};}
  }}};
  await import('../content.js');
}
