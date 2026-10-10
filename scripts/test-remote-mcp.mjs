import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const reservation = createServer();
await new Promise((resolve, reject) => { reservation.once("error", reject); reservation.listen(0, "127.0.0.1", resolve); });
const reservationAddress = reservation.address();
assert.ok(reservationAddress && typeof reservationAddress === "object");
const port = reservationAddress.port;
await new Promise((resolve) => reservation.close(resolve));
const origin = "https://agent.example.test";
const token = "test-only-remote-auth-token-32-characters";
const child = spawn(process.execPath, [".artifacts/mcp-package/dist/mcp/remote-server.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    ARIADNE_MODE: "demo",
    HOST: "127.0.0.1",
    PORT: String(port),
    ARIADNE_MCP_AUTH_TOKEN: token,
    ARIADNE_MCP_ALLOWED_ORIGINS: origin,
    ARIADNE_MCP_MAX_BODY_BYTES: "2048",
    ARIADNE_MCP_MAX_SESSIONS: "1",
    ARIADNE_MCP_SESSION_TTL_MS: "1000"
  },
  stdio: ["ignore", "pipe", "pipe"]
});
let stderr = "";
child.stderr.on("data", (chunk) => { stderr += chunk; });
const endpoint = `http://127.0.0.1:${port}`;

try {
  let healthy = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try { healthy = (await fetch(`${endpoint}/healthz`)).ok; } catch { /* startup */ }
    if (healthy) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(healthy, true, stderr);
  const ready = await fetch(`${endpoint}/readyz`);
  assert.equal(ready.status, 200);
  assert.equal((await ready.json()).status, "ready");

  const unauthenticated = await fetch(`${endpoint}/mcp`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  assert.equal(unauthenticated.status, 401);
  const invalidOrigin = await fetch(`${endpoint}/mcp`, { method: "POST", headers: { authorization: `Bearer ${token}`, origin: "https://evil.example", "content-type": "application/json" }, body: "{}" });
  assert.equal(invalidOrigin.status, 403);
  const oversized = await fetch(`${endpoint}/mcp`, { method: "POST", headers: { authorization: `Bearer ${token}`, origin, "content-type": "application/json" }, body: "x".repeat(4096) });
  assert.equal(oversized.status, 413);

  const client = new Client({ name: "ariadne-remote-test", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(new URL(`${endpoint}/mcp`), { requestInit: { headers: { authorization: `Bearer ${token}`, origin } } });
  await client.connect(transport);
  const tools = await client.listTools();
  assert.ok(tools.tools.some((tool) => tool.name === "research_tokenized_stock"));
  const result = await client.callTool({ name: "research_tokenized_stock", arguments: { query: "NVDA", chainId: "56" } });
  assert.equal(result.structuredContent?.outcome?.sideEffects, "none");
  const overflowClient = new Client({ name: "ariadne-remote-overflow-test", version: "0.1.0" });
  const overflowTransport = new StreamableHTTPClientTransport(new URL(`${endpoint}/mcp`), { requestInit: { headers: { authorization: `Bearer ${token}`, origin } } });
  await assert.rejects(overflowClient.connect(overflowTransport));
  const sessionId = transport.sessionId;
  assert.ok(sessionId);
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const expired = await fetch(`${endpoint}/mcp`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, origin, "content-type": "application/json", "mcp-session-id": sessionId, "mcp-protocol-version": "2025-11-25" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 9, method: "tools/list", params: {} })
  });
  assert.equal(expired.status, 404);
  console.log(JSON.stringify({ health: true, readiness: true, bearerAuth: true, originAllowlist: true, bodyLimit: true, authenticatedMcp: true, readOnlyResearch: true, sessionCapacity: true, sessionExpiry: true, passed: true }, null, 2));
} finally {
  child.kill("SIGTERM");
  await Promise.race([new Promise((resolve) => child.once("exit", resolve)), new Promise((resolve) => setTimeout(resolve, 2_000))]);
  if (child.exitCode === null) child.kill("SIGKILL");
}
