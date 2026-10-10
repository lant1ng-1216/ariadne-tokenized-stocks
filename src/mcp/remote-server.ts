#!/usr/bin/env node
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";

process.env.ARIADNE_TRANSPORT = "http";
const { buildMcpServer } = await import("./server.js");

type Session = {
  server: Awaited<ReturnType<typeof buildMcpServer>>;
  transport: NodeStreamableHTTPServerTransport;
  lastSeenAt: number;
};

const port = boundedInteger(process.env.PORT, 8787, 1, 65_535);
const host = process.env.HOST?.trim() || "0.0.0.0";
const authToken = process.env.ARIADNE_MCP_AUTH_TOKEN?.trim() ?? "";
const allowedOrigins = new Set((process.env.ARIADNE_MCP_ALLOWED_ORIGINS ?? "")
  .split(",").map((value) => value.trim()).filter(Boolean));
const maxBodyBytes = boundedInteger(process.env.ARIADNE_MCP_MAX_BODY_BYTES, 1_048_576, 1_024, 10_485_760);
const maxSessions = boundedInteger(process.env.ARIADNE_MCP_MAX_SESSIONS, 100, 1, 10_000);
const sessionTtlMs = boundedInteger(process.env.ARIADNE_MCP_SESSION_TTL_MS, 30 * 60_000, 1_000, 24 * 60 * 60_000);
const sessions = new Map<string, Session>();

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`Expected an integer from ${minimum} to ${maximum}, received ${value}`);
  }
  return parsed;
}

function tokenMatches(candidate: string): boolean {
  if (!authToken || !candidate) return false;
  const expectedDigest = createHash("sha256").update(authToken).digest();
  const candidateDigest = createHash("sha256").update(candidate).digest();
  return timingSafeEqual(expectedDigest, candidateDigest);
}

function authorized(request: IncomingMessage): boolean {
  const header = request.headers.authorization;
  return typeof header === "string" && header.startsWith("Bearer ") && tokenMatches(header.slice(7));
}

function originAllowed(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  return typeof origin !== "string" || allowedOrigins.has(origin);
}

function applySecurityHeaders(response: ServerResponse, origin?: string) {
  response.setHeader("cache-control", "no-store");
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("referrer-policy", "no-referrer");
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader("access-control-allow-origin", origin);
    response.setHeader("vary", "Origin");
    response.setHeader("access-control-allow-headers", "authorization, content-type, mcp-session-id, mcp-protocol-version");
    response.setHeader("access-control-allow-methods", "GET, POST, DELETE, OPTIONS");
    response.setHeader("access-control-expose-headers", "mcp-session-id");
  }
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function readiness() {
  const reasons: string[] = [];
  if (authToken.length < 32) reasons.push("ARIADNE_MCP_AUTH_TOKEN must contain at least 32 characters");
  if (process.env.ARIADNE_MODE !== "demo" && (!process.env.BINANCE_WEB3_API_KEY || !process.env.BINANCE_WEB3_API_SECRET)) {
    reasons.push("Live mode requires Binance Web3 API credentials");
  }
  return { ready: reasons.length === 0, mode: process.env.ARIADNE_MODE === "demo" ? "demo" : "live", reasons };
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  if (request.method !== "POST") return undefined;
  const declaredLength = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) throw Object.assign(new Error("request_body_too_large"), { status: 413 });
  return new Promise((resolve, reject) => {
    let bytes = 0;
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > maxBodyBytes) {
        reject(Object.assign(new Error("request_body_too_large"), { status: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        const body = Buffer.concat(chunks).toString("utf8");
        resolve(body ? JSON.parse(body) : undefined);
      } catch {
        reject(Object.assign(new Error("invalid_json"), { status: 400 }));
      }
    });
    request.on("error", reject);
  });
}

async function createSession(): Promise<Session> {
  if (sessions.size >= maxSessions) throw Object.assign(new Error("session_capacity_reached"), { status: 503 });
  const server = buildMcpServer();
  const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() });
  transport.onerror = (error) => console.error(`Remote MCP transport error: ${error.name}`);
  await server.connect(transport);
  const session: Session = { server, transport, lastSeenAt: Date.now() };
  transport.onclose = () => {
    if (transport.sessionId) sessions.delete(transport.sessionId);
    void server.close();
  };
  return session;
}

async function closeSession(sessionId: string, session: Session) {
  sessions.delete(sessionId);
  await Promise.allSettled([session.transport.close(), session.server.close()]);
}

function removeExpiredSessions(now = Date.now()) {
  for (const [sessionId, session] of sessions) {
    if (now - session.lastSeenAt > sessionTtlMs) void closeSession(sessionId, session);
  }
}

const httpServer = createServer(async (request, response) => {
  const origin = typeof request.headers.origin === "string" ? request.headers.origin : undefined;
  applySecurityHeaders(response, origin);

  if (request.url === "/healthz" && request.method === "GET") return sendJson(response, 200, { status: "ok" });
  if (request.url === "/readyz" && request.method === "GET") {
    const state = readiness();
    return sendJson(response, state.ready ? 200 : 503, { status: state.ready ? "ready" : "not_ready", mode: state.mode, reasons: state.reasons });
  }
  if (request.url !== "/mcp") return sendJson(response, 404, { error: "not_found" });
  if (!originAllowed(request)) return sendJson(response, 403, { error: "origin_not_allowed" });
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }
  if (!authorized(request)) return sendJson(response, 401, { error: "unauthorized" });
  const state = readiness();
  if (!state.ready) return sendJson(response, 503, { error: "not_ready", reasons: state.reasons });

  try {
    removeExpiredSessions();
    const requestedSessionId = request.headers["mcp-session-id"];
    let session = typeof requestedSessionId === "string" ? sessions.get(requestedSessionId) : undefined;
    if (typeof requestedSessionId === "string" && !session) return sendJson(response, 404, { error: "unknown_or_expired_session" });
    session ??= await createSession();
    session.lastSeenAt = Date.now();
    await session.transport.handleRequest(request, response, await readJsonBody(request));
    if (session.transport.sessionId) sessions.set(session.transport.sessionId, session);
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 400;
    if (!response.headersSent) response.writeHead(status, { "content-type": "application/json" });
    if (!response.writableEnded) response.end(JSON.stringify({ error: error instanceof Error ? error.message : "request_failed" }));
  }
});

const cleanupTimer = setInterval(removeExpiredSessions, Math.min(sessionTtlMs, 60_000));
cleanupTimer.unref();
httpServer.listen(port, host, () => {
  const address = httpServer.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  console.error(`Ariadne Remote MCP listening at http://${host}:${actualPort}/mcp`);
});

async function shutdown() {
  clearInterval(cleanupTimer);
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await Promise.allSettled([...sessions.entries()].map(([sessionId, session]) => closeSession(sessionId, session)));
}
process.once("SIGINT", () => { void shutdown(); });
process.once("SIGTERM", () => { void shutdown(); });
