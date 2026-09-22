const $=id=>document.getElementById(id);
const levels=['Off','Low','Medium','High','Extreme'];
const ids=['character','franchise','songGoal','pov','thesis','thesisTheme','arc','writingMode','emotion','secondaryEmotion','energy','rhyme','refs','accessibility','hook','structure','customStructure','length','performance','loreAccuracy','internalRhyme','multiRhyme','punchlines','storytelling','imagery','flowVariation','callbacks','emotionalDepth','loreAnchors','deepFan','verse1Job','verse2Job','verse3Job','hookConcept','corpusLens','influences','avoid','mustInclude'];
let mode='full';

function esc(s){return String(s??'').trim()}
function val(id){return esc($(id).value)}
function selectedChecks(container){return [...$(container).querySelectorAll('input[type=checkbox]:checked')].map(x=>x.value)}
function technique(id){return levels[Number($(id).value)]||'Medium'}
function structureValue(){
 const v=val('structure');
 if(v==='continuous_verse')return 'one continuous verse, no chorus';
 if(v==='free')return 'free structure';
 return v==='custom'?(val('customStructure')||'custom, infer sensible escalation'):v;
}
function normalizePOV(v){return ({first_person:'first person',second_person:'second person',third_person:'third person',battle:'battle / direct address',mixed:'mixed perspectives'})[v]||v}
function accessText(v){return ({layered:'layered: surface emotion + fan recognition + deep-fan reward',broad:'broad: understandable even without source knowledge',fan_only:'fan-first: dense canon detail, but lines should still have semantic purpose'})[v]||v}

function referenceRapGuidance(franchise='',compact=false){
 const name=String(franchise||'').trim();
 const isPokemon=/pok[eé]mon/i.test(name);
 const sourcePool=isPokemon
  ? 'Mine the franchise deeply for Pokémon names, moves, abilities, held items, types, status effects, weather, terrain, trainer classes, regions, locations, professors, characters, Pokédex concepts, competitive terminology, generations, mechanics, forms, evolutions, legendary lore, battle commands, items, games, and anime terminology when useful.'
  : `Mine ${name||'the source material'} deeply for names and titles, powers, techniques, weapons or items, locations, factions, relationships, rules or mechanics, forms or transformations, chronology, recurring imagery, in-world terminology, and obscure canon details that can carry wordplay.`;
 const core=[
  'HYPER-TECHNICAL REFERENCE-RAP MODE',
  '- Treat wordplay density as the main technical goal while preserving coherent battle-rap meaning.',
  '- Build 5 to 8 major rhyme families before writing, then keep strong families alive for roughly 4 to 12 bars instead of abandoning a sound after one or two lines.',
  '- Frequently target multisyllabic rhyme spans of about 3 to 6 syllables, supported by internal rhymes inside the bar.',
  '- Use slant rhyme, syllable splitting, phonetic bending, homophones, compound rhymes, enjambment, and setup/payoff chains when they sound natural.',
  '- Favor double or triple meanings. A strong reference should simultaneously work as a threat, boast, metaphor, rhyme component, image, mechanic, or punchline.',
  '- Write ordinary battle-rap sentences first, then make franchise terms function inside those sentences. Do not paste proper nouns into otherwise generic bars.',
  '- Let several references interact in the same bar when possible, especially when one term supplies the setup, another supplies the rhyme, and a mechanic supplies the punchline.',
  `- ${sourcePool}`,
  '- Use canon mechanics accurately enough that knowledgeable fans can catch the extra layer. Do not explain the reference afterward.',
  '- Avoid reference lists, encyclopedia phrasing, surface-level name drops, and obvious mascot-level jokes when deeper material is available.',
  '- Use selective capitalization only when it helps expose embedded wordplay or a hidden reference without making every noun look highlighted.',
  '- Allow occasional fragments, ad-libs, pauses, and short setup lines before a punchline or beat-drop moment.',
  '- Silently plan the rhyme families, compatible reference terms, mechanics with double meanings, and transitions before drafting. Output only the finished lyrics.'
 ];
 if(!compact)return core.join('\n');
 return [
  'Hyper-technical reference-rap mode: use 5 to 8 planned rhyme families, sustain strong families for 4 to 12 bars, frequently rhyme across 3 to 6 syllables, and pack internal rhyme, phonetic bending, homophones, syllable splits, compound rhymes, and double or triple meanings into coherent battle-rap sentences.',
  sourcePool,
  'References must function as real writing material, not pasted nouns. Use canon mechanics accurately, avoid list-like exposition, silently plan the reference/rhyme interactions first, and return only the finished lyrics.'
 ].join('\n');
}

