import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [readme, quickstart, sdk, mcp, apiConfig, envExample, websiteHero, websiteStage, mcpConfig, mcpStage, sdkStage, manifest] = await Promise.all([
  readFile("README.md", "utf8"),
  readFile("docs/QUICKSTART.md", "utf8"),
  readFile("docs/SDK_USAGE.md", "utf8"),
  readFile("docs/MCP_USAGE.md", "utf8"),
  readFile("API_CONFIGURATION.md", "utf8"),
  readFile(".env.example", "utf8"),
  readFile("website/components/hero.tsx", "utf8"),
  readFile("website/components/developer-stage.tsx", "utf8"),
  readFile("scripts/print-mcp-config.mjs", "utf8"),
  readFile("scripts/stage-mcp-package.mjs", "utf8"),
  readFile("scripts/stage-sdk-package.mjs", "utf8"),
  readFile("package.json", "utf8").then(JSON.parse),
]);

const docs = [readme, quickstart, sdk, mcp, apiConfig, websiteHero, websiteStage];
assert.ok(docs.every((doc) => doc.includes("22.19.0") || doc === websiteHero || doc === websiteStage), "public setup docs must agree with the supported Node runtime");
assert.match(sdk, /proxyUrl:\s*process\.env\.BINANCE_WEB3_PROXY_URL\s*\|\|\s*undefined/);
assert.match(websiteStage, /proxyUrl:\s*process\.env\.BINANCE_WEB3_PROXY_URL\s*\|\|\s*undefined/);
assert.doesNotMatch(`${sdk}\n${websiteStage}`, /proxyUrl:\s*process\.env\.HTTPS_PROXY/);
assert.match(sdk, /does not automatically discover `HTTPS_PROXY`/);
assert.match(apiConfig, /does not automatically read `HTTPS_PROXY`/);
assert.match(envExample, /^BINANCE_WEB3_API_KEY=$/m);
assert.match(envExample, /^BINANCE_WEB3_API_SECRET=$/m);
assert.match(envExample, /^BINANCE_WEB3_PROXY_URL=$/m);

assert.match(readme, /full local stdio MCP server/i);
assert.match(readme, /limited synthetic sample/i);
assert.match(mcp, /it is not a Demo-only build/i);
assert.match(mcp, /"ARIADNE_MODE": "live"/);
assert.match(mcp, /"BINANCE_WEB3_API_KEY": "<your API key>"/);
assert.match(mcp, /"BINANCE_WEB3_API_SECRET": "<your API secret>"/);
assert.match(mcp, /does not load the repository's `\.env` file/);
assert.match(mcp, /do not require a wallet-handoff relay/);
assert.match(mcp, /ARIADNE_WALLET_HANDOFF_RELAY_URL/);
assert.match(mcp, /ARIADNE_WALLET_HANDOFF_RELAY_SECRET/);

assert.match(mcpConfig, /--env-file=\.env/);
assert.match(quickstart, /source checkout/i);
assert.match(apiConfig, /BINANCE_WEB3_EVM_RPC_URL/);
assert.match(apiConfig, /ARIADNE_MODE=demo/);
assert.match(apiConfig, /ARIADNE_REOWN_PROJECT_ID/);
assert.match(mcpStage, /API_CONFIGURATION\.md/);
assert.match(mcpStage, /ARIADNE_WALLET_HOST_BRIDGE\.md/);
assert.match(mcpStage, /REMOTE_MCP_DEPLOYMENT\.md/);
assert.match(mcpStage, /docs\/MCP_USAGE\.md/);
assert.match(sdkStage, /API_CONFIGURATION\.md/);
assert.match(sdkStage, /docs\/SDK_USAGE\.md/);
assert.match(sdkStage, /docs\/MCP_USAGE\.md/);
assert.match(sdkStage, /ARIADNE_WALLET_HOST_BRIDGE\.md/);
assert.match(sdkStage, /REMOTE_MCP_DEPLOYMENT\.md/);
assert.ok(manifest.scripts["test:integration-docs"]);

assert.match(`${readme}\n${quickstart}\n${mcp}`, /40304/);
assert.match(`${readme}\n${quickstart}\n${mcp}`, /not the recommended (?:competition )?(?:Live )?(?:evaluation|competition) route/i);
assert.match(websiteHero, /Live or Demo/);

console.log(JSON.stringify({
  nodeRuntimeConsistent: true,
  sdkMcpProxyMappingConsistent: true,
  mcpLiveAndDemoModesDistinguished: true,
  liveCredentialsAndEnvLoadingExplained: true,
  relayPrerequisitesSeparatedFromReadOnlyResearch: true,
  packageConsumedMcpDocsIncluded: true,
  remoteLiveBoundaryDisclosed: true,
  passed: true
}, null, 2));
