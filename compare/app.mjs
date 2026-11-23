const $=id=>document.getElementById(id);
const catalogue=window.RIPCatalog;
if(!catalogue)throw new Error('Project registry failed to load.');
const projects=catalogue.active.filter(project=>project.slug!=='compare');
const valid=new Map(projects.map(project=>[project.slug,project]));
const source={left: $('left-select'),right:$('right-select')};
const frames={left:$('left-frame'),right:$('right-frame')};
const shell=$('compare-shell'),handle=$('split-handle'),status=$('compare-status');
const params=new URLSearchParams(location.search);
const fallbackLeft=valid.has('fluid-dynamics')?'fluid-dynamics':projects[0].slug;
const fallbackRight=valid.has('marble-sequencer')?'marble-sequencer':projects[1]?.slug||fallbackLeft;
const state={left:valid.has(params.get('left'))?params.get('left'):fallbackLeft,
 right:valid.has(params.get('right'))?params.get('right'):fallbackRight};
const listeners=new Map();
let scrollBusy=false;
let split=50;
function say(message,error=false){status.textContent=message;status.dataset.error=String(error)}
function makeOptions(select){
 const group=new DocumentFragment();
 for(const project of projects){
  const option=document.createElement('option');option.value=project.slug;
  option.textContent=project.d||project.n;group.append(option);
 }
 select.replaceChildren(group);
}
function rootUrl(slug){return new URL('../'+slug+'/',location.href)}
function updateAddress(){
 const url=new URL(location.href);
 url.searchParams.set('left',state.left);
 url.searchParams.set('right',state.right);
 url.searchParams.set('layout',$('layout').value);
 history.replaceState(history.state,'',url);
}
function detach(side){
 const attached=listeners.get(side);
 if(attached){attached.win.removeEventListener('scroll',attached.handler);listeners.delete(side)}
}
function attach(side){
 detach(side);
 const win=frames[side].contentWindow;
 if(!win)return;
 const handler=()=>{
  if(!$('sync-scroll').checked||scrollBusy)return;
  const other=side==='left'?'right':'left';
  try{
   const original=win.document.documentElement;
   const target=frames[other].contentWindow;
   const max=Math.max(1,original.scrollHeight-win.innerHeight);
   const ratio=Math.min(1,Math.max(0,win.scrollY/max));
   const next=Math.max(0,target.document.documentElement.scrollHeight-target.innerHeight);
   scrollBusy=true;
   target.scrollTo({top:Math.round(next*ratio),behavior:'instant'});
   requestAnimationFrame(()=>{scrollBusy=false});
  }catch(error){
   $('sync-scroll').checked=false;
   scrollBusy=false;say('Scroll synchronization is unavailable for one of these pages.',true);
  }
 };
 win.addEventListener('scroll',handler,{passive:true});
 listeners.set(side,{win,handler});
}
function updateCopyButton(){
 let supported=false;
 try{
  const a=frames.left.contentWindow.RIPStudio;
  const b=frames.right.contentWindow.RIPStudio;
  supported=state.left===state.right&&typeof a?.getState==='function'&&
    typeof b?.setState==='function';
 }catch{}
 $('copy-state').disabled=!supported;
 $('copy-state').title=supported?'Copy the left project’s editable state to the right panel':
   'Choose the same supported project in both panels to copy editable settings';
}
function load(side){
 const project=valid.get(state[side]);
 if(!project)return;
 source[side].value=state[side];
 $(side+'-title').textContent=project.d||project.n;
 $(side+'-open').href=rootUrl(state[side]).href;
 $(side+'-frame').title=(side==='left'?'Left':'Right')+' project: '+(project.d||project.n);
 detach(side);
 frames[side].src=rootUrl(state[side]).href;
 $('copy-state').disabled=true;
 updateAddress();
}
function change(side,next){
 if(!valid.has(next))return;
 state[side]=next;load(side);
 say('Projects run independently. Use sync scroll to match page positions.');
}
for(const side of ['left','right']){
 makeOptions(source[side]);
 source[side].value=state[side];
 source[side].addEventListener('change',()=>change(side,source[side].value));
 frames[side].addEventListener('load',()=>{
  attach(side);updateCopyButton();
  say((side==='left'?'Left':'Right')+' project loaded.');
 });
}
$('swap-projects').addEventListener('click',()=>{
 const left=state.left;state.left=state.right;state.right=left;
 load('left');load('right');say('Projects swapped.');
});
$('copy-state').addEventListener('click',async()=>{
 try{
  if(state.left!==state.right)throw new Error('Choose the same project in both panels.');
  const left=frames.left.contentWindow.RIPStudio;
  const right=frames.right.contentWindow.RIPStudio;
  if(typeof left?.getState!=='function'||typeof right?.setState!=='function')
   throw new Error('Editable state copying is not supported by this project.');
  const snapshot=await left.getState();
  await right.setState(structuredClone(snapshot));
  say('Copied the left project’s editable state to the right.');
 }catch(error){say('Cannot copy project: '+error.message,true)}
});
$('share-compare').addEventListener('click',async()=>{
 const url=location.href;
 try{await navigator.clipboard.writeText(url);say('Comparison link copied.')}
 catch{window.prompt('Copy this comparison link',url);say('Comparison link ready to copy.')}
});
$('sync-scroll').addEventListener('change',()=>{
 say($('sync-scroll').checked?'Scroll synchronization enabled.':'Scroll synchronization disabled.');
});
function verticalDivider(){return shell.dataset.orientation==='vertical'||
  (matchMedia('(max-width: 650px)').matches);}
function updateSplit(value){
 split=Math.max(25,Math.min(75,Math.round(value)));
 shell.style.setProperty('--split',split+'%');
 handle.setAttribute('aria-valuenow',String(split));
 handle.setAttribute('aria-valuetext',split+' percent for the first panel');
 handle.setAttribute('aria-orientation',verticalDivider()?'horizontal':'vertical');
}
function updateLayout(layout){
 shell.dataset.orientation=layout;
 handle.setAttribute('aria-orientation',verticalDivider()?'horizontal':'vertical');
 updateAddress();
}
$('layout').value=params.get('layout')==='vertical'?'vertical':'horizontal';
$('layout').addEventListener('change',()=>updateLayout($('layout').value));
$('reset-split').addEventListener('click',()=>updateSplit(50));
handle.addEventListener('pointerdown',event=>{
 if(event.button!==0||event.pointerType==='mouse'&&event.buttons!==1)return;
 handle.setPointerCapture(event.pointerId);
 const start=event;
 function drag(e){
  const rect=shell.getBoundingClientRect();
  const ratio=verticalDivider()?(e.clientY-rect.top)/rect.height:(e.clientX-rect.left)/rect.width;
  updateSplit(ratio*100);
 }
 drag(start);
 const finish=()=>{handle.removeEventListener('pointermove',drag);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',finish)};
 handle.addEventListener('pointermove',drag);
 handle.addEventListener('pointerup',finish);
 handle.addEventListener('pointercancel',finish);
});
handle.addEventListener('keydown',event=>{
 const vertical=verticalDivider();
 const movement=event.key==='ArrowRight'||event.key==='ArrowDown'?5:
   event.key==='ArrowLeft'||event.key==='ArrowUp'?-5:0;
 if(movement){event.preventDefault();updateSplit(split+movement);}
 else if(event.key==='Home'){event.preventDefault();updateSplit(25)}
 else if(event.key==='End'){event.preventDefault();updateSplit(75)}
});
window.addEventListener('resize',()=>updateSplit(split));
updateLayout($('layout').value);
updateSplit(50);
load('left');load('right');
