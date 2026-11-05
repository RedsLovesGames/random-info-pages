import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const file=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("midterm dashboard is a standalone accessible page registered in homepage",()=>{
 const html=file("midterm-2026/index.html"),home=file("index.html");
 assert.match(html,/id="layerButtons"/);assert.match(html,/id="mapContainer"/);
 assert.match(html,/id="ledgerRows"/);assert.match(html,/src="\.\/app\.js"/);
 assert.match(home,/\.\/midterm-2026\//);
});
test("state map geometry includes 50 states plus DC and PR",()=>{
 const svg=file("midterm-2026/us-states.svg");
 const codes=[...svg.matchAll(/data-state="([A-Z]{2})"/g)].map(x=>x[1]);
 assert.equal(codes.length,52);assert.equal(new Set(codes).size,52);
 for(const x of ["AK","HI","PA","TX","DC","PR"])assert.ok(codes.includes(x));
});
test("snapshot records include tracked categories, source links, caveats, and no live-result claim",()=>{
 const js=file("midterm-2026/app.js"),html=file("midterm-2026/index.html");
 for(const x of ["HOUSE=","JoAnna Mendoza","Josh Turek","Aaron Ford","State Senate","trifecta","pending","SOURCES","Export CSV"]) assert.ok((js+html).includes(x),x);
 assert.match(html,/not a live election feed/);assert.match(html,/28 identifiable called flips/);assert.match(html,/30/);
});
