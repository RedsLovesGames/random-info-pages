import { createSignalStore, signature, asciiSignal, PALETTES } from './signal-core.mjs';

// Four interfaces, one deterministic fictional machine. This never touches real OS data.
const store=createSignalStore();
const $=id=>document.getElementById(id);
const make=(tag,cls='',txt)=>{const n=document.createElement(tag);n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
const button=(txt,fn,cls='')=>{const n=make('button',cls,txt);n.type='button';n.addEventListener('click',fn);return n;};
const colors={lime:'#b6e990',lilac:'#c0a4ed',peach:'#f5ae8a',blue:'#90c4f4'};
const activeWorld=()=>document.querySelector('.world:not([hidden])')?.dataset.os||'windows';
const dispatch=(type,extra={})=>store.dispatch({type,world:activeWorld(),...extra});
const lines=s=>s.signal.steps.map(v=>'▁▂▃▄▅▆▇█'[v]).join('');
const pulseText=()=>{const s=store.get();return 'SIGNAL '+signature(s)+'\nnotes: '+s.signal.steps.join(' ')+'\ntempo: '+s.signal.tempo+' bpm\npalette: '+s.signal.palette+'\n'+asciiSignal(s);};
const weatherText=()=>{const s=store.get();return 'FICTIONAL FORECAST\nrain '+s.weather.rain+'%\nsun '+s.weather.sun+'%\nwind '+s.weather.wind+'%';};
const sketchText=()=>Array.from({length:8},(_,y)=>store.get().sketch.slice(y*8,y*8+8).map(v=>'·░▓█'[v]).join(' ')).join('\n');

/* The observatory exposes continuity, progress, portable saves and a fifth interpretation. */
const hub=make('dialog','dw2-hub');hub.id='dw2Hub';
hub.setAttribute('aria-label','The Signal observatory');
hub.innerHTML='<div class="dw2-hub-top"><span>RANDOM INFO / ONE FICTIONAL MACHINE</span><button id="dw2HubClose" type="button" aria-label="Close">×</button></div>'
 +'<h2>One machine.<br><em>Four interpretations.</em></h2>'
 +'<p>Change a pattern in one world; watch it become a file, a terminal record, a musical idea, and a pocket message in the others.</p>'
 +'<div class="dw2-snapshot"><div><small>SIGNAL ID</small><strong id="dw2Signature"></strong><span id="dw2Beat"></span></div><div><small>LOCAL WEATHER</small><strong id="dw2Forecast"></strong><span id="dw2Mood"></span></div></div>'
 +'<div id="dw2Wave" class="dw2-mini-wave"></div><p id="dw2Progress" class="dw2-progress"></p>'
 +'<div class="dw2-hub-actions"><button id="dw2Mix" type="button">↻ Remix</button><button id="dw2Reverse" type="button">⇄ Reverse</button><button id="dw2Export" type="button">↓ Export</button><label class="dw2-import">↑ Import<input id="dw2Import" type="file" accept=".json,application/json"></label><button id="dw2Reset" type="button">Reset</button></div>'
 +'<button id="dw2BetweenOpen" type="button" hidden>✳ There is a fifth interpretation ↗</button>'
 +'<p class="dw2-disclosure">These are fictional systems. Save data stays in this browser unless you export it. Apple’s private note is excluded from the Signal save.</p>'
 +'<div class="dw2-history"><b>WHAT CHANGED</b><ol id="dw2History"></ol></div>';
document.body.append(hub);
document.querySelector('.switch-dock').insertBefore(button('signal / ?',()=>hub.showModal(),'dw2-hub-button'),$('showAll'));
$('dw2HubClose').onclick=()=>hub.close();
hub.addEventListener('click',e=>{if(e.target===hub)hub.close();});
$('dw2Mix').onclick=()=>dispatch('REMIX');
$('dw2Reverse').onclick=()=>dispatch('REVERSE');
$('dw2Export').onclick=()=>{
  const url=URL.createObjectURL(new Blob([store.exportJSON()],{type:'application/json'}));
  const a=make('a');a.href=url;a.download='device-worlds-signal.json';document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
};
$('dw2Import').addEventListener('change',async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  if(file.size>200000){alert('That save is too large (maximum 200 KB).');return;}
  try {
    const data=JSON.parse(await file.text());
    if(data.schemaVersion!==2||!Array.isArray(data.signal?.steps)||data.signal.steps.length!==8)throw Error('Not a Signal save');
    if(confirm('Import this Signal and overwrite current local progress?'))store.replace(data);
  }catch{alert('Invalid Device Worlds V2 Signal save.');}
});
$('dw2Reset').onclick=()=>{if(confirm('Erase this browser’s fictional Signal, sketch, weather and discoveries? Export a backup first.'))store.reset();};

