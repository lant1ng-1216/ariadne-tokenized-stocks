import assert from "node:assert/strict";
const base="http://localhost:3000";
async function json(path){const response=await fetch(base+path);assert.equal(response.status,200,path);return response.json();}
const catalog=await json("/api/catalog?chainId=56&limit=100");
assert.equal(catalog.mode,"demo");
assert.equal(catalog.view.items.length,10);
assert.equal(catalog.view.summary.distinctTickerValues,7);
assert.equal(catalog.view.boundary.signatureRequested,false);
assert.equal(catalog.view.boundary.broadcastAttempted,false);
const filtered=await json("/api/catalog?query=NVDA&platformId=bstock");
assert.equal(filtered.view.items.length,1);
assert.equal(filtered.view.items[0].token.symbol,"NVDAB");
const empty=await json("/api/catalog?query=not-a-real-company");
assert.equal(empty.view.items.length,0);
const paged=await json("/api/catalog?offset=3&limit=2");
assert.equal(paged.view.items.length,2);
assert.equal(paged.view.pagination.hasMore,true);
const research=await json("/api/asset-research?query=NVDA");
assert.equal(research.view.representations.length,2);
assert.equal(research.view.boundary.transactionCreated,false);
assert.ok(research.view.representations.some(r=>r.evidence.warnings.length>0));
const uncovered=await json("/api/asset-research?query=AAPL");
assert.equal(uncovered.view.representations.length,0);
assert.equal((await fetch(base+"/api/catalog",{method:"POST"})).status,405);
for(const route of ["/","/assets","/assets/NVDA","/assets/AAPL","/developers","/docs","/docs/sdk","/docs/mcp","/docs/data","/docs/safety","/docs/errors"]){
 const response=await fetch(base+route+"?lang=zh");assert.equal(response.status,200,route);
}
assert.equal((await fetch(base+"/docs/not-a-chapter")).status,404);
console.log("PASS: directory, filters, pagination, empty results, research coverage, read-only boundaries, routes and 404.");
