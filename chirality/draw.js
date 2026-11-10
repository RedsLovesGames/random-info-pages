/* StereoSketch: lightweight bond-line editor for mouse, touch, and stylus.
   Produces MDL V2000 MOL blocks for RDKit.js stereochemical analysis. */
(()=>{'use strict';
const NS='http://www.w3.org/2000/svg';
const svgEl=(tag,attrs={})=>{const el=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,v);return el;};
const fixed=(v,n=10)=>Number(v).toFixed(4).padStart(n,' ');
class StereoSketch{
 constructor(host){
   this.host=host;this.atoms=[];this.bonds=[];this.undoStack=[];this.redoStack=[];this.mode='bond';this.order=1;this.stereo=0;this.element='C';this.selected=-1;this.drag=null;
   this.root=document.createElement('div');this.root.className='sketch-root';
   this.toolbar=document.createElement('div');this.toolbar.className='sketch-toolbar';this.root.append(this.toolbar);
   this.viewport=document.createElement('div');this.viewport.className='sketch-viewport';
   this.svg=svgEl('svg',{viewBox:'0 0 820 440',role:'img','aria-label':'Interactive molecule structure editor. Click or drag to add atoms and bonds.'});
   this.svg.style.touchAction='none';this.svg.setAttribute('preserveAspectRatio','xMidYMid meet');
   this.viewport.append(this.svg);
   const hint=document.createElement('div');hint.className='sketch-hint';hint.textContent='Click a carbon to select it. Click elsewhere to extend a bond, or drag between atoms. Works with touch and mouse.';
   this.root.append(this.viewport,hint);host.replaceChildren(this.root);
   this.buildToolbar();
   this.svg.addEventListener('pointerdown',e=>this.down(e));
   this.svg.addEventListener('pointermove',e=>this.move(e));
   this.svg.addEventListener('pointerup',e=>this.up(e));
   this.svg.addEventListener('pointercancel',()=>{this.drag=null;this.render();});
   this.root.addEventListener('keydown',e=>{if(e.key==='Escape'){this.selected=-1;this.render();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();this.undo();}});
   this.loadDefault();
 }
 buildToolbar(){
   const groups=[
     [['bond','Single','—',1,0],['bond','Double','=',2,0],['bond','Triple','≡',3,0],['bond','Solid wedge','▲',1,1],['bond','Dashed wedge','▱',1,6]],
     [['element','Carbon','C','C'],['element','Oxygen','O','O'],['element','Nitrogen','N','N'],['element','Chlorine','Cl','Cl'],['element','Bromine','Br','Br'],['element','Fluorine','F','F'],['element','Hydrogen','H','H']],
     [['ring','5-membered ring','⬡₅',5],['ring','6-membered ring','⬡₆',6],['erase','Eraser','⌫']],
     [['action','Undo','↶','undo'],['action','Redo','↷','redo'],['action','Center drawing','⊡','center'],['action','Clear','Clear','clear']]
   ];
   for(const entries of groups){
     const group=document.createElement('div');group.className='sketch-group';
     for(const [kind,title,text,a,b] of entries){
       const btn=document.createElement('button');btn.type='button';btn.className='sketch-tool';btn.title=title;btn.setAttribute('aria-label',title);btn.textContent=text;
       btn.dataset.kind=kind;btn.dataset.val=String(a);
       if(kind==='bond'){btn.dataset.order=String(a);btn.dataset.stereo=String(b);}
       if(kind==='ring')btn.dataset.ring=String(a);
       btn.addEventListener('click',()=>{if(kind==='action'){if(a==='undo')this.undo();else if(a==='redo')this.redo();else if(a==='clear')this.clear();else this.fit();return;}
         this.mode=kind;if(kind==='bond'){this.order=a;this.stereo=b;}else if(kind==='element')this.element=a;else if(kind==='ring')this.ringSize=a;
         this.refreshTools();});
       group.append(btn);
     }
     this.toolbar.append(group);
   }
   this.refreshTools();
 }
 refreshTools(){
   for(const btn of this.toolbar.querySelectorAll('button')){
     const k=btn.dataset.kind,val=btn.dataset.val;
     const active=(k==='bond'&&this.mode==='bond'&&this.order===Number(btn.dataset.order)&&this.stereo===Number(btn.dataset.stereo))||(k==='element'&&this.mode==='element'&&this.element===val)||(k==='ring'&&this.mode==='ring'&&this.ringSize===Number(val))||(k==='erase'&&this.mode==='erase');
     btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));
   }
 }
 snap(x,y){const step=42;return {x,y};}
 point(e){const pt=this.svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const matrix=this.svg.getScreenCTM();return matrix?pt.matrixTransform(matrix.inverse()):{x:0,y:0};}
 nearestAtom(p){let best=-1,dist=21;for(let i=0;i<this.atoms.length;i++){let d=Math.hypot(this.atoms[i].x-p.x,this.atoms[i].y-p.y);if(d<dist){dist=d;best=i;}}return best;}
 nearestBond(p){let hit=-1,dist=12;this.bonds.forEach((b,i)=>{const a=this.atoms[b.a],c=this.atoms[b.b],dx=c.x-a.x,dy=c.y-a.y,len=dx*dx+dy*dy;
   if(len===0)return;const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/len));const d=Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));if(d<dist){dist=d;hit=i;}});
   return hit;
 }
 snapshot(){return JSON.stringify({atoms:this.atoms,bonds:this.bonds});}
 record(){this.undoStack.push(this.snapshot());if(this.undoStack.length>75)this.undoStack.shift();this.redoStack=[];}
 restore(s){const x=JSON.parse(s);this.atoms=x.atoms;this.bonds=x.bonds;this.selected=-1;this.render();}
 undo(){if(!this.undoStack.length)return;this.redoStack.push(this.snapshot());this.restore(this.undoStack.pop());}
 redo(){if(!this.redoStack.length)return;this.undoStack.push(this.snapshot());this.restore(this.redoStack.pop());}
 clear(){this.record();this.atoms=[];this.bonds=[];this.selected=-1;this.render();}
 loadDefault(){
  this.atoms=[{x:230,y:290,el:'C'},{x:310,y:243,el:'C'},{x:390,y:290,el:'C'},{x:470,y:243,el:'C'},{x:310,y:155,el:'Cl'}];
  this.bonds=[{a:0,b:1,order:1,stereo:0},{a:1,b:2,order:1,stereo:0},{a:2,b:3,order:1,stereo:0},{a:1,b:4,order:1,stereo:1}];this.render();
 }
 fit(){
   if(!this.atoms.length){this.svg.setAttribute('viewBox','0 0 820 440');return;}
   const xs=this.atoms.map(a=>a.x),ys=this.atoms.map(a=>a.y);
   const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
   const w=Math.max(300,right-left+200),h=Math.max(180,bottom-top+160);
   this.svg.setAttribute('viewBox',[left-(w-(right-left))/2,top-(h-(bottom-top))/2,w,h].join(' '));
 }
 addAtom(p,el='C'){const i=this.atoms.length;this.atoms.push({x:p.x,y:p.y,el});return i;}
 attach(a,b,order=this.order,stereo=this.stereo){
   if(a===b)return;const existing=this.bonds.find(x=>(x.a===a&&x.b===b)||(x.a===b&&x.b===a));if(existing){existing.order=order;existing.stereo=stereo;return;}
   this.bonds.push({a,b,order,stereo});
 }
 extendFrom(i,p){
   const atom=this.atoms[i],near=this.nearestAtom(p);
   if(near!==-1&&near!==i){this.attach(i,near);this.selected=near;return;}
   const dx=p.x-atom.x,dy=p.y-atom.y;
   let angle=Math.atan2(dy,dx);
   if(Math.hypot(dx,dy)<18){
     const neighbors=this.bonds.filter(b=>b.a===i||b.b===i).map(b=>this.atoms[b.a===i?b.b:b.a]);
     if(!neighbors.length)angle=-Math.PI/6;
     else if(neighbors.length===1)angle=Math.atan2(atom.y-neighbors[0].y,atom.x-neighbors[0].x)+Math.PI/3;
     else angle=-Math.PI/6;
   }
   const len=70;const dest={x:atom.x+len*Math.cos(angle),y:atom.y+len*Math.sin(angle)};
   const existing=this.nearestAtom(dest);const j=existing!==-1&&existing!==i?existing:this.addAtom(dest,'C');this.attach(i,j);this.selected=j;
 }
 makeRing(p,size,anchor=-1){
   const radius=70/(2*Math.sin(Math.PI/size));
   const center=anchor>=0?{x:this.atoms[anchor].x+radius,y:this.atoms[anchor].y+radius/2}:p;
   let start=anchor>=0?Math.atan2(this.atoms[anchor].y-center.y,this.atoms[anchor].x-center.x):-Math.PI/2;
   const ids=[];
   for(let i=0;i<size;i++){
     const pos={x:center.x+radius*Math.cos(start+2*Math.PI*i/size),y:center.y+radius*Math.sin(start+2*Math.PI*i/size)};
     if(i===0&&anchor>=0){ids.push(anchor);continue;}
     const existing=this.nearestAtom(pos);ids.push(existing>=0?existing:this.addAtom(pos));
   }
   for(let i=0;i<size;i++)this.attach(ids[i],ids[(i+1)%size],1,0);
   this.selected=ids[0];
 }
 down(e){
   if(e.button!==0&&e.pointerType==='mouse')return;
   e.preventDefault();this.svg.setPointerCapture(e.pointerId);
   const p=this.point(e);this.drag={start:p,cur:p,atom:this.nearestAtom(p),bond:this.nearestBond(p),pointer:e.pointerId};
 }
 move(e){
   if(!this.drag||this.drag.pointer!==e.pointerId)return;
   e.preventDefault();this.drag.cur=this.point(e);this.render();
 }
 up(e){
   const d=this.drag;if(!d||d.pointer!==e.pointerId)return;this.drag=null;e.preventDefault();
   const p=this.point(e),distance=Math.hypot(p.x-d.start.x,p.y-d.start.y),target=this.nearestAtom(p);
   this.record();
   if(this.mode==='ring'){this.makeRing(d.start,this.ringSize||6,d.atom);}
   else if(this.mode==='erase'){
     if(d.atom>=0){this.atoms.splice(d.atom,1);this.bonds=this.bonds.filter(b=>b.a!==d.atom&&b.b!==d.atom).map(b=>({ ...b,a:b.a>d.atom?b.a-1:b.a,b:b.b>d.atom?b.b-1:b.b}));}
     else if(d.bond>=0)this.bonds.splice(d.bond,1);this.selected=-1;
   }else if(this.mode==='element'){
     if(d.atom>=0){this.atoms[d.atom].el=this.element;this.selected=d.atom;}
     else if(this.selected>=0){const j=this.addAtom(p,this.element);this.attach(this.selected,j,1,0);this.selected=j;}
     else this.selected=this.addAtom(p,this.element);
   }else if(distance>13){
     if(d.atom>=0)this.extendFrom(d.atom,p);
     else{const a=this.addAtom(d.start),b=this.addAtom(p);this.attach(a,b);this.selected=b;}
   }else if(d.bond>=0&&d.atom===-1){
     this.bonds[d.bond].order=this.order;this.bonds[d.bond].stereo=this.stereo;this.selected=-1;
   }else if(d.atom>=0){
     if(this.selected===d.atom){this.extendFrom(d.atom,{x:this.atoms[d.atom].x+70,y:this.atoms[d.atom].y-35});}
     else if(this.selected>=0){this.attach(this.selected,d.atom);this.selected=d.atom;}
     else this.selected=d.atom;
   }else if(this.selected>=0){this.extendFrom(this.selected,p);}
   else this.selected=this.addAtom(p);
   this.render();
 }
 atomLabel(atom){
   if(atom.el==='C')return '';
   return atom.el;
 }
 drawBond(layer,b){
   const a=this.atoms[b.a],c=this.atoms[b.b];if(!a||!c)return;
   const dx=c.x-a.x,dy=c.y-a.y,l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;
   const line=(x1,y1,x2,y2,width=2.8)=>layer.append(svgEl('line',{x1,y1,x2,y2,stroke:'#263044','stroke-width':width,'stroke-linecap':'round'}));
   if(b.stereo===1){
     const poly=[a.x,a.y,c.x+nx*9,c.y+ny*9,c.x-nx*9,c.y-ny*9].join(' ');
     layer.append(svgEl('polygon',{points:poly,fill:'#263044'}));
   }else if(b.stereo===6){
     for(let k=0;k<8;k++){const t=(k+1)/9,w=8*t,x=a.x+dx*t,y=a.y+dy*t;line(x-nx*w,y-ny*w,x+nx*w,y+ny*w,1.8);}
   }else if(b.order===2){
     line(a.x+nx*4,a.y+ny*4,c.x+nx*4,c.y+ny*4,2.2);
     line(a.x-nx*4,a.y-ny*4,c.x-nx*4,c.y-ny*4,2.2);
   }else if(b.order===3){
     line(a.x,a.y,c.x,c.y,2.4);
     line(a.x+nx*6,a.y+ny*6,c.x+nx*6,c.y+ny*6,2);
     line(a.x-nx*6,a.y-ny*6,c.x-nx*6,c.y-ny*6,2);
   }else line(a.x,a.y,c.x,c.y);
 }
 render(){
   this.svg.replaceChildren();
   const layer=svgEl('g');this.svg.append(layer);
   this.bonds.forEach(b=>this.drawBond(layer,b));
   this.atoms.forEach((a,i)=>{
     const label=this.atomLabel(a),group=svgEl('g');
     if(label){
       const width=label.length*13+11;
       group.append(svgEl('rect',{x:a.x-width/2,y:a.y-15,width,height:30,rx:4,fill:'#fff'}));
       const t=svgEl('text',{x:a.x,y:a.y+6,'font-size':21,'font-weight':600,'text-anchor':'middle',fill:a.el==='O'?'#bf3737':a.el==='N'?'#3758c3':'#263044'});t.textContent=label;group.append(t);
     }else if(this.bonds.filter(b=>b.a===i||b.b===i).length===0){
       const t=svgEl('text',{x:a.x,y:a.y+5,'font-size':17,'text-anchor':'middle',fill:'#263044'});t.textContent='C';group.append(t);
     }
     if(i===this.selected)group.append(svgEl('circle',{cx:a.x,cy:a.y,r:19,fill:'none',stroke:'#344ae5','stroke-width':2,'stroke-dasharray':'4 4'}));
     group.append(svgEl('circle',{cx:a.x,cy:a.y,r:15,fill:'transparent','data-atom':i}));
     layer.append(group);
   });
   if(this.drag&&(this.mode==='bond'||this.mode==='element')&&this.drag.atom>=0){
     const p=this.drag.cur,a=this.atoms[this.drag.atom];layer.append(svgEl('line',{x1:a.x,y1:a.y,x2:p.x,y2:p.y,stroke:'#6579e9','stroke-width':2,'stroke-dasharray':'5 6'}));
   }
 }
 exportMol(){
   const atoms=this.atoms,bonds=this.bonds;
   const header=['StereoLab','  StereoLab 2D',''];
   const counts=String(atoms.length).padStart(3,' ')+String(bonds.length).padStart(3,' ')+ '  0  0  0  0            999 V2000';
   const atomLines=atoms.map(a=>fixed(a.x/45)+fixed(-a.y/45)+fixed(0)+(' '+a.el.padEnd(3,' '))+' 0  0  0  0  0  0  0  0  0  0  0  0');
   const bondLines=bonds.map(b=>String(b.a+1).padStart(3,' ')+String(b.b+1).padStart(3,' ')+String(b.order).padStart(3,' ')+String(b.stereo||0).padStart(3,' ')+'  0  0  0');
   return [...header,counts,...atomLines,...bondLines,'M  END',''].join('\n');
 }
 importMol(text){
   const lines=text.split(/\r?\n/),countLine=lines.findIndex(l=>/V2000\s*$/.test(l));
   if(countLine<0)throw Error('Only standard V2000 MOL files can be loaded.');
   const n=Number(lines[countLine].slice(0,3)),m=Number(lines[countLine].slice(3,6));
   if(!Number.isInteger(n)||!Number.isInteger(m)||n>500||m>1000||n<0||m<0)throw Error('MOL file atom/bond counts are invalid.');
   const atoms=[],bonds=[];
   for(let i=0;i<n;i++){
     const l=lines[countLine+1+i]||'';
     const x=Number(l.slice(0,10)),y=Number(l.slice(10,20)),el=l.slice(31,34).trim()||'C';
     if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Invalid MOL coordinates.');
     atoms.push({x:x*48,y:-y*48,el});
   }
   for(let i=0;i<m;i++){
     const l=lines[countLine+1+n+i]||'';
     const a=Number(l.slice(0,3))-1,b=Number(l.slice(3,6))-1,order=Number(l.slice(6,9)),stereo=Number(l.slice(9,12))||0;
     if(a<0||a>=n||b<0||b>=n||![1,2,3].includes(order))throw Error('Unsupported MOL bond.');
     bonds.push({a,b,order,stereo});
   }
   this.record();this.atoms=atoms;this.bonds=bonds;this.selected=-1;this.fit();this.render();
 }
}
window.StereoSketch=StereoSketch;
})();