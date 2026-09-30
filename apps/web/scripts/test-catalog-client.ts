import assert from "node:assert/strict";
import { loadAssetCatalogSnapshot } from "../src/catalog-client.js";

async function main(): Promise<void> {
const items = Array.from({ length: 1_000 }, (_, index) => ({ id: `asset-${index}` }));
const responsePayload = {
  mode: "live-readonly",
  view: {
    items,
    summary: { totalRepresentations: 1_001, distinctTickerValues: 900, issuerCount: 2, returned: 1_000 },
    pagination: { offset: 0, limit: 1_000, returned: 1_000, hasMore: true }
  }
};
let requests = 0;
let capturedUrl = "";
const controller = new AbortController();
const request = (async (input: RequestInfo | URL, init?: RequestInit) => {
  requests += 1;
  capturedUrl = String(input);
  assert.equal(init?.signal, controller.signal);
  return new Response(JSON.stringify(responsePayload), { status: 200 });
}) as typeof fetch;

const catalog = await loadAssetCatalogSnapshot<{ id: string }>(controller.signal, request);
assert.equal(requests, 1, "one browser catalog load must issue exactly one service request");
assert.equal(capturedUrl, "/api/catalog?chainId=56&limit=1000&offset=0");
assert.equal(catalog.view.items.length, 1_000);
assert.equal(catalog.view.pagination.hasMore, true, "local response cap must remain visible to the page");
assert.equal(catalog.view.summary.totalRepresentations, 1_001);

const inconsistentRequest = (async () => new Response(JSON.stringify({
  ...responsePayload,
  view: { ...responsePayload.view, pagination: { ...responsePayload.view.pagination, returned: 999 } }
}), { status: 200 })) as typeof fetch;
await assert.rejects(loadAssetCatalogSnapshot(controller.signal, inconsistentRequest), /Inconsistent asset catalog snapshot metadata/);

const unavailableRequest = (async () => new Response("{}", { status: 503 })) as typeof fetch;
await assert.rejects(loadAssetCatalogSnapshot(controller.signal, unavailableRequest), /Asset catalog unavailable/);

console.log(JSON.stringify({
  catalogRequests: requests,
  returnedRows: catalog.view.items.length,
  reportedRows: catalog.view.summary.totalRepresentations,
  partialBoundIsPreserved: catalog.view.pagination.hasMore,
  inconsistentMetadataRejected: true,
  passed: true
}, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
