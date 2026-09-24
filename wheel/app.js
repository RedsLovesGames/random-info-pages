import {createDefaultState,sanitizeState,getActiveWheel,eligibleEntries,createEntry,createWheel,entriesFromText,entriesToText,patchEntry} from './model.js';
import {secureUnitFloat,pickWeightedEntry} from './random.js';
import {buildSegments,winnerIndexAtPointer} from './geometry.js';
import {createSpinPlan,easeOutQuint} from './spin.js';
import {drawWheel} from './render.js';
import {createStorageAdapter,encodeShareState,decodeShareState,exportStateJSON,parseStateJSON} from './storage.js';

const $=s=>document.querySelector(s),canvas=$('#wheel'),ctx=canvas.getContext('2d'),store=createStorageAdapter(localStorage);
let shared=false,state=loadInitial(),rotation=0,spinning=false,lastWinner=null,activeSide='entries',advanced=false,tickIndex=-1,inputTimer=0,audioContext=null,lastTickAt=0;

function loadInitial(){if(location.hash.startsWith('#wheel=')){try{shared=true;return decodeShareState(location.hash)}catch{}}return store.loadAutosave()||createDefaultState()}
function active(){return getActiveWheel(state)}
function renderStatus(text=''){const el=$('#status');if(el)el.textContent=text}
function persist(message='Saved locally'){if(!shared)store.saveAutosave(state);if(message)renderStatus(message)}
function mutate(fn,message='Saved locally'){fn();state=sanitizeState(state);shared=false;persist(message);renderAll()}
function applyTheme(){const t=state.settings.theme;document.body.classList.toggle('light',t==='light'||(t==='system'&&matchMedia('(prefers-color-scheme: light)').matches))}
function applyAssets(){const stage=$('#wheelStage'),center=$('#centerImageOverlay');if(state.settings.background){stage.style.backgroundImage=`linear-gradient(rgba(18,22,27,.15),rgba(18,22,27,.15)),url("${state.settings.background.replace(/"/g,'\\"')}")`;stage.classList.add('has-custom-bg')}else{stage.style.backgroundImage='';stage.classList.remove('has-custom-bg')}if(state.settings.centerImage){center.src=state.settings.centerImage;center.classList.remove('hidden')}else{center.removeAttribute('src');center.classList.add('hidden')}}
function renderWheel(){drawWheel(ctx,canvas,active(),rotation,{palette:state.settings.palette,onImageLoad:()=>requestAnimationFrame(renderWheel)})}
function renderCounts(){$('#entryCount').textContent=eligibleEntries(active()).length;$('#resultCount').textContent=active().history.length}
function renderWheelTabs(){const root=$('#wheelTabs');root.innerHTML='';state.wheels.forEach(w=>{const b=document.createElement('button');b.className='tab'+(w.id===state.activeWheelId?' active':'');b.textContent=w.name;b.onclick=()=>mutate(()=>state.activeWheelId=w.id,'');root.append(b)});$('#wheelNameBadge').textContent=active().name}
function renderEntryText(){const el=$('#entriesInput');if(document.activeElement!==el)el.value=entriesToText(active())}
function advancedRow(entry){const row=document.createElement('div');row.className='advanced-row';const label=document.createElement('span');label.className='label';label.textContent=entry.label||'(blank)';const weight=document.createElement('input');weight.type='number';weight.min='0';weight.step='0.1';weight.value=entry.weight;weight.title='Weight';weight.onchange=()=>mutate(()=>{active().entries=patchEntry(active().entries,entry.id,{weight:Number(weight.value)})},'');const color=document.createElement('input');color.type='color';color.value=/^#[0-9a-f]{6}$/i.test(entry.color)?entry.color:'#6f77d8';color.title='Segment color';color.oninput=()=>{active().entries=patchEntry(active().entries,entry.id,{color:color.value});state=sanitizeState(state);shared=false;persist('');renderWheel()};const del=document.createElement('button');del.className='remove-entry';del.textContent='×';del.title='Remove entry';del.onclick=()=>mutate(()=>active().entries=active().entries.filter(e=>e.id!==entry.id));row.append(label,weight,color,del);return row}
function renderAdvanced(){const root=$('#advancedRows');root.classList.toggle('hidden',!advanced);root.innerHTML='';if(advanced)for(const entry of active().entries)root.append(advancedRow(entry))}
function renderResults(){const root=$('#resultsList');root.innerHTML='';const history=[...active().history].reverse();$('#emptyResults').classList.toggle('hidden',history.length>0);for(const result of history){const row=document.createElement('div');row.className='result-row';const name=document.createElement('strong');name.textContent=result.label;const time=document.createElement('span');time.textContent=new Date(result.at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});row.append(name,time);root.append(row)}}
function renderSidebar(){renderCounts();renderEntryText();renderAdvanced();renderResults();$('#entriesPanel').classList.toggle('hidden',activeSide!=='entries');$('#resultsPanel').classList.toggle('hidden',activeSide!=='results');$('#entriesTab').classList.toggle('active',activeSide==='entries');$('#resultsTab').classList.toggle('active',activeSide==='results');$('#entriesTab').setAttribute('aria-selected',String(activeSide==='entries'));$('#resultsTab').setAttribute('aria-selected',String(activeSide==='results'))}
function syncSettings(){$('#durationInput').value=state.settings.spinDurationMs;$('#durationValue').textContent=`${(state.settings.spinDurationMs/1000).toFixed(1)}s`;$('#paletteSelect').value=state.settings.palette||'auto';$('#themeSelect').value=state.settings.theme;$('#soundSelect').value=String(state.settings.sound);$('#confettiSelect').value=String(state.settings.confetti);$('#extraTurnsInput').value=state.settings.extraTurns}
function renderAll(){applyTheme();applyAssets();renderWheelTabs();renderSidebar();syncSettings();renderWheel()}

