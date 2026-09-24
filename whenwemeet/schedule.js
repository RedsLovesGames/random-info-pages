(() => {
  const DATA_URL = './schedule-data.json?v=20260924b';
  const CSS_URL = './schedule.css?v=20260924b';
  const appMain = document.querySelector('main');
  const header = document.querySelector('.site-header');
  const headerActions = document.querySelector('.header-actions');
  if (!appMain || !header || !headerActions || document.querySelector('#general-schedule-view')) return;

  if (!document.querySelector('link[href^="./schedule.css"]')) {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = CSS_URL; document.head.append(link);
  }
  const extra = document.createElement('style');
  extra.textContent = `
    .locked-grid-card{border:1px solid var(--line);border-radius:20px;background:var(--surface);overflow:hidden;box-shadow:0 16px 44px rgba(31,36,48,.055)}
    .locked-grid-head{display:flex;justify-content:space-between;gap:18px;align-items:end;padding:17px 18px 14px;border-bottom:1px solid var(--line)}
    .locked-grid-head h2{margin:4px 0 0;font-size:1.15rem}.locked-grid-head p:last-child{margin:0;color:var(--muted);font-size:.73rem}
    .locked-scroll{overflow:auto;overscroll-behavior-inline:contain}.locked-grid{display:grid;min-width:650px;background:var(--surface-solid)}
    .locked-grid .grid-corner,.locked-grid .date-head,.locked-grid .time-head{position:sticky;z-index:3}.locked-grid .grid-corner,.locked-grid .date-head{top:0}.locked-grid .time-head{left:0;z-index:2}
    .locked-cell{min-height:36px;border:0;border-right:1px solid var(--line);border-bottom:1px solid var(--line);font:inherit;font-size:.68rem;font-weight:800;cursor:pointer;color:var(--muted);background:var(--surface-solid)}
    .locked-cell[data-heat="0"]{background:var(--surface-muted);color:var(--muted)}.locked-cell[data-heat="1"]{background:#eef8f3}.locked-cell[data-heat="2"]{background:#d8f1e5}.locked-cell[data-heat="3"]{background:#aee3ca}.locked-cell[data-heat="4"]{background:#62c99b;color:#10271e}
    .locked-cell.selected{outline:3px solid var(--violet);outline-offset:-3px;position:relative;z-index:2}.locked-detail{margin:14px 0 0;padding:14px 16px;border:1px solid var(--line);border-radius:14px;background:var(--surface);display:grid;gap:5px}.locked-detail span{color:var(--muted);font-size:.8rem}
    @media(prefers-color-scheme:dark){.locked-cell[data-heat="0"]{background:#191d26}.locked-cell[data-heat="1"]{background:#173126}.locked-cell[data-heat="2"]{background:#1c513a}.locked-cell[data-heat="3"]{background:#267a55}.locked-cell[data-heat="4"]{background:#35a874;color:#081c14}}
    @media(max-width:760px){.locked-grid-head{align-items:flex-start;flex-direction:column}.general-schedule-view{padding-top:20px}.schedule-hero h1{font-size:clamp(2.5rem,13vw,4rem)}}`;
  document.head.append(extra);

  const viewState = { data:null, active:new Set(), view:'planner', selected:null, previousTitle:document.title };
  const nav = document.createElement('nav');
  nav.className='product-tabs'; nav.setAttribute('role','tablist'); nav.setAttribute('aria-label','WhenWeMeet sections');
  nav.innerHTML='<button class="product-tab active" type="button" data-product-tab="planner">Planner</button><button class="product-tab" type="button" data-product-tab="schedule">Locked schedule</button>';
  header.insertBefore(nav,headerActions);

  const section=document.createElement('section'); section.id='general-schedule-view'; section.className='general-schedule-view'; section.hidden=true;
  section.innerHTML=`<div class="schedule-shell"><div class="schedule-hero"><div><p class="eyebrow">Recurring weekly availability</p><h1>Locked schedule</h1><p class="schedule-lead">The same overlap format as the planner, generated from fixed weekly commitments. Brighter green means more selected people are free.</p></div><div class="schedule-key"><span><i class="key-free"></i> More people free</span></div></div><section class="schedule-controls"><div class="schedule-filter-block"><span class="schedule-filter-label">People</span><div id="locked-people" class="person-filters"></div></div></section><section class="locked-grid-card"><div class="locked-grid-head"><div><p class="step-label">Weekly overlap</p><h2>Who is normally free?</h2></div><p>30-minute blocks · 8:00 AM to 10:00 PM</p></div><div class="locked-scroll"><div id="locked-grid" class="availability-grid locked-grid"></div></div></section><div id="locked-detail" class="locked-detail"><strong>Tap a time</strong><span>See who is free and who has a fixed conflict.</span></div><details class="schedule-notes"><summary>Spreadsheet assumptions</summary><ul id="locked-notes"></ul></details></div>`;
  appMain.insertAdjacentElement('afterend',section);
  const peopleEl=section.querySelector('#locked-people'), grid=section.querySelector('#locked-grid'), detail=section.querySelector('#locked-detail'), notes=section.querySelector('#locked-notes');

  const fmt=(m)=>{const h=Math.floor(m/60)%24,mm=m%60;return `${h%12||12}:${String(mm).padStart(2,'0')} ${h>=12?'PM':'AM'}`};
  const conflicts=(person,day,start,end)=>viewState.data.events.filter(e=>e.counted&&e.person===person&&e.day===day&&e.start<end&&e.end>start);
  const activePeople=()=>viewState.data.people.filter(p=>viewState.active.has(p));

  function renderFilters(){peopleEl.replaceChildren();for(const person of viewState.data.people){const b=document.createElement('button');b.type='button';b.className=`person-filter${viewState.active.has(person)?' active':''}`;b.textContent=person;b.setAttribute('aria-pressed',viewState.active.has(person));b.onclick=()=>{if(viewState.active.has(person)&&viewState.active.size>1)viewState.active.delete(person);else viewState.active.add(person);render();};peopleEl.append(b)}}
  function renderGrid(){grid.replaceChildren();const days=viewState.data.days, people=activePeople();grid.style.setProperty('--days',days.length);grid.style.gridTemplateColumns=`76px repeat(${days.length},minmax(78px,1fr))`;
    const corner=document.createElement('div');corner.className='grid-corner';grid.append(corner);for(const day of days){const h=document.createElement('div');h.className='date-head';h.innerHTML=`<strong>${day.slice(0,3)}</strong><span>weekly</span>`;grid.append(h)}
    for(let minute=480;minute<1320;minute+=30){const t=document.createElement('div');t.className='time-head';t.textContent=fmt(minute);grid.append(t);for(const day of days){const free=people.filter(p=>conflicts(p,day,minute,minute+30).length===0);const ratio=people.length?free.length/people.length:0;const heat=ratio<=0?0:Math.max(1,Math.ceil(ratio*4));const cell=document.createElement('button');cell.type='button';cell.className=`locked-cell${viewState.selected===`${day}|${minute}`?' selected':''}`;cell.dataset.heat=heat;cell.textContent=`${free.length}/${people.length}`;cell.title=`${day} ${fmt(minute)}: ${free.length} of ${people.length} free`;cell.onclick=()=>{viewState.selected=`${day}|${minute}`;renderGrid();renderDetail(day,minute)};grid.append(cell)}}}
  function renderDetail(day,minute){const people=activePeople(),free=[],busy=[];for(const p of people){const hits=conflicts(p,day,minute,minute+30);if(hits.length)busy.push(`${p} (${hits.map(e=>e.event).join(', ')})`);else free.push(p)}detail.replaceChildren();const strong=document.createElement('strong');strong.textContent=`${day} · ${fmt(minute)}–${fmt(minute+30)}`;const a=document.createElement('span');a.textContent=`Free: ${free.join(', ')||'None'}`;const b=document.createElement('span');b.textContent=`Busy: ${busy.join(' · ')||'None'}`;detail.append(strong,a,b)}
  function render(){if(!viewState.data)return;renderFilters();renderGrid();if(viewState.selected){const [d,m]=viewState.selected.split('|');renderDetail(d,Number(m))}}
  function setView(which){viewState.view=which==='schedule'?'schedule':'planner';const on=viewState.view==='schedule';if(on)viewState.previousTitle=document.title;appMain.hidden=on;section.hidden=!on;nav.querySelectorAll('[data-product-tab]').forEach(b=>{const active=b.dataset.productTab===viewState.view;b.classList.toggle('active',active);b.setAttribute('aria-selected',active)});document.title=on?'Locked Schedule | WhenWeMeet':viewState.previousTitle}
  nav.onclick=e=>{const b=e.target.closest('[data-product-tab]');if(b)setView(b.dataset.productTab)};
  fetch(DATA_URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`Schedule data failed (${r.status})`);return r.json()}).then(data=>{viewState.data=data;viewState.active=new Set(data.people);notes.replaceChildren(...data.notes.map(n=>{const li=document.createElement('li');li.textContent=n;return li}));render()}).catch(err=>{console.error(err);grid.innerHTML='<div class="schedule-load-error">The locked schedule could not be loaded.</div>'});
})();
