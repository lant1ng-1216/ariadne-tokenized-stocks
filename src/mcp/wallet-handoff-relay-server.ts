import { createHash, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BinanceWeb3Client } from "../binance-web3-client.js";
import { TokenizedStocksService } from "../services/tokenized-stocks.js";
import { TransactionService } from "../services/transaction.js";
import { attachSimulation, confirmPlan } from "../domain/action-plan.js";
import { buildWalletSubmissionRequest } from "../services/eip1193-wallet.js";
import { fetchBinanceWeb3Klines } from "../services/binance-web3-kline.js";
import { formatTokenAmount } from "../domain/amount.js";
import { buildExternalWalletApprovalPageHtml } from "./ui/external-wallet-approval-page-html.js";
import { WalletHandoffStore, type ExternalWalletAllowancePreparation, type ExternalWalletCandle, type ExternalWalletCandleInterval, type ExternalWalletClientStage, type ExternalWalletFailureStage, type ExternalWalletHandoffCreate, type ExternalWalletHandoffSnapshot, type ExternalWalletMarketSnapshot, type ExternalWalletPurchaseIntent, type ExternalWalletPurchaseRefresh } from "../services/wallet-handoff-relay.js";
import type { ActionPlan, AllowanceApprovalPlan } from "../domain/types.js";

type RelayServerOptions = {
  host?: string;
  port?: number;
  portalOrigin: string;
  serviceSecret: string;
  storagePath?: string;
  openExternalBrowser?: (url: string) => Promise<void>;
  readMarketSnapshot?: (identity: { chainId: "56"; platformId: string; contractAddress: string }) => Promise<Omit<ExternalWalletMarketSnapshot, "source" | "fetchedAt">>;
  readMarketCandles?: (identity: { chainId: "56"; platformId: string; contractAddress: string }, interval: ExternalWalletCandleInterval, limit: number) => Promise<ExternalWalletCandle[]>;
  preparePurchaseIntent?: (intent: ExternalWalletPurchaseIntent, account: string) => Promise<{ plan: ActionPlan; display: ExternalWalletHandoffCreate["display"] }>;
  preparePurchaseRefresh?: (plan: ActionPlan, handoffId: string) => Promise<ExternalWalletPurchaseRefresh | ExternalWalletAllowancePreparation>;
  finalizeAllowancePurchase?: (input: {
    handoffId: string;
    originalPlan: ActionPlan;
    approvalPlan: AllowanceApprovalPlan;
    txHash: string;
  }) => Promise<
    | { status: "pending"; reason?: string }
    | { status: "reverted" | "blocked"; reason: string; allowanceFinalized?: boolean; allowance?: string; balance?: string }
    | { status: "ready"; refresh: ExternalWalletPurchaseRefresh; allowance?: string; balance?: string }
  >;
};
const HANDOFF_ID = /^[a-f0-9]{32}$/;
const CAPABILITY = /^[A-Za-z0-9_-]{40,}$/;
const CANDLE_INTERVALS = new Set<ExternalWalletCandleInterval>(["1m", "5m", "15m", "1h", "4h", "12h", "1d"]);

function issuerDisplayName(platformId: string): string {
  if (platformId === "bstock") return "bStocks";
  if (platformId === "ondo") return "Ondo";
  return platformId;
}

function constantTimeSecretEquals(expected: string, actual: string): boolean {
  const expectedHash = createHash("sha256").update(expected).digest();
  const actualHash = createHash("sha256").update(actual).digest();
  return timingSafeEqual(expectedHash, actualHash) && expected === actual;
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer"
  });
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage, maximumBytes = 24_000): Promise<unknown> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += buffer.length;
    if (length > maximumBytes) throw new Error("Request body is too large");
    chunks.push(buffer);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function pathHandoffId(path: string, suffix = ""): string | undefined {
  const match = path.match(new RegExp(`^/api/(?:internal/)?handoffs/([a-f0-9]{32})${suffix}$`));
  return match?.[1];
}

function isSameLoopbackOriginRequest(request: IncomingMessage, origin: string | undefined): boolean {
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    const isLoopbackOrigin = parsed.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) && parsed.origin === origin;
    const matchesRequestOrigin = typeof request.headers.host === "string" && parsed.host.toLowerCase() === request.headers.host.toLowerCase();
    const remote = request.socket.remoteAddress ?? "";
    const isLoopbackPeer = remote === "::1" || remote === "127.0.0.1" || remote.startsWith("127.") || remote.startsWith("::ffff:127.");
    return isLoopbackOrigin && matchesRequestOrigin && isLoopbackPeer;
  } catch {
    return false;
  }
}

