/* Belief Atlas / direct paths to existing evidence controls, not factual claims. */
(()=>{
'use strict';
const actions=[...document.querySelectorAll('[data-research-path]')];
const status=document.getElementById('statusFilter');
const summary=document.getElementById('researchFlowSummary');
const count=document.getElementById('reviewCount');
if(!actions.length||!status||!summary||!count)return;
const scrollTo=id=>document.getElementById(id)?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
function update(){
 const value=Number((count.textContent||'').replace(/,/g,''))||0;
 summary.textContent=value.toLocaleString()+' pairing'+(value===1?'':'s')+' with locally recorded research · Data stays in this browser.';
}
new MutationObserver(update).observe(count,{childList:true,characterData:true,subtree:true});
actions.forEach(button=>button.addEventListener('click',()=>{
 const action=button.dataset.researchPath;
 if(action==='unresearched'||action==='researched'){
  status.value=action;status.dispatchEvent(new Event('change',{bubbles:true}));scrollTo('matrix');
  status.focus({preventScroll:true});
 }else{
  scrollTo(action==='people'?'people':'method');
  document.querySelector('#'+(action==='people'?'people':'method')+' h2')?.setAttribute('tabindex','-1');
  document.querySelector('#'+(action==='people'?'people':'method')+' h2')?.focus({preventScroll:true});
 }
}));
update();
})();
