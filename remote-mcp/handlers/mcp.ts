import type { IncomingMessage, ServerResponse } from "node:http";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import { buildMcpServer } from "../../src/mcp/server.js";
import { RemoteStateStore } from "../../src/remote/state-store.js";
import { DurablePlanRegistry } from "../../src/remote/durable-plan-registry.js";
import { DurableConfirmationContinuationStore } from "../../src/remote/durable-confirmation.js";
import { authenticatedOwner } from "../../src/remote/oauth-identity.js";

process.env.ARIADNE_TRANSPORT = "http";

function respond(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(body));
}

/** Each request gets a stateless MCP transport; all business state resolves by authenticated owner. */
export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  const issuer = process.env.ARIADNE_OAUTH_ISSUER;
  const audience = process.env.ARIADNE_OAUTH_AUDIENCE;
  if (!databaseUrl || !issuer || !audience || !process.env.BINANCE_WEB3_API_KEY || !process.env.BINANCE_WEB3_API_SECRET) {
    return respond(response, 503, { error: "remote_mcp_not_configured" });
  }
  if (request.method !== "POST") return respond(response, 405, { error: "method_not_allowed" });
  if (request.headers.origin) return respond(response, 403, { error: "browser_origin_not_allowed" });
  const ownerId = await authenticatedOwner(request.headers.authorization, { issuer, audience });
  if (!ownerId) {
    const metadataUrl = new URL("/.well-known/oauth-protected-resource", audience);
    response.setHeader("www-authenticate", `Bearer error="invalid_token", resource_metadata="${metadataUrl.href}", scope="mcp:access"`);
    return respond(response, 401, { error: "invalid_token" });
  }

  const state = new RemoteStateStore(databaseUrl);
  let server: ReturnType<typeof buildMcpServer> | undefined;
  let transport: NodeStreamableHTTPServerTransport | undefined;
  try {
    server = buildMcpServer({
      plans: new DurablePlanRegistry(state, ownerId),
      confirmationContinuations: new DurableConfirmationContinuationStore(state, ownerId),
      ownerId
    });
    transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await server.connect(transport);
    await transport.handleRequest(request, response);
  } catch {
    if (!response.headersSent) respond(response, 500, { error: "remote_mcp_request_failed" });
  } finally {
    await Promise.allSettled([transport?.close(), server?.close(), state.close()]);
  }
}