function ensureAudio(){if(!state.settings.sound)return null;try{audioContext ||= new AudioContext();return audioContext}catch{return null}}
function tone(freq=520,duration=.055,gain=.035){const ac=ensureAudio();if(!ac)return;const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=freq;g.gain.value=gain;o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+duration)}
function tick(){const now=performance.now();if(now-lastTickAt<22)return;lastTickAt=now;tone(760,.025,.018)}
function beep(){tone(520,.1,.05);setTimeout(()=>tone(680,.13,.04),70)}
function confetti(){if(!state.settings.confetti)return;for(let i=0;i<40;i++){const x=document.createElement('i');x.style.cssText=`position:fixed;z-index:95;width:7px;height:10px;left:${44+Math.random()*12}vw;top:45vh;background:hsl(${Math.random()*360} 80% 60%);pointer-events:none;transition:transform 1.2s ease-out,opacity 1.2s`;document.body.append(x);requestAnimationFrame(()=>{x.style.transform=`translate(${(Math.random()-.5)*720}px,${120+Math.random()*520}px) rotate(${Math.random()*720}deg)`;x.style.opacity='0'});setTimeout(()=>x.remove(),1300)}}
function showWinner(entry){lastWinner=entry;active().history.push({entryId:entry.id,label:entry.label,at:Date.now()});if(active().history.length>100)active().history.shift();persist('');renderResults();renderCounts();$('#winnerName').textContent=entry.label;$('#winnerModal').classList.remove('hidden');beep();confetti()}
function spin(){if(spinning)return;const entries=eligibleEntries(active());if(!entries.length){renderStatus('Add at least one entry');return}const picked=pickWeightedEntry(entries,secureUnitFloat()),segments=buildSegments(entries),idx=segments.findIndex(s=>s.entry.id===picked.id),reduced=state.settings.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches,plan=createSpinPlan({segments,winnerIndex:idx,currentRotation:rotation,durationMs:state.settings.spinDurationMs,extraTurns:state.settings.extraTurns,reducedMotion:reduced});spinning=true;document.body.classList.add('is-spinning');tickIndex=winnerIndexAtPointer(segments,rotation);const start=performance.now(),from=rotation,to=plan.finalRotation;function frame(now){const t=Math.min(1,(now-start)/plan.durationMs);rotation=from+(to-from)*easeOutQuint(t);renderWheel();const nowIndex=winnerIndexAtPointer(segments,rotation);if(nowIndex!==tickIndex){tickIndex=nowIndex;tick()}if(t<1)requestAnimationFrame(frame);else{rotation=to;spinning=false;document.body.classList.remove('is-spinning');showWinner(picked)}}requestAnimationFrame(frame)}

