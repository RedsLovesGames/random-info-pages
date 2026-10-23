/* Emperor Director / self-contained guide, delegates to original app controls. */
(()=>{
'use strict';
const modal=document.getElementById('directorHelpDialog');
const open=document.getElementById('directorHelpBtn');
const close=document.getElementById('directorHelpClose');
if(!modal||!open||!close)return;
open.addEventListener('click',()=>{modal.showModal();close.focus()});
close.addEventListener('click',()=>modal.close());
modal.addEventListener('click',e=>{if(e.target===modal)modal.close()});
for(const button of modal.querySelectorAll('[data-director-jump]')){
 button.addEventListener('click',()=>{
  const where=button.dataset.directorJump;
  modal.close();
  if(where==='scene'){
   document.getElementById('scene')?.focus();
  }else if(where==='references'){
   document.getElementById('importBtn')?.focus();
   document.getElementById('references')?.scrollIntoView({block:'nearest'});
  }else if(where==='inspector'){
   const p=document.getElementById('inspector');
   p?.classList.remove('mobile-hidden');
   const field=document.getElementById('shotPlan');
   field?.focus();field?.scrollIntoView({block:'nearest'});
  }else if(where==='commands'){
   document.getElementById('cmdBtn')?.click();
  }
 });
}
})();
