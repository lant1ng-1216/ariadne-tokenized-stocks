import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const observation = JSON.parse(await readFile("records/phase26-provider-observation.json", "utf8")) as {
  requestPolicy: { requestCount: number; maxRetries: number };
  observations: {
    platformMetadataDeclaredBscRecords: number;
    directoryUniqueRepresentationsReturned: number;
    declaredMinusReturnedDifference: number;
    comparedTabIdentitySetsEqual: boolean;
    directoryRowsWithPerTokenUpdateTimestamp: number;
    directoryRowsWithLiquidity: number;
    recognizedMarketStatusRows: number;
    recognizedMarketStatusCounts: { closed: number; offhours: number };
    rowsWithoutRecognizedMarketStatus: number;
    sampledNvdaQuoteAgeMsAtObservation: number[];
  };
  limitations: string[];
  rawProviderPayloadIncluded: boolean;
  credentialsIncluded: boolean;
};
const quickstart = await readFile("docs/QUICKSTART.md", "utf8");
const sdkUsage = await readFile("docs/SDK_USAGE.md", "utf8");
const deferredItems = await readFile("docs/UPGRADE_DEFERRED_ITEMS.md", "utf8");
const phasePlan = await readFile("docs/CORE_PRODUCT_PHASE_PLAN.md", "utf8");

assert.equal(observation.requestPolicy.requestCount, 6, "the provider evidence remains a single six-request sample");
assert.equal(observation.requestPolicy.maxRetries, 0, "the evidence sample must not silently include retries");
assert.equal(observation.observations.platformMetadataDeclaredBscRecords, 545);
assert.equal(observation.observations.directoryUniqueRepresentationsReturned, 488);
assert.equal(observation.observations.declaredMinusReturnedDifference, 57);
assert.ok(observation.limitations[0]?.includes("57-record difference is unexplained"));
assert.ok(observation.limitations[0]?.includes("pagination and total-count semantics are unverified"));
assert.match(quickstart, /545 BSC token records while the token-list endpoint returned 488 unique representations, a 57-record difference whose cause is unresolved/);
assert.match(quickstart, /do not present either number as a complete-market count/);
assert.match(sdkUsage, /57-record difference remains unexplained/);
assert.match(sdkUsage, /it is not a completeness estimate/);

assert.equal(observation.observations.comparedTabIdentitySetsEqual, true);
assert.ok(observation.limitations[1]?.includes("do not prove that the filter is ignored"));
assert.match(phasePlan, /does not establish filter semantics/);

assert.equal(observation.observations.directoryRowsWithPerTokenUpdateTimestamp, 0);
assert.equal(observation.observations.directoryRowsWithLiquidity, 0);
assert.equal(observation.observations.recognizedMarketStatusRows, 442);
assert.deepEqual(observation.observations.recognizedMarketStatusCounts, { closed: 411, offhours: 31 });
assert.equal(observation.observations.rowsWithoutRecognizedMarketStatus, 46);
assert.ok(observation.limitations[2]?.includes("did not include per-token quote-update timestamps or liquidity"));
assert.ok(observation.limitations[2]?.includes("46 rows lacked a recognized market status"));
assert.match(deferredItems, /Directory rows had no per-token update timestamp or liquidity[\s\S]*46 missing statuses/);

assert.deepEqual(observation.observations.sampledNvdaQuoteAgeMsAtObservation, [196, 4426]);
assert.ok(observation.limitations[3]?.includes("do not establish a freshness service-level agreement or acceptable maximum age"));
assert.match(sdkUsage, /provider timestamps alone do not guarantee data freshness because no market-data freshness SLA has been verified/);
assert.match(phasePlan, /Do not infer that a snapshot is complete or fresh from response timestamps alone/);

assert.ok(observation.limitations[4]?.includes("single bounded observation"));
assert.ok(observation.limitations[4]?.includes("not a complete catalog or a recurring measurement"));
assert.equal(observation.rawProviderPayloadIncluded, false);
assert.equal(observation.credentialsIncluded, false);
assert.match(phasePlan, /phase26-provider-observation\.json[\s\S]*no provider payload or credentials/);

console.log(JSON.stringify({
  inventoryCountAndPaginationUnresolved: true,
  filterSemanticsUnresolved: true,
  missingDirectoryFieldsExplicit: true,
  freshnessSlaUnresolved: true,
  observationBoundedAndSanitized: true,
  passed: true
}, null, 2));
