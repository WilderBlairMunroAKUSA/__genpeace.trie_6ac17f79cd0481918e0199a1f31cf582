import {build} from 'esbuild';
import {cp, mkdir, writeFile} from 'node:fs/promises';
for (const variant of ['lens', 'chorder']) {
  const out = new URL(`../dist/${variant}/`, import.meta.url);
  await mkdir(out, {recursive: true});
  await cp(new URL('../src/core', import.meta.url), new URL('core', out), {recursive:true});
  await cp(new URL('../src/ui', import.meta.url), new URL('ui', out), {recursive:true});
  await cp(new URL('../src/background.js', import.meta.url), new URL('background.js', out));
  await cp(new URL('../src/icons', import.meta.url), new URL('icons', out), {recursive:true});
  await writeFile(new URL('variant.js', out), `export const archetype = '${variant}';\n`);
  await build({entryPoints:[new URL('../src/content.js',import.meta.url).pathname],outfile:new URL('content.js',out).pathname,bundle:true,format:'iife',target:'chrome120',plugins:[{name:'variant',setup(b){b.onLoad({filter:/variant\.js$/},()=>({contents:`export const archetype = '${variant}'`,loader:'js'}));}}]});
  const manifest = {manifest_version:3,name:`𐂷 genpeace.trie · ${variant === 'lens' ? 'Lens' : 'Trychorder / Accumulator'}`,version:'0.0.1',description:'Encounter-bound peace process transparencies. Local ingestion, immutable anchors, and a trie command plane.',minimum_chrome_version:'120',permissions:[],host_permissions:['http://*/*','https://*/*'],background:{service_worker:'background.js',type:'module'},action:{default_popup:'ui/popup.html',default_title:'𐂷 genpeace.trie',default_icon:{16:'icons/16.png',32:'icons/32.png'}},icons:{16:'icons/16.png',32:'icons/32.png',48:'icons/48.png',128:'icons/128.png'},options_page:'ui/workbench.html',content_scripts:[{matches:['http://*/*','https://*/*'],js:['content.js'],run_at:'document_idle',all_frames:false}],commands:{'toggle-annotation':{suggested_key:{default:'Alt+Shift+A'},description:'Toggle annotation mode'},'open-chorder':{suggested_key:{default:'Alt+Shift+G'},description:'Open the command trie'}}};
  await writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2));
  console.log(`Built dist/${variant} (load this folder unpacked)`);
}
