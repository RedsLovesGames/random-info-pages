/* Infrastructure Atlas wayfinder: adapts to existing four dashboard tabs. */
(()=>{
'use strict';
const buttons=[...document.querySelectorAll('[data-atlas-view]')];
const tabs=[...document.querySelectorAll('.nav [data-tab]')];
const jump=document.getElementById('atlasMethodJump');
if(!buttons.length||!tabs.length||!jump)return;
function navigate(view){
 const tab=tabs.find(b=>b.dataset.tab===view);
 if(!tab)return;
 tab.click(); // Existing atlas switchTab retains chart initialization.
 const panel=document.getElementById('view-'+view);
 panel?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 const first=panel?.querySelector('h2');
 if(first){first.setAttribute('tabindex','-1');first.focus({preventScroll:true})}
}
buttons.forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.atlasView)));
jump.addEventListener('click',()=>{
 navigate('map');
 const details=document.querySelector('#view-map .method-panel');
 if(details){
  details.open=true;
  details.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  details.querySelector('summary')?.focus({preventScroll:true});
 }
});
})();