const between=make('dialog','dw2-between');between.id='dw2Between';
between.setAttribute('aria-label','The Between, an optional fifth experience');
between.innerHTML='<button id="dw2BetweenClose" type="button" aria-label="Exit the fifth world">×</button>'
 +'<div class="dw2-between-center"><small>INTERPRETATION 05 / NO OPERATING SYSTEM</small><h2>THE<br><em>BETWEEN.</em></h2>'
 +'<p>Four interfaces have been trying to describe the same thing. Every piece below is the signal; changing any piece rewrites all four stories.</p>'
 +'<div class="dw2-between-shapes" id="dw2Shapes"></div><div class="dw2-between-actions"><button id="dw2BetweenMix" type="button">Remix the machine</button>'
 +'<button id="dw2BetweenShift" type="button">Shift time</button><button id="dw2BetweenRain" type="button">Summon imaginary rain</button></div><small>THE MACHINE REMEMBERS / YOU MAY REVISIT ANY TIME</small></div>';
document.body.append(between);
$('dw2BetweenClose').onclick=()=>between.close();
$('dw2BetweenOpen').onclick=()=>{hub.close();between.showModal();dispatch('DISCOVER',{id:'between.entered',label:'Opened the fifth interpretation.'});};
$('dw2BetweenMix').onclick=()=>dispatch('REMIX');
$('dw2BetweenShift').onclick=()=>dispatch('ROTATE');
$('dw2BetweenRain').onclick=()=>dispatch('WEATHER',{key:'rain',value:Math.min(100,store.get().weather.rain+20)});
function renderHub(s){
  $('dw2Signature').textContent=signature(s);
  $('dw2Beat').textContent=lines(s)+' / '+s.signal.tempo+' BPM';
  $('dw2Forecast').textContent=s.weather.rain+'% RAIN';
  $('dw2Mood').textContent=s.signal.palette+' / PIP '+s.creature.mood+'%';
  $('dw2Progress').textContent='WORLDS '+s.visited.length+'/4 · DISCOVERIES '+s.discoveries.length+' · REVISION '+s.revision;
  $('dw2Wave').replaceChildren(...s.signal.steps.map((v,i)=>{
    const b=button('▁▂▃▄▅▆▇█'[v],()=>dispatch('STEP',{index:i,value:(store.get().signal.steps[i]+1)%8}));
    b.title='Tune note '+(i+1);b.style.height=(28+v*5)+'px';return b;
  }));
  $('dw2History').replaceChildren(...s.journal.slice(-7).reverse().map(x=>make('li','',x.world.toUpperCase()+' / '+x.label)));
  $('dw2BetweenOpen').hidden=!(s.visited.length===4 && s.discoveries.length>=2);
  $('dw2Shapes').replaceChildren(...s.signal.steps.map((v,i)=>{
    const b=button('◇',()=>dispatch('STEP',{index:i,value:(store.get().signal.steps[i]+1)%8}));
    b.style.setProperty('--shape-rotation',(v*31+i*18)+'deg');b.style.setProperty('--shape-color',colors[s.signal.palette]);return b;
  }));
}
store.subscribe(renderHub);renderHub(store.get());
if(!store.persistent)hub.append(make('p','dw2-storage-warning','Browser storage is disabled. Export your Signal before refreshing.'));

