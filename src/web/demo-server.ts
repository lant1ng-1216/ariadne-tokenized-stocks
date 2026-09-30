import { createServer, type Server, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { BinanceWeb3Client } from "../binance-web3-client.js";
import { compareAgentAssets, toAgentAsset } from "../domain/agent-normalizers.js";
import { researchNextSteps } from "../presentation/asset-view.js";
import { DemoTokenizedStocksService } from "../services/demo-tokenized-stocks.js";
import { TokenizedStocksService } from "../services/tokenized-stocks.js";
import type { RepresentationIdentity } from "../services/asset-coverage-audit.js";
import { TransactionService } from "../services/transaction.js";
import { WalletService } from "../services/wallet.js";
import { buildResearchWorkspaceView } from "./research-workspace.js";
import { buildAssetDirectoryView } from "./asset-directory.js";
import { buildWalletExposureView } from "./wallet-exposure.js";
import type { QuoteResult, TradeIntent, WalletHolding } from "../domain/types.js";
import { normalizeMarketCandles } from "./market-candles.js";

const demoService = new DemoTokenizedStocksService({} as any);
export type ResearchService = Pick<TokenizedStocksService, "search" | "marketContext" | "marketContexts" | "list" | "listSnapshot" | "platforms"> & Partial<Pick<TokenizedStocksService, "candles" | "tokenPriceSnapshots">>;
export type WalletExposureService = Pick<WalletService, "holdings">;
export type ReadOnlyQuoteService = Pick<TokenizedStocksService, "quote">;
export type ReadOnlyPreflightService = Pick<TokenizedStocksService, "createActionPlan">;
export type ReadOnlySimulationService = Pick<TransactionService, "simulateEvm">;

const demoWalletExposure: WalletExposureService = {
  async holdings(): Promise<WalletHolding[]> {
    return [
      {
        chainId: "56",
        contractAddress: "0x02fca66c1d1afb4e2a7884261eb00f63598a7436",
        symbol: "NVDAB",
        balance: "0.125",
        rawBalance: "125000000000000000",
        tokenPrice: "221.09",
        warnings: [],
      },
      {
        chainId: "56",
        contractAddress: "0x80e6AF2fd18911890388ab43EEe0F26072Ddc9fe",
        symbol: "NVDA.O",
        balance: "9",
        warnings: ["tokenPrice is unavailable"],
      },
    ];
  }
};

const demoQuoteService: ReadOnlyQuoteService = {
  async quote(intent: TradeIntent): Promise<QuoteResult> {
    const isOndo = intent.toAsset.platformId === "ondo";
    return {
      asset: intent.toAsset,
      platformMode: "standard",
      success: true,
      routes: [{
        quoteId: `demo_quote_${intent.toAsset.platformId}`,
        executionMode: "SWAP",
        toTokenAmount: isOndo ? "0.045234" : "0.045176",
        priceImpact: isOndo ? "0.0012%" : "0.0031%",
        dexName: "Demo Router",
        approvalTarget: null,
      }],
      warnings: ["Demo Mode quote is deterministic and is not an executable order", "Minimum output was not supplied by the quote source"],
    };
  }
};

function sendJson(response: ServerResponse, status: number, payload: unknown, requestId?: string, extraHeaders: Record<string, string> = {}): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...(requestId ? { "x-request-id": requestId } : {}),
    ...extraHeaders
  });
  response.end(JSON.stringify(payload));
}

async function research(stocks: ResearchService, query: string, chainId: string) {
  const startedAt = performance.now();
  const searchStartedAt = performance.now();
  const assets = await stocks.search(query, { chainId });
  const searchMs = performance.now() - searchStartedAt;
  const marketStartedAt = performance.now();
  const markets = await stocks.marketContexts(assets);
  const enriched = assets.map((asset, index) => toAgentAsset(asset, markets[index]));
  const marketContextMs = performance.now() - marketStartedAt;
  const comparisonStartedAt = performance.now();
  const comparison = compareAgentAssets(enriched);
  const comparisonMs = performance.now() - comparisonStartedAt;
  const nextSteps = researchNextSteps(enriched, comparison);
  const presentationStartedAt = performance.now();
  const timing = {
    searchMs: Math.round(searchMs),
    marketContextMs: Math.round(marketContextMs),
    comparisonMs: Math.round(comparisonMs),
    presentationMs: Math.round(performance.now() - presentationStartedAt),
    totalMs: Math.round(performance.now() - startedAt),
    marketContextAssets: enriched.length,
    agentReasoningExcluded: true as const
  };
  return buildResearchWorkspaceView(enriched, comparison, nextSteps, timing, {
    ticker: query.toUpperCase(),
    name: enriched[0]?.underlyingName ?? query,
    chainId
  });
}

