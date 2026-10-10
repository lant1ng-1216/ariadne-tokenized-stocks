import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { BinanceWeb3Client } from "../src/binance-web3-client.js";
import { BinanceWeb3Error } from "../src/errors.js";
import { TokenizedStocksService } from "../src/services/tokenized-stocks.js";

const apiKey = process.env.BINANCE_WEB3_API_KEY;
const apiSecret = process.env.BINANCE_WEB3_API_SECRET;
if (!apiKey || !apiSecret) throw new Error("Missing Binance Web3 credentials in .env");

const client = new BinanceWeb3Client({
  apiKey, apiSecret,
  baseUrl: process.env.BINANCE_WEB3_BASE_URL,
  proxyUrl: process.env.BINANCE_WEB3_PROXY_URL,
  timeoutMs: 15_000,
  maxRetries: 1
});
const service = new TokenizedStocksService(client);
const snapshot = await service.listSnapshot({ chainId: "56" });
const assets = snapshot.listings;
const prices = await service.tokenPriceSnapshots(assets.map((asset) => ({
  chainId: asset.chainId, platformId: asset.platformId, contractAddress: asset.contractAddress
})));
const priceByIdentity = new Map(prices.map((price) => [`${price.chainId}:${price.platformId}:${price.contractAddress.toLowerCase()}`, price]));
const wallet = "0x000000000000000000000000000000000000dead";
const usdt = "0x55d398326f99059ff775485246999027b3197955";
const concurrency = Math.max(1, Math.min(8, Number(process.env.CATALOG_AUDIT_CONCURRENCY ?? "1")));
const rows: Array<Record<string, unknown>> = new Array(assets.length);
let cursor = 0;

async function worker() {
  while (true) {
    const index = cursor++;
    const asset = assets[index];
    if (!asset) return;
    const key = `${asset.chainId}:${asset.platformId}:${asset.contractAddress.toLowerCase()}`;
    const price = priceByIdentity.get(key);
    const base = {
      chainId: asset.chainId,
      platformId: asset.platformId,
      contractAddress: asset.contractAddress,
      tokenSymbol: asset.tokenSymbol,
      underlyingTicker: asset.underlyingTicker,
      underlyingName: asset.underlyingName,
      researchReady: Boolean(asset.tokenSymbol && asset.underlyingTicker && asset.underlyingName && asset.market.provenance?.some((item) => item.provider === "Binance Web3")),
      tokenLogoAvailable: Boolean(asset.tokenLogoUrl),
      issuerLogoAvailable: Boolean(asset.issuerLogoUrl),
      marketData: price?.state ?? "missing",
      marketStatus: asset.market.marketStatus,
      marketUpdatedAt: price?.state === "available" ? price.tokenPriceUpdatedAt : null,
      warnings: asset.market.dataWarnings
    };
    try {
      let quote: Awaited<ReturnType<typeof service.quote>> | undefined;
      let quoteAttempts = 0;
      while (!quote && quoteAttempts < 3) {
        quoteAttempts += 1;
        try {
          quote = await service.quote({
            type: "buy", walletAddress: wallet, fromTokenAddress: usdt, toAsset: asset,
            amount: "6", amountDecimals: 18, maxSlippageBps: 200
          });
        } catch (error) {
          const malformed = error instanceof Error && /invalid JSON|invalid response envelope/i.test(error.message);
          if (!malformed || quoteAttempts >= 3) throw error;
          await new Promise((resolve) => setTimeout(resolve, 250 * quoteAttempts));
        }
      }
      if (!quote) throw new Error("Quote audit exhausted without a provider result");
      const route = quote.routes.length === 1 ? quote.routes[0] : undefined;
      let build: Record<string, unknown> = { state: "not_attempted" };
      if (quote.success && route) {
        try {
          let action: Awaited<ReturnType<typeof service.buildUnsignedAction>> | undefined;
          for (let attempt = 1; attempt <= 3 && !action; attempt += 1) {
            try {
              action = await service.buildUnsignedAction({
                type: "buy", walletAddress: wallet, fromTokenAddress: usdt, toAsset: asset,
                amount: "6", amountDecimals: 18, maxSlippageBps: 200
              }, quote);
            } catch (error) {
              const malformed = error instanceof Error && /invalid JSON|invalid response envelope/i.test(error.message);
              if (!malformed || attempt >= 3) throw error;
              await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
            }
          }
          if (!action) throw new Error("Transaction-build audit exhausted without a provider result");
          build = { state: "ready", kind: action.kind, executionMode: route.executionMode ?? quote.platformMode };
        } catch (error) {
          build = {
            state: "unavailable",
            category: error instanceof BinanceWeb3Error ? "provider_or_route_limitation" : "adapter_or_contract_failure",
            reason: error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300)
          };
        }
      }
      rows[index] = {
        ...base,
        quote: quote.success && route
          ? { state: "ready", mode: quote.platformMode, routeCount: quote.routes.length, executionMode: route.executionMode ?? null }
          : { state: "unavailable", category: "provider_or_route_limitation", routeCount: quote.routes.length, reason: quote.error?.message ?? quote.warnings.join("; ") },
        build
      };
    } catch (error) {
      rows[index] = {
        ...base,
        quote: {
          state: "unavailable",
          category: error instanceof BinanceWeb3Error ? "provider_or_route_limitation" : "adapter_or_contract_failure",
          reason: error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300)
        },
        build: { state: "not_attempted" }
      };
    }
    if ((index + 1) % 25 === 0 || index + 1 === assets.length) process.stderr.write(`Audited ${index + 1}/${assets.length}\n`);
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));
const byIssuer = Object.fromEntries([...new Set(assets.map((asset) => asset.platformId))].sort().map((platformId) => {
  const issuerRows = rows.filter((row) => row.platformId === platformId);
  return [platformId, {
    representations: issuerRows.length,
    researchReady: issuerRows.filter((row) => row.researchReady === true).length,
    marketDataAvailable: issuerRows.filter((row) => row.marketData === "available").length,
    quoteReady: issuerRows.filter((row) => (row.quote as Record<string, unknown>)?.state === "ready").length,
    buildReady: issuerRows.filter((row) => (row.build as Record<string, unknown>)?.state === "ready").length,
    providerOrRouteLimitations: issuerRows.filter((row) => (row.quote as Record<string, unknown>)?.category === "provider_or_route_limitation" || (row.build as Record<string, unknown>)?.category === "provider_or_route_limitation").length,
    adapterOrContractFailures: issuerRows.filter((row) => (row.quote as Record<string, unknown>)?.category === "adapter_or_contract_failure" || (row.build as Record<string, unknown>)?.category === "adapter_or_contract_failure").length
  }];
}));
const report = {
  schemaVersion: 1,
  measuredAt: new Date().toISOString(),
  source: "Binance Web3",
  scope: { chainId: "56", input: "6 USDT", wallet: "non-funded audit address", readOnly: true, signed: false, broadcast: false },
  directory: { representations: assets.length, issuers: byIssuer, warnings: snapshot.warnings },
  interpretation: "Research and adapter coverage are distinct from current provider executability. A provider or route limitation is retained as unavailable and is not presented as an Ariadne-created quote.",
  representations: rows
};
const output = resolve("records/ariadne-workflow/catalog-audits/bsc-business-coverage-latest.json");
mkdirSync(resolve("records/ariadne-workflow/catalog-audits"), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output, representations: assets.length, byIssuer }, null, 2));