/* WINDOWS: draggable working mini-applications on the existing fictional desktop. */
const winLayer=make('div','dw2-windows');$('world-windows').append(winLayer);
const windows=new Map();let topWindow=50;
function showWindow(id,title,render){
  let win=windows.get(id);
  if(!win){
    win=make('section','dw2-window');win.setAttribute('aria-label',title);
    win.style.left=(13+windows.size*6)+'%';win.style.top=(19+windows.size*5)+'%';
    const header=make('div','dw2-window-header'),name=make('strong','',title),tools=make('div');
    tools.append(button('−',()=>win.hidden=true),button('□',()=>win.classList.toggle('dw2-maximized')),button('×',()=>win.hidden=true));
    header.append(name,tools);
    const body=make('div','dw2-window-body');win.append(header,body);win._body=body;win._render=render;
    header.addEventListener('pointerdown',e=>{
      if(e.target.closest('button')||e.button!==0||win.classList.contains('dw2-maximized'))return;
      const rect=win.getBoundingClientRect();win._drag={x:e.clientX-rect.left,y:e.clientY-rect.top};
      header.setPointerCapture?.(e.pointerId);
    });
    header.addEventListener('pointermove',e=>{
      if(!win._drag)return;
      const rect=$('world-windows').getBoundingClientRect();
      win.style.left=Math.round(Math.max(0,Math.min(rect.width-win.offsetWidth,e.clientX-rect.left-win._drag.x)))+'px';
      win.style.top=Math.round(Math.max(70,Math.min(rect.height-win.offsetHeight-70,e.clientY-rect.top-win._drag.y)))+'px';
    });
    header.addEventListener('pointerup',()=>win._drag=null);
    header.addEventListener('pointercancel',()=>win._drag=null);
    win.addEventListener('pointerdown',()=>win.style.zIndex=String(++topWindow));
    windows.set(id,win);winLayer.append(win);
  }
  win.hidden=false;win.style.zIndex=String(++topWindow);render(win._body);
  dispatch('DISCOVER',{id:'windows.'+id,label:'Opened '+title+'.'});
}
let folder='Home';
const listing={
  Home:[['READ_THIS.txt','Why this computer exists'],['Signals','The shared frequency'],['Weather','A pocket forecast'],['Gallery','One tiny canvas'],['Archive','The machine remembers']],
  Signals:[['pulse.sig','Eight notes. Four appearances.'],['reverse.cmd','Reverse the signal globally']],
  Weather:[['forecast.txt','A forecast from the pocket'],['garden.cmd','Grow a tiny fictional garden']],
  Gallery:[['sketch.txt','An eight-by-eight collaborative drawing']],
  Archive:[['events.log','Local fictional event log'],['fifth.txt','Something between interfaces']]
};
function explorer(parent){
  parent.replaceChildren(make('p','dw2-explorer-path','MY THINGS / '+folder));
  const tabs=make('div','dw2-folders');
  for(const name of Object.keys(listing))tabs.append(button(name,()=>{folder=name;explorer(parent);},folder===name?'selected':''));
  parent.append(tabs);
  for(const [name,description] of listing[folder]){
    const b=button('',()=>{
      if(listing[name]){folder=name;explorer(parent);return;}
      if(name==='reverse.cmd'){dispatch('REVERSE');explorer(parent);return;}
      if(name==='garden.cmd'){dispatch('GARDEN');explorer(parent);return;}
      const text=name==='pulse.sig'?pulseText():name==='forecast.txt'?weatherText():name==='sketch.txt'?sketchText():
        name==='events.log'?store.get().journal.map(e=>e.world+': '+e.label).join('\n'):
        name==='fifth.txt'?'Once you have seen all four worlds, the observatory might show a fifth interpretation.':
        'This is a virtual desktop, not your real computer.\nThe Signal appears in all four worlds.\nTry making something in Tiny Paint or the Apple instrument.';
      showWindow('file','READING / '+name,body=>body.replaceChildren(make('pre','dw2-file-text',text)));
    },'dw2-file-row');
    b.append(make('span','dw2-file-symbol',listing[name]?'▥':'▤'),make('span','',name),make('small','',description));
    parent.append(b);
  }
  parent.append(make('p','dw2-file-disclaimer','SIMULATED FILES / YOUR REAL FILESYSTEM IS UNTOUCHED'));
}
function painter(parent){
  parent.replaceChildren(make('p','dw2-app-caption','Eight by eight. Click each pixel to change its shade. The same image exists as /gallery/sketch.txt on Linux.'));
  const grid=make('div','dw2-pixel-grid');grid.setAttribute('role','group');grid.setAttribute('aria-label','Shared pixel sketch');
  store.get().sketch.forEach((v,i)=>{
    const cell=button('',()=>{dispatch('SKETCH',{index:i,value:(store.get().sketch[i]+1)%4});cell.dataset.shade=store.get().sketch[i];
      cell.setAttribute('aria-label','Pixel '+(i+1)+', shade '+store.get().sketch[i]);},'dw2-pixel');
    cell.dataset.shade=v;cell.setAttribute('aria-label','Pixel '+(i+1)+', shade '+v);grid.append(cell);
  });
  parent.append(grid,button('Clear',()=>{dispatch('SKETCH_CLEAR');painter(parent);}));
}
function petWindow(parent){
  const p=store.get().creature;
  parent.replaceChildren(make('div','dw2-pet-big','◕ᴥ◕'),make('h3','',p.name+' / pocket companion'),
    make('p','', 'Mood '+p.mood+' · Energy '+p.energy),
    make('p','dw2-app-caption','Pip is fictional. Pet it here or from Android; the change travels with you.'),
    button('Pet Pip',()=>dispatch('PET')),
    button('Change shared palette',()=>dispatch('PALETTE',{value:PALETTES[(PALETTES.indexOf(store.get().signal.palette)+1)%4]})));
}
const shortcuts=$('world-windows').querySelector('.win-icons');
function shortcut(label,glyph,fn){
  const b=button('',fn,'desktop-icon dw2-desktop-icon');
  b.append(make('span','icon-glyph',glyph),make('span','',label));shortcuts.append(b);
}
shortcut('Signal Explorer','▥',()=>showWindow('explorer','Signal Explorer',explorer));
shortcut('Tiny Paint','▦',()=>showWindow('paint','Tiny Paint',painter));
shortcut('Pip.exe','✳',()=>showWindow('pet','Pip.exe',petWindow));
const desktopReadout=make('div','dw2-desktop-readout');
$('world-windows').querySelector('.win-desktop').append(desktopReadout);
store.subscribe(s=>{
  desktopReadout.textContent='SIGNAL '+signature(s)+'  /  '+s.signal.palette.toUpperCase()+'  /  RAIN '+s.weather.rain+'%';
  $('world-windows').style.setProperty('--signal-color',colors[s.signal.palette]);
  const explorerWin=windows.get('explorer'),pet=windows.get('pet');
  if(explorerWin&&!explorerWin.hidden)explorer(explorerWin._body);
  if(pet&&!pet.hidden)petWindow(pet._body);
});

