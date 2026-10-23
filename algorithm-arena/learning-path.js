/* Algorithm Visualizer / educational launchers. Delegates all simulation to app.js */
(()=>{
'use strict';
const cards=[...document.querySelectorAll('[data-learning]')];
if(!cards.length)return;
const reduce=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const go=id=>document.getElementById(id)?.scrollIntoView({block:'start',behavior:reduce()?'instant':'smooth'});
const setInput=(id,value,event='change')=>{
 const el=document.getElementById(id);if(!el)return;
 if(el.value!==value){el.value=value;el.dispatchEvent(new Event(event,{bubbles:true}))}
};
cards.forEach(btn=>btn.addEventListener('click',()=>{
 const lesson=btn.dataset.learning;
 if(lesson==='sort-random'||lesson==='sort-reverse'){
  setInput('arraySize','32','input');
  setInput('distribution',lesson==='sort-reverse'?'reversed':'random');
  document.getElementById('generateArray')?.click();
  // Wait for app.js to create and reset the same input for all six comparisons.
  document.getElementById('runSorts')?.click();
  go('sorting');
 }else if(lesson==='path-weight'){
  setInput('pathAlgorithm','dijkstra');
  setInput('editMode','weight');
  document.getElementById('makeMaze')?.click();
  go('pathfinding');
  const help=document.getElementById('pathStatus');
  if(help)help.textContent='Edit weighted ground, then select Search grid to compare a route.';
 }
}));
})();
