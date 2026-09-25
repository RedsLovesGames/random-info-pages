import {
  loadState,saveState,zoneParts,dayDifference,shiftedNow,validHm,isAvailableAt,
  availabilitySummary,groupPeopleByLocation,peopleForLocation,projectCoordinates,
  cityCatalog,cityById,cityForZone,addPersonToState,removePersonFromState,uid,localMinutes
} from './time.js';
import {validateTimeAccess,hasTimeAccess,rememberTimeAccess,clearTimeAccess} from './time-auth.js';

let state=loadState();
const $=(selector)=>document.querySelector(selector);
const $$=(selector)=>[...document.querySelectorAll(selector)];
const accessGate=$('#accessGate'),protectedTimeApp=$('#protectedTimeApp'),loginForm=$('#loginForm'),loginUsername=$('#loginUsername'),loginPassword=$('#loginPassword'),loginMessage=$('#loginMessage'),logoutAccess=$('#logoutAccess');
const format=$('#format'),liveTime=$('#liveTime'),timelineSlider=$('#timelineSlider'),timelineLabel=$('#timelineLabel'),timelineNow=$('#timelineNow');
const locationCards=$('#locationCards'),mapMarkers=$('#mapMarkers'),locationCount=$('#locationCount'),mapMoment=$('#mapMoment'),dayNightGlow=$('#dayNightGlow'),referenceName=$('#referenceName'),referenceTime=$('#referenceTime');
const plannerSummary=$('#plannerSummary'),plannerGrid=$('#plannerGrid'),peopleBoard=$('#peopleBoard');
const personDialog=$('#personDialog'),personForm=$('#personForm'),personId=$('#personId'),personName=$('#personName'),personCity=$('#personCity'),personAvailableStart=$('#personAvailableStart'),personAvailableEnd=$('#personAvailableEnd'),personMessage=$('#personMessage'),removePersonButton=$('#removePerson');

function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function currentDate(){return shiftedNow(state.offsetMinutes)}
function referenceLocation(){return state.locations.find(location=>location.id===state.referenceLocationId)||state.locations[0]}
function locationForPerson(person){return state.locations.find(location=>location.id===person.locationId)}
function timeText(parts){return `${parts.hour}:${parts.minute}${state.format24?'':` ${parts.dayPeriod||''}`}`.trim()}
function dateText(parts){return `${parts.weekday}, ${parts.month} ${Number(parts.day)}`}
function dayLabel(value){return value===0?'Same day':value>0?`+${value} day${value===1?'':'s'}`:`${value} day${value===-1?'':'s'}`}
function formatOffsetMinutes(minutes){
  if(!minutes)return 'Base';const sign=minutes>0?'+':'−';const abs=Math.abs(minutes);const h=Math.floor(abs/60),m=abs%60;
  return `${sign}${h}${m?`h ${m}m`:'h'}`;
}
function formatTimelineOffset(minutes){
  if(minutes===0)return 'Now';const sign=minutes>0?'+':'−',abs=Math.abs(minutes),days=Math.floor(abs/1440),hours=Math.floor((abs%1440)/60),mins=abs%60;
  const chunks=[];if(days)chunks.push(`${days}d`);if(hours)chunks.push(`${hours}h`);if(mins)chunks.push(`${mins}m`);return `${sign}${chunks.join(' ')}`;
}
function relativeOffsetMinutes(date,location,reference){
  const local=localMinutes(date,location.zone),ref=localMinutes(date,reference.zone),day=dayDifference(date,location.zone,reference.zone);
  return local-ref+day*1440;
}
function availabilityForPerson(person,date){
  const location=locationForPerson(person);if(!location||!person.availableStart||!person.availableEnd)return null;
  return isAvailableAt(date,location.zone,person.availableStart,person.availableEnd);
}
function availabilityText(person,date){
  const available=availabilityForPerson(person,date);
  if(available===null)return 'No hours set';
  return available?`Available · ${person.availableStart}–${person.availableEnd}`:`Outside hours · ${person.availableStart}–${person.availableEnd}`;
}

function unlockTimeApp({remember=true}={}){
  if(remember)rememberTimeAccess();accessGate.hidden=true;protectedTimeApp.hidden=false;loginMessage.classList.remove('error');loginPassword.value='';render();
}
function lockTimeApp({forget=true}={}){
  if(forget)clearTimeAccess();if(personDialog.open)personDialog.close('locked');protectedTimeApp.hidden=true;accessGate.hidden=false;loginPassword.value='';loginMessage.textContent='Access is remembered on this browser.';loginMessage.classList.remove('error');requestAnimationFrame(()=>loginUsername.focus());
}

