(() => {
  "use strict";

  const DATA_URL = "./fec-sponsors.json";
  const ROSTER_URL = "https://cdn.jsdelivr.net/gh/unitedstates/congress-legislators@73e2fcd181e1c48d1b0580d417e8d0314b22f7c9/legislators-current.json";
  const COLORS = ["#59c7ff","#e6ff62","#b77cff","#ffb15a","#57e69d","#4f8dff","#ff5c65","#9aa5b6","#db7dff","#50dfc5","#ffc85c","#77a7ff"];
  const charts = new Map();
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const money = value => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(number(value));
  const compactMoney = value => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",notation:"compact",maximumFractionDigits:1}).format(number(value));
  const pct = value => `${number(value).toFixed(1)}%`;
  const queryId = () => new URLSearchParams(location.search).get("id") || location.hash.replace(/^#member=/,"");

  function age(birthday){
    if(!birthday) return null;
    const [y,m,d] = String(birthday).slice(0,10).split("-").map(Number);
    if(!y) return null;
    const now = new Date();
    let value = now.getFullYear()-y;
    if(m>now.getMonth()+1 || (m===now.getMonth()+1 && d>now.getDate())) value--;
    return value;
  }

  function niceDate(value){
    if(!value) return "Unknown";
    const [y,m,d] = String(value).slice(0,10).split("-").map(Number);
    if(!y||!m||!d) return value;
    return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"}).format(new Date(Date.UTC(y,m-1,d)));
  }

  async function json(url){
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(),20000);
    try{
      const response = await fetch(url,{signal:controller.signal,cache:"no-store",headers:{Accept:"application/json"}});
      if(!response.ok) throw new Error(`Request failed (${response.status})`);
      return await response.json();
    } finally { clearTimeout(timer); }
  }

  function normalizeRoster(person){
    const terms = Array.isArray(person.terms) ? person.terms : [];
    const term = terms.at(-1) || {};
    const name = person.name || {};
    const first = terms.find(t=>t?.start) || terms[0] || {};
    return {
      id: person.id?.bioguide || "",
      name: name.official_full || [name.first,name.middle,name.last,name.suffix].filter(Boolean).join(" "),
      party: term.party || "Independent",
      state: term.state || "",
      chamber: term.type === "sen" ? "Senate" : "House",
      district: term.type === "sen" ? null : (term.district ?? null),
      birthday: person.bio?.birthday || "",
      age: age(person.bio?.birthday || ""),
      website: term.url || "",
      phone: term.phone || "",
      senateClass: term.class || null,
      firstServiceYear: Number(String(first.start || "").slice(0,4)) || null,
      termCount: terms.length,
      opensecrets: person.id?.opensecrets || "",
      fecIds: Array.isArray(person.id?.fec) ? person.id.fec : (person.id?.fec ? [person.id.fec] : [])
    };
  }

  function seat(member){
    if(member.chamber === "Senate") return `${member.state} senator`;
    if(Number(member.district)===0) return `${member.state} at-large representative`;
    return `${member.state} district ${member.district}`;
  }

  function serviceStartCycle(member){
    const y = member.firstServiceYear || 2008;
    return y % 2 === 0 ? y : y-1;
  }

  function ageStats(member, roster){
    const chamber = roster.filter(x=>x.chamber===member.chamber && Number.isFinite(x.age)).sort((a,b)=>b.age-a.age);
    const all = roster.filter(x=>Number.isFinite(x.age));
    return {
      rank: chamber.findIndex(x=>x.id===member.id)+1,
      total: chamber.length,
      chamberAverage: chamber.reduce((s,x)=>s+x.age,0)/Math.max(1,chamber.length),
      congressAverage: all.reduce((s,x)=>s+x.age,0)/Math.max(1,all.length)
    };
  }

  function destroyChart(canvas){
    if(!canvas || !window.Chart) return;
    const existing = Chart.getChart(canvas);
    if(existing) existing.destroy();
    const stored = charts.get(canvas);
    if(stored && stored !== existing) stored.destroy();
    charts.delete(canvas);
  }

  function horizontalBar(canvas, rows, label){
    if(!canvas || !window.Chart || !rows.length) return;
    destroyChart(canvas);
    const chart = new Chart(canvas,{
      type:"bar",
      data:{labels:rows.map(r=>r.name),datasets:[{label,data:rows.map(r=>number(r.amount)),backgroundColor:"rgba(89,199,255,.78)",borderColor:"#59c7ff",borderWidth:1,borderRadius:5}]},
      options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${money(ctx.raw)}${rows[ctx.dataIndex]?.count?` - ${rows[ctx.dataIndex].count} records`:""}`}}},scales:{x:{beginAtZero:true,ticks:{callback:v=>compactMoney(v)}},y:{grid:{display:false},ticks:{autoSkip:false,font:{size:9}}}}}
    });
    charts.set(canvas,chart);
  }

  function doughnut(canvas, rows){
    if(!canvas || !window.Chart || !rows.length) return;
    destroyChart(canvas);
    const chart = new Chart(canvas,{
      type:"doughnut",
      data:{labels:rows.map(r=>r.name),datasets:[{data:rows.map(r=>number(r.amount)),backgroundColor:rows.map((_,i)=>COLORS[i%COLORS.length]),borderColor:"#101622",borderWidth:3}]},
      options:{responsive:true,maintainAspectRatio:false,cutout:"64%",plugins:{legend:{position:"bottom",labels:{boxWidth:9,font:{size:9}}},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${money(ctx.raw)}`}}}}
    });
    charts.set(canvas,chart);
  }

  function pacIndustry(row){
    const org = String(row.organization_type || "").toUpperCase();
    const text = `${row.connected_org||""} ${row.name||""}`.toUpperCase();
    if(org.includes("LABOR")) return "Labor";
    if(org.includes("TRADE") || /ASSOCIATION|CHAMBER OF COMMERCE/.test(text)) return "Trade & professional associations";
    const rules = [
      ["Healthcare & pharma",/HEALTH|HOSPITAL|MEDICAL|MEDIC|PHARMA|PHARMACEUT|DENTAL|NURSE|DOCTOR|BIOGEN|BIOTECH/],
      ["Technology & telecom",/TECH|SOFTWARE|SEMICONDUCT|COMPUT|TELECOM|WIRELESS|INTERNET|GOOGLE|MICROSOFT|APPLE|META|AMAZON|SPACEX/],
      ["Finance & banking",/BANK|FINANC|CAPITAL|INVEST|SECURIT|CREDIT|MORTGAGE|WALL STREET|ASSET|FUND/],
      ["Insurance",/INSUR/],
      ["Energy & natural resources",/ENERGY|OIL|GAS|PETROLEUM|COAL|MINING|URANIUM|UTILITY|POWER|SOLAR|WIND/],
      ["Defense & aerospace",/DEFENSE|AEROSPACE|AIRCRAFT|LOCKHEED|NORTHROP|RAYTHEON|BOEING|GENERAL DYNAMICS/],
      ["Real estate & construction",/REAL ESTATE|REALTOR|HOME BUILD|CONSTRUCT|PROPERTY|HOUSING/],
      ["Manufacturing & industrial",/MANUFACTUR|INDUSTR|STEEL|CHEMICAL|MACHIN|AUTOMOTIVE|MOTOR/],
      ["Transportation & logistics",/AIRLINE|TRANSPORT|TRUCK|RAIL|SHIPPING|LOGISTIC|FREIGHT|DELIVERY/],
      ["Food, retail & hospitality",/RESTAURANT|HOTEL|HOSPITALITY|FOOD|BEVERAGE|GROCERY|RETAIL|STORE/],
      ["Media & entertainment",/MEDIA|FILM|MUSIC|ENTERTAIN|BROADCAST|PUBLISH|TELEVISION/],
      ["Agriculture",/FARM|AGRICULT|RANCH|CROP|LIVESTOCK/]
    ];
    for(const [name,re] of rules) if(re.test(text)) return name;
    if(org.includes("CORPORATION")) return "Other corporations";
    if(org.includes("MEMBERSHIP")) return "Membership organizations";
    return "Other / mixed";
  }

  function aggregatePacIndustries(rows){
    const grouped = new Map();
    for(const row of rows||[]){
      const name = pacIndustry(row);
      const value = grouped.get(name)||{name,amount:0,count:0};
      value.amount += number(row.amount);
      value.count += number(row.count);
      grouped.set(name,value);
    }
    return [...grouped.values()].sort((a,b)=>b.amount-a.amount).slice(0,12);
  }

  function addPriorityCharts(snapshot, member){
    let panel = $("priorityDonationCharts");
    if(!panel){
      panel = document.createElement("section");
      panel.id = "priorityDonationCharts";
      panel.className = "panel bd-priority";
      $("headlineStats")?.after(panel);
    }
    const employers = (member.employers||[]).slice(0,10);
    const occupations = (member.occupations||[]).slice(0,12);
    const sectors = (member.sectors||[]).slice(0,12);
    const pacs = (member.pacs||[]).slice(0,12);
    const pacIndustries = aggregatePacIndustries(member.pacs||[]);
    panel.innerHTML = `
      <div class="bd-priority-head">
        <div><div class="kicker">Donation intelligence</div><h2>Who funds this member?</h2><p>Charts first. Lists and raw records are collapsed below until you open them.</p></div>
        <span class="source-chip">FEC ${esc(snapshot.cycle)} cycle</span>
      </div>
      <div class="bd-chart-grid">
        <article class="bd-chart-card"><div class="bd-chart-title"><span>Individual donors</span><strong>Top reported professions</strong><small>Self-reported occupation on itemized contributions</small></div><div class="bd-chart"><canvas id="bdOccupationChart"></canvas></div></article>
        <article class="bd-chart-card"><div class="bd-chart-title"><span>Individual donors</span><strong>Top reported employers</strong><small>Employer is not the donor</small></div><div class="bd-chart"><canvas id="bdEmployerChart"></canvas></div></article>
        <article class="bd-chart-card"><div class="bd-chart-title"><span>Individual donors</span><strong>Profession / industry sectors</strong><small>Heuristic grouping of occupation + employer text</small></div><div class="bd-chart bd-doughnut"><canvas id="bdSectorChart"></canvas></div></article>
        <article class="bd-chart-card"><div class="bd-chart-title"><span>PAC / connected organizations</span><strong>Direct donor industries</strong><small>Heuristic grouping of FEC committee and connected-org metadata</small></div><div class="bd-chart bd-doughnut"><canvas id="bdPacIndustryChart"></canvas></div></article>
        <article class="bd-chart-card bd-wide"><div class="bd-chart-title"><span>PAC / committee support</span><strong>Top direct organizational donors</strong><small>Direct committee-to-candidate transactions</small></div><div class="bd-chart"><canvas id="bdPacChart"></canvas></div></article>
      </div>
      <div class="bd-method-note"><strong>Important:</strong> reported employers group donations made by individual people. They are not corporate donations. The PAC / connected-organization charts are kept separate. Industry labels are heuristic classifications for browsing, not official FEC industry codes.</div>`;
    horizontalBar($("bdOccupationChart"),occupations,"Itemized contribution amount");
    horizontalBar($("bdEmployerChart"),employers,"Itemized contribution amount");
    doughnut($("bdSectorChart"),sectors);
    doughnut($("bdPacIndustryChart"),pacIndustries);
    horizontalBar($("bdPacChart"),pacs.map(r=>({...r,name:r.connected_org||r.name})),"Direct PAC / committee support");
  }

  function renderHero(member){
    document.title = `${member.name} | Old Ass Politic`;
    $("memberName").textContent = member.name;
    $("memberSub").textContent = `${member.party} · ${seat(member)} · age ${member.age ?? "unknown"}`;
    $("memberPills").innerHTML = [member.party,member.chamber,member.state].map(x=>`<span class="pill">${esc(x)}</span>`).join("");
  }

  function serviceCycles(member, bulkMember){
    const start = Math.max(serviceStartCycle(member), Number(bulkMember.finance_coverage_start)||2008);
    const rows = (bulkMember.finance_cycles||[]).filter(row=>Number(row.cycle)>=start);
    return rows.length ? rows : (bulkMember.finance_cycles||[]);
  }

  function renderHeadline(member, bulkMember, roster){
    const rows = serviceCycles(member,bulkMember);
    const latest = rows.at(-1) || {};
    const totalReceipts = rows.reduce((s,r)=>s+number(r.receipts),0);
    const stats = ageStats(member,roster);
    const years = member.firstServiceYear ? Math.max(0,new Date().getFullYear()-member.firstServiceYear) : null;
    $("statRaised").textContent = compactMoney(latest.receipts);
    $("statRaisedCycle").textContent = latest.cycle ? `${latest.cycle} FEC bulk summary` : "FEC bulk summary";
    $("statSpent").textContent = compactMoney(latest.spent);
    $("statCash").textContent = compactMoney(latest.cash);
    $("statCareer").textContent = compactMoney(totalReceipts);
    $("statCareerCycles").textContent = `${rows.length} FEC cycles covered`;
    $("statAgeRank").textContent = stats.rank ? `#${stats.rank} / ${stats.total}` : "-";
    $("statAgeRankSub").textContent = `Oldest rank in ${member.chamber}`;
    $("statYears").textContent = years===null ? "-" : String(years);
    $("statSince").textContent = member.firstServiceYear ? `Listed since ${member.firstServiceYear}` : "First term unknown";
    return {rows,latest,stats,totalReceipts,years};
  }

  function renderCoreCharts(member, bulkMember, ctx){
    const rows = ctx.rows;
    const cycleCanvas = $("cycleChart");
    if(cycleCanvas && window.Chart && rows.length){
      destroyChart(cycleCanvas);
      charts.set(cycleCanvas,new Chart(cycleCanvas,{type:"bar",data:{labels:rows.map(r=>r.cycle),datasets:[{label:"Receipts",data:rows.map(r=>number(r.receipts)),backgroundColor:"rgba(89,199,255,.76)",borderRadius:5},{label:"Spending",data:rows.map(r=>number(r.spent)),backgroundColor:"rgba(230,255,98,.72)",borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${money(c.raw)}`}}},scales:{y:{beginAtZero:true,ticks:{callback:v=>compactMoney(v)}}}}}));
    }
    const latest = ctx.latest;
    const pieces = [
      {name:"Individuals",amount:number(latest.individual)},
      {name:"PAC / other committees",amount:number(latest.pac)},
      {name:"Party committees",amount:number(latest.party)},
      {name:"Candidate",amount:number(latest.candidate)}
    ];
    const known = pieces.reduce((s,r)=>s+r.amount,0);
    const other = Math.max(0,number(latest.receipts_raw)-known);
    if(other>0) pieces.push({name:"Other receipts / loans",amount:other});
    doughnut($("mixChart"),pieces.filter(r=>r.amount>0));
    $("mixLegend").innerHTML = pieces.filter(r=>r.amount>0).map((r,i)=>`<span><i style="background:${COLORS[i%COLORS.length]}"></i>${esc(r.name)} ${money(r.amount)}</span>`).join("");
    horizontalBar($("employerChart"),(bulkMember.employers||[]).slice(0,10),"Itemized contribution amount");
  }

  function renderComparison(member, ctx){
    const maxAge = Math.max(90,member.age||0,ctx.stats.chamberAverage,ctx.stats.congressAverage);
    const years = ctx.years||0;
    const first = Math.max(1970,member.firstServiceYear||new Date().getFullYear());
    const longest = Math.max(1,new Date().getFullYear()-first);
    $("comparison").innerHTML = [
      ["Member age",member.age||0,maxAge,"years"],
      [`${member.chamber} avg`,ctx.stats.chamberAverage,maxAge,"years"],
      ["Congress avg",ctx.stats.congressAverage,maxAge,"years"],
      ["Approx. service",years,Math.max(50,longest),"years"]
    ].map(([label,value,max,unit])=>`<div class="compare-row"><label>${esc(label)}</label><div class="track"><div class="fill" style="width:${Math.min(100,number(value)/max*100)}%"></div></div><strong>${number(value).toFixed(label.includes("avg")?1:0)} ${unit}</strong></div>`).join("");
  }

  function renderDetails(member, bulkMember, ctx){
    const rows = ctx.rows;
    const latest = ctx.latest;
    const spent = rows.reduce((s,r)=>s+number(r.spent),0);
    const employerTotal = (bulkMember.employers||[]).reduce((s,r)=>s+number(r.amount),0);
    const pacTotal = (bulkMember.pacs||[]).reduce((s,r)=>s+number(r.amount),0);
    const detail = [
      ["Service-era receipts",money(ctx.totalReceipts),`${rows.length} bulk cycles`],
      ["Service-era spending",money(spent),`${rows.length} bulk cycles`],
      ["Receipts minus spending",money(ctx.totalReceipts-spent),"Simple cash-flow comparison"],
      ["Latest individual contributions",money(latest.individual),`${latest.cycle||"Latest"} candidate summary`],
      ["Latest PAC / committee contributions",money(latest.pac),`${latest.cycle||"Latest"} candidate summary`],
      ["Latest party contributions",money(latest.party),`${latest.cycle||"Latest"} candidate summary`],
      ["Current-cycle employer sample",money(employerTotal),`${(bulkMember.employers||[]).length} employer groups`],
      ["Current-cycle direct PAC sample",money(pacTotal),`${(bulkMember.pacs||[]).length} committee groups`],
      ["Cash on hand",money(latest.cash),"Latest candidate summary"],
      ["Debt",money(latest.debt),"Latest candidate summary"],
      ["Spend / receipts",latest.receipts?pct(latest.spent/latest.receipts*100):"-","Latest cycle"],
      ["Coverage through",latest.coverage_end||"Not reported","FEC summary coverage"]
    ];
    $("detailStats").innerHTML = detail.map(([l,v,s])=>`<div class="detail-stat"><span>${esc(l)}</span><strong>${esc(v)}</strong><small>${esc(s)}</small></div>`).join("");

    $("cycleRows").innerHTML = rows.slice().reverse().map(r=>`<tr><td>${esc(r.cycle)}</td><td>${money(r.receipts)}</td><td>${money(r.spent)}</td><td>${money(r.individual)}</td><td>${money(r.pac)}</td><td>${money(r.cash)}</td><td>${money(r.debt)}</td><td>${r.receipts?pct(r.spent/r.receipts*100):"-"}</td></tr>`).join("") || `<tr><td colspan="8">No candidate-summary cycles were matched.</td></tr>`;

    $("employerList").innerHTML = `<div class="empty">Moved to the expandable sponsor explorer above.</div>`;
    $("pacList").innerHTML = `<div class="empty">Moved to the expandable sponsor explorer above.</div>`;

    const info = [
      ["Current seat",seat(member)],["Party",member.party],["Birthday",`${niceDate(member.birthday)} · age ${member.age??"unknown"}`],
      ["In Congress since",member.firstServiceYear||"Unknown"],["Approx. years served",ctx.years??"Unknown"],["Roster terms",member.termCount||"Unknown"],
      [member.chamber==="Senate"?"Senate class":"Chamber",member.chamber==="Senate"?(member.senateClass||"Unknown"):member.chamber],
      ["Office phone",member.phone||"Not listed"],["Bioguide ID",member.id],["FEC candidate IDs",(bulkMember.all_candidate_ids||member.fecIds||[]).join(", ")||"Not listed"],
      ["Finance coverage",rows.length?`${rows[0].cycle}-${rows.at(-1).cycle}`:"No matched cycles"],["Current sponsor cycle",bulkMember.finance_coverage_end||"Current"]
    ];
    $("memberDetails").innerHTML = info.map(([l,v])=>`<div class="info-item"><span>${esc(l)}</span><strong>${esc(v)}</strong></div>`).join("");

    const links = [];
    if(member.website) links.push(["Official congressional site",member.website]);
    const fec = (bulkMember.all_candidate_ids||member.fecIds||[]).at(-1);
    if(fec) links.push(["FEC candidate profile",`https://www.fec.gov/data/candidate/${encodeURIComponent(fec)}/`]);
    if(member.opensecrets) links.push(["OpenSecrets career profile",`https://www.opensecrets.org/members-of-congress/summary?cid=${encodeURIComponent(member.opensecrets)}&cycle=CAREER`]);
    links.push(["Congressional Bioguide",`https://bioguide.congress.gov/search/bio/${encodeURIComponent(member.id)}`]);
    links.push(["FEC bulk data","https://www.fec.gov/data/browse-data/?tab=bulk-data"]);
    $("sourceLinks").innerHTML = links.map(([name,url])=>`<a class="source-link" href="${esc(url)}" target="_blank" rel="noreferrer">${esc(name)} ↗</a>`).join("");

    $("lobbyingLinks").innerHTML = (bulkMember.employers||[]).slice(0,10).map(r=>{
      const url = new URL("https://lda.gov/filings/public/filing/search/");
      url.searchParams.set("client_name",r.name||"");
      return `<div class="lobby-row"><strong>${esc(r.name)}</strong><a href="${esc(url.toString())}" target="_blank" rel="noreferrer">Search LDA ↗</a></div>`;
    }).join("") || `<div class="empty">No employer groups available for lobbying lookups.</div>`;
  }

  function wrapCollapsed(element,title,subtitle){
    if(!element || element.dataset.bdWrapped==="1") return null;
    element.dataset.bdWrapped="1";
    const details = document.createElement("details");
    details.className = "panel bd-collapse";
    details.innerHTML = `<summary><span><strong>${esc(title)}</strong><small>${esc(subtitle)}</small></span><b>Expand</b></summary>`;
    element.before(details);
    element.classList.add("bd-collapse-inner");
    element.classList.remove("panel");
    details.append(element);
    return details;
  }

  function organizePage(){
    const priority = $("priorityDonationCharts");
    const sponsor = $("sponsorInsightsPanel");
    if(priority && sponsor && priority.nextElementSibling !== sponsor) priority.after(sponsor);
    if(sponsor){
      sponsor.querySelectorAll(".si-analytics,.si-list-block,.si-company").forEach(d=>{ d.open=false; });
    }
    const cycleGrid = $("cycleChart")?.closest(".grid.two");
    if(cycleGrid) cycleGrid.classList.add("bd-cycle-grid");
    const contextGrid = $("employerChart")?.closest(".grid.two");
    if(contextGrid) wrapCollapsed(contextGrid,"Additional context charts","Employer ranking and age/service comparison");
    wrapCollapsed(document.querySelector(".detail-panel"),"Detailed finance statistics","Ratios, totals, debt, cash and cycle-level metrics");
    const legacyLists = $("employerList")?.closest(".grid.two");
    if(legacyLists) legacyLists.hidden = true;
    wrapCollapsed(document.querySelector(".table-panel"),"Election-cycle ledger","Open the complete receipts, spending, cash and debt table");
    const detailsGrid = $("memberDetails")?.closest(".grid.two");
    if(detailsGrid) wrapCollapsed(detailsGrid,"Office, service and lobbying context","Member metadata and federal LDA lookup links");
    wrapCollapsed(document.querySelector(".source-panel"),"Sources and methodology","Underlying records, caveats and definitions");
    const track = $("trackAipacPanel");
    if(track && !track.closest(".bd-collapse")) wrapCollapsed(track,"AIPAC / pro-Israel influence","Track AIPAC data and methodology");
  }

  function watchDynamicPanels(){
    const observer = new MutationObserver(()=>organizePage());
    observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),30000);
  }

  function setReady(snapshot){
    $("dataStatus").textContent = "Bulk data loaded";
    $("dataStatusSub").textContent = `FEC cycle ${snapshot.cycle} · nightly bulk snapshot`;
    $("errorPanel").hidden = true;
  }

  async function init(){
    const id = decodeURIComponent(queryId());
    if(!id) throw new Error("No member ID was provided. Open a member from the chamber map first.");
    $("dataStatus").textContent = "Loading bulk data";
    $("dataStatusSub").textContent = "FEC + congressional roster";
    const [snapshot,rawRoster] = await Promise.all([json(DATA_URL),json(ROSTER_URL)]);
    const roster = rawRoster.map(normalizeRoster).filter(x=>x.id);
    const member = roster.find(x=>x.id===id);
    const bulkMember = snapshot.members?.[id];
    if(!member) throw new Error(`Member ${id} was not found in the current congressional roster.`);
    if(!bulkMember) throw new Error(`No FEC bulk snapshot was generated for ${member.name}.`);
    renderHero(member);
    const ctx = renderHeadline(member,bulkMember,roster);
    renderCoreCharts(member,bulkMember,ctx);
    renderComparison(member,ctx);
    renderDetails(member,bulkMember,ctx);
    addPriorityCharts(snapshot,bulkMember);
    organizePage();
    watchDynamicPanels();
    setReady(snapshot);
    $("copyLink")?.addEventListener("click",async()=>{
      try{await navigator.clipboard.writeText(location.href);$("copyLink").textContent="Copied";setTimeout(()=>$("copyLink").textContent="Copy profile link",1200);}catch{$("copyLink").textContent="Copy failed";}
    });
  }

  init().catch(error=>{
    $("errorPanel").hidden=false;
    $("errorText").textContent=error?.message||String(error);
    $("dataStatus").textContent="Load failed";
    $("dataStatusSub").textContent="Bulk profile snapshot";
  });
})();
