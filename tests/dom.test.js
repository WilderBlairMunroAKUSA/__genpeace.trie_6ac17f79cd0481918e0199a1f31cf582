import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {scanDocument, selectionFor} from '../src/core/dom.js';
function setup(html) {
  const dom = new JSDOM(html,{url:'https://example.org/fixture',pretendToBeVisual:true});
  for (const key of ['document','NodeFilter','location']) globalThis[key]=dom.window[key];
  globalThis.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);
  globalThis.getSelection=dom.window.getSelection.bind(dom.window);
  Object.assign(globalThis,{scrollX:0,scrollY:0,innerWidth:1000,innerHeight:800,devicePixelRatio:1});
  const rect={left:0,top:100,width:600,height:30};
  dom.window.Element.prototype.getClientRects=function(){return this.closest('[hidden]')?[]:[rect];};
  dom.window.Element.prototype.getBoundingClientRect=()=>rect;
  dom.window.Range.prototype.getClientRects=()=>[rect];
  return dom;
}
test('scan normalizes inline wrappers, excludes form fields, editor and extension UI',()=>{
  const d=setup('<p>Hello <span>world</span>.</p><input value="secret"><textarea>private draft</textarea><div contenteditable="true">unfinished</div><div data-genpeace-root>own toolbar</div><p hidden>hidden text</p><script>secret script</script>');
  const {scan}=scanDocument();assert.deepEqual(scan.blocks.map(b=>b.text),['Hello world.']);assert.equal(scan.coverage.raster,false);assert.equal(scan.blocks[0].lines.length,3);d.window.close();
});
test('selected phrase maps to normalized offsets; repeated quote is rejected',()=>{
  const d=setup('<p>Alpha beta gamma.</p><p>same and same</p>');let p=document.querySelector('p'),r=document.createRange();r.setStart(p.firstChild,6);r.setEnd(p.firstChild,10);getSelection().addRange(r);assert.deepEqual(selectionFor(p,'Alpha beta gamma.'),{start:6,end:10});getSelection().removeAllRanges();p=document.querySelectorAll('p')[1];r=document.createRange();r.setStart(p.firstChild,0);r.setEnd(p.firstChild,4);getSelection().addRange(r);assert.throws(()=>selectionFor(p,'same and same'),/ambiguous/);d.window.close();
});
test('capture cap is explicit, never presented as complete',()=>{
  const d=setup('<p>'+ 'x'.repeat(100001)+'</p><p>safe</p>');const {scan}=scanDocument();assert.equal(scan.coverage.truncated,true);assert.equal(scan.blocks.length,1);d.window.close();
});
test('structural containers do not duplicate all descendant paragraphs',()=>{
  const d=setup('<main><small>Label</small><h1>Heading</h1><p>First <span>paragraph</span>.</p><p>Second paragraph.</p></main>');
  assert.deepEqual(scanDocument().scan.blocks.map(b=>b.text),['Label','Heading','First paragraph.','Second paragraph.']);d.window.close();
});