function populateCities(){
  personCity.innerHTML=cityCatalog.map(city=>`<option value="${esc(city.id)}">${esc(city.label)} · ${esc(city.country)} · ${esc(city.zone)}</option>`).join('');
}

function setView(view,{save=true}={}){
  state.activeView=['map','planner','board'].includes(view)?view:'map';
  $$('.time-view-tab').forEach(button=>{const active=button.dataset.view===state.activeView;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});
  $$('[data-view-panel]').forEach(panel=>panel.hidden=panel.dataset.viewPanel!==state.activeView);
  if(save)saveState(state);
}

function renderLocationCards(date,groups,reference){
  locationCards.innerHTML=groups.map(group=>{
    const parts=zoneParts(date,group.zone,state.format24);const relative=relativeOffsetMinutes(date,group,reference);const isRef=group.id===reference.id;
    const people=group.people.map(person=>{
      const available=availabilityForPerson(person,date);return `<button class="location-person ${available===true?'available':available===false?'unavailable':''}" type="button" data-person-id="${esc(person.id)}"><span class="person-presence"></span><span>${esc(person.name)}</span><small>${available===true?'available':available===false?'outside hours':'hours unset'}</small></button>`;
    }).join('');
    return `<article class="location-card ${isRef?'reference':''}" data-location-id="${esc(group.id)}">
      <button class="location-card-main" type="button" data-location-ref="${esc(group.id)}" aria-label="Use ${esc(group.label)} as reference">
        <div class="location-card-meta"><span class="offset-chip ${isRef?'base':''}">${isRef?'● BASE':formatOffsetMinutes(relative)}</span><strong>${esc(group.label)}</strong><span>${esc(group.country||group.zone)}</span><em>${dateText(parts)}</em></div>
        <time>${timeText(parts)}</time>
      </button>
      <div class="location-people"><div class="location-people-head"><span>${group.people.length} ${group.people.length===1?'person':'people'}</span><span>${esc(group.zone)}</span></div>${people}</div>
    </article>`;
  }).join('');
}

function renderMapMarkers(date,groups,reference){
  mapMarkers.innerHTML=groups.map(group=>{
    const {x,y}=projectCoordinates(group.lat,group.lon,1000,500);const parts=zoneParts(date,group.zone,state.format24);const isRef=group.id===reference.id;const names=group.people.map(person=>person.name).join(' · ');
    const labelWidth=Math.min(230,Math.max(112,70+names.length*5));const labelX=x>760?-(labelWidth+14):14;const labelY=y<70?12:-18;
    return `<g class="map-marker ${isRef?'reference':''}" data-location-id="${esc(group.id)}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" tabindex="0" role="button" aria-label="${esc(group.label)}, ${esc(timeText(parts))}, ${group.people.length} people">
      <circle class="marker-ring" r="11"></circle><circle class="marker-dot" r="5" filter="url(#markerGlow)"></circle>
      <g class="marker-label" transform="translate(${labelX} ${labelY})"><rect width="${labelWidth}" height="43" rx="6"></rect><text x="9" y="15">${esc(group.label.toUpperCase())} · ${group.people.length}</text><text class="marker-time" x="9" y="32">${esc(timeText(parts))} · ${esc(names)}</text></g>
    </g>`;
  }).join('');
  locationCount.textContent=`${groups.length} ${groups.length===1?'location':'locations'} · ${state.people.length} ${state.people.length===1?'person':'people'}`;
}

function renderDayNight(date){
  const utcMinutes=date.getUTCHours()*60+date.getUTCMinutes();let sunLon=180-utcMinutes/4;while(sunLon>180)sunLon-=360;while(sunLon<-180)sunLon+=360;
  const {x}=projectCoordinates(0,sunLon,1000,500);dayNightGlow.setAttribute('cx',x.toFixed(1));
}

function renderTimeline(date,reference){
  timelineSlider.value=String(state.offsetMinutes);timelineLabel.textContent=formatTimelineOffset(state.offsetMinutes);mapMoment.textContent=state.offsetMinutes===0?'Live now':`${formatTimelineOffset(state.offsetMinutes)} from now`;
  liveTime.classList.toggle('active',state.offsetMinutes===0);timelineNow.classList.toggle('active',state.offsetMinutes===0);
  const parts=zoneParts(date,reference.zone,state.format24);referenceName.textContent=reference.label;referenceTime.textContent=timeText(parts);
}

