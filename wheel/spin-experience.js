/* Choice Wheel / a visible spin control using the already existing canvas handler. */
(()=>{
'use strict';
const primary=document.getElementById('spinPrimary');
const wheel=document.getElementById('wheel');
if(!primary||!wheel)return;
primary.addEventListener('click',()=>wheel.click());
})();
