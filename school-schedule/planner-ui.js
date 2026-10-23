/* Progressive UI enhancements: preserve the original school:* checkbox storage. */
(()=>{
'use strict';
const host=document.getElementById('plannerControls');
const week=document.getElementById('weekDays');
const major=document.getElementById('majorGrid');
if(!host||!week||!major)return;
const settingsKey='rip.schedule.view.v1';
let stored={};
try{stored=JSON.parse(localStorage.getItem(settingsKey)||'{}')||{}}catch{}
let activeCourse=typeof stored.course==='string'?stored.course:'all';
let openOnly=stored.openOnly===true;
host.innerHTML='<div class="planner-left"><label for="plannerCourse">Course</label><select id="plannerCourse" aria-label="Filter tasks by course"><option value="all">All courses</option></select><button type="button" class="planner-toggle" id="openOnly" aria-pressed="false">Hide completed</button></div><div class="planner-progress"><span class="planner-meter" role="progressbar" aria-label="Visible task completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></span><span class="planner-count" id="plannerCount">0 / 0 done</span></div>';
const select=document.getElementById('plannerCourse'),toggle=document.getElementById('openOnly');
const progress=host.querySelector('.planner-meter'),bar=progress.querySelector('span'),count=document.getElementById('plannerCount');
const emptyWeek=document.getElementById('weekFilterEmpty'),emptyMajor=document.getElementById('majorFilterEmpty');
function courseOf(row){
 const text=row.querySelector('label strong')?.textContent||'';
 const left=text.split(' • ')[0].trim();
 return left.replace(/-[A-Z0-9]+$/,'');
}
function allRows(){return [...week.querySelectorAll('.task'),...major.querySelectorAll('.task')]}
function save(){
 try{localStorage.setItem(settingsKey,JSON.stringify({course:activeCourse,openOnly}))}catch{}
}
function options(){
 const courses=[...new Set(allRows().map(courseOf).filter(Boolean))].sort();
 select.replaceChildren(new Option('All courses','all'),...courses.map(c=>new Option(c,c)));
 if(activeCourse!=='all'&&!courses.includes(activeCourse))activeCourse='all';
 select.value=activeCourse;
 toggle.setAttribute('aria-pressed',String(openOnly));
 toggle.textContent=openOnly?'Show completed ↗':'Hide completed';
}
function filter(){
 let done=0,total=0;
 for(const row of allRows()){
  const cb=row.querySelector('[data-task]');
  if(!cb)continue;
  const courseMatches=activeCourse==='all'||courseOf(row)===activeCourse;
  const show=courseMatches&&(!openOnly||!cb.checked);
  row.hidden=!show;
  // Count unique matching tasks so a deadline shown twice is counted once.
 }
 const eligible=new Map();
 for(const row of allRows()){
  const cb=row.querySelector('[data-task]');
  if(cb&&(activeCourse==='all'||courseOf(row)===activeCourse))eligible.set(cb.dataset.task,cb.checked);
 }
 total=eligible.size;done=[...eligible.values()].filter(Boolean).length;
 const pct=total?Math.round(done/total*100):0;
 bar.style.width=pct+'%';progress.setAttribute('aria-valuenow',String(pct));
 count.textContent=done+' / '+total+' done';
 let visibleWeek=0,visibleMajor=0;
 for(const day of week.querySelectorAll('.day')){
  day.hidden=!day.querySelector('.task:not([hidden])');
  if(!day.hidden)visibleWeek++;
 }
 for(const card of major.querySelectorAll('.major')){
  card.hidden=!card.querySelector('.task:not([hidden])');
  if(!card.hidden)visibleMajor++;
 }
 emptyWeek.hidden=visibleWeek>0||(!activeCourse&& !openOnly);
 emptyMajor.hidden=visibleMajor>0;
 for(const li of document.querySelectorAll('[data-focus-task]')){
  // A completed priority should no longer appear urgent.
  li.hidden=localStorage.getItem('school:'+li.dataset.focusTask)==='1';
 }
}
select.addEventListener('change',()=>{activeCourse=select.value;save();filter()});
toggle.addEventListener('click',()=>{openOnly=!openOnly;toggle.setAttribute('aria-pressed',String(openOnly));toggle.textContent=openOnly?'Show completed ↗':'Hide completed';save();filter()});
document.addEventListener('change',e=>{
 const cb=e.target.closest?.('input[data-task]');
 if(!cb)return;
 // The original page persists completion. Mirror duplicate instances
 // of the same assignment without inventing a new storage format.
 for(const other of document.querySelectorAll('input[data-task]')){
  if(other!==cb&&other.dataset.task===cb.dataset.task)other.checked=cb.checked;
 }
 filter();
});
document.getElementById('resetChecks')?.addEventListener('click',()=>{queueMicrotask(()=>{options();filter()})});
options();filter();
})();
