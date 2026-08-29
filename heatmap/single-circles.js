const singleCanvas=document.getElementById('singleHeatmap');
const singleCtx=singleCanvas.getContext('2d');
const singleCircleSelect=document.getElementById('singleCircleSelect');
const singleCircleMode=document.getElementById('singleCircleMode');
const singleComboWrap=document.getElementById('singleComboWrap');
const singleComboSelect=document.getElementById('singleComboSelect');
const singleShowCenters=document.getElementById('singleShowCenters');
const singleCircleTitle=document.getElementById('singleCircleTitle');
const singleCircleHint=document.getElementById('singleCircleHint');
const singleCircleLegend=document.getElementById('singleCircleLegend');

CIRCLE_NAMES.forEach((name,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=name;singleCircleSelect.appendChild(o)});
ALL_COMBOS.forEach(members=>{const o=document.createElement('option');o.value=key(members);o.textContent=comboNames(members);singleComboSelect.appendChild(o)});

const singleBg=new Image();
singleBg.crossOrigin='anonymous';
let singleBgReady=false;

function rgba(c,a){return `rgba(${c[0]},${c[1]},${c[2]},${a})`}
function currentSingleCircleIndex(){return Number(singleCircleSelect.value||0)}
function comboMembersFromKey(k){return k.split('_').filter(Boolean)}
function singleItems(){
 const i=currentSingleCircleIndex(),m=singleCircleMode.value;
 if(m==='people')return active().map(members=>{const q=PEOPLE[members].circles[i];return{members:[members],x:q[1],y:q[2],r:q[3],a:q[4]}});
 if(m==='exact'){
  const members=comboMembersFromKey(singleComboSelect.value||key(K));
  return [{members,...circleAverage(members,i)}];
 }
 return ALL_COMBOS.map(members=>({members,...circleAverage(members,i)}));
}
function fillAlpha(item,mode){
 if(mode==='people')return Math.min(.82,.24+item.a*1.12);
 const n=item.members.length;
 if(mode==='exact')return n===1?.72:n===2?.76:n===3?.80:.84;
 return n===1?.24:n===2?.28:n===3?.32:.38;
}
function drawSingleItem(item,mode){
 const color=exactColor(item.members),a=fillAlpha(item,mode);
 singleCtx.save();
 singleCtx.beginPath();
 singleCtx.arc(item.x,item.y,item.r,0,Math.PI*2);
 singleCtx.fillStyle=rgba(color,a);
 singleCtx.fill();
 singleCtx.lineWidth=mode==='all'?3:6;
 singleCtx.strokeStyle=rgba(color,mode==='all'?.78:.96);
 singleCtx.stroke();
 if(singleShowCenters.checked){
  singleCtx.beginPath();
  singleCtx.arc(item.x,item.y,mode==='all'?6:9,0,Math.PI*2);
  singleCtx.fillStyle=rgba(color,1);
  singleCtx.fill();
  singleCtx.lineWidth=2;
  singleCtx.strokeStyle='rgba(15,23,42,.9)';
  singleCtx.stroke();
 }
 singleCtx.restore();
}
function legendItem(item){
 const c=exactColor(item.members),n=item.members.length;
 const d=document.createElement('div');d.className='single-legend-item';
 d.innerHTML=`<i class="swatch" style="background:rgb(${c.join(',')})"></i><b>${comboNames(item.members)}</b><span>${n===1?'person':`${n}-person combo`}</span>`;
 return d;
}
function renderSingleCircle(){
 if(!singleBgReady)return;
 singleCtx.clearRect(0,0,W,H);
 singleCtx.drawImage(singleBg,0,0,W,H);
 const mode=singleCircleMode.value,items=singleItems();
 if(mode==='all')items.sort((a,b)=>a.members.length-b.members.length);
 items.forEach(item=>drawSingleItem(item,mode));
 const i=currentSingleCircleIndex();
 singleCircleTitle.textContent=CIRCLE_NAMES[i];
 singleComboWrap.hidden=mode!=='exact';
 singleCircleHint.textContent=mode==='people'
  ?'Shows only this one 10Groups heat circle for the people currently enabled in the main People toggles above.'
  :mode==='all'
   ?'Shows this one circle across all 15 non-empty combinations: 4 singles, 6 pairs, 4 triples, and all 4. Combo centers are arithmetic means of the member circle centers.'
   :'Shows only the selected person combination for this one circle. Combo coordinates are the arithmetic mean of its members.';
 singleCircleLegend.innerHTML='';
 items.forEach(item=>singleCircleLegend.appendChild(legendItem(item)));
}

singleCircleSelect.addEventListener('change',()=>{
 if(circleFilter&&circleFilter.value!=='all'){circleFilter.value=singleCircleSelect.value;renderCoordinateTables()}
 renderSingleCircle();
});
singleCircleMode.addEventListener('change',renderSingleCircle);
singleComboSelect.addEventListener('change',renderSingleCircle);
singleShowCenters.addEventListener('change',renderSingleCircle);
K.forEach(k=>els[k].addEventListener('change',renderSingleCircle));

singleBg.onload=()=>{singleBgReady=true;renderSingleCircle()};
singleBg.onerror=()=>{singleCtx.fillStyle='white';singleCtx.fillRect(0,0,W,H);singleCtx.fillStyle='black';singleCtx.font='34px Arial';singleCtx.fillText('Could not load 10Groups heatmap background.',70,100)};
singleBg.src='https://10groups.github.io/heatmap_img.png';
