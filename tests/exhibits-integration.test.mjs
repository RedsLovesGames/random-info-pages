import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {startExhibitsServer} from '../scripts/exhibits-server.mjs';

const routes=['music-microscope','one-million','algorithm-arena','cryptography-museum'];
const root=new URL('../',import.meta.url);

test('four exhibits load their bundled entry assets under the GitHub Pages prefix',async t=>{
  const {server,url}=await startExhibitsServer();
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  for(const route of routes) {
    const response=await fetch(url+route+'/');
    assert.equal(response.status,200,route);
    const html=await response.text();
    assert.match(html,/<html[^>]*lang="en"/i);
    assert.match(html,/name="viewport"/);
    assert.match(html,/<h1[\s>]/);
    assert.match(html,/<script[^>]*type="module"/);
    const assets=[...html.matchAll(/(?:src|href)="([^"#]+\.(?:js|mjs|css|svg|wav))"/g)].map(m=>m[1]);
    assert.ok(assets.length>=2,`${route} script and stylesheet`);
    for(const asset of assets) {
      assert.ok(!/^(?:https?:|\/)/.test(asset),`relative bundled asset: ${asset}`);
      const r=await fetch(new URL(asset,response.url));
      assert.equal(r.status,200,`${route}/${asset}`);
      assert.ok((await r.arrayBuffer()).byteLength>0);
    }
    assert.doesNotMatch(html,/<(?:script|link)[^>]+(?:src|href)="https?:/i,'no critical CDN assets');
  }
});

test('new files deploy directly as static assets without a build',async()=>{
  for(const route of routes) {
    assert.ok((await stat(new URL(route+'/index.html',root))).isFile());
    const css=await readFile(new URL(route+'/styles.css',root),'utf8');
    assert.match(css,/@media/);
    assert.match(css,/prefers-reduced-motion/);
    assert.match(css,/:focus-visible/);
  }
});
