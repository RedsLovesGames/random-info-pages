/* User-controlled, privacy-local display diagnostics. Not a physics benchmark. */
let active=null;
export function showDiagnostics(){
 if(active){active.close();return null}
 const panel=document.createElement('aside');
 panel.id='rip-diagnostics';
 panel.setAttribute('role','region');
 panel.setAttribute('aria-label','Display diagnostics');
 panel.innerHTML='<div class="rip-diagnostic-head"><strong>Browser diagnostics</strong>'+
  '<button type="button" aria-label="Close diagnostics">✕</button></div>'+
  '<div class="rip-diagnostic-values">'+
  '<span>Display frames / s</span><b data-fps>…</b>'+
  '<span>App updates / s</span><b data-app>Not supplied</b>'+
  '<span>App quality / grid</span><b data-quality>Not supplied</b>'+
  '<span>Largest visible canvas</span><b data-size>…</b>'+
  '<span>Pixel ratio</span><b data-dpr>…</b>'+
  '<span>Device memory*</span><b data-memory>…</b>'+
  '<span>CPU threads*</span><b data-threads>…</b></div>'+
  '<p>Browser animation-frame cadence, not simulation or GPU throughput. *Estimated or unavailable depending on browser.</p>';
 const style=document.createElement('link');
 style.rel='stylesheet';style.dataset.ripMonitorCss='';
 style.href=new URL('./monitor.css',import.meta.url).href;
 if(!document.querySelector('link[data-rip-monitor-css]'))document.head.append(style);
 document.body.append(panel);
 let raf=0,frames=0,last=performance.now();
 const el=(key)=>panel.querySelector('[data-'+key+']');
 el('dpr').textContent=(window.devicePixelRatio||1).toFixed(2)+'×';
 el('threads').textContent=String(navigator.hardwareConcurrency||'Unknown');
 el('memory').textContent=navigator.deviceMemory?navigator.deviceMemory+' GB (approx.)':'Unavailable';
 function tick(now){
  if(!panel.isConnected)return;
  if(!document.hidden){
   frames++;
   if(now-last>=1000){
    const duration=(now-last)/1000;
    el('fps').textContent=(frames/duration).toFixed(0)+' fps';
    let stats=null;
    try{stats=window.RIPStudio?.metrics?.()||null}catch{}
    el('app').textContent=stats&&Number.isFinite(stats.fps)?stats.fps+' updates/s':'Not supplied';
    el('quality').textContent=stats?[stats.quality,stats.grid].filter(Boolean).join(' · ')||'Not supplied':'Not supplied';
    const canvases=[...document.querySelectorAll('canvas')].filter(c=>!c.hidden&&
      c.getClientRects().length>0&&c.width>0&&c.height>0);
    const canvas=canvases.sort((a,b)=>b.width*b.height-a.width*a.height)[0];
    el('size').textContent=canvas?canvas.width+' × '+canvas.height:'None';
    frames=0;last=now;
   }
  }else{frames=0;last=now}
  raf=requestAnimationFrame(tick);
 }
 function close(){cancelAnimationFrame(raf);panel.remove();active=null}
 panel.querySelector('button').addEventListener('click',close);
 active={close};
 raf=requestAnimationFrame(tick);
 return active;
}
