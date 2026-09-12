(()=>{
'use strict';
const filters=document.getElementById('fish-filters');
const toggle=document.getElementById('fish-filter-toggle');
if(!filters||!toggle)return;

const heading=filters.querySelector('.fish-filter-heading');
const close=document.createElement('button');
close.type='button';
close.className='fish-filter-close';
close.textContent='Close';
close.setAttribute('aria-label','Close fish filters');
heading?.append(close);

const backdrop=document.createElement('button');
backdrop.type='button';
backdrop.className='fish-filter-backdrop';
backdrop.setAttribute('aria-label','Close fish filters');
document.body.append(backdrop);

function setOpen(open,{restore=false}={}){
  filters.classList.toggle('fish-filters-open',open);
  backdrop.classList.toggle('open',open);
  document.body.classList.toggle('fish-filter-sheet-open',open);
  toggle.setAttribute('aria-expanded',String(open));
  if(open)close.focus({preventScroll:true});
  else if(restore)toggle.focus({preventScroll:true});
}

// The catalog owns the basic toggle. This layer adds sheet semantics and backdrop behavior.
toggle.addEventListener('click',()=>requestAnimationFrame(()=>{
  const open=filters.classList.contains('fish-filters-open');
  backdrop.classList.toggle('open',open);
  document.body.classList.toggle('fish-filter-sheet-open',open);
  toggle.setAttribute('aria-expanded',String(open));
  if(open)close.focus({preventScroll:true});
}));
close.addEventListener('click',()=>setOpen(false,{restore:true}));
backdrop.addEventListener('click',()=>setOpen(false,{restore:true}));
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&filters.classList.contains('fish-filters-open')){
    event.preventDefault();
    setOpen(false,{restore:true});
  }
});
const desktop=matchMedia('(min-width: 901px)');
desktop.addEventListener?.('change',event=>{if(event.matches)setOpen(false);});
})();