function buildPrompt(){
 const character=val('character')||'<character/topic>';
 const franchise=val('franchise');
 const thesis=val('thesis')||'<one-sentence emotional or character thesis>';
 const refs=selectedChecks('referenceFunctions');
 const guards=selectedChecks('guardrails');
 const artistExamples=val('influences');
 const referenceRap=val('writingMode')==='reference_rap';
 const specific=[];
 if(val('loreAnchors'))specific.push(`- Must-use lore / character anchors: ${val('loreAnchors')}`);
 if(val('deepFan'))specific.push(`- Deep-fan rewards / callbacks: ${val('deepFan')}`);
 if(val('mustInclude'))specific.push(`- Other must-haves: ${val('mustInclude')}`);
 const jobs=[];
 if(val('verse1Job'))jobs.push(`- Verse 1: ${val('verse1Job')}`);
 if(val('verse2Job'))jobs.push(`- Verse 2: ${val('verse2Job')}`);
 if(val('verse3Job'))jobs.push(`- Verse 3 / bridge: ${val('verse3Job')}`);
 if(val('hookConcept'))jobs.push(`- Hook: ${val('hookConcept')}`);
 const emotionPair=val('secondaryEmotion')&&val('secondaryEmotion')!=='none'?`${val('emotion')} / ${val('secondaryEmotion')}`:val('emotion');
 const title=referenceRap
  ? `Write an ORIGINAL hyper-technical nerdcore battle-rap verse about ${character}${franchise?` using ${franchise} as the reference universe`:''}.`
  : `Write an ORIGINAL nerdcore song about ${character}${franchise?` from ${franchise}`:''}.`;
 const controls=[
  `Writing mode: ${referenceRap?'hyper-technical reference rap':'standard nerdcore song'}`,
  `Song goal: ${val('songGoal')}`,
  `POV: ${normalizePOV(val('pov'))}`,
  `Core thesis: ${thesis}`,
  val('arc')?`Emotional / narrative arc: ${val('arc')}`:null,
  `EMOTION: ${emotionPair}`,
  `ENERGY: ${val('energy')}`,
  `RHYME_DENSITY: ${val('rhyme')}`,
  `REFERENCE_DENSITY: ${val('refs')}`,
  `HOOK: ${val('hook')}`,
  `ACCESSIBILITY: ${accessText(val('accessibility'))}`,
  `STRUCTURE: ${structureValue()}`,
  `Length: ${val('length')}`,
  `Performance feel: ${val('performance')}`,
  `Lore accuracy: ${val('loreAccuracy')}`,
  `Corpus lens: ${val('corpusLens')}`
 ].filter(Boolean);

 if(mode==='compact'){
  const compact=[
   'Use my Nerdcore Reference Package and, when useful, retrieve relevant songs from my cleaned lyric corpus.',
   '',title,
   ...controls,
   '',
   `Technical emphasis: internal rhyme ${technique('internalRhyme').toLowerCase()}, multisyllabic rhyme ${technique('multiRhyme').toLowerCase()}, wordplay/punchlines ${technique('punchlines').toLowerCase()}, storytelling ${technique('storytelling').toLowerCase()}, imagery ${technique('imagery').toLowerCase()}, flow variation ${technique('flowVariation').toLowerCase()}, callbacks ${technique('callbacks').toLowerCase()}, emotional depth ${technique('emotionalDepth').toLowerCase()}.`,
   referenceRap?referenceRapGuidance(franchise,true):'',
   refs.length?`Make every lore reference also perform at least one real writing function such as ${refs.join(', ')}.`:'',
   specific.length?['',...specific].join('\n'):'',
   artistExamples?`If useful, use ${artistExamples} only as a palette of measurable corpus traits. Do not imitate wording, cadence, signature phrases, or any specific song.`:'',
   val('avoid')?`Avoid: ${val('avoid')}`:'',
   '',
   referenceRap
    ? 'Do not reuse lines from the corpus. Preserve coherent syntax and battle-rap meaning even at extreme density. Return only the finished verse.'
    : 'Write the character, not a reference list. Keep lore functional, verses purposeful, and the hook centered on the thesis. Do not reuse lines from the corpus. Silently revise generic bars, reference-only bars, and rhyme filler before answering. Return only the finished lyrics.'
  ].filter(x=>x!==null&&x!==undefined&&x!=='');
  return compact.join('\n');
 }

 const lines=[
  'Use my Nerdcore Reference Package and, when useful, retrieve relevant songs from my cleaned lyric corpus.',
  '',title,
  '',...controls,
  '',
  'TECHNICAL EMPHASIS',
  `- Internal rhyme: ${technique('internalRhyme')}`,
  `- Multisyllabic rhyme: ${technique('multiRhyme')}`,
  `- Punchlines / wordplay: ${technique('punchlines')}`,
  `- Storytelling: ${technique('storytelling')}`,
  `- Imagery: ${technique('imagery')}`,
  `- Flow variation: ${technique('flowVariation')}`,
  `- Callbacks / motifs: ${technique('callbacks')}`,
  `- Emotional depth: ${technique('emotionalDepth')}`,
  referenceRap?'':null,
  referenceRap?referenceRapGuidance(franchise,false):null,
  '',
  'WRITING REQUIREMENTS',
  '- Write the character, not a wiki summary or reference list.',
  `- Every lore reference should also function as at least one of: ${refs.join(', ')||'characterization, metaphor, imagery, wordplay, evidence, or emotional movement'}.`,
  '- Apply the name-free proof: if a proper noun is removed, the line should still contain an interesting idea, image, emotion, rhyme move, or punchline.',
  referenceRap?'- Prioritize semantic double-duty: references should be doing technical rap work and franchise work at the same time.':null,
  referenceRap?'- Do not explain punchlines, annotate references, or put explanatory glosses after bars.':null,
  referenceRap?'- Keep the verse continuous and escalating. Short fragments or pauses are allowed when they sharpen delivery, but do not insert a conventional chorus.':null,
  !referenceRap?'- Give each verse a job. Establish, reveal, complicate, escalate, or pay off the central thesis rather than rotating through unrelated references.':null,
  '- Keep rhyme chains meaningful. Use internal and multisyllabic rhyme to propel syntax, not to replace meaning.',
  !referenceRap?'- Make the hook a compression layer: simpler, more repeatable, and centered on the song identity while the verses carry more density.':null,
  '- Escalate or complicate the thesis across sections. Include contrast, callback, setup/payoff, or a meaningful final turn.',
  '- Use physical verbs, concrete imagery, and character-specific values. Let canon facts pass through the character voice instead of reading like exposition.',
  val('accessibility')==='layered'?'- Maintain three layers: a non-fan can understand the surface conflict, a fan recognizes direct lore, and a deep fan catches mechanics, chronology, implication, or callbacks.':null,
  '- Use original wording. Do not reuse lyric lines from the corpus.',
  artistExamples?`- If useful, use ${artistExamples} only as a palette of measurable traits from the reference package. Do not copy wording, signature phrases, exact cadence, or any specific song.`:null,
  '',
  jobs.length?'SECTION JOBS':null,
  ...jobs,
  specific.length?'':null,
  specific.length?'CHARACTER / LORE ANCHORS':null,
  ...specific,
  '',
  'GUARDRAILS',
  ...guards.map(x=>`- ${x}.`),
  val('avoid')?`- Also avoid: ${val('avoid')}`:null,
  '',
  'FINAL QUALITY PASS',
  referenceRap?'- Silently verify that the verse actually sustains several rhyme families, contains layered internal/multisyllabic rhyme, and uses references as punchlines, metaphors, rhyme material, or mechanics instead of decoration.':null,
  '- Before finalizing, silently check the central thesis, section purpose, rhyme clarity, lore accuracy, perspective consistency, and generic-bar count.',
  '- Rewrite any line that could fit almost any character, any reference that exists only for recognition, and any rhyme that bends the sentence into filler.',
  referenceRap?'- Default output: only the finished continuous verse.':'- Default output: only the finished lyrics with clear section labels.'
 ].filter(x=>x!==null&&x!==undefined);
 return lines.join('\n').replace(/\n{3,}/g,'\n\n').trim();
}

