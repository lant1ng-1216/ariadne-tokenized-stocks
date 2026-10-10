import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const tracked = spawnSync("git", ["ls-files"], { encoding: "utf8" });
assert.equal(tracked.status, 0, "git ls-files must succeed");
const trackedPaths = tracked.stdout.split(/\r?\n/).filter(Boolean);
const forbiddenPaths = [
  /^apps\/web\//,
  /^src\/web\//,
  /^src\/jev\//,
  /^records\//,
  /^AGENTS\.md$/,
  /^docs\/(?:JEV_|CORE_PRODUCT_PHASE_PLAN|DEVELOPER_EXPERIENCE_LOG|UPGRADE_DEFERRED_ITEMS|MAINLINE_PAUSE|UPGRADE_PHASE_|UX_PHASE_)/,
  /^scripts\/(?:run-jev|test-jev|test-core-product-phase-plan|start-web|test-web|test-asset-directory|test-phase\d)/,
  /^scripts\/fixtures\/(?:jev-|.*workflow-state)/,
];
for (const path of trackedPaths) {
  assert.ok(!forbiddenPaths.some((pattern) => pattern.test(path)), `out-of-scope tracked path remains: ${path}`);
}

const requiredProductPaths = [
  "README.md",
  "API_CONFIGURATION.md",
  "LICENSE",
  "package.json",
  "package-lock.json",
  "src/index.ts",
  "src/domain/types.ts",
  "src/services/tokenized-stocks.ts",
  "src/mcp/server.ts",
  "src/presentation/asset-view.ts",
  "docs/QUICKSTART.md",
  "docs/SDK_USAGE.md",
  "docs/PRODUCT_SURFACE_ARCHITECTURE.md",
  "docs/DEVELOPER_EXPERIENCE_REPORT.md",
  "docs/PRODUCT_EXPERIENCE_REPORT.md",
  "docs/DEVELOPMENT_LOG.md",
  "examples/sdk-usage.ts",
  "research/README.md",
  "research/data/provider-catalog-observation.json",
  "research/data/binance-rwa-contract.json",
  "research/data/api-observations.json",
  "research/data/request-traces.json",
  "research/experiments/records/readonly.jsonl",
  "research/experiments/records/safety.jsonl",
  "research/experiments/records/readonly-results.jsonl",
  "research/experiments/records/safety-results.json",
  "research/experiments/audit-results.json",
];
for (const path of requiredProductPaths) {
  assert.ok(trackedPaths.includes(path), `required SDK/MCP product or evidence file is missing from the repository index: ${path}`);
}

const sourceAreas = ["src/domain/", "src/services/", "src/mcp/", "src/presentation/"];
const sourceCounts = Object.fromEntries(sourceAreas.map((area) => [
  area.slice(0, -1),
  trackedPaths.filter((path) => path.startsWith(area)).length,
]));
for (const [area, count] of Object.entries(sourceCounts)) {
  assert.ok(count > 0, `core product source area is unexpectedly empty: ${area}`);
}

assert.ok(!trackedPaths.includes(".env"), ".env must never be tracked");
const envExample = (await readFile(".env.example", "utf8"))
  .split(/\r?\n/)
  .filter((line) => line && !line.trimStart().startsWith("#"))
  .map((line) => line.split("=", 2));
const envExampleValues = new Map(envExample.map(([key, value]) => [key, value ?? ""]));
assert.equal(envExampleValues.get("BINANCE_WEB3_API_KEY"), "", "public API key example must be empty");
assert.equal(envExampleValues.get("BINANCE_WEB3_API_SECRET"), "", "public API secret example must be empty");

const sensitiveResearchKeys = /^(?:address|walletAddress|userAddress|accountAddress|mnemonic|authorization|apiKey|apiSecret|accessToken|privateKey)$/i;
const zeroAddress = `0x${"0".repeat(40)}`;
const researchJsonPaths = trackedPaths.filter((path) => path.startsWith("research/") && /\.jsonl?$/.test(path));
const researchCredentialFields = [];
let zeroPreviewAddressOnly = true;
const researchDocuments = new Map();
function inspectResearchValue(value, file) {
  if (Array.isArray(value)) {
    for (const item of value) inspectResearchValue(item, file);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (sensitiveResearchKeys.test(key)) researchCredentialFields.push(`${file}:${key}`);
    if (key === "privateKeyHandledBySdk") assert.equal(typeof child, "boolean", `${file} must record only a boolean key-handling fact`);
    if (key === "previewAddress" && child !== zeroAddress) zeroPreviewAddressOnly = false;
    inspectResearchValue(child, file);
  }
}
for (const path of researchJsonPaths) {
  const contents = await readFile(path, "utf8");
  assert.doesNotMatch(contents, /\bBearer\s+[A-Za-z0-9._~+/-]{20,}/i, `${path} must not contain bearer credentials`);
  const records = path.endsWith(".jsonl")
    ? contents.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
    : [JSON.parse(contents)];
  researchDocuments.set(path, records);
  for (const record of records) inspectResearchValue(record, path);
}
assert.deepEqual(researchCredentialFields, [], "research files must not contain private wallet or credential fields");
assert.ok(zeroPreviewAddressOnly, "safety research preview addresses must be the zero-address fixture, not a user wallet");

