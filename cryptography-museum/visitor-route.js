/* Cryptography Museum / visitor path reads the original local passport. */
(()=>{
'use strict';
const exhibits=[
 ['caesar','Caesar cipher'],['substitution','Substitution cipher'],['vigenere','Vigenère cipher'],
 ['enigma','Enigma machine'],['hashing','Hashing laboratory'],['modern','Modern cryptography'],
 ['public-key','Public-key cryptography']
];
const next=document.getElementById('museumTourNext');
const count=document.getElementById('museumTourProgress');
if(!next||!count)return;
function update(){
 let seen=[];
 try{
  const stored=JSON.parse(localStorage.getItem('cryptography-museum-passport-v1')||'{}');
  if(Array.isArray(stored.visited))seen=stored.visited.filter(x=>exhibits.some(v=>v[0]===x));
 }catch{}
 const unique=new Set(seen);
 count.textContent=unique.size+' of 7 visited';
 const upcoming=exhibits.find(([id])=>!unique.has(id));
 if(upcoming){next.href='#'+upcoming[0];next.textContent='Continue: '+upcoming[1]+' ↗'}
 else{next.href='#caesar';next.textContent='Revisit the first exhibit ↗'}
}
document.getElementById('navigation')?.addEventListener('click',()=>requestAnimationFrame(update));
document.getElementById('reset-progress')?.addEventListener('click',()=>requestAnimationFrame(update));
window.addEventListener('hashchange',()=>requestAnimationFrame(update));
update();
})();
