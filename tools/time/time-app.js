import {loadState,saveState,zoneParts,dayDifference,shiftedNow,uid,validZone,validHm,commonZones,isAvailableAt,availabilitySummary,moveClock} from './time.js';
import {validateTimeAccess,hasTimeAccess,rememberTimeAccess,clearTimeAccess} from './time-auth.js';

let state=loadState();
const $=(selector)=>document.querySelector(selector);
const accessGate=$('#accessGate'),protectedTimeApp=$('#protectedTimeApp'),loginForm=$('#loginForm'),loginUsername=$('#loginUsername'),loginPassword=$('#loginPassword'),loginMessage=$('#loginMessage'),logoutAccess=$('#logoutAccess');
const clocks=$('#clocks'),slider=$('#slider'),offsetLabel=$('#offsetLabel'),format=$('#format'),message=$('#message'),zones=$('#zones');
const overlap=$('#overlap'),overlapSummary=$('#overlapSummary'),overlapPeople=$('#overlapPeople');
const dialog=$('#clockDialog'),editForm=$('#editForm'),editId=$('#editId'),editName=$('#editName'),editZone=$('#editZone'),availableStart=$('#availableStart'),availableEnd=$('#availableEnd'),editMessage=$('#editMessage');

function esc(value){return String(value).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function populateZones(){for(const z of commonZones){const o=document.createElement('option');o.value=z;zones.append(o);}const editList=$('#editZones');for(const z of commonZones){const o=document.createElement('option');o.value=z;editList.append(o);}}
function dayLabel(value){return value===0?'Same day':value>0?`+${value} day${value===1?'':'s'}`:`${value} day${value===-1?'':'s'}`;}
function availabilityLabel(clock,date){if(!clock.availableStart||!clock.availableEnd)return{className:'',text:'No availability hours set'};const on=isAvailableAt(date,clock.zone,clock.availableStart,clock.availableEnd);return{className:on?'on':'',text:`${on?'Available':'Outside hours'} · ${clock.availableStart}–${clock.availableEnd}`};}

function unlockTimeApp({remember=true}={}){
  if(remember)rememberTimeAccess();
  accessGate.hidden=true;
  protectedTimeApp.hidden=false;
  loginMessage.classList.remove('error');
  loginPassword.value='';
}

function lockTimeApp({forget=true}={}){
  if(forget)clearTimeAccess();
  if(dialog.open)dialog.close('locked');
  protectedTimeApp.hidden=true;
  accessGate.hidden=false;
  loginPassword.value='';
  loginMessage.textContent='Access is remembered on this browser.';
  loginMessage.classList.remove('error');
  requestAnimationFrame(()=>loginUsername.focus());
}

function renderOverlap(date){const summary=availabilitySummary(date,state.clocks);if(!summary.configured){overlap.hidden=true;return;}overlap.hidden=false;overlapSummary.textContent=summary.allAvailable?`All ${summary.configured} configured clocks overlap`:`${summary.available} of ${summary.configured} configured clocks available`;overlapPeople.innerHTML=summary.items.map(item=>`<span class="overlap-person ${item.available?'on':''}">${esc(item.name)} · ${item.available?'available':'outside hours'}</span>`).join('');}

function render(){
  const date=shiftedNow(+state.offsetHours);const ref=state.clocks.find(c=>c.id===state.referenceId)||state.clocks[0];
  offsetLabel.textContent=+state.offsetHours===0?'Now':`${+state.offsetHours>0?'+':''}${state.offsetHours} hours`;
  format.textContent=state.format24?'24 hour':'12 hour';
  clocks.innerHTML=state.clocks.map((c,index)=>{
    try{
      const p=zoneParts(date,c.zone,state.format24),d=dayDifference(date,c.zone,ref.zone),availability=availabilityLabel(c,date);
      return`<article class="clock ${c.id===ref.id?'ref':''} ${availability.className==='on'?'available':''}">
        <div class="clock-top"><div><div class="clock-name">${esc(c.name)}</div><div class="clock-zone">${esc(c.zone)}</div></div>
        <div class="clock-actions">
          <button class="icon" data-ref="${esc(c.id)}" title="Use as reference" aria-label="Use ${esc(c.name)} as reference">◎</button>
          <button class="icon" data-edit="${esc(c.id)}" title="Edit" aria-label="Edit ${esc(c.name)}">✎</button>
          <button class="icon" data-move="-1" data-id="${esc(c.id)}" title="Move earlier" aria-label="Move ${esc(c.name)} earlier" ${index===0?'disabled':''}>↑</button>
          <button class="icon" data-move="1" data-id="${esc(c.id)}" title="Move later" aria-label="Move ${esc(c.name)} later" ${index===state.clocks.length-1?'disabled':''}>↓</button>
          ${state.clocks.length>1?`<button class="icon" data-remove="${esc(c.id)}" title="Remove" aria-label="Remove ${esc(c.name)}">×</button>`:''}
        </div></div>
        <div class="clock-time">${p.hour}:${p.minute}${state.format24?'':` <small style="font-size:.25em;letter-spacing:0">${p.dayPeriod||''}</small>`}</div>
        <div class="clock-date">${p.weekday}, ${p.month} ${p.day}</div>
        <div class="clock-bottom"><span>${esc(p.timeZoneName||'')}</span><span>${dayLabel(d)}</span></div>
        <div class="clock-hours ${availability.className}">${availability.text}</div>
      </article>`;
    }catch(error){return`<article class="clock"><div class="error">${esc(error.message)}</div></article>`;}
  }).join('');
  renderOverlap(date);saveState(state);
}

function openEdit(id){const clock=state.clocks.find(c=>c.id===id);if(!clock)return;editId.value=clock.id;editName.value=clock.name;editZone.value=clock.zone;availableStart.value=clock.availableStart||'';availableEnd.value=clock.availableEnd||'';editMessage.textContent='Availability is optional. Overnight windows such as 22:00–06:00 are supported.';editMessage.classList.remove('error');if(!dialog.open)dialog.showModal();}

slider.value=state.offsetHours;
populateZones();
slider.addEventListener('input',()=>{state.offsetHours=+slider.value;render();});
$('#now').addEventListener('click',()=>{state.offsetHours=0;slider.value=0;render();});
format.addEventListener('click',()=>{state.format24=!state.format24;render();});

clocks.addEventListener('click',(event)=>{
  const reference=event.target.closest('[data-ref]');const remove=event.target.closest('[data-remove]');const edit=event.target.closest('[data-edit]');const move=event.target.closest('[data-move]');
  if(reference){state.referenceId=reference.dataset.ref;render();return;}
  if(edit){openEdit(edit.dataset.edit);return;}
  if(move){state.clocks=moveClock(state.clocks,move.dataset.id,+move.dataset.move);render();return;}
  if(remove){state.clocks=state.clocks.filter(c=>c.id!==remove.dataset.remove);if(state.referenceId===remove.dataset.remove)state.referenceId=state.clocks[0].id;render();}
});

$('#addForm').addEventListener('submit',(event)=>{
  event.preventDefault();const name=$('#name'),zone=$('#zone');message.classList.remove('error');
  if(state.clocks.length>=16){message.textContent='Clock limit reached.';message.classList.add('error');return;}
  if(!validZone(zone.value.trim())){message.textContent='That time zone is not supported. Use an IANA zone such as America/New_York.';message.classList.add('error');return;}
  state.clocks.push({id:uid(),name:name.value.trim(),zone:zone.value.trim(),availableStart:null,availableEnd:null});name.value='';zone.value='';message.textContent='Clock added. Saved locally. Use Edit to add availability hours.';render();
});

editForm.addEventListener('submit',(event)=>{
  event.preventDefault();const id=editId.value;const clock=state.clocks.find(c=>c.id===id);if(!clock)return;
  const name=editName.value.trim(),zone=editZone.value.trim(),start=availableStart.value,end=availableEnd.value;editMessage.classList.remove('error');
  if(!name){editMessage.textContent='Name is required.';editMessage.classList.add('error');return;}
  if(!validZone(zone)){editMessage.textContent='That time zone is not supported.';editMessage.classList.add('error');return;}
  if((start||end)&&!(validHm(start)&&validHm(end))){editMessage.textContent='Set both availability start and end, or leave both blank.';editMessage.classList.add('error');return;}
  clock.name=name.slice(0,28);clock.zone=zone;clock.availableStart=start||null;clock.availableEnd=end||null;dialog.close('saved');render();
});
$('#clearHours').addEventListener('click',()=>{availableStart.value='';availableEnd.value='';editMessage.textContent='Availability hours cleared. Save to apply.';});
$('#cancelEdit').addEventListener('click',()=>dialog.close('cancel'));

loginForm.addEventListener('submit',async(event)=>{
  event.preventDefault();
  const submit=loginForm.querySelector('button[type="submit"]');
  submit.disabled=true;
  loginMessage.textContent='Checking access…';
  loginMessage.classList.remove('error');
  try{
    if(await validateTimeAccess(loginUsername.value,loginPassword.value)){
      unlockTimeApp();
    }else{
      loginMessage.textContent='Incorrect username or password.';
      loginMessage.classList.add('error');
      loginPassword.select();
    }
  }finally{submit.disabled=false;}
});
logoutAccess.addEventListener('click',()=>lockTimeApp());

render();
if(hasTimeAccess())unlockTimeApp({remember:false});else lockTimeApp({forget:false});
setInterval(()=>{if(!protectedTimeApp.hidden&&+state.offsetHours===0)render();},30000);
