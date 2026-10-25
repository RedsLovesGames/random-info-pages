import { DEFAULTS, computeRankings, formatCoins } from "./calculator.mjs";

const RECIPE_URLS = [
  "https://raw.githubusercontent.com/Campionnn/SkyShards/master/public/fusion-data.json",
  "https://cdn.jsdelivr.net/gh/Campionnn/SkyShards@master/public/fusion-data.json",
];
const MARKET_URL = "https://api.hypixel.net/v2/skyblock/bazaar";
const UPDATE_MS = 120000;
const $ = id => document.getElementById(id);
const state = { fusion: null, market: null, result: null, selected: null, loading: false, lastGood: 0 };
const escapeHTML = text => String(text ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const number = value => Number.isFinite(value) ? Math.round(value).toLocaleString("en-US") : "—";
const signedCoins = value => (value > 0 ? "+" : "") + formatCoins(value);
const dollar = value => formatCoins(value) + " coins";

async function getJson(url) {
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 25000);
  try {
    const response = await fetch(url, { signal: abort.signal, cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function recipes() {
  if (state.fusion) return state.fusion;
  let error;
  for (const url of RECIPE_URLS) {
    try {
      const data = await getJson(url);
      if (!data?.shards || !data?.recipes || Object.keys(data.shards).length < 100) throw new Error("Incomplete recipe file");
      state.fusion = data;
      return data;
    } catch (caught) { error = caught; }
  }
  throw new Error("SkyShards recipe file unavailable: " + (error?.message || "unknown error"));
}

function settings() {
  return {
    ...DEFAULTS,
    marketShare: Number($("share").value) / 100,
    secondsPerFusion: Number($("speed").value),
    taxRate: Number($("tax").value),
    minWeeklySales: Number($("volume").value),
    chains: $("chains").checked,
    sellMode: $("sell").value,
  };
}

function status(label, kind, note) {
  $("statusText").textContent = label;
  $("statusDot").className = "dot " + kind;
  $("statusNote").textContent = note;
}

async function refresh() {
  if (state.loading) return;
  state.loading = true;
  $("refresh").disabled = true;
  status("Loading market…", "", "Fetching SkyShards recipes and public Hypixel Bazaar prices.");
  try {
    const [fusion, market] = await Promise.all([recipes(), getJson(MARKET_URL)]);
    if (!market?.success || !market?.products || Object.keys(market.products).length < 100) throw new Error("Hypixel returned incomplete market data");
    state.fusion = fusion;
    state.market = market;
    state.lastGood = Date.now();
    const stamp = Number(market.lastUpdated);
    const apiTime = stamp > 0 ? new Date(stamp) : new Date();
    status("Market connected", "ok", "Hypixel update: " + apiTime.toLocaleString() + " · refreshed automatically every 2 minutes.");
    render();
  } catch (error) {
    if (state.market) {
      status("Using older prices", "error", "Refresh failed: " + error.message + ". Snapshot from " + new Date(state.lastGood).toLocaleTimeString() + ".");
    } else {
      status("Market unavailable", "error", error.message + ". Retry below; no invented prices are shown.");
      $("rows").innerHTML = '<tr><td colspan="6" class="empty">Could not load live prices or recipes. Select “Refresh market now” to retry.</td></tr>';
    }
  } finally {
    state.loading = false;
    $("refresh").disabled = false;
  }
}

function visibleRows() {
  if (!state.result) return [];
  const needle = $("search").value.trim().toLowerCase();
  const onlySafe = $("hideRisky").checked;
  const rows = state.result.rows.filter(row => {
    if (onlySafe && row.risky) return false;
    if (!needle) return true;
    return [row.name, state.fusion.shards[row.inputA]?.name, state.fusion.shards[row.inputB]?.name].some(x => String(x || "").toLowerCase().includes(needle));
  });
  const key = $("sort").value;
  rows.sort((a, b) => (b[key] || 0) - (a[key] || 0));
  return rows;
}

function render() {
  if (!state.fusion || !state.market) return;
  const config = settings();
  $("shareOut").textContent = Math.round(config.marketShare * 100) + "%";
  $("speedOut").textContent = config.secondsPerFusion + "s";
  state.result = computeRankings(state.fusion, state.market, config);
  $("pathCount").textContent = number(state.result.examined);
  $("shardCount").textContent = number(state.result.covered);
  const qualifying = state.result.rows.filter(r => !r.risky);
  $("liquidCount").textContent = number(qualifying.length);
  const rows = visibleRows();
  $("bestProfit").textContent = rows.length ? formatCoins(Math.max(...rows.map(r => r.profitPerHour))) : "—";
  $("resultCount").textContent = number(rows.length) + " qualifying outputs";
  const body = $("rows");
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="6" class="empty">No profitable fusions match these filters. Try lowering the volume threshold or displaying risky markets.</td></tr>';
  } else {
    body.innerHTML = rows.slice(0, 100).map((row, index) => {
      const selected = row.id === state.selected;
      return '<tr data-id="' + escapeHTML(row.id) + '" aria-selected="' + selected + '">' +
        '<td><span class="rank">' + String(index + 1).padStart(2, "0") + '</span><button type="button" data-select="' + escapeHTML(row.id) + '" class="name" style="border:0;background:none;padding:0;text-align:left;cursor:pointer">' + escapeHTML(row.name) + '</button>' + (row.risky ? '<span class="tag risk">Watch</span>' : '') +
        '<div class="minor">' + number(row.outputQty) + ' output · ' + (row.steps > 1 ? "Chain" : "Direct") + '</div></td>' +
        '<td class="amount">' + formatCoins(row.cost) + '</td>' +
        '<td class="amount good">' + signedCoins(row.profit) + '</td>' +
        '<td class="amount good">' + formatCoins(row.profitPerHour) + '</td>' +
        '<td class="amount">' + number(row.weeklySales) + '</td>' +
        '<td class="amount">' + (100 * row.roi).toFixed(1) + '%</td></tr>';
    }).join("");
  }
  if (state.selected && rows.some(r => r.id === state.selected)) {
    detail(rows.find(r => r.id === state.selected));
  } else {
    $("details").hidden = true;
  }
}

function inputText(id, quantity, plan) {
  const shard = state.fusion.shards[id];
  const label = escapeHTML(shard?.name || id);
  if (plan.method !== "fusion") return label + " × " + quantity + " <span class='muted'>(instant buy)</span>";
  const left = state.fusion.shards[plan.inputA];
  const right = state.fusion.shards[plan.inputB];
  return label + " × " + quantity + " <span class='muted'>(prefuse " +
    escapeHTML(left?.name || plan.inputA) + " × " + plan.inputQtyA + " + " +
    escapeHTML(right?.name || plan.inputB) + " × " + plan.inputQtyB +
    " → " + plan.outputQty + " " + label + ", amortized)</span>";
}

function detail(row) {
  $("details").hidden = false;
  const elem = $("details");
  elem.innerHTML = '<div class="details-head"><div><div class="mono kicker">Selected route / ' + escapeHTML(row.id) + '</div><h3>' + escapeHTML(row.name) + '</h3><span class="mono muted">' +
      number(row.outputQty) + ' output per final fusion · ' + row.steps.toFixed(2) + ' estimated machine actions</span></div>' +
    '<a class="external" href="https://skyshards.com/" target="_blank" rel="noopener noreferrer">Open SkyShards ↗</a></div>' +
    '<div class="details-grid">' +
      '<div class="detail-metric"><span class="mono muted">Estimated / hour</span><b class="good">' + formatCoins(row.profitPerHour) + '</b></div>' +
      '<div class="detail-metric"><span class="mono muted">Profit / final fusion</span><b>' + signedCoins(row.profit) + '</b></div>' +
      '<div class="detail-metric"><span class="mono muted">Input investment</span><b>' + formatCoins(row.cost) + '</b></div>' +
      '<div class="detail-metric"><span class="mono muted">Market sales / hour</span><b>' + (row.weeklySales / 168).toFixed(1) + '</b></div>' +
      '<div class="detail-metric"><span class="mono muted">Your modeled sales / hour</span><b>' + row.outputPerHour.toFixed(2) + '</b></div>' +
      '<div class="detail-metric"><span class="mono muted">Instant-sell alternative</span><b class="' + (row.instantProfit >= 0 ? 'good' : 'bad') + '">' + signedCoins(row.instantProfit) + '</b></div>' +
    '</div><div class="steps"><div class="mono muted">Recipe &amp; purchase plan</div>' +
      '<div class="step"><span>1 / ' + inputText(row.inputA, row.nA, row.planA) + '</span></div>' +
      '<div class="step"><span>2 / ' + inputText(row.inputB, row.nB, row.planB) + '</span></div>' +
      '<div class="step"><strong>Fuse for ' + row.outputQty + ' × ' + escapeHTML(row.name) + '</strong><span class="amount">' + dollar(row.cost) + '</span></div>' +
      '<div class="step"><span>Sell-side quote (' + escapeHTML($("sell").selectedOptions[0].text) + ')</span><strong>' + dollar(row.price) + ' / output</strong></div>' +
    '</div><p>' + (row.risky ? '<strong class="warning">Market warning:</strong> the spread is large or the weekly volume is below your threshold. ' : '') +
    'Liquidity numbers are inferred from rolling counters; order priority, competition, slippage, and leftover intermediate shards are not measured.' +
    ' This calculation assumes stable market prices and the selected fraction of weekly buyer demand.</p>';
}

$("rows").addEventListener("click", event => {
  const target = event.target.closest("[data-select]");
  if (!target) return;
  state.selected = target.dataset.select;
  render();
  $("details").scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "nearest" });
});
$("refresh").addEventListener("click", refresh);
for (const id of ["share", "speed", "tax", "sell", "volume", "chains", "hideRisky", "search", "sort"]) {
  $(id).addEventListener(["share","speed","search"].includes(id) ? "input" : "change", render);
}
refresh();
setInterval(() => { if (!document.hidden) refresh(); }, UPDATE_MS);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && Date.now() - state.lastGood > UPDATE_MS) refresh();
});
