import { createServer, type Server, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { BinanceWeb3Client } from "../binance-web3-client.js";
import { compareAgentAssets, toAgentAsset } from "../domain/agent-normalizers.js";
import { researchNextSteps } from "../presentation/asset-view.js";
import { DemoTokenizedStocksService } from "../services/demo-tokenized-stocks.js";
import { TokenizedStocksService } from "../services/tokenized-stocks.js";
import { WalletService } from "../services/wallet.js";
import { buildResearchWorkspaceView } from "./research-workspace.js";
import { buildWalletExposureView } from "./wallet-exposure.js";
import type { QuoteResult, TradeIntent, WalletHolding } from "../domain/types.js";

const demoService = new DemoTokenizedStocksService({} as any);
export type ResearchService = Pick<TokenizedStocksService, "search" | "marketContext">;
export type WalletExposureService = Pick<WalletService, "holdings">;
export type ReadOnlyQuoteService = Pick<TokenizedStocksService, "quote">;

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
  const enriched = await Promise.all(assets.map(async (asset) => toAgentAsset(asset, await stocks.marketContext(asset))));
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
    marketContextRequests: enriched.length,
    agentReasoningExcluded: true as const
  };
  return buildResearchWorkspaceView(enriched, comparison, nextSteps, timing, {
    ticker: query.toUpperCase(),
    name: enriched[0]?.underlyingName ?? query,
    chainId
  });
}

async function serveStatic(pathname: string, response: ServerResponse): Promise<boolean> {
  const files: Record<string, { path: string; contentType: string }> = {
    "/": { path: resolve("web/index.html"), contentType: "text/html; charset=utf-8" },
    "/index.html": { path: resolve("web/index.html"), contentType: "text/html; charset=utf-8" },
    "/styles.css": { path: resolve("web/styles.css"), contentType: "text/css; charset=utf-8" },
    "/app.js": { path: resolve("web/app.js"), contentType: "text/javascript; charset=utf-8" }
  };
  const file = files[pathname];
  if (!file) return false;
  try {
    const body = await readFile(file.path);
    response.writeHead(200, { "content-type": file.contentType, "cache-control": "no-store" });
    response.end(body);
  } catch {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end("Ariadne Demo asset unavailable");
  }
  return true;
}

export function createWebServer(mode: "demo" | "live-readonly", stocks: ResearchService, exposure?: WalletExposureService, quotes?: ReadOnlyQuoteService): Server {
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
          capabilities: { research: true, walletExposure: Boolean(exposure), quote: Boolean(quotes), signing: false, broadcast: false }
        }, requestId);
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
        const amount = url.searchParams.get("amount")?.trim() ?? "";
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
          sendJson(response, 400, { mode, requestId, error: { code: "invalid_wallet_address", message: "Provide a valid public EVM wallet address." }, sideEffects: "none" }, requestId);
          return;
        }
        if (!platformId || !/^\d+(\.\d+)?$/.test(amount) || Number(amount) <= 0) {
          sendJson(response, 400, { mode, requestId, error: { code: "invalid_quote_request", message: "Provide a platform and a positive USDT amount." }, sideEffects: "none" }, requestId);
          return;
        }
        if (!quotes) {
          sendJson(response, 501, { mode, requestId, error: { code: "quote_unavailable", message: "Read-only quotes are not enabled in this server mode." }, sideEffects: "none" }, requestId);
          return;
        }
        try {
          const assets = await stocks.search(query, { chainId, platformId });
          const asset = assets[0];
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
      if (await serveStatic(url.pathname, response)) return;
      sendJson(response, 404, { error: { code: "not_found", message: "Not found" }, requestId }, requestId);
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
  return createWebServer("live-readonly", stocks, new WalletService(client), stocks);
}
