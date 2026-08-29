const singleCanvas=document.getElementById('singleHeatmap');
const singleCtx=singleCanvas.getContext('2d');
const singleCircleSelect=document.getElementById('singleCircleSelect');
const singleCircleMode=document.getElementById('singleCircleMode');
const singlePeopleFilters=document.getElementById('singlePeopleFilters');
const singleSizeFilters=document.getElementById('singleSizeFilters');
const singleComboWrap=document.getElementById('singleComboWrap');
const singleComboSelect=document.getElementById('singleComboSelect');
const singleShowCenters=document.getElementById('singleShowCenters');
const singleShowAverage=document.getElementById('singleShowAverage');
const singleCircleTitle=document.getElementById('singleCircleTitle');
const singleCircleHint=document.getElementById('singleCircleHint');
const singleCircleLegend=document.getElementById('singleCircleLegend');
const singlePersonChecks={
 aiden:document.getElementById('singleAiden'),
 tommy:document.getElementById('singleTommy'),
 justin:document.getElementById('singleJustin'),
 taylor:document.getElementById('singleTaylor')
};
const singleSizeChecks={
 1:document.getElementById('singleSize1'),
 2:document.getElementById('singleSize2'),
 3:document.getElementById('singleSize3'),
 4:document.getElementById('singleSize4')
};

CIRCLE_NAMES.forEach((name,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=name;singleCircleSelect.appendChild(o)});
ALL_COMBOS.forEach(members=>{const o=document.createElement('option');o.value=key(members);o.textContent=`${members.length} ${members.length===1?'person':'people'} · ${comboNames(members)}`;singleComboSelect.appendChild(o)});
singleComboSelect.value=key(K);

const singleBg=new Image();
singleBg.crossOrigin='anonymous';
let singleBgReady=false;