function updatePrompt(){
 $('promptOutput').value=buildPrompt();
 updateScore();
 updateCustomStructure();
 updateRanges();
 saveDraft();
}
function updateCustomStructure(){$('customStructureField').style.display=val('structure')==='custom'?'flex':'none'}
function updateRanges(){['internalRhyme','multiRhyme','punchlines','storytelling','imagery','flowVariation','callbacks','emotionalDepth'].forEach(id=>{const o=document.querySelector(`output[for="${id}"]`);if(o)o.textContent=technique(id)})}
function updateScore(){
 let score=28;const tips=[];
 if(val('character'))score+=14;else tips.push('Add the character or topic.');
 if(val('thesis'))score+=20;else tips.push('Add a one-sentence core thesis. This is the biggest quality boost.');
 if(val('arc'))score+=8;else tips.push('Add an emotional arc so later sections have somewhere to go.');
 if(val('loreAnchors'))score+=7;else tips.push('Add a few canon anchors if you want more precise reference writing.');
 if(val('writingMode')==='reference_rap')score+=6;
 if(val('hookConcept')&&val('writingMode')!=='reference_rap')score+=5;else if(val('writingMode')!=='reference_rap')tips.push('A hook concept can make the chorus more memorable.');
 if(val('avoid'))score+=4;
 if(val('mustInclude'))score+=4;
 if(val('verse1Job')||val('verse2Job')||val('verse3Job'))score+=4;
 if(selectedChecks('referenceFunctions').length>=5)score+=3;
 if(val('franchise'))score+=2;
 if(val('deepFan'))score+=1;
 score=Math.min(100,score);
 $('scoreRing').style.setProperty('--score',score);$('scoreNum').textContent=score;
 let label='Needs direction',txt='Fill the core fields to keep the song focused.';
 if(score>=90){label='Excellent brief';txt='Specific enough to guide a strong draft without over-constraining it.'}
 else if(score>=75){label='Strong brief';txt='Good structure and intent. A few extra anchors could sharpen it.'}
 else if(score>=55){label='Usable brief';txt='This should work, but the thesis or arc can make it much stronger.'}
 $('scoreLabel').textContent=label;$('scoreText').textContent=txt;
 $('suggestions').innerHTML=(tips.length?tips.slice(0,4):['The brief is well specified. You can copy it now.']).map(t=>`<div class="suggestion">${t}</div>`).join('');
}
function getState(){const s={mode};ids.forEach(id=>s[id]=$(id).value);s.referenceFunctions=selectedChecks('referenceFunctions');s.guardrails=selectedChecks('guardrails');return s}
function setState(s){if(!s)return;ids.forEach(id=>{if(s[id]!==undefined&&$(id))$(id).value=s[id]});['referenceFunctions','guardrails'].forEach(group=>{if(Array.isArray(s[group]))[...$(group).querySelectorAll('input[type=checkbox]')].forEach(cb=>cb.checked=s[group].includes(cb.value))});if(s.mode)setMode(s.mode);updatePrompt()}
function saveDraft(){try{localStorage.setItem('nerdcorePromptForgeDraft',JSON.stringify(getState()))}catch(e){}}
function saveNamed(){try{localStorage.setItem('nerdcorePromptForgeSaved',JSON.stringify(getState()));toast('Settings saved')}catch(e){toast('Could not save')}}
function loadNamed(){try{const s=JSON.parse(localStorage.getItem('nerdcorePromptForgeSaved')||'null');if(s){setState(s);toast('Saved settings loaded')}else toast('No saved settings yet')}catch(e){toast('Could not load')}}
function encodeState(s){return btoa(unescape(encodeURIComponent(JSON.stringify(s))))}
function decodeState(x){return JSON.parse(decodeURIComponent(escape(atob(x))))}
function share(){const u=new URL(location.href);u.hash='s='+encodeState(getState());navigator.clipboard.writeText(u.toString()).then(()=>toast('Share link copied')).catch(()=>toast('Could not copy link'))}
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),1700)}
function copyPrompt(){const text=$('promptOutput').value;navigator.clipboard.writeText(text).then(()=>toast('Prompt copied')).catch(()=>{$('promptOutput').select();document.execCommand('copy');toast('Prompt copied')})}
function downloadPrompt(){const a=document.createElement('a');const blob=new Blob([$('promptOutput').value+'\n'],{type:'text/plain'});a.href=URL.createObjectURL(blob);a.download=`${(val('character')||'nerdcore').replace(/[^a-z0-9_-]+/gi,'_')}_prompt.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function setMode(m){mode=m;['compactMode','fullMode'].forEach(id=>$(id).classList.toggle('active',(id==='compactMode'&&m==='compact')||(id==='fullMode'&&m==='full')));updatePrompt()}

const thesisTemplates={
 power:n=>`Power gives ${n} control over everyone else, but every step upward makes genuine connection harder to keep.`,
 duty:n=>`${n}'s strength becomes a burden because the people who rely on them leave no room to be weak.`,
 identity:n=>`The identity ${n} performs for the world is at war with the self they cannot fully escape.`,
 revenge:n=>`Revenge keeps ${n} moving long after it stops giving back what was taken from them.`,
 legacy:n=>`${n} is trapped between inheriting a legacy and proving they are more than the name, role, or expectation handed to them.`,
 isolation:n=>`${n}'s greatest strength separates them from the people they most want to understand or protect.`,
 ambition:n=>`Every victory pulls ${n} closer to the future they want and further from the person they used to be.`,
 loss:n=>`${n} turns grief into motion because stopping would mean finally admitting what cannot be recovered.`,
 control:n=>`${n} chases control because chaos once took something from them that power can never truly restore.`,
 redemption:n=>`${n} cannot erase what they did, so redemption becomes a choice they have to keep making rather than a debt they can finish paying.`
};
function suggestThesis(){const n=val('character')||'the character';$('thesis').value=thesisTemplates[val('thesisTheme')](n);updatePrompt()}

