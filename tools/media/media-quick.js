const workspace=document.getElementById('mediaWorkspace');
const picker=document.getElementById('mediaPicker');
const drop=document.getElementById('mediaDrop');

function enterQuickMode(){
  workspace.hidden=false;
  workspace.classList.add('quick-create-mode');
}
function leaveQuickMode(){workspace.classList.remove('quick-create-mode');}

document.querySelectorAll('[data-media-quick]').forEach(button=>button.addEventListener('click',enterQuickMode,{capture:true}));
picker?.addEventListener('change',leaveQuickMode,{capture:true});
drop?.addEventListener('drop',leaveQuickMode,{capture:true});
