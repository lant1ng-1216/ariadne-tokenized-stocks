import type { IncomingMessage, ServerResponse } from "node:http";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import {
  applySecurityHeaders, authorized, originAllowed, readJsonBody, readiness,
  remoteMcpConfig, sendJson
} from "../src/mcp/remote-http-common.js";

process.env.ARIADNE_TRANSPORT = "http";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  const config = remoteMcpConfig();
  const origin = typeof request.headers.origin === "string" ? request.headers.origin : undefined;
  applySecurityHeaders(response, config, origin);

  if (!originAllowed(request, config)) return sendJson(response, 403, { error: "origin_not_allowed" });
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }
  if (!authorized(request, config)) return sendJson(response, 401, { error: "unauthorized" });
  const state = readiness();
  if (!state.ready) return sendJson(response, 503, { error: "not_ready", reasons: state.reasons });
  if (request.method !== "POST") return sendJson(response, 405, { error: "method_not_allowed", allowed: ["POST", "OPTIONS"] });

  let server: Awaited<ReturnType<(typeof import("../src/mcp/server.js"))["buildMcpServer"]>> | undefined;
  let transport: NodeStreamableHTTPServerTransport | undefined;
  try {
    const body = await readJsonBody(request, config.maxBodyBytes);
    const { buildMcpServer } = await import("../src/mcp/server.js");
    server = buildMcpServer();
    transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    transport.onerror = (error) => console.error(`Vercel MCP transport error: ${error.name}`);
    await server.connect(transport);
    await transport.handleRequest(request, response, body);
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 400;
    if (!response.headersSent) response.writeHead(status, { "content-type": "application/json" });
    if (!response.writableEnded) response.end(JSON.stringify({ error: error instanceof Error ? error.message : "request_failed" }));
  } finally {
    await Promise.allSettled([transport?.close(), server?.close()].filter((value): value is Promise<void> => Boolean(value)));
  }
}
