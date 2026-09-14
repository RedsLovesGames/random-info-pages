(() => {
  "use strict";
  const esc = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function wrapTrack(track){
    if(!track || track.dataset.bdTrackWrapped==="1") return;
    const inherited = track.closest(".bd-collapse");
    if(inherited && inherited.querySelector(".source-panel")) inherited.before(track);
    if(track.closest(".bd-collapse")) return;
    track.dataset.bdTrackWrapped="1";
    const details=document.createElement("details");
    details.className="panel bd-collapse";
    details.innerHTML=`<summary><span><strong>${esc("AIPAC / pro-Israel influence")}</strong><small>${esc("Track AIPAC data and methodology")}</small></span><b>Expand</b></summary>`;
    track.before(details);
    track.classList.add("bd-collapse-inner");
    track.classList.remove("panel");
    details.append(track);
  }

  function polish(){
    const cycleGrid=document.getElementById("cycleChart")?.closest(".grid.two");
    const sponsor=document.getElementById("sponsorInsightsPanel");
    if(cycleGrid && sponsor && cycleGrid.nextElementSibling!==sponsor) cycleGrid.after(sponsor);
    sponsor?.querySelectorAll(".si-analytics,.si-list-block,.si-company").forEach(node=>{node.open=false;});
    const track=document.getElementById("trackAipacPanel");
    if(track){
      const sponsorBlock=sponsor?.closest("section")||sponsor;
      if(sponsorBlock && track.parentElement!==sponsorBlock.parentElement) sponsorBlock.after(track);
      wrapTrack(track);
    }
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(polish));
  observer.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",polish,{once:true});
  else polish();
  setTimeout(()=>{polish();observer.disconnect();},30000);
})();
