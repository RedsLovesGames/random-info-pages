import {createBaseline,parseBaseline,recordTrial,safeMetricSummary,SCENARIO_FORMAT} from './repro.mjs';
const $=id=>document.getElementById(id);
const catalogue=window.RIPCatalog;
if(!catalogue)throw new Error('Project registry failed to load.');
const projects=catalogue.active.filter(project=>project.slug!=='compare');
const valid=new Map(projects.map(project=>[project.slug,project]));
const source={left: $('left-select'),right:$('right-select')};
const frames={left:$('left-frame'),right:$('right-frame')};
const shell=$('compare-shell'),handle=$('split-handle'),status=$('compare-status');
const params=new URLSearchParams(location.search);
const fallbackLeft=valid.has('fluid-dynamics')?'fluid-dynamics':projects[0].slug;
const fallbackRight=valid.has('marble-sequencer')?'marble-sequencer':projects[1]?.slug||fallbackLeft;
const state={left:valid.has(params.get('left'))?params.get('left'):fallbackLeft,
 right:valid.has(params.get('right'))?params.get('right'):fallbackRight};
const listeners=new Map();
let scrollBusy=false;
let split=50;
let baseline=null,trials=[],trialRunning=false,trialTimer=null,trialResolver=null,trialRevision=0;
let pendingBaseline=null;
const frameReady={left:false,right:false};
function reproMessage(message,error=false){
  const output=$('repro-status');output.textContent=message;output.dataset.error=String(error);
}
function adapters(){
  return ['left','right'].map(side=>frames[side].contentWindow?.RIPStudio);
}
function scenarioSupported(){
  try{return frameReady.left&&frameReady.right&&adapters().every(
    x=>typeof x?.getState==='function'&&typeof x?.setState==='function'&&
    typeof x?.transport==='function')}
  catch{return false}
}
function renderTrialResults(){
  const output=$('trial-results');
  output.replaceChildren();
  if(!trials.length){
    const empty=document.createElement('p');empty.textContent='No trials recorded.';
    output.append(empty);return;
  }
  for(const trial of [...trials].reverse().slice(0,20)){
    const row=document.createElement('div');row.className='trial-entry';
    const title=document.createElement('strong');
    title.textContent='Trial '+trial.index+' · '+(trial.elapsedMs/1000).toFixed(2)+'s';
    const metrics=document.createElement('code');
    metrics.textContent='LEFT '+JSON.stringify(trial.after.left)+
      '   |   RIGHT '+JSON.stringify(trial.after.right);
    row.append(title,metrics);output.append(row);
  }
}
function refreshTrialButtons(){
  const supported=scenarioSupported(),ready=Boolean(baseline)&&
    baseline.left===state.left&&baseline.right===state.right;
  $('capture-baseline').disabled=trialRunning||!supported;
  $('restore-baseline').disabled=trialRunning||!supported||!ready;
  $('run-trial').disabled=trialRunning||!supported||!ready;
  $('stop-trial').disabled=!trialRunning;
  $('export-trials').disabled=!baseline||trialRunning;
  $('trial-duration').disabled=trialRunning;
}
function cancelTrial(){
  if(!trialRunning)return;
  ++trialRevision;
  clearTimeout(trialTimer);
  trialTimer=null;
  trialRunning=false;
  trialResolver?.(false);trialResolver=null;
  for(const adapter of adapters())try{adapter?.transport?.('pause')}catch{}
  reproMessage('The timed trial was cancelled. No incomplete results were stored.',true);
  refreshTrialButtons();
}
function resetBaselineOnChange(){
  cancelTrial();
  baseline=null;pendingBaseline=null;trials=[];
  renderTrialResults();refreshTrialButtons();
}
async function captureBaseline(){
  try{
    if(!scenarioSupported())throw new Error('Both pages must support editable state and transport.');
    const [left,right]=await Promise.all(adapters().map(a=>a.getState()));
    baseline=createBaseline({left:state.left,right:state.right,
      duration:Number($('trial-duration').value),
      states:{left,right}});
    trials=[];renderTrialResults();refreshTrialButtons();
    reproMessage('Baseline captured for '+baseline.left+' and '+baseline.right+
      '. Restore it before each timed trial.');
  }catch(error){reproMessage('Baseline capture failed: '+error.message,true)}
}
async function restoreBaseline(){
  if(!baseline||!scenarioSupported()||
     baseline.left!==state.left||baseline.right!==state.right)
    throw new Error('Load the two matching projects before restoring this baseline.');
  const [a,b]=adapters();
  await Promise.all([a.transport('pause'),b.transport('pause')]);
  await Promise.all([a.setState(structuredClone(baseline.states.left)),
    b.setState(structuredClone(baseline.states.right))]);
}
async function getTrialMetrics(){
  const [left,right]=await Promise.all(adapters().map(async adapter=>{
    try{return safeMetricSummary(await adapter.metrics?.())}catch{return{}}
  }));
  return {left,right};
}
async function runTrial(){
  if(trialRunning)return;
  const revision=++trialRevision;
  try{
    if(!baseline||!scenarioSupported())throw new Error('Capture a compatible baseline first.');
    baseline.duration=Number($('trial-duration').value);
    baseline=parseBaseline(baseline);
    trialRunning=true;refreshTrialButtons();
    reproMessage('Restoring the baseline for this timed trial…');
    await restoreBaseline();
    if(revision!==trialRevision)return;
    const before=await getTrialMetrics();
    const startedAt=Date.now();
    const [left,right]=adapters();
    await Promise.all([left.transport('play'),right.transport('play')]);
    reproMessage('Trial running for '+baseline.duration+' seconds. Both projects maintain independent clocks.');
    const completed=await new Promise(resolve=>{
      trialResolver=resolve;
      trialTimer=setTimeout(()=>resolve(true),baseline.duration*1000);
    });
    trialResolver=null;trialTimer=null;
    if(!completed||revision!==trialRevision)return;
    await Promise.all([left.transport('pause'),right.transport('pause')]);
    const endedAt=Date.now();
    const after=await getTrialMetrics();
    const result=recordTrial(baseline,{before,after,startedAt,endedAt});
    result.index=trials.length+1;
    trials.push(result);renderTrialResults();
    reproMessage('Saved trial '+result.index+' · elapsed '+(result.elapsedMs/1000).toFixed(2)+
      ' seconds. These are repeatable starting conditions, not deterministic simulation frames.');
  }catch(error){reproMessage('Trial failed: '+error.message,true)}
  finally{
    if(revision===trialRevision){trialRunning=false;refreshTrialButtons()}
  }
}
async function restoreImportedBaseline(){
  if(!pendingBaseline||!frameReady.left||!frameReady.right||
    !scenarioSupported())return;
  const imported=pendingBaseline;pendingBaseline=null;
  baseline=imported;trials=[];renderTrialResults();
  $('trial-duration').value=String(imported.duration);
  try{
    await restoreBaseline();refreshTrialButtons();
    reproMessage('Imported '+imported.left+' / '+imported.right+' and restored both configurations.');
  }catch(error){reproMessage('Imported baseline could not be restored: '+error.message,true)}
}
$('capture-baseline').addEventListener('click',captureBaseline);
$('restore-baseline').addEventListener('click',async()=>{
  try{await restoreBaseline();reproMessage('Both initial configurations restored.')}
  catch(error){reproMessage('Restore failed: '+error.message,true)}
});
$('run-trial').addEventListener('click',runTrial);
$('stop-trial').addEventListener('click',cancelTrial);
$('trial-duration').addEventListener('change',()=>{
  if(baseline)baseline.duration=Number($('trial-duration').value);
});
$('export-trials').addEventListener('click',()=>{
  if(!baseline)return;
  const report={format:'rip-compare-notebook-v1',baseline,
    trials,exportedAt:new Date().toISOString(),
    limitations:'Restores configuration and preset, not raw solver cells or frame-locked execution.'};
  const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='random-info-pages-trial-notebook.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
  reproMessage('Trial notebook exported locally with initial configurations and '+trials.length+' result(s).');
});
$('import-trials').addEventListener('click',()=>$('trial-file').click());
$('trial-file').addEventListener('change',async()=>{
  const file=$('trial-file').files?.[0];$('trial-file').value='';
  if(!file)return;
  try{
    if(file.size>2*1024*1024)throw new Error('Choose a baseline under 2 MB.');
    const object=JSON.parse(await file.text());
    const imported=parseBaseline(object.format==='rip-compare-notebook-v1'?object.baseline:object);
    if(!valid.has(imported.left)||!valid.has(imported.right))
      throw new Error('The file references an unknown or archived project.');
    resetBaselineOnChange();pendingBaseline=imported;
    state.left=imported.left;state.right=imported.right;
    load('left');load('right');
    reproMessage('Loading both saved projects before applying their baseline…');
  }catch(error){reproMessage('Import failed: '+error.message,true)}
});

