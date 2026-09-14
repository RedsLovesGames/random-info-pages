(() => {
  "use strict";

  const DATA_URL = "./fec-sponsors.json";
  const charts = new Map();
  const partyColors = {
    "Democrat": "#4f8dff",
    "Republican": "#ff5c65",
    "Independent / other": "#b77cff"
  };

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[c]);
  const norm = s => String(s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
  const money = v => {
    const n = Number(v);
    return Number.isFinite(n)
      ? new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n)
      : "Not shown";
  };
  const pct = v => Number.isFinite(Number(v)) ? `${Number(v).toFixed(1)}%` : "—";
  const compactMoney = v => {
    const n=Number(v);
    return Number.isFinite(n)
      ? new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",notation:"compact",maximumFractionDigits:1}).format(n)
      : "—";
  };
  const queryId = () => new URLSearchParams(location.search).get("id") || location.hash.replace(/^#member=/,"");

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

  function memberSeat(r){
    if(r.chamber==="Senate") return `${r.state} senator`;
    if(Number(r.district)===0) return `${r.state} at-large`;
    return `${r.state}-${r.district}`;
  }

  function sourceUrl(type,row,cycle){
    if(type==="pac" && row.committee_id){
      return `https://www.fec.gov/data/committee/${encodeURIComponent(row.committee_id)}/?cycle=${encodeURIComponent(cycle)}`;
    }
    if(type==="employer"){
      const u=new URL("https://www.fec.gov/data/receipts/individual-contributions/");
      u.searchParams.set("two_year_transaction_period",cycle);
      u.searchParams.set("contributor_employer",row.name||"");
      return u.toString();
    }
    return "https://www.fec.gov/data/";
  }

  function summaryMetrics(profile,thisAmount){
    const total=Number(profile?.total)||0;
    const recipients=Number(profile?.recipient_count)||0;
    const tx=Number(profile?.transaction_count)||0;
    const share=total>0?(Number(thisAmount)||0)/total*100:0;
    const avg=recipients?total/recipients:0;
    const partyTotals=profile?.party_totals||{};
    const partySorted=Object.entries(partyTotals).sort((a,b)=>Number(b[1])-Number(a[1]));
    const lead=partySorted[0];
    return {
      total,recipients,tx,share,avg,
      top5:Number(profile?.top5_share)||0,
      leadParty:lead?.[0]||"No party data",
      leadShare:total>0&&lead?Number(lead[1])/total*100:0
    };
  }

  function partyLegend(profile){
    const totals=profile?.party_totals||{};
    const sum=Object.values(totals).reduce((a,b)=>a+(Number(b)||0),0);
    return ["Democrat","Republican","Independent / other"].map(p=>{
      const v=Number(totals[p])||0;
      return `<span><i style="background:${partyColors[p]}"></i>${esc(p)} ${money(v)} · ${sum?pct(v/sum*100):"0.0%"}</span>`;
    }).join("");
  }

  function recipientTable(profile){
    const rows=(profile?.top_recipients||[]).slice(0,12);
    if(!rows.length) return `<div class="si-empty">No recipient breakdown is available for this sponsor.</div>`;
    return `<div class="si-recipient-table">
      ${rows.map((r,i)=>`<a class="si-recipient-row" href="./?id=${encodeURIComponent(r.bioguide)}">
        <span class="si-recipient-rank">${i+1}</span>
        <span class="si-recipient-person"><strong>${esc(r.name)}</strong><small>${esc(r.party)} · ${esc(memberSeat(r))}</small></span>
        <span class="si-recipient-money">${money(r.amount)}<small>${Number(r.count)||0} tx</small></span>
      </a>`).join("")}
    </div>`;
  }

  function companyDetailHtml(type,row,profile,cycle){
    if(!profile){
      return `<div class="si-company-detail"><div class="si-empty">No cycle-wide profile was generated for this row.</div></div>`;
    }
    const m=summaryMetrics(profile,row.amount);
    const label=type==="pac" ? "Direct PAC / committee support" : "Employee-grouped individual donations";
    const org=type==="pac" ? (row.connected_org||profile.connected_org||"") : "";
    const committee=type==="pac" ? (row.name||profile.name||"") : "";
    return `<div class="si-company-detail">
      <div class="si-detail-top">
        <div>
          <div class="si-detail-label">${esc(label)}</div>
          <h4>${esc(type==="pac" ? (org||committee) : row.name)}</h4>
          ${type==="pac"&&org&&committee&&org!==committee?`<p>Committee: ${esc(committee)}</p>`:""}
          ${type==="employer"?`<p>Individuals who reported <strong>${esc(row.name)}</strong> as their employer. This is not the same as a corporate contribution.</p>`:""}
        </div>
        <a class="si-source-link" href="${esc(sourceUrl(type,row,cycle))}" target="_blank" rel="noreferrer">Open FEC source ↗</a>
      </div>
      <div class="si-detail-metrics">
        <div><span>To this member</span><strong>${money(row.amount)}</strong><small>${Number(row.count)||0} disclosed transaction${Number(row.count)===1?"":"s"}</small></div>
        <div><span>Across current Congress</span><strong>${money(m.total)}</strong><small>${m.recipients} current recipients</small></div>
        <div><span>This member's share</span><strong>${pct(m.share)}</strong><small>of sponsor total to current members</small></div>
        <div><span>Average / recipient</span><strong>${money(m.avg)}</strong><small>${m.tx} disclosed transactions total</small></div>
        <div><span>Top 5 concentration</span><strong>${pct(m.top5)}</strong><small>share going to five largest recipients</small></div>
        <div><span>Largest party share</span><strong>${esc(m.leadParty)}</strong><small>${pct(m.leadShare)} of tracked amount</small></div>
      </div>
      <div class="si-detail-grid">
        <div class="si-detail-card">
          <div class="si-mini-head"><div><span>Party split</span><strong>${money(m.total)} tracked</strong></div></div>
          <div class="si-party-chart"><canvas data-party-chart></canvas></div>
          <div class="si-party-legend">${partyLegend(profile)}</div>
        </div>
        <div class="si-detail-card">
          <div class="si-mini-head"><div><span>Top congressional recipients</span><strong>${m.recipients} total</strong></div></div>
          ${recipientTable(profile)}
        </div>
      </div>
      ${type==="pac"?`<div class="si-meta-strip">
        <span>${esc(row.committee_type||profile.committee_type||"Committee")}</span>
        ${row.organization_type||profile.organization_type?`<span>${esc(row.organization_type||profile.organization_type)}</span>`:""}
        ${row.committee_id?`<span>${esc(row.committee_id)}</span>`:""}
      </div>`:""}
    </div>`;
  }

  function rowProfile(type,row,data){
    if(type==="pac") return data.committee_profiles?.[row.committee_id]||null;
    return data.employer_profiles?.[row.key]||null;
  }

  function companyRow(type,row,index,data){
    const profile=rowProfile(type,row,data);
    const display=type==="pac" ? (row.connected_org||row.name) : row.name;
    const sub=type==="pac"
      ? (row.connected_org&&row.connected_org!==row.name ? row.name : (row.committee_type||"PAC / committee"))
      : "Employees reporting this employer";
    const profileTotal=Number(profile?.total)||0;
    return `<details class="si-company" data-search="${esc(norm(`${display} ${sub} ${row.name||""} ${row.committee_id||""} ${row.organization_type||""}`))}" data-type="${type}" data-key="${esc(type==="pac"?(row.committee_id||""):(row.key||""))}">
      <summary>
        <span class="si-rank">${index+1}</span>
        <span class="si-company-name"><strong>${esc(display)}</strong><small>${esc(sub)}</small></span>
        <span class="si-company-amount"><strong>${money(row.amount)}</strong><small>${Number(row.count)||0} tx to this member</small></span>
        <span class="si-company-total"><strong>${profileTotal?compactMoney(profileTotal):"—"}</strong><small>across current Congress</small></span>
        <span class="si-chevron" aria-hidden="true">⌄</span>
      </summary>
      ${companyDetailHtml(type,row,profile,data.cycle)}
    </details>`;
  }

  function renderSponsorList(type,rows,data){
    const title=type==="pac" ? "PAC / organizational support" : "Donor employers";
    const subtitle=type==="pac"
      ? "Direct committee-to-candidate contributions. Connected organizations are shown when FEC committee metadata provides them."
      : "Itemized individual donations grouped by the employer reported by each contributor.";
    return `<details class="si-list-block" open data-list-type="${type}">
      <summary class="si-list-summary">
        <span><strong>${esc(title)}</strong><small>${esc(subtitle)}</small></span>
        <b>${rows.length} groups</b>
      </summary>
      <div class="si-list-body">
        <div class="si-list-tools">
          <input type="search" class="si-search" placeholder="Search ${type==="pac"?"company, PAC, committee, organization":"company or employer"}..." aria-label="Search ${esc(title)}">
          <div class="si-tool-buttons">
            <button type="button" data-action="expand">Expand all visible</button>
            <button type="button" data-action="collapse">Collapse rows</button>
          </div>
        </div>
        <div class="si-list-count">${rows.length} records shown</div>
        <div class="si-company-list">
          ${rows.map((r,i)=>companyRow(type,r,i,data)).join("") || `<div class="si-empty">No records available for this cycle.</div>`}
        </div>
      </div>
    </details>`;
  }

  function chartDefaults(){
    if(!window.Chart) return;
    Chart.defaults.color="#9aa5b6";
    Chart.defaults.borderColor="rgba(255,255,255,.07)";
    Chart.defaults.font.family="Manrope, system-ui, sans-serif";
  }

  function renderBarChart(canvas,rows,label){
    if(!canvas||!window.Chart||!rows?.length) return;
    const c=new Chart(canvas,{
      type:"bar",
      data:{
        labels:rows.map(x=>x.name),
        datasets:[{
          label,
          data:rows.map(x=>Number(x.amount)||0),
          backgroundColor:"rgba(89,199,255,.72)",
          borderColor:"rgba(89,199,255,1)",
          borderWidth:1,
          borderRadius:5
        }]
      },
      options:{
        indexAxis:"y",
        responsive:true,
        maintainAspectRatio:false,
        plugins:{
          legend:{display:false},
          tooltip:{callbacks:{label:ctx=>`${money(ctx.raw)} · ${rows[ctx.dataIndex]?.count||0} contributions`}}
        },
        scales:{
          x:{beginAtZero:true,ticks:{callback:v=>compactMoney(v)}},
          y:{grid:{display:false},ticks:{autoSkip:false,font:{size:9}}}
        }
      }
    });
    charts.set(canvas,c);
  }

  function renderPartyChart(details,profile){
    const canvas=details.querySelector("[data-party-chart]");
    if(!canvas||!window.Chart||charts.has(canvas)) return;
    const totals=profile?.party_totals||{};
    const labels=["Democrat","Republican","Independent / other"];
    const values=labels.map(p=>Number(totals[p])||0);
    if(!values.some(v=>v>0)) return;
    const c=new Chart(canvas,{
      type:"doughnut",
      data:{labels,datasets:[{data:values,backgroundColor:labels.map(p=>partyColors[p]),borderColor:"#101622",borderWidth:3}]},
      options:{
        responsive:true,
        maintainAspectRatio:false,
        cutout:"66%",
        plugins:{
          legend:{display:false},
          tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${money(ctx.raw)} · ${pct(ctx.raw/values.reduce((a,b)=>a+b,0)*100)}`}}
        }
      }
    });
    charts.set(canvas,c);
  }

  function wireSponsorLists(section,data){
    section.querySelectorAll(".si-list-block").forEach(block=>{
      const input=block.querySelector(".si-search");
      const rows=[...block.querySelectorAll(".si-company")];
      const count=block.querySelector(".si-list-count");
      const apply=()=>{
        const q=norm(input.value);
        let visible=0;
        rows.forEach(r=>{
          const show=!q||r.dataset.search.includes(q);
          r.hidden=!show;
          if(show) visible++;
        });
        count.textContent=`${visible} of ${rows.length} records shown`;
      };
      input.addEventListener("input",apply);
      block.querySelector('[data-action="expand"]').addEventListener("click",()=>{
        rows.filter(r=>!r.hidden).forEach(r=>{r.open=true;});
      });
      block.querySelector('[data-action="collapse"]').addEventListener("click",()=>{
        rows.forEach(r=>{r.open=false;});
      });
      rows.forEach(r=>r.addEventListener("toggle",()=>{
        if(!r.open) return;
        const type=r.dataset.type;
        const key=r.dataset.key;
        const profile=type==="pac"?data.snapshot.committee_profiles?.[key]:data.snapshot.employer_profiles?.[key];
        renderPartyChart(r,profile);
      }));
    });
  }

  function renderPanel(snapshot,member){
    document.getElementById("taSponsorPanel")?.setAttribute("hidden","");
    let section=$("sponsorInsightsPanel");
    if(!section){
      section=document.createElement("section");
      section.id="sponsorInsightsPanel";
      section.className="panel si-panel";
      const anchor=document.querySelector(".table-panel");
      if(anchor) anchor.before(section);
      else document.querySelector("main")?.append(section);
    }

    const totalEmployers=(member.employers||[]).reduce((s,x)=>s+(Number(x.amount)||0),0);
    const totalPacs=(member.pacs||[]).reduce((s,x)=>s+(Number(x.amount)||0),0);
    const topOccupation=member.occupations?.[0];
    const topSector=member.sectors?.[0];

    const data={snapshot,member,cycle:snapshot.cycle,
      employer_profiles:snapshot.employer_profiles||{},
      committee_profiles:snapshot.committee_profiles||{}};

    section.innerHTML=`
      <div class="si-head">
        <div>
          <div class="si-kicker">FEC sponsor intelligence</div>
          <h2>Companies, industries, professions & party splits</h2>
          <p>Current-cycle sponsor drill-down built from FEC bulk records. Open any company or PAC row for its party split and top congressional recipients.</p>
        </div>
        <span class="si-cycle">${esc(String(snapshot.cycle))} cycle</span>
      </div>

      <div class="si-summary-grid">
        <div><span>Displayed employer money</span><strong>${money(totalEmployers)}</strong><small>${member.employers?.length||0} employer groups</small></div>
        <div><span>Displayed direct PAC money</span><strong>${money(totalPacs)}</strong><small>${member.pacs?.length||0} PAC / committee groups</small></div>
        <div><span>Top reported profession</span><strong>${esc(topOccupation?.name||"No data")}</strong><small>${topOccupation?money(topOccupation.amount):"—"}</small></div>
        <div><span>Top classified sector</span><strong>${esc(topSector?.name||"No data")}</strong><small>${topSector?money(topSector.amount):"—"}</small></div>
      </div>

      <details class="si-analytics" open>
        <summary><span><strong>Industry & profession graphs</strong><small>Contribution amounts from itemized individual donors.</small></span><b>2 charts</b></summary>
        <div class="si-chart-grid">
          <article class="si-chart-card">
            <div class="si-chart-head"><div><span>Broad sector</span><h3>Industry / profession sector mix</h3></div><small>Heuristic classification</small></div>
            <div class="si-chart-wrap"><canvas id="siSectorChart"></canvas></div>
            <p>Broad sectors are inferred from self-reported occupation and employer keywords. They are not official FEC industry codes.</p>
          </article>
          <article class="si-chart-card">
            <div class="si-chart-head"><div><span>Reported occupation</span><h3>Top professions</h3></div><small>FEC occupation text</small></div>
            <div class="si-chart-wrap"><canvas id="siOccupationChart"></canvas></div>
            <p>Occupation labels are grouped from the text individual contributors reported to the FEC, so spelling and wording variations can create separate categories.</p>
          </article>
        </div>
      </details>

      <div class="si-sponsor-lists">
        ${renderSponsorList("pac",member.pacs||[],snapshot)}
        ${renderSponsorList("employer",member.employers||[],snapshot)}
      </div>

      <div class="si-method">
        <strong>How to read this:</strong> PAC rows are direct committee-to-candidate contributions reported in FEC committee-to-candidate data. Employer rows aggregate individual people by their self-reported employer and do not mean the employer itself donated. Party-split profiles aggregate the same current-cycle records across current members of Congress.
      </div>`;

    chartDefaults();
    renderBarChart($("siSectorChart"),(member.sectors||[]).slice(0,12),"Itemized contribution amount");
    renderBarChart($("siOccupationChart"),(member.occupations||[]).slice(0,12),"Itemized contribution amount");
    wireSponsorLists(section,data);
  }

  async function init(){
    try{
      await waitFor("#memberName");
      const id=queryId();
      if(!id) throw new Error("No member id in profile URL");
      const r=await fetch(DATA_URL,{cache:"no-store"});
      if(!r.ok) throw new Error(`Sponsor snapshot unavailable (${r.status})`);
      const snapshot=await r.json();
      const member=snapshot.members?.[id];
      if(!member) throw new Error("No sponsor snapshot entry for this member");
      renderPanel(snapshot,member);
    }catch(err){
      let section=$("sponsorInsightsPanel");
      if(!section){
        section=document.createElement("section");
        section.id="sponsorInsightsPanel";
        section.className="panel si-panel";
        document.querySelector(".table-panel")?.before(section);
      }
      if(section) section.innerHTML=`<div class="si-error">Sponsor analytics could not load: ${esc(err?.message||"unknown error")}</div>`;
    }
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();