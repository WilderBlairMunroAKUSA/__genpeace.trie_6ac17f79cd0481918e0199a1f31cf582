// Only the browser preview calls this; extension archives start empty.
export async function seed(repo) {
  if ((await repo.read('pieces')).length) return;
  const first = ['The place where a thought happened', 'A source is a place through time. An encounter is what we actually saw.', 'A transparency remembers the crossing between a passage and the person reading it.', 'The page may change. The encounter does not.', 'Learn more', 'An unchanged paragraph can move without losing its content identity.', 'Learn more'];
  const scan = text => ({url: 'https://example.org/fieldnotes/encounter', title: 'The place where a thought happened', blocks: text.map((text, i) => ({text, tag: i ? 'p' : 'h1', path: 'article:0/p:' + i, rect: {x: 80, y: 80 + i * 95, width: 650, height: 55}, lines: [{x:80,y:80+i*95,width:650,height:24}]})), viewport: {width: 1280, height: 900, dpr: 1, scrollX: 0, scrollY: 0}, extent: {width: 1280, height: 1000}, coverage: {truncated: false, raster: false}});
  const e = await repo.capture(scan(first));
  await repo.annotate(e.id, 1, null, 'Yes. Preserve this distinction: the URL is a locus; the encounter owns the evidence.');
  await repo.annotate(e.id, 3, null, 'This is the invariant I want to test when the source changes.');
  await repo.capture(scan([first[0], first[1], first[2], 'The page has changed. Our historical encounter is still here.', ...first.slice(4)]));
}
