/* Random Info Pages / Accessible shared cross-project navigation
   Does not modify app state, event listeners, local storage, or project internals. */
(()=>{
'use strict';
if(window.self!==window.top)return; // Don't put site navigation in project preview iframes.
const catalog=[
 ['belief-atlas','Public Figure Beliefs & Claims','Data & Research','belief claims evidence people'],
 ['9-11-timeline','September 11: Message Timeline','Data & Research','historical messages 9/11 timeline'],
 ['fiction-workspace','Novel Writing & Revision','Utilities','draftroom fiction chapters'],
 ['algorithm-arena','Algorithm Visualizer','Interactive Labs','sort graphs pathfinding'],
 ['cryptography-museum','Interactive Cryptography Museum','Interactive Labs','ciphers encoding encryption'],
 ['music-microscope','Music & Audio Analyzer','Interactive Labs','waveforms frequencies spectrogram'],
 ['one-million','Visualizing One Million','Data & Research','million quantities scale'],
 ['infrastructure-atlas','U.S. Infrastructure Report Cards','Data & Research','map states ASCE bridges'],
 ['political-grid','100-Statement Political Survey','Data & Research','political community grid'],
 ['tools','Everyday Web Tools','Utilities','image pdf money text converters'],
 ['wheel','Random Choice Wheel','Utilities','spin random picker'],
 ['whenwemeet','Group Availability Planner','Utilities','meeting schedule when we meet'],
 ['school-schedule','Class & Assignment Planner','School & Planning','classes due dates'],
 ['friends','Friend Quotes & Games','Friends & Social','discord patch notes guess who'],
 ['stock-fights','Stock Image Fight Simulator','Games & Experiences','fighters Spenn game'],
 ['oldasspolitic','U.S. Congress Age Explorer','Data & Research','senate house congress members'],
 ['heatmap','10Groups Comparison Heatmap','Data & Research','people coordinate comparison'],
 ['wanuiv2','AI Video Scene Director','Interactive Labs','Emperor Director WAN'],
 ['nerdcore-prompts','Nerdcore Song Prompt Builder','Interactive Labs','lyrics songs prompts']
];
const toolNames={time:'Time Zones & Meeting Planner',image:'Image Editor & Converter',money:'Money Calculators',text:'Text Tools',pdf:'PDF & Document Tools',files:'File & ZIP Tools',media:'Audio & Video Tools',data:'Data Tools & Converters',developer:'Developer Tools',math:'Math & Science Calculators',random:'Random Pickers & Team Generator',codes:'QR Codes, Barcodes & Passwords',network:'Network & Storage Calculators'};
const rootPath=location.pathname.startsWith('/random-info-pages/')?'/random-info-pages/':'/';
const relative=location.pathname.slice(rootPath.length).split('/').filter(Boolean);
const key=relative[0];
const record=catalog.find(p=>p[0]===key);
if(!record)return;
const title=key==='tools'&&relative[1]&&toolNames[relative[1]]?toolNames[relative[1]]:key==='oldasspolitic'&&relative[1]==='member'?'Congress Member Profile':key==='heatmap'&&relative[1]==='compare'?'10Groups Comparison':record[1];
const entry=document.createElement('div');
entry.id='rip-site-layer';
entry.innerHTML='<nav class="rip-site-rail" aria-label="Site-wide navigation"><div class="rip-identity"><a class="rip-home" href="'+rootPath+'" aria-label="Random Info Pages: home"><span class="rip-icon" aria-hidden="true">R</span><span class="rip-home-name">RANDOM INFO PAGES</span></a><span class="rip-divider" aria-hidden="true"></span><span class="rip-here"></span></div><div class="rip-actions"><a class="rip-archive" href="'+rootPath+'archive/">Archive ↗</a><button class="rip-browse" type="button" aria-haspopup="dialog" aria-label="Browse other Random Info Pages projects"><span>Explore projects</span><span aria-hidden="true">↗</span></button></div></nav><dialog class="rip-search" aria-label="Browse Random Info Pages"><div class="rip-search-head"><div class="rip-search-eyebrow"><span>Random Info Pages / Project index</span><button class="rip-close" type="button" aria-label="Close project browser">ESC</button></div><input class="rip-search-input" type="search" placeholder="What are you looking for?" aria-label="Search projects" autocomplete="off"></div><div class="rip-results" aria-live="polite"></div><div class="rip-search-foot"><span>19 active projects · Escape to close</span><a href="'+rootPath+'archive/">Archived projects ↗</a></div></dialog>';
entry.querySelector('.rip-here').textContent=title;
document.body.insertBefore(entry,document.body.firstChild);
const dlg=entry.querySelector('dialog'),input=entry.querySelector('input'),results=entry.querySelector('.rip-results'),browse=entry.querySelector('.rip-browse'),close=entry.querySelector('.rip-close');
const normal=s=>s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
function render(){
 const q=normal(input.value.trim());
 const entries=q?catalog.filter(p=>normal(p.slice(1).join(' ')).includes(q)):catalog;
 const frag=document.createDocumentFragment();
 for(const [slug,name,cat] of entries){
   const a=document.createElement('a');a.className='rip-result';a.href=rootPath+slug+'/';
   if(slug===key)a.classList.add('rip-current');
   const label=document.createElement('b');label.textContent=name;
   const info=document.createElement('small');info.textContent=cat+(slug===key?' · Current':'')+' ↗';
   a.append(label,info);frag.append(a);
 }
 results.replaceChildren(frag);
 if(!entries.length){const p=document.createElement('p');p.className='rip-empty';p.textContent='No matches. Try another keyword.';results.append(p)}
}
browse.addEventListener('click',()=>{render();dlg.showModal();input.focus()});
close.addEventListener('click',()=>dlg.close());
dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
input.addEventListener('input',render);
input.addEventListener('keydown',e=>{if(e.key==='Enter'){const first=results.querySelector('a');if(first){e.preventDefault();location.href=first.href}}});
render();
})();
