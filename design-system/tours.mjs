/* Guided, non-blocking walkthroughs for project-specific interfaces. */
const TOUR_DEFINITIONS=Object.freeze({
  'compare':[
    ['#left-select','Choose the first project','Select any active page for the left half of your comparison.'],
    ['#right-select','Choose the second project','Open a different page, or the same project to compare two setups.'],
    ['#split-handle','Give each page room','Drag the divider or use its arrow-key controls to resize both panels.'],
    ['#sync-scroll','Keep pages in view','Optional scroll sync matches relative page position. It does not synchronize simulation time.'],
    ['#copy-state','Copy editable setups','When both panels use the same compatible editor, copy its current editable state from left to right.']
  ],
  'fluid-dynamics':[
    ['#display-mode','Start with the display','Switch between detailed 2D dye and the interactive 3D dye surface.'],
    ['#quality','Choose simulation quality','Higher settings increase the fluid solver grid and pressure iterations, not just the image resolution.'],
    ['#tank-gpu:not([hidden]),#tank-3d:not([hidden]),#tank:not([hidden])','Stir the flow','Drag over the tank to add dye and change the motion.'],
    ['#render-engine','Try a rendering engine','Choose WebGL2 for the enhanced GPU visuals or Canvas2D for compatibility.'],
    ['#screenshot','Export what you see','Choose your output resolution and save a PNG from the Render Studio.']
  ],
  'dungeon-forge':[
    ['#seed','Start from a seed','The seed lets you regenerate a layout with the same underlying settings.'],
    ['#chips','Set the environment','Select a theme and change how the rooms and corridors are generated.'],
    ['#forge','Generate a dungeon','Build a new 3D layout from your seed and room configuration.'],
    ['#openBattlemap','Open the tabletop editor','Enter the 2D battlemap to edit rooms, encounters and notes, then export for VTT use.']
  ],
  'marble-sequencer':[
    ['#marble-canvas','Watch the machine','Each note or detected hit becomes a marble travelling down a musical lane.'],
    ['#drop-zone','Load a recording or MIDI','Audio and MIDI files are decoded on your device. You can also make a loop from scratch.'],
    ['#sequencer','Edit a pattern','Tap a gate to toggle a note, then adjust tempo, ramps and bar pitches.'],
    ['#undo-loop','Experiment freely','Undo or redo pattern edits. Randomize to create a new rhythm quickly.'],
    ['#export-midi','Take your music elsewhere','Export the editable loop as a standard MIDI file.']
  ],
  'music-microscope':[
    ['#audioInputSection','Choose a recording','Load a local file or generate the example. Your audio is not uploaded.'],
    ['#waveform','Read the waveform','Drag on the waveform to isolate a time region for inspection.'],
    ['#spectrogram','Find frequency patterns','Bright bands indicate stronger energy at corresponding frequencies over time.'],
    ['#exportWav','Export the selected region','Save a 16-bit PCM WAV of the selection, or the whole recording.'],
    ['#sendMarble','Send audio to a different project','Transfer your original local file directly into Marble Sequencer without uploading it.']
  ],
  'algorithm-arena':[
    ['#arraySeed','Reproduce a run','Enter a seed to regenerate the same input for comparisons.'],
    ['#runSorts','Race the sorting algorithms','The methods receive the same array and report operation counts separately from playback time.'],
    ['#exportSortCsv','Inspect the results','Export comparisons, swaps, writes and measured runtime to CSV.'],
    ['#pathfinding','Explore search strategies','Draw walls and weighted cells, then step through graph search.'],
    ['#graphs','Experiment with graphs','Compare how network algorithms traverse connected nodes.']
  ],
  'id-card-maker':[
    ['#card','See the preview','Your novelty badge updates as you change layouts, colors, and text.'],
    ['#tab-templates','Pick a starting template','Choose a style or use the template gallery for ideas.'],
    ['#tab-details','Edit the content','Change the visible fields, labels and back-of-card details.'],
    ['#save','Save the output','Download PNG artwork or print the finished front and back.']
  ],
  'wheel':[
    ['#wheel','Spin the wheel','Use the large wheel stage to draw a weighted random result.'],
    ['#entriesInput','Edit your possibilities','Add choices one per line, then customize weights and appearance.'],
    ['#spinPrimary','Try a draw','Spin to choose a result, and optionally remove the winner before spinning again.'],
    ['#saveBtn','Save the wheel','Keep your configuration for a future session or share it with others.']
  ],
  'today':[
    ['#date','Explore a date','Choose any day to see holidays and historical events tied to it.'],
    ['#observances','Discover observances','Review notable holidays and cultural observances for the selected date.'],
    ['#events','See what happened','Browse historical events, with source links where available.'],
    ['#clock-heading','Watch Slovenia age','A continuously updating counter shows elapsed time since the country’s independence date.']
  ],
  'chirality':[
    ['#tab-analyze','Analyze a molecule','Use the editor to examine stereocenters and assign configuration.'],
    ['#composer','Draw or import a structure','Start from a structure or enter a supported SMILES representation.'],
    ['#analyzeBtn','Run stereochemistry analysis','Identify stereocenters and inspect the structural explanation.'],
    ['#tab-compare','Compare stereoisomers','Explore relationships between two structures in the comparison tab.']
  ],
  'tools':[
    ['#toolSearch,#tool-search,input[type="search"]','Find a useful tool','Search the toolbox by task or utility type.'],
    ['main','Open a utility','Select a utility from the project directory. Each tool keeps its own input and export controls.']
  ],
  'word-hitlist':[
    ['#nickname','Enter your name','Choose a nickname before creating or joining a room.'],
    ['#create-form','Set up a lobby','Choose the round rules, then invite your friends.'],
    ['#join-form','Join an existing lobby','Use a room code to play with another group.'],
    ['#rules','Learn the objectives','Review the word-game rules before your first round.']
  ],
  'school-schedule':[
    ['#focusList','See what comes next','Review your immediate upcoming classes and assignments.'],
    ['#weekPlanner','Plan the week','Browse the weekly view and prioritize work by day.'],
    ['#upcomingPlanner','Look further ahead','Use the upcoming view to anticipate later deadlines.']
  ],
  'fiction-workspace':[
    ['#loginScreen','Open your writing space','Sign in or create a local writing workspace to organize your projects.'],
    ['#authForm','Protect your drafts','Complete the account form to access the private writing interface.']
  ]
});
let current=null;
const hasVisibleBox=element=>Boolean(element&&!element.closest('[hidden]')&&
  element.getClientRects().length&&element.getBoundingClientRect().width>0);