export function createWebServer(mode: "demo" | "live-readonly", stocks: ResearchService, exposure?: WalletExposureService, quotes?: ReadOnlyQuoteService, preflight?: ReadOnlyPreflightService, simulator?: ReadOnlySimulationService): Server {
  return createServer((request, response) => {
    void (async () => {
      const requestId = randomUUID();
      const startedAt = performance.now();
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (request.method !== "GET") {
        sendJson(response, 405, {
          error: { code: "method_not_allowed", message: "This research surface accepts GET requests only." },
          requestId,
          sideEffects: "none",
          capabilities: { research: true, walletExposure: Boolean(exposure), quote: Boolean(quotes), signing: false, broadcast: false }
        }, requestId, { allow: "GET" });
        return;
      }
      if (url.pathname === "/api/health") {
        sendJson(response, 200, {
          status: "ok",
          mode,
          requestId,
          durationMs: Math.round(performance.now() - startedAt),
          sideEffects: "none",
          researchOnly: true,
          credentials: mode === "live-readonly" ? "server-only" : "none",
          capabilities: { assetDirectory: true, research: true, walletExposure: Boolean(exposure), quote: Boolean(quotes), signing: false, broadcast: false }
        }, requestId);
        return;
      }
      if (url.pathname === "/api/assets") {
        const chainId = url.searchParams.get("chainId")?.trim() || "56";
        const platformId = url.searchParams.get("platformId")?.trim() || undefined;
        const text = url.searchParams.get("query")?.trim() || undefined;
        const offset = Number(url.searchParams.get("offset") ?? "0");
        const limit = Number(url.searchParams.get("limit") ?? "36");
        try {
          const catalog = await stocks.listSnapshot({ chainId, platformId });
          const platforms = await stocks.platforms();
          const view = buildAssetDirectoryView(catalog.listings, platforms, {
            text,
            chainId,
            platformId,
            offset: Number.isFinite(offset) ? offset : 0,
            limit: Number.isFinite(limit) ? limit : 36,
            sourceResponseTimestampMs: catalog.sourceResponseTimestampMs,
            platformMetadataResponseTimestampMs: catalog.platformMetadataResponseTimestampMs
          });
          sendJson(response, 200, { mode, requestId, durationMs: Math.round(performance.now() - startedAt), view }, requestId);
        } catch (error) {
          console.warn(`[ariadne-web:${requestId}] asset directory unavailable: ${error instanceof Error ? error.message : String(error)}`);
          sendJson(response, 502, {
            mode,
            requestId,
            error: { code: "asset_directory_unavailable", message: "The asset directory is temporarily unavailable.", retryable: true },
            sideEffects: "none"
          }, requestId);
        }
        return;
      }
      if (url.pathname === "/api/asset-prices") {
        const chainId = url.searchParams.get("chainId")?.trim() || "56";
        const encoded = url.searchParams.getAll("representation");
        const representations: RepresentationIdentity[] = [];
        for (const item of encoded) {
          const separator = item.indexOf(":");
          if (separator <= 0) {
            sendJson(response, 400, { error: { code: "invalid_representation", message: "Each representation must include a platform and contract address." }, sideEffects: "none" }, requestId);
            return;
          }
          representations.push({
            chainId,
            platformId: item.slice(0, separator),
            contractAddress: item.slice(separator + 1)
          });
        }
        if (mode !== "live-readonly" || !stocks.tokenPriceSnapshots) {
          sendJson(response, 501, { error: { code: "timestamped_prices_unavailable", message: "Timestamped provider prices are unavailable in this mode." }, sideEffects: "none" }, requestId);
          return;
        }
        if (chainId !== "56" || representations.length < 1 || representations.length > 100 ||
          representations.some((item) => !/^[a-z0-9_-]{1,32}$/i.test(item.platformId) || !/^0x[a-fA-F0-9]{40}$/.test(item.contractAddress))) {
          sendJson(response, 400, { error: { code: "invalid_asset_price_request", message: "Request 1–100 BNB Chain representations with valid platform IDs and contract addresses." }, sideEffects: "none" }, requestId);
          return;
        }
        try {
          const items = await stocks.tokenPriceSnapshots(representations);
          sendJson(response, 200, { mode, requestId, view: { kind: "timestamped_token_prices", items }, sideEffects: "none" }, requestId);
        } catch (error) {
          console.warn(`[ariadne-web:${requestId}] timestamped prices unavailable: ${error instanceof Error ? error.message : String(error)}`);
          sendJson(response, 502, { error: { code: "asset_prices_unavailable", message: "Timestamped asset prices are temporarily unavailable.", retryable: true }, sideEffects: "none" }, requestId);
        }
        return;
      }
      if (url.pathname === "/api/research") {
        const query = url.searchParams.get("query")?.trim() || "NVDA";
        const chainId = url.searchParams.get("chainId")?.trim() || "56";
        try {
          const view = await research(stocks, query, chainId);
          sendJson(response, 200, { mode, requestId, durationMs: Math.round(performance.now() - startedAt), view }, requestId);
        } catch (error) {
          console.warn(`[ariadne-web:${requestId}] read-only research unavailable: ${error instanceof Error ? error.message : String(error)}`);
          sendJson(response, 502, {
            mode,
            requestId,
            durationMs: Math.round(performance.now() - startedAt),
            error: {
              code: "research_unavailable",
              message: "Read-only research is temporarily unavailable. Retry later or use Demo Mode.",
              retryable: true
            },
            sideEffects: "none",
            capabilities: { research: true, quote: false, signing: false, broadcast: false }
          }, requestId);
        }
        return;
      }
      if (url.pathname === "/api/candles") {
        const query = url.searchParams.get("query")?.trim() ?? "";
        const chainId = url.searchParams.get("chainId")?.trim() || "56";
        const platformId = url.searchParams.get("platformId")?.trim() ?? "";
        const contractAddress = url.searchParams.get("contractAddress")?.trim() ?? "";
        const bar = url.searchParams.get("bar")?.trim() || "1m";
        if (!query || chainId !== "56" || !/^[a-z0-9_-]{1,32}$/i.test(platformId) || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress) || !["1m", "5m", "15m", "1h", "1d"].includes(bar)) {
          sendJson(response, 400, { mode, requestId, error: { code: "invalid_candles_request", message: "Provide a BNB Chain ticker, exact platform and contract, and supported interval." }, sideEffects: "none" }, requestId);
          return;
        }
        try {
          const assets = await stocks.search(query, { chainId });
          const asset = assets.find(item => item.underlyingTicker.toLowerCase() === query.toLowerCase() && item.platformId.toLowerCase() === platformId.toLowerCase() && item.contractAddress.toLowerCase() === contractAddress.toLowerCase());
          if (!asset) {
            sendJson(response, 404, { mode, requestId, error: { code: "representation_not_found", message: "The exact representation was not found." }, sideEffects: "none" }, requestId);
            return;
          }
          if (mode === "demo" || !stocks.candles) {
            sendJson(response, 200, { mode, requestId, view: { state: "unavailable", candles: [], bar, chainId, platformId: asset.platformId, contractAddress, source: "none", asOf: null, sourceResponseTimestampMs: null }, sideEffects: "none" }, requestId);
            return;
          }
          const raw = await stocks.candles(asset, { bar, limit: 90 });
          const candles = normalizeMarketCandles(raw);
          sendJson(response, 200, { mode, requestId, view: { state: candles.length ? "ready" : "empty", candles, bar, chainId, platformId: asset.platformId, contractAddress, source: "binance_web3_market_api", asOf: candles.at(-1)?.time ?? null, sourceResponseTimestampMs: null }, sideEffects: "none" }, requestId);
        } catch (error) {
          console.warn(`[ariadne-web:${requestId}] candles unavailable: ${error instanceof Error ? error.message : String(error)}`);
          sendJson(response, 502, { mode, requestId, error: { code: "candles_unavailable", message: "Market candles are temporarily unavailable.", retryable: true }, sideEffects: "none" }, requestId);
        }
        return;
      }
      if (url.pathname === "/api/exposure") {
        const walletAddress = url.searchParams.get("walletAddress")?.trim() ?? "";
        const chainId = url.searchParams.get("chainId")?.trim() || "56";
        const query = url.searchParams.get("query")?.trim() || "NVDA";
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
          sendJson(response, 400, {
            mode,
            requestId,
            error: { code: "invalid_wallet_address", message: "Provide a valid public EVM wallet address." },
            sideEffects: "none",
            capabilities: { research: true, walletExposure: Boolean(exposure), quote: Boolean(quotes), signing: false, broadcast: false }
          }, requestId);
          return;
        }
        if (!exposure) {
          sendJson(response, 501, {
            mode,
            requestId,
            error: { code: "wallet_exposure_unavailable", message: "Wallet exposure is not enabled in this server mode." },
            sideEffects: "none",
            capabilities: { research: true, walletExposure: false, quote: false, signing: false, broadcast: false }
          }, requestId);
          return;
        }
        try {
          const [holdings, assets] = await Promise.all([
            exposure.holdings(walletAddress, [chainId]),
            stocks.search(query, { chainId })
          ]);
          const view = buildWalletExposureView(walletAddress, chainId, query, holdings, assets);
          sendJson(response, 200, { mode, requestId, durationMs: Math.round(performance.now() - startedAt), view }, requestId);
        } catch (error) {
          console.warn(`[ariadne-web:${requestId}] wallet exposure unavailable: ${error instanceof Error ? error.message : String(error)}`);
          sendJson(response, 502, {
            mode,
            requestId,
            error: { code: "wallet_exposure_unavailable", message: "Wallet exposure is temporarily unavailable. Retry later or use Demo Mode.", retryable: true },
            sideEffects: "none",
            capabilities: { research: true, walletExposure: true, quote: Boolean(quotes), signing: false, broadcast: false }
          }, requestId);
        }
        return;
      }
      if (url.pathname === "/api/quote") {
        const walletAddress = url.searchParams.get("walletAddress")?.trim() ?? "";
        const chainId = url.searchParams.get("chainId")?.trim() || "56";
        const query = url.searchParams.get("query")?.trim() || "NVDA";
        const platformId = url.searchParams.get("platformId")?.trim() ?? "";
        const contractAddress = url.searchParams.get("contractAddress")?.trim() ?? "";
        const amount = url.searchParams.get("amount")?.trim() ?? "";
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
          sendJson(response, 400, { mode, requestId, error: { code: "invalid_wallet_address", message: "Provide a valid public EVM wallet address." }, sideEffects: "none" }, requestId);
          return;
        }
        if (!platformId || (contractAddress && !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) || !/^\d{1,7}$/.test(amount) || Number(amount) <= 0 || Number(amount) > 1_000_000) {
          sendJson(response, 400, { mode, requestId, error: { code: "invalid_quote_request", message: "Provide a valid contract, if specified, and a positive whole-USDT amount." }, sideEffects: "none" }, requestId);
          return;
        }
        if (!quotes) {
          sendJson(response, 501, { mode, requestId, error: { code: "quote_unavailable", message: "Read-only quotes are not enabled in this server mode." }, sideEffects: "none" }, requestId);
          return;
        }
        try {
          const assets = await stocks.search(query, { chainId, platformId });
          const asset = contractAddress
            ? assets.find(item => item.underlyingTicker.toLowerCase() === query.toLowerCase() && item.contractAddress.toLowerCase() === contractAddress.toLowerCase())
            : assets.find(item => item.underlyingTicker.toLowerCase() === query.toLowerCase());
          if (!asset) {
            sendJson(response, 404, { mode, requestId, error: { code: "representation_not_found", message: "No matching tokenized-stock representation was found for that issuer." }, sideEffects: "none" }, requestId);
            return;
          }
          const quote = await quotes.quote({
            type: "buy",
            walletAddress,
            fromTokenAddress: "0x55d398326f99059fF775485246999027B3197955",
            toAsset: asset,
            amount,
            amountDecimals: 18,
          });
          const { buildReadOnlyQuoteView } = await import("./read-only-quote.js");
          const view = buildReadOnlyQuoteView(walletAddress, amount, asset, quote);
          sendJson(response, 200, { mode, requestId, durationMs: Math.round(performance.now() - startedAt), view }, requestId);
        } catch (error) {
          console.warn(`[ariadne-web:${requestId}] read-only quote unavailable: ${error instanceof Error ? error.message : String(error)}`);
          sendJson(response, 502, { mode, requestId, error: { code: "quote_unavailable", message: "Read-only quote is temporarily unavailable. Retry later or use Demo Mode.", retryable: true }, sideEffects: "none" }, requestId);
        }
        return;
      }
      if (url.pathname === "/api/preflight") {
        const walletAddress = url.searchParams.get("walletAddress")?.trim() ?? "";
        const chainId = url.searchParams.get("chainId")?.trim() ?? "";
        const query = url.searchParams.get("query")?.trim() ?? "";
        const platformId = url.searchParams.get("platformId")?.trim() ?? "";
        const contractAddress = url.searchParams.get("contractAddress")?.trim() ?? "";
        const amount = url.searchParams.get("amount")?.trim() ?? "";
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress) || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress) || chainId !== "56" || !query || !platformId || !/^\d{1,7}$/.test(amount) || Number(amount) <= 0 || Number(amount) > 1_000_000) {
          sendJson(response, 400, { mode, requestId, error: { code: "invalid_preflight_request", message: "Provide a public wallet, exact BNB contract and positive whole-USDT amount." }, sideEffects: "none" }, requestId);
          return;
        }
        if (!preflight || !simulator) {
          sendJson(response, 501, { mode, requestId, error: { code: "preflight_unavailable", message: "Read-only preflight is not enabled." }, sideEffects: "none" }, requestId);
          return;
        }
        try {
          const assets = await stocks.search(query, { chainId, platformId });
          const asset = assets.find(item => item.underlyingTicker.toLowerCase() === query.toLowerCase() && item.contractAddress.toLowerCase() === contractAddress.toLowerCase());
          if (!asset) {
            sendJson(response, 404, { mode, requestId, error: { code: "representation_not_found", message: "The exact representation was not found." }, sideEffects: "none" }, requestId);
            return;
          }
          const plan = await preflight.createActionPlan({
            type: "buy",
            walletAddress,
            fromTokenAddress: "0x55d398326f99059fF775485246999027B3197955",
            toAsset: asset,
            amount,
            amountDecimals: 18
          });
          const action = plan.unsignedActions?.[0] as { kind?: string; payload?: { tx?: { from?: string; to?: string; value?: string; data?: string } } } | undefined;
          let simulation: { state: "not_run" | "unsupported_route" | "completed"; success?: boolean; warnings?: string[] } = { state: "not_run" };
          if (action?.kind === "rfq_order") simulation = { state: "unsupported_route", warnings: ["RFQ orders require an external signature and cannot be EVM-simulated here."] };
          else if (action?.kind === "evm_transaction") {
            const tx = action.payload?.tx;
            if (tx && /^0x[a-fA-F0-9]{40}$/.test(tx.to ?? "") && /^\d+$/.test(tx.value ?? "") && (!tx.data || /^0x[0-9a-fA-F]*$/.test(tx.data))) {
              const result = await simulator.simulateEvm(chainId, { from: walletAddress, to: tx.to!, value: tx.value!, data: tx.data });
              simulation = { state: "completed", success: result.success, warnings: result.warnings };
            }
          }
          sendJson(response, 200, { mode, requestId, view: { kind: "read_only_preflight", asset: { ticker: asset.underlyingTicker, issuer: asset.platformId, contractAddress }, status: plan.status, safety: plan.safetyReport ? { passed: plan.safetyReport.passed, checks: plan.safetyReport.checks, blockingReasons: plan.safetyReport.blockingReasons } : null, simulation, expiresAt: plan.expiresAt ?? null, boundary: { sideEffects: "none", signatureRequested: false, broadcastAttempted: false, unsignedActionReturned: false } } }, requestId);
        } catch (error) {
          console.warn(`[ariadne-web:${requestId}] preflight unavailable: ${error instanceof Error ? error.message : String(error)}`);
          sendJson(response, 502, { mode, requestId, error: { code: "preflight_unavailable", message: "Read-only preflight could not complete.", retryable: true }, sideEffects: "none" }, requestId);
        }
        return;
      }
      sendJson(response, 404, { error: { code: "not_found", message: "API route not found" }, requestId }, requestId);
    })().catch((error) => {
      console.warn(`[ariadne-web] request failed: ${error instanceof Error ? error.message : String(error)}`);
      if (!response.headersSent) sendJson(response, 500, {
        error: { code: "internal_error", message: "The read-only research surface could not complete the request.", retryable: true },
        sideEffects: "none"
      });
    });
  });
}

export function createWebDemoServer(): Server {
  return createWebServer("demo", demoService, demoWalletExposure, demoQuoteService);
}

export function createWebLiveServer(): Server {
  const apiKey = process.env.BINANCE_WEB3_API_KEY;
  const apiSecret = process.env.BINANCE_WEB3_API_SECRET;
  if (!apiKey || !apiSecret) throw new Error("Missing Binance Web3 credentials for live read-only web mode");
  const client = new BinanceWeb3Client({
    apiKey,
    apiSecret,
    baseUrl: process.env.BINANCE_WEB3_BASE_URL,
    proxyUrl: process.env.BINANCE_WEB3_PROXY_URL
  });
  const stocks = new TokenizedStocksService(client);
  return createWebServer("live-readonly", stocks, new WalletService(client), stocks, stocks, new TransactionService(client));
}