function hourCell(date,person,location,offsetHours){
  const sample=new Date(date.getTime()+offsetHours*3600000);const p=zoneParts(sample,location.zone,true);const available=availabilityForPerson(person,sample);return `<div class="planner-cell ${available===true?'available':available===false?'outside':''}" title="${esc(person.name)} · ${p.hour}:${p.minute}${available===true?' · available':available===false?' · outside hours':''}"><span>${p.hour}</span></div>`;
}
function renderPlanner(date){
  const summary=availabilitySummary(date,state);const configured=summary.configured;
  plannerSummary.innerHTML=`<div><span class="summary-label">At selected time</span><strong>${configured?`${summary.available}/${configured}`:'—'}</strong><span>${configured?'configured people available':'Set availability hours on people to calculate overlap.'}</span></div><div><span class="summary-label">Selected instant</span><strong>${esc(formatTimelineOffset(state.offsetMinutes))}</strong><span>${date.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</span></div>`;
  const header=Array.from({length:24},(_,i)=>`<div class="planner-hour-head">${i===0?'Now':`+${i}h`}</div>`).join('');
  const rows=state.people.map(person=>{const location=locationForPerson(person);if(!location)return'';const parts=zoneParts(date,location.zone,state.format24);return `<div class="planner-row" data-person-id="${esc(person.id)}"><button class="planner-person" type="button" data-person-id="${esc(person.id)}"><strong>${esc(person.name)}</strong><span>${esc(location.label)}</span><em>${esc(timeText(parts))}</em></button><div class="planner-hours">${Array.from({length:24},(_,i)=>hourCell(date,person,location,i)).join('')}</div></div>`;}).join('');
  plannerGrid.innerHTML=`<div class="planner-axis"><div></div><div class="planner-hours">${header}</div></div>${rows}`;
}

function renderBoard(date,groups,reference){
  peopleBoard.innerHTML=groups.map(group=>{
    const parts=zoneParts(date,group.zone,state.format24),relative=relativeOffsetMinutes(date,group,reference),isRef=group.id===reference.id;
    const people=group.people.map(person=>{const available=availabilityForPerson(person,date);return `<article class="board-person ${available===true?'available':available===false?'unavailable':''}" data-person-id="${esc(person.id)}"><div><span class="person-presence"></span><strong>${esc(person.name)}</strong><small>${esc(availabilityText(person,date))}</small></div><button class="compact-control" type="button" data-person-id="${esc(person.id)}">Edit</button></article>`;}).join('');
    return `<section class="board-location ${isRef?'reference':''}" data-location-id="${esc(group.id)}"><header><button type="button" data-location-ref="${esc(group.id)}"><span>${isRef?'● BASE':formatOffsetMinutes(relative)}</span><strong>${esc(group.label)}</strong><small>${esc(group.country)} · ${esc(group.zone)}</small></button><time>${esc(timeText(parts))}<small>${esc(dateText(parts))}</small></time></header><div class="board-people">${people}</div></section>`;
  }).join('');
}

function render(){
  if(!state.locations.length||!state.people.length)return;
  const date=currentDate(),reference=referenceLocation(),groups=groupPeopleByLocation(state);
  format.textContent=state.format24?'24h':'12h';
  renderLocationCards(date,groups,reference);renderMapMarkers(date,groups,reference);renderDayNight(date);renderTimeline(date,reference);renderPlanner(date);renderBoard(date,groups,reference);setView(state.activeView,{save:false});saveState(state);
}

function cityIdForLocation(location){return cityCatalog.find(city=>city.zone===location.zone&&city.label===location.label)?.id||cityCatalog.find(city=>city.zone===location.zone)?.id||cityCatalog[0].id}
function openPersonDialog(id=null){
  personMessage.textContent='People in the same time zone are automatically grouped together. Availability is optional and can cross midnight.';personMessage.classList.remove('error');removePersonButton.hidden=!id;
  if(id){const person=state.people.find(item=>item.id===id);if(!person)return;const location=locationForPerson(person);personId.value=person.id;personName.value=person.name;personCity.value=cityIdForLocation(location);personAvailableStart.value=person.availableStart||'';personAvailableEnd.value=person.availableEnd||'';$('#personDialogTitle').textContent='Edit person';$('#personDialogEyebrow').textContent=location?.label||'Person';}
  else{personId.value='';personName.value='';personCity.value=cityCatalog[0].id;personAvailableStart.value='';personAvailableEnd.value='';$('#personDialogTitle').textContent='Add person';$('#personDialogEyebrow').textContent='Person';}
  if(!personDialog.open)personDialog.showModal();requestAnimationFrame(()=>personName.focus());
}
function cleanUnusedLocations(){
  const used=new Set(state.people.map(person=>person.locationId));state.locations=state.locations.filter(location=>used.has(location.id));if(!state.locations.some(location=>location.id===state.referenceLocationId))state.referenceLocationId=state.locations[0]?.id||null;
}
function saveEditedPerson(person,{name,cityId,start,end}){
  const city=cityById(cityId);if(!city)return false;let location=state.locations.find(item=>item.zone===city.zone);
  if(!location){location={...city,id:city.id};if(state.locations.some(item=>item.id===location.id))location.id=`${city.id}-${uid('loc').slice(-6)}`;state.locations.push(location);}
  person.name=name;person.locationId=location.id;person.availableStart=start||null;person.availableEnd=end||null;cleanUnusedLocations();return true;
}