const expectedEventFields = [
  "attempt", "broadcasted", "business_code", "endpoint", "handling_decision", "http_status",
  "latency_ms", "observed_at", "record_id", "request_variant", "response_class",
  "retry_after_honored", "scenario_id", "source_ref", "warning_count",
].sort();
for (const path of ["research/experiments/records/readonly.jsonl", "research/experiments/records/safety.jsonl"]) {
  const records = researchDocuments.get(path) ?? [];
  assert.ok(records.length > 0, `${path} must contain structured experiment metadata`);
  for (const record of records) {
    assert.deepEqual(Object.keys(record).sort(), expectedEventFields, `${path} schema must exclude arbitrary request/response payload fields`);
    assert.equal(record.broadcasted, false, `${path} must contain no broadcasted transaction`);
  }
}

const snapshotPath = "research/experiments/records/readonly-results.jsonl";
const snapshots = researchDocuments.get(snapshotPath) ?? [];
const expectedSnapshotFields = new Set([
  "asset", "assetId", "chainId", "contractAddress", "dataWarnings", "marketStatus", "nextOpenTime",
  "observed_at", "openState", "platformId", "priceGap", "priceGapPercent", "referencePrice",
  "request_variant", "result", "scenario_id", "tokenPrice", "tokenSymbol", "underlyingName",
  "underlyingTicker", "volume24H",
]);
const snapshotFields = new Set();
function collectSnapshotFields(value) {
  if (Array.isArray(value)) {
    for (const item of value) collectSnapshotFields(item);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      snapshotFields.add(key);
      collectSnapshotFields(child);
    }
  }
}
for (const snapshot of snapshots) {
  assert.deepEqual(Object.keys(snapshot).sort(), ["observed_at", "request_variant", "result", "scenario_id"]);
  collectSnapshotFields(snapshot);
}
assert.ok(snapshots.length > 0, "normalized research result snapshots must be present");
assert.deepEqual([...snapshotFields].filter((key) => !expectedSnapshotFields.has(key)), [], "result snapshots must use only normalized product fields");

const providerObservation = researchDocuments.get("research/data/provider-catalog-observation.json")?.[0];
assert.equal(providerObservation?.rawProviderPayloadIncluded, false);
assert.equal(providerObservation?.credentialsIncluded, false);

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.ok(!Object.keys(packageJson.scripts).some((name) => /^(?:web:|test:web)|jev/i.test(name)), "package scripts must expose only Ariadne product commands");
assert.ok(packageJson.scripts["test:provider-contract"]);
assert.ok(packageJson.scripts["test:provider-data-fidelity"]);
assert.ok(packageJson.scripts["test:provider-catalog-limitations"]);
assert.ok(packageJson.scripts["test:repository-scope"]);

const readme = await readFile("README.md", "utf8");
assert.match(readme, /TypeScript SDK/);
assert.match(readme, /MCP server/);
assert.match(readme, /Developer Experience Report/);
assert.doesNotMatch(readme, /npm run web:|apps\/web|src\/web/i);

const publicDocs = [
  "docs/QUICKSTART.md",
  "docs/SDK_USAGE.md",
  "docs/PRODUCT_SURFACE_ARCHITECTURE.md",
  "docs/DEVELOPER_EXPERIENCE_REPORT.md",
  "docs/PRODUCT_EXPERIENCE_REPORT.md",
  "docs/DEVELOPMENT_LOG.md",
  "docs/PRODUCT_LIMITATIONS.md",
];
for (const path of publicDocs) {
  const contents = await readFile(path, "utf8");
  assert.doesNotMatch(contents, /npm run web:|apps\/web|src\/web/i, `${path} must not describe a website product surface`);
  assert.doesNotMatch(contents, /Jev phase-gate|JEV-LATEST-GATE|records\/phase-state/i, `${path} must not contain internal workflow records`);
}

let checkedLocalLinks = 0;
const markdownFiles = ["README.md", ...publicDocs, "research/README.md"];
for (const file of markdownFiles) {
  const contents = await readFile(file, "utf8");
  const links = contents.matchAll(/!?\[[^\]]*\]\((<[^>]+>|[^)\s]+)(?:\s+["'][^)]*["'])?\)/g);
  for (const [, rawTarget] of links) {
    const target = rawTarget.startsWith("<") ? rawTarget.slice(1, -1) : rawTarget;
    if (/^(?:https?:|mailto:|#)/i.test(target)) continue;
    const localPath = decodeURIComponent(target.split(/[?#]/, 1)[0] ?? "");
    if (!localPath) continue;
    await access(resolve(dirname(file), localPath));
    checkedLocalLinks += 1;
  }
}

console.log(JSON.stringify({
  repositoryScope: "Ariadne SDK and MCP product only",
  trackedPathCount: trackedPaths.length,
  coreSourcePathCounts: sourceCounts,
  requiredProductAndEvidencePaths: requiredProductPaths.length,
  localMarkdownLinksChecked: checkedLocalLinks,
  researchStructuredFilesScanned: researchJsonPaths.length,
  researchCredentialFieldsExcluded: researchCredentialFields.length === 0,
  experimentEventSchemasAllowlisted: true,
  resultSnapshotsUseNormalizedFields: true,
  rawProviderPayloadExcluded: providerObservation?.rawProviderPayloadIncluded === false,
  providerCredentialsExcluded: providerObservation?.credentialsIncluded === false,
  credentialExampleValuesEmpty: true,
  previewAddressIsSyntheticZeroAddress: zeroPreviewAddressOnly,
  websiteAndWorkflowFilesExcluded: true,
  packageScriptsProductFocused: true,
  publicDocsConsistent: true,
  passed: true
}, null, 2));
