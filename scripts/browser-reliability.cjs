/* Headless Chromium acceptance checks against the assembled static site.
 * Run from repo root with NODE_PATH pointing at an installed Playwright package.
 * No external credentials or network requests are required. */
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {pathToFileURL}=require('node:url');
const {chromium,firefox}=require('playwright');

const root=path.resolve(process.cwd(),'_site');
const port=8876;
const mime={
 '.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8',
 '.mjs':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8',
 '.json':'application/json;charset=utf-8','.svg':'image/svg+xml',
 '.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp',
 '.woff2':'font/woff2','.mid':'audio/midi'
};
const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:'+port);
  const dest=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(dest!==root&&!dest.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
  const file=fs.existsSync(dest)&&fs.statSync(dest).isDirectory()
   ?path.join(dest,'index.html'):dest;
  if(!fs.existsSync(file)){res.writeHead(404);res.end('Missing');return}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream',
   'Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
 }catch(error){res.writeHead(500);res.end(error.message)}
});
const baseUrl='http://127.0.0.1:'+port;
const wait=async(page,fn,description,timeout=18000,arg=null)=>{
 try{await page.waitForFunction(fn,arg,{timeout})}
 catch(error){throw new Error(description+': '+error.message)}
};
const check=(ok,message)=>{if(!ok)throw new Error(message)};
async function main(){
 if(!fs.existsSync(root))throw new Error('_site must be built first');
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
 const executablePath=process.env.CHROME_BINARY;
 const browser=await chromium.launch({headless:true,executablePath,
  args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader',
   '--enable-unsafe-swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:1200,height:850},
   acceptDownloads:true});
  const page=await context.newPage();
  page.setDefaultTimeout(18000);
  // Test the actual IndexedDB implementation through a real browser.
  await page.goto(baseUrl+'/tests/browser-reliability.html');
  await page.locator('#run-checks').click();
  await wait(page,()=>document.querySelector('#results')?.textContent.includes('ALL 6 CHECKS PASSED'),
   'Browser module checks');
  console.log('PASS browser module checks (6/6)');
  await page.locator('#save-probe').click();
  await wait(page,()=>document.querySelector('#results')?.textContent.includes('SAVED:'),
   'Browser probe save');
  await page.reload();
  await page.locator('#verify-probe').click();
  await wait(page,()=>document.querySelector('#results')?.textContent.includes('PASS: Browser persisted'),
   'IndexedDB persisted across reload');
  console.log('PASS IndexedDB persistence across a full reload');
  // Exercise the real Marble Sequencer UI with a MIDI file.
  const {buildMidiWorkspace,exportMultitrackMidi}=await import(
   pathToFileURL(path.join(process.cwd(),'marble-sequencer/midi-workspace.mjs')));
  const midi=buildMidiWorkspace({name:'Headless MIDI recovery',
   events:[{time:0,duration:.5,note:60,velocity:.8,channel:0,
    program:11,track:0}],muted:[],
   timing:{ppq:480,changes:[{tick:0,us:500000},{tick:480,us:700000}]}});
  const bytes=exportMultitrackMidi(midi);
  await page.goto(baseUrl+'/marble-sequencer/');
  await page.locator('#file-input').setInputFiles({
    name:'browser-recovery.mid',mimeType:'audio/midi',buffer:Buffer.from(bytes)
  });
  await wait(page,()=>document.querySelector('#midi-workspace')?.hidden===false,
    'MIDI workspace imported');
  await wait(page,()=>document.querySelector('#midi-autosave-status')?.textContent.includes('stored locally at'),
    'MIDI project autosaved in IndexedDB',25000);
  await page.reload();
  await wait(page,()=>document.querySelector('#midi-recovery')?.hidden===false,
   'MIDI recovery prompt after reload');
  await page.locator('#midi-restore-draft').click();
  await wait(page,()=>document.querySelector('#midi-workspace')?.hidden===false &&
   document.querySelector('#midi-track-count')?.textContent.includes('1 notes'),
   'MIDI restored into the editor');
  console.log('PASS MIDI file import, autosave, page reload, and restore controls');
  check(await page.locator('#midi-revision option').count()>=1,
   'Recovered MIDI version must appear in the revision selector');
  const alternate=buildMidiWorkspace({...midi,name:'Second MIDI project',
   events:[{...midi.events[0],note:67}]});
  await page.locator('#file-input').setInputFiles({
   name:'second-browser-song.mid',mimeType:'audio/midi',
   buffer:Buffer.from(exportMultitrackMidi(alternate))
  });
  await wait(page,()=>document.querySelectorAll('#midi-revision option').length>=3,
   'Importing another MIDI song retained the previous recoveries',25000);
  const before=await page.locator('#midi-revision option').count();
  await page.locator('#midi-checkpoint').click();
  await wait(page,count=>document.querySelectorAll('#midi-revision option').length>count,
   'Manual MIDI checkpoint created a new revision',18000,before);
  await page.locator('#midi-revision').selectOption({index:1});
  const [download]=await Promise.all([
   page.waitForEvent('download'),page.locator('#midi-export-draft').click()
  ]);
  check(download.suggestedFilename().endsWith('.json'),
   'Selected MIDI recovery version did not export JSON');
  const beforeDelete=await page.locator('#midi-revision option').count();
  await page.locator('#midi-discard-draft').click();
  await wait(page,expected=>document.querySelectorAll('#midi-revision option').length===expected,
   'Deleting one recovery revision must preserve the others',16000,beforeDelete-1);
  console.log('PASS multiple MIDI recovery versions, manual checkpoint, JSON export and targeted deletion');
  // Mobile viewport checks use actual touch-capable Chromium, not CSS-only inspection.
  const mobileContext=await browser.newContext({
   viewport:{width:390,height:844},isMobile:true,hasTouch:true,
   deviceScaleFactor:2,acceptDownloads:true
  });
  try{
   const mobile=await mobileContext.newPage();
   await mobile.goto(baseUrl+'/marble-sequencer/');
   await mobile.locator('#file-input').setInputFiles({
    name:'mobile-recovery.mid',mimeType:'audio/midi',buffer:Buffer.from(bytes)
   });
   await wait(mobile,()=>document.querySelector('#midi-autosave-status')?.textContent.includes('stored locally at'),
    'Mobile MIDI import and autosave',25000);
   const recovery=mobile.locator('#midi-recovery');
   await recovery.scrollIntoViewIfNeeded();
   const bounds=await recovery.boundingBox();
   check(bounds&&bounds.x>=-2&&bounds.x+bounds.width<=392,
    'Mobile recovery history exceeds 390px viewport');
   await mobile.locator('#midi-checkpoint').tap();
   await wait(mobile,()=>document.querySelectorAll('#midi-revision option').length>=2,
    'Touch checkpoint adds a revision on a mobile viewport');
   console.log('PASS mobile 390px touch recovery controls and fit');
  }finally{await mobileContext.close()}
  // Compare Lab should restore recorded historical trials, not only its baseline.
  await page.goto(baseUrl+'/compare/?left=fluid-dynamics&right=fluid-dynamics');
  await wait(page,()=>{
   const left=document.querySelector('#left-frame')?.contentWindow?.RIPStudio;
   const right=document.querySelector('#right-frame')?.contentWindow?.RIPStudio;
   return Boolean(left?.getState&&right?.getState&&left?.setState&&right?.setState)
  },'Both embedded Fluid Dynamics editors ready',35000);
  const states=await page.evaluate(async()=>{
   const left=document.querySelector('#left-frame').contentWindow.RIPStudio;
   const right=document.querySelector('#right-frame').contentWindow.RIPStudio;
   return {left:await left.getState(),right:await right.getState()};
  });
  const notebook={format:'rip-compare-notebook-v1',
   baseline:{format:'rip-compare-scenario-v1',left:'fluid-dynamics',
    right:'fluid-dynamics',duration:10,states},
   trials:[{index:1,mode:'fixed-step',steps:30,requestedSeconds:null,
    startedAt:'2026-11-24T00:00:00.000Z',endedAt:'2026-11-24T00:00:01.000Z',
    elapsedMs:1000,
    before:{left:{simulatedSteps:0},right:{simulatedSteps:0}},
    after:{left:{simulatedSteps:30,stateHash:'fixture'},
     right:{simulatedSteps:30,stateHash:'fixture'}}}]};
  await page.locator('#trial-file').setInputFiles({
   name:'browser-notebook.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(notebook))
  });
  await wait(page,()=>document.querySelector('#trial-summary')?.textContent.includes('1 trial(s) recorded'),
   'Historical trial was restored into Compare Lab',35000);
  check(await page.locator('#export-trials').isEnabled(),
   'JSON notebook export must remain enabled');
  check(await page.locator('#export-trials-csv').isEnabled(),
   'CSV export must remain enabled');
  console.log('PASS Compare Lab notebook baseline and history UI restoration');
 }finally{await browser.close()}
 // Independent Firefox verification catches engine-specific IndexedDB and module issues.
 const firefoxBrowser=await firefox.launch({headless:true});
 try{
  const firefoxPage=await firefoxBrowser.newPage({viewport:{width:1000,height:750}});
  await firefoxPage.goto(baseUrl+'/tests/browser-reliability.html');
  await firefoxPage.locator('#run-checks').click();
  await wait(firefoxPage,()=>document.querySelector('#results')?.textContent.includes('ALL 6 CHECKS PASSED'),
   'Firefox browser module and versioned recovery checks',25000);
  await firefoxPage.locator('#save-probe').click();
  await wait(firefoxPage,()=>document.querySelector('#results')?.textContent.includes('SAVED:'),
   'Firefox revision save');
  await firefoxPage.reload();
  await firefoxPage.locator('#verify-probe').click();
  await wait(firefoxPage,()=>document.querySelector('#results')?.textContent.includes('PASS: Browser persisted'),
   'Firefox IndexedDB recovery after reload',25000);
  console.log('PASS Firefox six module checks and reload persistence');
 }finally{await firefoxBrowser.close()}
 console.log('All Chromium desktop, Chromium mobile, and Firefox acceptance checks passed');
}
main().then(()=>server.close()).catch(error=>{
 console.error('BROWSER ACCEPTANCE FAILURE:',error.stack||error);
 process.exitCode=1;server.close();
});