export function hasTour(slug){return Boolean(TOUR_DEFINITIONS[slug])}
export function tourSteps(slug){return (TOUR_DEFINITIONS[slug]||[]).map(([selector,title,body])=>({selector,title,body}))}
function installStyles(){
 if(document.querySelector('link[data-rip-tour-css]'))return;
 const css=document.createElement('link');
 css.rel='stylesheet';css.dataset.ripTourCss='';
 css.href=new URL('./tours.css',import.meta.url).href;
 document.head.append(css);
}
export function startTour(slug){
 if(current)current.close();
 const configured=tourSteps(slug);
 const steps=configured.map(step=>({...step,target:document.querySelector(step.selector)}))
   .filter(step=>hasVisibleBox(step.target));
 if(!steps.length)throw new Error('No visible tour steps are available on this page.');
 installStyles();
 const panel=document.createElement('section');
 panel.id='rip-guided-tour';
 panel.setAttribute('role','dialog');
 panel.setAttribute('aria-modal','false');
 panel.setAttribute('aria-label','Project walkthrough');
 panel.innerHTML='<div class="rip-tour-eyebrow"><span>PROJECT WALKTHROUGH</span><button type="button" data-tour-close aria-label="Close guided tour">✕</button></div>'+
   '<p class="rip-tour-progress"></p><h2 class="rip-tour-heading"></h2>'+
   '<p class="rip-tour-description"></p>'+
   '<div class="rip-tour-bottom"><div class="rip-tour-dots"></div>'+
   '<div class="rip-tour-buttons"><button type="button" data-tour-back>Back</button>'+
   '<button type="button" data-tour-next>Next →</button></div></div>';
 const controller=new AbortController();
 let index=0,target=null;
 function close(){
  controller.abort();
  target?.removeAttribute('data-rip-tour-focus');
  panel.remove();
  if(current?.close===close)current=null;
 }
 function show(next){
  target?.removeAttribute('data-rip-tour-focus');
  index=Math.max(0,Math.min(steps.length-1,next));
  const step=steps[index];
  target=step.target;target.setAttribute('data-rip-tour-focus','');
  target.scrollIntoView({block:'center',inline:'nearest',
    behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  panel.querySelector('.rip-tour-progress').textContent='STEP '+(index+1)+' OF '+steps.length;
  panel.querySelector('.rip-tour-heading').textContent=step.title;
  panel.querySelector('.rip-tour-description').textContent=step.body;
  panel.querySelector('[data-tour-back]').disabled=index===0;
  panel.querySelector('[data-tour-next]').textContent=index===steps.length-1?'Finish ✓':'Next →';
  const dots=panel.querySelector('.rip-tour-dots');
  dots.replaceChildren(...steps.map((_,i)=>{
    const span=document.createElement('span');
    span.dataset.active=String(i===index);
    return span;
  }));
  function place(){
    if(!target||!panel.isConnected)return;
    const rect=target.getBoundingClientRect();
    panel.dataset.dock=rect.top>innerHeight*.55?'top':'bottom';
  }
  requestAnimationFrame(place);
  panel.querySelector('[data-tour-next]').focus({preventScroll:true});
 }
 panel.querySelector('[data-tour-close]').addEventListener('click',close);
 panel.querySelector('[data-tour-back]').addEventListener('click',()=>show(index-1));
 panel.querySelector('[data-tour-next]').addEventListener('click',()=>{
  if(index===steps.length-1)close();else show(index+1);
 });
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.stopPropagation();close()}
  if(event.target?.closest?.('#rip-guided-tour')){
    if(event.key==='ArrowRight'){event.preventDefault();show(Math.min(index+1,steps.length-1))}
    if(event.key==='ArrowLeft'){event.preventDefault();show(Math.max(index-1,0))}
  }
 },{signal:controller.signal});
 window.addEventListener('resize',()=>{
  if(panel.isConnected)panel.dataset.dock=target?.getBoundingClientRect().top>innerHeight*.55?'top':'bottom';
 },{signal:controller.signal});
 document.body.append(panel);
 current={close};
 show(0);
 return current;
}
