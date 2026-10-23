/* WhenWeMeet starter configurations. Never creates or shares a room automatically. */
(()=>{
'use strict';
const presets={
 study:{title:'Study session',start:'960',end:'1320',duration:'60',slot:'30',weekdays:true},
 dinner:{title:'Dinner plans',start:'1020',end:'1320',duration:'90',slot:'30',weekdays:false},
 hangout:{title:'Group hangout',start:'720',end:'1320',duration:'120',slot:'30',weekdays:false}
};
const buttons=[...document.querySelectorAll('[data-event-preset]')];
const $=id=>document.getElementById(id);
const status=$('eventPresetStatus'),form=$('create-form');
if(!status||!form||!buttons.length)return;
function setValue(id,value){
 const el=$(id);if(!el)return;
 if(el.value===value)return;
 el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));
}
buttons.forEach(button=>button.addEventListener('click',()=>{
 const key=button.dataset.eventPreset,config=presets[key];
 if(!config)return;
 const title=$('event-title');
 // Never overwrite someone's custom event name.
 if(title&&!title.value.trim()){title.value=config.title;title.dispatchEvent(new Event('input',{bubbles:true}))}
 const weekdays=$('weekdays-only');
 if(weekdays&&weekdays.checked!==config.weekdays){
  weekdays.checked=config.weekdays;
  weekdays.dispatchEvent(new Event('change',{bubbles:true}));
 }
 setValue('start-time',config.start);
 setValue('end-time',config.end);
 setValue('meeting-duration',config.duration);
 setValue('slot-size',config.slot);
 buttons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 status.textContent='Starting settings applied. Choose the actual dates below, review the details, then create your event.';
 $('date-start')?.focus();
}));
form.addEventListener('input',e=>{
 if(!e.target.closest('input,select'))return;
 // Edited values no longer imply that any suggested template matches exactly.
 buttons.forEach(b=>b.setAttribute('aria-pressed','false'));
});
})();