function handleLocationReference(id){if(!state.locations.some(location=>location.id===id))return;state.referenceLocationId=id;render();}
function handleDelegatedClick(event){
  const person=event.target.closest('[data-person-id]');if(person&&['BUTTON'].includes(person.tagName)){openPersonDialog(person.dataset.personId);return;}
  const reference=event.target.closest('[data-location-ref]');if(reference){handleLocationReference(reference.dataset.locationRef);return;}
  const marker=event.target.closest('.map-marker[data-location-id]');if(marker){handleLocationReference(marker.dataset.locationId);const card=locationCards.querySelector(`[data-location-id="${CSS.escape(marker.dataset.locationId)}"]`);card?.scrollIntoView({behavior:'smooth',block:'nearest'});}
}

$$('.time-view-tab').forEach(button=>button.addEventListener('click',()=>{setView(button.dataset.view);render();}));
$$('[data-open-person]').forEach(button=>button.addEventListener('click',()=>openPersonDialog()));
$('#addPerson').addEventListener('click',()=>openPersonDialog());
locationCards.addEventListener('click',handleDelegatedClick);mapMarkers.addEventListener('click',handleDelegatedClick);peopleBoard.addEventListener('click',handleDelegatedClick);plannerGrid.addEventListener('click',handleDelegatedClick);
mapMarkers.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.matches('.map-marker')){event.preventDefault();handleLocationReference(event.target.dataset.locationId);}});

timelineSlider.addEventListener('input',()=>{state.offsetMinutes=+timelineSlider.value;render();});
function resetNow(){state.offsetMinutes=0;timelineSlider.value='0';render();}
timelineNow.addEventListener('click',resetNow);liveTime.addEventListener('click',resetNow);
format.addEventListener('click',()=>{state.format24=!state.format24;render();});

personForm.addEventListener('submit',event=>{
  event.preventDefault();const name=personName.value.trim(),cityId=personCity.value,start=personAvailableStart.value,end=personAvailableEnd.value;personMessage.classList.remove('error');
  if(!name){personMessage.textContent='Name is required.';personMessage.classList.add('error');return;}
  if((start||end)&&!(validHm(start)&&validHm(end))){personMessage.textContent='Set both availability times, or leave both blank.';personMessage.classList.add('error');return;}
  if(personId.value){const person=state.people.find(item=>item.id===personId.value);if(!person||!saveEditedPerson(person,{name,cityId,start,end}))return;}
  else state=addPersonToState(state,{name,cityId,availableStart:start,availableEnd:end});
  personDialog.close('saved');render();
});
removePersonButton.addEventListener('click',()=>{if(!personId.value)return;state=removePersonFromState(state,personId.value);personDialog.close('removed');render();});
$('#cancelPerson').addEventListener('click',()=>personDialog.close('cancel'));

loginForm.addEventListener('submit',async event=>{
  event.preventDefault();const submit=loginForm.querySelector('button[type="submit"]');submit.disabled=true;loginMessage.textContent='Checking access…';loginMessage.classList.remove('error');
  try{if(await validateTimeAccess(loginUsername.value,loginPassword.value))unlockTimeApp();else{loginMessage.textContent='Incorrect username or password.';loginMessage.classList.add('error');loginPassword.select();}}finally{submit.disabled=false;}
});
logoutAccess.addEventListener('click',()=>lockTimeApp());

populateCities();setView(state.activeView,{save:false});render();
if(hasTimeAccess())unlockTimeApp({remember:false});else lockTimeApp({forget:false});
setInterval(()=>{if(!protectedTimeApp.hidden&&state.offsetMinutes===0)render();},30000);
