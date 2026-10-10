import assert from "node:assert/strict";
import { createServer } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

process.env.ARIADNE_MODE = "demo";
process.env.ARIADNE_MCP_AUTH_TOKEN = "test-only-vercel-auth-token-32-characters";
process.env.ARIADNE_MCP_ALLOWED_ORIGINS = "https://agent.example.test";
process.env.ARIADNE_MCP_MAX_BODY_BYTES = "2048";

const [{ default: mcp }, { default: healthz }, { default: readyz }] = await Promise.all([
  import("../api/mcp.js"), import("../api/healthz.js"), import("../api/readyz.js")
]);

const server = createServer((request, response) => {
  const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
  const handler = path === "/api/mcp" ? mcp : path === "/api/healthz" ? healthz : path === "/api/readyz" ? readyz : undefined;
  if (!handler) { response.writeHead(404).end(); return; }
  void handler(request, response);
});
await new Promise<void>((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const address = server.address();
assert.ok(address && typeof address === "object");
const endpoint = `http://127.0.0.1:${address.port}`;
const token = process.env.ARIADNE_MCP_AUTH_TOKEN;
const origin = process.env.ARIADNE_MCP_ALLOWED_ORIGINS;

try {
  const health = await fetch(`${endpoint}/api/healthz`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).runtime, "vercel");
  const ready = await fetch(`${endpoint}/api/readyz`);
  assert.equal(ready.status, 200);

  const unauthenticated = await fetch(`${endpoint}/api/mcp`, {
    method: "POST", headers: { "content-type": "application/json" }, body: "{}"
  });
  assert.equal(unauthenticated.status, 401);
  const invalidOrigin = await fetch(`${endpoint}/api/mcp`, {
    method: "POST", headers: { authorization: `Bearer ${token}`, origin: "https://evil.example", "content-type": "application/json" }, body: "{}"
  });
  assert.equal(invalidOrigin.status, 403);
  const oversized = await fetch(`${endpoint}/api/mcp`, {
    method: "POST", headers: { authorization: `Bearer ${token}`, origin, "content-type": "application/json" }, body: "x".repeat(4096)
  });
  assert.equal(oversized.status, 413);

  const client = new Client({ name: "ariadne-vercel-test", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(new URL(`${endpoint}/api/mcp`), {
    requestInit: { headers: { authorization: `Bearer ${token}`, origin } }
  });
  await client.connect(transport);
  assert.equal(transport.sessionId, undefined);
  const tools = await client.listTools();
  assert.ok(tools.tools.some((tool) => tool.name === "research_tokenized_stock"));
  const result = await client.callTool({ name: "research_tokenized_stock", arguments: { query: "NVDA", chainId: "56" } });
  const structured = result.structuredContent as { outcome?: { sideEffects?: string } } | undefined;
  assert.equal(structured?.outcome?.sideEffects, "none");
  await client.close();
  console.log(JSON.stringify({ runtime: "vercel-node", stateless: true, health: true, readiness: true, bearerAuth: true, originAllowlist: true, bodyLimit: true, toolDiscovery: true, readOnlyResearch: true, passed: true }, null, 2));
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
