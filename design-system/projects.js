/* Single source of truth for the public project registry. Kept in sync
 * across the homepage, the shared navigation and related-project discovery.
 * No remote service, account or tracking is required. */
(function(global){
'use strict';
const projects=[{n:'Compare Lab',d:'Side-by-Side Project Compare Lab',p:'./compare/',c:'Tools',k:'comparison compare side by side side-by-side split screen two panels synchronize scroll clone project state visual testing quality A B benchmarking',g:'science-code'},{n:'StereoLab',d:'Chirality & Stereochemistry Solver',p:'./chirality/',c:'School',k:'chirality stereochemistry chiral achiral meso r s stereocenter molecular drawing chemistry fischer newman projection enantiomer diastereomer constitutional isomer optical rotation enantiomeric excess ee molfile smiles',g:'science-code'}, {n:'2026 Power Shift',d:'Democratic Midterm Gains Map',p:'./midterm-2026/',c:'Data',k:'2026 election midterms democratic gains flipped seats governors senate house district state legislatures trifectas map results',g:'civics'},{n:'Device Worlds',d:'One URL, Four Operating Systems',p:'./device-worlds/',c:'Experiments',k:'device operating system windows linux apple macos ios android interactive desktop terminal ambient phone experiment responsive automatic detection',g:'simulations'}, {n:'Shard Market',d:'Live Shard Fusion Profit Finder',p:'./shard-fusions/',c:'Games',k:'hypixel skyblock shard fusion crafting bazaar coin flips farming trading liquidity profit coins per hour recipes sells demand',g:'games-friends'},{n:'Belief Atlas',d:'Public Figure Beliefs & Claims',p:'./belief-atlas/',c:'Data',k:'conspiracy matrix public figures sourced statements evidence research beliefs claims comparison positions topics',g:'civics'},{n:'A Day in Messages',d:'September 11: Message Timeline',p:'./9-11-timeline/',c:'Data',k:'September 11 2001 9/11 terrorist attacks pager messages timeline wikileaks archive historical chronology chart interception',g:'history'}, {n:'Draftroom',d:'Novel Writing & Revision',p:'./fiction-workspace/',c:'Tools',k:'fiction writing novel author chapter checklist rubric scene plot pacing characters notes revision drafting workbook local saves',g:'creative'},{n:'Algorithm Arena',d:'Algorithm Visualizer',p:'./algorithm-arena/',c:'Experiments',k:'sorting algorithms bubble insertion selection merge quick heap pathfinding graph BFS DFS Dijkstra A star sonification audio',g:'science-code'},{n:'Cryptography Museum',d:'Interactive Cryptography Museum',p:'./cryptography-museum/',c:'Experiments',k:'caesar enigma vigenere cipher cryptography RSA AES SHA256 historical secret writing',g:'science-code'},{n:'Marble Sequencer',d:'Marble Sequencer',p:'./marble-sequencer/',c:'Experiments',g:'audio-video',k:'music marble machine rhythm percussion mp3 audio MIDI import beat visualizer loop'},{n:'Fluid Dynamics',d:'Fluid Dynamics',p:'./fluid-dynamics/',c:'Experiments',g:'simulations',k:'fluid mechanics physics dye ink viscosity pressure velocity vorticity vortex cylinder wake stable fluids Navier Stokes flow'},{n:'Melon Jelly',d:'Melon Jelly Soft-Body Study',p:'./melon-jelly/',c:'Experiments',k:'watermelon jelly soft body physics tactile stretch wobble WebGPU specimen',g:'simulations'},{n:'Dungeon Forge',d:'Dungeon Forge Generator',p:'./dungeon-forge/',c:'Experiments',k:'procedural dungeon generator seed room corridors roguelike 3D map graph WebGL',g:'simulations'},{n:'Music Microscope',d:'Music & Audio Analyzer',p:'./music-microscope/',c:'Experiments',k:'audio analysis waveform spectrogram FFT frequency spectrum pitch BPM filters local sound',g:'audio-video'},{n:'One Million, Actually',d:'Visualizing One Million',p:'./one-million/',c:'Data',k:'data visualization scale million proportion comparison population probability zoom quantity',g:'maps-data'},{n:'Infrastructure Atlas',d:'U.S. Infrastructure Report Cards',p:'./infrastructure-atlas/',c:'Data',k:'infrastructure report card ASCE states map geography choropleth grades peer relative A to F roads bridges drinking water sector rankings comparisons',g:'maps-data'},{n:'Political Grid',d:'100-Statement Political Survey',p:'./political-grid/',c:'Data',k:'100 statements survey voting x marks stats statistics ideology politics groups questionnaire',g:'civics'},{n:'Word Finder',d:'Anagrams & Palindrome Bonuses',p:'./tools/words/',c:'Tools',k:'word finder solver scrabble letters palindrome anagram longest word game tile rack',g:'word-games'}, {n:'Word Hitlist',d:'Word Hitlist Party Game',p:'./word-hitlist/',c:'Games',k:'word game multiplayer party lobby room anagram letters palindromes goals friends',g:'word-games'}, {n:'The Useless Unit Converter',d:'The Useless Unit Converter',p:'./useless-unit-converter/',c:'Tools',k:'convert length distance height duration time measurements bananas minecraft days unit calculator',g:'everyday'}, {n:'Today',d:'Today: Holidays, History & Slovenia',p:'./today/',c:'Data',k:'what holiday is today this day in history historical events observances calendar how old is slovenia independence statehood day age timer',g:'history'}, {n:'ID Card Maker',d:'Custom ID Card Maker',p:'./id-card-maker/',c:'Tools',k:'custom novelty id card generator photo badge template download png printable',g:'creative'}, {n:'Toolbox',d:'Everyday Web Tools',p:'./tools/',c:'Tools',k:'time zones images converter crop gif background remover inflation currency text list markdown utilities',g:'everyday'},{n:'Wheel',d:'Random Choice Wheel',p:'./wheel/',c:'Tools',k:'wheel names random picker weighted spin roulette saves sharing',g:'everyday'},{n:'When We Meet',d:'Group Availability Planner',p:'./whenwemeet/',c:'Tools',k:'schedule availability group when2meet planning',g:'planning'},{n:'School Schedule',d:'Class & Assignment Planner',p:'./school-schedule/',c:'School',k:'classes deadlines labs semester planner checklist',g:'planning'},{n:'Friend Group Hub',d:'Friend Quotes & Games',p:'./friends/',c:'Friends',k:'quotes guess who said it stats weekly patch notes discord',g:'games-friends'},{n:'Stock Fights',d:'Stock Image Fight Simulator',p:'./stock-fights/',c:'Games',k:'Spenn SpennTF2 stock image fighting game guys characters teams physics arena simulations match 1v1 henchmen battle',g:'games-friends'}, {n:'Tideborne',d:'Tideborne Fishing Guide',p:'./tideborne/',c:'Games',k:'minecraft fish gear specimens records guide',a:true},{n:'Fishing System 2.0',d:'Fishing Mechanics & Calculators',p:'./tide2/',c:'Games',k:'fishscore luck momentum perfect catch calculator',a:true},{n:'VCT Scout Board',d:'Valorant Team Scout & Strategy',p:'./vct-scout/',c:'Games',k:'valorant esports agents maps comps scout',a:true},{n:'Old Ass Politic',d:'U.S. Congress Age Explorer',p:'./oldasspolitic/',c:'Data',k:'congress house senate age politics roster',g:'civics'},{n:'10Groups Heatmap',d:'10Groups Comparison Heatmap',p:'./heatmap/',c:'Data',k:'visualization overlap people coordinates heatmap',g:'maps-data'},{n:'Emperor Director',d:'AI Video Scene Director',p:'./wanuiv2/',c:'Experiments',k:'wan ai generation production interface prototype',g:'audio-video'},{n:'Nerdcore Prompts',d:'Nerdcore Song Prompt Builder',p:'./nerdcore-prompts/',c:'Experiments',k:'music lyrics prompts creative',g:'creative'}];
const alias = Object.freeze({ Tools:'Utilities',School:'School & Planning',Friends:'Friends & Social',
  Games:'Games & Guides',Data:'Data & Research',Experiments:'Interactive Labs' });
const registered=Object.freeze(projects.map(p=>Object.freeze({
  ...p,slug:p.p.replace(/^\.\//,'').replace(/\/$/,''),
  category:alias[p.c]||p.c
})));
const normalize=value=>String(value||'').toLowerCase().normalize('NFKD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
function distance(a,b,max=2) {
  if(Math.abs(a.length-b.length)>max) return max+1;
  let previous=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    let current=[i],rowMin=i;
    for(let j=1;j<=b.length;j++){
      current[j]=Math.min(current[j-1]+1,previous[j]+1,
        previous[j-1]+(a[i-1]===b[j-1]?0:1));
      rowMin=Math.min(rowMin,current[j]);
    }
    if(rowMin>max)return max+1;
    previous=current;
  }
  return previous[b.length];
}
function relevance(project,rawQuery) {
  const query=normalize(rawQuery);
  if(!query)return 0;
  const title=normalize(project.n+' '+project.d);
  const content=normalize([project.n,project.d,project.c,project.category,project.g,project.k].join(' '));
  const words=content.split(' ').filter(Boolean);
  const tokens=query.split(' ');
  let score=0;
  for(const token of tokens){
    if(title===token)score+=80;
    else if(title.includes(token))score+=38;
    else if(content.includes(token))score+=16;
    else if(words.some(word=>word.startsWith(token)))score+=11;
    else if(token.length>3 && words.some(word=>distance(word,token,token.length>7?2:1)<= (token.length>7?2:1)))score+=4;
    else return -1;
  }
  return score;
}
function search(query,{includeArchived=true,limit=100}={}){
  const cleaned=normalize(query);
  const matching=registered.filter(p=>includeArchived||!p.a);
  if(!cleaned)return matching.filter(p=>!p.a).slice(0,limit);
  return matching.map(p=>({p,score:relevance(p,cleaned)}))
    .filter(x=>x.score>=0).sort((a,b)=>b.score-a.score||a.p.n.localeCompare(b.p.n))
    .slice(0,limit).map(x=>x.p);
}
function get(slug){return registered.find(p=>p.slug===slug)||null}
function related(slug,count=4){
  const source=get(slug);
  if(!source)return [];
  return registered.filter(p=>!p.a && p.slug!==slug)
    .map(p=>({p,score:(p.g===source.g?6:0)+(p.c===source.c?3:0)+
      (normalize(p.k).split(' ').filter(w=>w.length>=5&&normalize(source.k).includes(w)).length*.4)}))
    .sort((a,b)=>b.score-a.score||a.p.n.localeCompare(b.p.n)).slice(0,count).map(x=>x.p);
}
const FAVORITES='rip-favorites-v1',RECENTS='rip-recent-v1';
function read(key){try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v.filter(x=>typeof x==='string'):[]}catch{return []}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}return value}
function favorites(){return read(FAVORITES).filter(slug=>Boolean(get(slug)))}
function toggleFavorite(slug){if(!get(slug))return favorites();const values=favorites();return write(FAVORITES,
  values.includes(slug)?values.filter(x=>x!==slug):[slug,...values].slice(0,100))}
function recent(){return read(RECENTS).filter(slug=>Boolean(get(slug)))}
function recordVisit(slug){if(!get(slug))return recent();return write(RECENTS,
  [slug,...recent().filter(x=>x!==slug)].slice(0,12))}
global.RIP_PROJECTS=registered;
global.RIPCatalog=Object.freeze({all:registered,active:registered.filter(p=>!p.a),
  archived:registered.filter(p=>Boolean(p.a)),get,related,search,relevance,normalize,
  favorites,toggleFavorite,recent,recordVisit});
})(typeof window!=='undefined'?window:globalThis);
