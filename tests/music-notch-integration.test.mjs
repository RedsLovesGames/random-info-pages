import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Music Microscope offers reversible tonal preview and explicit local export',()=>{
 const html=read('music-microscope/index.html');
 for(const id of ['notchEnabled','notch50','notch60','pickNotch','notchFrequency',
  'notchQ','notchQLabel','notchHarmonics','notchBandLabel','notchStatus','exportNotch'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/not broadband fan hiss/i);
 assert.match(html,/not the low\/high\/band-pass/i);
 assert.match(html,/original recording is preserved/i);
});
test('native preview is after analyser and shares the same parameter model as offline rendering',()=>{
 const code=read('music-microscope/app.js');
 assert.match(code,/notchBands\(\{frequency,q,harmonics\},sampleRate\)/);
 assert.match(code,/node\.type='notch'/);
 assert.match(code,/source\.connect\(node\)/);
 assert.match(code,/source\.connect\(outputGain\)/);
 assert.match(code,/analyser\.disconnect\(\)/);
 assert.match(code,/spectrumFrequency\(fraction,audioContext\.sampleRate\)/);
 assert.match(code,/spectrumCanvas\.addEventListener\('click'/);
 assert.match(code,/function configureNotch\(\)/);
 assert.match(code,/function cancelNotchExport\(\)/);
});
test('offline processing isolates original decoded buffers and can be cancelled safely',()=>{
 const app=read('music-microscope/app.js');
 const worker=read('music-microscope/notch-worker.mjs');
 assert.match(app,/\.slice\(first-warmup,last\)/);
 assert.match(app,/new Worker\(new URL\('\.\/notch-worker\.mjs',import\.meta\.url\)/);
 assert.match(app,/worker\.postMessage\(/);
 assert.match(app,/worker\?\.terminate\(\)/);
 assert.match(app,/90000/);
 assert.match(app,/cancelNotchExport\(\)/);
 assert.match(app,/encodeWavRegion\(output,0,output\.duration\)/);
 assert.match(app,/currentBuffer!==source/);
 assert.match(worker,/filterNotchPCM\(parsed,sampleRate,config,\{warmup\}\)/);
 assert.match(worker,/result\.channels\.map\(samples=>samples\.buffer\)/);
});
test('Music Microscope supports coordinated transport and spectrogram capture',()=>{
 const code=read('music-microscope/app.js');
 assert.match(code,/window\.RIPStudio=\{/);
 assert.match(code,/async transport\(action\)/);
 assert.match(code,/capture\(\)/);
 assert.match(code,/spectrogramCanvas\.toBlob\(/);
});
test('project tour includes targeted hum filtering and processed export',()=>{
 const code=read('design-system/tours.mjs');
 assert.match(code,/\['#notchFrequency'/);
 assert.match(code,/\['#exportNotch'/);
});