function open(id){$(id).classList.remove('hidden')}
function close(id){$(id).classList.add('hidden')}
function setSide(tab){activeSide=tab;renderSidebar()}
function addWheel(){mutate(()=>{const w=createWheel(`Wheel ${state.wheels.length+1}`);w.entries=[];state.wheels.push(w);state.activeWheelId=w.id})}
function readImage(file,maxBytes=2200000){return new Promise((resolve,reject)=>{if(!file?.type?.startsWith('image/'))return reject(new Error('Not an image'));if(file.size>maxBytes)return reject(new Error('Image too large'));const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(file)})}
async function setImageSetting(file,key){try{state.settings[key]=await readImage(file);state=sanitizeState(state);shared=false;persist('Saved locally');renderAll()}catch{renderStatus('Use an image under 2.2 MB')}}
function renderSaved(){const root=$('#savedList');root.innerHTML='';const saves=store.listNamed();if(!saves.length){root.innerHTML='<p class="empty-results">No named saves yet.</p>';return}saves.forEach(({name})=>{const r=document.createElement('div');r.className='result-row';const b=document.createElement('button');b.className='text-btn';b.textContent=name;b.onclick=()=>{const loaded=store.loadNamed(name);if(loaded){state=loaded;shared=false;persist('');renderAll();close('#saveSheet')}};const d=document.createElement('button');d.className='text-btn danger-text';d.textContent='Delete';d.onclick=()=>{store.deleteNamed(name);renderSaved()};r.append(b,d);root.append(r)})}

