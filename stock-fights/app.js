import {fighters,byId,teams,labelForMode} from './roster.mjs';
import {Battle,WIDTH,HEIGHT,ARENA} from './engine.mjs';
import {referencePortraits} from './reference-portraits.mjs';
import {createCombatAudio} from './audio.mjs';
const $=id=>document.getElementById(id);
const canvas=$('arena'),ctx=canvas.getContext('2d');
const keys=Object.keys(teams), portraitKey='rip-stock-fights-portraits-v1',statsKey='rip-stock-fights-stats-v1';
let battle=null,playing=false,fastForward=false,accum=0,last=0,recorded=false,selected='boxing';
let portraits={},images={},failedImages=new Set(),soundFiles={},lastSound=0;
const audio=createCombatAudio();
let heardProjectiles=new WeakSet(),heardEffects=new WeakSet();
try{portraits=JSON.parse(localStorage.getItem(portraitKey)||'{}')||{};}catch{portraits={};}
try{soundFiles=JSON.parse(localStorage.getItem('rip-stock-fights-voices-v1')||'{}')||{};}catch{soundFiles={};}
for(const [id,url] of Object.entries(soundFiles))audio.setSample(id,url);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function portraitUrl(id){
 if(portraits[id])return portraits[id];
 return $('referencePhotos')?.checked ? (referencePortraits[id]||null) : null;
}
function portrait(id){
 const url=portraitUrl(id);
 if(!url||failedImages.has(id+'|'+url))return null;
 if(!images[id]||images[id]._source!==url){
   const img=new Image();img._source=url;images[id]=img;
   img.referrerPolicy='no-referrer';
   img.onload=()=>{if(selected===id)chooseFighter(id);draw();renderRoster();};
   img.onerror=()=>{failedImages.add(id+'|'+url);if(selected===id)chooseFighter(id);renderRoster();draw();};
   img.src=url;
 }
 return images[id].complete&&images[id].naturalWidth>0?images[id]:null;
}
function imageState(id){
 if(portraits[id])return 'Local custom portrait';
 if(referencePortraits[id]&&$('referencePhotos').checked)
   return failedImages.has(id+'|'+referencePortraits[id])?'Reference image unavailable from remote host':'External source photo (loading or loaded)';
 return 'No verified photo: use Replace Photo to provide one';
}
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
 heardProjectiles=new WeakSet();heardEffects=new WeakSet();audio.cueStart();
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
 audio.cueEnd();if(recorded)return;
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
 ctx.fillStyle='#151515';ctx.fillRect(0,0,WIDTH,HEIGHT);
 const b=battle?.bounds||ARENA;
 ctx.fillStyle='#f5f5f5';ctx.fillRect(b.left,b.top,b.right-b.left,b.bottom-b.top);
 ctx.strokeStyle='#151515';ctx.lineWidth=13;ctx.strokeRect(b.left,b.top,b.right-b.left,b.bottom-b.top);
 if($('hotWalls').checked && battle){
   const phase=Math.min(4,Math.floor(battle.time/10));
   ctx.strokeStyle=['#eaeaea','#f2d364','#f7ab3f','#d75432','#832128'][phase];
   ctx.lineWidth=13;ctx.strokeRect(b.left,b.top,b.right-b.left,b.bottom-b.top);
 }
 ctx.fillStyle='#dededc';ctx.textAlign='center';ctx.font='800 38px Arial';
 ctx.fillText('SPENN  /  FAN RECREATION',WIDTH/2,HEIGHT/2);
 ctx.font='700 14px Arial';ctx.fillStyle='#ababaa';ctx.fillText('Like and Subscribe!',WIDTH/2,HEIGHT-14);
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
function drawPlaceholder(ctx,a,r){
 ctx.fillStyle='#a3a3a3';
 ctx.beginPath();ctx.ellipse(0,19,r*.82,16,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#5b5d5c';
 ctx.beginPath();ctx.moveTo(-r*.8,r*.8);ctx.lineTo(-r*.72,4);ctx.lineTo(-r*.25,-11);
 ctx.lineTo(r*.25,-11);ctx.lineTo(r*.72,4);ctx.lineTo(r*.8,r*.8);ctx.closePath();ctx.fill();
 ctx.fillStyle='#c1af9d';ctx.beginPath();ctx.arc(0,-r*.4,r*.43,0,2*Math.PI);ctx.fill();
 if(['cowboy','magician','chef','pirate','priest','fireworks'].includes(a.id)){
   ctx.fillStyle='#272727';ctx.fillRect(-r*.53,-r*.9,r*1.06,8);
   ctx.fillRect(-r*.35,-r*1.38,r*.7,r*.5);
 }
 ctx.fillStyle='#111';ctx.textAlign='center';ctx.font='bold 7px Arial';
 ctx.fillText('NO IMAGE',0,r*.45);
}
function drawActor(a){
 ctx.save();ctx.translate(a.x,a.y);
 const isHench=a.id==='henchman',r=isHench?30:46;
 const img=portrait(a.id);
 if(img){
   const ratio=Math.min((r*1.9)/img.naturalWidth,(r*2.45)/img.naturalHeight);
   const w=img.naturalWidth*ratio,h=img.naturalHeight*ratio;
   ctx.drawImage(img,-w/2,-h/2,w,h);
 }else drawPlaceholder(ctx,a,r);
 if(a.status>0){ctx.textAlign='center';ctx.fillStyle='#34359a';ctx.font='bold 22px Arial';ctx.fillText('Zzz',0,-r-9);}
 if(a.armor>0){ctx.strokeStyle='#7b8fa4';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,r+5,0,Math.PI*2);ctx.stroke();}
 if(a.fuse>=0){ctx.fillStyle='#a00000';ctx.font='bold 19px monospace';ctx.textAlign='center';ctx.fillText(a.fuse.toFixed(1),0,-r-30);}
 ctx.font='900 21px Arial';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#fff';
 const hp=String(Math.max(0,Math.ceil(a.hp)));
 ctx.strokeText(hp,0,-r-8);ctx.fillStyle='#141414';ctx.fillText(hp,0,-r-8);
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
 // In the source-inspired mode the original minimalist black-frame stage is central.
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
 if(!$('sound').checked||!battle)return;
 const liveProjectiles=battle.projectiles.filter(p=>!heardProjectiles.has(p));
 for(const p of liveProjectiles){
    heardProjectiles.add(p);
    const actor=battle.actors.find(a=>a.uid===p.owner);
    if(p.type!=='stuck-knife'&&p.type!=='stuck-spike'&&p.type!=='burst')audio.attack(p.type,actor?.id);
 }
 const newEffects=battle.effects.filter(fx=>!heardEffects.has(fx));
 for(const fx of newEffects){
    heardEffects.add(fx);
    if(fx.text==='BOOM!')audio.play('blast',2);
    else if(fx.text==='BLOCK'||fx.text==='RETURN!')audio.play('block');
    else if(fx.text.startsWith('+'))audio.play('heal');
    else if(fx.text.startsWith('-'))audio.play('punch',.8);
    else if(fx.text==='FLASH')audio.play('magic');
 }
}

