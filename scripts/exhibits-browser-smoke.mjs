// Developer-only: npm install --prefix .qa --no-save playwright
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {startExhibitsServer} from './exhibits-server.mjs';

const require=createRequire(new URL('../.qa/package.json',import.meta.url));
let automation;
try { automation=require('playwright'); } catch { automation=require('playwright-core'); }
const {chromium}=automation;
const local=process.env.EXHIBITS_BASE_URL ? null : await startExhibitsServer();
const base=process.env.EXHIBITS_BASE_URL || local.url;
const out=fileURLToPath(new URL('../.qa/',import.meta.url));
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.EXHIBITS_BROWSER_EXECUTABLE ? {executablePath:process.env.EXHIBITS_BROWSER_EXECUTABLE}: {})});
const findings=[],results=[];
const routes=(process.env.EXHIBITS_ROUTES || 'cryptography-museum,one-million,algorithm-arena,music-microscope').split(',');
try {
  for(const mobile of [false,true]) {
    const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},reducedMotion:mobile?'reduce':'no-preference',isMobile:mobile,hasTouch:mobile});
    const page=await context.newPage();
    page.on('pageerror',e=>findings.push(`${mobile?'mobile':'desktop'}: ${page.url()} ${e.message}`));
    page.on('console',m=>{if(m.type()==='error') findings.push(`${page.url()} console: ${m.text()}`);});
    page.on('response',r=>{if(r.status()>=400 && r.url().startsWith(base))findings.push(`${r.status()} ${r.url()}`);});
    for(const route of routes) {
      const start=performance.now();
      await page.goto(new URL(route+'/',base).href,{waitUntil:'networkidle'});
      await page.locator('h1').waitFor();
      await page.locator('input:not([type=hidden]),select,textarea').first().waitFor();
      const dimensions=await page.evaluate(()=>({width:innerWidth,body:document.documentElement.scrollWidth,canvas:document.querySelectorAll('canvas').length}));
      assert.ok(dimensions.body<=dimensions.width+2,`${route} at ${dimensions.width}px overflows by ${dimensions.body-dimensions.width}px`);
      const unlabelled=await page.evaluate(()=>[...document.querySelectorAll('input:not([type=hidden]),textarea,select')].filter(el=>!el.labels?.length&&!el.getAttribute('aria-label')&&!el.getAttribute('aria-labelledby')&&!['button','submit'].includes(el.type)).map(el=>el.id||el.tagName));
      assert.deepEqual(unlabelled,[],`${route} controls need labels`);
      await page.keyboard.press('Tab');
      assert.ok(await page.evaluate(()=>document.activeElement!==document.body),`${route} keyboard focus`);
      await page.evaluate(()=>document.activeElement?.blur());
      await page.screenshot({path:out+`${route}-${mobile?'mobile':'desktop'}.png`,fullPage:true});
      results.push({route,viewport:dimensions.width,loadMs:Math.round(performance.now()-start),status:'passed'});
      console.log(`PASS ${route} ${mobile?'mobile reduced-motion':'desktop'} layout, assets, labels, keyboard`);
    }
    await context.close();
  }
  assert.deepEqual(findings,[],'browser errors or failed local assets');
  await writeFile(out+'browser-layout-results.json',JSON.stringify({results,findings},null,2));
} finally {
  await browser.close();
  if(local) await new Promise(ok=>local.server.close(ok));
}
