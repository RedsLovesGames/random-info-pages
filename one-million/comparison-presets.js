/* One Million / mathematically exact examples through original input handlers. */
(()=>{
'use strict';
const examples={
 percents:{den:1000000,values:[100000,10000,1000],title:'10%, 1%, and 0.1% of one million'},
 million:{den:1000000,values:[1,10,100],title:'1, 10, and 100 in one million'},
 group:{den:10000,values:[250,500,1000],title:'250, 500, and 1,000 among 10,000'}
};
const buttons=[...document.querySelectorAll('[data-scale-example]')];
const denominator=document.getElementById('denominator');
const quantities=[0,1,2].map(i=>document.getElementById('quantity'+i));
const status=document.getElementById('scaleExampleStatus');
if(!buttons.length||!denominator||quantities.some(x=>!x)||!status)return;
buttons.forEach(button=>button.addEventListener('click',()=>{
 const example=examples[button.dataset.scaleExample];
 if(!example)return;
 denominator.value=String(example.den);
 quantities.forEach((input,i)=>input.value=String(example.values[i]));
 // Original commitInputs reads all values and updates canvas, accessible
 // comparison table, percentages and share-link state in one pass.
 quantities[2].dispatchEvent(new Event('input',{bubbles:true}));
 buttons.forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
 status.textContent='Showing '+example.title+'. Change any value to explore your own proportions.';
 document.querySelector('.scale-steps button[data-exponent="6"]')?.click();
 document.getElementById('canvasWrap')?.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}));
[denominator,...quantities].forEach(input=>input.addEventListener('input',()=>{
 buttons.forEach(button=>button.setAttribute('aria-pressed','false'));
}));
})();
