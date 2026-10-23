/* Political Survey / selection review. Observes the existing counter.
   No changes to questionnaire content, saved data, or aggregate calculations. */
(()=>{
'use strict';
const count=document.getElementById('selection-count');
const button=document.getElementById('markedOnly'),hint=document.getElementById('markedOnlyHint');
const showAll=document.getElementById('showAllStatements'),bar=document.querySelector('.survey-progress-track');
const fill=document.getElementById('surveyProgressFill'),label=document.getElementById('surveyProgressCount');
if(!count||!button||!bar||!fill||!label||!hint||!showAll)return;
function refresh(){
 const n=Math.max(0,Math.min(100,parseInt(count.textContent||'0',10)||0));
 fill.style.width=n+'%';
 bar.setAttribute('aria-valuenow',String(n));
 label.textContent=n+' of 100';
}
const observer=new MutationObserver(refresh);
observer.observe(count,{subtree:true,childList:true,characterData:true});
function toggle(enabled){
 document.body.classList.toggle('survey-marked-only',enabled);
 button.setAttribute('aria-pressed',String(enabled));
 button.textContent=enabled?'Showing marked ✓':'Show marked only';
 hint.hidden=!enabled;
}
button.addEventListener('click',()=>toggle(button.getAttribute('aria-pressed')!=='true'));
showAll.addEventListener('click',()=>{toggle(false);button.focus()});
refresh();
})();
