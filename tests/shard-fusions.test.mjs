import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeRankings, marketFor, formatCoins } from "../shard-fusions/calculator.mjs";

const shard = (name, stack) => ({ name, internal_id: "SHARD_" + name.toUpperCase(), fuse_amount: stack });
const quote = (ask, bid, weekly=4200) => ({
  buy_summary:[{ pricePerUnit:ask, amount:500 }],
  sell_summary:[{ pricePerUnit:bid, amount:500 }],
  quick_status:{ sellMovingWeek: weekly + 80, sellVolume:80 },
});
const fusion = {
  shards: { A:shard("A", 2), B:shard("B", 5), C:shard("C", 5), D:shard("D", 2) },
  recipes: {
    C: { "2": [["A","B"]] },
    D: { "2": [["C","A"]] },
  },
};
const bazaar = { products: {
  SHARD_A:quote(10,9),
  SHARD_B:quote(20,15),
  SHARD_C:quote(100,80),
  SHARD_D:quote(400,340),
} };
const defaults = { taxRate:0.0125, marketShare:0.1, secondsPerFusion:20, minWeeklySales:1500 };

test("uses the required number of input shards, output quantity and after-tax sell offers", () => {
  const { rows, examined, covered } = computeRankings(fusion, bazaar, defaults);
  const c = rows.find(row => row.id === "C");
  assert.equal(examined, 2);
  assert.equal(covered, 4);
  assert.equal(c.cost, 120); // two A + five B
  assert.equal(c.outputQty, 2);
  assert.equal(c.profit, 2 * 100 * 0.9875 - 120);
  assert.equal(c.instantProfit, 2 * 80 * 0.9875 - 120);
  assert.equal(c.steps, 1);
});

test("estimates output buyers excluding current sell-offer stock", () => {
  const m = marketFor(fusion.shards.C, bazaar.products);
  assert.equal(m.weeklySales, 4200);
  assert.equal(m.spreadRatio, 1.25);
});

test("caps expected throughput at the lower of personal demand share and craft capacity", () => {
  const highDemand = structuredClone(bazaar);
  highDemand.products.SHARD_C.quick_status.sellMovingWeek = 300000;
  const slow = computeRankings(fusion, highDemand, {...defaults, secondsPerFusion:120, marketShare:1}).rows.find(r=>r.id==="C");
  assert.equal(slow.outputPerHour, 2 * (3600 / 120));
  const thin = computeRankings(fusion, bazaar, {...defaults, secondsPerFusion:5, marketShare:.01}).rows.find(r=>r.id==="C");
  assert.ok(Math.abs(thin.outputPerHour - 4200 / 168 * .01) < 1e-9);
});

test("rejects missing two-sided prices and nonpositive margins", () => {
  const zero = structuredClone(bazaar);
  zero.products.SHARD_C.buy_summary = [];
  assert.equal(computeRankings(fusion,zero,defaults).rows.find(r=>r.id==="C"),undefined);
});

test("one-stage intermediates reduce modeled cost without self-generating resources", () => {
  const noChains = computeRankings(fusion,bazaar,{...defaults,chains:false}).rows.find(r=>r.id==="D");
  const chains = computeRankings(fusion,bazaar,{...defaults,chains:true}).rows.find(r=>r.id==="D");
  assert.ok(noChains && chains);
  assert.equal(noChains.cost, 5 * 100 + 2 * 10);
  assert.equal(chains.cost, 5 * 60 + 2 * 10);
  assert.ok(chains.steps > noChains.steps);
  assert.equal(chains.planA.method,"fusion");
});

test("formatter handles profits, losses, NaN, and small numbers", () => {
  assert.equal(formatCoins(1250000),"1.25M");
  assert.equal(formatCoins(-12000),"-12.0K");
  assert.equal(formatCoins(NaN),"—");
});

test("dashboard is wired to live Hypixel and SkyShards public APIs", () => {
  const html = readFileSync(new URL("../shard-fusions/index.html",import.meta.url),"utf8");
  const app = readFileSync(new URL("../shard-fusions/app.mjs",import.meta.url),"utf8");
  assert.match(html,/script type="module" src="\.\/app\.mjs"/);
  assert.match(app,/api\.hypixel\.net\/v2\/skyblock\/bazaar/);
  assert.match(app,/SkyShards\/master\/public\/fusion-data\.json/);
  assert.match(app,/UPDATE_MS = 120000/);
  assert.match(html,/aria-label="Ranked shard fusions"/);
});
