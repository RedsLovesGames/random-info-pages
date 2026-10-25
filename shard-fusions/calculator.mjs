// Pure shard-fusion market model. Uses SkyShards' public fusion-data.json graph.
// Prices are snapshots, not executable guaranteed quotes.
export const DEFAULTS = Object.freeze({
  marketShare: 0.10,
  secondsPerFusion: 20,
  taxRate: 0.0125,
  minWeeklySales: 1500,
  maxSpreadRatio: 1.8,
  chains: false,
  sellMode: "offer",
});

const positive = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0;

export function marketFor(shard, products) {
  const product = products?.[shard?.internal_id];
  if (!product) return null;
  // Hypixel buy_summary lists available sell offers (instant-buy side).
  // sell_summary lists standing buy orders (instant-sell side).
  const ask = positive(product.buy_summary?.[0]?.pricePerUnit);
  const bid = positive(product.sell_summary?.[0]?.pricePerUnit);
  const status = product.quick_status || {};
  // Hypixel's rolling counter includes remaining orders; subtract live stock.
  // This is a volume proxy, NOT measured personal order fills.
  const weeklySales = Math.max(0, positive(status.sellMovingWeek) - positive(status.sellVolume));
  return { ask, bid, weeklySales, spreadRatio: bid ? ask / bid : Infinity };
}

function eachRecipe(data, visit) {
  for (const [outputId, byQuantity] of Object.entries(data?.recipes || {})) {
    for (const [quantityText, pairs] of Object.entries(byQuantity || {})) {
      const quantity = Number(quantityText);
      if (!Number.isInteger(quantity) || quantity <= 0 || !Array.isArray(pairs)) continue;
      for (const pair of pairs) {
        if (Array.isArray(pair) && pair.length === 2) visit(outputId, quantity, pair[0], pair[1]);
      }
    }
  }
}

export function computeRankings(fusion, bazaar, options = {}) {
  const config = { ...DEFAULTS, ...options };
  const shards = fusion?.shards || {};
  const products = bazaar?.products || {};
  const markets = {};
  const costs = {};
  for (const [id, shard] of Object.entries(shards)) {
    markets[id] = marketFor(shard, products);
    if (markets[id]?.ask) costs[id] = { unit: markets[id].ask, method: "buy", extraCrafts: 0 };
  }

  // One optional intermediary fusion. Its average-unit cost assumes quantities
  // can be amortized across batches; individual crafts can leave surplus.
  if (config.chains) {
    const cheaper = { ...costs };
    eachRecipe(fusion, (out, qty, a, b) => {
      const sa = shards[a], sb = shards[b];
      const ca = costs[a]?.unit, cb = costs[b]?.unit;
      if (!sa || !sb || !ca || !cb) return;
      const nA = positive(sa.fuse_amount), nB = positive(sb.fuse_amount);
      if (!nA || !nB) return;
      const unit = (nA * ca + nB * cb) / qty;
      if (unit < (cheaper[out]?.unit ?? Infinity)) {
        cheaper[out] = { unit, method: "fusion", extraCrafts: 1 / qty, inputA: a, inputB: b, inputQtyA: nA, inputQtyB: nB, outputQty: qty };
      }
    });
    Object.assign(costs, cheaper);
  }

  const selected = new Map();
  let examined = 0;
  eachRecipe(fusion, (out, qty, a, b) => {
    examined++;
    const sa = shards[a], sb = shards[b], so = shards[out];
    const ca = costs[a], cb = costs[b], market = markets[out];
    if (!sa || !sb || !so || !ca || !cb || !market?.ask || !market?.bid) return;
    const nA = positive(sa.fuse_amount), nB = positive(sb.fuse_amount);
    if (!nA || !nB) return;
    const cost = nA * ca.unit + nB * cb.unit;
    const price = config.sellMode === "instant" ? market.bid : market.ask;
    const afterTaxRevenue = qty * price * (1 - config.taxRate);
    const profit = afterTaxRevenue - cost;
    if (profit <= 0 || !Number.isFinite(profit)) return;
    const steps = 1 + nA * (ca.extraCrafts || 0) + nB * (cb.extraCrafts || 0);
    const craftOutputPerHour = (3600 / config.secondsPerFusion / steps) * qty;
    const marketOutputPerHour = (market.weeklySales / 168) * config.marketShare;
    const outputPerHour = Math.min(craftOutputPerHour, marketOutputPerHour);
    const profitPerHour = outputPerHour * profit / qty;
    const risky = market.spreadRatio > config.maxSpreadRatio || market.weeklySales < config.minWeeklySales;
    const entry = {
      id: out, name: so.name, rarity: so.rarity, category: so.type,
      outputQty: qty, inputA: a, inputB: b, nA, nB, planA: ca, planB: cb,
      steps, cost, profit, instantProfit: qty * market.bid * (1 - config.taxRate) - cost,
      roi: cost ? profit / cost : 0,
      price, spreadRatio: market.spreadRatio, weeklySales: market.weeklySales,
      outputPerHour, profitPerHour, risky, marketPriceAsk: market.ask, marketPriceBid: market.bid,
    };
    if (!selected.has(out) || entry.profitPerHour > selected.get(out).profitPerHour) selected.set(out, entry);
  });
  return {
    rows: [...selected.values()].sort((a, b) => b.profitPerHour - a.profitPerHour),
    examined,
    covered: Object.keys(markets).filter(k => markets[k]?.ask && markets[k]?.bid).length,
  };
}

export function formatCoins(value) {
  if (!Number.isFinite(value)) return "—";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
  if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
  if (abs >= 1000) return sign + (abs / 1000).toFixed(1) + "K";
  return sign + Math.round(abs).toLocaleString("en-US");
}
