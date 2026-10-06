import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
const root = resolve(import.meta.dirname,'../src');
const server = http.createServer(async (req,res) => {
  const url = new URL(req.url,'http://localhost');
  if (url.pathname === '/') { res.writeHead(302,{Location:'/ui/workbench.html'}); res.end(); return; }
  const path = resolve(root, '.' + (url.pathname === '/' ? '/ui/workbench.html' : decodeURIComponent(url.pathname)));
  if (!path.startsWith(root + sep)) {res.writeHead(403);res.end();return;}
  try {const body = await readFile(path);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[extname(path)] || 'text/plain','Cache-Control':'no-store'});res.end(body);} catch {res.writeHead(404);res.end('Not found');}
});
server.listen(4317,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:4317'));
