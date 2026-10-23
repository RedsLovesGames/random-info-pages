/* Stock Fights / setup-to-arena UX and optional keyboard controls.
   Uses existing game actions. Does not touch match simulation or storage. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const btn=$('focusArena'),stage=$('battleArena'),help=$('experienceHelp'),open=$('controlsHelp'),close=$('closeExperienceHelp');
if(!btn||!stage||!help||!open||!close)return;
function focusArena(on){
  document.body.classList.toggle('arena-focus',on);
  btn.textContent=on?'SHOW SIDEBARS ↗':'FOCUS ◫';
  btn.setAttribute('aria-pressed',String(on));
  btn.title=on?'Restore fighter setup and roster':'Show only the fight arena';
  if(on)stage.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
btn.addEventListener('click',()=>focusArena(!document.body.classList.contains('arena-focus')));
open.addEventListener('click',()=>{help.showModal();close.focus()});
close.addEventListener('click',()=>help.close());
help.addEventListener('click',e=>{if(e.target===help)help.close()});
document.addEventListener('keydown',e=>{
 if(e.defaultPrevented||e.ctrlKey||e.altKey||e.metaKey)return;
 if(help.open)return; // Dialog owns its own Escape key.
 const el=e.target;
 if(el instanceof Element && el.closest('input,textarea,select,button,a,summary,[contenteditable="true"],[role="dialog"]'))return;
 const key=e.key.toLowerCase();
 if(key==='escape'&&document.body.classList.contains('arena-focus')){
   focusArena(false);return;
 }
 if(key==='?'||e.key==='/'){
   e.preventDefault();help.showModal();close.focus();return;
 }
 if(key==='n'){e.preventDefault();$('start')?.click();return}
 if(key==='f'){e.preventDefault();$('theater')?.click();return}
 if(key==='t'){e.preventDefault();btn.click();return}
 if(key===' '&&$('pause')&&!$('pause').disabled){e.preventDefault();$('pause').click();return}
 if(e.key==='ArrowRight'&&$('step')&&!$('step').disabled){e.preventDefault();$('step').click();}
});
})();
