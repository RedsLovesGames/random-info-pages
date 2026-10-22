import {fighters,byId,teams,labelForMode} from './roster.mjs';
import {Battle,WIDTH,HEIGHT,ARENA} from './engine.mjs';
const $=id=>document.getElementById(id);
const canvas=$('arena'),ctx=canvas.getContext('2d');
const keys=Object.keys(teams), portraitKey='rip-stock-fights-portraits-v1',statsKey='rip-stock-fights-stats-v1';
let battle=null,playing=false,fastForward=false,accum=0,last=0,recorded=false,selected='boxing';
let portraits={},images={},soundCtx=null,lastSound=0;
try{portraits=JSON.parse(localStorage.getItem(portraitKey)||'{}')||{};}catch{portraits={};}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function portrait(id){if(!portraits[id])return null;if(!images[id]){const img=new Image();images[id]=img;img.onload=()=>{if(selected===id)chooseFighter(id);draw();};img.src=portraits[id];}return images[id].complete&&images[id].naturalWidth?images[id]:null;}
function fillSelect(sel,choice){
  sel.replaceChildren();
  for(const f of fighters){const o=document.createElement('option');o.value=f.id;o.textContent=f.icon+' '+f.name;sel.append(o);}
  sel.value=choice;
}
for(const side of ['left','right']){
 const defaults=side==='left'?['boxing','tennis','football']:['chef','magician','fireworks'];
 for(let i=0;i<3;i++)fillSelect($(side+i),defaults[i]);
 const p=$(side+'Preset');p.add(new Option('Custom lineup','custom'));
 for(const k of keys)p.add(new Option(k,k));
 p.value='custom';
 p.addEventListener('change',()=>{if(!teams[p.value])return;for(let i=0;i<3;i++)$(side+i).value=teams[p.value][i];preview();});
 for(let i=0;i<3;i++)$(side+i).addEventListener('change',()=>{$(side+'Preset').value='custom';preview();});
}
const modeSelect=$('mode');
modeSelect.addEventListener('change',()=>{
 const mode=modeSelect.value;
 document.body.classList.toggle('teams-mode',mode==='teams');
 document.body.classList.toggle('hench-mode',mode==='challenge'||mode==='endless');
 $('modeBadge').textContent=labelForMode[mode].toUpperCase();
 $('challengeStats').textContent=(mode==='challenge'||mode==='endless')?'0 HENCHMEN DEFEATED':'AUTO BATTLE';
 preview();
});
const savedParams=new URLSearchParams(location.search);
if(labelForMode[savedParams.get('mode')])modeSelect.value=savedParams.get('mode');
for(const side of ['left','right']){
 const values=(savedParams.get(side)||'').split(',');
 for(let i=0;i<3;i++)if(byId[values[i]])$(side+i).value=values[i];
}
if(/^\d{1,10}$/.test(savedParams.get('seed')||''))$('seed').value=savedParams.get('seed');
if(savedParams.get('shrink')==='1')$('shrink').checked=true;
if(savedParams.get('hot')==='1')$('hotWalls').checked=true;
$('randomSeed').addEventListener('click',()=>{$('seed').value=String(Math.floor(Math.random()*4294967294)+1);preview();});
$('shrink').addEventListener('change',preview);
$('hotWalls').addEventListener('change',preview);
$('seed').addEventListener('change',preview);
function choices(side){return [0,1,2].map(i=>$(side+i).value);}
function options(){
 return {mode:modeSelect.value,left:choices('left'),right:choices('right'),
   seed:(Number($('seed').value)>>>0)||1,shrink:$('shrink').checked,hotWalls:$('hotWalls').checked};
}
function makeBattle(){
 const opts=options();$('seed').value=String(opts.seed);
 return new Battle(opts);
}
function preview(){
 if(playing||fastForward)return;
 battle=makeBattle();recorded=false;draw();showState(true);
 $('result').hidden=true;$('battleStatus').textContent='READY FOR COMBAT';
}
function startFight(){
 playing=true;fastForward=false;accum=0;last=performance.now();battle=makeBattle();recorded=false;
 $('result').hidden=true;$('pause').disabled=false;$('step').disabled=false;
 $('pause').textContent='Ⅱ PAUSE';$('battleStatus').textContent='BATTLE IN PROGRESS';
 showState(true);
}
function stopPlay(){playing=false;fastForward=false;$('pause').textContent='▶ RESUME';}
$('start').addEventListener('click',startFight);
$('rematch').addEventListener('click',startFight);
$('pause').addEventListener('click',()=>{if(!battle||battle.done)return;playing=!playing;fastForward=false;last=performance.now();$('pause').textContent=playing?'Ⅱ PAUSE':'▶ RESUME';$('battleStatus').textContent=playing?'BATTLE IN PROGRESS':'PAUSED';});
$('step').addEventListener('click',()=>{if(!battle||battle.done)return;playing=false;fastForward=false;$('pause').textContent='▶ RESUME';battle.step();showState(true);draw();if(battle.done)finishMatch();});
$('finish').addEventListener('click',()=>{
 if(!battle||battle.done)battle=makeBattle();
 playing=false;fastForward=true;recorded=false;$('result').hidden=true;$('battleStatus').textContent='FAST-FORWARDING';
});
function fastTick(){
 for(let i=0;i<330&&!battle.done;i++)battle.step();
 if(battle.done){fastForward=false;finishMatch();}
}
function finishMatch(){
 if(!battle||!battle.done)return;
 playing=false;fastForward=false;$('pause').disabled=true;$('step').disabled=true;
 $('battleStatus').textContent='MATCH COMPLETE';
 $('result').hidden=false;
 $('resultTitle').textContent=battle.winner==='draw'?'DRAW':battle.winner==='left'?'LEFT WINS':'RIGHT WINS';
 $('resultText').textContent=battle.reason+'. Duration '+battle.time.toFixed(1)+'s'+(['challenge','endless'].includes(battle.mode)?'; Henchmen defeated: '+battle.defeated:'')+'.';
 draw();showState(true);
 if(recorded)return;
 recorded=true;
 try{
   const stats=JSON.parse(localStorage.getItem(statsKey)||'{}');
   stats.matches=(stats.matches||0)+1;stats.wins=stats.wins||{};
   if(battle.winner==='left'||battle.winner==='right'){
     const winner=options()[battle.winner][0];
     stats.wins[winner]=(stats.wins[winner]||0)+1;
   }
   localStorage.setItem(statsKey,JSON.stringify(stats));
 }catch{}
}
function drawBackground(){
 ctx.fillStyle='#efefed';ctx.fillRect(0,0,WIDTH,HEIGHT);
 ctx.strokeStyle='#e3e3df';ctx.lineWidth=1;
 for(let x=0;x<WIDTH;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,HEIGHT);ctx.stroke();}
 for(let y=0;y<HEIGHT;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WIDTH,y);ctx.stroke();}
 ctx.textAlign='center';ctx.font='900 100px Arial';ctx.fillStyle='#e6e6e3';ctx.fillText('VS',WIDTH/2,HEIGHT/2+30);
 const b=battle?.bounds||ARENA;
 ctx.fillStyle='#fafaf7';ctx.fillRect(b.left,b.top,b.right-b.left,b.bottom-b.top);
 ctx.strokeStyle='#343535';ctx.lineWidth=13;
 if($('hotWalls').checked && battle){
   const phase=Math.min(4,Math.floor(battle.time/10));
   ctx.strokeStyle=['#f6f6f4','#f7dc68','#ffad46','#f57448','#a52f2f'][phase];
 }
 ctx.strokeRect(b.left,b.top,b.right-b.left,b.bottom-b.top);
 ctx.strokeStyle='#bbbdb6';ctx.lineWidth=1;ctx.strokeRect(b.left+12,b.top+12,b.right-b.left-24,b.bottom-b.top-24);
}
function glyph(p){
 const icons={spike:'🌵',emoji:'🖕',sleep:'💤',glasses:'🕶️',briefcase:'💼',paper:'📄',cleaver:'🔪',
 'stuck-knife':'🔪','stuck-spike':'🌵',nail:'💅',card:'🃏',bottle:'🍾',rabbit:'🐇',gravity:'🪐',pong:'🏓',watermark:'@',
 clock:'🕒',bullet:'•',finger:'👉',car:'🚗',sound:'♫',pawn:'♟️',bishop:'♗',rook:'♜',queen:'♛',
 knightpiece:'♞',skeleton:'💀',hammer:'🔨',tape:'〰',pellet:'•',rocket:'🚀',firework:'🎆',
 syringe:'💉',note:'♫',cursor:'➤',rain:'💧',hail:'❄️',wind:'〰',burst:'✸'};
 return icons[p.type]||'•';
}
function drawProjectile(p){
 ctx.save();ctx.translate(p.x,p.y);
 if(p.type==='tape'){
   ctx.fillStyle='#d9bb2c';ctx.fillRect(-65,-6,130,12);ctx.strokeStyle='#222';ctx.lineWidth=2;
   ctx.setLineDash([8,5]);ctx.beginPath();ctx.moveTo(-65,0);ctx.lineTo(65,0);ctx.stroke();
 }else if(p.type==='burst'){
   const gr=ctx.createRadialGradient(0,0,0,0,0,p.radius);
   gr.addColorStop(0,'#ffe18a');gr.addColorStop(.45,'#fba72d99');gr.addColorStop(1,'#ff8f2800');
   ctx.fillStyle=gr;ctx.beginPath();ctx.arc(0,0,p.radius,0,2*Math.PI);ctx.fill();
 }else if(p.type==='pong'){
   ctx.fillStyle='#fff';ctx.strokeStyle='#bbb';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,11,0,2*Math.PI);ctx.fill();ctx.stroke();
 }else {
   ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold '+(p.type==='pellet'?20:Math.max(22,p.radius*2))+'px Arial,Segoe UI Emoji';ctx.fillStyle=p.side==='left'?'#2258c5':'#cc4741';
   ctx.fillText(glyph(p),0,0);
 }ctx.restore();
}
function drawActor(a){
 ctx.save();ctx.translate(a.x,a.y);
 const isHench=a.id==='henchman',r=isHench?25:39;
 ctx.fillStyle=a.side==='left'?'#5a87ea':'#e16a62';ctx.globalAlpha=.25;
 ctx.beginPath();ctx.ellipse(0,r*.93,r*.93,11,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 ctx.fillStyle='#f3f4f1';ctx.strokeStyle=a.side==='left'?'#4a7bd4':'#d55c53';ctx.lineWidth=isHench?3:4;
 ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.stroke();
 const img=portrait(a.id);
 if(img){
   ctx.save();ctx.beginPath();ctx.arc(0,0,r-2,0,Math.PI*2);ctx.clip();
   const scale=Math.min((r*2)/img.width,(r*2)/img.height),w=img.width*scale,h=img.height*scale;
   ctx.drawImage(img,-w/2,-h/2,w,h);ctx.restore();
 }else{
   ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=(isHench?'33':'54')+'px Arial,Segoe UI Emoji';ctx.fillText(a.icon,0,4);
 }
 if(a.status>0){ctx.fillStyle='#7371ce';ctx.textAlign='center';ctx.font='bold 21px Arial';ctx.fillText('Z',r-4,-r+4);}
 if(a.armor>0){ctx.strokeStyle='#8fa3bb';ctx.lineWidth=3;ctx.strokeRect(-r+2,-r+2,2*r-4,2*r-4);}
 if(a.fuse>=0){ctx.fillStyle='#df3b32';ctx.font='bold 18px monospace';ctx.textAlign='center';ctx.fillText(a.fuse.toFixed(1),0,-r-19);}
 ctx.fillStyle='#292c28';ctx.fillRect(-r,-r-12,r*2,6);
 ctx.fillStyle=a.side==='left'?'#5380e0':'#dc6557';ctx.fillRect(-r,-r-12,Math.max(0,a.hp/a.maxHp)*r*2,6);
 ctx.restore();
}
function draw(){
 if(!battle)return;
 ctx.clearRect(0,0,WIDTH,HEIGHT);
 drawBackground();
 for(const item of battle.items){
   ctx.textAlign='center';ctx.font='26px Segoe UI Emoji';ctx.fillText('🧰',item.x,item.y);
 }
 for(const p of battle.projectiles)drawProjectile(p);
 for(const a of battle.actors)if(a.hp>0)drawActor(a);
 for(const e of battle.effects){
   ctx.save();ctx.globalAlpha=Math.min(1,e.life/.45);
   ctx.font='900 19px Arial';ctx.textAlign='center';ctx.fillStyle=e.color;ctx.strokeStyle='#ffffffbb';ctx.lineWidth=3;
   const y=e.y+(1-e.life)*-33;ctx.strokeText(e.text,e.x,y);ctx.fillText(e.text,e.x,y);ctx.restore();
 }
 ctx.fillStyle='#676b66';ctx.font='700 12px monospace';ctx.textAlign='center';
 ctx.fillText('THE BOX  /  ORIGINAL SIMULATION RECREATION',WIDTH/2,HEIGHT-20);
}
function active(side){return battle?.actors.find(a=>a.side===side&&a.hp>0);}
function showState(forceLog=false){
 if(!battle)return;
 const a=active('left'),b=active('right'),mode=battle.mode;
 for(const [side,f] of [['left',a],['right',b]]){
   const name=f?.name || (side==='right'&&['challenge','endless'].includes(mode)?'Henchmen Guys':'Eliminated');
   $(side+'Name').textContent=name;
   $(side+'HpText').textContent=f?Math.ceil(f.hp)+' HP':'0 HP';
   $(side+'Bar').style.width=(f?Math.max(0,f.hp/f.maxHp*100):0)+'%';
   $(side+'Team').textContent=side.toUpperCase()+' / '+(mode==='teams'?((battle.total[side]||0)-battle.queue[side].length)+' OF '+battle.total[side]:'01');
 }
 const t=battle.time;
 $('roundTime').textContent=String(Math.floor(t/60)).padStart(2,'0')+':'+(t%60).toFixed(1).padStart(4,'0');
 $('damageStats').textContent='DAMAGE '+Math.ceil(battle.damageDone.left)+' : '+Math.ceil(battle.damageDone.right);
 $('challengeStats').textContent=['challenge','endless'].includes(mode)?battle.defeated+(mode==='challenge'?' / 30':'')+' HENCHMEN DEFEATED':'SEED '+battle.seed;
 if(forceLog||battle.ticks%10===0){
   $('eventCount').textContent=String(battle.events.length).padStart(2,'0');
   $('battleLog').replaceChildren(...battle.events.slice(0,22).map(e=>{
      const li=document.createElement('li'),time=document.createElement('span'),msg=document.createElement('span');
      time.className='time';time.textContent=e.time.toFixed(1)+'s';msg.textContent=e.message;msg.className=e.kind;
      li.append(time,msg);return li;
   }));
 }
}
function maybeSound(){
 if(!$('sound').checked||!battle||battle.effects.length===0)return;
 const now=performance.now();if(now-lastSound<120)return;lastSound=now;
 try{
  soundCtx||=new (window.AudioContext||window.webkitAudioContext)();
  if(soundCtx.state==='suspended')soundCtx.resume();
  const osc=soundCtx.createOscillator(),gain=soundCtx.createGain();
  osc.type='triangle';osc.frequency.value=220+Math.random()*140;gain.gain.setValueAtTime(.045,soundCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001,soundCtx.currentTime+.08);osc.connect(gain);gain.connect(soundCtx.destination);
  osc.start();osc.stop(soundCtx.currentTime+.085);
 }catch{}
}
function frame(now){
 if(!battle)preview();
 if(playing&&!battle.done){
   const delta=Math.min(.08,(now-last)/1000||0);accum+=delta*Number($('speed').value);
   let steps=0;while(accum>=1/60&&steps<24&&!battle.done){battle.step();accum-=1/60;steps++;}
   if(battle.done)finishMatch();
   if(steps)maybeSound();
 }
 if(fastForward)fastTick();
 if(playing||fastForward||now-last>130){draw();showState();}
 last=now;
 requestAnimationFrame(frame);
}
function chooseFighter(id){
 selected=id;const f=byId[id];
 $('dossierName').textContent=f.name;$('dossierDesc').textContent=f.description;
 $('dossierDamage').textContent=String(f.damage);$('dossierCooldown').textContent=f.cooldown.toFixed(2)+'s';
 const avatar=$('dossierAvatar');avatar.replaceChildren();
 const pic=portrait(id);
 if(pic){const img=document.createElement('img');img.src=pic.src;img.alt=f.name;avatar.append(img);}
 else avatar.textContent=f.icon;
 for(const btn of $('roster').querySelectorAll('button'))btn.classList.toggle('selected',btn.dataset.id===id);
}
function renderRoster(){
 const q=$('search').value.toLowerCase().trim();
 const entries=fighters.filter(f=>(f.name+' '+f.description+' '+f.ability).toLowerCase().includes(q));
 $('roster').replaceChildren(...entries.map(f=>{
  const btn=document.createElement('button');btn.type='button';btn.dataset.id=f.id;btn.role='listitem';
  const emoji=document.createElement('span');emoji.textContent=f.icon;
  const txt=document.createTextNode(f.name);const value=document.createElement('small');value.textContent=String(f.damage);
  btn.append(emoji,txt,value);btn.addEventListener('click',()=>chooseFighter(f.id));return btn;
 }));
 chooseFighter(selected);
}
$('search').addEventListener('input',renderRoster);
$('portraitUpload').addEventListener('change',event=>{
 const file=event.target.files?.[0];if(!file)return;
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>12*1024*1024){alert('Choose a PNG, JPEG, or WebP image under 12 MB.');return;}
 const url=URL.createObjectURL(file),img=new Image();
 img.onload=()=>{
   const c=document.createElement('canvas'),scale=Math.min(1,256/Math.max(img.width,img.height));c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));
   c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);
   try{portraits[selected]=c.toDataURL('image/webp',.81);localStorage.setItem(portraitKey,JSON.stringify(portraits));delete images[selected];chooseFighter(selected);draw();}
   catch{alert('Browser storage full. Remove one or more existing cutouts.');}
 };
 img.onerror=()=>{URL.revokeObjectURL(url);alert('Image could not be opened.');};img.src=url;event.target.value='';
});
$('portraitClear').addEventListener('click',()=>{
 delete portraits[selected];delete images[selected];
 try{localStorage.setItem(portraitKey,JSON.stringify(portraits));}catch{}
 chooseFighter(selected);draw();
});
$('share').addEventListener('click',async()=>{
 const o=options(),p=new URLSearchParams({mode:o.mode,left:o.left.join(','),right:o.right.join(','),seed:String(o.seed)});
 if(o.shrink)p.set('shrink','1');if(o.hotWalls)p.set('hot','1');
 const url=location.origin+location.pathname+'?'+p;
 try{await navigator.clipboard.writeText(url);$('share').textContent='COPIED ✓';}
 catch{window.prompt('Copy the match link',url);}
 setTimeout(()=>$('share').textContent='COPY MATCH LINK ↗',1800);
});
renderRoster();
modeSelect.dispatchEvent(new Event('change'));
requestAnimationFrame(frame);
