(() => {
  "use strict";
  const SNAPSHOT_URL="https://cdn.jsdelivr.net/gh/unitedstates/congress-legislators@73e2fcd181e1c48d1b0580d417e8d0314b22f7c9/legislators-current.json";
  const TRACK_JSON="./track-aipac.json";
  const TRACK_URL="https://www.trackaipac.com/congress";
  const METHOD_URL="https://www.trackaipac.com/blog/updated-methodology";
  const FEC_FOREIGN="https://www.fec.gov/help-candidates-and-committees/foreign-nationals/";

  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money=v=>Number.isFinite(Number(v))?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(v)):"Not shown";
  const norm=s=>String(s||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\b(jr|sr|ii|iii|iv)\.?\b/g,"").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
  const queryId=()=>new URLSearchParams(location.search).get("id")||location.hash.replace(/^#member=/,"");
  const ratingLabel=code=>({approved:"Track AIPAC Approved",poor:"Poor legislative record",improving:"Improving legislative record",evaluating:"Under evaluation",warning:"Track AIPAC warning",not_explicit:"No explicit record note"}[code]||"No explicit record note");

  function waitFor(selector,timeout=12000){return new Promise((resolve,reject)=>{const start=Date.now();const tick=()=>{const el=document.querySelector(selector);if(el)return resolve(el);if(Date.now()-start>timeout)return reject(new Error(`Timed out waiting for ${selector}`));setTimeout(tick,120)};tick();});}

  async function loadIdentity(){const id=queryId();if(!id)throw new Error("No member id in profile URL");const r=await fetch(SNAPSHOT_URL,{cache:"force-cache"});if(!r.ok)throw new Error("Congress roster unavailable");const rows=await r.json();const x=rows.find(v=>v.id?.bioguide===id);if(!x)throw new Error("Member not found in congressional roster");const terms=Array.isArray(x.terms)?x.terms:[],t=terms.at(-1)||{},name=x.name?.official_full||[x.name?.first,x.name?.middle,x.name?.last,x.name?.suffix].filter(Boolean).join(" ");return{id,name,state:t.state||"",chamber:t.type==="sen"?"Senate":"House",district:t.type==="sen"?null:(t.district??null)};}

  function matchEntry(entries,m){const nameKey=norm(m.name);if(m.chamber==="House"){
    const seat=`${m.state}-${String(m.district??0).padStart(2,"0")}`;
    const exact=entries.find(e=>e.seat===seat);
    if(exact)return exact;
  }
  const senators=entries.filter(e=>e.seat===`${m.state}-SEN`);
  let hit=senators.find(e=>e.name_key===nameKey)||entries.find(e=>e.name_key===nameKey);
  if(hit)return hit;
  const last=nameKey.split(" ").at(-1)||"",first=nameKey.split(" ")[0]||"";
  hit=senators.find(e=>e.name_key?.includes(last)&&e.name_key?.includes(first));
  return hit||null;}

  function insertShell(){let section=document.getElementById("trackAipacPanel");if(section)return section;section=document.createElement("section");section.className="panel ta-section";section.id="trackAipacPanel";section.innerHTML=`<div class="ta-loading">Loading Track AIPAC data...</div>`;const source=document.querySelector(".source-panel");if(source)source.before(section);else document.querySelector("main")?.append(section);return section;}

  function render(section,entry,snapshot){const total=Number(entry.israel_lobby_total),pac=Number(entry.pac_or_donation_total),ie=Number(entry.independent_expenditures);const safeTotal=Number.isFinite(total)?total:0,safePac=Number.isFinite(pac)?pac:0,safeIe=Number.isFinite(ie)?ie:0,pacPct=safeTotal>0?Math.max(0,Math.min(100,safePac/safeTotal*100)):0,iePct=safeTotal>0?Math.max(0,Math.min(100,safeIe/safeTotal*100)):0;const groups=(entry.groups||[]).map(g=>`<span class="ta-group${/\bAIPAC\b/i.test(g)?" aipac":""}">${esc(g)}</span>`).join("");const generated=snapshot.generated_at?new Date(snapshot.generated_at).toLocaleString():"Unknown";section.innerHTML=`
    <div class="section-head ta-head"><div><div class="ta-kicker">Track AIPAC</div><h2>AIPAC / pro-Israel campaign influence</h2><p class="ta-sub">Track AIPAC's own U.S. campaign-finance totals and qualitative policy-record label for this member.</p></div><a class="ta-source" href="${TRACK_URL}" target="_blank" rel="noreferrer">Open Track AIPAC ↗</a></div>
    <div class="ta-body">
      <div class="ta-stats">
        <div class="ta-stat"><span>Israel Lobby Total</span><strong>${money(entry.israel_lobby_total)}</strong><small>Track AIPAC category</small></div>
        <div class="ta-stat"><span>${esc(entry.support_label||"PACs / donations")}</span><strong>${money(entry.pac_or_donation_total)}</strong><small>Track AIPAC</small></div>
        <div class="ta-stat"><span>Independent expenditures</span><strong>${money(entry.independent_expenditures)}</strong><small>Not money given to candidate</small></div>
        <div class="ta-stat"><span>Track AIPAC record status</span><strong class="ta-rating ${esc(entry.rating_code)}">${esc(ratingLabel(entry.rating_code))}</strong><small>Qualitative, not a numeric vote score</small></div>
        <div class="ta-stat"><span>AIPAC named among groups</span><strong>${entry.aipac_named?"Yes":"No"}</strong><small>Based on Track AIPAC card</small></div>
      </div>
      <div class="ta-grid">
        <div class="ta-card">
          <h3>Tracked money breakdown</h3>
          <div class="ta-copy">Track AIPAC separates direct PAC/donation support from independent expenditures. Independent expenditures are outside spending supporting or opposing a candidate and are not funds received by the campaign.</div>
          <div class="ta-bar" aria-label="Track AIPAC money breakdown"><div class="ta-bar-pac" style="width:${pacPct}%"></div><div class="ta-bar-ie" style="width:${iePct}%"></div></div>
          <div class="ta-legend"><span><i class="ta-dot pac"></i>${esc(entry.support_label||"PACs / donations")}: ${money(entry.pac_or_donation_total)}</span><span><i class="ta-dot ie"></i>Independent expenditures: ${money(entry.independent_expenditures)}</span></div>
          ${groups?`<div class="ta-groups">${groups}</div>`:`<div class="ta-note">Track AIPAC does not list lobbying/PAC group abbreviations on this member card.</div>`}
        </div>
        <div class="ta-card">
          <h3>Record according to Track AIPAC</h3>
          <div class="ta-copy">${esc(entry.rating_text||ratingLabel(entry.rating_code))}</div>
          <div class="ta-note"><strong>How Track AIPAC says it rates members:</strong> its current methodology combines campaign-finance data with voting record, policy positions, public statements, and other reporting. It says current Democratic voting records use the Congressional Democrat Palestine Tracker and that it has not identified a comparable Republican tracker. <a href="${METHOD_URL}" target="_blank" rel="noreferrer">Read methodology ↗</a></div>
        </div>
      </div>
      <div class="ta-note"><strong>Important wording:</strong> Track AIPAC calls the figure above an “Israel Lobby Total.” This page treats it as U.S. pro-Israel / Israel-lobby campaign activity, not as foreign money from the Israeli government or foreign nationals. Federal law prohibits foreign-national contributions, donations, and election expenditures. <a href="${FEC_FOREIGN}" target="_blank" rel="noreferrer">FEC foreign-national rules ↗</a></div>
      <div class="ta-updated">Track AIPAC snapshot generated ${esc(generated)} · Source methodology and labels belong to Track AIPAC.</div>
    </div>`;}

  async function init(){const section=insertShell();try{await waitFor("#memberName");const [identity,snapshot]=await Promise.all([loadIdentity(),fetch(TRACK_JSON,{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error("Track AIPAC snapshot unavailable");return r.json();})]);const entry=matchEntry(snapshot.entries||[],identity);if(!entry){section.innerHTML=`<div class="section-head ta-head"><div><div class="ta-kicker">Track AIPAC</div><h2>AIPAC / pro-Israel campaign influence</h2></div><a class="ta-source" href="${TRACK_URL}" target="_blank" rel="noreferrer">Open Track AIPAC ↗</a></div><div class="ta-body"><div class="ta-error">No matching Track AIPAC congressional card was found for this current member in the latest site snapshot. This can happen for newly seated members or if Track AIPAC changes its page structure.</div></div>`;return;}render(section,entry,snapshot);}catch(err){section.innerHTML=`<div class="section-head ta-head"><div><div class="ta-kicker">Track AIPAC</div><h2>AIPAC / pro-Israel campaign influence</h2></div><a class="ta-source" href="${TRACK_URL}" target="_blank" rel="noreferrer">Open Track AIPAC ↗</a></div><div class="ta-body"><div class="ta-error">Track AIPAC data could not be loaded: ${esc(err?.message||"unknown error")}</div></div>`;}}

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
