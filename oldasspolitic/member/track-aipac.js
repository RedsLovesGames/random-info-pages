(() => {
  "use strict";

  const SNAPSHOT_URL = "https://cdn.jsdelivr.net/gh/unitedstates/congress-legislators@73e2fcd181e1c48d1b0580d417e8d0314b22f7c9/legislators-current.json";
  const TRACK_JSON = "./track-aipac.json";
  const TRACK_URL = "https://www.trackaipac.com/congress";
  const METHOD_URL = "https://www.trackaipac.com/blog/updated-methodology";
  const FEC_FOREIGN = "https://www.fec.gov/help-candidates-and-committees/foreign-nationals/";
  const FEC_CORP_RULES = "https://www.fec.gov/help-candidates-and-committees/candidate-taking-receipts/who-can-and-cant-contribute/";
  const FEC_API = "https://api.open.fec.gov/v1";
  const FEC_KEY = "DEMO_KEY";
  const GENERIC_EMPLOYERS = /^(NOT EMPLOYED|NONE|SELF|SELF-EMPLOYED|RETIRED|N\/A|NA|INFORMATION REQUESTED|REQUESTED|HOMEMAKER|UNEMPLOYED|NOT APPLICABLE|UNKNOWN)$/i;

  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[c]);

  const money = v => {
    if (v === null || v === undefined || v === "") return "Not shown";
    const n = Number(v);
    return Number.isFinite(n)
      ? new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n)
      : "Not shown";
  };

  const norm = s => String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv)\.?\b/g,"")
    .replace(/[^a-z0-9]+/g," ")
    .trim()
    .replace(/\s+/g," ");

  const queryId = () => new URLSearchParams(location.search).get("id") || location.hash.replace(/^#member=/,"");
  const ratingLabel = code => ({
    approved:"Track AIPAC Approved",
    poor:"Poor legislative record",
    improving:"Improving legislative record",
    evaluating:"Under evaluation",
    warning:"Track AIPAC warning",
    not_explicit:"No explicit record note"
  })[code] || "No explicit record note";

  function waitFor(selector, timeout=12000){
    return new Promise((resolve,reject)=>{
      const start=Date.now();
      const tick=()=>{
        const el=document.querySelector(selector);
        if(el) return resolve(el);
        if(Date.now()-start>timeout) return reject(new Error(`Timed out waiting for ${selector}`));
        setTimeout(tick,120);
      };
      tick();
    });
  }

  async function fetchJson(url, opts={}){
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), 16000);
    try{
      const r = await fetch(url,{...opts,signal:controller.signal,headers:{Accept:"application/json",...(opts.headers||{})}});
      if(!r.ok) throw new Error(`Request failed (${r.status})`);
      return await r.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function fecUrl(path, params={}){
    const u = new URL(FEC_API + path);
    u.searchParams.set("api_key",FEC_KEY);
    for(const [k,v] of Object.entries(params)){
      if(Array.isArray(v)) v.forEach(x=>u.searchParams.append(k,x));
      else if(v!==undefined && v!==null && v!=="") u.searchParams.set(k,v);
    }
    return u.toString();
  }

  function currentCycle(){
    const y = new Date().getFullYear();
    return y % 2 === 0 ? y : y + 1;
  }

  function currentTerm(x){
    const terms=Array.isArray(x.terms)?x.terms:[];
    return terms.at(-1)||{};
  }

  function displayName(x){
    return x.name?.official_full || [x.name?.first,x.name?.middle,x.name?.last,x.name?.suffix].filter(Boolean).join(" ");
  }

  function rosterRow(x){
    const t=currentTerm(x);
    const raw=x.id?.fec;
    const fecIds=Array.isArray(raw)?raw:(raw?[raw]:[]);
    return {
      id:x.id?.bioguide||"",
      name:displayName(x),
      nameKey:norm(displayName(x)),
      party:t.party||"Independent",
      state:t.state||"",
      chamber:t.type==="sen"?"Senate":"House",
      district:t.type==="sen"?null:(t.district??null),
      fecIds,
      opensecrets:x.id?.opensecrets||""
    };
  }

  async function loadRoster(){
    const rows=await fetchJson(SNAPSHOT_URL,{cache:"force-cache"});
    return rows.map(rosterRow).filter(x=>x.id);
  }

  function seatText(m){
    if(m.chamber==="Senate") return `${m.state} senator`;
    if(Number(m.district)===0) return `${m.state} at-large representative`;
    return `${m.state}-${m.district} representative`;
  }

  function renderMemberFinder(roster){
    if(document.getElementById("taMemberFinder")) return;
    const shell=document.querySelector(".shell");
    const top=document.querySelector(".topbar");
    if(!shell || !top) return;

    const finder=document.createElement("section");
    finder.id="taMemberFinder";
    finder.className="panel ta-search-hub";
    finder.innerHTML=`
      <div class="ta-search-head">
        <div>
          <div class="ta-kicker">Search Congress</div>
          <h2>Find any senator or House member</h2>
          <p>Search by name, state, chamber, party, or district.</p>
        </div>
        <div class="ta-search-chips" aria-label="Quick member searches">
          <button type="button" data-member-query="Senate">Senators</button>
          <button type="button" data-member-query="House">House</button>
          <button type="button" data-member-query="Democrat">Democrats</button>
          <button type="button" data-member-query="Republican">Republicans</button>
        </div>
      </div>
      <div class="ta-searchbox-wrap">
        <input class="ta-searchbox" id="taGlobalMemberSearch" type="search" autocomplete="off" placeholder="Search member: senator, representative, state, party, district...">
        <span class="ta-search-count" id="taMemberSearchCount">${roster.length} current members</span>
      </div>
      <div class="ta-member-results" id="taMemberResults" hidden></div>`;
    top.after(finder);

    const input=finder.querySelector("#taGlobalMemberSearch");
    const results=finder.querySelector("#taMemberResults");
    const count=finder.querySelector("#taMemberSearchCount");

    const search = q => {
      const key=norm(q);
      if(!key){
        results.hidden=true;
        results.innerHTML="";
        count.textContent=`${roster.length} current members`;
        return;
      }
      const hits=roster.filter(m=>{
        const district=m.chamber==="House"
          ? (Number(m.district)===0?"at large":`district ${m.district}`)
          : "senator senate";
        const hay=norm(`${m.name} ${m.state} ${m.chamber} ${m.party} ${district} representative congressperson`);
        return hay.includes(key);
      }).slice(0,16);

      count.textContent=`${hits.length}${hits.length===16?"+":""} matches shown`;
      results.hidden=false;
      results.innerHTML = hits.length ? hits.map(m=>`
        <button class="ta-member-hit" type="button" data-id="${esc(m.id)}">
          <span><strong>${esc(m.name)}</strong><small>${esc(m.party)} · ${esc(seatText(m))}</small></span>
          <b>Open →</b>
        </button>`).join("") : `<div class="ta-search-empty">No current member matched that search.</div>`;
    };

    input.addEventListener("input",()=>search(input.value));
    results.addEventListener("click",e=>{
      const btn=e.target.closest("[data-id]");
      if(btn) location.href=`./?id=${encodeURIComponent(btn.dataset.id)}`;
    });
    finder.querySelectorAll("[data-member-query]").forEach(btn=>{
      btn.addEventListener("click",()=>{
        input.value=btn.dataset.memberQuery||"";
        search(input.value);
        input.focus();
      });
    });
    document.addEventListener("click",e=>{
      if(!finder.contains(e.target)) results.hidden=true;
    });
  }

  function attachFilter(targetId, placeholder){
    const target=document.getElementById(targetId);
    if(!target || target.dataset.searchEnhanced==="1") return;
    target.dataset.searchEnhanced="1";

    const wrap=document.createElement("div");
    wrap.className="ta-inline-filter";
    const input=document.createElement("input");
    input.type="search";
    input.className="ta-searchbox";
    input.placeholder=placeholder;
    input.setAttribute("aria-label",placeholder);
    wrap.append(input);
    target.parentElement?.insertBefore(wrap,target);

    const apply=()=>{
      const q=norm(input.value);
      let visible=0;
      for(const child of [...target.children]){
        if(child.classList.contains("empty")) continue;
        const show=!q || norm(child.textContent).includes(q);
        child.hidden=!show;
        if(show) visible++;
      }
      let empty=wrap.querySelector(".ta-filter-empty");
      if(q && visible===0){
        if(!empty){
          empty=document.createElement("div");
          empty.className="ta-filter-empty";
          empty.textContent="No rows match this search.";
          wrap.append(empty);
        }
      } else empty?.remove();
    };
    input.addEventListener("input",apply);
    new MutationObserver(apply).observe(target,{childList:true,subtree:true});
  }

  function attachTableFilter(){
    const body=document.getElementById("cycleRows");
    if(!body || body.dataset.searchEnhanced==="1") return;
    body.dataset.searchEnhanced="1";
    const tablePanel=body.closest(".table-panel");
    if(!tablePanel) return;
    const scroll=tablePanel.querySelector(".table-scroll");
    const wrap=document.createElement("div");
    wrap.className="ta-inline-filter ta-table-filter";
    wrap.innerHTML=`<input type="search" class="ta-searchbox" placeholder="Search election cycle, amount, debt, cash on hand..." aria-label="Search election-cycle finance table">`;
    scroll?.before(wrap);
    const input=wrap.querySelector("input");
    const apply=()=>{
      const q=norm(input.value);
      for(const row of [...body.rows]) row.hidden=!!q && !norm(row.textContent).includes(q);
    };
    input.addEventListener("input",apply);
    new MutationObserver(apply).observe(body,{childList:true,subtree:true});
  }

  function attachTrackGroupFilter(section){
    const groups=section.querySelector(".ta-groups");
    if(!groups || groups.dataset.searchEnhanced==="1") return;
    groups.dataset.searchEnhanced="1";
    const wrap=document.createElement("div");
    wrap.className="ta-inline-filter ta-group-filter";
    wrap.innerHTML=`<input type="search" class="ta-searchbox" placeholder="Search AIPAC / pro-Israel groups on this member..." aria-label="Search Track AIPAC groups">`;
    groups.before(wrap);
    const input=wrap.querySelector("input");
    input.addEventListener("input",()=>{
      const q=norm(input.value);
      groups.querySelectorAll(".ta-group").forEach(g=>{
        g.hidden=!!q && !norm(g.textContent).includes(q);
      });
    });
  }

  function enhanceExistingSearches(){
    attachFilter("employerList","Search donor employers / companies...");
    attachFilter("pacList","Search PACs, committees, corporate PACs...");
    attachFilter("lobbyingLinks","Search organizations for lobbying lookups...");
    attachTableFilter();

    const watch=new MutationObserver(()=>{
      const section=document.getElementById("trackAipacPanel");
      if(section) attachTrackGroupFilter(section);
    });
    watch.observe(document.body,{childList:true,subtree:true});
  }

  function matchEntry(entries,m){
    const nameKey=norm(m.name);
    if(m.chamber==="House"){
      const seat=`${m.state}-${Number(m.district)===0?"AL":String(m.district??0).padStart(2,"0")}`;
      const exact=entries.find(e=>e.seat===seat);
      if(exact) return exact;
    }
    const senators=entries.filter(e=>e.seat===`${m.state}-SEN`);
    let hit=senators.find(e=>e.name_key===nameKey)||entries.find(e=>e.name_key===nameKey);
    if(hit) return hit;
    const last=nameKey.split(" ").at(-1)||"",first=nameKey.split(" ")[0]||"";
    hit=senators.find(e=>e.name_key?.includes(last)&&e.name_key?.includes(first));
    return hit||null;
  }

  function insertTrackShell(){
    let section=document.getElementById("trackAipacPanel");
    if(section) return section;
    section=document.createElement("section");
    section.className="panel ta-section";
    section.id="trackAipacPanel";
    section.innerHTML=`<div class="ta-loading">Loading Track AIPAC data...</div>`;
    const source=document.querySelector(".source-panel");
    if(source) source.before(section);
    else document.querySelector("main")?.append(section);
    return section;
  }

  function renderTrack(section,entry,snapshot){
    const total=entry.israel_lobby_total===null?0:Number(entry.israel_lobby_total);
    const pac=entry.pac_or_donation_total===null?0:Number(entry.pac_or_donation_total);
    const ie=entry.independent_expenditures===null?0:Number(entry.independent_expenditures);
    const safeTotal=Number.isFinite(total)?total:0,safePac=Number.isFinite(pac)?pac:0,safeIe=Number.isFinite(ie)?ie:0;
    const pacPct=safeTotal>0?Math.max(0,Math.min(100,safePac/safeTotal*100)):0;
    const iePct=safeTotal>0?Math.max(0,Math.min(100,safeIe/safeTotal*100)):0;
    const groups=(entry.groups||[]).map(g=>`<span class="ta-group${/\bAIPAC\b/i.test(g)?" aipac":""}">${esc(g)}</span>`).join("");
    const generated=snapshot.generated_at?new Date(snapshot.generated_at).toLocaleString():"Unknown";

    section.innerHTML=`
      <div class="section-head ta-head">
        <div>
          <div class="ta-kicker">Track AIPAC</div>
          <h2>AIPAC / pro-Israel campaign influence</h2>
          <p class="ta-sub">Track AIPAC's U.S. campaign-finance categories and qualitative policy-record label for this member.</p>
        </div>
        <a class="ta-source" href="${TRACK_URL}" target="_blank" rel="noreferrer">Open Track AIPAC ↗</a>
      </div>
      <div class="ta-body">
        <div class="ta-stats">
          <div class="ta-stat"><span>Israel Lobby Total</span><strong>${money(entry.israel_lobby_total)}</strong><small>Track AIPAC category</small></div>
          <div class="ta-stat"><span>${esc(entry.support_label||"PACs / donations")}</span><strong>${money(entry.pac_or_donation_total)}</strong><small>Track AIPAC category, not necessarily AIPAC alone</small></div>
          <div class="ta-stat"><span>Independent expenditures</span><strong>${money(entry.independent_expenditures)}</strong><small>Outside spending, not money given to candidate</small></div>
          <div class="ta-stat"><span>Track AIPAC record status</span><strong class="ta-rating ${esc(entry.rating_code)}">${esc(ratingLabel(entry.rating_code))}</strong><small>Qualitative, not a numeric vote score</small></div>
          <div class="ta-stat"><span>AIPAC named among groups</span><strong>${entry.aipac_named?"Yes":"No"}</strong><small>Based on Track AIPAC card</small></div>
        </div>
        <div class="ta-grid">
          <div class="ta-card">
            <h3>Tracked money breakdown</h3>
            <div class="ta-copy">Track AIPAC separates its PAC/donation category from independent expenditures. The tracker does not assign a separate dollar amount to every listed organization, so this page does not treat the whole total as direct AIPAC PAC money.</div>
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
      </div>`;
    attachTrackGroupFilter(section);
  }

  async function renderTrackPanel(identity){
    const section=insertTrackShell();
    try{
      const snapshot=await fetchJson(TRACK_JSON,{cache:"no-store"});
      const entry=matchEntry(snapshot.entries||[],identity);
      if(!entry){
        section.innerHTML=`<div class="section-head ta-head"><div><div class="ta-kicker">Track AIPAC</div><h2>AIPAC / pro-Israel campaign influence</h2></div><a class="ta-source" href="${TRACK_URL}" target="_blank" rel="noreferrer">Open Track AIPAC ↗</a></div><div class="ta-body"><div class="ta-error">No matching Track AIPAC congressional card was found for this current member in the latest site snapshot.</div></div>`;
        return;
      }
      renderTrack(section,entry,snapshot);
    }catch(err){
      section.innerHTML=`<div class="section-head ta-head"><div><div class="ta-kicker">Track AIPAC</div><h2>AIPAC / pro-Israel campaign influence</h2></div><a class="ta-source" href="${TRACK_URL}" target="_blank" rel="noreferrer">Open Track AIPAC ↗</a></div><div class="ta-body"><div class="ta-error">Track AIPAC data could not be loaded: ${esc(err?.message||"unknown error")}</div></div>`;
    }
  }

  async function totalsForCandidate(id){
    const j=await fetchJson(fecUrl(`/candidate/${encodeURIComponent(id)}/totals/`,{per_page:100,sort:"-cycle",election_full:"false"}));
    return (j.results||[]).map(r=>({...r,_candidateId:id}));
  }

  function num(row,...keys){
    for(const k of keys){
      const n=Number(row?.[k]);
      if(Number.isFinite(n)) return n;
    }
    return 0;
  }

  function committeeIds(row){
    return [...new Set([row?.committee_id,...(Array.isArray(row?.committee_ids)?row.committee_ids:[])].filter(Boolean))];
  }

  async function financeContext(identity){
    const ids=(identity.fecIds||[]).filter(Boolean);
    if(!ids.length) throw new Error("No FEC candidate ID is listed for this member.");
    const sets=await Promise.all(ids.map(id=>totalsForCandidate(id).catch(()=>[])));
    const rows=sets.flat();
    const prefix=identity.chamber==="Senate"?"S":"H";
    const officeIds=ids.filter(x=>String(x).startsWith(prefix));
    const preferred=officeIds.at(-1)||ids[0];
    const cycle=currentCycle();
    const candidates=rows.filter(r=>r._candidateId===preferred && Number(r.cycle)<=cycle);
    const latest=(candidates.length?candidates:rows)
      .slice()
      .sort((a,b)=>Number(b.cycle)-Number(a.cycle)||num(b,"receipts","total_receipts")-num(a,"receipts","total_receipts"))[0];
    if(!latest) throw new Error("No FEC totals were returned.");
    return {candidateId:preferred,cycle:Number(latest.cycle)||cycle,committeeIds:committeeIds(latest)};
  }

  async function employerData(ids,cycle){
    if(!ids.length) return [];
    const j=await fetchJson(fecUrl("/schedules/schedule_a/by_employer/",{
      committee_id:ids,cycle,per_page:100,sort:"-total"
    }));
    return (j.results||[])
      .map(r=>({name:String(r.employer||"").trim(),amount:num(r,"total"),count:num(r,"count")}))
      .filter(r=>r.name && !GENERIC_EMPLOYERS.test(r.name) && r.amount>0)
      .slice(0,60);
  }

  async function pacData(ids,cycle){
    if(!ids.length) return [];
    const j=await fetchJson(fecUrl("/schedules/schedule_a/",{
      committee_id:ids,
      two_year_transaction_period:cycle,
      line_number:"F3-11C",
      per_page:100,
      sort:"-contribution_receipt_amount"
    }));
    const grouped=new Map();
    for(const r of j.results||[]){
      const amount=num(r,"contribution_receipt_amount");
      const name=String(r.contributor_name||"").trim();
      if(!name || amount<=0 || r.memoed_subtotal===true) continue;
      const contributorId=String(r.contributor_id||"").trim();
      const key=contributorId || norm(name);
      const row=grouped.get(key)||{name,amount:0,count:0,contributorId};
      row.amount+=amount;
      row.count++;
      grouped.set(key,row);
    }
    return [...grouped.values()].sort((a,b)=>b.amount-a.amount).slice(0,40);
  }

  async function committeeMeta(id){
    if(!id || !/^C\d+$/i.test(id)) return null;
    try{
      const j=await fetchJson(fecUrl(`/committee/${encodeURIComponent(id)}/`,{per_page:1}));
      const r=(j.results||[])[0];
      if(!r) return null;
      return {
        committeeName:r.name||"",
        committeeType:r.committee_type_full||r.committee_type||"",
        designation:r.designation_full||r.designation||"",
        organizationType:r.organization_type_full||r.organization_type||"",
        affiliated:r.affiliated_committee_name||"",
        connected:r.connected_organization_name||""
      };
    }catch{
      return null;
    }
  }

  async function sponsorData(identity){
    const ctx=await financeContext(identity);
    const [employers,pacs]=await Promise.all([
      employerData(ctx.committeeIds,ctx.cycle).catch(()=>[]),
      pacData(ctx.committeeIds,ctx.cycle).catch(()=>[])
    ]);
    const metaPairs=await Promise.all(pacs.slice(0,18).map(async p=>[p.contributorId,await committeeMeta(p.contributorId)]));
    const metaMap=new Map(metaPairs.filter(([id,m])=>id&&m));
    return {ctx,employers,pacs,metaMap};
  }

  function insertSponsorShell(){
    let section=document.getElementById("taSponsorPanel");
    if(section) return section;
    section=document.createElement("section");
    section.id="taSponsorPanel";
    section.className="panel ta-sponsor-section";
    section.innerHTML=`<div class="ta-loading">Loading corporate and organizational sponsor data...</div>`;
    const table=document.querySelector(".table-panel");
    if(table) table.before(section);
    else document.querySelector("main")?.append(section);
    return section;
  }

  function sponsorRows(data){
    const rows=[];
    for(const p of data.pacs){
      const meta=data.metaMap.get(p.contributorId)||{};
      const org=meta.connected||meta.affiliated||p.name;
      rows.push({
        name:org,
        detail:meta.connected||meta.affiliated ? `PAC: ${p.name}` : p.name,
        type:"PAC / committee",
        amount:p.amount,
        count:p.count,
        meta:[meta.committeeType,meta.organizationType,meta.designation].filter(Boolean).join(" · "),
        source:"FEC Schedule A"
      });
    }
    for(const e of data.employers){
      rows.push({
        name:e.name,
        detail:"Employees reporting this employer",
        type:"Employee donor concentration",
        amount:e.amount,
        count:e.count,
        meta:"Individual donors grouped by self-reported employer",
        source:"FEC employer aggregation"
      });
    }
    return rows.sort((a,b)=>b.amount-a.amount);
  }

  function renderSponsors(section,data){
    const rows=sponsorRows(data);
    const max=Math.max(...rows.map(x=>x.amount),1);

    section.innerHTML=`
      <div class="section-head ta-head">
        <div>
          <div class="ta-kicker">FEC organization search</div>
          <h2>Major corporate & organizational sponsors</h2>
          <p class="ta-sub">Searchable current-cycle PAC/committee support plus itemized individual donors grouped by employer. These are shown as separate source types.</p>
        </div>
        <span class="ta-source">${esc(String(data.ctx.cycle))} cycle</span>
      </div>
      <div class="ta-note"><strong>Corporate-money rule:</strong> federal candidate committees may not accept corporate treasury contributions. Corporations can sponsor PACs/SSFs, and individual employees can donate personally. This section therefore distinguishes PAC/committee contributions from employees grouped by employer. <a href="${FEC_CORP_RULES}" target="_blank" rel="noreferrer">FEC rules ↗</a></div>
      <div class="ta-sponsor-controls">
        <input class="ta-searchbox" id="taSponsorSearch" type="search" placeholder="Search company, employer, PAC, committee, affiliated organization...">
        <select class="ta-select" id="taSponsorType" aria-label="Filter sponsor type">
          <option value="all">All sponsor records</option>
          <option value="pac">PAC / committee only</option>
          <option value="employer">Employer-grouped individuals only</option>
        </select>
      </div>
      <div class="ta-sponsor-summary">
        <span><strong>${data.pacs.length}</strong> PAC/committee groups loaded</span>
        <span><strong>${data.employers.length}</strong> employer groups loaded</span>
        <span><strong>${rows.length}</strong> searchable sponsor records</span>
      </div>
      <div class="ta-sponsor-list" id="taSponsorList"></div>`;

    const list=section.querySelector("#taSponsorList");
    const search=section.querySelector("#taSponsorSearch");
    const type=section.querySelector("#taSponsorType");

    const renderList=()=>{
      const q=norm(search.value);
      const t=type.value;
      const filtered=rows.filter(r=>{
        if(t==="pac" && r.type!=="PAC / committee") return false;
        if(t==="employer" && r.type!=="Employee donor concentration") return false;
        if(q && !norm(`${r.name} ${r.detail} ${r.type} ${r.meta} ${r.source}`).includes(q)) return false;
        return true;
      }).slice(0,30);

      list.innerHTML=filtered.length?filtered.map((r,i)=>`
        <div class="ta-sponsor-row">
          <div class="ta-sponsor-rank">${i+1}</div>
          <div class="ta-sponsor-main">
            <div class="ta-sponsor-name">${esc(r.name)}</div>
            <div class="ta-sponsor-detail">${esc(r.detail)}</div>
            <div class="ta-sponsor-tags">
              <span>${esc(r.type)}</span>
              ${r.meta?`<span>${esc(r.meta)}</span>`:""}
              <span>${esc(r.source)}</span>
            </div>
          </div>
          <div class="ta-sponsor-money">
            <strong>${money(r.amount)}</strong>
            <small>${r.count?`${r.count.toLocaleString()} disclosed transaction${r.count===1?"":"s"}`:""}</small>
          </div>
          <div class="ta-sponsor-meter"><i style="width:${Math.max(2,r.amount/max*100)}%"></i></div>
        </div>`).join(""):`<div class="ta-search-empty">No sponsor records match those filters.</div>`;
    };
    search.addEventListener("input",renderList);
    type.addEventListener("change",renderList);
    renderList();
  }

  async function renderSponsorPanel(identity){
    const section=insertSponsorShell();
    try{
      const data=await sponsorData(identity);
      renderSponsors(section,data);
    }catch(err){
      section.innerHTML=`
        <div class="section-head ta-head">
          <div><div class="ta-kicker">FEC organization search</div><h2>Major corporate & organizational sponsors</h2></div>
        </div>
        <div class="ta-error">Sponsor data could not be loaded right now: ${esc(err?.message||"unknown error")}. The FEC public API can rate-limit DEMO_KEY traffic.</div>`;
    }
  }

  async function init(){
    try{
      await waitFor("#memberName");
      enhanceExistingSearches();
      const roster=await loadRoster();
      renderMemberFinder(roster);
      const id=queryId();
      const identity=roster.find(x=>x.id===id);
      if(!identity) throw new Error("Current member was not found in the congressional roster.");
      await Promise.allSettled([
        renderTrackPanel(identity),
        renderSponsorPanel(identity)
      ]);
    }catch(err){
      const section=insertTrackShell();
      if(!section.querySelector(".ta-body")){
        section.innerHTML=`<div class="ta-error">Enhanced search / Track AIPAC data could not initialize: ${esc(err?.message||"unknown error")}</div>`;
      }
    }
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();