import { createHash, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { WalletHandoffStore } from "../../src/services/wallet-handoff-relay.js";
import { createWalletHandoffRelayHandler, walletHandoffRelayOptionsFromEnvironment } from "../../src/mcp/wallet-handoff-relay-server.js";
import { DurableWalletRelay } from "../../src/remote/durable-wallet-relay.js";

declare const __ARIADNE_WALLET_HTML_ZH__: string;
declare const __ARIADNE_WALLET_HTML_EN__: string;

type BufferedReply = { status: number; headers: Record<string, string>; body: string };

function reply(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
}

function sameSecret(expected: string, supplied: string): boolean {
  const a = createHash("sha256").update(expected).digest();
  const b = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(a, b) && expected === supplied;
}

function bufferResponse(): { response: ServerResponse; result: BufferedReply } {
  const result: BufferedReply = { status: 200, headers: {}, body: "" };
  const response = {
    setHeader(name: string, value: string) { result.headers[name.toLowerCase()] = String(value); return this; },
    writeHead(status: number, headers: Record<string, string>) {
      result.status = status;
      for (const [name, value] of Object.entries(headers)) result.headers[name.toLowerCase()] = String(value);
      return this;
    },
    end(body?: string) { result.body = body ?? ""; return this; }
  } as unknown as ServerResponse;
  return { response, result };
}

/** Vercel adapter: commit owner-scoped relay state before sending any success response. */
export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  const serviceSecret = process.env.ARIADNE_WALLET_HANDOFF_RELAY_SECRET ?? "";
  const portalOrigin = process.env.ARIADNE_WALLET_HANDOFF_PORTAL_ORIGIN;
  if (!databaseUrl || !portalOrigin || serviceSecret.length < 32) return reply(response, 503, { error: "remote_relay_not_configured" });
  const incomingUrl = new URL(request.url ?? "/", portalOrigin);
  const path = incomingUrl.searchParams.get("route") ?? incomingUrl.pathname;
  if (!path.startsWith("/") || path.includes("?") || path.includes("#")) return reply(response, 400, { error: "invalid_route" });
  const forwardedQuery = [...incomingUrl.searchParams.entries()].filter(([key]) => key !== "route").map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&");
  request.url = `${path}${forwardedQuery ? `?${forwardedQuery}` : ""}`;
  const internal = path.startsWith("/api/internal/");
  const supplied = request.headers.authorization?.startsWith("Bearer ") ? request.headers.authorization.slice(7) : "";
  if (internal && !sameSecret(serviceSecret, supplied)) return reply(response, 401, { error: "unauthorized" });

  const options = walletHandoffRelayOptionsFromEnvironment({ ...process.env, ARIADNE_WALLET_HANDOFF_PORTAL_ORIGIN: portalOrigin });
  options.pageHtml = { zhCN: __ARIADNE_WALLET_HTML_ZH__, en: __ARIADNE_WALLET_HTML_EN__ };
  delete options.storagePath;
  options.openExternalBrowser = async () => { throw new Error("Remote wallet pages open directly over HTTPS"); };
  const relay = new DurableWalletRelay(databaseUrl);
  try {
    const publicPage = path === "/" || path === "/approve" || path === "/healthz";
    const createPath = internal && ["/api/internal/handoffs", "/api/internal/purchase-plan-reviews", "/api/internal/purchase-intents"].includes(path);
    let ownerId: string | null;
    if (publicPage) ownerId = null;
    else if (createPath) ownerId = typeof request.headers["x-ariadne-owner-id"] === "string" ? request.headers["x-ariadne-owner-id"] : null;
    else {
      const handoffId = path.match(/^\/api\/(?:internal\/)?handoffs\/([a-f0-9]{32})(?:\/|$)/)?.[1];
      if (!handoffId) return reply(response, 404, { error: "not_found" });
      ownerId = await relay.findOwner(handoffId);
      if (internal && request.headers["x-ariadne-owner-id"] && request.headers["x-ariadne-owner-id"] !== ownerId) return reply(response, 404, { error: "not_found" });
    }
    if (!publicPage && !ownerId) return reply(response, createPath ? 400 : 404, { error: createPath ? "owner_required" : "not_found" });

    const run = async (store: WalletHandoffStore): Promise<BufferedReply> => {
      const buffered = bufferResponse();
      const selected = await createWalletHandoffRelayHandler(options, store);
      await selected.handler(request, buffered.response);
      return buffered.result;
    };
    const result = ownerId
      ? await relay.withOwnerStore(ownerId, `${new URL(portalOrigin).origin}/`, run)
      : await run(new WalletHandoffStore({ portalOrigin: `${new URL(portalOrigin).origin}/` }));
    response.writeHead(result.status, result.headers);
    response.end(result.body);
  } catch {
    if (!response.headersSent) reply(response, 500, { error: "remote_relay_request_failed" });
  } finally {
    await relay.close();
  }
}
