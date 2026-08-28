(() => {
  const apply = () => {
    const root = document.querySelector('#tide-real-game');
    const stage = root?.querySelector('.tr-stage');
    const wrap = document.querySelector('#tr-wrap');
    const bar = root?.querySelector('.tr-bar');
    const fill = document.querySelector('#tr-fill');
    const perfect = root?.querySelector('.tr-perfect');
    const medium = document.querySelector('#tr-medium');
    if (!root || !stage || !wrap || !bar || !fill || !perfect || !medium) return false;
    if (root.dataset.polished === '2') return true;
    root.dataset.polished = '2';

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
      #tide-real-game .tr-head{padding:22px 24px 20px;align-items:center}
      #tide-real-game .tr-head h3{font-size:1.55rem;margin-bottom:7px}
      #tide-real-game .tr-head p{max-width:800px;font-size:.94rem}
      #tide-real-game .tr-facts{margin-top:11px}
      #tide-real-game .tr-fact{border-color:rgba(148,211,221,.11);background:rgba(255,255,255,.018);padding:5px 8px}
      #tide-real-game .tr-fact:nth-child(n+4){display:none}

      #tide-real-game .tr-shell{margin-top:0;display:grid;grid-template-columns:1fr;border-top:1px solid var(--line);background:#07151b}
      #tide-real-game .tr-stage{
        min-height:0;
        padding:26px 24px 20px;
        display:flex;
        flex-direction:column;
        justify-content:flex-start;
        align-items:center;
        position:relative;
        cursor:pointer;
        border-bottom:1px solid var(--line);
        background:linear-gradient(180deg,#061318,#07181e);
      }
      #tide-real-game .tr-stage:before{display:none!important}
      #tide-real-game .tr-stage:after{
        content:"CLICK TO START  •  CLICK AGAIN TO REEL";
        position:absolute;
        top:15px;
        right:18px;
        z-index:2;
        font:750 .6rem ui-monospace,SFMono-Regular,Menlo,monospace;
        letter-spacing:.07em;
        color:rgba(168,206,216,.46);
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
        padding:32px 0 21px;
        position:relative;
        z-index:2;
        border-radius:14px;
        cursor:pointer;
        touch-action:manipulation;
        display:flex;
        justify-content:center;
        align-items:center;
      }
      #tide-real-game .tr-wrap:before{display:none!important}
      #tide-real-game .tr-wrap:focus-visible{outline:none;box-shadow:0 0 0 2px rgba(99,243,209,.7)}

      #tide-real-game .tr-bar{
        position:relative;
        flex:0 0 auto;
        border-radius:0;
        filter:none;
        image-rendering:pixelated;
        image-rendering:crisp-edges;
        cursor:pointer;
        user-select:none;
      }
      #tide-real-game .tr-bg,
      #tide-real-game .tr-overlay,
      #tide-real-game .tr-marker{
        image-rendering:pixelated!important;
        image-rendering:crisp-edges!important;
        filter:none!important;
      }
      #tide-real-game .tr-fill{
        background-repeat:repeat-x!important;
        background-position:left top!important;
        image-rendering:pixelated!important;
        image-rendering:crisp-edges!important;
        box-shadow:none!important;
      }
      #tide-real-game .tr-perfect{
        position:absolute;
        left:45%;
        top:0;
        width:10%;
        height:100%;
        transform:none;
        z-index:4;
        border-left:1px solid rgba(255,215,111,.72);
        border-right:1px solid rgba(255,215,111,.72);
        background:rgba(255,215,111,.035);
        pointer-events:none;
      }
      #tide-real-game .tr-perfect:after{
        content:"PERFECT";
        position:absolute;
        left:50%;
        top:-20px;
        transform:translateX(-50%);
        font:800 .55rem ui-monospace,SFMono-Regular,Menlo,monospace;
        letter-spacing:.09em;
        color:rgba(255,215,111,.78);
      }

      #tide-real-game .tr-status{
        margin:5px 0 0;
        min-height:0;
        padding:7px 11px;
        border:1px solid rgba(155,205,215,.12);
        border-radius:999px;
        background:rgba(255,255,255,.025);
        font-size:.88rem;
      }
      #tide-real-game .tr-sub{margin-top:6px;max-width:560px;min-height:0;font-size:.77rem}
      #tide-real-game .tr-actions{margin-top:10px}
      #tide-real-game #tr-start{display:none!important}
      #tide-real-game .tr-btn.alt{padding:8px 12px;border-radius:10px;font-size:.8rem}

      #tide-real-game .tr-panel{
        border-left:0;
        border-top:0;
        padding:16px 20px 18px;
        display:grid;
        grid-template-columns:220px minmax(0,1fr);
        gap:12px 16px;
        background:linear-gradient(180deg,rgba(255,255,255,.016),rgba(255,255,255,.008));
      }
      #tide-real-game .tr-modes{margin:0;align-self:start}
      #tide-real-game .tr-controls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      #tide-real-game .tr-control{padding:9px 10px;border-radius:12px;min-width:0}
      #tide-real-game .tr-control label{margin-bottom:5px;font-size:.71rem}
      #tide-real-game .tr-control select{padding:7px 8px;font-size:.8rem}
      #tide-real-game .tr-read{grid-column:1/-1;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:0}
      #tide-real-game .tr-read>div{padding:9px 10px;border-radius:11px}
      #tide-real-game .tr-read small{font-size:.67rem}
      #tide-real-game .tr-read strong{font-size:.93rem}
      #tide-real-game .tr-note{grid-column:1/-1;margin-top:0;padding:9px 11px;font-size:.71rem}
      #tide-real-game .tr-compare{padding:0 20px 20px;gap:8px}
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
        #tide-real-game .tr-wrap{padding:28px 0 18px}
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
      headCopy.textContent = 'This uses Tide’s actual bar, overlay, marker, and fill textures. They are only scaled up in whole-pixel steps so the browser version stays faithful to the Minecraft UI.';
    }

    const facts = root.querySelectorAll('.tr-fact');
    if (facts[0]) facts[0].textContent = 'original Tide textures';
    if (facts[1]) facts[1].textContent = 'integer pixel upscale';
    if (facts[2]) facts[2].textContent = '80 ticks / 4 sec';

    const status = document.querySelector('#tr-status');
    const sub = document.querySelector('#tr-sub');
    if (status && !root.classList.contains('running')) status.textContent = 'Click the game field to start';
    if (sub && !root.classList.contains('running')) sub.textContent = 'Then click the field again to reel. Where you click does not matter.';

    const random = document.querySelector('#tr-random');
    if (random) random.textContent = 'Random fish';

    const sizeGame = () => {
      const available = Math.max(240, stage.clientWidth - 64);
      const scale = Math.max(4, Math.min(8, Math.floor(available / 60)));
      const w = 60 * scale;
      const h = 7 * scale;
      bar.style.width = `${w}px`;
      bar.style.height = `${h}px`;
      bar.style.aspectRatio = 'auto';
      wrap.style.width = `${Math.min(w + 24, stage.clientWidth - 20)}px`;
      fill.style.backgroundSize = `${6 * scale}px ${7 * scale}px`;
      root.style.setProperty('--tide-ui-scale', String(scale));
    };
    sizeGame();
    new ResizeObserver(sizeGame).observe(stage);

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
