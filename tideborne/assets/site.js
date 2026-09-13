(() => {
  'use strict';
  const BASE = '/random-info-pages/tideborne';
  const THEME_CSS = `${BASE}/assets/fish-wiki-integration.css`;
  const LOGO = `${BASE}/assets/tideborne-field-guide.svg`;
  const pages = [
    ['Home', `${BASE}/`, 'Start', 'Tideborne overview'],
    ['Getting Started', `${BASE}/getting-started/`, 'Start', 'Catch your first fish and learn the main systems'],
    ['Tide 2 Basics', `${BASE}/tide/`, 'Start', 'The base fishing mod Tideborne builds on'],
    ['Fishing', `${BASE}/fishing/`, 'Fishing', 'How Tideborne turns a catch into a specimen'],
    ['Specimens', `${BASE}/fishing/specimens/`, 'Fishing', 'Size, traits, identity and records'],
    ['Body Types', `${BASE}/fishing/body-types/`, 'Fishing', 'Normal, Giant and Dwarf fish'],
    ['Condition', `${BASE}/fishing/condition/`, 'Fishing', 'Normal, Scarred and Parasite-Ridden condition'],
    ['Pigmentation', `${BASE}/fishing/pigmentation/`, 'Fishing', 'Normal, Albino and Iridescent pigmentation'],
    ['Quality', `${BASE}/fishing/quality/`, 'Fishing', 'Perfect Specimen quality'],
    ['Trait Luck', `${BASE}/fishing/trait-luck/`, 'Fishing', 'Chance of special specimen traits'],
    ['Trait Momentum', `${BASE}/fishing/momentum/`, 'Fishing', 'Bad-luck protection for specimen traits'],
    ['Perfect Catch', `${BASE}/fishing/perfect-catch/`, 'Fishing', 'How perfect timing helps future catches'],
    ['FishScore', `${BASE}/fishing/fishscore/`, 'Fishing', 'The 1–3000 trophy score'],
    ['Fish Wiki', `${BASE}/fish/`, 'Systems', 'Browse fish, source-backed renders, habitats, sizes and score context'],
    ['Gear', `${BASE}/gear/`, 'Systems', 'Lines, leaders, bobbers, hooks and bait'],
    ["Angler's Satchel", `${BASE}/satchel/`, 'Systems', 'Store, sort and protect fish'],
    ['Journal & Teams', `${BASE}/journal/`, 'Systems', 'Discovery, records and team progress'],
    ['Sharks & Ecosystem', `${BASE}/ecosystem/`, 'Systems', 'Sharks, chum, scent and catch loss'],
    ['Configuration', `${BASE}/config/`, 'Reference', 'Fishing, Satchel, Journal, ecosystem and client settings'],
    ['Exact Mechanics', `${BASE}/reference/mechanics/`, 'Reference', 'Exact formulas, values and tables'],
    ['Compatibility', `${BASE}/compatibility/`, 'Reference', 'Tide 2, optional mods and old worlds']
  ];
  const iconSearch = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6.6" stroke="currentColor" stroke-width="1.8"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  const iconMenu = `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  const groups = [
    ['Start', ['Home','Getting Started','Tide 2 Basics']],
    ['Fishing', ['Fishing','Specimens','Body Types','Condition','Pigmentation','Quality','Trait Luck','Trait Momentum','Perfect Catch','FishScore']],
    ['Systems', ['Fish Wiki','Gear',"Angler's Satchel",'Journal & Teams','Sharks & Ecosystem']],
    ['Reference', ['Configuration','Exact Mechanics','Compatibility']]
  ];
  const currentPath = location.pathname.replace(/index\.html$/, '');
  const byName = Object.fromEntries(pages.map(p => [p[0],p]));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function ensureThemeStyles(){
    if(document.querySelector(`link[href="${THEME_CSS}"]`)) return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=THEME_CSS;
    document.head.append(link);
  }
  function initialTheme(){
    const saved=localStorage.getItem('tideborne-theme');
    document.documentElement.dataset.theme=saved==='light'?'light':'dark';
  }
  function brandHtml(){
    return `<a class="brand" href="${BASE}/" aria-label="Tideborne home"><img class="brand-logo" src="${LOGO}" alt=""><span class="brand-copy"><strong>Tideborne</strong><small>Field guide</small></span></a>`;
  }
  function header(){
    const el=document.querySelector('[data-site-header]');
    if(!el)return;
    el.innerHTML=`<a class="skip" href="#main">Skip to content</a><div class="progress" aria-hidden="true"></div><header class="site-header"><div class="wrap header-inner">${brandHtml()}<nav class="top-nav" aria-label="Primary"><a href="${BASE}/getting-started/">Start</a><a href="${BASE}/fishing/">Fishing</a><a href="${BASE}/fish/">Fish Wiki</a><a href="${BASE}/gear/">Gear</a><a href="${BASE}/satchel/">Satchel</a><a href="${BASE}/journal/">Journal</a></nav><button class="search-trigger" type="button" data-open-search aria-label="Search Tideborne">${iconSearch}<span>Search wiki</span><kbd>Ctrl K</kbd></button><button class="theme-trigger" type="button" data-theme-toggle aria-label="Use light theme" title="Change theme">◐</button><button class="header-action menu-trigger" data-open-menu type="button" aria-label="Open navigation">${iconMenu}</button></div></header>`;
  }
  function sideLinks(){
    return groups.map(([label,names])=>`<div class="nav-group"><div class="nav-label">${label}</div>${names.map(n=>{const p=byName[n],active=currentPath===p[1]||(p[1]!==`${BASE}/`&&currentPath.startsWith(p[1]));return `<a class="side-link${active?' active':''}" href="${p[1]}"${active?' aria-current="page"':''}>${esc(n)}</a>`}).join('')}</div>`).join('');
  }
  function sidebar(){const el=document.querySelector('[data-sidebar]');if(el)el.innerHTML=sideLinks()}
  function footer(){
    const el=document.querySelector('[data-site-footer]');
    if(!el)return;
    el.innerHTML=`<footer class="footer"><div class="wrap footer-grid"><div><strong>Tideborne field guide</strong><div>Tide 2 fishing with Tideborne specimens, records and storage.</div></div><div><a href="${BASE}/fish/">Fish Wiki</a> · <a href="${BASE}/reference/mechanics/">Exact Mechanics</a> · <a href="${BASE}/compatibility/">Compatibility</a></div></div></footer>`;
  }
  function bindTheme(){
    const button=document.querySelector('[data-theme-toggle]');
    if(!button)return;
    const sync=()=>button.setAttribute('aria-label',document.documentElement.dataset.theme==='dark'?'Use light theme':'Use dark theme');
    button.addEventListener('click',()=>{
      const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
      document.documentElement.dataset.theme=next;
      localStorage.setItem('tideborne-theme',next);
      sync();
    });
    sync();
  }
  function commandPalette(){
    const host=document.createElement('div');
    host.className='command-backdrop';
    host.setAttribute('aria-hidden','true');
    host.innerHTML=`<div class="command" role="dialog" aria-modal="true" aria-label="Search Tideborne"><div class="command-search">${iconSearch}<input aria-label="Search" autocomplete="off" placeholder="Search fish, gear, FishScore…"></div><div class="command-results"></div></div>`;
    document.body.append(host);
    const input=host.querySelector('input'),results=host.querySelector('.command-results');
    let focus=0,filtered=[];
    const render=()=>{const q=input.value.trim().toLowerCase();filtered=pages.filter(p=>!q||(`${p[0]} ${p[2]} ${p[3]}`).toLowerCase().includes(q)).slice(0,10);focus=Math.min(focus,Math.max(filtered.length-1,0));results.innerHTML=filtered.length?filtered.map((p,i)=>`<a class="command-item${i===focus?' focused':''}" href="${p[1]}"><span>${esc(p[0])}<small style="display:block">${esc(p[3])}</small></span><small>${esc(p[2])}</small></a>`).join(''):`<div class="command-empty">No matching pages.</div>`};
    const open=()=>{host.classList.add('open');host.setAttribute('aria-hidden','false');input.value='';focus=0;render();requestAnimationFrame(()=>input.focus())};
    const close=()=>{host.classList.remove('open');host.setAttribute('aria-hidden','true')};
    document.addEventListener('click',e=>{if(e.target.closest('[data-open-search]'))open();if(e.target===host)close()});
    document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open()}if(e.key==='Escape'&&host.classList.contains('open'))close()});
    input.addEventListener('input',()=>{focus=0;render()});
    input.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();focus=Math.min(focus+1,filtered.length-1);render()}if(e.key==='ArrowUp'){e.preventDefault();focus=Math.max(focus-1,0);render()}if(e.key==='Enter'&&filtered[focus])location.href=filtered[focus][1]});
  }
  function mobileSheet(){
    const host=document.createElement('div');
    host.className='mobile-sheet';
    host.innerHTML=`<div class="mobile-panel" role="dialog" aria-modal="true" aria-label="Tideborne navigation"><button class="mobile-close" type="button">Close</button>${brandHtml()}<nav class="mobile-nav">${sideLinks()}</nav></div>`;
    document.body.append(host);
    const open=()=>{host.classList.add('open');document.body.style.overflow='hidden';host.querySelector('.mobile-close').focus()},close=()=>{host.classList.remove('open');document.body.style.overflow=''};
    document.addEventListener('click',e=>{if(e.target.closest('[data-open-menu]'))open();if(e.target===host||e.target.closest('.mobile-close'))close()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&host.classList.contains('open'))close()});
  }
  function toc(){
    const el=document.querySelector('[data-toc]');if(!el)return;
    const heads=[...document.querySelectorAll('.article h2[id],.article h3[id]')];
    if(!heads.length){el.remove();return}
    el.innerHTML=`<div class="toc-title">On this page</div>${heads.map(h=>`<a href="#${h.id}"${h.tagName==='H3'?' style="padding-left:20px"':''}>${esc(h.textContent)}</a>`).join('')}`;
  }
  function reveal(){
    const els=[...document.querySelectorAll('[data-reveal]')];
    if(!('IntersectionObserver'in window)){els.forEach(e=>e.classList.add('revealed'));return}
    const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('revealed');io.unobserve(e.target)}}),{rootMargin:'0px 0px -6%'});
    els.forEach(e=>io.observe(e));
  }
  function progress(){const update=()=>{const max=document.documentElement.scrollHeight-innerHeight;document.documentElement.style.setProperty('--scroll',max?`${Math.min(100,scrollY/max*100)}%`:'0%')};addEventListener('scroll',update,{passive:true});update()}
  function markTopNav(){document.querySelectorAll('.top-nav a').forEach(a=>{const href=new URL(a.href).pathname;if(currentPath===href||(href!==`${BASE}/`&&currentPath.startsWith(href)))a.setAttribute('aria-current','page')})}

  ensureThemeStyles();
  initialTheme();
  header();
  sidebar();
  footer();
  bindTheme();
  commandPalette();
  mobileSheet();
  toc();
  reveal();
  progress();
  markTopNav();
})();