function say(message,error=false){status.textContent=message;status.dataset.error=String(error)}
function makeOptions(select){
 const group=new DocumentFragment();
 for(const project of projects){
  const option=document.createElement('option');option.value=project.slug;
  option.textContent=project.d||project.n;group.append(option);
 }
 select.replaceChildren(group);
}
function rootUrl(slug){return new URL('../'+slug+'/',location.href)}
function updateAddress(){
 const url=new URL(location.href);
 url.searchParams.set('left',state.left);
 url.searchParams.set('right',state.right);
 url.searchParams.set('layout',$('layout').value);
 history.replaceState(history.state,'',url);
}
function detach(side){
 const attached=listeners.get(side);
 if(attached){attached.win.removeEventListener('scroll',attached.handler);listeners.delete(side)}
}
function attach(side){
 detach(side);
 const win=frames[side].contentWindow;
 if(!win)return;
 const handler=()=>{
  if(!$('sync-scroll').checked||scrollBusy)return;
  const other=side==='left'?'right':'left';
  try{
   const original=win.document.documentElement;
   const target=frames[other].contentWindow;
   const max=Math.max(1,original.scrollHeight-win.innerHeight);
   const ratio=Math.min(1,Math.max(0,win.scrollY/max));
   const next=Math.max(0,target.document.documentElement.scrollHeight-target.innerHeight);
   scrollBusy=true;
   target.scrollTo({top:Math.round(next*ratio),behavior:'instant'});
   requestAnimationFrame(()=>{scrollBusy=false});
  }catch(error){
   $('sync-scroll').checked=false;
   scrollBusy=false;say('Scroll synchronization is unavailable for one of these pages.',true);
  }
 };
 win.addEventListener('scroll',handler,{passive:true});
 listeners.set(side,{win,handler});
}
function updateCopyButton(){
 updateTransportButtons();
 refreshTrialButtons();
 let supported=false;
 try{
  const a=frames.left.contentWindow.RIPStudio;
  const b=frames.right.contentWindow.RIPStudio;
  supported=state.left===state.right&&typeof a?.getState==='function'&&
    typeof b?.setState==='function';
 }catch{}
 $('copy-state').disabled=!supported;
 $('copy-state').title=supported?'Copy the left project’s editable state to the right panel':
   'Choose the same supported project in both panels to copy editable settings';
}
function updateTransportButtons(){
 let supported=false;
 try{
  supported=['left','right'].every(side=>
   typeof frames[side].contentWindow?.RIPStudio?.transport==='function');
 }catch{}
 for(const id of ['play-both','pause-both','reset-both']){
  const button=$(id);
  button.disabled=!supported;
  button.title=supported?'Coordinate playback of two interactive projects':
    'Available when both projects expose compatible transport controls';
 }
 $('transport-help').textContent=supported?
  'Both projects support coordinated play/pause/reset. Starting is not sample-accurate or frame-locked.':
  'Choose two pages with supported playback controls (Fluid Dynamics or Marble Sequencer).';
}
async function commandBoth(action){
 try{
  const controls=['left','right'].map(side=>frames[side].contentWindow?.RIPStudio?.transport);
  if(controls.some(control=>typeof control!=='function'))
   throw new Error('Both projects must support coordinated playback.');
  await Promise.all(['left','right'].map(side=>Promise.resolve(
    frames[side].contentWindow.RIPStudio.transport(action))));
  say((action==='play'?'Started':action==='pause'?'Paused':'Reset')+' both projects. Their internal clocks run independently.');
 }catch(error){say('Coordinated command failed: '+error.message,true)}
}
for(const [id,action] of [['play-both','play'],['pause-both','pause'],['reset-both','reset']]){
 $(id).addEventListener('click',()=>commandBoth(action));
}
function load(side){
 frameReady[side]=false;
 const project=valid.get(state[side]);
 if(!project)return;
 source[side].value=state[side];
 $(side+'-title').textContent=project.d||project.n;
 $(side+'-open').href=rootUrl(state[side]).href;
 $(side+'-frame').title=(side==='left'?'Left':'Right')+' project: '+(project.d||project.n);
 detach(side);
 frames[side].src=rootUrl(state[side]).href;
 $('copy-state').disabled=true;
 updateTransportButtons();
 updateAddress();
}
function change(side,next){
 if(!valid.has(next))return;
 resetBaselineOnChange();
 state[side]=next;load(side);
 say('Projects run independently. Use sync scroll to match page positions.');
}
for(const side of ['left','right']){
 makeOptions(source[side]);
 source[side].value=state[side];
 source[side].addEventListener('change',()=>change(side,source[side].value));
 frames[side].addEventListener('load',()=>{
  frameReady[side]=true;
  attach(side);updateCopyButton();
  restoreImportedBaseline();
  say((side==='left'?'Left':'Right')+' project loaded.');
 });
}
$('swap-projects').addEventListener('click',()=>{
 resetBaselineOnChange();
 const left=state.left;state.left=state.right;state.right=left;
 load('left');load('right');say('Projects swapped.');
});
$('copy-state').addEventListener('click',async()=>{
 try{
  if(state.left!==state.right)throw new Error('Choose the same project in both panels.');
  const left=frames.left.contentWindow.RIPStudio;
  const right=frames.right.contentWindow.RIPStudio;
  if(typeof left?.getState!=='function'||typeof right?.setState!=='function')
   throw new Error('Editable state copying is not supported by this project.');
  const snapshot=await left.getState();
  await right.setState(structuredClone(snapshot));
  say('Copied the left project’s editable state to the right.');
 }catch(error){say('Cannot copy project: '+error.message,true)}
});
$('share-compare').addEventListener('click',async()=>{
 const url=location.href;
 try{await navigator.clipboard.writeText(url);say('Comparison link copied.')}
 catch{window.prompt('Copy this comparison link',url);say('Comparison link ready to copy.')}
});
$('sync-scroll').addEventListener('change',()=>{
 say($('sync-scroll').checked?'Scroll synchronization enabled.':'Scroll synchronization disabled.');
});
function verticalDivider(){return shell.dataset.orientation==='vertical'||
  (matchMedia('(max-width: 650px)').matches);}
