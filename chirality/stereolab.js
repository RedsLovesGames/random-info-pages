'use strict';
/* StereoLab — a static, educational stereochemistry toolkit.
   Molecule drawing: Kekule.js. Atom CIP and renderings: RDKit.js.
   No silent guesses for undefined stereochemistry. */
(() => {
  const $ = id => document.getElementById(id);
  const state = { rd: null, editor: null, ketcher: null, last: null };
  const fmt = value => Number(value).toFixed(2).replace(/\.00$/, '');
  const safe = value => String(value ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const show = (id, message, warning=false, error=false) => {
    const el=$(id); el.textContent=message; el.className='result'+(error?' error':warning?' warn':'');
  };
  function getMol(text) {
    if(!state.rd) throw new Error('RDKit has not finished loading.');
    const mol=state.rd.get_mol(text);
    if(!mol || !mol.is_valid()) { if(mol)mol.delete(); throw new Error('Invalid structure. Check atom connectivity, valence, and stereochemical notation.'); }
    return mol;
  }
  function withMol(text, fn) { const mol=getMol(text); try{return fn(mol);}finally{mol.delete();} }
  function tags(mol) {
    let raw={};
    try { raw=JSON.parse(mol.get_stereo_tags()||'{}'); } catch { raw={}; }
    const parse=(data, n)=>Array.isArray(data)?data.filter(a=>Array.isArray(a)&&a.length>=n).map(a=>a.map((v,i)=>i===0?Number(v):String(v).replace(/[()]/g,''))):[];
    return { atoms:parse(raw.CIP_atoms,2), bonds:parse(raw.CIP_bonds,3) };
  }
  function isAssigned(tag) { return tag==='R'||tag==='S'||tag==='r'||tag==='s'; }
  function isUndefined(t) { return t.atoms.some(x=>!isAssigned(x[1])) || t.bonds.some(x=>!['E','Z'].includes(x[2])); }
  function toStereo(smiles) { return smiles.replace(/@@|@/g, x=>x==='@'?'@@':'@'); }
  function withoutStereo(smiles) { return smiles.replace(/@@|@/g,'').replace(/[\\/]/g,''); }
  function withoutAtomStereo(smiles) { return smiles.replace(/@@|@/g,''); }
  function canon(input) { return withMol(input,m=>m.get_smiles()); }
  function mirror(smiles) { return canon(toStereo(smiles)); }
  function chirality(smiles, t) {
    if(isUndefined(t)) return {overall:'Indeterminate',meso:'Undetermined',note:'At least one potentially stereogenic element has no defined configuration. Add wedge/dash or double-bond stereo before classifying a single stereoisomer.'};
    if(!t.atoms.length) return {overall:'Achiral*',meso:'No',note:'No tetrahedral atom stereocenters were detected. This does not screen for all unusual forms of molecular chirality.'};
    if(smiles===mirror(smiles)) return {overall:'Achiral',meso:t.atoms.length>=2?'Yes':'Possible',note:'The stereochemically specified structure matches its inverted tetrahedral mirror image. It is achiral despite stereogenic atoms; verify unusual cases independently.'};
    return {overall:'Chiral',meso:'No',note:'The fully specified tetrahedral stereochemistry differs from the molecular mirror image.'};
  }
  function depicted(mol, t) {
    return mol.get_svg_with_highlights(JSON.stringify({
      atoms:t.atoms.map(x=>x[0]),highlightColour:[0.49,0.62,1],
      addStereoAnnotation:true,explicitMethyl:true,legend:'StereoLab analysis',
      legendFontSize:14,atomHighlightsAreCircles:true
    }));
  }
  async function refreshEditor(molfile){
    if(state.ketcher){await state.ketcher.setMolecule(molfile);return;}
    if(state.editor){state.editor.importMol(molfile);return;}
    throw new Error('Ketcher editor is still loading. Wait for the editor status before importing.');
  }
  async function importSmiles(smiles){
    const source=smiles.trim();
    if(!source)throw new Error('Enter a SMILES string.');
    const molfile=withMol(source,mol=>{
      if(!mol.has_coords())mol.set_new_coords();
      return mol.get_v2Kmolblock();
    });
    await refreshEditor(molfile);
  }
  function fromEditor(){
    if(!state.editor||!state.editor.atoms.length)throw new Error('Draw a molecule first.');
    return state.editor.exportMol();
  }
  async function freshSource(){
    if(state.ketcher){
      const source=await state.ketcher.getMolfile();
      if(typeof source==='string' && source.includes('M  END') && !/^\\s*0\\s+0/.test(source.split(/\\r?\\n/)[3]||''))return source;
      throw new Error('Draw a molecular structure in Ketcher first.');
    }
    if(state.editor)return fromEditor();
    throw new Error('The Ketcher editor is still loading. If it fails to initialize, choose basic drawing mode.');
  }
  async function analyze() {
    try {
      const source=await freshSource();
      const output=withMol(source,mol=>{
        const t=tags(mol),smiles=mol.get_smiles();
        return {t,smiles,svg:depicted(mol,t),c:chirality(smiles,t)};
      });
      state.last=output;
      $('analysisResults').hidden=false; $('analysisPrompt').hidden=true;
      $('drawingPreview').innerHTML=output.svg;
      $('centerCount').textContent=output.t.atoms.length;
      $('centerLabels').textContent=output.t.atoms.length ? output.t.atoms.map(x=>x[1]).join(', ') : 'None';
      $('overallChiral').textContent=output.c.overall;
      $('mesoStatus').textContent=output.c.meso;
      $('analysisSmiles').textContent=output.smiles;
      $('compoundName').textContent='Name not yet looked up. PubChem provides names when an exact structure match is available.';
      $('cipChips').replaceChildren();
      output.t.atoms.forEach(([index,label])=>{
        const chip=document.createElement('span');chip.className='chip';chip.textContent='Atom '+(index+1)+': '+label;$('cipChips').append(chip);
      });
      output.t.bonds.forEach(([a,b,label])=>{
        const chip=document.createElement('span');chip.className='chip';chip.textContent='Bond '+(a+1)+'–'+(b+1)+': '+label;$('cipChips').append(chip);
      });
      show('analysisExplanation',output.c.note,output.c.overall.includes('Indeterminate'));
    }catch(e){show('analysisExplanation',e.message,false,true);$('analysisResults').hidden=false;}
  }
  async function fetchName(smiles) {
    const url='https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/'+encodeURIComponent(smiles)+'/property/IUPACName/JSON';
    const response=await fetch(url,{signal:AbortSignal.timeout(11000)});
    if(!response.ok)throw new Error('No PubChem name match (HTTP '+response.status+').');
    const json=await response.json();
    return json.PropertyTable?.Properties?.[0]?.IUPACName||null;
  }
  async function lookupName() {
    if(!state.last){analyze();if(!state.last)return;}
    const btn=$('nameBtn');btn.disabled=true;$('compoundName').textContent='Looking up the exact stereochemical structure…';
    try { $('compoundName').textContent=(await fetchName(state.last.smiles))||'No systematic name returned.'; }
    catch(e){ $('compoundName').textContent=e.message+' You can still use the canonical SMILES above.'; }
    finally{btn.disabled=false;}
  }
  async function downloadMol() {
    try {
      const source=await freshSource(), data=withMol(source,m=>m.get_v2Kmolblock());
      const url=URL.createObjectURL(new Blob([data],{type:'chemical/x-mdl-molfile'}));
      const a=document.createElement('a');a.href=url;a.download='stereolab.mol';a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
    } catch(e){show('analysisExplanation',e.message,false,true);}
  }
  function availableWedgeEdges(lines,center,atomCount,bondCount,centers,used) {
    const all=[];
    for(let i=0;i<bondCount;i++){
      const line=lines[4+atomCount+i];
      const a=Number(line.slice(0,3))-1,b=Number(line.slice(3,6))-1,order=Number(line.slice(6,9));
      if(order!==1||(a!==center&&b!==center)||used.has(i))continue;
      const other=a===center?b:a;
      const degree=Array.from({length:bondCount},(_,j)=>{
        const l=lines[4+atomCount+j];return [Number(l.slice(0,3))-1,Number(l.slice(3,6))-1];
      }).filter(pair=>pair.includes(other)).length;
      all.push({bond:i,other,rank:(centers.includes(other)?10:0)+degree});
    }
    all.sort((a,b)=>a.rank-b.rank);
    return all[0]||null;
  }
  function putWedge(block,assignments) {
    const lines=block.split(/\r?\n/),atomCount=Number(lines[3].slice(0,3));
    for(const {bond,center,other,stereo} of assignments){
      const index=4+atomCount+bond,line=lines[index];
      lines[index]=String(center+1).padStart(3,' ')+String(other+1).padStart(3,' ')+String(1).padStart(3,' ')+String(stereo).padStart(3,' ')+line.slice(12);
    }
    return lines.join('\n');
  }
  async function enumerate() {
    const grid=$('isomerCards');grid.replaceChildren();
    try{
      const src=await freshSource(),base=withMol(src,m=>m.get_smiles());
      const skeleton=withoutAtomStereo(base);
      const baseMol=getMol(skeleton);
      let block,t;
      try {
        t=tags(baseMol);
        if(!baseMol.has_coords())baseMol.set_new_coords();
        block=baseMol.get_v2Kmolblock();
      }finally{baseMol.delete();}
      if(t.bonds.some(x=>!['E','Z'].includes(x[2]))){
        throw new Error('This structure contains unspecified double-bond stereochemistry. Complete E/Z enumeration is not implemented; no exhaustive count is claimed.');
      }
      const centers=t.atoms.map(x=>x[0]);
      if(centers.length>6)throw new Error('This browser enumeration is limited to six tetrahedral stereocenters (64 combinations) to prevent freezing.');
      if(!centers.length){
        show('enumStatus','No tetrahedral stereocenters detected. One configuration for the supported tetrahedral scope.');
        renderIsomer(grid,base,1,chirality(base,t),t);
        return;
      }
      const lines=block.split(/\r?\n/),atoms=Number(lines[3].slice(0,3)),bonds=Number(lines[3].slice(3,6)),used=new Set(),edges=[];
      if(!Number.isInteger(atoms)||!Number.isInteger(bonds))throw new Error('Unsupported MOL format. Please use a standard small molecule.');
      for(const center of centers){
        const edge=availableWedgeEdges(lines,center,atoms,bonds,centers,used);
        if(!edge)throw new Error('Could not safely construct stereo wedges for atom '+(center+1)+'.');
        edges.push({center,...edge});used.add(edge.bond);
      }
      const unique=new Map();
      for(let mask=0;mask<(1<<centers.length);mask++){
        const trial=putWedge(block,edges.map((x,i)=>({...x,stereo:mask&(1<<i)?1:6})));
        const result=withMol(trial,m=>({smiles:m.get_smiles(),t:tags(m)}));
        if(result.t.atoms.filter(x=>isAssigned(x[1])).length!==centers.length){
          throw new Error('Unable to assign all R/S centers reliably for this structure. No count is reported.');
        }
        unique.set(result.smiles,result.t);
      }
      const list=[...unique.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
      show('enumStatus',list.length+' distinct tetrahedral stereoisomer'+(list.length===1?'':'s')+' found from '+(1<<centers.length)+' raw configurations, after symmetry deduplication. E/Z variations and conformers are not enumerated.');
      for(const [i,[smiles,labels]] of list.entries())renderIsomer(grid,smiles,i+1,chirality(smiles,labels),labels);
    }catch(e){show('enumStatus',e.message,false,true);}
  }
  function renderIsomer(parent,smiles,num,c,t) {
    const card=document.createElement('article');card.className='isomer';
    const title=document.createElement('h3');title.textContent='Isomer '+num;
    const drawing=document.createElement('div');drawing.className='canvas';
    try{drawing.innerHTML=withMol(smiles,m=>depicted(m,t));}catch{drawing.textContent='Depiction unavailable';}
    const desc=document.createElement('p');desc.className='tiny';desc.textContent=t.atoms.map(([i,label])=>'Atom '+(i+1)+': '+label).join(' · ')||'No assigned tetrahedral centers';
    const type=document.createElement('p');type.className='tiny';type.textContent=c.overall+' · Meso: '+c.meso;
    const smi=document.createElement('p');smi.className='mono';smi.textContent=smiles;
    const name=document.createElement('p');name.className='tiny muted';name.textContent='Name not requested';
    const btn=document.createElement('button');btn.className='btn ghost';btn.type='button';btn.textContent='Look up name';
    btn.onclick=async()=>{btn.disabled=true;name.textContent='Looking up…';try{name.textContent=(await fetchName(smiles))||'No name available';}catch(e){name.textContent=e.message;}finally{btn.disabled=false;}};
    card.append(title,drawing,desc,type,smi,name,btn);parent.append(card);
  }
  function formula(m) {
    try{
      const inchi=m.get_inchi();
      if(/^InChI=1S?\//.test(inchi))return inchi.split('/')[1];
    }catch{}
    return null;
  }
  function compare(){
    try{
      const a=$('compareA').value.trim(),b=$('compareB').value.trim();
      if(!a||!b)throw new Error('Enter both structures.');
      const A=withMol(a,m=>({iso:m.get_smiles(),tags:tags(m),formula:formula(m),svg:depicted(m,tags(m))}));
      const B=withMol(b,m=>({iso:m.get_smiles(),tags:tags(m),formula:formula(m),svg:depicted(m,tags(m))}));
      $('compSvgA').innerHTML=A.svg;$('compSvgB').innerHTML=B.svg;
      let conclusion;
      if(A.iso===B.iso){
        conclusion='Identical: the connectivity and all explicitly specified stereochemistry are the same.';
        if(isUndefined(A.tags))conclusion+=' Some centers are unspecified, so distinct stereoisomers may still be represented.';
      }else if(canon(withoutStereo(A.iso))!==canon(withoutStereo(B.iso))){
        conclusion=A.formula&&B.formula&&A.formula===B.formula
          ?'Constitutional isomers: the same molecular formula but different connectivity.'
          :A.formula&&B.formula&&A.formula!==B.formula
            ?'Not isomers: the molecular formulas differ ('+A.formula+' vs '+B.formula+').'
            :'Different connectivity. Formula could not be verified, so constitutional-isomer status is not asserted.';
      }else if(isUndefined(A.tags)||isUndefined(B.tags)){
        conclusion='Same connectivity, but at least one stereochemical element is unspecified. Add wedges or E/Z information to classify the relationship.';
      }else if(mirror(A.iso)===B.iso){
        conclusion='Enantiomers: they have the same connectivity and opposite tetrahedral handedness at all stereocenters.';
      }else{
        conclusion='Diastereomers: the same connectivity but different stereochemistry, without being mirror-image partners.';
      }
      show('comparison',conclusion);
    }catch(e){show('comparison',e.message,false,true);}
  }
  function fischer() {
    const priorities={
      top:Number($('fTop').value),right:Number($('fRight').value),
      bottom:Number($('fBottom').value),left:Number($('fLeft').value)
    };
    if(new Set(Object.values(priorities)).size!==4){show('fischerResult','Use each CIP priority (1, 2, 3, 4) exactly once.',false,true);return;}
    const xy={top:[0,1],right:[1,0],bottom:[0,-1],left:[-1,0]};
    const keys=Object.keys(priorities);
    const points=[1,2,3].map(n=>xy[keys.find(k=>priorities[k]===n)]);
    const [[x1,y1],[x2,y2],[x3,y3]]=points;
    const area=(x2-x1)*(y3-y1)-(y2-y1)*(x3-x1);
    const clockwise=area<0;
    const four=keys.find(k=>priorities[k]===4);
    const towards=four==='left'||four==='right';
    const output=clockwise!==towards?'R':'S';
    show('fischerResult',output+' configuration. Priorities 1 → 2 → 3 appear '+(clockwise?'clockwise':'counterclockwise')+'. Priority 4 points '+(towards?'toward':'away from')+' you, so '+(towards?'invert':'keep')+' the observed result.');
  }
  function ee(){
    const pure=Number($('pureRotation').value),mix=Number($('mixRotation').value);
    if(!Number.isFinite(pure)||!Number.isFinite(mix)||!pure){show('eeResult','Enter finite rotations and a nonzero pure-enantiomer rotation.',false,true);return;}
    const signed=100*mix/pure;
    if(Math.abs(signed)>100+1e-9){show('eeResult','Impossible under the stated assumptions: observed specific rotation exceeds that of the pure reference in magnitude. Check units, conditions, and measurements.',false,true);return;}
    const ref=(100+signed)/2,opp=100-ref;
    show('eeResult','Enantiomeric excess: '+fmt(Math.abs(signed))+'%. Reference enantiomer: '+fmt(ref)+'%. Opposite enantiomer: '+fmt(opp)+'%. Pure opposite enantiomer [α] = '+fmt(-pure)+'°. '+(signed<0?'The opposite enantiomer is in excess.':'The reference enantiomer is in excess.'));
  }
  function forward(){
    const pure=Number($('pureRotation').value),p=Number($('referencePercent').value);
    if(!Number.isFinite(pure)||!Number.isFinite(p)||p<0||p>100){show('forwardResult','Enter valid inputs. The reference percentage must be between 0 and 100.',false,true);return;}
    show('forwardResult',fmt(p)+'% reference + '+fmt(100-p)+'% opposite gives [α] = '+fmt(pure*(2*p/100-1))+'°, and ee = '+fmt(Math.abs(2*p-100))+'% toward the '+(p>=50?'reference':'opposite')+' enantiomer.');
  }
  function switchTab(name){
    document.querySelectorAll('.tab').forEach(el=>el.setAttribute('aria-selected',String(el.dataset.target===name)));
    document.querySelectorAll('.panel').forEach(el=>el.classList.toggle('active',el.id==='p-'+name));
    if(name==='analyze'&&state.editor&&state.editor.resized)try{state.editor.resized();}catch{}
  }
  async function init(){
    document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.target)));
    for(const id of ['fTop','fRight','fBottom','fLeft']){
      $(id).innerHTML=[1,2,3,4].map(v=>'<option value="'+v+'">'+v+'</option>').join('');
    }
    $('fTop').value='2';$('fRight').value='1';$('fBottom').value='3';$('fLeft').value='4';
    $('analyzeBtn').onclick=analyze;$('enumerateBtn').onclick=enumerate;$('compareBtn').onclick=compare;
    $('nameBtn').onclick=lookupName;$('saveMol').onclick=downloadMol;$('fischerBtn').onclick=fischer;
    $('eeBtn').onclick=ee;$('forwardBtn').onclick=forward;
    $('loadSmile').onclick=async()=>{try{await importSmiles($('smiInput').value);$('status').textContent='SMILES loaded. Use the full drawing tools or analyze.';}catch(e){$('status').textContent=e.message;}};
    $('clearMol').onclick=async()=>{try{
      if(state.ketcher)await state.ketcher.setMolecule('');
      else if(state.editor)state.editor.clear();
      $('smiInput').value='';state.last=null;$('analysisResults').hidden=true;$('status').textContent='Drawing cleared.';
    }catch(e){$('status').textContent=e.message;}};
    $('exampleMeso').onclick=async()=>{try{
      $('smiInput').value='C[C@H](O)[C@H](O)C';await importSmiles($('smiInput').value);await analyze();
    }catch(e){$('status').textContent=e.message;}};
    for(const key of ['A','B'])$('loadFromEditor'+key).onclick=async()=>{try{
      $(key==='A'?'compareA':'compareB').value=withMol(await freshSource(),m=>m.get_smiles());
      switchTab('compare');
    }catch(e){show('comparison',e.message,false,true);}};
    ee();forward();
    const frame=$('ifKetcher');
    const fallback=$('fallbackEditor');
    let fallbackMode=false;
    const connect=()=>{
      if(fallbackMode||!frame?.contentWindow)return false;
      let instance=null;
      try{instance=frame.contentWindow.ketcher;}catch{return false;}
      if(!instance||typeof instance.getMolfile!=='function')return false;
      state.ketcher=instance;
      state.editor=null;
      $('status').textContent=state.rd?'Ketcher drawing editor and R/S analyzer ready.':'Ketcher drawing editor ready. Loading R/S analyzer…';
      fallback.hidden=true;
      return true;
    };
    window.addEventListener('message',event=>{
      if(event.source!==frame?.contentWindow||event.origin!==location.origin)return;
      if(event.data?.source!=='stereolab-ketcher')return;
      if(event.data?.eventType==='init')connect();
      if(event.data?.eventType==='error'){
        $('status').textContent='Full drawing editor error: '+String(event.data.message||'unknown error');
        fallback.hidden=false;
      }
    });
    frame?.addEventListener('load',()=>{setTimeout(connect,400);});
    setTimeout(()=>{if(!state.ketcher&&!fallbackMode){fallback.hidden=false;$('status').textContent='Full editor has not initialized. You can keep waiting or use basic drawing mode.';}},20000);
    fallback.onclick=()=>{
      fallbackMode=true;
      state.ketcher=null;
      try{state.editor=new window.StereoSketch($('composer'));
        fallback.hidden=true;
        $('status').textContent='Basic editor active. Ketcher can be restored by refreshing the page.';
      }catch(e){$('status').textContent='Unable to start basic drawing mode: '+e.message;}
    };
    $('status').textContent='Loading full Ketcher molecular editor and RDKit chemistry engine…';
    const waitFor=(check,flag,name,limit=30000)=>new Promise((resolve,reject)=>{
      const deadline=Date.now()+limit;
      const tick=()=>{
        if(check())return resolve();
        if(window[flag])return reject(new Error(name+' download failed (CDN error).'));
        if(Date.now()>deadline)return reject(new Error(name+' did not finish downloading within 30 seconds.'));
        setTimeout(tick,250);
      };tick();
    });
    try {
      await waitFor(()=>typeof window.initRDKitModule==='function','rdkitLoadError','RDKit.js');
      state.rd=await Promise.race([
        window.initRDKitModule(),
        new Promise((_,reject)=>setTimeout(()=>reject(new Error('RDKit WebAssembly initialization timed out.')),30000))
      ]);
      $('status').textContent=state.ketcher?'Ketcher and RDKit ready ('+state.rd.version()+').':'RDKit ready. Waiting for full Ketcher editor…';
    }catch(e){
      $('status').textContent='R/S analysis engine unavailable: '+e.message+'. Ketcher drawing and file export remain available.';
      return;
    }

  }
  window.addEventListener('DOMContentLoaded',init);
})();