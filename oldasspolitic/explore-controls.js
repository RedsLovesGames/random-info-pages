/* Filter presets layered on top of the existing Congress explorer. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const inputs=['search','chamber','party','sort'].map($);
const buttons=[...document.querySelectorAll('[data-congress-preset]')];
const clear=$('clearCongressFilters');
if(inputs.some(x=>!x)||!buttons.length||!clear)return;
const [search,chamber,party,sort]=inputs;
function change(select,value){
 if(select.value!==value){select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}))}
}
function sync(){
 buttons.forEach(button=>{
  const action=button.dataset.congressPreset;
  const selected=action==='all'?chamber.value==='all'&&party.value==='all'&&search.value==='':
    action==='House'||action==='Senate'?chamber.value===action:
    sort.value===action;
  button.setAttribute('aria-pressed',String(selected));
 });
}
buttons.forEach(button=>button.addEventListener('click',()=>{
 const action=button.dataset.congressPreset;
 if(action==='all'){chamber.value='all';party.value='all';search.value='';chamber.dispatchEvent(new Event('change',{bubbles:true}))}
 else if(action==='House'||action==='Senate'){change(chamber,action)}
 else {change(sort,action)}
 sync();
}));
clear.addEventListener('click',()=>{
 search.value='';chamber.value='all';party.value='all';sort.value='ageDesc';
 search.dispatchEvent(new Event('input',{bubbles:true}));sync();search.focus()
});
[search,chamber,party,sort].forEach(el=>el.addEventListener(el===search?'input':'change',sync));
sync();
})();
