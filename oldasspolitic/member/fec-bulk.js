(() => {
  "use strict";

  const SNAPSHOT_URL = "./fec-sponsors.json";
  const GENERIC_EMPTY = /no (?:qualifying|employer|sponsor)|rate limited|no records/i;

  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[c]);
  const money = v => {
    const n = Number(v);
    return Number.isFinite(n)
      ? new Intl.NumberFormat("en-US", {style:"currency", currency:"USD", maximumFractionDigits:0}).format(n)
      : "Not shown";
  };
  const norm = s => String(s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
  const id = () => new URLSearchParams(location.search).get("id") || location.hash.replace(/^#member=/,"");

  function rankRows(items, kind){
    if(!items?.length) return '<div class="empty">No FEC bulk records were found for this category in the current cycle.</div>';
    const max = Math.max(...items.map(x=>Number(x.amount)||0), 1);
    return items.map((x,i)=>{
      const pct = Math.max(3, Math.min(100, (Number(x.amount)||0) / max * 100));
      const detail = kind === "pac"
        ? [x.connected_org, x.committee_type, x.count ? `${Number(x.count).toLocaleString()} contribution${Number(x.count)===1?"":"s"}` : ""].filter(Boolean).join(" · ")
        : `${Number(x.count||0).toLocaleString()} itemized contribution${Number(x.count)===1?"":"s"}`;
      return `<div class="rank-row fec-bulk-row" data-search="${esc(norm(`${x.name} ${x.connected_org||""} ${x.committee_type||""}`))}">
        <div class="rank-fill" style="width:${pct}%"></div>
        <div class="rank-content">
          <div><strong>${i+1}. ${esc(x.name)}</strong><span>${esc(detail)}</span></div>
          <strong>${money(x.amount)}</strong>
        </div>
      </div>`;
    }).join("");
  }

  function fillExistingLists(member){
    const employers = member.employers || [];
    const pacs = member.pacs || [];

    const employerList = document.getElementById("employerList");
    if(employerList && !employerList.querySelector(".fec-bulk-row")){
      employerList.innerHTML = rankRows(employers.slice(0,60), "employer");
    }

    const pacList = document.getElementById("pacList");
    if(pacList && !pacList.querySelector(".fec-bulk-row")){
      pacList.innerHTML = rankRows(pacs.slice(0,60), "pac");
    }

    const lobbying = document.getElementById("lobbyingLinks");
    if(lobbying && !lobbying.querySelector(".fec-bulk-lobby")){
      const orgs = [];
      for(const x of employers.slice(0,12)) orgs.push(x.name);
      for(const x of pacs.slice(0,12)) orgs.push(x.connected_org || x.name);
      const unique = [...new Set(orgs.filter(Boolean))].slice(0,20);
      lobbying.innerHTML = unique.length ? unique.map(name=>{
        const u = new URL("https://lda.gov/filings/public/filing/search/");
        u.searchParams.set("client", name);
        u.searchParams.set("search", "search");
        return `<div class="lobby-row fec-bulk-lobby"><strong>${esc(name)}</strong><a href="${esc(u.toString())}" target="_blank" rel="noreferrer">Search LDA ↗</a></div>`;
      }).join("") : '<div class="empty">No organizations were available for LDA lookup from this FEC snapshot.</div>';
    }
  }

  function fillEmployerChart(member){
    const employers = (member.employers || []).slice(0,10);
    if(!employers.length) return;
    const cards = [...document.querySelectorAll(".chart-card")];
    const card = cards.find(x=>/top reported donor employers/i.test(x.querySelector("h2")?.textContent || ""));
    if(!card || card.querySelector(".fec-bulk-bars")) return;
    const old = card.querySelector(".chart-wrap");
    if(!old) return;
    const max = Math.max(...employers.map(x=>Number(x.amount)||0),1);
    const wrap = document.createElement("div");
    wrap.className = "fec-bulk-bars";
    wrap.innerHTML = employers.map((x,i)=>`
      <div class="fec-bar-row">
        <div class="fec-bar-label"><span>${i+1}. ${esc(x.name)}</span><strong>${money(x.amount)}</strong></div>
        <div class="fec-bar-track"><i style="width:${Math.max(3,(Number(x.amount)||0)/max*100)}%"></i></div>
      </div>`).join("");
    old.replaceWith(wrap);
  }

  function renderSponsorPanel(panel, member, snapshot){
    if(panel.querySelector(".fec-bulk-sponsor-ui")) return;
    const employers = member.employers || [];
    const pacs = member.pacs || [];
    const rows = [
      ...pacs.map(x=>({...x, source:"pac", sourceLabel:"PAC / committee support"})),
      ...employers.map(x=>({...x, source:"employer", sourceLabel:"Employees reporting this employer"}))
    ].sort((a,b)=>(Number(b.amount)||0)-(Number(a.amount)||0));
    const generated = snapshot.generated_at ? new Date(snapshot.generated_at).toLocaleString() : "unknown";

    panel.innerHTML = `
      <div class="fec-bulk-sponsor-ui">
        <div class="section-head ta-head">
          <div>
            <div class="ta-kicker">FEC bulk data</div>
            <h2>Major corporate & organizational sponsors</h2>
            <p class="ta-sub">Current-cycle data is prebuilt from official FEC bulk files, so this search does not depend on the browser DEMO_KEY.</p>
          </div>
          <span class="ta-source">${esc(String(snapshot.cycle))} cycle</span>
        </div>
        <div class="ta-note"><strong>What these rows mean:</strong> PAC/committee rows are direct committee-to-candidate contribution records. Employer rows aggregate itemized individual donors by the employer they reported. Employer totals are not direct corporate treasury contributions.</div>
        <div class="fec-sponsor-controls">
          <input id="fecBulkSponsorSearch" class="ta-searchbox" type="search" autocomplete="off" placeholder="Search company, employer, PAC, committee, affiliated organization...">
          <select id="fecBulkSponsorType" class="fec-sponsor-select" aria-label="Sponsor record type">
            <option value="all">All sponsor records</option>
            <option value="pac">PAC / committee support</option>
            <option value="employer">Employee donor employers</option>
          </select>
        </div>
        <div class="fec-sponsor-counts">
          <span><b>${pacs.length}</b> PAC / committee groups</span>
          <span><b>${employers.length}</b> employer groups</span>
          <span><b>${rows.length}</b> searchable records</span>
        </div>
        <div id="fecBulkSponsorRows" class="fec-sponsor-grid"></div>
        <div class="fec-bulk-source">FEC bulk snapshot generated ${esc(generated)} · ${esc(String(snapshot.member_count))} current members have sponsor data in this build.</div>
      </div>`;

    const search = panel.querySelector("#fecBulkSponsorSearch");
    const type = panel.querySelector("#fecBulkSponsorType");
    const target = panel.querySelector("#fecBulkSponsorRows");

    const draw = () => {
      const q = norm(search.value);
      const mode = type.value;
      const filtered = rows.filter(x=>{
        if(mode !== "all" && x.source !== mode) return false;
        if(!q) return true;
        return norm(`${x.name} ${x.connected_org||""} ${x.committee_type||""} ${x.organization_type||""} ${x.sourceLabel}`).includes(q);
      }).slice(0,100);
      target.innerHTML = filtered.length ? filtered.map(x=>`
        <article class="fec-sponsor-card">
          <div class="fec-sponsor-kind ${x.source}">${esc(x.sourceLabel)}</div>
          <h3>${esc(x.name)}</h3>
          ${x.connected_org ? `<div class="fec-connected">Affiliated / connected: <strong>${esc(x.connected_org)}</strong></div>` : ""}
          <div class="fec-sponsor-meta">
            ${x.committee_type ? `<span>${esc(x.committee_type)}</span>` : ""}
            ${x.organization_type ? `<span>${esc(x.organization_type)}</span>` : ""}
            <span>${Number(x.count||0).toLocaleString()} record${Number(x.count)===1?"":"s"}</span>
          </div>
          <strong class="fec-sponsor-money">${money(x.amount)}</strong>
        </article>`).join("") : '<div class="empty">No sponsor records match those filters.</div>';
    };
    search.addEventListener("input", draw);
    type.addEventListener("change", draw);
    draw();
  }

  function fillSponsorPanel(member, snapshot){
    const panel = document.getElementById("taSponsorPanel");
    if(panel) renderSponsorPanel(panel, member, snapshot);
  }

  function addSnapshotStatus(snapshot){
    if(document.getElementById("fecBulkStatus")) return;
    const hero = document.querySelector(".hero");
    if(!hero) return;
    const note = document.createElement("div");
    note.id = "fecBulkStatus";
    note.className = "fec-bulk-status";
    note.textContent = `Donor/sponsor data: FEC ${snapshot.cycle} bulk snapshot`;
    hero.append(note);
  }

  function apply(member, snapshot){
    fillExistingLists(member);
    fillEmployerChart(member);
    fillSponsorPanel(member, snapshot);
    addSnapshotStatus(snapshot);
  }

  async function init(){
    const memberId = id();
    if(!memberId) return;
    try{
      const r = await fetch(SNAPSHOT_URL, {cache:"no-store"});
      if(!r.ok) throw new Error(`FEC snapshot request failed (${r.status})`);
      const snapshot = await r.json();
      const member = snapshot.members?.[memberId];
      if(!member) return;

      const run = () => apply(member, snapshot);
      run();
      const observer = new MutationObserver(()=>run());
      observer.observe(document.body, {childList:true, subtree:true});
      // Async member.js / Track AIPAC renders can land after DOMContentLoaded.
      let attempts = 0;
      const timer = setInterval(()=>{
        run();
        attempts++;
        if(attempts >= 30) clearInterval(timer);
      }, 400);
    }catch(err){
      console.warn("FEC bulk sponsor snapshot unavailable", err);
    }
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
