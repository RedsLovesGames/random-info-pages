const PEOPLE={
 aiden:{display:'Aiden',color:[255,90,95],v:{x:4.25,y:-3.23,ax:4.25,ay:-.25,bx:5.83,by:-4.29,cx:3.13,cy:6.15,ex:-2.45,ey:5,fy:-7,gx:-1}},
 tommy:{display:'Tommy',color:[79,124,255],v:{x:-4.78,y:-1.02,ax:-4.79,ay:2.08,bx:.11,by:.11,cx:-1,cy:-2,ex:7,ey:-.75,fy:-4,gx:-4.2}},
 justin:{display:'Justin',color:[46,204,113],v:{x:5.63,y:-1.77,ax:5.63,ay:-.75,bx:3.33,by:-2.06,cx:2.25,cy:5.77,ex:-1.09,ey:0,fy:-3,gx:-6}},
 taylor:{display:'Taylor',color:[255,176,32],v:{x:4.13,y:1.84,ax:4.13,ay:-3.75,bx:-10,by:1.59,cx:3.75,cy:9.08,ex:-6.09,ey:-3.33,fy:5,gx:-2}}
};
const K=Object.keys(PEOPLE),W=1800,H=1500;
function circles(v){return[
 ['General',900+55*v.x,750-55*v.y,150,.5],['Economic + Governmental',900+55*v.ax,750-55*v.by,150,.3],['Economic',900+55*v.ax,750-55*v.ay,150,.3],['Authoritarian + Technological',900+27.5*(v.ey+v.ex),750-27.5*(v.by+v.bx),150,.3],['Economic + Law',900+27.5*v.ex,750-55*v.fy,150,.3],['Nationalist + Societal',900+20*(v.cy+v.cx),750-55*v.cx,150,.2],['Law + State',900+55*v.by,750-27.5*v.fy,150,.2],['Cultural + State',900+55*v.gx,750-55*v.ay,160,.2]
]}
K.forEach(k=>PEOPLE[k].circles=circles(PEOPLE[k].v));
const PAIRS={'aiden_tommy':[166,92,255],'aiden_justin':[193,175,68],'aiden_taylor':[255,136,76],'justin_tommy':[54,190,214],'taylor_tommy':[157,145,215],'justin_taylor':[150,196,58]};
const TRIPLES={'aiden_justin_tommy':[226,190,255],'aiden_taylor_tommy':[255,204,185],'aiden_justin_taylor':[219,243,160],'justin_taylor_tommy':[192,226,255]};
const QUAD=[255,255,255], els=Object.fromEntries([...K,'overlaps'].map(k=>[k,document.getElementById(k)]));
function key(a){return [...a].sort().join('_')}
function exactColor(a){if(a.length===1)return PEOPLE[a[0]].color;if(a.length===2)return PAIRS[key(a)]||[220,220,220];if(a.length===3)return TRIPLES[key(a)]||[245,245,245];return QUAD}
function alpha(n,vals){const p=Math.max(...vals);return n===1?Math.min(.82,.18+p*1.38):n===2?Math.min(.92,.28+p*1.55):n===3?Math.min(.96,.36+p*1.55):Math.min(.98,.42+p*1.6)}
function mask(cs){const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');cs.forEach(q=>{x.beginPath();x.arc(q[1],q[2],q[3],0,Math.PI*2);x.fillStyle=`rgba(255,255,255,${q[4]})`;x.fill()});return x.getImageData(0,0,W,H).data}
const MASKS=Object.fromEntries(K.map(k=>[k,mask(PEOPLE[k].circles)]));
const canvas=document.getElementById('heatmap'),ctx=canvas.getContext('2d');let bgData=null,mode={type:'base'};
function active(){return K.filter(k=>els[k].checked)}
function render(){if(!bgData)return;const out=new Uint8ClampedArray(bgData.data),act=active();for(let p=0;p<W*H;p++){const i=p*4,pres=[],vals={};for(const k of act){const a=MASKS[k][i+3]/255;vals[k]=a;if(a>.002)pres.push(k)}if(!pres.length)continue;let show=mode.type==='base',color,a;if(mode.type==='filter'){show=mode.kind==='any'?pres.length>=2:mode.kind==='len'?pres.length===mode.n:key(pres)===mode.k}if(!show)continue;if(mode.type==='base'&&!els.overlaps.checked){let sr=0,sg=0,sb=0,sw=0,ac=0;for(const k of pres){const w=vals[k],c=PEOPLE[k].color;sr+=c[0]*w;sg+=c[1]*w;sb+=c[2]*w;sw+=w;ac=1-(1-ac)*(1-w)}color=[sr/sw,sg/sw,sb/sw];a=Math.min(.9,.15+ac*1.35)}else{color=exactColor(pres);a=alpha(pres.length,pres.map(k=>vals[k]))}out[i]=out[i]*(1-a)+color[0]*a;out[i+1]=out[i+1]*(1-a)+color[1]*a;out[i+2]=out[i+2]*(1-a)+color[2]*a}ctx.putImageData(new ImageData(out,W,H),0,0)}
function comboNames(arr){return arr.map(k=>PEOPLE[k].display).join(' + ')}
function combos(n){const r=[];function rec(start,a){if(a.length===n){r.push([...a]);return}for(let i=start;i<K.length;i++){a.push(K[i]);rec(i+1,a);a.pop()}}rec(0,[]);return r}
const select=[['All 4',K],...K.map(k=>[PEOPLE[k].display,[k]]),...combos(2).map(a=>[comboNames(a),a]),...combos(3).map(a=>[comboNames(a),a])];
const overlap=[['Any overlap',{kind:'any'}],['Any 2-person overlap',{kind:'len',n:2}],['Any 3-person overlap',{kind:'len',n:3}],['4-person overlap',{kind:'len',n:4}],...combos(2).map(a=>[comboNames(a),{kind:'exact',k:key(a)}]),...combos(3).map(a=>[comboNames(a),{kind:'exact',k:key(a)}]),['All 4',{kind:'exact',k:key(K)}]];
function button(root,label,sub,fn){const b=document.createElement('button');b.className='btn';b.innerHTML=`${label}<small>${sub}</small>`;b.onclick=fn;root.appendChild(b)}
const sroot=document.getElementById('selectionPresets'),oroot=document.getElementById('overlapPresets');select.forEach(([l,a])=>button(sroot,l,`${a.length} person${a.length===1?'':'s'}`,()=>{K.forEach(k=>els[k].checked=a.includes(k));mode={type:'base'};render()}));overlap.forEach(([l,m])=>button(oroot,l,m.kind==='exact'?'Exact combo only':'Category filter',()=>{K.forEach(k=>els[k].checked=true);mode={type:'filter',...m};render()}));
K.concat('overlaps').forEach(k=>els[k].addEventListener('change',()=>{mode={type:'base'};render()}));
const legend=document.getElementById('legend');[...K.map(k=>[PEOPLE[k].display,PEOPLE[k].color,'Person']),...Object.entries(PAIRS).map(([k,c])=>[comboNames(k.split('_')),c,'2-person']),...Object.entries(TRIPLES).map(([k,c])=>[comboNames(k.split('_')),c,'3-person']),['All 4',QUAD,'4-person']].forEach(([l,c,t])=>{const d=document.createElement('div');d.className='legend-item';d.innerHTML=`<i class="swatch" style="background:rgb(${c})"></i><b>${l}</b><span>${t}</span>`;legend.appendChild(d)});

const tables=document.getElementById('tables');
const coordinateView=document.getElementById('coordinateView');
const circleFilter=document.getElementById('circleFilter');
const coordinateSort=document.getElementById('coordinateSort');
const coordinateHint=document.getElementById('coordinateHint');
const CIRCLE_NAMES=PEOPLE[K[0]].circles.map(q=>q[0]);
CIRCLE_NAMES.forEach((name,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=name;circleFilter.appendChild(o)});
const ALL_COMBOS=[...K.map(k=>[k]),...combos(2),...combos(3),K];
function coordinateRowsSort(rows){const s=coordinateSort.value;if(s==='default')return rows;const copy=[...rows];if(s==='xAsc')copy.sort((a,b)=>a.x-b.x);if(s==='xDesc')copy.sort((a,b)=>b.x-a.x);if(s==='yAsc')copy.sort((a,b)=>a.y-b.y);if(s==='yDesc')copy.sort((a,b)=>b.y-a.y);return copy}
function circleAverage(members,index){const qs=members.map(k=>PEOPLE[k].circles[index]);return{x:qs.reduce((s,q)=>s+q[1],0)/qs.length,y:qs.reduce((s,q)=>s+q[2],0)/qs.length,r:qs.reduce((s,q)=>s+q[3],0)/qs.length,a:qs.reduce((s,q)=>s+q[4],0)/qs.length}}
function comboLabel(members){const c=exactColor(members);return `<span class="combo-label"><i class="combo-swatch" style="background:rgb(${c.join(',')})"></i>${comboNames(members)}</span>`}
function card(title,sub,head,body){const d=document.createElement('div');d.className='table-card';d.innerHTML=`<h3>${title}</h3>${sub?`<span class="card-sub">${sub}</span>`:''}<table><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;tables.appendChild(d)}
function selectedCircleIndexes(){return circleFilter.value==='all'?CIRCLE_NAMES.map((_,i)=>i):[Number(circleFilter.value)]}
function renderCoordinateTables(){tables.innerHTML='';tables.classList.toggle('circle-view',coordinateView.value!=='person');const indexes=selectedCircleIndexes();if(coordinateView.value==='person'){
 coordinateHint.textContent='By person shows each result’s original circles. Choose one circle or sort the visible circle rows by X or Y.';
 K.forEach(k=>{let rows=indexes.map(i=>{const q=PEOPLE[k].circles[i];return{name:q[0],x:q[1],y:q[2],r:q[3],a:q[4],i}});rows=coordinateRowsSort(rows);card(PEOPLE[k].display,'Original formula-derived circle coordinates',['Circle','X','Y','R','A'],rows.map(r=>`<tr><td>${r.name}</td><td>${r.x.toFixed(2)}</td><td>${r.y.toFixed(2)}</td><td>${r.r.toFixed(0)}</td><td>${r.a.toFixed(2)}</td></tr>`).join(''))});
 return}
 const allCombos=coordinateView.value==='circleCombos';coordinateHint.textContent=allCombos?'Every circle is grouped across all 15 non-empty person combinations. Pair, triple, and all-four coordinates are arithmetic means of the member circles.':'Each circle is grouped across Aiden, Tommy, Justin, and Taylor so the same circle can be compared directly.';
 indexes.forEach(i=>{let rows=(allCombos?ALL_COMBOS:K.map(k=>[k])).map((members,order)=>{const q=circleAverage(members,i);return{members,order,...q}});rows=coordinateRowsSort(rows);card(CIRCLE_NAMES[i],allCombos?'15 combinations: 4 singles, 6 pairs, 4 triples, and all 4':'Direct comparison of the same circle across everyone',['Result / combo','X','Y','R','A'],rows.map(r=>`<tr><td>${comboLabel(r.members)}</td><td>${r.x.toFixed(2)}</td><td>${r.y.toFixed(2)}</td><td>${r.r.toFixed(0)}</td><td>${r.a.toFixed(2)}</td></tr>`).join(''))})}
[coordinateView,circleFilter,coordinateSort].forEach(el=>el.addEventListener('change',renderCoordinateTables));
renderCoordinateTables();

const bg=new Image();bg.crossOrigin='anonymous';bg.onload=()=>{ctx.drawImage(bg,0,0,W,H);bgData=ctx.getImageData(0,0,W,H);render()};bg.onerror=()=>{ctx.fillStyle='white';ctx.fillRect(0,0,W,H);ctx.fillStyle='black';ctx.font='34px Arial';ctx.fillText('Could not load 10Groups heatmap background.',70,100)};bg.src='https://10groups.github.io/heatmap_img.png';
