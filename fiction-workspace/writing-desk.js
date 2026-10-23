/* Draftroom / focus and backup controls delegate to original local workspace. */
(()=>{
'use strict';
const workspace=document.getElementById('workspace');
const focus=document.getElementById('focusWriter');
const chapter=document.getElementById('newChapterQuick');
const backup=document.getElementById('backupQuick');
if(!workspace||!focus||!chapter||!backup)return;
function setFocus(on){
 workspace.classList.toggle('writer-focus',on);
 focus.setAttribute('aria-pressed',String(on));
 focus.textContent=on?'Show library ↗':'Focus mode ↗';
}
focus.addEventListener('click',()=>setFocus(!workspace.classList.contains('writer-focus')));
chapter.addEventListener('click',()=>{
 setFocus(false);
 document.getElementById('addChapter')?.click();
});
backup.addEventListener('click',()=>document.getElementById('exportBtn')?.click());
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&workspace.classList.contains('writer-focus')&&!e.defaultPrevented){
  const active=e.target;
  if(active?.closest?.('dialog,[role="dialog"]'))return;
  setFocus(false);focus.focus();
 }
});
})();