const presets={
 villain:{writingMode:'standard',songGoal:'Villain manifesto',pov:'first_person',emotion:'menacing',secondaryEmotion:'triumphant',energy:'escalating',rhyme:'high',refs:'high',accessibility:'layered',hook:'anthemic',structure:'I-V-C-V-C-B-C-O',length:'Standard, about 2:30 to 3:30',performance:'Technical rap',loreAccuracy:'Strict canon-first',internalRhyme:3,multiRhyme:3,punchlines:4,storytelling:2,imagery:3,flowVariation:3,callbacks:3,emotionalDepth:3,corpusLens:'Technical / rap-forward'},
 hero:{writingMode:'standard',songGoal:'Emotional character study',pov:'first_person',emotion:'defiant',secondaryEmotion:'tragic',energy:'escalating',rhyme:'high',refs:'medium',accessibility:'layered',hook:'emotional',structure:'I-V-PC-C-V-PC-C-B-C-O',length:'Standard, about 2:30 to 3:30',performance:'Cinematic',loreAccuracy:'Strict canon-first',internalRhyme:3,multiRhyme:3,punchlines:2,storytelling:3,imagery:4,flowVariation:3,callbacks:3,emotionalDepth:4,corpusLens:'Emotional / melodic'},
 technical:{writingMode:'standard',songGoal:'Victory lap / flex',pov:'first_person',emotion:'triumphant',secondaryEmotion:'defiant',energy:'high',rhyme:'extreme',refs:'high',accessibility:'layered',hook:'chant',structure:'V-C-V-C-B-C',length:'Standard, about 2:30 to 3:30',performance:'Cypher',loreAccuracy:'Strict canon-first',internalRhyme:4,multiRhyme:4,punchlines:4,storytelling:1,imagery:3,flowVariation:4,callbacks:2,emotionalDepth:2,corpusLens:'Technical / rap-forward'},
 referenceRap:{writingMode:'reference_rap',songGoal:'Battle / cypher verse',pov:'first_person',emotion:'defiant',secondaryEmotion:'furious',energy:'high',rhyme:'extreme',refs:'extreme',accessibility:'fan_only',hook:'none',structure:'continuous_verse',length:'Continuous 48 to 64 bar verse',performance:'Technical rap',loreAccuracy:'Strict canon-first',internalRhyme:4,multiRhyme:4,punchlines:4,storytelling:1,imagery:3,flowVariation:4,callbacks:3,emotionalDepth:1,corpusLens:'Technical / rap-forward'},
 narrative:{writingMode:'standard',songGoal:'Narrative retelling',pov:'first_person',emotion:'reflective',secondaryEmotion:'tragic',energy:'escalating',rhyme:'medium',refs:'medium',accessibility:'broad',hook:'emotional',structure:'I-V-C-V-C-B-C-O',length:'Standard, about 2:30 to 3:30',performance:'Cinematic',loreAccuracy:'Strict canon-first',internalRhyme:2,multiRhyme:2,punchlines:2,storytelling:4,imagery:4,flowVariation:3,callbacks:4,emotionalDepth:4,corpusLens:'Narrative / cinematic'},
 anthem:{writingMode:'standard',songGoal:'Character anthem',pov:'first_person',emotion:'triumphant',secondaryEmotion:'defiant',energy:'high',rhyme:'high',refs:'medium',accessibility:'layered',hook:'anthemic',structure:'C-V-C-V-C',length:'Standard, about 2:30 to 3:30',performance:'Modern trap rap',loreAccuracy:'Strict canon-first',internalRhyme:3,multiRhyme:3,punchlines:3,storytelling:2,imagery:3,flowVariation:3,callbacks:3,emotionalDepth:3,corpusLens:'Hook-heavy / anthemic'},
 duet:{writingMode:'standard',songGoal:'Duet / conflict',pov:'mixed',emotion:'mixed',secondaryEmotion:'none',energy:'escalating',rhyme:'high',refs:'high',accessibility:'layered',hook:'anthemic',structure:'I-V-C-V-C-B-C-O',length:'Standard, about 2:30 to 3:30',performance:'Theatrical',loreAccuracy:'Strict canon-first',internalRhyme:3,multiRhyme:3,punchlines:3,storytelling:3,imagery:3,flowVariation:4,callbacks:4,emotionalDepth:4,corpusLens:'Theatrical / character-performance'}
};