/* LINUX: a small bounded simulated filesystem and pipeline-aware parser. */
const terminal=$('terminalOutput'),form=$('terminalForm'),input=$('terminalCommand');
let cwd='/home/guest',commands=[],commandPosition=0;
const dirs=['/','/home','/home/guest','/signals','/weather','/creatures','/gallery','/archive'];
function files(){return {
 '/home/guest/README.txt':'Nothing here executes real shell commands.\nTry ls /signals, cat /signals/pulse.sig, signal reverse, weather rain 80.',
 '/signals/pulse.sig':pulseText(),
 '/weather/forecast.txt':weatherText(),
 '/creatures/pip.txt':'Pip / mood '+store.get().creature.mood+' / energy '+store.get().creature.energy,
 '/gallery/sketch.txt':sketchText(),
 '/archive/events.log':store.get().journal.map(e=>e.world+': '+e.label).join('\n')||'The machine is quiet.',
 '/archive/translation.txt':'The Signal is not four objects. It is one object in four languages.'
};}
function path(input='.'){
  const list=input.startsWith('/')?[]:cwd.split('/').filter(Boolean);
  for(const v of input.split('/')){if(!v||v==='.')continue;if(v==='..')list.pop();else list.push(v);}
  return '/'+list.join('/');
}
function words(text){
  const out=[];let piece='',quote='',escape=false;
  for(const c of text){
    if(escape){piece+=c;escape=false;continue;}
    if(c==='\\'&&quote!="'"){escape=true;continue;}
    if(quote){if(c===quote)quote='';else piece+=c;continue;}
    if(c==='"'||c==="'"){quote=c;continue;}
    if(c==='|'){if(piece){out.push(piece);piece='';}out.push('|');continue;}
    if(/\s/.test(c)){if(piece){out.push(piece);piece='';}continue;}
    piece+=c;
  }if(piece)out.push(piece);return out;
}
function output(text,klass='term-answer'){
  const p=make('p',klass,String(text));terminal.append(p);
  while(terminal.children.length>100)terminal.firstElementChild.remove();
  terminal.scrollTop=terminal.scrollHeight;
}
function execute(args,stdin){
  const op=(args[0]||'').toLowerCase(),a=args[1]||'.',file=files(),filepath=path(a);
  const entries=dir=>[...new Set(dirs.concat(Object.keys(file)).filter(p=>p!==dir&&p.startsWith(dir==='/'?'/':dir+'/')).map(p=>p.slice((dir==='/'?'':dir).length+1).split('/')[0]))].sort();
  if(op==='help'||op==='man')return 'SIMULATED SHELL · no real system commands\npwd ls cd tree cat find grep sort head wc echo history clear\nsignal weather pet garden sketch fortune date neofetch\nExample: cat /signals/pulse.sig | grep tempo\nTry: signal reverse; weather rain 80; garden';
  if(op==='pwd')return cwd;
  if(op==='whoami')return 'guest / fictional operator';
  if(op==='date')return new Date().toLocaleString();
  if(op==='history')return commands.slice(-20).join('\n');
  if(op==='echo')return args.slice(1).join(' ');
  if(op==='clear'){terminal.replaceChildren();return '';}
  if(op==='ls')return dirs.includes(filepath)?entries(filepath).join('    '):Object.hasOwn(file,filepath)?filepath.split('/').at(-1):'ls: not found: '+a;
  if(op==='cd'){const next=path(args[1]||'/home/guest');if(!dirs.includes(next))return 'cd: no such directory: '+next;
    cwd=next;form.querySelector('label').textContent='guest@random:'+cwd+'$';return '';}
  if(op==='cat')return args[1] ? (file[filepath]??'cat: no such file: '+a) : stdin;
  if(op==='tree')return dirs.includes(filepath)?filepath+'\n'+dirs.concat(Object.keys(file)).filter(v=>v!==filepath&&v.startsWith(filepath==='/'?'/':filepath+'/')).map(v=>'  '.repeat(v.slice(filepath.length).split('/').length-1)+'└ '+v.split('/').at(-1)).join('\n'):'tree: no such directory';
  if(op==='find')return Object.keys(file).filter(v=>v.startsWith(path(args[1]||'/'))).join('\n')||'(no matches)';
  if(op==='grep'){const txt=args[2]?file[path(args[2])]:stdin;return txt===undefined?'grep: supply piped text or a file':String(txt).split('\n').filter(v=>v.toLowerCase().includes(a.toLowerCase())).join('\n')||'(no matches)';}
  if(op==='wc'){const txt=args[1]?file[filepath]:stdin;return txt===undefined?'wc: supply input':String(txt).split('\n').length+' lines · '+String(txt).split(/\s+/).filter(Boolean).length+' words';}
  if(op==='sort')return String(stdin).split('\n').sort().join('\n');
  if(op==='head')return String(stdin).split('\n').slice(0,Math.min(30,Math.max(1,Number(a)||5))).join('\n');
  if(op==='signal'){
    if(a==='reverse'){dispatch('REVERSE');return pulseText();}
    if(a==='rotate'){dispatch('ROTATE');return pulseText();}
    if(a==='remix'){dispatch('REMIX');return pulseText();}
    if(a==='tempo'){dispatch('TEMPO',{value:Number(args[2])});return pulseText();}
    if(a==='palette'){if(!PALETTES.includes(args[2]))return 'Palette: '+PALETTES.join(' | ');dispatch('PALETTE',{value:args[2]});return pulseText();}
    return pulseText()+'\nCommands: signal reverse / rotate / remix / tempo 120 / palette blue';
  }
  if(op==='weather'){if(['rain','sun','wind'].includes(a)&&args[2]!==undefined)dispatch('WEATHER',{key:a,value:Number(args[2])});return weatherText();}
  if(op==='garden'){dispatch('GARDEN');return '  .  *   .    \\|/\n   \\ | /    -@-\n    \\|/     /|\\\n    / \\   .\nThe imaginary garden changed the weather in all four worlds.';}
  if(op==='pet'){dispatch('PET');return files()['/creatures/pip.txt'];}
  if(op==='sketch')return sketchText();
  if(op==='fortune')return ['The file is a note. The note is a color.','There is a fifth interpretation.','Sometimes the most interesting bug is a door.'][store.get().revision%3];
  if(op==='neofetch')return '   /\\_/\\   RANDOM INFO OS (fictional)\n  ( o.o )  Signal '+signature(store.get())+'\n   > ^ <   Guest: curious';
  if(op==='sudo')return 'No privilege escalation: this shell cannot control your device.';
  return op+': command not found. Try help.';
}
function run(text){
  if(!text.trim())return;
  commands.push(text.slice(0,180));commandPosition=commands.length;
  output('guest@random:'+cwd+'$ '+text,'term-line');
  const tokens=words(text.slice(0,180));if(tokens.filter(x=>x==='|').length>2){output('Maximum two pipes.','term-error');return;}
  const segments=[[]];for(const word of tokens){if(word==='|')segments.push([]);else segments.at(-1).push(word);}
  if(segments.some(a=>a.length===0)){output('Empty pipeline command.','term-error');return;}
  let value='';for(const segment of segments)value=execute(segment,value);
  if(value)output(value.slice(0,8000));
  dispatch('DISCOVER',{id:'linux.shell',label:'Explored the simulated command line.'});
}
form.addEventListener('submit',e=>{
  e.preventDefault();e.stopImmediatePropagation();
  const val=input.value;input.value='';run(val);
},true);
input.addEventListener('keydown',e=>{
  if(e.key==='ArrowUp'||e.key==='ArrowDown'){
    e.preventDefault();commandPosition=Math.max(0,Math.min(commands.length,commandPosition+(e.key==='ArrowUp'?-1:1)));
    input.value=commands[commandPosition]||'';
  }
});
const chips=make('div','dw2-chips');
for(const cmd of ['ls','cat /signals/pulse.sig','signal reverse','weather rain 80','garden','tree /'])
  chips.append(button(cmd,()=>{input.value=cmd;input.focus();}));
