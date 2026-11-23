/* Random Info Pages: site-wide navigation and reusable workspace tools.
 * Project metadata is supplied exclusively by projects.js. */
(() => {
  'use strict';
  if (window.self !== window.top) return;
  const root = location.pathname.startsWith('/random-info-pages/') ? '/random-info-pages/' : '/';
  const parts = location.pathname.slice(root.length).split('/').filter(Boolean);
  const slug = parts[0];
  const current = () => window.RIPCatalog?.get(slug);
  const key = 'rip-performance-v1';
  const toolNames = {
    time:'Time Zones & Meeting Planner', image:'Image Editor & Converter',
    money:'Money Calculators', text:'Text Tools',pdf:'PDF & Document Tools',
    files:'File & ZIP Tools',media:'Audio & Video Tools',data:'Data Tools & Converters',
    developer:'Developer Tools',math:'Math & Science Calculators',
    random:'Random Pickers & Team Generator',codes:'QR Codes, Barcodes & Passwords',
    network:'Network & Storage Calculators'
  };
  function asset(type,url) {
    const e = document.createElement(type);
    if (type === 'script') { e.src = url; e.async = true; }
    else { e.rel = 'stylesheet'; e.href = url; }
    document.head.append(e);
    return e;
  }
  function toast(message,problem = false) {
    const outlet = document.querySelector('#rip-site-layer .rip-status');
    if (!outlet) return;
    outlet.textContent = message;
    outlet.dataset.problem = String(problem);
  }
  const escapeAttr = value => String(value).replace(/[&<>"']/g,character=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[character]);
  function link(project) { return root + project.slug + '/'; }
  function makeLink(project,className) {
    const a=document.createElement('a');a.className=className;a.href=link(project);
    const title=document.createElement('b');title.textContent=project.d||project.n;
    const category=document.createElement('small');
    category.textContent=project.category+(project.a?' · Archived':project.slug===slug?' · Current':'');
    a.append(title,category);return a;
  }
  const studioState = { view:'suggested', dialog:null, search:null, results:null, browse:null };
  function mount(){
    const catalogue=window.RIPCatalog;
    if(!catalogue)return;
    const record=current();
    if(!record)return; // Standalone nested tools retain their own interfaces.
    catalogue.recordVisit(slug);
    const label=slug==='tools'&&parts[1]&&toolNames[parts[1]]?toolNames[parts[1]]:
      slug==='oldasspolitic'&&parts[1]==='member'?'Congress Member Profile':record.d||record.n;
    const layer=document.createElement('div');
    layer.id='rip-site-layer';
    layer.innerHTML =
      '<div class="rip-site-rail" role="navigation" aria-label="Site-wide navigation">'+
        '<div class="rip-identity"><a class="rip-home" href="'+root+'" aria-label="Random Info Pages home">'+
          '<span class="rip-icon" aria-hidden="true">R</span><span class="rip-home-name">RANDOM INFO PAGES</span></a>'+
          '<span class="rip-divider" aria-hidden="true"></span><span class="rip-here"></span></div>'+
        '<div class="rip-actions"><a class="rip-archive" href="'+root+'archive/">Archive</a>'+
          '<button type="button" class="rip-favorite" aria-label="Favorite project" aria-pressed="false" title="Favorite this project">☆</button>'+
          '<button type="button" class="rip-open-studio">Studio</button>'+
          '<button type="button" class="rip-browse" aria-haspopup="dialog">Explore projects</button></div></div>'+
      '<dialog class="rip-search" aria-label="Browse Random Info Pages">'+
        '<div class="rip-search-head"><div class="rip-search-eyebrow"><span>Random Info Pages / Find a project</span>'+
        '<button type="button" class="rip-close" aria-label="Close project browser">ESC</button></div>'+
        '<input class="rip-search-input" type="search" placeholder="Try a name, topic, or even a typo" aria-label="Search projects" autocomplete="off"></div>'+
        '<div class="rip-results" aria-live="polite"></div>'+
        '<div class="rip-search-foot"><span>'+catalogue.active.length+' active · '+catalogue.archived.length+' archived</span>'+
          '<a href="'+root+'archive/">Archive</a></div></dialog>'+
      '<dialog class="rip-studio-dialog" aria-label="Project Studio">'+
        '<div class="rip-studio-head"><div><span class="rip-studio-eyebrow">RANDOM INFO PAGES / WORKSPACE</span>'+
        '<h2>Project studio<span class="rip-studio-dot">.</span></h2><p class="rip-studio-current"></p></div>'+
        '<button type="button" class="rip-studio-close" aria-label="Close studio">✕</button></div>'+
        '<div class="rip-studio-body"><div class="rip-studio-actions" role="group" aria-label="Project actions">'+
          '<button type="button" data-rip-action="share"><span aria-hidden="true">↗</span> Share link</button>'+
          '<button type="button" data-rip-action="fullscreen"><span aria-hidden="true">⛶</span> Fullscreen</button>'+
          '<button type="button" data-rip-action="capture"><span aria-hidden="true">▣</span> Save image</button>'+
          '<button type="button" data-rip-action="save"><span aria-hidden="true">⇩</span> Save project</button>'+
          '<button type="button" data-rip-action="open"><span aria-hidden="true">⇧</span> Open project</button>'+
          '<button type="button" data-rip-action="print"><span aria-hidden="true">▤</span> Print</button>'+
          '<button type="button" data-rip-action="performance" aria-pressed="false"><span aria-hidden="true">◉</span> Reduce effects</button>'+
          '<button type="button" data-rip-action="help"><span aria-hidden="true">?</span> Shortcuts</button></div>'+
        '<div class="rip-studio-lists"><div class="rip-studio-tabs" role="tablist" aria-label="Project recommendations">'+
          '<button type="button" data-rip-view="suggested" aria-selected="true" role="tab">Related</button>'+
          '<button type="button" data-rip-view="favorites" aria-selected="false" role="tab">Favorites</button>'+
          '<button type="button" data-rip-view="recent" aria-selected="false" role="tab">Recent</button></div>'+
          '<div class="rip-studio-links"></div></div>'+
        '<p class="rip-studio-note">Settings stay on your device. Save/open project works on supported pages. Image export captures the main canvas, not the entire webpage.</p>'+
        '<p class="rip-status" aria-live="polite" role="status"></p></div>'+
        '<input class="rip-open-file" type="file" accept=".json,application/json" hidden></dialog>';
    layer.querySelector('.rip-here').textContent=label;
    layer.querySelector('.rip-studio-current').textContent=label;
    document.body.insertBefore(layer,document.body.firstChild);
    const fav=layer.querySelector('.rip-favorite');
    const updateFavorite=()=>{
      const selected=catalogue.favorites().includes(slug);
      fav.textContent=selected?'★':'☆';
      fav.setAttribute('aria-pressed',String(selected));
      fav.title=selected?'Remove from favorites':'Add to favorites';
    };
    fav.addEventListener('click',()=>{
      catalogue.toggleFavorite(slug);
      updateFavorite();renderStudioLinks();
    });
    updateFavorite();
    const browser=layer.querySelector('.rip-search'),query=layer.querySelector('.rip-search-input');
    const results=layer.querySelector('.rip-results');
    const studio=layer.querySelector('.rip-studio-dialog');
    studioState.dialog=studio;studioState.search=query;studioState.results=results;
    function browse(){
      showResults();
      if (!browser.open)browser.showModal();
      query.focus();
    }
    function showResults(){
      const matches=catalogue.search(query.value,{includeArchived:true,limit:80});
      results.replaceChildren(...matches.map(p=>makeLink(p,'rip-result')));
      if(!matches.length){
        const none=document.createElement('p');
        none.className='rip-empty';none.textContent='No matches. Try a shorter query.';
        results.append(none);
      }
    }
    layer.querySelector('.rip-browse').addEventListener('click',browse);
    layer.querySelector('.rip-close').addEventListener('click',()=>browser.close());
    query.addEventListener('input',showResults);
    query.addEventListener('keydown',event=>{
      const items=[...results.querySelectorAll('a')];
      if(event.key==='Enter'&&items.length){event.preventDefault();location.href=items[0].href;}
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){
        event.preventDefault();
        const selected=items.indexOf(document.activeElement);
        const next=items[(selected+(event.key==='ArrowDown'?1:-1)+items.length)%items.length];
        next?.focus();
      }
    });
    for(const modal of [browser,studio]){
      modal.addEventListener('click',event=>{if(event.target===modal)modal.close()});
    }
    layer.querySelector('.rip-open-studio').addEventListener('click',()=>{
      refreshAdapterButtons();
      renderStudioLinks();
      if(!studio.open)studio.showModal();
    });
    layer.querySelector('.rip-studio-close').addEventListener('click',()=>studio.close());
    studio.querySelectorAll('[data-rip-view]').forEach(button=>button.addEventListener('click',()=>{
      studioState.view=button.dataset.ripView;
      renderStudioLinks();
    }));
    function renderStudioLinks(){
      studio.querySelectorAll('[data-rip-view]').forEach(button=>button.setAttribute('aria-selected',
        String(button.dataset.ripView===studioState.view)));
      const list=studio.querySelector('.rip-studio-links');
      const records=studioState.view==='favorites'?catalogue.favorites().map(catalogue.get):
        studioState.view==='recent'?catalogue.recent().map(catalogue.get):
          catalogue.related(slug,6);
      list.replaceChildren(...records.filter(Boolean).map(p=>makeLink(p,'rip-studio-project')));
      if(!list.children.length){
        const msg=document.createElement('p');msg.className='rip-empty';
        msg.textContent=studioState.view==='favorites'?'Favorite some pages to see them here.':
          studioState.view==='recent'?'Recently visited projects will appear here.':'No related projects found.';
        list.append(msg);
      }
    }
    function adapter(){return window.RIPStudio||null}
    function refreshAdapterButtons(){
      const app=adapter();
      studio.querySelector('[data-rip-action="save"]').disabled=typeof app?.getState!=='function';
      studio.querySelector('[data-rip-action="open"]').disabled=typeof app?.setState!=='function';
      studio.querySelector('[data-rip-action="capture"]').disabled=
        typeof app?.capture!=='function'&&!document.querySelector('canvas');
      studio.querySelector('[data-rip-action="performance"]').setAttribute('aria-pressed',
        String(document.documentElement.dataset.ripPerformance==='low'));
    }
    const fileInput=studio.querySelector('.rip-open-file');
    fileInput.addEventListener('change',async()=>{
      const file=fileInput.files?.[0];fileInput.value='';
      if(!file)return;
      if(file.size>10*1024*1024){toast('Project file is larger than 10 MB.',true);return}
      try{
        const parsed=JSON.parse(await file.text());
        if(parsed.version!==1||parsed.project!==slug||!parsed.state||typeof parsed.state!=='object')
          throw new Error('This is not a saved project for '+label);
        await adapter()?.setState(parsed.state);
        toast('Project restored.');
      }catch(error){toast('Could not open project: '+error.message,true)}
    });
    function download(blob,name){
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
    }
    async function doAction(action){
      const app=adapter();
      if(action==='share'){
        try{await navigator.clipboard.writeText(location.href);toast('Link copied.')}
        catch{window.prompt('Copy this project link',location.href);toast('Link ready to copy.')}
      }else if(action==='fullscreen'){
        try{
          if(document.fullscreenElement)await document.exitFullscreen();
          else await (document.querySelector('[data-rip-stage]')||document.querySelector('main')||document.documentElement).requestFullscreen();
          toast('Fullscreen changed.');
        }catch{toast('Fullscreen is unavailable on this device.',true)}
      }else if(action==='print')window.print();
      else if(action==='capture'){
        try{
          if(typeof app?.capture==='function'){
            const output=await app.capture();
            if(!(output instanceof Blob))throw new Error('Page did not return an image');
            download(output,slug+'-image.png');
          }else{
            const canvases=[...document.querySelectorAll('canvas')]
              .filter(el=>el.width&&el.height&&el.getClientRects().length &&
                getComputedStyle(el).visibility!=='hidden');
            const target=canvases.sort((a,b)=>b.width*b.height-a.width*a.height)[0];
            if(!target)throw new Error('No visible canvas to capture');
            const blob=await new Promise((resolve,reject)=>target.toBlob(
              value=>value?resolve(value):reject(new Error('Canvas export was blocked')),'image/png'));
            download(blob,slug+'-canvas.png');
          }
          toast('Image saved.');
        }catch(error){toast(error.message||'Unable to capture image.',true)}
      }else if(action==='save'){
        if(typeof app?.getState!=='function'){toast('This page does not support project snapshots yet.',true);return}
        try{
          const state=await app.getState();
          const data={version:1,project:slug,created:new Date().toISOString(),state};
          download(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),slug+'-project.json');
          toast('Editable project exported.');
        }catch(error){toast('Could not save project: '+error.message,true)}
      }else if(action==='open')fileInput.click();
      else if(action==='performance'){
        const low=document.documentElement.dataset.ripPerformance!=='low';
        document.documentElement.dataset.ripPerformance=low?'low':'normal';
        try{localStorage.setItem(key,low?'low':'normal')}catch{}
        try{await app?.setQuality?.(low?'eco':'default')}catch{}
        refreshAdapterButtons();
        toast(low?'Reduced effects enabled.':'Normal effects restored.');
      }else if(action==='help'){
        toast('Ctrl+K: browse · Ctrl+Shift+P: studio · Esc: close · /: search (on the homepage).');
      }
    }
    studio.querySelectorAll('[data-rip-action]').forEach(button=>button.addEventListener('click',()=>{
      void doAction(button.dataset.ripAction);
    }));
    document.addEventListener('keydown',event=>{
      const editable=event.target?.matches?.('input,textarea,select,[contenteditable="true"]');
      if(editable)return;
      if((event.ctrlKey||event.metaKey)&&event.shiftKey&&event.key.toLowerCase()==='p'){
        event.preventDefault();refreshAdapterButtons();renderStudioLinks();if(!studio.open)studio.showModal();
      }else if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
        event.preventDefault();browse();
      }
    });
    try{if(localStorage.getItem(key)==='low')document.documentElement.dataset.ripPerformance='low'}catch{}
    // Keep a read-only, privacy-preserving fallback. No analytics or user data are transmitted.
    if('serviceWorker' in navigator&&location.protocol==='https:'){
      window.addEventListener('load',()=>navigator.serviceWorker.register(root+'sw.js',{scope:root})
        .catch(()=>{}),{once:true});
    }
    window.RIPStudioHost=Object.freeze({
      open:()=>{refreshAdapterButtons();renderStudioLinks();studio.showModal()},
      share:()=>doAction('share'),browse,
      favorite:()=>catalogue.toggleFavorite(slug),
      project:record
    });
  }
  // Use one canonical registry for both homepage and navigation. No duplicated
  // hand-maintained list in this file.
  if (window.RIPCatalog)mount();
  else {
    const resource=asset('script',root+'design-system/projects.js');
    resource.addEventListener('load',mount,{once:true});
  }
  asset('link',root+'design-system/studio.css');
  if(!document.querySelector('link[rel="manifest"]')){
    const manifest=document.createElement('link');
    manifest.rel='manifest';
    manifest.href=root+'site.webmanifest';
    document.head.append(manifest);
  }
})();
