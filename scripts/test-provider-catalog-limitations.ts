import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const observation = JSON.parse(await readFile("research/data/provider-catalog-observation.json", "utf8")) as {
  recordType: string;
  requestPolicy: { method: string; requestCount: number; maxRetries: number };
  requests: Array<{ index: number; endpoint: string; httpStatus: number }>;
  observations: {
    platformMetadataDeclaredBscRecords: number;
    directoryUniqueRepresentationsReturned: number;
    declaredMinusReturnedDifference: number;
    comparedTabIdentitySetsEqual: boolean;
    directoryRowsWithPerTokenUpdateTimestamp: number;
    directoryRowsWithLiquidity: number;
    rowsWithoutRecognizedMarketStatus: number;
  };
  limitations: string[];
  rawProviderPayloadIncluded: boolean;
  credentialsIncluded: boolean;
};
const sdkUsage = await readFile("docs/SDK_USAGE.md", "utf8");
const limitationsDoc = await readFile("docs/PRODUCT_LIMITATIONS.md", "utf8");
const auditDoc = await readFile("docs/BINANCE_RWA_API_CONTRACT_AUDIT.md", "utf8");

assert.equal(observation.recordType, "provider-catalog-observation");
assert.equal(observation.requestPolicy.method, "GET");
assert.equal(observation.requestPolicy.requestCount, 6);
assert.equal(observation.requestPolicy.maxRetries, 0);
assert.equal(observation.requests.length, 6);
assert.ok(observation.requests.every((request, index) => request.index === index + 1 && request.httpStatus === 200));
assert.equal(observation.observations.platformMetadataDeclaredBscRecords, 545);
assert.equal(observation.observations.directoryUniqueRepresentationsReturned, 488);
assert.equal(observation.observations.declaredMinusReturnedDifference, 57);
assert.equal(545 - 488, observation.observations.declaredMinusReturnedDifference);
assert.equal(observation.observations.comparedTabIdentitySetsEqual, true);
assert.equal(observation.observations.directoryRowsWithPerTokenUpdateTimestamp, 0);
assert.equal(observation.observations.directoryRowsWithLiquidity, 0);
assert.equal(observation.observations.rowsWithoutRecognizedMarketStatus, 46);
assert.ok(observation.limitations.some((item) => /57-record difference is unexplained/.test(item)));
assert.ok(observation.limitations.some((item) => /do not prove that the filter is ignored/.test(item)));
assert.ok(observation.limitations.some((item) => /do not establish a freshness service-level agreement/.test(item)));
assert.ok(observation.limitations.some((item) => /not a complete catalog/.test(item)));
assert.equal(observation.rawProviderPayloadIncluded, false);
assert.equal(observation.credentialsIncluded, false);

assert.match(sdkUsage, /returns the rows observed from the provider, not a verified complete catalog/);
assert.match(sdkUsage, /57-record difference remains unexplained/);
assert.match(sdkUsage, /no market-data freshness SLA has been verified/);
assert.match(limitationsDoc, /57/);
assert.match(limitationsDoc, /分页/);
assert.match(limitationsDoc, /新鲜度 SLA/);
assert.match(auditDoc, /不足以证明筛选器无效/);
assert.match(auditDoc, /不证明目录完整/);

console.log(JSON.stringify({
  boundedObservation: true,
  catalogCompletenessNotClaimed: true,
  filterAndPaginationSemanticsRemainUnknown: true,
  missingFieldsAndFreshnessLimitsDisclosed: true,
  noRawPayloadOrCredentials: true,
  passed: true
}, null, 2));