document.querySelector('.linux-shell').append(chips);

/* APPLE: real canvas editing, accessible note buttons and opt-in Web Audio. */
const instrument=make('section','dw2-instrument');
instrument.innerHTML='<div class="dw2-instrument-top"><span>RESONANCE GARDEN / INSTRUMENT 01</span><span id="dw2AppleSignature"></span></div>'
 +'<canvas id="dw2Canvas" width="800" height="220" role="img" aria-label="Eight-note waveform. Drag to tune."></canvas>'
 +'<p>Draw across the surface to change pitch, or use the eight accessible note buttons. Every edit travels to the other worlds.</p>'
 +'<div id="dw2Notes" class="dw2-note-grid" role="group" aria-label="Eight editable note steps"></div>'
 +'<div class="dw2-apple-tools"><button id="dw2Play" type="button">▶ Hear your pattern</button><button id="dw2Shift" type="button">Shift ↻</button><button id="dw2AppleReverse" type="button">Reverse ⇄</button><span id="dw2BPM">96 BPM</span></div>';
document.querySelector('.apple-orb-wrap').after(instrument);
const canvas=$('dw2Canvas'),ctx=canvas.getContext('2d');
let playing=null,audio=null,playIndex=-1,drag=false;
function draw(){
  if(!ctx)return;
  const s=store.get(),w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);const g=ctx.createLinearGradient(0,0,w,h);
  g.addColorStop(0,'#ffffff00');g.addColorStop(.5,colors[s.signal.palette]+'88');g.addColorStop(1,'#ffffff08');
  ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  ctx.lineWidth=2;ctx.strokeStyle='#746b8690';
  for(let i=0;i<8;i++){
    const x=55+i*98,y=h-36-s.signal.steps[i]*20,n=h-36-s.signal.steps[(i+1)%8]*20;
    ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+49,(y+n)/2-20,x+98,n);ctx.stroke();
    ctx.beginPath();ctx.arc(x,y,playIndex===i?16:10,0,Math.PI*2);
    ctx.fillStyle=playIndex===i?'#292632':colors[s.signal.palette];ctx.fill();
    ctx.fillStyle='#5b5564';ctx.font='12px monospace';ctx.textAlign='center';ctx.fillText(String(i+1),x,h-13);
  }
}
function canvasInput(e){
  const rect=canvas.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  const i=Math.max(0,Math.min(7,Math.floor((e.clientX-rect.left)/rect.width*8)));
  const v=Math.max(0,Math.min(7,Math.round((1-(e.clientY-rect.top)/rect.height)*7)));
  dispatch('STEP',{index:i,value:v});
}
canvas.addEventListener('pointerdown',e=>{drag=true;canvas.setPointerCapture?.(e.pointerId);canvasInput(e);});
canvas.addEventListener('pointermove',e=>{if(drag)canvasInput(e);});
canvas.addEventListener('pointerup',()=>drag=false);canvas.addEventListener('pointercancel',()=>drag=false);
function renderInstrument(s){
  $('dw2AppleSignature').textContent=signature(s);$('dw2BPM').textContent=s.signal.tempo+' BPM';
  $('dw2Notes').replaceChildren(...s.signal.steps.map((v,i)=>{
    const b=button('▁▂▃▄▅▆▇█'[v],()=>dispatch('STEP',{index:i,value:(store.get().signal.steps[i]+1)%8}));
    b.setAttribute('aria-label','Note '+(i+1)+': pitch '+v+' of 7. Raise pitch.');return b;
  }));draw();
}
function stopAudio(){
  if(playing!==null)clearInterval(playing);playing=null;playIndex=-1;
  $('dw2Play').textContent='▶ Hear your pattern';
  if(audio){audio.close().catch(()=>{});audio=null;}draw();
}
function noteSound(v){
  if(!audio)return;
  const now=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();
  osc.type='sine';osc.frequency.setValueAtTime([261.6,293.7,329.6,349.2,392,440,493.9,523.3][v],now);
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.085,now+.02);
  gain.gain.exponentialRampToValueAtTime(.0001,now+.22);osc.connect(gain).connect(audio.destination);
  osc.start(now);osc.stop(now+.24);
}
$('dw2Play').onclick=async()=>{
  if(playing!==null){stopAudio();return;}
  try{
    const API=window.AudioContext||window.webkitAudioContext;
    if(!API)throw Error('No WebAudio');
    audio=new API();await audio.resume();let beat=0;
    const play=()=>{
      if($('world-apple').hidden||document.hidden){stopAudio();return;}
      playIndex=beat%8;noteSound(store.get().signal.steps[playIndex]);draw();beat++;
    };
    play();playing=setInterval(play,60000/store.get().signal.tempo);
    $('dw2Play').textContent='■ Stop sound';
    dispatch('DISCOVER',{id:'apple.music',label:'Played the eight-note signal.'});
  }catch{stopAudio();$('dw2Play').textContent='Audio unavailable';}
};
$('dw2Shift').onclick=()=>dispatch('ROTATE');
$('dw2AppleReverse').onclick=()=>dispatch('REVERSE');
new MutationObserver(()=>{if($('world-apple').hidden)stopAudio();})
  .observe($('world-apple'),{attributes:true,attributeFilter:['hidden']});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAudio();});
