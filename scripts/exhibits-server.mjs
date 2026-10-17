// Local QA server. Models GitHub Pages' repository prefix without a build step.
import { createServer } from 'node:http';
import { stat, readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const defaultRoot = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.svg':'image/svg+xml', '.wav':'audio/wav', '.png':'image/png', '.ico':'image/x-icon' };

export async function startExhibitsServer({root=defaultRoot,port=0}={}) {
  const base = resolve(root);
  const server = createServer(async (req,res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if (pathname === '/favicon.ico') { res.writeHead(204); res.end(); return; }
      if (!pathname.startsWith('/random-info-pages/')) { res.writeHead(404); res.end('Use /random-info-pages/'); return; }
      let target = resolve(base, '.' + pathname.slice('/random-info-pages'.length));
      if (target !== base && !target.startsWith(base+sep)) { res.writeHead(403); res.end(); return; }
      if ((await stat(target)).isDirectory()) target=resolve(target,'index.html');
      const body=await readFile(target);
      res.writeHead(200,{'Content-Type':types[extname(target)] || 'application/octet-stream','Cache-Control':'no-store'});
      res.end(body);
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  await new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',ok);});
  return {server,url:`http://127.0.0.1:${server.address().port}/random-info-pages/`};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await startExhibitsServer({port:Number(process.argv[2] || 4173),root:process.argv[3] || defaultRoot});
  console.log(result.url);
}
