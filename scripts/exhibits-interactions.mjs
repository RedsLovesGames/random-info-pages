// Real-browser workflows. Developer-only dependency: Playwright or Playwright Core.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {startExhibitsServer} from './exhibits-server.mjs';
const require=createRequire(new URL('../.qa/package.json',import.meta.url));
let automation;try{automation=require('playwright');}catch{automation=require('playwright-core');}
const local=process.env.EXHIBITS_BASE_URL?null:await startExhibitsServer();
const base=process.env.EXHIBITS_BASE_URL||local.url;
const browser=await automation.chromium.launch({headless:true,...(process.env.EXHIBITS_BROWSER_EXECUTABLE?{executablePath:process.env.EXHIBITS_BROWSER_EXECUTABLE}:{})});
const errors=[];
const selected=(process.env.EXHIBITS_ROUTES||'cryptography-museum,one-million,algorithm-arena,music-microscope').split(',');
const page=await browser.newPage();
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))errors.push(`${r.status()} ${r.url()}`);});
const cases={};

cases['cryptography-museum']=async()=>{
  await page.goto(new URL('cryptography-museum/',base).href);
  await page.locator('#shift').waitFor();
  await page.locator('#plain').fill('ABC');
  await page.waitForFunction(()=>document.getElementById('output').textContent==='DEF');
  await page.locator('#direction').selectOption('decrypt');
  await page.waitForFunction(()=>document.getElementById('output').textContent==='XYZ');
  await page.locator('#answer').fill('MEET AT DAWN');await page.locator('#check').click();
  assert.match(await page.locator('#challenge-status').textContent(),/Correct/);
  await page.locator('#stamp').click();await page.reload();
  assert.match(await page.locator('#progress-count').textContent(),/1 \/ 7/);
  assert.match(await page.locator('#challenge-progress').textContent(),/1 \/ 3/);
  await page.locator('nav a[href="#substitution"]').click();
  await page.locator('#alphabet').fill('AAAAAAAAAAAAAAAAAAAAAAAAAA');
  await page.waitForFunction(()=>document.getElementById('status').textContent.toLowerCase().includes('unique'));
  await page.locator('#alphabet').fill('QWERTYUIOPASDFGHJKLZXCVBNM');
  await page.locator('#plain').fill('HELLO');
  await page.waitForFunction(()=>document.getElementById('output').textContent==='ITSSG');
  await page.locator('nav a[href="#vigenere"]').click();await page.locator('#plain').fill('ATTACK');
  await page.waitForFunction(()=>document.getElementById('output').textContent==='LXFOPV');
  await page.locator('nav a[href="#enigma"]').click();await page.locator('#standard').click();
  await page.waitForFunction(()=>document.getElementById('output').textContent==='BDZGO');
  await page.locator('#historical').click();await page.waitForFunction(()=>document.getElementById('output').textContent==='NIBLFMYMLLUFWCASCSSNVHAZ');
  await page.locator('#positions').fill('WXC');await page.locator('#plain').fill('BLA');await page.waitForFunction(()=>document.getElementById('output').textContent==='KCH');
  await page.locator('#double').click();await page.locator('#next').click();await page.locator('#next').click();
  assert.match(await page.locator('#stepping').textContent(),/AEW.*BFX/);
  const enigmaHash=new URL(page.url()).hash;
  await page.locator('.skip').focus();await page.keyboard.press('Enter');
  assert.equal(new URL(page.url()).hash,enigmaHash,'skip link retains current gallery');
  assert.match(await page.locator('#exhibit h2').textContent(),/Enigma/);
  await page.locator('nav a[href="#hashing"]').click();
  await page.locator('#input-a').fill('abc');await page.locator('#input-b').fill('abd');await page.locator('#compare').click();
  await page.waitForFunction(()=>document.getElementById('hash-a').textContent.replace(/\s/g,'').includes('ba7816bf'));
  await page.locator('nav a[href="#modern"]').click();await page.locator('#passphrase').fill('A long local test passphrase');await page.locator('#modern-plain').fill('Browser round trip 🌙');await page.locator('#encrypt').click();
  await page.waitForFunction(()=>document.getElementById('envelope').value.includes('AES-256-GCM'));
  await page.locator('#decrypt').click();await page.waitForFunction(()=>document.getElementById('modern-result').textContent.includes('Browser round trip'));
  await page.locator('.skip').focus();await page.keyboard.press('Enter');
  assert.ok(await page.locator('#modern-result').textContent(),'skip link preserves current crypto form');
  for(const plaintext of ['A'.repeat(10000),'🌙'.repeat(5000)]) {
    await page.locator('#modern-plain').fill(plaintext);await page.locator('#encrypt').click();
    await page.waitForFunction(()=>!document.getElementById('encrypt').disabled);
    const saved=await page.locator('#envelope').inputValue();
    await page.locator('#envelope').fill('');await page.locator('#envelope').fill(saved);
    assert.equal(await page.locator('#envelope').inputValue(),saved,'full encrypted envelope can be pasted back');
    await page.locator('#decrypt').click();await page.waitForFunction(()=>!document.getElementById('decrypt').disabled);
    assert.equal(await page.locator('#modern-result').textContent(),plaintext,'long Unicode envelope roundtrip');
  }
  await page.locator('#passphrase').fill('wrong');await page.locator('#decrypt').click();
  await page.waitForFunction(()=>document.getElementById('status').textContent.toLowerCase().includes('authentication failed'));
  assert.equal(await page.locator('#modern-result').textContent(),'','failed decryption clears prior plaintext');
  await page.locator('nav a[href="#public-key"]').click();await page.locator('#generate').click();await page.waitForFunction(()=>!document.getElementById('sign').disabled);
  await page.locator('#sign').click();await page.waitForFunction(()=>document.getElementById('signature').value.length>100);await page.locator('#verify').click();await page.waitForFunction(()=>document.getElementById('verdict').textContent.includes('Valid signature'));
  await page.locator('#signed-message').fill('tampered');await page.locator('#verify').click();await page.waitForFunction(()=>document.getElementById('verdict').textContent.includes('Invalid signature'));
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
  for(const id of ['caesar','substitution','vigenere','enigma','hashing','modern','public-key']) {
    await page.goto(new URL('cryptography-museum/#'+id,base).href,{waitUntil:'networkidle'});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),`mobile ${id} overflow`);
    const missing=await page.evaluate(()=>[...document.querySelectorAll('input,textarea,select')].filter(e=>!e.labels?.length&&!e.getAttribute('aria-label')).map(e=>e.id));
    assert.deepEqual(missing,[],`${id} labelled inputs`);
  }
};