function rgba(c,a){return `rgba(${c[0]},${c[1]},${c[2]},${a})`}
function currentSingleCircleIndex(){return Number(singleCircleSelect.value||0)}
function comboMembersFromKey(k){return k.split('_').filter(Boolean)}
function singleSelectedPeople(){return K.filter(k=>singlePersonChecks[k].checked)}
function selectedComboSizes(){return [1,2,3,4].filter(n=>singleSizeChecks[n].checked)}
function itemForMembers(members,i){
 if(members.length===1){const q=PEOPLE[members[0]].circles[i];return{members,x:q[1],y:q[2],r:q[3],a:q[4]}}
 return{members,...circleAverage(members,i)}
}
function singleItems(){
 const i=currentSingleCircleIndex(),m=singleCircleMode.value;
 if(m==='people')return singleSelectedPeople().map(person=>itemForMembers([person],i));
 if(m==='exact')return[itemForMembers(comboMembersFromKey(singleComboSelect.value||key(K)),i)];
 const sizes=new Set(selectedComboSizes());
 const allowed=new Set(singleSelectedPeople());
 return ALL_COMBOS.filter(members=>sizes.has(members.length)&&members.every(person=>allowed.has(person))).map(members=>itemForMembers(members,i));
}
function singleAverageMembers(mode){
 if(mode==='exact')return comboMembersFromKey(singleComboSelect.value||key(K));
 return singleSelectedPeople();
}
function singleAverageItem(mode,i){
 if(!singleShowAverage.checked)return null;
 const members=singleAverageMembers(mode);
 if(!members.length)return null;
 return{members,...circleAverage(members,i),average:true};
}
function updateSingleFilterVisibility(){
 const m=singleCircleMode.value;
 singlePeopleFilters.hidden=m==='exact';
 singleSizeFilters.hidden=m!=='all';
 singleComboWrap.hidden=m!=='exact';
}
function fillAlpha(item,mode,itemCount){
 if(mode==='people')return Math.min(.78,.30+item.a*.92);
 if(mode==='exact')return item.members.length===1?.68:item.members.length===2?.72:item.members.length===3?.76:.80;
 const n=item.members.length;
 const base=n===1?.19:n===2?.15:n===3?.12:.10;
 return itemCount<=6?base+.08:base;
}
function drawSingleItem(item,mode,itemCount){
 const color=exactColor(item.members),a=fillAlpha(item,mode,itemCount);
 singleCtx.save();
 singleCtx.beginPath();
 singleCtx.arc(item.x,item.y,item.r,0,Math.PI*2);
 singleCtx.fillStyle=rgba(color,a);
 singleCtx.fill();
 singleCtx.lineWidth=mode==='all'?5:8;
 singleCtx.strokeStyle=mode==='all'?'rgba(15,23,42,.38)':'rgba(15,23,42,.55)';
 singleCtx.stroke();
 singleCtx.beginPath();
 singleCtx.arc(item.x,item.y,item.r,0,Math.PI*2);
 singleCtx.lineWidth=mode==='all'?3:5;
 singleCtx.strokeStyle=rgba(color,mode==='all'?.88:.98);
 singleCtx.stroke();
 if(singleShowCenters.checked){
  singleCtx.beginPath();
  singleCtx.arc(item.x,item.y,mode==='all'?7:10,0,Math.PI*2);
  singleCtx.fillStyle=rgba(color,1);
  singleCtx.fill();
  singleCtx.lineWidth=3;
  singleCtx.strokeStyle='rgba(15,23,42,.88)';
  singleCtx.stroke();
 }
 singleCtx.restore();
}
function drawSingleAverage(item){
 singleCtx.save();
 singleCtx.beginPath();
 singleCtx.arc(item.x,item.y,item.r,0,Math.PI*2);
 singleCtx.setLineDash([20,13]);
 singleCtx.lineWidth=10;
 singleCtx.strokeStyle='rgba(15,23,42,.90)';
 singleCtx.stroke();
 singleCtx.beginPath();
 singleCtx.arc(item.x,item.y,item.r,0,Math.PI*2);
 singleCtx.lineWidth=5;
 singleCtx.strokeStyle='rgba(255,255,255,.98)';
 singleCtx.stroke();
 singleCtx.setLineDash([]);
 singleCtx.translate(item.x,item.y);
 singleCtx.shadowColor='rgba(0,0,0,.55)';
 singleCtx.shadowBlur=8;
 singleCtx.beginPath();
 singleCtx.moveTo(0,-18);
 singleCtx.lineTo(18,0);
 singleCtx.lineTo(0,18);
 singleCtx.lineTo(-18,0);
 singleCtx.closePath();
 singleCtx.fillStyle='#fff';
 singleCtx.fill();
 singleCtx.lineWidth=6;
 singleCtx.strokeStyle='#111827';
 singleCtx.stroke();
 singleCtx.shadowBlur=0;
 singleCtx.beginPath();
 singleCtx.arc(0,0,4,0,Math.PI*2);
 singleCtx.fillStyle='#111827';
 singleCtx.fill();
 singleCtx.restore();
}
function legendItem(item){
 const c=exactColor(item.members),n=item.members.length;
 const d=document.createElement('div');d.className='single-legend-item';
 d.innerHTML=`<i class="swatch" style="background:rgb(${c.join(',')})"></i><b>${comboNames(item.members)}</b><span>${n===1?'person':`${n}-person combo`}</span>`;
 return d;
}
function averageLegendItem(members){
 const d=document.createElement('div');d.className='single-legend-item single-average-legend';
 d.innerHTML=`<i class="avg-symbol single-avg-symbol"></i><b>Average</b><span>${comboNames(members)}</span>`;
 return d;
}
function currentHint(mode,items,averageItem){
 const avgText=averageItem?` The white dashed circle and diamond are the average of ${comboNames(averageItem.members)}.`:'';
 if(mode==='people'){
  const selected=singleSelectedPeople();
  return selected.length?`Showing this circle for ${selected.map(k=>PEOPLE[k].display).join(', ')}. These filters are independent from the main heatmap above.${avgText}`:'No people are selected. Turn on at least one person below Display.';
 }
 if(mode==='all'){
  const sizes=selectedComboSizes(),selected=singleSelectedPeople();
  if(!selected.length)return'No people are selected. Enable at least one person to build combinations.';
  return sizes.length?`Showing ${items.length} combination${items.length===1?'':'s'} made only from ${selected.map(k=>PEOPLE[k].display).join(', ')}. Included sizes: ${sizes.map(n=>n===1?'singles':n===2?'pairs':n===3?'triples':'all 4').join(', ')}.${avgText}`:'No combo sizes are selected. Enable Singles, Pairs, Triples, or All 4.';
 }
 return`Showing only ${comboNames(comboMembersFromKey(singleComboSelect.value||key(K)))} for this circle. Combo coordinates are arithmetic means of the member circle centers.${avgText}`;
}
function renderSingleCircle(){
 updateSingleFilterVisibility();
 const i=currentSingleCircleIndex(),mode=singleCircleMode.value,items=singleItems(),averageItem=singleAverageItem(mode,i);
 singleCircleTitle.textContent=CIRCLE_NAMES[i];
 singleCircleHint.textContent=currentHint(mode,items,averageItem);
 singleCircleLegend.innerHTML='';
 items.forEach(item=>singleCircleLegend.appendChild(legendItem(item)));
 if(averageItem)singleCircleLegend.appendChild(averageLegendItem(averageItem.members));
 if(!singleBgReady)return;
 singleCtx.clearRect(0,0,W,H);
 singleCtx.drawImage(singleBg,0,0,W,H);
 const drawItems=[...items];
 if(mode==='all')drawItems.sort((a,b)=>b.members.length-a.members.length);
 drawItems.forEach(item=>drawSingleItem(item,mode,drawItems.length));
 if(averageItem)drawSingleAverage(averageItem);
}

singleCircleSelect.addEventListener('change',()=>{
 if(circleFilter&&circleFilter.value!=='all'){circleFilter.value=singleCircleSelect.value;renderCoordinateTables()}
 renderSingleCircle();
});
singleCircleMode.addEventListener('change',renderSingleCircle);
singleComboSelect.addEventListener('change',renderSingleCircle);
singleShowCenters.addEventListener('change',renderSingleCircle);
singleShowAverage.addEventListener('change',renderSingleCircle);
Object.values(singlePersonChecks).forEach(el=>el.addEventListener('change',renderSingleCircle));
Object.values(singleSizeChecks).forEach(el=>el.addEventListener('change',renderSingleCircle));

updateSingleFilterVisibility();
renderSingleCircle();
singleBg.onload=()=>{singleBgReady=true;renderSingleCircle()};
singleBg.onerror=()=>{singleCtx.fillStyle='white';singleCtx.fillRect(0,0,W,H);singleCtx.fillStyle='black';singleCtx.font='34px Arial';singleCtx.fillText('Could not load 10Groups heatmap background.',70,100)};
singleBg.src='https://10groups.github.io/heatmap_img.png';
