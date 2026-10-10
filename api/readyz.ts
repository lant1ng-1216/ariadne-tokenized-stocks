import type { IncomingMessage, ServerResponse } from "node:http";
import { applySecurityHeaders, readiness, remoteMcpConfig, sendJson } from "../src/mcp/remote-http-common.js";

export default function handler(request: IncomingMessage, response: ServerResponse) {
  applySecurityHeaders(response, remoteMcpConfig(), typeof request.headers.origin === "string" ? request.headers.origin : undefined);
  if (request.method !== "GET") return sendJson(response, 405, { error: "method_not_allowed", allowed: ["GET"] });
  const state = readiness();
  return sendJson(response, state.ready ? 200 : 503, { status: state.ready ? "ready" : "not_ready", mode: state.mode, reasons: state.reasons, runtime: "vercel" });
}