cases['one-million']=async()=>{
  await page.goto(new URL('one-million/',base).href,{waitUntil:'networkidle'});
  await page.locator('#scaleCanvas').waitFor();
  assert.equal(await page.locator('#scaleCount').textContent(),'1');
  await page.locator('.scale-steps button[data-exponent="6"]').click();
  await page.waitForFunction(()=>document.getElementById('scaleCount').textContent==='1,000,000');
  await page.locator('#quantity0').fill('10000');
  await page.waitForFunction(()=>document.getElementById('percent0').textContent==='1%');
  await page.locator('.quantity-row[data-index="1"] .comparison-select').click();
  assert.equal(await page.locator('.quantity-row[data-index="1"] .comparison-select').getAttribute('aria-pressed'),'true');
  await page.locator('.style-switch button[data-style="bars"]').click();
  assert.equal(await page.locator('.style-switch button[data-style="bars"]').getAttribute('aria-pressed'),'true');
  await page.waitForFunction(()=>location.hash.includes('i=1')&&location.hash.includes('style=bars')&&location.hash.includes('10000'));
  const sharedHash=await page.evaluate(()=>location.hash);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#scaleCount').textContent(),'1,000,000');
  assert.equal(await page.locator('#quantity0').inputValue(),'10000');
  assert.equal(await page.locator('.quantity-row[data-index="1"] .comparison-select').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('.style-switch button[data-style="bars"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>location.hash),sharedHash,'camera, stage, quantities, selected comparison and style persist in URL state');
  await page.locator('#zoomIn').click();
  await page.waitForFunction(()=>location.hash.includes('c='));
  await page.locator('.story-button[data-story="small"]').click();
  assert.match(await page.locator('#storyText').textContent(),/small|share|percent|population/i);
  await page.locator('.style-switch button[data-style="area"]').click();
  await page.locator('#quantity0').fill('0');
  await page.waitForFunction(()=>document.getElementById('percent0').textContent==='0%');
  const zeroAreaCenter=await page.locator('#scaleCanvas').evaluate(canvas=>{
    const x=Math.floor(canvas.width*.2),y=Math.floor(canvas.height*.52);
    return [...canvas.getContext('2d').getImageData(x,y,1,1).data].slice(0,3);
  });
  assert.deepEqual(zeroAreaCenter,[216,221,207],'zero quantity has no minimum visible area');
  await page.locator('#shareButton').click();
  await page.waitForFunction(()=>document.getElementById('shareStatus').textContent.length>0);
};

cases['algorithm-arena']=async()=>{
  await page.goto(new URL('algorithm-arena/',base).href,{waitUntil:'networkidle'});
  await page.locator('#sortGrid .sort-card').first().waitFor();
  assert.equal(await page.locator('#sortGrid .sort-card').count(),6);
  await page.locator('#arraySize').evaluate(element=>{element.value='8';element.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#distribution').selectOption('duplicates');
  await page.locator('#playbackSpeed').evaluate(element=>{element.value='60';element.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#sortStep').click();
  assert.ok(await page.locator('#sortGrid .sort-card [data-count="comparisons"]').first().textContent()!=='0','single stepping records real operations');
  await page.locator('#sortRestart').click();
  await page.locator('#runSorts').click();
  await page.waitForFunction(()=>document.getElementById('sortStatus').textContent.includes('All six methods reached'),undefined,{timeout:15000});
  assert.equal(await page.locator('#sortGrid .sort-card').count(),6);
  const runtimes=await page.locator('#sortGrid [data-runtime]').allTextContents();
  assert.ok(runtimes.every(value=>/\d/.test(value)),'each method shows compute-only runtime');

  await page.locator('#gridWidth').evaluate(element=>{element.value='12';element.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#gridHeight').evaluate(element=>{element.value='8';element.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#pathAlgorithm').selectOption('dfs');
  await page.locator('#clearGrid').click();
  await page.locator('#runPath').click();
  assert.match(await page.locator('#optimalityNote').textContent(),/does not guarantee a shortest path/);
  await page.locator('#pathAlgorithm').selectOption('dijkstra');
  await page.locator('#makeMaze').click();
  await page.locator('#runPath').click();
  await page.waitForFunction(()=>/Reached the destination|No route connects/.test(document.getElementById('pathStatus').textContent),undefined,{timeout:15000});
  assert.match(await page.locator('#pathStatus').textContent(),/Reached the destination/);
  await page.locator('#clearGrid').click();
  await page.locator('#editMode').selectOption('weight');
  await page.locator('.path-cell[data-id="14"]').click();
  assert.ok(await page.locator('.path-cell[data-id="14"]').getAttribute('class').then(value=>value.includes('weight')),'grid cells can be edited as weighted terrain');

  await page.locator('#graphAlgorithm').selectOption('prim');
  await page.locator('#runGraph').click();
  await page.waitForFunction(()=>document.getElementById('graphStatus').textContent.includes('Selected'),undefined,{timeout:10000});
  assert.match(await page.locator('#graphValueLabel').textContent(),/spanning forest weight/);
  const nodesBefore=await page.locator('#graphStart option').count();
  await page.locator('#addNode').click();
  assert.equal(await page.locator('#graphStart option').count(),nodesBefore+1);
  await page.locator('#edgeFrom').selectOption('A');
  await page.locator('#edgeTo').selectOption('H');
  await page.locator('#edgeWeight').fill('7');
  await page.locator('#addEdge').click();
  assert.match(await page.locator('#graphHint').textContent(),/weight 7/);

  await page.locator('#soundEnable').click();
  await page.waitForFunction(()=>document.getElementById('soundStatus').textContent==='Sound on');
  await page.locator('#muteSound').click();
  assert.equal(await page.locator('#muteSound').textContent(),'Unmute');
  await page.locator('#muteSound').click();
  assert.equal(await page.locator('#muteSound').textContent(),'Mute');
};

cases['music-microscope']=async()=>{
  await page.goto(new URL('music-microscope/',base).href,{waitUntil:'networkidle'});
  await page.locator('#exampleButton').click();
  await page.waitForFunction(()=>document.getElementById('trackName').textContent.includes('glass steps'));
  assert.equal(await page.locator('#durationFact').textContent(),'00:12');
  assert.match(await page.locator('#sampleRateFact').textContent(),/44.1 kHz/);
  await page.waitForFunction(()=>document.getElementById('analysisStatus').textContent.includes('analysis complete'),undefined,{timeout:20000});
  assert.match(await page.locator('#tempoCandidates').textContent(),/bpm/);
  assert.doesNotMatch(await page.locator('#tempoCandidates').textContent(),/±/);
  const spectrogram=await page.locator('#spectrogram').evaluate(canvas=>({width:canvas.width,height:canvas.height}));
  assert.ok(spectrogram.width>0&&spectrogram.height>0);

  const waveform=await page.locator('#waveform').boundingBox();
  await page.mouse.move(waveform.x+12,waveform.y+waveform.height*.5);
  await page.mouse.down();
  await page.mouse.move(waveform.x+waveform.width-12,waveform.y+waveform.height*.5);
  await page.mouse.up();
  assert.doesNotMatch(await page.locator('#selectionReadout').textContent(),/^—$/);
  assert.match(await page.locator('#selectionReadout').textContent(),/^00:00\.000 .* 00:12\.000/,'waveform plot endpoints map to the full track endpoints');
  await page.locator('#analyzeSelection').click();
  assert.match(await page.locator('#selectionResult').textContent(),/PEAK.*RMS/);
  await page.locator('#waveZoom').evaluate(element=>{element.value='2';element.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.match(await page.locator('#waveZoomLabel').textContent(),/2/);
  await page.locator('#filterType').selectOption('highpass');
  await page.locator('#filterEnabled').check();
  assert.match(await page.locator('#filterStatus').textContent(),/Filtered playback · High-pass/);

  const filterEvidence=await page.evaluate(async()=>{
    const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;
    const energy=async type=>{
      const context=new Offline(1,44100,44100), oscillator=context.createOscillator(), filter=context.createBiquadFilter();
      oscillator.type='sine'; oscillator.frequency.value=8000; filter.type=type; filter.frequency.value=500;
      oscillator.connect(filter); filter.connect(context.destination); oscillator.start();
      const rendered=await context.startRendering(), samples=rendered.getChannelData(0).slice(5000);
      return Math.sqrt(samples.reduce((sum,value)=>sum+value*value,0)/samples.length);
    };
    return {lowpass:await energy('lowpass'),highpass:await energy('highpass')};
  });
  assert.ok(filterEvidence.lowpass<filterEvidence.highpass*.1,'a native low-pass suppresses an 8 kHz test signal');

  await page.locator('#playButton').click();
  await page.waitForFunction(()=>document.getElementById('timeline').value!=='0',undefined,{timeout:5000});
  assert.equal(await page.locator('#playButton').getAttribute('aria-label'),'Pause');
  await page.locator('#playButton').click();
  assert.equal(await page.locator('#playButton').getAttribute('aria-label'),'Play');
  await page.locator('#timeline').evaluate(element=>{element.value='5000';element.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForFunction(()=>document.getElementById('timeline').value==='5000');

  await page.locator('#waveZoom').evaluate(element=>{element.value='1';element.dispatchEvent(new Event('input',{bubbles:true}));});
  const selectWaveRange=async(start,end)=>{
    const rect=await page.locator('#waveform').boundingBox();
    const x=seconds=>rect.x+12+seconds/12*(rect.width-24);
    const y=rect.y+rect.height*.5;
    await page.mouse.move(x(start),y);await page.mouse.down();await page.mouse.move(x(end),y);await page.mouse.up();
  };
  await selectWaveRange(1.5,3.5);
  await page.locator('#loopSelection').check();
  await page.locator('#playButton').click();
  await page.waitForFunction(()=>{
    const text=document.getElementById('currentTime').textContent,seconds=Number(text.slice(3,5))+Number(text.slice(6,9))/1000;
    return seconds>1.6&&seconds<3.5;
  },undefined,{timeout:3000});
  await selectWaveRange(7.5,9.5);
  await page.waitForFunction(()=>{
    const text=document.getElementById('currentTime').textContent,seconds=Number(text.slice(3,5))+Number(text.slice(6,9))/1000;
    return seconds>=7.5&&seconds<9.5;
  },undefined,{timeout:4000});
  await selectWaveRange(7.4,10);
  await page.waitForFunction(()=>{
    const text=document.getElementById('currentTime').textContent,seconds=Number(text.slice(3,5))+Number(text.slice(6,9))/1000;
    return seconds>=7.4&&seconds<10;
  },undefined,{timeout:4000});
  const beforeUnloop=await page.locator('#currentTime').textContent();
  await page.locator('#loopSelection').uncheck();
  await page.waitForTimeout(220);
  const afterUnloop=await page.locator('#currentTime').textContent();
  assert.ok(afterUnloop>beforeUnloop,'disabling a loop continues from the current position');
  await page.locator('#playButton').click();

  await page.locator('#audioFile').setInputFiles({name:'not-audio.txt',mimeType:'text/plain',buffer:Buffer.from('not audio')});
  await page.waitForFunction(()=>!document.getElementById('importError').hidden);
  assert.match(await page.locator('#trackName').textContent(),/glass steps/,'failed import preserves the current recording');
  assert.match(await page.locator('#importError').textContent(),/supported audio format/);
  await page.evaluate(()=>{
    const Context=window.AudioContext||window.webkitAudioContext,prototype=Context.prototype,decode=prototype.decodeAudioData;
    window.__decodedAudioCalls=0;
    prototype.decodeAudioData=function(...args){window.__decodedAudioCalls+=1;return decode.apply(this,args);};
  });
  const longRate=44100,longChannels=2,longFrames=longRate*100,longDataBytes=longFrames*longChannels*2,longWav=Buffer.alloc(44+longDataBytes);
  longWav.write('RIFF',0);longWav.writeUInt32LE(longWav.length-8,4);longWav.write('WAVE',8);longWav.write('fmt ',12);longWav.writeUInt32LE(16,16);
  longWav.writeUInt16LE(1,20);longWav.writeUInt16LE(longChannels,22);longWav.writeUInt32LE(longRate,24);longWav.writeUInt32LE(longRate*longChannels*2,28);
  longWav.writeUInt16LE(longChannels*2,32);longWav.writeUInt16LE(16,34);longWav.write('data',36);longWav.writeUInt32LE(longDataBytes,40);
  await page.locator('#audioFile').setInputFiles({name:'oversized-decoded.wav',mimeType:'audio/wav',buffer:longWav});
  await page.waitForFunction(()=>document.getElementById('importError').textContent.includes('32 MB'),undefined,{timeout:10000});
  assert.match(await page.locator('#importError').textContent(),/32 MB/,'preflight rejects oversized decoded audio');
  assert.equal(await page.evaluate(()=>window.__decodedAudioCalls),0,'oversized input is rejected before decodeAudioData');
  const sampleRate=44100,frames=sampleRate,dataBytes=frames*2,wav=Buffer.alloc(44+dataBytes);
  wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVE',8);wav.write('fmt ',12);wav.writeUInt32LE(16,16);
  wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(sampleRate,24);wav.writeUInt32LE(sampleRate*2,28);
  wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(dataBytes,40);
  for(let index=0;index<frames;index++)wav.writeInt16LE(Math.round(Math.sin(2*Math.PI*440*index/sampleRate)*12000),44+index*2);
  await page.locator('#audioFile').setInputFiles({name:'bounded-tone.wav',mimeType:'audio/wav',buffer:wav});
  await page.waitForFunction(()=>document.getElementById('trackName').textContent==='bounded-tone.wav',undefined,{timeout:10000});
  assert.equal(await page.locator('#channelsFact').textContent(),'1','preflighted local WAV imports with its original channel count');
  assert.equal(await page.evaluate(()=>window.__decodedAudioCalls),1,'small local audio proceeds to Web Audio decoding');
  await page.locator('#trackName').click();
  await page.keyboard.press('Space');
  assert.equal(await page.locator('#playButton').getAttribute('aria-label'),'Pause','Space toggles transport when focus is outside a control');
  await page.keyboard.press('Space');
};

try {
  console.log(`Browser: ${browser.version()}`);
  for(const name of selected) {
    assert.ok(cases[name],`Missing browser workflow: ${name}`);
    await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});
    await cases[name]();console.log(`PASS ${name} interactive workflow`);
  }
  assert.deepEqual(errors,[],'no page, console or local network errors');
} finally {await browser.close();if(local)await new Promise(ok=>local.server.close(ok));}
