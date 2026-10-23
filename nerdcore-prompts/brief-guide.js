/* Nerdcore Prompt Builder / observability for the two required creative inputs. */
(()=>{
'use strict';
const character=document.getElementById('character');
const thesis=document.getElementById('thesis');
const count=document.getElementById('promptProgressCount');
const bar=document.querySelector('.prompt-progress-track');
const fill=document.getElementById('promptProgressFill');
if(!character||!thesis||!count||!bar||!fill)return;
function refresh(){
 const n=Number(Boolean(character.value.trim()))+Number(Boolean(thesis.value.trim()));
 count.textContent=n+' / 2 essentials';
 bar.setAttribute('aria-valuenow',String(n));
 fill.style.width=(n/2*100)+'%';
}
for(const el of [character,thesis])el.addEventListener('input',refresh);
const reset=document.getElementById('resetBtn');
reset?.addEventListener('click',()=>queueMicrotask(refresh));
const load=document.getElementById('loadBtn');
load?.addEventListener('click',()=>queueMicrotask(refresh));
window.addEventListener('hashchange',refresh);
refresh();
})();