function setPortalSecurityHeaders(response: ServerResponse) {
  response.setHeader("content-type", "text/html; charset=utf-8");
  response.setHeader("cache-control", "no-store, max-age=0");
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("referrer-policy", "no-referrer");
  response.setHeader("permissions-policy", "camera=(), microphone=(), geolocation=()");
  response.setHeader("content-security-policy", "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self' https://bsc-dataseed.binance.org; img-src data: https://onchainos.bnbstatic.com https://public.bnbstatic.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
}

function sendLauncherPage(response: ServerResponse, handoffId: string) {
  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store, max-age=0",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; connect-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
  });
  response.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ariadne · Opening wallet page</title><body style="font:16px system-ui,sans-serif;margin:3rem;color:#242424"><main><h1>Ariadne</h1><p id="status">Opening the one-time wallet page in your default browser…</p><p>Your wallet page is opened separately. This launcher does not request wallet access or send a transaction.</p></main><script>
    (() => {
      const status = document.getElementById("status");
      const capability = location.hash.slice(1);
      history.replaceState(null, "", location.pathname);
      if (!/^[A-Za-z0-9_-]{40,}$/.test(capability)) { status.textContent = "This wallet link is incomplete. Return to Ariadne and prepare a fresh page."; return; }
      fetch("/api/open-external", { method: "POST", headers: { "content-type": "application/json" }, cache: "no-store", credentials: "same-origin", body: JSON.stringify({ handoffId: "${handoffId}", capability }) })
        .then(async response => { const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || "The wallet page could not be opened."); status.textContent = "Ariadne opened the wallet page in your default browser. Continue there."; })
        .catch(error => { status.textContent = error instanceof Error ? error.message : "The wallet page could not be opened."; });
    })();
  </script></body></html>`);
}

async function openWithSystemBrowser(url: string): Promise<void> {
  const [command, args] = process.platform === "darwin"
    ? ["open", [url]]
    : process.platform === "win32"
      ? ["rundll32.exe", ["url.dll,FileProtocolHandler", url]]
      : ["xdg-open", [url]];
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { detached: true, stdio: "ignore", shell: false });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

export async function createWalletHandoffRelayServer(options: RelayServerOptions): Promise<{ server: Server; store: WalletHandoffStore; html: string }> {
  if (!options.serviceSecret || options.serviceSecret.length < 32) throw new Error("Wallet handoff relay service secret must contain at least 32 characters");
  const portalUrl = new URL(options.portalOrigin);
  const canonicalOrigin = portalUrl.origin;
  const store = new WalletHandoffStore({ portalOrigin: `${canonicalOrigin}/`, storagePath: options.storagePath });
  const [html, englishHtml] = await Promise.all([
    buildExternalWalletApprovalPageHtml("zh-CN"),
    buildExternalWalletApprovalPageHtml("en")
  ]);
  const serviceSecret = options.serviceSecret;
  const openExternalBrowser = options.openExternalBrowser ?? openWithSystemBrowser;
  const marketCache = new Map<string, { at: number; value: ExternalWalletMarketSnapshot }>();
  const candleCache = new Map<string, { at: number; candles: ExternalWalletCandle[] }>();
  // Preserve the exact SDK-prepared object identity used by its mutation guard.
  // If the relay restarts between approval preparation and finality, the stored
  // clone remains inspectable but continuation fails closed and requests a new review.
  const liveAllowancePlans = new Map<string, AllowanceApprovalPlan>();

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://relay.local");
    const path = url.pathname;
    const authorization = request.headers.authorization;
    const bearer = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    const internal = path.startsWith("/api/internal/");

    if (request.method === "GET" && path === "/healthz") {
      return sendJson(response, 200, { status: "ok", service: "ariadne-wallet-handoff-relay" });
    }
    if (request.method === "GET" && (path === "/" || path === "/approve")) {
      setPortalSecurityHeaders(response);
      response.end(url.searchParams.get("lang") === "en" ? englishHtml : html);
      return;
    }
    const launcherMatch = request.method === "GET" ? path.match(/^\/open-external\/([a-f0-9]{32})$/) : undefined;
    if (launcherMatch) return sendLauncherPage(response, launcherMatch[1]!);

    if (internal && !constantTimeSecretEquals(serviceSecret, bearer)) return sendJson(response, 401, { error: "unauthorized" });
    const sameLoopbackOriginRequest = isSameLoopbackOriginRequest(request, request.headers.origin);
    if (!internal && request.headers.origin && request.headers.origin !== canonicalOrigin && !sameLoopbackOriginRequest) return sendJson(response, 403, { error: "origin_not_allowed" });
    if (!internal && request.method === "POST" && request.headers.origin !== canonicalOrigin && !sameLoopbackOriginRequest) return sendJson(response, 403, { error: "origin_required" });

    try {
      if (request.method === "POST" && path === "/api/internal/handoffs") {
        const input = await readJson(request) as ExternalWalletHandoffCreate;
        const created = store.create(input);
        return sendJson(response, 201, created);
      }
      if (request.method === "POST" && internal && path === "/api/internal/purchase-plan-reviews") {
        const input = await readJson(request) as { plan?: unknown; display?: unknown };
        if (!isRecord(input) || !isRecord(input.plan) || !isRecord(input.display)) return sendJson(response, 400, { error: "invalid_purchase_plan_review" });
        const created = store.createPurchasePlanReview(input.plan as unknown as ActionPlan, input.display as unknown as ExternalWalletHandoffCreate["display"]);
        return sendJson(response, 201, created);
      }
      if (request.method === "POST" && internal && path === "/api/internal/purchase-intents") {
        const input = await readJson(request) as { intent?: unknown };
        if (!isRecord(input) || !isRecord(input.intent)) return sendJson(response, 400, { error: "invalid_purchase_intent" });
        return sendJson(response, 201, store.createPurchaseIntent(input.intent as unknown as ExternalWalletPurchaseIntent));
      }
      const followUpCreateId = pathHandoffId(path, "/follow-up");
      if (request.method === "POST" && internal && followUpCreateId) {
        const body = await readJson(request) as { parentCapability?: unknown; handoff?: unknown };
        if (typeof body.parentCapability !== "string" || !CAPABILITY.test(body.parentCapability) || !isRecord(body.handoff)) {
          return sendJson(response, 400, { error: "invalid_follow_up_handoff" });
        }
        return sendJson(response, 201, store.createFollowUp(followUpCreateId, body.parentCapability, body.handoff as ExternalWalletHandoffCreate));
      }
      if (request.method === "POST" && path === "/api/open-external") {
        const input = await readJson(request, 2_000);
        if (!isRecord(input) || typeof input.handoffId !== "string" || !HANDOFF_ID.test(input.handoffId) ||
          typeof input.capability !== "string" || !CAPABILITY.test(input.capability)) {
          return sendJson(response, 400, { error: "invalid_wallet_page_link" });
        }
        const exactPortalUrl = store.portalUrlForExternalOpen(input.handoffId, input.capability);
        await openExternalBrowser(exactPortalUrl);
        return sendJson(response, 200, { opened: true });
      }
      const createId = pathHandoffId(path, "/activate");
      if (request.method === "POST" && createId) return sendJson(response, 200, store.activate(createId));

      const deleteId = pathHandoffId(path);
      if (request.method === "DELETE" && internal && deleteId) {
        store.cancel(deleteId);
        return sendJson(response, 200, { cancelled: true });
      }

      const verificationId = pathHandoffId(path, "/verification");
      if (request.method === "POST" && internal && verificationId) {
        const update = await readJson(request);
        if (!isRecord(update) || (update.state !== "confirmed" && update.state !== "failed") || !isRecord(update.reconciliation) || typeof update.resultSummary !== "string") {
          return sendJson(response, 400, { error: "invalid_verification_update" });
        }
        return sendJson(response, 200, store.setVerification(verificationId, update as Parameters<typeof store.setVerification>[1]));
      }

      const agentReportClaimId = pathHandoffId(path, "/agent-report-claim");
      if (request.method === "POST" && internal && agentReportClaimId) {
        return sendJson(response, 200, store.claimAgentReport(agentReportClaimId));
      }

      const agentReportResultId = pathHandoffId(path, "/agent-report-result");
      if (request.method === "POST" && internal && agentReportResultId) {
        const update = await readJson(request, 1_000);
        if (!isRecord(update) || typeof update.delivered !== "boolean") {
          return sendJson(response, 400, { error: "invalid_agent_report_result" });
        }
        return sendJson(response, 200, store.finishAgentReport(agentReportResultId, update.delivered));
      }

      const refreshPurchaseId = pathHandoffId(path, "/refresh-purchase");
      if (request.method === "POST" && refreshPurchaseId) {
        if (!bearer) return sendJson(response, 401, { error: "capability_required" });
        store.readPublic(refreshPurchaseId, bearer);
        if (!options.preparePurchaseRefresh) return sendJson(response, 503, { error: "purchase_quote_refresh_unavailable" });
        const internalSnapshot = store.readInternal(refreshPurchaseId) as ExternalWalletHandoffSnapshot & { originalPlan?: ActionPlan };
        if (!internalSnapshot.originalPlan) return sendJson(response, 409, { error: "purchase_plan_review_missing" });
        try {
          const refreshed = await options.preparePurchaseRefresh(internalSnapshot.originalPlan, refreshPurchaseId);
          if ("approvalPlan" in refreshed) {
            liveAllowancePlans.set(refreshPurchaseId, refreshed.approvalPlan);
            return sendJson(response, 200, store.prepareAllowanceReview(refreshPurchaseId, bearer, refreshed));
          }
          return sendJson(response, 200, store.preparePurchaseReview(refreshPurchaseId, bearer, refreshed));
        } catch (error) {
          const reason = error instanceof Error ? error.message : "Purchase quote refresh failed";
          const stage: ExternalWalletFailureStage = /changed the original|boundary|slippage|gas cap/i.test(reason) ? "quote_boundary" : "quote_refresh";
          const failed = store.recordClientFailure(refreshPurchaseId, bearer, { stage, reason });
          return sendJson(response, 409, { error: reason, snapshot: failed });
        }
      }

      const bindWalletId = pathHandoffId(path, "/bind-wallet");
      if (request.method === "POST" && bindWalletId) {
        if (!bearer) return sendJson(response, 401, { error: "capability_required" });
        const body = await readJson(request, 2_000);
        if (!isRecord(body) || typeof body.account !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(body.account) || body.chainId !== "0x38") {
          return sendJson(response, 400, { error: "invalid_bsc_wallet_context" });
        }
        const before = store.readInternal(bindWalletId);
        if (before.reviewMode !== "purchase_intent" || !before.purchaseIntent) return sendJson(response, 409, { error: "purchase_intent_not_pending_wallet" });
        if (!options.preparePurchaseIntent || !options.preparePurchaseRefresh) return sendJson(response, 503, { error: "purchase_intent_preparation_unavailable" });
        try {
          const prepared = await options.preparePurchaseIntent(before.purchaseIntent, body.account);
          store.bindPurchaseIntent(bindWalletId, bearer, prepared.plan, prepared.display);
          const refreshed = await options.preparePurchaseRefresh(prepared.plan, bindWalletId);
          if ("approvalPlan" in refreshed) {
            liveAllowancePlans.set(bindWalletId, refreshed.approvalPlan);
            return sendJson(response, 200, store.prepareAllowanceReview(bindWalletId, bearer, refreshed));
          }
          return sendJson(response, 200, store.preparePurchaseReview(bindWalletId, bearer, refreshed));
        } catch (error) {
          const reason = error instanceof Error ? error.message : "Wallet-bound purchase preparation failed";
          return sendJson(response, 409, { error: reason, snapshot: store.readPublic(bindWalletId, bearer) });
        }
      }

      const finalizeAllowanceId = pathHandoffId(path, "/finalize-allowance");
      if (request.method === "POST" && finalizeAllowanceId) {
        if (!bearer) return sendJson(response, 401, { error: "capability_required" });
        const current = store.readInternal(finalizeAllowanceId);
        if (current.followUpHandoffId && current.state === "confirmed") {
          const followUp = store.readFollowUp(finalizeAllowanceId, bearer);
          return sendJson(response, 200, { ...store.readPublic(finalizeAllowanceId, bearer), followUp });
        }
        if (current.state !== "submitted" || current.display.operation !== "allowance_approval" ||
          !current.txHash || !current.originalPlan || !current.allowancePlan) {
          return sendJson(response, 409, { error: "allowance_submission_not_ready" });
        }
        if (!options.finalizeAllowancePurchase) return sendJson(response, 503, { error: "allowance_finality_unavailable" });
        const preparedApproval = liveAllowancePlans.get(finalizeAllowanceId);
        if (!preparedApproval) {
          const reason = "The relay restarted after preparing this allowance. Its transaction status remains visible, but purchase continuation needs a fresh reviewed plan.";
          const failed = store.setVerification(finalizeAllowanceId, {
            state: "failed",
            reconciliation: { status: "blocked", stage: "allowance_finality", transactionHash: current.txHash, fundsChanged: null, reason },
            resultSummary: `USDT 授权交易已提交，但服务重启后无法安全地沿用原计划生成购买请求。${reason}`
          });
          return sendJson(response, 409, { error: reason, snapshot: failed });
        }
        const result = await options.finalizeAllowancePurchase({
          handoffId: finalizeAllowanceId,
          originalPlan: current.originalPlan,
          approvalPlan: preparedApproval,
          txHash: current.txHash
        });
        if (result.status === "pending") {
          return sendJson(response, 202, { ...store.readPublic(finalizeAllowanceId, bearer), allowanceFinality: "pending", allowanceFinalityReason: result.reason });
        }
        const allowanceReconciliation = {
          status: result.status,
          stage: "allowance_finality",
          transactionHash: current.txHash,
          allowanceFinalized: result.status === "ready" ? true : result.allowanceFinalized ?? false,
          ...(result.allowance ? { allowance: result.allowance } : {}),
          ...(result.balance ? { balance: result.balance } : {}),
          ...(result.status !== "ready" ? { reason: result.reason } : {})
        };
        if (result.status !== "ready") {
          const finalized = result.allowanceFinalized === true;
          store.setVerification(finalizeAllowanceId, {
            state: finalized ? "confirmed" : "failed",
            reconciliation: allowanceReconciliation,
            resultSummary: finalized
              ? `USDT 授权已确认，但无法按原计划继续买入。原因：${result.reason}`
              : `USDT 授权未能核实完成；没有生成股票购买请求。原因：${result.reason}`
          });
          if (finalized) store.setContinuationStatus(finalizeAllowanceId, { status: "blocked", reason: result.reason });
          return sendJson(response, 200, store.readPublic(finalizeAllowanceId, bearer));
        }
        store.setVerification(finalizeAllowanceId, {
          state: "confirmed",
          reconciliation: allowanceReconciliation,
          resultSummary: "USDT 授权已在 BSC 确认；正在为同一份原始计划准备独立的股票购买确认。"
        });
        const created = store.createPurchaseFollowUpAfterAllowance(finalizeAllowanceId, bearer, result.refresh);
        store.setContinuationStatus(finalizeAllowanceId, { status: "ready", followUpHandoffId: created.id });
        liveAllowancePlans.delete(finalizeAllowanceId);
        return sendJson(response, 200, { ...store.readPublic(finalizeAllowanceId, bearer), followUp: { id: created.id, capability: created.capability } });
      }

      const acceptPurchaseQuoteId = pathHandoffId(path, "/accept-purchase-quote");
      if (request.method === "POST" && acceptPurchaseQuoteId) {
        if (!bearer) return sendJson(response, 401, { error: "capability_required" });
        const body = await readJson(request, 2_000);
        if (!isRecord(body) || typeof body.quoteId !== "string" || body.quoteId.length > 256) {
          return sendJson(response, 400, { error: "invalid_quote_acceptance" });
        }
        return sendJson(response, 200, store.acceptLatestPurchaseQuote(acceptPurchaseQuoteId, bearer, body.quoteId));
      }

      const continuationId = pathHandoffId(path, "/continuation");
      if (request.method === "POST" && internal && continuationId) {
        const update = await readJson(request);
        if (!isRecord(update) || (update.status !== "ready" && update.status !== "blocked") ||
          (update.reason !== undefined && typeof update.reason !== "string") ||
          (update.followUpHandoffId !== undefined && (typeof update.followUpHandoffId !== "string" || !HANDOFF_ID.test(update.followUpHandoffId)))) {
          return sendJson(response, 400, { error: "invalid_continuation_update" });
        }
        return sendJson(response, 200, store.setContinuationStatus(continuationId, update as Parameters<typeof store.setContinuationStatus>[1]));
      }

      const attemptId = pathHandoffId(path, "/attempt");
      if (request.method === "POST" && attemptId) {
        if (!bearer) return sendJson(response, 401, { error: "capability_required" });
        const input = await readJson(request, 2_000);
        if (!isRecord(input) || typeof input.attemptId !== "string" || !/^[a-f0-9-]{36}$/i.test(input.attemptId)) {
          return sendJson(response, 400, { error: "invalid_wallet_attempt" });
        }
        return sendJson(response, 200, store.claimWalletAttempt(attemptId, bearer, input.attemptId));
      }

      const clientStageId = pathHandoffId(path, "/client-stage");
      if (request.method === "POST" && clientStageId) {
        if (!bearer) return sendJson(response, 401, { error: "capability_required" });
        const input = await readJson(request, 2_000);
        if (!isRecord(input) || typeof input.stage !== "string" || (input.detail !== undefined && typeof input.detail !== "string")) {
          return sendJson(response, 400, { error: "invalid_wallet_client_stage" });
        }
        return sendJson(response, 200, store.recordClientStage(clientStageId, bearer, input.stage as ExternalWalletClientStage, input.detail));
      }

      const clientFailureId = pathHandoffId(path, "/client-failure");
      if (request.method === "POST" && clientFailureId) {
        if (!bearer) return sendJson(response, 401, { error: "capability_required" });
        const input = await readJson(request, 4_000);
        if (!isRecord(input) || typeof input.stage !== "string" || typeof input.reason !== "string" || input.reason.length > 1_000) {
          return sendJson(response, 400, { error: "invalid_wallet_client_failure" });
        }
        return sendJson(response, 200, store.recordClientFailure(clientFailureId, bearer, input as { stage: ExternalWalletFailureStage; reason: string }));
      }

      const internalId = pathHandoffId(path);
      if (request.method === "GET" && internal && internalId) return sendJson(response, 200, store.readInternal(internalId));

      const publicFollowUpId = pathHandoffId(path, "/follow-up");
      if (request.method === "GET" && publicFollowUpId) {
        if (!bearer) return sendJson(response, 401, { error: "capability_required" });
        return sendJson(response, 200, store.readFollowUp(publicFollowUpId, bearer));
      }

      const marketId = pathHandoffId(path, "/market");
      if (request.method === "GET" && marketId) {
        if (!bearer) return sendJson(response, 401, { error: "capability_required" });
        if (!options.readMarketSnapshot) return sendJson(response, 503, { state: "unavailable", source: "Binance Web3", fetchedAt: Date.now() });
        const identity = store.readMarketReference(marketId, bearer);
        const key = `${identity.chainId}:${identity.platformId}:${identity.contractAddress.toLowerCase()}`;
        const cached = marketCache.get(key);
        if (cached && Date.now() - cached.at < 2_500) return sendJson(response, 200, cached.value);
        try {
          const live = await options.readMarketSnapshot(identity);
          const value: ExternalWalletMarketSnapshot = { ...live, source: "Binance Web3", fetchedAt: Date.now() };
          marketCache.set(key, { at: Date.now(), value });
          return sendJson(response, 200, value);
        } catch {
          const value: ExternalWalletMarketSnapshot = { state: "unavailable", source: "Binance Web3", fetchedAt: Date.now() };
          return sendJson(response, 200, value);
        }
      }

      const candlesId = pathHandoffId(path, "/candles");
      if (request.method === "GET" && candlesId) {
        if (!bearer) return sendJson(response, 401, { error: "capability_required" });
        const identity = store.readMarketReference(candlesId, bearer);
        const rawInterval = url.searchParams.get("interval") ?? "5m";
        if (!CANDLE_INTERVALS.has(rawInterval as ExternalWalletCandleInterval)) return sendJson(response, 400, { error: "unsupported_candle_interval" });
        const interval = rawInterval as ExternalWalletCandleInterval;
        const requestedLimit = Number(url.searchParams.get("limit") ?? "100");
        if (!Number.isInteger(requestedLimit) || requestedLimit < 20 || requestedLimit > 300) return sendJson(response, 400, { error: "candle_limit_must_be_between_20_and_300" });
        if (!options.readMarketCandles) return sendJson(response, 503, { state: "unavailable", source: "Binance Web3", fetchedAt: Date.now(), interval, candles: [] });
        const key = `${identity.chainId}:${identity.platformId}:${identity.contractAddress.toLowerCase()}:${interval}:${requestedLimit}`;
        const cached = candleCache.get(key);
        if (cached && Date.now() - cached.at < 10_000) {
          return sendJson(response, 200, { state: cached.candles.length ? "available" : "unavailable", source: "Binance Web3", fetchedAt: cached.at, interval, candles: cached.candles });
        }
        try {
          const candles = await options.readMarketCandles(identity, interval, requestedLimit);
          const value = candles
            .filter((candle) => Number.isSafeInteger(candle.time) && candle.time > 0 &&
              [candle.open, candle.high, candle.low, candle.close, candle.volume].every((part) => Number.isFinite(part) && part >= 0) &&
              candle.open > 0 && candle.high > 0 && candle.low > 0 && candle.close > 0 &&
              candle.high >= Math.max(candle.open, candle.close, candle.low) && candle.low <= Math.min(candle.open, candle.close, candle.high))
            .sort((left, right) => left.time - right.time)
            .filter((candle, index, rows) => index === 0 || candle.time > rows[index - 1]!.time)
            .slice(-requestedLimit);
          candleCache.set(key, { at: Date.now(), candles: value });
          return sendJson(response, 200, { state: value.length ? "available" : "unavailable", source: "Binance Web3", fetchedAt: Date.now(), interval, candles: value });
        } catch {
          return sendJson(response, 200, { state: "unavailable", source: "Binance Web3", fetchedAt: Date.now(), interval, candles: [] });
        }
      }

      const publicId = pathHandoffId(path);
      if (publicId && request.method === "GET") {
        if (!bearer) return sendJson(response, 401, { error: "capability_required" });
        return sendJson(response, 200, store.readPublic(publicId, bearer));
      }
      const submissionId = pathHandoffId(path, "/submission");
      if (submissionId && request.method === "POST") {
        if (!bearer) return sendJson(response, 401, { error: "capability_required" });
        const input = await readJson(request, 4_000);
        if (!isRecord(input) || typeof input.account !== "string" || typeof input.chainId !== "string" ||
          (input.txHash !== undefined && typeof input.txHash !== "string") || (input.walletError !== undefined && typeof input.walletError !== "string")) {
          return sendJson(response, 400, { error: "invalid_wallet_result" });
        }
        return sendJson(response, 200, store.submitFromWallet(submissionId, bearer, input as { account: string; chainId: string; txHash?: string; walletError?: string }));
      }
      return sendJson(response, 404, { error: "not_found" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "request_failed";
      const status = /not found|invalid|expired|already been used|already started|only a/i.test(message) ? 409 : 400;
      return sendJson(response, status, { error: message });
    }
  });

  server.listen(options.port ?? 0, options.host ?? "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  return { server, store, html };
}

async function prepareExecutablePurchaseRefresh(
  original: ActionPlan,
  fresh: ActionPlan,
  transactions: TransactionService
): Promise<ExternalWalletPurchaseRefresh> {
  if (fresh.status !== "awaiting_confirmation") {
    throw new Error(fresh.safetyReport?.blockingReasons.join("; ") || "Binance Web3 did not return a fresh executable purchase quote");
  }
  const action = fresh.unsignedActions?.[0] as { payload?: { tx?: Parameters<typeof transactions.simulateEvm>[1] } } | undefined;
  const tx = action?.payload?.tx;
  if (!tx) throw new Error("Fresh provider quote has no EVM transaction to simulate");
  const simulation = await transactions.simulateEvm("56", tx);
  const simulated = attachSimulation(fresh, simulation);
  if (simulated.status !== "simulated" && simulated.status !== "wallet_review") {
    throw new Error(simulation.warnings.join("; ") || "Fresh purchase simulation failed");
  }
  const confirmedPlan = confirmPlan(simulated);
  const confirmed: ActionPlan = { ...confirmedPlan, planId: original.planId };
  if (!confirmed.verifiedTokens || !confirmed.authorizationCheck?.spender || confirmed.authorizationCheck.reviewedAllowance === undefined) {
    throw new Error("The confirmed purchase plan has no verified token identities or sufficient reviewed allowance");
  }
  const builtRequest = buildWalletSubmissionRequest(confirmed).request;
  const request = { ...builtRequest, data: builtRequest.data ?? "0x" };
  const input = confirmed.verifiedTokens.input;
  const output = confirmed.verifiedTokens.output;
  const display: ExternalWalletHandoffCreate["display"] = {
    operation: "purchase",
    issuer: issuerDisplayName(confirmed.intent.toAsset.platformId),
    ticker: confirmed.intent.toAsset.underlyingTicker,
    underlyingName: confirmed.intent.toAsset.underlyingName,
    ...(confirmed.assetContext?.asset.tokenLogoUrl ?? confirmed.intent.toAsset.tokenLogoUrl
      ? { tokenLogoUrl: confirmed.assetContext?.asset.tokenLogoUrl ?? confirmed.intent.toAsset.tokenLogoUrl }
      : {}),
    ...(confirmed.assetContext?.asset.issuerLogoUrl ?? confirmed.intent.toAsset.issuerLogoUrl
      ? { issuerLogoUrl: confirmed.assetContext?.asset.issuerLogoUrl ?? confirmed.intent.toAsset.issuerLogoUrl }
      : {}),
    inputAmount: confirmed.intent.amount,
    inputSymbol: input.symbol,
    inputContract: input.contractAddress,
    expectedOutput: formatTokenAmount(confirmed.expectedOutput!, output.decimals),
    outputSymbol: output.symbol,
    outputContract: output.contractAddress,
    minimumOutput: formatTokenAmount(confirmed.minimumOutput!, output.decimals),
    spender: confirmed.authorizationCheck.spender,
    allowanceRequired: formatTokenAmount(confirmed.authorizationCheck.requiredAmount, input.decimals),
    allowanceCurrent: formatTokenAmount(confirmed.authorizationCheck.reviewedAllowance, input.decimals),
    allowanceStatus: "sufficient",
    ...(confirmed.estimatedFees?.estimatedMaxGasCostBnb ? { estimatedNetworkFeeBnb: confirmed.estimatedFees.estimatedMaxGasCostBnb } : {}),
    ...(confirmed.estimatedFees?.providerRouteFeeUsd ? { routeFeeUsd: confirmed.estimatedFees.providerRouteFeeUsd } : {}),
    marketStatus: confirmed.assetContext?.marketStatus ?? "unknown",
    ...(confirmed.assetContext?.dataWarnings?.length ? { marketCaveat: confirmed.assetContext.dataWarnings.join("; ") } : {}),
    slippageBps: confirmed.intent.maxSlippageBps ?? 0,
    maxGasCostBnb: confirmed.intent.maxGasCostBnb ?? confirmed.estimatedFees?.estimatedMaxGasCostBnb ?? "Unavailable",
    marketReference: { chainId: "56", platformId: confirmed.intent.toAsset.platformId, contractAddress: confirmed.intent.toAsset.contractAddress },
    ...(original.assetContext?.tokenPrice ? { marketBaseline: {
      tokenPrice: original.assetContext.tokenPrice,
      ...(original.assetContext.referencePrice ? { referencePrice: original.assetContext.referencePrice } : {}),
      ...(original.assetContext.tokenPriceUpdatedAt ? { tokenPriceUpdatedAt: original.assetContext.tokenPriceUpdatedAt } : {})
    } } : {}),
    purchaseBaseline: {
      expectedOutput: original.expectedOutput!,
      minimumOutput: original.minimumOutput!,
      outputDecimals: original.verifiedTokens!.output.decimals,
      slippageBps: original.intent.maxSlippageBps ?? 0,
      ...(original.estimatedFees?.estimatedMaxGasCostBnb ? { estimatedNetworkFeeBnb: original.estimatedFees.estimatedMaxGasCostBnb } : {}),
      ...(original.estimatedFees?.providerRouteFeeUsd ? { routeFeeUsd: original.estimatedFees.providerRouteFeeUsd } : {})
    },
    continuationOfPlanId: original.planId
  };
  let beforeBalances: Record<string, unknown> | undefined;
  try {
    const [inputBalance, outputBalance] = await Promise.all([
      transactions.erc20Balance("56", input.contractAddress, confirmed.intent.walletAddress),
      transactions.erc20Balance("56", output.contractAddress, confirmed.intent.walletAddress)
    ]);
    beforeBalances = {
      chainId: "56", walletAddress: confirmed.intent.walletAddress, inputToken: input, outputToken: output,
      inputBalance: inputBalance.toString(), outputBalance: outputBalance.toString(), capturedAt: Date.now()
    };
  } catch {
    // Balance context is best-effort; the wallet and later reconciliation remain authoritative.
  }
  return { plan: confirmed, request, display, ...(beforeBalances ? { beforeBalances } : {}) };
}

function purchaseIntentBaselineDisplay(plan: ActionPlan): ExternalWalletHandoffCreate["display"] {
  if (plan.status !== "awaiting_confirmation" || !plan.verifiedTokens || !plan.expectedOutput || !plan.minimumOutput || !plan.authorizationCheck?.spender) {
    throw new Error(plan.safetyReport?.blockingReasons.join("; ") || "Binance Web3 did not return a complete wallet-bound purchase plan");
  }
  const input = plan.verifiedTokens.input;
  const output = plan.verifiedTokens.output;
  return {
    operation: "purchase",
    issuer: issuerDisplayName(plan.intent.toAsset.platformId),
    ticker: plan.intent.toAsset.underlyingTicker,
    underlyingName: plan.intent.toAsset.underlyingName,
    ...(plan.assetContext?.asset.tokenLogoUrl ?? plan.intent.toAsset.tokenLogoUrl ? { tokenLogoUrl: plan.assetContext?.asset.tokenLogoUrl ?? plan.intent.toAsset.tokenLogoUrl } : {}),
    ...(plan.assetContext?.asset.issuerLogoUrl ?? plan.intent.toAsset.issuerLogoUrl ? { issuerLogoUrl: plan.assetContext?.asset.issuerLogoUrl ?? plan.intent.toAsset.issuerLogoUrl } : {}),
    inputAmount: plan.intent.amount,
    inputSymbol: input.symbol,
    inputContract: input.contractAddress,
    expectedOutput: formatTokenAmount(plan.expectedOutput, output.decimals),
    outputSymbol: output.symbol,
    outputContract: output.contractAddress,
    minimumOutput: formatTokenAmount(plan.minimumOutput, output.decimals),
    spender: plan.authorizationCheck.spender,
    allowanceRequired: formatTokenAmount(plan.authorizationCheck.requiredAmount, input.decimals),
    ...(plan.authorizationCheck.reviewedAllowance !== undefined ? {
      allowanceCurrent: formatTokenAmount(plan.authorizationCheck.reviewedAllowance, input.decimals),
      allowanceStatus: BigInt(plan.authorizationCheck.reviewedAllowance) >= BigInt(plan.authorizationCheck.requiredAmount) ? "sufficient" : "insufficient"
    } : { allowanceStatus: "unverified" }),
    ...(plan.estimatedFees?.estimatedMaxGasCostBnb ? { estimatedNetworkFeeBnb: plan.estimatedFees.estimatedMaxGasCostBnb } : {}),
    ...(plan.estimatedFees?.providerRouteFeeUsd ? { routeFeeUsd: plan.estimatedFees.providerRouteFeeUsd } : {}),
    marketStatus: plan.assetContext?.marketStatus ?? "unknown",
    ...(plan.assetContext?.dataWarnings?.length ? { marketCaveat: plan.assetContext.dataWarnings.join("; ") } : {}),
    slippageBps: plan.intent.maxSlippageBps ?? 0,
    maxGasCostBnb: plan.intent.maxGasCostBnb ?? plan.estimatedFees?.estimatedMaxGasCostBnb ?? "provider_estimate_pending",
    marketReference: { chainId: "56", platformId: plan.intent.toAsset.platformId, contractAddress: plan.intent.toAsset.contractAddress },
    ...(plan.assetContext?.tokenPrice ? { marketBaseline: {
      tokenPrice: plan.assetContext.tokenPrice,
      ...(plan.assetContext.referencePrice ? { referencePrice: plan.assetContext.referencePrice } : {}),
      ...(plan.assetContext.tokenPriceUpdatedAt ? { tokenPriceUpdatedAt: plan.assetContext.tokenPriceUpdatedAt } : {})
    } } : {}),
    purchaseBaseline: {
      expectedOutput: plan.expectedOutput,
      minimumOutput: plan.minimumOutput,
      outputDecimals: output.decimals,
      slippageBps: plan.intent.maxSlippageBps ?? 0,
      ...(plan.estimatedFees?.estimatedMaxGasCostBnb ? { estimatedNetworkFeeBnb: plan.estimatedFees.estimatedMaxGasCostBnb } : {}),
      ...(plan.estimatedFees?.providerRouteFeeUsd ? { routeFeeUsd: plan.estimatedFees.providerRouteFeeUsd } : {})
    }
  };
}

export async function startWalletHandoffRelayFromEnvironment(
  env: NodeJS.ProcessEnv = process.env,
  overrides: { host?: string; port?: number } = {}
): Promise<{ server: Server; store: WalletHandoffStore; html: string; host: string; port: number }> {
  const secret = env.ARIADNE_WALLET_HANDOFF_RELAY_SECRET ?? "";
  const configuredOrigin = env.ARIADNE_WALLET_HANDOFF_PORTAL_ORIGIN ?? env.ARIADNE_WALLET_HANDOFF_RELAY_URL ?? "";
  const host = overrides.host ?? env.HOST ?? "127.0.0.1";
  const port = overrides.port ?? Number(env.PORT ?? 8791);
  const hasBinanceCredentials = Boolean(env.BINANCE_WEB3_API_KEY && env.BINANCE_WEB3_API_SECRET);
  const liveClient = hasBinanceCredentials ? new BinanceWeb3Client({
    apiKey: env.BINANCE_WEB3_API_KEY!, apiSecret: env.BINANCE_WEB3_API_SECRET!,
    baseUrl: env.BINANCE_WEB3_BASE_URL, proxyUrl: env.BINANCE_WEB3_PROXY_URL,
    maxRetries: 1, maxRetryDelayMs: 2_000, timeoutMs: 8_000
  }) : undefined;
  const liveStocks = liveClient ? new TokenizedStocksService(liveClient) : undefined;
  const liveTransactions = liveClient ? new TransactionService(liveClient) : undefined;
  const relay = await createWalletHandoffRelayServer({
    host, port, portalOrigin: configuredOrigin, serviceSecret: secret,
    storagePath: resolve(env.ARIADNE_WALLET_HANDOFF_STORE_PATH ?? "data/ariadne-wallet-handoff/sessions.json"),
    readMarketCandles: (identity, interval, limit) => fetchBinanceWeb3Klines(identity, interval, limit, { proxyUrl: env.BINANCE_WEB3_PROXY_URL }),
    ...(liveClient ? {
      readMarketSnapshot: async (identity) => {
        const response = await liveClient.get<Array<{ binanceChainId: string; tokenContractAddress: string; platformId: string; tokenPrice?: string; referencePrice?: string; tokenPriceUpdatedAt?: number | string }>>(
          "/api/v1/dex/market/rwa/price",
          { binanceChainId: identity.chainId, tokenContractAddresses: identity.contractAddress }
        );
        const row = response.data?.find((item) => item.binanceChainId === identity.chainId && item.platformId === identity.platformId && item.tokenContractAddress.toLowerCase() === identity.contractAddress.toLowerCase());
        const normalizeTimestamp = (value: number | string | undefined): number | undefined => {
          const parsed = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : Number.NaN;
          if (!Number.isSafeInteger(parsed) || parsed <= 0) return undefined;
          return parsed < 1_000_000_000_000 ? parsed * 1_000 : parsed;
        };
        const tokenPrice = row?.tokenPrice && /^\d+(?:\.\d+)?$/.test(row.tokenPrice) && Number(row.tokenPrice) > 0 ? row.tokenPrice : undefined;
        const referencePrice = row?.referencePrice && /^\d+(?:\.\d+)?$/.test(row.referencePrice) && Number(row.referencePrice) > 0 ? row.referencePrice : undefined;
        const tokenPriceUpdatedAt = normalizeTimestamp(row?.tokenPriceUpdatedAt);
        if (!tokenPrice || !tokenPriceUpdatedAt) return { state: "unavailable" as const };
        return { state: "available" as const, tokenPrice, ...(referencePrice ? { referencePrice } : {}), tokenPriceUpdatedAt };
      }
    } : {}),
    ...(liveStocks && liveTransactions ? {
      preparePurchaseIntent: async (intent: ExternalWalletPurchaseIntent, account: string) => {
        const plan = await liveStocks.createBscStockPurchasePlan({
          walletAddress: account,
          inputTokenSymbol: intent.inputTokenSymbol,
          amount: intent.amount,
          toAsset: intent.asset,
          maxSlippageBps: intent.maxSlippageBps
        });
        return { plan, display: purchaseIntentBaselineDisplay(plan) };
      },
      preparePurchaseRefresh: async (originalPlan) => {
        const stocks = liveStocks;
        const transactions = liveTransactions;
        if (!originalPlan.expectedOutput || !originalPlan.minimumOutput || !originalPlan.verifiedTokens) {
          throw new Error("The original purchase plan is missing its expected output, minimum output or verified token identities");
        }
        const originalExpectedOutput = originalPlan.expectedOutput;
        const originalMinimumOutput = originalPlan.minimumOutput;
        const originalOutputDecimals = originalPlan.verifiedTokens.output.decimals;
        const userSetGasCap = originalPlan.estimatedFees?.gasBudgetSource === "user_provided";
        const fresh = await stocks.createBscStockPurchasePlan({
          walletAddress: originalPlan.intent.walletAddress,
          inputTokenSymbol: originalPlan.verifiedTokens?.input.symbol ?? "USDT",
          amount: originalPlan.intent.amount,
          toAsset: originalPlan.intent.toAsset,
          maxSlippageBps: originalPlan.intent.maxSlippageBps ?? 0,
          ...(userSetGasCap && originalPlan.intent.maxGasCostBnb ? { maxGasCostBnb: originalPlan.intent.maxGasCostBnb } : {})
        });
        if (!fresh.minimumOutput || !fresh.expectedOutput || !fresh.verifiedTokens || !fresh.authorizationCheck?.spender) {
          throw new Error(fresh.safetyReport?.blockingReasons.join("; ") || "Binance Web3 did not return a complete quote for this purchase plan");
        }
        const allowanceInsufficient = fresh.approvalRequired !== undefined || fresh.authorizationCheck.reviewedAllowance === undefined ||
          BigInt(fresh.authorizationCheck.reviewedAllowance) < BigInt(fresh.authorizationCheck.requiredAmount ?? "0");
        if (allowanceInsufficient) {
          const approvalPlan = await stocks.prepareBscStockAllowanceApproval({
            walletAddress: originalPlan.intent.walletAddress,
            inputTokenSymbol: originalPlan.verifiedTokens?.input.symbol ?? "USDT",
            amount: originalPlan.intent.amount,
            toAsset: originalPlan.intent.toAsset,
            maxSlippageBps: originalPlan.intent.maxSlippageBps ?? 0,
            ...(originalPlan.intent.maxGasCostBnb ? { purchaseMaxGasCostBnb: originalPlan.intent.maxGasCostBnb } : {})
          });
          if (approvalPlan.status !== "ready_for_wallet_review" || !approvalPlan.unsignedTransaction?.gas || !approvalPlan.unsignedTransaction.gasPrice) {
            throw new Error(approvalPlan.simulation?.warnings.join("; ") || "The exact USDT allowance request is not ready for wallet review");
          }
          const approvalTx = approvalPlan.unsignedTransaction;
          const approvalGas = approvalTx.gas!;
          const approvalGasPrice = approvalTx.gasPrice!;
          const display: ExternalWalletHandoffCreate["display"] = {
            operation: "allowance_approval",
            issuer: issuerDisplayName(originalPlan.intent.toAsset.platformId),
            ticker: originalPlan.intent.toAsset.underlyingTicker,
            underlyingName: originalPlan.intent.toAsset.underlyingName,
            ...(originalPlan.assetContext?.asset.tokenLogoUrl ?? originalPlan.intent.toAsset.tokenLogoUrl
              ? { tokenLogoUrl: originalPlan.assetContext?.asset.tokenLogoUrl ?? originalPlan.intent.toAsset.tokenLogoUrl }
              : {}),
            ...(originalPlan.assetContext?.asset.issuerLogoUrl ?? originalPlan.intent.toAsset.issuerLogoUrl
              ? { issuerLogoUrl: originalPlan.assetContext?.asset.issuerLogoUrl ?? originalPlan.intent.toAsset.issuerLogoUrl }
              : {}),
            inputAmount: originalPlan.intent.amount,
            inputSymbol: approvalPlan.inputToken.symbol,
            inputContract: approvalPlan.inputToken.contractAddress,
            expectedOutput: formatTokenAmount(originalExpectedOutput, approvalPlan.outputToken.decimals),
            outputSymbol: approvalPlan.outputToken.symbol,
            outputContract: approvalPlan.outputToken.contractAddress,
            minimumOutput: formatTokenAmount(originalMinimumOutput, approvalPlan.outputToken.decimals),
            spender: approvalPlan.spender,
            ...(fresh.authorizationCheck.reviewedAllowance !== undefined
              ? { allowanceCurrent: formatTokenAmount(fresh.authorizationCheck.reviewedAllowance, approvalPlan.inputToken.decimals) }
              : {}),
            allowanceRequired: formatTokenAmount(approvalPlan.amountBaseUnits, approvalPlan.inputToken.decimals),
            allowanceStatus: fresh.authorizationCheck.reviewedAllowance === undefined ? "unverified" : "insufficient",
            estimatedNetworkFeeBnb: approvalPlan.estimatedMaxGasCostBnb,
            marketStatus: approvalPlan.marketReview.status,
            ...(approvalPlan.marketReview.warnings.length ? { marketCaveat: approvalPlan.marketReview.warnings.join("; ") } : {}),
            slippageBps: originalPlan.intent.maxSlippageBps ?? 0,
            maxGasCostBnb: approvalPlan.maxGasCostBnb,
            marketReference: { chainId: "56", platformId: originalPlan.intent.toAsset.platformId, contractAddress: originalPlan.intent.toAsset.contractAddress },
            ...(originalPlan.assetContext?.tokenPrice ? { marketBaseline: {
              tokenPrice: originalPlan.assetContext.tokenPrice,
              ...(originalPlan.assetContext.referencePrice ? { referencePrice: originalPlan.assetContext.referencePrice } : {}),
              ...(originalPlan.assetContext.tokenPriceUpdatedAt ? { tokenPriceUpdatedAt: originalPlan.assetContext.tokenPriceUpdatedAt } : {})
            } } : {}),
            purchaseBaseline: {
              expectedOutput: originalExpectedOutput,
              minimumOutput: originalMinimumOutput,
              outputDecimals: originalOutputDecimals,
              slippageBps: originalPlan.intent.maxSlippageBps ?? 0,
              ...(originalPlan.estimatedFees?.estimatedMaxGasCostBnb ? { estimatedNetworkFeeBnb: originalPlan.estimatedFees.estimatedMaxGasCostBnb } : {}),
              ...(originalPlan.estimatedFees?.providerRouteFeeUsd ? { routeFeeUsd: originalPlan.estimatedFees.providerRouteFeeUsd } : {})
            },
            ...(originalPlan.intent.maxGasCostBnb ? { purchaseMaxGasCostBnb: originalPlan.intent.maxGasCostBnb } : {}),
            continuationOfPlanId: originalPlan.planId
          };
          return {
            approvalPlan,
            request: {
              from: approvalTx.from,
              to: approvalTx.to,
              value: approvalTx.value === "0" ? "0x0" : approvalTx.value,
              data: approvalTx.data,
              gas: approvalGas,
              gasPrice: approvalGasPrice
            },
            display
          };
        }
        return prepareExecutablePurchaseRefresh(originalPlan, fresh, transactions);
      },
      finalizeAllowancePurchase: async ({ originalPlan, approvalPlan, txHash }) => {
        const result = await liveStocks.refreshBscPurchaseAfterApproval({ approvalPlan, txHash });
        if (result.status !== "ready" || !result.plan) {
          if (result.status === "pending") return { status: "pending" as const, ...(result.reason ? { reason: result.reason } : {}) };
          return {
            status: result.status as "reverted" | "blocked",
            reason: result.reason ?? "The allowance transaction did not produce a safe purchase continuation",
            ...(result.allowanceFinalized !== undefined ? { allowanceFinalized: result.allowanceFinalized } : {}),
            ...(result.allowance ? { allowance: result.allowance } : {}),
            ...(result.balance ? { balance: result.balance } : {})
          };
        }
        const refresh = await prepareExecutablePurchaseRefresh(originalPlan, result.plan, liveTransactions);
        return {
          status: "ready" as const,
          refresh,
          ...(result.allowance ? { allowance: result.allowance } : {}),
          ...(result.balance ? { balance: result.balance } : {})
        };
      }
    } : {})
  });
  const address = relay.server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  return { ...relay, host, port: actualPort };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const relay = await startWalletHandoffRelayFromEnvironment();
  console.error(`Ariadne wallet handoff relay listening on ${relay.host}:${relay.port}; portal origin configured`);
  const stop = () => relay.server.close();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}
