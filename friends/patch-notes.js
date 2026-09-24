(()=>{
const PROFILE_VERSION='discord-grounded-v2';
const SOURCE_WINDOW='2026-05-08..2026-09-24';
const PEOPLE=['Alex','Doron','Ethan','Jack','Mike','Nora','Rita','Tommy'];
const TYPES=['Buff','Nerf','Bug Fix','Balance','Known Issue','Quality of Life','New Feature','Hotfix'];
const PROFILES={
Tommy:{
 topics:['Minecraft server planning','server RAM math','form creation','poll deployment','quote archiving','project spawning','group scheduling','mass-ping routing','website prototyping','Minecraft coordination','event logistics','follow-up tracking'],
 effects:[
  'can now turn a casual Minecraft question into a full server plan before everyone has finished reading the first message',
  'still estimates hosting requirements with suspiciously little hesitation and immediately converts the answer into a next step',
  'now creates the form, the backup form, and the results workflow before most people have decided whether they are participating',
  'has improved at turning a loose group opinion into an actual poll with named options and a deadline',
  'continues treating the quote channel like an archive that requires active maintenance rather than a place where jokes happen by accident',
  'still has a high chance to convert a five-minute idea into a website, spreadsheet, server, or all three',
  'now asks who is alive, available, online, or joining with slightly better targeting',
  'Mike, Alex, and Doron remain the primary recipients of direct pings when a plan needs movement',
  'can prototype a useful interface faster than the group can agree on what the feature should be called',
  'now coordinates Minecraft sessions with fewer repeated status checks, though “ping us if you are on” remains a core protocol',
  'has improved at turning scattered availability messages into a single workable plan',
  'continues to follow up until a vague plan becomes either a real event or a clearly documented failure'
 ],
 callbacks:[
  'One more feature remains permanently enabled.',
  'The phrase “I can make something for that” is still considered a high-risk trigger.',
  'Scope containment remains experimental.',
  'Documentation usually arrives after the system already works.',
  'The group has not found a reliable way to stop the project from acquiring subprojects.',
  'Server, form, and website tabs may appear without warning.',
  'Quote collection continues in the background.',
  'Pinging the relevant person is still preferred over waiting quietly.',
  'A casual suggestion may still become infrastructure.',
  'The build-first, explain-second workflow remains supported.'
 ],
 types:['New Feature','Quality of Life','Balance','Hotfix','Known Issue','Buff']
},
Mike:{
 topics:['music correction protocol','quote-channel gravity','D&D readiness','schedule review','riff generation','media tangent engine','question frequency','word-choice filter','group banter','reaction loop','metal and classic-rock routing','conversation escalation'],
 effects:[
  'will still correct a band identification immediately, but now does so with enough appreciation that the correction feels like a recommendation',
  'continues producing lines that migrate into the quote archive at a rate well above the group average',
  'can inventory D&D options, spells, and excuses with minimal startup time once the game comes up',
  'still evaluates schedules with direct language and very little ceremonial optimism',
  'can now turn a single phrase into a full riff chain before anyone has decided whether the original joke was good',
  'music, movies, Discord, and whatever was just mentioned can still become a side conversation without warning',
  'continues asking follow-up questions that keep dead conversations alive longer than expected',
  'the internal warning that a sentence may be quotable now fires earlier but is not guaranteed to prevent transmission',
  'still performs best when the conversation is already slightly off the rails',
  'reaction latency remains low, especially when somebody says something obviously wrong or unexpectedly funny',
  'Pink Floyd, the Grateful Dead, metal, and adjacent music topics retain boosted engagement',
  'can escalate a harmless setup into a much larger bit with very little external assistance'
 ],
 callbacks:[
  'The quote channel remains a natural predator of unfiltered phrasing.',
  'Music recommendations may still become a mini-lecture.',
  '“Was it good?” remains a valid post-event diagnostic.',
  'D&D spell knowledge is still loaded on demand.',
  'No nerf has successfully reduced riff throughput.',
  'The group continues to treat unexpected phrasing as harvestable content.',
  'Schedule criticism remains concise and operational.',
  'The filter is technically installed.',
  'Conversation momentum usually increases after engagement.',
  'One comment may still create three follow-up topics.'
 ],
 types:['Known Issue','Buff','Balance','Hotfix','Quality of Life','Nerf']
},
Alex:{
 topics:['D&D readiness checks','poll governance','schedule interpretation','sculk containment','Twilight Forest operations','underground-bunker threat model','film-status reporting','group rule enforcement','Minecraft planning','availability checks','detail verification','British-slang clarification'],
 effects:[
  'now asks whether everyone is actually ready for D&D before assuming that “tomorrow” means prepared',
  'continues operating polls with a strong sense that the person who made the poll gets at least partial constitutional authority over it',
  'has improved at translating “Friday or Saturday” style planning into a concrete next question instead of accepting ambiguity',
  'still treats suspicious sculk activity as something that deserves immediate investigation rather than decorative appreciation',
  'Twilight Forest plans now receive more explicit coordination before somebody vanishes into progression alone',
  'continues assuming Jack is capable of building a completely undocumented bunker network if given enough time and blocks',
  'can provide a compact filming-status update without losing track of the larger group conversation',
  'will still call out plans that make no sense when somebody ignores work, time, or the fact that it is one in the morning',
  'Minecraft coordination now includes stronger “let me know when you are on” behavior',
  'has improved at checking who is joining instead of trusting silence to mean yes',
  'still notices small wording and planning details that other people were prepared to let slide',
  'the “m8” clarification subsystem now activates before British shorthand becomes a full misunderstanding'
 ],
 callbacks:[
  'Readiness and willingness remain separate variables.',
  'Poll ownership doctrine has not been overturned.',
  'The trees may still be disturbed.',
  'Unmarked tunnel networks remain a recognized security concern.',
  '“Let me know when you are on” remains a supported notification method.',
  'D&D preparation can still produce an uncomfortable number of follow-up questions.',
  'The schedule is not assumed to be reasonable merely because it exists.',
  'Film obligations may temporarily override game plans.',
  'Minecraft side objectives remain difficult to contain.',
  'Rule interpretation continues to be handled locally.'
 ],
 types:['Balance','Bug Fix','Known Issue','Quality of Life','Buff','Hotfix']
},
Doron:{
 topics:['ticket logistics','work-to-server transition','event setup','road-condition reporting','interview debriefing','practical handoff planning','historical-reference engine','group availability','dry one-liner delivery','event coordination','travel timing','request-the-maximum strategy'],
 effects:[
  'now treats ticket allocation like an inventory problem and is still willing to request the maximum before somebody else decides they need fewer',
  'can transition from “coming home from work” to “I can join soon” with less intermediate status noise',
  'continues volunteering to get setup handled tomorrow night when everyone else is still describing the problem',
  'icy-road alerts remain emphatic enough that nobody can plausibly claim the warning was subtle',
  'can summarize an interview or strange interaction with enough detail to make the surrounding absurdity obvious',
  'still solves handoffs by identifying who has the item, who can physically pass it over, and on what day',
  'historical and current-event references continue appearing in conversations that did not necessarily request one',
  'now gives availability windows more directly when work or travel is the limiting factor',
  'dry delivery remains strong enough that the group occasionally needs a second to determine whether a line was serious',
  'can convert vague event interest into tickets, timing, and a pickup plan with minimal ceremony',
  'travel updates now include slightly more actionable timing and slightly less mystery',
  'the “just request the max” approach remains available when allocation rules permit it'
 ],
 callbacks:[
  'Somebody still has to physically possess the tickets.',
  'Work remains a non-negotiable cooldown.',
  'Logistics usually become clearer once Doron starts naming concrete steps.',
  'Weather warnings are not currently subject to volume limits.',
  'A dry comment may arrive before the practical solution.',
  'Historical context can still spawn without a prompt.',
  'Event planning remains surprisingly operational once assigned.',
  'The plan may sound absurd while still being logistically correct.',
  'Saturday handoffs remain a recurring viable strategy.',
  'Availability is generally reported when it becomes knowable.'
 ],
 types:['Quality of Life','Buff','Balance','Known Issue','Hotfix','New Feature']
},
Jack:{
 topics:['Subnautica disappearance handling','Minecraft onboarding','Discord activity','peak detection','reaction vocabulary','D&D enthusiasm','simple-mode advocacy','meme delivery','learning-new-systems mode','group reassurance','game interruption recovery','Peter-Griffin cache'],
 effects:[
  'the “sorry, I was playing Subnautica” recovery path remains fully supported and now restores context slightly faster',
  'continues asking to learn Minecraft setup instead of pretending the installation and mod stack are self-explanatory',
  'still benefits from Discord being the place where the group actually coordinates because activity there is much higher than elsewhere',
  'can identify something as peak with almost no wasted words when the situation meets the threshold',
  'fire, awesome, amazing, and related high-approval reactions remain available at low cooldown',
  'D&D enthusiasm remains high even when the surrounding logistics are less organized',
  'continues advocating for simpler setups when some people are new rather than maximizing complexity immediately',
  'meme and GIF responses still appear when plain text would technically have worked',
  'will ask how to set something up when interested, then engage heavily once the path is understandable',
  'reassurance such as “you’re all good” remains a reliable response when somebody is apologizing or troubleshooting',
  'can re-enter a conversation after a game-related disappearance with minimal penalty',
  'Family Guy and Peter Griffin references remain cached closer to the surface than strictly necessary'
 ],
 callbacks:[
  'Subnautica remains an accepted explanation for temporary absence.',
  'The preferred onboarding difficulty is still “simple enough that everybody can actually use it.”',
  'Discord presence remains significantly higher than several alternative channels.',
  'Peak certification requires very little paperwork.',
  'Enthusiasm remains the default rendering mode.',
  'GIF bandwidth has not been reduced.',
  'New systems perform better once somebody explains the first step.',
  'Game sessions may temporarily suppress response time.',
  'D&D remains a strong re-engagement trigger.',
  'Peter Griffin remains inexplicably relevant.'
 ],
 types:['Buff','Quality of Life','Known Issue','New Feature','Balance','Hotfix']
},
Ethan:{
 topics:['low-volume precision','Pink Floyd detection','pet store roaming investigation','history fact injection','“tis superb” approval mode','sharpness correction','graceful conversation exit','compliment compression','deadpan timing','specific-question requirement','observational accuracy','rare-message impact'],
 effects:[
  'continues speaking less often than most of the group while preserving unusually high impact per message',
  'will still identify a Pink Floyd shirt quickly enough that the observation becomes the entire opening move',
  'pet store wandering now triggers immediate follow-up questioning when Jack is involved',
  'historical references such as the Yankee-Pennamite War can still appear with essentially zero warm-up',
  '“tis superb” remains a compact high-tier approval state requiring no additional explanation',
  'will correct “clean” to “sharp” when the distinction matters and then move on',
  'the “I shall take my leave now” exit routine remains available after delivering the necessary comment',
  'compliments continue arriving in compact forms like impressive, good, or superb rather than full reviews',
  'deadpan comments retain extra effectiveness because they are not preceded by constant chatter',
  'questions still receive a request for specificity when “try what exactly?” is the more useful response',
  'small visual or wording details remain likely to be noticed before the conversation moves past them',
  'rare-message status continues to amplify the surprise value of a well-timed line'
 ],
 callbacks:[
  'Message volume remains low by design.',
  'Historical trivia can still spawn without context.',
  'Pet store surveillance is not an official responsibility.',
  'Pink Floyd recognition requires no setup time.',
  'Precision is preferred over extra words.',
  'The exit line remains fully dramatic despite minimal ceremony.',
  'A short correction may be the entire patch.',
  'The system still refuses to pad a point that already landed.',
  'Deadpan delivery remains untouched.',
  'Sparse participation continues to increase signal-to-noise.'
 ],
 types:['Buff','Balance','Quality of Life','Known Issue','Hotfix','Bug Fix']
},
Rita:{
 topics:['Google Drive access','zip-file handling','Minecraft join flow','computer-dependent participation','keep-inventory preference','“perchance” deployment','group greeting','status reporting','short-form agreement','wait-state handling','technical help request','late-join protocol'],
 effects:[
  'Google Drive and zip-file problems now trigger a direct help request instead of silent troubleshooting for twenty minutes',
  'zip access remains the most likely reason a supposedly simple setup becomes a support ticket',
  'continues treating Minecraft as installed-enough once the remaining task is simply joining the server',
  'will still defer participation until reaching the computer rather than pretending a phone can complete every setup step',
  'keep inventory remains strongly preferred when the alternative is losing progress to avoidable nonsense',
  '“perchance” can still be deployed as a complete contribution when no additional wording is required',
  '“Hi gang” remains a low-cost way to enter the channel without manufacturing context',
  'status messages stay concise: joining later, holding, waiting, or confirming the next action',
  'agreement often arrives as a direct seconding rather than a paragraph explaining why',
  'the “wait” state remains intentionally visible when something does not line up yet',
  'technical blockers are now surfaced quickly enough that somebody else can actually help',
  'late joins continue to include a concrete condition such as getting to the computer first'
 ],
 callbacks:[
  'The computer is still required for several suspiciously computer-shaped tasks.',
  'Perchance remains valid syntax.',
  'Google Drive permissions continue to be everybody’s problem eventually.',
  'Short answers are still preferred when they fully answer the question.',
  'Keep inventory remains a quality-of-life priority.',
  'Joining later is considered a complete status update.',
  'No additional paragraph is generated when “yes” is enough.',
  'Technical friction will be reported, not romanticized.',
  'The group greeting remains stable.',
  'Waiting for the right device remains preferable to forcing a bad workaround.'
 ],
 types:['Quality of Life','Bug Fix','Known Issue','Buff','Hotfix','Balance']
},
Nora:{
 topics:['Hades appreciation','Tidal Dash rating','Nightmare King Grimm credentials','observer mode','conditional join logic','goated classification','Hermes boon ranking','compact reaction set','boss-fight confidence','selective participation','game-opinion precision','low-volume commentary'],
 effects:[
  'Hades content still receives immediate positive weighting and can raise engagement without any additional setup',
  'Tidal Dash remains classified as goated with no balancing pass currently planned',
  'Nightmare King Grimm history continues functioning as proof that rusty does not necessarily mean incapable',
  'observer mode remains a valid way to participate when active involvement would add less value than watching',
  '“I may join, I’ll see” continues to communicate uncertainty without turning it into a scheduling committee',
  'the goated label remains reserved for things that clear a fairly high personal threshold',
  'Hermes boons continue ranking near the top when Hades mechanics enter the conversation',
  'wow, jeez, nice, and similar compact reactions remain sufficient when the event speaks for itself',
  'boss-fight confidence remains boosted by prior Nightmare King Grimm experience',
  'participation remains selective rather than constant, which keeps most comments tied to something specific',
  'game opinions are still delivered directly enough that there is little confusion about the rating',
  'low message volume continues to coexist with very clear preferences when a topic actually matters'
 ],
 callbacks:[
  'Goated remains a technical classification.',
  'Observer mode is still fully supported.',
  'Hades discourse can override low activity temporarily.',
  'Hermes boons remain top-tier until further notice.',
  'Joining remains conditional rather than performative.',
  'Boss credentials do not expire after five years.',
  'A single “wow” may be the complete reaction payload.',
  'Game opinions remain concise and high-confidence.',
  'Silence should not be interpreted as lack of awareness.',
  'Selective participation remains the intended build.'
 ],
 types:['Buff','Balance','Known Issue','Quality of Life','Hotfix','New Feature']
}
};
const STYLES=[
 {type:'Buff',render:(t,e,c)=>`${t} buff: ${cap(e)}. ${c}`},
 {type:'Known Issue',render:(t,e,c)=>`Known issue — ${t}: ${cap(e)}. ${c}`},
 {type:'Quality of Life',render:(t,e,c)=>`Quality-of-life pass on ${t}: ${cap(e)}. ${c}`},
 {type:'New Feature',render:(t,e,c)=>`Reworked ${t}. ${cap(e)}. ${c}`},
 {type:'Nerf',render:(t,e,c)=>`No major nerf to ${t}: ${cap(e)}. ${c}`},
 {type:'Hotfix',render:(t,e,c)=>`Hotfix for ${t}: ${cap(e)}. ${c}`},
 {type:'Balance',render:(t,e,c)=>`Balance notes for ${t}: ${cap(e)}. ${c}`},
 {type:'Known Issue',render:(t,e,c)=>`${t} remains in the current build. ${cap(e)}. ${c}`}
];
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}
const pad=n=>String(n).padStart(2,'0');
function iso(d){return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`}
const start=new Date(Date.UTC(2026,8,21));
const notes=[];
for(let wi=0;wi<62;wi++){
 const d=new Date(start);d.setUTCDate(d.getUTCDate()+wi*7);const week=iso(d);
 PEOPLE.forEach((person,pi)=>{
   const p=PROFILES[person];
   const sceneIndex=(wi*5+pi*3)%p.topics.length;
   const topic=p.topics[sceneIndex];
   const effect=p.effects[sceneIndex];
   const callback=p.callbacks[(wi*9+pi*2)%p.callbacks.length];
   const style=STYLES[(wi+pi*3)%STYLES.length];
   notes.push({id:`${week}-${person.toLowerCase()}`,week,person,type:style.type,text:style.render(topic,effect,callback),profile:PROFILE_VERSION});
 });
}
[
 [0,'Group update: the server, D&D plans, polls, forms, quotes, and ordinary scheduling are still sharing one friend-group operating system. Coordination remains functional despite the number of side quests.'],
 [16,'Cross-group balance pass: Tommy still starts systems, Mike still feeds the quote archive, Alex still asks whether the plan makes sense, and everyone else continues joining at their own preferred level of chaos.'],
 [32,'Season update: Minecraft and D&D remain the strongest recurring reassembly mechanics. Music, memes, tickets, games, and scheduling continue to provide secondary pathways back into the same conversation.'],
 [48,'Group hotfix: “someone should make a thing for this” has once again been interpreted as permission to create infrastructure. No rollback is planned.']
].forEach(([wi,text],i)=>{const d=new Date(start);d.setUTCDate(d.getUTCDate()+wi*7);const week=iso(d);notes.push({id:`${week}-everyone-${i+1}`,week,person:'Everyone',type:'Group Update',text,profile:PROFILE_VERSION})});
globalThis.PATCH_NOTES=notes;
globalThis.PATCH_NOTES_META={profileVersion:PROFILE_VERSION,sourceWindow:SOURCE_WINDOW,count:notes.length};
})();
