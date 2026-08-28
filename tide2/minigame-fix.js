(() => {
  const apply = () => {
    const root = document.querySelector('#tide-real-game');
    const stage = root?.querySelector('.tr-stage');
    const wrap = document.querySelector('#tr-wrap');
    const bar = root?.querySelector('.tr-bar');
    const perfect = root?.querySelector('.tr-perfect');
    const medium = document.querySelector('#tr-medium');
    if (!root || !stage || !wrap || !bar || !perfect || !medium) return false;
    if (root.dataset.polished === '1') return true;
    root.dataset.polished = '1';

    if (perfect.parentElement !== bar) bar.prepend(perfect);

    const style = document.createElement('style');
    style.id = 'tide-minigame-polish';
    style.textContent = `
      #tide-real-game{
        padding:0;
        overflow:hidden;
        border-radius:24px;
        background:#091b22;
        box-shadow:0 24px 70px rgba(0,0,0,.22);
      }
      #tide-real-game .tr-head{
        padding:22px 24px 20px;
        align-items:center;
      }
      #tide-real-game .tr-head h3{
        font-size:1.55rem;
        margin-bottom:7px;
      }
      #tide-real-game .tr-head p{
        max-width:800px;
        font-size:.94rem;
      }
      #tide-real-game .tr-facts{margin-top:11px}
      #tide-real-game .tr-fact{
        border-color:rgba(148,211,221,.11);
        background:rgba(255,255,255,.018);
        padding:5px 8px;
      }
      #tide-real-game .tr-fact:nth-child(n+4){display:none}

      #tide-real-game .tr-shell{
        margin-top:0;
        display:grid;
        grid-template-columns:1fr;
        border-top:1px solid var(--line);
        background:#07151b;
      }
      #tide-real-game .tr-stage{
        min-height:0;
        padding:28px 24px 22px;
        display:flex;
        flex-direction:column;
        justify-content:flex-start;
        align-items:center;
        position:relative;
        cursor:pointer;
        border-bottom:1px solid var(--line);
        background:
          radial-gradient(42rem 18rem at 50% 40%,rgba(75,187,202,.10),transparent 62%),
          linear-gradient(180deg,#061318,#07181e);
      }
      #tide-real-game .tr-stage:before{
        opacity:.55;
        background-size:24px 24px;
      }
      #tide-real-game .tr-stage:after{
        content:"CLICK TO START  •  CLICK AGAIN TO REEL";
        position:absolute;
        top:16px;
        right:18px;
        z-index:2;
        font:750 .62rem ui-monospace,SFMono-Regular,Menlo,monospace;
        letter-spacing:.07em;
        color:rgba(168,206,216,.55);
      }
      #tide-real-game .tr-label{
        align-self:flex-start;
        margin:0 0 12px;
        padding:6px 9px;
        border:1px solid rgba(99,243,209,.13);
        border-radius:999px;
        background:rgba(99,243,209,.045);
        font-size:.69rem;
        position:relative;
        z-index:2;
      }
      #tide-real-game .tr-label b{color:#dffff7}

      #tide-real-game .tr-wrap{
        width:min(100%,760px);
        padding:34px 12px 24px;
        position:relative;
        z-index:2;
        border-radius:18px;
        cursor:pointer;
        touch-action:manipulation;
      }
      #tide-real-game .tr-wrap:before{
        content:"";
        position:absolute;
        left:5%;right:5%;top:27px;bottom:17px;
        border-radius:20px;
        background:radial-gradient(50% 80% at 50% 50%,rgba(86,205,213,.06),transparent 80%);
        pointer-events:none;
      }
      #tide-real-game .tr-wrap:focus-visible{
        outline:none;
        box-shadow:0 0 0 2px rgba(99,243,209,.7);
      }
      #tide-real-game .tr-bar{
        width:100%;
        aspect-ratio:60/7;
        position:relative;
        border-radius:2px;
        filter:drop-shadow(0 12px 20px rgba(0,0,0,.45));
        image-rendering:pixelated;
        cursor:pointer;
        user-select:none;
      }
      #tide-real-game .tr-bg,
      #tide-real-game .tr-overlay,
      #tide-real-game .tr-marker{
        image-rendering:pixelated!important;
      }
      #tide-real-game .tr-fill{
        background-image:var(--tr-fill-bg)!important;
        background-repeat:no-repeat!important;
        background-size:100% 100%!important;
        image-rendering:auto!important;
        box-shadow:
          inset 0 1px rgba(255,255,255,.16),
          inset 0 -1px rgba(0,0,0,.24),
          0 0 22px rgba(72,177,213,.09);
      }
      #tide-real-game .tr-perfect{
        position:absolute;
        left:45%;
        top:0;
        width:10%;
        height:100%;
        transform:none;
        z-index:4;
        border-left:1px solid rgba(255,215,111,.6);
        border-right:1px solid rgba(255,215,111,.6);
        background:linear-gradient(180deg,rgba(255,215,111,.08),rgba(255,215,111,.16),rgba(255,215,111,.08));
        pointer-events:none;
      }
      #tide-real-game .tr-perfect:after{
        content:"PERFECT";
        position:absolute;
        left:50%;
        top:-24px;
        transform:translateX(-50%);
        font:800 .58rem ui-monospace,SFMono-Regular,Menlo,monospace;
        letter-spacing:.09em;
        color:rgba(255,215,111,.78);
      }
      #tide-real-game .tr-marker{
        filter:drop-shadow(0 4px 5px rgba(0,0,0,.42));
      }

      #tide-real-game .tr-status{
        margin:5px 0 0;
        min-height:0;
        padding:8px 12px;
        border:1px solid rgba(155,205,215,.12);
        border-radius:999px;
        background:rgba(255,255,255,.025);
        font-size:.9rem;
      }
      #tide-real-game .tr-sub{
        margin-top:7px;
        max-width:560px;
        min-height:0;
        font-size:.78rem;
      }
      #tide-real-game .tr-actions{margin-top:11px}
      #tide-real-game #tr-start{display:none!important}
      #tide-real-game .tr-btn.alt{
        padding:8px 12px;
        border-radius:10px;
        font-size:.8rem;
      }

      #tide-real-game .tr-panel{
        border-left:0;
        border-top:0;
        padding:17px 20px 18px;
        display:grid;
        grid-template-columns:220px minmax(0,1fr);
        gap:12px 16px;
        background:linear-gradient(180deg,rgba(255,255,255,.016),rgba(255,255,255,.008));
      }
      #tide-real-game .tr-modes{
        margin:0;
        align-self:start;
      }
      #tide-real-game .tr-controls{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:8px;
      }
      #tide-real-game .tr-control{
        padding:9px 10px;
        border-radius:12px;
        min-width:0;
      }
      #tide-real-game .tr-control label{
        margin-bottom:5px;
        font-size:.71rem;
      }
      #tide-real-game .tr-control select{
        padding:7px 8px;
        font-size:.8rem;
      }
      #tide-real-game .tr-read{
        grid-column:1/-1;
        grid-template-columns:repeat(4,1fr);
        gap:8px;
        margin-top:0;
      }
      #tide-real-game .tr-read>div{
        padding:9px 10px;
        border-radius:11px;
      }
      #tide-real-game .tr-read small{font-size:.67rem}
      #tide-real-game .tr-read strong{font-size:.93rem}
      #tide-real-game .tr-note{
        grid-column:1/-1;
        margin-top:0;
        padding:9px 11px;
        font-size:.71rem;
      }
      #tide-real-game .tr-compare{
        padding:0 20px 20px;
        gap:8px;
      }
      #tide-real-game .tr-compare>div{padding:12px}

      @media(max-width:900px){
        #tide-real-game .tr-stage:after{display:none}
        #tide-real-game .tr-panel{grid-template-columns:1fr}
        #tide-real-game .tr-controls{grid-template-columns:repeat(2,minmax(0,1fr))}
        #tide-real-game .tr-read{grid-template-columns:repeat(2,1fr)}
      }
      @media(max-width:620px){
        #tide-real-game .tr-head{padding:18px 16px 16px}
        #tide-real-game .tr-head h3{font-size:1.3rem}
        #tide-real-game .tr-stage{padding:20px 10px 18px}
        #tide-real-game .tr-label{margin-left:4px}
        #tide-real-game .tr-wrap{padding:32px 2px 21px}
        #tide-real-game .tr-panel{padding:14px}
        #tide-real-game .tr-controls{grid-template-columns:1fr 1fr}
        #tide-real-game .tr-control:has(#tr-behavior),
        #tide-real-game .tr-control:has(#tr-line){grid-column:1/-1}
        #tide-real-game .tr-fact:nth-child(n+3){display:none}
      }
    `;
    document.head.appendChild(style);

    const title = root.querySelector('.tr-head h3');
    const headCopy = root.querySelector('.tr-head p');
    if (title) title.textContent = 'Play the catch itself';
    if (headCopy) {
      headCopy.textContent = 'Click anywhere in the game field to start. Click again when the moving marker is inside the catch zone. Switch between Fishing 2.0 and Original Tide to feel the difference with the same fish settings.';
    }

    const facts = root.querySelectorAll('.tr-fact');
    if (facts[0]) facts[0].textContent = 'Tide 60×7 bar';
    if (facts[1]) facts[1].textContent = '80 ticks / 4 sec';
    if (facts[2]) facts[2].textContent = 'perfect ±0.1';

    const status = document.querySelector('#tr-status');
    const sub = document.querySelector('#tr-sub');
    if (status && !root.classList.contains('running')) status.textContent = 'Click the game field to start';
    if (sub && !root.classList.contains('running')) sub.textContent = 'Then click the field again to reel. Where you click does not matter.';

    const random = document.querySelector('#tr-random');
    if (random) random.textContent = 'Random fish';

    const fills = {
      WATER:'linear-gradient(180deg,#8dd8ed 0%,#5dc0df 18%,#3f93c7 43%,#2b6da4 68%,#1c4e82 100%)',
      LAVA:'linear-gradient(180deg,#ffd15a 0%,#ff9b32 20%,#ef5a26 50%,#b92f28 76%,#6d1d28 100%)',
      VOID:'linear-gradient(180deg,#8f79c7 0%,#6454a5 22%,#423d82 50%,#29285e 76%,#18183d 100%)'
    };
    const setFill = () => root.style.setProperty('--tr-fill-bg', fills[medium.value] || fills.WATER);
    setFill();
    medium.addEventListener('change', () => requestAnimationFrame(setFill));

    stage.addEventListener('pointerdown', event => {
      if (wrap.contains(event.target)) return;
      if (event.target.closest('button,input,select,label,a')) return;
      event.preventDefault();
      wrap.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles:true,
        cancelable:true,
        pointerType:event.pointerType || 'mouse',
        clientX:event.clientX,
        clientY:event.clientY
      }));
    });

    return true;
  };

  if (!apply()) {
    const observer = new MutationObserver(() => {
      if (apply()) observer.disconnect();
    });
    observer.observe(document.documentElement, {childList:true, subtree:true});
  }
})();