store.subscribe(renderInstrument);renderInstrument(store.get());

/* ANDROID: fictional pocket weather, companion and incoming Signal postcard. */
const pocket=make('section','dw2-pocket');
pocket.innerHTML='<div class="dw2-pocket-bar"><b>POCKET WEATHER</b><span>SIMULATED</span></div>'
 +'<div class="dw2-pocket-weather" id="dw2PocketWeather"><span aria-hidden="true">☁　☀　☁</span><p id="dw2WeatherLabel">Mostly curious.</p></div>'
 +'<label>RAIN <output id="dw2RainNum">16%</output><input type="range" id="dw2Rain" min="0" max="100" step="5"></label>'
 +'<label>SUN <output id="dw2SunNum">70%</output><input type="range" id="dw2Sun" min="0" max="100" step="5"></label>'
 +'<div class="dw2-pocket-pet"><span id="dw2PipFace">◕ᴥ◕</span><div><b id="dw2PipMood">Pip</b><small id="dw2PipStatus"></small></div><button id="dw2Pet" type="button" aria-label="Pet Pip">+</button></div>'
 +'<div class="dw2-pocket-inbox"><small>✳ MESSAGE FROM THE MACHINE</small><span id="dw2PocketPulse"></span></div>';
const content=$('androidPhone').querySelector('.phone-content');
content.insertBefore(pocket,content.querySelector('.phone-appbar'));
for(const [key,id] of [['rain','dw2Rain'],['sun','dw2Sun']]) $(id).addEventListener('input',e=>dispatch('WEATHER',{key,value:Number(e.target.value)}));
$('dw2Pet').onclick=()=>dispatch('PET');
$('phoneWeather').addEventListener('click',()=>pocket.scrollIntoView({behavior:'smooth',block:'center'}));
function renderPocket(s){
  for(const [key,id,num] of [['rain','dw2Rain','dw2RainNum'],['sun','dw2Sun','dw2SunNum']]){
    if(document.activeElement!==$(id))$(id).value=s.weather[key];
    $(num).textContent=s.weather[key]+'%';
  }
  $('dw2WeatherLabel').textContent=s.weather.rain>=70?'Stormy inside this tiny city':s.weather.rain>=35?'Lightly raining ideas':'Mostly clear, possibly curious';
  $('dw2PocketWeather').style.setProperty('--intensity',s.weather.rain/100);
  $('dw2PipMood').textContent=s.creature.mood>80?'Pip is delighted.':s.creature.mood>60?'Pip likes you.':'Pip is curious.';
  $('dw2PipStatus').textContent='Mood '+s.creature.mood+' · Energy '+s.creature.energy;
  $('dw2PipFace').style.background=colors[s.signal.palette];
  $('dw2PocketPulse').textContent=lines(s)+' / '+signature(s);
}
store.subscribe(renderPocket);renderPocket(store.get());

/* World-switch events are DOM-observed to avoid rewriting the existing OS router. */
function visit(){
  const world=activeWorld();
  if(['windows','linux','apple','android'].includes(world))store.dispatch({type:'VISIT',world});
}
for(const world of document.querySelectorAll('.world'))new MutationObserver(visit)
  .observe(world,{attributes:true,attributeFilter:['hidden']});
store.subscribe(s=>{
  $('world-windows').style.setProperty('--dw2-accent',colors[s.signal.palette]);
  $('world-linux').style.setProperty('--dw2-accent',colors[s.signal.palette]);
  $('world-apple').style.setProperty('--dw2-accent',colors[s.signal.palette]);
  $('world-android').style.setProperty('--dw2-accent',colors[s.signal.palette]);
});
visit();
