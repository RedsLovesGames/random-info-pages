(()=>{
const PEOPLE=['Alex','Doron','Ethan','Jack','Mike','Nora','Rita','Tommy'];
const TYPES=['Buff','Nerf','Bug Fix','Balance','Known Issue','Quality of Life','New Feature','Hotfix'];
const OPENERS=['Adjusted','Rebalanced','Updated','Retuned','Patched','Improved','Reworked','Stabilized'];
const CLOSERS=['No action required.','Monitoring will continue.','Further tuning may be necessary.','This is considered intended behavior.','Results may vary during group events.','Regression risk remains low.','The team declined further investigation.','This change is live immediately.','Documentation remains optional.','Performance is within expected chaos limits.','No rollback is planned.'];
const METRICS=['reliability','timing','chaos resistance','social battery efficiency','response latency','commitment to the bit','recovery speed','decision throughput','context retention'];
const P={
Alex:{s:['planning','calendar awareness','D&D preparation','decision making','schedule confidence','organization','last-minute improvisation','group coordination'],e:['now activates one reminder earlier','received a small reliability buff','has fewer unnecessary confirmation loops','can recover from a missed plan slightly faster','now supports one extra contingency plan','uses less overthinking per decision','has improved resistance to schedule chaos','still occasionally treats “later” as a valid timestamp']},
Doron:{s:['tangent generation','storytelling','commitment to the bit','late-night logic','topic switching','confidence','reaction speed','conversation momentum'],e:['branches into side quests faster','now returns to the original topic slightly more often','gained extra resistance to abandoning a joke','has improved dramatic timing','can sustain an argument through one additional interruption','received a minor buff to unnecessary specificity','now produces stronger reactions with less setup','remains difficult to predict after 11 PM']},
Ethan:{s:['deadpan delivery','one-liner accuracy','reaction timing','practical judgment','chaos tolerance','conversation efficiency','unexpected observations','group support'],e:['received a quiet but noticeable buff','now lands with less warning','can survive one additional ridiculous conversation','has improved timing on low-volume comments','uses fewer words without losing damage output','gained resistance to secondhand embarrassment','now identifies nonsense slightly earlier','still has a rare chance to say the funniest thing in the room and move on']},
Jack:{s:['timing','background commentary','event attendance','group positioning','response latency','surprise appearances','low-key chaos','conversation entry'],e:['now enters conversations at more statistically inconvenient moments','received a small punctuality buff','has improved stealth while everyone else is arguing','can disappear from a topic with less explanation','now returns with slightly better context','gained one additional emergency comeback slot','produces fewer notifications per useful contribution','remains difficult to patch because behavior is mostly undocumented']},
Mike:{s:['quote generation','filtering','He-Man commentary','conversation escalation','impulse control','word choice','confidence','topic safety checks'],e:['output remains above intended design limits','received a filter buff that immediately failed regression testing','now generates quotable lines with less startup time','has reduced cooldown between questionable statements','gained one additional “I should not say this” warning that may be ignored','now recognizes danger approximately half a second earlier','still causes the quote archive to grow faster than storage estimates','remains the primary stress test for the moderation layer']},
Nora:{s:['precision','reaction quality','selective participation','observation accuracy','conversation timing','skepticism','attention to detail','quiet commentary'],e:['received a small accuracy buff','now waits slightly longer before entering low-value arguments','can identify flawed logic with fewer words','has improved immunity to unnecessary group panic','now stores one additional mental receipt','uses reaction energy more efficiently','gained better timing for high-value interruptions','remains difficult to bait into nonsense without sufficient setup']},
Rita:{s:['reaction speed','comeback generation','group energy','conversation recovery','side-eye intensity','practicality','chaos response','timing'],e:['received a noticeable responsiveness buff','now restores group momentum after awkward pauses','can deploy one additional comeback per session','has improved resistance to being dragged into nonsense','now detects bad ideas sooner','gained a minor buff to immediate judgment','uses less patience on obviously doomed plans','still has a low tolerance for preventable stupidity']},
Tommy:{s:['project orchestration','quote archiving','idea generation','group logistics','follow-through','scope expansion','rapid prototyping','coordination'],e:['now starts new projects faster than they can be named','received a buff to turning jokes into websites','has improved recovery after adding “one more feature”','can coordinate one additional moving part before documentation becomes mandatory','now archives chaos with lower latency','gained resistance to leaving an idea as just an idea','still occasionally converts a five-minute task into an ecosystem','remains overclocked when a spreadsheet or website could technically exist']}
};
const pad=n=>String(n).padStart(2,'0');
function iso(d){return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`}
const start=new Date(Date.UTC(2026,8,21));
const notes=[];
for(let wi=0;wi<62;wi++){
 const d=new Date(start);d.setUTCDate(d.getUTCDate()+wi*7);const week=iso(d);
 PEOPLE.forEach((person,pi)=>{
   const p=P[person],system=p.s[(wi+pi*3)%p.s.length],effect=p.e[(wi*3+pi*5)%p.e.length];
   const opener=OPENERS[(wi*5+pi)%OPENERS.length],type=TYPES[(wi*3+pi)%TYPES.length],closer=CLOSERS[(wi*7+pi*2)%CLOSERS.length];
   const metric=METRICS[(wi*4+pi)%METRICS.length],delta=((wi*17+pi*11)%23)+2,direction=((wi+pi)%3===0?'increased':(wi+pi)%3===1?'reduced':'shifted');
   notes.push({id:`${week}-${person.toLowerCase()}`,week,person,type,text:`${opener} ${system}: ${effect}. ${metric[0].toUpperCase()+metric.slice(1)} ${direction} by ${delta}%. ${closer}`});
 });
}
[
 [0,'Global balance pass: group chaos remains within acceptable operating limits. Quote generation and side quests continue to exceed forecasts.'],
 [16,'Cross-person compatibility update: interruption handling improved slightly. Nobody agreed on the definition of slightly.'],
 [32,'Seasonal stability patch: plans now have a marginally better chance of surviving contact with all eight schedules.'],
 [48,'Group-wide hotfix: repeated attempts to behave normally have been deprecated after insufficient adoption.']
].forEach(([wi,text],i)=>{const d=new Date(start);d.setUTCDate(d.getUTCDate()+wi*7);const week=iso(d);notes.push({id:`${week}-everyone-${i+1}`,week,person:'Everyone',type:'Group Update',text})});
globalThis.PATCH_NOTES=notes;
})();
