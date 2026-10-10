import { createHash, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

export type RemoteMcpConfig = {
  authToken: string;
  allowedOrigins: Set<string>;
  maxBodyBytes: number;
};

export function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`Expected an integer from ${minimum} to ${maximum}, received ${value}`);
  }
  return parsed;
}

export function remoteMcpConfig(): RemoteMcpConfig {
  return {
    authToken: process.env.ARIADNE_MCP_AUTH_TOKEN?.trim() ?? "",
    allowedOrigins: new Set((process.env.ARIADNE_MCP_ALLOWED_ORIGINS ?? "")
      .split(",").map((value) => value.trim()).filter(Boolean)),
    maxBodyBytes: boundedInteger(process.env.ARIADNE_MCP_MAX_BODY_BYTES, 1_048_576, 1_024, 10_485_760)
  };
}

function tokenMatches(expected: string, candidate: string): boolean {
  if (!expected || !candidate) return false;
  const expectedDigest = createHash("sha256").update(expected).digest();
  const candidateDigest = createHash("sha256").update(candidate).digest();
  return timingSafeEqual(expectedDigest, candidateDigest);
}

export function authorized(request: IncomingMessage, config: RemoteMcpConfig): boolean {
  const header = request.headers.authorization;
  return typeof header === "string" && header.startsWith("Bearer ") && tokenMatches(config.authToken, header.slice(7));
}

export function originAllowed(request: IncomingMessage, config: RemoteMcpConfig): boolean {
  const origin = request.headers.origin;
  return typeof origin !== "string" || config.allowedOrigins.has(origin);
}

export function applySecurityHeaders(response: ServerResponse, config: RemoteMcpConfig, origin?: string) {
  response.setHeader("cache-control", "no-store");
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("referrer-policy", "no-referrer");
  if (origin && config.allowedOrigins.has(origin)) {
    response.setHeader("access-control-allow-origin", origin);
    response.setHeader("vary", "Origin");
    response.setHeader("access-control-allow-headers", "authorization, content-type, mcp-session-id, mcp-protocol-version");
    response.setHeader("access-control-allow-methods", "GET, POST, DELETE, OPTIONS");
    response.setHeader("access-control-expose-headers", "mcp-session-id");
  }
}

export function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

export function readiness() {
  const config = remoteMcpConfig();
  const reasons: string[] = [];
  if (config.authToken.length < 32) reasons.push("ARIADNE_MCP_AUTH_TOKEN must contain at least 32 characters");
  if (process.env.ARIADNE_MODE !== "demo" && (!process.env.BINANCE_WEB3_API_KEY || !process.env.BINANCE_WEB3_API_SECRET)) {
    reasons.push("Live mode requires Binance Web3 API credentials");
  }
  return { ready: reasons.length === 0, mode: process.env.ARIADNE_MODE === "demo" ? "demo" : "live", reasons };
}

export async function readJsonBody(request: IncomingMessage, maxBodyBytes: number): Promise<unknown> {
  if (request.method !== "POST") return undefined;
  const requestWithBody = request as IncomingMessage & { body?: unknown };
  if (requestWithBody.body !== undefined) {
    const serialized = typeof requestWithBody.body === "string" ? requestWithBody.body : JSON.stringify(requestWithBody.body);
    if (Buffer.byteLength(serialized) > maxBodyBytes) throw Object.assign(new Error("request_body_too_large"), { status: 413 });
    if (typeof requestWithBody.body === "string") {
      try { return requestWithBody.body ? JSON.parse(requestWithBody.body) : undefined; }
      catch { throw Object.assign(new Error("invalid_json"), { status: 400 }); }
    }
    return requestWithBody.body;
  }
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