canvas.onclick=spin;
$('#entriesInput').addEventListener('input',e=>{clearTimeout(inputTimer);inputTimer=setTimeout(()=>{active().entries=entriesFromText(e.target.value,active().entries);state=sanitizeState(state);shared=false;persist('');renderCounts();renderAdvanced();renderWheel()},90)});
$('#entriesTab').onclick=()=>setSide('entries');$('#resultsTab').onclick=()=>setSide('results');
$('#advancedToggle').onchange=e=>{advanced=e.target.checked;renderAdvanced()};
$('#shuffleBtn').onclick=()=>mutate(()=>{for(let a=active().entries,i=a.length-1;i>0;i--){const j=Math.floor(secureUnitFloat()*(i+1));[a[i],a[j]]=[a[j],a[i]]}});
$('#sortBtn').onclick=()=>mutate(()=>active().entries.sort((a,b)=>a.label.localeCompare(b.label)));
$('#clearResultsBtn').onclick=()=>mutate(()=>active().history=[],'Results cleared');
$('#customizeBtn').onclick=()=>open('#settingsSheet');$('#closeSettingsBtn').onclick=()=>close('#settingsSheet');
$('#newTopBtn').onclick=addWheel;$('#addWheelBtn').onclick=addWheel;
$('#openBtn').onclick=()=>$('#importInput').click();
$('#saveBtn').onclick=()=>{renderSaved();open('#saveSheet')};$('#closeSaveBtn').onclick=()=>close('#saveSheet');
$('#moreBtn').onclick=()=>{const menu=$('#moreMenu'),openNow=menu.classList.toggle('hidden')===false;$('#moreBtn').setAttribute('aria-expanded',String(openNow))};
$('#fullscreenTopBtn').onclick=()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.()};
$('#addImageBtn').onclick=()=>$('#imageInput').click();
$('#imageInput').onchange=async e=>{for(const file of [...e.target.files]){try{const image=await readImage(file,1300000),label=file.name.replace(/\.[^.]+$/,'');active().entries.push({...createEntry(label),image})}catch{renderStatus('Some images were skipped (max 1.3 MB each)')}}state=sanitizeState(state);shared=false;persist('');renderAll();e.target.value=''};
$('#durationInput').oninput=e=>{state.settings.spinDurationMs=Number(e.target.value);$('#durationValue').textContent=`${(state.settings.spinDurationMs/1000).toFixed(1)}s`;persist('')};
$('#paletteSelect').onchange=e=>mutate(()=>state.settings.palette=e.target.value,'');
$('#themeSelect').onchange=e=>mutate(()=>state.settings.theme=e.target.value,'');
$('#soundSelect').onchange=e=>mutate(()=>state.settings.sound=e.target.value==='true','');
$('#confettiSelect').onchange=e=>mutate(()=>state.settings.confetti=e.target.value==='true','');
$('#extraTurnsInput').oninput=e=>{state.settings.extraTurns=Number(e.target.value);persist('')};
$('#centerImageInput').onchange=e=>{const f=e.target.files[0];if(f)setImageSetting(f,'centerImage');e.target.value=''};
$('#backgroundInput').onchange=e=>{const f=e.target.files[0];if(f)setImageSetting(f,'background');e.target.value=''};
$('#clearCenterImageBtn').onclick=()=>mutate(()=>state.settings.centerImage='','');$('#clearBackgroundBtn').onclick=()=>mutate(()=>state.settings.background='','');
$('#duplicateWheelBtn').onclick=()=>{mutate(()=>{const src=active(),w=createWheel(`${src.name} copy`);w.entries=src.entries.map(e=>({...e,id:createEntry().id}));w.history=[...src.history];state.wheels.push(w);state.activeWheelId=w.id});close('#moreMenu')};
$('#deleteWheelBtn').onclick=()=>{if(state.wheels.length<=1){renderStatus('Keep at least one wheel');return}mutate(()=>{state.wheels=state.wheels.filter(w=>w.id!==state.activeWheelId);state.activeWheelId=state.wheels[0].id});close('#moreMenu')};
$('#presentBtn').onclick=()=>{document.body.classList.toggle('presentation');close('#moreMenu');renderWheel()};
$('#saveNamedBtn').onclick=()=>{const n=$('#saveName').value.trim()||active().name;if(store.saveNamed(n,state)){renderStatus(`Saved “${n}”`);renderSaved()}else renderStatus('Could not save')};
$('#shareBtn').onclick=async()=>{const r=encodeShareState(state);if(!r.ok){renderStatus('Wheel is too large for a share link. Export JSON instead.');return}const url=location.href.split('#')[0]+r.hash;try{await navigator.clipboard.writeText(url);renderStatus('Share link copied')}catch{prompt('Copy this share link',url)}};
$('#exportBtn').onclick=()=>{const blob=new Blob([exportStateJSON(state)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='wheel.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);close('#moreMenu')};
$('#importInput').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{state=parseStateJSON(await f.text());shared=false;persist('');renderAll();renderStatus('Opened wheel file')}catch{renderStatus('That wheel file is invalid')}e.target.value=''};
$('#againBtn').onclick=()=>{close('#winnerModal');spin()};$('#closeWinnerBtn').onclick=()=>close('#winnerModal');
$('#removeWinnerBtn').onclick=()=>{if(!lastWinner)return;mutate(()=>active().entries=active().entries.filter(e=>e.id!==lastWinner.id));close('#winnerModal')};
$('#removeMatchesBtn').onclick=()=>{if(!lastWinner)return;const label=lastWinner.label;mutate(()=>active().entries=active().entries.filter(e=>e.label!==label));close('#winnerModal')};

document.addEventListener('click',e=>{if(!e.target.closest('.more-wrap')){$('#moreMenu').classList.add('hidden');$('#moreBtn').setAttribute('aria-expanded','false')}});
document.addEventListener('keydown',e=>{const tag=document.activeElement?.tagName;if((e.key===' '||e.key==='Enter')&&!['INPUT','TEXTAREA','SELECT','BUTTON'].includes(tag)){e.preventDefault();spin()}if(e.key==='Escape'){close('#winnerModal');close('#settingsSheet');close('#saveSheet');$('#moreMenu').classList.add('hidden')}});
window.addEventListener('resize',renderWheel);matchMedia('(prefers-color-scheme: light)').addEventListener?.('change',applyTheme);
renderAll();if(shared)renderStatus('Shared wheel loaded. Changes will save locally.');
