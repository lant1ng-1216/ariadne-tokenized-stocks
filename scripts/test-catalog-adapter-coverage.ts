import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { walletWatchAssetRequest } from "../src/mcp/ui/post-transaction-actions.js";
import { buildExternalWalletApprovalPageHtml } from "../src/mcp/ui/external-wallet-approval-page-html.js";
import { TokenizedStocksService } from "../src/services/tokenized-stocks.js";

const root = resolve(import.meta.dirname, "..");
const serverSource = readFileSync(resolve(root, "src/mcp/server.ts"), "utf8");
const relaySource = readFileSync(resolve(root, "src/mcp/wallet-handoff-relay-server.ts"), "utf8");
const pageSource = readFileSync(resolve(root, "src/mcp/ui/external-wallet-approval-page.ts"), "utf8");
const html = await buildExternalWalletApprovalPageHtml();

for (const fixture of [
  { issuer: "bStocks", ticker: "MSFT", symbol: "MSFTB", contract: `0x${"11".repeat(20)}` },
  { issuer: "Ondo", ticker: "TSLA", symbol: "TSLAon", contract: `0x${"22".repeat(20)}` }
]) {
  const request = walletWatchAssetRequest({
    operation: "purchase", issuer: fixture.issuer, outputContract: fixture.contract,
    outputSymbol: fixture.symbol, purchaseBaseline: { outputDecimals: 18 }
  });
  assert.equal(request?.params.options.address, fixture.contract);
  assert.equal(request?.params.options.symbol, fixture.symbol);
}
assert.match(serverSource, /z\.enum\(\["bstock", "ondo"\]\)/, "both current Binance Web3 BSC issuers are accepted by plan preparation");
assert.match(relaySource, /issuerDisplayName\(confirmed\.intent\.toAsset\.platformId\)/, "the handoff derives its issuer from the selected provider identity");
assert.match(relaySource, /underlyingName: confirmed\.intent\.toAsset\.underlyingName/, "the handoff carries provider-supplied underlying metadata");
assert.match(pageSource, /display\.ticker/);
assert.match(pageSource, /display\.issuer/);
assert.match(pageSource, /display\.outputSymbol/);
assert.match(pageSource, /display\.outputContract/);
assert.match(html, /id="asset-logo"/);
assert.doesNotMatch(relaySource, /ticker:\s*"NVDA"|ticker:\s*"AAPL"|issuer:\s*"bStocks"/, "the production relay does not hardcode a test stock or issuer");
assert.doesNotMatch(pageSource, /outputSymbol\s*=\s*"NVDAB"|outputSymbol\s*=\s*"AAPLon"/, "the page does not hardcode a test output token");

const currentAppleContract = `0x${"39".repeat(20)}`;
const staleAppleContract = `0x${"43".repeat(20)}`;
const reconciliationService = new TokenizedStocksService({
  async get(path: string, params?: Record<string, string>) {
    if (path.endsWith("/rwa/search")) {
      return {
        data: [{
          ticker: "AAPL",
          companyName: "Apple Inc.",
          assets: params?.platformId === "bstock"
            ? [{ binanceChainId: "56", platformId: "bstock", tokenContractAddress: staleAppleContract, tokenSymbol: "AAPLB" }]
            : [{ binanceChainId: "56", platformId: "ondo", tokenContractAddress: currentAppleContract, tokenSymbol: "AAPLon" }]
        }]
      };
    }
    if (path.endsWith("/rwa/tokens")) {
      return {
        data: params?.platformId === "bstock" ? [] : [{
          binanceChainId: "56", platformId: "ondo", tokenContractAddress: currentAppleContract,
          tokenSymbol: "AAPLon", underlyingTicker: "AAPL", underlyingName: "Apple Inc.",
          tokenPrice: "250", tokenPriceUpdatedAt: 1_800_000_000_000,
          statusInfo: { marketStatus: "open", openState: true }
        }]
      };
    }
    if (path.endsWith("/rwa/platforms")) {
      return { data: [{ platformId: "ondo" }, { platformId: "bstock" }] };
    }
    throw new Error(`Unexpected reconciliation request: ${path}`);
  }
} as any);

const staleApple = await reconciliationService.searchCurrentDirectory("AAPL", { chainId: "56", platformId: "bstock" });
assert.equal(staleApple.assets.length, 0, "a search-only identity must not reach quote or plan preparation after leaving the current directory");
assert.equal(staleApple.staleSearchMatches[0]?.contractAddress, staleAppleContract);
const currentApple = await reconciliationService.searchCurrentDirectory("AAPL", { chainId: "56", platformId: "ondo" });
assert.equal(currentApple.assets.length, 1);
assert.equal(currentApple.assets[0]?.contractAddress, currentAppleContract, "the exact current directory identity drives the plan path");
assert.equal(currentApple.assets[0]?.tokenSymbol, "AAPLon");
assert.match(serverSource, /searchCurrentDirectory\(input\.query/, "purchase preparation reconciles provider search against the current directory");

console.log("Catalog adapter coverage passed: arbitrary identities, both issuer families, and current-directory reconciliation drive plan-page and post-transaction metadata without per-stock hardcoding.");