function frame(now){
 if(!battle)preview();
 if(playing&&!battle.done){
   const delta=Math.min(.08,(now-last)/1000||0);accum+=delta*Number($('speed').value);
   let steps=0;while(accum>=1/60&&steps<24&&!battle.done){battle.step();accum-=1/60;steps++;}
   if(battle.done)finishMatch();
   if(steps)maybeSound();
 }
 if(fastForward){fastTick();maybeSound();}
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
 else {avatar.textContent='';avatar.classList.add('empty-photo');avatar.setAttribute('aria-label','Reference photo unavailable');}
 if(pic)avatar.classList.remove('empty-photo');
 $('photoStatus').textContent=imageState(id)+(soundFiles[id]?' · Custom sound loaded':' · Synthesized audio');
 for(const btn of $('roster').querySelectorAll('button'))btn.classList.toggle('selected',btn.dataset.id===id);
}
function renderRoster(){
 const q=$('search').value.toLowerCase().trim();
 const entries=fighters.filter(f=>(f.name+' '+f.description+' '+f.ability).toLowerCase().includes(q));
 $('roster').replaceChildren(...entries.map(f=>{
  const btn=document.createElement('button');btn.type='button';btn.dataset.id=f.id;btn.role='listitem';
  const emoji=document.createElement('span');emoji.className='roster-image';
  const photo=portrait(f.id);
  if(photo){const image=document.createElement('img');image.src=photo.src;image.alt='';emoji.append(image);}
  else {emoji.textContent=f.name.slice(0,2).toUpperCase();emoji.classList.add('unverified');}
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

$('referencePhotos').addEventListener('change',()=>{
 images={};failedImages.clear();
 const fightersShown=[active('left')?.id,active('right')?.id,selected].filter(Boolean);
 for(const id of fightersShown)portrait(id);
 chooseFighter(selected);renderRoster();draw();
});
$('sound').addEventListener('change',()=>audio.setEnabled($('sound').checked));
$('soundUpload').addEventListener('change',e=>{
 const file=e.target.files?.[0];if(!file)return;
 if(!file.type.startsWith('audio/')||file.size>1800000){
   alert('Use an MP3, OGG, WAV, or WebM audio file under 1.8 MB.');e.target.value='';return;
 }
 const id=selected,reader=new FileReader();
 reader.onload=()=>{try{soundFiles[id]=String(reader.result);localStorage.setItem('rip-stock-fights-voices-v1',JSON.stringify(soundFiles));audio.setSample(id,soundFiles[id]);chooseFighter(id);}
 catch{delete soundFiles[id];alert('Browser storage is full. Remove large custom files.');}};
 reader.readAsDataURL(file);e.target.value='';
});
$('soundClear').addEventListener('click',()=>{
 delete soundFiles[selected];audio.setSample(selected,null);
 try{localStorage.setItem('rip-stock-fights-voices-v1',JSON.stringify(soundFiles));}catch{}
 chooseFighter(selected);
});
$('theater').addEventListener('click',async()=>{
 const el=document.querySelector('.stage-panel');
 if(document.fullscreenElement)await document.exitFullscreen().catch(()=>{});
 else if(el.requestFullscreen)await el.requestFullscreen().catch(()=>{});
});
