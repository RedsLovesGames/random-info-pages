/* Historical timeline / navigate to verified events already in the dataset.
   This intentionally adds no reconstructed message counts or historical claims. */
(()=>{
'use strict';
const events=Array.isArray(window.TIMELINE_EVENTS)?window.TIMELINE_EVENTS:[];
const buttons=[...document.querySelectorAll('[data-timeline-category]')];
const host=document.getElementById('events');
if(!buttons.length||!host)return;
for(const button of buttons){
 const category=button.dataset.timelineCategory;
 const event=events.find(e=>e.category===category);
 if(!event){button.disabled=true;button.title='No source-linked event in this category';continue}
 button.addEventListener('click',()=>{
  const match=[...host.querySelectorAll('.event')].find(el=>el.dataset.id===event.id);
  if(!match)return;
  match.click(); // Existing event handler synchronizes playback, clock and source.
  document.querySelector('.workspace')?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  match.focus({preventScroll:true});
 });
}
})();
