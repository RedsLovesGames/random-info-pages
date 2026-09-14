(() => {
  "use strict";
  let lastId="";
  const getHashId=()=>{const m=location.hash.match(/^#member=([^&]+)/);return m?decodeURIComponent(m[1]):"";};
  const memberUrl=id=>`./member/?id=${encodeURIComponent(id)}`;
  function addLink(){const dialog=document.getElementById("memberProfileDialog");if(!dialog)return;const id=lastId||getHashId();if(!id)return;let link=dialog.querySelector(".mp-full-page-link");if(!link){link=document.createElement("a");link.className="mp-full-page-link";link.textContent="Open full profile →";link.setAttribute("aria-label","Open detailed member profile page");const head=dialog.querySelector(".mp-head"),close=head?.querySelector(".mp-close");if(head)head.insertBefore(link,close||null);}link.href=memberUrl(id);}
  document.addEventListener("click",e=>{const seat=e.target.closest?.(".seat[data-id]");if(seat){lastId=seat.dataset.id;setTimeout(addLink,0);}},true);
  document.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches?.(".seat[data-id]")){lastId=e.target.dataset.id;setTimeout(addLink,0);}},true);
  new MutationObserver(addLink).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener("hashchange",()=>{lastId=getHashId();addLink();});
  lastId=getHashId();addLink();
})();
