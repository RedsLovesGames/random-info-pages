/* 10Groups Heatmap / section navigation without altering the source visualizations. */
(()=>{
'use strict';
const map={combined:'combinedMap',single:'singleCircleMap',coordinates:'coordinateExplorer'};
const buttons=[...document.querySelectorAll('[data-heatmap-section]')];
if(!buttons.length)return;
buttons.forEach(button=>button.addEventListener('click',()=>{
 const target=document.getElementById(map[button.dataset.heatmapSection]);
 if(!target)return;
 if(target.tagName==='DETAILS')target.open=true;
 target.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 const focus=target.querySelector('select,summary,canvas');
 if(focus){if(focus.tagName==='CANVAS')focus.setAttribute('tabindex','-1');focus.focus({preventScroll:true})}
}));
})();
