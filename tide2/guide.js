(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const clamp = (n,a,b) => Math.min(b,Math.max(a,n));
  const pct = n => `${(n*100).toFixed(n < .01 ? 2 : 1)}%`;
  const num = (n,d=2) => Number(n).toFixed(d);
  const rarityComp = [1,1.15,1.4,1.8,2.4];
  const luckCoeff = [0,.08,.16,.24,.32];
  const speciesPoints = [50,100,175,250,350];
  const exampleWeights = [60,25,10,4,1];

  function traitLuckAdjust(P,T){
    if(Number.isNaN(P)) return 0;
    P = clamp(P,0,1);
    if(P === 0 || P === 1) return P;
    if(Number.isNaN(T)) T = 0;
    if(T === Infinity) return 1;
    T = Math.max(-10,T);
    return clamp(1-Math.pow(1-P,1+T/10),0,1);
  }
  function fishingMultiplier(star,L){ return 1 + luckCoeff[star-1] * Math.sqrt(Math.max(0,L)); }
  function perfectBase(p){
    if(p < 95) return 0;
    if(p >= 99.9) return .60;
    const a = [[95,.02],[97.5,.08],[99,.25],[99.9,.60]];
    for(let i=1;i<a.length;i++){
      if(p <= a[i][0]){
        const [x0,y0]=a[i-1],[x1,y1]=a[i];
        return y0 + (p-x0)/(x1-x0)*(y1-y0);
      }
    }
    return .60;
  }
  function fishScore(raw){ return clamp(Math.round(1+2999*((raw-50)/875)),1,3000); }
  function giantProbability(p){ return .25 + .5*(clamp(p,0,100)/100); }

  // Page polish
  addEventListener('pointermove',e=>{
    const el=e.target.closest('.spotlight,.hero-card'); if(!el) return;
    const r=el.getBoundingClientRect();
    el.style.setProperty('--mx',`${(e.clientX-r.left)/r.width*100}%`);
    el.style.setProperty('--my',`${(e.clientY-r.top)/r.height*100}%`);
  },{passive:true});
  const io = new IntersectionObserver(entries=>entries.forEach(e=>{
    if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
  }),{threshold:.06});
  $$('.reveal').forEach(e=>io.observe(e));
  const navLinks=$$('#navlinks a');
  function onScroll(){
    const d=document.documentElement.scrollHeight-innerHeight;
    const progress=$('#progress'); if(progress) progress.style.width=`${d?scrollY/d*100:0}%`;
    let active='';
    navLinks.forEach(a=>{const t=$(a.hash); if(t && t.getBoundingClientRect().top<160) active=t.id;});
    navLinks.forEach(a=>a.classList.toggle('active',a.hash===`#${active}`));
  }
  addEventListener('scroll',onScroll,{passive:true}); onScroll();

  // Fishing Luck and normalized example pool
  function updateFishingLuck(){
    const L=+$('#fishingLuck').value;
    $('#fishingLuckOut').value=L;
    const mults=[1,2,3,4,5].map(star=>fishingMultiplier(star,L));
    const max=Math.max(...mults);
    $('#luckMultiplierBars').innerHTML=mults.map((v,i)=>`<div class="bar-row"><b>${i+1}★</b><div class="track"><div class="fill" style="width:${v/max*100}%"></div></div><span class="bar-val">${v.toFixed(2)}×</span></div>`).join('');
    const adjusted=exampleWeights.map((w,i)=>w*mults[i]);
    const total=adjusted.reduce((a,b)=>a+b,0);
    const beforeTotal=exampleWeights.reduce((a,b)=>a+b,0);
    $('#poolBars').innerHTML=adjusted.map((w,i)=>{
      const before=exampleWeights[i]/beforeTotal*100, after=w/total*100;
      return `<div class="bar-row"><b>${i+1}★</b><div class="track"><div class="fill" style="width:${after}%"></div></div><span class="bar-val">${before.toFixed(1)}→${after.toFixed(1)}%</span></div>`;
    }).join('');
    $('#fiveStarWeight').textContent=`${mults[4].toFixed(2)}×`;
  }
  $('#fishingLuck')?.addEventListener('input',updateFishingLuck); updateFishingLuck();

  // Standard trait event calculator
  function updateTraitCalc(){
    const axis=$('#traitAxis').value;
    const star=+$('#traitRarity').value;
    const gear=+$('#gearTraitLuck').value;
    const momentum=+$('#traitMomentum').value;
    const other=+$('#otherTraitLuck').value;
    const perfect=$('#traitPerfectCatch').checked;
    $('#gearTraitLuckOut').value=gear;
    $('#traitMomentumOut').value=momentum;
    $('#otherTraitLuckOut').value=other;
    const perfectTL=perfect?10:0;
    const totalTL=gear+momentum+other+perfectTL;
    $('#totalTraitLuck').textContent=`+${totalTL}`;
    $('#traitPerfectTL').textContent=perfect?'+10 included':'not included';
    const base=axis==='pigmentation'?.015:.05;
    const eventMult=axis==='body'&&perfect?1.25:1;
    const afterPerfect=clamp(base*eventMult,0,1);
    const afterRarity=clamp(afterPerfect*rarityComp[star-1],0,1);
    const final=traitLuckAdjust(afterRarity,totalTL);
    $('#pipeBase').textContent=pct(base);
    $('#pipePerfect').textContent=pct(afterPerfect);
    $('#pipeRarity').textContent=pct(afterRarity);
    $('#pipeLuck').textContent=pct(final);
    $('#pipeFinal').textContent=pct(final);
    $('#traitFinal').textContent=pct(final);
    $('#traitRarityText').textContent=`${star}★ ×${rarityComp[star-1].toFixed(2)}`;
    $('#traitPerfectText').textContent=axis==='body'?(perfect?'×1.25 Body event':'×1.00 Body event'):(perfect?'+10 Trait Luck only':'No event multiplier');
    let html='';
    if(axis==='condition') html=`<div class="stat"><small>Scarred</small><strong>${pct(final*.65)}</strong></div><div class="stat"><small>Parasite-Ridden</small><strong>${pct(final*.35)}</strong></div>`;
    if(axis==='pigmentation') html=`<div class="stat"><small>Albino</small><strong>${pct(final*.70)}</strong></div><div class="stat"><small>Iridescent</small><strong>${pct(final*.30)}</strong></div>`;
    if(axis==='body'){
      const p=+$('#bodyPercentile').value,g=giantProbability(p);
      html=`<div class="stat"><small>Giant if event triggers</small><strong>${pct(g)}</strong></div><div class="stat"><small>Dwarf if event triggers</small><strong>${pct(1-g)}</strong></div>`;
    }
    $('#traitSubtypeStats').innerHTML=html;
  }
  ['traitAxis','traitRarity','traitPerfectCatch'].forEach(id=>$('#'+id)?.addEventListener('change',updateTraitCalc));
  ['gearTraitLuck','traitMomentum','otherTraitLuck'].forEach(id=>$('#'+id)?.addEventListener('input',updateTraitCalc));

  // Body Type conditional subtype visualization
  function buildBodyChart(){
    const g=[],d=[];
    for(let i=0;i<=100;i++){
      const x=42+i/100*470, gp=giantProbability(i);
      g.push(`${x.toFixed(1)},${(195-(gp-.2)/.6*165).toFixed(1)}`);
      d.push(`${x.toFixed(1)},${(195-((1-gp)-.2)/.6*165).toFixed(1)}`);
    }
    $('#bodyGiantPlot')?.setAttribute('points',g.join(' '));
    $('#bodyDwarfPlot')?.setAttribute('points',d.join(' '));
  }
  function updateBody(){
    const p=+$('#bodyPercentile').value,g=giantProbability(p),d=1-g;
    $('#bodyPercentileOut').value=p.toFixed(0);
    $('#giantConditional').textContent=pct(g);
    $('#dwarfConditional').textContent=pct(d);
    $('#giantSplit').style.width=`${g*100}%`;
    $('#dwarfSplit').style.width=`${d*100}%`;
    $('#giantSplit').textContent=`Giant ${(g*100).toFixed(0)}%`;
    $('#dwarfSplit').textContent=`Dwarf ${(d*100).toFixed(0)}%`;
    const x=42+p/100*470,y=195-(g-.2)/.6*165;
    $('#bodyPoint')?.setAttribute('cx',x); $('#bodyPoint')?.setAttribute('cy',y);
    updateTraitCalc();
  }
  buildBodyChart(); $('#bodyPercentile')?.addEventListener('input',updateBody); updateBody();

  // Perfect Specimen curve and modifiers
  function buildQualityChart(){
    const pts=[];
    for(let i=0;i<=200;i++){
      const p=90+i*.05,v=perfectBase(p),x=42+(p-90)/10*470,y=195-v/.60*165;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    $('#qualityPlot')?.setAttribute('points',pts.join(' '));
  }
  function updateQuality(){
    const p=+$('#qualityPercentile').value;
    const gear=+$('#qualityGearLuck').value,m=+$('#qualityMomentum').value,o=+$('#qualityOtherLuck').value;
    const perfect=$('#qualityPerfectCatch').checked;
    $('#qualityPercentileOut').value=p.toFixed(2);
    $('#qualityGearLuckOut').value=gear; $('#qualityMomentumOut').value=m; $('#qualityOtherLuckOut').value=o;
    const total=gear+m+o+(perfect?10:0);
    const base=perfectBase(p), lucked=traitLuckAdjust(base,total), final=perfect?1-Math.pow(1-lucked,2):lucked;
    $('#qualityTotalLuck').textContent=`+${total}`;
    $('#qualityBase').textContent=pct(base);
    $('#qualityAfterLuck').textContent=pct(lucked);
    $('#qualityFinal').textContent=pct(final);
    $('#qualityDirect').textContent=perfect?'second chance applied':'none';
    const x=42+(p-90)/10*470,y=195-base/.60*165;
    $('#qualityPoint')?.setAttribute('cx',x); $('#qualityPoint')?.setAttribute('cy',y);
  }
  buildQualityChart();
  ['qualityGearLuck','qualityMomentum','qualityOtherLuck','qualityPercentile'].forEach(id=>$('#'+id)?.addEventListener('input',updateQuality));
  $('#qualityPerfectCatch')?.addEventListener('change',updateQuality); updateQuality();

  // Trait Momentum example
  const momentumState={bass:7,tuna:0,dragon:13};
  function renderMomentum(message='Each species keeps its own value for this player.'){
    for(const k of Object.keys(momentumState)){
      const out=$(`#mom-${k}`),fill=$(`#mom-${k}-fill`); if(out) out.textContent=momentumState[k]; if(fill) fill.style.width=`${momentumState[k]/15*100}%`;
    }
    $('#momentumMessage').textContent=message;
  }
  $('#dragonNormal')?.addEventListener('click',()=>{momentumState.dragon=Math.min(15,momentumState.dragon+1);renderMomentum(`Normal Dragon Fish catch: Dragon Fish Momentum rises to ${momentumState.dragon}. Bass and Tuna are unchanged.`)});
  $('#dragonNotable')?.addEventListener('click',()=>{momentumState.dragon=0;renderMomentum('Notable Dragon Fish catch: Dragon Fish Momentum resets to 0. Bass and Tuna are unchanged.');});
  $('#momentumReset')?.addEventListener('click',()=>{Object.assign(momentumState,{bass:7,tuna:0,dragon:13});renderMomentum();}); renderMomentum();

  // FishScore V2
  function updateScore(){
    const star=+$('#scoreRarity').value,p=+$('#scorePercentile').value;
    const body=+$('#scoreBody').value,cond=+$('#scoreCondition').value,pig=+$('#scorePigment').value,quality=$('#scoreQuality').checked?100:0;
    const sp=speciesPoints[star-1],pp=3*p,tp=body+cond+pig+quality,raw=sp+pp+tp,publicScore=fishScore(raw);
    $('#scorePercentileOut').value=p.toFixed(1);
    $('#scoreSpeciesPart').textContent=`+${sp}`; $('#scorePercentilePart').textContent=`+${Math.round(pp)}`; $('#scoreTraitPart').textContent=`+${tp}`;
    $('#rawScore').textContent=Math.round(raw); $('#publicScore').textContent=publicScore;
    $('#rawMeter').style.width=`${clamp((raw-50)/875,0,1)*100}%`; $('#publicMeter').style.width=`${publicScore/3000*100}%`;
    $('#rawLabel').textContent=`${Math.round(raw)} / 925`; $('#publicLabel').textContent=`${publicScore} / 3000`;
  }
  ['scoreRarity','scoreBody','scoreCondition','scorePigment','scoreQuality'].forEach(id=>$('#'+id)?.addEventListener('change',updateScore));
  $('#scorePercentile')?.addEventListener('input',updateScore); updateScore();

  // Build your setup
  function updateSetup(){
    const baseFL=+$('#setupFishingLuck').value,baseTL=+$('#setupTraitLuck').value;
    const bait=$('#setupBait').value,leader=$('#setupLeader').value,perfect=$('#setupPerfect').checked;
    $('#setupFishingLuckOut').value=baseFL; $('#setupTraitLuckOut').value=baseTL;
    const leviathan=bait==='leviathan';
    $('#buildFishingLuck').textContent=`+${baseFL+(leviathan?15:0)}`;
    $('#buildTraitLuck').textContent=leviathan?`+${baseTL} + Leviathan configured bonus`:`+${baseTL}`;
    $('#buildStrength').textContent=leviathan?'×1.15':'×1.00';
    $('#buildTempo').textContent=leviathan?'×1.15':'×1.00';
    $('#buildPool').textContent=leviathan?'Fish only':'Normal eligible pool';
    $('#buildProtection').textContent=leader==='steel'?'Active':'None';
    $('#buildBody').textContent=perfect?'×1.25 event chance':'×1.00';
  }
  ['setupFishingLuck','setupTraitLuck'].forEach(id=>$('#'+id)?.addEventListener('input',updateSetup));
  ['setupBait','setupLeader','setupRod','setupLine','setupPerfect'].forEach(id=>$('#'+id)?.addEventListener('change',updateSetup)); updateSetup();

  // Probability simulator. This models the V2 formulas and an illustrative eligible rarity pool.
  function weightedIndex(weights,r){let total=weights.reduce((a,b)=>a+b,0),x=r*total;for(let i=0;i<weights.length;i++){x-=weights[i];if(x<=0)return i;}return weights.length-1;}
  function runSimulation(){
    const N=+$('#simCount').value,FL=+$('#simFishingLuck').value,baseTL=+$('#simTraitLuck').value,pcRate=+$('#simPerfectRate').value/100;
    $('#simFishingLuckOut').value=FL; $('#simTraitLuckOut').value=baseTL; $('#simPerfectRateOut').value=`${Math.round(pcRate*100)}%`;
    const weights=exampleWeights.map((w,i)=>w*fishingMultiplier(i+1,FL));
    const rarityCounts=[0,0,0,0,0],hist=[0,0,0,0,0,0];
    let bodies=0,conditions=0,pigments=0,perfects=0,totalScore=0;
    for(let n=0;n<N;n++){
      const ri=weightedIndex(weights,Math.random()),star=ri+1; rarityCounts[ri]++;
      const p=Math.random()*100,pc=Math.random()<pcRate,T=baseTL+(pc?10:0),rc=rarityComp[ri];
      const bodyP=traitLuckAdjust(clamp(.05*(pc?1.25:1)*rc,0,1),T);
      const condP=traitLuckAdjust(clamp(.05*rc,0,1),T);
      const pigP=traitLuckAdjust(clamp(.015*rc,0,1),T);
      let bodyPts=0,condPts=0,pigPts=0,qPts=0;
      if(Math.random()<bodyP){bodies++;bodyPts=40; /* subtype does not change score */}
      if(Math.random()<condP){conditions++;condPts=Math.random()<.65?20:35;}
      if(Math.random()<pigP){pigments++;pigPts=Math.random()<.70?70:100;}
      let q=traitLuckAdjust(perfectBase(p),T); if(pc) q=1-Math.pow(1-q,2);
      if(Math.random()<q){perfects++;qPts=100;}
      const raw=speciesPoints[ri]+3*p+bodyPts+condPts+pigPts+qPts,fs=fishScore(raw); totalScore+=fs;
      hist[Math.min(5,Math.floor((fs-1)/500))]++;
    }
    $('#simBody').textContent=pct(bodies/N); $('#simCondition').textContent=pct(conditions/N); $('#simPigment').textContent=pct(pigments/N); $('#simQuality').textContent=pct(perfects/N); $('#simAverage').textContent=Math.round(totalScore/N);
    const maxH=Math.max(...hist,1); $('#scoreHistogram').innerHTML=hist.map((v,i)=>`<div class="hist-col"><span>${Math.round(v/N*100)}%</span><div class="hist-bar" style="height:${v/maxH*120}px"></div><b>${i*500+1}-${(i+1)*500}</b></div>`).join('');
    const maxR=Math.max(...rarityCounts,1); $('#simRarityBars').innerHTML=rarityCounts.map((v,i)=>`<div class="bar-row"><b>${i+1}★</b><div class="track"><div class="fill" style="width:${v/maxR*100}%"></div></div><span class="bar-val">${(v/N*100).toFixed(1)}%</span></div>`).join('');
  }
  ['simFishingLuck','simTraitLuck','simPerfectRate'].forEach(id=>$('#'+id)?.addEventListener('input',runSimulation));
  $('#simCount')?.addEventListener('change',runSimulation); $('#runSimulation')?.addEventListener('click',runSimulation); runSimulation();

  updateTraitCalc();
})();