function updateSplit(value){
 split=Math.max(25,Math.min(75,Math.round(value)));
 shell.style.setProperty('--split',split+'%');
 handle.setAttribute('aria-valuenow',String(split));
 handle.setAttribute('aria-valuetext',split+' percent for the first panel');
 handle.setAttribute('aria-orientation',verticalDivider()?'horizontal':'vertical');
}
function updateLayout(layout){
 shell.dataset.orientation=layout;
 handle.setAttribute('aria-orientation',verticalDivider()?'horizontal':'vertical');
 updateAddress();
}
$('layout').value=params.get('layout')==='vertical'?'vertical':'horizontal';
$('layout').addEventListener('change',()=>updateLayout($('layout').value));
$('reset-split').addEventListener('click',()=>updateSplit(50));
handle.addEventListener('pointerdown',event=>{
 if(event.button!==0||event.pointerType==='mouse'&&event.buttons!==1)return;
 handle.setPointerCapture(event.pointerId);
 const start=event;
 function drag(e){
  const rect=shell.getBoundingClientRect();
  const ratio=verticalDivider()?(e.clientY-rect.top)/rect.height:(e.clientX-rect.left)/rect.width;
  updateSplit(ratio*100);
 }
 drag(start);
 const finish=()=>{handle.removeEventListener('pointermove',drag);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',finish)};
 handle.addEventListener('pointermove',drag);
 handle.addEventListener('pointerup',finish);
 handle.addEventListener('pointercancel',finish);
});
handle.addEventListener('keydown',event=>{
 const vertical=verticalDivider();
 const movement=event.key==='ArrowRight'||event.key==='ArrowDown'?5:
   event.key==='ArrowLeft'||event.key==='ArrowUp'?-5:0;
 if(movement){event.preventDefault();updateSplit(split+movement);}
 else if(event.key==='Home'){event.preventDefault();updateSplit(25)}
 else if(event.key==='End'){event.preventDefault();updateSplit(75)}
});
window.addEventListener('resize',()=>updateSplit(split));
updateLayout($('layout').value);
updateSplit(50);
renderTrialResults();
refreshTrialButtons();
load('left');load('right');