function applyPreset(name){const p=presets[name];Object.entries(p).forEach(([k,v])=>{if($(k))$(k).value=v});updatePrompt();const labels={referenceRap:'Hyper-technical reference rap',technical:'Technical flex',villain:'Menacing villain',hero:'Broken hero',narrative:'Narrative arc',anthem:'Anthem',duet:'Duet'};toast(`${labels[name]||name} preset applied`)}
function surprise(){const keys=Object.keys(presets);applyPreset(keys[Math.floor(Math.random()*keys.length)]);const themes=Object.keys(thesisTemplates);$('thesisTheme').value=themes[Math.floor(Math.random()*themes.length)];if(val('character')&&!val('thesis'))suggestThesis()}
function reset(){if(!confirm('Reset the prompt builder to defaults?'))return;localStorage.removeItem('nerdcorePromptForgeDraft');location.hash='';location.reload()}

if(typeof document!=='undefined'){
 ids.forEach(id=>{$(id).addEventListener('input',updatePrompt);$(id).addEventListener('change',updatePrompt)});
 ['referenceFunctions','guardrails'].forEach(id=>$(id).addEventListener('change',updatePrompt));
 document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>applyPreset(b.dataset.preset)));
 $('surpriseBtn').addEventListener('click',surprise);
 $('suggestThesis').addEventListener('click',suggestThesis);
 $('copyBtn').addEventListener('click',copyPrompt);
 $('downloadBtn').addEventListener('click',downloadPrompt);
 $('saveBtn').addEventListener('click',saveNamed);
 $('loadBtn').addEventListener('click',loadNamed);
 $('shareBtn').addEventListener('click',share);
 $('resetBtn').addEventListener('click',reset);
 $('compactMode').addEventListener('click',()=>setMode('compact'));
 $('fullMode').addEventListener('click',()=>setMode('full'));
 $('chatgptBtn').addEventListener('click',()=>{copyPrompt();window.open('https://chatgpt.com/','_blank','noopener')});
 document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.key==='Enter'){e.preventDefault();copyPrompt()}});
 (function init(){
  try{
   if(location.hash.startsWith('#s=')){setState(decodeState(location.hash.slice(3)));toast('Shared prompt loaded');return}
   const d=JSON.parse(localStorage.getItem('nerdcorePromptForgeDraft')||'null');
   if(d){setState(d);return}
  }catch(e){}
  updatePrompt();
 })();
}

if(typeof module!=='undefined'&&module.exports){module.exports={referenceRapGuidance,presets}}
