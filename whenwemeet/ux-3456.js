(() => {
  const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  let data=null;
  function heatColor(ratio){const r=Math.max(0,Math.min(1,Number(ratio)||0));return `hsl(${(8+r*132).toFixed(1)} 72% ${(96-r*45).toFixed(1)}%)`;}
  function roomCode(ref=state.roomRef){const raw=String(ref||'').replace(/^[^:]+:/,'').replace(/[^a-z0-9]/gi,'').toUpperCase();return raw?`${raw.slice(0,4)}-${raw.slice(4,8)}`:'----';}
  function fillRange(a,b,value=Number(document.querySelector('.brush.active')?.dataset.brush??2)){
    if(!a||!b||a.dataset.date!==b.dataset.date)return 0;const lo=Math.min(+a.dataset.minute,+b.dataset.minute),hi=Math.max(+a.dataset.minute,+b.dataset.minute);let n=0;
    document.querySelectorAll('#availability-grid .slot-cell').forEach(c=>{if(c.dataset.date!==a.dataset.date||+c.dataset.minute<lo||+c.dataset.minute>hi||c.disabled)return;const k=c.dataset.key;if(value>0)state.draftSlots[k]=value;else delete state.draftSlots[k];setCellVisual(c,value);n++;});
    state.dirty=true;updateCoverage();updateSaveState();scheduleSave();return n;
  }
  async function applyLockedPreset(person){
    if(!data)data=await fetch('./schedule-data.json?v=20260924e',{cache:'no-store'}).then(r=>r.json());const p=data.people.find(x=>x.toLowerCase()===String(person).toLowerCase());if(!p)return false;
    state.participantName=p;state.participantId=`name:${p.trim().toLowerCase().replace(/\s+/g,'-')}`;state.draftSlots={};slotKeysForEvent(state.event).forEach(k=>state.draftSlots[k]=2);
    data.events.filter(e=>e.person===p&&e.counted).forEach(e=>state.event.dates.forEach(date=>{if(DAYS[new Date(`${date}T12:00:00`).getDay()]!==e.day)return;for(let m=state.event.startMinute;m<state.event.endMinute;m+=state.event.slotMinutes)if(m<e.end&&m+state.event.slotMinutes>e.start)delete state.draftSlots[`${date}|${m}`];}));
    localStorage.setItem(participantStorageKey(state.roomRef),JSON.stringify({id:state.participantId,name:p}));document.querySelector('#join-card').hidden=true;renderAvailabilityGrid();state.dirty=true;updateSaveState();scheduleSave();toast(`${p}'s locked schedule applied. Edit any exceptions.`);return true;
  }
  window.WhenWeMeetUX3456={fillRange,heatColor,roomCode,applyLockedPreset};
})();