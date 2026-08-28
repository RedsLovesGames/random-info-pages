(() => {
  const section = document.querySelector('#fight');
  if (!section || document.querySelector('#tide-real-game')) return;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const assets = {"bg":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAAHCAYAAABUQS4cAAAAAXNSR0IArs4c6QAAADVJREFUOI1jZICA/wwjAzAyMjAw/FcRVR9oh9AF3Hl9k4FpoB1BbzDq4eEORpyHGaH0iCmlAcFEBguyGLNQAAAAAElFTkSuQmCC","overlay":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAAHCAYAAABUQS4cAAAAAXNSR0IArs4c6QAAACxJREFUOI1jYBhhgJHeFp7+f9EGmW/KqH+EnvYz0dOywQBGPTzcwYjz8IgDAOM1BApvNdOuAAAAAElFTkSuQmCC","water":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAYAAAAHCAYAAAArkDztAAAAAXNSR0IArs4c6QAAAE9JREFUCJljYMABGBkYGBj8+3f9V9GXZGBgYGC4c/E5w8ZCN0YWBgYGhrfnL8JVwthMMIFv91+jGAWX4FIURZFkYWBgYHh55zJcAJmNFQAAcjAXGAAFrPQAAAAASUVORK5CYII=","lava":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAYAAAAHCAYAAAArkDztAAAAAXNSR0IArs4c6QAAAFxJREFUCJljYMABGBkYGBjOh9v859ZnYmBgYGD4evEfg+HKI4wsDAwMDNdufmHQYuBhgLEZGBgYmGBaX779iWIUXEJcmB1FkoWBgYHhwhcOBgaoERe+cOByDwQAAKl/F77l+CFYAAAAAElFTkSuQmCC","void":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAYAAAAHCAYAAAArkDztAAAAAXNSR0IArs4c6QAAAFRJREFUCJljYMABGBkYGBgW2fX8VxHmZmBgYGC48/YrQ9yhEkYWBgYGhsPfHjEwMMgxINgMDEwwrY//fEExCi4hy8KDIsnCwMDAcPvzY7gAMhsrAACU2BeXhuoyzgAAAABJRU5ErkJggg==","marker":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAJCAYAAAAVb42gAAAAAXNSR0IArs4c6QAAAFhJREFUCJlNzrENw0AMQ9EHI9UtIU+QMby59rAA9emuvRRxnHyADUES5MO6ZMPKTN0Na4OIUFXgAa/j8BzDt2IfwznnzzjntF8JWN29MnPdo1UlIvxz/3gD/64huDVFYBIAAAAASUVORK5CYII=","select":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAJCAYAAAAVb42gAAAAAXNSR0IArs4c6QAAAFFJREFUCJlNzrEJw0AUBNGnz4VCPV3g2lzW9SQUCXHrQMbWwGazMCBfoCXJ5W0akqRgGkoHS5LYF2CLguO4Bw3W1Y8G5/ZSusZ9Kd00/tqz4wMr5Cq0Wh5YzAAAAABJRU5ErkJggg=="};

  const style = document.createElement('style');
  style.textContent = `
  #tide-real-game{margin-bottom:14px;padding:0;overflow:hidden;background:linear-gradient(180deg,rgba(14,38,48,.95),rgba(7,22,29,.95))}
  #tide-real-game .tr-head{padding:22px 22px 0;display:flex;justify-content:space-between;gap:18px;align-items:flex-start;flex-wrap:wrap}
  #tide-real-game .tr-head p{max-width:760px;color:var(--muted);margin:0}
  #tide-real-game .tr-facts{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}
  #tide-real-game .tr-fact{font:700 .7rem ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted);border:1px solid var(--line);border-radius:999px;padding:6px 9px;background:rgba(255,255,255,.025)}
  #tide-real-game .tr-shell{margin-top:20px;border-top:1px solid var(--line);display:grid;grid-template-columns:minmax(0,1.35fr) minmax(285px,.65fr)}
  #tide-real-game .tr-stage{min-width:0;padding:28px 22px 24px;background:radial-gradient(40rem 16rem at 50% 45%,rgba(65,160,177,.09),transparent 65%),#061117;display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:340px;position:relative}
  #tide-real-game .tr-stage:before{content:"";position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.014) 1px,transparent 1px);background-size:20px 20px;mask-image:linear-gradient(to bottom,transparent,black 25%,black 75%,transparent)}
  #tide-real-game .tr-label{font-size:.75rem;color:var(--muted);margin-bottom:24px;text-align:center;position:relative;z-index:1}#tide-real-game .tr-label b{color:var(--text)}
  #tide-real-game .tr-wrap{width:min(100%,720px);padding:42px 8px 34px;position:relative;z-index:1;touch-action:manipulation;outline:none;border-radius:16px}
  #tide-real-game .tr-wrap:focus-visible{box-shadow:0 0 0 2px var(--cyan)}
  #tide-real-game .tr-bar{width:100%;aspect-ratio:60/7;position:relative;image-rendering:pixelated;filter:drop-shadow(0 10px 16px rgba(0,0,0,.48));cursor:pointer;user-select:none}
  #tide-real-game .tr-bg,#tide-real-game .tr-overlay{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;pointer-events:none}#tide-real-game .tr-bg{z-index:1}#tide-real-game .tr-overlay{z-index:3}
  #tide-real-game .tr-fill{position:absolute;top:0;height:100%;z-index:2;background-repeat:repeat-x;background-size:auto 100%;image-rendering:pixelated;pointer-events:none}
  #tide-real-game .tr-marker{position:absolute;top:-14.285714%;width:6.666667%;height:128.571429%;z-index:5;image-rendering:pixelated;pointer-events:none}
  #tide-real-game .tr-perfect{position:absolute;top:-24px;left:50%;transform:translateX(-50%);width:20%;height:4px;border-radius:4px;background:rgba(255,211,109,.28)}
  #tide-real-game .tr-perfect:after{content:"perfect ±0.1";position:absolute;top:-20px;left:50%;transform:translateX(-50%);font:.62rem ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap;color:rgba(255,211,109,.82)}
  #tide-real-game .tr-status{display:flex;justify-content:center;align-items:center;gap:9px;min-height:44px;margin-top:16px;font-weight:850;position:relative;z-index:1;text-align:center}
  #tide-real-game .tr-dot{width:9px;height:9px;border-radius:50%;background:var(--muted)}#tide-real-game .running .tr-dot{background:var(--cyan);box-shadow:0 0 16px var(--cyan)}#tide-real-game .perfect .tr-dot{background:var(--gold)}#tide-real-game .catch .tr-dot{background:#63e889}#tide-real-game .miss .tr-dot{background:var(--danger)}
  #tide-real-game .tr-sub{color:var(--muted);font-size:.82rem;position:relative;z-index:1;text-align:center;min-height:22px}
  #tide-real-game .tr-actions{display:flex;gap:9px;justify-content:center;flex-wrap:wrap;margin-top:13px;position:relative;z-index:1}
  #tide-real-game .tr-btn{border:1px solid rgba(99,243,209,.24);background:rgba(99,243,209,.09);color:var(--text);border-radius:12px;padding:10px 15px;font-weight:800;cursor:pointer}#tide-real-game .tr-btn.alt{border-color:var(--line);background:rgba(255,255,255,.025);color:var(--muted)}
  #tide-real-game .tr-panel{border-left:1px solid var(--line);padding:20px;background:rgba(255,255,255,.018);min-width:0}
  #tide-real-game .tr-modes{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--line);border-radius:13px;padding:3px;background:#06171d;margin-bottom:12px}#tide-real-game .tr-modes button{border:0;border-radius:10px;padding:9px 7px;background:transparent;color:var(--muted);font-weight:800;cursor:pointer}#tide-real-game .tr-modes button.active{background:rgba(99,243,209,.1);color:var(--text)}
  #tide-real-game .tr-controls{display:flex;flex-direction:column;gap:8px}#tide-real-game .tr-control{border:1px solid var(--line);border-radius:13px;padding:10px 11px;background:rgba(255,255,255,.022)}#tide-real-game .tr-control label{display:flex;justify-content:space-between;gap:10px;margin-bottom:6px;font-size:.77rem;font-weight:750;color:var(--muted)}#tide-real-game .tr-control output{color:var(--cyan)}#tide-real-game .tr-control select{padding:8px 9px;font-size:.84rem}
  #tide-real-game .tr-read{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}#tide-real-game .tr-read>div{border:1px solid var(--line);border-radius:12px;padding:10px;background:rgba(255,255,255,.022)}#tide-real-game .tr-read small{display:block;color:var(--muted);font-size:.72rem}#tide-real-game .tr-read strong{font-size:1rem;font-variant-numeric:tabular-nums}
  #tide-real-game .tr-note{font-size:.76rem;color:var(--muted);margin-top:10px;padding:10px 11px;border:1px solid var(--line);border-radius:12px;background:rgba(0,0,0,.12)}#tide-real-game .tr-note b{color:var(--text)}
  #tide-real-game .tr-compare{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 20px 20px}#tide-real-game .tr-compare>div{border:1px solid var(--line);border-radius:14px;padding:13px;background:rgba(255,255,255,.02)}#tide-real-game .tr-compare small{display:block;text-transform:uppercase;letter-spacing:.09em;font-weight:850;margin-bottom:5px}#tide-real-game .tr-compare strong{display:block;line-height:1.25}#tide-real-game .tr-compare span{display:block;color:var(--muted);font-size:.79rem;margin-top:5px}
  #tide-real-game .old-l{color:var(--old)}#tide-real-game .new-l{color:var(--new)}
  @media(max-width:900px){#tide-real-game .tr-shell{grid-template-columns:1fr}#tide-real-game .tr-panel{border-left:0;border-top:1px solid var(--line)}#tide-real-game .tr-stage{min-height:300px}}
  @media(max-width:620px){#tide-real-game .tr-head{padding:18px 18px 0}#tide-real-game .tr-stage{padding:24px 10px 20px;min-height:270px}#tide-real-game .tr-panel{padding:15px}#tide-real-game .tr-wrap{padding:38px 0 28px}#tide-real-game .tr-compare{grid-template-columns:1fr;padding:0 15px 15px}#tide-real-game .tr-fact{font-size:.64rem}}
  `;
  document.head.appendChild(style);

  const markup = `
  <article class="card span12" id="tide-real-game">
    <div class="tr-head"><div><div class="kicker">Playable Tide minigame</div><h3>Tide's real catch bar, not a diagram</h3><p>I pulled the renderer and movement code from Tide 2.1.1. Start an attempt, then tap the bar or press Space while the marker is inside the filled zone. Switch modes to feel what the same Tide minigame does with original Tide values versus Fishing 2.0 values.</p><div class="tr-facts"><span class="tr-fact">60×7 bar</span><span class="tr-fact">4×9 marker</span><span class="tr-fact">200 ms lockout</span><span class="tr-fact">80 ticks / 4 sec</span><span class="tr-fact">perfect: |position| &lt; 0.1</span></div></div></div>
    <div class="tr-shell">
      <div class="tr-stage">
        <div class="tr-label"><b id="tr-mode-label">Fishing 2.0</b> · Tide renderer and hit test</div>
        <div class="tr-wrap" id="tr-wrap" role="button" tabindex="0" aria-label="Tide catch minigame. Tap or press Space to reel."><div class="tr-perfect" aria-hidden="true"></div><div class="tr-bar"><img class="tr-bg" alt="" src="${assets.bg}"><div class="tr-fill" id="tr-fill"></div><img class="tr-overlay" alt="" src="${assets.overlay}"><img class="tr-marker" id="tr-marker" alt="Moving catch marker" src="${assets.marker}"></div></div>
        <div class="tr-status"><span class="tr-dot"></span><span id="tr-status">Set the fish, then start.</span></div><div class="tr-sub" id="tr-sub">Tap anywhere on the bar to reel. The click location does not matter, the marker position does.</div>
        <div class="tr-actions"><button class="tr-btn" type="button" id="tr-start">Start attempt</button><button class="tr-btn alt" type="button" id="tr-random">Random fish</button></div>
      </div>
      <aside class="tr-panel">
        <div class="tr-modes"><button type="button" id="tr-v2" class="active">Fishing 2.0</button><button type="button" id="tr-old">Original Tide</button></div>
        <div class="tr-controls">
          <div class="tr-control"><label for="tr-behavior">Movement pattern</label><select id="tr-behavior"><option>SINE</option><option>PLATEAU</option><option>JITTER</option><option>DARTS</option><option>LINEAR</option><option>LINEAR_WRAP</option></select></div>
          <div class="tr-control"><label for="tr-strength">Strength <output id="tr-strength-o">0.80</output></label><input id="tr-strength" type="range" min="0" max="1.10" step="0.01" value="0.80"></div>
          <div class="tr-control"><label for="tr-speed">Speed <output id="tr-speed-o">0.80</output></label><input id="tr-speed" type="range" min="0.05" max="2.20" step="0.05" value="0.80"></div>
          <div class="tr-control tr-v2only"><label for="tr-p">Specimen percentile <output id="tr-p-o">75</output></label><input id="tr-p" type="range" min="0" max="100" step="1" value="75"></div>
          <div class="tr-control tr-v2only"><label for="tr-body">Body Type</label><select id="tr-body"><option>NORMAL</option><option>GIANT</option><option>DWARF</option></select></div>
          <div class="tr-control"><label for="tr-line">Tide line</label><select id="tr-line"><option value="NONE">No modifier</option><option value="COPPER">Copper Line</option><option value="IRON">Iron Line</option><option value="GOLD">Golden Line</option><option value="DIAMOND">Diamond Line</option></select></div>
          <div class="tr-control"><label for="tr-medium">Fill texture</label><select id="tr-medium"><option>WATER</option><option>LAVA</option><option>VOID</option></select></div>
        </div>
        <div class="tr-read"><div><small>Catch zone</small><strong id="tr-area">0.000</strong></div><div><small>Client speed</small><strong id="tr-client">0.000</strong></div><div><small>Final strength</small><strong id="tr-final">0.000</strong></div><div><small>Marker position</small><strong id="tr-pos">0.000</strong></div></div>
        <div class="tr-note" id="tr-note"></div>
      </aside>
    </div>
    <div class="tr-compare"><div><small class="old-l">Original Tide</small><strong>Many Speed values collapse to 0.05.</strong><span>Tide sends max((Speed ÷ 20) × difficulty, 0.05). With the default difficulty of 1.0, every raw Speed at or below 1.0 lands on the same client floor.</span></div><div><small class="new-l">Fishing 2.0</small><strong>Speed is normalized before Tide sees it.</strong><span>The V2 profile turns Speed into Tempo, applies percentile and Body Type, then sends area, speed and behavior back through Tide's unchanged minigame.</span></div></div>
  </article>`;
  const bento = section.querySelector('.bento');
  if (!bento) return;
  bento.insertAdjacentHTML('beforebegin', markup);

  const q = id => document.getElementById(id);
  const root = q('tide-real-game');
  const state = {mode:'v2', active:false, phase:0, start:0, lock:0, raf:0, pos:0, attempt:null};
  const behavior = {
    SINE:x=>Math.sin(Math.PI*x),
    PLATEAU:x=>Math.sin(Math.sin(Math.PI*x)*Math.PI/2),
    JITTER:x=>.9*Math.sin(Math.PI*x)+.1*Math.sin(7*Math.PI*x),
    DARTS:x=>Math.sin(Math.PI*x+.3*Math.sin(5*x)),
    LINEAR:x=>1-2*Math.abs(((x+.5)%2)-1),
    LINEAR_WRAP:x=>((2*x+1)%2)-1
  };
  const tempo = s => .04+.085*Math.log(1+clamp(s,0,2.2))/Math.log(3.2);
  const areaV2 = s => clamp(.78-.58*Math.pow(Math.max(s,0),1.25),.12,.78);

  function values(){
    let strength=+q('tr-strength').value, speed=+q('tr-speed').value, t=speed;
    const line=q('tr-line').value, move=q('tr-behavior').value;
    let area, client;
    if(state.mode==='old'){
      if(line==='COPPER') speed*=.9;
      if(line==='IRON') strength*=.86;
      if(line==='GOLD') speed*=.95;
      if(line==='DIAMOND') strength*=.75;
      area=clamp(1-strength,.05,1);
      client=Math.max(speed/20,.05);
    }else{
      strength=clamp(strength,0,1.1); t=tempo(speed);
      const x=(+q('tr-p').value-50)/50;
      strength*=1+.12*x; t=clamp(t*(1-.06*x),.035,.16);
      if(q('tr-body').value==='GIANT'){strength*=1.08;t=clamp(t*.95,.035,.16)}
      if(q('tr-body').value==='DWARF'){strength*=.92;t=clamp(t*1.08,.035,.16)}
      if(line==='COPPER') t*=.9;
      if(line==='IRON') strength*=.86;
      if(line==='GOLD') t*=.95;
      if(line==='DIAMOND') strength*=.75;
      area=clamp(areaV2(strength),.05,1);
      client=Math.max(.05,t);
    }
    return {strength,area,client,move};
  }
  function marker(pos, selected=false){
    state.pos=clamp(pos,-1,1);
    q('tr-marker').style.left=((28+Math.round(28*state.pos))/60*100)+'%';
    q('tr-marker').src=selected?assets.select:assets.marker;
    q('tr-pos').textContent=state.pos.toFixed(3);
  }
  function sync(){
    const v=state.active&&state.attempt?state.attempt:values();
    q('tr-strength-o').value=(+q('tr-strength').value).toFixed(2);q('tr-speed-o').value=(+q('tr-speed').value).toFixed(2);q('tr-p-o').value=q('tr-p').value;
    q('tr-area').textContent=v.area.toFixed(3);q('tr-client').textContent=v.client.toFixed(3);q('tr-final').textContent=v.strength.toFixed(3);
    const inset=Math.round(30*(1-v.area));q('tr-fill').style.left=(inset/60*100)+'%';q('tr-fill').style.width=((60-2*inset)/60*100)+'%';
    q('tr-fill').style.backgroundImage=`url(${assets[q('tr-medium').value.toLowerCase()]})`;
  }
  function status(a,b){q('tr-status').textContent=a;q('tr-sub').textContent=b}
  function stop(){if(state.raf)cancelAnimationFrame(state.raf);state.raf=0;state.active=false;root.classList.remove('running')}
  function start(){
    stop();root.classList.remove('perfect','catch','miss');state.active=true;state.attempt=values();state.phase=Math.random()*100;state.start=performance.now();state.lock=state.start+200;root.classList.add('running');sync();status('Get ready...','Tide ignores input for the first 200 ms.');state.raf=requestAnimationFrame(frame)
  }
  function frame(now){
    if(!state.active)return;
    const elapsed=now-state.start, ticks=elapsed/50, x=(state.phase+ticks)*state.attempt.client;
    marker(behavior[state.attempt.move](x));
    if(elapsed<200)status('Get ready...',Math.max(0,Math.ceil(200-elapsed))+' ms');
    else status('Reel when it lines up',Math.max(0,4-elapsed/1000).toFixed(1)+' s left · tap bar or press Space');
    if(elapsed>=4000){resolve('miss',true);return}state.raf=requestAnimationFrame(frame)
  }
  function reel(){
    if(!state.active){start();return}
    if(performance.now()<state.lock)return;
    const d=Math.abs(state.pos);resolve(d<state.attempt.area?(d<.1?'perfect':'catch'):'miss',false)
  }
  function resolve(result, timed){
    if(!state.active)return;stop();root.classList.add(result);
    status(result==='perfect'?'PERFECT!':result==='catch'?'CATCH!':timed?'TIME OUT':'MISS',result==='perfect'?"Inside Tide's fixed ±0.1 center window.":result==='catch'?'Inside the catch area, outside the perfect center.':timed?'Tide closes the attempt at 80 ticks.':'The marker was outside the catch area.');
    const st=performance.now();function blink(n){const t=n-st;if(t<1000){q('tr-marker').src=(Math.floor(t/100)%2)?assets.select:assets.marker;requestAnimationFrame(blink)}else q('tr-marker').src=assets.marker}requestAnimationFrame(blink)
  }
  function mode(m){
    stop();state.mode=m;root.classList.remove('perfect','catch','miss');q('tr-v2').classList.toggle('active',m==='v2');q('tr-old').classList.toggle('active',m==='old');root.querySelectorAll('.tr-v2only').forEach(e=>e.hidden=m!=='v2');q('tr-mode-label').textContent=m==='v2'?'Fishing 2.0':'Original Tide 2.1.1';q('tr-note').innerHTML=m==='v2'?'<b>V2 runtime:</b> normalize Speed to Tempo, apply percentile and Body Type, then line modifiers. The current ordinary path still preserves Tide’s final 0.05 minimum client speed.':'<b>Original Tide:</b> line modifiers alter raw Strength or Speed first, then area = clamp(1 - Strength) and client speed = max(Speed ÷ 20, 0.05).';state.attempt=null;marker(0);status('Set the fish, then start.','Tap anywhere on the bar to reel. The click location does not matter, the marker position does.');sync()
  }
  q('tr-v2').addEventListener('click',()=>mode('v2'));q('tr-old').addEventListener('click',()=>mode('old'));q('tr-start').addEventListener('click',start);
  q('tr-random').addEventListener('click',()=>{if(state.active)stop();q('tr-strength').value=(.25+Math.random()*.8).toFixed(2);q('tr-speed').value=(.1+Math.random()*2.05).toFixed(2);q('tr-p').value=Math.round(Math.random()*100);const a=Object.keys(behavior);q('tr-behavior').value=a[Math.floor(Math.random()*a.length)];root.classList.remove('perfect','catch','miss');marker(0);status('Random fish loaded.','Start when ready.');sync()});
  q('tr-wrap').addEventListener('pointerdown',e=>{e.preventDefault();reel()});q('tr-wrap').addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();reel()}});
  ['tr-behavior','tr-strength','tr-speed','tr-p','tr-body','tr-line','tr-medium'].forEach(id=>q(id).addEventListener(['tr-strength','tr-speed','tr-p'].includes(id)?'input':'change',()=>{if(!state.active)sync()}));
  mode('v2');
})();
